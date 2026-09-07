import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/pm/tasks?status=X&projectRecordId=Y
// POST /api/pm/tasks  body { title, description?, status?, priority?, dueDate?, projectRecordId?, clientId?, assignee? }
// PATCH /api/pm/tasks  body { id, status?, priority?, ... }
// DELETE /api/pm/tasks?id=X

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const status = url.searchParams.get('status')
    const projectRecordId = url.searchParams.get('projectRecordId')

    const tasks = await db.task.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(projectRecordId ? { projectRecordId } : {}),
      },
      orderBy: [{ completedAt: 'asc' }, { createdAt: 'desc' }],
    })
    return NextResponse.json({ tasks })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch tasks'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const title = typeof body?.title === 'string' ? body.title.trim() : ''
    if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 })

    const task = await db.task.create({
      data: {
        title,
        description: typeof body?.description === 'string' ? body.description : null,
        status: typeof body?.status === 'string' ? body.status : 'todo',
        priority: typeof body?.priority === 'string' ? body.priority : 'medium',
        dueDate: body?.dueDate ? new Date(body.dueDate) : null,
        projectRecordId: typeof body?.projectRecordId === 'string' ? body.projectRecordId : null,
        clientId: typeof body?.clientId === 'string' ? body.clientId : null,
        assignee: typeof body?.assignee === 'string' ? body.assignee : null,
      },
    })
    return NextResponse.json({ task })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create task'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const id = typeof body?.id === 'string' ? body.id : ''
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const data: any = {}
    if (typeof body?.status === 'string') {
      data.status = body.status
      data.completedAt = body.status === 'done' ? new Date() : null
    }
    if (typeof body?.priority === 'string') data.priority = body.priority
    if (typeof body?.title === 'string') data.title = body.title
    if (typeof body?.description === 'string') data.description = body.description
    if (typeof body?.assignee === 'string') data.assignee = body.assignee
    if (body?.dueDate) data.dueDate = new Date(body.dueDate)

    const task = await db.task.update({ where: { id }, data })
    return NextResponse.json({ task })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update task'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    await db.task.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete task'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
