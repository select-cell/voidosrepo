import { useDraggable } from '@dnd-kit/core'
import type { DealWithContact } from '@/lib/database.types'
import { useUiStore } from '@/store/useUiStore'

const CURRENCY_FORMAT = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })

export function DealCard({ deal }: { deal: DealWithContact }) {
  const openDeal = useUiStore((s) => s.openDeal)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
  })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

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
    </div>
  )
}
