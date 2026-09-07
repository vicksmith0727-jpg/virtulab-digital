// Built-in SEO audit engine — no external service required.
// Inspired by open-source tools (Open SEO, Seonaut) but runs directly inside
// VirtuaLab Digital. Fetches a URL, parses the HTML, and runs a battery of
// SEO + performance + local-SEO checks. Everything returns structured results
// the frontend renders in the SEO Tools panel.
//
// This is the "API to make them work" the user asked for: the SEO tools are
// BUILT IN, not integration cards.

export type SeoCheckStatus = 'pass' | 'warn' | 'fail' | 'info'

export type SeoCheck = {
  id: string
  title: string
  status: SeoCheckStatus
  message: string
  detail?: string
  // 0–100 score for this individual check
  score: number
}

export type SeoAuditResult = {
  url: string
  fetchedAt: string
  httpStatus: number
  ttfbMs: number
  totalTimeMs: number
  htmlSizeKb: number
  overallScore: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  checks: SeoCheck[]
  // Raw extracted data for the UI to render
  meta: {
    title?: string
    titleLength?: number
    description?: string
    descriptionLength?: number
    canonical?: string
    ogTitle?: string
    ogDescription?: string
    ogImage?: string
    twitterCard?: string
    twitterTitle?: string
    twitterDescription?: string
    viewport?: string
    charset?: string
    robots?: string
    lang?: string
  }
  headings: { h1: string[]; h2: string[]; h3: string[] }
  images: { src: string; alt: string | null; hasLazy: boolean }[]
  links: { href: string; text: string; internal: boolean; status?: number }[]
  schema: any[]
  openGraph: Record<string, string>
  localSeo: {
    hasNAP: boolean
    hasLocalBusinessSchema: boolean
    detectedPhone?: string
    detectedAddress?: string
  }
}

const TIMEOUT_MS = 15000

async function fetchWithTiming(url: string): Promise<{
  html: string
  status: number
  ttfbMs: number
  totalTimeMs: number
}> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  const start = Date.now()
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'VirtuaLabDigital-SEOBot/1.0 (+https://virtulab.agency)',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    })
    const ttfb = Date.now() - start
    const html = await res.text()
    const total = Date.now() - start
    clearTimeout(timer)
    return { html, status: res.status, ttfbMs: ttfb, totalTimeMs: total }
  } finally {
    clearTimeout(timer)
  }
}

// Extract <meta> tags by name or property.
function getMeta(html: string, key: string, attr: 'name' | 'property' = 'name'): string | undefined {
  const re = new RegExp(`<meta[^>]+${attr}\\s*=\\s*["']${key}["'][^>]*>`, 'gi')
  const m = re.exec(html)
  if (!m) return undefined
  const contentMatch = m[0].match(/content\s*=\s*["']([^"']*)["']/i)
  return contentMatch ? contentMatch[1].trim() : undefined
}

function getTitle(html: string): string | undefined {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return m ? m[1].trim() : undefined
}

