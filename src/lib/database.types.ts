// Handschriftlich gepflegte Typen passend zum Schema unter
// supabase/migrations/. Sobald ein echtes Supabase-Projekt existiert,
// können diese durch generierte Typen ersetzt werden:
//
//   supabase gen types typescript --project-id <ref> > src/lib/database.types.ts
//
// Die Struktur (Database.public.Tables.<table>.Row/Insert/Update) ist
// bewusst identisch zum generierten Format gehalten, damit der Umstieg
// später ohne Codeänderungen an den Call-Sites funktioniert.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      pipelines: {
        Row: {
          id: string
          name: string
          is_default: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          is_default?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['pipelines']['Insert']>
        Relationships: []
      }
      stages: {
        Row: {
          id: string
          pipeline_id: string
          name: string
          position: number
          is_won: boolean
          is_lost: boolean
          created_at: string
        }
        Insert: {
          id?: string
          pipeline_id: string
          name: string
          position: number
          is_won?: boolean
          is_lost?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['stages']['Insert']>
        Relationships: []
      }
      contacts: {
        Row: {
          id: string
          full_name: string
          email: string | null
          phone: string | null
          company: string | null
          source: string | null
          custom_fields: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          full_name: string
          email?: string | null
          phone?: string | null
          company?: string | null
          source?: string | null
          custom_fields?: Json
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['contacts']['Insert']>
        Relationships: []
      }
      deals: {
        Row: {
          id: string
          contact_id: string
          pipeline_id: string
          stage_id: string
          title: string
          value: number | null
          currency: string | null
          owner_id: string | null
          custom_fields: Json
          status: 'open' | 'won' | 'lost'
          lost_reason: string | null
          created_at: string
          updated_at: string
          stage_changed_at: string
        }
        Insert: {
          id?: string
          contact_id: string
          pipeline_id: string
          stage_id: string
          title: string
          value?: number | null
          currency?: string | null
          owner_id?: string | null
          custom_fields?: Json
          status?: 'open' | 'won' | 'lost'
          lost_reason?: string | null
          created_at?: string
          updated_at?: string
          stage_changed_at?: string
        }
        Update: Partial<Database['public']['Tables']['deals']['Insert']>
        Relationships: []
      }
      activities: {
        Row: {
          id: string
          deal_id: string | null
          contact_id: string | null
          type: 'note' | 'call' | 'stage_change' | 'system'
          content: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          deal_id?: string | null
          contact_id?: string | null
          type: 'note' | 'call' | 'stage_change' | 'system'
          content?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['activities']['Insert']>
        Relationships: []
      }
      tasks: {
        Row: {
          id: string
          deal_id: string | null
          title: string
          due_at: string | null
          is_done: boolean
          assigned_to: string | null
          created_at: string
        }
        Insert: {
          id?: string
          deal_id?: string | null
          title: string
          due_at?: string | null
          is_done?: boolean
          assigned_to?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['tasks']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Pipeline = Database['public']['Tables']['pipelines']['Row']
export type Stage = Database['public']['Tables']['stages']['Row']
export type Contact = Database['public']['Tables']['contacts']['Row']
export type Deal = Database['public']['Tables']['deals']['Row']
export type Activity = Database['public']['Tables']['activities']['Row']
export type Task = Database['public']['Tables']['tasks']['Row']

export type DealWithContact = Deal & { contact: Pick<Contact, 'id' | 'full_name' | 'company'> | null }
