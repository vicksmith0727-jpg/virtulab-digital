'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ChatRouteInput } from '@/lib/validations/chat'

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface UseSEOStrategistOptions {
  projectId?: string
  sessionId?: string
  onSuccess?: (reply: string, sessionId: string) => void
  onError?: (error: Error) => void
}

export function useSEOStrategist({ projectId, sessionId, onSuccess, onError }: UseSEOStrategistOptions = {}) {
  const queryClient = useQueryClient()
  const cacheKey = ['seo-chat', projectId ?? 'global', sessionId ?? 'new']
  const [streamedResponse, setStreamedResponse] = useState('')
  const [activeSessionId, setActiveSessionId] = useState(sessionId ?? '')

  const mutation = useMutation<{ reply: string; sessionId: string }, Error, ChatMessage[]>({
    mutationFn: async (updatedHistory: ChatMessage[]) => {
      setStreamedResponse('')

      const payload: ChatRouteInput = {
        projectId,
        sessionId: activeSessionId || undefined,
        messages: updatedHistory.map((m) => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
        })),
      }

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await response.json()

      if (!response.ok) {
        if (json.error === 'Validation failed' && json.details) {
          const fieldErrors = Object.entries(json.details)
            .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(', ')}`)
            .join(' | ')
          throw new Error(`Validation Error — ${fieldErrors}`)
        }
        throw new Error(json.error || 'Failed to communicate with Asymmetrical SEO Strategist.')
      }

      return { reply: json.reply, sessionId: json.sessionId }
    },
    onMutate: async (newHistory) => {
      await queryClient.cancelQueries({ queryKey: cacheKey })
      const previousMessages = queryClient.getQueryData<ChatMessage[]>(cacheKey) || []
      queryClient.setQueryData<ChatMessage[]>(cacheKey, newHistory)
      return { previousMessages }
    },
    onSuccess: ({ reply, sessionId: newSessionId }, variables) => {
      setStreamedResponse('')
      setActiveSessionId(newSessionId)
      queryClient.setQueryData<ChatMessage[]>(cacheKey, [
        ...variables,
        { role: 'assistant', content: reply },
      ])
      if (onSuccess) onSuccess(reply, newSessionId)
    },
    onError: (err, _variables, context) => {
      setStreamedResponse('')
      if (context?.previousMessages) {
        queryClient.setQueryData(cacheKey, context.previousMessages)
      }
      if (onError) onError(err)
    },
  })

  return {
    sendMessage: mutation.mutate,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    chatHistory: queryClient.getQueryData<ChatMessage[]>(cacheKey) || [],
    streamedResponse,
    activeSessionId,
  }
}
