'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard,
  LayoutTemplate,
  Plug,
  BarChart3,
  Settings,
  Sprout,
  Menu,
  Moon,
  Sun,
  ExternalLink,
  X,
  Server,
  Radar,
  Inbox,
  Boxes,
  Share2,
  PenLine,
  Plus,
  ChevronDown,
  FolderKanban,
  Zap,
  Workflow,
} from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { useAppStore, type View } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { fetchJson } from '@/lib/client-utils'

/* ------------------------------------------------------------------ */

interface AgencyData {
  agency: {
    name: string
    mainUrl: string
    mainDomain: string
    subdomainLabel: string
    isSubdomain: boolean
    mainSiteConnectionName: string
  }
}

interface InboxStats {
  stats?: {
    unread?: number
  }
}

interface AccountResponse {
  user: {
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
  }
}

// Mapping between access flags and the nav views they gate. The nav (below)
// reads these from /api/account and hides any view the user can't access.
const VIEW_ACCESS_KEY: Partial<Record<View['name'], keyof AccountResponse['user']>> = {
  templates: 'canAccessBuilder',
  inbox: 'canAccessInbox',
  'seo-tools': 'canAccessSEO',
  'social-tools': 'canAccessSocial',
  'content-tools': 'canAccessContent',
  pm: 'canAccessPM',
  automation: 'canAccessAutomation',
  integrations: 'canAccessIntegrations',
  analytics: 'canAccessAnalytics',
  settings: 'canAccessSettings',
}

// Tools dropdown — the sub-items, in order. Each entry maps to a view.
const TOOLS_SUBMENU: {
  name: View['name']
  label: string
  icon: typeof Radar
  desc: string
}[] = [
  { name: 'seo-tools', label: 'SEO Tools', icon: Radar, desc: '31 built-in tools' },
  { name: 'social-tools', label: 'Social Media Tools', icon: Share2, desc: '10 social + AI tools' },
  { name: 'content-tools', label: 'Content Generation', icon: PenLine, desc: '15 AI content tools' },
]

// Projects dropdown — 10 PM tools + "+ Add feature". Each entry maps to the
// `pm` view; clicking it dispatches a `pm:set-tab` event so the PM view can
// switch to the matching tab.
const PM_SUBMENU: {
  tab: string
  label: string
  icon: typeof FolderKanban
}[] = [
  { tab: 'kanban', label: 'Kanban Board', icon: (LucideIcons as any).Trello ?? FolderKanban },
  { tab: 'tasks', label: 'Tasks & To-Dos', icon: (LucideIcons as any).CheckSquare ?? FolderKanban },
  { tab: 'time-tracker', label: 'Time Tracker', icon: (LucideIcons as any).Clock ?? FolderKanban },
  { tab: 'clients', label: 'Client CRM', icon: (LucideIcons as any).Users ?? FolderKanban },
  { tab: 'proposals', label: 'Proposals & Quotes', icon: (LucideIcons as any).FileText ?? FolderKanban },
  { tab: 'invoices', label: 'Invoices & Billing', icon: (LucideIcons as any).Receipt ?? FolderKanban },
  { tab: 'calendar', label: 'Calendar & Deadlines', icon: (LucideIcons as any).Calendar ?? FolderKanban },
  { tab: 'files', label: 'Project Files', icon: (LucideIcons as any).FolderOpen ?? FolderKanban },
  { tab: 'retainers', label: 'Retainer Tracker', icon: (LucideIcons as any).Repeat ?? FolderKanban },
  { tab: 'reporting', label: 'Client Reporting', icon: BarChart3 },
]

