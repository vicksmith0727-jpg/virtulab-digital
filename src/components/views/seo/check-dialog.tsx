'use client'

// Focused-check dialog (input: 'url' tools → POST /api/seo/check).
// Includes the per-tool result renderers (broken links, headings, page speed,
// robots.txt, schema, images, internal links, redirects, mobile, density,
// readability, sitemap validator, hreflang, title, meta desc, canonical,
// duplicate content, generic). Extracted from seo-tools-view.tsx.

import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  Loader2,
  Search,
  Copy,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Braces,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { fetchJson, DynamicIcon } from '@/lib/client-utils'
import { cn } from '@/lib/utils'
import {
  type SeoToolDef,
  type ToastFn,
  type CheckResultEnvelope,
  copyToClipboard,
  MetricBox,
} from './types'

/* ---- CheckDialog --------------------------------------------------- */

export function CheckDialog({
  tool,
  open,
  onOpenChange,
  toast,
}: {
  tool: SeoToolDef
  open: boolean
  onOpenChange: (o: boolean) => void
  toast: ToastFn
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

/* ---- Per-tool result router -------------------------------------- */

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
