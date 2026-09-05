import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useUiStore } from '@/store/useUiStore'
import { useDeal, useUpdateDeal, useUpdateDealCustomFields } from '@/hooks/useDeals'
import { ActivityTimeline } from './ActivityTimeline'
import { TaskList } from './TaskList'
import { CustomFieldsEditor } from './CustomFieldsEditor'
import { Spinner } from '@/components/Spinner'
import { Input } from '@/components/Input'
import type { Json } from '@/lib/database.types'

const STATUS_LABEL: Record<string, string> = { open: 'Offen', won: 'Gewonnen', lost: 'Verloren' }
const STATUS_COLOR: Record<string, string> = {
  open: 'bg-slate-100 text-slate-600',
  won: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
}

export function DealDetailPanel() {
  const openDealId = useUiStore((s) => s.openDealId)
  const closeDeal = useUiStore((s) => s.closeDeal)
  const { data: deal, isLoading } = useDeal(openDealId ?? undefined)
  const updateDeal = useUpdateDeal()
  const updateCustomFields = useUpdateDealCustomFields()

  const [title, setTitle] = useState('')
  const [value, setValue] = useState('')

  useEffect(() => {
    if (deal) {
      setTitle(deal.title)
      setValue(deal.value != null ? String(deal.value) : '')
    }
  }, [deal])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeDeal()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [closeDeal])

  if (!openDealId) return null

  return createPortal(
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/30">
      <div className="h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Deal-Details</h2>
          <button
            onClick={closeDeal}
            aria-label="Schließen"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        {isLoading || !deal ? (
          <Spinner />
        ) : (
          <div className="space-y-6">
            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[deal.status]}`}>
              {STATUS_LABEL[deal.status]}
            </span>
            {deal.status === 'lost' && deal.lost_reason && (
              <p className="text-sm text-red-600">Grund: {deal.lost_reason}</p>
            )}

            <div className="space-y-3">
              <Input
                label="Titel"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => title.trim() && title !== deal.title && updateDeal.mutate({ dealId: deal.id, title: title.trim(), value: deal.value })}
              />
              <Input
                label="Wert (EUR)"
                type="number"
                min="0"
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onBlur={() => {
                  const numeric = value ? Number(value) : null
                  if (numeric !== deal.value) updateDeal.mutate({ dealId: deal.id, title: deal.title, value: numeric })
                }}
              />
              {deal.contact && (
                <p className="text-sm text-slate-500">
                  Kontakt:{' '}
                  <Link to={`/contacts/${deal.contact.id}`} className="font-medium text-brand-700 hover:underline" onClick={closeDeal}>
                    {deal.contact.full_name}
                  </Link>
                  {deal.contact.company ? ` (${deal.contact.company})` : ''}
                </p>
              )}
            </div>

            <section>
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Custom Fields</h3>
              <CustomFieldsEditor
                value={(deal.custom_fields ?? {}) as Record<string, Json>}
                saving={updateCustomFields.isPending}
                onSave={(next) => updateCustomFields.mutate({ dealId: deal.id, customFields: next })}
              />
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Aufgaben</h3>
              <TaskList dealId={deal.id} />
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Aktivitäten</h3>
              <ActivityTimeline dealId={deal.id} />
            </section>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
