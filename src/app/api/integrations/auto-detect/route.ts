import { NextRequest, NextResponse } from 'next/server'
import { discoverServices, autoConnectService } from '@/lib/auto-discovery'
import { db } from '@/lib/db'

// GET /api/integrations/auto-detect
// Pings common local endpoints for open-source tools (Ollama, n8n, Zeroclaw,
// WordPress MCP, OpenCode CLI) and returns the discovery results. The frontend
// renders this as an "Auto-detect local tools" panel — click to scan, then
// one-click auto-connect each found service. No manual endpoint entry.
export async function GET() {
  try {
    const services = await discoverServices()
    return NextResponse.json({
      ok: true,
      services,
      note: 'Auto-detection pings common local ports. Open-source tools that are running will show as "reachable" — click "Auto-connect" to wire them up instantly. No manual endpoint entry needed.',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Auto-detect failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/integrations/auto-detect
// Body: { kind: 'ollama'|'n8n'|'zeroclaw'|'opencode-cli'|'wordpress-mcp' }
// Auto-connects the specified discovered service (creates an IntegrationConnection).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const kind = typeof body?.kind === 'string' ? body.kind : ''

    if (!kind) {
      return NextResponse.json({ error: 'kind is required' }, { status: 400 })
    }

    const services = await discoverServices()
    const svc = services.find((s) => s.kind === kind && s.status === 'reachable')
    if (!svc) {
      return NextResponse.json(
        { error: `${kind} is not reachable. Start the service first.` },
        { status: 400 },
      )
    }

    const result = await autoConnectService(svc)

    // Log activity
    try {
      await db.activityLog.create({
        data: {
          action: 'integration.auto-connect',
          detail: `Auto-connected ${svc.name} at ${svc.endpoint}`,
        },
      })
    } catch {}

    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 400 })
    }

    return NextResponse.json({ ok: true, connection: result.connection })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Auto-connect failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
