import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type Params = { params: Promise<{ id: string; pageId: string }> }

function parseBlocks(raw: string | null | undefined): unknown[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// GET /api/projects/[id]/pages/[pageId]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id, pageId } = await params
    const page = await db.page.findFirst({ where: { id: pageId, projectId: id } })
    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }
    return NextResponse.json({ page: { ...page, blocks: parseBlocks(page.blocks) } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch page'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PATCH /api/projects/[id]/pages/[pageId]
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id, pageId } = await params
    const body = await req.json().catch(() => ({}))

    const data: Record<string, unknown> = {}
    if (typeof body?.name === 'string' && body.name.trim()) data.name = body.name.trim()
    if (typeof body?.slug === 'string' && body.slug.trim()) data.slug = body.slug.trim()
    if (Array.isArray(body?.blocks)) data.blocks = JSON.stringify(body.blocks)
    if (typeof body?.isHome === 'boolean') data.isHome = body.isHome
    if (typeof body?.metaTitle === 'string') data.metaTitle = body.metaTitle || null
    if (typeof body?.metaDesc === 'string') data.metaDesc = body.metaDesc || null
    if (body?.publishedAt !== undefined) {
      data.publishedAt = body.publishedAt ? new Date(body.publishedAt) : null
    }

    const page = await db.page.update({ where: { id: pageId }, data })
    await db.activityLog.create({
      data: {
        projectId: id,
        action: 'page.update',
        detail: `Updated page "${page.name}"`,
      },
    })

    return NextResponse.json({ page: { ...page, blocks: parseBlocks(page.blocks) } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update page'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
