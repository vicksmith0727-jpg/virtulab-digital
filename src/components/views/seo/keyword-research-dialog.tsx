'use client'

// Enriched Keyword Research dialog + result view + KeywordSection helper.
// Extracted from seo-tools-view.tsx. Calls /api/seo/keyword-research (not
// /api/ai/chat — the backend route composes a richer LLM prompt + parses
// structured JSON back).

import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  Loader2,
  Search,
  SearchCode,
  Sparkles,
  Copy,
  ArrowRight,
  Globe,
  HelpCircle,
  FileText,
  Heading,
  Braces,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/lib/store'
import { fetchJson, DynamicIcon } from '@/lib/client-utils'
import { cn } from '@/lib/utils'
import {
  type ToastFn,
  type KeywordResearchResult,
  type KeywordResearchResponse,
  copyToClipboard,
} from './types'

export function KeywordResearchDialog({
  open,
  onOpenChange,
  toast,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  toast: ToastFn
}) {
  const setView = useAppStore((s) => s.setView)
  const [keyword, setKeyword] = React.useState('')
  const [location, setLocation] = React.useState('')
  const [niche, setNiche] = React.useState('')
  const [result, setResult] = React.useState<KeywordResearchResult | null>(null)
  const [rawKeyword, setRawKeyword] = React.useState('')

  const mut = useMutation({
    mutationFn: (payload: { keyword: string; location?: string; niche?: string }) =>
      fetchJson<KeywordResearchResponse>('/api/seo/keyword-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      setRawKeyword(data.keyword)
      if (data.result?.error) {
        toast({
          title: 'Research returned an error',
          description: data.result.error,
          variant: 'destructive',
        })
      } else {
        toast({ title: 'Keyword research complete' })
      }
      setResult(data.result)
    },
    onError: (err: Error) =>
      toast({ title: 'Keyword research failed', description: err.message, variant: 'destructive' }),
  })

  React.useEffect(() => {
    if (!open) {
      setKeyword('')
      setLocation('')
      setNiche('')
      setResult(null)
      setRawKeyword('')
    }
  }, [open])

  function run() {
    const k = keyword.trim()
    if (!k) {
      toast({ title: 'Enter a keyword first', variant: 'destructive' })
      return
    }
    setResult(null)
    mut.mutate({
      keyword: k,
      location: location.trim() || undefined,
      niche: niche.trim() || undefined,
    })
  }

  function copyAll() {
    if (!result) return
    const lines: string[] = []
    lines.push(`KEYWORD RESEARCH — ${rawKeyword || keyword}`)
    if (location) lines.push(`Location: ${location}`)
    if (niche) lines.push(`Niche: ${niche}`)
    lines.push('')
    if (result.primaryKeyword) {
      lines.push(`PRIMARY KEYWORD: ${result.primaryKeyword}`)
      lines.push(`SEARCH INTENT: ${result.searchIntent ?? ''}`)
    }
    if (result.peopleAlsoSearch?.length) {
      lines.push('')
      lines.push('PEOPLE ALSO SEARCH:')
      result.peopleAlsoSearch.forEach((s, i) => lines.push(`  ${i + 1}. ${s}`))
    }
    if (result.peopleAlsoAsk?.length) {
      lines.push('')
      lines.push('PEOPLE ALSO ASK:')
      result.peopleAlsoAsk.forEach((q, i) => lines.push(`  ${i + 1}. ${q}`))
    }
    if (result.faqs?.length) {
      lines.push('')
      lines.push('FAQs:')
      result.faqs.forEach((f) => {
        lines.push(`  Q: ${f.question}`)
        lines.push(`  A: ${f.answer}`)
      })
    }
    if (result.suggestedKeywords?.length) {
      lines.push('')
      lines.push('SUGGESTED KEYWORDS:')
      result.suggestedKeywords.forEach((s) => {
        lines.push(`  - ${s.keyword} [intent=${s.intent}, diff=${s.difficulty}, rel=${s.relevance}]`)
      })
    }
    if (result.semanticKeywords?.length) {
      lines.push('')
      lines.push('SEMANTIC KEYWORDS:')
      result.semanticKeywords.forEach((s) => lines.push(`  - ${s}`))
    }
    if (result.longTailVariations?.length) {
      lines.push('')
      lines.push('LONG-TAIL VARIATIONS:')
      result.longTailVariations.forEach((s) => lines.push(`  - ${s}`))
    }
    if (result.contentGaps?.length) {
      lines.push('')
      lines.push('CONTENT GAPS:')
      result.contentGaps.forEach((s) => lines.push(`  - ${s}`))
    }
    if (result.titleIdeas?.length) {
      lines.push('')
      lines.push('TITLE IDEAS:')
      result.titleIdeas.forEach((t, i) => lines.push(`  ${i + 1}. ${t}`))
    }
    if (result.metaDescription) {
      lines.push('')
      lines.push(`META DESCRIPTION: ${result.metaDescription}`)
    }
    copyToClipboard(lines.join('\n'), 'Keyword research', toast)
  }

  function sendToContentBrief() {
    const k = (result?.primaryKeyword || rawKeyword || keyword).trim()
    if (!k) return
    onOpenChange(false)
    // Switch to the Content Generation view (where the content-brief tool lives).
    // The user can pick "Content Brief" there; we set the keyword in a global
    // event so the content view can pre-fill it.
    setView({ name: 'content-tools' })
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('content-tools:prefill', {
          detail: { keyword: k, source: 'keyword-research' },
        }),
      )
    }
    toast({ title: 'Opening Content Brief', description: `Keywords: ${k}` })
  }

  function runFullPipeline() {
    const k = (result?.primaryKeyword || rawKeyword || keyword).trim()
    if (!k) return
    onOpenChange(false)
    setView({ name: 'flows' })
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('flows:run-template-0', { detail: { userInput: k } }),
      )
    }
    toast({
      title: 'Running SEO Content Pipeline',
      description: `Keyword: ${k} → flows view`,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DynamicIcon name="SearchCode" className="size-4 text-forest" />
            Keyword Research
            <Badge variant="outline" className="text-forest border-sage/50 bg-sage/10">
              <Sparkles className="size-3" /> Enriched
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Comprehensive keyword research: PAS, PAA, FAQs, suggested + semantic keywords, content gaps,
            title ideas, and a meta description. Powered by the connected LLM.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1 -mr-1 space-y-4">
          {/* Inputs */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-1">
              <Label htmlFor="kw-research-keyword" className="text-xs text-muted-foreground uppercase tracking-wider">
                Keyword <span className="text-destructive">*</span>
              </Label>
              <Input
                id="kw-research-keyword"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g. tankless water heater"
                disabled={mut.isPending}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !mut.isPending) run()
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kw-research-location" className="text-xs text-muted-foreground uppercase tracking-wider">
                Location
              </Label>
              <Input
                id="kw-research-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Austin, TX"
                disabled={mut.isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kw-research-niche" className="text-xs text-muted-foreground uppercase tracking-wider">
                Niche
              </Label>
              <Input
                id="kw-research-niche"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="e.g. plumbing"
                disabled={mut.isPending}
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              className="bg-forest text-primary-foreground hover:bg-forest/90"
              disabled={mut.isPending || !keyword.trim()}
              onClick={run}
            >
              {mut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              Research
            </Button>
          </div>

          {/* Loading */}
          {mut.isPending && (
            <div className="rounded-lg border border-forest/30 bg-forest/5 p-4 text-sm text-foreground flex items-start gap-2">
              <Loader2 className="size-4 animate-spin text-forest mt-0.5" />
              <div>
                Researching keywords, PAS, PAA, FAQs, suggested keywords, semantic terms, content gaps,
                title ideas, and a meta description…
              </div>
            </div>
          )}

          {/* Result */}
          {!mut.isPending && result && <KeywordResearchResultView result={result} />}

          {/* Error fallback */}
          {!mut.isPending && result?.rawResponse && (
            <div className="rounded-md bg-bark/95 text-cream p-4 text-xs font-mono max-h-72 overflow-y-auto whitespace-pre-wrap break-words">
              {result.rawResponse}
            </div>
          )}
        </div>

        {result && !mut.isPending && (
          <DialogFooter className="gap-2 sm:gap-2 flex-wrap">
            <Button type="button" variant="ghost" onClick={copyAll}>
              <Copy className="size-4" /> Copy all
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-sage/50 bg-sage/10 text-moss hover:bg-sage/20"
              onClick={sendToContentBrief}
            >
              <ArrowRight className="size-4" /> Send to Content Brief
            </Button>
            <Button
              type="button"
              className="bg-forest text-primary-foreground hover:bg-forest/90"
              onClick={runFullPipeline}
            >
              <Sparkles className="size-4" /> Run full SEO Content Pipeline
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

/* ---- Result view --------------------------------------------------- */

// Renamed to avoid clashing with the `KeywordResearchResult` type export.
function KeywordResearchResultView({ result }: { result: KeywordResearchResult }) {
  const pas = result.peopleAlsoSearch ?? []
  const paa = result.peopleAlsoAsk ?? []
  const faqs = result.faqs ?? []
  const suggested = result.suggestedKeywords ?? []
  const semantic = result.semanticKeywords ?? []
  const longTail = result.longTailVariations ?? []
  const gaps = result.contentGaps ?? []
  const titles = result.titleIdeas ?? []

  return (
    <div className="space-y-4">
      {/* Primary keyword + search intent */}
      {result.primaryKeyword && (
        <Card className="border-forest/30 bg-forest/5">
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="size-9 rounded-xl bg-forest/15 text-forest flex items-center justify-center shrink-0">
                <Search className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Primary keyword
                </p>
                <p className="text-base font-semibold text-foreground truncate">{result.primaryKeyword}</p>
              </div>
              {result.searchIntent && (
                <Badge variant="outline" className="text-forest border-forest/40 bg-forest/10">
                  {result.searchIntent}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* PAS chips */}
      {pas.length > 0 && (
        <KeywordSection title="People Also Search" icon={<Globe className="size-3.5" />}>
          <div className="flex flex-wrap gap-1.5">
            {pas.map((s, i) => (
              <Badge
                key={i}
                variant="outline"
                className="text-xs border-sage/50 bg-sage/10 text-moss font-normal"
              >
                {s}
              </Badge>
            ))}
          </div>
        </KeywordSection>
      )}

      {/* PAA list */}
      {paa.length > 0 && (
        <KeywordSection title="People Also Ask" icon={<HelpCircle className="size-3.5" />}>
          <ul className="space-y-1.5">
            {paa.map((q, i) => (
              <li
                key={i}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground/90"
              >
                <span className="text-forest font-medium mr-1.5">Q{i + 1}.</span>
                {q}
              </li>
            ))}
          </ul>
        </KeywordSection>
      )}

      {/* FAQs accordion */}
      {faqs.length > 0 && (
        <KeywordSection title="FAQs" icon={<FileText className="size-3.5" />}>
          <Accordion type="multiple" className="rounded-md border border-border bg-background px-3 divide-y">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border-b-0">
                <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline py-3">
                  {f.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{f.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </KeywordSection>
      )}

      {/* Suggested keywords table */}
      {suggested.length > 0 && (
        <KeywordSection title="Suggested keywords" icon={<Sparkles className="size-3.5" />}>
          <div className="rounded-md border border-border bg-background overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/60 text-muted-foreground">
                  <th className="text-left font-medium px-3 py-2">Keyword</th>
                  <th className="text-left font-medium px-3 py-2">Intent</th>
                  <th className="text-left font-medium px-3 py-2">Difficulty</th>
                  <th className="text-left font-medium px-3 py-2">Relevance</th>
                </tr>
              </thead>
              <tbody>
                {suggested.map((s, i) => (
                  <tr key={i} className="border-t border-border/60">
                    <td className="px-3 py-2 font-medium text-foreground">{s.keyword}</td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className="text-[10px] text-moss border-sage/40 bg-sage/10">
                        {s.intent}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px]',
                          s.difficulty === 'low'
                            ? 'text-forest border-forest/40 bg-forest/10'
                            : s.difficulty === 'medium'
                              ? 'text-clay border-clay/40 bg-clay/10'
                              : 'text-terracotta border-terracotta/40 bg-terracotta/10',
                        )}
                      >
                        {s.difficulty}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px]',
                          s.relevance === 'high'
                            ? 'text-forest border-forest/40 bg-forest/10'
                            : s.relevance === 'medium'
                              ? 'text-clay border-clay/40 bg-clay/10'
                              : 'text-muted-foreground border-border bg-muted/40',
                        )}
                      >
                        {s.relevance}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </KeywordSection>
      )}

      {/* Semantic keywords */}
      {semantic.length > 0 && (
        <KeywordSection title="Semantic keywords" icon={<Braces className="size-3.5" />}>
          <div className="flex flex-wrap gap-1.5">
            {semantic.map((s, i) => (
              <Badge
                key={i}
                variant="outline"
                className="text-xs border-forest/40 bg-forest/5 text-forest font-normal"
              >
                {s}
              </Badge>
            ))}
          </div>
        </KeywordSection>
      )}

      {/* Long-tail variations */}
      {longTail.length > 0 && (
        <KeywordSection title="Long-tail variations" icon={<ArrowRight className="size-3.5" />}>
          <div className="flex flex-wrap gap-1.5">
            {longTail.map((s, i) => (
              <Badge
                key={i}
                variant="outline"
                className="text-xs border-terracotta/40 bg-terracotta/5 text-terracotta font-normal"
              >
                {s}
              </Badge>
            ))}
          </div>
        </KeywordSection>
      )}

      {/* Content gaps */}
      {gaps.length > 0 && (
        <KeywordSection title="Content gaps" icon={<AlertTriangle className="size-3.5" />}>
          <ul className="space-y-1.5">
            {gaps.map((g, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground/90">
                <span className="text-terracotta mt-1">•</span>
                <span>{g}</span>
              </li>
            ))}
          </ul>
        </KeywordSection>
      )}

      {/* Title ideas */}
      {titles.length > 0 && (
        <KeywordSection title="Title ideas" icon={<Heading className="size-3.5" />}>
          <ol className="space-y-1.5 list-decimal list-inside marker:text-forest marker:font-semibold">
            {titles.map((t, i) => (
              <li key={i} className="text-sm text-foreground/90 pl-1">
                {t}
              </li>
            ))}
          </ol>
        </KeywordSection>
      )}

      {/* Meta description */}
      {result.metaDescription && (
        <Card className="border-terracotta/40 bg-terracotta/5">
          <CardContent className="pt-4 pb-4 px-4">
            <p className="text-[10px] uppercase tracking-wider text-terracotta font-medium mb-1.5">
              Suggested meta description
            </p>
            <p className="text-sm text-foreground/90 leading-relaxed">{result.metaDescription}</p>
          </CardContent>
        </Card>
      )}

      {/* Error fallback */}
      {result.error && !result.rawResponse && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {result.error}
        </div>
      )}
    </div>
  )
}

function KeywordSection({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        {title}
      </div>
      {children}
    </div>
  )
}
