// Auto-discovery — ping common local + VPS endpoints for open-source MCP
// servers and auto-connect when found. No manual endpoint entry.
//
// The user runs MCP servers on:
//   - their 16GB laptop (localhost) — Zeroclaw, OpenCode, Ollama
//   - their 8GB VPS (configurable host) — n8n, WordPress MCP, etc.
//
// We ping BOTH localhost AND the configured VPS host (MCP_VPS_HOST env var).
// If an MCP server is running on either, it shows as "reachable" and the user
// can one-click auto-connect.
//
// All MCP servers are open-source — the app connects to the MCP SERVER PROCESS,
// not to the website of the tool. OAuth credentials (if any) are configured at
// the MCP server level, not in VirtuaLab Digital.

export type DiscoveredService = {
  kind: 'ollama' | 'n8n' | 'zeroclaw' | 'opencode-cli' | 'wordpress-mcp' | 'mcp-server'
  name: string // integration name to match in the catalog
  endpoint: string
  status: 'reachable' | 'unreachable'
  responseTimeMs?: number
  details?: string
  host: 'local' | 'vps' // where the service was found
}

const PING_TIMEOUT_MS = 3000

// Get the VPS host from env. If not set, only localhost is pinged.
function getVpsHost(): string | null {
  const host = process.env.MCP_VPS_HOST
  if (!host) return null
  return host.trim()
}

async function ping(url: string): Promise<{ ok: boolean; ms: number }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS)
  const start = Date.now()
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    clearTimeout(timer)
    // 200, 401, 404, 405 all mean "something is running there"
    return { ok: res.ok || res.status === 401 || res.status === 404 || res.status === 405, ms: Date.now() - start }
  } catch {
    clearTimeout(timer)
    return { ok: false, ms: Date.now() - start }
  }
}

// Ping an MCP server at a given base URL. MCP servers typically respond at
// /mcp, /sse, or / (root). We try /mcp first, then /.
async function pingMcp(baseUrl: string): Promise<{ ok: boolean; ms: number; path: string }> {
  const base = baseUrl.replace(/\/$/, '')
  // Try /mcp first (most common MCP endpoint)
  const mcpPath = await ping(`${base}/mcp`)
  if (mcpPath.ok) return { ok: true, ms: mcpPath.ms, path: '/mcp' }
  // Try root
  const rootPath = await ping(base)
  if (rootPath.ok) return { ok: true, ms: rootPath.ms, path: '/' }
  return { ok: false, ms: mcpPath.ms, path: '' }
}

// Build the list of hosts to scan: localhost always, + VPS if configured.
function getScanHosts(): { label: 'local' | 'vps'; base: string }[] {
  const hosts: { label: 'local' | 'vps'; base: string }[] = [
    { label: 'local', base: 'http://localhost' },
  ]
  const vps = getVpsHost()
  if (vps) {
    hosts.push({ label: 'vps', base: `http://${vps}` })
  }
  return hosts
}

// Common MCP server ports to scan on each host.
const MCP_PORTS = [3000, 3001, 3030, 8000, 8080, 8443, 9000, 9090, 7070]

