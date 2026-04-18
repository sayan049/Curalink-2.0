import { create } from 'zustand';

const useUIStore = create((set) => ({
  sidebarOpen: true,
  theme: 'light',
  toast: null,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  setTheme: (theme) => set({ theme }),

  showToast: (message, type = 'info') =>
    set({ toast: { message, type, id: Date.now() } }),

  hideToast: () => set({ toast: null }),
}));

export default useUIStore;