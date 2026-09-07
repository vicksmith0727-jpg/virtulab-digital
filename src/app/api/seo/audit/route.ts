import { NextRequest, NextResponse } from 'next/server'
import { runSeoAudit } from '@/lib/seo-engine'
import { db } from '@/lib/db'

// POST /api/seo/audit
// Body: { url?: string, projectId?: string }
//
// Runs a full built-in SEO audit (no external service needed). Either pass a
// raw URL, or pass a projectId to audit the project's published/exported home
// page (uses the project's first page's slug, or the canonical from the agency
// config).
//
// Returns the full SeoAuditResult — the frontend renders the checks, scores,
// meta, headings, images, broken links, schema, and local SEO in the SEO
// Tools panel.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    let url = typeof body?.url === 'string' ? body.url.trim() : ''

    // If a projectId is provided, derive the URL from the project + agency config.
    if (!url && typeof body?.projectId === 'string') {
      const project = await db.project.findUnique({ where: { id: body.projectId } })
      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }
      const page = await db.page.findFirst({
        where: { projectId: project.id, isHome: true },
      })
      // Use the agency main URL + slug for subdomain installs
      const { getAgencyConfig } = await import('@/lib/agency')
      const agency = getAgencyConfig()
      const slug = page?.slug || 'home'
      url = `${agency.mainUrl.replace(/\/$/, '')}/${slug === 'home' ? '' : slug}`
    }

    if (!url) {
      return NextResponse.json({ error: 'url or projectId is required' }, { status: 400 })
    }

    const result = await runSeoAudit(url)

    // Log activity
    try {
      await db.activityLog.create({
        data: {
          projectId: typeof body?.projectId === 'string' ? body.projectId : null,
          action: 'seo.audit',
          detail: `Audited ${url} — score ${result.overallScore} (${result.grade})`,
        },
      })
    } catch {}

    return NextResponse.json({ ok: true, result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'SEO audit failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
