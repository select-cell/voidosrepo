import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Pipeline, Stage } from '@/lib/database.types'

interface PipelineWithStages {
  pipeline: Pipeline
  stages: Stage[]
}

// MVP-Scope: UI zeigt bewusst nur die eine Default-Pipeline an, auch wenn
// das Schema mehrere Pipelines zulässt (Bauplan Abschnitt 1).
export function useDefaultPipeline() {
  return useQuery<PipelineWithStages>({
    queryKey: ['pipeline', 'default'],
    queryFn: async () => {
      const { data: pipeline, error: pipelineError } = await supabase
        .from('pipelines')
        .select('*')
        .eq('is_default', true)
        .single()
      if (pipelineError) throw pipelineError

      const { data: stages, error: stagesError } = await supabase
        .from('stages')
        .select('*')
        .eq('pipeline_id', pipeline.id)
        .order('position', { ascending: true })
      if (stagesError) throw stagesError

      return { pipeline, stages: stages ?? [] }
    },
  })
}
