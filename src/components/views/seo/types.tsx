// Shared types + helpers for the SEO tools view + extracted sub-components.
// Extracted from `seo-tools-view.tsx` so the giant 3.4k-line view could be split
// into focused files (audit-result, check-dialog, ai-tool-dialog, etc.).

import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

/* ---- Audit result envelope types (mirror backend SeoAuditResult) ---- */

export type SeoCheckStatus = 'pass' | 'warn' | 'fail' | 'info'

export interface SeoCheck {
  id: string
  title: string
  status: SeoCheckStatus
  message: string
  detail?: string
  score: number
}

export interface SeoAuditMeta {
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

export interface SeoAuditResult {
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

export interface MetaCheckResult {
  ok: boolean
  url: string
  httpStatus: number
  meta: SeoAuditMeta
  headings: { h1: string[]; h2: string[]; h3: string[] }
  schema: any[]
  openGraph: Record<string, string>
}

export interface SitemapResult {
  ok: boolean
  domain: string
  pageCount: number
  pages: { id: string; slug: string; name: string; updatedAt: string }[]
  sitemap: string
}

export interface SeoToolDef {
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

export interface SeoToolCategory {
  id: string
  label: string
}

export interface ToolsResponse {
  tools: SeoToolDef[]
  categories: SeoToolCategory[]
  note: string
}

export interface ProjectLite {
  id: string
  name: string
  subdomain?: string | null
  status?: string
  pages?: { id: string; name: string; slug: string; isHome: boolean }[]
}

export interface CheckResultEnvelope {
  ok: boolean
  tool: string
  url: string
  result: any
}

export interface AiPromptSpec {
  placeholder: string
  textarea?: boolean
  codeBlock?: boolean
  build: (input: string) => string
}

export interface KeywordResearchResult {
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

export interface KeywordResearchResponse {
  ok: boolean
  keyword: string
  location?: string | null
  result: KeywordResearchResult
  error?: string
}

/* ---- Toast helper alias ---- */

export type ToastFn = ReturnType<typeof useToast>['toast']

/* ---- Small utilities (clipboard + download) ---- */

export function copyToClipboard(text: string, label: string, toast: ToastFn) {
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    toast({ title: 'Clipboard unavailable', variant: 'destructive' })
    return
  }
  navigator.clipboard
    .writeText(text)
    .then(() => toast({ title: `${label} copied` }))
    .catch(() => toast({ title: `Could not copy ${label}`, variant: 'destructive' }))
}

export function downloadTextFile(filename: string, contents: string, mime: string) {
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

/* ---- Grade + status helpers (used by AuditResultView) ---- */

export const GRADE_STYLES: Record<string, string> = {
  A: 'bg-forest text-primary-foreground',
  B: 'bg-sage text-foreground',
  C: 'bg-clay text-primary-foreground',
  D: 'bg-terracotta text-primary-foreground',
  F: 'bg-destructive text-destructive-foreground',
}

export const GRADE_LABEL: Record<string, string> = {
  A: 'Excellent',
  B: 'Good',
  C: 'Fair',
  D: 'Needs work',
  F: 'Critical',
}

export const STATUS_BORDER: Record<SeoCheckStatus, string> = {
  pass: 'border-l-forest/40',
  warn: 'border-l-clay/50',
  fail: 'border-l-destructive/50',
  info: 'border-l-border',
}

export function StatusIcon({ status, className }: { status: SeoCheckStatus; className?: string }) {
  if (status === 'pass') return <CheckCircle2 className={cn('text-forest', className)} />
  if (status === 'warn') return <AlertTriangle className={cn('text-clay', className)} />
  if (status === 'fail') return <XCircle className={cn('text-destructive', className)} />
  return <Info className={cn('text-muted-foreground', className)} />
}

/* ---- Shared metric box ---- */

export function MetricBox({
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
