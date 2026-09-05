import { useState, type FormEvent } from 'react'
import { useActivities, useAddNote } from '@/hooks/useActivities'
import { Button } from '@/components/Button'
import { Textarea } from '@/components/Input'
import { Spinner } from '@/components/Spinner'

const TYPE_LABEL: Record<string, string> = {
  note: '📝',
  call: '📞',
  stage_change: '🔀',
  system: '⚙️',
}

const DATE_FORMAT = new Intl.DateTimeFormat('de-DE', { dateStyle: 'short', timeStyle: 'short' })

interface ActivityTimelineProps {
  dealId?: string
  contactId?: string
}

export function ActivityTimeline({ dealId, contactId }: ActivityTimelineProps) {
  const { data: activities, isLoading } = useActivities({ dealId, contactId })
  const addNote = useAddNote()
  const [note, setNote] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!note.trim()) return
    addNote.mutate(
      { dealId, contactId, content: note.trim() },
      { onSuccess: () => setNote('') },
    )
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          placeholder="Notiz hinzufügen…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
        />
        <div className="flex justify-end">
          <Button type="submit" variant="secondary" disabled={!note.trim() || addNote.isPending}>
            {addNote.isPending ? 'Speichern…' : 'Notiz speichern'}
          </Button>
        </div>
      </form>

      {isLoading ? (
        <Spinner />
      ) : (
        <ul className="space-y-3">
          {activities?.map((activity) => (
            <li key={activity.id} className="flex gap-2 text-sm">
              <span aria-hidden>{TYPE_LABEL[activity.type] ?? '•'}</span>
              <div>
                <p className="text-slate-700">{activity.content}</p>
                <p className="text-xs text-slate-400">{DATE_FORMAT.format(new Date(activity.created_at))}</p>
              </div>
            </li>
          ))}
          {activities?.length === 0 && <p className="text-sm text-slate-400">Noch keine Aktivitäten.</p>}
        </ul>
      )}
    </div>
  )
}
