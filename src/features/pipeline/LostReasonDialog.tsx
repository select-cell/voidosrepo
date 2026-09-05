import { useState, type FormEvent } from 'react'
import { Modal } from '@/components/Modal'
import { Button } from '@/components/Button'
import { Textarea } from '@/components/Input'

interface LostReasonDialogProps {
  open: boolean
  onCancel: () => void
  onConfirm: (reason: string) => void
  submitting?: boolean
}

const COMMON_REASONS = ['Preis', 'Kein Budget', 'Konkurrenz', 'Kein Bedarf mehr', 'Kein Kontakt möglich']

// Pflichtfeld beim Verschieben in eine "Verloren"-Stage - Entscheidung aus
// Bauplan Abschnitt 9. Wird zusätzlich in der DB per Trigger erzwungen
// (handle_deal_stage_change), dieser Dialog verhindert nur die unnötige
// Fehlermeldung im UI.
export function LostReasonDialog({ open, onCancel, onConfirm, submitting }: LostReasonDialogProps) {
  const [reason, setReason] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = reason.trim()
    if (!trimmed) return
    onConfirm(trimmed)
    setReason('')
  }

  return (
    <Modal open={open} onClose={onCancel} title="Warum wurde der Deal verloren?">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {COMMON_REASONS.map((r) => (
            <button
              type="button"
              key={r}
              onClick={() => setReason(r)}
              className={`rounded-full border px-3 py-1 text-xs ${
                reason === r
                  ? 'border-brand-600 bg-brand-50 text-brand-700'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <Textarea
          label="Grund (Pflichtfeld)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          required
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Abbrechen
          </Button>
          <Button type="submit" variant="danger" disabled={!reason.trim() || submitting}>
            {submitting ? 'Speichern…' : 'Als verloren markieren'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
