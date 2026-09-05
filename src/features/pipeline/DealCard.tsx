import { useDraggable } from '@dnd-kit/core'
import type { DealWithContact, Stage } from '@/lib/database.types'
import { useUiStore } from '@/store/useUiStore'

const CURRENCY_FORMAT = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })

function DealCardContent({ deal }: { deal: DealWithContact }) {
  return (
    <>
      <p className="text-sm font-medium text-slate-900">{deal.title}</p>
      {deal.contact && (
        <p className="mt-0.5 text-xs text-slate-500">
          {deal.contact.full_name}
          {deal.contact.company ? ` · ${deal.contact.company}` : ''}
        </p>
      )}
      {deal.value != null && (
        <p className="mt-2 text-xs font-semibold text-brand-700">
          {CURRENCY_FORMAT.format(Number(deal.value))}
        </p>
      )}
    </>
  )
}

interface DealCardProps {
  deal: DealWithContact
  stages: Stage[]
  onMoveDeal: (dealId: string, targetStageId: string) => void
}

export function DealCard({ deal, stages, onMoveDeal }: DealCardProps) {
  const openDeal = useUiStore((s) => s.openDeal)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
  })

  const style = {
    // touchAction: 'none' verhindert, dass der Browser bei Touch-Geräten
    // das Scrollen startet, statt dnd-kit die Geste als Drag erkennen zu
    // lassen (siehe dnd-kit-Doku - ohne das kann Draggen auf Tablet/Handy
    // komplett ausbleiben).
    touchAction: 'none' as const,
    ...(transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : {}),
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => openDeal(deal.id)}
      className={`cursor-grab rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      <DealCardContent deal={deal} />

      {/* Zuverlässige Alternative zum Drag&Drop: funktioniert unabhängig
          davon, ob die Ziel-Spalte gerade sichtbar/ins Board gescrollt ist,
          und unabhängig vom Eingabegerät (Maus/Trackpad/Touch). */}
      <select
        value={deal.stage_id}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onChange={(e) => onMoveDeal(deal.id, e.target.value)}
        className="mt-2 w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600"
      >
        {stages.map((stage) => (
          <option key={stage.id} value={stage.id}>
            Stage: {stage.name}
          </option>
        ))}
      </select>
    </div>
  )
}

// Rein visuelle Vorschau für <DragOverlay>. Bewusst OHNE useDraggable(): die
// Overlay-Karte darf nicht selbst nochmal denselben Drag registrieren wie
// die "echte" Karte in der Spalte - sonst gibt es während des Ziehens zwei
// Registrierungen für dieselbe id und dnd-kit verliert den Drop-Ziel-Bezug
// (Bug, der das Ablegen komplett verhindert hat).
export function DealCardOverlay({ deal }: { deal: DealWithContact }) {
  return (
    <div className="cursor-grabbing rounded-lg border border-brand-300 bg-white p-3 shadow-lg">
      <DealCardContent deal={deal} />
    </div>
  )
}
