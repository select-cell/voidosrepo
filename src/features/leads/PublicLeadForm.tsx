import { useState, type FormEvent } from 'react'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'

// Öffentliche, NICHT eingeloggte Seite (siehe App.tsx / AppRouter.tsx -
// bewusst außerhalb von <ProtectedRoute>). Dient als manueller
// "Notfall"-Weg, Leads einzutragen, falls kein externes Anmeldesystem den
// Lead-Intake-Webhook direkt aufruft (Entscheidung aus Bauplan Abschnitt 9).
//
// Ruft die Supabase Edge Function `lead-intake` direkt per fetch auf.
// Ohne x-webhook-secret-Header (das bliebe im Bundle nicht geheim) - als
// Schutz gegen Spam/Bots dient stattdessen ein Honeypot-Feld ("website"),
// das für Menschen unsichtbar bleibt.
export function PublicLeadForm() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [website, setWebsite] = useState('') // honeypot
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus('submitting')
    setErrorMessage(null)

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/lead-intake`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          full_name: fullName,
          email,
          phone: phone || undefined,
          company: company || undefined,
          website: website || undefined,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Fehler ${res.status}`)
      }
      setStatus('success')
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Unbekannter Fehler')
    }
  }

  if (status === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-slate-900">Danke!</p>
          <p className="mt-2 text-sm text-slate-500">Wir haben deine Angaben erhalten und melden uns in Kürze.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-slate-900">Kontakt aufnehmen</h1>
        <p className="mb-6 text-sm text-slate-500">Trag dich ein, wir melden uns bei dir.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required autoComplete="name" />
          <Input label="E-Mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          <Input label="Telefon (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
          <Input label="Firma (optional)" value={company} onChange={(e) => setCompany(e.target.value)} autoComplete="organization" />

          {/* Honeypot: für Menschen unsichtbar, Bots füllen es oft trotzdem aus. */}
          <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
            <label htmlFor="website">Website</label>
            <input
              id="website"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

          {status === 'error' && <p className="text-sm text-red-600">{errorMessage ?? 'Da ist etwas schiefgelaufen.'}</p>}

          <Button type="submit" className="w-full" disabled={status === 'submitting'}>
            {status === 'submitting' ? 'Wird gesendet…' : 'Absenden'}
          </Button>
        </form>
      </div>
    </div>
  )
}
