import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/pm/time?projectRecordId=X
// POST /api/pm/time body { description, startedAt, endedAt?, durationMin?, billable?, projectRecordId?, clientId?, task? }
// PATCH /api/pm/time body { id, endedAt?, durationMin? }  (stop timer / update entry)
// DELETE /api/pm/time?id=X

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const projectRecordId = url.searchParams.get('projectRecordId')

    const entries = await db.timeEntry.findMany({
      where: projectRecordId ? { projectRecordId } : {},
      orderBy: { startedAt: 'desc' },
      take: 100,
    })
    return NextResponse.json({ entries })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch time entries'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const description = typeof body?.description === 'string' ? body.description.trim() : ''
    if (!description) return NextResponse.json({ error: 'description is required' }, { status: 400 })

    const startedAt = body?.startedAt ? new Date(body.startedAt) : new Date()
    const endedAt = body?.endedAt ? new Date(body.endedAt) : null
    const durationMin =
      typeof body?.durationMin === 'number'
        ? body.durationMin
        : endedAt
          ? Math.round((endedAt.getTime() - startedAt.getTime()) / 60000)
          : 0

    const entry = await db.timeEntry.create({
      data: {
        description,
        startedAt,
        endedAt,
        durationMin,
        billable: body?.billable !== false,
        projectRecordId: typeof body?.projectRecordId === 'string' ? body.projectRecordId : null,
        clientId: typeof body?.clientId === 'string' ? body.clientId : null,
        task: typeof body?.task === 'string' ? body.task : null,
      },
    })
    return NextResponse.json({ entry })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create time entry'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const id = typeof body?.id === 'string' ? body.id : ''
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const data: any = {}
    if (body?.endedAt) {
      data.endedAt = new Date(body.endedAt)
      // recalculate duration
      const existing = await db.timeEntry.findUnique({ where: { id } })
      if (existing) {
        data.durationMin = Math.round((data.endedAt.getTime() - existing.startedAt.getTime()) / 60000)
      }
    }
    if (typeof body?.durationMin === 'number') data.durationMin = body.durationMin
    if (typeof body?.billable === 'boolean') data.billable = body.billable

    const entry = await db.timeEntry.update({ where: { id }, data })
    return NextResponse.json({ entry })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update time entry'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    await db.timeEntry.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete time entry'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
