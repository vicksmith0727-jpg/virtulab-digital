import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { parseBlocks } from '../../../_lib/templates'

type Params = { params: Promise<{ id: string }> }

// POST /api/projects/[id]/apply-template body { templateId }
// Copy template blocks into the project's home page (or create a new page named after the template).
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const templateId = typeof body?.templateId === 'string' ? body.templateId : null
    if (!templateId) {
      return NextResponse.json({ error: 'templateId is required' }, { status: 400 })
    }

    const template = await db.template.findUnique({ where: { id: templateId } })
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const project = await db.project.findUnique({ where: { id } })
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const blocksJson = template.blocks // already a JSON string
    // Try to update the home page first
    let page = await db.page.findFirst({ where: { projectId: id, isHome: true } })

    if (page) {
      page = await db.page.update({
        where: { id: page.id },
        data: { blocks: blocksJson },
      })
    } else {
      // Create a new page named after the template (slug from template name)
      const slug = template.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40)
      page = await db.page.create({
        data: {
          projectId: id,
          name: template.name,
          slug: slug || 'template',
          isHome: false,
          blocks: blocksJson,
          metaTitle: template.name,
          metaDesc: template.description ?? null,
        },
      })
    }

    await db.activityLog.create({
      data: {
        projectId: id,
        action: 'template.apply',
        detail: `Applied template "${template.name}" to page "${page.name}"`,
      },
    })

    return NextResponse.json({ page: { ...page, blocks: parseBlocks(page.blocks) } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to apply template'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
