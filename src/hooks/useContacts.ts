import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Contact, DealWithContact, Json } from '@/lib/database.types'

export function useContacts(search?: string) {
  return useQuery<Contact[]>({
    queryKey: ['contacts', search ?? ''],
    queryFn: async () => {
      let query = supabase.from('contacts').select('*').order('created_at', { ascending: false })
      if (search) {
        query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`)
      }
      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },
  })
}

export function useContact(contactId: string | undefined) {
  return useQuery<Contact>({
    queryKey: ['contact', contactId],
    enabled: Boolean(contactId),
    queryFn: async () => {
      const { data, error } = await supabase.from('contacts').select('*').eq('id', contactId as string).single()
      if (error) throw error
      return data
    },
  })
}

export function useContactDeals(contactId: string | undefined) {
  return useQuery<DealWithContact[]>({
    queryKey: ['contact-deals', contactId],
    enabled: Boolean(contactId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select('*, contact:contacts(id, full_name, company)')
        .eq('contact_id', contactId as string)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as DealWithContact[]
    },
  })
}

interface CreateContactInput {
  fullName: string
  email?: string | null
  phone?: string | null
  company?: string | null
  source?: string | null
}

export function useCreateContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateContactInput) => {
      const { data, error } = await supabase
        .from('contacts')
        .insert({
          full_name: input.fullName,
          email: input.email || null,
          phone: input.phone || null,
          company: input.company || null,
          source: input.source || 'manuell',
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}

export function useUpdateContactCustomFields() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ contactId, customFields }: { contactId: string; customFields: Record<string, Json> }) => {
      const { error } = await supabase.from('contacts').update({ custom_fields: customFields }).eq('id', contactId)
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contact', variables.contactId] })
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}
