'use client'

import * as React from 'react'
import {
  Sparkles,
  Plus,
  Trash2,
  GripVertical,
  Wand2,
  Upload,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react'
import type { BlockInstance } from '@/lib/seed'
import { BLOCK_LOOKUP } from '@/lib/blocks'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */

const SELECT_OPTIONS: Record<string, string[]> = {
  bg: ['forest', 'sage', 'terracotta', 'cream', 'sand'],
  align: ['left', 'center'],
  size: ['sm', 'md', 'lg', 'xl'],
  radius: ['none', 'sm', 'md', 'lg', 'full'],
  variant: ['primary', 'secondary', 'accent', 'outline'],
  color: ['border', 'forest', 'sage', 'terracotta', 'sand'],
  // Typography — heading level (semantic HTML tag)
  level: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
  // Typography — font family (option value → CSS stack via FONT_FAMILY_STACKS)
  fontFamily: [
    'system', 'serif', 'sans-serif', 'monospace', 'georgia', 'helvetica',
    'arial', 'verdana', 'times', 'courier', 'inter', 'poppins', 'roboto',
    'lato', 'merriweather', 'playfair-display',
  ],
  // Typography — font weight
  fontWeight: ['300', '400', '500', '600', '700', '800', '900'],
  // Hero headline typography
  headlineFontFamily: [
    'system', 'serif', 'sans-serif', 'georgia', 'helvetica', 'inter',
    'poppins', 'roboto', 'playfair-display', 'merriweather',
  ],
  headlineFontWeight: ['400', '500', '600', '700', '800', '900'],
  // EFFECTS — scroll animation + hover effect (applied to every block)
  effect: ['none', 'fade-in', 'fade-up', 'fade-down', 'slide-left', 'slide-right', 'zoom-in', 'blur-in'],
  hoverEffect: ['none', 'lift', 'zoom', 'glow', 'shadow'],
}

// Maps a font-family option value → an actual CSS `font-family` stack. Used by
// the BlockRenderer to apply the chosen font to heading/paragraph/hero blocks.
export const FONT_FAMILY_STACKS: Record<string, string> = {
  system: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  'sans-serif': "system-ui, sans-serif",
  monospace: "'SF Mono', Monaco, monospace",
  georgia: 'Georgia, serif',
  helvetica: 'Helvetica, Arial, sans-serif',
  arial: 'Arial, sans-serif',
  verdana: 'Verdana, sans-serif',
  times: "'Times New Roman', serif",
  courier: "'Courier New', monospace",
  inter: "'Inter', sans-serif",
  poppins: "'Poppins', sans-serif",
  roboto: "'Roboto', sans-serif",
  lato: "'Lato', sans-serif",
  merriweather: "'Merriweather', serif",
  'playfair-display': "'Playfair Display', serif",
}

// Typography field keys — these get grouped under a "TYPOGRAPHY" sub-header in
// the properties panel (heading/paragraph/hero blocks).
const TYPOGRAPHY_KEYS = new Set([
  'level',
  'fontFamily',
  'fontWeight',
  'fontSize',
  'headlineFontFamily',
  'headlineFontWeight',
  'headlineFontSize',
  'subheadlineFontSize',
])

type FieldKind = 'text' | 'textarea' | 'switch' | 'strings' | 'comma'

const LIST_SHAPES: Record<string, { key: string; label: string; kind: FieldKind }[] | null> = {
  'features.items': [
    { key: 'icon', label: 'Icon (lucide name)', kind: 'text' },
    { key: 'title', label: 'Title', kind: 'text' },
    { key: 'desc', label: 'Description', kind: 'textarea' },
  ],
  'pricing.tiers': [
    { key: 'name', label: 'Name', kind: 'text' },
    { key: 'price', label: 'Price', kind: 'text' },
    { key: 'period', label: 'Period', kind: 'text' },
    { key: 'features', label: 'Features (one per line)', kind: 'strings' },
    { key: 'cta', label: 'CTA label', kind: 'text' },
    { key: 'featured', label: 'Featured', kind: 'switch' },
  ],
  'faq.items': [
    { key: 'q', label: 'Question', kind: 'text' },
    { key: 'a', label: 'Answer', kind: 'textarea' },
  ],
  'footer.columns': [
    { key: 'heading', label: 'Heading', kind: 'text' },
    { key: 'links', label: 'Links (one per line)', kind: 'strings' },
  ],
  'stats.stats': [
    { key: 'value', label: 'Value', kind: 'text' },
    { key: 'label', label: 'Label', kind: 'text' },
  ],
  'team.members': [
    { key: 'name', label: 'Name', kind: 'text' },
    { key: 'role', label: 'Role', kind: 'text' },
    { key: 'initial', label: 'Initials', kind: 'text' },
  ],
  'gallery.images': [
    { key: 'src', label: 'Image URL', kind: 'text' },
    { key: 'alt', label: 'Alt text', kind: 'text' },
  ],
  'logos.names': null,
}

const AI_BLOCKS = new Set(['hero', 'features', 'testimonial', 'pricing', 'cta', 'footer'])

/* ------------------------------------------------------------------ */

function FieldRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

function ListItemEditor({
  blockType,
  listKey,
  items,
  onChange,
}: {
  blockType: string
  listKey: string
  items: any[]
  onChange: (next: any[]) => void
}) {
  const shapeKey = `${blockType}.${listKey}`
  const shape = LIST_SHAPES[shapeKey]
  const isStringList = shape === null

  function update(i: number, key: string, value: any) {
    const next = items.map((it, idx) =>
      idx === i ? { ...it, [key]: value } : it,
    )
    onChange(next)
  }

  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i))
  }

  function add() {
    if (isStringList) {
      onChange([...items, 'New item'])
    } else if (shape) {
      const blank: Record<string, any> = {}
      shape.forEach((f) => {
        if (f.kind === 'strings') blank[f.key] = []
        else if (f.kind === 'switch') blank[f.key] = false
        else blank[f.key] = ''
      })
      onChange([...items, blank])
    }
  }

  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div
          key={i}
          className="rounded-lg border border-border bg-background p-3 space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <GripVertical className="size-3.5 opacity-50" />
              Item {i + 1}
            </span>
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-muted-foreground hover:text-destructive transition"
              aria-label="Remove item"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>

          {isStringList ? (
            <Input
              value={String(it ?? '')}
              onChange={(e) => {
                const next = [...items]
                next[i] = e.target.value
                onChange(next)
              }}
              className="h-8 text-sm"
            />
          ) : (
            shape?.map((f) => {
              const v = it?.[f.key]
              if (f.kind === 'switch') {
                return (
                  <div key={f.key} className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">{f.label}</Label>
                    <Switch
                      checked={!!v}
                      onCheckedChange={(checked) => update(i, f.key, checked)}
                    />
                  </div>
                )
              }
              if (f.kind === 'strings') {
                return (
                  <FieldRow key={f.key} label={f.label}>
                    <Textarea
                      value={(Array.isArray(v) ? v : []).join('\n')}
                      onChange={(e) =>
                        update(i, f.key, e.target.value.split('\n').filter((x) => x !== '' || true))
                      }
                      className="min-h-20 text-sm"
                    />
                  </FieldRow>
                )
              }
              if (f.kind === 'textarea') {
                return (
                  <FieldRow key={f.key} label={f.label}>
                    <Textarea
                      value={String(v ?? '')}
                      onChange={(e) => update(i, f.key, e.target.value)}
                      className="min-h-16 text-sm"
                    />
                  </FieldRow>
                )
              }
              return (
                <FieldRow key={f.key} label={f.label}>
                  <Input
                    value={String(v ?? '')}
                    onChange={(e) => update(i, f.key, e.target.value)}
                    className="h-8 text-sm"
                  />
                </FieldRow>
              )
            })
          )}
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        className="w-full border-dashed"
      >
        <Plus className="size-4" /> Add item
      </Button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Image field — real upload + media library                          */
