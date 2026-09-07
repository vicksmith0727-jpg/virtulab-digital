import { NextRequest, NextResponse } from 'next/server'
import { runSeoAudit } from '@/lib/seo-engine'

// POST /api/seo/meta-check
// Body: { url }
// Lighter than /audit — just fetches the URL and returns the extracted meta
// tags + OpenGraph + Twitter card. Used for the "Meta tag preview" tool.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const url = typeof body?.url === 'string' ? body.url.trim() : ''

    if (!url) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 })
    }

    // Run the full audit but return only the meta + openGraph portion
    const result = await runSeoAudit(url)
    return NextResponse.json({
      ok: true,
      url: result.url,
      httpStatus: result.httpStatus,
      meta: result.meta,
      headings: result.headings,
      schema: result.schema,
      openGraph: result.openGraph,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Meta check failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
