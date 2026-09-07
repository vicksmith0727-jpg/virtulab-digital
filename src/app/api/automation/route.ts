import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/automation  body { toolId, enabled, config? }
// Toggles an automation on/off. Creates an Automation record if it doesn't exist.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const toolId = typeof body?.toolId === 'string' ? body.toolId : ''
    const enabled = typeof body?.enabled === 'boolean' ? body.enabled : false
    if (!toolId) return NextResponse.json({ error: 'toolId is required' }, { status: 400 })

    const existing = await db.automation.findFirst({ where: { toolId } })
    const config = typeof body?.config === 'object' ? JSON.stringify(body.config) : '{}'

    if (existing) {
      const updated = await db.automation.update({
        where: { id: existing.id },
        data: { enabled, config },
      })
      return NextResponse.json({ automation: updated })
    }

    const created = await db.automation.create({
      data: {
        name: toolId,
        toolId,
        enabled,
        config,
      },
    })
    return NextResponse.json({ automation: created })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to toggle automation'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
