'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  Play,
  Square,
  FolderKanban,
  CheckSquare,
  Users,
  FileText,
  Receipt,
  Calendar,
  FolderOpen,
  Repeat,
  BarChart3,
  Sparkles,
  AlertCircle,
  ArrowRight,
  Mail,
  Phone,
  Building2,
  CircleDot,
  TimerReset,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
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
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { fetchJson, DynamicIcon } from '@/lib/client-utils'
import {
  AddCustomToolDialog,
  AddCustomToolCard,
  CustomToolRunDialog,
  BuiltInToolInfoDialog,
  useDeleteCustomTool,
  PM_CATEGORIES,
  type CustomTool,
  type BuiltInToolLike,
} from '@/components/shared/add-custom-tool-dialog'

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface PmTool {
  id: string
  label: string
  icon: string
  description: string
  kind: 'builtin' | 'integration'
}

interface PmCatalogResponse {
  tools: PmTool[]
  stats: {
    tasks: number
    clients: number
    projects: number
    timeEntries: number
    totalBillableHours: number
  }
  note: string
}

type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done'
type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

interface PmTask {
  id: string
  title: string
  description?: string | null
  status: TaskStatus
  priority: TaskPriority
  dueDate?: string | null
  completedAt?: string | null
  projectRecordId?: string | null
  clientId?: string | null
  assignee?: string | null
  createdAt?: string
  updatedAt?: string
}

interface PmClient {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  company?: string | null
  notes?: string | null
  status: string
  _count?: { projects: number; tasks: number }
}

interface PmProject {
  id: string
  name: string
  description?: string | null
  status: string
  priority: string
  dueDate?: string | null
  client?: { id: string; name: string } | null
  _count?: { tasks: number; timeEntries: number }
}

interface PmTimeEntry {
  id: string
  description: string
  startedAt: string
  endedAt?: string | null
  durationMin: number
  billable: boolean
  projectRecordId?: string | null
  clientId?: string | null
  task?: string | null
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'To Do',
  'in-progress': 'In Progress',
  review: 'Review',
  done: 'Done',
}

const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: 'bg-sand text-bark border-border',
  'in-progress': 'bg-forest/10 text-forest border-forest/30',
  review: 'bg-terracotta/10 text-terracotta border-terracotta/30',
  done: 'bg-moss/15 text-moss border-moss/30',
}

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}

const PRIORITY_BADGE: Record<TaskPriority, string> = {
  low: 'bg-muted text-muted-foreground border-border',
  medium: 'bg-sage/15 text-moss border-sage/30',
  high: 'bg-terracotta/15 text-terracotta border-terracotta/30',
  urgent: 'bg-destructive/10 text-destructive border-destructive/30',
}

const PROJECT_STATUS_LABEL: Record<string, string> = {
  planning: 'Planning',
  active: 'Active',
  review: 'In Review',
  completed: 'Completed',
  'on-hold': 'On Hold',
}

const PROJECT_STATUS_BADGE: Record<string, string> = {
  planning: 'bg-sand text-bark border-border',
  active: 'bg-forest/10 text-forest border-forest/30',
  review: 'bg-terracotta/10 text-terracotta border-terracotta/30',
  completed: 'bg-moss/15 text-moss border-moss/30',
  'on-hold': 'bg-muted text-muted-foreground border-border',
}

const KANBAN_COLUMNS: TaskStatus[] = ['todo', 'in-progress', 'review', 'done']

/* ------------------------------------------------------------------ */
/* Formatters                                                          */
/* ------------------------------------------------------------------ */

