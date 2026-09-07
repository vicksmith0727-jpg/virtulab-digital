'use client'

// Integrations view — main view. Connect forms, analytics, email, AI tools,
// MCP servers, and other quiet tools. No advertising tools, ever.
//
// The heavy sub-components live in `./integrations/*`:
//   - types.ts                       : Integration/Connection/ToolInfo/DiscoveredService + helpers
//   - integration-card.tsx           : IntegrationCard (one per integration in the catalog)
//   - ai-router-hero.tsx             : AI Tool Router hero + reply-chip renderer
//   - auto-detect-panel.tsx          : Auto-detect Local Tools panel + useAutoDetect hook
//   - zeroclaw-banner.tsx            : "Run with Zeroclaw" banner
//   - connect-dialog.tsx             : Connect / Configure dialog (field-form)
//   - custom-integration-dialog.tsx  : "+" custom-integration dialog

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plug,
  Search,
  Network,
  Plus,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { fetchJson } from '@/lib/client-utils'

import {
  type Integration,
  type Connection,
  type ToolInfo,
  cardSlug,
} from './integrations/types'
import { IntegrationCard } from './integrations/integration-card'
import { AiToolRouterHero } from './integrations/ai-router-hero'
import {
  AutoDetectPanel,
  useAutoDetect,
} from './integrations/auto-detect-panel'
import { ZeroclawBanner } from './integrations/zeroclaw-banner'
import { ConnectDialog } from './integrations/connect-dialog'
import { CustomIntegrationDialog } from './integrations/custom-integration-dialog'

