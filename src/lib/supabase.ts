import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!supabaseUrl || !supabaseAnonKey) {
  // Bewusst nur eine Konsolen-Warnung statt eines harten Crashs, damit
  // z.B. `npm run build` auch ohne konfigurierte Env-Vars durchläuft.
  console.error(
    'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY fehlen. Siehe .env.example.',
  )
}

// Nur der anon-Key kommt hier zum Einsatz - siehe Bauplan Abschnitt 7.
// Sicherheit entsteht durch RLS + Login-Pflicht, nicht durch Geheimhaltung
// dieses Keys.
export const supabase = createClient<Database>(
  supabaseUrl ?? '',
  supabaseAnonKey ?? '',
)
