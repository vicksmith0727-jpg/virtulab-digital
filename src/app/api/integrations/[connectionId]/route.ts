import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type Params = { params: Promise<{ connectionId: string }> }

// PATCH /api/integrations/[connectionId] body { enabled?, config? }
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { connectionId } = await params
    const body = await req.json().catch(() => ({}))

    const data: Record<string, unknown> = {}
    if (typeof body?.enabled === 'boolean') data.enabled = body.enabled
    if (body?.config && typeof body.config === 'object') data.config = JSON.stringify(body.config)

    const connection = await db.integrationConnection.update({
      where: { id: connectionId },
      data,
    })

    return NextResponse.json({ connection })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update connection'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE /api/integrations/[connectionId]
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { connectionId } = await params
    await db.integrationConnection.delete({ where: { id: connectionId } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete connection'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
