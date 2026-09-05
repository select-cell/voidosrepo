import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useContacts } from '@/hooks/useContacts'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Spinner } from '@/components/Spinner'
import { EmptyState } from '@/components/EmptyState'
import { NewContactDialog } from './NewContactDialog'

export function ContactsList() {
  const [search, setSearch] = useState('')
  const { data: contacts, isLoading } = useContacts(search)
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-lg font-semibold text-slate-900">Kontakte</h1>
        <Button onClick={() => setDialogOpen(true)}>+ Neuer Kontakt</Button>
      </div>
      <Input
        placeholder="Suche nach Name, E-Mail oder Firma…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 max-w-sm"
      />

      {isLoading ? (
        <Spinner />
      ) : contacts?.length === 0 ? (
        <EmptyState title="Keine Kontakte gefunden" />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Firma</th>
                <th className="px-4 py-2">E-Mail</th>
                <th className="px-4 py-2">Quelle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contacts?.map((contact) => (
                <tr key={contact.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <Link to={`/contacts/${contact.id}`} className="font-medium text-brand-700 hover:underline">
                      {contact.full_name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{contact.company ?? '–'}</td>
                  <td className="px-4 py-2 text-slate-600">{contact.email ?? '–'}</td>
                  <td className="px-4 py-2 text-slate-400">{contact.source ?? '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NewContactDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  )
}
