'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useSEOStrategist } from '@/hooks/use-seo-strategist'
import { RichText } from '@/components/ui/rich-text'
import { Send, ShieldAlert, Zap, Compass, RefreshCw } from 'lucide-react'

interface SEOAssistantProps {
  projectId?: string
  sessionId?: string
}

export function SEOAssistant({ projectId, sessionId }: SEOAssistantProps) {
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const { sendMessage, chatHistory, isLoading, error } = useSEOStrategist({
    projectId,
    sessionId,
    onError: (err) => console.error('Strategist Error:', err.message),
  })

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [chatHistory, isLoading])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const payloadHistory = [...chatHistory, { role: 'user' as const, content: input.trim() }]
    sendMessage(payloadHistory)
    setInput('')
  }

  return (
    <div className="flex flex-col h-[600px] w-full max-w-xl mx-auto rounded-2xl border-2 border-clay/30 bg-cream text-bark shadow-xl overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-clay/20 bg-forest text-cream">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-moss border border-sand/30 shadow-inner">
            <Zap className="h-5 w-5 text-sand" />
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-terracotta ring-2 ring-forest" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-cream">Asymmetrical SEO Strategist</h2>
            <p className="text-xs text-sage font-medium">Underdog Strategy Engine • Active</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-terracotta/20 border border-terracotta/40 px-2.5 py-0.5 text-xs font-semibold text-terracotta select-none">
          <ShieldAlert className="h-3.5 w-3.5" /> 100% Organic
        </span>
      </header>

      {/* Chat area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-5 py-6 bg-cream space-y-4"
      >
        {/* Blank state */}
        {chatHistory.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center h-full max-w-md mx-auto space-y-4">
            <Compass className="h-10 w-10 text-clay/50" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-bark">Outthink the Big Brands</h3>
              <p className="text-xs text-clay/80 leading-relaxed">
                Big corporate models rely on massive ad budgets. We don&apos;t. Ask how to find
                low-volume, hyper-local long-tail opportunities they ignore.
              </p>
            </div>
            <div className="w-full grid grid-cols-1 gap-2 pt-2">
              <button
                onClick={() => setInput('How do I beat standard plumbing franchises in my postal code region?')}
                className="text-left text-xs bg-sand/30 hover:bg-sand/60 border border-clay/20 text-bark font-medium px-4 py-2.5 rounded-xl transition duration-150"
              >
                &quot;How do I beat standard plumbing franchises in my postal code region?&quot;
              </button>
              <button
                onClick={() => setInput('Find structural long-tail keywords for localized concrete repair services.')}
                className="text-left text-xs bg-sand/30 hover:bg-sand/60 border border-clay/20 text-bark font-medium px-4 py-2.5 rounded-xl transition duration-150"
              >
                &quot;Find structural long-tail keywords for localized concrete repair services.&quot;
              </button>
            </div>
          </div>
        )}

        {/* Messages */}
        {chatHistory.map((msg, index) => {
          const isUser = msg.role === 'user'
          return (
            <div key={index} className={`flex w-full items-start ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-xs transition-all ${
                  isUser
                    ? 'bg-moss text-cream font-medium rounded-tr-none'
                    : 'bg-white text-bark border border-clay/10 rounded-tl-none'
                }`}
              >
                {isUser ? (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <RichText content={msg.content} />
                )}
              </div>
            </div>
          )
        })}

        {/* Loading */}
        {isLoading && (
          <div className="flex w-full items-start justify-start">
            <div className="bg-white text-bark border border-clay/10 rounded-2xl rounded-tl-none px-4 py-3 text-sm shadow-xs flex items-center gap-2">
              <RefreshCw className="h-3.5 w-3.5 text-moss animate-spin" />
              <span className="text-xs text-moss font-semibold tracking-wide italic">
                Analyzing corporate tactical blindspots…
              </span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3.5 bg-terracotta/10 border border-terracotta/30 text-terracotta text-xs rounded-xl flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <p className="font-medium">{error.message}</p>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-clay/20 flex gap-2 items-center">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Uncover a local niche opportunity…"
          disabled={isLoading}
          className="flex-1 min-w-0 px-4 py-3 bg-cream border border-clay/30 rounded-xl text-sm font-medium text-bark placeholder:text-clay/60 focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest disabled:opacity-50 transition duration-150"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-forest text-cream font-medium hover:bg-moss disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  )
}
