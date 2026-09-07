'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Loader2,
  Plug,
  CheckCircle2,
  Circle,
  Trash2,
  Sparkles,
  Network,
  Search,
  ExternalLink,
  Send,
  Plus,
  X,
  Bot,
  Copy,
  Radar,
  ScanLine,
  Brain,
  Workflow,
  Code2,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { DynamicIcon } from '@/lib/client-utils'

/* ------------------------------------------------------------------ */

interface Integration {
  id: string
  name: string
  category: string
  description?: string | null
  iconKey?: string | null
  fields?: any[]
  status?: string
  // Catalog-only fields, not persisted on the Integration row but merged in
  // via OAUTH_FALLBACK / toolsByName so the frontend can branch on them.
  authMethod?: 'apikey' | 'oauth' | 'appPassword' | 'none' | 'auto' | null
  oauthProvider?: string | null
  link?: string | null
  capabilities?: string[]
}

interface Connection {
  id: string
  integrationId: string
  projectId?: string | null
  config: any
  enabled: boolean
  integration?: { id: string; name: string; category: string }
}

interface ToolInfo {
  name: string
  category: string
  description: string
  link: string | null
  capabilities: string[]
  fieldsCount: number
}

// Catalog-only metadata that the API may not surface. We use this to render
// the "Log in with X" OAuth button for social + Google Search Console even
// if the backend doesn't return authMethod/oauthProvider on the row.
// Keep in sync with src/app/api/_lib/integrations.ts.
const OAUTH_FALLBACK: Record<string, { authMethod: string; oauthProvider: string }> = {
  'Facebook': { authMethod: 'oauth', oauthProvider: 'facebook' },
  'X (Twitter)': { authMethod: 'oauth', oauthProvider: 'x' },
  'Instagram': { authMethod: 'oauth', oauthProvider: 'instagram' },
  'LinkedIn': { authMethod: 'oauth', oauthProvider: 'linkedin' },
  'Google Search Console': { authMethod: 'oauth', oauthProvider: 'gsc' },
}

// Reference-only integrations (no fields, just catalog entries to learn from).
// The backend doesn't surface authMethod on the row, so we mirror the catalog
// here so the card shows a "Reference" badge instead of a Connect button.
const NONE_AUTH_FALLBACK = new Set<string>([
  'WordPress Plugin Boilerplate',
  'Awesome OpenCode',
])

function resolveAuthMethod(integration: Integration): {
  authMethod: string
  oauthProvider?: string
} {
  if (integration.authMethod) {
    return { authMethod: integration.authMethod, oauthProvider: integration.oauthProvider ?? undefined }
  }
  const fb = OAUTH_FALLBACK[integration.name]
  if (fb) return { authMethod: fb.authMethod, oauthProvider: fb.oauthProvider }
  if (NONE_AUTH_FALLBACK.has(integration.name)) return { authMethod: 'none' }
  // WordPress uses an Application Password (username + app password) — not OAuth.
  if (integration.name === 'WordPress') return { authMethod: 'appPassword' }
  return { authMethod: 'apikey' }
}

async function fetchJson(url: string, opts?: RequestInit) {
  const res = await fetch(url, opts)
  if (!res.ok) throw new Error((await res.text().catch(() => '')) || 'Request failed')
  return res.json()
}

// Stable id for each integration card so AI-router chips can scroll to them.
function cardSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-')
}

/* ------------------------------------------------------------------ */
// Auto-detect helpers — shared between the Auto-detect Local Tools panel
// and the per-card "Auto-detect" button on authMethod='auto' integrations.

// DiscoveredService shape returned by GET /api/integrations/auto-detect.
interface DiscoveredService {
  kind: 'ollama' | 'n8n' | 'zeroclaw' | 'opencode-cli' | 'wordpress-mcp' | 'mcp'
  name: string
  endpoint: string
  status: 'reachable' | 'unreachable'
  responseTimeMs?: number
  details?: string
}

// Map a discovered service "kind" → the lucide icon to render in the panel.
function iconForServiceKind(kind: string) {
  switch (kind) {
    case 'ollama':
      return Brain
    case 'n8n':
      return Workflow
    case 'zeroclaw':
      return Bot
    case 'opencode-cli':
      return Code2
    case 'wordpress-mcp':
    case 'mcp':
      return Network
    default:
      return Radar
  }
}

// Map an integration catalog name → the discovery "kind". This lets the
// per-card "Auto-detect" button find its matching discovered service after
// a scan. Kilocode reuses the OpenCode CLI detection (it's the same family).
const INTEGRATION_NAME_TO_KIND: Record<string, string> = {
  'n8n': 'n8n',
  'Zeroclaw': 'zeroclaw',
  'OpenCode': 'opencode-cli',
  'Kilocode': 'opencode-cli',
  'WordPress MCP Server': 'wordpress-mcp',
  'WordPress MCP (tropk-ai)': 'wordpress-mcp',
}

function kindForIntegrationName(name: string): string | null {
  return INTEGRATION_NAME_TO_KIND[name] ?? null
}

// Safely parse a connection.config (Prisma stores it as a JSON string).
function parseConfig(cfg: any): Record<string, any> | null {
  if (!cfg) return null
  if (typeof cfg === 'string') {
    try {
      return JSON.parse(cfg)
    } catch {
      return null
    }
  }
  if (typeof cfg === 'object') return cfg as Record<string, any>
  return null
}

/* ------------------------------------------------------------------ */

