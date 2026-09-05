import { useDroppable } from '@dnd-kit/core'
import type { DealWithContact, Stage } from '@/lib/database.types'
import { DealCard } from './DealCard'

interface StageColumnProps {
  stage: Stage
  deals: DealWithContact[]
  stages: Stage[]
  onMoveDeal: (dealId: string, targetStageId: string) => void
}

export function StageColumn({ stage, deals, stages, onMoveDeal }: StageColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })

  const totalValue = deals.reduce((sum, d) => sum + (d.value ? Number(d.value) : 0), 0)

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg bg-slate-100">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">{stage.name}</span>
          {stage.is_won && <span className="text-xs">🏆</span>}
          {stage.is_lost && <span className="text-xs">✕</span>}
        </div>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500">
          {deals.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-[200px] flex-1 flex-col gap-2 p-2 transition-colors ${
          isOver ? 'bg-brand-50' : ''
        }`}
      >
        {deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} stages={stages} onMoveDeal={onMoveDeal} />
        ))}
        {deals.length === 0 && (
          <p className="mt-2 text-center text-xs text-slate-400">Keine Deals</p>
        )}
      </div>
      {totalValue > 0 && (
        <div className="border-t border-slate-200 px-3 py-1.5 text-xs text-slate-400">
          Σ {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(totalValue)}
        </div>
      )}
    </div>
  )
}
