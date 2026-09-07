import { NextResponse } from 'next/server'
import { getAgencyConfig } from '@/lib/agency'

// GET /sitemap.xml
// Points at the MAIN agency website's domain (not the virtulab subdomain) so
// search engines index the published pages on the main site. The builder
// itself is a tool, not a content site, so the sitemap just references the
// main agency homepage + the builder landing.
export async function GET() {
  const cfg = getAgencyConfig()
  const main = cfg.mainUrl.replace(/\/$/, '')
  const builder = `${main}/${cfg.subdomainLabel}` // e.g. https://virtulab.agency/builder
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${main}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${builder}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
</urlset>`
  return new NextResponse(body, {
    headers: { 'Content-Type': 'application/xml' },
  })
}