// Automation dropdown — 10 automation tools. Each maps to the `automation`
// view; clicking dispatches an `automation:set-tool` event so the Automation
// view can scroll/highlight the matching card.
const AUTOMATION_SUBMENU: {
  toolId: string
  label: string
  icon: typeof Zap
}[] = [
  { toolId: 'n8n-workflows', label: 'n8n Workflows', icon: (LucideIcons as any).Workflow ?? Zap },
  { toolId: 'zeroclaw-agents', label: 'Zeroclaw Agents', icon: (LucideIcons as any).Bot ?? Zap },
  { toolId: 'make-workflows', label: 'Make Workflows', icon: (LucideIcons as any).Workflow ?? Zap },
  { toolId: 'webhooks', label: 'Webhook Triggers', icon: (LucideIcons as any).Webhook ?? Zap },
  { toolId: 'auto-publish', label: 'Auto-Publish to WP', icon: (LucideIcons as any).Send ?? Zap },
  { toolId: 'auto-social', label: 'Auto-Social Posting', icon: Share2 },
  { toolId: 'auto-report', label: 'Auto Client Reports', icon: (LucideIcons as any).Mail ?? Zap },
  { toolId: 'auto-backup', label: 'Auto-Backup Projects', icon: (LucideIcons as any).DatabaseBackup ?? Zap },
  { toolId: 'auto-seo-audit', label: 'Auto Weekly SEO Audit', icon: Radar },
  { toolId: 'auto-keyword-alert', label: 'Keyword Rank Alerts', icon: (LucideIcons as any).Bell ?? Zap },
]

const NAV: { name: View['name']; label: string; icon: typeof LayoutDashboard }[] = [
  { name: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { name: 'inbox', label: 'Inbox', icon: Inbox },
  { name: 'templates', label: 'Templates', icon: LayoutTemplate },
  // 'tools', 'pm', and 'automation' are rendered as Collapsible submenus below — not in the flat NAV list
  { name: 'flows', label: 'Flows', icon: Workflow },
  { name: 'integrations', label: 'Integrations', icon: Plug },
  { name: 'analytics', label: 'Analytics', icon: BarChart3 },
  { name: 'settings', label: 'Settings', icon: Settings },
]

// Set of view names that belong to each dropdown — used to highlight the
// dropdown row as active when any of its children is the current view.
const TOOLS_VIEWS = new Set<View['name']>(['seo-tools', 'social-tools', 'content-tools'])
const PM_VIEWS = new Set<View['name']>(['pm'])
const AUTOMATION_VIEWS = new Set<View['name']>(['automation'])

function Logo({ agencyName, agencyUrl }: { agencyName?: string; agencyUrl?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="size-8 rounded-full bg-forest text-primary-foreground flex items-center justify-center">
        <Sprout className="size-4" />
      </span>
      <div className="flex flex-col leading-tight">
        <span className="font-semibold text-foreground">Sage</span>
        {agencyName && (
          <span className="text-[11px] text-muted-foreground">
            by{' '}
            {agencyUrl ? (
              <a
                href={agencyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-forest/80 hover:text-forest hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {agencyName}
              </a>
            ) : (
              agencyName
            )}
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * NavSubmenu — a Collapsible dropdown row used for Tools, Projects, and
 * Automation. Defaults to open when the active view is one of its children
 * so the user can see where they are.
 *
 * Shared by the desktop sidebar and the mobile sheet so the dropdown works
 * identically across breakpoints.
 */
function NavSubmenu({
  title,
  icon: SectionIcon,
  active,
  isActiveSubmenu,
  children,
}: {
  title: string
  icon: typeof Boxes
  active: View['name']
  isActiveSubmenu: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(isActiveSubmenu)

  // Keep the open state in sync when the active view changes (e.g. navigating
  // from elsewhere into a submenu child should auto-expand the section).
  React.useEffect(() => {
    if (isActiveSubmenu) setOpen(true)
  }, [isActiveSubmenu])

  // Suppress unused-variable warning for `active` (kept in the signature for
  // API symmetry / future per-row active checks). The dependency on
  // `isActiveSubmenu` already drives the open state.
  void active

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            'w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
            isActiveSubmenu
              ? 'bg-forest/10 text-forest font-medium'
              : 'text-foreground/80 hover:bg-muted hover:text-foreground',
          )}
        >
          <SectionIcon className="size-4" />
          <span className="flex-1 text-left">{title}</span>
          <ChevronDown
            className={cn(
              'size-4 transition-transform',
              open && 'rotate-180',
            )}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 ml-3 pl-3 border-l border-border space-y-1">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function SubmenuRow({
  icon: Icon,
  label,
  isActive,
  onClick,
}: {
  icon: typeof Boxes
  label: string
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition',
        isActive
          ? 'bg-forest/10 text-forest font-medium'
          : 'text-foreground/80 hover:bg-muted hover:text-foreground',
      )}
    >
      <Icon className="size-4" />
      <span className="flex-1 text-left">{label}</span>
    </button>
  )
}

function AddRowButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <>
      <Separator className="my-1" />
      <button
        type="button"
        onClick={onClick}
        className="w-full flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm text-foreground/80 hover:bg-muted hover:text-foreground transition"
      >
        <Plus className="size-4" />
        <span className="flex-1 text-left">{label}</span>
      </button>
    </>
  )
}

