'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Sun,
  Moon,
  Monitor,
  Download,
  AlertTriangle,
  User,
  Mail,
  Shield,
  Sparkles,
  Loader2,
  Cpu,
  Plug,
  Bot,
  Users,
  Lock,
  CheckCircle2,
  Leaf,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { fetchJson } from '@/lib/client-utils'

/* ------------------------------------------------------------------ */
/* Account API types (mirrors /api/account response shape)            */
/* ------------------------------------------------------------------ */

interface AccountResponse {
  user: {
    id: string
    email: string
    name: string | null
    avatarUrl?: string | null
    plan: string
    role: 'owner' | 'admin' | 'member'
    canAccessBuilder: boolean
    canAccessSEO: boolean
    canAccessSocial: boolean
    canAccessContent: boolean
    canAccessPM: boolean
    canAccessAutomation: boolean
    canAccessInbox: boolean
    canAccessIntegrations: boolean
    canAccessAnalytics: boolean
    canAccessSettings: boolean
    canAccessAPISettings: boolean
    canAccessExternalSecrets: boolean
    aiPersonaName: string | null
    aiPersonaTone: string | null
    aiPersonaSystem: string | null
  }
  usage: {
    projects: number
    pages: number
    integrations: number
    tasks: number
    billableHours: number
  }
  plan: {
    current: string
    label: string
    limits: { projects: number; pages: number; integrations: number }
    usagePercent: { projects: number; pages: number; integrations: number }
  }
}

const DEFAULT_PREAMBLE =
  'You are a helpful assistant for small businesses using VirtuaLab Digital. Be honest, practical, and concise. Never use hype, paid-promo language, or marketing speak. When in doubt, suggest the organic, no-paid-ads approach.'

const ACCESS_FLAGS: {
  key: keyof AccountResponse['user']
  label: string
  desc: string
  adminOnly?: boolean
}[] = [
  { key: 'canAccessBuilder', label: 'Builder', desc: 'Open projects in the drag & drop builder.' },
  { key: 'canAccessSEO', label: 'SEO Tools', desc: 'Access the SEO tools catalog.' },
  { key: 'canAccessSocial', label: 'Social Media', desc: 'Access the social media tools.' },
  { key: 'canAccessContent', label: 'Content Generation', desc: 'Access the content tools.' },
  { key: 'canAccessPM', label: 'Projects', desc: 'Access project management (Kanban, tasks, time, clients).' },
  { key: 'canAccessAutomation', label: 'Automation', desc: 'Access automations and toggles.' },
  { key: 'canAccessInbox', label: 'Inbox', desc: 'Access the unified inbox.' },
  { key: 'canAccessIntegrations', label: 'Integrations', desc: 'Connect and manage integrations.' },
  { key: 'canAccessAnalytics', label: 'Analytics', desc: 'View analytics dashboards.' },
  { key: 'canAccessSettings', label: 'Settings', desc: 'View and edit account settings.' },
  { key: 'canAccessAPISettings', label: 'API Settings', desc: 'API keys + external endpoints.', adminOnly: true },
  { key: 'canAccessExternalSecrets', label: 'External Secrets', desc: 'Stored secrets + credentials.', adminOnly: true },
]

/* ------------------------------------------------------------------ */

