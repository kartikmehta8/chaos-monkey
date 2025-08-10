import React from 'react'
export function LabeledInput({ label, value, setValue, placeholder }: { label: string, value: string, setValue: (v: string) => void, placeholder?: string }) {
    return (
        <div className="grid grid-cols-[160px,1fr] items-center gap-3">
            <label className="text-sm">{label}</label>
            <input value={value} placeholder={placeholder} onChange={(e) => setValue(e.target.value)} className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2" />
        </div>
    )
}
