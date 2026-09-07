import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { buildExportHtml, type ExportBlock } from '../../_lib/export-blocks'

type Params = { params: Promise<{ id: string }> }

function parseBlocks(raw: string | null): ExportBlock[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as ExportBlock[]) : []
  } catch {
    return []
  }
}

// GET /api/export/[id] → { html } containing a full standalone HTML document
// exporting the project's published home page (or the latest home page blocks).
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const project = await db.project.findUnique({ where: { id } })
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Prefer the published home page; fall back to the latest home page.
    const home = await db.page.findFirst({
      where: { projectId: id, isHome: true },
      orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
    })

    if (!home) {
      return NextResponse.json({ error: 'No home page found' }, { status: 404 })
    }

    const blocks = parseBlocks(home.blocks)
    const title = home.metaTitle || project.name || 'Exported page'
    const description = home.metaDesc ?? project.description ?? null

    const html = buildExportHtml({ title, description, blocks })
    return NextResponse.json({ html })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to export project'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
