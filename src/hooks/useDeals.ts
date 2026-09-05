import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { DealWithContact, Json } from '@/lib/database.types'

const DEAL_SELECT = '*, contact:contacts(id, full_name, company)'

export function useDeal(dealId: string | undefined) {
  return useQuery<DealWithContact>({
    queryKey: ['deal', dealId],
    enabled: Boolean(dealId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select(DEAL_SELECT)
        .eq('id', dealId as string)
        .single()
      if (error) throw error
      return data as unknown as DealWithContact
    },
  })
}

export function useDeals(pipelineId: string | undefined) {
  const queryClient = useQueryClient()
  const queryKey = ['deals', pipelineId]

  const query = useQuery<DealWithContact[]>({
    queryKey,
    enabled: Boolean(pipelineId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select(DEAL_SELECT)
        .eq('pipeline_id', pipelineId as string)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as DealWithContact[]
    },
  })

  // Realtime: hält das Board aktuell, falls z.B. der Lead-Intake-Webhook
  // im Hintergrund einen neuen Deal anlegt, während das Board offen ist.
  useEffect(() => {
    if (!pipelineId) return
    const channel = supabase
      .channel(`deals-pipeline-${pipelineId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deals', filter: `pipeline_id=eq.${pipelineId}` },
        () => {
          queryClient.invalidateQueries({ queryKey })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelineId])

  return query
}

interface MoveDealInput {
  dealId: string
  stageId: string
  lostReason?: string | null
}

export function useMoveDeal(pipelineId: string | undefined) {
  const queryClient = useQueryClient()
  const queryKey = ['deals', pipelineId]

  return useMutation({
    mutationFn: async ({ dealId, stageId, lostReason }: MoveDealInput) => {
      const { error } = await supabase
        .from('deals')
        .update({ stage_id: stageId, lost_reason: lostReason ?? null })
        .eq('id', dealId)
      if (error) throw error
    },
    // Optimistic update: stage_id im UI sofort ändern, dann persistieren.
    // Der DB-Trigger übernimmt Status-Sync + Activity-Logging serverseitig.
    onMutate: async ({ dealId, stageId }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<DealWithContact[]>(queryKey)
      queryClient.setQueryData<DealWithContact[]>(queryKey, (old) =>
        old?.map((deal) => (deal.id === dealId ? { ...deal, stage_id: stageId } : deal)),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })
}

interface CreateDealInput {
  contactId: string
  pipelineId: string
  stageId: string
  title: string
  value?: number | null
}

export function useCreateDeal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateDealInput) => {
      const { data, error } = await supabase
        .from('deals')
        .insert({
          contact_id: input.contactId,
          pipeline_id: input.pipelineId,
          stage_id: input.stageId,
          title: input.title,
          value: input.value ?? null,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (deal) => {
      queryClient.invalidateQueries({ queryKey: ['deals', deal.pipeline_id] })
    },
  })
}

export function useUpdateDealCustomFields() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ dealId, customFields }: { dealId: string; customFields: Record<string, Json> }) => {
      const { error } = await supabase.from('deals').update({ custom_fields: customFields }).eq('id', dealId)
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] })
      queryClient.invalidateQueries({ queryKey: ['deal', variables.dealId] })
    },
  })
}

export function useUpdateDeal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ dealId, title, value }: { dealId: string; title: string; value: number | null }) => {
      const { error } = await supabase.from('deals').update({ title, value }).eq('id', dealId)
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] })
      queryClient.invalidateQueries({ queryKey: ['deal', variables.dealId] })
    },
  })
}
