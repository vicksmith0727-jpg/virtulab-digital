import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { DEMO_PAGE_BLOCKS } from '@/lib/seed'

function parseBlocks(raw: string | null | undefined): unknown[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// GET /api/projects — all projects, newest first
export async function GET() {
  try {
    const projects = await db.project.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { pages: { select: { id: true, name: true, slug: true, isHome: true } } },
    })
    return NextResponse.json({ projects })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch projects'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/projects — create project + default home page
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const name = typeof body?.name === 'string' && body.name.trim() ? body.name.trim() : 'Untitled project'
    const subdomain = typeof body?.subdomain === 'string' ? body.subdomain.trim() : null
    const description = typeof body?.description === 'string' ? body.description.trim() : null

    // Ensure a user exists (single-tenant demo). Create one if none.
    let user = await db.user.findFirst()
    if (!user) {
      user = await db.user.create({
        data: {
          email: 'demo@virtulab.local',
          name: 'VirtuaLab Digital Demo',
          plan: 'grove',
        },
      })
    }

    const project = await db.project.create({
      data: {
        name,
        subdomain: subdomain || undefined,
        description: description || undefined,
        userId: user.id,
      },
    })

    const page = await db.page.create({
      data: {
        projectId: project.id,
        name: 'Home',
        slug: 'home',
        isHome: true,
        blocks: JSON.stringify(DEMO_PAGE_BLOCKS),
        metaTitle: project.name,
        metaDesc: description ?? undefined,
      },
    })

    await db.activityLog.create({
      data: {
        projectId: project.id,
        action: 'project.create',
        detail: `Created project "${project.name}"`,
      },
    })

    return NextResponse.json({
      project,
      page: { ...page, blocks: parseBlocks(page.blocks) },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create project'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
