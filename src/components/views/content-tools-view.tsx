'use client'

import * as React from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Search,
  PenLine,
  Sparkles,
  Loader2,
  Copy,
  Download,
  ArrowRight,
  AlertTriangle,
  Plug,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
  CONTENT_CATEGORIES,
  type CustomTool,
  type BuiltInToolLike,
} from '@/components/shared/add-custom-tool-dialog'

/* ------------------------------------------------------------------ */

interface ContentToolDef {
  id: string
  label: string
  icon: string
  category: string
  description: string
  endpoint: string
  input: string
  builtin?: boolean
  ai?: boolean
  needsApiKey?: string
  needsIntegration?: string
  custom?: boolean
  prompt?: string
  iconKey?: string
}

interface CatalogResponse {
  categories: { id: string; label: string; count: number; view: string }[]
  social: ContentToolDef[]
  content: ContentToolDef[]
  note: string
}

interface AiChatResponse {
  reply: string
}

/* ------------------------------------------------------------------ */
/* Per-tool AI prompt builders                                         */
/* ------------------------------------------------------------------ */

interface AiPromptSpec {
  placeholder: string
  textarea?: boolean
  codeBlock?: boolean
  build: (input: string) => string
}

const CONTENT_AI_PROMPTS: Record<string, AiPromptSpec> = {
  'blog-generator': {
    placeholder: 'Topic + target keyword (e.g. "tankless water heater cost — water heater")',
    textarea: true,
    build: (input) =>
      `Write a full blog post about "${input}". SEO-optimized. Include: H1, 3-4 H2s, intro, body (800-1200 words), conclusion, meta title (under 60 chars), meta description (under 160 chars). Tone: honest, practical, no hype. Return as markdown with clear section headings.`,
  },
  'programmatic-seo': {
    placeholder: 'Service + location variables (e.g. "plumber in {CITY}, {STATE}")',
    build: (input) =>
      `Generate 20 programmatic SEO landing page templates for "${input}". Each: URL slug, H1, meta title, meta description, 2-paragraph body with location/service variables (use {CITY} / {STATE} placeholders). Return as a clean numbered list.`,
  },
  'ai-overview-optimizer': {
    placeholder: 'Paste the content you want to optimize for AI Overviews',
    textarea: true,
    build: (input) =>
      `Optimize this content to appear in Google AI Overviews. Content:\n"""\n${input}\n"""\n\nAdd: clear answer paragraph (40-50 words at the top), FAQ section (3-5 Q&As), structured data suggestions, authority signals (citations, expert quotes placeholders). Return as markdown.`,
  },
  'content-rewriter': {
    placeholder: 'Paste the content to rewrite…',
    textarea: true,
    build: (input) =>
      `Rewrite this content for better SEO + readability. Keep the meaning, improve the wording. Make it more concise and engaging. Content:\n"""\n${input}\n"""\n\nReturn only the rewritten content.`,
  },
  'meta-title-gen': {
    placeholder: 'Page topic / target keyword',
    build: (input) =>
      `Generate 5 meta title options under 60 chars for: "${input}". Keyword-first, click-worthy, not clickbait. Return as a numbered list with character count next to each.`,
  },
  'meta-desc-gen': {
    placeholder: 'Page topic / target keyword',
    build: (input) =>
      `Generate 5 meta description options under 160 chars for: "${input}". Include CTA, keyword, honest promise. Return as a numbered list with character count next to each.`,
  },
  'faq-generator': {
    placeholder: 'Topic for the FAQ (e.g. "tankless water heater maintenance")',
    build: (input) =>
      `Generate 8 FAQ questions + answers about "${input}". Format as JSON-LD FAQPage schema (Q as name, A as text). Answers 40-60 words each. Return ONLY the JSON-LD script block — no markdown fences, no explanation.`,
  },
  'schema-generator': {
    placeholder: 'Business type + city (e.g. "Plumber in Austin, TX")',
    codeBlock: true,
    build: (input) =>
      `Generate JSON-LD schema for "${input}". Use LocalBusiness type if it's a local business. Fill with placeholder values (name, address, phone, openingHours, geo, url). Return ONLY the JSON-LD script block — no markdown fences, no explanation.`,
  },
  'content-brief': {
    placeholder: 'Target keyword or topic (e.g. "tankless water heater cost")',
    build: (input) =>
      `Create an SEO content brief for: "${input}". Include: target keyword, 5 secondary keywords, H1/H2 structure, word count recommendation, 3 internal link suggestions, meta title + description. Return as a clean, scannable brief.`,
  },
  'outline-generator': {
    placeholder: 'Topic for the blog outline (e.g. "how to start a sourdough starter")',
    build: (input) =>
      `Generate a blog post outline for: "${input}". H1, 4-5 H2s, 2-3 H3s per H2, key points per section, suggested intro hook + conclusion. Return as markdown.`,
  },
  'landing-page-copy': {
    placeholder: 'Product / service + audience (e.g. "organic meal kits for busy families")',
    textarea: true,
    build: (input) =>
      `Generate full landing page copy for: "${input}". Hero (headline + subheadline + CTA), Features (3-4), Benefits, Social proof placeholder, Final CTA. SEO-optimized. Return as markdown with section labels.`,
  },
  'email-sequence': {
    placeholder: 'Product / niche for the nurture sequence (e.g. "organic skincare subscription")',
    textarea: true,
    build: (input) =>
      `Write a 5-email nurture sequence for "${input}". Email 1: Welcome. Email 2: Value. Email 3: Soft pitch. Email 4: Hard pitch. Email 5: Follow-up. Each email: subject line + body (100-200 words). Tone: honest, no hype. Return as markdown with email numbers as headings.`,
  },
  'press-release': {
    placeholder: 'Announcement (e.g. "we opened a new bakery location in Portland, OR")',
    textarea: true,
    build: (input) =>
      `Write a press release for: "${input}". Newsworthy angle, headline, dateline, 2 quotes (one from founder, one from a customer placeholder), boilerplate, contact info. 400-500 words. Return as markdown.`,
  },
  'product-description': {
    placeholder: 'Product name + key features (e.g. "Organic Cotton Tote — heavyweight, 16oz, fair-trade")',
    build: (input) =>
      `Write a product description for: "${input}". Features, benefits, specs, SEO keywords, emotional hook. 150-200 words. Tone: honest, no hype. Return as markdown with clear sections.`,
  },
}

