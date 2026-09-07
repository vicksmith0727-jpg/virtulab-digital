import { NextResponse } from 'next/server'
import { getAgencyConfig } from '@/lib/agency'

// GET /robots.txt
// Points at the main agency website's sitemap so crawlers index the main site.
export async function GET() {
  const cfg = getAgencyConfig()
  const main = cfg.mainUrl.replace(/\/$/, '')
  const body = `User-agent: *
Allow: /

# VirtuaLab Digital builder — index the landing, not the app shell.
Disallow: /api/
Allow: /$

Sitemap: ${main}/sitemap.xml
`
  return new NextResponse(body, {
    headers: { 'Content-Type': 'text/plain' },
  })
}
