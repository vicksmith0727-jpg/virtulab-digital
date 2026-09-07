import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateSitemap } from '@/lib/seo-engine'
import { getAgencyConfig } from '@/lib/agency'

// GET /api/seo/sitemap-check?projectId=X
// Generates a sitemap.xml for the project's pages (built-in) and returns it.
// Also returns a list of the page URLs so the UI can show them.
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const projectId = url.searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'projectId query param is required' }, { status: 400 })
    }

    const project = await db.project.findUnique({ where: { id: projectId } })
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const pages = await db.page.findMany({
      where: { projectId },
      orderBy: { updatedAt: 'desc' },
    })

    const agency = getAgencyConfig()
    const domain = agency.isSubdomain ? agency.mainUrl : agency.mainUrl
    const sitemap = generateSitemap(
      pages.map((p) => ({ slug: p.slug, updatedAt: p.updatedAt })),
      domain,
    )

    return NextResponse.json({
      ok: true,
      domain,
      pageCount: pages.length,
      pages: pages.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        updatedAt: p.updatedAt,
      })),
      sitemap,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate sitemap'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
