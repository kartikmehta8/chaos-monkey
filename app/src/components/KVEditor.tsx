import React from 'react'
export type KV = { key: string; value: string }
export function KVEditor({ items, setItems, leftPlaceholder, rightPlaceholder }: {
    items: KV[];
    setItems: (items: KV[]) => void;
    leftPlaceholder?: string;
    rightPlaceholder?: string;
}) {
    function add() { setItems([...items, { key: '', value: '' }]) }
    function remove(i: number) { setItems(items.filter((_, idx) => idx !== i)) }
    function setKey(i: number, v: string) { setItems(items.map((it, idx) => idx === i ? { ...it, key: v } : it)) }
    function setVal(i: number, v: string) { setItems(items.map((it, idx) => idx === i ? { ...it, value: v } : it)) }
    return (
        <div>
            <div className="space-y-2">
                {items.map((h, i) => (
                    <div key={i} className="flex gap-2">
                        <input value={h.key} onChange={e => setKey(i, e.target.value)} placeholder={leftPlaceholder || 'key'} className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2" />
                        <input value={h.value} onChange={e => setVal(i, e.target.value)} placeholder={rightPlaceholder || 'value'} className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2" />
                        <button onClick={() => remove(i)} className="rounded-lg border px-3">×</button>
                    </div>
                ))}
            </div>
            <button onClick={add} className="mt-2 text-sm underline">+ add</button>
        </div>
    )
}
export function kvToObject(items: KV[]): Record<string, string> {
    const obj: Record<string, string> = {}
    for (const { key, value } of items) if (key) obj[key] = value
    return obj
}