const DEFAULT_CONTENT_PROMPT: AiPromptSpec = {
  placeholder: 'Describe what you want to create…',
  build: (input) => `Create content for "${input}". Return as a clean, scannable list.`,
}

function getContentPromptSpec(toolId: string): AiPromptSpec {
  return CONTENT_AI_PROMPTS[toolId] ?? DEFAULT_CONTENT_PROMPT
}

function copyToClipboard(text: string, label: string, toast: ReturnType<typeof useToast>['toast']) {
  navigator.clipboard.writeText(text).then(
    () => toast({ title: `${label} copied` }),
    () => toast({ title: 'Copy failed', variant: 'destructive' }),
  )
}

function downloadTextFile(filename: string, content: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/* ------------------------------------------------------------------ */

export function ContentToolsView() {
  const setView = useAppStore((s) => s.setView)
  const { toast } = useToast()

  const catalogQuery = useQuery<CatalogResponse>({
    queryKey: ['tools-catalog'],
    queryFn: () => fetchJson('/api/tools/catalog'),
  })

  // Fetch custom tools for the content category.
  const customToolsQuery = useQuery<{ tools: CustomTool[] }>({
    queryKey: ['custom-tools'],
    queryFn: () => fetchJson('/api/tools/custom'),
  })
  const contentCustomTools = (customToolsQuery.data?.tools ?? []).filter(
    (t) => t.category === 'content',
  )

  const [searchQuery, setSearchQuery] = React.useState('')
  const [activeTool, setActiveTool] = React.useState<ContentToolDef | null>(null)
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
      invalidateKeys: [['tools-catalog'], ['custom-tools'], ['content-tools']],
    })
  }

  function openBuiltInInfo(tool: ContentToolDef) {
    setInfoTool({
      id: tool.id,
      label: tool.label,
      description: tool.description,
      icon: tool.icon,
      iconKey: tool.iconKey || tool.icon,
      category: tool.category,
      endpoint: tool.endpoint,
      input: tool.input,
      prompt: tool.prompt,
    })
  }

  // Map custom tools into the ContentToolDef shape so they render in the grid.
  const customAsContent: ContentToolDef[] = contentCustomTools.map((c) => ({
    id: c.id,
    label: c.label,
    icon: c.iconKey || 'Wrench',
    category: 'content',
    description: c.description || 'Custom tool added by you.',
    endpoint: c.endpoint,
    input: c.input,
    builtin: false,
    ai: c.ai,
    custom: true,
    prompt: c.prompt,
    iconKey: c.iconKey,
  }))

  const builtinTools = catalogQuery.data?.content ?? []
  const allTools = [...builtinTools, ...customAsContent]
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

  function handleOpenTool(tool: ContentToolDef) {
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
    setActiveTool(tool)
  }

  // Listen for the "navigate-integrations" CustomEvent fired by the NeedsApi popover.
  React.useEffect(() => {
    function handler() {
      setView({ name: 'integrations' })
    }
    window.addEventListener('navigate-integrations', handler)
    return () => window.removeEventListener('navigate-integrations', handler)
  }, [setView])

  return (
    <div className="organic-bg min-h-full flex flex-col">
      {/* Hero */}
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
                <PenLine className="size-3.5" />
                Content
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sage/40 bg-sage/15 text-sage px-3 py-1 text-xs font-medium uppercase tracking-wider">
                <Sparkles className="size-3.5" />
                AI-powered
              </span>
            </div>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-balance leading-[1.05]">
              Content Generation — AI-powered
            </h1>
            <p className="mt-4 text-lg sm:text-xl text-cream/85 max-w-2xl text-balance">
              Blogs, landing pages, email sequences, press releases, product descriptions. All SEO-optimized.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Body */}
      <section className="flex-1 px-4 sm:px-6 py-10 sm:py-12">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Search + count */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                All Content Generation tools ({totalToolCount})
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {allTools.filter((t) => t.ai).length} AI tools · {allTools.filter((t) => t.needsIntegration).length} need an integration
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tools…"
                className="pl-8"
              />
            </div>
          </div>

          {/* Grid */}
          {catalogQuery.isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="h-44 rounded-2xl" />
              ))}
            </div>
          ) : catalogQuery.isError ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
              Could not load the content tool catalog. Please refresh.
            </div>
          ) : filteredTools.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              No tools match &ldquo;{searchQuery}&rdquo;. Try a different search.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredTools.map((tool) =>
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
                  <ContentToolCard
                    key={tool.id}
                    tool={tool}
                    onOpen={() => handleOpenTool(tool)}
                    onEdit={() => openBuiltInInfo(tool)}
                  />
                ),
              )}
              {/* "+" custom tool card at the end of the grid */}
              <AddCustomToolCard
                onClick={() => setAddCustomOpen(true)}
                title="Add custom content tool"
                subtitle="Add your own content generation tool."
                ariaLabel="Add custom content tool"
              />
            </div>
          )}
        </div>
      </section>

      {/* Sticky footer */}
      <footer className="border-t border-border bg-card px-4 py-3 text-[11px] text-muted-foreground flex items-center justify-between">
        <span>{filteredTools.length} of {totalToolCount} tools shown</span>
        <button
          type="button"
          onClick={() => setView({ name: 'integrations' })}
          className="text-forest hover:underline flex items-center gap-1"
        >
          <Plug className="size-3" /> Connect integrations
        </button>
      </footer>

      {/* Active tool dialog router */}
      <ActiveToolDialog
        tool={activeTool}
        open={!!activeTool}
        onOpenChange={(o) => !o && setActiveTool(null)}
        toast={toast}
        setView={setView}
      />

      {/* "+" custom tool dialog */}
      <AddCustomToolDialog
        open={addCustomOpen}
        onOpenChange={setAddCustomOpen}
        defaultCategory="content"
        categories={CONTENT_CATEGORIES}
        invalidateKeys={[['tools-catalog'], ['custom-tools'], ['content-tools']]}
        title="Add custom content tool"
        description="Add your own content generation tool — saved to your project only."
        showCategory={false}
        fixedCategory
      />

      {/* Edit custom tool dialog (master panel) */}
      <AddCustomToolDialog
        open={!!editingTool}
        onOpenChange={(o) => !o && setEditingTool(null)}
        defaultCategory="content"
        categories={CONTENT_CATEGORIES}
        invalidateKeys={[['tools-catalog'], ['custom-tools'], ['content-tools']]}
        showCategory={false}
        fixedCategory
        editTool={editingTool}
      />

      {/* Built-in tool inspect/clone dialog (master panel) */}
      <BuiltInToolInfoDialog
        tool={infoTool}
        open={!!infoTool}
        onOpenChange={(o) => !o && setInfoTool(null)}
        categories={CONTENT_CATEGORIES}
        defaultCategory="content"
        invalidateKeys={[['tools-catalog'], ['custom-tools'], ['content-tools']]}
        fixedCategory
        categoryLabel="Content Generation"
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
/* Tool card                                                           */
/* ------------------------------------------------------------------ */

