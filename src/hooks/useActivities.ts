import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Activity } from '@/lib/database.types'
import { useAuth } from '@/features/auth/AuthProvider'

interface ActivitiesFilter {
  dealId?: string
  contactId?: string
}

export function useActivities({ dealId, contactId }: ActivitiesFilter) {
  return useQuery<Activity[]>({
    queryKey: ['activities', dealId ?? null, contactId ?? null],
    enabled: Boolean(dealId || contactId),
    queryFn: async () => {
      let query = supabase.from('activities').select('*').order('created_at', { ascending: false })
      if (dealId) query = query.eq('deal_id', dealId)
      else if (contactId) query = query.eq('contact_id', contactId)
      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },
  })
}

export function useAddNote() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ dealId, contactId, content }: { dealId?: string; contactId?: string; content: string }) => {
      const { error } = await supabase.from('activities').insert({
        deal_id: dealId ?? null,
        contact_id: contactId ?? null,
        type: 'note',
        content,
        created_by: user?.id ?? null,
      })
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['activities', variables.dealId ?? null, variables.contactId ?? null] })
    },
  })
}
