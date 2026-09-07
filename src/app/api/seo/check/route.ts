import { NextRequest, NextResponse } from 'next/server'
import { runSeoAudit, type SeoAuditResult } from '@/lib/seo-engine'

// POST /api/seo/check
// Body: { tool: string, url: string }
//
// Runs ONE focused SEO check against a URL and returns just that result.
// This powers the individual SEO tools (Broken Link Checker, Redirect Checker,
// Heading Structure Analyzer, etc.) without needing a separate route per tool.
//
// Available tools: broken-links, redirects, headings, images-alt, internal-links,
// canonical, page-speed, mobile-friendly, keyword-density, readability,
// robots-txt, sitemap-validator, schema-validator, hreflang, title-optimizer,
// meta-desc, duplicate-content.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const tool = typeof body?.tool === 'string' ? body.tool : ''
    const url = typeof body?.url === 'string' ? body.url.trim() : ''

    if (!url) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 })
    }
    if (!/^https?:\/\//i.test(url)) {
      return NextResponse.json({ error: 'URL must start with http:// or https://' }, { status: 400 })
    }

    const audit = await runSeoAudit(url)
    const result = await extractFocusedResult(tool, audit, url)
    return NextResponse.json({ ok: true, tool, url, result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'SEO check failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function extractFocusedResult(tool: string, audit: SeoAuditResult, url: string): Promise<any> {
  switch (tool) {
    case 'broken-links': {
      const broken = audit.links.filter((l) => l.status === 0 || (l.status && l.status >= 400))
      return { totalChecked: audit.links.length, brokenCount: broken.length, broken, ok: broken.length === 0 }
    }
    case 'redirects': {
      const redirected = audit.links.filter((l) => l.status && l.status >= 300 && l.status < 400)
      const broken = audit.links.filter((l) => l.status === 0 || (l.status && l.status >= 400))
      return { totalChecked: audit.links.length, redirectedCount: redirected.length, brokenCount: broken.length, redirected, broken }
    }
    case 'headings': {
      const h1Count = audit.headings.h1.length
      const allHeadings = [
        ...audit.headings.h1.map((t, i) => ({ level: 1, text: t, order: i })),
        ...audit.headings.h2.map((t, i) => ({ level: 2, text: t, order: i + 100 })),
        ...audit.headings.h3.map((t, i) => ({ level: 3, text: t, order: i + 200 })),
      ]
      const issues: string[] = []
      if (h1Count === 0) issues.push('No H1 tag found — every page should have exactly one H1.')
      if (h1Count > 1) issues.push(`${h1Count} H1 tags found — should be exactly 1.`)
      if (audit.headings.h2.length === 0) issues.push('No H2 tags — add section subheadings for structure.')
      return { h1Count, h2Count: audit.headings.h2.length, h3Count: audit.headings.h3.length, headings: allHeadings, issues, ok: issues.length === 0 }
    }
    case 'images-alt': {
      const missingAlt = audit.images.filter((i) => !i.alt && i.src)
      return { totalImages: audit.images.length, missingAltCount: missingAlt.length, missingAlt, ok: missingAlt.length === 0 }
    }
    case 'internal-links': {
      const internal = audit.links.filter((l) => l.internal)
      const external = audit.links.filter((l) => !l.internal)
      return { totalLinks: audit.links.length, internalCount: internal.length, externalCount: external.length, internal, external: external.slice(0, 20), ok: internal.length > 0 }
    }
    case 'canonical': {
      return { canonical: audit.meta.canonical, present: Boolean(audit.meta.canonical), ok: Boolean(audit.meta.canonical) }
    }
    case 'page-speed': {
      return {
        ttfbMs: audit.ttfbMs,
        totalTimeMs: audit.totalTimeMs,
        htmlSizeKb: audit.htmlSizeKb,
        imageCount: audit.images.length,
        grade: audit.ttfbMs < 800 ? 'good' : audit.ttfbMs < 2000 ? 'needs-improvement' : 'poor',
      }
    }
    case 'mobile-friendly': {
      const hasViewport = Boolean(audit.meta.viewport)
      const issues: string[] = []
      if (!hasViewport) issues.push('No viewport meta tag — page is not mobile-friendly.')
      if (audit.htmlSizeKb > 500) issues.push('Large HTML payload — slow on mobile data.')
      return { hasViewport, viewport: audit.meta.viewport, htmlSizeKb: audit.htmlSizeKb, lang: audit.meta.lang, issues, ok: hasViewport }
    }
    case 'keyword-density': {
      const text = [audit.meta.title, audit.meta.description, ...audit.headings.h1, ...audit.headings.h2, ...audit.headings.h3].filter(Boolean).join(' ')
      const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || []
      const freq: Record<string, number> = {}
      for (const w of words) freq[w] = (freq[w] || 0) + 1
      const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([word, count]) => ({ word, count, density: ((count / words.length) * 100).toFixed(1) + '%' }))
      return { totalWords: words.length, topKeywords: top }
    }
    case 'readability': {
      const text = [...audit.headings.h1, ...audit.headings.h2, ...audit.headings.h3].join(' ')
      const words = text.split(/\s+/).filter(Boolean)
      const sentences = text.split(/[.!?]+/).filter(Boolean)
      const avgWordsPerSentence = sentences.length ? words.length / sentences.length : 0
      const readingLevel = avgWordsPerSentence < 10 ? 'Easy' : avgWordsPerSentence < 20 ? 'Medium' : 'Hard'
      return { wordCount: words.length, sentenceCount: sentences.length, avgWordsPerSentence: Math.round(avgWordsPerSentence), readingLevel }
    }
    case 'robots-txt': {
      const robotsUrl = new URL('/robots.txt', url).toString()
      try {
        const res = await fetch(robotsUrl, { signal: AbortSignal.timeout(8000) })
        const content = await res.text()
        return { found: true, status: res.status, content: content.slice(0, 2000), hasSitemap: /sitemap:/i.test(content), hasUserAgent: /user-agent:/i.test(content), hasDisallow: /disallow:/i.test(content), ok: res.ok }
      } catch {
        return { found: false, ok: false, message: 'No robots.txt found at ' + robotsUrl }
      }
    }
    case 'sitemap-validator': {
      const sitemapUrl = new URL('/sitemap.xml', url).toString()
      try {
        const res = await fetch(sitemapUrl, { signal: AbortSignal.timeout(8000) })
        const content = await res.text()
        const isXml = content.trim().startsWith('<?xml')
        const urlCount = (content.match(/<url>/g) || []).length
        return { found: true, status: res.status, isValidXml: isXml, urlCount, ok: isXml && urlCount > 0 }
      } catch {
        return { found: false, ok: false, message: 'No sitemap.xml found at ' + sitemapUrl }
      }
    }
    case 'schema-validator': {
      return { schemaCount: audit.schema.length, schemas: audit.schema, ok: audit.schema.length > 0, types: audit.schema.map((s) => s['@type']).filter(Boolean) }
    }
    case 'hreflang': {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
        const html = await res.text()
        const hreflangs = Array.from(html.matchAll(/<link[^>]+rel\s*=\s*["']alternate["'][^>]+hreflang\s*=\s*["']([^"']+)["'][^>]*>/gi)).map((m) => m[1])
        return { count: hreflangs.length, hreflangs, ok: hreflangs.length > 0 }
      } catch {
        return { count: 0, ok: false, message: 'Could not fetch page for hreflang check' }
      }
    }
    case 'title-optimizer': {
      const title = audit.meta.title
      const len = audit.meta.titleLength || 0
      const issues: string[] = []
      if (!title) issues.push('No title tag.')
      if (len < 10) issues.push('Title too short (under 10 chars).')
      if (len > 60) issues.push('Title too long (over 60 chars) — will be truncated in SERP.')
      return { title, length: len, issues, serpPreview: title ? title.slice(0, 60) : '', ok: issues.length === 0 }
    }
    case 'meta-desc': {
      const desc = audit.meta.description
      const len = audit.meta.descriptionLength || 0
      const issues: string[] = []
      if (!desc) issues.push('No meta description.')
      if (len < 50) issues.push('Description too short (under 50 chars).')
      if (len > 160) issues.push('Description too long (over 160 chars) — will be truncated in SERP.')
      return { description: desc, length: len, issues, serpPreview: desc ? desc.slice(0, 160) : '', ok: issues.length === 0 }
    }
    case 'duplicate-content': {
      const title = audit.meta.title
      const desc = audit.meta.description
      const h1 = audit.headings.h1[0]
      const duplicates: string[] = []
      if (title && h1 && title.trim().toLowerCase() === h1.trim().toLowerCase()) duplicates.push('Title and H1 are identical — they should differ.')
      if (title && desc && title.trim().toLowerCase() === desc.trim().toLowerCase()) duplicates.push('Title and meta description are identical.')
      return { title, h1, description: desc, duplicates, ok: duplicates.length === 0 }
    }
    default:
      return { error: `Unknown tool: ${tool}` }
  }
}
