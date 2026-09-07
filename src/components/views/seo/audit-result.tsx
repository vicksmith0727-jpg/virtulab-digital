'use client'

// Audit results view + its sub-cards (extracted from seo-tools-view.tsx).
// Renders the rich output of a /api/seo/audit run: score header, checks list,
// extracted meta, headings, images, broken links, schema, local SEO.

import * as React from 'react'
import { motion } from 'framer-motion'
import {
  CheckCircle2,
  XCircle,
  ExternalLink,
  Globe,
  Zap,
  Clock,
  HardDrive,
  ClipboardCheck,
  ChevronDown,
  Search,
  Heading,
  Image as ImageIcon,
  Link2,
  Braces,
  MapPin,
  Phone,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import {
  type SeoAuditResult,
  type SeoAuditMeta,
  type SeoCheck,
  GRADE_STYLES,
  GRADE_LABEL,
  STATUS_BORDER,
  StatusIcon,
} from './types'

export function AuditResultView({ result }: { result: SeoAuditResult }) {
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
