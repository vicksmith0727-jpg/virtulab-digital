'use client'

// AI-powered SEO tools (input: 'text') — opens a dialog that builds a prompt
// based on the tool id and POSTs to /api/ai/chat. Extracted from seo-tools-view.tsx.

import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  Loader2,
  Sparkles,
  Copy,
  Download,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { fetchJson, DynamicIcon } from '@/lib/client-utils'
import {
  type SeoToolDef,
  type ToastFn,
  type AiPromptSpec,
  copyToClipboard,
  downloadTextFile,
} from './types'

/* ---- AI prompt builders per tool --------------------------------- */

const AI_PROMPTS: Record<string, AiPromptSpec> = {
  'keyword-research': {
    placeholder: 'Describe your business / niche / topic (e.g. "plumbing in Austin TX")',
    build: (input) =>
      `Suggest 15 SEO keywords for "${input}". Group by intent (informational, commercial, local). Include the rough monthly search volume next to each if you can estimate it. Return as a clean, scannable list with the intent groups as headings.`,
  },
  'ai-visibility': {
    placeholder: 'Your business / topic (e.g. "organic bakery in Portland")',
    build: (input) =>
      `Check if "${input}" appears in AI answers (ChatGPT, Perplexity, Google AI Overviews). Suggest 5 concrete ways to increase AI visibility (AEO/GEO) — focus on schema, FAQ content, and answer-focused copy. Return as a short bulleted report.`,
  },
  'content-brief': {
    placeholder: 'Target keyword or topic (e.g. "tankless water heater cost")',
    build: (input) =>
      `Create an SEO content brief for "${input}". Include: target keyword, 3-5 secondary keywords, suggested H1, suggested H2 structure (at least 5), recommended word count, 3 internal link suggestions, a meta title (under 60 chars), and a meta description (under 160 chars). Return as a clean, scannable brief.`,
  },
  'schema-gen': {
    placeholder: 'Business type + city (e.g. "Plumber in Austin, TX")',
    codeBlock: true,
    build: (input) =>
      `Generate JSON-LD schema for "${input}". Use the LocalBusiness type (or a more specific subtype if appropriate). Fill with placeholder values I can edit (name, address, phone, openingHours, geo, url). Return ONLY the JSON-LD script block, ready to paste into HTML — no markdown fences, no explanation.`,
  },
  'meta-title-gen': {
    placeholder: 'Page topic / target keyword',
    build: (input) =>
      `Generate 5 optimized SEO meta titles for "${input}". Each under 60 chars. Include the target keyword near the front. Return as a numbered list.`,
  },
  'meta-desc-gen': {
    placeholder: 'Page topic / target keyword',
    build: (input) =>
      `Generate 5 optimized SEO meta descriptions for "${input}". Each under 160 chars. Include the target keyword and a call-to-action. Return as a numbered list.`,
  },
  'content-rewriter': {
    placeholder: 'Paste the content to rewrite…',
    textarea: true,
    build: (input) =>
      `Rewrite this content for better SEO + readability:\n\n"""\n${input}\n"""\n\nKeep the meaning, add headings if needed, keep it concise and easy to read. Return only the rewritten content.`,
  },
  'faq-generator': {
    placeholder: 'Topic for the FAQ (e.g. "water heater maintenance")',
    build: (input) =>
      `Generate 8 FAQ questions + concise answers about "${input}". Format as a markdown list with "Q:" and "A:" markers. At the end, also include a single JSON-LD FAQPage schema block with the same Q&A, ready to paste into HTML.`,
  },

  // ─── SEO Strategy tools (category: 'strategy') ───
  'hub-spoke-generator': {
    placeholder: 'Topic / pillar (e.g. "compost for home gardens")',
    build: (input) =>
      `Create a hub-and-spoke content architecture for: "${input}". Generate: 1 pillar/hub page (title, target keyword, outline) + 8-12 supporting spoke pages (title, target keyword, 1-line description). Include an internal link map showing which spokes link to the hub and to each other. Format as a table.`,
  },
  'semantic-generator': {
    placeholder: 'Target keyword (e.g. "tankless water heater")',
    build: (input) =>
      `Generate a semantic SEO cluster for the target keyword: "${input}". Include: 15-20 semantically related terms, 10 entities Google expects (people, places, concepts, brands), 5 related questions (People Also Ask style), and 3 topical subclusters. This helps Google understand the content is comprehensive.`,
  },
  'global-seo-generator': {
    placeholder: 'Brand / business + primary market (e.g. "organic skincare — already in US")',
    build: (input) =>
      `Generate an international SEO strategy for: "${input}". Include: target countries (5-10), hreflang tag map (language-region pairs), country-specific landing page structure, local keyword variations per country, currency + language considerations, and a rollout priority (which countries first). Format as a table.`,
  },
  'national-seo-generator': {
    placeholder: 'Business / niche + country (e.g. "plumbing services — United States")',
    build: (input) =>
      `Generate a national SEO strategy for: "${input}" (single country). Include: national keyword clusters (branded vs non-branded), 10 major-city landing pages (city + keyword combos), competitor gap analysis (3 competitors, their top keywords you don't rank for), and a 90-day action plan. Format as a table + list.`,
  },
}

const DEFAULT_AI_PROMPT: AiPromptSpec = {
  placeholder: 'Describe what you want to optimize or analyze…',
  build: (input) => `Suggest SEO recommendations for "${input}". Return as a clean, scannable list.`,
}

function getAiPromptSpec(toolId: string): AiPromptSpec {
  return AI_PROMPTS[toolId] ?? DEFAULT_AI_PROMPT
}

/* ---- AI generic dialog ------------------------------------------- */

export function AiGenericDialog({
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
  const spec = getAiPromptSpec(tool.id)
  const [input, setInput] = React.useState('')
  const [reply, setReply] = React.useState<string | null>(null)
  const mut = useMutation({
    mutationFn: (messages: { role: 'user' | 'assistant'; content: string }[]) =>
      fetchJson('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      }),
    onSuccess: (data: { reply: string }) => setReply(data.reply ?? 'No reply.'),
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
            <Label htmlFor={`ai-${tool.id}`} className="text-xs text-muted-foreground">
              Context
              <span className="text-destructive ml-0.5">*</span>
            </Label>
            {spec.textarea ? (
              <Textarea
                id={`ai-${tool.id}`}
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
                id={`ai-${tool.id}`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !mut.isPending) run()
                }}
                placeholder={spec.placeholder}
              />
            )}
            {spec.textarea && (
              <p className="text-[10px] text-muted-foreground">
                Press ⌘/Ctrl + Enter to generate.
              </p>
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
                  {spec.codeBlock && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => {
                        const clean = reply
                          .replace(/^\s*<script[^>]*>/i, '')
                          .replace(/<\/script>\s*$/i, '')
                          .trim()
                        downloadTextFile(
                          `${tool.id}.txt`,
                          clean,
                          spec.codeBlock ? 'application/ld+json' : 'text/plain',
                        )
                      }}
                    >
                      <Download className="size-3" /> Download
                    </Button>
                  )}
                </div>
              </div>
              {spec.codeBlock ? (
                <pre
                  className="rounded-md bg-bark/95 text-cream p-4 text-xs font-mono max-h-96 overflow-y-auto leading-relaxed"
                  style={{ scrollbarColor: 'var(--color-forest) transparent' }}
                >
                  <code>{reply}</code>
                </pre>
              ) : (
                <div
                  className="rounded-lg border border-forest/30 bg-forest/5 p-4 text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto"
                  style={{ scrollbarColor: 'var(--color-forest) transparent' }}
                >
                  {reply}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
