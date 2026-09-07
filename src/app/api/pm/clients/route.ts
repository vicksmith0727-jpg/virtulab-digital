import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/pm/clients
// POST /api/pm/clients body { name, email?, phone?, company?, notes?, status? }
// PATCH /api/pm/clients body { id, name?, email?, phone?, company?, notes?, status? }
// DELETE /api/pm/clients?id=X

export async function GET() {
  try {
    const clients = await db.client.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { projects: true, tasks: true } },
      },
    })
    return NextResponse.json({ clients })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch clients'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

    const client = await db.client.create({
      data: {
        name,
        email: typeof body?.email === 'string' ? body.email : null,
        phone: typeof body?.phone === 'string' ? body.phone : null,
        company: typeof body?.company === 'string' ? body.company : null,
        notes: typeof body?.notes === 'string' ? body.notes : null,
        status: typeof body?.status === 'string' ? body.status : 'active',
      },
    })
    return NextResponse.json({ client })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create client'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const id = typeof body?.id === 'string' ? body.id : ''
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const data: any = {}
    for (const k of ['name', 'email', 'phone', 'company', 'notes', 'status']) {
      if (typeof body?.[k] === 'string') data[k] = body[k]
    }

    const client = await db.client.update({ where: { id }, data })
    return NextResponse.json({ client })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update client'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    await db.client.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete client'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
