import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type Params = { params: Promise<{ id: string }> }

// GET /api/projects/[id] → project + pages (no blocks)
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const project = await db.project.findUnique({ where: { id } })
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    const pages = await db.page.findMany({
      where: { projectId: id },
      select: {
        id: true,
        name: true,
        slug: true,
        isHome: true,
        metaTitle: true,
        metaDesc: true,
        publishedAt: true,
        updatedAt: true,
        createdAt: true,
      },
      orderBy: [{ isHome: 'desc' }, { createdAt: 'asc' }],
    })
    return NextResponse.json({ project, pages })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch project'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PATCH /api/projects/[id]
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))

    const data: Record<string, unknown> = {}
    if (typeof body?.name === 'string' && body.name.trim()) data.name = body.name.trim()
    if (typeof body?.subdomain === 'string') data.subdomain = body.subdomain.trim() || null
    if (typeof body?.description === 'string') data.description = body.description.trim() || null
    if (typeof body?.status === 'string' && ['draft', 'published'].includes(body.status)) {
      data.status = body.status
    }

    const project = await db.project.update({
      where: { id },
      data,
    })

    await db.activityLog.create({
      data: {
        projectId: id,
        action: 'project.update',
        detail: `Updated project "${project.name}"`,
      },
    })

    return NextResponse.json({ project })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update project'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE /api/projects/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    await db.project.delete({ where: { id } })
    await db.activityLog.create({
      data: {
        projectId: null,
        action: 'project.delete',
        detail: `Deleted project ${id}`,
      },
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete project'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
