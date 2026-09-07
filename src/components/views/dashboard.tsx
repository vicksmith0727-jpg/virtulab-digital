'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  Rocket,
  LayoutTemplate,
  Plug,
  BarChart3,
  Settings,
  FolderOpen,
  Loader2,
  Globe,
  Inbox,
  FileEdit,
  Sprout,
  Activity,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
  FolderKanban,
  Gauge,
  TrendingUp,
  Leaf,
  AlertTriangle,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { fetchJson } from '@/lib/client-utils'
import { DashboardAssistant } from '@/components/dashboard-assistant'

/* ------------------------------------------------------------------ */

interface Project {
  id: string
  name: string
  subdomain?: string | null
  description?: string | null
  status: 'draft' | 'published'
  thumbnail?: string | null
  createdAt: string
  updatedAt: string
}

interface Analytics {
  stats: {
    totalProjects: number
    publishedProjects: number
    totalBlocks: number
    totalIntegrations: number
    recentActivity: ActivityEntry[]
    topProjects: any[]
  }
}

interface ActivityEntry {
  id: string
  projectId: string | null
  action: string
  detail: string | null
  createdAt: string
}

interface InboxStats {
  stats?: {
    unread?: number
  }
}

interface AccountResponse {
  user: {
    id: string
    email: string
    name: string | null
    plan: string
    role: 'owner' | 'admin' | 'member'
    aiPersonaName?: string | null
    aiPersonaTone?: string | null
    aiPersonaSystem?: string | null
    canAccessBuilder?: boolean
    canAccessSEO?: boolean
    canAccessSocial?: boolean
    canAccessContent?: boolean
    canAccessPM?: boolean
    canAccessAutomation?: boolean
    canAccessInbox?: boolean
    canAccessIntegrations?: boolean
    canAccessAnalytics?: boolean
    canAccessSettings?: boolean
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

// Four plans surfaced by the Upgrade dialog. Mirrors the backend planLimits map.
const PLAN_TIER_META: { id: string; label: string; tagline: string; limits: { projects: number; pages: number; integrations: number } }[] = [
  { id: 'seed', label: 'Seed (Free)', tagline: 'For trying things out', limits: { projects: 1, pages: 3, integrations: 5 } },
  { id: 'sprout', label: 'Sprout ($19/mo)', tagline: 'For solo makers', limits: { projects: 10, pages: 50, integrations: 20 } },
  { id: 'grove', label: 'Grove ($49/mo)', tagline: 'For growing teams', limits: { projects: 100, pages: 500, integrations: 50 } },
  { id: 'forest', label: 'Forest (Unlimited)', tagline: 'For agencies & power users', limits: { projects: -1, pages: -1, integrations: -1 } },
]

function planBadgeClass(plan: string): string {
  return (
    {
      seed: 'text-forest border-forest/40 bg-forest/5',
      sprout: 'text-moss border-sage/50 bg-sage/10',
      grove: 'text-terracotta border-terracotta/40 bg-terracotta/5',
      forest: 'text-bark border-bark/40 bg-bark/5',
    }[plan] || 'text-forest border-forest/40 bg-forest/5'
  )
}

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime()
  const now = Date.now()
  const diff = Math.max(0, now - t)
  const min = 60 * 1000
  const hr = 60 * min
  const day = 24 * hr
  if (diff < min) return 'just now'
  if (diff < hr) return `${Math.floor(diff / min)}m ago`
  if (diff < day) return `${Math.floor(diff / hr)}h ago`
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// Map an activity `action` string → a lucide icon. We keyword-match so it works
// regardless of the exact action text the backend logged.
function iconForAction(action: string): typeof Activity {
  const a = action.toLowerCase()
  if (a.includes('create')) return Sprout
  if (a.includes('publish')) return Globe
  if (a.includes('update') || a.includes('edit') || a.includes('rename')) return Pencil
  if (a.includes('delete') || a.includes('remove')) return Trash2
  if (a.includes('duplicate') || a.includes('copy')) return Copy
  if (a.includes('connect') || a.includes('integration')) return Plug
  return Activity
}

/* ------------------------------------------------------------------ */

export function DashboardView() {
  const setView = useAppStore((s) => s.setView)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const projectsQuery = useQuery<{ projects: Project[] }>({
    queryKey: ['projects'],
    queryFn: () => fetchJson('/api/projects'),
  })

  const analyticsQuery = useQuery<Analytics>({
    queryKey: ['analytics'],
    queryFn: () => fetchJson('/api/analytics'),
  })

  // Inbox unread count — powers the "Reply to N messages" pending task card.
  const inboxQuery = useQuery<InboxStats>({
    queryKey: ['inbox'],
    queryFn: () => fetchJson('/api/inbox'),
  })

  // Account (plan + usage) — powers the Usage & Plan section at the top.
  const accountQuery = useQuery<AccountResponse>({
    queryKey: ['account'],
    queryFn: () => fetchJson('/api/account'),
  })

  const newProjectMut = useMutation({
    mutationFn: (payload: { name: string; subdomain?: string; description?: string }) =>
      fetchJson('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      toast({ title: 'Project created', description: 'Your new site is ready to grow.' })
      const pageId = data?.page?.id
      setView({ name: 'builder', projectId: data.project.id, pageId })
    },
    onError: () => {
      toast({ title: 'Could not create project', variant: 'destructive' })
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/projects/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      toast({ title: 'Project deleted' })
    },
    onError: () => toast({ title: 'Delete failed', variant: 'destructive' }),
  })

  const duplicateMut = useMutation({
    mutationFn: async (project: Project) => {
      const res = await fetchJson('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${project.name} (copy)`,
          subdomain: project.subdomain ? `${project.subdomain}-copy` : undefined,
          description: project.description ?? undefined,
        }),
      })
      return res
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast({ title: 'Project duplicated' })
    },
    onError: () => toast({ title: 'Duplicate failed', variant: 'destructive' }),
  })

  const renameMut = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      fetchJson(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast({ title: 'Project renamed' })
    },
    onError: () => toast({ title: 'Rename failed', variant: 'destructive' }),
  })

  const stats = analyticsQuery.data?.stats
  const projects = projectsQuery.data?.projects ?? []
  const recentActivity = stats?.recentActivity ?? []
  const unreadCount = inboxQuery.data?.stats?.unread ?? 0
  const draftCount = projects.filter((p) => p.status === 'draft').length

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [newName, setNewName] = React.useState('')
  const [newSub, setNewSub] = React.useState('')
  const [newDesc, setNewDesc] = React.useState('')

  function submitNew(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    newProjectMut.mutate({
      name: newName.trim(),
      subdomain: newSub.trim() || undefined,
      description: newDesc.trim() || undefined,
    })
    setNewName('')
    setNewSub('')
    setNewDesc('')
    setDialogOpen(false)
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <p className="text-sm text-muted-foreground">Welcome back,</p>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              Maker
            </h1>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-forest text-primary-foreground hover:bg-forest/90">
                <Plus className="size-4" /> New project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={submitNew}>
                <DialogHeader>
                  <DialogTitle>Plant a new project</DialogTitle>
                  <DialogDescription>
                    Choose a name and an optional subdomain. You can change everything later.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Hollow Field Farm"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sub">Subdomain (optional)</Label>
                    <Input
                      id="sub"
                      value={newSub}
                      onChange={(e) => setNewSub(e.target.value)}
                      placeholder="hollowfield"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="desc">Description (optional)</Label>
                    <Textarea
                      id="desc"
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      placeholder="What is this site about?"
                      className="min-h-16"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={newProjectMut.isPending}
                    className="bg-forest text-primary-foreground hover:bg-forest/90"
                  >
                    {newProjectMut.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Plus className="size-4" />
                    )}
                    Create
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Today's Updates — horizontal scroll of recent activity */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Activity className="size-4 text-forest" /> Today&rsquo;s updates
            </h2>
            <button
              type="button"
              onClick={() => setView({ name: 'analytics' })}
              className="text-xs text-muted-foreground hover:text-forest transition flex items-center gap-1"
            >
              View all <ArrowRight className="size-3" />
            </button>
          </div>
          {analyticsQuery.isLoading ? (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 min-w-64 rounded-xl shrink-0" />
              ))}
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
              No recent activity yet. Plant your first project to get started.
            </div>
          ) : (
            <div
              className="flex gap-3 overflow-x-auto pb-2"
              style={{ scrollbarColor: 'var(--color-forest) transparent' }}
            >
              {recentActivity.slice(0, 10).map((entry) => {
                const Icon = iconForAction(entry.action)
                return (
                  <div
                    key={entry.id}
                    className="min-w-64 max-w-72 shrink-0 rounded-xl border border-border bg-card p-4 hover:border-forest/30 transition"
                  >
                    <div className="flex items-start gap-3">
                      <div className="size-8 rounded-lg bg-forest/10 text-forest flex items-center justify-center shrink-0">
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground line-clamp-1">
                          {entry.action}
                        </p>
                        {entry.detail && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                            {entry.detail}
                          </p>
                        )}
                        <p className="text-[11px] text-muted-foreground mt-1.5">
                          {relativeTime(entry.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Pending Tasks */}
        <section className="mb-10">
          <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
            <CheckCircle2 className="size-4 text-forest" /> Pending tasks
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* Reply to N messages */}
            <PendingTaskCard
              icon={Inbox}
              tone="forest"
              title={unreadCount > 0 ? `Reply to ${unreadCount} message${unreadCount === 1 ? '' : 's'}` : 'Inbox caught up'}
              desc={
                unreadCount > 0
                  ? 'Unread emails + social messages are waiting for a response.'
                  : 'No unread messages right now. Nicely done.'
              }
              ctaLabel={unreadCount > 0 ? 'Open inbox' : 'View inbox'}
              ctaDisabled={unreadCount === 0}
              onCta={() => setView({ name: 'inbox' })}
              loading={inboxQuery.isLoading}
            />
            {/* Publish X draft projects */}
            <PendingTaskCard
              icon={FileEdit}
              tone="terracotta"
              title={draftCount > 0 ? `Publish ${draftCount} draft project${draftCount === 1 ? '' : 's'}` : 'All projects published'}
              desc={
                draftCount > 0
                  ? 'You have draft sites waiting to go live. Open the builder to publish.'
                  : 'Everything you built is live. Time to make something new.'
              }
              ctaLabel={draftCount > 0 ? 'Go to projects' : 'View projects'}
              ctaDisabled={draftCount === 0}
              onCta={() => {
                // Scroll down to the projects section
                document.getElementById('projects-section')?.scrollIntoView({ behavior: 'smooth' })
              }}
              loading={projectsQuery.isLoading}
            />
            {/* Discover tools */}
            <PendingTaskCard
              icon={Sparkles}
              tone="sage"
              title="Try the AI content tools"
              desc="Generate a blog post, social captions, or a 30-day content calendar in seconds."
              ctaLabel="Browse tools"
              onCta={() => setView({ name: 'content-tools' })}
            />
          </div>
        </section>

        {/* Usage & Plan — top section, above the stats row */}
        <UsagePlanSection account={accountQuery.data} loading={accountQuery.isLoading} />

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
          <StatCard
            label="Projects"
            value={stats?.totalProjects}
            loading={analyticsQuery.isLoading}
          />
          <StatCard
            label="Published"
            value={stats?.publishedProjects}
            loading={analyticsQuery.isLoading}
          />
          <StatCard
            label="Total blocks"
            value={stats?.totalBlocks}
            loading={analyticsQuery.isLoading}
          />
          <StatCard
            label="Integrations"
            value={stats?.totalIntegrations}
            loading={analyticsQuery.isLoading}
          />
        </div>

        {/* Projects */}
        <section id="projects-section" className="mb-12 scroll-mt-20">
          <h2 className="text-lg font-semibold text-foreground mb-4">Projects</h2>

          {projectsQuery.isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-44 rounded-2xl" />
              ))}
            </div>
          ) : projectsQuery.isError ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
              Could not load projects. Please refresh.
            </div>
          ) : projects.length === 0 ? (
            <EmptyState onCreate={() => setDialogOpen(true)} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  onEdit={() => setView({ name: 'builder', projectId: p.id })}
                  onOpen={() => setView({ name: 'builder', projectId: p.id })}
                  onDelete={() => deleteMut.mutate(p.id)}
                  onDuplicate={() => duplicateMut.mutate(p)}
                  onRename={(name) => renameMut.mutate({ id: p.id, name })}
                />
              ))}
            </div>
          )}
        </section>

        {/* Tools */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">Tools</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ToolCard
              icon={LayoutTemplate}
              title="Templates"
              desc="Start from a quiet theme"
              onClick={() => setView({ name: 'templates' })}
            />
            <ToolCard
              icon={Plug}
              title="Integrations"
              desc="Connect your tools"
              onClick={() => setView({ name: 'integrations' })}
            />
            <ToolCard
              icon={BarChart3}
              title="Analytics"
              desc="See how you grow"
              onClick={() => setView({ name: 'analytics' })}
            />
            <ToolCard
              icon={Settings}
              title="Settings"
              desc="Account & theme"
              onClick={() => setView({ name: 'settings' })}
            />
          </div>
        </section>
      </div>

      {/* Floating AI assistant — bottom-right chat panel */}
      <DashboardAssistant />
    </div>
  )
}

