'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Inbox as InboxIcon,
  Mail,
  Star,
  Search,
  RefreshCw,
  CheckCheck,
  Send,
  Loader2,
  Sparkles,
  Copy,
  MessageCircle,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  HelpCircle,
  AlertTriangle,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { fetchJson } from '@/lib/client-utils'

/* ------------------------------------------------------------------ */

type Source = 'email' | 'facebook' | 'instagram' | 'x' | 'linkedin'
type MessageType = 'message' | 'comment' | 'mention' | 'review' | 'dm'

interface InboxMessage {
  id: string
  source: Source
  from: string
  subject: string
  preview: string
  body: string
  timestamp: string
  read: boolean
  starred: boolean
  type: MessageType
}

interface InboxResponse {
  messages: InboxMessage[]
  connectedSources: string[]
  stats: {
    total: number
    unread: number
    starred: number
    email: number
    facebook: number
    instagram: number
    x: number
    linkedin: number
  }
  note: string
}

interface AiChatResponse {
  reply: string
}


function relativeTime(iso: string): string {
  const t = new Date(iso).getTime()
  const now = Date.now()
  const diff = Math.max(0, now - t)
  const min = 60 * 1000
  const hr = 60 * min
  const day = 24 * hr
  if (diff < min) return 'just now'
  if (diff < hr) return `${Math.floor(diff / min)}m ago`
  if (diff < day) return `${Math.floor(diff / hr)}h ago`
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// Source → lucide icon + tinted chip styling.
function sourceVisual(source: Source): { icon: typeof Mail; tone: string } {
  switch (source) {
    case 'email':
      return { icon: Mail, tone: 'bg-forest/10 text-forest' }
    case 'facebook':
      return { icon: Facebook, tone: 'bg-moss/15 text-moss' }
    case 'instagram':
      return { icon: Instagram, tone: 'bg-terracotta/10 text-terracotta' }
    case 'x':
      return { icon: Twitter, tone: 'bg-bark/10 text-bark' }
    case 'linkedin':
      return { icon: Linkedin, tone: 'bg-sage/15 text-moss' }
    default:
      return { icon: HelpCircle, tone: 'bg-muted text-muted-foreground' }
  }
}

function typeLabel(t: MessageType): string {
  switch (t) {
    case 'message':
      return 'Message'
    case 'comment':
      return 'Comment'
    case 'mention':
      return 'Mention'
    case 'review':
      return 'Review'
    case 'dm':
      return 'DM'
    default:
      return t
  }
}

type FilterTab =
  | 'all'
  | 'email'
  | 'facebook'
  | 'instagram'
  | 'x'
  | 'linkedin'
  | 'starred'
  | 'unread'

const TABS: { id: FilterTab; label: string; icon: typeof InboxIcon }[] = [
  { id: 'all', label: 'All', icon: InboxIcon },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'facebook', label: 'Facebook', icon: Facebook },
  { id: 'instagram', label: 'Instagram', icon: Instagram },
  { id: 'x', label: 'X', icon: Twitter },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { id: 'starred', label: 'Starred', icon: Star },
  { id: 'unread', label: 'Unread', icon: MessageCircle },
]

/* ------------------------------------------------------------------ */

