import { NextResponse } from 'next/server'
import { AUTOMATION_TOOLS } from '../../_lib/pm-automation-catalog'
import { db } from '@/lib/db'

// GET /api/automation/catalog
// Returns the automation tool catalog + which automations are currently enabled.
export async function GET() {
  try {
    const enabled = await db.automation.findMany({
      where: { enabled: true },
    })
    const enabledByToolId = new Map(enabled.map((a) => [a.toolId, a]))

    return NextResponse.json({
      tools: AUTOMATION_TOOLS.map((t) => ({
        ...t,
        enabled: enabledByToolId.has(t.id),
        config: enabledByToolId.get(t.id)?.config ?? null,
        lastRunAt: enabledByToolId.get(t.id)?.lastRunAt ?? null,
      })),
      note: 'Toggle automations on/off. Integration-based automations (n8n, Zeroclaw, Make, Webhooks) require the integration to be connected. Built-in automations run on the VirtuaLab Digital server.',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch automation catalog'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
