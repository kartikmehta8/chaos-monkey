export const API_BASE = 'http://localhost:5055'

export async function startRun(payload: any) {
    const r = await fetch(`${API_BASE}/run`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
    })
    if (!r.ok) throw new Error('failed to start run')
    return r.json()
}
export async function getStatus(id: string) {
    const r = await fetch(`${API_BASE}/status/${id}`)
    return r.json()
}
export async function getResult(id: string) {
    const r = await fetch(`${API_BASE}/result/${id}`)
    return r
}
export async function getHistory() {
    const r = await fetch(`${API_BASE}/history`)
    return r.json()
}
