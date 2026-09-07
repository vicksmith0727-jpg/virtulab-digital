'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Loader2,
  Zap,
  Plus,
  Sparkles,
  AlertCircle,
  ArrowRight,
  Clock,
  ExternalLink,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { fetchJson, DynamicIcon } from '@/lib/client-utils'
import {
  AddCustomToolDialog,
  AddCustomToolCard,
  CustomToolRunDialog,
  CustomToolCard,
  BuiltInToolEditButton,
  BuiltInToolInfoDialog,
  useDeleteCustomTool,
  AUTOMATION_CATEGORIES,
  type CustomTool,
  type BuiltInToolLike,
} from '@/components/shared/add-custom-tool-dialog'

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface AutomationTool {
  id: string
  label: string
  icon: string
  description: string
  kind: 'builtin' | 'integration'
  integrationName?: string
  enabled?: boolean
  config?: string | null
  lastRunAt?: string | null
}

interface AutomationCatalogResponse {
  tools: AutomationTool[]
  note: string
}

interface IntegrationRow {
  id: string
  name: string
  category?: string
  iconKey?: string | null
  status?: string
}

interface IntegrationConnection {
  id: string
  integrationId: string
  enabled: boolean
  integration?: { id: string; name: string; category: string }
}

interface IntegrationsResponse {
  integrations: IntegrationRow[]
  connections: IntegrationConnection[]
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatLastRun(d?: string | null): string {
  if (!d) return ''
  const date = new Date(d)
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `${diffD}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/* ------------------------------------------------------------------ */
/* Main view                                                           */
/* ------------------------------------------------------------------ */

export function AutomationView() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const setView = useAppStore((s) => s.setView)

  const catalogQuery = useQuery<AutomationCatalogResponse>({
    queryKey: ['automation-catalog'],
    queryFn: () => fetchJson('/api/automation/catalog'),
  })

  // Fetch custom automation tools (category='automation'). These render as
  // additional cards with a "CUSTOM" badge — they don't have on/off toggles.
  const customToolsQuery = useQuery<{ tools: CustomTool[] }>({
    queryKey: ['custom-tools'],
    queryFn: () => fetchJson('/api/tools/custom'),
  })
  const customAutomationTools = (customToolsQuery.data?.tools ?? []).filter(
    (t) => t.category === 'automation',
  )
  const [addCustomOpen, setAddCustomOpen] = React.useState(false)
  const [activeCustomTool, setActiveCustomTool] = React.useState<CustomTool | null>(null)
  // Master-panel: edit + delete + inspect/clone for every tool.
  const [editingTool, setEditingTool] = React.useState<CustomTool | null>(null)
  const [infoTool, setInfoTool] = React.useState<BuiltInToolLike | null>(null)
  const deleteMut = useDeleteCustomTool()

  function handleDeleteCustom(tool: CustomTool) {
    if (
      typeof window !== 'undefined' &&
      !window.confirm(`Delete the custom tool "${tool.label}"? This can't be undone.`)
    )
      return
    deleteMut.mutate({
      id: tool.id,
      invalidateKeys: [['automation-catalog'], ['custom-tools']],
    })
  }

  function openBuiltInInfo(tool: AutomationTool) {
    setInfoTool({
      id: tool.id,
      label: tool.label,
      description: tool.description,
      iconKey: tool.icon,
      category: 'automation',
    })
  }

  // Connections query — used to decide whether integration-kind tools can be
  // toggled on (their integration must be connected first).
  const integrationsQuery = useQuery<IntegrationsResponse>({
    queryKey: ['integrations'],
    queryFn: () => fetchJson('/api/integrations'),
    // The automation catalog depends on this to render the "Connect first" link
    // vs the toggle, so we want it fresh.
    refetchOnMount: true,
  })

  // Build a set of connected integration names (case-insensitive).
  const connections = integrationsQuery.data?.connections ?? []
  const connectedIntegrationNames = React.useMemo(() => {
    const names = new Set<string>()
    for (const c of connections) {
      if (c.enabled && c.integration?.name) {
        names.add(c.integration.name.toLowerCase())
      }
    }
    return names
  }, [connections])

  // Optimistic toggle mutation. We update the catalog cache immediately and
  // roll back on error.
  const toggleMut = useMutation({
    mutationFn: async (vars: { toolId: string; enabled: boolean }) => {
      return fetchJson('/api/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars),
      })
    },
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ['automation-catalog'] })
      const prev = queryClient.getQueryData<AutomationCatalogResponse>([
        'automation-catalog',
      ])
      if (prev) {
        queryClient.setQueryData<AutomationCatalogResponse>(['automation-catalog'], {
          ...prev,
          tools: prev.tools.map((t) =>
            t.id === vars.toolId ? { ...t, enabled: vars.enabled } : t,
          ),
        })
      }
      return { prev }
    },
    onError: (_e, vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(['automation-catalog'], ctx.prev)
      }
      toast({
        title: vars.enabled
          ? 'Could not enable automation'
          : 'Could not disable automation',
        variant: 'destructive',
      })
    },
    onSuccess: (_data, vars) => {
      toast({
        title: vars.enabled ? 'Automation enabled' : 'Automation disabled',
        description: 'Toggle any automation on/off at any time.',
      })
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['automation-catalog'] })
    },
  })

  // Listen for nav dropdown clicks → scroll to / highlight the matching card.
  const [highlightId, setHighlightId] = React.useState<string | null>(null)
  React.useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail
      if (detail && typeof detail.toolId === 'string') {
        setHighlightId(detail.toolId)
        // Scroll the matching card into view.
        if (typeof document !== 'undefined') {
          const el = document.getElementById(`automation-${detail.toolId}`)
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }
        // Clear the highlight after ~1.6s.
        window.setTimeout(() => setHighlightId(null), 1600)
      }
    }
    window.addEventListener('automation:set-tool', handler as EventListener)
    return () => window.removeEventListener('automation:set-tool', handler as EventListener)
  }, [])

  function openAddAutomation() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('app:add-feature', { detail: { kind: 'automation' } }),
      )
    }
  }

  const tools = catalogQuery.data?.tools ?? []
  const enabledCount = tools.filter((t) => t.enabled).length

  return (
    <div className="flex-1 overflow-auto organic-bg min-h-full flex flex-col">
      {/* Hero */}
      <section className="relative px-4 sm:px-6 pt-10 pb-10 sm:pt-12 sm:pb-12 border-b border-border bg-forest text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 organic-grain opacity-25 pointer-events-none" />
        <div className="max-w-6xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-wrap items-start justify-between gap-4"
          >
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-cream/30 bg-cream/10 text-cream px-3 py-1 text-xs font-medium uppercase tracking-wider">
                  <Zap className="size-3.5" />
                  Automation
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-sage/40 bg-sage/15 text-sage px-3 py-1 text-xs font-medium uppercase tracking-wider">
                  <Sparkles className="size-3.5" />
                  Built in + Integrations
                </span>
              </div>
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-balance leading-[1.05]">
                Automation — let the robots do the busywork
              </h1>
              <p className="mt-4 text-lg sm:text-xl text-cream/85 max-w-2xl text-balance">
                Workflows, auto-publish, auto-reports, auto-backups. Toggle on/off.
              </p>
            </div>
            <Button
              type="button"
              onClick={openAddAutomation}
              className="bg-cream text-bark hover:bg-cream/90"
            >
              <Plus className="size-4" /> Add automation
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Body */}
      <section className="flex-1 px-4 sm:px-6 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Stats row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                All automations ({tools.length})
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {enabledCount} enabled ·{' '}
                {tools.filter((t) => t.kind === 'builtin').length} built-in ·{' '}
                {tools.filter((t) => t.kind === 'integration').length} integration-based
              </p>
            </div>
            {integrationsQuery.isLoading && (
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="size-3.5 animate-spin" /> Checking connections…
              </span>
            )}
          </div>

          {/* Grid */}
          {catalogQuery.isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} className="h-44 rounded-2xl" />
              ))}
            </div>
          ) : catalogQuery.isError ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
              Could not load automations. Please refresh.
            </div>
          ) : tools.length === 0 && customAutomationTools.length === 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* "+" card alone when there are no tools yet */}
              <AddCustomToolCard
                onClick={() => setAddCustomOpen(true)}
                title="Add custom automation"
                subtitle="Add your own automation tool."
                ariaLabel="Add custom automation"
              />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tools.map((tool) => {
                const isIntegration = tool.kind === 'integration'
                const isConnected = isIntegration
                  ? !!tool.integrationName &&
                    connectedIntegrationNames.has(tool.integrationName.toLowerCase())
                  : true
                const isHighlighted = highlightId === tool.id
                return (
                  <AutomationCard
                    key={tool.id}
                    tool={tool}
                    isConnected={isConnected}
                    isHighlighted={isHighlighted}
                    onToggle={(enabled) =>
                      toggleMut.mutate({ toolId: tool.id, enabled })
                    }
                    isToggling={
                      toggleMut.isPending &&
                      toggleMut.variables?.toolId === tool.id
                    }
                    onGoToIntegrations={() => setView({ name: 'integrations' })}
                    onEdit={() => openBuiltInInfo(tool)}
                  />
                )
              })}
              {/* Custom automation tools (no on/off toggle — they're just cards) */}
              {customAutomationTools.map((ct) => (
                <CustomToolCard
                  key={ct.id}
                  tool={ct}
                  onOpen={() => setActiveCustomTool(ct)}
                  onEdit={() => setEditingTool(ct)}
                  onDelete={() => handleDeleteCustom(ct)}
                />
              ))}
              {/* "+" custom tool card at the end of the grid */}
              <AddCustomToolCard
                onClick={() => setAddCustomOpen(true)}
                title="Add custom automation"
                subtitle="Add your own automation tool."
                ariaLabel="Add custom automation"
              />
            </div>
          )}

          {/* Note */}
          {catalogQuery.data?.note && (
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground flex items-start gap-2">
              <AlertCircle className="size-4 text-forest shrink-0 mt-0.5" />
              <span>{catalogQuery.data.note}</span>
            </div>
          )}
        </div>
      </section>

      {/* Sticky footer */}
      <footer className="mt-auto border-t border-border bg-card px-4 sm:px-6 py-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>Toggle any automation on/off — they run on the VirtuaLab Digital server.</span>
          <span>VirtuaLab Digital · Automation</span>
        </div>
      </footer>

      {/* "+" custom tool dialog */}
      <AddCustomToolDialog
        open={addCustomOpen}
        onOpenChange={setAddCustomOpen}
        defaultCategory="automation"
        categories={AUTOMATION_CATEGORIES}
        invalidateKeys={[['automation-catalog'], ['custom-tools']]}
        title="Add custom automation"
        description="Add your own automation tool — saved to your project only."
        showCategory={false}
        fixedCategory
      />

      {/* Edit custom tool dialog (master panel) */}
      <AddCustomToolDialog
        open={!!editingTool}
        onOpenChange={(o) => !o && setEditingTool(null)}
        defaultCategory="automation"
        categories={AUTOMATION_CATEGORIES}
        invalidateKeys={[['automation-catalog'], ['custom-tools']]}
        showCategory={false}
        fixedCategory
        editTool={editingTool}
      />

      {/* Built-in tool inspect/clone dialog (master panel) */}
      <BuiltInToolInfoDialog
        tool={infoTool}
        open={!!infoTool}
        onOpenChange={(o) => !o && setInfoTool(null)}
        categories={AUTOMATION_CATEGORIES}
        defaultCategory="automation"
        invalidateKeys={[['automation-catalog'], ['custom-tools']]}
        fixedCategory
        categoryLabel="Automation"
      />

      {/* Custom tool runner */}
      <CustomToolRunDialog
        tool={activeCustomTool}
        open={!!activeCustomTool}
        onOpenChange={(o) => {
          if (!o) setActiveCustomTool(null)
        }}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Automation card                                                     */
