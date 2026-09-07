'use client'

import * as React from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Search,
  Share2,
  Sparkles,
  Loader2,
  Copy,
  Download,
  ArrowRight,
  AlertTriangle,
  Globe,
  Plug,
  Leaf,
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
  SOCIAL_CATEGORIES,
  type CustomTool,
  type BuiltInToolLike,
} from '@/components/shared/add-custom-tool-dialog'

/* ------------------------------------------------------------------ */

interface SocialToolDef {
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
  social: SocialToolDef[]
  content: SocialToolDef[]
  note: string
}

interface AiChatResponse {
  reply: string
}

interface CheckResultEnvelope {
  ok: boolean
  tool: string
  url: string
  result: any
}

/* ------------------------------------------------------------------ */
/* Per-tool AI prompt builders                                         */
/* Each prompt mirrors the brand voice — honest, no hype, no paid-ad  */
/* language. The {input} is the user's context from the dialog.       */
/* ------------------------------------------------------------------ */

interface AiPromptSpec {
  placeholder: string
  textarea?: boolean
  codeBlock?: boolean
  build: (input: string) => string
}

const SOCIAL_AI_PROMPTS: Record<string, AiPromptSpec> = {
  'caption-generator': {
    placeholder: 'Describe your business / niche / post topic (e.g. "sourdough bakery — weekend special")',
    build: (input) =>
      `Write 3 social media captions for "${input}". Tone: warm, organic, honest — no hype, no marketing-speak. Include 2-3 relevant hashtags. Vary the length (one short, one medium, one longer). Return as a numbered list.`,
  },
  'hashtag-sets': {
    placeholder: 'Your niche / topic (e.g. "organic gardening")',
    build: (input) =>
      `Generate 3 hashtag sets (10 tags each) for "${input}". Mix branded, community, and trending tags. Avoid banned/spammy tags. Each set on its own line, space-separated. Label each set with a one-word theme (e.g. "Community", "Trending", "Niche").`,
  },
  'bio-optimizer': {
    placeholder: 'Your business / niche + what you do (e.g. "organic bakery in Portland, OR")',
    build: (input) =>
      `Optimize a social media bio for "${input}". Platform: Instagram (150 char limit). Include: niche, location, CTA, emoji. Make it warm and human — not corporate. Return only the bio text on the first line, then a short note on why each element is there.`,
  },
  'repurpose-blog': {
    placeholder: 'Paste the blog post you want to repurpose (title + body)',
    textarea: true,
    build: (input) =>
      `Turn this blog post into 5 social posts — one per platform, each optimized for that platform's format. Blog:\n"""\n${input}\n"""\n\nPlatforms: Facebook (warm, community), Instagram (visual hook + caption), X/Twitter (concise, single idea), LinkedIn (professional angle), Instagram Story (1-2 lines + CTA sticker idea). Return as a numbered list, platform name as a heading.`,
  },
  'carousel-writer': {
    placeholder: 'Carousel topic (e.g. "5 myths about composting")',
    build: (input) =>
      `Write a 7-slide Instagram carousel about "${input}". Each slide: slide number, headline (max 6 words), 1-2 sentences of body. End with a CTA slide (follow, save, share). Keep the tone honest and practical. Return as a numbered list.`,
  },
  'social-calendar': {
    placeholder: 'Your niche / business (e.g. "organic skincare brand")',
    build: (input) =>
      `Generate a 30-day social content calendar for "${input}". Mix: 40% educational, 30% engagement, 20% promotional, 10% behind-the-scenes. Format: Day | Post type | Caption idea | Hashtags. Return as a clean table (markdown or plain text).`,
  },
  'comment-responder': {
    placeholder: 'Paste the comment you want to reply to',
    textarea: true,
    build: (input) =>
      `Write a reply to this comment: "${input}". Tone: friendly and helpful, never defensive. Keep it short (1-2 sentences). Return only the reply.`,
  },
  'reel-script': {
    placeholder: 'Topic / hook for the Reel (e.g. "why my sourdough is different")',
    build: (input) =>
      `Write a 45-second Reel script about "${input}". Include: hook (3 sec — first line viewer sees), body (30 sec — value or story), CTA (12 sec — what to do next). Add shot suggestions (visual cues) for each section. Format clearly with timestamps. Keep it honest — no hooks like "you won't believe".`,
  },
}

