import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useDefaultPipeline } from '@/hooks/usePipeline'
import { useDeals, useMoveDeal } from '@/hooks/useDeals'
import { StageColumn } from './StageColumn'
import { DealCardOverlay } from './DealCard'
import { LostReasonDialog } from './LostReasonDialog'
import { NewDealDialog } from './NewDealDialog'
import { Button } from '@/components/Button'
import { Spinner } from '@/components/Spinner'
import { EmptyState } from '@/components/EmptyState'
import type { DealWithContact } from '@/lib/database.types'

export function KanbanBoard() {
  const { data: pipelineData, isLoading: pipelineLoading } = useDefaultPipeline()
  const pipelineId = pipelineData?.pipeline.id
  const { data: deals, isLoading: dealsLoading } = useDeals(pipelineId)
  const moveDeal = useMoveDeal(pipelineId)

  const [activeDeal, setActiveDeal] = useState<DealWithContact | null>(null)
  const [pendingLostMove, setPendingLostMove] = useState<{ dealId: string; stageId: string } | null>(null)
  const [newDealOpen, setNewDealOpen] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Erst ab 8px Bewegung als Drag werten, damit ein normaler Klick
      // (öffnet das Deal-Panel) nicht versehentlich als Drag zählt.
      activationConstraint: { distance: 8 },
    }),
  )

  const dealsByStage = useMemo(() => {
    const map = new Map<string, DealWithContact[]>()
    for (const deal of deals ?? []) {
      const list = map.get(deal.stage_id) ?? []
      list.push(deal)
      map.set(deal.stage_id, list)
    }
    return map
  }, [deals])

  function handleDragStart(event: DragStartEvent) {
    const deal = deals?.find((d) => d.id === event.active.id)
    setActiveDeal(deal ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDeal(null)
    const { active, over } = event
    if (!over) return

    const dealId = String(active.id)
    const targetStageId = String(over.id)
    const deal = deals?.find((d) => d.id === dealId)
    if (!deal || deal.stage_id === targetStageId) return

    const targetStage = pipelineData?.stages.find((s) => s.id === targetStageId)
    if (targetStage?.is_lost) {
      setPendingLostMove({ dealId, stageId: targetStageId })
      return
    }

    moveDeal.mutate({ dealId, stageId: targetStageId })
  }

  if (pipelineLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!pipelineData) {
    return (
      <EmptyState
        title="Keine Default-Pipeline gefunden"
        description="Bitte die Supabase-Migrationen (inkl. Seed-Daten) ausführen."
      />
    )
  }

  const intakeStage = pipelineData.stages.find((s) => s.name === 'Neu') ?? pipelineData.stages[0]

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">{pipelineData.pipeline.name}</h1>
        <Button onClick={() => setNewDealOpen(true)}>+ Neuer Lead</Button>
      </div>

      {dealsLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
            {pipelineData.stages.map((stage) => (
              <StageColumn key={stage.id} stage={stage} deals={dealsByStage.get(stage.id) ?? []} />
            ))}
          </div>
          <DragOverlay>{activeDeal ? <DealCardOverlay deal={activeDeal} /> : null}</DragOverlay>
        </DndContext>
      )}

      <LostReasonDialog
        open={Boolean(pendingLostMove)}
        submitting={moveDeal.isPending}
        onCancel={() => setPendingLostMove(null)}
        onConfirm={(reason) => {
          if (!pendingLostMove) return
          moveDeal.mutate(
            { dealId: pendingLostMove.dealId, stageId: pendingLostMove.stageId, lostReason: reason },
            { onSuccess: () => setPendingLostMove(null) },
          )
        }}
      />

      {intakeStage && (
        <NewDealDialog
          open={newDealOpen}
          onClose={() => setNewDealOpen(false)}
          pipelineId={pipelineData.pipeline.id}
          intakeStageId={intakeStage.id}
        />
      )}
    </div>
  )
}
