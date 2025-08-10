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
} from 'recharts'

type ProgressPoint = {
    time: number
    reqPerSec?: number
    bytesPerSec?: number
    counter?: number
    bytes?: number
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

export function LiveProgressChart({
    progress,
    showThroughput = true,
}: {
    progress: ProgressPoint[]
    showThroughput?: boolean
}) {
    const data = useMemo(() => {
        if (!progress?.length) return []
        const base = progress[0].time ?? Date.now()
        return progress.map(p => ({
            t: Number(Math.max(0, ((p.time ?? base) - base) / 1000).toFixed(1)),
            reqPerSec: Math.max(0, Number.isFinite(p.reqPerSec!) ? p.reqPerSec! : 0),
            kbPerSec: Math.max(0, Number.isFinite(p.bytesPerSec!) ? p.bytesPerSec! / 1024 : 0),
        }))
    }, [progress])

    if (!data.length) return <div className="text-sm text-neutral-500">No samples yet</div>

    const reqMax = Math.max(...data.map(d => d.reqPerSec))
    const kbMax = Math.max(...data.map(d => d.kbPerSec))
    const reqUpper = niceCeil(reqMax)
    const kbUpper = niceCeil(kbMax)
    const reqTicks = buildTicks(reqUpper)
    const kbTicks = buildTicks(kbUpper)

    return (
        <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="t" unit="s" />
                <YAxis
                    yAxisId="left"
                    type="number"
                    domain={[0, reqUpper]}
                    ticks={reqTicks}
                    tickFormatter={fmtShort}
                />
                {showThroughput && (
                    <YAxis
                        yAxisId="right"
                        orientation="right"
                        type="number"
                        domain={[0, kbUpper]}
                        ticks={kbTicks}
                        tickFormatter={fmtShort}
                    />
                )}
                <Tooltip
                    formatter={(v: any, name: string) =>
                        name.includes('KB') ? [fmtShort(Number(v)), 'KB/sec'] : [fmtShort(Number(v)), 'req/sec']
                    }
                    labelFormatter={(l) => `${l}s`}
                />
                <Legend />
                <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="reqPerSec"
                    name="req/sec"
                    stroke="#3b82f6"
                    dot={false}
                    isAnimationActive={false}
                    connectNulls
                />
                {showThroughput && (
                    <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="kbPerSec"
                        name="KB/sec"
                        stroke="#10b981"
                        dot={false}
                        isAnimationActive={false}
                        connectNulls
                    />
                )}
            </LineChart>
        </ResponsiveContainer>
    )
}