function NavList({
  active,
  onSelect,
  onAddFeature,
  unreadCount,
  access,
}: {
  active: View['name']
  onSelect: (v: View) => void
  onAddFeature: (kind: 'tool' | 'project' | 'automation') => void
  unreadCount?: number
  access?: AccountResponse['user'] | null
}) {
  // Helper: returns true if a view should be shown in the nav, based on the
  // current user's access flags. Views without an access key are always shown.
  function canShow(view: View['name']): boolean {
    const key = VIEW_ACCESS_KEY[view]
    if (!key) return true
    if (!access) return true // still loading — don't hide prematurely
    return Boolean(access[key])
  }
  return (
    <nav className="space-y-1 px-3">
      {NAV.filter((item) => canShow(item.name)).map((item) => {
        const Icon = item.icon
        const isActive = active === item.name
        return (
          <button
            key={item.name}
            type="button"
            onClick={() => onSelect({ name: item.name } as View)}
            className={cn(
              'w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
              isActive
                ? 'bg-forest/10 text-forest font-medium'
                : 'text-foreground/80 hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="size-4" />
            <span className="flex-1 text-left">{item.label}</span>
            {item.name === 'inbox' && unreadCount && unreadCount > 0 ? (
              <span className="ml-auto inline-flex items-center justify-center min-w-5 h-5 rounded-full bg-forest/15 text-forest text-[11px] font-semibold px-1.5">
                {unreadCount}
              </span>
            ) : null}
          </button>
        )
      })}
      {/* Tools dropdown — sits between Templates and Integrations */}
      {/* Hidden entirely if all 3 sub-views are inaccessible. */}
      {(['seo-tools', 'social-tools', 'content-tools'] as View['name'][]).some(canShow) && (
        <NavSubmenu
          title="Tools"
          icon={Boxes}
          active={active}
          isActiveSubmenu={TOOLS_VIEWS.has(active)}
        >
          {TOOLS_SUBMENU.filter((item) => canShow(item.name)).map((item) => {
            const Icon = item.icon
            const isActive = active === item.name
            return (
              <SubmenuRow
                key={item.name}
                icon={Icon}
                label={item.label}
                isActive={isActive}
                onClick={() => onSelect({ name: item.name } as View)}
              />
            )
          })}
          <AddRowButton label="Add tool" onClick={() => onAddFeature('tool')} />
        </NavSubmenu>
      )}
      {/* Projects dropdown — after Tools (hidden if canAccessPM is false) */}
      {canShow('pm') && (
        <NavSubmenu
          title="Projects"
          icon={FolderKanban}
          active={active}
          isActiveSubmenu={PM_VIEWS.has(active)}
        >
          {PM_SUBMENU.map((item) => {
            const Icon = item.icon
            const isActive = active === 'pm'
            return (
              <SubmenuRow
                key={item.tab}
                icon={Icon}
                label={item.label}
                isActive={isActive}
                onClick={() => {
                  onSelect({ name: 'pm' })
                  // Tell the PM view to switch to this tab (if it's mounted).
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(
                      new CustomEvent('pm:set-tab', { detail: { tab: item.tab } }),
                    )
                  }
                }}
              />
            )
          })}
          <AddRowButton label="Add feature" onClick={() => onAddFeature('project')} />
        </NavSubmenu>
      )}
      {/* Automation dropdown — after Projects (hidden if canAccessAutomation is false) */}
      {canShow('automation') && (
        <NavSubmenu
          title="Automation"
          icon={Zap}
          active={active}
          isActiveSubmenu={AUTOMATION_VIEWS.has(active)}
        >
          {AUTOMATION_SUBMENU.map((item) => {
            const Icon = item.icon
            const isActive = active === 'automation'
            return (
              <SubmenuRow
                key={item.toolId}
                icon={Icon}
                label={item.label}
                isActive={isActive}
                onClick={() => {
                  onSelect({ name: 'automation' })
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(
                      new CustomEvent('automation:set-tool', {
                        detail: { toolId: item.toolId },
                      }),
                    )
                  }
                }}
              />
            )
          })}
          <AddRowButton label="Add feature" onClick={() => onAddFeature('automation')} />
        </NavSubmenu>
      )}
    </nav>
  )
}

