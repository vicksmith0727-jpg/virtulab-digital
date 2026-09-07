'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Monitor,
  Tablet,
  Smartphone,
  Eye,
  Pencil,
  Save,
  Rocket,
  Check,
  Loader2,
  Settings2,
  PenLine,
  Wand2,
  Sparkles,
  ExternalLink,
  Bot,
  Copy,
  Globe,
  SearchCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  ArrowRight,
  MousePointerClick,
  Code2,
  Columns2,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import type { BlockInstance } from '@/lib/seed'
import { BlockRenderer } from './block-renderer'
import { Canvas } from './canvas'
import { BlockPalette } from './block-palette'
import { PropertiesPanel } from './properties-panel'
import { PreviewFrame } from './preview-frame'
import { CodeEditor, blocksToHtml, parseHtmlToBlocks } from './code-editor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { fetchJson } from '@/lib/client-utils'

/* ------------------------------------------------------------------ */

interface PageData {
  page: {
    id: string
    projectId: string
    name: string
    slug: string
    blocks: BlockInstance[]
    isHome: boolean
    metaTitle?: string | null
    metaDesc?: string | null
    updatedAt: string
  }
}

interface ProjectData {
  project: {
    id: string
    name: string
    subdomain?: string | null
    description?: string | null
    status: 'draft' | 'published'
    updatedAt: string
  }
  pages: { id: string; name: string; slug: string; isHome: boolean }[]
}

interface IntegrationLite {
  id: string
  name: string
  category: string
}

interface ConnectionLite {
  id: string
  integrationId: string
  enabled: boolean
  integration: IntegrationLite
}

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

type WpTarget = 'self' | 'main'

/* ---- SEO audit (compact dialog) --------------------------------------- */
type SeoCheckStatus = 'pass' | 'warn' | 'fail' | 'info'
interface SeoCheckLite {
  id: string
  title: string
  status: SeoCheckStatus
  message: string
  score: number
}
interface SeoAuditLite {
  url: string
  overallScore: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  checks: SeoCheckLite[]
  httpStatus: number
  ttfbMs: number
  totalTimeMs: number
}
const BUILDER_GRADE_STYLES: Record<string, string> = {
  A: 'bg-forest text-primary-foreground',
  B: 'bg-sage text-foreground',
  C: 'bg-clay text-primary-foreground',
  D: 'bg-terracotta text-primary-foreground',
  F: 'bg-destructive text-destructive-foreground',
}
const BUILDER_GRADE_LABEL: Record<string, string> = {
  A: 'Excellent',
  B: 'Good',
  C: 'Fair',
  D: 'Needs work',
  F: 'Critical',
}
function BuilderSeoStatusIcon({ status }: { status: SeoCheckStatus }) {
  if (status === 'pass') return <CheckCircle2 className="size-4 text-forest shrink-0 mt-0.5" />
  if (status === 'warn') return <AlertTriangle className="size-4 text-clay shrink-0 mt-0.5" />
  if (status === 'fail') return <XCircle className="size-4 text-destructive shrink-0 mt-0.5" />
  return <Info className="size-4 text-muted-foreground shrink-0 mt-0.5" />
}

/* ------------------------------------------------------------------ */

