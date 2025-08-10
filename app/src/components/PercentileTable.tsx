import React from 'react'
export function PercentileTable({ data }: { data: any }) {
    if (!data) return <div className="text-sm text-neutral-500">No data</div>
    const keys = ['min', 'p1', 'p2_5', 'p50', 'p97_5', 'avg', 'stdev', 'max']
    const labels: Record<string, string> = { p2_5: 'p2.5', p97_5: 'p97.5', p1: 'p1', p50: 'p50', stdev: 'stdev' }
    return (
        <div className="overflow-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
            <table className="min-w-[600px] w-full text-sm">
                <thead className="bg-neutral-50 dark:bg-neutral-900/40">
                    <tr>{keys.map(k => <th key={k} className="text-left px-3 py-2 font-medium">{labels[k] || k}</th>)}</tr>
                </thead>
                <tbody>
                    <tr>{keys.map(k => <td key={k} className="px-3 py-2">{data[k] ?? '—'}</td>)}</tr>
                </tbody>
            </table>
        </div>
    )
}
