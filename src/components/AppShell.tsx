import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { DealDetailPanel } from '@/features/deals/DealDetailPanel'
import { Button } from './Button'

const NAV_ITEMS = [
  { to: '/pipeline', label: 'Pipeline' },
  { to: '/contacts', label: 'Kontakte' },
]

export function AppShell() {
  const { user, signOut } = useAuth()

  return (
    <div className="flex h-screen bg-white">
      <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-slate-50 p-4">
        <p className="mb-6 px-2 text-sm font-semibold text-slate-900">Voidos Sales-CRM</p>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium ${
                  isActive ? 'bg-brand-100 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-2 border-t border-slate-200 pt-4">
          <p className="truncate px-2 text-xs text-slate-400">{user?.email}</p>
          <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
            Ausloggen
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
      <DealDetailPanel />
    </div>
  )
}
