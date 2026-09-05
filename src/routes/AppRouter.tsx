import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from '@/features/auth/LoginPage'
import { PublicLeadForm } from '@/features/leads/PublicLeadForm'
import { KanbanBoard } from '@/features/pipeline/KanbanBoard'
import { ContactsList } from '@/features/contacts/ContactsList'
import { ContactDetailPanel } from '@/features/contacts/ContactDetailPanel'
import { AppShell } from '@/components/AppShell'
import { ProtectedRoute } from './ProtectedRoute'

export function AppRouter() {
  return (
    <Routes>
      {/* Öffentlich, kein Login nötig */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<PublicLeadForm />} />

      {/* Geschützter Bereich hinter Login (Bauplan Abschnitt 1: Kanban-Board
          hinter einem passwortgeschützten Bereich) */}
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/pipeline" element={<KanbanBoard />} />
        <Route path="/contacts" element={<ContactsList />} />
        <Route path="/contacts/:id" element={<ContactDetailPanel />} />
      </Route>

      <Route path="/" element={<Navigate to="/pipeline" replace />} />
      <Route path="*" element={<Navigate to="/pipeline" replace />} />
    </Routes>
  )
}