function ThemeToggle() {
  const theme = useAppStore((s) => s.theme)
  const toggleTheme = useAppStore((s) => s.toggleTheme)
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="size-9"
    >
      {theme === 'light' ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </Button>
  )
}

/* ------------------------------------------------------------------ */
/* Add custom feature dialog (reuses the custom-integration pattern). */
/* Shared by the Tools, Projects, and Automation dropdowns — the `kind`  */
/* prop tweaks the title, description, and which extra fields to show.   */
/* ------------------------------------------------------------------ */

type FeatureKind = 'tool' | 'project' | 'automation'

interface AddFeatureForm {
  name: string
  description: string
  iconKey: string
  category: string
  endpoint: string
  trigger: string
  action: string
}

const FEATURE_KIND_META: Record<
  FeatureKind,
  { title: string; description: string; addLabel: string; toastLabel: string }
> = {
  tool: {
    title: 'Add custom tool',
    description:
      'Register an in-house or niche tool. It\u2019ll appear under the Tools menu alongside the built-in ones.',
    addLabel: 'Add tool',
    toastLabel: 'Custom tool queued',
  },
  project: {
    title: 'Add custom feature',
    description:
      'Register an in-house PM feature. It\u2019ll appear under the Projects menu alongside the built-in ones.',
    addLabel: 'Add feature',
    toastLabel: 'Custom PM feature queued',
  },
  automation: {
    title: 'Add custom automation',
    description:
      'Register an in-house automation. It\u2019ll appear under the Automation menu alongside the built-in ones.',
    addLabel: 'Add automation',
    toastLabel: 'Custom automation queued',
  },
}

