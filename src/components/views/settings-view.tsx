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
import { AiPersonaCard } from './settings/ai-persona-card'
import { TeamAccessCard } from './settings/team-access-card'
import { AiProviderCard } from './settings/ai-provider-card'
import { PlanBadge } from './settings/plan-badge'

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

