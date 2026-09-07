'use client'

// Auto-detect Local Tools panel — scans localhost for open-source tools
// (Ollama, n8n, Zeroclaw, WordPress MCP, OpenCode) and lets the user one-click
// auto-connect any reachable one. Extracted from integrations-view.tsx.

import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Loader2,
  Radar,
  ScanLine,
  Plug,
  Circle,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { fetchJson } from '@/lib/client-utils'
import {
  type DiscoveredService,
  iconForServiceKind,
} from './types'

export function AutoDetectPanel({
  scanData,
  scanPending,
  onScan,
  connectingKind,
  onAutoConnect,
}: {
  scanData: { services: DiscoveredService[]; note?: string } | null
  scanPending: boolean
  onScan: () => void
  connectingKind: string | null
  onAutoConnect: (kind: string) => Promise<boolean> | void
}) {
  return (
    <Card className="mb-8 border-forest/40 bg-forest/5 overflow-hidden">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-xl bg-forest/15 text-forest flex items-center justify-center shrink-0">
            <Radar className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">
                Auto-detect Local Tools
              </h2>
              <Badge variant="outline" className="text-forest border-forest/40 bg-forest/10">
                <span className="size-1.5 rounded-full bg-forest" />
                Open-source
              </Badge>
            </div>
            <p className="text-sm text-foreground/70 mt-0.5 max-w-2xl">
              Open-source tools running on your machine (Ollama, n8n, Zeroclaw,
              WordPress MCP, OpenCode) are detected automatically — no manual
              endpoint setup.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <Button
            className="bg-forest text-primary-foreground hover:bg-forest/90 shrink-0"
            onClick={onScan}
            disabled={scanPending}
          >
            {scanPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ScanLine className="size-4" />
            )}
            Scan now
          </Button>
          <span className="text-xs text-muted-foreground">
            {scanPending
              ? 'Scanning localhost…'
              : scanData
                ? `Last scan: ${scanData.services.length} service${scanData.services.length === 1 ? '' : 's'} checked`
                : 'Pings localhost ports in parallel — fast.'}
          </span>
        </div>

        {scanPending && !scanData && (
          <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="size-4 animate-spin text-forest" />
            Scanning localhost…
          </div>
        )}

        {scanData && scanData.services.length > 0 && (
          <div className="space-y-2">
            {scanData.services.map((svc) => {
              const Icon = iconForServiceKind(svc.kind)
              const reachable = svc.status === 'reachable'
              const isConnecting = connectingKind === svc.kind
              return (
                <div
                  key={svc.kind}
                  className={cn(
                    'flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border p-3',
                    reachable
                      ? 'border-forest/30 bg-forest/5'
                      : 'border-border bg-card',
                  )}
                >
                  <div
                    className={cn(
                      'flex items-center gap-3 min-w-0 flex-1',
                    )}
                  >
                    <div
                      className={cn(
                        'size-9 rounded-lg flex items-center justify-center shrink-0',
                        reachable
                          ? 'bg-forest/15 text-forest'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground text-sm">
                          {svc.name}
                        </span>
                        {reachable ? (
                          <Badge
                            variant="outline"
                            className="text-forest border-forest/40 bg-forest/10 shrink-0"
                          >
                            <span className="size-1.5 rounded-full bg-forest" />
                            Reachable
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-muted-foreground shrink-0"
                          >
                            <Circle className="size-3" />
                            Not running
                          </Badge>
                        )}
                        {svc.responseTimeMs !== undefined && reachable && (
                          <span className="text-[10px] text-muted-foreground">
                            {svc.responseTimeMs}ms
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="font-mono">{svc.endpoint}</span>
                        {svc.details && (
                          <span className="text-foreground/60">
                            · {svc.details}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 sm:pl-2">
                    {reachable ? (
                      <Button
                        size="sm"
                        className="bg-forest text-primary-foreground hover:bg-forest/90"
                        disabled={isConnecting}
                        onClick={() => onAutoConnect(svc.kind)}
                      >
                        {isConnecting ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Plug className="size-3.5" />
                        )}
                        Auto-connect
                      </Button>
                    ) : (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-border text-muted-foreground hover:bg-muted"
                          >
                            <Info className="size-3.5" /> Start instructions
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72" align="end">
                          <div className="space-y-1.5">
                            <p className="font-medium text-foreground">
                              {svc.name} is not running
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {svc.details ??
                                'Start the service on your machine, then scan again.'}
                            </p>
                            <p className="text-xs text-foreground/70 pt-1 border-t border-border mt-2">
                              Endpoint:{' '}
                              <span className="font-mono">{svc.endpoint}</span>
                            </p>
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </div>
              )
            })}

            {scanData.note && (
              <p className="text-xs text-muted-foreground pt-1">
                {scanData.note}
              </p>
            )}
          </div>
        )}

        {scanData && scanData.services.every((s) => s.status !== 'reachable') && (
          <div className="rounded-lg border border-dashed border-forest/30 bg-forest/5 p-4 text-sm text-foreground/80">
            No local open-source tools detected yet. Start Ollama
            (<span className="font-mono text-xs">ollama serve</span>), n8n
            (<span className="font-mono text-xs">npx n8n</span>), or Zeroclaw,
            then scan again.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
// Hook used by the parent integrations view: owns the scan mutation +
// auto-connect helper + per-card "Auto-detect" handler. Splitting it out
// lets the AutoDetectPanel above stay a pure render component.

export function useAutoDetect() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [scanData, setScanData] = React.useState<{
    services: DiscoveredService[]
    note?: string
  } | null>(null)
  const [connectingKind, setConnectingKind] = React.useState<string | null>(null)

  const scanMut = useMutation({
    mutationFn: () =>
      fetchJson('/api/integrations/auto-detect') as Promise<{
        ok: boolean
        services: DiscoveredService[]
        note?: string
      }>,
    onSuccess: (data) => {
      setScanData({ services: data.services ?? [], note: data.note })
    },
    onError: () =>
      toast({ title: 'Scan failed', variant: 'destructive' }),
  })

  async function autoConnectByKind(kind: string): Promise<boolean> {
    const svc = scanData?.services.find((s) => s.kind === kind)
    if (!svc || svc.status !== 'reachable') {
      const hint = svc?.details ?? 'Start the service, then scan again.'
      toast({
        title: `${svc?.name ?? kind} is not running`,
        description: hint,
        variant: 'destructive',
      })
      return false
    }
    setConnectingKind(kind)
    try {
      await fetchJson('/api/integrations/auto-detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind }),
      })
      queryClient.invalidateQueries({ queryKey: ['integrations'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      queryClient.invalidateQueries({ queryKey: ['zeroclaw'] })
      toast({
        title: `Auto-connected ${svc.name}`,
        description: svc.endpoint,
      })
      return true
    } catch (err: any) {
      const msg = err?.message || 'Auto-connect failed.'
      toast({
        title: 'Auto-connect failed',
        description: msg,
        variant: 'destructive',
      })
      return false
    } finally {
      setConnectingKind(null)
    }
  }

  // Per-card "Auto-detect" handler — runs a fresh scan first (in case the user
  // just started the service), then auto-connects the matching kind. This is
  // shared with the panel: clicking the card button also refreshes the panel.
  const [cardDetectingName, setCardDetectingName] = React.useState<string | null>(
    null,
  )

  async function handleCardAutoDetect(integration: { name: string }) {
    const kind = KIND_LOOKUP[integration.name]
    if (!kind) {
      toast({
        title: 'Auto-detect not available',
        description: 'This integration is not on the auto-detect list.',
        variant: 'destructive',
      })
      return
    }
    setCardDetectingName(integration.name)
    try {
      // Always re-scan — it's cheap (~4ms parallel) and the service may have
      // just been started. The panel state updates as a side effect.
      const result = await scanMut.mutateAsync()
      const svc = (result.services ?? []).find((s) => s.kind === kind)
      if (!svc) {
        toast({
          title: 'Could not detect this tool',
          description: 'No matching service found in the scan.',
          variant: 'destructive',
        })
        return
      }
      if (svc.status !== 'reachable') {
        toast({
          title: `${svc.name} is not running`,
          description: svc.details ?? 'Start the service, then try again.',
          variant: 'destructive',
        })
        return
      }
      // Reachable — auto-connect.
      setConnectingKind(kind)
      try {
        await fetchJson('/api/integrations/auto-detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind }),
        })
        queryClient.invalidateQueries({ queryKey: ['integrations'] })
        queryClient.invalidateQueries({ queryKey: ['analytics'] })
        queryClient.invalidateQueries({ queryKey: ['zeroclaw'] })
        toast({
          title: `Auto-connected ${svc.name}`,
          description: svc.endpoint,
        })
      } catch (err: any) {
        toast({
          title: 'Auto-connect failed',
          description: err?.message || 'Failed to connect.',
          variant: 'destructive',
        })
      } finally {
        setConnectingKind(null)
      }
    } catch {
      toast({ title: 'Scan failed', variant: 'destructive' })
    } finally {
      setCardDetectingName(null)
    }
  }

  return {
    scanData,
    scanPending: scanMut.isPending,
    scanNow: () => scanMut.mutate(),
    connectingKind,
    autoConnectByKind,
    cardDetectingName,
    handleCardAutoDetect,
  }
}

// Local copy of the integration-name → kind map (kept in sync with
// integrations/types.ts `INTEGRATION_NAME_TO_KIND`). We don't import it here to
// avoid coupling the hook to the types module — the lookup is only needed by
// the per-card handler.
const KIND_LOOKUP: Record<string, string> = {
  'n8n': 'n8n',
  'Zeroclaw': 'zeroclaw',
  'OpenCode': 'opencode-cli',
  'Kilocode': 'opencode-cli',
  'WordPress MCP Server': 'wordpress-mcp',
  'WordPress MCP (tropk-ai)': 'wordpress-mcp',
}