export function InboxView() {
  const setView = useAppStore((s) => s.setView)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const inboxQuery = useQuery<InboxResponse>({
    queryKey: ['inbox'],
    queryFn: () => fetchJson('/api/inbox'),
  })

  // Local UI state — read/star toggles are optimistic since the demo API
  // doesn't persist them yet. When real MCP servers are connected, the
  // mutation hooks below would POST the change upstream.
  const [filter, setFilter] = React.useState<FilterTab>('all')
  const [search, setSearch] = React.useState('')
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [replyDraft, setReplyDraft] = React.useState('')
  const [mobileDetailOpen, setMobileDetailOpen] = React.useState(false)

  const messages = inboxQuery.data?.messages ?? []
  const stats = inboxQuery.data?.stats

  // Optimistic local override of read/star state. We layer the inbox
  // messages with a delta map so toggles survive refetches until the
  // backend gets a real mutation endpoint.
  const [overrides, setOverrides] = React.useState<
    Record<string, Partial<Pick<InboxMessage, 'read' | 'starred'>>>
  >({})

  const liveMessages: InboxMessage[] = React.useMemo(
    () =>
      messages.map((m) => ({
        ...m,
        read: overrides[m.id]?.read ?? m.read,
        starred: overrides[m.id]?.starred ?? m.starred,
      })),
    [messages, overrides],
  )

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return liveMessages.filter((m) => {
      if (filter === 'starred' && !m.starred) return false
      if (filter === 'unread' && m.read) return false
      if (
        filter !== 'all' &&
        filter !== 'starred' &&
        filter !== 'unread' &&
        m.source !== filter
      )
        return false
      if (q) {
        const hay = `${m.from} ${m.subject} ${m.preview}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [liveMessages, filter, search])

  const selected = liveMessages.find((m) => m.id === selectedId) ?? null

  // AI draft helper — uses /api/ai/chat to suggest a reply.
  const draftMut = useMutation({
    mutationFn: (msg: InboxMessage) =>
      fetchJson('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Draft a short, warm, honest reply to this ${typeLabel(msg.type).toLowerCase()} from ${msg.from}.\n\nSubject: ${msg.subject}\nTheir message: "${msg.body}"\n\nKeep it 2-4 sentences. Friendly, no hype, no marketing language. End with a clear next step.`,
            },
          ],
        }),
      }) as Promise<AiChatResponse>,
    onSuccess: (data) => setReplyDraft(data.reply ?? ''),
    onError: (err: Error) =>
      toast({ title: 'Draft failed', description: err.message, variant: 'destructive' }),
  })

  // Mark a message as read (optimistic). When the user opens it, we update
  // the local override and invalidate the query so the badge count in the
  // sidebar reflects the new state.
  function openMessage(msg: InboxMessage) {
    setSelectedId(msg.id)
    setMobileDetailOpen(true)
    if (!msg.read) {
      setOverrides((o) => ({ ...o, [msg.id]: { ...o[msg.id], read: true } }))
      // Tell the sidebar badge to refresh next tick.
      queryClient.invalidateQueries({ queryKey: ['inbox'] })
    }
  }

  function toggleStar(msg: InboxMessage) {
    setOverrides((o) => ({
      ...o,
      [msg.id]: { ...o[msg.id], starred: !msg.starred },
    }))
  }

  function markAllRead() {
    const next: typeof overrides = {}
    liveMessages.forEach((m) => {
      if (!m.read) next[m.id] = { ...overrides[m.id], read: true }
    })
    if (Object.keys(next).length === 0) {
      toast({ title: 'Nothing to mark', description: 'All messages are already read.' })
      return
    }
    setOverrides((o) => ({ ...o, ...next }))
    queryClient.invalidateQueries({ queryKey: ['inbox'] })
    toast({
      title: `Marked ${Object.keys(next).length} message${Object.keys(next).length === 1 ? '' : 's'} as read`,
    })
  }

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['inbox'] })
    toast({ title: 'Inbox refreshed' })
  }

  function sendReply() {
    if (!selected) return
    if (!replyDraft.trim()) {
      toast({ title: 'Write a reply first', variant: 'destructive' })
      return
    }
    // Real sending needs the connected MCP server. For now we confirm with
    // a toast so the user knows the draft is queued.
    toast({
      title: 'Reply drafted',
      description: `Sending to ${selected.from} requires a connected ${selected.source === 'email' ? 'email' : 'social'} integration.`,
    })
    setReplyDraft('')
  }

  function copyReply() {
    if (!replyDraft) return
    navigator.clipboard.writeText(replyDraft).then(() => {
      toast({ title: 'Copied reply to clipboard' })
    })
  }

  // Count per filter tab.
  function countFor(tab: FilterTab): number {
    if (!stats) return 0
    if (tab === 'all') return stats.total
    if (tab === 'starred') return stats.starred
    if (tab === 'unread') return stats.unread
    return stats[tab as keyof typeof stats] as number
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Top bar */}
      <header className="border-b border-border bg-card px-3 sm:px-5 py-3 flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 mr-auto">
          <div className="size-8 rounded-lg bg-forest/10 text-forest flex items-center justify-center">
            <InboxIcon className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Unified Inbox</h2>
            <p className="text-[11px] text-muted-foreground hidden sm:block">
              Email + social messages, all in one place.
            </p>
          </div>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by sender or subject…"
            className="pl-8 h-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={markAllRead}>
          <CheckCheck className="size-4" /> Mark all read
        </Button>
        <Button variant="outline" size="sm" onClick={refresh} disabled={inboxQuery.isFetching}>
          <RefreshCw className={cn('size-4', inboxQuery.isFetching && 'animate-spin')} /> Refresh
        </Button>
      </header>

      {/* Body — sidebar + main + (mobile) detail dialog */}
      <div className="flex-1 flex min-h-0">
        {/* Filter sidebar (desktop) */}
        <aside className="hidden md:flex md:w-60 flex-col border-r border-border bg-sidebar/50">
          <nav className="p-3 space-y-1">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = filter === tab.id
              const count = countFor(tab.id)
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
                    isActive
                      ? 'bg-forest/10 text-forest font-medium'
                      : 'text-foreground/80 hover:bg-muted hover:text-foreground',
                  )}
                >
                  <Icon className="size-4" />
                  <span className="flex-1 text-left">{tab.label}</span>
                  {count > 0 && (
                    <span
                      className={cn(
                        'inline-flex items-center justify-center min-w-5 h-5 rounded-full text-[11px] font-semibold px-1.5',
                        tab.id === 'unread'
                          ? 'bg-forest text-primary-foreground'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
          {inboxQuery.data?.connectedSources && inboxQuery.data.connectedSources.length > 0 && (
            <div className="mt-auto p-3 border-t border-border">
              <p className="text-[11px] text-muted-foreground mb-2">Connected</p>
              <div className="flex flex-wrap gap-1.5">
                {inboxQuery.data.connectedSources.map((s) => {
                  const { icon: SrcIcon, tone } = sourceVisual(s as Source)
                  return (
                    <span
                      key={s}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                        tone,
                      )}
                    >
                      <SrcIcon className="size-3" />
                      {s}
                    </span>
                  )
                })}
              </div>
            </div>
          )}
        </aside>

        {/* Filter chips (mobile) */}
        <div className="md:hidden border-b border-border bg-card px-2 py-2 flex gap-1.5 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = filter === tab.id
            const count = countFor(tab.id)
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={cn(
                  'shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition',
                  isActive
                    ? 'bg-forest text-primary-foreground'
                    : 'bg-muted text-foreground/80 hover:bg-muted/70',
                )}
              >
                <Icon className="size-3" />
                {tab.label}
                {count > 0 && (
                  <span className="text-[10px] opacity-80">{count}</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Message list */}
        <div className="flex-1 flex flex-col min-w-0">
          <ScrollAreaMessages
            loading={inboxQuery.isLoading}
            error={inboxQuery.isError}
            messages={filtered}
            selectedId={selectedId}
            onOpen={openMessage}
            onToggleStar={toggleStar}
          />
        </div>
      </div>

      {/* Detail dialog (used on both desktop + mobile as the message reader) */}
      <Dialog open={!!selected && mobileDetailOpen} onOpenChange={(open) => {
        if (!open) setMobileDetailOpen(false)
      }}>
        <DialogContent
          className="sm:max-w-2xl"
          // The Dialog acts as the "right panel" for desktop too — on large
          // screens it sits centered; on mobile it's a full sheet. This keeps
          // the reply UX identical across breakpoints.
        >
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-start gap-3 pr-8">
                  {(() => {
                    const { icon: SrcIcon, tone } = sourceVisual(selected.source)
                    return (
                      <span
                        className={cn(
                          'size-9 rounded-lg flex items-center justify-center shrink-0',
                          tone,
                        )}
                      >
                        <SrcIcon className="size-4" />
                      </span>
                    )
                  })()}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {selected.from}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {selected.subject}
                    </p>
                  </div>
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-forest border-forest/40">
                    {typeLabel(selected.type)}
                  </Badge>
                  <span className="text-xs">{relativeTime(selected.timestamp)}</span>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                {/* Full message body */}
                <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto">
                  {selected.body}
                </div>

                {/* Reply composer */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="reply" className="text-xs text-muted-foreground">
                      Reply
                    </Label>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => draftMut.mutate(selected)}
                        disabled={draftMut.isPending}
                      >
                        {draftMut.isPending ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Sparkles className="size-3" />
                        )}
                        Draft with AI
                      </Button>
                      {replyDraft && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={copyReply}
                        >
                          <Copy className="size-3" /> Copy
                        </Button>
                      )}
                    </div>
                  </div>
                  <Textarea
                    id="reply"
                    value={replyDraft}
                    onChange={(e) => setReplyDraft(e.target.value)}
                    placeholder="Write your reply…"
                    className="min-h-32"
                  />
                </div>

                {inboxQuery.data?.connectedSources?.length === 0 && (
                  <div className="rounded-lg border border-terracotta/30 bg-terracotta/5 p-3 text-xs text-foreground/90 flex items-start gap-2">
                    <AlertTriangle className="size-4 text-terracotta shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-terracotta">No integrations connected</p>
                      <p className="text-muted-foreground mt-0.5">
                        Sending replies needs an email or social MCP server.{' '}
                        <button
                          type="button"
                          onClick={() => setView({ name: 'integrations' })}
                          className="text-forest hover:underline font-medium"
                        >
                          Connect an integration
                        </button>{' '}
                        to enable real sending.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setMobileDetailOpen(false)}>
                  Close
                </Button>
                <Button
                  className="bg-forest text-primary-foreground hover:bg-forest/90"
                  onClick={sendReply}
                  disabled={!replyDraft.trim()}
                >
                  <Send className="size-4" /> Send
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Sticky footer */}
      <footer className="border-t border-border bg-card px-4 py-2.5 text-[11px] text-muted-foreground flex items-center justify-between">
        <span>
          {filtered.length} message{filtered.length === 1 ? '' : 's'}{filter !== 'all' ? ` · ${TABS.find((t) => t.id === filter)?.label}` : ''}
        </span>
        <button
          type="button"
          onClick={() => setView({ name: 'integrations' })}
          className="text-forest hover:underline"
        >
          Connect more sources
        </button>
      </footer>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Message list with loading / empty states                            */
/* ------------------------------------------------------------------ */

function ScrollAreaMessages({
  loading,
  error,
  messages,
  selectedId,
  onOpen,
  onToggleStar,
}: {
  loading: boolean
  error: boolean
  messages: InboxMessage[]
  selectedId: string | null
  onOpen: (m: InboxMessage) => void
  onToggleStar: (m: InboxMessage) => void
}) {
  if (loading) {
    return (
      <div className="p-3 space-y-2 overflow-y-auto">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    )
  }
  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-5 text-sm text-destructive">
          Could not load messages. Try Refresh.
        </div>
      </div>
    )
  }
  if (messages.length === 0) {
    return (
      <div className="p-6 flex-1 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="mx-auto size-12 rounded-2xl bg-forest/10 text-forest flex items-center justify-center mb-3">
            <Mail className="size-5" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">No messages here</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Either nothing matches the current filter, or you haven&rsquo;t connected an
            email or social integration yet.
          </p>
        </div>
      </div>
    )
  }
  return (
    <div
      className="flex-1 overflow-y-auto p-3 space-y-2"
      style={{ scrollbarColor: 'var(--color-forest) transparent' }}
    >
      {messages.map((m) => {
        const { icon: SrcIcon, tone } = sourceVisual(m.source)
        const isSelected = m.id === selectedId
        return (
          <Card
            key={m.id}
            className={cn(
              'p-0 gap-0 cursor-pointer transition border',
              isSelected
                ? 'border-forest/60 bg-forest/5'
                : m.read
                  ? 'border-border hover:border-forest/30'
                  : 'border-forest/30 bg-forest/5 hover:border-forest/50',
            )}
            onClick={() => onOpen(m)}
          >
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    'size-9 rounded-lg flex items-center justify-center shrink-0',
                    tone,
                  )}
                >
                  <SrcIcon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p
                      className={cn(
                        'text-sm truncate',
                        m.read ? 'font-medium text-foreground' : 'font-semibold text-foreground',
                      )}
                    >
                      {m.from}
                    </p>
                    {!m.read && (
                      <span className="size-1.5 rounded-full bg-forest shrink-0" aria-label="Unread" />
                    )}
                    <span className="ml-auto text-[11px] text-muted-foreground shrink-0">
                      {relativeTime(m.timestamp)}
                    </span>
                  </div>
                  <p
                    className={cn(
                      'text-xs truncate',
                      m.read ? 'text-muted-foreground' : 'text-foreground/90 font-medium',
                    )}
                  >
                    {m.subject}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                    {m.preview}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleStar(m)
                  }}
                  className="shrink-0 p-1 rounded hover:bg-muted transition"
                  aria-label={m.starred ? 'Unstar' : 'Star'}
                >
                  <Star
                    className={cn(
                      'size-4',
                      m.starred ? 'fill-forest text-forest' : 'text-muted-foreground',
                    )}
                  />
                </button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
