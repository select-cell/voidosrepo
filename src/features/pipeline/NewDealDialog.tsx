import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Modal } from '@/components/Modal'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'

interface NewDealDialogProps {
  open: boolean
  onClose: () => void
  pipelineId: string
  intakeStageId: string
}

// Manueller "Notfall"-Weg, einen Lead ins CRM zu bekommen, ohne auf den
// Lead-Intake-Webhook oder das öffentliche Signup-Formular angewiesen zu
// sein (siehe Bauplan Abschnitt 9). Macht denselben Duplikat-Check wie die
// Edge Function, läuft aber als eingeloggter User direkt über RLS.
export function NewDealDialog({ open, onClose, pipelineId, intakeStageId }: NewDealDialogProps) {
  const queryClient = useQueryClient()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setFullName('')
    setEmail('')
    setCompany('')
    setValue('')
    setError(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      let contactId: string

      const normalizedEmail = email.trim().toLowerCase() || null
      if (normalizedEmail) {
        const { data: existing, error: lookupError } = await supabase
          .from('contacts')
          .select('id')
          .eq('email', normalizedEmail)
          .maybeSingle()
        if (lookupError) throw lookupError
        if (existing) {
          contactId = existing.id
        } else {
          const { data: created, error: createError } = await supabase
            .from('contacts')
            .insert({ full_name: fullName.trim(), email: normalizedEmail, company: company.trim() || null, source: 'manuell' })
            .select('id')
            .single()
          if (createError) throw createError
          contactId = created.id
        }
      } else {
        const { data: created, error: createError } = await supabase
          .from('contacts')
          .insert({ full_name: fullName.trim(), company: company.trim() || null, source: 'manuell' })
          .select('id')
          .single()
        if (createError) throw createError
        contactId = created.id
      }

      const { error: dealError } = await supabase.from('deals').insert({
        contact_id: contactId,
        pipeline_id: pipelineId,
        stage_id: intakeStageId,
        title: company.trim() ? `${fullName.trim()} (${company.trim()})` : fullName.trim(),
        value: value ? Number(value) : null,
      })
      if (dealError) throw dealError

      await queryClient.invalidateQueries({ queryKey: ['deals', pipelineId] })
      await queryClient.invalidateQueries({ queryKey: ['contacts'] })
      reset()
      onClose()
    } catch (err) {
      console.error(err)
      setError('Anlegen fehlgeschlagen. Bitte Angaben prüfen und erneut versuchen.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset()
        onClose()
      }}
      title="Neuen Lead manuell anlegen"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required autoFocus />
        <Input label="E-Mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} hint="Bei bekannter E-Mail wird der bestehende Kontakt wiederverwendet." />
        <Input label="Firma" value={company} onChange={(e) => setCompany(e.target.value)} />
        <Input label="Deal-Wert (EUR)" type="number" min="0" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={!fullName.trim() || submitting}>
            {submitting ? 'Anlegen…' : 'Lead anlegen'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