const DEFAULT_SOCIAL_PROMPT: AiPromptSpec = {
  placeholder: 'Describe what you want to create…',
  build: (input) => `Create social content for "${input}". Return as a clean, scannable list.`,
}

function getSocialPromptSpec(toolId: string): AiPromptSpec {
  return SOCIAL_AI_PROMPTS[toolId] ?? DEFAULT_SOCIAL_PROMPT
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

export function SocialToolsView() {
  const setView = useAppStore((s) => s.setView)
  const { toast } = useToast()

  const catalogQuery = useQuery<CatalogResponse>({
    queryKey: ['tools-catalog'],
    queryFn: () => fetchJson('/api/tools/catalog'),
  })

  // Fetch custom tools for the social category.
  const customToolsQuery = useQuery<{ tools: CustomTool[] }>({
    queryKey: ['custom-tools'],
    queryFn: () => fetchJson('/api/tools/custom'),
  })
  const socialCustomTools = (customToolsQuery.data?.tools ?? []).filter(
    (t) => t.category === 'social',
  )

  const [searchQuery, setSearchQuery] = React.useState('')
  const [activeTool, setActiveTool] = React.useState<SocialToolDef | null>(null)
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
      invalidateKeys: [['tools-catalog'], ['custom-tools'], ['social-tools']],
    })
  }

  function openBuiltInInfo(tool: SocialToolDef) {
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

  // Map custom tools into the SocialToolDef shape so they render in the grid.
  const customAsSocial: SocialToolDef[] = socialCustomTools.map((c) => ({
    id: c.id,
    label: c.label,
    icon: c.iconKey || 'Wrench',
    category: 'social',
    description: c.description || 'Custom tool added by you.',
    endpoint: c.endpoint,
    input: c.input,
    builtin: false,
    ai: c.ai,
    custom: true,
    prompt: c.prompt,
    iconKey: c.iconKey,
  }))

  const builtinTools = catalogQuery.data?.social ?? []
  const allTools = [...builtinTools, ...customAsSocial]
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

  function handleOpenTool(tool: SocialToolDef) {
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
                <Share2 className="size-3.5" />
                Social
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sage/40 bg-sage/15 text-sage px-3 py-1 text-xs font-medium uppercase tracking-wider">
                <Sparkles className="size-3.5" />
                Built in + AI
              </span>
            </div>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-balance leading-[1.05]">
              Social Media Tools — built in + AI
            </h1>
            <p className="mt-4 text-lg sm:text-xl text-cream/85 max-w-2xl text-balance">
              Captions, hashtags, bios, carousels, content calendars. All in one place.
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
                All Social Media tools ({totalToolCount})
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {allTools.filter((t) => t.ai).length} AI tools · {allTools.filter((t) => t.builtin).length} built-in
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
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-44 rounded-2xl" />
              ))}
            </div>
          ) : catalogQuery.isError ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
              Could not load the social tool catalog. Please refresh.
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
                  <SocialToolCard
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
                title="Add custom social tool"
                subtitle="Add your own social media tool."
                ariaLabel="Add custom social tool"
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
          <Plug className="size-3" /> Connect social integrations
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
        defaultCategory="social"
        categories={SOCIAL_CATEGORIES}
        invalidateKeys={[['tools-catalog'], ['custom-tools'], ['social-tools']]}
        title="Add custom social tool"
        description="Add your own social media tool — saved to your project only."
        showCategory={false}
        fixedCategory
      />

      {/* Edit custom tool dialog (master panel) */}
      <AddCustomToolDialog
        open={!!editingTool}
        onOpenChange={(o) => !o && setEditingTool(null)}
        defaultCategory="social"
        categories={SOCIAL_CATEGORIES}
        invalidateKeys={[['tools-catalog'], ['custom-tools'], ['social-tools']]}
        showCategory={false}
        fixedCategory
        editTool={editingTool}
      />

      {/* Built-in tool inspect/clone dialog (master panel) */}
      <BuiltInToolInfoDialog
        tool={infoTool}
        open={!!infoTool}
        onOpenChange={(o) => !o && setInfoTool(null)}
        categories={SOCIAL_CATEGORIES}
        defaultCategory="social"
        invalidateKeys={[['tools-catalog'], ['custom-tools'], ['social-tools']]}
        fixedCategory
        categoryLabel="Social Media"
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

