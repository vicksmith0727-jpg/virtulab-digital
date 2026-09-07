'use client'

// "Run with Zeroclaw" banner — a first-class banner above the catalog. If
// Zeroclaw is not connected, shows a "Connect Zeroclaw" CTA that scrolls to
// the Zeroclaw card. If connected, shows an inline task input + Run button
// + response card. Extracted from integrations-view.tsx.

import * as React from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Loader2,
  Bot,
  CheckCircle2,
  Copy,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { fetchJson } from '@/lib/client-utils'

export function ZeroclawBanner() {
  const { toast } = useToast()
  const zeroclawQuery = useQuery<{ connected: boolean; endpoint: string | null }>({
    queryKey: ['zeroclaw'],
    queryFn: () => fetchJson('/api/zeroclaw/run'),
  })
  const zeroclawConnected = !!zeroclawQuery.data?.connected
  const [zcTask, setZcTask] = React.useState('')
  const [zcReply, setZcReply] = React.useState<string | null>(null)
  const zcRunMut = useMutation({
    mutationFn: (payload: { task: string }) =>
      fetchJson('/api/zeroclaw/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: (data: any) => setZcReply(data?.response ?? 'No response.'),
    onError: (err: any) => {
      let msg: string = err?.message || 'Zeroclaw task failed.'
      try {
        const m = msg.match(/\{[\s\S]*?\}/)
        if (m) {
          const parsed = JSON.parse(m[0])
          if (parsed?.error) msg = parsed.error
        }
      } catch {
        /* ignore */
      }
      if (
        msg.length > 200 ||
        msg.toLowerCase().includes('<!doctype') ||
        msg.toLowerCase().includes('<html')
      ) {
        msg = 'Could not reach the Zeroclaw agent. Check the connection in the Automation section below.'
      }
      toast({ title: 'Zeroclaw task failed', description: msg, variant: 'destructive' })
    },
  })

  function submitZcTask() {
    const task = zcTask.trim()
    if (!task) return
    setZcReply(null)
    zcRunMut.mutate({ task })
  }

  function copyZcReply() {
    if (!zcReply) return
    navigator.clipboard
      ?.writeText(zcReply)
      .then(() => toast({ title: 'Copied to clipboard' }))
      .catch(() => toast({ title: 'Could not copy', variant: 'destructive' }))
  }

  function scrollToZeroclawCard() {
    // The Zeroclaw integration card lives in the Automation category section.
    // Its slug = 'zeroclaw' (lowercased, spaces → dashes).
    const el = document.getElementById('int-zeroclaw')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('ring-2', 'ring-forest', 'ring-offset-2', 'ring-offset-background')
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-forest', 'ring-offset-2', 'ring-offset-background')
      }, 1800)
    }
  }

  return (
    <Card className="mb-8 border-forest/30 bg-forest/5 overflow-hidden">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-xl bg-forest/15 text-forest flex items-center justify-center shrink-0">
            <Bot className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">Run with Zeroclaw</h2>
              {zeroclawConnected ? (
                <Badge variant="outline" className="text-forest border-forest/40">
                  <CheckCircle2 className="size-3" /> Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  Not connected
                </Badge>
              )}
            </div>
            <p className="text-sm text-foreground/70 mt-0.5 max-w-2xl">
              Dispatch an autonomous task — research, drafts, audits — to your Zeroclaw agent
              running on your 16GB laptop. Tasks may take 30s–2min.
            </p>
          </div>
        </div>

        {zeroclawConnected ? (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <Textarea
                value={zcTask}
                onChange={(e) => setZcTask(e.target.value)}
                placeholder="Describe an autonomous task — e.g. 'Research the top 10 competitors for a {business type} in {city} and summarize their pricing' or 'Draft a 5-post content calendar for a local bakery'"
                className="min-h-20 flex-1 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !zcRunMut.isPending) {
                    e.preventDefault()
                    submitZcTask()
                  }
                }}
              />
              <Button
                className="bg-forest text-primary-foreground hover:bg-forest/90 shrink-0 sm:self-stretch"
                disabled={zcRunMut.isPending || !zcTask.trim()}
                onClick={submitZcTask}
              >
                {zcRunMut.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Bot className="size-4" />
                )}
                Run task
              </Button>
            </div>

            {zcRunMut.isPending && !zcReply && (
              <div className="rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="size-4 animate-spin text-forest" />
                Zeroclaw is working on it…
              </div>
            )}

            {zcReply && (
              <div className="rounded-lg border border-forest/30 bg-forest/5 p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-medium text-forest uppercase tracking-wider">
                    Response
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={copyZcReply}
                  >
                    <Copy className="size-3" /> Copy
                  </Button>
                </div>
                <div
                  className="max-h-96 overflow-y-auto text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed pr-1"
                  style={{ scrollbarColor: 'var(--color-forest) transparent' }}
                >
                  {zcReply}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <p className="text-sm text-foreground/80 flex-1">
              Connect Zeroclaw in the Automation section below to dispatch autonomous tasks
              from anywhere in VirtuaLab Digital.
            </p>
            <Button
              variant="outline"
              className="border-forest/40 text-forest hover:bg-forest/10 shrink-0"
              onClick={scrollToZeroclawCard}
            >
              <Bot className="size-4" /> Connect Zeroclaw
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
