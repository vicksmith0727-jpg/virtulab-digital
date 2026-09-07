'use client'

// AI Tool Router hero — describe a goal, the assistant picks the right tools
// to connect. The reply is rendered with integration-name chips that scroll
// to the matching card on click. Extracted from integrations-view.tsx.

import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { Loader2, Sparkles, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { fetchJson } from '@/lib/client-utils'

// Shared list of integration names so we can hyperlink them inside the AI reply.
const KNOWN_INTEGRATION_NAMES = [
  'AI Copy (built-in)',
  'WordPress',
  'WordPress MCP Server',
  'WordPress MCP (tropk-ai)',
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
  'Kilocode',
  'Awesome OpenCode',
  'Cloudinary',
  'Uploadthing',
]

export function renderReplyWithChips(
  text: string,
  onChip: (name: string) => void,
): React.ReactNode {
  if (!text) return null
  const sorted = [...KNOWN_INTEGRATION_NAMES].sort((a, b) => b.length - a.length)
  const escaped = sorted.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const re = new RegExp(`(${escaped.join('|')})`, 'g')

  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) parts.push(text.slice(lastIndex, m.index))
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

export function AiToolRouterHero({
  scrollToCard,
}: {
  scrollToCard: (name: string) => void
}) {
  const { toast } = useToast()
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
      toast({ title: 'Assistant unavailable', variant: 'destructive' }),
  })

  function submitAiGoal() {
    const goal = aiGoal.trim()
    if (!goal) return
    setAiReply(null)
    aiChatMut.mutate({
      messages: [
        {
          role: 'user',
          content: `I want to ${goal}. Which integrations should I connect?`,
        },
      ],
    })
  }

  return (
    <Card className="mb-8 border-forest/30 bg-forest/5">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-xl bg-forest/15 text-forest flex items-center justify-center shrink-0">
            <Sparkles className="size-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-foreground">AI Tool Router</h2>
            <p className="text-sm text-foreground/70 mt-0.5">
              Describe your goal and the assistant picks the right tools to connect.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <Input
            value={aiGoal}
            onChange={(e) => setAiGoal(e.target.value)}
            placeholder="e.g. track traffic and collect newsletter signups"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !aiChatMut.isPending) submitAiGoal()
            }}
            className="flex-1"
          />
          <Button
            className="bg-forest text-primary-foreground hover:bg-forest/90 shrink-0"
            disabled={aiChatMut.isPending}
            onClick={submitAiGoal}
          >
            {aiChatMut.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Ask the assistant
          </Button>
        </div>

        {aiChatMut.isPending && !aiReply && (
          <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="size-4 animate-spin text-forest" />
            Asking the assistant…
          </div>
        )}

        {aiReply && (
          <div className="rounded-lg border border-forest/30 bg-forest/5 p-4 text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
            {renderReplyWithChips(aiReply, scrollToCard)}
          </div>
        )}

        {!aiReply && !aiChatMut.isPending && (
          <p className="text-xs text-muted-foreground">
            Tip: mention &ldquo;publish to WordPress&rdquo;, &ldquo;free local
            LLM&rdquo;, &ldquo;newsletter&rdquo;, or &ldquo;analytics&rdquo;.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
