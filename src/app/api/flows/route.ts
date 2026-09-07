import { NextRequest, NextResponse } from 'next/server'
import { FLOW_TEMPLATES, type Flow } from '../_lib/orchestration'
import { db } from '@/lib/db'

// GET /api/flows
// Returns all flow templates + any user-saved custom flows.
export async function GET() {
  try {
    // Load custom flows from Settings
    const setting = await db.settings.findFirst({ where: { key: 'custom-flows' } })
    const customFlows: Flow[] = setting?.value
      ? (() => { try { return JSON.parse(setting.value) } catch { return [] } })()
      : []

    return NextResponse.json({
      templates: FLOW_TEMPLATES.map((t, i) => ({
        ...t,
        id: `template-${i}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
      custom: customFlows,
      note: 'Flows chain multiple tools into automation pipelines. Each step\'s output feeds into the next step. Run manually or trigger on events.',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch flows'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/flows
// Body: { name, description, category, steps, trigger? }
// Saves a custom flow.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

    const user = await db.user.findFirst() ?? await db.user.create({
      data: { email: 'demo@virtulab.local', name: 'Demo', plan: 'grove' },
    })

    const setting = await db.settings.findFirst({ where: { userId: user.id, key: 'custom-flows' } })
    const flows: Flow[] = setting?.value
      ? (() => { try { return JSON.parse(setting.value) } catch { return [] } })()
      : []

    const newFlow: Flow = {
      id: `flow-${Date.now().toString(36)}`,
      name,
      description: typeof body?.description === 'string' ? body.description : '',
      category: typeof body?.category === 'string' ? body.category : 'custom',
      steps: Array.isArray(body?.steps) ? body.steps : [],
      enabled: false,
      trigger: typeof body?.trigger === 'string' ? body.trigger : 'manual',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    flows.push(newFlow)

    const value = JSON.stringify(flows)
    if (setting) {
      await db.settings.update({ where: { id: setting.id }, data: { value } })
    } else {
      await db.settings.create({ data: { userId: user.id, key: 'custom-flows', value } })
    }

    return NextResponse.json({ ok: true, flow: newFlow })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save flow'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
