import { useState, type FormEvent } from 'react'
import { useCreateContact } from '@/hooks/useContacts'
import { Modal } from '@/components/Modal'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'

export function NewContactDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createContact = useCreateContact()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setFullName('')
    setEmail('')
    setPhone('')
    setCompany('')
    setError(null)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) return
    setError(null)
    createContact.mutate(
      { fullName: fullName.trim(), email: email.trim() || null, phone: phone.trim() || null, company: company.trim() || null },
      {
        onSuccess: () => {
          reset()
          onClose()
        },
        onError: (err) => {
          const message = err instanceof Error ? err.message : ''
          setError(
            message.includes('duplicate') || message.includes('idx_contacts_email')
              ? 'Ein Kontakt mit dieser E-Mail existiert bereits.'
              : 'Anlegen fehlgeschlagen. Bitte Angaben prüfen.',
          )
        },
      },
    )
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset()
        onClose()
      }}
      title="Neuen Kontakt anlegen"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required autoFocus />
        <Input label="E-Mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Telefon" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input label="Firma" value={company} onChange={(e) => setCompany(e.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={!fullName.trim() || createContact.isPending}>
            {createContact.isPending ? 'Anlegen…' : 'Anlegen'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
