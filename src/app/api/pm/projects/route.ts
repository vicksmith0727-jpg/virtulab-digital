import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/pm/projects
// POST /api/pm/projects body { name, description?, status?, priority?, dueDate?, clientId? }
// PATCH /api/pm/projects body { id, ... }
// DELETE /api/pm/projects?id=X

export async function GET() {
  try {
    const projects = await db.projectRecord.findMany({
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      include: {
        client: true,
        _count: { select: { tasks: true, timeEntries: true } },
      },
    })
    return NextResponse.json({ projects })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch projects'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

    const project = await db.projectRecord.create({
      data: {
        name,
        description: typeof body?.description === 'string' ? body.description : null,
        status: typeof body?.status === 'string' ? body.status : 'planning',
        priority: typeof body?.priority === 'string' ? body.priority : 'medium',
        dueDate: body?.dueDate ? new Date(body.dueDate) : null,
        clientId: typeof body?.clientId === 'string' ? body.clientId : null,
      },
    })
    return NextResponse.json({ project })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create project'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const id = typeof body?.id === 'string' ? body.id : ''
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const data: any = {}
    for (const k of ['name', 'description', 'status', 'priority']) {
      if (typeof body?.[k] === 'string') data[k] = body[k]
    }
    if (body?.dueDate) data.dueDate = new Date(body.dueDate)
    if (body?.clientId) data.clientId = body.clientId
    if (data.status === 'completed') data.completedAt = new Date()
    if (data.status === 'active' && !body?.startedAt) data.startedAt = new Date()

    const project = await db.projectRecord.update({ where: { id }, data })
    return NextResponse.json({ project })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update project'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    await db.projectRecord.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete project'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
