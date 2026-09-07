'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Sprout,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { fetchJson } from '@/lib/client-utils'

/* ------------------------------------------------------------------ */

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface AiChatResponse {
  reply: string
}

interface Analytics {
  stats: {
    totalProjects: number
    publishedProjects: number
    totalBlocks: number
    totalIntegrations: number
    recentActivity: Array<{ id: string; action: string; detail: string | null; createdAt: string }>
    topProjects: Array<{ id: string; name: string; visits?: number; published?: boolean }>
  }
}

/* ------------------------------------------------------------------ */

const GREETING: ChatMessage = {
  role: 'assistant',
  content:
    "Hi! I'm your VirtuaLab assistant. Ask me about your projects, SEO, content, integrations, or anything about growing your site organically.",
}

export function DashboardAssistant() {
  const [open, setOpen] = React.useState(false)
  const [messages, setMessages] = React.useState<ChatMessage[]>([GREETING])
  const [input, setInput] = React.useState('')
  const [sending, setSending] = React.useState(false)
  const { toast } = useToast()

  // Share the dashboard's analytics query (cached). We only use it to give
  // the assistant context on the FIRST user message.
  const analyticsQuery = useQuery<Analytics>({
    queryKey: ['analytics'],
    queryFn: () => fetchJson('/api/analytics'),
    enabled: open, // only fetch once the panel is opened
  })

  const listRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Auto-scroll to the newest message whenever the list grows.
  React.useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, open, sending])

  // Focus the input when the panel opens.
  React.useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 250)
      return () => clearTimeout(t)
    }
  }, [open])

  async function send() {
    const text = input.trim()
    if (!text || sending) return

    // For the very first user message, prepend dashboard context so the
    // assistant can answer questions about updates / pending tasks / next
    // steps meaningfully. Subsequent messages are sent verbatim — the
    // conversation history is already part of the request.
    const isFirst = messages.filter((m) => m.role === 'user').length === 0

    let framedContent = text
    if (isFirst) {
      const s = analyticsQuery.data?.stats
      const ctx = s
        ? {
            location: 'dashboard',
            totalProjects: s.totalProjects,
            publishedProjects: s.publishedProjects,
            totalBlocks: s.totalBlocks,
            totalIntegrations: s.totalIntegrations,
            recentActivity: (s.recentActivity ?? []).slice(0, 6).map((a) => ({
              action: a.action,
              detail: a.detail,
              when: a.createdAt,
            })),
            topProjects: (s.topProjects ?? []).slice(0, 5).map((p) => ({
              name: p.name,
              published: p.published,
              visits: p.visits,
            })),
          }
        : { location: 'dashboard', note: 'analytics not loaded yet' }

      framedContent =
        `I'm on the VirtuaLab Digital dashboard. Here are my current stats: ${JSON.stringify(ctx)}.\n\nMy question: ${text}`
    }

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content: text }, // show the user's raw text in the bubble
    ]
    setMessages(nextMessages)
    setInput('')
    setSending(true)

    try {
      // Send the full conversation to /api/ai/chat. The first user message
      // in the payload carries the dashboard context (above).
      const payload: ChatMessage[] = nextMessages.map((m, i) => {
        if (i === nextMessages.length - 1 && m.role === 'user') {
          return { role: 'user', content: framedContent }
        }
        return m
      })

      const data = await fetchJson('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payload }),
      }) as AiChatResponse

      const reply = data?.reply ?? 'Sorry, I did not get a reply. Please try again.'
      setMessages((m) => [...m, { role: 'assistant', content: reply }])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send message'
      toast({ title: 'Assistant error', description: msg, variant: 'destructive' })
      // Drop the user's last message so they can retry — keep the conversation clean.
      setMessages((m) => m.filter((_, i) => i !== m.length - 1))
    } finally {
      setSending(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <>
      {/* Floating button */}
      <div className="fixed z-40 bottom-4 right-4 sm:bottom-6 sm:right-6">
        <AnimatePresence>
          {!open && (
            <motion.div
              key="fab"
              initial={{ opacity: 0, scale: 0.9, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 8 }}
              transition={{ duration: 0.18 }}
              className="flex items-end gap-2"
            >
              <Button
                type="button"
                size="lg"
                onClick={() => setOpen(true)}
                aria-label="Open VirtuaLab assistant"
                className="bg-forest text-primary-foreground hover:bg-forest/90 shadow-lg rounded-full size-14 sm:size-16 p-0"
              >
                <Sparkles className="size-5 sm:size-6" />
              </Button>
              <span
                className="hidden sm:inline-flex items-center gap-1.5 mb-1.5 rounded-full bg-card border border-border/70 text-foreground px-3 py-1.5 text-xs font-medium shadow-sm"
                aria-hidden
              >
                Ask me anything
                <span className="size-1.5 rounded-full bg-terracotta animate-pulse" />
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={cn(
              'fixed z-50 flex flex-col bg-card border border-border/70 shadow-xl rounded-2xl overflow-hidden',
              // Mobile: full width, sticks to bottom
              'left-0 right-0 bottom-0 rounded-b-none max-h-[80vh]',
              // Desktop: anchored bottom-right, fixed width
              'sm:left-auto sm:right-6 sm:bottom-6 sm:w-[380px] sm:max-h-[500px] sm:rounded-2xl sm:rounded-b-2xl',
            )}
            role="dialog"
            aria-label="Sage chat"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-forest text-primary-foreground">
              <div className="size-8 rounded-lg bg-primary-foreground/15 flex items-center justify-center shrink-0">
                <Sprout className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-tight">Sage</p>
                <p className="text-[11px] opacity-80 leading-tight">
                  Organic growth · no ads, ever
                </p>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setOpen(false)}
                aria-label="Close assistant"
                className="size-8 text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* Messages */}
            <div
              ref={listRef}
              className="flex-1 overflow-y-auto px-3 py-4 space-y-3 bg-cream/30 dark:bg-card"
            >
              {messages.map((m, i) => (
                <Bubble key={i} role={m.role} content={m.content} />
              ))}

              {sending && <TypingBubble />}
            </div>

            {/* Input */}
            <div className="border-t border-border/70 bg-card px-3 py-3 flex items-center gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask about your projects, SEO, content…"
                disabled={sending}
                className="flex-1 bg-background"
                aria-label="Message"
              />
              <Button
                type="button"
                size="icon"
                onClick={send}
                disabled={sending || !input.trim()}
                aria-label="Send message"
                className="bg-forest text-primary-foreground hover:bg-forest/90 shrink-0"
              >
                {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

/* ------------------------------------------------------------------ */

function Bubble({ role, content }: { role: 'user' | 'assistant'; content: string }) {
  const isUser = role === 'user'
  return (
    <div className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm',
          isUser
            ? 'bg-forest text-primary-foreground rounded-br-sm'
            : 'bg-sage/25 text-foreground border border-sage/40 rounded-bl-sm dark:bg-secondary/40 dark:border-border/60',
        )}
      >
        {content}
      </div>
    </div>
  )
}

function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="bg-sage/25 border border-sage/40 rounded-2xl rounded-bl-sm px-3.5 py-3 flex items-center gap-1.5 dark:bg-secondary/40 dark:border-border/60">
        <span className="size-1.5 rounded-full bg-forest/60 animate-bounce [animation-delay:-0.2s]" />
        <span className="size-1.5 rounded-full bg-forest/60 animate-bounce [animation-delay:-0.1s]" />
        <span className="size-1.5 rounded-full bg-forest/60 animate-bounce" />
      </div>
    </div>
  )
}
