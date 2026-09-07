'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Server,
  Download,
  Copy,
  Terminal,
  Check,
  HardDrive,
  Cpu,
  MonitorSmartphone,
  Package,
  ArrowRight,
  Leaf,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */

async function fetchJson(url: string, opts?: RequestInit) {
  const res = await fetch(url, opts)
  if (!res.ok) throw new Error((await res.text().catch(() => '')) || 'Request failed')
  return res.json()
}

interface SelfHostStep {
  title: string
  cmd: string
}

interface SelfHostData {
  selfHost: {
    supported: boolean
    tagline: string
    requirements: {
      ram: string
      disk: string
      os: string
      software: string
    }
    steps: SelfHostStep[]
    dockerCompose: string
    envExample: string
    notes: string[]
  }
}

/* ------------------------------------------------------------------ */

function copyToClipboard(text: string, label: string, toast: ReturnType<typeof useToast>['toast']) {
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    toast({ title: 'Clipboard unavailable', variant: 'destructive' })
    return
  }
  navigator.clipboard
    .writeText(text)
    .then(() => toast({ title: `${label} copied`, description: 'Paste it where you need it.' }))
    .catch(() => toast({ title: `Could not copy ${label}`, variant: 'destructive' }))
}

function downloadTextFile(filename: string, contents: string, mime: string) {
  try {
    const blob = new Blob([contents], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ */

function CodeBlock({
  code,
  label,
  filename,
  downloadMime = 'text/plain',
  maxHeight = 'max-h-80',
}: {
  code: string
  label: string
  filename?: string
  downloadMime?: string
  maxHeight?: string
}) {
  const { toast } = useToast()
  const [copied, setCopied] = React.useState(false)

  function handleCopy() {
    copyToClipboard(code, label, toast)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="rounded-lg border border-bark/30 bg-bark/95 text-cream overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-cream/10 bg-bark">
        <div className="flex items-center gap-2 text-xs text-cream/70 font-mono">
          <Terminal className="size-3.5 text-sage" />
          <span className="truncate">{filename ?? label}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-cream/80 hover:text-cream hover:bg-cream/10"
            onClick={handleCopy}
          >
            {copied ? <Check className="size-3 text-sage" /> : <Copy className="size-3" />}
            <span className="ml-1">{copied ? 'Copied' : 'Copy'}</span>
          </Button>
          {filename && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-cream/80 hover:text-cream hover:bg-cream/10"
              onClick={() => downloadTextFile(filename, code, downloadMime)}
            >
              <Download className="size-3" />
              <span className="ml-1">Download</span>
            </Button>
          )}
        </div>
      </div>
      <pre
        className={cn(
          'overflow-x-auto p-4 text-xs font-mono leading-relaxed text-cream/95',
          maxHeight,
          'overflow-y-auto',
        )}
        style={{ scrollbarColor: 'var(--color-forest) transparent' }}
      >
        <code>{code}</code>
      </pre>
    </div>
  )
}

/* ------------------------------------------------------------------ */

const REQUIREMENT_ICONS = {
  ram: Cpu,
  disk: HardDrive,
  os: MonitorSmartphone,
  software: Package,
} as const

const REQUIREMENT_LABELS = {
  ram: 'RAM',
  disk: 'Disk',
  os: 'OS',
  software: 'Software',
} as const

/* ------------------------------------------------------------------ */

export function SelfHostView() {
  const setView = useAppStore((s) => s.setView)

  const query = useQuery<SelfHostData>({
    queryKey: ['self-host'],
    queryFn: () => fetchJson('/api/self-host'),
  })

  const data = query.data?.selfHost

  return (
    <div className="organic-bg min-h-full flex flex-col">
      {/* Hero */}
      <section className="relative px-4 sm:px-6 pt-12 pb-12 sm:pt-16 sm:pb-14 border-b border-border bg-forest text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 organic-grain opacity-25 pointer-events-none" />
        <div className="max-w-6xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="max-w-3xl"
          >
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cream/30 bg-cream/10 text-cream px-3 py-1 text-xs font-medium uppercase tracking-wider">
                <Server className="size-3.5" />
                Free forever
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sage/40 bg-sage/15 text-sage px-3 py-1 text-xs font-medium uppercase tracking-wider">
                <Leaf className="size-3.5" />
                Organic & homegrown
              </span>
            </div>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-balance leading-[1.05]">
              Self-host VirtuaLab Digital — free forever
            </h1>
            <p className="mt-4 text-lg sm:text-xl text-cream/85 max-w-2xl text-balance">
              {query.isLoading
                ? 'Loading the deployment guide…'
                : data?.tagline ?? 'Run the full builder on your own VPS or laptop.'}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                size="lg"
                className="bg-background text-foreground hover:bg-background/90"
                onClick={() => {
                  const el = document.getElementById('self-host-steps')
                  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
              >
                See the steps <ArrowRight className="size-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-cream/30 text-cream hover:bg-cream/10"
                onClick={() => {
                  const el = document.getElementById('self-host-compose')
                  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
              >
                <Download className="size-4" /> docker-compose.yml
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Body */}
      <section className="flex-1 px-4 sm:px-6 py-10 sm:py-14">
        <div className="max-w-6xl mx-auto space-y-10">
          {query.isError && (
            <div className="rounded-xl border border-terracotta/40 bg-terracotta/10 text-accent p-6 text-sm">
              Could not load the self-host guide. Please try again.
            </div>
          )}

          {/* Requirements */}
          <div>
            <div className="flex items-center gap-2 mb-5">
              <Package className="size-5 text-forest" />
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Requirements
              </h2>
            </div>
            {query.isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {(['ram', 'disk', 'os', 'software'] as const).map((key) => {
                  const Icon = REQUIREMENT_ICONS[key]
                  const value = data?.requirements?.[key] ?? '—'
                  return (
                    <div
                      key={key}
                      className="rounded-2xl border border-forest/25 bg-forest/5 p-5 flex items-start gap-4"
                    >
                      <div className="size-11 rounded-xl bg-forest/15 text-forest flex items-center justify-center shrink-0">
                        <Icon className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium uppercase tracking-wider text-forest/80">
                          {REQUIREMENT_LABELS[key]}
                        </div>
                        <div className="mt-1 text-sm text-foreground/90 leading-relaxed break-words">
                          {value}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Steps */}
          <div id="self-host-steps" className="scroll-mt-20">
            <div className="flex items-center gap-2 mb-5">
              <Terminal className="size-5 text-forest" />
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Steps to deploy
              </h2>
            </div>
            {query.isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : (
              <ol className="space-y-4">
                {(data?.steps ?? []).map((step, i) => (
                  <li
                    key={i}
                    className="rounded-2xl border border-border bg-card p-5"
                  >
                    <div className="flex items-start gap-4">
                      <div className="size-9 rounded-full bg-forest text-primary-foreground flex items-center justify-center font-semibold shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0 space-y-3">
                        <h3 className="font-semibold text-foreground">{step.title}</h3>
                        <CodeBlock
                          code={step.cmd}
                          label={`step ${i + 1} command`}
                          filename={`step-${i + 1}.sh`}
                          maxHeight="max-h-60"
                        />
                      </div>
                    </div>
                  </li>
                ))}
                {(data?.steps ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">No steps returned.</p>
                )}
              </ol>
            )}
          </div>

          {/* Docker compose */}
          <div id="self-host-compose" className="scroll-mt-20">
            <div className="flex items-center gap-2 mb-5">
              <Server className="size-5 text-forest" />
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                docker-compose.yml
              </h2>
            </div>
            {query.isLoading ? (
              <Skeleton className="h-80 w-full" />
            ) : (
              <CodeBlock
                code={data?.dockerCompose ?? ''}
                label="docker-compose.yml"
                filename="docker-compose.yml"
                downloadMime="application/x-yaml"
              />
            )}
          </div>

          {/* Env example */}
          <div id="self-host-env" className="scroll-mt-20">
            <div className="flex items-center gap-2 mb-5">
              <Package className="size-5 text-forest" />
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                .env.example
              </h2>
            </div>
            {query.isLoading ? (
              <Skeleton className="h-80 w-full" />
            ) : (
              <CodeBlock
                code={data?.envExample ?? ''}
                label=".env.example"
                filename=".env.example"
                downloadMime="text/plain"
              />
            )}
          </div>

          {/* Notes */}
          {(data?.notes ?? []).length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-5">
                <Leaf className="size-5 text-forest" />
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">Notes</h2>
              </div>
              <ul className="rounded-2xl border border-sage/40 bg-sage/15 p-5 space-y-2.5">
                {(data?.notes ?? []).map((note, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 text-sm text-foreground/85 leading-relaxed"
                  >
                    <Check className="mt-0.5 size-4 text-forest shrink-0" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Footer CTA — back to builder */}
          <div className="rounded-3xl border border-forest/30 bg-forest/5 px-6 sm:px-10 py-10 grid md:grid-cols-[1fr_auto] gap-6 items-center">
            <div>
              <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground text-balance">
                Prefer the hosted builder?
              </h3>
              <p className="mt-2 text-foreground/70 text-balance">
                The hosted VirtuaLab Digital runs the same code as the self-hosted version — no
                feature gaps, ever. Start free, no credit card.
              </p>
            </div>
            <Button
              size="lg"
              className="bg-forest text-primary-foreground hover:bg-forest/90"
              onClick={() => setView({ name: 'dashboard' })}
            >
              Open the app <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Sticky footer */}
      <footer className="mt-auto border-t border-border bg-bark text-cream/90">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-cream/60">
          <span>VirtuaLab Digital — self-hosted, free forever.</span>
          <span className="flex items-center gap-1.5">
            <Leaf className="size-3.5" /> No telemetry. No paid tiers required.
          </span>
        </div>
      </footer>
    </div>
  )
}
