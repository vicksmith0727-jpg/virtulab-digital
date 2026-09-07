'use client'

import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as LucideIcons from 'lucide-react'
import {
  Loader2,
  Plus,
  Sparkles,
  Copy,
  Download,
  HelpCircle,
  Settings2,
  ArrowRight,
  Pencil,
  Trash2,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

async function fetchJson(url: string, opts?: RequestInit) {
  const res = await fetch(url, opts)
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(txt || `Request failed (${res.status})`)
  }
  return res.json()
}

function getLucideIcon(name?: string) {
  if (!name) return HelpCircle
  const ic = (LucideIcons as Record<string, any>)[name]
  return (ic as typeof HelpCircle) ?? HelpCircle
}

function DynamicIcon({ name, className }: { name?: string; className?: string }) {
  const Cmp = getLucideIcon(name)
  return React.createElement(Cmp as any, { className })
}

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

function downloadTextFile(filename: string, contents: string, mime = 'text/plain') {
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

/* ------------------------------------------------------------------ */
/* Custom tool type                                                    */
/* Mirrors the backend POST /api/tools/custom response.               */
/* ------------------------------------------------------------------ */

export interface CustomTool {
  id: string
  label: string
  description?: string
  iconKey?: string
  category: string
  endpoint: string
  input: string
  prompt?: string
  builtin: boolean
  ai?: boolean
  custom?: boolean
}

/* ------------------------------------------------------------------ */
/* Common lucide icon list for the datalist in the form                */
/* ------------------------------------------------------------------ */

const COMMON_ICONS: string[] = [
  'Wrench',
  'Network',
  'Brain',
  'Globe',
  'Flag',
  'Sparkles',
  'Search',
  'FileText',
  'PenLine',
  'Code2',
  'Braces',
  'Map',
  'MapPin',
  'Gauge',
  'Smartphone',
  'Bot',
  'Radar',
  'Share2',
  'Users',
  'TrendingUp',
  'Hash',
  'BookOpen',
  'Type',
  'AlignLeft',
  'RefreshCw',
  'HelpCircle',
  'ListChecks',
  'Calendar',
  'Clock',
  'FolderKanban',
  'CheckSquare',
  'Repeat',
  'BarChart3',
  'Zap',
  'Plug',
  'Leaf',
  'Sprout',
  'Workflow',
  'Send',
  'MessageSquare',
]

/* ------------------------------------------------------------------ */
/* Category catalog — every category the form can target              */
/* Used to populate the Category <select> in the dialog.              */
/* ------------------------------------------------------------------ */

export const SEO_CATEGORIES: { value: string; label: string }[] = [
  { value: 'audit', label: 'Audit & Analysis' },
  { value: 'performance', label: 'Performance' },
  { value: 'content', label: 'Content' },
  { value: 'technical', label: 'Technical SEO' },
  { value: 'preview', label: 'Preview' },
  { value: 'research', label: 'Research & Tracking' },
  { value: 'strategy', label: 'SEO Strategy' },
  { value: 'ai', label: 'AI Tools' },
]

export const SOCIAL_CATEGORIES: { value: string; label: string }[] = [
  { value: 'social', label: 'Social Media' },
]

export const CONTENT_CATEGORIES: { value: string; label: string }[] = [
  { value: 'content', label: 'Content Generation' },
]

export const PM_CATEGORIES: { value: string; label: string }[] = [
  { value: 'pm', label: 'Project Management' },
]

export const AUTOMATION_CATEGORIES: { value: string; label: string }[] = [
  { value: 'automation', label: 'Automation' },
]

/* ------------------------------------------------------------------ */
/* AddCustomToolDialog                                                 */
/* ------------------------------------------------------------------ */

export function AddCustomToolDialog({
  open,
  onOpenChange,
  defaultCategory,
  categories,
  invalidateKeys = [],
  onAdded,
  title = 'Add custom tool',
  description = 'Add your own tool to any category. Saved to your project only.',
  categoryLabel = 'Category',
  showCategory = true,
  fixedCategory = false,
  editTool = null,
  presetTool = null,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultCategory: string
  categories: { value: string; label: string }[]
  invalidateKeys?: unknown[][]
  onAdded?: () => void
  title?: string
  description?: string
  categoryLabel?: string
  showCategory?: boolean
  fixedCategory?: boolean
  // When set, the dialog prefills from the given tool and the submit becomes
  // DELETE old + POST new (since the custom tools API has no PATCH). This is
  // the "edit" mode — the user can change any field and save.
  editTool?: CustomTool | null
  // Preset values for "clone" mode — prefill the form with these values when
  // opening in add mode (no DELETE of an existing tool). Used by the built-in
  // "Clone as custom" flow.
  presetTool?: {
    label?: string
    description?: string
    iconKey?: string
    category?: string
    prompt?: string
    input?: 'text' | 'url' | 'project' | 'none'
  } | null
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const isEdit = !!editTool

  const [label, setLabel] = React.useState('')
  const [descriptionInput, setDescriptionInput] = React.useState('')
  const [iconKey, setIconKey] = React.useState('Wrench')
  const [category, setCategory] = React.useState(defaultCategory)
  const [prompt, setPrompt] = React.useState('')
  const [input, setInput] = React.useState<'text' | 'url' | 'project' | 'none'>('text')

  // Prefill from server when the dialog opens. In edit mode, prefill from the
  // editTool prop. In clone (preset) mode, prefill from presetTool. Otherwise
  // reset to defaults (with the new defaultCategory).
  React.useEffect(() => {
    if (!open) return
    if (isEdit && editTool) {
      setLabel(editTool.label)
      setDescriptionInput(editTool.description || '')
      setIconKey(editTool.iconKey || 'Wrench')
      setCategory(editTool.category || defaultCategory)
      setPrompt(editTool.prompt || '')
      setInput((editTool.input as 'text' | 'url' | 'project' | 'none') || 'text')
    } else if (presetTool) {
      setLabel(presetTool.label || '')
      setDescriptionInput(presetTool.description || '')
      setIconKey(presetTool.iconKey || 'Wrench')
      setCategory(presetTool.category || defaultCategory)
      setPrompt(presetTool.prompt || '')
      setInput(presetTool.input || 'text')
    } else {
      setLabel('')
      setDescriptionInput('')
      setIconKey('Wrench')
      setCategory(defaultCategory)
      setPrompt('')
      setInput('text')
    }
  }, [open, isEdit, editTool, presetTool, defaultCategory])

  const mut = useMutation({
    mutationFn: async (payload: {
      label: string
      description?: string
      iconKey?: string
      category: string
      endpoint: string
      input: string
      prompt?: string
    }) => {
      // In edit mode, delete the old tool first, then create the new one.
      if (isEdit && editTool) {
        await fetchJson(`/api/tools/custom?id=${encodeURIComponent(editTool.id)}`, {
          method: 'DELETE',
        })
      }
      return fetchJson('/api/tools/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    },
    onSuccess: () => {
      toast({
        title: isEdit ? 'Custom tool updated' : 'Custom tool added',
        description: isEdit
          ? 'Your changes have been saved.'
          : 'Your tool now appears in its category.',
      })
      // Reset form (only in add mode — edit mode re-prefills on next open).
      if (!isEdit) {
        setLabel('')
        setDescriptionInput('')
        setIconKey('Wrench')
        setPrompt('')
        setInput('text')
      }
      // Invalidate every query key the parent asked us to.
      for (const key of invalidateKeys) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
      onAdded?.()
      onOpenChange(false)
    },
    onError: (err: Error) =>
      toast({
        title: isEdit ? 'Could not update custom tool' : 'Could not add custom tool',
        description: err.message,
        variant: 'destructive',
      }),
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = label.trim()
    if (!trimmed) {
      toast({ title: 'Label is required', variant: 'destructive' })
      return
    }
    // If the user provided a prompt, this is an AI tool → endpoint 'ai-chat'.
    // Otherwise default to 'ai-chat' for text inputs (so clicking it still does
    // something useful); for url/project/none inputs without a prompt, store
    // 'builtin' so the runner shows the placeholder.
    const hasPrompt = prompt.trim().length > 0
    const endpoint =
      input === 'text' && hasPrompt
        ? 'ai-chat'
        : input === 'text'
          ? 'ai-chat'
          : 'builtin'
    mut.mutate({
      label: trimmed,
      description: descriptionInput.trim() || undefined,
      iconKey: iconKey.trim() || 'Wrench',
      category,
      endpoint,
      input,
      prompt: prompt.trim() || undefined,
    })
  }

  const resolvedTitle = isEdit
    ? 'Edit custom tool'
    : title
  const resolvedDescription = isEdit
    ? 'Update the label, prompt, icon, or category. Saving replaces the existing tool.'
    : description
  const submitLabel = isEdit ? 'Save changes' : 'Add tool'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? (
              <Pencil className="size-4 text-forest" />
            ) : (
              <Plus className="size-4 text-forest" />
            )}{' '}
            {resolvedTitle}
          </DialogTitle>
          <DialogDescription>{resolvedDescription}</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3">
          {/* Label */}
          <div className="space-y-1.5">
            <Label htmlFor="custom-tool-label">
              Label <span className="text-destructive">*</span>
            </Label>
            <Input
              id="custom-tool-label"
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Local Citation Finder"
              className="h-9"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="custom-tool-desc">Description</Label>
            <Textarea
              id="custom-tool-desc"
              value={descriptionInput}
              onChange={(e) => setDescriptionInput(e.target.value)}
              placeholder="Short description shown on the card."
              className="min-h-20"
            />
          </div>

          {/* Icon + Category row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Icon (datalist of common lucide names) */}
            <div className="space-y-1.5">
              <Label htmlFor="custom-tool-icon">Icon</Label>
              <Input
                id="custom-tool-icon"
                list="lucide-icons-list"
                value={iconKey}
                onChange={(e) => setIconKey(e.target.value)}
                placeholder="Wrench"
                className="h-9"
              />
              <datalist id="lucide-icons-list">
                {COMMON_ICONS.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
              <p className="text-[10px] text-muted-foreground">
                Any lucide icon name (e.g. Network, Globe, Brain).
              </p>
            </div>

            {/* Category */}
            {showCategory && (
              <div className="space-y-1.5">
                <Label htmlFor="custom-tool-category">{categoryLabel}</Label>
                <Select
                  value={category}
                  onValueChange={setCategory}
                  disabled={fixedCategory}
                >
                  <SelectTrigger id="custom-tool-category" className="h-9">
                    <SelectValue placeholder="Pick a category…" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fixedCategory && (
                  <p className="text-[10px] text-muted-foreground">
                    Locked to this view&rsquo;s category.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Input type */}
          <div className="space-y-1.5">
            <Label htmlFor="custom-tool-input">Input type</Label>
            <Select
              value={input}
              onValueChange={(v) => setInput(v as 'text' | 'url' | 'project' | 'none')}
            >
              <SelectTrigger id="custom-tool-input" className="h-9">
                <SelectValue placeholder="Pick an input type…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text (one-line context)</SelectItem>
                <SelectItem value="url">URL</SelectItem>
                <SelectItem value="project">Project picker</SelectItem>
                <SelectItem value="none">No input (config-only)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              AI tools work best with text input + a prompt below.
            </p>
          </div>

          {/* Prompt (AI prompt template — optional) */}
          <div className="space-y-1.5">
            <Label htmlFor="custom-tool-prompt">
              Prompt <span className="text-muted-foreground font-normal">(optional — for AI tools)</span>
            </Label>
            <Textarea
              id="custom-tool-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Generate a list of local business directories for: {input}. Format as a numbered list."
              className="min-h-28 font-mono text-xs"
            />
            <p className="text-[10px] text-muted-foreground">
              Use <code className="font-mono">{'{input}'}</code> where the user&rsquo;s context goes.
              If a prompt is set, the tool runs as an AI tool via the in-product assistant.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mut.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-forest text-primary-foreground hover:bg-forest/90"
              disabled={mut.isPending}
            >
              {mut.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : isEdit ? (
                <Pencil className="size-4" />
              ) : (
                <Plus className="size-4" />
              )}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/* AddCustomToolCard — the dashed "+" card at the end of every grid    */
/* Mirrors the integrations-view "+" card style (forest-tinted).      */
/* ------------------------------------------------------------------ */

export function AddCustomToolCard({
  onClick,
  title = 'Add custom tool',
  subtitle = 'Add your own tool to any category.',
  ariaLabel = 'Add custom tool',
}: {
  onClick: () => void
  title?: string
  subtitle?: string
  ariaLabel?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group text-left rounded-2xl border-dashed border-2 border-forest/40 hover:border-forest',
        'bg-forest/5 p-5 transition-colors flex flex-col items-start gap-3 min-h-[180px]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2',
      )}
      aria-label={ariaLabel}
    >
      <div className="size-10 rounded-xl bg-forest/10 text-forest flex items-center justify-center group-hover:bg-forest/15 transition">
        <Plus className="size-5" />
      </div>
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* CustomToolRunDialog — opens when a user clicks a custom tool card.  */
/* Routes by endpoint:                                                 */
/*   - 'ai-chat' (with prompt) → AI dialog (prompt + input + Generate) */
/*   - otherwise                → "configure in settings" placeholder */
/* ------------------------------------------------------------------ */

export function CustomToolRunDialog({
  tool,
  open,
  onOpenChange,
}: {
  tool: CustomTool | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!tool) return null

  const isAi = tool.endpoint === 'ai-chat' && Boolean(tool.prompt)

  if (!isAi) {
    return <CustomToolPlaceholderDialog tool={tool} open={open} onOpenChange={onOpenChange} />
  }
  return <CustomAiToolDialog tool={tool} open={open} onOpenChange={onOpenChange} />
}

/* ------------------------------------------------------------------ */
/* Placeholder dialog for non-AI custom tools                           */
/* ------------------------------------------------------------------ */

function CustomToolPlaceholderDialog({
  tool,
  open,
  onOpenChange,
}: {
  tool: CustomTool
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DynamicIcon name={tool.iconKey} className="size-4 text-forest" />
            {tool.label}
            <Badge variant="outline" className="text-clay border-clay/40 bg-clay/5">
              CUSTOM
            </Badge>
          </DialogTitle>
          <DialogDescription>{tool.description || 'Custom tool'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg border border-clay/30 bg-clay/5 p-4 text-sm text-foreground/90 leading-relaxed">
            <div className="flex items-start gap-2">
              <Settings2 className="size-4 text-clay shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p>This is a custom tool with no AI prompt configured.</p>
                <p className="text-muted-foreground">
                  To make it runnable, edit it in Settings and add a prompt (the
                  assistant will use it with your context). Or delete it and add
                  a new one with a prompt.
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
/* AI dialog for custom tools with a prompt                            */
/* ------------------------------------------------------------------ */

function CustomAiToolDialog({
  tool,
  open,
  onOpenChange,
}: {
  tool: CustomTool
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { toast } = useToast()
  const [inputValue, setInputValue] = React.useState('')
  const [reply, setReply] = React.useState<string | null>(null)

  const mut = useMutation({
    mutationFn: (messages: { role: 'user' | 'assistant'; content: string }[]) =>
      fetchJson('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      }) as Promise<{ reply: string }>,
    onSuccess: (data) => setReply(data.reply ?? 'No reply.'),
    onError: (err: Error) =>
      toast({
        title: `${tool.label} failed`,
        description: err.message,
        variant: 'destructive',
      }),
  })

  React.useEffect(() => {
    if (!open) {
      setReply(null)
      setInputValue('')
    }
  }, [open])

  function buildPrompt(value: string): string {
    const tmpl = tool.prompt || ''
    if (!tmpl.includes('{input}')) return `${tmpl}\n\nInput: ${value}`
    return tmpl.replace(/\{input\}/g, value)
  }

  function run() {
    const v = inputValue.trim()
    if (!v) {
      toast({ title: 'Enter some context first', variant: 'destructive' })
      return
    }
    setReply(null)
    mut.mutate([{ role: 'user', content: buildPrompt(v) }])
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DynamicIcon name={tool.iconKey} className="size-4 text-forest" />
            {tool.label}
            <Badge variant="outline" className="text-forest border-sage/50 bg-sage/10">
              <Sparkles className="size-3" /> AI · CUSTOM
            </Badge>
          </DialogTitle>
          <DialogDescription>{tool.description || 'Custom AI tool'}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="custom-tool-run-input" className="text-xs text-muted-foreground">
              Context <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Textarea
              id="custom-tool-run-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Describe what you want to do…"
              className="min-h-32"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !mut.isPending) run()
              }}
            />
            <p className="text-[10px] text-muted-foreground">Press ⌘/Ctrl + Enter to generate.</p>
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
              Running {tool.label.toLowerCase()}…
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/* CustomToolCard — the card rendered for each custom tool            */
/* Mirrors the existing SeoToolCard / SocialToolCard shape so it      */
/* matches the grid.                                                  */
/*                                                                    */
/* Master-panel: every custom tool now has Edit + Delete ghost        */
/* buttons in the header, alongside the badges.                      */
/* ------------------------------------------------------------------ */

export function CustomToolCard({
  tool,
  onOpen,
  onEdit,
  onDelete,
  iconBg = 'bg-sage/20 text-forest',
}: {
  tool: CustomTool
  onOpen: () => void
  onEdit?: () => void
  onDelete?: () => void
  iconBg?: string
}) {
  const isAi = tool.endpoint === 'ai-chat' && Boolean(tool.prompt)
  return (
    <div className="rounded-2xl border-2 border-dashed border-sage/50 bg-sage/5 p-4 flex flex-col h-full transition-shadow hover:shadow-md gap-3">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'size-10 rounded-xl flex items-center justify-center shrink-0',
            isAi ? 'bg-sage/20 text-forest' : iconBg,
          )}
        >
          <DynamicIcon name={tool.iconKey} className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-foreground truncate">{tool.label}</h3>
            <div className="flex flex-wrap items-center gap-1 justify-end shrink-0">
              {isAi && (
                <Badge variant="outline" className="text-forest border-sage/50 bg-sage/10">
                  <Sparkles className="size-2.5 mr-0.5" />
                  AI
                </Badge>
              )}
              <Badge variant="outline" className="text-clay border-clay/40 bg-clay/5">
                CUSTOM
              </Badge>
              {onEdit && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6 text-muted-foreground hover:text-forest hover:bg-forest/10"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit()
                  }}
                  aria-label={`Edit ${tool.label}`}
                  title="Edit tool"
                >
                  <Pencil className="size-3.5" />
                </Button>
              )}
              {onDelete && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete()
                  }}
                  aria-label={`Delete ${tool.label}`}
                  title="Delete tool"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
          <p className="mt-1 text-xs text-muted-foreground line-clamp-3">
            {tool.description || 'Custom tool added by you.'}
          </p>
        </div>
      </div>
      <div className="mt-auto">
        <Button
          type="button"
          className="w-full text-primary-foreground bg-forest hover:bg-forest/90"
          size="sm"
          onClick={onOpen}
        >
          Open <ArrowRight className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* BuiltInToolEditButton — small ghost pencil shown on every built-in  */
/* tool card. Opens the BuiltInToolInfoDialog (read-only metadata +    */
/* a "Clone as custom" button).                                        */
/* ------------------------------------------------------------------ */

export function BuiltInToolEditButton({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-6 text-muted-foreground hover:text-forest hover:bg-forest/10"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      aria-label={`Inspect ${label}`}
      title="Inspect / clone"
    >
      <Pencil className="size-3.5" />
    </Button>
  )
}

/* ------------------------------------------------------------------ */
/* BuiltInToolInfoDialog — read-only metadata for a built-in tool +    */
/* a "Clone as custom" button that opens AddCustomToolDialog prefilled */
/* with the tool's values.                                             */
/*                                                                    */
/* `tool` accepts a permissive shape so each view can pass its own    */
/* built-in tool definition without an adapter.                        */
/* ------------------------------------------------------------------ */

export interface BuiltInToolLike {
  id: string
  label: string
  description?: string
  icon?: string
  iconKey?: string
  category?: string
  endpoint?: string
  input?: string
  prompt?: string
}

export function BuiltInToolInfoDialog({
  tool,
  open,
  onOpenChange,
  categories,
  defaultCategory,
  invalidateKeys = [],
  categoryLabel = 'Category',
  fixedCategory = false,
}: {
  tool: BuiltInToolLike | null
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: { value: string; label: string }[]
  defaultCategory: string
  invalidateKeys?: unknown[][]
  categoryLabel?: string
  fixedCategory?: boolean
}) {
  const [cloneOpen, setCloneOpen] = React.useState(false)

  if (!tool) return null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="size-4 text-forest" /> {tool.label}
              <Badge variant="outline" className="text-forest border-forest/40">
                BUILT-IN
              </Badge>
            </DialogTitle>
            <DialogDescription>
              {tool.description || 'Built-in tool shipped with VirtuaLab Digital.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                This is a built-in tool. You can&rsquo;t modify the original, but you
                can <span className="font-medium text-foreground">clone it as a custom tool</span> to
                tweak the label, prompt, icon, or category. The clone lives in your
                project only and shows up alongside the built-in.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <ReadOnlyField label="Label" value={tool.label} />
              <ReadOnlyField
                label="Icon"
                value={tool.iconKey || tool.icon || 'Wrench'}
              />
              <ReadOnlyField
                label={categoryLabel}
                value={
                  categories.find((c) => c.value === (tool.category || defaultCategory))
                    ?.label || tool.category || defaultCategory
                }
              />
              <ReadOnlyField
                label="Endpoint"
                value={tool.endpoint || 'builtin'}
              />
              <ReadOnlyField
                label="Input"
                value={tool.input || 'text'}
              />
              <ReadOnlyField
                label="Category value"
                value={tool.category || defaultCategory}
              />
            </div>

            {tool.prompt && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Prompt</Label>
                <Textarea
                  value={tool.prompt}
                  readOnly
                  className="min-h-24 font-mono text-xs bg-muted/30"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button
                type="button"
                className="bg-forest text-primary-foreground hover:bg-forest/90"
                onClick={() => {
                  setCloneOpen(true)
                  onOpenChange(false)
                }}
              >
                <Plus className="size-4" /> Clone as custom
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clone dialog — prefilled AddCustomToolDialog in add mode */}
      <AddCustomToolDialog
        open={cloneOpen}
        onOpenChange={setCloneOpen}
        defaultCategory={tool.category || defaultCategory}
        categories={categories}
        invalidateKeys={invalidateKeys}
        title="Clone built-in tool"
        description="Tweak any field. The clone is saved to your project only."
        categoryLabel={categoryLabel}
        showCategory={!fixedCategory}
        fixedCategory={fixedCategory}
        presetTool={{
          label: tool.label,
          description: tool.description || '',
          iconKey: tool.iconKey || tool.icon || 'Wrench',
          category: tool.category || defaultCategory,
          prompt: tool.prompt || '',
          input: (tool.input as 'text' | 'url' | 'project' | 'none') || 'text',
        }}
      />
    </>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input value={value} readOnly className="h-9 bg-muted/30" />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* DeleteCustomToolButton — small trash button + confirmation dialog   */
/* for deleting a custom tool. The views don't have to wire confirm     */
/* themselves — this is one-stop.                                      */
/* ------------------------------------------------------------------ */

export function useDeleteCustomTool() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: async (vars: { id: string; invalidateKeys?: unknown[][] }) => {
      const res = await fetchJson(
        `/api/tools/custom?id=${encodeURIComponent(vars.id)}`,
        { method: 'DELETE' },
      )
      for (const key of vars.invalidateKeys ?? []) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
      return res
    },
    onSuccess: () => toast({ title: 'Custom tool deleted' }),
    onError: (err: Error) =>
      toast({
        title: 'Could not delete tool',
        description: err.message,
        variant: 'destructive',
      }),
  })
}