function ContentToolCard({ tool, onOpen, onEdit }: { tool: ContentToolDef; onOpen: () => void; onEdit: () => void }) {
  const needsApi = Boolean(tool.needsApiKey || tool.needsIntegration)
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
                  >
                    <Sparkles className="size-2.5 mr-0.5" />
                    AI
                  </Badge>
                )}
                {tool.builtin && !needsApi && (
                  <Badge variant="outline" className="text-forest border-forest/40">
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
          {needsApi ? (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  className="w-full text-primary-foreground bg-terracotta hover:bg-terracotta/90"
                  size="sm"
                >
                  Connect <ArrowRight className="size-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="start">
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="size-4 text-terracotta shrink-0 mt-0.5" />
                    <p className="text-sm font-medium text-foreground">
                      Connect {tool.needsIntegration || tool.needsApiKey} first
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This tool needs a connected integration to run. Once you connect it
                    in Integrations, you can use this tool here.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-1"
                    onClick={() => {
                      setTimeout(() => {
                        const ev = new CustomEvent('navigate-integrations')
                        window.dispatchEvent(ev)
                      }, 0)
                    }}
                  >
                    Go to Integrations <ArrowRight className="size-3.5" />
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            <Button
              className="w-full text-primary-foreground bg-forest hover:bg-forest/90"
              size="sm"
              onClick={onOpen}
            >
              Open <ArrowRight className="size-3.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Active tool dialog — routes by tool type                            */
/* ------------------------------------------------------------------ */

function ActiveToolDialog({
  tool,
  open,
  onOpenChange,
  toast,
  setView,
}: {
  tool: ContentToolDef | null
  open: boolean
  onOpenChange: (o: boolean) => void
  toast: ReturnType<typeof useToast>['toast']
  setView: (v: any) => void
}) {
  if (!tool) return null

  // Needs integration (e.g. content-decay) — show the needs-API notice.
  if (tool.needsApiKey || tool.needsIntegration) {
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
                    This tool needs <span className="font-semibold text-terracotta">{tool.needsIntegration || tool.needsApiKey}</span> to run.
                  </p>
                  <p className="text-muted-foreground">
                    Connect it in <span className="font-medium">Integrations</span> first,
                    then come back here. The other content tools above are AI-powered and
                    need no setup — they run directly inside VirtuaLab Digital.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
              <Button
                className="bg-forest text-primary-foreground hover:bg-forest/90"
                onClick={() => {
                  onOpenChange(false)
                  setView({ name: 'integrations' })
                }}
              >
                <Plug className="size-4" /> Go to Integrations
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Default — AI dialog (input: 'text').
  if (tool.ai || tool.input === 'text') {
    return (
      <ContentAiDialog tool={tool} open={open} onOpenChange={onOpenChange} toast={toast} />
    )
  }

  return null
}

/* ------------------------------------------------------------------ */
/* AI dialog for input: 'text' tools                                   */
/* ------------------------------------------------------------------ */

function ContentAiDialog({
  tool,
  open,
  onOpenChange,
  toast,
}: {
  tool: ContentToolDef
  open: boolean
  onOpenChange: (o: boolean) => void
  toast: ReturnType<typeof useToast>['toast']
}) {
  const spec = getContentPromptSpec(tool.id)
  const [input, setInput] = React.useState('')
  const [reply, setReply] = React.useState<string | null>(null)
  const mut = useMutation({
    mutationFn: (messages: { role: 'user' | 'assistant'; content: string }[]) =>
      fetchJson('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      }) as Promise<AiChatResponse>,
    onSuccess: (data) => setReply(data.reply ?? 'No reply.'),
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
            <Label htmlFor={`content-ai-${tool.id}`} className="text-xs text-muted-foreground">
              Context <span className="text-destructive ml-0.5">*</span>
            </Label>
            {spec.textarea ? (
              <Textarea
                id={`content-ai-${tool.id}`}
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
                id={`content-ai-${tool.id}`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !mut.isPending) run()
                }}
                placeholder={spec.placeholder}
              />
            )}
            {spec.textarea && (
              <p className="text-[10px] text-muted-foreground">Press ⌘/Ctrl + Enter to generate.</p>
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
                <span className="text-xs font-medium text-forest uppercase tracking-wider">Result</span>
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() =>
                      downloadTextFile(
                        `${tool.id}.${spec.codeBlock ? 'json' : 'txt'}`,
                        reply,
                        spec.codeBlock ? 'application/ld+json' : 'text/plain',
                      )
                    }
                  >
                    <Download className="size-3" /> Download
                  </Button>
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
