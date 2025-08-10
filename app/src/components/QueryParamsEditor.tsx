import React from 'react'
import { KV, KVEditor, kvToObject } from './KVEditor'
export function QueryParamsEditor({ items, setItems }: { items: KV[]; setItems: (k: KV[]) => void }) {
    return (
        <div>
            <KVEditor items={items} setItems={setItems} leftPlaceholder="param" rightPlaceholder="value" />
        </div>
    )
}
export function applyQueryParams(baseUrl: string, params: KV[]): string {
    try {
        const url = new URL(baseUrl)
        const existing = new URLSearchParams(url.search)
        for (const { key, value } of params) if (key) existing.set(key, value)
        url.search = existing.toString()
        return url.toString()
    } catch {
        const obj = kvToObject(params)
        const qs = new URLSearchParams(obj).toString()
        return baseUrl + (baseUrl.includes('?') ? '&' : '?') + qs
    }
}
