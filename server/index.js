import express from "express";
import cors from "cors";
import { customAlphabet } from "nanoid";
import autocannon from "autocannon";
import { EventEmitter } from "events";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const nanoid = customAlphabet("1234567890abcdefghijklmnopqrstuvwxyz", 10);

const runs = new Map();

const safeJson = (v) => {
  try {
    return typeof v === "string" ? v : JSON.stringify(v);
  } catch {
    return String(v);
  }
};
const truncate = (s, n = 500) =>
  s && s.length > n ? s.slice(0, n) + "…(truncated)" : s;
function parseQuery(url) {
  try {
    const u = new URL(url);
    const q = {};
    for (const [k, v] of u.searchParams.entries()) q[k] = v;
    return q;
  } catch {
    return {};
  }
}
function redactHeaders(h = {}) {
  const out = {};
  for (const k of Object.keys(h || {})) {
    out[k] = /(authorization|cookie|token|apikey|api-key|x-api-key)/i.test(k)
      ? "***redacted***"
      : h[k];
  }
  return out;
}

app.post("/run", async (req, res) => {
  try {
    const id = nanoid();
    const {
      url,
      method = "GET",
      headers = {},
      body = undefined,
      duration = 10,
      connections = 10,
      pipelining = 1,
      amount = undefined,
      timeout = 10_000,
      rate = undefined,
      verifyConnection = false,
      warmup = undefined,
      overallRate = undefined,
      maxConnectionRequests = undefined,
      maxOverallRequests = undefined,
      rejectUnauthorized = true,
    } = req.body || {};

    if (!url || typeof url !== "string")
      return res.status(400).json({ error: "url is required" });

    const opts = {
      url,
      connections: Number(connections) || 10,
      pipelining: Number(pipelining) || 1,
      duration: amount ? 0 : Number(duration) || 10,
      amount: amount ? Number(amount) : undefined,
      timeout: Number(timeout) || 10000,
      method: String(method || "GET").toUpperCase(),
      headers: headers || {},
      body: body ?? undefined,
      rate: rate ? Number(rate) : undefined,
      overallRate: overallRate ? Number(overallRate) : undefined,
      maxConnectionRequests: maxConnectionRequests
        ? Number(maxConnectionRequests)
        : undefined,
      maxOverallRequests: maxOverallRequests
        ? Number(maxOverallRequests)
        : undefined,
      tls: url.startsWith("https"),
      verifyConnection: !!verifyConnection,
      warmup:
        warmup && warmup.duration
          ? { duration: Number(warmup.duration) }
          : undefined,
      rejectUnauthorized: !!rejectUnauthorized,
    };

    const state = {
      id,
      status: "running",
      startedAt: new Date().toISOString(),
      progress: [],
      result: null,
      error: null,
      __prevTick: null,
      logs: [],
      bus: new EventEmitter(),
    };
    runs.set(id, state);

    const pushLog = (msg) => {
      const line = `[${new Date().toISOString()}] ${msg}`;
      state.logs.push(line);
      if (state.logs.length > 5000) state.logs.shift();
      state.bus.emit("log", line);
    };

    const qsObj = parseQuery(opts.url);
    const bodyStr =
      opts.body !== undefined ? truncate(safeJson(opts.body), 2000) : "";
    const headersOut = redactHeaders(opts.headers);

    pushLog(
      `RUN ${state.id} START ${opts.method} ${opts.url} | qs=${safeJson(
        qsObj
      )} | body=${bodyStr || "(none)"} | headers=${safeJson(
        headersOut
      )} | conn=${opts.connections} pipe=${opts.pipelining} dur=${
        opts.duration || 0
      }s amt=${opts.amount || 0} rate=${opts.rate || "(none)"} timeout=${
        opts.timeout
      }ms`
    );

    const instance = autocannon(opts, (err, result) => {
      if (err) {
        state.status = "error";
        state.error = err.message || String(err);
        pushLog(`RUN ${state.id} ERROR ${state.error}`);
      } else {
        state.status = "done";
        state.result = result;
        pushLog(
          `RUN ${state.id} DONE avgReq/s=${
            result?.requests?.average ?? "-"
          } p50=${result?.latency?.p50 ?? "-"}ms p99=${
            result?.latency?.p99 ?? "-"
          }ms 2xx=${result?.["2xx"] ?? 0} non2xx=${
            result?.non2xx ?? 0
          } errors=${result?.errors ?? 0} bytes=${result?.bytes ?? 0}`
        );
        state.bus.emit("end");
      }
    });

    instance.on("tick", (counter) => {
      const now = Date.now();
      const prev = state.__prevTick;
      let reqPerSec, bytesPerSec;
      if (prev) {
        const dt = Math.max(1, now - prev.time) / 1000;
        const dReq = (counter?.counter ?? 0) - (prev.counter ?? 0);
        const dBytes = (counter?.bytes ?? 0) - (prev.bytes ?? 0);
        reqPerSec = dReq / dt;
        bytesPerSec = dBytes / dt;
      }
      state.__prevTick = {
        time: now,
        counter: counter?.counter ?? 0,
        bytes: counter?.bytes ?? 0,
      };
      state.progress.push({
        counter: counter?.counter,
        bytes: counter?.bytes,
        reqPerSec: Number.isFinite(reqPerSec) ? reqPerSec : undefined,
        bytesPerSec: Number.isFinite(bytesPerSec) ? bytesPerSec : undefined,
        time: now,
      });

      const elapsed = (
        (now - new Date(state.startedAt).getTime()) /
        1000
      ).toFixed(1);
      const reqStr = Number.isFinite(reqPerSec) ? reqPerSec.toFixed(1) : "-";
      const kbStr = Number.isFinite(bytesPerSec)
        ? (bytesPerSec / 1024).toFixed(1)
        : "-";
      pushLog(
        `RUN ${
          state.id
        } TICK t=${elapsed}s req/s=${reqStr} KB/s=${kbStr} totalReq=${
          counter?.counter ?? 0
        } totalBytes=${counter?.bytes ?? 0}`
      );
    });

    instance.on("error", (e) => {
      state.status = "error";
      state.error = e?.message || String(e);
      pushLog(`RUN ${state.id} ERROR ${state.error}`);
      state.bus.emit("end");
    });

    res.json({ id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to start run" });
  }
});

app.get("/status/:id", (req, res) => {
  const run = runs.get(req.params.id);
  if (!run) return res.status(404).json({ error: "not found" });
  res.json({
    status: run.status,
    progress: run.progress,
    startedAt: run.startedAt,
  });
});
app.get("/result/:id", (req, res) => {
  const run = runs.get(req.params.id);
  if (!run) return res.status(404).json({ error: "not found" });
  if (run.status !== "done")
    return res.status(202).json({ status: run.status });
  res.json(run.result);
});
app.get("/logs/:id", (req, res) => {
  const run = runs.get(req.params.id);
  if (!run) return res.status(404).json({ error: "not found" });
  res.json({ status: run.status, lines: run.logs || [] });
});

app.get("/logs/stream/:id", (req, res) => {
  const run = runs.get(req.params.id);
  if (!run) return res.status(404).end();

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  for (const line of run.logs) res.write(`data: ${line}\n\n`);

  const onLog = (line) => res.write(`data: ${line}\n\n`);
  const onEnd = () => {
    res.write(`event: end\ndata: done\n\n`);
    res.end();
  };

  run.bus.on("log", onLog);
  run.bus.once("end", onEnd);

  req.on("close", () => {
    run.bus.off("log", onLog);
  });
});

app.get("/history", (req, res) => {
  const list = [...runs.values()].map((r) => ({
    id: r.id,
    status: r.status,
    startedAt: r.startedAt,
  }));
  res.json(
    list.sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1)).slice(0, 50)
  );
});

const PORT = process.env.PORT || 5055;
app.listen(PORT, () => {
  console.log(`Chaos Monkey server listening on http://localhost:${PORT}`);
});