export function IntegrationsView() {
  const queryClient = useQueryClient()

  const integrationsQuery = useQuery<{
    integrations: Integration[]
    connections: Connection[]
  }>({
    queryKey: ['integrations'],
    queryFn: () => fetchJson('/api/integrations'),
  })

  // Tool catalog (with link + capabilities) so cards can show "Learn more" and
  // capability badges. The main integrations endpoint doesn't surface those fields,
  // so we fetch the AI tool catalog and merge by name.
  const toolsQuery = useQuery<{ categories: any[]; tools: ToolInfo[] }>({
    queryKey: ['ai-tools'],
    queryFn: () => fetchJson('/api/ai/tools'),
  })

  const toolsByName = React.useMemo(() => {
    const map: Record<string, ToolInfo> = {}
    for (const t of toolsQuery.data?.tools ?? []) map[t.name] = t
    return map
  }, [toolsQuery.data])

  const updateMut = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string
      body: { enabled?: boolean; config?: Record<string, any> }
    }) =>
      fetchJson(`/api/integrations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] })
    },
    onError: () => {/* toast handled globally if needed */},
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/integrations/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
    },
    onError: () => {/* toast handled globally if needed */},
  })

  // ---- Auto-detect Local Tools (panel + per-card button) ----------------
  const {
    scanData,
    scanPending,
    scanNow,
    connectingKind,
    autoConnectByKind,
    cardDetectingName,
    handleCardAutoDetect,
  } = useAutoDetect()

  // ---- Custom integration ("+" card) ------------------------------------
  const [customOpen, setCustomOpen] = React.useState(false)

  // ---- Connect / Configure dialog ---------------------------------------
  const [openId, setOpenId] = React.useState<string | null>(null)

  const integrations = integrationsQuery.data?.integrations ?? []
  const connections = integrationsQuery.data?.connections ?? []

  // Order categories: mcp and cms at the very top (after the AI/MCP hero sections),
  // then the rest alphabetically. We render mcp separately in the MCP Registry
  // highlight block, and 'custom' separately in the Custom ("+") section at the
  // very bottom — so we exclude both from the main loop below to avoid duplicates.
  // SEO tools are consolidated into the SEO Suite section (both the `seo` category
  // and SEO-related MCP servers), so they're also excluded from the lower loops.
  const SEO_CAPABILITIES = ['seo', 'search-console', 'bing', 'audits', 'schema', 'sitemaps', 'crawler', 'web-search']
  const isSeoIntegration = (i: Integration) =>
    i.category === 'seo' ||
    (i.capabilities ?? []).some((c: string) => SEO_CAPABILITIES.includes(c))

  const seoSuiteItems = integrations.filter(isSeoIntegration)
  const seoSuiteNames = new Set(seoSuiteItems.map((i) => i.name))

  const otherCategories = Array.from(
    new Set(
      integrations
        .filter((i) => i.category !== 'mcp' && i.category !== 'custom')
        .filter((i) => !seoSuiteNames.has(i.name))
        .map((i) => i.category),
    ),
  ).sort((a, b) => {
    // cms first, then coding, then alphabetical
    if (a === 'cms') return -1
    if (b === 'cms') return 1
    if (a === 'coding') return -1
    if (b === 'coding') return 1
    return a.localeCompare(b)
  })
  // MCP items for the MCP Registry — exclude SEO ones (they're in the SEO Suite)
  const mcpItems = integrations.filter(
    (i) => i.category === 'mcp' && !seoSuiteNames.has(i.name),
  )

  function findConnection(integrationId: string) {
    return connections.find((c) => c.integrationId === integrationId)
  }

  function openConnect(integration: Integration) {
    setOpenId(integration.id)
  }

  function scrollToCard(name: string) {
    const el = document.getElementById(`int-${cardSlug(name)}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('ring-2', 'ring-forest', 'ring-offset-2', 'ring-offset-background')
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-forest', 'ring-offset-2', 'ring-offset-background')
      }, 1800)
    }
  }

  const selectedIntegration = openId
    ? integrations.find((i) => i.id === openId) ?? null
    : null

  if (integrationsQuery.isLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-6">
            Integrations
          </h1>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (integrationsQuery.isError) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
            Could not load integrations.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-8">
          <p className="text-sm text-muted-foreground">Quiet tools that earn their keep</p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            Integrations
          </h1>
          <p className="mt-2 text-foreground/70 max-w-2xl text-balance">
            Connect forms, analytics, email, and more. No advertising tools, ever.
          </p>
        </div>

        {/* ------------------------------------------------ AI Tool Router hero */}
        <AiToolRouterHero scrollToCard={scrollToCard} />

        {/* ------------------------------------------------ Auto-detect Local Tools */}
        <AutoDetectPanel
          scanData={scanData}
          scanPending={scanPending}
          onScan={scanNow}
          connectingKind={connectingKind}
          onAutoConnect={autoConnectByKind}
        />

        {/* ------------------------------------------------ Run with Zeroclaw banner */}
        <ZeroclawBanner />

        {/* ------------------------------------------------ MCP Registry highlight */}
        {mcpItems.length > 0 && (
          <section className="mb-10">
            <Card className="border-sage/40 bg-sage/20 overflow-hidden">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3 mb-5">
                  <div className="size-10 rounded-xl bg-sage/40 text-forest flex items-center justify-center shrink-0">
                    <Network className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 flex-wrap">
                      MCP Registry
                      <Badge variant="outline" className="text-forest border-forest/40">
                        {mcpItems.length} servers
                      </Badge>
                    </h2>
                    <p className="text-sm text-foreground/70 mt-0.5 max-w-2xl">
                      MCP servers are the standard way the AI assistant reaches external
                      services. Connect one and the AI can call it directly.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {mcpItems.map((integration) => (
                    <IntegrationCard
                      key={integration.id}
                      integration={integration}
                      tool={toolsByName[integration.name]}
                      connection={findConnection(integration.id)}
                      onConnect={openConnect}
                      onAutoDetect={handleCardAutoDetect}
                      autoDetectPending={cardDetectingName === integration.name}
                      onToggle={(id, enabled) =>
                        updateMut.mutate({ id, body: { enabled } })
                      }
                      onDisconnect={(id) => deleteMut.mutate(id)}
                      deletePending={deleteMut.isPending}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* ------------------------------------------------ SEO Suite highlight */}
        {/* Consolidate ALL SEO-related tools (the `seo` category + SEO-related MCP
            servers) into one prominent section so they're easy to find — they're
            otherwise buried below 12 MCP cards + social + analytics. */}
        {seoSuiteItems.length > 0 && (
          <section className="mb-10">
            <Card className="border-forest/40 bg-forest/5 overflow-hidden">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3 mb-5">
                  <div className="size-10 rounded-xl bg-forest/20 text-forest flex items-center justify-center shrink-0">
                    <Search className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 flex-wrap">
                      SEO Suite
                      <Badge variant="outline" className="text-forest border-forest/40">
                        {seoSuiteItems.length} tools
                      </Badge>
                    </h2>
                    <p className="text-sm text-foreground/70 mt-0.5 max-w-2xl">
                      Local search, technical audits, schema, indexing, and the MCP
                      servers that connect the AI assistant to your SEO data.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {seoSuiteItems.map((integration) => (
                    <IntegrationCard
                      key={integration.id}
                      integration={integration}
                      tool={toolsByName[integration.name]}
                      connection={findConnection(integration.id)}
                      onConnect={openConnect}
                      onAutoDetect={handleCardAutoDetect}
                      autoDetectPending={cardDetectingName === integration.name}
                      onToggle={(id, enabled) =>
                        updateMut.mutate({ id, body: { enabled } })
                      }
                      onDisconnect={(id) => deleteMut.mutate(id)}
                      deletePending={deleteMut.isPending}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* ------------------------------------------------ Other categories */}
        {integrations.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-border p-12 text-center">
            <div className="mx-auto size-12 rounded-xl bg-forest/10 text-forest flex items-center justify-center mb-3">
              <Plug className="size-6" />
            </div>
            <h3 className="font-semibold text-foreground">No integrations available yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Check back soon — we&rsquo;re adding quiet, useful tools.
            </p>
          </div>
        ) : (
          otherCategories.map((cat) => {
            const items = integrations.filter((i) => i.category === cat)
            return (
              <section key={cat} className="mb-10">
                <h2 className="text-lg font-semibold text-foreground mb-4 capitalize">
                  {cat}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((integration) => (
                    <IntegrationCard
                      key={integration.id}
                      integration={integration}
                      tool={toolsByName[integration.name]}
                      connection={findConnection(integration.id)}
                      onConnect={openConnect}
                      onAutoDetect={handleCardAutoDetect}
                      autoDetectPending={cardDetectingName === integration.name}
                      onToggle={(id, enabled) =>
                        updateMut.mutate({ id, body: { enabled } })
                      }
                      onDisconnect={(id) => deleteMut.mutate(id)}
                      deletePending={deleteMut.isPending}
                    />
                  ))}
                </div>
              </section>
            )
          })
        )}

        {/* ------------------------------------------------ Custom ("+") section */}
        <section className="mb-4">
          <h2 className="text-lg font-semibold text-foreground mb-4 capitalize">
            Custom
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Render any user-added custom integrations first (so they appear with the
                standard card treatment), then the dashed "+" card at the end. */}
            {integrations
              .filter((i) => i.category === 'custom')
              .map((integration) => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  tool={toolsByName[integration.name]}
                  connection={findConnection(integration.id)}
                  onConnect={openConnect}
                  onAutoDetect={handleCardAutoDetect}
                  autoDetectPending={cardDetectingName === integration.name}
                  onToggle={(id, enabled) =>
                    updateMut.mutate({ id, body: { enabled } })
                  }
                  onDisconnect={(id) => deleteMut.mutate(id)}
                  deletePending={deleteMut.isPending}
                />
              ))}

            {/* The dashed "+" card — opens the custom integration dialog */}
            <button
              type="button"
              onClick={() => setCustomOpen(true)}
              className={cn(
                'group text-left rounded-2xl border-dashed border-2 border-forest/40 hover:border-forest',
                'p-6 transition flex flex-col items-center justify-center gap-2 min-h-40',
                'bg-forest/5 hover:bg-forest/10',
              )}
            >
              <div className="size-10 rounded-full bg-forest/15 text-forest flex items-center justify-center group-hover:scale-110 transition">
                <Plus className="size-5" />
              </div>
              <p className="text-sm font-medium text-forest">Add custom integration</p>
              <p className="text-xs text-muted-foreground text-center max-w-48">
                Connect an in-house tool or niche service.
              </p>
            </button>
          </div>
        </section>
      </div>

      {/* Connect / Configure dialog */}
      <ConnectDialog
        integration={selectedIntegration}
        open={!!openId}
        onOpenChange={(open) => {
          if (!open) setOpenId(null)
        }}
      />

      {/* Custom integration dialog */}
      <CustomIntegrationDialog
        open={customOpen}
        onOpenChange={(open) => {
          if (!open) setCustomOpen(false)
        }}
      />
    </div>
  )
}