/* ------------------------------------------------------------------ */

function PendingTaskCard({
  icon: Icon,
  tone,
  title,
  desc,
  ctaLabel,
  ctaDisabled,
  onCta,
  loading,
}: {
  icon: typeof Inbox
  tone: 'forest' | 'terracotta' | 'sage'
  title: string
  desc: string
  ctaLabel: string
  ctaDisabled?: boolean
  onCta: () => void
  loading?: boolean
}) {
  const toneClasses = {
    forest: 'bg-forest/10 text-forest',
    terracotta: 'bg-terracotta/10 text-terracotta',
    sage: 'bg-sage/15 text-moss',
  } as const
  const btnClasses = {
    forest: 'bg-forest text-primary-foreground hover:bg-forest/90',
    terracotta: 'bg-terracotta text-primary-foreground hover:bg-terracotta/90',
    sage: 'bg-forest text-primary-foreground hover:bg-forest/90',
  } as const
  return (
    <Card className="flex flex-col p-5 gap-3">
      <div className="flex items-start gap-3">
        <div className={cn('size-9 rounded-lg flex items-center justify-center shrink-0', toneClasses[tone])}>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          {loading ? (
            <Skeleton className="h-4 w-32 mb-2" />
          ) : (
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          )}
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
        </div>
      </div>
      <div className="mt-auto pt-1">
        <Button
          size="sm"
          disabled={ctaDisabled || loading}
          onClick={onCta}
          className={cn('w-full', btnClasses[tone])}
        >
          {ctaLabel}
        </Button>
      </div>
    </Card>
  )
}

