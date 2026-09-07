'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Sprout } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { QueryProvider } from '@/components/query-provider'
import { AppShell } from '@/components/app-shell'
import { LandingView } from '@/components/views/landing'
import { AuthView } from '@/components/views/auth-view'
import { DashboardView } from '@/components/views/dashboard'
import { BuilderView } from '@/components/builder/builder-view'
import { TemplatesView } from '@/components/views/templates-view'
import { IntegrationsView } from '@/components/views/integrations-view'
import { AnalyticsView } from '@/components/views/analytics-view'
import { SettingsView } from '@/components/views/settings-view'
import { SeoToolsView } from '@/components/views/seo-tools-view'
import { InboxView } from '@/components/views/inbox-view'
import { SocialToolsView } from '@/components/views/social-tools-view'
import { ContentToolsView } from '@/components/views/content-tools-view'
import { PmView } from '@/components/views/pm-view'
import { AutomationView } from '@/components/views/automation-view'
import { FlowsView } from '@/components/views/flows-view'
import { useToast } from '@/hooks/use-toast'
import { fetchJson } from '@/lib/client-utils'

/* ------------------------------------------------------------------ */

function VirtuaLabDigitalLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
      <div className="size-14 rounded-2xl bg-forest text-primary-foreground flex items-center justify-center animate-pulse">
        <Sprout className="size-7" />
      </div>
      <p className="text-sm text-muted-foreground animate-pulse">Preparing your studio…</p>
    </div>
  )
}

function Bootstrapper({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const seededRef = React.useRef(false)

  const projectsQuery = useQuery<{ projects: any[] }>({
    queryKey: ['projects'],
    queryFn: () => fetchJson('/api/projects'),
  })

  const seedMut = useMutation({
    mutationFn: () =>
      fetchJson('/api/seed', { method: 'POST' }),
    onSuccess: () => {
      seededRef.current = true
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      queryClient.invalidateQueries({ queryKey: ['templates'] })
    },
  })

  React.useEffect(() => {
    if (seededRef.current) return
    if (projectsQuery.isSuccess && (projectsQuery.data?.projects?.length ?? 0) === 0) {
      seedMut.mutate()
    }
  }, [projectsQuery.isSuccess, projectsQuery.data])

  // Show loader while we are still checking or seeding
  if (projectsQuery.isLoading || (projectsQuery.isSuccess && (projectsQuery.data?.projects?.length ?? 0) === 0 && seedMut.isPending)) {
    return <VirtuaLabDigitalLoader />
  }

  if (projectsQuery.isError) {
    // Continue anyway — let the inner views show their own error states
    return <>{children}</>
  }

  return <>{children}</>
}

/* ------------------------------------------------------------------ */

interface SessionResponse {
  authenticated: boolean
  user?: {
    id: string
    name: string | null
    email: string
    plan: string
    role: string
  }
}

function AppContent() {
  const view = useAppStore((s) => s.view)
  const setView = useAppStore((s) => s.setView)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Apply theme class on first render
  const theme = useAppStore((s) => s.theme)
  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', theme === 'dark')
    }
  }, [theme])

  // Auth gate — fetch the session (httpOnly cookie, only readable server-side).
  // The landing page stays public; everything else requires an authenticated
  // session. While the check is in flight, we show the loader. If the user is
  // not authenticated, we render the AuthView (login/register) instead of the app.
  const sessionQuery = useQuery<SessionResponse>({
    queryKey: ['session'],
    queryFn: () => fetchJson('/api/auth/session'),
  })

  const needsAuth = view.name !== 'landing'
  const isAuthed = sessionQuery.data?.authenticated === true
  const showAuthGate =
    needsAuth && !isAuthed && !sessionQuery.isLoading && !sessionQuery.isError

  // OAuth callback handler — runs once on mount. The OAuth flow redirects back
  // to /?oauth=success&provider=X&integration=Y (or /?oauth=error&reason=Z).
  // We read the params, show a toast, switch to the Integrations view so the new
  // connection is visible, and clean the URL.
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    const oauth = url.searchParams.get('oauth')
    if (!oauth) return

    if (oauth === 'success') {
      const provider = url.searchParams.get('provider') ?? ''
      const integration = url.searchParams.get('integration') ?? ''
      const label = integration || provider
      toast({
        title: label ? `Connected ${label} via OAuth` : 'Connected via OAuth',
        description: 'You can now use it from the Integrations panel.',
      })
      setView({ name: 'integrations' })
      queryClient.invalidateQueries({ queryKey: ['integrations'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
    } else if (oauth === 'error') {
      const reason = url.searchParams.get('reason') ?? 'unknown_error'
      toast({
        title: 'OAuth failed',
        description: reason.replace(/_/g, ' '),
        variant: 'destructive',
      })
    }

    // Clean the URL — remove the oauth query string so a refresh doesn't replay
    // the toast / view switch.
    window.history.replaceState({}, '', window.location.pathname)
  }, [toast, setView, queryClient])

  // Auth gate: while we are checking the session for an authed view, show the
  // organic loader so the user sees a branded spinner instead of a flash of
  // the auth page or the app.
  if (needsAuth && sessionQuery.isLoading) {
    return <VirtuaLabDigitalLoader />
  }

  // Not authenticated and trying to enter the app → show the auth view.
  if (showAuthGate) {
    return <AuthView />
  }

  if (view.name === 'landing') {
    return <LandingView />
  }

  return (
    <AppShell view={view} setView={setView}>
      {view.name === 'dashboard' && <DashboardView />}
      {view.name === 'builder' && (
        <BuilderView projectId={view.projectId} pageId={view.pageId} />
      )}
      {view.name === 'templates' && <TemplatesView />}
      {view.name === 'integrations' && <IntegrationsView />}
      {view.name === 'analytics' && <AnalyticsView />}
      {view.name === 'settings' && <SettingsView />}
      {view.name === 'seo-tools' && <SeoToolsView />}
      {view.name === 'inbox' && <InboxView />}
      {view.name === 'social-tools' && <SocialToolsView />}
      {view.name === 'content-tools' && <ContentToolsView />}
      {view.name === 'pm' && <PmView />}
      {view.name === 'automation' && <AutomationView />}
      {view.name === 'flows' && <FlowsView />}
    </AppShell>
  )
}

export default function Home() {
  return (
    <QueryProvider>
      <Bootstrapper>
        <AppContent />
      </Bootstrapper>
    </QueryProvider>
  )
}
