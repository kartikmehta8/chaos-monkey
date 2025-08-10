import React from 'react'
import { KV, KVEditor, kvToObject } from './KVEditor'
export function HeadersEditor({ items, setItems }: { items: KV[]; setItems: (k: KV[]) => void }) {
    return <KVEditor items={items} setItems={setItems} leftPlaceholder="Header-Name" rightPlaceholder="value" />
}
export function headersToObject(items: KV[]) { return kvToObject(items) }
