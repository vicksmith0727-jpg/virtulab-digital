import { NextRequest, NextResponse } from 'next/server'
import { runZeroclawTask, getZeroclawConnection } from '@/lib/zeroclaw'
import { db } from '@/lib/db'

// POST /api/zeroclaw/run
// Body: { task: string, system?: string, maxTokens?: number }
// Sends a task to the connected Zeroclaw agent endpoint and returns its response.
//
// Use cases:
//   - "Research X and summarize"  → autonomous research
//   - "Draft a 5-post content calendar for {business}" → long-form generation
//   - "Audit my landing page copy for tone" → review task
//
// Returns: { ok, response, connection: { endpoint } } or { error }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const task = typeof body?.task === 'string' ? body.task.trim() : ''
    const system =
      typeof body?.system === 'string'
        ? body.system
        : 'You are a VirtuaLab Digital autonomous agent. Be concise, honest, and practical. No paid-ad suggestions.'
    const maxTokens =
      typeof body?.maxTokens === 'number' && body.maxTokens > 0
        ? Math.min(body.maxTokens, 4000)
        : 1200

    if (!task) {
      return NextResponse.json({ error: 'task is required' }, { status: 400 })
    }
    if (task.length > 8000) {
      return NextResponse.json(
        { error: 'task is too long (max 8000 chars)' },
        { status: 400 },
      )
    }

    const conn = await getZeroclawConnection()
    if (!conn) {
      return NextResponse.json(
        {
          error: 'Zeroclaw is not connected. Connect it in Integrations → Automation → Zeroclaw first.',
        },
        { status: 400 },
      )
    }

    const response = await runZeroclawTask(task, { system, maxTokens })

    // Log the activity
    try {
      await db.activityLog.create({
        data: {
          projectId: null,
          action: 'zeroclaw.run',
          detail: `Ran task: ${task.slice(0, 80)}${task.length > 80 ? '…' : ''}`,
        },
      })
    } catch {}

    return NextResponse.json({
      ok: true,
      response,
      connection: { endpoint: conn.endpoint },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to run Zeroclaw task'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET /api/zeroclaw/run → returns whether Zeroclaw is connected (for the UI to
// show/hide the "Run with Zeroclaw" button).
export async function GET() {
  try {
    const conn = await getZeroclawConnection()
    return NextResponse.json({
      connected: Boolean(conn),
      endpoint: conn ? conn.endpoint : null,
    })
  } catch {
    return NextResponse.json({ connected: false, endpoint: null })
  }
}
