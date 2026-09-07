import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/templates/custom
// Body: { name, category?, description?, projectId, pageId? }
// Saves the current project's home page (or the specified page) as a reusable
// template. This powers the "+" in the Templates view — turn any project into
// a template for future use.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const category = typeof body?.category === 'string' && body.category.trim() ? body.category.trim().toLowerCase() : 'custom'
    const description = typeof body?.description === 'string' ? body.description.trim() : ''
    const projectId = typeof body?.projectId === 'string' ? body.projectId : null
    const pageId = typeof body?.pageId === 'string' ? body.pageId : null

    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })
    if (name.length > 80) return NextResponse.json({ error: 'name is too long (max 80)' }, { status: 400 })
    if (!projectId) return NextResponse.json({ error: 'projectId is required' }, { status: 400 })

    const project = await db.project.findUnique({ where: { id: projectId } })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    // Find the page to copy blocks from — prefer the specified page, else the home page
    let page = pageId
      ? await db.page.findUnique({ where: { id: pageId } })
      : await db.page.findFirst({ where: { projectId, isHome: true } })
    if (!page) page = await db.page.findFirst({ where: { projectId } })
    if (!page) return NextResponse.json({ error: 'Project has no pages to template' }, { status: 400 })

    // Check for duplicate template names
    const existing = await db.template.findFirst({ where: { name } })
    if (existing) {
      return NextResponse.json({ error: 'A template with that name already exists' }, { status: 409 })
    }

    const template = await db.template.create({
      data: {
        name,
        category,
        description: description || `Custom template from project: ${project.name}`,
        thumbnail: null,
        blocks: page.blocks, // already a JSON string
        isPublic: true,
      },
    })

    try {
      await db.activityLog.create({
        data: {
          projectId,
          action: 'template.custom.create',
          detail: `Saved template "${name}" from project "${project.name}"`,
        },
      })
    } catch {}

    return NextResponse.json({
      ok: true,
      template: { id: template.id, name: template.name, category: template.category },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create template'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
