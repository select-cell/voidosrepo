import { create } from 'zustand'

interface UiState {
  openDealId: string | null
  openDeal: (dealId: string) => void
  closeDeal: () => void
}

// Leichter UI-State (z.B. welches Deal-Panel offen ist) - siehe Bauplan
// Abschnitt 6. Bewusst getrennt von Server-State (der lebt in TanStack Query).
export const useUiStore = create<UiState>((set) => ({
  openDealId: null,
  openDeal: (dealId) => set({ openDealId: dealId }),
  closeDeal: () => set({ openDealId: null }),
}))
