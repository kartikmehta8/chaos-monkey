import React, { useMemo } from 'react'
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area,
} from 'recharts'

type ProgressPoint = {
    time: number
    reqPerSec?: number
    bytesPerSec?: number
    counter?: number
    bytes?: number
}

function pctKeyToNumber(k: string): number | null {
    if (!k || k[0] !== 'p') return null
    const raw = k.slice(1).replace(/_/g, '.')
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
}

function extractPercentiles(obj: any, bytesToMB = false) {
    if (!obj || typeof obj !== 'object') return []
    return Object.entries(obj)
        .map(([k, v]) => ({ p: pctKeyToNumber(k), value: Number(v) }))
        .filter(r => r.p !== null && Number.isFinite(r.value))
        .sort((a, b) => (a.p! - b.p!))
        .map(r => ({
            name: String(r.p),
            value: bytesToMB ? r.value / (1024 * 1024) : r.value,
        }))
}

function niceCeil(max: number, pad = 1.15) {
    const m = Math.max(0, max) * pad
    if (m === 0) return 5
    const pow = Math.pow(10, Math.floor(Math.log10(m)))
    const n = m / pow
    const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
    return step * pow
}

function buildTicks(upper: number) {
    const u = Math.max(1, upper)
    return [0, 0.25 * u, 0.5 * u, 0.75 * u, u].map(v => Number(v.toFixed(2)))
}

function fmtShort(v: number) {
    const x = Number(v)
    if (!Number.isFinite(x)) return '0'
    if (Math.abs(x) >= 1_000_000) return (x / 1_000_000).toFixed(2) + 'M'
    if (Math.abs(x) >= 1_000) return (x / 1_000).toFixed(2) + 'k'
    return String(Math.round(x))
}

export function ChartsPanel({ result, progress }: { result: any; progress: ProgressPoint[] }) {
    if (!result) return null

    const series = useMemo(() => {
        if (!progress?.length) return []
        const base = progress[0].time ?? Date.now()
        let lastCounter: number | undefined
        let cum = 0

        return progress.map(p => {
            const t = Math.max(0, ((p.time ?? base) - base) / 1000)
            const reqPerSec = Math.max(0, Number.isFinite(p.reqPerSec!) ? p.reqPerSec! : 0)
            const kbPerSec = Math.max(0, Number.isFinite(p.bytesPerSec!) ? p.bytesPerSec! / 1024 : 0)

            if (typeof p.counter === 'number') {
                cum = p.counter
                lastCounter = p.counter
            } else if (typeof lastCounter === 'number') {
                cum = lastCounter
            }

            return { t: Number(t.toFixed(1)), reqPerSec, kbPerSec, cumReq: cum }
        })
    }, [progress])

    const reqMax = Math.max(0, ...series.map(s => s.reqPerSec || 0))
    const kbMax = Math.max(0, ...series.map(s => s.kbPerSec || 0))
    const cumMax = Math.max(0, ...series.map(s => s.cumReq || 0))

    const reqUpper = niceCeil(reqMax)
    const kbUpper = niceCeil(kbMax)
    const cumUpper = niceCeil(cumMax, 1.05)

    const reqTicks = buildTicks(reqUpper)
    const kbTicks = buildTicks(kbUpper)
    const cumTicks = buildTicks(cumUpper)

    const latencyPct = extractPercentiles(result.latency, false)
    const reqPct = extractPercentiles(result.requests, false)
    const thrPctMB = extractPercentiles(result.throughput, true)
    const statusCounts = [
        { name: '2xx', value: result['2xx'] || 0 },
        { name: 'Non-2xx', value: result.non2xx || 0 },
        { name: 'Errors', value: result.errors || 0 },
    ]
    const COLORS = ['#10b981', '#f59e0b', '#ef4444']

    return (
        <div className="space-y-8">
            <div>
                <h3 className="font-medium mb-2">Requests/sec (live)</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={series} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="t" unit="s" />
                        <YAxis type="number" domain={[0, reqUpper]} ticks={reqTicks} tickFormatter={fmtShort} />
                        <Tooltip formatter={(v: any) => fmtShort(Number(v))} labelFormatter={(l) => `${l}s`} />
                        <Legend />
                        <Line type="monotone" dataKey="reqPerSec" name="req/sec" stroke="#3b82f6" dot={false} isAnimationActive={false} connectNulls />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div>
                <h3 className="font-medium mb-2">Throughput (KB/sec, live)</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={series} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="t" unit="s" />
                        <YAxis type="number" domain={[0, kbUpper]} ticks={kbTicks} tickFormatter={fmtShort} />
                        <Tooltip formatter={(v: any) => fmtShort(Number(v))} labelFormatter={(l) => `${l}s`} />
                        <Legend />
                        <Line type="monotone" dataKey="kbPerSec" name="KB/sec" stroke="#10b981" dot={false} isAnimationActive={false} connectNulls />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div>
                <h3 className="font-medium mb-2">Cumulative Requests</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={series} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="t" unit="s" />
                        <YAxis type="number" domain={[0, cumUpper]} ticks={cumTicks} tickFormatter={fmtShort} />
                        <Tooltip formatter={(v: any) => fmtShort(Number(v))} labelFormatter={(l) => `${l}s`} />
                        <Legend />
                        <Area type="monotone" dataKey="cumReq" name="total requests" stroke="#6366f1" fill="#c7d2fe" isAnimationActive={false} connectNulls />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {latencyPct.length > 0 && (
                <div>
                    <h3 className="font-medium mb-2">Latency Percentiles (ms)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={latencyPct}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="value" name="ms" fill="#f59e0b" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {reqPct.length > 0 && (
                <div>
                    <h3 className="font-medium mb-2">Requests/sec Percentiles</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={reqPct}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="value" name="req/sec" fill="#3b82f6" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {thrPctMB.length > 0 && (
                <div>
                    <h3 className="font-medium mb-2">Throughput Percentiles (MB/sec)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={thrPctMB}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="value" name="MB/sec" fill="#10b981" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            <div>
                <h3 className="font-medium mb-2">Status Code Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie data={statusCounts} dataKey="value" nameKey="name" outerRadius={100} label>
                            {statusCounts.map((_, i) => (
                                <Cell key={i} fill={['#10b981', '#f59e0b', '#ef4444'][i % 3]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
