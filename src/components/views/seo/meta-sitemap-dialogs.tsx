'use client'

// Meta Tag Preview dialog + Sitemap Generator dialog.
// Extracted from seo-tools-view.tsx.

import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  Loader2,
  Search,
  Map,
  Copy,
  Download,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { fetchJson } from '@/lib/client-utils'
import {
  type ToastFn,
  type ProjectLite,
  type MetaCheckResult,
  type SitemapResult,
  copyToClipboard,
  downloadTextFile,
} from './types'

/* ---- Meta preview dialog ----------------------------------------- */

export function MetaPreviewDialog({
  open,
  onOpenChange,
  toast,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  toast: ToastFn
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

/* ---- Sitemap dialog ---------------------------------------------- */

export function SitemapDialog({
  open,
  onOpenChange,
  projects,
  toast,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  projects: ProjectLite[]
  toast: ToastFn
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