/* ------------------------------------------------------------------ */

function formatBytes(n?: number): string {
  if (!n || n <= 0) return '0 B'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

interface MediaItem {
  url: string
  filename: string
  size: number
  modifiedAt?: string
}

function MediaLibraryDialog({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onPick: (url: string) => void
}) {
  const [items, setItems] = React.useState<MediaItem[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [query, setQuery] = React.useState('')

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/media')
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      const data = await res.json()
      setItems(Array.isArray(data?.media) ? (data.media as MediaItem[]) : [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load media')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (open) load()
  }, [open, load])

  const filtered = items.filter((it) => {
    if (!query.trim()) return true
    return (it.filename || '').toLowerCase().includes(query.trim().toLowerCase())
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Media library</DialogTitle>
          <DialogDescription>
            Pick an image from your uploaded library. Click any tile to use it.
          </DialogDescription>
        </DialogHeader>

        <Input
          placeholder="Search files by name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-8 text-sm"
        />

        <ScrollArea className="h-72 rounded-md border border-border bg-card/50">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-md" />
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center text-sm text-destructive">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {items.length === 0
                ? 'No media uploaded yet. Use the Upload button to add your first image.'
                : 'No files match your search.'}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3">
              {filtered.map((it, i) => (
                <button
                  type="button"
                  key={`${it.url}-${i}`}
                  onClick={() => {
                    onPick(it.url)
                    onOpenChange(false)
                  }}
                  className="group text-left rounded-md border border-border bg-card overflow-hidden hover:ring-2 hover:ring-forest/50 hover:border-forest/40 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest"
                  title={`Use ${it.filename}`}
                >
                  <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                    {it.url ? (
                      <img
                        src={it.url}
                        alt={it.filename}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <ImageIcon className="size-8 text-muted-foreground/60" />
                    )}
                  </div>
                  <div className="p-2">
                    <div className="text-xs font-medium truncate text-foreground">
                      {it.filename}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {formatBytes(it.size)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

function ImageField({
  label,
  value,
  seed,
  onChange,
}: {
  label: string
  value: string
  seed: string
  onChange: (v: string) => void
}) {
  const { toast } = useToast()
  const [uploading, setUploading] = React.useState(false)
  const [libOpen, setLibOpen] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  async function handleUploadFile(file: File) {
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/media/upload', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || `Upload failed (${res.status})`)
      }
      const url: string | undefined = data?.media?.url
      if (!url) throw new Error('Upload response missing media URL')
      onChange(url)
      toast({
        title: 'Image uploaded',
        description: data?.media?.filename || file.name,
      })
    } catch (err: any) {
      toast({
        title: 'Upload failed',
        description: err?.message || 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <FieldRow label={label}>
      <div className="space-y-2">
        {value ? (
          <img
            src={value}
            alt="preview"
            className="w-full h-24 object-cover rounded-md border border-border bg-muted"
          />
        ) : (
          <div className="w-full h-24 rounded-md border border-dashed border-border bg-muted flex items-center justify-center text-xs text-muted-foreground">
            No image yet
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleUploadFile(f)
            // Reset so picking the same file twice still triggers onChange
            e.target.value = ''
          }}
        />

        <div className="grid grid-cols-3 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-xs"
          >
            {uploading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Upload className="size-3.5" />
            )}
            {uploading ? 'Uploading…' : 'Upload'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLibOpen(true)}
            className="text-xs"
          >
            <ImageIcon className="size-3.5" />
            Library
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onChange(
                `https://picsum.photos/seed/${seed}-${Date.now()}/800/600`,
              )
            }
            className="text-xs"
          >
            <Sparkles className="size-3.5" />
            Placeholder
          </Button>
        </div>

        <Input
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://… or paste any image URL"
          className="h-8 text-sm"
        />

        <MediaLibraryDialog
          open={libOpen}
          onOpenChange={setLibOpen}
          onPick={(url) => onChange(url)}
        />
      </div>
    </FieldRow>
  )
}

/* ------------------------------------------------------------------ */

export function PropertiesPanel({
  block,
  onChange,
  onClose,
}: {
  block: BlockInstance
  onChange: (props: Record<string, any>) => void
  onClose: () => void
}) {
  const def = BLOCK_LOOKUP[block.type]
  const { toast } = useToast()
  const [business, setBusiness] = React.useState('')
  const [aiBusy, setAiBusy] = React.useState(false)

  if (!def) return null

  function setProp(key: string, value: any) {
    onChange({ ...block.props, [key]: value })
  }

  async function runAi() {
    setAiBusy(true)
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: block.type,
          business: business || 'an organic, sustainable small business',
        }),
      })
      if (!res.ok) throw new Error('AI request failed')
      const data = await res.json()
      let content: Record<string, any> = data?.content ?? {}
      // The AI returns content for several block types in one payload
      // (e.g. { hero: {...}, features: {...}, ... }). Pick the section
      // matching this block type and merge that. Fall back to the whole
      // payload if no matching key exists.
      if (content && typeof content === 'object' && content[block.type] && typeof content[block.type] === 'object') {
        content = content[block.type] as Record<string, any>
      }
      // Merge — for nested arrays, normalize them into the existing shape
      const merged: Record<string, any> = { ...block.props }
      for (const [k, v] of Object.entries(content)) {
        if (Array.isArray(v) && Array.isArray(merged[k])) {
          // try to merge array of objects sensibly
          merged[k] = v
        } else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
          merged[k] = { ...(merged[k] ?? {}), ...v }
        } else {
          merged[k] = v
        }
      }
      onChange(merged)
      toast({
        title: 'AI copy generated',
        description: `Fresh copy for your ${def.label} block is ready.`,
      })
    } catch (err) {
      toast({
        title: 'AI generation failed',
        description: 'Please try again in a moment.',
        variant: 'destructive',
      })
    } finally {
      setAiBusy(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{def.label}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{def.description}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-7 px-2 text-xs"
          >
            Close
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {AI_BLOCKS.has(block.type) && (
            <div className="rounded-lg border border-forest/30 bg-forest/5 p-3 space-y-2">
              <div className="flex items-center gap-2 text-forest">
                <Sparkles className="size-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  AI copy assistant
                </span>
              </div>
              <Input
                placeholder="Describe your business (e.g. a small organic bakery)"
                value={business}
                onChange={(e) => setBusiness(e.target.value)}
                className="h-8 text-sm"
              />
              <Button
                type="button"
                size="sm"
                onClick={runAi}
                disabled={aiBusy}
                className="w-full bg-forest text-primary-foreground hover:bg-forest/90"
              >
                <Wand2 className="size-4" />
                {aiBusy ? 'Generating…' : 'Generate copy'}
              </Button>
            </div>
          )}

          {def.schema.map((field, idx) => {
            const value = block.props[field.key]

            // Render a "TYPOGRAPHY" sub-header before the first typography field
            // in the schema (heading/paragraph/hero blocks group their font fields
            // together under this label).
            const isTypography = TYPOGRAPHY_KEYS.has(field.key)
            const prevField = idx > 0 ? def.schema[idx - 1] : null
            const prevIsTypography = prevField ? TYPOGRAPHY_KEYS.has(prevField.key) : false
            const showTypographyHeader = isTypography && !prevIsTypography

            if (field.type === 'list') {
              return (
                <div key={field.key} className="space-y-2">
                  <Label className="text-xs text-muted-foreground">{field.label}</Label>
                  <ListItemEditor
                    blockType={block.type}
                    listKey={field.key}
                    items={Array.isArray(value) ? value : []}
                    onChange={(next) => setProp(field.key, next)}
                  />
                </div>
              )
            }

            if (field.type === 'text') {
              return (
                <React.Fragment key={field.key}>
                  {showTypographyHeader && <TypographySubheader />}
                  <FieldRow label={field.label}>
                    <Input
                      value={String(value ?? '')}
                      onChange={(e) => setProp(field.key, e.target.value)}
                      className="h-8 text-sm"
                    />
                  </FieldRow>
                </React.Fragment>
              )
            }

            if (field.type === 'textarea') {
              return (
                <React.Fragment key={field.key}>
                  {showTypographyHeader && <TypographySubheader />}
                  <FieldRow label={field.label}>
                    <Textarea
                      value={String(value ?? '')}
                      onChange={(e) => setProp(field.key, e.target.value)}
                      className="min-h-20 text-sm"
                    />
                  </FieldRow>
                </React.Fragment>
              )
            }

            if (field.type === 'number') {
              return (
                <React.Fragment key={field.key}>
                  {showTypographyHeader && <TypographySubheader />}
                  <FieldRow label={field.label}>
                    <Input
                      type="number"
                      value={Number(value ?? 0)}
                      onChange={(e) => setProp(field.key, Number(e.target.value))}
                      className="h-8 text-sm"
                    />
                  </FieldRow>
                </React.Fragment>
              )
            }

            if (field.type === 'switch') {
              return (
                <div key={field.key} className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">{field.label}</Label>
                  <Switch
                    checked={!!value}
                    onCheckedChange={(checked) => setProp(field.key, checked)}
                  />
                </div>
              )
            }

            if (field.type === 'select') {
              const options = SELECT_OPTIONS[field.key] ?? []
              return (
                <React.Fragment key={field.key}>
                  {showTypographyHeader && <TypographySubheader />}
                  <FieldRow label={field.label}>
                    <Select
                      value={String(value ?? '')}
                      onValueChange={(v) => setProp(field.key, v)}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        {options.map((opt) => (
                          <SelectItem key={opt} value={opt} className="text-sm">
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldRow>
                </React.Fragment>
              )
            }

            if (field.type === 'color') {
              return (
                <React.Fragment key={field.key}>
                  {showTypographyHeader && <TypographySubheader />}
                  <FieldRow label={field.label}>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={String(value ?? '#000000')}
                        onChange={(e) => setProp(field.key, e.target.value)}
                        className="size-8 rounded border border-border bg-background cursor-pointer"
                      />
                      <Input
                        value={String(value ?? '')}
                        onChange={(e) => setProp(field.key, e.target.value)}
                        className="h-8 text-sm flex-1"
                      />
                    </div>
                  </FieldRow>
                </React.Fragment>
              )
            }

            if (field.type === 'image') {
              const seed = (block.id || 'plant').slice(0, 8)
              return (
                <React.Fragment key={field.key}>
                  {showTypographyHeader && <TypographySubheader />}
                  <ImageField
                    label={field.label}
                    value={String(value ?? '')}
                    seed={seed}
                    onChange={(v) => setProp(field.key, v)}
                  />
                </React.Fragment>
              )
            }

            return null
          })}

          <Separator />

          {/* EFFECTS — common to every block. Lets the user pick a scroll-into-view
              animation + a hover effect. Stored on the block's props object so the
              BlockRenderer can apply them via framer-motion + Tailwind hover classes. */}
          <EffectsSection
            effect={String(block.props.effect ?? 'none')}
            hoverEffect={String(block.props.hoverEffect ?? 'none')}
            onEffectChange={(v) => setProp('effect', v)}
            onHoverEffectChange={(v) => setProp('hoverEffect', v)}
          />

          <p className="text-xs text-muted-foreground">
            Tip: drag blocks using the handle on the left edge of the canvas.
          </p>
        </div>
      </ScrollArea>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Typography + Effects sub-sections                                  */
/* ------------------------------------------------------------------ */

function TypographySubheader() {
  return (
    <div className="pt-1">
      <Label className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/80 font-semibold">
        Typography
      </Label>
    </div>
  )
}

function EffectsSection({
  effect,
  hoverEffect,
  onEffectChange,
  onHoverEffectChange,
}: {
  effect: string
  hoverEffect: string
  onEffectChange: (v: string) => void
  onHoverEffectChange: (v: string) => void
}) {
  const effectOptions = SELECT_OPTIONS.effect ?? []
  const hoverOptions = SELECT_OPTIONS.hoverEffect ?? []
  return (
    <div className="space-y-3">
      <Label className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/80 font-semibold">
        Effects
      </Label>
      <FieldRow label="Scroll animation">
        <Select value={effect} onValueChange={onEffectChange}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {effectOptions.map((opt) => (
              <SelectItem key={opt} value={opt} className="text-sm">
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldRow>
      <FieldRow label="Hover effect">
        <Select value={hoverEffect} onValueChange={onHoverEffectChange}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {hoverOptions.map((opt) => (
              <SelectItem key={opt} value={opt} className="text-sm">
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldRow>
    </div>
  )
}