export function IntegrationsView() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const integrationsQuery = useQuery<{
    integrations: Integration[]
    connections: Connection[]
  }>({
    queryKey: ['integrations'],
    queryFn: () => fetchJson('/api/integrations'),
  })

  // Tool catalog (with link + capabilities) so cards can show "Learn more" and
  // capability badges. The main integrations endpoint doesn't surface those fields,
  // so we fetch the AI tool catalog and merge by name.
  const toolsQuery = useQuery<{ categories: any[]; tools: ToolInfo[] }>({
    queryKey: ['ai-tools'],
    queryFn: () => fetchJson('/api/ai/tools'),
  })

  const toolsByName = React.useMemo(() => {
    const map: Record<string, ToolInfo> = {}
    for (const t of toolsQuery.data?.tools ?? []) map[t.name] = t
    return map
  }, [toolsQuery.data])

  const connectMut = useMutation({
    mutationFn: (payload: { integrationId: string; config: Record<string, any> }) =>
      fetchJson('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      toast({ title: 'Integration connected' })
    },
    onError: () => toast({ title: 'Connection failed', variant: 'destructive' }),
  })

  const updateMut = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string
      body: { enabled?: boolean; config?: Record<string, any> }
    }) =>
      fetchJson(`/api/integrations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] })
    },
    onError: () => toast({ title: 'Update failed', variant: 'destructive' }),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/integrations/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      toast({ title: 'Integration disconnected' })
    },
    onError: () => toast({ title: 'Disconnect failed', variant: 'destructive' }),
  })

  // ---- Auto-detect Local Tools --------------------------------------------
  // Scans localhost for open-source tools (Ollama, n8n, Zeroclaw, WordPress MCP,
  // OpenCode CLI) and lets the user one-click auto-connect any reachable one.
  // The per-card "Auto-detect" button (Feature 2) calls into the same scan +
  // auto-connect flow so the panel + the cards stay in sync.
  const [scanData, setScanData] = React.useState<{
    services: DiscoveredService[]
    note?: string
  } | null>(null)
  // Track which kind is currently auto-connecting (for the per-row spinner).
  const [connectingKind, setConnectingKind] = React.useState<string | null>(null)

  const scanMut = useMutation({
    mutationFn: () =>
      fetchJson('/api/integrations/auto-detect') as Promise<{
        ok: boolean
        services: DiscoveredService[]
        note?: string
      }>,
    onSuccess: (data) => {
      setScanData({ services: data.services ?? [], note: data.note })
    },
    onError: () =>
      toast({ title: 'Scan failed', variant: 'destructive' }),
  })

  async function autoConnectByKind(kind: string): Promise<boolean> {
    const svc = scanData?.services.find((s) => s.kind === kind)
    if (!svc || svc.status !== 'reachable') {
      const hint = svc?.details ?? 'Start the service, then scan again.'
      toast({
        title: `${svc?.name ?? kind} is not running`,
        description: hint,
        variant: 'destructive',
      })
      return false
    }
    setConnectingKind(kind)
    try {
      await fetchJson('/api/integrations/auto-detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind }),
      })
      queryClient.invalidateQueries({ queryKey: ['integrations'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      queryClient.invalidateQueries({ queryKey: ['zeroclaw'] })
      toast({
        title: `Auto-connected ${svc.name}`,
        description: svc.endpoint,
      })
      return true
    } catch (err: any) {
      const msg = err?.message || 'Auto-connect failed.'
      toast({
        title: 'Auto-connect failed',
        description: msg,
        variant: 'destructive',
      })
      return false
    } finally {
      setConnectingKind(null)
    }
  }

  // Per-card "Auto-detect" handler — runs a fresh scan first (in case the user
  // just started the service), then auto-connects the matching kind. This is
  // shared with the panel: clicking the card button also refreshes the panel.
  const [cardDetectingName, setCardDetectingName] = React.useState<string | null>(
    null,
  )

  async function handleCardAutoDetect(integration: Integration) {
    const kind = kindForIntegrationName(integration.name)
    if (!kind) {
      toast({
        title: 'Auto-detect not available',
        description: 'This integration is not on the auto-detect list.',
        variant: 'destructive',
      })
      return
    }
    setCardDetectingName(integration.name)
    try {
      // Always re-scan — it's cheap (~4ms parallel) and the service may have
      // just been started. The panel state updates as a side effect.
      const result = await scanMut.mutateAsync()
      const svc = (result.services ?? []).find((s) => s.kind === kind)
      if (!svc) {
        toast({
          title: 'Could not detect this tool',
          description: 'No matching service found in the scan.',
          variant: 'destructive',
        })
        return
      }
      if (svc.status !== 'reachable') {
        toast({
          title: `${svc.name} is not running`,
          description: svc.details ?? 'Start the service, then try again.',
          variant: 'destructive',
        })
        return
      }
      // Reachable — auto-connect.
      setConnectingKind(kind)
      try {
        await fetchJson('/api/integrations/auto-detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind }),
        })
        queryClient.invalidateQueries({ queryKey: ['integrations'] })
        queryClient.invalidateQueries({ queryKey: ['analytics'] })
        queryClient.invalidateQueries({ queryKey: ['zeroclaw'] })
        toast({
          title: `Auto-connected ${svc.name}`,
          description: svc.endpoint,
        })
      } catch (err: any) {
        toast({
          title: 'Auto-connect failed',
          description: err?.message || 'Failed to connect.',
          variant: 'destructive',
        })
      } finally {
        setConnectingKind(null)
      }
    } catch {
      toast({ title: 'Scan failed', variant: 'destructive' })
    } finally {
      setCardDetectingName(null)
    }
  }

  // ---- Custom integration ("+" card) -------------------------------------
  // User-added in-house tools / niche services. POSTs /api/integrations/custom
  // and shows up in the catalog as a regular IntegrationCard after the refresh.
  const [customOpen, setCustomOpen] = React.useState(false)
  const [customForm, setCustomForm] = React.useState({
    name: '',
    category: 'custom',
    description: '',
    iconKey: 'Plug',
  })
  // Repeatable fields: each row has { key, label, type }
  const [customFields, setCustomFields] = React.useState<
    { key: string; label: string; type: 'text' | 'password' | 'number' }[]
  >([])

  function resetCustomForm() {
    setCustomForm({ name: '', category: 'custom', description: '', iconKey: 'Plug' })
    setCustomFields([])
  }

  const addCustomMut = useMutation({
    mutationFn: (payload: {
      name: string
      category: string
      description?: string
      iconKey?: string
      fields?: { key: string; label: string; type: string }[]
    }) =>
      fetchJson('/api/integrations/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      queryClient.invalidateQueries({ queryKey: ['ai-tools'] })
      toast({ title: 'Custom integration added' })
      setCustomOpen(false)
      resetCustomForm()
    },
    onError: (err: any) => {
      const msg = err?.message || 'Could not add integration'
      toast({ title: 'Add failed', description: msg, variant: 'destructive' })
    },
  })

  function submitCustomForm() {
    const name = customForm.name.trim()
    if (!name) return
    addCustomMut.mutate({
      name,
      category: customForm.category.trim().toLowerCase() || 'custom',
      description: customForm.description.trim(),
      iconKey: customForm.iconKey.trim() || 'Plug',
      fields: customFields
        .filter((f) => f.key.trim() && f.label.trim())
        .map((f) => ({ key: f.key.trim(), label: f.label.trim(), type: f.type })),
    })
  }

  // AI Tool Router state
  const [aiGoal, setAiGoal] = React.useState('')
  const [aiReply, setAiReply] = React.useState<string | null>(null)
  const aiChatMut = useMutation({
    mutationFn: (payload: { messages: { role: 'user' | 'assistant'; content: string }[] }) =>
      fetchJson('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: (data: any) => setAiReply(data?.reply ?? 'No reply.'),
    onError: () =>
      toast({ title: 'Assistant unavailable', variant: 'destructive' }),
  })

  function submitAiGoal() {
    const goal = aiGoal.trim()
    if (!goal) return
    setAiReply(null)
    aiChatMut.mutate({
      messages: [
        {
          role: 'user',
          content: `I want to ${goal}. Which integrations should I connect?`,
        },
      ],
    })
  }

  // ---- Zeroclaw task runner banner --------------------------------------
  // A first-class "Run with Zeroclaw" banner above the catalog. If Zeroclaw is
  // not connected, show a "Connect Zeroclaw" CTA that scrolls to the Zeroclaw
  // card. If connected, show an inline task input + Run button + response card.
  const zeroclawQuery = useQuery<{ connected: boolean; endpoint: string | null }>({
    queryKey: ['zeroclaw'],
    queryFn: () => fetchJson('/api/zeroclaw/run'),
  })
  const zeroclawConnected = !!zeroclawQuery.data?.connected
  const [zcTask, setZcTask] = React.useState('')
  const [zcReply, setZcReply] = React.useState<string | null>(null)
  const zcRunMut = useMutation({
    mutationFn: (payload: { task: string }) =>
      fetchJson('/api/zeroclaw/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: (data: any) => setZcReply(data?.response ?? 'No response.'),
    onError: (err: any) => {
      let msg: string = err?.message || 'Zeroclaw task failed.'
      try {
        const m = msg.match(/\{[\s\S]*?\}/)
        if (m) {
          const parsed = JSON.parse(m[0])
          if (parsed?.error) msg = parsed.error
        }
      } catch {
        /* ignore */
      }
      if (
        msg.length > 200 ||
        msg.toLowerCase().includes('<!doctype') ||
        msg.toLowerCase().includes('<html')
      ) {
        msg = 'Could not reach the Zeroclaw agent. Check the connection in the Automation section below.'
      }
      toast({ title: 'Zeroclaw task failed', description: msg, variant: 'destructive' })
    },
  })

  function submitZcTask() {
    const task = zcTask.trim()
    if (!task) return
    setZcReply(null)
    zcRunMut.mutate({ task })
  }

  function copyZcReply() {
    if (!zcReply) return
    navigator.clipboard
      ?.writeText(zcReply)
      .then(() => toast({ title: 'Copied to clipboard' }))
      .catch(() => toast({ title: 'Could not copy', variant: 'destructive' }))
  }

  function scrollToZeroclawCard() {
    // The Zeroclaw integration card lives in the Automation category section.
    // Its slug = 'zeroclaw' (lowercased, spaces → dashes).
    const el = document.getElementById('int-zeroclaw')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('ring-2', 'ring-forest', 'ring-offset-2', 'ring-offset-background')
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-forest', 'ring-offset-2', 'ring-offset-background')
      }, 1800)
    }
  }

  function scrollToCard(name: string) {
    const el = document.getElementById(`int-${cardSlug(name)}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('ring-2', 'ring-forest', 'ring-offset-2', 'ring-offset-background')
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-forest', 'ring-offset-2', 'ring-offset-background')
      }, 1800)
    }
  }

  const [openId, setOpenId] = React.useState<string | null>(null)
  const [config, setConfig] = React.useState<Record<string, any>>({})

  const integrations = integrationsQuery.data?.integrations ?? []
  const connections = integrationsQuery.data?.connections ?? []

  // Order categories: mcp and cms at the very top (after the AI/MCP hero sections),
  // then the rest alphabetically. We render mcp separately in the MCP Registry
  // highlight block, and 'custom' separately in the Custom ("+") section at the
  // very bottom — so we exclude both from the main loop below to avoid duplicates.
  // SEO tools are consolidated into the SEO Suite section (both the `seo` category
  // and SEO-related MCP servers), so they're also excluded from the lower loops.
  const SEO_CAPABILITIES = ['seo', 'search-console', 'bing', 'audits', 'schema', 'sitemaps', 'crawler', 'web-search']
  const isSeoIntegration = (i: Integration) =>
    i.category === 'seo' ||
    (i.capabilities ?? []).some((c: string) => SEO_CAPABILITIES.includes(c))

  const seoSuiteItems = integrations.filter(isSeoIntegration)
  const seoSuiteNames = new Set(seoSuiteItems.map((i) => i.name))

  const otherCategories = Array.from(
    new Set(
      integrations
        .filter((i) => i.category !== 'mcp' && i.category !== 'custom')
        .filter((i) => !seoSuiteNames.has(i.name))
        .map((i) => i.category),
    ),
  ).sort((a, b) => {
    // cms first, then coding, then alphabetical
    if (a === 'cms') return -1
    if (b === 'cms') return 1
    if (a === 'coding') return -1
    if (b === 'coding') return 1
    return a.localeCompare(b)
  })
  // MCP items for the MCP Registry — exclude SEO ones (they're in the SEO Suite)
  const mcpItems = integrations.filter(
    (i) => i.category === 'mcp' && !seoSuiteNames.has(i.name),
  )

  function findConnection(integrationId: string) {
    return connections.find((c) => c.integrationId === integrationId)
  }

  function openConnect(integration: Integration) {
    const initial: Record<string, any> = {}
    ;(integration.fields ?? []).forEach((f: any) => {
      initial[f?.key ?? f?.name ?? ''] = ''
    })
    setConfig(initial)
    setOpenId(integration.id)
  }

  async function submitConnect(integration: Integration) {
    await connectMut.mutateAsync({
      integrationId: integration.id,
      config,
    })
    setOpenId(null)
  }

  if (integrationsQuery.isLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-6">
            Integrations
          </h1>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (integrationsQuery.isError) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
            Could not load integrations.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-8">
          <p className="text-sm text-muted-foreground">Quiet tools that earn their keep</p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            Integrations
          </h1>
          <p className="mt-2 text-foreground/70 max-w-2xl text-balance">
            Connect forms, analytics, email, and more. No advertising tools, ever.
          </p>
        </div>

        {/* ------------------------------------------------ AI Tool Router hero */}
        <Card className="mb-8 border-forest/30 bg-forest/5">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-xl bg-forest/15 text-forest flex items-center justify-center shrink-0">
                <Sparkles className="size-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-foreground">AI Tool Router</h2>
                <p className="text-sm text-foreground/70 mt-0.5">
                  Describe your goal and the assistant picks the right tools to connect.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <Input
                value={aiGoal}
                onChange={(e) => setAiGoal(e.target.value)}
                placeholder="e.g. track traffic and collect newsletter signups"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !aiChatMut.isPending) submitAiGoal()
                }}
                className="flex-1"
              />
              <Button
                className="bg-forest text-primary-foreground hover:bg-forest/90 shrink-0"
                disabled={aiChatMut.isPending}
                onClick={submitAiGoal}
              >
                {aiChatMut.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                Ask the assistant
              </Button>
            </div>

            {aiChatMut.isPending && !aiReply && (
              <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="size-4 animate-spin text-forest" />
                Asking the assistant…
              </div>
            )}

            {aiReply && (
              <div className="rounded-lg border border-forest/30 bg-forest/5 p-4 text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {renderReplyWithChips(aiReply, scrollToCard)}
              </div>
            )}

            {!aiReply && !aiChatMut.isPending && (
              <p className="text-xs text-muted-foreground">
                Tip: mention &ldquo;publish to WordPress&rdquo;, &ldquo;free local
                LLM&rdquo;, &ldquo;newsletter&rdquo;, or &ldquo;analytics&rdquo;.
              </p>
            )}
          </CardContent>
        </Card>

        {/* ------------------------------------------------ Auto-detect Local Tools */}
        <Card className="mb-8 border-forest/40 bg-forest/5 overflow-hidden">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-xl bg-forest/15 text-forest flex items-center justify-center shrink-0">
                <Radar className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-foreground">
                    Auto-detect Local Tools
                  </h2>
                  <Badge variant="outline" className="text-forest border-forest/40 bg-forest/10">
                    <span className="size-1.5 rounded-full bg-forest" />
                    Open-source
                  </Badge>
                </div>
                <p className="text-sm text-foreground/70 mt-0.5 max-w-2xl">
                  Open-source tools running on your machine (Ollama, n8n, Zeroclaw,
                  WordPress MCP, OpenCode) are detected automatically — no manual
                  endpoint setup.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <Button
                className="bg-forest text-primary-foreground hover:bg-forest/90 shrink-0"
                onClick={() => scanMut.mutate()}
                disabled={scanMut.isPending}
              >
                {scanMut.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ScanLine className="size-4" />
                )}
                Scan now
              </Button>
              <span className="text-xs text-muted-foreground">
                {scanMut.isPending
                  ? 'Scanning localhost…'
                  : scanData
                    ? `Last scan: ${scanData.services.length} service${scanData.services.length === 1 ? '' : 's'} checked`
                    : 'Pings localhost ports in parallel — fast.'}
              </span>
            </div>

            {scanMut.isPending && !scanData && (
              <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="size-4 animate-spin text-forest" />
                Scanning localhost…
              </div>
            )}

            {scanData && scanData.services.length > 0 && (
              <div className="space-y-2">
                {scanData.services.map((svc) => {
                  const Icon = iconForServiceKind(svc.kind)
                  const reachable = svc.status === 'reachable'
                  const isConnecting = connectingKind === svc.kind
                  return (
                    <div
                      key={svc.kind}
                      className={cn(
                        'flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border p-3',
                        reachable
                          ? 'border-forest/30 bg-forest/5'
                          : 'border-border bg-card',
                      )}
                    >
                      <div
                        className={cn(
                          'flex items-center gap-3 min-w-0 flex-1',
                        )}
                      >
                        <div
                          className={cn(
                            'size-9 rounded-lg flex items-center justify-center shrink-0',
                            reachable
                              ? 'bg-forest/15 text-forest'
                              : 'bg-muted text-muted-foreground',
                          )}
                        >
                          <Icon className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-foreground text-sm">
                              {svc.name}
                            </span>
                            {reachable ? (
                              <Badge
                                variant="outline"
                                className="text-forest border-forest/40 bg-forest/10 shrink-0"
                              >
                                <span className="size-1.5 rounded-full bg-forest" />
                                Reachable
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-muted-foreground shrink-0"
                              >
                                <Circle className="size-3" />
                                Not running
                              </Badge>
                            )}
                            {svc.responseTimeMs !== undefined && reachable && (
                              <span className="text-[10px] text-muted-foreground">
                                {svc.responseTimeMs}ms
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                            <span className="font-mono">{svc.endpoint}</span>
                            {svc.details && (
                              <span className="text-foreground/60">
                                · {svc.details}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 sm:pl-2">
                        {reachable ? (
                          <Button
                            size="sm"
                            className="bg-forest text-primary-foreground hover:bg-forest/90"
                            disabled={isConnecting}
                            onClick={() => autoConnectByKind(svc.kind)}
                          >
                            {isConnecting ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Plug className="size-3.5" />
                            )}
                            Auto-connect
                          </Button>
                        ) : (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-border text-muted-foreground hover:bg-muted"
                              >
                                <Info className="size-3.5" /> Start instructions
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-72 text-sm"
                              align="end"
                            >
                              <div className="space-y-1.5">
                                <p className="font-medium text-foreground">
                                  {svc.name} is not running
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {svc.details ??
                                    'Start the service on your machine, then scan again.'}
                                </p>
                                <p className="text-xs text-foreground/70 pt-1 border-t border-border mt-2">
                                  Endpoint:{' '}
                                  <span className="font-mono">{svc.endpoint}</span>
                                </p>
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    </div>
                  )
                })}

                {scanData.note && (
                  <p className="text-xs text-muted-foreground pt-1">
                    {scanData.note}
                  </p>
                )}
              </div>
            )}

            {scanData && scanData.services.every((s) => s.status !== 'reachable') && (
              <div className="rounded-lg border border-dashed border-forest/30 bg-forest/5 p-4 text-sm text-foreground/80">
                No local open-source tools detected yet. Start Ollama
                (<span className="font-mono text-xs">ollama serve</span>), n8n
                (<span className="font-mono text-xs">npx n8n</span>), or Zeroclaw,
                then scan again.
              </div>
            )}
          </CardContent>
        </Card>

        {/* ------------------------------------------------ Run with Zeroclaw banner */}
        <Card className="mb-8 border-forest/30 bg-forest/5 overflow-hidden">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-xl bg-forest/15 text-forest flex items-center justify-center shrink-0">
                <Bot className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-foreground">Run with Zeroclaw</h2>
                  {zeroclawConnected ? (
                    <Badge variant="outline" className="text-forest border-forest/40">
                      <CheckCircle2 className="size-3" /> Connected
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Not connected
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-foreground/70 mt-0.5 max-w-2xl">
                  Dispatch an autonomous task — research, drafts, audits — to your Zeroclaw agent
                  running on your 16GB laptop. Tasks may take 30s–2min.
                </p>
              </div>
            </div>

            {zeroclawConnected ? (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <Textarea
                    value={zcTask}
                    onChange={(e) => setZcTask(e.target.value)}
                    placeholder="Describe an autonomous task — e.g. 'Research the top 10 competitors for a {business type} in {city} and summarize their pricing' or 'Draft a 5-post content calendar for a local bakery'"
                    className="min-h-20 flex-1 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !zcRunMut.isPending) {
                        e.preventDefault()
                        submitZcTask()
                      }
                    }}
                  />
                  <Button
                    className="bg-forest text-primary-foreground hover:bg-forest/90 shrink-0 sm:self-stretch"
                    disabled={zcRunMut.isPending || !zcTask.trim()}
                    onClick={submitZcTask}
                  >
                    {zcRunMut.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Bot className="size-4" />
                    )}
                    Run task
                  </Button>
                </div>

                {zcRunMut.isPending && !zcReply && (
                  <div className="rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin text-forest" />
                    Zeroclaw is working on it…
                  </div>
                )}

                {zcReply && (
                  <div className="rounded-lg border border-forest/30 bg-forest/5 p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-medium text-forest uppercase tracking-wider">
                        Response
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={copyZcReply}
                      >
                        <Copy className="size-3" /> Copy
                      </Button>
                    </div>
                    <div
                      className="max-h-96 overflow-y-auto text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed pr-1"
                      style={{ scrollbarColor: 'var(--color-forest) transparent' }}
                    >
                      {zcReply}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <p className="text-sm text-foreground/80 flex-1">
                  Connect Zeroclaw in the Automation section below to dispatch autonomous tasks
                  from anywhere in VirtuaLab Digital.
                </p>
                <Button
                  variant="outline"
                  className="border-forest/40 text-forest hover:bg-forest/10 shrink-0"
                  onClick={scrollToZeroclawCard}
                >
                  <Bot className="size-4" /> Connect Zeroclaw
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ------------------------------------------------ MCP Registry highlight */}
        {mcpItems.length > 0 && (
          <section className="mb-10">
            <Card className="border-sage/40 bg-sage/20 overflow-hidden">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3 mb-5">
                  <div className="size-10 rounded-xl bg-sage/40 text-forest flex items-center justify-center shrink-0">
                    <Network className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 flex-wrap">
                      MCP Registry
                      <Badge variant="outline" className="text-forest border-forest/40">
                        {mcpItems.length} servers
                      </Badge>
                    </h2>
                    <p className="text-sm text-foreground/70 mt-0.5 max-w-2xl">
                      MCP servers are the standard way the AI assistant reaches external
                      services. Connect one and the AI can call it directly.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {mcpItems.map((integration) => (
                    <IntegrationCard
                      key={integration.id}
                      integration={integration}
                      tool={toolsByName[integration.name]}
                      connection={findConnection(integration.id)}
                      onConnect={openConnect}
                      onAutoDetect={handleCardAutoDetect}
                      autoDetectPending={cardDetectingName === integration.name}
                      onToggle={(id, enabled) =>
                        updateMut.mutate({ id, body: { enabled } })
                      }
                      onDisconnect={(id) => deleteMut.mutate(id)}
                      deletePending={deleteMut.isPending}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* ------------------------------------------------ SEO Suite highlight */}
        {/* Consolidate ALL SEO-related tools (the `seo` category + SEO-related MCP
            servers) into one prominent section so they're easy to find — they're
            otherwise buried below 12 MCP cards + social + analytics. */}
        {seoSuiteItems.length > 0 && (
          <section className="mb-10">
            <Card className="border-forest/40 bg-forest/5 overflow-hidden">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3 mb-5">
                  <div className="size-10 rounded-xl bg-forest/20 text-forest flex items-center justify-center shrink-0">
                    <Search className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 flex-wrap">
                      SEO Suite
                      <Badge variant="outline" className="text-forest border-forest/40">
                        {seoSuiteItems.length} tools
                      </Badge>
                    </h2>
                    <p className="text-sm text-foreground/70 mt-0.5 max-w-2xl">
                      Local search, technical audits, schema, indexing, and the MCP
                      servers the AI uses for SEO tasks. Everything to help small
                      businesses rank organically — no paid ads.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {seoSuiteItems.map((integration) => (
                    <IntegrationCard
                      key={integration.id}
                      integration={integration}
                      tool={toolsByName[integration.name]}
                      connection={findConnection(integration.id)}
                      onConnect={openConnect}
                      onAutoDetect={handleCardAutoDetect}
                      autoDetectPending={cardDetectingName === integration.name}
                      onToggle={(id, enabled) =>
                        updateMut.mutate({ id, body: { enabled } })
                      }
                      onDisconnect={(id) => deleteMut.mutate(id)}
                      deletePending={deleteMut.isPending}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* ------------------------------------------------ Other categories */}
        {integrations.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-border p-12 text-center">
            <div className="mx-auto size-12 rounded-xl bg-forest/10 text-forest flex items-center justify-center mb-3">
              <Plug className="size-6" />
            </div>
            <h3 className="font-semibold text-foreground">No integrations available yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Check back soon — we&rsquo;re adding quiet, useful tools.
            </p>
          </div>
        ) : (
          otherCategories.map((cat) => {
            const items = integrations.filter((i) => i.category === cat)
            return (
              <section key={cat} className="mb-10">
                <h2 className="text-lg font-semibold text-foreground mb-4 capitalize">
                  {cat}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((integration) => (
                    <IntegrationCard
                      key={integration.id}
                      integration={integration}
                      tool={toolsByName[integration.name]}
                      connection={findConnection(integration.id)}
                      onConnect={openConnect}
                      onAutoDetect={handleCardAutoDetect}
                      autoDetectPending={cardDetectingName === integration.name}
                      onToggle={(id, enabled) =>
                        updateMut.mutate({ id, body: { enabled } })
                      }
                      onDisconnect={(id) => deleteMut.mutate(id)}
                      deletePending={deleteMut.isPending}
                    />
                  ))}
                </div>
              </section>
            )
          })
        )}

        {/* ------------------------------------------------ Custom ("+") section */}
        <section className="mb-4">
          <h2 className="text-lg font-semibold text-foreground mb-4 capitalize">
            Custom
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Render any user-added custom integrations first (so they appear with the
                standard card treatment), then the dashed "+" card at the end. */}
            {integrations
              .filter((i) => i.category === 'custom')
              .map((integration) => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  tool={toolsByName[integration.name]}
                  connection={findConnection(integration.id)}
                  onConnect={openConnect}
                  onAutoDetect={handleCardAutoDetect}
                  autoDetectPending={cardDetectingName === integration.name}
                  onToggle={(id, enabled) =>
                    updateMut.mutate({ id, body: { enabled } })
                  }
                  onDisconnect={(id) => deleteMut.mutate(id)}
                  deletePending={deleteMut.isPending}
                />
              ))}

            {/* The dashed "+" card — opens the custom integration dialog */}
            <button
              type="button"
              onClick={() => setCustomOpen(true)}
              className={cn(
                'group text-left rounded-2xl border-dashed border-2 border-forest/40 hover:border-forest',
                'bg-forest/5 p-5 transition-colors flex flex-col items-start gap-3 min-h-[148px]',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2',
              )}
              aria-label="Add custom integration"
            >
              <div className="size-10 rounded-xl bg-forest/10 text-forest flex items-center justify-center group-hover:bg-forest/15 transition">
                <Plus className="size-5" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Add custom integration</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Connect an in-house tool or niche service.
                </p>
              </div>
            </button>
          </div>
        </section>
      </div>

      {/* Connect / Configure dialog */}
      <Dialog
        open={!!openId}
        onOpenChange={(open) => {
          if (!open) setOpenId(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {(() => {
                const integration = integrations.find((i) => i.id === openId)
                return integration ? `Connect ${integration.name}` : 'Connect integration'
              })()}
            </DialogTitle>
            <DialogDescription>
              Enter your credentials below. They&rsquo;re stored in your project only.
            </DialogDescription>
          </DialogHeader>

          {(() => {
            const integration = integrations.find((i) => i.id === openId)
            if (!integration) return null
            const fields = integration.fields ?? []
            return (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  submitConnect(integration)
                }}
                className="space-y-3"
              >
                {fields.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    This integration needs no configuration.
                  </p>
                ) : (
                  fields.map((f: any, i: number) => {
                    const key = f?.key ?? f?.name ?? `field-${i}`
                    const label = f?.label ?? key
                    const type =
                      f?.type === 'password' || f?.type === 'secret'
                        ? 'password'
                        : f?.type === 'number'
                          ? 'number'
                          : 'text'
                    return (
                      <div key={i} className="space-y-1.5">
                        <Label htmlFor={key}>{label}</Label>
                        <Input
                          id={key}
                          type={type}
                          placeholder={f?.placeholder ?? ''}
                          value={config[key] ?? ''}
                          onChange={(e) =>
                            setConfig({ ...config, [key]: e.target.value })
                          }
                          className="h-9"
                        />
                        {f?.help && (
                          <p className="text-xs text-muted-foreground">{f.help}</p>
                        )}
                      </div>
                    )
                  })
                )}
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpenId(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={connectMut.isPending}
                    className="bg-forest text-primary-foreground hover:bg-forest/90"
                  >
                    {connectMut.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : null}
                    Save connection
                  </Button>
                </DialogFooter>
              </form>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Custom integration dialog */}
      <Dialog
        open={customOpen}
        onOpenChange={(open) => {
          if (!open) setCustomOpen(false)
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-4 text-forest" /> Add custom integration
            </DialogTitle>
            <DialogDescription>
              Connect an in-house tool or niche service. You&rsquo;ll be able to
              use it just like any other integration.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              submitCustomForm()
            }}
            className="space-y-3"
          >
            <div className="space-y-1.5">
              <Label htmlFor="custom-name">Name *</Label>
              <Input
                id="custom-name"
                required
                value={customForm.name}
                onChange={(e) =>
                  setCustomForm({ ...customForm, name: e.target.value })
                }
                placeholder="e.g. Inventory Sync"
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="custom-category">Category</Label>
              <Input
                id="custom-category"
                list="custom-category-list"
                value={customForm.category}
                onChange={(e) =>
                  setCustomForm({ ...customForm, category: e.target.value })
                }
                placeholder="custom"
                className="h-9"
              />
              <datalist id="custom-category-list">
                <option value="custom" />
                <option value="internal" />
                <option value="webhook" />
                <option value="api" />
              </datalist>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="custom-description">Description</Label>
              <Textarea
                id="custom-description"
                value={customForm.description}
                onChange={(e) =>
                  setCustomForm({ ...customForm, description: e.target.value })
                }
                placeholder="What does this integration do?"
                className="min-h-16 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="custom-icon">Icon</Label>
              <Input
                id="custom-icon"
                list="custom-icon-list"
                value={customForm.iconKey}
                onChange={(e) =>
                  setCustomForm({ ...customForm, iconKey: e.target.value })
                }
                placeholder="Plug"
                className="h-9"
              />
              <datalist id="custom-icon-list">
                <option value="Plug" />
                <option value="Webhook" />
                <option value="Cloud" />
                <option value="Database" />
                <option value="Code" />
                <option value="Key" />
              </datalist>
              <p className="text-xs text-muted-foreground">
                Lucide icon name (e.g. Plug, Webhook, Cloud). Used for the card
                thumbnail.
              </p>
            </div>

            {/* Repeatable fields list */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Fields</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCustomFields([
                      ...customFields,
                      { key: '', label: '', type: 'text' as const },
                    ])
                  }
                >
                  <Plus className="size-3.5" /> Add field
                </Button>
              </div>

              {customFields.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No fields yet. Add one if your integration needs credentials
                  or configuration.
                </p>
              ) : (
                <div className="space-y-2">
                  {customFields.map((field, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col sm:flex-row gap-1.5 sm:items-center"
                    >
                      <Input
                        value={field.key}
                        onChange={(e) => {
                          const next = [...customFields]
                          next[idx] = { ...field, key: e.target.value }
                          setCustomFields(next)
                        }}
                        placeholder="key"
                        className="h-8 sm:flex-1 text-xs"
                        aria-label={`Field ${idx + 1} key`}
                      />
                      <Input
                        value={field.label}
                        onChange={(e) => {
                          const next = [...customFields]
                          next[idx] = { ...field, label: e.target.value }
                          setCustomFields(next)
                        }}
                        placeholder="Label"
                        className="h-8 sm:flex-1 text-xs"
                        aria-label={`Field ${idx + 1} label`}
                      />
                      <Select
                        value={field.type}
                        onValueChange={(v) => {
                          const next = [...customFields]
                          next[idx] = {
                            ...field,
                            type: v as 'text' | 'password' | 'number',
                          }
                          setCustomFields(next)
                        }}
                      >
                        <SelectTrigger className="h-8 sm:w-28 text-xs" aria-label={`Field ${idx + 1} type`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">text</SelectItem>
                          <SelectItem value="password">password</SelectItem>
                          <SelectItem value="number">number</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        aria-label="Remove field"
                        onClick={() =>
                          setCustomFields(
                            customFields.filter((_, i) => i !== idx),
                          )
                        }
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCustomOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addCustomMut.isPending || !customForm.name.trim()}
                className="bg-forest text-primary-foreground hover:bg-forest/90"
              >
                {addCustomMut.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                Add integration
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ------------------------------------------------------------------ */

// One integration card — handles several cases:
//   1. Connected: switch + (Configure if it has fields) + delete
//   2. OAuth (authMethod === 'oauth'): "Log in with {Name}" button + "OAuth" badge
//   3. Auto-detect (authMethod === 'auto'): "Auto-detect" button + "AUTO" badge —
//      scans localhost and one-click connects when the open-source service is running
//   4. Reference (authMethod === 'none'): "Reference" badge only
//   5. Has fields (apikey / appPassword): "Connect" button → field-form dialog
//   6. Built-in SEO (authMethod === 'none' + 'builtin' cap): "Open SEO Tools" button
//   7. Built-in (no fields, no auth, not reference): "Built-in — no setup required"
function IntegrationCard({
  integration,
  tool,
  connection,
  onConnect,
  onAutoDetect,
  autoDetectPending,
  onToggle,
  onDisconnect,
  deletePending,
}: {
  integration: Integration
  tool?: ToolInfo
  connection?: Connection
  onConnect: (i: Integration) => void
  onAutoDetect: (i: Integration) => void
  autoDetectPending: boolean
  onToggle: (id: string, enabled: boolean) => void
  onDisconnect: (id: string) => void
  deletePending: boolean
}) {
  const connected = !!connection
  const fields = integration.fields ?? []
  const hasFields = fields.length > 0
  const capabilities = tool?.capabilities ?? []
  const link = tool?.link ?? null
  const setView = useAppStore((s) => s.setView)

  const { authMethod, oauthProvider } = resolveAuthMethod(integration)
  const isOAuth = authMethod === 'oauth' && !!oauthProvider
  // Open-source auto-detect tools (n8n, Zeroclaw, OpenCode, Kilocode,
  // WordPress MCP Server, WordPress MCP (tropk-ai)) — no fields, no manual
  // endpoint. The user clicks "Auto-detect" and we scan localhost + wire
  // up the discovered endpoint automatically.
  const isAuto = authMethod === 'auto'
  // Built-in SEO tools (Open SEO + Seonaut) — authMethod === 'none' + capability 'builtin'
  // They render a "BUILT-IN" badge + "Open SEO Tools" button instead of a Connect button.
  const isBuiltinSeo =
    authMethod === 'none' &&
    integration.category === 'seo' &&
    capabilities.includes('builtin')
  // Plain reference (Plugin Boilerplate / Awesome OpenCode) — keep the original
  // semantics but exclude the built-in SEO case so those get their own treatment.
  const isReference =
    !isBuiltinSeo &&
    !isAuto &&
    (authMethod === 'none' ||
      (!hasFields &&
        !connected &&
        (capabilities.includes('registry') || capabilities.includes('developer'))))

  // For auto-detected connections, surface the discovered endpoint under the
  // switch so the user can see what was wired up.
  const connConfig = connection ? parseConfig(connection.config) : null
  const autoEndpoint =
    isAuto && connConfig?.autoDetected === true && typeof connConfig.endpoint === 'string'
      ? (connConfig.endpoint as string)
      : null

  function startOAuth() {
    if (!oauthProvider) return
    const params = new URLSearchParams({
      integrationName: integration.name,
    })
    // Full-page redirect — the OAuth flow is a redirect-based round-trip.
    window.location.href = `/api/oauth/${oauthProvider}/start?${params.toString()}`
  }

  return (
    <Card
      id={`int-${cardSlug(integration.name)}`}
      className="py-4 transition-shadow scroll-mt-24"
    >
      <CardContent className="pt-0 space-y-3">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-xl bg-forest/10 text-forest flex items-center justify-center shrink-0">
            <DynamicIcon name={integration.iconKey ?? undefined} className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-foreground truncate">
                {integration.name}
              </h3>
              {connected ? (
                <Badge variant="outline" className="text-forest border-forest/40 shrink-0">
                  <CheckCircle2 className="size-3" /> Connected
                </Badge>
              ) : isOAuth ? (
                <Badge variant="outline" className="text-forest border-forest/40 shrink-0">
                  OAuth
                </Badge>
              ) : isAuto ? (
                <Badge
                  variant="outline"
                  className="text-forest border-forest/40 bg-forest/10 shrink-0"
                >
                  <span className="size-1.5 rounded-full bg-forest" />
                  AUTO
                </Badge>
              ) : isBuiltinSeo ? (
                <Badge
                  variant="outline"
                  className="text-forest border-forest/40 bg-forest/10 shrink-0"
                >
                  <span className="size-1.5 rounded-full bg-forest" />
                  BUILT-IN
                </Badge>
              ) : isReference ? (
                <Badge variant="outline" className="text-muted-foreground shrink-0">
                  Reference
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground shrink-0">
                  <Circle className="size-3" /> Available
                </Badge>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground line-clamp-3">
              {integration.description}
            </p>
            {capabilities.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {capabilities.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-forest hover:underline"
          >
            Learn more <ExternalLink className="size-3" />
          </a>
        )}

        {connected ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Switch
                  checked={!!connection?.enabled}
                  onCheckedChange={(enabled) => onToggle(connection!.id, enabled)}
                />
                <span className="text-xs text-muted-foreground">
                  {connection?.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {/* OAuth connections have nothing to configure (no API keys / form). */}
                {hasFields && !isOAuth && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onConnect(integration)}
                  >
                    Configure
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  aria-label="Disconnect"
                  onClick={() => onDisconnect(connection!.id)}
                  disabled={deletePending}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
            {autoEndpoint && (
              <p className="text-xs text-muted-foreground truncate">
                <span className="text-forest">Endpoint:</span>{' '}
                <span className="font-mono">{autoEndpoint}</span>
              </p>
            )}
          </div>
        ) : isOAuth ? (
          // OAuth — full-page redirect to the provider, no fields dialog.
          <div className="space-y-1.5">
            <Button
              className="w-full bg-forest text-primary-foreground hover:bg-forest/90"
              size="sm"
              onClick={startOAuth}
            >
              <DynamicIcon name={integration.iconKey ?? undefined} className="size-3.5" />
              Log in with {integration.name}
            </Button>
            <p className="text-xs text-muted-foreground">
              OAuth 2.0 — we never see your password.
            </p>
          </div>
        ) : isAuto ? (
          // Open-source auto-detect — no manual endpoint. Scan localhost and
          // one-click auto-connect when the service is reachable.
          <div className="space-y-1.5">
            <Button
              className="w-full bg-forest text-primary-foreground hover:bg-forest/90"
              size="sm"
              disabled={autoDetectPending}
              onClick={() => onAutoDetect(integration)}
            >
              {autoDetectPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Radar className="size-3.5" />
              )}
              Auto-detect
            </Button>
            <p className="text-xs text-muted-foreground">
              Open-source — auto-detected when running locally. No manual endpoint.
            </p>
          </div>
        ) : isBuiltinSeo ? (
          // Built-in SEO tools (Open SEO + Seonaut) — no endpoint to connect.
          // Switch the view to the SEO Tools panel where the audit + sitemap +
          // meta preview + AI keyword/brief/schema tools live.
          <Button
            className="w-full bg-forest text-primary-foreground hover:bg-forest/90"
            size="sm"
            onClick={() => setView({ name: 'seo-tools' })}
          >
            <Search className="size-3.5" /> Open SEO Tools
          </Button>
        ) : isReference ? (
          // No Connect button — just the Learn more link above + the Reference badge.
          null
        ) : hasFields ? (
          <Button
            className="w-full bg-forest text-primary-foreground hover:bg-forest/90"
            size="sm"
            onClick={() => onConnect(integration)}
          >
            <Plug className="size-3.5" /> Connect
          </Button>
        ) : (
          // No fields, but not a reference/developer entry — show a soft placeholder
          // (e.g. AI Copy built-in, which is auto-connected). No Connect button needed.
          <p className="text-xs text-muted-foreground">
            Built-in — no setup required.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */

// Shared list of integration names so we can hyperlink them inside the AI reply.
const KNOWN_INTEGRATION_NAMES = [
  'AI Copy (built-in)',
  'WordPress',
  'WordPress MCP Server',
  'WordPress MCP (tropk-ai)',
  'Elementor MCP',
  'WordPress Plugin Boilerplate',
  'Microsoft MCP',
  'Google MCP',
  'Google Workspace MCP',
  'Google Analytics MCP (official)',
  'Google Ads MCP (official)',
  'Google Analytics MCP (community)',
  'Search Console MCP',
  'Bing Webmaster MCP',
  'One-Search MCP',
  'Open SEO',
  'Seonaut',
  'Google Search Console',
  'Bing Webmaster',
  'Facebook',
  'X (Twitter)',
  'Instagram',
  'LinkedIn',
  'Plausible',
  'Umami',
  'PostHog',
  'Tally',
  'Formspree',
  'MailerLite',
  'Buttondown',
  'Resend',
  'Stripe',
  'Lemon Squeezy',
  'n8n',
  'Zeroclaw',
  'Webhooks',
  'Make',
  'OpenCode',
  'Kilocode',
  'Awesome OpenCode',
  'Cloudinary',
  'Uploadthing',
]

function renderReplyWithChips(
  text: string,
  onChip: (name: string) => void,
): React.ReactNode {
  if (!text) return null
  const sorted = [...KNOWN_INTEGRATION_NAMES].sort((a, b) => b.length - a.length)
  const escaped = sorted.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const re = new RegExp(`(${escaped.join('|')})`, 'g')

  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) parts.push(text.slice(lastIndex, m.index))
    const name = m[1]
    parts.push(
      <button
        key={`chip-${i++}-${m.index}`}
        type="button"
        onClick={() => onChip(name)}
        className="inline-flex items-center rounded-full border border-forest/40 bg-forest/10 px-2 py-0.5 text-xs font-medium text-forest hover:bg-forest/20 transition"
      >
        {name}
      </button>,
    )
    lastIndex = m.index + name.length
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return <>{parts}</>
}
