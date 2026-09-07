// Shared client-side utilities — dedupes the fetchJson, DynamicIcon, getLucideIcon,
// and parseConfig helpers that were copy-pasted across 10+ view files.
// Import from here instead of redefining locally.

import * as React from 'react'
import * as LucideIcons from 'lucide-react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── fetchJson ──────────────────────────────────────────────────────────────
// Replaces 10 duplicate fetchJson helpers across views.
export async function fetchJson<T = any>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, opts)
  if (!res.ok) throw new Error((await res.text().catch(() => '')) || 'Request failed')
  return res.json()
}

// ── DynamicIcon / getLucideIcon ────────────────────────────────────────────
// Replaces 6 duplicate DynamicIcon + getLucideIcon definitions.
export function getLucideIcon(name?: string): React.ComponentType<{ className?: string }> {
  if (!name) return LucideIcons.HelpCircle as any
  const Icon = (LucideIcons as any)[name]
  return Icon ?? (LucideIcons.HelpCircle as any)
}

export function DynamicIcon({
  name,
  className,
}: {
  name?: string
  className?: string
}) {
  const Icon = getLucideIcon(name)
  return React.createElement(Icon, { className })
}

// ── parseConfig ────────────────────────────────────────────────────────────
// Parses an IntegrationConnection's config JSON string safely.
export function parseConfig(cfg: any): Record<string, any> | null {
  if (!cfg) return null
  if (typeof cfg === 'object') return cfg
  try {
    return JSON.parse(cfg)
  } catch {
    return null
  }
}

// ── LoadingSpinner ──────────────────────────────────────────────────────────
// A small inline spinner for buttons / loading states.
export function LoadingSpinner({ className }: { className?: string }) {
  return <Loader2 className={cn('animate-spin', className)} />
}

// ── Slugify ────────────────────────────────────────────────────────────────
export function cardSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

// ── Relative time ──────────────────────────────────────────────────────────
export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}d ago`
  return new Date(iso).toLocaleDateString()
}
