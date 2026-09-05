// Voidos Sales-CRM - Lead-Intake Edge Function
//
// POST /functions/v1/lead-intake
// Body: { full_name, email, phone?, company?, source?, website? }
//
// Wird auf zwei Wegen aufgerufen (Entscheidung siehe Bauplan Abschnitt 9):
//   1. Vertrauenswürdig: ein externes Anmelde-/Signup-System, das den
//      Header `x-webhook-secret` mitschickt (Wert = LEAD_INTAKE_SHARED_SECRET).
//   2. Fallback für den Notfall: das öffentliche, unauthenticated
//      /signup-Formular im Frontend (kein Secret, dafür Honeypot-Feld
//      `website`, das bei echten Nutzer:innen immer leer bleibt).
//
// Läuft mit dem SERVICE_ROLE Key, weil sie außerhalb eines eingeloggten
// User-Kontexts RLS umgehen muss (siehe Bauplan Abschnitt 5/7).
//
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

interface LeadPayload {
  full_name?: string
  email?: string
  phone?: string
  company?: string
  source?: string
  // Honeypot: unsichtbares Feld im Formular. Bots füllen es meistens aus,
  // echte Nutzer:innen nie. Ist es gesetzt, tun wir so als wäre alles ok,
  // legen aber nichts an.
  website?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  let payload: LeadPayload
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Ungültiges JSON' }, 400)
  }

  const sharedSecret = Deno.env.get('LEAD_INTAKE_SHARED_SECRET')
  const providedSecret = req.headers.get('x-webhook-secret')
  if (sharedSecret && providedSecret && providedSecret !== sharedSecret) {
    // Secret wurde mitgeschickt, ist aber falsch -> klar ablehnen.
    return json({ error: 'Unauthorized' }, 401)
  }
  const isTrustedCaller = Boolean(sharedSecret && providedSecret === sharedSecret)

  // Honeypot: nur der öffentliche Formular-Pfad hat das Feld überhaupt im
  // DOM, ein vertrauenswürdiges System schickt es normalerweise nicht mit.
  if (!isTrustedCaller && payload.website) {
    // Bewusst ein "erfolgreicher" Fake-Response, um Bots nicht zu verraten,
    // dass sie erkannt wurden.
    return json({ ok: true }, 200)
  }

  const fullName = payload.full_name?.trim()
  const email = payload.email?.trim().toLowerCase()
  if (!fullName || !email || !EMAIL_RE.test(email)) {
    return json({ error: 'full_name und eine gültige email sind Pflicht' }, 400)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY fehlen in den Function-Secrets')
    return json({ error: 'Server-Konfigurationsfehler' }, 500)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  try {
    // 1. Duplikat-Check
    const { data: existingContact, error: lookupError } = await supabase
      .from('contacts')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (lookupError) throw lookupError

    if (existingContact) {
      await supabase.from('activities').insert({
        contact_id: existingContact.id,
        type: 'system',
        content: 'Erneute Eintragung über Signup',
      })
      return json({ ok: true, duplicate: true, contact_id: existingContact.id })
    }

    // 2. Neuen Contact anlegen
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .insert({
        full_name: fullName,
        email,
        phone: payload.phone?.trim() || null,
        company: payload.company?.trim() || null,
        source: payload.source?.trim() || (isTrustedCaller ? 'signup' : 'signup-formular-manuell'),
      })
      .select('id')
      .single()

    if (contactError) throw contactError

    // 3. Default-Pipeline + Stage "Neu" ermitteln
    const { data: pipeline, error: pipelineError } = await supabase
      .from('pipelines')
      .select('id')
      .eq('is_default', true)
      .single()

    if (pipelineError) throw pipelineError

    let { data: stage } = await supabase
      .from('stages')
      .select('id')
      .eq('pipeline_id', pipeline.id)
      .eq('name', 'Neu')
      .maybeSingle()

    if (!stage) {
      // Fallback, falls die "Neu"-Stage umbenannt wurde: niedrigste Position
      // nehmen, die weder Won- noch Lost-Stage ist.
      const { data: fallbackStage, error: fallbackError } = await supabase
        .from('stages')
        .select('id')
        .eq('pipeline_id', pipeline.id)
        .eq('is_won', false)
        .eq('is_lost', false)
        .order('position', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (fallbackError) throw fallbackError
      stage = fallbackStage
    }

    if (!stage) {
      throw new Error('Keine passende Intake-Stage in der Default-Pipeline gefunden')
    }

    // 4. Deal anlegen
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .insert({
        contact_id: contact.id,
        pipeline_id: pipeline.id,
        stage_id: stage.id,
        title: payload.company?.trim() ? `${fullName} (${payload.company.trim()})` : fullName,
      })
      .select('id')
      .single()

    if (dealError) throw dealError

    // 5. System-Activity
    await supabase.from('activities').insert({
      deal_id: deal.id,
      contact_id: contact.id,
      type: 'system',
      content: 'Lead über Signup eingetragen',
    })

    return json({ ok: true, duplicate: false, contact_id: contact.id, deal_id: deal.id }, 201)
  } catch (err: any) {
    console.error('lead-intake failed', err)
    return json({ error: 'Interner Fehler beim Anlegen des Leads' }, 500)
  }
})
