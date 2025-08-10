import React from 'react'

type LogsStatus = 'running' | 'done' | 'error' | 'idle'

export function LogsPanel({
    runId,
    apiBase = 'http://localhost:5055',
}: {
    runId: string | null
    apiBase?: string
}) {
    const [status, setStatus] = React.useState<LogsStatus>('idle')
    const [lines, setLines] = React.useState<string[]>([])
    const [autoScroll, setAutoScroll] = React.useState(true)
    const [isPaused, setIsPaused] = React.useState(false)
    const [query, setQuery] = React.useState('')
    const boxRef = React.useRef<HTMLDivElement>(null)

    // Reset on run change
    React.useEffect(() => { setLines([]); setStatus('idle') }, [runId])

    // Prefer SSE; fallback to polling if SSE fails
    React.useEffect(() => {
        if (!runId) return
        let stopped = false
        let es: EventSource | null = null
        let fallbackTimer: any = null

        function startPolling() {
            const poll = async () => {
                if (stopped || isPaused) return
                try {
                    const r = await fetch(`${apiBase}/logs/${runId}`, { cache: 'no-store' })
                    if (r.ok) {
                        const j = await r.json()
                        setStatus(j.status ?? 'idle')
                        setLines(j.lines ?? [])
                    }
                } catch { }
                if (!stopped) fallbackTimer = setTimeout(poll, status === 'running' ? 800 : 2500)
            }
            poll()
        }

        try {
            es = new EventSource(`${apiBase}/logs/stream/${runId}`)
            es.onmessage = (e) => {
                if (stopped || isPaused) return
                setLines((prev) => [...prev, e.data])
            }
            es.addEventListener('end', () => {
                setStatus('done')
                es?.close()
            })
            es.onerror = () => {
                es?.close()
                startPolling()
            }
        } catch {
            startPolling()
        }

        return () => {
            stopped = true
            es?.close()
            if (fallbackTimer) clearTimeout(fallbackTimer)
        }
    }, [runId, apiBase, isPaused, status])

    // Autoscroll
    React.useEffect(() => {
        if (autoScroll && boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight
    }, [lines, autoScroll])

    const filtered = React.useMemo(() => {
        if (!query.trim()) return lines
        const q = query.toLowerCase()
        return lines.filter((l) => l.toLowerCase().includes(q))
    }, [lines, query])

    function copyAll() {
        navigator.clipboard.writeText(lines.join('\n')).catch(() => { })
    }
    function download() {
        const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `autocannon-run-${runId || 'logs'}.txt`
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div className="space-y-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="text-sm">
                    <span className="text-neutral-500">Run:</span>{' '}
                    <span className="font-mono">{runId ?? '—'}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter logs…" className="input" />
                    <label className="text-sm flex items-center gap-1">
                        <input type="checkbox" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} />
                        Auto-scroll
                    </label>
                    <button onClick={() => setIsPaused(p => !p)} className="button">{isPaused ? 'Resume' : 'Pause'}</button>
                    <button onClick={copyAll} className="button">Copy</button>
                    <button onClick={download} className="button">Download</button>
                </div>
            </div>

            <div ref={boxRef} className="h-80 overflow-auto rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 p-3 font-mono text-xs leading-5">
                {filtered.length === 0 ? (
                    <div className="text-neutral-500">{runId ? 'Waiting for logs…' : 'No run selected'}</div>
                ) : (
                    filtered.map((l, i) => <div key={i}>{l}</div>)
                )}
            </div>
        </div>
    )
}