function formatDuration(min: number): string {
  if (!min) return '0m'
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function formatDate(d?: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDateTime(d?: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function relativeDate(d?: string | null): string {
  if (!d) return ''
  const date = new Date(d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays === -1) return 'Yesterday'
  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`
  if (diffDays < 7) return `in ${diffDays}d`
  return formatDate(d)
}

/* ------------------------------------------------------------------ */
/* Main view                                                           */
/* ------------------------------------------------------------------ */

export function PmView() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = React.useState('overview')

  // Listen for nav dropdown clicks → switch to the matching tab.
  React.useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail
      if (detail && typeof detail.tab === 'string') {
        // Map tool ids to tab ids (mostly identical).
        const tabMap: Record<string, string> = {
          'time-tracker': 'time',
          retainers: 'retainer',
        }
        setActiveTab(tabMap[detail.tab] ?? detail.tab)
      }
    }
    window.addEventListener('pm:set-tab', handler as EventListener)
    return () => window.removeEventListener('pm:set-tab', handler as EventListener)
  }, [])

  const catalogQuery = useQuery<PmCatalogResponse>({
    queryKey: ['pm-catalog'],
    queryFn: () => fetchJson('/api/pm/catalog'),
  })

  // Fetch custom PM tools (category='pm'). Each one becomes a new tab.
  const customToolsQuery = useQuery<{ tools: CustomTool[] }>({
    queryKey: ['custom-tools'],
    queryFn: () => fetchJson('/api/tools/custom'),
  })
  const customPmTools = (customToolsQuery.data?.tools ?? []).filter(
    (t) => t.category === 'pm',
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
      invalidateKeys: [['pm-catalog'], ['custom-tools']],
    })
  }

  function openBuiltInInfo(meta: { id: string; label: string; description: string; iconKey: string }) {
    setInfoTool({
      id: meta.id,
      label: meta.label,
      description: meta.description,
      iconKey: meta.iconKey,
      category: 'pm',
    })
  }

  function openAddFeature() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('app:add-feature', { detail: { kind: 'project' } }),
      )
    }
  }

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
                  <FolderKanban className="size-3.5" />
                  Project Management
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-sage/40 bg-sage/15 text-sage px-3 py-1 text-xs font-medium uppercase tracking-wider">
                  <Sparkles className="size-3.5" />
                  Built in
                </span>
              </div>
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-balance leading-[1.05]">
                Project Management
              </h1>
              <p className="mt-4 text-lg sm:text-xl text-cream/85 max-w-2xl text-balance">
                Kanban, tasks, time tracking, client CRM, proposals, invoices — all the
                agency ops, all in one place. Built in, no setup.
              </p>
            </div>
            <Button
              type="button"
              onClick={openAddFeature}
              className="bg-cream text-bark hover:bg-cream/90"
            >
              <Plus className="size-4" /> Add feature
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Body */}
      <section className="flex-1 px-4 sm:px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <ScrollArea className="w-full">
              <TabsList className="w-auto min-w-max flex">
                <TabsTrigger value="overview" className="gap-1.5">
                  <BarChart3 className="size-3.5" /> Overview
                </TabsTrigger>
                <TabsTrigger value="kanban" className="gap-1.5">
                  <FolderKanban className="size-3.5" /> Kanban
                </TabsTrigger>
                <TabsTrigger value="tasks" className="gap-1.5">
                  <CheckSquare className="size-3.5" /> Tasks
                </TabsTrigger>
                <TabsTrigger value="time" className="gap-1.5">
                  <Clock className="size-3.5" /> Time Tracker
                </TabsTrigger>
                <TabsTrigger value="clients" className="gap-1.5">
                  <Users className="size-3.5" /> Clients
                </TabsTrigger>
                <TabsTrigger value="projects" className="gap-1.5">
                  <FolderOpen className="size-3.5" /> Projects
                </TabsTrigger>
                {/* Custom PM tool tabs (after the 6 working tabs, before the 6 placeholders). */}
                {customPmTools.map((ct) => (
                  <TabsTrigger
                    key={ct.id}
                    value={ct.id}
                    className="gap-1.5"
                  >
                    <Plus className="size-3.5 text-clay" /> {ct.label}
                  </TabsTrigger>
                ))}
                <TabsTrigger value="proposals" className="gap-1.5">
                  <FileText className="size-3.5" /> Proposals
                </TabsTrigger>
                <TabsTrigger value="invoices" className="gap-1.5">
                  <Receipt className="size-3.5" /> Invoices
                </TabsTrigger>
                <TabsTrigger value="calendar" className="gap-1.5">
                  <Calendar className="size-3.5" /> Calendar
                </TabsTrigger>
                <TabsTrigger value="files" className="gap-1.5">
                  <FolderOpen className="size-3.5" /> Files
                </TabsTrigger>
                <TabsTrigger value="retainer" className="gap-1.5">
                  <Repeat className="size-3.5" /> Retainer
                </TabsTrigger>
                <TabsTrigger value="reporting" className="gap-1.5">
                  <BarChart3 className="size-3.5" /> Reporting
                </TabsTrigger>
              </TabsList>
            </ScrollArea>

            <TabsContent value="overview" className="mt-6">
              <OverviewTab
                catalogQuery={catalogQuery}
                onAddCustom={() => setAddCustomOpen(true)}
              />
            </TabsContent>
            <TabsContent value="kanban" className="mt-6">
              <KanbanTab />
            </TabsContent>
            <TabsContent value="tasks" className="mt-6">
              <TasksTab />
            </TabsContent>
            <TabsContent value="time" className="mt-6">
              <TimeTrackerTab />
            </TabsContent>
            <TabsContent value="clients" className="mt-6">
              <ClientsTab />
            </TabsContent>
            <TabsContent value="projects" className="mt-6">
              <ProjectsTab />
            </TabsContent>
            {/* Custom PM tool tab contents. */}
            {customPmTools.map((ct) => (
              <TabsContent key={ct.id} value={ct.id} className="mt-6">
                <CustomPmTab
                  tool={ct}
                  onOpen={() => setActiveCustomTool(ct)}
                  onEdit={() => setEditingTool(ct)}
                  onDelete={() => handleDeleteCustom(ct)}
                />
              </TabsContent>
            ))}
            <TabsContent value="proposals" className="mt-6">
              <ComingSoonTab
                icon="FileText"
                title="Proposals & Quotes"
                description="Generate proposals from templates, send for e-signature, track opens, auto-convert to project on acceptance. Coming soon."
                onInspect={() =>
                  openBuiltInInfo({
                    id: 'proposals',
                    label: 'Proposals & Quotes',
                    description:
                      'Generate proposals from templates, send for e-signature, track opens, auto-convert to project on acceptance.',
                    iconKey: 'FileText',
                  })
                }
              />
            </TabsContent>
            <TabsContent value="invoices" className="mt-6">
              <ComingSoonTab
                icon="Receipt"
                title="Invoices & Billing"
                description="Create invoices from tracked time or fixed-fee. Stripe / Lemon Squeezy integration. Recurring invoices + reminders. Coming soon."
                onInspect={() =>
                  openBuiltInInfo({
                    id: 'invoices',
                    label: 'Invoices & Billing',
                    description:
                      'Create invoices from tracked time or fixed-fee. Stripe / Lemon Squeezy integration. Recurring invoices + reminders.',
                    iconKey: 'Receipt',
                  })
                }
              />
            </TabsContent>
            <TabsContent value="calendar" className="mt-6">
              <ComingSoonTab
                icon="Calendar"
                title="Calendar & Deadlines"
                description="See all project deadlines, client calls, and content publishing dates in one calendar. Sync with Google Calendar. Coming soon."
                onInspect={() =>
                  openBuiltInInfo({
                    id: 'calendar',
                    label: 'Calendar & Deadlines',
                    description:
                      'See all project deadlines, client calls, and content publishing dates in one calendar. Sync with Google Calendar.',
                    iconKey: 'Calendar',
                  })
                }
              />
            </TabsContent>
            <TabsContent value="files" className="mt-6">
              <ComingSoonTab
                icon="FolderOpen"
                title="Project Files"
                description="Per-project file storage — briefs, assets, deliverables, signed contracts. Integrates with Google Drive / Dropbox MCP. Coming soon."
                onInspect={() =>
                  openBuiltInInfo({
                    id: 'files',
                    label: 'Project Files',
                    description:
                      'Per-project file storage — briefs, assets, deliverables, signed contracts. Integrates with Google Drive / Dropbox MCP.',
                    iconKey: 'FolderOpen',
                  })
                }
              />
            </TabsContent>
            <TabsContent value="retainer" className="mt-6">
              <ComingSoonTab
                icon="Repeat"
                title="Retainer Tracker"
                description="Track monthly retainer hours. See remaining vs used. Auto-alert when 80% consumed. Roll-over rules. Coming soon."
                onInspect={() =>
                  openBuiltInInfo({
                    id: 'retainer',
                    label: 'Retainer Tracker',
                    description:
                      'Track monthly retainer hours. See remaining vs used. Auto-alert when 80% consumed. Roll-over rules.',
                    iconKey: 'Repeat',
                  })
                }
              />
            </TabsContent>
            <TabsContent value="reporting" className="mt-6">
              <ComingSoonTab
                icon="BarChart3"
                title="Client Reporting"
                description="Auto-generate monthly client reports — SEO progress, traffic, tasks done, hours used, next-month plan. PDF + email. Coming soon."
                onInspect={() =>
                  openBuiltInInfo({
                    id: 'reporting',
                    label: 'Client Reporting',
                    description:
                      'Auto-generate monthly client reports — SEO progress, traffic, tasks done, hours used, next-month plan. PDF + email.',
                    iconKey: 'BarChart3',
                  })
                }
              />
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Sticky footer */}
      <footer className="mt-auto border-t border-border bg-card px-4 sm:px-6 py-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {catalogQuery.data?.note ?? 'All PM tools are built in. Use the + to add custom features.'}
          </span>
          <span>VirtuaLab Digital · Project Management</span>
        </div>
      </footer>

      {/* "+" custom tool dialog */}
      <AddCustomToolDialog
        open={addCustomOpen}
        onOpenChange={setAddCustomOpen}
        defaultCategory="pm"
        categories={PM_CATEGORIES}
        invalidateKeys={[['pm-catalog'], ['custom-tools']]}
        title="Add custom PM tool"
        description="Add your own PM tool — saved to your project only."
        showCategory={false}
        fixedCategory
      />

      {/* Edit custom tool dialog (master panel) */}
      <AddCustomToolDialog
        open={!!editingTool}
        onOpenChange={(o) => !o && setEditingTool(null)}
        defaultCategory="pm"
        categories={PM_CATEGORIES}
        invalidateKeys={[['pm-catalog'], ['custom-tools']]}
        showCategory={false}
        fixedCategory
        editTool={editingTool}
      />

      {/* Built-in tool inspect/clone dialog (master panel) */}
      <BuiltInToolInfoDialog
        tool={infoTool}
        open={!!infoTool}
        onOpenChange={(o) => !o && setInfoTool(null)}
        categories={PM_CATEGORIES}
        defaultCategory="pm"
        invalidateKeys={[['pm-catalog'], ['custom-tools']]}
        fixedCategory
        categoryLabel="Project Management"
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
/* Overview tab                                                        */
/* ------------------------------------------------------------------ */

function OverviewTab({
  catalogQuery,
  onAddCustom,
}: {
  catalogQuery: ReturnType<typeof useQuery<PmCatalogResponse>>
  onAddCustom: () => void
}) {
  const stats = catalogQuery.data?.stats
  const kpis = [
    { key: 'tasks', label: 'Tasks', value: stats?.tasks, icon: CheckSquare },
    { key: 'clients', label: 'Clients', value: stats?.clients, icon: Users },
    { key: 'projects', label: 'Projects', value: stats?.projects, icon: FolderOpen },
    {
      key: 'billable',
      label: 'Billable hours',
      value: stats?.totalBillableHours,
      icon: Clock,
    },
  ]

  const tasksQuery = useQuery<{ tasks: PmTask[] }>({
    queryKey: ['pm-tasks'],
    queryFn: () => fetchJson('/api/pm/tasks'),
  })

  const todayTasks = (tasksQuery.data?.tasks ?? []).filter(
    (t) => t.status === 'todo' || t.status === 'in-progress',
  )

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => {
          const Icon = k.icon
          return (
            <Card key={k.key} className="py-4 gap-0">
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    {k.label}
                  </p>
                  <span className="size-7 rounded-lg bg-forest/10 text-forest flex items-center justify-center">
                    <Icon className="size-3.5" />
                  </span>
                </div>
                {catalogQuery.isLoading ? (
                  <Skeleton className="h-8 w-12 mt-2" />
                ) : (
                  <p className="text-3xl font-semibold text-forest tracking-tight mt-1">
                    {k.value ?? 0}
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Tasks */}
        <Card className="py-4">
          <CardHeader className="px-6 pb-0">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckSquare className="size-4 text-forest" /> Today&rsquo;s Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pt-2">
            {tasksQuery.isLoading ? (
              <div className="space-y-2 pt-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : todayTasks.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <CheckCircle2 className="size-6 mx-auto mb-2 text-moss" />
                No tasks to do today. Add one from the Tasks tab.
              </div>
            ) : (
              <ul className="divide-y divide-border max-h-96 overflow-y-auto pr-1 -mr-1">
                {todayTasks.slice(0, 12).map((t) => (
                  <li key={t.id} className="py-3 flex items-start gap-3">
                    <span
                      className={cn(
                        'mt-1 size-2.5 rounded-full shrink-0',
                        t.status === 'in-progress' ? 'bg-forest' : 'bg-sage',
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {t.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] px-1.5 py-0',
                            PRIORITY_BADGE[t.priority as TaskPriority],
                          )}
                        >
                          {PRIORITY_LABEL[t.priority as TaskPriority] ?? t.priority}
                        </Badge>
                        {t.dueDate && (
                          <span className="text-xs text-muted-foreground">
                            due {relativeDate(t.dueDate)}
                          </span>
                        )}
                        {t.assignee && (
                          <span className="text-xs text-muted-foreground">
                            · {t.assignee}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent activity / tool grid */}
        <Card className="py-4">
          <CardHeader className="px-6 pb-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="size-4 text-forest" /> PM Tools
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pt-2">
            {catalogQuery.isLoading ? (
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {(catalogQuery.data?.tools ?? []).slice(0, 10).map((tool) => (
                  <div
                    key={tool.id}
                    className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-2.5"
                  >
                    <span className="mt-0.5 size-7 rounded-md bg-forest/10 text-forest flex items-center justify-center shrink-0">
                      <DynamicIcon name={tool.icon} className="size-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {tool.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground line-clamp-2">
                        {tool.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* "+" custom tool card at the end of the Overview tab */}
      <div>
        <div className="flex items-baseline gap-2 border-b border-border pb-2 mb-4">
          <h3 className="text-lg font-semibold text-foreground">Your tools</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AddCustomToolCard
            onClick={onAddCustom}
            title="Add custom PM tool"
            subtitle="Add your own PM tool — saved to your project only."
            ariaLabel="Add custom PM tool"
          />
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Kanban tab — 4-column board with "move to column" buttons           */
/* ------------------------------------------------------------------ */

function KanbanTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const tasksQuery = useQuery<{ tasks: PmTask[] }>({
    queryKey: ['pm-tasks'],
    queryFn: () => fetchJson('/api/pm/tasks'),
  })

  const updateMut = useMutation({
    mutationFn: (vars: { id: string; status?: TaskStatus }) =>
      fetchJson('/api/pm/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars),
      }),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ['pm-tasks'] })
      const prev = queryClient.getQueryData<{ tasks: PmTask[] }>(['pm-tasks'])
      if (prev) {
        queryClient.setQueryData<{ tasks: PmTask[] }>(['pm-tasks'], {
          tasks: prev.tasks.map((t) =>
            t.id === vars.id ? { ...t, status: vars.status ?? t.status } : t,
          ),
        })
      }
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['pm-tasks'], ctx.prev)
      toast({ title: 'Could not move task', variant: 'destructive' })
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['pm-tasks'] })
    },
  })

  const [editTask, setEditTask] = React.useState<PmTask | null>(null)

  const allTasks = tasksQuery.data?.tasks ?? []

  return (
    <div className="space-y-4">
      {tasksQuery.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {KANBAN_COLUMNS.map((c) => (
            <Skeleton key={c} className="h-64" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {KANBAN_COLUMNS.map((col) => {
            const colTasks = allTasks.filter((t) => t.status === col)
            return (
              <div
                key={col}
                className="rounded-xl border border-border bg-card/60 flex flex-col min-h-48"
              >
                <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {STATUS_LABEL[col]}
                  </span>
                  <span
                    className={cn(
                      'text-[10px] font-semibold px-1.5 py-0.5 rounded-full border',
                      STATUS_COLORS[col],
                    )}
                  >
                    {colTasks.length}
                  </span>
                </div>
                <div className="p-2 space-y-2 max-h-[28rem] overflow-y-auto">
                  {colTasks.length === 0 ? (
                    <div className="text-xs text-muted-foreground py-4 text-center">
                      No tasks
                    </div>
                  ) : (
                    colTasks.map((t) => (
                      <div
                        key={t.id}
                        className="rounded-lg border border-border bg-card p-3 cursor-pointer hover:border-forest/40 transition"
                        onClick={() => setEditTask(t)}
                      >
                        <p className="text-sm font-medium text-foreground line-clamp-2">
                          {t.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] px-1.5 py-0',
                              PRIORITY_BADGE[t.priority as TaskPriority],
                            )}
                          >
                            {PRIORITY_LABEL[t.priority as TaskPriority] ?? t.priority}
                          </Badge>
                          {t.dueDate && (
                            <span className="text-[10px] text-muted-foreground">
                              {relativeDate(t.dueDate)}
                            </span>
                          )}
                          {t.assignee && (
                            <span className="text-[10px] text-muted-foreground">
                              · {t.assignee}
                            </span>
                          )}
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-border">
                          <Select
                            value={t.status}
                            onValueChange={(v) =>
                              updateMut.mutate({ id: t.id, status: v as TaskStatus })
                            }
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {KANBAN_COLUMNS.map((s) => (
                                <SelectItem key={s} value={s} className="text-xs">
                                  {STATUS_LABEL[s]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <AlertCircle className="size-3.5" /> Use the small status menu on each card to
        move it across columns. Click a card to edit it.
      </p>

      <TaskEditDialog
        task={editTask}
        open={!!editTask}
        onOpenChange={(o) => !o && setEditTask(null)}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Tasks tab — full task list with filters + add + edit + delete       */
/* ------------------------------------------------------------------ */

function TasksTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const tasksQuery = useQuery<{ tasks: PmTask[] }>({
    queryKey: ['pm-tasks'],
    queryFn: () => fetchJson('/api/pm/tasks'),
  })

  const [filterStatus, setFilterStatus] = React.useState<string>('all')
  const [filterPriority, setFilterPriority] = React.useState<string>('all')
  const [filterAssignee, setFilterAssignee] = React.useState<string>('all')
  const [addOpen, setAddOpen] = React.useState(false)
  const [editTask, setEditTask] = React.useState<PmTask | null>(null)

  const allTasks = tasksQuery.data?.tasks ?? []
  const assignees = Array.from(
    new Set(allTasks.map((t) => t.assignee).filter(Boolean) as string[]),
  ).sort()

  const filtered = allTasks.filter((t) => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false
    if (filterAssignee !== 'all' && t.assignee !== filterAssignee) return false
    return true
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/pm/tasks?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pm-tasks'] })
      void queryClient.invalidateQueries({ queryKey: ['pm-catalog'] })
      toast({ title: 'Task deleted' })
    },
    onError: () => toast({ title: 'Could not delete task', variant: 'destructive' }),
  })

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Tasks ({filtered.length})
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Filter, add, edit, and mark tasks done.
          </p>
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          className="bg-forest text-primary-foreground hover:bg-forest/90"
        >
          <Plus className="size-4" /> Add task
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {KANBAN_COLUMNS.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {(['low', 'medium', 'high', 'urgent'] as TaskPriority[]).map((p) => (
              <SelectItem key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterAssignee} onValueChange={setFilterAssignee} disabled={assignees.length === 0}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Assignee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All assignees</SelectItem>
            {assignees.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {tasksQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No tasks match. Add one to get started.
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border overflow-hidden">
          {filtered.map((t) => (
            <li
              key={t.id}
              className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-card hover:bg-muted/40 transition"
            >
              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                <CheckCircle2
                  className={cn(
                    'mt-0.5 size-4 shrink-0',
                    t.status === 'done'
                      ? 'text-moss fill-moss/30'
                      : 'text-muted-foreground/60',
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'text-sm font-medium text-foreground truncate',
                      t.status === 'done' && 'line-through text-muted-foreground',
                    )}
                  >
                    {t.title}
                  </p>
                  {t.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {t.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] px-1.5 py-0',
                        STATUS_COLORS[t.status as TaskStatus],
                      )}
                    >
                      {STATUS_LABEL[t.status as TaskStatus] ?? t.status}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] px-1.5 py-0',
                        PRIORITY_BADGE[t.priority as TaskPriority],
                      )}
                    >
                      {PRIORITY_LABEL[t.priority as TaskPriority] ?? t.priority}
                    </Badge>
                    {t.dueDate && (
                      <span className="text-[10px] text-muted-foreground">
                        due {formatDate(t.dueDate)}
                      </span>
                    )}
                    {t.assignee && (
                      <span className="text-[10px] text-muted-foreground">
                        · {t.assignee}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => setEditTask(t)}
                  aria-label="Edit task"
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-destructive hover:text-destructive"
                  onClick={() => deleteMut.mutate(t.id)}
                  aria-label="Delete task"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <TaskEditDialog
        task={editTask}
        open={!!editTask}
        onOpenChange={(o) => !o && setEditTask(null)}
      />
      <TaskCreateDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Task create / edit dialogs                                          */
/* ------------------------------------------------------------------ */

function TaskCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  return (
    <TaskFormDialog
      open={open}
      onOpenChange={onOpenChange}
      mode="create"
      task={null}
    />
  )
}

function TaskEditDialog({
  task,
  open,
  onOpenChange,
}: {
  task: PmTask | null
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  return (
    <TaskFormDialog
      open={open}
      onOpenChange={onOpenChange}
      mode="edit"
      task={task}
    />
  )
}

function TaskFormDialog({
  open,
  onOpenChange,
  mode,
  task,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  mode: 'create' | 'edit'
  task: PmTask | null
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [form, setForm] = React.useState({
    title: '',
    description: '',
    status: 'todo' as TaskStatus,
    priority: 'medium' as TaskPriority,
    dueDate: '',
    assignee: '',
  })

  React.useEffect(() => {
    if (open) {
      setForm({
        title: task?.title ?? '',
        description: task?.description ?? '',
        status: (task?.status as TaskStatus) ?? 'todo',
        priority: (task?.priority as TaskPriority) ?? 'medium',
        dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : '',
        assignee: task?.assignee ?? '',
      })
    }
  }, [open, task])

  const saveMut = useMutation({
    mutationFn: async () => {
      const body: any = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        status: form.status,
        priority: form.priority,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
        assignee: form.assignee.trim() || undefined,
      }
      if (mode === 'edit' && task) {
        body.id = task.id
        return fetchJson('/api/pm/tasks', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }
      return fetchJson('/api/pm/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pm-tasks'] })
      void queryClient.invalidateQueries({ queryKey: ['pm-catalog'] })
      toast({
        title: mode === 'edit' ? 'Task updated' : 'Task created',
        description: form.title.trim() || undefined,
      })
      onOpenChange(false)
    },
    onError: () =>
      toast({ title: 'Could not save task', variant: 'destructive' }),
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    saveMut.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Edit task' : 'Add task'}</DialogTitle>
          <DialogDescription>
            {mode === 'edit'
              ? 'Update the task fields below.'
              : 'Create a new task. It will appear on the Kanban board and the Tasks list.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Title *</Label>
            <Input
              id="task-title"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Send March invoice"
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-desc">Description</Label>
            <Textarea
              id="task-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional notes…"
              className="min-h-16 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="task-status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as TaskStatus })}
              >
                <SelectTrigger id="task-status" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KANBAN_COLUMNS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-priority">Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => setForm({ ...form, priority: v as TaskPriority })}
              >
                <SelectTrigger id="task-priority" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['low', 'medium', 'high', 'urgent'] as TaskPriority[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORITY_LABEL[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="task-due">Due date</Label>
              <Input
                id="task-due"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-assignee">Assignee</Label>
              <Input
                id="task-assignee"
                value={form.assignee}
                onChange={(e) => setForm({ ...form, assignee: e.target.value })}
                placeholder="e.g. You"
                className="h-9"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saveMut.isPending}
              className="bg-forest text-primary-foreground hover:bg-forest/90"
            >
              {saveMut.isPending && <Loader2 className="size-4 animate-spin mr-1" />}
              {mode === 'edit' ? 'Save changes' : 'Add task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/* Time Tracker tab                                                    */
/* ------------------------------------------------------------------ */

function TimeTrackerTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const timeQuery = useQuery<{ entries: PmTimeEntry[] }>({
    queryKey: ['pm-time'],
    queryFn: () => fetchJson('/api/pm/time'),
  })

  const projectsQuery = useQuery<{ projects: PmProject[] }>({
    queryKey: ['pm-projects'],
    queryFn: () => fetchJson('/api/pm/projects'),
  })

  // Active timer — single running entry tracked client-side.
  const [activeTimer, setActiveTimer] = React.useState<{
    description: string
    startedAt: number
    projectRecordId: string
  } | null>(null)

  // Restore from sessionStorage on mount.
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = window.sessionStorage.getItem('pm-active-timer')
    if (raw) {
      try {
        setActiveTimer(JSON.parse(raw))
      } catch {
        window.sessionStorage.removeItem('pm-active-timer')
      }
    }
  }, [])

  React.useEffect(() => {
    if (typeof window === 'undefined') return
    if (activeTimer) {
      window.sessionStorage.setItem('pm-active-timer', JSON.stringify(activeTimer))
    } else {
      window.sessionStorage.removeItem('pm-active-timer')
    }
  }, [activeTimer])

  const [manual, setManual] = React.useState({
    description: '',
    durationMin: '',
    projectRecordId: '',
    billable: true,
  })

  const [elapsed, setElapsed] = React.useState(0)
  React.useEffect(() => {
    if (!activeTimer) {
      setElapsed(0)
      return
    }
    const tick = () => setElapsed(Math.floor((Date.now() - activeTimer.startedAt) / 1000))
    tick()
    const i = window.setInterval(tick, 1000)
    return () => window.clearInterval(i)
  }, [activeTimer])

  const startMut = useMutation({
    mutationFn: () =>
      fetchJson('/api/pm/time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: activeTimer!.description,
          startedAt: new Date(activeTimer!.startedAt).toISOString(),
          billable: true,
          projectRecordId: activeTimer!.projectRecordId || undefined,
        }),
      }),
  })

  const stopMut = useMutation({
    mutationFn: (id: string) =>
      fetchJson('/api/pm/time', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, endedAt: new Date().toISOString() }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pm-time'] })
      void queryClient.invalidateQueries({ queryKey: ['pm-catalog'] })
      setActiveTimer(null)
      toast({ title: 'Time entry saved' })
    },
    onError: () => toast({ title: 'Could not stop timer', variant: 'destructive' }),
  })

  function handleStart() {
    if (!manual.description.trim()) {
      toast({ title: 'Enter a description first', variant: 'destructive' })
      return
    }
    const t = {
      description: manual.description.trim(),
      startedAt: Date.now(),
      projectRecordId: manual.projectRecordId,
    }
    setActiveTimer(t)
    void startMut.mutateAsync()
  }

  const addManualMut = useMutation({
    mutationFn: () =>
      fetchJson('/api/pm/time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: manual.description.trim(),
          durationMin: Number(manual.durationMin) || 0,
          billable: manual.billable,
          projectRecordId: manual.projectRecordId || undefined,
          startedAt: new Date().toISOString(),
        }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pm-time'] })
      void queryClient.invalidateQueries({ queryKey: ['pm-catalog'] })
      toast({ title: 'Time entry added' })
      setManual({ description: '', durationMin: '', projectRecordId: '', billable: true })
    },
    onError: () =>
      toast({ title: 'Could not add time entry', variant: 'destructive' }),
  })

  const toggleBillableMut = useMutation({
    mutationFn: (vars: { id: string; billable: boolean }) =>
      fetchJson('/api/pm/time', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pm-time'] })
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/pm/time?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pm-time'] })
      void queryClient.invalidateQueries({ queryKey: ['pm-catalog'] })
      toast({ title: 'Time entry deleted' })
    },
    onError: () =>
      toast({ title: 'Could not delete time entry', variant: 'destructive' }),
  })

  const entries = timeQuery.data?.entries ?? []
  const totalBillableMin = entries
    .filter((e) => e.billable)
    .reduce((s, e) => s + (e.durationMin || 0), 0)
  const totalMin = entries.reduce((s, e) => s + (e.durationMin || 0), 0)

  function fmtElapsed(s: number): string {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec
      .toString()
      .padStart(2, '0')}`
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Timer card */}
        <Card className="lg:col-span-1 py-4">
          <CardHeader className="px-6 pb-0">
            <CardTitle className="text-base flex items-center gap-2">
              <TimerReset className="size-4 text-forest" /> Timer
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pt-2 space-y-3">
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
              <p className="text-4xl font-mono font-semibold text-forest tabular-nums">
                {activeTimer ? fmtElapsed(elapsed) : '00:00:00'}
              </p>
              <p className="text-xs text-muted-foreground mt-1.5">
                {activeTimer
                  ? `Timing: ${activeTimer.description}`
                  : 'No active timer'}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="time-desc">Description</Label>
              <Input
                id="time-desc"
                value={manual.description}
                onChange={(e) => setManual({ ...manual, description: e.target.value })}
                placeholder="What are you working on?"
                className="h-9"
                disabled={!!activeTimer}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="time-project">Project</Label>
              <Select
                value={manual.projectRecordId}
                onValueChange={(v) =>
                  setManual({ ...manual, projectRecordId: v === 'none' ? '' : v })
                }
                disabled={!!activeTimer}
              >
                <SelectTrigger id="time-project" className="h-9">
                  <SelectValue placeholder="No project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {(projectsQuery.data?.projects ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {activeTimer ? (
              <Button
                className="w-full bg-terracotta text-primary-foreground hover:bg-terracotta/90"
                onClick={() => stopMut.mutate(activeTimer.description)}
                disabled={stopMut.isPending}
              >
                {stopMut.isPending ? (
                  <Loader2 className="size-4 animate-spin mr-1" />
                ) : (
                  <Square className="size-4" />
                )}{' '}
                Stop &amp; save
              </Button>
            ) : (
              <Button
                className="w-full bg-forest text-primary-foreground hover:bg-forest/90"
                onClick={handleStart}
                disabled={startMut.isPending}
              >
                {startMut.isPending ? (
                  <Loader2 className="size-4 animate-spin mr-1" />
                ) : (
                  <Play className="size-4" />
                )}{' '}
                Start
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Manual entry + totals */}
        <Card className="lg:col-span-2 py-4">
          <CardHeader className="px-6 pb-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="size-4 text-forest" /> Manual entry
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pt-2 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="manual-desc">Description</Label>
                <Input
                  id="manual-desc"
                  value={manual.description}
                  onChange={(e) => setManual({ ...manual, description: e.target.value })}
                  placeholder="What did you do?"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="manual-dur">Duration (minutes)</Label>
                <Input
                  id="manual-dur"
                  type="number"
                  min="1"
                  value={manual.durationMin}
                  onChange={(e) => setManual({ ...manual, durationMin: e.target.value })}
                  placeholder="e.g. 60"
                  className="h-9"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="billable"
                checked={manual.billable}
                onCheckedChange={(v) => setManual({ ...manual, billable: v })}
              />
              <Label htmlFor="billable" className="text-sm">
                Billable
              </Label>
              <Button
                className="ml-auto"
                onClick={() => addManualMut.mutate()}
                disabled={
                  addManualMut.isPending ||
                  !manual.description.trim() ||
                  !manual.durationMin
                }
              >
                {addManualMut.isPending ? (
                  <Loader2 className="size-4 animate-spin mr-1" />
                ) : (
                  <Plus className="size-4" />
                )}{' '}
                Add entry
              </Button>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Total billable
                </p>
                <p className="text-2xl font-semibold text-forest mt-0.5">
                  {formatDuration(totalBillableMin)}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Total tracked
                </p>
                <p className="text-2xl font-semibold text-foreground mt-0.5">
                  {formatDuration(totalMin)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent entries */}
      <Card className="py-4">
        <CardHeader className="px-6 pb-0">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="size-4 text-forest" /> Recent entries
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 pt-2">
          {timeQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No time entries yet. Start the timer or add one manually.
            </div>
          ) : (
            <ul className="divide-y divide-border max-h-96 overflow-y-auto pr-1 -mr-1">
              {entries.slice(0, 30).map((e) => (
                <li key={e.id} className="py-2.5 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {e.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(e.startedAt)}
                      {e.endedAt ? ` → ${formatDateTime(e.endedAt)}` : ' · running'}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      e.billable
                        ? 'bg-forest/10 text-forest border-forest/30 text-[10px]'
                        : 'bg-muted text-muted-foreground border-border text-[10px]'
                    }
                  >
                    {e.billable ? 'Billable' : 'Non-billable'}
                  </Badge>
                  <span className="text-sm font-semibold text-foreground tabular-nums min-w-16 text-right">
                    {formatDuration(e.durationMin)}
                  </span>
                  <Switch
                    checked={e.billable}
                    onCheckedChange={(v) =>
                      toggleBillableMut.mutate({ id: e.id, billable: v })
                    }
                    aria-label="Toggle billable"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive hover:text-destructive"
                    onClick={() => deleteMut.mutate(e.id)}
                    aria-label="Delete entry"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Clients tab                                                         */
/* ------------------------------------------------------------------ */

function ClientsTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const clientsQuery = useQuery<{ clients: PmClient[] }>({
    queryKey: ['pm-clients'],
    queryFn: () => fetchJson('/api/pm/clients'),
  })

  const [addOpen, setAddOpen] = React.useState(false)
  const [editClient, setEditClient] = React.useState<PmClient | null>(null)

  const deleteMut = useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/pm/clients?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pm-clients'] })
      void queryClient.invalidateQueries({ queryKey: ['pm-catalog'] })
      toast({ title: 'Client deleted' })
    },
    onError: () => toast({ title: 'Could not delete client', variant: 'destructive' }),
  })

  const clients = clientsQuery.data?.clients ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Clients ({clients.length})</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            One client → many projects. Add, edit, archive.
          </p>
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          className="bg-forest text-primary-foreground hover:bg-forest/90"
        >
          <Plus className="size-4" /> Add client
        </Button>
      </div>

      {clientsQuery.isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No clients yet. Add one to start tracking projects + tasks against it.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {clients.map((c) => (
            <Card key={c.id} className="py-4 gap-0">
              <CardContent className="px-5 pt-0 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {c.name}
                    </p>
                    {c.company && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Building2 className="size-3" /> {c.company}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      c.status === 'active'
                        ? 'bg-moss/15 text-moss border-moss/30 text-[10px]'
                        : 'bg-muted text-muted-foreground border-border text-[10px]'
                    }
                  >
                    {c.status}
                  </Badge>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {c.email && (
                    <a
                      href={`mailto:${c.email}`}
                      className="flex items-center gap-1.5 hover:text-forest truncate"
                    >
                      <Mail className="size-3 shrink-0" /> {c.email}
                    </a>
                  )}
                  {c.phone && (
                    <p className="flex items-center gap-1.5">
                      <Phone className="size-3 shrink-0" /> {c.phone}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                  <span>{c._count?.projects ?? 0} projects</span>
                  <span>·</span>
                  <span>{c._count?.tasks ?? 0} tasks</span>
                </div>
                <div className="flex items-center justify-end gap-1 pt-1 border-t border-border">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => setEditClient(c)}
                    aria-label="Edit client"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive hover:text-destructive"
                    onClick={() => deleteMut.mutate(c.id)}
                    aria-label="Delete client"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ClientFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        mode="create"
        client={null}
      />
      <ClientFormDialog
        open={!!editClient}
        onOpenChange={(o) => !o && setEditClient(null)}
        mode="edit"
        client={editClient}
      />
    </div>
  )
}

function ClientFormDialog({
  open,
  onOpenChange,
  mode,
  client,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  mode: 'create' | 'edit'
  client: PmClient | null
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [form, setForm] = React.useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    notes: '',
    status: 'active',
  })

  React.useEffect(() => {
    if (open) {
      setForm({
        name: client?.name ?? '',
        email: client?.email ?? '',
        phone: client?.phone ?? '',
        company: client?.company ?? '',
        notes: client?.notes ?? '',
        status: client?.status ?? 'active',
      })
    }
  }, [open, client])

  const saveMut = useMutation({
    mutationFn: async () => {
      const body: any = {
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        company: form.company.trim() || undefined,
        notes: form.notes.trim() || undefined,
        status: form.status,
      }
      if (mode === 'edit' && client) {
        body.id = client.id
        return fetchJson('/api/pm/clients', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }
      return fetchJson('/api/pm/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pm-clients'] })
      void queryClient.invalidateQueries({ queryKey: ['pm-catalog'] })
      toast({
        title: mode === 'edit' ? 'Client updated' : 'Client added',
        description: form.name.trim() || undefined,
      })
      onOpenChange(false)
    },
    onError: () =>
      toast({ title: 'Could not save client', variant: 'destructive' }),
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    saveMut.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Edit client' : 'Add client'}</DialogTitle>
          <DialogDescription>
            {mode === 'edit'
              ? 'Update the client details below.'
              : 'Add a new client to your CRM.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="client-name">Name *</Label>
            <Input
              id="client-name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Jane Doe"
              className="h-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="client-company">Company</Label>
              <Input
                id="client-company"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="e.g. Field Loaf Bakery"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="client-status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v })}
              >
                <SelectTrigger id="client-status" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="churned">Churned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="client-email">Email</Label>
              <Input
                id="client-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="jane@example.com"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="client-phone">Phone</Label>
              <Input
                id="client-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="555-123-4567"
                className="h-9"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="client-notes">Notes</Label>
            <Textarea
              id="client-notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional notes…"
              className="min-h-16 text-sm"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saveMut.isPending}
              className="bg-forest text-primary-foreground hover:bg-forest/90"
            >
              {saveMut.isPending && <Loader2 className="size-4 animate-spin mr-1" />}
              {mode === 'edit' ? 'Save changes' : 'Add client'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/* Projects tab                                                        */
/* ------------------------------------------------------------------ */

function ProjectsTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const projectsQuery = useQuery<{ projects: PmProject[] }>({
    queryKey: ['pm-projects'],
    queryFn: () => fetchJson('/api/pm/projects'),
  })

  const [addOpen, setAddOpen] = React.useState(false)
  const [editProject, setEditProject] = React.useState<PmProject | null>(null)
  const [openProject, setOpenProject] = React.useState<PmProject | null>(null)

  const deleteMut = useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/pm/projects?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pm-projects'] })
      void queryClient.invalidateQueries({ queryKey: ['pm-catalog'] })
      toast({ title: 'Project deleted' })
    },
    onError: () => toast({ title: 'Could not delete project', variant: 'destructive' }),
  })

  const projects = projectsQuery.data?.projects ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Projects ({projects.length})
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            One project belongs to one client. Click a project to see its tasks + time.
          </p>
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          className="bg-forest text-primary-foreground hover:bg-forest/90"
        >
          <Plus className="size-4" /> Add project
        </Button>
      </div>

      {projectsQuery.isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No projects yet. Add one to start tracking tasks + time against it.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {projects.map((p) => (
            <Card key={p.id} className="py-4 gap-0">
              <CardContent className="px-5 pt-0 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setOpenProject(p)}
                    className="text-left min-w-0"
                  >
                    <p className="text-sm font-semibold text-foreground truncate hover:text-forest">
                      {p.name}
                    </p>
                    {p.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {p.description}
                      </p>
                    )}
                  </button>
                  <Badge
                    variant="outline"
                    className={
                      PROJECT_STATUS_BADGE[p.status] ??
                      'bg-muted text-muted-foreground border-border text-[10px]'
                    }
                  >
                    {PROJECT_STATUS_LABEL[p.status] ?? p.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] px-1.5 py-0',
                      PRIORITY_BADGE[p.priority as TaskPriority],
                    )}
                  >
                    {PRIORITY_LABEL[p.priority as TaskPriority] ?? p.priority}
                  </Badge>
                  {p.dueDate && (
                    <span className="text-[10px] text-muted-foreground">
                      due {formatDate(p.dueDate)}
                    </span>
                  )}
                </div>
                {p.client && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="size-3" /> {p.client.name}
                  </p>
                )}
                <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                  <span>{p._count?.tasks ?? 0} tasks</span>
                  <span>·</span>
                  <span>{p._count?.timeEntries ?? 0} time entries</span>
                </div>
                <div className="flex items-center gap-1 pt-1 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => setOpenProject(p)}
                  >
                    Open <ArrowRight className="size-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 ml-auto"
                    onClick={() => setEditProject(p)}
                    aria-label="Edit project"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive hover:text-destructive"
                    onClick={() => deleteMut.mutate(p.id)}
                    aria-label="Delete project"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ProjectFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        mode="create"
        project={null}
      />
      <ProjectFormDialog
        open={!!editProject}
        onOpenChange={(o) => !o && setEditProject(null)}
        mode="edit"
        project={editProject}
      />
      <ProjectDetailDialog
        project={openProject}
        open={!!openProject}
        onOpenChange={(o) => !o && setOpenProject(null)}
      />
    </div>
  )
}

function ProjectFormDialog({
  open,
  onOpenChange,
  mode,
  project,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  mode: 'create' | 'edit'
  project: PmProject | null
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [form, setForm] = React.useState({
    name: '',
    description: '',
    status: 'planning',
    priority: 'medium',
    dueDate: '',
    clientId: '',
  })

  React.useEffect(() => {
    if (open) {
      setForm({
        name: project?.name ?? '',
        description: project?.description ?? '',
        status: project?.status ?? 'planning',
        priority: project?.priority ?? 'medium',
        dueDate: project?.dueDate
          ? new Date(project.dueDate).toISOString().slice(0, 10)
          : '',
        clientId: project?.client?.id ?? '',
      })
    }
  }, [open, project])

  const clientsQuery = useQuery<{ clients: PmClient[] }>({
    queryKey: ['pm-clients'],
    queryFn: () => fetchJson('/api/pm/clients'),
  })

  const saveMut = useMutation({
    mutationFn: async () => {
      const body: any = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        status: form.status,
        priority: form.priority,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
        clientId: form.clientId || undefined,
      }
      if (mode === 'edit' && project) {
        body.id = project.id
        return fetchJson('/api/pm/projects', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }
      return fetchJson('/api/pm/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pm-projects'] })
      void queryClient.invalidateQueries({ queryKey: ['pm-catalog'] })
      toast({
        title: mode === 'edit' ? 'Project updated' : 'Project added',
        description: form.name.trim() || undefined,
      })
      onOpenChange(false)
    },
    onError: () =>
      toast({ title: 'Could not save project', variant: 'destructive' }),
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    saveMut.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Edit project' : 'Add project'}</DialogTitle>
          <DialogDescription>
            {mode === 'edit'
              ? 'Update the project details below.'
              : 'Create a new project. Optionally link to a client.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="proj-name">Name *</Label>
            <Input
              id="proj-name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. March SEO retainer"
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="proj-desc">Description</Label>
            <Textarea
              id="proj-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional notes…"
              className="min-h-16 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="proj-status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v })}
              >
                <SelectTrigger id="proj-status" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="review">In Review</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on-hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proj-priority">Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => setForm({ ...form, priority: v })}
              >
                <SelectTrigger id="proj-priority" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['low', 'medium', 'high', 'urgent'] as TaskPriority[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORITY_LABEL[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="proj-due">Due date</Label>
              <Input
                id="proj-due"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proj-client">Client</Label>
              <Select
                value={form.clientId}
                onValueChange={(v) =>
                  setForm({ ...form, clientId: v === 'none' ? '' : v })
                }
              >
                <SelectTrigger id="proj-client" className="h-9">
                  <SelectValue placeholder="No client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No client</SelectItem>
                  {(clientsQuery.data?.clients ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saveMut.isPending}
              className="bg-forest text-primary-foreground hover:bg-forest/90"
            >
              {saveMut.isPending && <Loader2 className="size-4 animate-spin mr-1" />}
              {mode === 'edit' ? 'Save changes' : 'Add project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ProjectDetailDialog({
  project,
  open,
  onOpenChange,
}: {
  project: PmProject | null
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const tasksQuery = useQuery<{ tasks: PmTask[] }>({
    queryKey: ['pm-tasks'],
    queryFn: () => fetchJson('/api/pm/tasks'),
    enabled: open && !!project,
  })
  const timeQuery = useQuery<{ entries: PmTimeEntry[] }>({
    queryKey: ['pm-time', { projectRecordId: project?.id }],
    queryFn: () =>
      fetchJson(`/api/pm/time?projectRecordId=${encodeURIComponent(project!.id)}`),
    enabled: open && !!project,
  })

  if (!project) return null

  const tasks = (tasksQuery.data?.tasks ?? []).filter(
    (t) => t.projectRecordId === project.id,
  )
  const entries = timeQuery.data?.entries ?? []
  const totalMin = entries.reduce((s, e) => s + (e.durationMin || 0), 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="size-4 text-forest" /> {project.name}
          </DialogTitle>
          <DialogDescription>
            {project.description || 'No description.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] px-1.5 py-0',
                PROJECT_STATUS_BADGE[project.status] ??
                  'bg-muted text-muted-foreground border-border',
              )}
            >
              {PROJECT_STATUS_LABEL[project.status] ?? project.status}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] px-1.5 py-0',
                PRIORITY_BADGE[project.priority as TaskPriority],
              )}
            >
              {PRIORITY_LABEL[project.priority as TaskPriority] ?? project.priority}
            </Badge>
            {project.dueDate && (
              <span className="text-xs text-muted-foreground">
                due {formatDate(project.dueDate)}
              </span>
            )}
          </div>

          <Separator />

          <div>
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
              Tasks ({tasks.length})
            </p>
            {tasksQuery.isLoading ? (
              <Skeleton className="h-12" />
            ) : tasks.length === 0 ? (
              <p className="text-xs text-muted-foreground">No tasks linked.</p>
            ) : (
              <ul className="space-y-1 max-h-40 overflow-y-auto pr-1 -mr-1">
                {tasks.map((t) => (
                  <li
                    key={t.id}
                    className="text-xs flex items-center gap-2 py-1 border-b border-border last:border-0"
                  >
                    <CircleDot
                      className={cn(
                        'size-3 shrink-0',
                        t.status === 'done'
                          ? 'text-moss'
                          : t.status === 'in-progress'
                            ? 'text-forest'
                            : t.status === 'review'
                              ? 'text-terracotta'
                              : 'text-muted-foreground',
                      )}
                    />
                    <span
                      className={cn(
                        'flex-1 truncate',
                        t.status === 'done' && 'line-through text-muted-foreground',
                      )}
                    >
                      {t.title}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Separator />

          <div>
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
              Time entries ({entries.length} · {formatDuration(totalMin)})
            </p>
            {timeQuery.isLoading ? (
              <Skeleton className="h-12" />
            ) : entries.length === 0 ? (
              <p className="text-xs text-muted-foreground">No time tracked yet.</p>
            ) : (
              <ul className="space-y-1 max-h-40 overflow-y-auto pr-1 -mr-1">
                {entries.slice(0, 8).map((e) => (
                  <li
                    key={e.id}
                    className="text-xs flex items-center gap-2 py-1 border-b border-border last:border-0"
                  >
                    <Clock className="size-3 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate">{e.description}</span>
                    <span className="tabular-nums">{formatDuration(e.durationMin)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
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

/* ------------------------------------------------------------------ */
/* Coming-soon tab placeholder                                         */
/* ------------------------------------------------------------------ */

function ComingSoonTab({
  icon,
  title,
  description,
  onInspect,
}: {
  icon: string
  title: string
  description: string
  onInspect?: () => void
}) {
  return (
    <Card className="py-10">
      <CardContent className="pt-0 text-center max-w-xl mx-auto">
        <span className="inline-flex items-center justify-center size-14 rounded-2xl bg-forest/10 text-forest mb-4">
          <DynamicIcon name={icon} className="size-7" />
        </span>
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground mt-2">{description}</p>
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-terracotta/30 bg-terracotta/10 text-terracotta px-3 py-1 text-xs font-medium uppercase tracking-wider">
          <AlertCircle className="size-3.5" /> Coming soon
        </div>
        {onInspect && (
          <div className="mt-5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onInspect}
              className="text-forest border-forest/40 hover:bg-forest/10"
            >
              <Pencil className="size-3.5" /> Inspect / clone as custom
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Custom PM tab — rendered for each user-added custom PM tool         */
/* Shows the tool label/description + a "Run" button that opens the    */
/* shared CustomToolRunDialog (AI prompt runner or placeholder).       */
/* ------------------------------------------------------------------ */

function CustomPmTab({
  tool,
  onOpen,
  onEdit,
  onDelete,
}: {
  tool: CustomTool
  onOpen: () => void
  onEdit?: () => void
  onDelete?: () => void
}) {
  const isAi = tool.endpoint === 'ai-chat' && Boolean(tool.prompt)
  return (
    <Card className="py-10">
      <CardContent className="pt-0 text-center max-w-xl mx-auto">
        <span className="inline-flex items-center justify-center size-14 rounded-2xl bg-sage/20 text-forest mb-4">
          <DynamicIcon name={tool.iconKey} className="size-7" />
        </span>
        <div className="flex items-center justify-center gap-2 mb-2">
          <h2 className="text-xl font-semibold text-foreground">{tool.label}</h2>
          <Badge variant="outline" className="text-clay border-clay/40 bg-clay/5">
            CUSTOM
          </Badge>
          {isAi && (
            <Badge variant="outline" className="text-forest border-sage/50 bg-sage/10">
              <Sparkles className="size-3" /> AI
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {tool.description || 'Custom PM tool added by you.'}
        </p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <Button
            type="button"
            onClick={onOpen}
            className="bg-forest text-primary-foreground hover:bg-forest/90"
          >
            <ArrowRight className="size-4" /> {isAi ? 'Run tool' : 'Open tool'}
          </Button>
          {onEdit && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="text-forest border-forest/40 hover:bg-forest/10"
            >
              <Pencil className="size-3.5" /> Edit
            </Button>
          )}
          {onDelete && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDelete}
              className="text-destructive border-destructive/40 hover:bg-destructive/10"
            >
              <Trash2 className="size-3.5" /> Delete
            </Button>
          )}
        </div>
        {!isAi && (
          <p className="text-[11px] text-muted-foreground mt-3">
            This custom tool has no AI prompt — clicking opens a placeholder.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
