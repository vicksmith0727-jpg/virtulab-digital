'use client'

// Project Management view — main view with tabbed sub-sections.
//
// The heavy per-tab implementations live in `./pm/*`:
//   - overview-tab.tsx     : KPI cards + today's tasks + tool grid + "+" card
//   - kanban-tab.tsx       : 4-column kanban board
//   - tasks-tab.tsx        : tasks list with filters + TaskCreate/EditDialog
//   - time-tab.tsx         : time tracker (timer + manual entry + recent)
//   - clients-tab.tsx      : clients grid + ClientFormDialog
//   - projects-tab.tsx    : projects grid + ProjectFormDialog + ProjectDetailDialog
//   - coming-soon-tab.tsx : ComingSoonTab + CustomPmTab placeholders
//   - types.ts             : shared types + constants + formatters

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Plus,
  FolderKanban,
  CheckSquare,
  Clock,
  Users,
  FolderOpen,
  FileText,
  Receipt,
  Calendar,
  Repeat,
  BarChart3,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { fetchJson } from '@/lib/client-utils'
import {
  AddCustomToolDialog,
  CustomToolRunDialog,
  BuiltInToolInfoDialog,
  useDeleteCustomTool,
  PM_CATEGORIES,
  type CustomTool,
  type BuiltInToolLike,
} from '@/components/shared/add-custom-tool-dialog'

import { type PmCatalogResponse } from './pm/types'
import { OverviewTab } from './pm/overview-tab'
import { KanbanTab } from './pm/kanban-tab'
import { TasksTab } from './pm/tasks-tab'
import { TimeTrackerTab } from './pm/time-tab'
import { ClientsTab } from './pm/clients-tab'
import { ProjectsTab } from './pm/projects-tab'
import { ComingSoonTab, CustomPmTab } from './pm/coming-soon-tab'

export function PmView() {
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