/* ------------------------------------------------------------------ */

function AutomationCard({
  tool,
  isConnected,
  isHighlighted,
  onToggle,
  isToggling,
  onGoToIntegrations,
  onEdit,
}: {
  tool: AutomationTool
  isConnected: boolean
  isHighlighted: boolean
  onToggle: (enabled: boolean) => void
  isToggling: boolean
  onGoToIntegrations: () => void
  onEdit: () => void
}) {
  const isIntegration = tool.kind === 'integration'
  return (
    <Card
      id={`automation-${tool.id}`}
      className={cn(
        'py-5 gap-0 transition-all',
        isHighlighted && 'ring-2 ring-forest shadow-lg',
        tool.enabled && 'border-forest/40',
      )}
    >
      <CardContent className="px-5 pt-0 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <span className="size-10 rounded-xl bg-forest/10 text-forest flex items-center justify-center shrink-0">
            <DynamicIcon name={tool.icon} className="size-5" />
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] uppercase tracking-wider',
                isIntegration
                  ? 'bg-terracotta/10 text-terracotta border-terracotta/30'
                  : 'bg-forest/10 text-forest border-forest/30',
              )}
            >
              {isIntegration ? 'Integration' : 'Built-in'}
            </Badge>
            {/* Master panel: inspect + clone button on built-in tools */}
            <BuiltInToolEditButton label={tool.label} onClick={onEdit} />
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{tool.label}</p>
          <p className="text-xs text-muted-foreground line-clamp-3 mt-1">
            {tool.description}
          </p>
        </div>

        {/* Built-in last run timestamp */}
        {!isIntegration && tool.lastRunAt && (
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Clock className="size-3" /> Last run {formatLastRun(tool.lastRunAt)}
          </p>
        )}

        {/* Integration not connected → "Connect first" CTA */}
        {isIntegration && !isConnected && (
          <div className="rounded-lg border border-terracotta/30 bg-terracotta/5 px-3 py-2.5">
            <p className="text-xs text-terracotta flex items-center gap-1.5 mb-1">
              <AlertCircle className="size-3.5" /> Requires {tool.integrationName} to be connected.
            </p>
            <button
              type="button"
              onClick={onGoToIntegrations}
              className="text-xs font-medium text-forest hover:underline flex items-center gap-1"
            >
              Connect first <ArrowRight className="size-3" />
            </button>
          </div>
        )}

        {/* Toggle row */}
        <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Switch
              checked={!!tool.enabled}
              disabled={isToggling || (isIntegration && !isConnected)}
              onCheckedChange={onToggle}
              aria-label={`Toggle ${tool.label}`}
            />
            <span
              className={cn(
                'text-xs font-medium',
                tool.enabled ? 'text-forest' : 'text-muted-foreground',
              )}
            >
              {tool.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          {isToggling && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
          {isIntegration && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <ExternalLink className="size-3" /> {tool.integrationName}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
