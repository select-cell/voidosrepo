import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Task } from '@/lib/database.types'

export function useTasks(dealId: string | undefined) {
  return useQuery<Task[]>({
    queryKey: ['tasks', dealId],
    enabled: Boolean(dealId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('deal_id', dealId as string)
        .order('due_at', { ascending: true, nullsFirst: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ dealId, title, dueAt }: { dealId: string; title: string; dueAt?: string | null }) => {
      const { error } = await supabase.from('tasks').insert({ deal_id: dealId, title, due_at: dueAt ?? null })
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.dealId] })
    },
  })
}

export function useToggleTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, isDone }: { taskId: string; dealId: string; isDone: boolean }) => {
      const { error } = await supabase.from('tasks').update({ is_done: isDone }).eq('id', taskId)
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.dealId] })
    },
  })
}
