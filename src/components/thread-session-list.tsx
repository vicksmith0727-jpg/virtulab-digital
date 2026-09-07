'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, MessageSquare, Clock } from 'lucide-react'
import { useState } from 'react'
import { fetchJson } from '@/lib/client-utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface ChatSession {
  id: string
  title: string
  updatedAt: string
  _count?: { messages: number }
}

interface ThreadSessionListProps {
  projectId?: string
  activeSessionId?: string
  onSelectSession: (sessionId: string) => void
}

export function ThreadSessionList({ projectId, activeSessionId, onSelectSession }: ThreadSessionListProps) {
  const queryClient = useQueryClient()
  const [newTitle, setNewTitle] = useState('')
  const [showNew, setShowNew] = useState(false)

  const sessionsQuery = useQuery<{ sessions: ChatSession[] }>({
    queryKey: ['chat-sessions', projectId ?? 'global'],
    queryFn: () => fetchJson(`/api/ai/chat${projectId ? `?projectId=${projectId}` : ''}`),
  })

  const createMut = useMutation({
    mutationFn: (title: string) =>
      fetchJson(`/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, messages: [{ role: 'user', content: title }] }),
      }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['chat-sessions', projectId ?? 'global'] })
      if (data?.sessionId) onSelectSession(data.sessionId)
      setShowNew(false)
      setNewTitle('')
    },
  })

  const deleteMut = useMutation({
    mutationFn: (sessionId: string) =>
      fetchJson(`/api/ai/chat?sessionId=${sessionId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-sessions', projectId ?? 'global'] })
    },
  })

  const renameMut = useMutation({
    mutationFn: ({ sessionId, title }: { sessionId: string; title: string }) =>
      fetchJson(`/api/ai/chat`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, title }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-sessions', projectId ?? 'global'] })
    },
  })

  const sessions = sessionsQuery.data?.sessions ?? []

  return (
    <div className="w-full space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Strategy Threads
        </h3>
        <button
          onClick={() => setShowNew(!showNew)}
          className="text-forest hover:text-moss transition"
        >
          <Plus className="size-4" />
        </button>
      </div>

      {/* New thread input */}
      {showNew && (
        <div className="flex gap-1 px-1">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Thread title…"
            className="h-8 text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newTitle.trim()) {
                createMut.mutate(newTitle.trim())
              }
            }}
          />
          <Button size="sm" className="h-8 px-2" onClick={() => newTitle.trim() && createMut.mutate(newTitle.trim())}>
            Create
          </Button>
        </div>
      )}

      {/* Session list */}
      <div className="space-y-0.5">
        {sessions.length === 0 && (
          <p className="text-xs text-muted-foreground px-2 py-4 text-center">
            No threads yet. Start a conversation.
          </p>
        )}

        {sessions.map((session) => (
          <div
            key={session.id}
            className={cn(
              'group flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer transition',
              activeSessionId === session.id
                ? 'bg-forest/10 border border-forest/20'
                : 'hover:bg-muted',
            )}
            onClick={() => onSelectSession(session.id)}
          >
            <MessageSquare
              className={cn(
                'size-3.5 shrink-0',
                activeSessionId === session.id ? 'text-forest' : 'text-muted-foreground',
              )}
            />
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  'text-xs font-medium truncate',
                  activeSessionId === session.id ? 'text-forest' : 'text-foreground/80',
                )}
              >
                {session.title}
              </p>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Clock className="size-2.5" />
                {new Date(session.updatedAt).toLocaleDateString()}
                {session._count && ` • ${session._count.messages} msgs`}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                deleteMut.mutate(session.id)
              }}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition"
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