function getCanonical(html: string): string | undefined {
  const m = html.match(/<link[^>]+rel\s*=\s*["']canonical["'][^>]*>/i)
  if (!m) return undefined
  const href = m[0].match(/href\s*=\s*["']([^"']*)["']/i)
  return href ? href[1].trim() : undefined
}

function getViewport(html: string): string | undefined {
  return getMeta(html, 'viewport')
}

function getHeadings(html: string): { h1: string[]; h2: string[]; h3: string[] } {
  const stripTags = (s: string) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
  const grab = (tag: string) => {
    const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi')
    const out: string[] = []
    let m
    while ((m = re.exec(html)) !== null) out.push(stripTags(m[1]))
    return out
  }
  return { h1: grab('h1'), h2: grab('h2'), h3: grab('h3') }
}

function getImages(html: string): { src: string; alt: string | null; hasLazy: boolean }[] {
  const re = /<img\b[^>]*>/gi
  const out: { src: string; alt: string | null; hasLazy: boolean }[] = []
  let m
  while ((m = re.exec(html)) !== null) {
    const tag = m[0]
    const src = tag.match(/src\s*=\s*["']([^"']*)["']/i)
    const alt = tag.match(/alt\s*=\s*["']([^"']*)["']/i)
    const loading = tag.match(/loading\s*=\s*["']([^"']*)["']/i)
    out.push({
      src: src ? src[1] : '',
      alt: alt ? alt[1] : null,
      hasLazy: loading ? loading[1] === 'lazy' : false,
    })
  }
  return out
}

function getLinks(html: string, baseUrl: string): { href: string; text: string; internal: boolean }[] {
  const re = /<a\b[^>]*href\s*=\s*["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi
  const out: { href: string; text: string; internal: boolean }[] = []
  let m
  const baseHost = (() => {
    try {
      return new URL(baseUrl).hostname
    } catch {
      return ''
    }
  })()
  while ((m = re.exec(html)) !== null) {
    const href = m[1].trim()
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) continue
    const text = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    let internal = false
    try {
      const u = new URL(href, baseUrl)
      internal = u.hostname === baseHost
    } catch {
      internal = href.startsWith('/')
    }
    out.push({ href, text, internal })
  }
  return out
}

function getSchema(html: string): any[] {
  const re = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  const out: any[] = []
  let m
  while ((m = re.exec(html)) !== null) {
    try {
      out.push(JSON.parse(m[1].trim()))
    } catch {
      // skip invalid JSON-LD
    }
  }
  return out
}

function getAllMeta(html: string): Record<string, string> {
  const re = /<meta\b[^>]*>/gi
  const out: Record<string, string> = {}
  let m
  while ((m = re.exec(html)) !== null) {
    const tag = m[0]
    const name = tag.match(/(?:name|property)\s*=\s*["']([^"']*)["']/i)
    const content = tag.match(/content\s*=\s*["']([^"']*)["']/i)
    if (name && content) out[name[1]] = content[1]
  }
  return out
}

function getLang(html: string): string | undefined {
  const m = html.match(/<html[^>]+lang\s*=\s*["']([^"']*)["']/i)
  return m ? m[1] : undefined
}

function getCharset(html: string): string | undefined {
  return getMeta(html, 'charset') || html.match(/<meta[^>]+charset\s*=\s*["']([^"']*)["']/i)?.[1]
}

function getRobotsMeta(html: string): string | undefined {
  return getMeta(html, 'robots')
}

// Check a few internal links for broken-ness (cap at 8 to stay fast).
async function checkLinks(
  links: { href: string; text: string; internal: boolean }[],
  baseUrl: string,
): Promise<{ href: string; text: string; internal: boolean; status?: number }[]> {
  const internal = links.filter((l) => l.internal).slice(0, 8)
  const results = await Promise.all(
    internal.map(async (l) => {
      try {
        const abs = new URL(l.href, baseUrl).toString()
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 8000)
        try {
          const res = await fetch(abs, {
            method: 'HEAD',
            signal: controller.signal,
            headers: { 'User-Agent': 'VirtuaLabDigital-SEOBot/1.0' },
          })
          clearTimeout(timer)
          return { ...l, status: res.status }
        } catch {
          clearTimeout(timer)
          // try GET (some servers reject HEAD)
          const controller2 = new AbortController()
          const timer2 = setTimeout(() => controller2.abort(), 8000)
          try {
            const res2 = await fetch(abs, {
              method: 'GET',
              signal: controller2.signal,
              headers: { 'User-Agent': 'VirtuaLabDigital-SEOBot/1.0' },
            })
            clearTimeout(timer2)
            return { ...l, status: res2.status }
          } catch {
            clearTimeout(timer2)
            return { ...l, status: 0 }
          }
        }
      } catch {
        return { ...l, status: 0 }
      }
    }),
  )
  return results
}

// Main entry: run a full SEO audit against a URL.
export async function runSeoAudit(rawUrl: string): Promise<SeoAuditResult> {
  const url = rawUrl.trim()
  if (!/^https?:\/\//i.test(url)) {
    throw new Error('URL must start with http:// or https://')
  }

  const { html, status, ttfbMs, totalTimeMs } = await fetchWithTiming(url)
  const htmlSizeKb = Math.round((html.length / 1024) * 10) / 10

  const meta = {
    title: getTitle(html),
    titleLength: getTitle(html)?.length,
    description: getMeta(html, 'description'),
    descriptionLength: getMeta(html, 'description')?.length,
    canonical: getCanonical(html),
    viewport: getViewport(html),
    charset: getCharset(html),
    robots: getRobotsMeta(html),
    lang: getLang(html),
    ogTitle: getMeta(html, 'og:title', 'property'),
    ogDescription: getMeta(html, 'og:description', 'property'),
    ogImage: getMeta(html, 'og:image', 'property'),
    twitterCard: getMeta(html, 'twitter:card'),
    twitterTitle: getMeta(html, 'twitter:title'),
    twitterDescription: getMeta(html, 'twitter:description'),
  }

  const headings = getHeadings(html)
  const images = getImages(html)
  const links = getLinks(html, url)
  const schema = getSchema(html)
  const allMeta = getAllMeta(html)

  // Local SEO: detect phone + address in the page text
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
  const phoneMatch = text.match(/(\+?\d[\d\s\-().]{8,}\d)/)
  const addressMatch = text.match(/\d+\s+[A-Z][a-zA-Z\s]+(Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Lane|Ln|Drive|Dr|Way|Court|Ct|Place|Pl|Parkway|Pkwy)\b/i)
  const schemaStr = JSON.stringify(schema)
  const hasLocalBusinessSchema = /LocalBusiness|ProfessionalService|Organization/.test(schemaStr)
  const localSeo = {
    hasNAP: Boolean(phoneMatch && addressMatch),
    hasLocalBusinessSchema,
    detectedPhone: phoneMatch ? phoneMatch[1].trim() : undefined,
    detectedAddress: addressMatch ? addressMatch[0] : undefined,
  }

  // Check a few internal links for broken-ness
  const linkResults = await checkLinks(links, url)

  // ---- Build the checks list ----
  const checks: SeoCheck[] = []

  // Title
  checks.push({
    id: 'title',
    title: 'Title tag',
    status: meta.title && meta.titleLength! >= 10 && meta.titleLength! <= 60 ? 'pass' : meta.title ? 'warn' : 'fail',
    message: meta.title
      ? `Title: "${meta.title}" (${meta.titleLength} chars)`
      : 'No <title> tag found',
    detail: 'Best practice: 10–60 characters. Should be unique per page.',
    score: meta.title ? (meta.titleLength! >= 10 && meta.titleLength! <= 60 ? 100 : 60) : 0,
  })

  // Meta description
  checks.push({
    id: 'description',
    title: 'Meta description',
    status: meta.description && meta.descriptionLength! >= 50 && meta.descriptionLength! <= 160 ? 'pass' : meta.description ? 'warn' : 'fail',
    message: meta.description
      ? `Description: ${meta.descriptionLength} chars`
      : 'No meta description',
    detail: 'Best practice: 50–160 characters. Appears in search results.',
    score: meta.description ? (meta.descriptionLength! >= 50 && meta.descriptionLength! <= 160 ? 100 : 60) : 0,
  })

  // H1
  checks.push({
    id: 'h1',
    title: 'H1 heading',
    status: headings.h1.length === 1 ? 'pass' : headings.h1.length === 0 ? 'fail' : 'warn',
    message: headings.h1.length === 1 ? `H1: "${headings.h1[0]}"` : `${headings.h1.length} H1 tags found (should be exactly 1)`,
    score: headings.h1.length === 1 ? 100 : headings.h1.length === 0 ? 0 : 50,
  })

  // Canonical
  checks.push({
    id: 'canonical',
    title: 'Canonical URL',
    status: meta.canonical ? 'pass' : 'warn',
    message: meta.canonical ? `Canonical: ${meta.canonical}` : 'No canonical link',
    detail: 'Prevents duplicate-content issues. Add <link rel="canonical">.',
    score: meta.canonical ? 100 : 40,
  })

  // OpenGraph
  const ogCount = [meta.ogTitle, meta.ogDescription, meta.ogImage].filter(Boolean).length
  checks.push({
    id: 'opengraph',
    title: 'OpenGraph tags',
    status: ogCount === 3 ? 'pass' : ogCount > 0 ? 'warn' : 'fail',
    message: `${ogCount}/3 OG tags (title, description, image)`,
    detail: 'Controls how the page looks when shared on Facebook/LinkedIn/Slack.',
    score: (ogCount / 3) * 100,
  })

  // Twitter card
  checks.push({
    id: 'twitter',
    title: 'Twitter card',
    status: meta.twitterCard ? 'pass' : 'warn',
    message: meta.twitterCard ? `Card type: ${meta.twitterCard}` : 'No Twitter card meta',
    score: meta.twitterCard ? 100 : 30,
  })

  // Viewport (mobile)
  checks.push({
    id: 'viewport',
    title: 'Mobile viewport',
    status: meta.viewport ? 'pass' : 'fail',
    message: meta.viewport ? 'Viewport meta present' : 'No viewport meta — not mobile-friendly',
    score: meta.viewport ? 100 : 0,
  })

  // Lang
  checks.push({
    id: 'lang',
    title: 'Language attribute',
    status: meta.lang ? 'pass' : 'warn',
    message: meta.lang ? `lang="${meta.lang}"` : 'No <html lang> attribute',
    score: meta.lang ? 100 : 40,
  })

  // Images alt
  const imgsWithoutAlt = images.filter((i) => !i.alt && i.src).length
  checks.push({
    id: 'img-alt',
    title: 'Image alt text',
    status: imgsWithoutAlt === 0 ? 'pass' : imgsWithoutAlt <= images.length / 2 ? 'warn' : 'fail',
    message: `${imgsWithoutAlt}/${images.length} images missing alt text`,
    detail: 'Alt text helps accessibility + image SEO.',
    score: images.length ? Math.round((1 - imgsWithoutAlt / images.length) * 100) : 100,
  })

  // Image lazy-load
  const imgsWithoutLazy = images.filter((i) => !i.hasLazy && i.src).length
  checks.push({
    id: 'img-lazy',
    title: 'Image lazy-load',
    status: imgsWithoutLazy === 0 ? 'pass' : 'warn',
    message: `${images.length - imgsWithoutLazy}/${images.length} images use loading="lazy"`,
    detail: 'Lazy-load speeds up the initial render.',
    score: images.length ? Math.round((1 - imgsWithoutLazy / images.length) * 100) : 100,
  })

  // Schema / JSON-LD
  checks.push({
    id: 'schema',
    title: 'Structured data (JSON-LD)',
    status: schema.length > 0 ? 'pass' : 'warn',
    message: `${schema.length} JSON-LD block(s)`,
    detail: 'Schema helps rich results. Add LocalBusiness for local SEO.',
    score: schema.length > 0 ? 100 : 20,
  })

  // Local SEO
  checks.push({
    id: 'local-seo',
    title: 'Local SEO (NAP + schema)',
    status: localSeo.hasNAP && localSeo.hasLocalBusinessSchema ? 'pass' : localSeo.hasNAP || localSeo.hasLocalBusinessSchema ? 'warn' : 'fail',
    message: `NAP: ${localSeo.hasNAP ? 'detected' : 'missing'}, LocalBusiness schema: ${localSeo.hasLocalBusinessSchema ? 'present' : 'missing'}`,
    detail: localSeo.detectedPhone || localSeo.detectedAddress
      ? `Detected: ${localSeo.detectedPhone || ''} ${localSeo.detectedAddress || ''}`.trim()
      : 'Add your business name, address, phone (NAP) + LocalBusiness schema.',
    score: (localSeo.hasNAP ? 50 : 0) + (localSeo.hasLocalBusinessSchema ? 50 : 0),
  })

  // Broken links
  const broken = linkResults.filter((l) => l.status === 0 || (l.status && l.status >= 400))
  checks.push({
    id: 'broken-links',
    title: 'Broken links',
    status: broken.length === 0 ? 'pass' : broken.length <= 2 ? 'warn' : 'fail',
    message: broken.length === 0 ? `All ${linkResults.length} checked links OK` : `${broken.length} broken link(s) out of ${linkResults.length} checked`,
    detail: broken.length > 0 ? broken.slice(0, 5).map((l) => `• ${l.href} (${l.status || 'no response'})`).join('\n') : undefined,
    score: linkResults.length ? Math.round((1 - broken.length / linkResults.length) * 100) : 100,
  })

  // Page speed (TTFB)
  checks.push({
    id: 'ttfb',
    title: 'Server response (TTFB)',
    status: ttfbMs < 800 ? 'pass' : ttfbMs < 2000 ? 'warn' : 'fail',
    message: `TTFB: ${ttfbMs}ms`,
    detail: 'Under 800ms is good. Under 200ms is excellent.',
    score: ttfbMs < 200 ? 100 : ttfbMs < 800 ? 80 : ttfbMs < 2000 ? 50 : 20,
  })

  // Page size
  checks.push({
    id: 'page-size',
    title: 'Page size (HTML)',
    status: htmlSizeKb < 100 ? 'pass' : htmlSizeKb < 300 ? 'warn' : 'fail',
    message: `HTML: ${htmlSizeKb} KB`,
    detail: 'Keep HTML under 100KB. Minify + compress on the server.',
    score: htmlSizeKb < 100 ? 100 : htmlSizeKb < 300 ? 70 : 30,
  })

  // Heading hierarchy
  checks.push({
    id: 'headings',
    title: 'Heading structure',
    status: headings.h1.length === 1 && headings.h2.length > 0 ? 'pass' : 'warn',
    message: `${headings.h1.length} H1, ${headings.h2.length} H2, ${headings.h3.length} H3`,
    detail: 'Use one H1, then a logical H2→H3 hierarchy.',
    score: headings.h1.length === 1 && headings.h2.length > 0 ? 100 : 50,
  })

  // Robots meta
  checks.push({
    id: 'robots-meta',
    title: 'Robots meta',
    status: !meta.robots || /index/i.test(meta.robots) ? 'pass' : 'warn',
    message: meta.robots ? `robots: ${meta.robots}` : 'No robots meta (defaults to index, follow)',
    score: !meta.robots || /index/i.test(meta.robots) ? 100 : 0,
  })

  // Overall score
  const overallScore = Math.round(checks.reduce((sum, c) => sum + c.score, 0) / checks.length)
  const grade = overallScore >= 90 ? 'A' : overallScore >= 80 ? 'B' : overallScore >= 70 ? 'C' : overallScore >= 60 ? 'D' : 'F'

  return {
    url,
    fetchedAt: new Date().toISOString(),
    httpStatus: status,
    ttfbMs,
    totalTimeMs,
    htmlSizeKb,
    overallScore,
    grade,
    checks,
    meta,
    headings,
    images,
    links: linkResults,
    schema,
    openGraph: allMeta,
    localSeo,
  }
}

// Generate a sitemap.xml from a project's pages (built-in, no external tool).
export function generateSitemap(pages: { slug: string; updatedAt: Date }[], domain: string): string {
  const base = domain.replace(/\/$/, '')
  const urls = pages.map((p) => {
    const loc = `${base}/${p.slug === 'home' ? '' : p.slug}`
    const lastmod = p.updatedAt.toISOString().split('T')[0]
    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${p.slug === 'home' ? '1.0' : '0.8'}</priority>
  </url>`
  })
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`
}