export function BuilderView({ projectId, pageId }: { projectId: string; pageId?: string }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const previewDevice = useAppStore((s) => s.previewDevice)
  const setPreviewDevice = useAppStore((s) => s.setPreviewDevice)
  const previewMode = useAppStore((s) => s.previewMode)
  const setPreviewMode = useAppStore((s) => s.setPreviewMode)
  const selectedBlockId = useAppStore((s) => s.selectedBlockId)
  const setSelectedBlockId = useAppStore((s) => s.setSelectedBlockId)
  const setView = useAppStore((s) => s.setView)
  const builderMode = useAppStore((s) => s.builderMode)
  const setBuilderMode = useAppStore((s) => s.setBuilderMode)

  // Integrations query — used to detect whether WordPress is connected.
  const integrationsQuery = useQuery<{
    integrations: IntegrationLite[]
    connections: ConnectionLite[]
  }>({
    queryKey: ['integrations'],
    queryFn: () => fetchJson('/api/integrations'),
  })

  const wpConnection = React.useMemo(() => {
    const conns = integrationsQuery.data?.connections ?? []
    return conns.find(
      (c) => c.integration?.name === 'WordPress' && c.enabled,
    )
  }, [integrationsQuery.data])

  // Agency config — used to detect whether this install is a sub-domain
  // builder. If it is, the WordPress publish dialog gets a "Publish target"
  // selector (main agency website vs the user's own site).
  const agencyQuery = useQuery<AgencyData>({
    queryKey: ['agency'],
    queryFn: () => fetchJson('/api/agency'),
  })
  const agency = agencyQuery.data?.agency
  const isSubdomain = !!agency?.isSubdomain

  // WordPress publish dialog state
  const [wpOpen, setWpOpen] = React.useState(false)
  const [wpStatus, setWpStatus] = React.useState<'draft' | 'publish' | 'pending'>('draft')
  // Multi-builder: the user can pick ANY combination of WP builders. Defaults
  // to ['gutenberg'] (the universal fallback). Fetched from
  // /api/wordpress/builders (13 entries). The POST body sends `builders: string[]`.
  const [wpBuilders, setWpBuilders] = React.useState<string[]>(['gutenberg'])
  // Publish target defaults based on whether this is a subdomain install.
  // If isSubdomain → 'main' (route to the main agency website). Otherwise 'self'.
  const [wpTarget, setWpTarget] = React.useState<WpTarget>('self')

  // Fetch the 13 WP builders once on dialog open so we can render the
  // checkbox list. The endpoint also returns a "note" string we surface
  // below the list.
  const wpBuildersQuery = useQuery<{
    builders: { id: string; label: string; description: string }[]
    note?: string
  }>({
    queryKey: ['wp-builders'],
    queryFn: () => fetchJson('/api/wordpress/builders'),
    enabled: wpOpen,
  })

  // When agency config loads, set the default target to match it (once).
  React.useEffect(() => {
    if (agency) {
      setWpTarget(agency.isSubdomain ? 'main' : 'self')
    }
  }, [agency])

  const wpPublishMut = useMutation({
    mutationFn: (payload: {
      status: 'draft' | 'publish' | 'pending'
      builders: string[]
      target: WpTarget
      pageId?: string
    }) =>
      fetchJson(`/api/export/${projectId}/wordpress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: (data: any) => {
      // Build a friendly list of selected builder labels for the toast title.
      const allBuilders = wpBuildersQuery.data?.builders ?? []
      const selectedLabels = wpBuilders
        .map((id) => allBuilders.find((b) => b.id === id)?.label ?? id)
        // Capitalize fallback IDs that aren't in the catalog (defensive).
        .map((label) =>
          label && /[a-z]/.test(label[0]) && label === label.toLowerCase()
            ? label.charAt(0).toUpperCase() + label.slice(1)
            : label,
        )
      const buildersLabel =
        selectedLabels.length > 0 ? selectedLabels.join(', ') : 'Gutenberg'
      const targetLabel =
        data?.target === 'main' ? 'main agency site' : 'your site'
      const canonical: string | undefined = data?.canonical
      const link: string | undefined = data?.wordpress?.link
      const hasLink = !!link
      const hasCanonical = !!canonical

      // Build the toast description. Always mentions the target + builder.
      // If we have a canonical URL, surface it (it tells the user where the
      // page will be indexed).
      const descParts: React.ReactNode[] = []
      if (hasCanonical) {
        descParts.push(
          <span key="canonical" className="block text-xs text-muted-foreground">
            Canonical: {canonical}
          </span>,
        )
      }
      if (hasLink) {
        descParts.push(
          <a
            key="link"
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 underline text-forest"
          >
            Open page <ExternalLink className="size-3" />
          </a>,
        )
      }

      toast({
        title: `Published to ${targetLabel} via ${buildersLabel}`,
        description: descParts.length > 0 ? <>{descParts}</> : undefined,
      })
      setWpOpen(false)
    },
    onError: (err: any) => {
      let msg: string = err?.message || ''
      // Try to extract a structured {error, detail} JSON payload from the text.
      try {
        const m = msg.match(/\{[\s\S]*?\}/)
        if (m) {
          const parsed = JSON.parse(m[0])
          if (parsed?.error) {
            msg = parsed.detail
              ? `${parsed.error}: ${parsed.detail}`
              : parsed.error
          }
        }
      } catch {
        /* ignore — fall back to raw message below */
      }
      // If the response looks like an HTML error page or is excessively long,
      // show a friendly fallback so the toast doesn't dump a stack trace.
      if (
        msg.length > 200 ||
        msg.toLowerCase().includes('<!doctype') ||
        msg.toLowerCase().includes('<html')
      ) {
        msg = 'Could not reach WordPress. Check your connection settings and try again.'
      }
      toast({
        title: 'WordPress publish failed',
        description: msg || 'Please try again.',
        variant: 'destructive',
      })
    },
  })

  // AI Tool Router dialog state (builder contextualized)
  const [aiOpen, setAiOpen] = React.useState(false)
  const [aiGoal, setAiGoal] = React.useState('')
  const [aiReply, setAiReply] = React.useState<string | null>(null)
  const aiChatMut = useMutation({
    mutationFn: (payload: { messages: { role: 'user' | 'assistant'; content: string }[] }) =>
      fetchJson('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: (data: any) => setAiReply(data?.reply ?? 'No reply.'),
    onError: () =>
      toast({
        title: 'Assistant unavailable',
        description: 'Could not reach the AI assistant.',
        variant: 'destructive',
      }),
  })

  function submitAiGoal() {
    const projectName = projectQuery.data?.project.name ?? 'my site'
    const goal = aiGoal.trim() || `What should I connect for a ${projectName} site?`
    setAiReply(null)
    aiChatMut.mutate({
      messages: [
        {
          role: 'user',
          content: `I'm building "${projectName}" — a site I'm designing right now in the VirtuaLab Digital builder. ${goal} Which integrations should I connect?`,
        },
      ],
    })
  }

  // Zeroclaw task runner — detects connection via /api/zeroclaw/run GET,
  // then POSTs autonomous tasks. Dialog stays open so users can run another task.
  const zeroclawQuery = useQuery<{ connected: boolean; endpoint: string | null }>({
    queryKey: ['zeroclaw'],
    queryFn: () => fetchJson('/api/zeroclaw/run'),
  })
  const zeroclawConnected = !!zeroclawQuery.data?.connected

  const [zcOpen, setZcOpen] = React.useState(false)
  const [zcTask, setZcTask] = React.useState('')
  const [zcReply, setZcReply] = React.useState<string | null>(null)
  const zcRunMut = useMutation({
    mutationFn: (payload: { task: string }) =>
      fetchJson('/api/zeroclaw/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: (data: any) => {
      setZcReply(data?.response ?? 'No response.')
    },
    onError: (err: any) => {
      let msg: string = err?.message || 'Zeroclaw task failed.'
      try {
        const m = msg.match(/\{[\s\S]*?\}/)
        if (m) {
          const parsed = JSON.parse(m[0])
          if (parsed?.error) msg = parsed.error
        }
      } catch {
        /* ignore */
      }
      if (
        msg.length > 200 ||
        msg.toLowerCase().includes('<!doctype') ||
        msg.toLowerCase().includes('<html')
      ) {
        msg = 'Could not reach the Zeroclaw agent. Check your connection in Integrations.'
      }
      toast({
        title: 'Zeroclaw task failed',
        description: msg,
        variant: 'destructive',
      })
    },
  })

  function submitZcTask() {
    const task = zcTask.trim()
    if (!task) return
    setZcReply(null)
    zcRunMut.mutate({ task })
  }

  function copyZcReply() {
    if (!zcReply) return
    navigator.clipboard
      ?.writeText(zcReply)
      .then(() => toast({ title: 'Copied to clipboard' }))
      .catch(() => toast({ title: 'Could not copy', variant: 'destructive' }))
  }

  // SEO Audit dialog state — runs /api/seo/audit against the current project
  // (uses the project's published URL via the agency main domain), shows the
  // score + a compact checks list, with a "Full report" link that jumps to the
  // SEO Tools view.
  const [seoOpen, setSeoOpen] = React.useState(false)
  const [seoAudit, setSeoAudit] = React.useState<SeoAuditLite | null>(null)
  const seoAuditMut = useMutation({
    mutationFn: () =>
      fetchJson('/api/seo/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      }),
    onSuccess: (data: { ok: boolean; result: SeoAuditLite }) => {
      setSeoAudit(data.result)
      toast({
        title: `Audit complete — ${data.result.overallScore}/100 (grade ${data.result.grade})`,
        description: `Checked ${data.result.checks.length} items in ${Math.round(data.result.totalTimeMs / 100) / 10}s.`,
      })
    },
    onError: (err: Error) =>
      toast({
        title: 'SEO audit failed',
        description: err.message,
        variant: 'destructive',
      }),
  })

  function openSeoAudit() {
    setSeoOpen(true)
    if (!seoAudit && !seoAuditMut.isPending) {
      seoAuditMut.mutate()
    }
  }

  // 1) Load the project to discover pages
  const projectQuery = useQuery<ProjectData>({
    queryKey: ['project', projectId],
    queryFn: () => fetchJson(`/api/projects/${projectId}`),
  })

  const resolvedPageId =
    pageId ??
    projectQuery.data?.pages.find((p) => p.isHome)?.id ??
    projectQuery.data?.pages[0]?.id

  // 2) Load the page with blocks
  const pageQuery = useQuery<PageData>({
    queryKey: ['page', projectId, resolvedPageId],
    queryFn: () => fetchJson(`/api/projects/${projectId}/pages/${resolvedPageId}`),
    enabled: !!resolvedPageId,
  })

  // 3) Local state for editing
  const [blocks, setBlocks] = React.useState<BlockInstance[]>([])
  const [meta, setMeta] = React.useState({
    name: '',
    slug: '',
    metaTitle: '',
    metaDesc: '',
  })
  const [saveState, setSaveState] = React.useState<'idle' | 'saving' | 'saved'>('idle')
  const [publishing, setPublishing] = React.useState(false)
  const loadedRef = React.useRef(false)
  const skipNextSaveRef = React.useRef(true)

  // Code / Hybrid mode — the textarea content. In 'hybrid' mode, we keep this
  // synced with the blocks so the user can see the generated HTML. In 'code'
  // mode, the user writes HTML and clicks "Apply to canvas" to parse it back
  // into blocks. `codeSynced` tracks whether the textarea reflects the
  // current blocks (true) or has unsynced user edits (false).
  const [codeText, setCodeText] = React.useState('')
  const codeSyncedRef = React.useRef(true)
  const [codeApplying, setCodeApplying] = React.useState(false)

  // When page data arrives, push into local state (once per page load)
  React.useEffect(() => {
    if (pageQuery.data?.page) {
      const p = pageQuery.data.page
      setBlocks(p.blocks ?? [])
      setMeta({
        name: p.name ?? '',
        slug: p.slug ?? '',
        metaTitle: p.metaTitle ?? '',
        metaDesc: p.metaDesc ?? '',
      })
      loadedRef.current = true
      skipNextSaveRef.current = true
    }
  }, [pageQuery.data])

  // 4) Debounced autosave
  const saveMutation = useMutation({
    mutationFn: (payload: any) =>
      fetchJson(`/api/projects/${projectId}/pages/${resolvedPageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setSaveState('saved')
      queryClient.invalidateQueries({ queryKey: ['page', projectId, resolvedPageId] })
      setTimeout(() => setSaveState('idle'), 1500)
    },
    onError: () => {
      setSaveState('idle')
      toast({
        title: 'Save failed',
        description: 'Could not save your page. Please try again.',
        variant: 'destructive',
      })
    },
  })

  React.useEffect(() => {
    if (!loadedRef.current) return
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false
      return
    }
    setSaveState('saving')
    const t = setTimeout(() => {
      saveMutation.mutate({ blocks })
    }, 1500)
    return () => clearTimeout(t)
  }, [blocks])

  // 5) Save meta changes immediately on blur (lighter debounce)
  function commitMeta() {
    if (!loadedRef.current) return
    saveMutation.mutate(meta)
  }

  async function handlePublish() {
    setPublishing(true)
    try {
      await fetchJson(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'published' }),
      })
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      toast({
        title: 'Published',
        description: 'Your site is now live on the organic web.',
      })
    } catch {
      toast({
        title: 'Publish failed',
        description: 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setPublishing(false)
    }
  }

  function forceSave() {
    if (!loadedRef.current) return
    saveMutation.mutate({ blocks })
  }

  function addBlock(block: BlockInstance) {
    setBlocks((prev) => [...prev, block])
    setSelectedBlockId(block.id)
  }

  // Code / Hybrid mode — parse the textarea HTML into blocks and replace the
  // page's blocks. Best-effort: if the HTML can't be parsed, toast an error
  // and leave the blocks unchanged.
  function applyCodeToBlocks() {
    setCodeApplying(true)
    try {
      const parsed = parseHtmlToBlocks(codeText)
      if (parsed.length === 0 && codeText.trim() !== '') {
        // Parser returned no blocks but the user did write something —
        // treat as a soft error so they get a chance to fix the HTML.
        throw new Error('No blocks could be parsed from the HTML.')
      }
      setBlocks(parsed)
      codeSyncedRef.current = true
      toast({
        title: `Applied ${parsed.length} block${parsed.length === 1 ? '' : 's'} to canvas`,
        description:
          parsed.length > 0
            ? undefined
            : 'The canvas is now empty. Add blocks via drag & drop or paste more HTML.',
      })
    } catch (err: any) {
      toast({
        title: 'Could not parse HTML',
        description:
          (err?.message as string) || 'Check your HTML syntax and try again.',
        variant: 'destructive',
      })
    } finally {
      setCodeApplying(false)
    }
  }

  // When entering 'code' or 'hybrid' mode, seed the textarea with the current
  // blocks as HTML. In 'hybrid' mode, also re-sync whenever the blocks change
  // (unless the user has unsynced edits in the textarea — we don't want to
  // clobber their work).
  React.useEffect(() => {
    if (builderMode === 'code' || builderMode === 'hybrid') {
      if (codeSyncedRef.current) {
        setCodeText(blocksToHtml(blocks))
      }
    }
  }, [builderMode, blocks])

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) ?? null

  const isDraft = projectQuery.data?.project.status === 'draft'

  /* ---- loading skeleton ---- */
  if (projectQuery.isLoading || pageQuery.isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-10">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
          <p className="text-sm text-muted-foreground text-center">
            Preparing your studio…
          </p>
        </div>
      </div>
    )
  }

  if (projectQuery.isError || pageQuery.isError) {
    return (
      <div className="flex-1 flex items-center justify-center p-10">
        <div className="text-center max-w-sm">
          <h3 className="text-lg font-semibold text-foreground">Couldn&rsquo;t load this project</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {(projectQuery.error as Error)?.message || (pageQuery.error as Error)?.message}
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setView({ name: 'dashboard' })}
          >
            Back to dashboard
          </Button>
        </div>
      </div>
    )
  }

  /* ---- render ---- */
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Toolbar */}
      <div className="border-b border-border bg-card px-3 sm:px-4 py-2 flex items-center gap-2 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setView({ name: 'dashboard' })}
          className="text-muted-foreground"
        >
          <ArrowLeft className="size-4" /> Back
        </Button>

        <div className="h-5 w-px bg-border mx-1" />

        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground truncate max-w-[40vw]">
            {projectQuery.data?.project.name ?? 'Untitled'}
          </div>
          <div className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
            <span className="truncate">{pageQuery.data?.page.name ?? 'Page'}</span>
            <Badge
              variant="outline"
              className={cn(
                'h-4 px-1.5 text-[10px]',
                isDraft ? 'text-muted-foreground' : 'text-forest border-forest/40',
              )}
            >
              {isDraft ? 'Draft' : 'Published'}
            </Badge>
          </div>
        </div>

        <div className="flex-1" />

        {/* Save indicator */}
        <div className="hidden sm:flex items-center text-xs text-muted-foreground gap-1.5 mr-1">
          {saveState === 'saving' && (
            <>
              <Loader2 className="size-3 animate-spin" /> Saving…
            </>
          )}
          {saveState === 'saved' && (
            <>
              <Check className="size-3 text-forest" /> Saved
            </>
          )}
          {saveState === 'idle' && <span>Saved</span>}
        </div>

        {/* Device toggle */}
        <div className="inline-flex items-center rounded-md border border-border bg-background p-0.5">
          {[
            { id: 'desktop', icon: Monitor, label: 'Desktop' },
            { id: 'tablet', icon: Tablet, label: 'Tablet' },
            { id: 'mobile', icon: Smartphone, label: 'Mobile' },
          ].map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setPreviewDevice(d.id as any)}
              aria-label={d.label}
              className={cn(
                'size-7 rounded flex items-center justify-center transition',
                previewDevice === d.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
            >
              <d.icon className="size-3.5" />
            </button>
          ))}
        </div>

        {/* Builder mode switcher — Drag & Drop | Pure Code | Hybrid.
            Forest-styled 3-segment toggle. The selected mode is stored in the
            Zustand store so it persists across builder sessions. */}
        <div
          className="inline-flex items-center rounded-md border border-forest/30 bg-forest/5 p-0.5"
          role="group"
          aria-label="Builder mode"
        >
          {[
            {
              id: 'drag-drop' as const,
              icon: MousePointerClick,
              label: 'Drag & Drop',
              hint: 'Visual canvas — drag blocks, edit text inline.',
            },
            {
              id: 'code' as const,
              icon: Code2,
              label: 'Pure Code',
              hint: 'Write raw HTML directly — full control, no canvas.',
            },
            {
              id: 'hybrid' as const,
              icon: Columns2,
              label: 'Hybrid',
              hint: 'Split view — drag & drop on top, code editor below.',
            },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setBuilderMode(m.id)}
              aria-label={m.label}
              aria-pressed={builderMode === m.id}
              title={m.hint}
              className={cn(
                'h-7 px-2 sm:px-2.5 rounded flex items-center gap-1 transition text-xs font-medium',
                builderMode === m.id
                  ? 'bg-forest text-primary-foreground shadow-sm'
                  : 'text-forest/80 hover:text-forest hover:bg-forest/10',
              )}
            >
              <m.icon className="size-3.5" />
              <span className="hidden lg:inline">{m.label}</span>
            </button>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setPreviewMode(!previewMode)}
          disabled={builderMode !== 'drag-drop'}
          title={
            builderMode !== 'drag-drop'
              ? 'Preview is only available in Drag & Drop mode'
              : undefined
          }
        >
          {previewMode ? <Pencil className="size-4" /> : <Eye className="size-4" />}
          <span className="hidden sm:inline">{previewMode ? 'Edit' : 'Preview'}</span>
        </Button>

        {/* AI Tool Router — recommends integrations for this project */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAiOpen(true)}
          title="Ask the assistant which tools to connect"
        >
          <Wand2 className="size-4 text-forest" />
          <span className="hidden sm:inline">AI Router</span>
        </Button>

        {/* WordPress publish — opens dialog */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setWpOpen(true)}
          title="Publish this page to WordPress"
        >
          <PenLine className="size-4 text-forest" />
          <span className="hidden sm:inline">WordPress</span>
        </Button>

        {/* SEO Audit — runs the built-in audit against the current project */}
        <Button
          variant="outline"
          size="sm"
          onClick={openSeoAudit}
          title="Run a built-in SEO audit against this project"
        >
          <SearchCheck className="size-4 text-forest" />
          <span className="hidden sm:inline">SEO Audit</span>
        </Button>

        {/* Zeroclaw — autonomous task runner */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setZcOpen(true)}
          title="Run an autonomous task with Zeroclaw"
        >
          <Bot className="size-4 text-forest" />
          <span className="hidden sm:inline">Zeroclaw</span>
        </Button>

        <Button variant="ghost" size="sm" onClick={forceSave} disabled={saveState === 'saving'}>
          <Save className="size-4" />
          <span className="hidden sm:inline">Save</span>
        </Button>

        <Button
          size="sm"
          onClick={handlePublish}
          disabled={publishing}
          className="bg-forest text-primary-foreground hover:bg-forest/90"
        >
          {publishing ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}
          <span className="hidden sm:inline">Publish</span>
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 flex min-h-0">
        {builderMode === 'code' ? (
          /* Pure Code mode — full-width HTML editor. The user writes raw HTML
             and clicks "Apply to canvas" to parse it into blocks. Preview /
             palette / properties are hidden in this mode. */
          <div className="flex-1 flex flex-col min-h-0 bg-muted/20">
            <div className="px-4 pt-3 pb-2 text-xs text-muted-foreground bg-card/60 border-b border-border">
              <span className="font-medium text-foreground">Pure Code mode</span>{' '}
              — write HTML below, then click <span className="font-medium text-forest">Apply to canvas</span>. Switch back to <span className="font-medium text-forest">Drag &amp; Drop</span> in the toolbar to use the visual editor.
            </div>
            <div className="flex-1 min-h-0 p-3">
              <CodeEditor
                value={codeText}
                onChange={(v) => {
                  setCodeText(v)
                  codeSyncedRef.current = false
                }}
                onApply={applyCodeToBlocks}
                applyLabel="Apply to canvas"
                syncing={codeApplying}
                minClassName="min-h-[400px]"
              />
            </div>
          </div>
        ) : builderMode === 'hybrid' ? (
          /* Hybrid mode — split view. Top half is the full visual canvas
             (palette + canvas + properties). Bottom half is the code editor
             showing the current blocks as HTML. Edits in either side update
             the other when the user clicks Sync to canvas. */
          <div className="flex-1 flex flex-col min-h-0">
            {/* Top — visual canvas */}
            <div className="flex-1 flex min-h-0 border-b border-border">
              <aside className="w-60 hidden md:flex flex-col shrink-0">
                <BlockPalette onAdd={addBlock} />
              </aside>
              <div className="flex-1 min-h-0 overflow-auto bg-muted/30">
                <PreviewFrame>
                  <Canvas
                    blocks={blocks}
                    onChange={setBlocks}
                    selectedBlockId={selectedBlockId}
                    onSelect={setSelectedBlockId}
                  />
                </PreviewFrame>
              </div>
              <aside className="w-72 lg:w-80 shrink-0 border-l border-border flex flex-col">
                {selectedBlock ? (
                  <PropertiesPanel
                    block={selectedBlock}
                    onChange={(props) =>
                      setBlocks((prev) =>
                        prev.map((b) => (b.id === selectedBlock.id ? { ...b, props } : b)),
                      )
                    }
                    onClose={() => setSelectedBlockId(null)}
                  />
                ) : (
                  <ProjectSettingsPanel
                    meta={meta}
                    onChange={setMeta}
                    onCommit={commitMeta}
                    saving={saveState === 'saving'}
                  />
                )}
              </aside>
            </div>
            {/* Bottom — code editor (read-only-ish: shows generated HTML,
                but the user can edit + click Sync to parse back). */}
            <div className="flex-1 min-h-0">
              <CodeEditor
                value={codeText}
                onChange={(v) => {
                  setCodeText(v)
                  codeSyncedRef.current = false
                }}
                onApply={applyCodeToBlocks}
                applyLabel="Sync to canvas"
                syncing={codeApplying}
              />
            </div>
          </div>
        ) : previewMode ? (
          /* Drag & Drop + Preview mode — only canvas centered */
          <div className="flex-1 min-h-0 overflow-auto bg-muted/30">
            <PreviewFrame>
              <div onClick={() => setSelectedBlockId(null)}>
                {blocks.map((b) => (
                  <BlockRenderer key={b.id} block={b} />
                ))}
                {blocks.length === 0 && (
                  <div className="p-16 text-center text-muted-foreground">
                    Nothing to preview yet. Add blocks to your page.
                  </div>
                )}
              </div>
            </PreviewFrame>
          </div>
        ) : (
          <>
            {/* Palette */}
            <aside className="w-60 hidden md:flex flex-col shrink-0">
              <BlockPalette onAdd={addBlock} />
            </aside>

            {/* Canvas */}
            <div className="flex-1 min-h-0 overflow-auto bg-muted/30">
              <PreviewFrame>
                <Canvas
                  blocks={blocks}
                  onChange={setBlocks}
                  selectedBlockId={selectedBlockId}
                  onSelect={setSelectedBlockId}
                />
              </PreviewFrame>
            </div>

            {/* Right panel */}
            <aside className="w-72 lg:w-80 shrink-0 border-l border-border flex flex-col">
              {selectedBlock ? (
                <PropertiesPanel
                  block={selectedBlock}
                  onChange={(props) =>
                    setBlocks((prev) =>
                      prev.map((b) => (b.id === selectedBlock.id ? { ...b, props } : b)),
                    )
                  }
                  onClose={() => setSelectedBlockId(null)}
                />
              ) : (
                <ProjectSettingsPanel
                  meta={meta}
                  onChange={setMeta}
                  onCommit={commitMeta}
                  saving={saveState === 'saving'}
                />
              )}
            </aside>
          </>
        )}
      </div>

      {/* WordPress publish dialog */}
      <Dialog open={wpOpen} onOpenChange={setWpOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenLine className="size-4 text-forest" /> Publish to WordPress
            </DialogTitle>
            <DialogDescription>
              Push this page to your connected WordPress site as a new page.
            </DialogDescription>
          </DialogHeader>

          {!wpConnection ? (
            <div className="space-y-4">
              <p className="text-sm text-foreground/80">
                Connect WordPress in Integrations first to publish pages directly to your site.
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setWpOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-forest text-primary-foreground hover:bg-forest/90"
                  onClick={() => {
                    setWpOpen(false)
                    setView({ name: 'integrations' })
                  }}
                >
                  Go to Integrations
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Publish target — only shown when this builder is a sub-domain
                  offering of a parent agency. Lets the user pick between pushing
                  the page to the main agency website (so traffic + canonical
                  point there) vs their own connected WordPress site. */}
              {isSubdomain && agency && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Publish target
                  </Label>
                  <RadioGroup
                    value={wpTarget}
                    onValueChange={(v) => setWpTarget(v as WpTarget)}
                    className="grid gap-2"
                  >
                    <label
                      htmlFor="wp-target-main"
                      className={cn(
                        'flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition',
                        wpTarget === 'main'
                          ? 'border-forest bg-forest/5'
                          : 'border-border bg-card hover:border-forest/40',
                      )}
                    >
                      <RadioGroupItem
                        id="wp-target-main"
                        value="main"
                        className="mt-0.5"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground flex items-center gap-1.5">
                          <Globe className="size-3.5 text-forest" />
                          Main agency website
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                          Publish to {agency.name}&rsquo;s main site at {agency.mainDomain}. Traffic
                          routes to the main website.
                        </p>
                      </div>
                    </label>
                    <label
                      htmlFor="wp-target-self"
                      className={cn(
                        'flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition',
                        wpTarget === 'self'
                          ? 'border-forest bg-forest/5'
                          : 'border-border bg-card hover:border-forest/40',
                      )}
                    >
                      <RadioGroupItem
                        id="wp-target-self"
                        value="self"
                        className="mt-0.5"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground">
                          My own site
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                          Publish to your connected WordPress site.
                        </p>
                      </div>
                    </label>
                  </RadioGroup>
                  {wpTarget === 'main' && (
                    <p className="text-xs text-forest/90 bg-forest/5 border border-forest/20 rounded-md px-3 py-2 leading-relaxed">
                      The canonical URL points to {agency.mainDomain} so search
                      engines index the page on the MAIN website.
                    </p>
                  )}
                </div>
              )}

              {/* Builders — multi-checkbox list. The user can pick ANY
                  combination (Gutenberg + Kadence + Elementor + Astra …).
                  Defaults to ['gutenberg']. Fetched from
                  /api/wordpress/builders (13 entries). The POST body sends
                  `builders: string[]` to /api/export/[id]/wordpress. */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">
                    Builders
                  </Label>
                  <span className="text-[10px] uppercase tracking-wider text-forest font-medium">
                    {wpBuilders.length} builder{wpBuilders.length === 1 ? '' : 's'} selected
                  </span>
                </div>

                {wpBuildersQuery.isLoading ? (
                  <div className="rounded-md border border-border bg-card p-3 text-xs text-muted-foreground flex items-center gap-2">
                    <Loader2 className="size-3.5 animate-spin text-forest" />
                    Loading builders…
                  </div>
                ) : wpBuildersQuery.isError ? (
                  <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
                    Could not load the builder list.{' '}
                    <button
                      type="button"
                      className="underline"
                      onClick={() => wpBuildersQuery.refetch()}
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <div
                    className="max-h-64 overflow-y-auto rounded-md border border-border bg-card divide-y divide-border"
                    style={{ scrollbarColor: 'var(--color-forest) transparent' }}
                  >
                    {(wpBuildersQuery.data?.builders ?? []).map((b) => {
                      const checked = wpBuilders.includes(b.id)
                      return (
                        <label
                          key={b.id}
                          htmlFor={`wp-builder-${b.id}`}
                          className={cn(
                            'flex items-start gap-3 p-3 cursor-pointer transition',
                            checked
                              ? 'bg-forest/5'
                              : 'hover:bg-muted/40',
                          )}
                        >
                          <Checkbox
                            id={`wp-builder-${b.id}`}
                            checked={checked}
                            onCheckedChange={(v) => {
                              if (v) {
                                setWpBuilders((prev) =>
                                  prev.includes(b.id) ? prev : [...prev, b.id],
                                )
                              } else {
                                // Don't allow the user to deselect the last
                                // builder — the API requires at least one.
                                setWpBuilders((prev) => {
                                  const next = prev.filter((id) => id !== b.id)
                                  return next.length === 0 ? prev : next
                                })
                              }
                            }}
                            className="mt-0.5 data-[state=checked]:bg-forest data-[state=checked]:border-forest"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-foreground">
                              {b.label}
                            </div>
                            <div className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                              {b.description}
                            </div>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                )}

                <p className="text-xs text-muted-foreground leading-relaxed">
                  Pick any combination. The export always includes a Gutenberg
                  Custom HTML fallback so the page renders even if a builder
                  plugin is inactive.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="wp-status" className="text-xs text-muted-foreground">
                  Status
                </Label>
                <Select
                  value={wpStatus}
                  onValueChange={(v) => setWpStatus(v as 'draft' | 'publish' | 'pending')}
                >
                  <SelectTrigger id="wp-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="publish">Publish</SelectItem>
                    <SelectItem value="pending">Pending review</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                All exports include lazy-load images, OpenGraph + Twitter meta,
                JSON-LD LocalBusiness schema, and a canonical link for SEO.
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setWpOpen(false)} disabled={wpPublishMut.isPending}>
                  Cancel
                </Button>
                <Button
                  className="bg-forest text-primary-foreground hover:bg-forest/90"
                  disabled={wpPublishMut.isPending || wpBuilders.length === 0}
                  onClick={() =>
                    wpPublishMut.mutate({
                      status: wpStatus,
                      builders: wpBuilders,
                      target: wpTarget,
                      pageId: pageQuery.data?.page?.id,
                    })
                  }
                >
                  {wpPublishMut.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <PenLine className="size-4" />
                  )}
                  Publish to WordPress
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* AI Tool Router dialog */}
      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-forest" /> AI Tool Router
            </DialogTitle>
            <DialogDescription>
              Describe your goal and the assistant picks the right tools to connect.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={aiGoal}
                onChange={(e) => setAiGoal(e.target.value)}
                placeholder="e.g. collect newsletter signups and track traffic"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !aiChatMut.isPending) submitAiGoal()
                }}
              />
              <Button
                className="bg-forest text-primary-foreground hover:bg-forest/90 shrink-0"
                disabled={aiChatMut.isPending}
                onClick={submitAiGoal}
              >
                {aiChatMut.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Wand2 className="size-4" />
                )}
                Ask
              </Button>
            </div>

            {aiChatMut.isPending && !aiReply && (
              <div className="rounded-lg border border-border bg-forest/5 p-4 text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="size-4 animate-spin text-forest" />
                Asking the assistant…
              </div>
            )}

            {aiReply && (
              <div className="rounded-lg border border-forest/30 bg-forest/5 p-4 text-sm text-foreground/90 whitespace-pre-wrap">
                {renderReplyWithIntegrationChips(aiReply, () => {
                  setAiOpen(false)
                  setView({ name: 'integrations' })
                })}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Tap a tool name to open Integrations and connect it.
            </p>
            <p className="text-xs text-forest/80 bg-forest/5 border border-forest/20 rounded-md px-3 py-2">
              Tip: open-source tools (Ollama, n8n, Zeroclaw, OpenCode) are
              auto-detected — no manual setup. See Integrations → Auto-detect.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Zeroclaw task runner dialog */}
      <Dialog open={zcOpen} onOpenChange={setZcOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="size-4 text-forest" /> Run with Zeroclaw
            </DialogTitle>
            <DialogDescription>
              Dispatch an autonomous task to your Zeroclaw agent and get a written response.
            </DialogDescription>
          </DialogHeader>

          {!zeroclawConnected ? (
            <div className="space-y-4">
              <p className="text-sm text-foreground/80">
                Connect Zeroclaw in Integrations first.
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setZcOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-forest text-primary-foreground hover:bg-forest/90"
                  onClick={() => {
                    setZcOpen(false)
                    setView({ name: 'integrations' })
                  }}
                >
                  Go to Integrations
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="zc-task" className="text-xs text-muted-foreground">
                  Task
                </Label>
                <Textarea
                  id="zc-task"
                  value={zcTask}
                  onChange={(e) => setZcTask(e.target.value)}
                  placeholder="Describe an autonomous task — e.g. 'Research the top 10 competitors for a {business type} in {city} and summarize their pricing' or 'Draft a 5-post content calendar for a local bakery'"
                  className="min-h-24 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  className="bg-forest text-primary-foreground hover:bg-forest/90"
                  disabled={zcRunMut.isPending || !zcTask.trim()}
                  onClick={submitZcTask}
                >
                  {zcRunMut.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Bot className="size-4" />
                  )}
                  Run task
                </Button>
              </div>

              {zcRunMut.isPending && !zcReply && (
                <div className="rounded-lg border border-border bg-forest/5 p-3 text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin text-forest" />
                  Zeroclaw is working on it…
                </div>
              )}

              {zcReply && (
                <div className="rounded-lg border border-forest/30 bg-forest/5 p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-medium text-forest uppercase tracking-wider">
                      Response
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={copyZcReply}
                    >
                      <Copy className="size-3" /> Copy
                    </Button>
                  </div>
                  <div
                    className="max-h-96 overflow-y-auto text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed pr-1"
                    style={{ scrollbarColor: 'var(--color-forest) transparent' }}
                  >
                    {zcReply}
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Zeroclaw runs on your 16GB laptop as an autonomous agent. Tasks may take 30s–2min.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* SEO Audit dialog — compact audit results + jump to full report */}
      <Dialog open={seoOpen} onOpenChange={setSeoOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SearchCheck className="size-4 text-forest" /> SEO Audit
            </DialogTitle>
            <DialogDescription>
              Built-in audit — fetches the project&rsquo;s published URL and checks 17 SEO
              signals. Takes ~10s.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {seoAuditMut.isPending && !seoAudit && (
              <div className="rounded-lg border border-forest/30 bg-forest/5 p-4 text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="size-4 animate-spin text-forest" />
                Auditing this project&rsquo;s published URL…
              </div>
            )}

            {seoAudit && (
              <>
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      'size-16 rounded-full flex flex-col items-center justify-center shrink-0',
                      BUILDER_GRADE_STYLES[seoAudit.grade],
                    )}
                  >
                    <span className="text-2xl font-bold leading-none">
                      {seoAudit.overallScore}
                    </span>
                    <span className="text-[10px] opacity-80 mt-0.5">/ 100</span>
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className={cn(
                          'font-semibold border-transparent',
                          BUILDER_GRADE_STYLES[seoAudit.grade],
                        )}
                      >
                        Grade {seoAudit.grade} · {BUILDER_GRADE_LABEL[seoAudit.grade] ?? ''}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        HTTP {seoAudit.httpStatus} · TTFB {seoAudit.ttfbMs}ms
                      </span>
                    </div>
                    <a
                      href={seoAudit.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-forest hover:underline truncate"
                    >
                      {seoAudit.url} <ExternalLink className="size-3 shrink-0" />
                    </a>
                  </div>
                </div>

                <div
                  className="max-h-72 overflow-y-auto space-y-1.5 pr-1"
                  style={{ scrollbarColor: 'var(--color-forest) transparent' }}
                >
                  {seoAudit.checks.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-start gap-2.5 rounded-md border border-border bg-card px-3 py-2 text-sm"
                    >
                      <BuilderSeoStatusIcon status={c.status} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-foreground">{c.title}</span>
                          <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                            {c.score}/100
                          </span>
                        </div>
                        <p className="text-xs text-foreground/80 mt-0.5 break-words">
                          {c.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                variant="outline"
                onClick={() => setSeoOpen(false)}
                disabled={seoAuditMut.isPending}
              >
                Close
              </Button>
              {seoAudit && (
                <Button
                  className="bg-forest text-primary-foreground hover:bg-forest/90"
                  onClick={() => {
                    setSeoOpen(false)
                    setView({ name: 'seo-tools' })
                  }}
                >
                  Full report <ArrowRight className="size-4" />
                </Button>
              )}
              {seoAudit && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={seoAuditMut.isPending}
                  onClick={() => {
                    setSeoAudit(null)
                    seoAuditMut.mutate()
                  }}
                >
                  Re-run
                </Button>
              )}
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ------------------------------------------------------------------ */

// Shared list of integration names from the catalog so we can hyperlink them in
// the AI's reply. Kept here so the builder dialog can also use it.
const KNOWN_INTEGRATION_NAMES = [
  'AI Copy (built-in)',
  'WordPress',
  'WordPress MCP Server',
  'Elementor MCP',
  'WordPress Plugin Boilerplate',
  'Microsoft MCP',
  'Google MCP',
  'Google Workspace MCP',
  'Google Analytics MCP (official)',
  'Google Ads MCP (official)',
  'Google Analytics MCP (community)',
  'Search Console MCP',
  'Bing Webmaster MCP',
  'One-Search MCP',
  'Open SEO',
  'Seonaut',
  'Google Search Console',
  'Bing Webmaster',
  'Facebook',
  'X (Twitter)',
  'Instagram',
  'LinkedIn',
  'Plausible',
  'Umami',
  'PostHog',
  'Tally',
  'Formspree',
  'MailerLite',
  'Buttondown',
  'Resend',
  'Stripe',
  'Lemon Squeezy',
  'n8n',
  'Zeroclaw',
  'Webhooks',
  'Make',
  'OpenCode',
  'Awesome OpenCode',
  'Cloudinary',
  'Uploadthing',
]

// Render the AI reply text, turning any known integration name into a clickable
// chip that triggers the supplied onChip handler (e.g. navigate to Integrations).
function renderReplyWithIntegrationChips(
  text: string,
  onChip: (name: string) => void,
): React.ReactNode {
  if (!text) return null
  // Build a single regex that matches any known name (longest first so e.g.
  // "Google Analytics MCP (official)" wins over "Google MCP").
  const sorted = [...KNOWN_INTEGRATION_NAMES].sort((a, b) => b.length - a.length)
  const escaped = sorted.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const re = new RegExp(`(${escaped.join('|')})`, 'g')

  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) {
      parts.push(text.slice(lastIndex, m.index))
    }
    const name = m[1]
    parts.push(
      <button
        key={`chip-${i++}-${m.index}`}
        type="button"
        onClick={() => onChip(name)}
        className="inline-flex items-center rounded-full border border-forest/40 bg-forest/10 px-2 py-0.5 text-xs font-medium text-forest hover:bg-forest/20 transition"
      >
        {name}
      </button>,
    )
    lastIndex = m.index + name.length
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return <>{parts}</>
}

/* ------------------------------------------------------------------ */

function ProjectSettingsPanel({
  meta,
  onChange,
  onCommit,
  saving,
}: {
  meta: { name: string; slug: string; metaTitle: string; metaDesc: string }
  onChange: (m: any) => void
  onCommit: () => void
  saving: boolean
}) {
  return (
    <div className="flex flex-col h-full bg-card">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Settings2 className="size-4 text-forest" />
          <h3 className="text-sm font-semibold text-foreground">Page settings</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Select a block to edit its content, or update this page&rsquo;s details below.
        </p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Page name</Label>
            <Input
              value={meta.name}
              onChange={(e) => onChange({ ...meta, name: e.target.value })}
              onBlur={onCommit}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Slug</Label>
            <Input
              value={meta.slug}
              onChange={(e) => onChange({ ...meta, slug: e.target.value })}
              onBlur={onCommit}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Meta title</Label>
            <Input
              value={meta.metaTitle}
              onChange={(e) => onChange({ ...meta, metaTitle: e.target.value })}
              onBlur={onCommit}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Meta description</Label>
            <Textarea
              value={meta.metaDesc}
              onChange={(e) => onChange({ ...meta, metaDesc: e.target.value })}
              onBlur={onCommit}
              className="min-h-16 text-sm"
            />
          </div>
          <div className="text-xs text-muted-foreground pt-2">
            {saving ? 'Saving…' : 'Changes save automatically on blur.'}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
