'use client'

import * as React from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Search,
  Radar,
  ClipboardCheck,
  Map,
  FileText,
  Code2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Globe,
  Link2,
  Image as ImageIcon,
  Heading,
  Braces,
  MapPin,
  Phone,
  Sparkles,
  Copy,
  Download,
  ArrowRight,
  Leaf,
  ExternalLink,
  ChevronDown,
  Zap,
  Clock,
  HardDrive,
  HelpCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/lib/store'
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
  SEO_CATEGORIES,
  type CustomTool,
  type BuiltInToolLike,
} from '@/components/shared/add-custom-tool-dialog'

/* ------------------------------------------------------------------ */

/* ---- Types mirroring the backend SeoAuditResult ------------------- */

type SeoCheckStatus = 'pass' | 'warn' | 'fail' | 'info'

interface SeoCheck {
  id: string
  title: string
  status: SeoCheckStatus
  message: string
  detail?: string
  score: number
}

interface SeoAuditMeta {
  title?: string
  titleLength?: number
  description?: string
  descriptionLength?: number
  canonical?: string
  viewport?: string
  charset?: string
  robots?: string
  lang?: string
  ogTitle?: string
  ogDescription?: string
  ogImage?: string
  twitterCard?: string
  twitterTitle?: string
  twitterDescription?: string
}

interface SeoAuditResult {
  url: string
  fetchedAt: string
  httpStatus: number
  ttfbMs: number
  totalTimeMs: number
  htmlSizeKb: number
  overallScore: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  checks: SeoCheck[]
  meta: SeoAuditMeta
  headings: { h1: string[]; h2: string[]; h3: string[] }
  images: { src: string; alt: string | null; hasLazy: boolean }[]
  links: { href: string; text: string; internal: boolean; status?: number }[]
  schema: any[]
  openGraph: Record<string, string>
  localSeo: {
    hasNAP: boolean
    hasLocalBusinessSchema: boolean
    detectedPhone?: string
    detectedAddress?: string
  }
}

interface MetaCheckResult {
  ok: boolean
  url: string
  httpStatus: number
  meta: SeoAuditMeta
  headings: { h1: string[]; h2: string[]; h3: string[] }
  schema: any[]
  openGraph: Record<string, string>
}

interface SitemapResult {
  ok: boolean
  domain: string
  pageCount: number
  pages: { id: string; slug: string; name: string; updatedAt: string }[]
  sitemap: string
}

interface SeoToolDef {
  id: string
  label: string
  icon: string
  category: string
  description: string
  endpoint: string | null
  method: string
  input: string
  builtin: boolean
  ai?: boolean
  needsApiKey?: string
  needsIntegration?: string
  custom?: boolean
  prompt?: string
  iconKey?: string
}

interface SeoToolCategory {
  id: string
  label: string
}

interface ToolsResponse {
  tools: SeoToolDef[]
  categories: SeoToolCategory[]
  note: string
}

interface ProjectLite {
  id: string
  name: string
  subdomain?: string | null
  status?: string
  pages?: { id: string; name: string; slug: string; isHome: boolean }[]
}

/* ------------------------------------------------------------------ */

function copyToClipboard(text: string, label: string, toast: ReturnType<typeof useToast>['toast']) {
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    toast({ title: 'Clipboard unavailable', variant: 'destructive' })
    return
  }
  navigator.clipboard
    .writeText(text)
    .then(() => toast({ title: `${label} copied` }))
    .catch(() => toast({ title: `Could not copy ${label}`, variant: 'destructive' }))
}