function SocialToolCard({ tool, onOpen, onEdit }: { tool: SocialToolDef; onOpen: () => void; onEdit: () => void }) {
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
                      // Defer navigation — Popover stays mounted otherwise.
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
  tool: SocialToolDef | null
  open: boolean
  onOpenChange: (o: boolean) => void
  toast: ReturnType<typeof useToast>['toast']
  setView: (v: any) => void
}) {
  // Listen for the "navigate-integrations" CustomEvent fired by the NeedsApi popover.
  React.useEffect(() => {
    function handler() {
      setView({ name: 'integrations' })
    }
    window.addEventListener('navigate-integrations', handler)
    return () => window.removeEventListener('navigate-integrations', handler)
  }, [setView])

  if (!tool) return null

  // Social Hub — show a "coming soon" notice + Integrations link.
  if (tool.id === 'social-hub') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DynamicIcon name={tool.icon} className="size-4 text-forest" />
              {tool.label}
              <Badge variant="outline" className="text-forest border-forest/40">
                BUILT-IN
              </Badge>
            </DialogTitle>
            <DialogDescription>{tool.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border border-forest/30 bg-forest/5 p-4 text-sm text-foreground/90 leading-relaxed">
              <div className="flex items-start gap-2">
                <Leaf className="size-4 text-forest shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p>
                    Social Hub is coming soon. To pull real posts, comments, and DMs,
                    connect your social integrations first.
                  </p>
                  <p className="text-muted-foreground">
                    Once connected, this hub will show all your social accounts in one
                    place — schedule, draft, and track across Facebook, X, Instagram, and
                    LinkedIn.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button
                className="bg-forest text-primary-foreground hover:bg-forest/90"
                onClick={() => {
                  onOpenChange(false)
                  setView({ name: 'integrations' })
                }}
              >
                <Plug className="size-4" /> Connect integrations
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Social Profile Audit — URL input → POST /api/seo/check with { tool: 'headings', url }.
  if (tool.id === 'social-audit') {
    return (
      <SocialAuditDialog tool={tool} open={open} onOpenChange={onOpenChange} toast={toast} />
    )
  }

  // Needs integration (no real run) — show the needs-API notice.
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
                    then come back here. Built-in tools above need no setup — they run
                    directly inside VirtuaLab Digital.
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
      <SocialAiDialog tool={tool} open={open} onOpenChange={onOpenChange} toast={toast} />
    )
  }

  // Fallback — close.
  return null
}

/* ------------------------------------------------------------------ */
/* AI dialog for input: 'text' tools                                   */
/* ------------------------------------------------------------------ */

