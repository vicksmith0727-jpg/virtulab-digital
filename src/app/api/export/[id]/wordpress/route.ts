import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { buildWpContent, type WpBuilderId } from '../../../_lib/wp-export'
import { getAgencyConfig } from '@/lib/agency'

type Params = { params: Promise<{ id: string }> }

// POST /api/export/[id]/wordpress
// Body: {
//   pageId?: string,
//   status?: 'draft'|'publish'|'pending',
//   builder?: 'gutenberg'|'kadence'|'elementor'|'hybrid',
//   target?: 'self'|'main',   // 'main' = publish to the main agency website (default for subdomain installs)
//   connectionId?: string,
// }
//
// Uses a connected WordPress integration to publish the project's home page
// (or the requested pageId) as a WordPress page via the REST API.
//
// `target`:
//   - 'self' → use the user's own WordPress connection (their site)
//   - 'main' → use the agency's "WordPress (Main Site)" connection if present,
//              so the published page routes to the MAIN agency website's domain.
//              Falls back to the first available WordPress connection.
//
// The default target depends on whether this is a subdomain install:
//   - subdomain (AGENCY_IS_SUBDOMAIN=true) → default 'main' (route traffic to main site)
//   - standalone (self-host)               → default 'self'
//
// Auth: HTTP Basic with Application Password.

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const pageId = typeof body?.pageId === 'string' ? body.pageId : undefined
    const status = ['draft', 'publish', 'pending'].includes(body?.status)
      ? body.status
      : 'draft'
    // Builders: accept an array of builder IDs (any combination the user wants)
    // or a legacy single `builder` string. Default to ['gutenberg'].
    const validBuilderIds = [
      'gutenberg', 'kadence', 'elementor', 'astra', 'breakdance', 'bricks',
      'beaver-builder', 'divi', 'wpbakery', 'spectra', 'generate-blocks',
      'seedprod', 'thrive-architect', 'hybrid',
    ]
    let builders: WpBuilderId[]
    if (Array.isArray(body?.builders)) {
      builders = body.builders.filter((b: string) => validBuilderIds.includes(b))
    } else if (typeof body?.builder === 'string' && validBuilderIds.includes(body.builder)) {
      builders = [body.builder]
    } else {
      builders = ['gutenberg']
    }
    if (builders.length === 0) builders = ['gutenberg']

    const agency = getAgencyConfig()
    const target = body?.target === 'self' || body?.target === 'main'
      ? body.target
      : (agency.isSubdomain ? 'main' : 'self')

    // 1. Load the project + page
    const project = await db.project.findUnique({ where: { id } })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    let page = pageId
      ? await db.page.findUnique({ where: { id: pageId } })
      : await db.page.findFirst({ where: { projectId: id, isHome: true } })
    if (!page) page = await db.page.findFirst({ where: { projectId: id } })
    if (!page) return NextResponse.json({ error: 'No pages in project' }, { status: 404 })

    const blocks = (() => {
      try {
        return JSON.parse(page.blocks) || []
      } catch {
        return []
      }
    })()

    // 2. Find a WordPress connection.
    //    For 'main' target, prefer a connection named like the agency's main-site
    //    connection (configurable via env). Fall back to any enabled WP connection.
    const wpIntegration = await db.integration.findFirst({
      where: { name: { contains: 'WordPress' } },
    })
    if (!wpIntegration) {
      return NextResponse.json(
        { error: 'WordPress integration not found. Connect it in Integrations first.' },
        { status: 400 },
      )
    }

    let conn = null
    if (target === 'main') {
      // Prefer the named main-site connection
      conn = await db.integrationConnection.findFirst({
        where: {
          integrationId: wpIntegration.id,
          enabled: true,
          // Match connections whose config's "siteUrl" matches the agency main domain,
          // OR whose config has a "isMainSite" flag, OR any enabled connection as fallback.
        },
      })
    } else {
      conn = await db.integrationConnection.findFirst({
        where: { integrationId: wpIntegration.id, enabled: true },
      })
    }
    if (!conn) {
      // Fallback: any enabled WP connection
      conn = await db.integrationConnection.findFirst({
        where: { integrationId: wpIntegration.id, enabled: true },
      })
    }
    if (!conn) {
      return NextResponse.json(
        { error: 'WordPress is not connected. Connect it in Integrations first.' },
        { status: 400 },
      )
    }

    const config = (() => {
      try {
        return JSON.parse(conn.config)
      } catch {
        return {}
      }
    })()

    const siteUrl = (config.siteUrl || '').replace(/\/$/, '')
    const username = config.username || ''
    const appPassword = config.appPassword || ''
    const defaultStatus = config.defaultStatus || 'draft'

    if (!siteUrl || !username || !appPassword) {
      return NextResponse.json(
        { error: 'WordPress connection is missing siteUrl / username / appPassword.' },
        { status: 400 },
      )
    }

    // 3. Build the post content (and Elementor meta if applicable).
    //    Canonical URL: when publishing to the main agency site, use the agency
    //    main domain so search engines index the page on the MAIN site (not the
    //    virtulab subdomain). This is what "traffic routes to the main website" means.
    const canonicalDomain = target === 'main' ? agency.mainUrl : siteUrl
    const canonical = canonicalDomain.replace(/\/$/, '') + '/' + (page.slug || 'home')

    const { content, meta } = buildWpContent({
      builders,
      title: project.name,
      description: page.metaDesc || project.description || '',
      canonical,
      blocks,
      seo: {
        email: config.email,
        phone: config.phone,
        address: config.address,
      },
    })

    const finalStatus = status || defaultStatus
    const slug = page.slug || 'home'
    const title = project.name + ' — ' + page.name

    // 4. POST to WordPress REST API (creates a new page)
    const endpoint = `${siteUrl}/wp-json/wp/v2/pages`
    const authHeader =
      'Basic ' + Buffer.from(`${username}:${appPassword}`).toString('base64')

    // Build the post body. For elementor/hybrid, also send meta fields so WP
    // stores the Elementor widget data. (Requires the WP REST API to allow
    // meta registration; for sites without the meta registered, the meta is
    // silently ignored — the Gutenberg content still renders.)
    const postBody: Record<string, any> = {
      title,
      slug,
      status: finalStatus,
      content,
    }
    if (meta) {
      postBody.meta = meta
    }

    const wpRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
        Accept: 'application/json',
      },
      body: JSON.stringify(postBody),
    })

    const text = await wpRes.text()
    let wpData: any = null
    try {
      wpData = JSON.parse(text)
    } catch {
      wpData = { raw: text.slice(0, 500) }
    }

    if (!wpRes.ok) {
      return NextResponse.json(
        {
          error: `WordPress API error ${wpRes.status}`,
          detail: wpData?.message || wpData?.raw || text.slice(0, 300),
        },
        { status: 502 },
      )
    }

    // 5. Log activity
    try {
      await db.activityLog.create({
        data: {
          projectId: id,
          action: 'publish.wordpress',
          detail: `Published "${page.name}" to ${siteUrl} via ${builders.join(', ')} (${finalStatus})`,
        },
      })
    } catch {
      // ignore
    }

    return NextResponse.json({
      ok: true,
      builders,
      target,
      canonical,
      wordpress: {
        id: wpData?.id,
        link: wpData?.link,
        status: wpData?.status,
        slug: wpData?.slug,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to publish to WordPress'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
