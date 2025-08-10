import React from 'react'
import { Play, Server, Gauge, History, Settings2, BarChart3, Logs } from 'lucide-react'
import { startRun, getStatus, getResult } from './api'
import {
    HeadersEditor, headersToObject,
    BodyEditor, buildBody, BodyMode,
    QueryParamsEditor, applyQueryParams,
    LabeledInput,
    PercentileTable,
    HistoryPanel,
    ChartsPanel,
    LiveProgressChart,
    LogsPanel,
    KV
} from './components'

export default function App() {
    const [tab, setTab] = React.useState<'configure' | 'results' | 'charts' | 'logs' | 'history'>('configure')

    const [url, setUrl] = React.useState('http://localhost:3000/ok')
    const [method, setMethod] = React.useState('GET')
    const [headers, setHeaders] = React.useState<KV[]>([{ key: 'accept', value: 'application/json' }])
    const [query, setQuery] = React.useState<KV[]>([])

    const [bodyMode, setBodyMode] = React.useState<BodyMode>('raw')
    const [rawBody, setRawBody] = React.useState('')
    const [bodyKV, setBodyKV] = React.useState<KV[]>([])

    const [connections, setConnections] = React.useState('50')
    const [pipelining, setPipelining] = React.useState('1')
    const [duration, setDuration] = React.useState('15')
    const [amount, setAmount] = React.useState('')
    const [timeout, setTimeoutMs] = React.useState('10000')
    const [rate, setRate] = React.useState('')

    const [status, setStatus] = React.useState<'idle' | 'running' | 'done' | 'error'>('idle')
    const [progress, setProgress] = React.useState<any[]>([])
    const [result, setResult] = React.useState<any | null>(null)
    const [runId, setRunId] = React.useState<string | null>(null)

    async function onStart() {
        setStatus('running'); setResult(null); setProgress([])
        const finalUrl = applyQueryParams(url, query)
        const finalBody = buildBody(bodyMode, rawBody, bodyKV)
        const hdrs = headersToObject(headers)

        if (finalBody && !Object.keys(hdrs).some(k => k.toLowerCase() === 'content-type')) {
            hdrs['content-type'] = 'application/json'
        }

        try {
            const { id } = await startRun({
                url: finalUrl,
                method,
                connections: num(connections),
                pipelining: num(pipelining),
                duration: num(duration),
                amount: num(amount),
                timeout: num(timeout),
                rate: num(rate),
                headers: hdrs,
                body: finalBody
            })
            setRunId(id)
            pollStatus(id)
            pollResult(id)
            setTab('results')
        } catch (e) {
            console.error(e)
            setStatus('error')
        }
    }

    function num(v?: string) {
        if (!v) return undefined
        const n = Number(v)
        return Number.isFinite(n) ? n : undefined
    }

    function pollStatus(id: string) {
        const tick = async () => {
            const j = await getStatus(id)
            setProgress(j.progress)
            if (j.status === 'running') setTimeout(tick, 1000)
        }
        tick()
    }

    function pollResult(id: string) {
        const tick = async () => {
            const r = await getResult(id)
            if (r.status === 202) setTimeout(tick, 1500)
            else if (r.ok) { const j = await r.json(); setResult(j); setStatus('done') }
        }
        tick()
    }

    const kpis = React.useMemo(() => {
        const r = result
        if (!r) return null
        return [
            { label: 'Req/Sec (avg)', value: r.requests?.average },
            { label: 'Throughput MB/s (avg)', value: r.throughput?.average ? (r.throughput.average / (1024 * 1024)).toFixed(2) : undefined },
            { label: 'Latency p50 (ms)', value: r.latency?.p50 },
            { label: 'Latency p99 (ms)', value: r.latency?.p99 },
            { label: '2xx', value: r['2xx'] },
            { label: 'Non-2xx', value: r.non2xx },
            { label: 'Errors', value: r.errors }
        ]
    }, [result])

    return (
        <div className="mx-auto max-w-6xl p-6">
            <header className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Server className="size-6" />
                    <h1 className="text-2xl font-semibold">Chaos Monkey</h1>
                </div>
                <nav className="flex items-center gap-2 text-sm">
                    <button onClick={() => setTab('configure')} className={`rounded-full px-4 py-2 ${tab === 'configure' ? 'bg-neutral-200 dark:bg-neutral-800' : ''}`}>Configure</button>
                    <button onClick={() => setTab('results')} className={`rounded-full px-4 py-2 ${tab === 'results' ? 'bg-neutral-200 dark:bg-neutral-800' : ''}`}>Results</button>
                    {/* NEW: Charts tab button */}
                    <button onClick={() => setTab('charts')} className={`rounded-full px-4 py-2 ${tab === 'charts' ? 'bg-neutral-200 dark:bg-neutral-800' : ''}`}>
                        <BarChart3 className="inline size-4 mr-1" />Charts
                    </button>
                    <button onClick={() => setTab('logs')} className={`rounded-full px-4 py-2 ${tab === 'logs' ? 'bg-neutral-200 dark:bg-neutral-800' : ''}`}>
                        <Logs className="inline size-4 mr-1" />
                        Logs
                    </button>
                    <button onClick={() => setTab('history')} className={`rounded-full px-4 py-2 ${tab === 'history' ? 'bg-neutral-200 dark:bg-neutral-800' : ''}`}>
                        <History className="inline size-4 mr-1" />History
                    </button>
                </nav>
            </header>

            {tab === 'configure' && (
                <section className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5">
                        <h2 className="text-lg font-medium mb-4">Target</h2>
                        <div className="grid gap-4">
                            <div className="grid grid-cols-[120px,1fr] items-center gap-3">
                                <label className="text-sm">URL</label>
                                <input value={url} onChange={e => setUrl(e.target.value)} placeholder="http://localhost:3000/ok" className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2" />
                            </div>
                            <div className="grid grid-cols-[120px,1fr] items-center gap-3">
                                <label className="text-sm">Method</label>
                                <select value={method} onChange={e => setMethod(e.target.value)} className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2">
                                    {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm">Query Params</label>
                                </div>
                                <QueryParamsEditor items={query} setItems={setQuery} />
                            </div>

                            <div>
                                <label className="block text-sm mb-2">Headers</label>
                                <HeadersEditor items={headers} setItems={setHeaders} />
                            </div>

                            {['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && (
                                <div>
                                    <label className="block text-sm mb-2">Body</label>
                                    <BodyEditor mode={bodyMode} setMode={setBodyMode} raw={rawBody} setRaw={setRawBody} kv={bodyKV} setKv={setBodyKV} />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5">
                        <h2 className="text-lg font-medium mb-4 flex items-center gap-2"><Settings2 className="size-4" /> Load Profile</h2>
                        <div className="grid gap-3">
                            <LabeledInput label="Connections" value={connections} setValue={setConnections} placeholder="10" />
                            <LabeledInput label="Pipelining" value={pipelining} setValue={setPipelining} placeholder="1" />
                            <LabeledInput label="Duration (s)" value={duration} setValue={setDuration} placeholder="10" />
                            <LabeledInput label="Amount (requests)" value={amount} setValue={setAmount} placeholder="(optional)" />
                            <LabeledInput label="Per-connection rate (req/s)" value={rate} setValue={setRate} placeholder="(optional)" />
                            <LabeledInput label="Timeout (ms)" value={timeout} setValue={setTimeoutMs} placeholder="10000" />
                        </div>
                        <button onClick={onStart} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-neutral-300 dark:border-neutral-700 px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                            <Play className="size-4" /> Start Test
                        </button>
                    </div>
                </section>
            )}

            {tab === 'results' && (
                <section className="mt-6 space-y-6">
                    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5">
                        <h2 className="text-lg font-medium flex items-center gap-2"><Gauge className="size-4" /> Live Progress</h2>
                        <LiveProgressChart progress={progress} showThroughput />
                        {status === 'running' && <p className="text-sm text-neutral-500 mt-2">Running… collecting per-second metrics.</p>}
                    </div>

                    {result && (
                        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5">
                            <h2 className="text-lg font-medium mb-4">Summary</h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
                                {kpis?.map(k => (
                                    <div key={k.label} className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3">
                                        <div className="text-xs text-neutral-500">{k.label}</div>
                                        <div className="text-lg font-semibold">{k.value ?? '—'}</div>
                                    </div>
                                ))}
                            </div>

                            <h3 className="mt-6 font-medium">Latency Percentiles (ms)</h3>
                            <PercentileTable data={result.latency} />
                            <h3 className="mt-6 font-medium">Requests/sec Percentiles</h3>
                            <PercentileTable data={result.requests} />
                            <h3 className="mt-6 font-medium">Throughput (bytes/sec) Percentiles</h3>
                            <PercentileTable data={result.throughput} />

                            <details className="mt-6">
                                <summary className="cursor-pointer text-sm underline">Raw JSON</summary>
                                <pre className="mt-2 overflow-auto rounded-lg border p-3 text-xs">{JSON.stringify(result, null, 2)}</pre>
                            </details>
                        </div>
                    )}
                </section>
            )}

            {tab === 'charts' && (
                <section className="mt-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5">
                    <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                        <BarChart3 className="size-4" /> Charts
                    </h2>
                    <ChartsPanel result={result} progress={progress} />
                    {!result && (
                        <p className="text-sm text-neutral-500 mt-3">
                            Run a test to populate charts.
                        </p>
                    )}
                </section>
            )}

            {tab === 'history' && (
                <HistoryPanel />
            )}

            {tab === 'logs' && (
                <section className="mt-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5">
                    <h2 className="text-lg font-medium mb-4">Logs</h2>
                    <LogsPanel runId={runId} />
                    {!runId && <p className="text-sm text-neutral-500 mt-3">Start a test to view logs.</p>}
                </section>
            )}

        </div>
    )
}
