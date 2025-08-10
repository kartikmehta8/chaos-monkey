import React from 'react'
import { getHistory } from '../api'
export function HistoryPanel() {
    const [items, setItems] = React.useState<any[]>([])
    React.useEffect(() => { getHistory().then(setItems).catch(() => { }) }, [])
    return (
        <section className="mt-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5">
            <h2 className="text-lg font-medium mb-4">Recent runs</h2>
            <div className="text-sm">{items.length === 0 && 'No runs yet'}</div>
            <ul className="space-y-2">
                {items.map(it => (
                    <li key={it.id} className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3 flex items-center justify-between">
                        <span className="font-mono text-xs">{it.id}</span>
                        <span className="text-xs px-2 py-1 rounded-full border">{it.status}</span>
                        <span className="text-xs text-neutral-500">{new Date(it.startedAt).toLocaleString()}</span>
                    </li>
                ))}
            </ul>
        </section>
    )
}