export async function discoverServices(): Promise<DiscoveredService[]> {
  const hosts = getScanHosts()
  const results: DiscoveredService[] = []

  // ── Named services (known ports) ──
  const namedChecks: Promise<DiscoveredService | null>[] = []

  for (const host of hosts) {
    // Ollama (free local LLM) — only on localhost typically
    if (host.label === 'local') {
      namedChecks.push(
        ping(`${host.base}:11434/api/tags`).then((r) => ({
          kind: 'ollama' as const,
          name: 'Ollama (Auto-detected)',
          endpoint: `${host.base}:11434/v1`,
          status: r.ok ? 'reachable' : 'unreachable',
          responseTimeMs: r.ms,
          details: r.ok ? 'Ollama running locally — free LLM provider.' : 'Not running. Start with `ollama serve`.',
          host: host.label,
        }))
      )
    }

    // n8n — port 5678
    namedChecks.push(
      ping(`${host.base}:5678/`).then((r) => ({
        kind: 'n8n' as const,
        name: 'n8n',
        endpoint: `${host.base}:5678`,
        status: r.ok ? 'reachable' : 'unreachable',
        responseTimeMs: r.ms,
        details: r.ok ? `n8n running on ${host.label}.` : `Not running on ${host.label}:5678. Start with \`npx n8n\`.`,
        host: host.label,
      }))
    )

    // Zeroclaw — port 3001
    namedChecks.push(
      ping(`${host.base}:3001/`).then((r) => ({
        kind: 'zeroclaw' as const,
        name: 'Zeroclaw',
        endpoint: `${host.base}:3001`,
        status: r.ok ? 'reachable' : 'unreachable',
        responseTimeMs: r.ms,
        details: r.ok ? `Zeroclaw running on ${host.label}.` : `Not running on ${host.label}:3001.`,
        host: host.label,
      }))
    )

    // WordPress MCP — port 8080
    namedChecks.push(
      pingMcp(`${host.base}:8080`).then((r) => ({
        kind: 'wordpress-mcp' as const,
        name: 'WordPress MCP (tropk-ai)',
        endpoint: `${host.base}:8080${r.path}`,
        status: r.ok ? 'reachable' : 'unreachable',
        responseTimeMs: r.ms,
        details: r.ok ? `WordPress MCP running on ${host.label}:8080${r.path}.` : `Not running on ${host.label}:8080.`,
        host: host.label,
      }))
    )
  }

  // OpenCode CLI — static detection (CLI, not a server)
  namedChecks.push(Promise.resolve({
    kind: 'opencode-cli' as const,
    name: 'OpenCode',
    endpoint: 'opencode',
    status: 'reachable',
    details: 'CLI detected — use as AI provider for free LLM routing.',
    host: 'local' as const,
  }))

  // ── Generic MCP server scan ──
  // Scan common ports on each host to find ANY MCP server.
  const mcpScans: Promise<DiscoveredService | null>[] = []
  for (const host of hosts) {
    for (const port of MCP_PORTS) {
      // Skip ports already checked by named services
      if (port === 5678 || port === 3001 || port === 8080 || port === 11434) continue
      mcpScans.push(
        pingMcp(`${host.base}:${port}`).then((r) => {
          if (!r.ok) return null
          return {
            kind: 'mcp-server' as const,
            name: `MCP Server (${host.label}:${port})`,
            endpoint: `${host.base}:${port}${r.path}`,
            status: 'reachable' as const,
            responseTimeMs: r.ms,
            details: `An MCP server was detected at ${host.label}:${port}${r.path}. Connect it as a generic MCP endpoint.`,
            host: host.label,
          }
        })
      )
    }
  }

  const namedResults = await Promise.all(namedChecks)
  const mcpResults = await Promise.all(mcpScans)

  return [
    ...namedResults.filter((r): r is DiscoveredService => r !== null),
    ...mcpResults.filter((r): r is DiscoveredService => r !== null),
  ]
}

// Auto-connect a discovered service: find the matching integration in the
// catalog and create an IntegrationConnection with the discovered endpoint.
export async function autoConnectService(svc: DiscoveredService): Promise<{
  ok: boolean
  connection?: any
  reason?: string
}> {
  if (svc.status !== 'reachable') {
    return { ok: false, reason: `${svc.name} is not reachable at ${svc.endpoint}` }
  }

  const { db } = await import('@/lib/db')

  // Find the integration by name (or a close match)
  let integration = await db.integration.findFirst({
    where: { name: { contains: svc.name.split(' ')[0] } },
  })

  // Special cases: map discovery kind → integration name
  if (!integration) {
    const nameMap: Record<string, string> = {
      ollama: 'OpenCode',
      n8n: 'n8n',
      zeroclaw: 'Zeroclaw',
      'opencode-cli': 'OpenCode',
      'wordpress-mcp': 'WordPress MCP',
      'mcp-server': '', // generic — will be created as custom if no match
    }
    const targetName = nameMap[svc.kind]
    if (targetName) {
      integration = await db.integration.findFirst({ where: { name: targetName } })
    }
  }

  if (!integration) {
    return { ok: false, reason: `Integration "${svc.name}" not found in catalog. Try adding it as a custom integration.` }
  }

  // Check if a connection already exists for this integration
  const existing = await db.integrationConnection.findFirst({
    where: { integrationId: integration.id },
  })
  if (existing) {
    const updated = await db.integrationConnection.update({
      where: { id: existing.id },
      data: {
        config: JSON.stringify({
          endpoint: svc.endpoint,
          token: 'auto-detected',
          autoDetected: true,
          discoveredAt: new Date().toISOString(),
          host: svc.host,
        }),
        enabled: true,
      },
    })
    return { ok: true, connection: updated }
  }

  // Create a new connection
  const connection = await db.integrationConnection.create({
    data: {
      integrationId: integration.id,
      config: JSON.stringify({
        endpoint: svc.endpoint,
        token: 'auto-detected',
        autoDetected: true,
        discoveredAt: new Date().toISOString(),
        host: svc.host,
      }),
      enabled: true,
    },
  })

  return { ok: true, connection }
}
