import { create } from 'zustand'

interface UIState {
  sidebarCollapsed: boolean
  notificationsOpen: boolean
  toggleSidebar: () => void
  setNotificationsOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  notificationsOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setNotificationsOpen: (open) => set({ notificationsOpen: open })
}))
