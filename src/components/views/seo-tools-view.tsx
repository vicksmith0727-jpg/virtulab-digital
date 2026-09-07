'use client'

// SEO Tools view — the main view that hosts the audit runner, the tool grid,
// and dispatches each tool to its dedicated dialog.
//
// The heavy sub-components live in `./seo/*`:
//   - audit-result.tsx       : AuditResultView + sub-cards (meta / headings / images / links / schema / local)
//   - seo-tool-card.tsx      : SeoToolCard rendered in the tool grid
//   - active-tool-dialog.tsx : ActiveToolDialog router + NeedsApiDialog
//   - ai-tool-dialog.tsx     : AiGenericDialog (input: 'text' tools → /api/ai/chat)
//   - check-dialog.tsx       : CheckDialog (input: 'url' tools → /api/seo/check) + per-tool result renderers
//   - keyword-research-dialog.tsx : KeywordResearchDialog → /api/seo/keyword-research
//   - meta-sitemap-dialogs.tsx : MetaPreviewDialog + SitemapDialog
//   - types.ts               : shared types + helpers (SeoAuditResult, SeoToolDef, copyToClipboard, etc.)

import * as React from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Search,
  Radar,
  ClipboardCheck,
  Loader2,
  Sparkles,
  Leaf,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { fetchJson } from '@/lib/client-utils'
import {
  AddCustomToolDialog,
  AddCustomToolCard,
  CustomToolRunDialog,
  CustomToolCard,
  BuiltInToolInfoDialog,
  useDeleteCustomTool,
  SEO_CATEGORIES,
  type CustomTool,
  type BuiltInToolLike,
} from '@/components/shared/add-custom-tool-dialog'

import {
  type SeoAuditResult,
  type SeoToolDef,
  type ToolsResponse,
  type ProjectLite,
  type ToastFn,
} from './seo/types'
import { AuditResultView } from './seo/audit-result'
import { SeoToolCard } from './seo/seo-tool-card'
import { ActiveToolDialog } from './seo/active-tool-dialog'
import { KeywordResearchDialog } from './seo/keyword-research-dialog'
import { MetaPreviewDialog, SitemapDialog } from './seo/meta-sitemap-dialogs'

