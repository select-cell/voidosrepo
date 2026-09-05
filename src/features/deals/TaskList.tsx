import { useState, type FormEvent } from 'react'
import { useCreateTask, useTasks, useToggleTask } from '@/hooks/useTasks'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Spinner } from '@/components/Spinner'

const DATE_FORMAT = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' })

export function TaskList({ dealId }: { dealId: string }) {
  const { data: tasks, isLoading } = useTasks(dealId)
  const createTask = useCreateTask()
  const toggleTask = useToggleTask()
  const [title, setTitle] = useState('')
  const [dueAt, setDueAt] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    createTask.mutate(
      { dealId, title: title.trim(), dueAt: dueAt || null },
      {
        onSuccess: () => {
          setTitle('')
          setDueAt('')
        },
      },
    )
  }

  const openTasks = tasks?.filter((t) => !t.is_done) ?? []
  const doneTasks = tasks?.filter((t) => t.is_done) ?? []
  const now = Date.now()

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <Input label="Neue Aufgabe" value={title} onChange={(e) => setTitle(e.target.value)} className="flex-1" />
        <Input label="Fällig am" type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
        <Button type="submit" disabled={!title.trim() || createTask.isPending}>
          +
        </Button>
      </form>

      {isLoading ? (
        <Spinner />
      ) : (
        <ul className="space-y-1.5">
          {openTasks.map((task) => {
            const overdue = task.due_at ? new Date(task.due_at).getTime() < now : false
            return (
              <li key={task.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={task.is_done}
                  onChange={(e) => toggleTask.mutate({ taskId: task.id, dealId, isDone: e.target.checked })}
                />
                <span className="flex-1 text-slate-700">{task.title}</span>
                {task.due_at && (
                  <span className={`text-xs ${overdue ? 'font-medium text-red-600' : 'text-slate-400'}`}>
                    {DATE_FORMAT.format(new Date(task.due_at))}
                  </span>
                )}
              </li>
            )
          })}
          {doneTasks.length > 0 && (
            <li className="pt-1 text-xs font-medium uppercase tracking-wide text-slate-400">Erledigt</li>
          )}
          {doneTasks.map((task) => (
            <li key={task.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={task.is_done}
                onChange={(e) => toggleTask.mutate({ taskId: task.id, dealId, isDone: e.target.checked })}
              />
              <span className="flex-1 text-slate-400 line-through">{task.title}</span>
            </li>
          ))}
          {tasks?.length === 0 && <p className="text-sm text-slate-400">Keine Aufgaben.</p>}
        </ul>
      )}
    </div>
  )
}
