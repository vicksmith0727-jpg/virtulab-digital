'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Loader2,
  Check,
  Layers,
  Search,
  Bug,
  Flame,
  Droplets,
  Home,
  Trees,
  Zap,
  Sparkles,
  Building,
  Plus,
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

interface Template {
  id: string
  name: string
  category: string
  description?: string | null
  thumbnail?: string | null
  blocks: any[]
}

async function fetchJson(url: string, opts?: RequestInit) {
  const res = await fetch(url, opts)
  if (!res.ok) throw new Error((await res.text().catch(() => '')) || 'Request failed')
  return res.json()
}

const gradientFor = (key: string) => {
  const grads = [
    'from-forest/80 to-sage/70',
    'from-sage/80 to-moss/70',
    'from-terracotta/80 to-clay/70',
    'from-moss/80 to-forest/70',
    'from-clay/80 to-sand/70',
    'from-sand/80 to-sage/70',
  ]
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return grads[h % grads.length]
}

// Category → { icon, gradient } for the local business templates so each gets
// a distinct, organic, on-theme thumbnail with a large relevant lucide icon.
const LOCAL_BUSINESS_VISUALS: Record<
  string,
  { icon: typeof Bug; gradient: string }
> = {
  'pest-control': { icon: Bug, gradient: 'from-forest/85 to-moss/70' },
  'hvac': { icon: Flame, gradient: 'from-terracotta/85 to-clay/70' },
  'plumbing': { icon: Droplets, gradient: 'from-sage/85 to-forest/70' },
  'roofing': { icon: Home, gradient: 'from-clay/85 to-sand/70' },
  'landscaping': { icon: Trees, gradient: 'from-moss/85 to-forest/70' },
  'electrical': { icon: Zap, gradient: 'from-sand/85 to-clay/70' },
  'cleaning': { icon: Sparkles, gradient: 'from-sage/80 to-sand/70' },
  'contractor': { icon: Building, gradient: 'from-bark/85 to-clay/70' },
}

const LOCAL_BUSINESS_CATEGORIES = new Set(Object.keys(LOCAL_BUSINESS_VISUALS))

function isLocalBusiness(category: string): boolean {
  return LOCAL_BUSINESS_CATEGORIES.has(category)
}

/* ------------------------------------------------------------------ */