export function SeoToolsView() {
  const { toast } = useToast()
  const auditRef = React.useRef<HTMLDivElement>(null)

  /* Fetch the built-in tools list */
  const toolsQuery = useQuery<ToolsResponse>({
    queryKey: ['seo-tools'],
    queryFn: () => fetchJson('/api/seo/tools'),
  })

  /* Fetch all custom tools (any category) — merged into the SEO view by
     category. The "+" button POSTs to /api/tools/custom, then invalidates
     ['seo-tools'] + ['custom-tools'] so this refetch runs. */
  const customToolsQuery = useQuery<{ tools: CustomTool[] }>({
    queryKey: ['custom-tools'],
    queryFn: () => fetchJson('/api/tools/custom'),
  })
  const customTools = customToolsQuery.data?.tools ?? []
  // Only render custom tools whose category is one of the SEO categories
  // (audit / performance / content / technical / preview / research / strategy / ai).
  const seoCategoryIds = new Set(SEO_CATEGORIES.map((c) => c.value))
  const seoCustomTools = customTools.filter((t) => seoCategoryIds.has(t.category))

  /* Fetch projects for the picker */
  const projectsQuery = useQuery<{ projects: ProjectLite[] }>({
    queryKey: ['projects'],
    queryFn: () => fetchJson('/api/projects'),
  })
  const projects = projectsQuery.data?.projects ?? []

  /* Audit state */
  const [urlInput, setUrlInput] = React.useState('')
  const [projectId, setProjectId] = React.useState<string>('')
  const [audit, setAudit] = React.useState<SeoAuditResult | null>(null)
  const [auditError, setAuditError] = React.useState<string | null>(null)

  const auditMut = useMutation({
    mutationFn: (payload: { url?: string; projectId?: string }) =>
      fetchJson('/api/seo/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: (data: { ok: boolean; result: SeoAuditResult }) => {
      setAudit(data.result)
      setAuditError(null)
      toast({
        title: `Audit complete — ${data.result.overallScore}/100 (grade ${data.result.grade})`,
        description: `Checked ${data.result.checks.length} items in ${Math.round(data.result.totalTimeMs / 100) / 10}s.`,
      })
    },
    onError: (err: Error) => {
      setAuditError(err.message || 'Audit failed')
      toast({ title: 'Audit failed', description: err.message, variant: 'destructive' })
    },
  })

  function runUrlAudit() {
    const url = urlInput.trim()
    if (!url) {
      toast({ title: 'Enter a URL', description: 'e.g. https://example.com', variant: 'destructive' })
      return
    }
    setAudit(null)
    setAuditError(null)
    auditMut.mutate({ url })
  }

  function runProjectAudit() {
    if (!projectId) {
      toast({ title: 'Pick a project', variant: 'destructive' })
      return
    }
    setAudit(null)
    setAuditError(null)
    auditMut.mutate({ projectId })
  }

  function scrollToAudit() {
    auditRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  /* ---- Tool dialog state ---- */
  const [metaOpen, setMetaOpen] = React.useState(false)
  const [sitemapOpen, setSitemapOpen] = React.useState(false)
  const [keywordResearchOpen, setKeywordResearchOpen] = React.useState(false)
  const [activeTool, setActiveTool] = React.useState<SeoToolDef | null>(null)
  const [searchQuery, setSearchQuery] = React.useState('')

  /* ---- "+" custom tool dialog state ---- */
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
      invalidateKeys: [['seo-tools'], ['custom-tools']],
    })
  }

  function openBuiltInInfo(tool: SeoToolDef) {
    setInfoTool({
      id: tool.id,
      label: tool.label,
      description: tool.description,
      icon: tool.icon,
      iconKey: tool.iconKey || tool.icon,
      category: tool.category,
      endpoint: tool.endpoint ?? undefined,
      input: tool.input,
      prompt: tool.prompt,
    })
  }

  // Merge built-in tools with custom tools (mapped to the SeoToolDef shape).
  // Custom tools are marked `custom: true` so handleOpenTool can route them
  // to the custom tool runner dialog instead of the built-in dialog router.
  const builtinTools: SeoToolDef[] = toolsQuery.data?.tools ?? []
  const customAsSeoTools: SeoToolDef[] = seoCustomTools.map((c) => ({
    id: c.id,
    label: c.label,
    icon: c.iconKey || 'Wrench',
    category: c.category,
    description: c.description || 'Custom tool added by you.',
    endpoint: c.endpoint,
    method: 'POST',
    input: c.input,
    builtin: false,
    ai: c.ai,
    custom: true,
    prompt: c.prompt,
    iconKey: c.iconKey,
  }))
  const allTools = [...builtinTools, ...customAsSeoTools]
  const allCategories = toolsQuery.data?.categories ?? []
  const totalToolCount = allTools.length

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const filteredTools = normalizedQuery
    ? allTools.filter(
        (t) =>
          t.label.toLowerCase().includes(normalizedQuery) ||
          t.description.toLowerCase().includes(normalizedQuery) ||
          t.id.toLowerCase().includes(normalizedQuery),
      )
    : allTools

  // Group filtered tools by category, preserving the categories array order.
  // Custom tools are appended to the end of each category group.
  const grouped = allCategories
    .map((cat) => ({
      ...cat,
      tools: filteredTools.filter((t) => t.category === cat.id),
    }))
    .filter((g) => g.tools.length > 0)

  function handleOpenTool(tool: SeoToolDef) {
    // Custom tools route to the shared CustomToolRunDialog (AI prompt runner
    // or "configure in settings" placeholder).
    if (tool.custom) {
      const customTool: CustomTool = {
        id: tool.id,
        label: tool.label,
        description: tool.description,
        iconKey: tool.iconKey || tool.icon,
        category: tool.category,
        endpoint: tool.endpoint || 'builtin',
        input: tool.input,
        prompt: tool.prompt,
        builtin: false,
        ai: tool.ai,
        custom: true,
      }
      setActiveCustomTool(customTool)
      return
    }
    // The full audit is the existing audit runner at the top — scroll to it.
    if (tool.id === 'audit' || tool.input === 'url-or-project') {
      scrollToAudit()
      return
    }
    // Meta Tag Preview has its own rich dialog (different endpoint + shape)
    if (tool.id === 'meta-check') {
      setMetaOpen(true)
      return
    }
    // Enriched keyword research — dedicated dialog with structured output.
    if (tool.id === 'keyword-research') {
      setKeywordResearchOpen(true)
      return
    }
    // Sitemap generator uses the project picker
    if (tool.id === 'sitemap-gen' || tool.input === 'project') {
      setSitemapOpen(true)
      return
    }
    // Everything else (url/text/none) goes through the active-tool dialog router.
    setActiveTool(tool)
  }

  const toastFn: ToastFn = toast

  return (
    <div className="organic-bg min-h-full flex flex-col">
      {/* Hero ------------------------------------------------------------- */}
      <section className="relative px-4 sm:px-6 pt-12 pb-12 sm:pt-16 sm:pb-14 border-b border-border bg-forest text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 organic-grain opacity-25 pointer-events-none" />
        <div className="max-w-6xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="max-w-3xl"
          >
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cream/30 bg-cream/10 text-cream px-3 py-1 text-xs font-medium uppercase tracking-wider">
                <Sparkles className="size-3.5" />
                Built in
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sage/40 bg-sage/15 text-sage px-3 py-1 text-xs font-medium uppercase tracking-wider">
                <Leaf className="size-3.5" />
                No endpoint to connect
              </span>
            </div>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-balance leading-[1.05]">
              SEO Tools — built in, no setup
            </h1>
            <p className="mt-4 text-lg sm:text-xl text-cream/85 max-w-2xl text-balance">
              Run real audits, generate sitemaps, preview meta tags, and get AI keyword + content
              briefs. Everything runs inside VirtuaLab Digital — no external service to connect.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Body ------------------------------------------------------------- */}
      <section className="flex-1 px-4 sm:px-6 py-10 sm:py-12">
        <div className="max-w-6xl mx-auto space-y-10">
          {/* Audit runner ---------------------------------------------- */}
          <div ref={auditRef} className="scroll-mt-20">
            <Card className="border-forest/30 bg-forest/5 overflow-hidden">
              <CardContent className="pt-6 space-y-5">
                <div className="flex items-start gap-3">
                  <div className="size-11 rounded-xl bg-forest/15 text-forest flex items-center justify-center shrink-0">
                    <Radar className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-semibold text-foreground flex items-center gap-2 flex-wrap">
                      Run a Full SEO Audit
                      <Badge variant="outline" className="text-forest border-forest/40">
                        17 checks
                      </Badge>
                    </h2>
                    <p className="mt-1 text-sm text-foreground/70 max-w-2xl">
                      Fetches the page, checks meta tags, schema, broken links, page speed, mobile,
                      local SEO, images, headings — all in one pass.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {/* URL input column */}
                  <div className="space-y-2 rounded-xl border border-border bg-card p-4">
                    <Label htmlFor="seo-url" className="text-xs text-muted-foreground uppercase tracking-wider">
                      Audit by URL
                    </Label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        id="seo-url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !auditMut.isPending) runUrlAudit()
                        }}
                        placeholder="https://example.com"
                        className="flex-1"
                      />
                      <Button
                        className="bg-forest text-primary-foreground hover:bg-forest/90 shrink-0"
                        disabled={auditMut.isPending}
                        onClick={runUrlAudit}
                      >
                        {auditMut.isPending ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Search className="size-4" />
                        )}
                        Run Full Audit
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Any public URL. Audits run server-side and take ~10 seconds.
                    </p>
                  </div>

                  {/* Project picker column */}
                  <div className="space-y-2 rounded-xl border border-border bg-card p-4">
                    <Label htmlFor="seo-project" className="text-xs text-muted-foreground uppercase tracking-wider">
                      Audit a project
                    </Label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Select value={projectId} onValueChange={setProjectId}>
                        <SelectTrigger id="seo-project" className="flex-1">
                          <SelectValue placeholder="Pick a project…" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.length === 0 ? (
                            <SelectItem value="_none" disabled>
                              No projects yet
                            </SelectItem>
                          ) : (
                            projects.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        className="border-forest/40 text-forest hover:bg-forest/10 shrink-0"
                        disabled={auditMut.isPending || !projectId}
                        onClick={runProjectAudit}
                      >
                        {auditMut.isPending ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <ClipboardCheck className="size-4" />
                        )}
                        Audit project
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Uses the project&rsquo;s published URL (agency main domain for sub-domain installs).
                    </p>
                  </div>
                </div>

                {/* Loading state */}
                {auditMut.isPending && (
                  <div className="rounded-xl border border-forest/30 bg-forest/5 p-6 space-y-3">
                    <div className="flex items-center gap-3 text-sm text-foreground/80">
                      <Loader2 className="size-4 animate-spin text-forest" />
                      <span>Auditing — fetches the page, checks 17 things, ~10s…</span>
                    </div>
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                )}

                {/* Error state */}
                {auditError && !auditMut.isPending && (
                  <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                    Audit failed: {auditError}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Audit results ---------------------------------------------- */}
          {audit && !auditMut.isPending && <AuditResultView result={audit} />}

          {/* Tool grid -------------------------------------------------- */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="size-5 text-forest" />
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                    All SEO tools
                    <span className="ml-2 text-base font-normal text-muted-foreground tabular-nums">
                      ({totalToolCount})
                    </span>
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                  {toolsQuery.data?.note ??
                    'All SEO tools run directly inside VirtuaLab Digital — no external endpoint to connect.'}
                </p>
              </div>

              {/* Search filter */}
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tools by name or description…"
                  className="pl-9"
                  aria-label="Search SEO tools"
                />
              </div>
            </div>

            {toolsQuery.isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-44 rounded-2xl" />
                ))}
              </div>
            ) : grouped.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                No tools match &ldquo;{searchQuery}&rdquo;. Try a different search.
              </div>
            ) : (
              <div className="space-y-10">
                {grouped.map((group) => (
                  <div key={group.id} className="space-y-4">
                    <div className="flex items-baseline gap-2 border-b border-border pb-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        {group.label}
                      </h3>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        ({group.tools.length})
                      </span>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {group.tools.map((tool) =>
                        tool.custom ? (
                          <CustomToolCard
                            key={tool.id}
                            tool={{
                              id: tool.id,
                              label: tool.label,
                              description: tool.description,
                              iconKey: tool.iconKey || tool.icon,
                              category: tool.category,
                              endpoint: tool.endpoint || 'builtin',
                              input: tool.input,
                              prompt: tool.prompt,
                              builtin: false,
                              ai: tool.ai,
                              custom: true,
                            }}
                            onOpen={() => handleOpenTool(tool)}
                            onEdit={() => {
                              setEditingTool({
                                id: tool.id,
                                label: tool.label,
                                description: tool.description,
                                iconKey: tool.iconKey || tool.icon,
                                category: tool.category,
                                endpoint: tool.endpoint || 'builtin',
                                input: tool.input,
                                prompt: tool.prompt,
                                builtin: false,
                                ai: tool.ai,
                                custom: true,
                              })
                            }}
                            onDelete={() =>
                              handleDeleteCustom({
                                id: tool.id,
                                label: tool.label,
                                description: tool.description,
                                iconKey: tool.iconKey || tool.icon,
                                category: tool.category,
                                endpoint: tool.endpoint || 'builtin',
                                input: tool.input,
                                prompt: tool.prompt,
                                builtin: false,
                                ai: tool.ai,
                                custom: true,
                              })
                            }
                          />
                        ) : (
                          <SeoToolCard
                            key={tool.id}
                            tool={tool}
                            onOpen={() => handleOpenTool(tool)}
                            onEdit={() => openBuiltInInfo(tool)}
                          />
                        ),
                      )}
                    </div>
                  </div>
                ))}

                {/* "+" custom tool card — at the END of the grid */}
                <div className="space-y-4">
                  <div className="flex items-baseline gap-2 border-b border-border pb-2">
                    <h3 className="text-lg font-semibold text-foreground">Your tools</h3>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      ({seoCustomTools.length})
                    </span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    <AddCustomToolCard
                      onClick={() => setAddCustomOpen(true)}
                      title="Add custom SEO tool"
                      subtitle="Add your own SEO tool to any category."
                      ariaLabel="Add custom SEO tool"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Sticky footer */}
      <footer className="mt-auto border-t border-border bg-bark text-cream/90">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-cream/60">
          <span>VirtuaLab Digital — SEO engine, built in.</span>
          <span className="flex items-center gap-1.5">
            <Leaf className="size-3.5" /> No external endpoint to connect.
          </span>
        </div>
      </footer>

      {/* Tool dialogs ----------------------------------------------------- */}
      <MetaPreviewDialog open={metaOpen} onOpenChange={setMetaOpen} toast={toastFn} />
      <KeywordResearchDialog open={keywordResearchOpen} onOpenChange={setKeywordResearchOpen} toast={toastFn} />
      <SitemapDialog
        open={sitemapOpen}
        onOpenChange={setSitemapOpen}
        projects={projects}
        toast={toastFn}
      />
      {activeTool && (
        <ActiveToolDialog
          tool={activeTool}
          open
          onOpenChange={(o) => {
            if (!o) setActiveTool(null)
          }}
          toast={toastFn}
        />
      )}

      {/* "+" custom tool dialog */}
      <AddCustomToolDialog
        open={addCustomOpen}
        onOpenChange={setAddCustomOpen}
        defaultCategory="audit"
        categories={SEO_CATEGORIES}
        invalidateKeys={[['seo-tools'], ['custom-tools']]}
        title="Add custom SEO tool"
        description="Add your own SEO tool to any category — saved to your project only."
      />

      {/* Edit custom tool dialog (master panel) */}
      <AddCustomToolDialog
        open={!!editingTool}
        onOpenChange={(o) => !o && setEditingTool(null)}
        defaultCategory="audit"
        categories={SEO_CATEGORIES}
        invalidateKeys={[['seo-tools'], ['custom-tools']]}
        editTool={editingTool}
      />

      {/* Built-in tool inspect/clone dialog (master panel) */}
      <BuiltInToolInfoDialog
        tool={infoTool}
        open={!!infoTool}
        onOpenChange={(o) => !o && setInfoTool(null)}
        categories={SEO_CATEGORIES}
        defaultCategory="audit"
        invalidateKeys={[['seo-tools'], ['custom-tools']]}
        categoryLabel="SEO category"
      />

      {/* Custom tool runner (AI prompt or placeholder) */}
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