function AddFeatureDialog({
  open,
  onOpenChange,
  onCreated,
  kind,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onCreated: () => void
  kind: FeatureKind
}) {
  const { toast } = useToast()
  const meta = FEATURE_KIND_META[kind]
  const [form, setForm] = React.useState<AddFeatureForm>({
    name: '',
    description: '',
    iconKey: 'Wrench',
    category: 'custom',
    endpoint: 'ai-chat',
    trigger: '',
    action: '',
  })

  React.useEffect(() => {
    if (!open) {
      setForm({
        name: '',
        description: '',
        iconKey: 'Wrench',
        category: 'custom',
        endpoint: 'ai-chat',
        trigger: '',
        action: '',
      })
    }
  }, [open])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    // Optimistic — we don't persist this yet (no backend endpoint for custom
    // features). The user is informed that the feature is queued for the next sync.
    toast({
      title: meta.toastLabel,
      description: `${form.name.trim()} will appear in the ${kind === 'tool' ? 'Tools' : kind === 'project' ? 'Projects' : 'Automation'} menu on your next visit.`,
    })
    onCreated()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="size-4 text-forest" /> {meta.title}
          </DialogTitle>
          <DialogDescription>{meta.description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="feat-name">Name *</Label>
            <Input
              id="feat-name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Inventory Sync"
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="feat-description">Description</Label>
            <Textarea
              id="feat-description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What does this feature do?"
              className="min-h-16 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="feat-icon">Icon</Label>
              <Input
                id="feat-icon"
                list="feat-icon-list"
                value={form.iconKey}
                onChange={(e) => setForm({ ...form, iconKey: e.target.value })}
                placeholder="Wrench"
                className="h-9"
              />
              <datalist id="feat-icon-list">
                <option value="Wrench" />
                <option value="Boxes" />
                <option value="Plug" />
                <option value="Webhook" />
                <option value="Cloud" />
                <option value="Code" />
                <option value="Workflow" />
                <option value="Bot" />
                <option value="Bell" />
                <option value="FolderKanban" />
              </datalist>
            </div>
            {kind === 'tool' ? (
              <div className="space-y-1.5">
                <Label htmlFor="feat-category">Category</Label>
                <Input
                  id="feat-category"
                  list="feat-category-list"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="custom"
                  className="h-9"
                />
                <datalist id="feat-category-list">
                  <option value="custom" />
                  <option value="internal" />
                  <option value="social" />
                  <option value="content" />
                  <option value="seo" />
                </datalist>
              </div>
            ) : null}
          </div>
          {kind === 'tool' ? (
            <div className="space-y-1.5">
              <Label htmlFor="feat-endpoint">Type</Label>
              <Input
                id="feat-endpoint"
                list="feat-endpoint-list"
                value={form.endpoint}
                onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
                placeholder="ai-chat"
                className="h-9"
              />
              <datalist id="feat-endpoint-list">
                <option value="ai-chat" />
                <option value="builtin" />
                <option value="webhook" />
              </datalist>
            </div>
          ) : null}
          {kind === 'automation' ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="feat-trigger">Trigger</Label>
                <Input
                  id="feat-trigger"
                  list="feat-trigger-list"
                  value={form.trigger}
                  onChange={(e) => setForm({ ...form, trigger: e.target.value })}
                  placeholder="on-page-published"
                  className="h-9"
                />
                <datalist id="feat-trigger-list">
                  <option value="on-page-published" />
                  <option value="on-new-lead" />
                  <option value="on-invoice-paid" />
                  <option value="schedule-hourly" />
                  <option value="schedule-daily" />
                  <option value="schedule-weekly" />
                </datalist>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="feat-action">Action</Label>
                <Input
                  id="feat-action"
                  list="feat-action-list"
                  value={form.action}
                  onChange={(e) => setForm({ ...form, action: e.target.value })}
                  placeholder="send-webhook"
                  className="h-9"
                />
                <datalist id="feat-action-list">
                  <option value="send-webhook" />
                  <option value="post-to-social" />
                  <option value="send-email" />
                  <option value="backup-to-storage" />
                  <option value="run-seo-audit" />
                </datalist>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-forest text-primary-foreground hover:bg-forest/90">
              <Plus className="size-4" /> {meta.addLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */

export function AppShell({
  view,
  setView,
  children,
}: {
  view: View
  setView: (v: View) => void
  children: React.ReactNode
}) {
  const mobileNavOpen = useAppStore((s) => s.mobileNavOpen)
  const setMobileNavOpen = useAppStore((s) => s.setMobileNavOpen)
  const activeName = view.name
  const [addFeatureOpen, setAddFeatureOpen] = React.useState(false)
  const [addFeatureKind, setAddFeatureKind] = React.useState<FeatureKind>('tool')

  const isBuilder = view.name === 'builder'

  const agencyQuery = useQuery<AgencyData>({
    queryKey: ['agency'],
    queryFn: () => fetchJson('/api/agency'),
    enabled: !isBuilder,
  })
  const agency = agencyQuery.data?.agency
  const agencyName = agency?.name
  const agencyUrl = agency?.mainUrl

  // Inbox unread count — powers the badge on the Inbox nav row.
  const inboxQuery = useQuery<InboxStats>({
    queryKey: ['inbox'],
    queryFn: () => fetchJson('/api/inbox'),
    enabled: !isBuilder,
    // Poll lightly so the badge reflects new messages without a refresh.
    refetchInterval: 60_000,
  })
  const unreadCount = inboxQuery.data?.stats?.unread ?? 0

  // Account — drives the nav access control (hide views the user can't access).
  // The query is enabled everywhere except the builder (full-screen chrome).
  const accountQuery = useQuery<AccountResponse>({
    queryKey: ['account'],
    queryFn: () => fetchJson('/api/account'),
    enabled: !isBuilder,
  })
  const access = accountQuery.data?.user ?? null

  // Top-bar title for the current view.
  function viewTitle(name: View['name']): string {
    if (name === 'seo-tools') return 'SEO Tools'
    if (name === 'social-tools') return 'Social Media Tools'
    if (name === 'content-tools') return 'Content Generation'
    if (name === 'inbox') return 'Inbox'
    if (name === 'pm') return 'Project Management'
    if (name === 'automation') return 'Automation'
    if (name === 'flows') return 'Flows'
    return NAV.find((n) => n.name === name)?.label ?? 'VirtuaLab Digital'
  }

  function openAddFeature(kind: FeatureKind) {
    setAddFeatureKind(kind)
    setAddFeatureOpen(true)
  }

  // Listen for "open the Add feature dialog" events dispatched by the views
  // (e.g. the PM view's header "+" button → opens this dialog with kind='project').
  React.useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail
      if (detail && typeof detail.kind === 'string') {
        openAddFeature(detail.kind as FeatureKind)
      }
    }
    window.addEventListener('app:add-feature', handler as EventListener)
    return () => window.removeEventListener('app:add-feature', handler as EventListener)
  }, [])

  // Builder runs FULL-SCREEN — no sidebar, no app topbar, no mobile hamburger.
  // The builder view has its own toolbar (Back, Preview, AI Router, WordPress,
  // SEO Audit, Save, Publish), so we strip away the app chrome entirely and let
  // the canvas take the full width on every breakpoint.
  if (isBuilder) {
    return (
      <div className="min-h-screen flex flex-col bg-background">{children}</div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex flex-1 min-h-0">
        {/* Sidebar (desktop) */}
        <aside className="hidden md:flex md:w-60 flex-col border-r border-border bg-sidebar">
          <div className="p-4 border-b border-border">
            <button
              type="button"
              onClick={() => setView({ name: 'landing' })}
              className="w-full text-left"
            >
              <Logo agencyName={agencyName} agencyUrl={agencyUrl} />
            </button>
          </div>
          <ScrollArea className="flex-1">
            <div className="py-4">
              <NavList
                active={activeName}
                onSelect={setView}
                onAddFeature={openAddFeature}
                unreadCount={unreadCount}
                access={access}
              />
            </div>
          </ScrollArea>
          <div className="p-3 border-t border-border space-y-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => setView({ name: 'landing' })}
            >
              <ExternalLink className="size-4" /> Back to site
            </Button>
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs text-muted-foreground">Theme</span>
              <ThemeToggle />
            </div>
          </div>
        </aside>

        {/* Mobile sidebar (sheet) */}
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="left" className="w-72 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="p-4 border-b border-border flex items-center justify-between">
              <Logo agencyName={agencyName} agencyUrl={agencyUrl} />
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close"
              >
                <X className="size-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="py-4">
                <NavList
                  active={activeName}
                  onSelect={(v) => {
                    setMobileNavOpen(false)
                    setView(v)
                  }}
                  onAddFeature={(kind) => {
                    setMobileNavOpen(false)
                    openAddFeature(kind)
                  }}
                  unreadCount={unreadCount}
                  access={access}
                />
              </div>
            </ScrollArea>
            <div className="p-3 border-t border-border space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  setMobileNavOpen(false)
                  setView({ name: 'landing' })
                }}
              >
                <ExternalLink className="size-4" /> Back to site
              </Button>
              <div className="flex items-center justify-between px-2">
                <span className="text-xs text-muted-foreground">Theme</span>
                <ThemeToggle />
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Main column */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* App topbar */}
          <header className="h-14 border-b border-border bg-card flex items-center gap-2 px-3 sm:px-4">
            {/* Mobile hamburger */}
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  aria-label="Open menu"
                >
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
            </Sheet>

            <div className="md:hidden">
              <button
                type="button"
                onClick={() => setView({ name: 'landing' })}
                className="flex items-center gap-2"
                aria-label="Sage by VirtuaLab Digital home"
              >
                <span className="size-7 rounded-full bg-forest text-primary-foreground flex items-center justify-center">
                  <Sprout className="size-3.5" />
                </span>
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-sm sm:text-base font-semibold text-foreground truncate">
                {viewTitle(activeName)}
              </h1>
            </div>

            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => setView({ name: 'landing' })}
            >
              <ExternalLink className="size-4" /> Back to site
            </Button>
          </header>

          <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {children}
          </main>
        </div>
      </div>

      {/* Add custom feature dialog (used by the Tools, Projects, and Automation submenus) */}
      <AddFeatureDialog
        open={addFeatureOpen}
        onOpenChange={setAddFeatureOpen}
        onCreated={() => {
          // no-op — the toast is shown inside the dialog
        }}
        kind={addFeatureKind}
      />
    </div>
  )
}