function downloadTextFile(filename: string, contents: string, mime: string) {
  try {
    const blob = new Blob([contents], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch {
    /* ignore */
  }
}

/* ---- Grade + status helpers -------------------------------------- */

const GRADE_STYLES: Record<string, string> = {
  A: 'bg-forest text-primary-foreground',
  B: 'bg-sage text-foreground',
  C: 'bg-clay text-primary-foreground',
  D: 'bg-terracotta text-primary-foreground',
  F: 'bg-destructive text-destructive-foreground',
}

const GRADE_LABEL: Record<string, string> = {
  A: 'Excellent',
  B: 'Good',
  C: 'Fair',
  D: 'Needs work',
  F: 'Critical',
}

function StatusIcon({ status, className }: { status: SeoCheckStatus; className?: string }) {
  if (status === 'pass') return <CheckCircle2 className={cn('text-forest', className)} />
  if (status === 'warn') return <AlertTriangle className={cn('text-clay', className)} />
  if (status === 'fail') return <XCircle className={cn('text-destructive', className)} />
  return <Info className={cn('text-muted-foreground', className)} />
}

const STATUS_BORDER: Record<SeoCheckStatus, string> = {
  pass: 'border-l-forest/40',
  warn: 'border-l-clay/50',
  fail: 'border-l-destructive/50',
  info: 'border-l-border',
}

/* ------------------------------------------------------------------ */

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
      <MetaPreviewDialog open={metaOpen} onOpenChange={setMetaOpen} toast={toast} />
      <KeywordResearchDialog open={keywordResearchOpen} onOpenChange={setKeywordResearchOpen} toast={toast} />
      <SitemapDialog
        open={sitemapOpen}
        onOpenChange={setSitemapOpen}
        projects={projects}
        toast={toast}
      />
      {activeTool && (
        <ActiveToolDialog
          tool={activeTool}
          open
          onOpenChange={(o) => {
            if (!o) setActiveTool(null)
          }}
          toast={toast}
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

/* ------------------------------------------------------------------ */
/* Active-tool router dialog (url / text / none)                      */
/* ------------------------------------------------------------------ */

function ActiveToolDialog({
  tool,
  open,
  onOpenChange,
  toast,
}: {
  tool: SeoToolDef
  open: boolean
  onOpenChange: (o: boolean) => void
  toast: ReturnType<typeof useToast>['toast']
}) {
  if (tool.input === 'none') {
    return <NeedsApiDialog tool={tool} open={open} onOpenChange={onOpenChange} />
  }
  if (tool.input === 'text') {
    return <AiGenericDialog tool={tool} open={open} onOpenChange={onOpenChange} toast={toast} />
  }
  // Default: input === 'url' → focused check dialog
  return <CheckDialog tool={tool} open={open} onOpenChange={onOpenChange} toast={toast} />
}

/* ------------------------------------------------------------------ */
/* "Needs API" notice dialog (rank-tracker / competitor / backlinks)  */
/* ------------------------------------------------------------------ */

function NeedsApiDialog({
  tool,
  open,
  onOpenChange,
}: {
  tool: SeoToolDef
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const required = tool.needsApiKey || tool.needsIntegration || 'an external API'
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DynamicIcon name={tool.icon} className="size-4 text-terracotta" />
            {tool.label}
            <Badge variant="outline" className="text-terracotta border-terracotta/40 bg-terracotta/5">
              NEEDS API
            </Badge>
          </DialogTitle>
          <DialogDescription>{tool.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg border border-terracotta/40 bg-terracotta/5 p-4 text-sm text-foreground/90 leading-relaxed">
            <div className="flex items-start gap-2">
              <AlertTriangle className="size-4 text-terracotta shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p>
                  This tool needs <span className="font-semibold text-terracotta">{required}</span> to
                  run.
                </p>
                <p className="text-muted-foreground">
                  Connect it in <span className="font-medium">Integrations</span> first, then come
                  back here. Built-in tools above need no setup — they run directly inside
                  VirtuaLab Digital.
                </p>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/* AI prompt builders per tool                                         */
/* ------------------------------------------------------------------ */

interface AiPromptSpec {
  placeholder: string
  textarea?: boolean
  codeBlock?: boolean
  build: (input: string) => string
}

const AI_PROMPTS: Record<string, AiPromptSpec> = {
  'keyword-research': {
    placeholder: 'Describe your business / niche / topic (e.g. "plumbing in Austin TX")',
    build: (input) =>
      `Suggest 15 SEO keywords for "${input}". Group by intent (informational, commercial, local). Include the rough monthly search volume next to each if you can estimate it. Return as a clean, scannable list with the intent groups as headings.`,
  },
  'ai-visibility': {
    placeholder: 'Your business / topic (e.g. "organic bakery in Portland")',
    build: (input) =>
      `Check if "${input}" appears in AI answers (ChatGPT, Perplexity, Google AI Overviews). Suggest 5 concrete ways to increase AI visibility (AEO/GEO) — focus on schema, FAQ content, and answer-focused copy. Return as a short bulleted report.`,
  },
  'content-brief': {
    placeholder: 'Target keyword or topic (e.g. "tankless water heater cost")',
    build: (input) =>
      `Create an SEO content brief for "${input}". Include: target keyword, 3-5 secondary keywords, suggested H1, suggested H2 structure (at least 5), recommended word count, 3 internal link suggestions, a meta title (under 60 chars), and a meta description (under 160 chars). Return as a clean, scannable brief.`,
  },
  'schema-gen': {
    placeholder: 'Business type + city (e.g. "Plumber in Austin, TX")',
    codeBlock: true,
    build: (input) =>
      `Generate JSON-LD schema for "${input}". Use the LocalBusiness type (or a more specific subtype if appropriate). Fill with placeholder values I can edit (name, address, phone, openingHours, geo, url). Return ONLY the JSON-LD script block, ready to paste into HTML — no markdown fences, no explanation.`,
  },
  'meta-title-gen': {
    placeholder: 'Page topic / target keyword',
    build: (input) =>
      `Generate 5 optimized SEO meta titles for "${input}". Each under 60 chars. Include the target keyword near the front. Return as a numbered list.`,
  },
  'meta-desc-gen': {
    placeholder: 'Page topic / target keyword',
    build: (input) =>
      `Generate 5 optimized SEO meta descriptions for "${input}". Each under 160 chars. Include the target keyword and a call-to-action. Return as a numbered list.`,
  },
  'content-rewriter': {
    placeholder: 'Paste the content to rewrite…',
    textarea: true,
    build: (input) =>
      `Rewrite this content for better SEO + readability:\n\n"""\n${input}\n"""\n\nKeep the meaning, add headings if needed, keep it concise and easy to read. Return only the rewritten content.`,
  },
  'faq-generator': {
    placeholder: 'Topic for the FAQ (e.g. "water heater maintenance")',
    build: (input) =>
      `Generate 8 FAQ questions + concise answers about "${input}". Format as a markdown list with "Q:" and "A:" markers. At the end, also include a single JSON-LD FAQPage schema block with the same Q&A, ready to paste into HTML.`,
  },

  // ─── SEO Strategy tools (category: 'strategy') ───
  'hub-spoke-generator': {
    placeholder: 'Topic / pillar (e.g. "compost for home gardens")',
    build: (input) =>
      `Create a hub-and-spoke content architecture for: "${input}". Generate: 1 pillar/hub page (title, target keyword, outline) + 8-12 supporting spoke pages (title, target keyword, 1-line description). Include an internal link map showing which spokes link to the hub and to each other. Format as a table.`,
  },
  'semantic-generator': {
    placeholder: 'Target keyword (e.g. "tankless water heater")',
    build: (input) =>
      `Generate a semantic SEO cluster for the target keyword: "${input}". Include: 15-20 semantically related terms, 10 entities Google expects (people, places, concepts, brands), 5 related questions (People Also Ask style), and 3 topical subclusters. This helps Google understand the content is comprehensive.`,
  },
  'global-seo-generator': {
    placeholder: 'Brand / business + primary market (e.g. "organic skincare — already in US")',
    build: (input) =>
      `Generate an international SEO strategy for: "${input}". Include: target countries (5-10), hreflang tag map (language-region pairs), country-specific landing page structure, local keyword variations per country, currency + language considerations, and a rollout priority (which countries first). Format as a table.`,
  },
  'national-seo-generator': {
    placeholder: 'Business / niche + country (e.g. "plumbing services — United States")',
    build: (input) =>
      `Generate a national SEO strategy for: "${input}" (single country). Include: national keyword clusters (branded vs non-branded), 10 major-city landing pages (city + keyword combos), competitor gap analysis (3 competitors, their top keywords you don't rank for), and a 90-day action plan. Format as a table + list.`,
  },
}

const DEFAULT_AI_PROMPT: AiPromptSpec = {
  placeholder: 'Describe what you want to optimize or analyze…',
  build: (input) => `Suggest SEO recommendations for "${input}". Return as a clean, scannable list.`,
}

function getAiPromptSpec(toolId: string): AiPromptSpec {
  return AI_PROMPTS[toolId] ?? DEFAULT_AI_PROMPT
}

/* ------------------------------------------------------------------ */
/* Generic AI tool dialog (input: 'text' tools)                      */
/* ------------------------------------------------------------------ */

function AiGenericDialog({
  tool,
  open,
  onOpenChange,
  toast,
}: {
  tool: SeoToolDef
  open: boolean
  onOpenChange: (o: boolean) => void
  toast: ReturnType<typeof useToast>['toast']
}) {
  const spec = getAiPromptSpec(tool.id)
  const [input, setInput] = React.useState('')
  const [reply, setReply] = React.useState<string | null>(null)
  const mut = useMutation({
    mutationFn: (messages: { role: 'user' | 'assistant'; content: string }[]) =>
      fetchJson('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      }),
    onSuccess: (data: { reply: string }) => setReply(data.reply ?? 'No reply.'),
    onError: (err: Error) =>
      toast({ title: `${tool.label} failed`, description: err.message, variant: 'destructive' }),
  })

  React.useEffect(() => {
    if (!open) {
      setReply(null)
      setInput('')
    }
  }, [open])

  function run() {
    const v = input.trim()
    if (!v) {
      toast({ title: 'Enter some context first', variant: 'destructive' })
      return
    }
    const prompt = spec.build(v)
    setReply(null)
    mut.mutate([{ role: 'user', content: prompt }])
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DynamicIcon name={tool.icon} className="size-4 text-forest" />
            {tool.label}
            <Badge variant="outline" className="text-forest border-sage/50 bg-sage/10">
              <Sparkles className="size-3" /> AI
            </Badge>
          </DialogTitle>
          <DialogDescription>{tool.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={`ai-${tool.id}`} className="text-xs text-muted-foreground">
              Context
              <span className="text-destructive ml-0.5">*</span>
            </Label>
            {spec.textarea ? (
              <Textarea
                id={`ai-${tool.id}`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={spec.placeholder}
                className="min-h-32"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !mut.isPending) run()
                }}
              />
            ) : (
              <Input
                id={`ai-${tool.id}`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !mut.isPending) run()
                }}
                placeholder={spec.placeholder}
              />
            )}
            {spec.textarea && (
              <p className="text-[10px] text-muted-foreground">
                Press ⌘/Ctrl + Enter to generate.
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              className="bg-forest text-primary-foreground hover:bg-forest/90"
              disabled={mut.isPending}
              onClick={run}
            >
              {mut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Generate
            </Button>
          </div>

          {mut.isPending && !reply && (
            <div className="rounded-lg border border-forest/30 bg-forest/5 p-4 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="size-4 animate-spin text-forest" />
              The assistant is composing your {tool.label.toLowerCase()}…
            </div>
          )}

          {reply && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-forest uppercase tracking-wider">
                  Result
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => copyToClipboard(reply, tool.label, toast)}
                  >
                    <Copy className="size-3" /> Copy
                  </Button>
                  {spec.codeBlock && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => {
                        const clean = reply
                          .replace(/^\s*<script[^>]*>/i, '')
                          .replace(/<\/script>\s*$/i, '')
                          .trim()
                        downloadTextFile(
                          `${tool.id}.txt`,
                          clean,
                          spec.codeBlock ? 'application/ld+json' : 'text/plain',
                        )
                      }}
                    >
                      <Download className="size-3" /> Download
                    </Button>
                  )}
                </div>
              </div>
              {spec.codeBlock ? (
                <pre
                  className="rounded-md bg-bark/95 text-cream p-4 text-xs font-mono max-h-96 overflow-y-auto leading-relaxed"
                  style={{ scrollbarColor: 'var(--color-forest) transparent' }}
                >
                  <code>{reply}</code>
                </pre>
              ) : (
                <div
                  className="rounded-lg border border-forest/30 bg-forest/5 p-4 text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto"
                  style={{ scrollbarColor: 'var(--color-forest) transparent' }}
                >
                  {reply}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/* Focused check dialog (input: 'url' tools → POST /api/seo/check)    */
/* ------------------------------------------------------------------ */

interface CheckResultEnvelope {
  ok: boolean
  tool: string
  url: string
  result: any
}

function CheckDialog({
  tool,
  open,
  onOpenChange,
  toast,
}: {
  tool: SeoToolDef
  open: boolean
  onOpenChange: (o: boolean) => void
  toast: ReturnType<typeof useToast>['toast']
}) {
  const [url, setUrl] = React.useState('https://')
  const mut = useMutation({
    mutationFn: (payload: { tool: string; url: string }) =>
      fetchJson('/api/seo/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onError: (err: Error) =>
      toast({ title: `${tool.label} failed`, description: err.message, variant: 'destructive' }),
  })

  React.useEffect(() => {
    if (!open) {
      setUrl('https://')
      mut.reset()
    }
  }, [open, mut])

  function runCheck() {
    const u = url.trim()
    if (!u) {
      toast({ title: 'Enter a URL', variant: 'destructive' })
      return
    }
    if (!/^https?:\/\//i.test(u)) {
      toast({
        title: 'URL must start with http:// or https://',
        variant: 'destructive',
      })
      return
    }
    mut.mutate({ tool: tool.id, url: u })
  }

  const envelope = mut.data as CheckResultEnvelope | undefined
  const result = envelope?.result

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DynamicIcon name={tool.icon} className="size-4 text-forest" />
            {tool.label}
            <Badge variant="outline" className="text-forest border-forest/40">
              Built-in
            </Badge>
          </DialogTitle>
          <DialogDescription>{tool.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !mut.isPending) runCheck()
              }}
              placeholder="https://example.com"
              className="flex-1"
              aria-label="URL to check"
            />
            <Button
              className="bg-forest text-primary-foreground hover:bg-forest/90 shrink-0"
              disabled={mut.isPending}
              onClick={runCheck}
            >
              {mut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              Run check
            </Button>
          </div>

          {mut.isPending && (
            <div className="rounded-lg border border-forest/30 bg-forest/5 p-4 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="size-4 animate-spin text-forest" />
              Fetching the page + running the {tool.label.toLowerCase()}…
            </div>
          )}

          {mut.isError && !mut.isPending && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {(mut.error as Error)?.message || 'Check failed.'}
            </div>
          )}

          {result && !mut.isPending && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-forest uppercase tracking-wider">
                  Result
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => copyToClipboard(JSON.stringify(result, null, 2), 'Result', toast)}
                  >
                    <Copy className="size-3" /> Copy JSON
                  </Button>
                </div>
              </div>
              {renderCheckResult(tool.id, result)}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/* Tool-specific result views + generic fallback                      */
/* ------------------------------------------------------------------ */

function renderCheckResult(toolId: string, result: any): React.JSX.Element {
  switch (toolId) {
    case 'broken-links':
      return <BrokenLinksResult result={result} />
    case 'headings':
      return <HeadingsResult result={result} />
    case 'page-speed':
      return <PageSpeedResult result={result} />
    case 'robots-txt':
      return <RobotsTxtResult result={result} />
    case 'schema-validator':
      return <SchemaValidatorResult result={result} />
    case 'images-alt':
      return <ImagesAltResult result={result} />
    case 'internal-links':
      return <InternalLinksResult result={result} />
    case 'redirects':
      return <RedirectsResult result={result} />
    case 'mobile-friendly':
      return <MobileFriendlyResult result={result} />
    case 'keyword-density':
      return <KeywordDensityResult result={result} />
    case 'readability':
      return <ReadabilityResult result={result} />
    case 'sitemap-validator':
      return <SitemapValidatorResult result={result} />
    case 'hreflang':
      return <HreflangResult result={result} />
    case 'title-optimizer':
      return <TitleOptimizerResult result={result} />
    case 'meta-desc':
      return <MetaDescResult result={result} />
    case 'canonical':
      return <CanonicalResult result={result} />
    case 'duplicate-content':
      return <DuplicateContentResult result={result} />
    default:
      return <GenericResultView data={result} />
  }
}

/* ---- shared small components for results ---- */

function ResultOkBanner({ ok, okLabel = 'All good', badLabel = 'Issues found' }: { ok: boolean; okLabel?: string; badLabel?: string }) {
  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2 text-sm flex items-center gap-2',
        ok
          ? 'border-forest/40 bg-forest/5 text-forest'
          : 'border-terracotta/40 bg-terracotta/5 text-terracotta',
      )}
    >
      {ok ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
      <span className="font-medium">{ok ? okLabel : badLabel}</span>
    </div>
  )
}

function IssuesList({ issues }: { issues: string[] }) {
  if (!issues || issues.length === 0) return null
  return (
    <ul className="space-y-1">
      {issues.map((issue, i) => (
        <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
          <AlertTriangle className="size-3 text-clay shrink-0 mt-0.5" />
          <span className="break-words">{issue}</span>
        </li>
      ))}
    </ul>
  )
}

function JsonBlock({ data }: { data: any }) {
  return (
    <pre
      className="rounded-md bg-bark/95 text-cream p-3 text-xs font-mono overflow-x-auto leading-relaxed max-h-80 overflow-y-auto"
      style={{ scrollbarColor: 'var(--color-forest) transparent' }}
    >
      <code>{JSON.stringify(data, null, 2)}</code>
    </pre>
  )
}

/* ---- specific result views ---- */

function BrokenLinksResult({ result }: { result: any }) {
  const broken: { href: string; text?: string; status?: number }[] = result?.broken ?? []
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <MetricBox label="Checked" value={String(result?.totalChecked ?? 0)} tone="muted" />
        <MetricBox label="Broken" value={String(result?.brokenCount ?? 0)} tone={result?.brokenCount ? 'terracotta' : 'forest'} />
        <MetricBox label="Status" value={result?.ok ? 'OK' : 'Issues'} tone={result?.ok ? 'forest' : 'terracotta'} />
      </div>
      {broken.length === 0 ? (
        <ResultOkBanner ok={true} okLabel={`All ${result?.totalChecked ?? 0} checked links OK.`} />
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1" style={{ scrollbarColor: 'var(--color-forest) transparent' }}>
          {broken.map((l, i) => (
            <div key={i} className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-destructive border-destructive/40 shrink-0">
                  {l.status === 0 ? 'no response' : `status ${l.status}`}
                </Badge>
                <a href={l.href} target="_blank" rel="noopener noreferrer" className="text-foreground hover:underline truncate break-all">
                  {l.href}
                </a>
              </div>
              {l.text && <p className="mt-1 text-xs text-muted-foreground">Link text: &ldquo;{l.text}&rdquo;</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function HeadingsResult({ result }: { result: any }) {
  const headings: { level: number; text: string }[] = result?.headings ?? []
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <MetricBox label="H1" value={String(result?.h1Count ?? 0)} tone={result?.h1Count === 1 ? 'forest' : 'terracotta'} />
        <MetricBox label="H2" value={String(result?.h2Count ?? 0)} tone={result?.h2Count > 0 ? 'forest' : 'clay'} />
        <MetricBox label="H3" value={String(result?.h3Count ?? 0)} tone="moss" />
      </div>
      {result?.issues && result.issues.length > 0 && (
        <div className="rounded-lg border border-clay/40 bg-clay/5 p-3 space-y-1.5">
          <div className="text-xs uppercase tracking-wider text-clay font-medium">Issues</div>
          <IssuesList issues={result.issues} />
        </div>
      )}
      {result?.ok && <ResultOkBanner ok={true} okLabel="Heading structure looks good." />}
      <div className="space-y-1.5">
        <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Headings</h4>
        {headings.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No headings detected.</p>
        ) : (
          <ul className="space-y-1 max-h-60 overflow-y-auto pr-1" style={{ scrollbarColor: 'var(--color-forest) transparent' }}>
            {headings.map((h, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Badge
                  variant="outline"
                  className={cn(
                    'shrink-0 mt-0.5 text-[10px] px-1.5',
                    h.level === 1 ? 'text-forest border-forest/40' : h.level === 2 ? 'text-clay border-clay/40' : 'text-muted-foreground',
                  )}
                >
                  H{h.level}
                </Badge>
                <span className="text-foreground/90 break-words">{h.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

const PAGE_SPEED_GRADE: Record<string, string> = {
  good: 'bg-forest text-primary-foreground',
  'needs-improvement': 'bg-clay text-primary-foreground',
  poor: 'bg-terracotta text-primary-foreground',
}

function PageSpeedResult({ result }: { result: any }) {
  const grade = result?.grade ?? 'poor'
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <MetricBox label="TTFB" value={`${result?.ttfbMs ?? 0}ms`} tone={(result?.ttbMs ?? 0) < 800 ? 'forest' : 'terracotta'} />
        <MetricBox label="Total time" value={`${Math.round((result?.totalTimeMs ?? 0) / 100) / 10}s`} />
        <MetricBox label="HTML size" value={`${result?.htmlSizeKb ?? 0} KB`} />
        <MetricBox label="Images" value={String(result?.imageCount ?? 0)} />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">Grade</span>
        <Badge className={cn('border-transparent', PAGE_SPEED_GRADE[grade])}>
          {grade.replace('-', ' ')}
        </Badge>
      </div>
      <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground leading-relaxed">
        Core Web Vitals basics: TTFB under 800ms is good, under 2000ms needs work. Image count
        impacts LCP — consider lazy-loading.
      </div>
    </div>
  )
}

function RobotsTxtResult({ result }: { result: any }) {
  if (result?.found === false) {
    return (
      <div className="rounded-lg border border-terracotta/40 bg-terracotta/5 p-3 text-sm text-terracotta flex items-center gap-2">
        <XCircle className="size-4 shrink-0" />
        <span>{result?.message || 'No robots.txt found.'}</span>
      </div>
    )
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <MiniBadge ok={!!result?.hasUserAgent} label="User-agent" />
        <MiniBadge ok={!!result?.hasDisallow} label="Disallow rules" />
        <MiniBadge ok={!!result?.hasSitemap} label="Sitemap reference" />
      </div>
      <div className="rounded-lg border border-bark/30 bg-bark/95 overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-cream/10 bg-bark">
          <span className="text-xs text-cream/70 font-mono">robots.txt · HTTP {result?.status}</span>
        </div>
        <pre className="max-h-72 overflow-y-auto p-3 text-xs font-mono text-cream/95 leading-relaxed" style={{ scrollbarColor: 'var(--color-forest) transparent' }}>
          <code>{result?.content || '(empty file)'}</code>
        </pre>
      </div>
    </div>
  )
}

function MiniBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        ok ? 'text-forest border-forest/40 bg-forest/5' : 'text-terracotta border-terracotta/40 bg-terracotta/5',
      )}
    >
      {ok ? <CheckCircle2 className="size-3 mr-1" /> : <XCircle className="size-3 mr-1" />}
      {label}
    </Badge>
  )
}

function SchemaValidatorResult({ result }: { result: any }) {
  const schemas: any[] = result?.schemas ?? []
  const types: string[] = result?.types ?? []
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <MetricBox label="Schema blocks" value={String(result?.schemaCount ?? 0)} tone={result?.schemaCount > 0 ? 'forest' : 'clay'} />
        <MetricBox label="Types found" value={String(types.length)} />
      </div>
      {types.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {types.map((t, i) => (
            <Badge key={i} variant="outline" className="text-forest border-forest/40">
              <Braces className="size-3 mr-1" />
              {String(t)}
            </Badge>
          ))}
        </div>
      )}
      {schemas.length === 0 ? (
        <div className="rounded-lg border border-clay/40 bg-clay/5 p-3 text-sm text-clay">
          No JSON-LD blocks found. Add LocalBusiness or FAQPage schema for better rich-result eligibility.
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1" style={{ scrollbarColor: 'var(--color-forest) transparent' }}>
          {schemas.map((s, i) => (
            <JsonBlock key={i} data={s} />
          ))}
        </div>
      )}
    </div>
  )
}

function ImagesAltResult({ result }: { result: any }) {
  const missing: { src: string; alt: string | null }[] = result?.missingAlt ?? []
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <MetricBox label="Total images" value={String(result?.totalImages ?? 0)} />
        <MetricBox label="Missing alt" value={String(result?.missingAltCount ?? 0)} tone={result?.missingAltCount > 0 ? 'terracotta' : 'forest'} />
      </div>
      {missing.length === 0 ? (
        <ResultOkBanner ok={true} okLabel="All images have alt text." />
      ) : (
        <div className="space-y-1.5">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Images missing alt</h4>
          <ul className="space-y-1 max-h-60 overflow-y-auto pr-1" style={{ scrollbarColor: 'var(--color-forest) transparent' }}>
            {missing.map((img, i) => (
              <li key={i} className="text-xs text-foreground/90 rounded-md bg-muted/50 px-2 py-1.5 break-all">
                {img.src}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function InternalLinksResult({ result }: { result: any }) {
  const internal: { href: string; text: string }[] = result?.internal ?? []
  const external: { href: string; text: string }[] = result?.external ?? []
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <MetricBox label="Total" value={String(result?.totalLinks ?? 0)} />
        <MetricBox label="Internal" value={String(result?.internalCount ?? 0)} tone={result?.internalCount > 0 ? 'forest' : 'clay'} />
        <MetricBox label="External" value={String(result?.externalCount ?? 0)} />
      </div>
      {internal.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Internal links</h4>
          <ul className="space-y-1 max-h-48 overflow-y-auto pr-1" style={{ scrollbarColor: 'var(--color-forest) transparent' }}>
            {internal.map((l, i) => (
              <li key={i} className="text-xs text-foreground/90 rounded-md bg-muted/50 px-2 py-1.5 break-all">
                <span className="text-forest font-mono">{l.href}</span>
                {l.text && <span className="text-muted-foreground"> — {l.text}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {external.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground">External links (top {external.length})</h4>
          <ul className="space-y-1 max-h-48 overflow-y-auto pr-1" style={{ scrollbarColor: 'var(--color-forest) transparent' }}>
            {external.map((l, i) => (
              <li key={i} className="text-xs text-foreground/90 rounded-md bg-muted/50 px-2 py-1.5 break-all">
                <span className="text-clay font-mono">{l.href}</span>
                {l.text && <span className="text-muted-foreground"> — {l.text}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function RedirectsResult({ result }: { result: any }) {
  const redirected: { href: string; status?: number }[] = result?.redirected ?? []
  const broken: { href: string; status?: number }[] = result?.broken ?? []
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <MetricBox label="Checked" value={String(result?.totalChecked ?? 0)} />
        <MetricBox label="Redirects" value={String(result?.redirectedCount ?? 0)} tone="clay" />
        <MetricBox label="Broken" value={String(result?.brokenCount ?? 0)} tone={result?.brokenCount > 0 ? 'terracotta' : 'forest'} />
      </div>
      {redirected.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Redirected links</h4>
          <ul className="space-y-1 max-h-48 overflow-y-auto pr-1" style={{ scrollbarColor: 'var(--color-forest) transparent' }}>
            {redirected.map((l, i) => (
              <li key={i} className="text-xs text-foreground/90 rounded-md bg-muted/50 px-2 py-1.5 break-all">
                <Badge variant="outline" className="text-clay border-clay/40 mr-2">{l.status}</Badge>
                {l.href}
              </li>
            ))}
          </ul>
        </div>
      )}
      {broken.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs uppercase tracking-wider text-destructive">Broken links</h4>
          <ul className="space-y-1 max-h-48 overflow-y-auto pr-1" style={{ scrollbarColor: 'var(--color-forest) transparent' }}>
            {broken.map((l, i) => (
              <li key={i} className="text-xs text-foreground/90 rounded-md bg-destructive/5 px-2 py-1.5 break-all">
                <Badge variant="outline" className="text-destructive border-destructive/40 mr-2">{l.status === 0 ? 'no response' : l.status}</Badge>
                {l.href}
              </li>
            ))}
          </ul>
        </div>
      )}
      {result?.brokenCount === 0 && result?.redirectedCount === 0 && (
        <ResultOkBanner ok={true} okLabel="No redirect or broken-link issues." />
      )}
    </div>
  )
}

function MobileFriendlyResult({ result }: { result: any }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <MiniBadge ok={!!result?.hasViewport} label="Viewport meta" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <MetricBox label="HTML size" value={`${result?.htmlSizeKb ?? 0} KB`} tone={(result?.htmlSizeKb ?? 0) > 500 ? 'terracotta' : 'forest'} />
        <MetricBox label="Lang" value={result?.lang || '—'} />
      </div>
      {result?.viewport && (
        <div className="text-xs text-muted-foreground">
          Viewport: <code className="font-mono text-foreground/80">{result.viewport}</code>
        </div>
      )}
      {result?.issues && result.issues.length > 0 && (
        <div className="rounded-lg border border-clay/40 bg-clay/5 p-3 space-y-1.5">
          <div className="text-xs uppercase tracking-wider text-clay font-medium">Issues</div>
          <IssuesList issues={result.issues} />
        </div>
      )}
      {result?.ok && <ResultOkBanner ok={true} okLabel="Page is mobile-friendly." />}
    </div>
  )
}

function KeywordDensityResult({ result }: { result: any }) {
  const top: { word: string; count: number; density: string }[] = result?.topKeywords ?? []
  return (
    <div className="space-y-3">
      <MetricBox label="Total words analyzed" value={String(result?.totalWords ?? 0)} tone="moss" />
      <div className="space-y-1.5">
        <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Top keywords</h4>
        {top.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No keywords detected.</p>
        ) : (
          <ul className="space-y-1 max-h-60 overflow-y-auto pr-1" style={{ scrollbarColor: 'var(--color-forest) transparent' }}>
            {top.map((k, i) => (
              <li key={i} className="flex items-center justify-between gap-3 text-xs rounded-md bg-muted/50 px-2 py-1.5">
                <span className="text-foreground/90 font-mono">{k.word}</span>
                <span className="text-muted-foreground tabular-nums shrink-0">
                  {k.count} × · {k.density}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function ReadabilityResult({ result }: { result: any }) {
  const level = result?.readingLevel ?? '—'
  const levelTone: Record<string, string> = {
    Easy: 'forest',
    Medium: 'clay',
    Hard: 'terracotta',
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <MetricBox label="Words" value={String(result?.wordCount ?? 0)} />
        <MetricBox label="Sentences" value={String(result?.sentenceCount ?? 0)} />
        <MetricBox label="Avg words/sentence" value={String(result?.avgWordsPerSentence ?? 0)} />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">Reading level</span>
        <Badge className={cn('border-transparent', levelTone[level] === 'forest' ? 'bg-forest text-primary-foreground' : levelTone[level] === 'clay' ? 'bg-clay text-primary-foreground' : 'bg-terracotta text-primary-foreground')}>
          {level}
        </Badge>
      </div>
    </div>
  )
}

function SitemapValidatorResult({ result }: { result: any }) {
  if (result?.found === false) {
    return (
      <div className="rounded-lg border border-terracotta/40 bg-terracotta/5 p-3 text-sm text-terracotta flex items-center gap-2">
        <XCircle className="size-4 shrink-0" />
        <span>{result?.message || 'No sitemap.xml found.'}</span>
      </div>
    )
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <MetricBox label="HTTP status" value={String(result?.status ?? 0)} />
        <MetricBox label="Valid XML" value={result?.isValidXml ? 'Yes' : 'No'} tone={result?.isValidXml ? 'forest' : 'terracotta'} />
        <MetricBox label="URLs" value={String(result?.urlCount ?? 0)} tone={result?.urlCount > 0 ? 'forest' : 'clay'} />
      </div>
      {result?.ok ? (
        <ResultOkBanner ok={true} okLabel={`Sitemap valid with ${result?.urlCount ?? 0} URLs.`} />
      ) : (
        <ResultOkBanner ok={false} badLabel="Sitemap has issues." />
      )}
    </div>
  )
}

function HreflangResult({ result }: { result: any }) {
  const hreflangs: string[] = result?.hreflangs ?? []
  return (
    <div className="space-y-3">
      <MetricBox label="Hreflang tags" value={String(result?.count ?? 0)} tone={result?.count > 0 ? 'forest' : 'clay'} />
      {result?.message && !hreflangs.length && (
        <div className="rounded-lg border border-terracotta/40 bg-terracotta/5 p-3 text-sm text-terracotta">
          {result.message}
        </div>
      )}
      {hreflangs.length > 0 && (
        <ul className="space-y-1 max-h-48 overflow-y-auto pr-1" style={{ scrollbarColor: 'var(--color-forest) transparent' }}>
          {hreflangs.map((h, i) => (
            <li key={i} className="text-xs text-foreground/90 rounded-md bg-muted/50 px-2 py-1.5 font-mono">
              {h}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function TitleOptimizerResult({ result }: { result: any }) {
  return (
    <div className="space-y-3">
      <MetricBox label="Title length" value={`${result?.length ?? 0} chars`} tone={result?.length >= 10 && result?.length <= 60 ? 'forest' : 'terracotta'} />
      {result?.serpPreview && (
        <div className="space-y-1.5">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground">SERP preview</h4>
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="text-base text-forest leading-snug break-words">{result.serpPreview}</div>
          </div>
        </div>
      )}
      {result?.title && (
        <div className="text-xs text-muted-foreground">
          Full title: <span className="text-foreground/90">{result.title}</span>
        </div>
      )}
      <IssuesList issues={result?.issues ?? []} />
      {result?.ok && <ResultOkBanner ok={true} okLabel="Title tag looks good." />}
    </div>
  )
}

function MetaDescResult({ result }: { result: any }) {
  return (
    <div className="space-y-3">
      <MetricBox label="Description length" value={`${result?.length ?? 0} chars`} tone={result?.length >= 50 && result?.length <= 160 ? 'forest' : 'terracotta'} />
      {result?.serpPreview && (
        <div className="space-y-1.5">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground">SERP preview</h4>
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="text-sm text-muted-foreground break-words">{result.serpPreview}</div>
          </div>
        </div>
      )}
      <IssuesList issues={result?.issues ?? []} />
      {result?.ok && <ResultOkBanner ok={true} okLabel="Meta description looks good." />}
    </div>
  )
}

function CanonicalResult({ result }: { result: any }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <MiniBadge ok={!!result?.present} label="Canonical present" />
      </div>
      {result?.canonical ? (
        <div className="text-xs text-muted-foreground">
          Canonical URL: <span className="text-forest font-mono break-all">{result.canonical}</span>
        </div>
      ) : (
        <div className="rounded-lg border border-terracotta/40 bg-terracotta/5 p-3 text-sm text-terracotta">
          No canonical link found. Add <code className="font-mono">&lt;link rel=&quot;canonical&quot; href=&quot;…&quot;&gt;</code> to prevent duplicate-content issues.
        </div>
      )}
    </div>
  )
}

function DuplicateContentResult({ result }: { result: any }) {
  const dups: string[] = result?.duplicates ?? []
  return (
    <div className="space-y-3">
      {dups.length === 0 ? (
        <ResultOkBanner ok={true} okLabel="No duplicate content issues detected." />
      ) : (
        <div className="rounded-lg border border-terracotta/40 bg-terracotta/5 p-3 space-y-1.5">
          <div className="text-xs uppercase tracking-wider text-terracotta font-medium">Duplicates found</div>
          <IssuesList issues={dups} />
        </div>
      )}
      {result?.title && (
        <div className="text-xs text-muted-foreground">Title: <span className="text-foreground/90 break-words">{result.title}</span></div>
      )}
      {result?.h1 && (
        <div className="text-xs text-muted-foreground">H1: <span className="text-foreground/90 break-words">{result.h1}</span></div>
      )}
    </div>
  )
}

/* ---- generic fallback ---- */

function GenericResultView({ data }: { data: any }) {
  if (data == null) {
    return <p className="text-sm text-muted-foreground italic">No result.</p>
  }
  return <JsonBlock data={data} />
}

function MetricBox({
  label,
  value,
  tone = 'muted',
}: {
  label: string
  value: string
  tone?: 'forest' | 'sage' | 'clay' | 'terracotta' | 'moss' | 'muted'
}) {
  const toneClass: Record<string, string> = {
    forest: 'bg-forest/10 text-forest',
    sage: 'bg-sage/20 text-forest',
    clay: 'bg-clay/15 text-clay',
    terracotta: 'bg-terracotta/10 text-terracotta',
    moss: 'bg-moss/15 text-forest',
    muted: 'bg-muted/50 text-foreground',
  }
  return (
    <div className={cn('rounded-md p-3 text-center', toneClass[tone])}>
      <div className="text-lg font-semibold tabular-nums leading-tight">{value}</div>
      <div className="text-[10px] uppercase tracking-wider opacity-80">{label}</div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Audit results view                                                 */
/* ------------------------------------------------------------------ */

function AuditResultView({ result }: { result: SeoAuditResult }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Score header */}
      <Card className="border-forest/30 bg-card overflow-hidden">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div
              className={cn(
                'size-24 rounded-full flex flex-col items-center justify-center shrink-0',
                GRADE_STYLES[result.grade],
              )}
            >
              <span className="text-3xl font-bold leading-none">{result.overallScore}</span>
              <span className="text-xs opacity-80 mt-1">/ 100</span>
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className={cn(
                    'text-base font-semibold px-3 py-1',
                    GRADE_STYLES[result.grade],
                    'border-transparent',
                  )}
                >
                  Grade {result.grade} · {GRADE_LABEL[result.grade] ?? ''}
                </Badge>
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-forest hover:underline truncate max-w-full"
                >
                  {result.url} <ExternalLink className="size-3.5 shrink-0" />
                </a>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <Metric icon={Globe} label="HTTP status" value={`${result.httpStatus}`} />
                <Metric icon={Zap} label="TTFB" value={`${result.ttfbMs}ms`} />
                <Metric icon={Clock} label="Total time" value={`${Math.round(result.totalTimeMs / 100) / 10}s`} />
                <Metric icon={HardDrive} label="HTML size" value={`${result.htmlSizeKb} KB`} />
              </div>
              <p className="text-xs text-muted-foreground">
                Audited at {new Date(result.fetchedAt).toLocaleString()} · {result.checks.length} checks
                run.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checks list */}
      <Card className="border-border bg-card">
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <ClipboardCheck className="size-4 text-forest" />
            <h3 className="text-lg font-semibold text-foreground">Checks</h3>
            <span className="text-xs text-muted-foreground">
              ({result.checks.filter((c) => c.status === 'pass').length} pass ·{' '}
              {result.checks.filter((c) => c.status === 'warn').length} warn ·{' '}
              {result.checks.filter((c) => c.status === 'fail').length} fail ·{' '}
              {result.checks.filter((c) => c.status === 'info').length} info)
            </span>
          </div>
          <div
            className="max-h-[60vh] overflow-y-auto space-y-2 pr-1"
            style={{ scrollbarColor: 'var(--color-forest) transparent' }}
          >
            {result.checks.map((check) => (
              <CheckRow key={check.id} check={check} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Extracted meta + headings + images */}
      <div className="grid gap-6 lg:grid-cols-2">
        <MetaCard meta={result.meta} />
        <HeadingsCard headings={result.headings} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ImagesCard images={result.images} />
        <BrokenLinksCard links={result.links} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SchemaCard schema={result.schema} />

        <LocalSeoCard localSeo={result.localSeo} />
      </div>
    </motion.div>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Globe
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
      <Icon className="size-4 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-sm font-medium text-foreground truncate">{value}</div>
      </div>
    </div>
  )
}

function CheckRow({ check }: { check: SeoCheck }) {
  const [open, setOpen] = React.useState(false)
  return (
    <div
      className={cn(
        'rounded-lg border border-border border-l-4 bg-card px-3 py-2.5 transition',
        STATUS_BORDER[check.status],
      )}
    >
      <div className="flex items-start gap-3">
        <StatusIcon status={check.status} className="size-5 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-medium text-foreground">{check.title}</h4>
            <span className="text-xs text-muted-foreground tabular-nums shrink-0">{check.score}/100</span>
          </div>
          <p className="text-sm text-foreground/80 mt-0.5 break-words">{check.message}</p>
          {check.detail && (
            <Collapsible open={open} onOpenChange={setOpen}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="mt-1 inline-flex items-center gap-1 text-xs text-forest hover:underline"
                >
                  {open ? 'Hide detail' : 'Show detail'}
                  <ChevronDown className={cn('size-3 transition', open && 'rotate-180')} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <pre className="mt-2 rounded-md bg-muted/60 p-3 text-xs whitespace-pre-wrap font-mono text-foreground/80 leading-relaxed">
                  {check.detail}
                </pre>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---- Extracted meta card ----------------------------------------- */

function MetaCard({ meta }: { meta: SeoAuditMeta }) {
  const rows: { key: string; label: string; value?: string; suffix?: string; warnIfEmpty?: boolean }[] = [
    {
      key: 'title',
      label: 'Title',
      value: meta.title,
      suffix: meta.titleLength != null ? `${meta.titleLength} chars` : undefined,
      warnIfEmpty: true,
    },
    {
      key: 'desc',
      label: 'Description',
      value: meta.description,
      suffix: meta.descriptionLength != null ? `${meta.descriptionLength} chars` : undefined,
      warnIfEmpty: true,
    },
    { key: 'canonical', label: 'Canonical', value: meta.canonical, warnIfEmpty: true },
    { key: 'viewport', label: 'Viewport', value: meta.viewport, warnIfEmpty: true },
    { key: 'lang', label: 'Lang', value: meta.lang, warnIfEmpty: true },
    { key: 'charset', label: 'Charset', value: meta.charset },
    { key: 'robots', label: 'Robots', value: meta.robots },
    { key: 'ogTitle', label: 'og:title', value: meta.ogTitle, warnIfEmpty: true },
    { key: 'ogDesc', label: 'og:description', value: meta.ogDescription, warnIfEmpty: true },
    { key: 'ogImage', label: 'og:image', value: meta.ogImage, warnIfEmpty: true },
    { key: 'twCard', label: 'twitter:card', value: meta.twitterCard, warnIfEmpty: true },
    { key: 'twTitle', label: 'twitter:title', value: meta.twitterTitle },
    { key: 'twDesc', label: 'twitter:description', value: meta.twitterDescription },
  ]
  return (
    <Card className="border-border bg-card">
      <CardContent className="pt-6 space-y-2">
        <div className="flex items-center gap-2 mb-2">
          <Search className="size-4 text-forest" />
          <h3 className="text-lg font-semibold text-foreground">Extracted meta</h3>
        </div>
        <dl className="divide-y divide-border">
          {rows.map((row) => {
            const empty = !row.value
            return (
              <div
                key={row.key}
                className={cn(
                  'grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-1 sm:gap-3 py-2 text-sm',
                  empty && row.warnIfEmpty && 'bg-destructive/5 -mx-2 px-2 rounded',
                )}
              >
                <dt
                  className={cn(
                    'font-medium',
                    empty && row.warnIfEmpty ? 'text-destructive' : 'text-muted-foreground',
                  )}
                >
                  {row.label}
                </dt>
                <dd
                  className={cn(
                    'break-words',
                    empty
                      ? row.warnIfEmpty
                        ? 'text-destructive italic'
                        : 'text-muted-foreground italic'
                      : 'text-foreground',
                  )}
                >
                  {empty ? (row.warnIfEmpty ? 'missing' : '—') : row.value}
                  {row.suffix && (
                    <span className="ml-2 text-xs text-muted-foreground">({row.suffix})</span>
                  )}
                </dd>
              </div>
            )
          })}
        </dl>
      </CardContent>
    </Card>
  )
}

/* ---- Headings card ------------------------------------------------ */

function HeadingsCard({ headings }: { headings: { h1: string[]; h2: string[]; h3: string[] } }) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-center gap-2">
          <Heading className="size-4 text-forest" />
          <h3 className="text-lg font-semibold text-foreground">Headings</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <HeadingStat label="H1" count={headings.h1.length} tone={headings.h1.length === 1 ? 'forest' : 'terracotta'} />
          <HeadingStat label="H2" count={headings.h2.length} tone={headings.h2.length > 0 ? 'forest' : 'clay'} />
          <HeadingStat label="H3" count={headings.h3.length} tone="moss" />
        </div>
        <div className="space-y-2">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground">H1 text</h4>
          {headings.h1.length === 0 ? (
            <p className="text-sm text-destructive italic">No H1 found — add a single H1 per page.</p>
          ) : (
            <ul className="space-y-1">
              {headings.h1.map((h, i) => (
                <li
                  key={i}
                  className="text-sm text-foreground rounded-md bg-muted/50 px-3 py-2 break-words"
                >
                  {h}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function HeadingStat({
  label,
  count,
  tone,
}: {
  label: string
  count: number
  tone: 'forest' | 'sage' | 'clay' | 'terracotta' | 'moss'
}) {
  const toneClass: Record<string, string> = {
    forest: 'bg-forest/10 text-forest',
    sage: 'bg-sage/20 text-forest',
    clay: 'bg-clay/15 text-clay',
    terracotta: 'bg-terracotta/10 text-terracotta',
    moss: 'bg-moss/15 text-forest',
  }
  return (
    <div className={cn('rounded-lg p-3 text-center', toneClass[tone])}>
      <div className="text-2xl font-semibold tabular-nums">{count}</div>
      <div className="text-xs uppercase tracking-wider opacity-80">{label}</div>
    </div>
  )
}

/* ---- Images card -------------------------------------------------- */

function ImagesCard({ images }: { images: { src: string; alt: string | null; hasLazy: boolean }[] }) {
  const withoutAlt = images.filter((i) => !i.alt && i.src).length
  const withoutLazy = images.filter((i) => !i.hasLazy && i.src).length
  return (
    <Card className="border-border bg-card">
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="size-4 text-forest" />
          <h3 className="text-lg font-semibold text-foreground">Images</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <HeadingStat label="Total" count={images.length} tone="forest" />
          <HeadingStat
            label="No alt"
            count={withoutAlt}
            tone={withoutAlt === 0 ? 'forest' : 'terracotta'}
          />
          <HeadingStat
            label="Not lazy"
            count={withoutLazy}
            tone={withoutLazy === 0 ? 'forest' : 'clay'}
          />
        </div>
        {images.length === 0 && (
          <p className="text-sm text-muted-foreground">No images found on the page.</p>
        )}
      </CardContent>
    </Card>
  )
}

/* ---- Broken links card -------------------------------------------- */

function BrokenLinksCard({ links }: { links: { href: string; text: string; internal: boolean; status?: number }[] }) {
  const broken = links.filter((l) => l.status === 0 || (l.status != null && l.status >= 400))
  return (
    <Card className="border-border bg-card">
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-center gap-2">
          <Link2 className="size-4 text-forest" />
          <h3 className="text-lg font-semibold text-foreground">Broken links</h3>
        </div>
        {broken.length === 0 ? (
          <div className="rounded-lg border border-forest/30 bg-forest/5 p-4 text-sm text-forest flex items-center gap-2">
            <CheckCircle2 className="size-4" />
            All {links.length} checked links OK.
          </div>
        ) : (
          <ul className="space-y-2 max-h-72 overflow-y-auto" style={{ scrollbarColor: 'var(--color-forest) transparent' }}>
            {broken.map((l, i) => (
              <li
                key={i}
                className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className="text-destructive border-destructive/40 shrink-0"
                  >
                    {l.status === 0 ? 'no response' : `status ${l.status}`}
                  </Badge>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground hover:underline truncate break-all"
                  >
                    {l.href}
                  </a>
                </div>
                {l.text && <p className="mt-1 text-xs text-muted-foreground">Link text: &ldquo;{l.text}&rdquo;</p>}
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">
          Checks up to 8 internal links per page (HEAD request, falls back to GET).
        </p>
      </CardContent>
    </Card>
  )
}

/* ---- Schema card -------------------------------------------------- */

function SchemaCard({ schema }: { schema: any[] }) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-center gap-2">
          <Braces className="size-4 text-forest" />
          <h3 className="text-lg font-semibold text-foreground">Structured data (JSON-LD)</h3>
        </div>
        {schema.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No JSON-LD blocks found. Add LocalBusiness schema for local SEO.
          </p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto" style={{ scrollbarColor: 'var(--color-forest) transparent' }}>
            {schema.map((s, i) => (
              <pre
                key={i}
                className="rounded-md bg-bark/95 text-cream p-3 text-xs font-mono overflow-x-auto leading-relaxed"
              >
                <code>{JSON.stringify(s, null, 2)}</code>
              </pre>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ---- Local SEO card ---------------------------------------------- */

function LocalSeoCard({
  localSeo,
}: {
  localSeo: {
    hasNAP: boolean
    hasLocalBusinessSchema: boolean
    detectedPhone?: string
    detectedAddress?: string
  }
}) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-center gap-2">
          <MapPin className="size-4 text-forest" />
          <h3 className="text-lg font-semibold text-foreground">Local SEO</h3>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <LocalSeoStat ok={localSeo.hasNAP} label="NAP detected" />
          <LocalSeoStat ok={localSeo.hasLocalBusinessSchema} label="LocalBusiness schema" />
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <Phone className="size-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Detected phone</div>
              <div className={cn(localSeo.detectedPhone ? 'text-foreground' : 'text-muted-foreground italic')}>
                {localSeo.detectedPhone ?? 'none'}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="size-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Detected address</div>
              <div className={cn(localSeo.detectedAddress ? 'text-foreground' : 'text-muted-foreground italic')}>
                {localSeo.detectedAddress ?? 'none'}
              </div>
            </div>
          </div>
        </div>
        {(!localSeo.hasNAP || !localSeo.hasLocalBusinessSchema) && (
          <div className="rounded-lg border border-forest/30 bg-forest/5 p-3 text-xs text-foreground/85 leading-relaxed">
            Tip: Add your business name, address, phone (NAP) + a LocalBusiness JSON-LD block for
            local search ranking.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function LocalSeoStat({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2.5 flex items-center gap-2',
        ok
          ? 'border-forest/40 bg-forest/5 text-forest'
          : 'border-clay/40 bg-clay/5 text-clay',
      )}
    >
      {ok ? <CheckCircle2 className="size-4 shrink-0" /> : <XCircle className="size-4 shrink-0" />}
      <span className="text-sm font-medium">{label}</span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Tool grid card                                                     */
/* ------------------------------------------------------------------ */

function SeoToolCard({ tool, onOpen, onEdit }: { tool: SeoToolDef; onOpen: () => void; onEdit: () => void }) {
  const needsApi = Boolean(tool.needsApiKey || tool.needsIntegration)
  const isAudit = tool.id === 'audit'
  return (
    <Card className="py-4 transition-shadow hover:shadow-md flex flex-col h-full">
      <CardContent className="pt-0 space-y-3 flex-1 flex flex-col">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'size-10 rounded-xl flex items-center justify-center shrink-0',
              needsApi
                ? 'bg-terracotta/10 text-terracotta'
                : tool.ai
                  ? 'bg-sage/20 text-forest'
                  : 'bg-forest/10 text-forest',
            )}
          >
            <DynamicIcon name={tool.icon} className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-foreground truncate">{tool.label}</h3>
              <div className="flex flex-wrap items-center gap-1 justify-end shrink-0">
                {tool.ai && (
                  <Badge
                    variant="outline"
                    className="text-forest border-sage/50 bg-sage/10"
                    title="Uses the in-product AI assistant"
                  >
                    <Sparkles className="size-2.5 mr-0.5" />
                    AI
                  </Badge>
                )}
                {tool.builtin && !needsApi && (
                  <Badge
                    variant="outline"
                    className="text-forest border-forest/40"
                    title="Runs directly inside VirtuaLab Digital — no setup"
                  >
                    BUILT-IN
                  </Badge>
                )}
                {needsApi && (
                  <Badge
                    variant="outline"
                    className="text-terracotta border-terracotta/40 bg-terracotta/5"
                    title={`Needs ${tool.needsApiKey || tool.needsIntegration}`}
                  >
                    NEEDS API
                  </Badge>
                )}
                {/* Master panel: inspect + clone button on built-in tools */}
                <BuiltInToolEditButton label={tool.label} onClick={onEdit} />
              </div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground line-clamp-3">{tool.description}</p>
          </div>
        </div>
        <div className="mt-auto">
          <Button
            className={cn(
              'w-full text-primary-foreground',
              needsApi
                ? 'bg-terracotta hover:bg-terracotta/90'
                : 'bg-forest hover:bg-forest/90',
            )}
            size="sm"
            onClick={onOpen}
          >
            {needsApi ? 'Connect' : isAudit ? 'Open audit' : 'Open'}
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Enriched Keyword Research dialog                                    */
/* ------------------------------------------------------------------ */

interface KeywordResearchResult {
  primaryKeyword?: string
  searchIntent?: string
  peopleAlsoSearch?: string[]
  peopleAlsoAsk?: string[]
  faqs?: { question: string; answer: string }[]
  suggestedKeywords?: { keyword: string; intent: string; difficulty: string; relevance: string }[]
  semanticKeywords?: string[]
  longTailVariations?: string[]
  contentGaps?: string[]
  titleIdeas?: string[]
  metaDescription?: string
  rawResponse?: string
  error?: string
}

interface KeywordResearchResponse {
  ok: boolean
  keyword: string
  location?: string | null
  result: KeywordResearchResult
  error?: string
}

function KeywordResearchDialog({
  open,
  onOpenChange,
  toast,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  toast: ReturnType<typeof useToast>['toast']
}) {
  const setView = useAppStore((s) => s.setView)
  const [keyword, setKeyword] = React.useState('')
  const [location, setLocation] = React.useState('')
  const [niche, setNiche] = React.useState('')
  const [result, setResult] = React.useState<KeywordResearchResult | null>(null)
  const [rawKeyword, setRawKeyword] = React.useState('')

  const mut = useMutation({
    mutationFn: (payload: { keyword: string; location?: string; niche?: string }) =>
      fetchJson<KeywordResearchResponse>('/api/seo/keyword-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      setRawKeyword(data.keyword)
      if (data.result?.error) {
        toast({
          title: 'Research returned an error',
          description: data.result.error,
          variant: 'destructive',
        })
      } else {
        toast({ title: 'Keyword research complete' })
      }
      setResult(data.result)
    },
    onError: (err: Error) =>
      toast({ title: 'Keyword research failed', description: err.message, variant: 'destructive' }),
  })

  React.useEffect(() => {
    if (!open) {
      setKeyword('')
      setLocation('')
      setNiche('')
      setResult(null)
      setRawKeyword('')
    }
  }, [open])

  function run() {
    const k = keyword.trim()
    if (!k) {
      toast({ title: 'Enter a keyword first', variant: 'destructive' })
      return
    }
    setResult(null)
    mut.mutate({
      keyword: k,
      location: location.trim() || undefined,
      niche: niche.trim() || undefined,
    })
  }

  function copyAll() {
    if (!result) return
    const lines: string[] = []
    lines.push(`KEYWORD RESEARCH — ${rawKeyword || keyword}`)
    if (location) lines.push(`Location: ${location}`)
    if (niche) lines.push(`Niche: ${niche}`)
    lines.push('')
    if (result.primaryKeyword) {
      lines.push(`PRIMARY KEYWORD: ${result.primaryKeyword}`)
      lines.push(`SEARCH INTENT: ${result.searchIntent ?? ''}`)
    }
    if (result.peopleAlsoSearch?.length) {
      lines.push('')
      lines.push('PEOPLE ALSO SEARCH:')
      result.peopleAlsoSearch.forEach((s, i) => lines.push(`  ${i + 1}. ${s}`))
    }
    if (result.peopleAlsoAsk?.length) {
      lines.push('')
      lines.push('PEOPLE ALSO ASK:')
      result.peopleAlsoAsk.forEach((q, i) => lines.push(`  ${i + 1}. ${q}`))
    }
    if (result.faqs?.length) {
      lines.push('')
      lines.push('FAQs:')
      result.faqs.forEach((f) => {
        lines.push(`  Q: ${f.question}`)
        lines.push(`  A: ${f.answer}`)
      })
    }
    if (result.suggestedKeywords?.length) {
      lines.push('')
      lines.push('SUGGESTED KEYWORDS:')
      result.suggestedKeywords.forEach((s) => {
        lines.push(`  ${s.keyword} (intent: ${s.intent}, difficulty: ${s.difficulty}, relevance: ${s.relevance})`)
      })
    }
    if (result.semanticKeywords?.length) {
      lines.push('')
      lines.push('SEMANTIC KEYWORDS:')
      lines.push(`  ${result.semanticKeywords.join(', ')}`)
    }
    if (result.longTailVariations?.length) {
      lines.push('')
      lines.push('LONG-TAIL VARIATIONS:')
      lines.push(`  ${result.longTailVariations.join(', ')}`)
    }
    if (result.contentGaps?.length) {
      lines.push('')
      lines.push('CONTENT GAPS:')
      result.contentGaps.forEach((g, i) => lines.push(`  ${i + 1}. ${g}`))
    }
    if (result.titleIdeas?.length) {
      lines.push('')
      lines.push('TITLE IDEAS:')
      result.titleIdeas.forEach((t, i) => lines.push(`  ${i + 1}. ${t}`))
    }
    if (result.metaDescription) {
      lines.push('')
      lines.push(`META DESCRIPTION: ${result.metaDescription}`)
    }
    copyToClipboard(lines.join('\n'), 'Keyword research', toast)
  }

  function sendToContentBrief() {
    const k = (result?.primaryKeyword || rawKeyword || keyword).trim()
    if (!k) return
    onOpenChange(false)
    // Switch to the Content Generation view (where the content-brief tool lives).
    // The user can pick "Content Brief" there; we set the keyword in a global
    // event so the content view can pre-fill it.
    setView({ name: 'content-tools' })
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('content-tools:prefill', {
          detail: { keyword: k, source: 'keyword-research' },
        }),
      )
    }
    toast({ title: 'Opening Content Brief', description: `Keywords: ${k}` })
  }

  function runFullPipeline() {
    const k = (result?.primaryKeyword || rawKeyword || keyword).trim()
    if (!k) return
    onOpenChange(false)
    setView({ name: 'flows' })
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('flows:run-template-0', { detail: { userInput: k } }),
      )
    }
    toast({
      title: 'Running SEO Content Pipeline',
      description: `Keyword: ${k} → flows view`,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DynamicIcon name="SearchCode" className="size-4 text-forest" />
            Keyword Research
            <Badge variant="outline" className="text-forest border-sage/50 bg-sage/10">
              <Sparkles className="size-3" /> Enriched
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Comprehensive keyword research: PAS, PAA, FAQs, suggested + semantic keywords, content gaps,
            title ideas, and a meta description. Powered by the connected LLM.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1 -mr-1 space-y-4">
          {/* Inputs */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-1">
              <Label htmlFor="kw-research-keyword" className="text-xs text-muted-foreground uppercase tracking-wider">
                Keyword <span className="text-destructive">*</span>
              </Label>
              <Input
                id="kw-research-keyword"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g. tankless water heater"
                disabled={mut.isPending}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !mut.isPending) run()
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kw-research-location" className="text-xs text-muted-foreground uppercase tracking-wider">
                Location
              </Label>
              <Input
                id="kw-research-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Austin, TX"
                disabled={mut.isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kw-research-niche" className="text-xs text-muted-foreground uppercase tracking-wider">
                Niche
              </Label>
              <Input
                id="kw-research-niche"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="e.g. plumbing"
                disabled={mut.isPending}
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              className="bg-forest text-primary-foreground hover:bg-forest/90"
              disabled={mut.isPending || !keyword.trim()}
              onClick={run}
            >
              {mut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              Research
            </Button>
          </div>

          {/* Loading */}
          {mut.isPending && (
            <div className="rounded-lg border border-forest/30 bg-forest/5 p-4 text-sm text-foreground flex items-start gap-2">
              <Loader2 className="size-4 animate-spin text-forest mt-0.5" />
              <div>
                Researching keywords, PAS, PAA, FAQs, suggested keywords, semantic terms, content gaps,
                title ideas, and a meta description…
              </div>
            </div>
          )}

          {/* Result */}
          {!mut.isPending && result && <KeywordResearchResult result={result} />}

          {/* Error fallback */}
          {!mut.isPending && result?.rawResponse && (
            <div className="rounded-md bg-bark/95 text-cream p-4 text-xs font-mono max-h-72 overflow-y-auto whitespace-pre-wrap break-words">
              {result.rawResponse}
            </div>
          )}
        </div>

        {result && !mut.isPending && (
          <DialogFooter className="gap-2 sm:gap-2 flex-wrap">
            <Button type="button" variant="ghost" onClick={copyAll}>
              <Copy className="size-4" /> Copy all
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-sage/50 bg-sage/10 text-moss hover:bg-sage/20"
              onClick={sendToContentBrief}
            >
              <ArrowRight className="size-4" /> Send to Content Brief
            </Button>
            <Button
              type="button"
              className="bg-forest text-primary-foreground hover:bg-forest/90"
              onClick={runFullPipeline}
            >
              <Sparkles className="size-4" /> Run full SEO Content Pipeline
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

function KeywordResearchResult({ result }: { result: KeywordResearchResult }) {
  const pas = result.peopleAlsoSearch ?? []
  const paa = result.peopleAlsoAsk ?? []
  const faqs = result.faqs ?? []
  const suggested = result.suggestedKeywords ?? []
  const semantic = result.semanticKeywords ?? []
  const longTail = result.longTailVariations ?? []
  const gaps = result.contentGaps ?? []
  const titles = result.titleIdeas ?? []

  return (
    <div className="space-y-4">
      {/* Primary keyword + search intent */}
      {result.primaryKeyword && (
        <Card className="border-forest/30 bg-forest/5">
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="size-9 rounded-xl bg-forest/15 text-forest flex items-center justify-center shrink-0">
                <Search className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Primary keyword
                </p>
                <p className="text-base font-semibold text-foreground truncate">{result.primaryKeyword}</p>
              </div>
              {result.searchIntent && (
                <Badge variant="outline" className="text-forest border-forest/40 bg-forest/10">
                  {result.searchIntent}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* PAS chips */}
      {pas.length > 0 && (
        <KeywordSection title="People Also Search" icon={<Globe className="size-3.5" />}>
          <div className="flex flex-wrap gap-1.5">
            {pas.map((s, i) => (
              <Badge
                key={i}
                variant="outline"
                className="text-xs border-sage/50 bg-sage/10 text-moss font-normal"
              >
                {s}
              </Badge>
            ))}
          </div>
        </KeywordSection>
      )}

      {/* PAA list */}
      {paa.length > 0 && (
        <KeywordSection title="People Also Ask" icon={<HelpCircle className="size-3.5" />}>
          <ul className="space-y-1.5">
            {paa.map((q, i) => (
              <li
                key={i}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground/90"
              >
                <span className="text-forest font-medium mr-1.5">Q{i + 1}.</span>
                {q}
              </li>
            ))}
          </ul>
        </KeywordSection>
      )}

      {/* FAQs accordion */}
      {faqs.length > 0 && (
        <KeywordSection title="FAQs" icon={<FileText className="size-3.5" />}>
          <Accordion type="multiple" className="rounded-md border border-border bg-background px-3 divide-y">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border-b-0">
                <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline py-3">
                  {f.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{f.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </KeywordSection>
      )}

      {/* Suggested keywords table */}
      {suggested.length > 0 && (
        <KeywordSection title="Suggested keywords" icon={<Sparkles className="size-3.5" />}>
          <div className="rounded-md border border-border bg-background overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/60 text-muted-foreground">
                  <th className="text-left font-medium px-3 py-2">Keyword</th>
                  <th className="text-left font-medium px-3 py-2">Intent</th>
                  <th className="text-left font-medium px-3 py-2">Difficulty</th>
                  <th className="text-left font-medium px-3 py-2">Relevance</th>
                </tr>
              </thead>
              <tbody>
                {suggested.map((s, i) => (
                  <tr key={i} className="border-t border-border/60">
                    <td className="px-3 py-2 font-medium text-foreground">{s.keyword}</td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className="text-[10px] text-moss border-sage/40 bg-sage/10">
                        {s.intent}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px]',
                          s.difficulty === 'low'
                            ? 'text-forest border-forest/40 bg-forest/10'
                            : s.difficulty === 'medium'
                              ? 'text-clay border-clay/40 bg-clay/10'
                              : 'text-terracotta border-terracotta/40 bg-terracotta/10',
                        )}
                      >
                        {s.difficulty}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px]',
                          s.relevance === 'high'
                            ? 'text-forest border-forest/40 bg-forest/10'
                            : s.relevance === 'medium'
                              ? 'text-clay border-clay/40 bg-clay/10'
                              : 'text-muted-foreground border-border bg-muted/40',
                        )}
                      >
                        {s.relevance}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </KeywordSection>
      )}

      {/* Semantic keywords */}
      {semantic.length > 0 && (
        <KeywordSection title="Semantic keywords" icon={<Braces className="size-3.5" />}>
          <div className="flex flex-wrap gap-1.5">
            {semantic.map((s, i) => (
              <Badge
                key={i}
                variant="outline"
                className="text-xs border-forest/40 bg-forest/5 text-forest font-normal"
              >
                {s}
              </Badge>
            ))}
          </div>
        </KeywordSection>
      )}

      {/* Long-tail variations */}
      {longTail.length > 0 && (
        <KeywordSection title="Long-tail variations" icon={<ArrowRight className="size-3.5" />}>
          <div className="flex flex-wrap gap-1.5">
            {longTail.map((s, i) => (
              <Badge
                key={i}
                variant="outline"
                className="text-xs border-terracotta/40 bg-terracotta/5 text-terracotta font-normal"
              >
                {s}
              </Badge>
            ))}
          </div>
        </KeywordSection>
      )}

      {/* Content gaps */}
      {gaps.length > 0 && (
        <KeywordSection title="Content gaps" icon={<AlertTriangle className="size-3.5" />}>
          <ul className="space-y-1.5">
            {gaps.map((g, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground/90">
                <span className="text-terracotta mt-1">•</span>
                <span>{g}</span>
              </li>
            ))}
          </ul>
        </KeywordSection>
      )}

      {/* Title ideas */}
      {titles.length > 0 && (
        <KeywordSection title="Title ideas" icon={<Heading className="size-3.5" />}>
          <ol className="space-y-1.5 list-decimal list-inside marker:text-forest marker:font-semibold">
            {titles.map((t, i) => (
              <li key={i} className="text-sm text-foreground/90 pl-1">
                {t}
              </li>
            ))}
          </ol>
        </KeywordSection>
      )}

      {/* Meta description */}
      {result.metaDescription && (
        <Card className="border-terracotta/40 bg-terracotta/5">
          <CardContent className="pt-4 pb-4 px-4">
            <p className="text-[10px] uppercase tracking-wider text-terracotta font-medium mb-1.5">
              Suggested meta description
            </p>
            <p className="text-sm text-foreground/90 leading-relaxed">{result.metaDescription}</p>
          </CardContent>
        </Card>
      )}

      {/* Error fallback */}
      {result.error && !result.rawResponse && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {result.error}
        </div>
      )}
    </div>
  )
}

function KeywordSection({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        {title}
      </div>
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Meta preview dialog                                                */
/* ------------------------------------------------------------------ */

function MetaPreviewDialog({
  open,
  onOpenChange,
  toast,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  toast: ReturnType<typeof useToast>['toast']
}) {
  const [url, setUrl] = React.useState('https://example.com')
  const metaMut = useMutation({
    mutationFn: (payload: { url: string }) =>
      fetchJson('/api/seo/meta-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onError: (err: Error) =>
      toast({ title: 'Meta check failed', description: err.message, variant: 'destructive' }),
  })

  function runCheck() {
    const u = url.trim()
    if (!u) {
      toast({ title: 'Enter a URL', variant: 'destructive' })
      return
    }
    metaMut.mutate({ url: u })
  }

  const data = metaMut.data as MetaCheckResult | undefined
  const meta = data?.meta
  const og = data?.openGraph ?? {}

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="size-4 text-forest" /> Meta Tag Preview
          </DialogTitle>
          <DialogDescription>
            See how your page looks in search results + social shares.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !metaMut.isPending) runCheck()
              }}
              placeholder="https://example.com"
              className="flex-1"
            />
            <Button
              className="bg-forest text-primary-foreground hover:bg-forest/90 shrink-0"
              disabled={metaMut.isPending}
              onClick={runCheck}
            >
              {metaMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              Check
            </Button>
          </div>

          {metaMut.isPending && (
            <div className="rounded-lg border border-border bg-forest/5 p-4 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="size-4 animate-spin text-forest" />
              Fetching the page + extracting meta…
            </div>
          )}

          {data && meta && (
            <div className="space-y-5">
              {/* SERP preview */}
              <div>
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  Google search preview
                </h4>
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="text-xs text-sage truncate">
                    {(() => {
                      try {
                        const u = new URL(data.url)
                        return u.hostname
                      } catch {
                        return data.url
                      }
                    })()}
                    {meta.canonical ? ` › ${meta.canonical.replace(/^https?:\/\/[^/]+/, '')}` : ''}
                  </div>
                  <div className="text-base text-forest leading-snug mt-0.5 break-words">
                    {meta.title || <span className="italic text-muted-foreground">(no title)</span>}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1 break-words">
                    {meta.description || <span className="italic">(no description)</span>}
                  </div>
                </div>
              </div>

              {/* Social share preview */}
              <div>
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  Social share preview (OpenGraph)
                </h4>
                <div className="rounded-lg border border-border bg-card overflow-hidden max-w-md">
                  {meta.ogImage ? (
                    <div className="aspect-[1.91/1] bg-muted border-b border-border overflow-hidden">
                      <img
                        src={meta.ogImage}
                        alt="OG preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    </div>
                  ) : (
                    <div className="aspect-[1.91/1] bg-muted border-b border-border flex items-center justify-center text-xs text-muted-foreground">
                      No og:image
                    </div>
                  )}
                  <div className="p-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">
                      {(() => {
                        try {
                          return new URL(data.url).hostname
                        } catch {
                          return data.url
                        }
                      })()}
                    </div>
                    <div className="text-sm font-medium text-foreground mt-0.5 break-words">
                      {meta.ogTitle || meta.title || '(no title)'}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 break-words">
                      {meta.ogDescription || meta.description || '(no description)'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Raw meta tags */}
              <div>
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  All meta tags
                </h4>
                <div className="rounded-lg border border-border bg-bark/95 text-cream p-3 max-h-60 overflow-y-auto">
                  <pre className="text-xs font-mono leading-relaxed">
                    <code>{JSON.stringify({ ...meta, openGraph: og }, null, 2)}</code>
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/* Sitemap dialog                                                     */
/* ------------------------------------------------------------------ */

function SitemapDialog({
  open,
  onOpenChange,
  projects,
  toast,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  projects: ProjectLite[]
  toast: ReturnType<typeof useToast>['toast']
}) {
  const [projectId, setProjectId] = React.useState('')
  const smMut = useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/seo/sitemap-check?projectId=${encodeURIComponent(id)}`),
    onError: (err: Error) =>
      toast({ title: 'Sitemap failed', description: err.message, variant: 'destructive' }),
  })

  function run() {
    if (!projectId) {
      toast({ title: 'Pick a project', variant: 'destructive' })
      return
    }
    smMut.mutate(projectId)
  }

  const data = smMut.data as SitemapResult | undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Map className="size-4 text-forest" /> Sitemap Generator
          </DialogTitle>
          <DialogDescription>
            Generate a sitemap.xml from your project&rsquo;s pages — copy or download.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="flex-1">
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
              className="bg-forest text-primary-foreground hover:bg-forest/90 shrink-0"
              disabled={smMut.isPending || !projectId}
              onClick={run}
            >
              {smMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Map className="size-4" />}
              Generate
            </Button>
          </div>

          {smMut.isPending && (
            <div className="rounded-lg border border-border bg-forest/5 p-4 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="size-4 animate-spin text-forest" />
              Building the sitemap…
            </div>
          )}

          {data && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-md bg-muted/50 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Domain</div>
                  <div className="font-medium text-foreground truncate">{data.domain}</div>
                </div>
                <div className="rounded-md bg-muted/50 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Pages</div>
                  <div className="font-medium text-foreground">{data.pageCount}</div>
                </div>
              </div>
              <div className="rounded-lg border border-bark/30 bg-bark/95 overflow-hidden">
                <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-cream/10 bg-bark">
                  <span className="text-xs text-cream/70 font-mono">sitemap.xml</span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-cream/80 hover:text-cream hover:bg-cream/10"
                      onClick={() => copyToClipboard(data.sitemap, 'Sitemap', toast)}
                    >
                      <Copy className="size-3" /> Copy
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-cream/80 hover:text-cream hover:bg-cream/10"
                      onClick={() =>
                        downloadTextFile('sitemap.xml', data.sitemap, 'application/xml')
                      }
                    >
                      <Download className="size-3" /> Download
                    </Button>
                  </div>
                </div>
                <pre
                  className="max-h-72 overflow-y-auto p-4 text-xs font-mono text-cream/95 leading-relaxed"
                  style={{ scrollbarColor: 'var(--color-forest) transparent' }}
                >
                  <code>{data.sitemap}</code>
                </pre>
              </div>
              {data.pages.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs uppercase tracking-wider text-muted-foreground">
                    Pages included
                  </h4>
                  <ul className="max-h-32 overflow-y-auto space-y-1 text-xs" style={{ scrollbarColor: 'var(--color-forest) transparent' }}>
                    {data.pages.map((p) => (
                      <li key={p.id} className="flex items-center gap-2">
                        <span className="text-forest font-mono">/{p.slug === 'home' ? '' : p.slug}</span>
                        <span className="text-muted-foreground">— {p.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