export function TemplatesView() {
  const setView = useAppStore((s) => s.setView)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [category, setCategory] = React.useState<string>('all')
  const [query, setQuery] = React.useState('')

  const templatesQuery = useQuery<{ templates: Template[] }>({
    queryKey: ['templates'],
    queryFn: () => fetchJson('/api/templates'),
  })

  // Projects list — populates the project picker in the "Save project as template" dialog.
  const projectsQuery = useQuery<{
    projects: { id: string; name: string; updatedAt: string }[]
  }>({
    queryKey: ['projects'],
    queryFn: () => fetchJson('/api/projects'),
  })

  // "+" save-project-as-template dialog state
  const [saveTplOpen, setSaveTplOpen] = React.useState(false)
  const [tplForm, setTplForm] = React.useState({
    name: '',
    category: 'custom',
    description: '',
  })
  const [tplProjectId, setTplProjectId] = React.useState<string>('')
  const saveTplMut = useMutation({
    mutationFn: (payload: {
      name: string
      category?: string
      description?: string
      projectId: string
    }) =>
      fetchJson('/api/templates/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      toast({ title: 'Template saved' })
      setSaveTplOpen(false)
      setTplForm({ name: '', category: 'custom', description: '' })
      setTplProjectId('')
    },
    onError: (err: any) => {
      const msg = err?.message || 'Could not save template'
      toast({ title: 'Save failed', description: msg, variant: 'destructive' })
    },
  })

  function submitSaveTemplate() {
    const name = tplForm.name.trim()
    if (!name || !tplProjectId) return
    saveTplMut.mutate({
      name,
      category: tplForm.category.trim().toLowerCase() || 'custom',
      description: tplForm.description.trim() || undefined,
      projectId: tplProjectId,
    })
  }

  const createProjectMut = useMutation({
    mutationFn: () =>
      fetchJson('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Untitled site' }),
      }),
  })

  const applyTemplateMut = useMutation({
    mutationFn: ({ projectId, templateId }: { projectId: string; templateId: string }) =>
      fetchJson(`/api/projects/${projectId}/apply-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId }),
      }),
  })

  const templates = templatesQuery.data?.templates ?? []
  // Derive categories dynamically so we pick up whatever the templates API returns.
  const allCategories = Array.from(new Set(templates.map((t) => t.category)))
  const localCategories = allCategories.filter((c) => isLocalBusiness(c))
  const otherCategories = allCategories.filter((c) => !isLocalBusiness(c))
  // Combined chip list (visible in the chip row). 'all' first, then the rest.
  const categories = ['all', ...otherCategories, ...localCategories]

  const filtered = templates.filter((t) => {
    if (category !== 'all' && t.category !== category) return false
    if (query && !t.name.toLowerCase().includes(query.toLowerCase())) return false
    return true
  })

  async function startWithTemplate(template: Template) {
    let projectData: any
    try {
      projectData = await createProjectMut.mutateAsync()
    } catch {
      toast({ title: 'Could not create project', variant: 'destructive' })
      return
    }
    try {
      const pageData = await applyTemplateMut.mutateAsync({
        projectId: projectData.project.id,
        templateId: template.id,
      })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      toast({ title: 'Template applied', description: 'Open the builder to make it yours.' })
      setView({
        name: 'builder',
        projectId: projectData.project.id,
        pageId: pageData?.page?.id,
      })
    } catch {
      // Fallback — go to builder with the freshly created project
      setView({ name: 'builder', projectId: projectData.project.id })
      toast({
        title: 'Project created',
        description: 'Template could not be applied — start from a blank page.',
        variant: 'destructive',
      })
    }
  }

  const busy = createProjectMut.isPending || applyTemplateMut.isPending

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">Grown locally</p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            Templates
          </h1>
          <p className="mt-2 text-foreground/70 max-w-2xl text-balance">
            Earth-toned, quiet, and tuned for makers. Pick one to start — you can change anything later.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-6">
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => {
              const lb = isLocalBusiness(c)
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition',
                    category === c
                      ? 'bg-forest text-primary-foreground border-forest'
                      : 'border-border bg-card text-foreground/70 hover:bg-muted',
                    lb && category !== c && 'border-forest/30 text-forest/80',
                  )}
                >
                  {c === 'all' ? 'All' : c.charAt(0).toUpperCase() + c.slice(1)}
                </button>
              )
            })}
          </div>
          <div className="relative sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search templates"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 pl-8 text-sm"
            />
          </div>
        </div>

        {/* Optional category grouping banner — only shown when there are local business
            templates AND we're viewing "all" so users can see the visual section break. */}
        {category === 'all' && localCategories.length > 0 && otherCategories.length > 0 && (
          <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center rounded-full border border-forest/30 bg-forest/5 px-2 py-0.5 text-forest">
              Local Business
            </span>
            <span>
              {localCategories.length} local business templates follow the original starter
              templates below.
            </span>
          </div>
        )}

        {/* Grid */}
        {templatesQuery.isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        ) : templatesQuery.isError ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
            Could not load templates.
          </div>
        ) : (
          <>
            {filtered.length === 0 && (
              <div className="rounded-3xl border-2 border-dashed border-border p-12 text-center mb-5">
                <p className="text-muted-foreground">No templates found.</p>
              </div>
            )}
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((t) => {
                const lb = isLocalBusiness(t.category)
                const visual = LOCAL_BUSINESS_VISUALS[t.category]
                const IconCmp = visual?.icon
                return (
                  <Card key={t.id} className="overflow-hidden py-0 gap-0">
                    <div
                      className={cn(
                        'h-40 w-full bg-gradient-to-br organic-grain relative',
                        lb && visual
                          ? visual.gradient
                          : gradientFor(t.id + t.name),
                      )}
                    >
                      {t.thumbnail ? (
                        <img
                          src={t.thumbnail}
                          alt={t.name}
                          className="w-full h-full object-cover"
                        />
                      ) : lb && IconCmp ? (
                        // Large centered lucide icon overlay for local business templates.
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="size-16 rounded-2xl bg-cream/85 text-forest flex items-center justify-center shadow-sm">
                            <IconCmp className="size-8" />
                          </div>
                        </div>
                      ) : null}
                      {lb && (
                        <span className="absolute top-2 left-2 inline-flex items-center rounded-full bg-cream/90 px-2 py-0.5 text-[10px] font-medium text-forest shadow-sm">
                          Local Business
                        </span>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-foreground">{t.name}</h3>
                        <Badge variant="outline" className="text-forest border-forest/40 capitalize">
                          {t.category}
                        </Badge>
                      </div>
                      {t.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {t.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                        <Layers className="size-3.5" />
                        {Array.isArray(t.blocks) ? t.blocks.length : 0} blocks
                      </div>
                      <Button
                        className="w-full bg-forest text-primary-foreground hover:bg-forest/90"
                        onClick={() => startWithTemplate(t)}
                        disabled={busy}
                      >
                        {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                        Use this template
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}

              {/* "+" save project as template dashed card — sits at the END of the grid */}
              <button
                type="button"
                onClick={() => setSaveTplOpen(true)}
                className={cn(
                  'group text-left rounded-2xl border-dashed border-2 border-forest/40 hover:border-forest',
                  'bg-forest/5 p-5 transition-colors flex flex-col items-start gap-3 min-h-[268px]',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2',
                )}
                aria-label="Save project as template"
              >
                <div className="size-12 rounded-xl bg-forest/10 text-forest flex items-center justify-center group-hover:bg-forest/15 transition">
                  <Plus className="size-6" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Save project as template</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Turn any of your projects into a reusable template.
                  </p>
                </div>
              </button>
            </div>
          </>
        )}
      </div>

      {/* "Save project as template" dialog */}
      <Dialog open={saveTplOpen} onOpenChange={setSaveTplOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-4 text-forest" /> Save project as template
            </DialogTitle>
            <DialogDescription>
              Pick a project — we&rsquo;ll save its home page blocks as a reusable template
              you can start from anytime.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              submitSaveTemplate()
            }}
            className="space-y-3"
          >
            <div className="space-y-1.5">
              <Label htmlFor="tpl-project">Project *</Label>
              <Select
                value={tplProjectId}
                onValueChange={(v) => setTplProjectId(v)}
              >
                <SelectTrigger id="tpl-project" className="w-full">
                  <SelectValue placeholder="Choose a project" />
                </SelectTrigger>
                <SelectContent>
                  {(projectsQuery.data?.projects ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(projectsQuery.data?.projects ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No projects yet — create one in the dashboard first.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tpl-name">Template name *</Label>
              <Input
                id="tpl-name"
                required
                value={tplForm.name}
                onChange={(e) => setTplForm({ ...tplForm, name: e.target.value })}
                placeholder="e.g. Local HVAC landing page"
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tpl-category">Category</Label>
              <Input
                id="tpl-category"
                list="tpl-category-list"
                value={tplForm.category}
                onChange={(e) => setTplForm({ ...tplForm, category: e.target.value })}
                placeholder="custom"
                className="h-9"
              />
              <datalist id="tpl-category-list">
                <option value="custom" />
                <option value="local-business" />
                <option value="contractor" />
                <option value="studio" />
                <option value="cafe" />
                <option value="portfolio" />
                <option value="nonprofit" />
                <option value="farm" />
              </datalist>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tpl-description">Description</Label>
              <Textarea
                id="tpl-description"
                value={tplForm.description}
                onChange={(e) => setTplForm({ ...tplForm, description: e.target.value })}
                placeholder="What is this template for?"
                className="min-h-16 text-sm"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSaveTplOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saveTplMut.isPending || !tplForm.name.trim() || !tplProjectId}
                className="bg-forest text-primary-foreground hover:bg-forest/90"
              >
                {saveTplMut.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                Save template
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
