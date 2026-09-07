'use client'

// One integration card — rendered for every integration in the catalog.
// Handles several cases (see the long comment below). Extracted from
// integrations-view.tsx.

import {
  Plug,
  CheckCircle2,
  Circle,
  Trash2,
  ExternalLink,
  Loader2,
  Radar,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { DynamicIcon } from '@/lib/client-utils'
import { useAppStore } from '@/lib/store'
import {
  type Integration,
  type Connection,
  type ToolInfo,
  resolveAuthMethod,
  parseConfig,
  cardSlug,
} from './types'

// One integration card — handles several cases:
//   1. Connected: switch + (Configure if it has fields) + delete
//   2. OAuth (authMethod === 'oauth'): "Log in with {Name}" button + "OAuth" badge
//   3. Auto-detect (authMethod === 'auto'): "Auto-detect" button + "AUTO" badge —
//      scans localhost and one-click connects when the open-source service is running
//   4. Reference (authMethod === 'none'): "Reference" badge only
//   5. Has fields (apikey / appPassword): "Connect" button → field-form dialog
//   6. Built-in SEO (authMethod === 'none' + 'builtin' cap): "Open SEO Tools" button
//   7. Built-in (no fields, no auth, not reference): "Built-in — no setup required"
export function IntegrationCard({
  integration,
  tool,
  connection,
  onConnect,
  onAutoDetect,
  autoDetectPending,
  onToggle,
  onDisconnect,
  deletePending,
}: {
  integration: Integration
  tool?: ToolInfo
  connection?: Connection
  onConnect: (i: Integration) => void
  onAutoDetect: (i: Integration) => void
  autoDetectPending: boolean
  onToggle: (id: string, enabled: boolean) => void
  onDisconnect: (id: string) => void
  deletePending: boolean
}) {
  const connected = !!connection
  const fields = integration.fields ?? []
  const hasFields = fields.length > 0
  const capabilities = tool?.capabilities ?? []
  const link = tool?.link ?? null
  const setView = useAppStore((s) => s.setView)

  const { authMethod, oauthProvider } = resolveAuthMethod(integration)
  const isOAuth = authMethod === 'oauth' && !!oauthProvider
  // Open-source auto-detect tools (n8n, Zeroclaw, OpenCode, Kilocode,
  // WordPress MCP Server, WordPress MCP (tropk-ai)) — no fields, no manual
  // endpoint. The user clicks "Auto-detect" and we scan localhost + wire
  // up the discovered endpoint automatically.
  const isAuto = authMethod === 'auto'
  // Built-in SEO tools (Open SEO + Seonaut) — authMethod === 'none' + capability 'builtin'
  // They render a "BUILT-IN" badge + "Open SEO Tools" button instead of a Connect button.
  const isBuiltinSeo =
    authMethod === 'none' &&
    integration.category === 'seo' &&
    capabilities.includes('builtin')
  // Plain reference (Plugin Boilerplate / Awesome OpenCode) — keep the original
  // semantics but exclude the built-in SEO case so those get their own treatment.
  const isReference =
    !isBuiltinSeo &&
    !isAuto &&
    (authMethod === 'none' ||
      (!hasFields &&
        !connected &&
        (capabilities.includes('registry') || capabilities.includes('developer'))))

  // For auto-detected connections, surface the discovered endpoint under the
  // switch so the user can see what was wired up.
  const connConfig = connection ? parseConfig(connection.config) : null
  const autoEndpoint =
    isAuto && connConfig?.autoDetected === true && typeof connConfig.endpoint === 'string'
      ? (connConfig.endpoint as string)
      : null

  function startOAuth() {
    if (!oauthProvider) return
    const params = new URLSearchParams({
      integrationName: integration.name,
    })
    // Full-page redirect — the OAuth flow is a redirect-based round-trip.
    window.location.href = `/api/oauth/${oauthProvider}/start?${params.toString()}`
  }

  return (
    <Card
      id={`int-${cardSlug(integration.name)}`}
      className="py-4 transition-shadow scroll-mt-24"
    >
      <CardContent className="pt-0 space-y-3">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-xl bg-forest/10 text-forest flex items-center justify-center shrink-0">
            <DynamicIcon name={integration.iconKey ?? undefined} className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-foreground truncate">
                {integration.name}
              </h3>
              {connected ? (
                <Badge variant="outline" className="text-forest border-forest/40 shrink-0">
                  <CheckCircle2 className="size-3" /> Connected
                </Badge>
              ) : isOAuth ? (
                <Badge variant="outline" className="text-forest border-forest/40 shrink-0">
                  OAuth
                </Badge>
              ) : isAuto ? (
                <Badge
                  variant="outline"
                  className="text-forest border-forest/40 bg-forest/10 shrink-0"
                >
                  <span className="size-1.5 rounded-full bg-forest" />
                  AUTO
                </Badge>
              ) : isBuiltinSeo ? (
                <Badge
                  variant="outline"
                  className="text-forest border-forest/40 bg-forest/10 shrink-0"
                >
                  <span className="size-1.5 rounded-full bg-forest" />
                  BUILT-IN
                </Badge>
              ) : isReference ? (
                <Badge variant="outline" className="text-muted-foreground shrink-0">
                  Reference
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground shrink-0">
                  <Circle className="size-3" /> Available
                </Badge>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground line-clamp-3">
              {integration.description}
            </p>
            {capabilities.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {capabilities.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-forest hover:underline"
          >
            Learn more <ExternalLink className="size-3" />
          </a>
        )}

        {connected ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Switch
                  checked={!!connection?.enabled}
                  onCheckedChange={(enabled) => onToggle(connection!.id, enabled)}
                />
                <span className="text-xs text-muted-foreground">
                  {connection?.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {/* OAuth connections have nothing to configure (no API keys / form). */}
                {hasFields && !isOAuth && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onConnect(integration)}
                  >
                    Configure
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  aria-label="Disconnect"
                  onClick={() => onDisconnect(connection!.id)}
                  disabled={deletePending}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
            {autoEndpoint && (
              <p className="text-xs text-muted-foreground truncate">
                <span className="text-forest">Endpoint:</span>{' '}
                <span className="font-mono">{autoEndpoint}</span>
              </p>
            )}
          </div>
        ) : isOAuth ? (
          // OAuth — full-page redirect to the provider, no fields dialog.
          <div className="space-y-1.5">
            <Button
              className="w-full bg-forest text-primary-foreground hover:bg-forest/90"
              size="sm"
              onClick={startOAuth}
            >
              <DynamicIcon name={integration.iconKey ?? undefined} className="size-3.5" />
              Log in with {integration.name}
            </Button>
            <p className="text-xs text-muted-foreground">
              OAuth 2.0 — we never see your password.
            </p>
          </div>
        ) : isAuto ? (
          // Open-source auto-detect — no manual endpoint. Scan localhost and
          // one-click auto-connect when the service is reachable.
          <div className="space-y-1.5">
            <Button
              className="w-full bg-forest text-primary-foreground hover:bg-forest/90"
              size="sm"
              disabled={autoDetectPending}
              onClick={() => onAutoDetect(integration)}
            >
              {autoDetectPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Radar className="size-3.5" />
              )}
              Auto-detect
            </Button>
            <p className="text-xs text-muted-foreground">
              Open-source — auto-detected when running locally. No manual endpoint.
            </p>
          </div>
        ) : isBuiltinSeo ? (
          // Built-in SEO tools (Open SEO + Seonaut) — no endpoint to connect.
          // Switch the view to the SEO Tools panel where the audit + sitemap +
          // meta preview + AI keyword/brief/schema tools live.
          <Button
            className="w-full bg-forest text-primary-foreground hover:bg-forest/90"
            size="sm"
            onClick={() => setView({ name: 'seo-tools' })}
          >
            <Search className="size-3.5" /> Open SEO Tools
          </Button>
        ) : isReference ? (
          // No Connect button — just the Learn more link above + the Reference badge.
          null
        ) : hasFields ? (
          <Button
            className="w-full bg-forest text-primary-foreground hover:bg-forest/90"
            size="sm"
            onClick={() => onConnect(integration)}
          >
            <Plug className="size-3.5" /> Connect
          </Button>
        ) : (
          // No fields, but not a reference/developer entry — show a soft placeholder
          // (e.g. AI Copy built-in, which is auto-connected). No Connect button needed.
          <p className="text-xs text-muted-foreground">
            Built-in — no setup required.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
