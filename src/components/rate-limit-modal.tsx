'use client'

import { useEffect, useState } from 'react'
import { ShieldAlert, Clock, X } from 'lucide-react'

interface RateLimitModalProps {
  open: boolean
  resetAt: string | null
  onClose: () => void
}

export function RateLimitModal({ open, resetAt, onClose }: RateLimitModalProps) {
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    if (!open || !resetAt) return

    const update = () => {
      const diff = new Date(resetAt).getTime() - Date.now()
      if (diff <= 0) {
        setRemaining('Available now')
        return
      }
      const mins = Math.floor(diff / 60000)
      const secs = Math.floor((diff % 60000) / 1000)
      setRemaining(`${mins}m ${secs}s`)
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [open, resetAt])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="max-w-sm w-full mx-4 rounded-2xl bg-cream border-2 border-terracotta/40 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-terracotta/10 border-b border-terracotta/20">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-terracotta" />
            <h2 className="text-sm font-bold text-bark">Rate Limit Reached</h2>
          </div>
          <button onClick={onClose} className="text-bark/50 hover:text-bark transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-bark/80 leading-relaxed">
            You&apos;ve hit the free tier limit for the Asymmetrical SEO Strategist.
            The strategist needs time to rest — check back shortly.
          </p>

          <div className="flex items-center gap-3 bg-sand/30 rounded-xl px-4 py-3 border border-clay/20">
            <Clock className="h-5 w-5 text-moss shrink-0" />
            <div>
              <p className="text-xs text-clay font-medium uppercase tracking-wide">Time remaining</p>
              <p className="text-lg font-bold text-bark tabular-nums">{remaining}</p>
            </div>
          </div>

          <div className="rounded-xl bg-forest/5 border border-forest/20 p-4">
            <p className="text-xs text-forest font-semibold mb-1">Upgrade to unlock</p>
            <p className="text-xs text-bark/70 leading-relaxed">
              Paid plans (Sprout, Grove, Forest) get unlimited AI strategist access.
              No rate limits, no waiting.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
