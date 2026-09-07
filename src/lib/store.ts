import { create } from 'zustand'

export type View =
  | { name: 'landing' }
  | { name: 'dashboard' }
  | { name: 'builder'; projectId: string; pageId?: string }
  | { name: 'integrations' }
  | { name: 'settings' }
  | { name: 'templates' }
  | { name: 'analytics' }
  | { name: 'seo-tools' }
  | { name: 'inbox' }
  | { name: 'social-tools' }
  | { name: 'content-tools' }
  | { name: 'pm' }
  | { name: 'automation' }
  | { name: 'flows' }

// Builder mode — changes how the user interacts with the canvas:
//   'drag-drop' : default visual canvas (blocks palette + canvas + properties)
//   'code'      : pure HTML/CSS code editor (no palette/canvas)
//   'hybrid'    : split view — visual canvas on top, code editor below
export type BuilderMode = 'drag-drop' | 'code' | 'hybrid'

interface AppState {
  view: View
  setView: (view: View) => void
  // mobile nav state
  mobileNavOpen: boolean
  setMobileNavOpen: (open: boolean) => void
  // builder UI prefs
  previewDevice: 'desktop' | 'tablet' | 'mobile'
  setPreviewDevice: (d: 'desktop' | 'tablet' | 'mobile') => void
  previewMode: boolean
  setPreviewMode: (b: boolean) => void
  selectedBlockId: string | null
  setSelectedBlockId: (id: string | null) => void
  // builder mode switcher (drag-drop | code | hybrid)
  builderMode: BuilderMode
  setBuilderMode: (m: BuilderMode) => void
  // theme
  theme: 'light' | 'dark'
  toggleTheme: () => void
  setTheme: (t: 'light' | 'dark') => void
}

export const useAppStore = create<AppState>((set, get) => ({
  view: { name: 'landing' },
  setView: (view) => set({ view }),
  mobileNavOpen: false,
  setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
  previewDevice: 'desktop',
  setPreviewDevice: (previewDevice) => set({ previewDevice }),
  previewMode: false,
  setPreviewMode: (previewMode) => set({ previewMode }),
  selectedBlockId: null,
  setSelectedBlockId: (selectedBlockId) => set({ selectedBlockId }),
  builderMode: 'drag-drop',
  setBuilderMode: (builderMode) => set({ builderMode }),
  theme: 'light',
  toggleTheme: () =>
    set((s) => {
      const next = s.theme === 'light' ? 'dark' : 'light'
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark', next === 'dark')
      }
      return { theme: next }
    }),
  setTheme: (t) => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', t === 'dark')
    }
    set({ theme: t })
  },
}))
