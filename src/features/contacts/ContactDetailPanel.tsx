import { Link, useParams } from 'react-router-dom'
import { useContact, useContactDeals, useUpdateContactCustomFields } from '@/hooks/useContacts'
import { ActivityTimeline } from '@/features/deals/ActivityTimeline'
import { CustomFieldsEditor } from '@/features/deals/CustomFieldsEditor'
import { Spinner } from '@/components/Spinner'
import { EmptyState } from '@/components/EmptyState'
import { useUiStore } from '@/store/useUiStore'
import type { Json } from '@/lib/database.types'

const STATUS_LABEL: Record<string, string> = { open: 'Offen', won: 'Gewonnen', lost: 'Verloren' }

export function ContactDetailPanel() {
  const { id } = useParams<{ id: string }>()
  const { data: contact, isLoading } = useContact(id)
  const { data: deals } = useContactDeals(id)
  const updateCustomFields = useUpdateContactCustomFields()
  const openDeal = useUiStore((s) => s.openDeal)

  if (isLoading || !contact) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/contacts" className="text-sm text-brand-700 hover:underline">
        ← Zurück zu Kontakten
      </Link>

      <div>
        <h1 className="text-xl font-semibold text-slate-900">{contact.full_name}</h1>
        <p className="text-sm text-slate-500">
          {contact.company && <span>{contact.company} · </span>}
          {contact.email && <span>{contact.email} · </span>}
          {contact.phone && <span>{contact.phone}</span>}
        </p>
        {contact.source && <p className="mt-1 text-xs text-slate-400">Quelle: {contact.source}</p>}
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Deals</h2>
        {deals && deals.length > 0 ? (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {deals.map((deal) => (
              <li key={deal.id}>
                <button
                  onClick={() => openDeal(deal.id)}
                  className="flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-slate-50"
                >
                  <span className="font-medium text-slate-800">{deal.title}</span>
                  <span className="text-xs text-slate-400">{STATUS_LABEL[deal.status]}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Noch keine Deals für diesen Kontakt" />
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Custom Fields</h2>
        <CustomFieldsEditor
          value={(contact.custom_fields ?? {}) as Record<string, Json>}
          saving={updateCustomFields.isPending}
          onSave={(next) => updateCustomFields.mutate({ contactId: contact.id, customFields: next })}
        />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Aktivitäten</h2>
        <ActivityTimeline contactId={contact.id} />
      </section>
    </div>
  )
}
