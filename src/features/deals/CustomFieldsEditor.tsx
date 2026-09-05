import { useState } from 'react'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import type { Json } from '@/lib/database.types'

interface CustomFieldsEditorProps {
  value: Record<string, Json>
  onSave: (next: Record<string, Json>) => void
  saving?: boolean
}

// Generischer Key/Value-Editor für das jsonb custom_fields-Feld -
// funktioniert identisch für Deals und Contacts (Bauplan Abschnitt 1/4).
export function CustomFieldsEditor({ value, onSave, saving }: CustomFieldsEditorProps) {
  const [entries, setEntries] = useState<[string, string][]>(
    Object.entries(value ?? {}).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]),
  )
  const [dirty, setDirty] = useState(false)

  function updateEntry(index: number, key: string, val: string) {
    const next = [...entries]
    next[index] = [key, val]
    setEntries(next)
    setDirty(true)
  }

  function removeEntry(index: number) {
    setEntries(entries.filter((_, i) => i !== index))
    setDirty(true)
  }

  function addEntry() {
    setEntries([...entries, ['', '']])
    setDirty(true)
  }

  function handleSave() {
    const obj: Record<string, Json> = {}
    for (const [k, v] of entries) {
      if (k.trim()) obj[k.trim()] = v
    }
    onSave(obj)
    setDirty(false)
  }

  return (
    <div className="space-y-2">
      {entries.map(([key, val], i) => (
        <div key={i} className="flex items-center gap-2">
          <Input placeholder="Feldname" value={key} onChange={(e) => updateEntry(i, e.target.value, val)} className="w-1/3" />
          <Input placeholder="Wert" value={val} onChange={(e) => updateEntry(i, key, e.target.value)} className="flex-1" />
          <button
            type="button"
            aria-label="Feld entfernen"
            onClick={() => removeEntry(i)}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600"
          >
            ✕
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" onClick={addEntry}>
          + Feld
        </Button>
        {dirty && (
          <Button type="button" variant="secondary" onClick={handleSave} disabled={saving}>
            {saving ? 'Speichern…' : 'Custom Fields speichern'}
          </Button>
        )}
      </div>
    </div>
  )
}
