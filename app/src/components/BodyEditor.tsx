import React from 'react'
import { KV, KVEditor, kvToObject } from './KVEditor'
export type BodyMode = 'raw' | 'kv'
export function BodyEditor({ mode, setMode, raw, setRaw, kv, setKv }: {
    mode: BodyMode; setMode: (m: BodyMode) => void; raw: string; setRaw: (s: string) => void; kv: KV[]; setKv: (k: KV[]) => void;
}) {
    return (
        <div>
            <div className="flex gap-2 mb-2 text-sm">
                <button onClick={() => setMode('raw')} className={`rounded-full px-3 py-1 border ${mode === 'raw' ? 'bg-neutral-100 dark:bg-neutral-800' : ''}`}>Raw</button>
                <button onClick={() => setMode('kv')} className={`rounded-full px-3 py-1 border ${mode === 'kv' ? 'bg-neutral-100 dark:bg-neutral-800' : ''}`}>Key/Value</button>
            </div>
            {mode === 'raw' ? (
                <textarea value={raw} onChange={e => setRaw(e.target.value)} rows={6} placeholder='{"name":"foo"}' className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"></textarea>
            ) : (
                <KVEditor items={kv} setItems={setKv} leftPlaceholder="field" rightPlaceholder="value" />
            )}
        </div>
    )
}
export function buildBody(mode: BodyMode, raw: string, kv: KV[]): string | undefined {
    if (mode === 'raw') return raw || undefined
    const obj = kvToObject(kv)
    if (Object.keys(obj).length === 0) return undefined
    return JSON.stringify(obj)
}