function StatCard({
  label,
  value,
  loading,
}: {
  label: string
  value?: number
  loading?: boolean
}) {
  return (
    <Card className="py-4 gap-0">
      <CardContent className="pt-0">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        {loading ? (
          <Skeleton className="h-8 w-12 mt-2" />
        ) : (
          <p className="text-3xl font-semibold text-forest tracking-tight mt-1">
            {value ?? 0}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function gradientFor(name: string) {
  // Deterministic organic gradient based on name
  const grads = [
    'from-forest/80 to-sage/70',
    'from-sage/80 to-moss/70',
    'from-terracotta/80 to-clay/70',
    'from-moss/80 to-forest/70',
    'from-clay/80 to-sand/70',
    'from-sand/80 to-sage/70',
  ]
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return grads[h % grads.length]
}

function ProjectCard({
  project,
  onEdit,
  onOpen,
  onDelete,
  onDuplicate,
  onRename,
}: {
  project: Project
  onEdit: () => void
  onOpen: () => void
  onDelete: () => void
  onDuplicate: () => void
  onRename: (name: string) => void
}) {
  const [renameOpen, setRenameOpen] = React.useState(false)
  const [name, setName] = React.useState(project.name)

  const updated = new Date(project.updatedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <Card className="overflow-hidden py-0 gap-0">
      <button
        type="button"
        onClick={onOpen}
        className="block w-full text-left"
      >
        <div
          className={cn(
            'h-28 w-full bg-gradient-to-br organic-grain',
            gradientFor(project.name),
          )}
        >
          {project.thumbnail ? (
            <img
              src={project.thumbnail}
              alt={project.name}
              className="w-full h-full object-cover"
            />
          ) : null}
        </div>
      </button>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground truncate">{project.name}</h3>
            {project.subdomain && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                <Globe className="size-3" />
                {project.subdomain}.virtulab.digital
              </p>
            )}
          </div>
          <Badge
            variant="outline"
            className={cn(
              'shrink-0',
              project.status === 'published'
                ? 'text-forest border-forest/40'
                : 'text-muted-foreground',
            )}
          >
            {project.status === 'published' ? 'Published' : 'Draft'}
          </Badge>
        </div>
        {project.description && (
          <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
            {project.description}
          </p>
        )}
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Updated {updated}</span>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" onClick={onEdit}>
              <Pencil className="size-3.5" /> Edit
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="size-8" aria-label="More">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Project</DropdownMenuLabel>
                <DropdownMenuItem onClick={onOpen}>
                  <FolderOpen className="size-3.5" /> Open in builder
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setName(project.name)
                    setRenameOpen(true)
                  }}
                >
                  <Pencil className="size-3.5" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDuplicate}>
                  <Copy className="size-3.5" /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="size-3.5" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>

      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename project</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-1.5">
            <Label htmlFor="rename-input">Name</Label>
            <Input
              id="rename-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (name.trim()) onRename(name.trim())
                setRenameOpen(false)
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function ToolCard({
  icon: Icon,
  title,
  desc,
  onClick,
}: {
  icon: typeof Plus
  title: string
  desc: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-2xl border border-border bg-card p-4 hover:border-forest/40 hover:bg-forest/5 transition"
    >
      <div className="size-9 rounded-lg bg-forest/10 text-forest flex items-center justify-center mb-3">
        <Icon className="size-4" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
    </button>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-border p-10 sm:p-16 text-center">
      <div className="mx-auto size-16 rounded-2xl bg-forest/10 text-forest flex items-center justify-center mb-5">
        <Rocket className="size-7" />
      </div>
      <h3 className="text-xl font-semibold text-foreground">Your studio is empty</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
        Plant your first project — start from scratch or pick a template. Either way, you&rsquo;ll
        be publishing in minutes.
      </p>
      <Button
        className="mt-6 bg-forest text-primary-foreground hover:bg-forest/90"
        onClick={onCreate}
      >
        <Plus className="size-4" /> Create your first project
      </Button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Usage & Plan section — 4 progress cards + an Upgrade dialog         */
/* Sits at the top of the dashboard, above the stats row.               */
/* ------------------------------------------------------------------ */

function UsagePlanSection({
  account,
  loading,
}: {
  account: AccountResponse | undefined
  loading?: boolean
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [upgradeOpen, setUpgradeOpen] = React.useState(false)

  const usage = account?.usage
  const plan = account?.plan
  const planCurrent = plan?.current || 'seed'
  const planLabel = plan?.label || PLAN_TIER_META.find((p) => p.id === planCurrent)?.label || 'Seed (Free)'
  const limits = plan?.limits ?? { projects: 0, pages: 0, integrations: 0 }

  const usagePct = plan?.usagePercent ?? { projects: 0, pages: 0, integrations: 0 }

  // Approaching-limit warning if any non-unlimited metric is > 80% of its limit.
  const approaching = [
    { key: 'projects' as const, label: 'projects', pct: usagePct.projects },
    { key: 'pages' as const, label: 'pages', pct: usagePct.pages },
    { key: 'integrations' as const, label: 'integrations', pct: usagePct.integrations },
  ].filter((m) => limits[m.key] > 0 && m.pct >= 80)

  // Mutation to change the plan via PATCH /api/account.
  const changePlanMut = useMutation({
    mutationFn: (nextPlan: string) =>
      fetchJson('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: nextPlan }),
      }),
    onSuccess: (_data, nextPlan) => {
      queryClient.invalidateQueries({ queryKey: ['account'] })
      const tier = PLAN_TIER_META.find((p) => p.id === nextPlan)
      toast({
        title: `Switched to ${tier?.label ?? nextPlan}`,
        description: 'Your plan is now active. Limits update immediately.',
      })
      setUpgradeOpen(false)
    },
    onError: (err: Error) =>
      toast({
        title: 'Could not change plan',
        description: err.message,
        variant: 'destructive',
      }),
  })

  return (
    <section className="mb-10">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Gauge className="size-4 text-forest" /> Usage &amp; plan
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track how much of your plan you&rsquo;re using. Upgrade any time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn('capitalize', planBadgeClass(planCurrent))}>
            <Leaf className="size-3 mr-1" /> {planLabel}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setUpgradeOpen(true)}
            className="text-forest border-forest/40 hover:bg-forest/10"
          >
            <TrendingUp className="size-3.5" /> Upgrade plan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <UsageCard
          icon={FolderKanban}
          label="Projects"
          current={usage?.projects ?? 0}
          limit={limits.projects}
          percent={usagePct.projects}
          loading={loading}
        />
        <UsageCard
          icon={Globe}
          label="Pages"
          current={usage?.pages ?? 0}
          limit={limits.pages}
          percent={usagePct.pages}
          loading={loading}
        />
        <UsageCard
          icon={Plug}
          label="Integrations"
          current={usage?.integrations ?? 0}
          limit={limits.integrations}
          percent={usagePct.integrations}
          loading={loading}
        />
        <UsageCard
          icon={Clock}
          label="Billable hours"
          current={usage?.billableHours ?? 0}
          // No limit on billable hours — just the running count.
          limit={0}
          percent={0}
          loading={loading}
          isHours
        />
      </div>

      {approaching.length > 0 && (
        <div className="mt-3 rounded-xl border border-terracotta/40 bg-terracotta/5 px-4 py-3 text-sm text-terracotta flex items-start gap-2">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Approaching limit — consider upgrading.</p>
            <p className="text-xs text-terracotta/80 mt-0.5">
              {approaching
                .map((m) => `${m.label} (${m.pct}% used)`)
                .join(' · ')}
            </p>
          </div>
        </div>
      )}

      <UpgradePlanDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        currentPlan={planCurrent}
        onPick={(planId) => changePlanMut.mutate(planId)}
        pending={changePlanMut.isPending}
      />
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* UsageCard — one progress card with icon, label, current/limit,      */
/* thin Progress bar. Forest under 80%, terracotta at/above 80%.       */
/* ------------------------------------------------------------------ */

function UsageCard({
  icon: Icon,
  label,
  current,
  limit,
  percent,
  loading,
  isHours = false,
}: {
  icon: typeof FolderKanban
  label: string
  current: number
  limit: number
  percent: number
  loading?: boolean
  isHours?: boolean
}) {
  const unlimited = limit <= 0 && !isHours
  const over = !isHours && !unlimited && percent >= 80
  const valueText = isHours
    ? `${current} hrs`
    : unlimited
      ? `${current}`
      : `${current} / ${limit === -1 ? '∞' : limit}`

  // Progress shows 0 for unlimited / hours (no fixed cap to compare against).
  const shown = isHours || unlimited ? 0 : Math.min(100, Math.max(0, percent))

  return (
    <Card className="py-4 gap-0">
      <CardContent className="pt-0">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'size-7 rounded-lg flex items-center justify-center shrink-0',
              over
                ? 'bg-terracotta/10 text-terracotta'
                : 'bg-forest/10 text-forest',
            )}
          >
            <Icon className="size-3.5" />
          </div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
        </div>
        {loading ? (
          <Skeleton className="h-7 w-16 mt-2" />
        ) : (
          <p
            className={cn(
              'text-2xl font-semibold tracking-tight mt-1',
              over ? 'text-terracotta' : 'text-forest',
            )}
          >
            {valueText}
          </p>
        )}
        {(isHours || unlimited) ? (
          <p className="text-[10px] text-muted-foreground mt-1">
            {isHours ? 'Across all tracked time' : 'Unlimited on this plan'}
          </p>
        ) : (
          <div className="mt-2">
            <Progress
              value={shown}
              className={cn(
                'h-1.5',
                over ? 'bg-terracotta/15' : 'bg-forest/15',
              )}
            />
            <p
              className={cn(
                'text-[10px] mt-1',
                over ? 'text-terracotta' : 'text-muted-foreground',
              )}
            >
              {shown}% used
              {over ? ' — approaching limit' : ''}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* UpgradePlanDialog — informational comparison of the 4 plans +      */
/* PATCH /api/account to switch (no payment, demo only).               */
/* ------------------------------------------------------------------ */

function UpgradePlanDialog({
  open,
  onOpenChange,
  currentPlan,
  onPick,
  pending,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  currentPlan: string
  onPick: (planId: string) => void
  pending?: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Leaf className="size-4 text-forest" /> Plans — pick what fits
          </DialogTitle>
          <DialogDescription>
            Demo only — switching plans here just updates your account limit tier.
            No payment is processed. Your data stays the same.
          </DialogDescription>
        </DialogHeader>

        <div className="grid sm:grid-cols-2 gap-3 py-2">
          {PLAN_TIER_META.map((tier) => {
            const isCurrent = tier.id === currentPlan
            return (
              <div
                key={tier.id}
                className={cn(
                  'rounded-xl border p-4 flex flex-col gap-2 transition',
                  isCurrent
                    ? 'border-forest bg-forest/5'
                    : 'border-border bg-card hover:border-forest/30',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">{tier.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{tier.tagline}</p>
                  </div>
                  {isCurrent && (
                    <Badge
                      variant="outline"
                      className="text-forest border-forest/40 bg-forest/10"
                    >
                      Current
                    </Badge>
                  )}
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>
                    <span className="font-medium text-foreground">
                      {tier.limits.projects === -1 ? 'Unlimited' : tier.limits.projects}
                    </span>{' '}
                    projects
                  </li>
                  <li>
                    <span className="font-medium text-foreground">
                      {tier.limits.pages === -1 ? 'Unlimited' : tier.limits.pages}
                    </span>{' '}
                    pages
                  </li>
                  <li>
                    <span className="font-medium text-foreground">
                      {tier.limits.integrations === -1 ? 'Unlimited' : tier.limits.integrations}
                    </span>{' '}
                    integrations
                  </li>
                </ul>
                <Button
                  size="sm"
                  variant={isCurrent ? 'outline' : 'default'}
                  disabled={isCurrent || pending}
                  onClick={() => onPick(tier.id)}
                  className={
                    isCurrent
                      ? ''
                      : 'bg-forest text-primary-foreground hover:bg-forest/90'
                  }
                >
                  {isCurrent
                    ? 'Current plan'
                    : pending
                      ? 'Switching…'
                      : `Switch to ${tier.label.split(' ')[0]}`}
                </Button>
              </div>
            )
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