export function SettingsView() {
  const theme = useAppStore((s) => s.theme)
  const setTheme = useAppStore((s) => s.setTheme)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch the account (profile + plan + persona + access) so the Profile card
  // reflects the real plan + the rest of the page can prefill.
  const accountQuery = useQuery<AccountResponse>({
    queryKey: ['account'],
    queryFn: () => fetchJson('/api/account'),
  })

  const [name, setName] = React.useState('Maker VirtuaLab Digital')
  const [email, setEmail] = React.useState('maker@virtulab.digital')

  // Prefill from /api/account once it arrives.
  React.useEffect(() => {
    const u = accountQuery.data?.user
    if (!u) return
    setName(u.name || 'Maker VirtuaLab Digital')
    setEmail(u.email || 'maker@virtulab.digital')
  }, [accountQuery.data])

  const plan = (accountQuery.data?.user?.plan || 'sprout') as 'seed' | 'sprout' | 'grove' | 'forest'

  // Patch the profile (name + email) on Save.
  const saveProfileMut = useMutation({
    mutationFn: (payload: { name?: string; email?: string }) =>
      fetchJson('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account'] })
      toast({ title: 'Profile saved' })
    },
    onError: (err: Error) =>
      toast({
        title: 'Could not save profile',
        description: err.message,
        variant: 'destructive',
      }),
  })

  const [notif, setNotif] = React.useState({
    productUpdates: true,
    weeklyDigest: true,
    activityMentions: false,
    marketingTips: false,
  })

  function setThemeValue(t: 'light' | 'dark') {
    setTheme(t)
  }

  function exportData() {
    toast({
      title: 'Export queued',
      description: 'We&rsquo;ll prepare a copy of your data shortly.',
    })
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-8">
          <p className="text-sm text-muted-foreground">Account & preferences</p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            Settings
          </h1>
        </div>

        {/* Profile */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="size-4 text-forest" /> Profile
            </CardTitle>
            <CardDescription>How you appear in your studio.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Plan</span>
              <PlanBadge plan={plan} />
            </div>
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() =>
                  saveProfileMut.mutate({
                    name: name.trim() || undefined,
                    email: email.trim() || undefined,
                  })
                }
                disabled={saveProfileMut.isPending}
              >
                {saveProfileMut.isPending && <Loader2 className="size-4 animate-spin" />}
                Save changes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Theme */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sun className="size-4 text-forest" /> Appearance
            </CardTitle>
            <CardDescription>Pick the light that feels right.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'light', label: 'Light', icon: Sun },
                { id: 'dark', label: 'Dark', icon: Moon },
                { id: 'system', label: 'System', icon: Monitor },
              ].map((opt) => {
                const Icon = opt.icon
                const isActive =
                  (opt.id === 'light' && theme === 'light') ||
                  (opt.id === 'dark' && theme === 'dark')
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      if (opt.id === 'system') {
                        const prefersDark =
                          typeof window !== 'undefined' &&
                          window.matchMedia('(prefers-color-scheme: dark)').matches
                        setTheme(prefersDark ? 'dark' : 'light')
                      } else {
                        setThemeValue(opt.id as 'light' | 'dark')
                      }
                    }}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-xl border p-4 transition',
                      isActive
                        ? 'border-forest bg-forest/5 text-forest'
                        : 'border-border text-muted-foreground hover:bg-muted',
                    )}
                  >
                    <Icon className="size-5" />
                    <span className="text-xs font-medium">{opt.label}</span>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* AI Provider (Bring-Your-Own LLM) */}
        <AiProviderCard />

        {/* AI Persona — name + tone + system-prompt override (used by the built-in AI) */}
        <AiPersonaCard />

        {/* Team & Access Control — master-panel role + 12 access toggles */}
        <TeamAccessCard />

        {/* Notifications */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="size-4 text-forest" /> Notifications
            </CardTitle>
            <CardDescription>
              Quiet by default. Toggle what you actually want to hear.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: 'productUpdates', label: 'Product updates', desc: 'When we ship something useful.' },
              { key: 'weeklyDigest', label: 'Weekly digest', desc: 'A short summary of your studio activity.' },
              { key: 'activityMentions', label: 'Mentions', desc: 'When someone mentions you in a project.' },
              { key: 'marketingTips', label: 'Gentle growth tips', desc: 'Occasional, no spam, no paid promos.' },
            ].map((n) => (
              <div
                key={n.key}
                className="flex items-start justify-between gap-4 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{n.label}</p>
                  <p className="text-xs text-muted-foreground">{n.desc}</p>
                </div>
                <Switch
                  checked={(notif as any)[n.key]}
                  onCheckedChange={(checked) =>
                    setNotif({ ...notif, [n.key]: checked })
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Data export */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Download className="size-4 text-forest" /> Your data
            </CardTitle>
            <CardDescription>
              Export everything — your projects, pages, and integrations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={exportData}
            >
              <Download className="size-4" /> Export all data
            </Button>
          </CardContent>
        </Card>

        {/* Danger zone */}
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-4" /> Danger zone
            </CardTitle>
            <CardDescription>
              Irreversible actions. Be sure before you proceed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Separator className="mb-4 bg-destructive/20" />
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Delete account</p>
                <p className="text-xs text-muted-foreground">
                  Removes all your projects, pages, and connections.
                </p>
              </div>
              <Button variant="destructive" onClick={() => toast({ title: 'Stub: account deletion disabled for demo' })}>
                Delete account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

// AI Provider — choose between the built-in Z.ai assistant, any
// OpenAI-compatible endpoint (Ollama / OpenRouter / Groq / LM Studio / etc.),
// or the connected Zeroclaw autonomous agent. Model presets with task routing
// (chat vs. SEO) are fetched from /api/capabilities and rendered as a second
// row of chips below the general presets.
function AiProviderCard() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  type ProviderKind = 'builtin' | 'custom' | 'zeroclaw'

  const providerQuery = useQuery<{
    provider: {
      kind: ProviderKind
      baseUrl?: string
      apiKey?: string
      model?: string
    }
  }>({
    queryKey: ['settings', 'llm'],
    queryFn: () => fetchJson('/api/settings/llm'),
  })

  // Zeroclaw connection status — gates whether the third option is enabled.
  const zeroclawQuery = useQuery<{ connected: boolean; endpoint: string | null }>({
    queryKey: ['zeroclaw'],
    queryFn: () => fetchJson('/api/zeroclaw/run'),
  })
  const zeroclawConnected = !!zeroclawQuery.data?.connected

  // Model presets with task routing — chat vs. SEO small models for Ollama.
  const capabilitiesQuery = useQuery<{
    models: { id: string; label: string; baseUrl: string; model: string; task: 'chat' | 'seo' | 'general'; note: string }[]
  }>({
    queryKey: ['capabilities'],
    queryFn: () => fetchJson('/api/capabilities'),
  })
  const chatModels = (capabilitiesQuery.data?.models ?? []).filter((m) => m.task === 'chat')
  const seoModels = (capabilitiesQuery.data?.models ?? []).filter((m) => m.task === 'seo')

  const [kind, setKind] = React.useState<ProviderKind>('builtin')
  const [baseUrl, setBaseUrl] = React.useState('')
  const [apiKey, setApiKey] = React.useState('')
  const [model, setModel] = React.useState('')
  const loadedRef = React.useRef(false)

  // Prefill from server when it arrives. The API key is masked on the server side
  // (e.g. `ab12••••••••`), so we never prefill that field — we leave it blank with a
  // placeholder telling the user to leave blank for local/no-auth providers.
  React.useEffect(() => {
    if (loadedRef.current) return
    const p = providerQuery.data?.provider
    if (!p) return
    const next: ProviderKind =
      p.kind === 'custom' ? 'custom' : p.kind === 'zeroclaw' ? 'zeroclaw' : 'builtin'
    setKind(next)
    setBaseUrl(p.baseUrl ?? '')
    setModel(p.model ?? '')
    setApiKey('')
    loadedRef.current = true
  }, [providerQuery.data])

  const saveMut = useMutation({
    mutationFn: (payload: {
      kind: ProviderKind
      baseUrl?: string
      apiKey?: string
      model?: string
    }) =>
      fetchJson('/api/settings/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'llm'] })
      toast({ title: 'AI provider updated' })
    },
    onError: (err: any) =>
      toast({
        title: 'Could not save provider',
        description: err?.message || 'Please try again.',
        variant: 'destructive',
      }),
  })

  function applyPreset(id: 'ollama' | 'openrouter' | 'groq' | 'lmstudio') {
    setKind('custom')
    switch (id) {
      case 'ollama':
        setBaseUrl('http://localhost:11434/v1')
        setModel('llama3.1')
        setApiKey('')
        break
      case 'openrouter':
        setBaseUrl('https://openrouter.ai/api/v1')
        setModel('meta-llama/llama-3.1-8b-instruct:free')
        break
      case 'groq':
        setBaseUrl('https://api.groq.com/openai/v1')
        setModel('llama-3.1-8b-instant')
        break
      case 'lmstudio':
        setBaseUrl('http://localhost:1234/v1')
        setModel('local-model')
        setApiKey('')
        break
    }
  }

  function applyModelPreset(p: { baseUrl: string; model: string }) {
    setKind('custom')
    setBaseUrl(p.baseUrl)
    setModel(p.model)
    setApiKey('') // local Ollama models are no-auth
  }

  function save() {
    if (kind === 'builtin') {
      saveMut.mutate({ kind: 'builtin' })
      return
    }
    if (kind === 'zeroclaw') {
      saveMut.mutate({ kind: 'zeroclaw' })
      return
    }
    saveMut.mutate({
      kind: 'custom',
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      model: model.trim(),
    })
  }

  const canSave =
    kind === 'builtin' ||
    kind === 'zeroclaw' ||
    (baseUrl.trim().length > 0 && model.trim().length > 0)

  // The Zeroclaw option is disabled until Zeroclaw is connected. We wrap the
  // button in a tooltip so the user knows where to go.
  const ZeroclawOption = (
    <button
      type="button"
      disabled={!zeroclawConnected}
      onClick={() => zeroclawConnected && setKind('zeroclaw')}
      aria-disabled={!zeroclawConnected}
      className={cn(
        'flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition',
        !zeroclawConnected && 'cursor-not-allowed opacity-50',
        kind === 'zeroclaw'
          ? 'border-forest bg-forest/5 text-forest'
          : 'border-border text-foreground hover:bg-muted',
      )}
    >
      <span className="flex items-center gap-2 font-medium text-sm">
        <Bot className="size-4" /> Zeroclaw (autonomous agent)
      </span>
      <span className="text-xs text-muted-foreground">
        {zeroclawConnected
          ? 'Route all AI Copy + AI Chat through your connected Zeroclaw agent endpoint.'
          : 'Connect Zeroclaw in Integrations first.'}
      </span>
    </button>
  )

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="size-4 text-forest" /> AI Provider
        </CardTitle>
        <CardDescription>
          Power AI Copy and the AI Tool Router with the built-in assistant, your
          own OpenAI-compatible endpoint, or your Zeroclaw autonomous agent.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Provider kind picker — Built-in + Bring your own (2-col), then Zeroclaw full-width */}
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setKind('builtin')}
              className={cn(
                'flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition',
                kind === 'builtin'
                  ? 'border-forest bg-forest/5 text-forest'
                  : 'border-border text-foreground hover:bg-muted',
              )}
            >
              <span className="flex items-center gap-2 font-medium text-sm">
                <Sparkles className="size-4" /> Built-in (Z.ai)
              </span>
              <span className="text-xs text-muted-foreground">
                Use VirtuaLab Digital&rsquo;s built-in AI. No setup. Works everywhere.
              </span>
            </button>
            <button
              type="button"
              onClick={() => setKind('custom')}
              className={cn(
                'flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition',
                kind === 'custom'
                  ? 'border-forest bg-forest/5 text-forest'
                  : 'border-border text-foreground hover:bg-muted',
              )}
            >
              <span className="flex items-center gap-2 font-medium text-sm">
                <Cpu className="size-4" /> Bring your own (OpenAI-compatible)
              </span>
              <span className="text-xs text-muted-foreground">
                Plug in any OpenAI-compatible endpoint. Works with FREE providers like
                Ollama (local), OpenRouter free models, Groq, LM Studio.
              </span>
            </button>
          </div>
          {zeroclawConnected ? (
            ZeroclawOption
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="block">{ZeroclawOption}</span>
              </TooltipTrigger>
              <TooltipContent>Connect Zeroclaw in Integrations first</TooltipContent>
            </Tooltip>
          )}
        </div>

        {kind === 'custom' && (
          <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
            {/* General presets */}
            <div>
              <Label className="text-xs text-muted-foreground">Quick presets — general</Label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {[
                  { id: 'ollama', label: 'Ollama (local)' },
                  { id: 'openrouter', label: 'OpenRouter' },
                  { id: 'groq', label: 'Groq' },
                  { id: 'lmstudio', label: 'LM Studio' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p.id as any)}
                    className="inline-flex items-center rounded-full border border-forest/40 bg-forest/10 px-3 py-1 text-xs font-medium text-forest hover:bg-forest/20 transition"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Model presets with task routing — fetched from /api/capabilities */}
            {(chatModels.length > 0 || seoModels.length > 0) && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Model presets — task routed (Ollama local)
                </Label>
                {chatModels.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Chat models
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {chatModels.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          title={m.note}
                          onClick={() => applyModelPreset(m)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-forest/40 bg-forest/10 px-3 py-1 text-xs font-medium text-forest hover:bg-forest/20 transition"
                        >
                          {m.label}
                          <span className="inline-flex items-center rounded-full bg-forest/20 px-1.5 py-0.5 text-[10px] text-forest">
                            chat
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {seoModels.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      SEO models
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {seoModels.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          title={m.note}
                          onClick={() => applyModelPreset(m)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-sage/50 bg-sage/15 px-3 py-1 text-xs font-medium text-forest hover:bg-sage/25 transition"
                        >
                          {m.label}
                          <span className="inline-flex items-center rounded-full bg-sage/30 px-1.5 py-0.5 text-[10px] text-forest">
                            seo
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Chat models for AI Copy + Router. SEO models for on-page tasks (meta,
                  schema, keywords). All run on{' '}
                  <code className="bg-muted px-1 py-0.5 rounded">http://localhost:11434/v1</code>{' '}
                  (Ollama local).
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="llm-base">Base URL</Label>
              <Input
                id="llm-base"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="http://localhost:11434/v1"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="llm-key">API Key</Label>
              <Input
                id="llm-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="API Key (leave blank for local / no-auth providers)"
              />
              <p className="text-xs text-muted-foreground">
                Leave blank for local / no-auth providers like Ollama or LM Studio.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="llm-model">Model</Label>
              <Input
                id="llm-model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="llama3.1 / meta-llama/llama-3.1-8b-instruct:free / llama-3.1-8b-instant"
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Examples: Ollama local (free) → base{' '}
              <code className="bg-muted px-1 py-0.5 rounded">http://localhost:11434/v1</code>,
              model <code className="bg-muted px-1 py-0.5 rounded">llama3.1</code>. OpenRouter
              free → base{' '}
              <code className="bg-muted px-1 py-0.5 rounded">https://openrouter.ai/api/v1</code>,
              model{' '}
              <code className="bg-muted px-1 py-0.5 rounded">meta-llama/llama-3.1-8b-instruct:free</code>.
              See the OpenCode integration for more.
            </p>
          </div>
        )}

        {kind === 'zeroclaw' && (
          <div className="rounded-xl border border-forest/30 bg-forest/5 p-4 text-sm text-foreground/80">
            All AI Copy and AI Chat calls will route through your connected Zeroclaw
            agent endpoint. Manage the connection in{' '}
            <span className="font-medium text-forest">Integrations → Automation → Zeroclaw</span>.
          </div>
        )}

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Plug className="size-3.5" />
            {providerQuery.isLoading
              ? 'Loading current provider…'
              : kind === 'builtin'
                ? 'Using built-in Z.ai assistant.'
                : kind === 'zeroclaw'
                  ? `Routing through Zeroclaw${
                      zeroclawQuery.data?.endpoint ? ` (${zeroclawQuery.data.endpoint})` : ''
                    }`
                  : `Endpoint: ${baseUrl || '(not set)'}`}
          </div>
          <Button
            onClick={save}
            disabled={!canSave || saveMut.isPending}
            className="bg-forest text-primary-foreground hover:bg-forest/90"
          >
            {saveMut.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            Save provider
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* PlanBadge — used in Profile + Team cards                            */
/* Color-coded by plan: forest (Seed), sage (Sprout), terracotta       */
/* (Grove), bark (Forest).                                             */
/* ------------------------------------------------------------------ */

function PlanBadge({ plan }: { plan: string }) {
  const label = plan.charAt(0).toUpperCase() + plan.slice(1)
  const cls = {
    seed: 'text-forest border-forest/40 bg-forest/5',
    sprout: 'text-moss border-sage/50 bg-sage/10',
    grove: 'text-terracotta border-terracotta/40 bg-terracotta/5',
    forest: 'text-bark border-bark/40 bg-bark/5',
  }[plan] || 'text-forest border-forest/40 bg-forest/5'
  return (
    <Badge variant="outline" className={cn('capitalize', cls)}>
      {label}
    </Badge>
  )
}

/* ------------------------------------------------------------------ */
/* AiPersonaCard — name + tone + system-prompt override                */
/*                                                                     */
/* The built-in AI API (z-ai) and Bring-Your-Own LLM both apply this    */
/* persona as the system preamble. The override, if set, fully          */
/* replaces the default preamble.                                      */
/* ------------------------------------------------------------------ */

function AiPersonaCard() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const accountQuery = useQuery<AccountResponse>({
    queryKey: ['account'],
    queryFn: () => fetchJson('/api/account'),
  })

  const [personaName, setPersonaName] = React.useState('')
  const [personaTone, setPersonaTone] = React.useState('')
  const [personaSystem, setPersonaSystem] = React.useState('')

  // Prefill once the account loads.
  const loadedRef = React.useRef(false)
  React.useEffect(() => {
    if (loadedRef.current) return
    const u = accountQuery.data?.user
    if (!u) return
    setPersonaName(u.aiPersonaName || '')
    setPersonaTone(u.aiPersonaTone || '')
    setPersonaSystem(u.aiPersonaSystem || '')
    loadedRef.current = true
  }, [accountQuery.data])

  // Live preview of the effective system prompt — updates as the user types.
  const effectiveSystem = React.useMemo(() => {
    const override = personaSystem.trim()
    if (override) return override
    const namePart = personaName.trim() ? `Your name is ${personaName.trim()}.` : ''
    const tonePart = personaTone.trim() ? `Your tone is ${personaTone.trim()}.` : ''
    const parts = [namePart, tonePart, DEFAULT_PREAMBLE].filter(Boolean)
    return parts.join(' ')
  }, [personaName, personaTone, personaSystem])

  const saveMut = useMutation({
    mutationFn: (payload: {
      aiPersonaName?: string
      aiPersonaTone?: string
      aiPersonaSystem?: string
    }) =>
      fetchJson('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account'] })
      toast({ title: 'AI persona saved' })
    },
    onError: (err: Error) =>
      toast({
        title: 'Could not save persona',
        description: err.message,
        variant: 'destructive',
      }),
  })

  function save() {
    saveMut.mutate({
      aiPersonaName: personaName.trim(),
      aiPersonaTone: personaTone.trim(),
      aiPersonaSystem: personaSystem.trim(),
    })
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="size-4 text-forest" /> AI Persona
        </CardTitle>
        <CardDescription>
          Personalize how the built-in AI assistant speaks across AI Copy, the AI
          Tool Router, and all AI-powered tools.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="persona-name">Persona name</Label>
            <Input
              id="persona-name"
              value={personaName}
              onChange={(e) => setPersonaName(e.target.value)}
              placeholder="VirtuaLab Assistant"
            />
            <p className="text-[11px] text-muted-foreground">
              Used in the prompt: &ldquo;Your name is {`{name}`}.&rdquo;
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="persona-tone">Tone</Label>
            <Input
              id="persona-tone"
              value={personaTone}
              onChange={(e) => setPersonaTone(e.target.value)}
              placeholder="warm, organic, practical"
            />
            <p className="text-[11px] text-muted-foreground">
              Used in the prompt: &ldquo;Your tone is {`{tone}`}.&rdquo;
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="persona-system">
            System prompt override{' '}
            <span className="text-muted-foreground font-normal">
              (optional — replaces the default preamble if set)
            </span>
          </Label>
          <Textarea
            id="persona-system"
            value={personaSystem}
            onChange={(e) => setPersonaSystem(e.target.value)}
            placeholder="You are a helpful assistant for small businesses…"
            className="min-h-32 font-mono text-xs"
          />
          <p className="text-[11px] text-muted-foreground">
            If set, this <span className="font-medium text-foreground">completely replaces</span>{' '}
            the default preamble (the name + tone are ignored). Leave blank to use the
            default preamble with your name + tone.
          </p>
        </div>

        {/* Live preview */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Leaf className="size-3.5 text-forest" /> Effective system prompt (preview)
          </Label>
          <div
            className="rounded-lg border border-forest/30 bg-forest/5 p-3 text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto font-mono"
            style={{ scrollbarColor: 'var(--color-forest) transparent' }}
          >
            {effectiveSystem}
          </div>
        </div>

        {/* Note about how the persona is applied */}
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground leading-relaxed">
          This persona is used by the built-in AI API (z-ai) for AI Copy, the AI Tool
          Router, and all AI-powered tools. When you use Bring-Your-Own LLM
          (Ollama/OpenRouter/Groq), the persona is still applied as a system preamble.
        </div>

        <div className="flex justify-end">
          <Button
            onClick={save}
            disabled={saveMut.isPending}
            className="bg-forest text-primary-foreground hover:bg-forest/90"
          >
            {saveMut.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            Save persona
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* TeamAccessCard — master-panel role + 12 access toggles              */
/*                                                                     */
/* Since this is a single-user demo (no real auth), this card lets the  */
/* owner configure the role + which features the account can access.   */
/* The nav (in app-shell) reads these flags and hides inaccessible     */
/* features.                                                           */
/* ------------------------------------------------------------------ */

function TeamAccessCard() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const accountQuery = useQuery<AccountResponse>({
    queryKey: ['account'],
    queryFn: () => fetchJson('/api/account'),
  })

  const [role, setRole] = React.useState<'owner' | 'admin' | 'member'>('owner')
  const [access, setAccess] = React.useState<Record<string, boolean>>({})

  // Prefill once the account loads.
  const loadedRef = React.useRef(false)
  React.useEffect(() => {
    if (loadedRef.current) return
    const u = accountQuery.data?.user
    if (!u) return
    setRole(u.role || 'owner')
    const next: Record<string, boolean> = {}
    for (const f of ACCESS_FLAGS) {
      next[f.key] = Boolean((u as any)[f.key])
    }
    setAccess(next)
    loadedRef.current = true
  }, [accountQuery.data])

  // When the role is 'member', admin-only toggles are forced off + disabled.
  const memberLocked = role === 'member'

  function toggle(key: string, value: boolean) {
    // Admin-only toggles can't be enabled while role is 'member'.
    const flag = ACCESS_FLAGS.find((f) => f.key === key)
    if (flag?.adminOnly && memberLocked) return
    setAccess((prev) => ({ ...prev, [key]: value }))
  }

  function patchRole(next: 'owner' | 'admin' | 'member') {
    setRole(next)
    // If we just dropped to member, force admin-only flags off.
    if (next === 'member') {
      setAccess((prev) => {
        const copy = { ...prev }
        for (const f of ACCESS_FLAGS) {
          if (f.adminOnly) copy[f.key] = false
        }
        return copy
      })
    }
  }

  const saveMut = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      fetchJson('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account'] })
      toast({ title: 'Access control saved' })
    },
    onError: (err: Error) =>
      toast({
        title: 'Could not save access control',
        description: err.message,
        variant: 'destructive',
      }),
  })

  function save() {
    const payload: Record<string, unknown> = { role }
    for (const f of ACCESS_FLAGS) {
      payload[f.key] = Boolean(access[f.key])
    }
    saveMut.mutate(payload)
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="size-4 text-forest" /> Team &amp; Access Control
        </CardTitle>
        <CardDescription>
          As the master-panel owner, you control which features this account can
          access. API Settings + External Secrets are restricted to Owner + Admin.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Role */}
        <div className="space-y-1.5">
          <Label htmlFor="role-select">Your role</Label>
          <Select value={role} onValueChange={(v) => patchRole(v as 'owner' | 'admin' | 'member')}>
            <SelectTrigger id="role-select" className="w-full sm:w-56">
              <SelectValue placeholder="Pick a role…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="owner">Owner (full access)</SelectItem>
              <SelectItem value="admin">Admin (no API/secrets)</SelectItem>
              <SelectItem value="member">Member (limited)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            Role changes the available feature toggles below. Member role hides API
            Settings + External Secrets.
          </p>
        </div>

        <Separator />

        {/* Access grid */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Access control — 12 feature flags
          </Label>
          <div className="grid sm:grid-cols-2 gap-3">
            {ACCESS_FLAGS.map((f) => {
              const value = Boolean(access[f.key])
              const locked = f.adminOnly && memberLocked
              return (
                <div
                  key={f.key}
                  className={cn(
                    'flex items-start justify-between gap-3 rounded-xl border p-3 transition',
                    locked
                      ? 'border-border bg-muted/40 opacity-70'
                      : 'border-border bg-card hover:border-forest/30',
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-foreground">{f.label}</p>
                      {f.adminOnly && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center">
                              <Lock className="size-3 text-terracotta" aria-label="Admin/Owner only" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>Admin / Owner only</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                      {f.desc}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {locked ? (
                      <span className="text-[10px] uppercase tracking-wider text-terracotta">
                        Locked
                      </span>
                    ) : null}
                    <Switch
                      checked={value}
                      disabled={locked}
                      onCheckedChange={(c) => toggle(f.key, c)}
                      aria-label={`Toggle ${f.label} access`}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Role summary */}
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
          <CheckCircle2 className="size-3.5 text-forest shrink-0 mt-0.5" />
          <span>
            Toggling a feature off hides its nav item. API Settings + External
            Secrets are reserved for Owner + Admin — they&rsquo;re locked when the
            role is Member.
          </span>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={save}
            disabled={saveMut.isPending}
            className="bg-forest text-primary-foreground hover:bg-forest/90"
          >
            {saveMut.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Users className="size-4" />
            )}
            Save access
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