function SocialAiDialog({
  tool,
  open,
  onOpenChange,
  toast,
}: {
  tool: SocialToolDef
  open: boolean
  onOpenChange: (o: boolean) => void
  toast: ReturnType<typeof useToast>['toast']
}) {
  const spec = getSocialPromptSpec(tool.id)
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
            <Label htmlFor={`social-ai-${tool.id}`} className="text-xs text-muted-foreground">
              Context <span className="text-destructive ml-0.5">*</span>
            </Label>
            {spec.textarea ? (
              <Textarea
                id={`social-ai-${tool.id}`}
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
                id={`social-ai-${tool.id}`}
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
                    onClick={() => downloadTextFile(`${tool.id}.txt`, reply)}
                  >
                    <Download className="size-3" /> Download
                  </Button>
                </div>
              </div>
              <div
                className="rounded-lg border border-forest/30 bg-forest/5 p-4 text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto"
                style={{ scrollbarColor: 'var(--color-forest) transparent' }}
              >
                {reply}
              </div>
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

/* ------------------------------------------------------------------ */
/* Social Profile Audit dialog — URL → /api/seo/check (headings)       */
/* ------------------------------------------------------------------ */

function SocialAuditDialog({
  tool,
  open,
  onOpenChange,
  toast,
}: {
  tool: SocialToolDef
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
      }) as Promise<CheckResultEnvelope>,
    onError: (err: Error) =>
      toast({ title: `${tool.label} failed`, description: err.message, variant: 'destructive' }),
  })

  React.useEffect(() => {
    if (!open) {
      setUrl('https://')
      mut.reset()
    }
  }, [open, mut])

  function run() {
    const u = url.trim()
    if (!u) {
      toast({ title: 'Enter a URL', variant: 'destructive' })
      return
    }
    if (!/^https?:\/\//i.test(u)) {
      toast({ title: 'URL must start with http:// or https://', variant: 'destructive' })
      return
    }
    mut.mutate({ tool: 'headings', url: u })
  }

  const result = mut.data?.result
  const headings = result?.headings as { h1: string[]; h2: string[]; h3: string[] } | undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DynamicIcon name={tool.icon} className="size-4 text-forest" />
            {tool.label}
            <Badge variant="outline" className="text-forest border-forest/40">Built-in</Badge>
          </DialogTitle>
          <DialogDescription>{tool.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !mut.isPending) run()
              }}
              placeholder="https://your-profile-url.com"
              className="flex-1"
            />
            <Button
              className="bg-forest text-primary-foreground hover:bg-forest/90 shrink-0"
              disabled={mut.isPending}
              onClick={run}
            >
              {mut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Globe className="size-4" />}
              Run check
            </Button>
          </div>

          {mut.isPending && (
            <div className="rounded-lg border border-forest/30 bg-forest/5 p-4 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="size-4 animate-spin text-forest" />
              Checking profile structure…
            </div>
          )}

          {mut.isError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
              {(mut.error as Error)?.message || 'Check failed.'}
            </div>
          )}

          {result && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                A quick profile structure check (reuses the SEO headings analyzer). For a full
                social audit, connect your social integration in Integrations.
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-forest/20 bg-forest/5 p-3">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">H1</p>
                  <p className="text-2xl font-semibold text-forest">{headings?.h1?.length ?? 0}</p>
                </div>
                <div className="rounded-lg border border-sage/30 bg-sage/10 p-3">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">H2</p>
                  <p className="text-2xl font-semibold text-moss">{headings?.h2?.length ?? 0}</p>
                </div>
                <div className="rounded-lg border border-terracotta/30 bg-terracotta/10 p-3">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">H3</p>
                  <p className="text-2xl font-semibold text-terracotta">{headings?.h3?.length ?? 0}</p>
                </div>
              </div>
              {headings && headings.h1.length > 0 && (
                <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs space-y-1 max-h-48 overflow-y-auto">
                  <p className="font-medium text-foreground mb-1">First H1 found</p>
                  <p className="text-foreground/90">{headings.h1[0]}</p>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => copyToClipboard(JSON.stringify(result, null, 2), 'Profile audit JSON', toast)}
              >
                <Copy className="size-3" /> Copy JSON
              </Button>
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
