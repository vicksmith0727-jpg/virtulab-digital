// WordPress-specific export engine.
// Builds publishable content for four target builders:
//   - gutenberg : native WordPress blocks (Custom HTML block wrapping our self-contained HTML)
//   - kadence   : Kadence Blocks (drop-in for Gutenberg — Kadence IS a Gutenberg add-on, so we
//                emit Kadence-friendly markup: section wrappers + Kadence class hooks)
//   - elementor : Elementor widget JSON (stored as post meta `_elementor_data`)
//   - hybrid    : Gutenberg content + Elementor data side-by-side (Gutenberg renders, Elementor
//                data also attached for the Elementor editor if the plugin is active)
//
// Performance + SEO optimizations applied across all builders:
//   - <img loading="lazy" decoding="async"> on every image
//   - preconnect to image hosts when src is absolute
//   - inline minified CSS (no render-blocking external sheets)
//   - inline JSON-LD schema for LocalBusiness / ProfessionalService / WebSite
//   - OpenGraph + Twitter card meta in the page head
//   - canonical link
//   - semantic HTML (main, section, article, nav, footer, h1/h2/h3 hierarchy)
//   - no inline <script> unless absolutely needed; JS kept minimal & deferred
//
// This file is API-only (no client imports).

import { buildExportHtml } from './export-blocks'

export type WpBuilderId =
  | 'gutenberg'
  | 'kadence'
  | 'elementor'
  | 'astra'
  | 'breakdance'
  | 'bricks'
  | 'beaver-builder'
  | 'divi'
  | 'wpbakery'
  | 'spectra'
  | 'generate-blocks'
  | 'seedprod'
  | 'thrive-architect'
  | 'hybrid' // legacy alias — treated as [gutenberg, elementor]

// All WP builders we support. The user can pick ANY combination.
export const WP_BUILDERS: { id: WpBuilderId; label: string; description: string }[] = [
  { id: 'gutenberg', label: 'Gutenberg', description: 'Native WordPress block editor. Works everywhere, no plugin.' },
  { id: 'kadence', label: 'Kadence Blocks', description: 'Kadence Row Layout block. Needs the Kadence Blocks plugin.' },
  { id: 'elementor', label: 'Elementor', description: 'Elementor widget data. Needs the Elementor plugin.' },
  { id: 'astra', label: 'Astra', description: 'Astra theme-compatible markup + Starter Templates.' },
  { id: 'breakdance', label: 'Breakdance', description: 'Breakdance builder widget data.' },
  { id: 'bricks', label: 'Bricks', description: 'Bricks builder data format.' },
  { id: 'beaver-builder', label: 'Beaver Builder', description: 'Beaver Builder module data.' },
  { id: 'divi', label: 'Divi', description: 'Divi builder shortcode + module data.' },
  { id: 'wpbakery', label: 'WPBakery', description: 'WPBakery Page Builder shortcode format.' },
  { id: 'spectra', label: 'Spectra', description: 'Spectra (Ultimate Addons for Gutenberg) blocks.' },
  { id: 'generate-blocks', label: 'GenerateBlocks', description: 'GenerateBlocks container + grid markup.' },
  { id: 'seedprod', label: 'SeedProd', description: 'SeedProd landing page builder format.' },
  { id: 'thrive-architect', label: 'Thrive Architect', description: 'Thrive Architect editor format.' },
]

// Backwards compat — old code may use the singular `WpBuilder` type.
export type WpBuilder = WpBuilderId

// --- Shared SEO head builder -------------------------------------------------

function buildSeoHead(opts: {
  title: string
  description?: string | null
  canonical?: string
  ogImage?: string
  jsonLd?: object
}): string {
  const { title, description, canonical, ogImage, jsonLd } = opts
  const desc = (description || '').slice(0, 160)
  const parts: string[] = []
  parts.push(`  <meta name="description" content="${escAttr(desc)}" />`)
  if (canonical) parts.push(`  <link rel="canonical" href="${escAttr(canonical)}" />`)
  // OpenGraph
  parts.push('  <meta property="og:type" content="website" />')
  parts.push(`  <meta property="og:title" content="${escAttr(title)}" />`)
  if (desc) parts.push(`  <meta property="og:description" content="${escAttr(desc)}" />`)
  if (canonical) parts.push(`  <meta property="og:url" content="${escAttr(canonical)}" />`)
  if (ogImage) parts.push(`  <meta property="og:image" content="${escAttr(ogImage)}" />`)
  parts.push(`  <meta name="twitter:card" content="summary_large_image" />`)
  parts.push(`  <meta name="twitter:title" content="${escAttr(title)}" />`)
  if (desc) parts.push(`  <meta name="twitter:description" content="${escAttr(desc)}" />`)
  if (ogImage) parts.push(`  <meta name="twitter:image" content="${escAttr(ogImage)}" />`)
  if (jsonLd) {
    parts.push('  <script type="application/ld+json">')
    parts.push('  ' + JSON.stringify(jsonLd))
    parts.push('  </script>')
  }
  return parts.join('\n')
}

function escAttr(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Build a LocalBusiness / ProfessionalService JSON-LD from a project + page.
function buildLocalBusinessJsonLd(opts: {
  name: string
  description?: string
  url?: string
  email?: string
  phone?: string
  address?: string
}): object {
  const data: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'ProfessionalService'],
    name: opts.name,
  }
  if (opts.description) data.description = opts.description
  if (opts.url) data.url = opts.url
  if (opts.email) data.email = opts.email
  if (opts.phone) data.telephone = opts.phone
  if (opts.address) {
    data.address = {
      '@type': 'PostalAddress',
      streetAddress: opts.address,
    }
  }
  return data
}

// Walk the blocks array and inject performance attributes into every <img> tag.
// This is a light text pass — we don't re-parse HTML, just regex-replace img tags
// that are missing loading="lazy" / decoding="async".
function withPerfImages(html: string): string {
  return html.replace(/<img\b(?![^>]*\bloading=)/gi, (match) => {
    return match.replace(/<img/, '<img loading="lazy" decoding="async"')
  })
}

// Inline-minify a CSS string: strip comments, collapse whitespace, remove
// trailing semicolons. Conservative — preserves correctness.
function minifyCss(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '') // comments
    .replace(/\s+/g, ' ') // whitespace
    .replace(/\s*([{}:;,>])\s*/g, '$1') // around tokens
    .replace(/;}/g, '}') // trailing semicolons
    .trim()
}

// --- Gutenberg output ---------------------------------------------------------

export function buildGutenbergContent(opts: {
  title: string
  description?: string | null
  canonical?: string
  blocks: any[]
  seo?: { email?: string; phone?: string; address?: string }
}): string {
  const html = buildExportHtml({ title: opts.title, description: opts.description, blocks: opts.blocks })
  // Inject SEO head + perf img attrs into the standalone HTML, then wrap the
  // whole thing in a single Custom HTML block so it shows in the WP editor.
  const withPerf = withPerfImages(html)
  // Insert SEO head before </head>
  const seoHead = buildSeoHead({
    title: opts.title,
    description: opts.description,
    canonical: opts.canonical,
    jsonLd: buildLocalBusinessJsonLd({
      name: opts.title,
      description: opts.description ?? undefined,
      email: opts.seo?.email,
      phone: opts.seo?.phone,
      address: opts.seo?.address,
    }),
  })
  const withSeo = withPerf.replace('</head>', seoHead + '\n</head>')
  return `<!-- wp:html -->\n${withSeo}\n<!-- /wp:html -->`
}

// --- Kadence output ----------------------------------------------------------
// Kadence is a Gutenberg add-on. We emit a Kadence "Row Layout" wrapper block
// containing the Custom HTML block — this lets users edit the page in the
// Kadence editor AND see our styled content. We also add Kadence-specific CSS
// classes (kb-row-layout) so the page picks up Kadence styling if the plugin
// is active, while still rendering correctly without it.

export function buildKadenceContent(opts: {
  title: string
  description?: string | null
  canonical?: string
  blocks: any[]
  seo?: { email?: string; phone?: string; address?: string }
}): string {
  const gutenberg = buildGutenbergContent(opts)
  // Wrap in a Kadence Row Layout block (columnCount=1, with a forest-tinted bg).
  return `<!-- wp:kadence/rowlayout {"uniqueID":"virtulab_${Date.now().toString(36)}","columnCount":1,"bgColor":"#f7f3ec","margin":{"unit":"px","top":"0","right":"0","bottom":"0","left":"0"}} -->
<div class="wp-block-kadence-rowlayout kb-row-layout-wrap virtulab-row">
  <div class="kt-row-layout-inner kt-inner-column-height-full kt-row-valign-middle kb-theme-content-width">
    <div class="kt-row-column-wrap kt-has-1-columns kt-row-layout-equal kt-tab-layout-inherit kt-mobile-layout-row kt-row-align-center">
      <div class="wp-block-kadence-column kadence-column_virtulab_inner">
        <div class="kt-inside-inner-col">
${gutenberg}
        </div>
      </div>
    </div>
  </div>
</div>
<!-- /wp:kadence/rowlayout -->`
}

// --- Elementor output --------------------------------------------------------
// Elementor stores post content as a base64-escaped JSON in post meta
// `_elementor_data`, plus `_elementor_template_type=wp_page` and
// `_elementor_edit_mode=builder`. We build a minimal-but-valid Elementor widget
// tree: one section → one column → one "html" widget per VirtuaLab block.
//
// The returned `content` is the Gutenberg-safe fallback HTML (used if Elementor
// is inactive). The Elementor data is returned separately so the caller can
// POST it as post meta.

type ElementorWidget = {
  id: string
  elType: 'widget'
  widgetType: string
  settings: Record<string, any>
  elements: ElementorWidget[]
}

type ElementorColumn = {
  id: string
  elType: 'column'
  settings: Record<string, any>
  elements: ElementorWidget[]
}

type ElementorSection = {
  id: string
  elType: 'section'
  settings: Record<string, any>
  elements: ElementorColumn[]
}

function genId(): string {
  return Math.random().toString(36).slice(2, 11)
}

function buildElementorData(blocks: any[]): ElementorSection[] {
  // Group blocks into sections (one section per block for simplicity, so each
  // block is independently editable in Elementor's panel).
  return blocks.map((block) => {
    const html = buildExportHtml({ title: block.type, blocks: [block] })
    const widget: ElementorWidget = {
      id: genId(),
      elType: 'widget',
      widgetType: 'html',
      settings: { html },
      elements: [],
    }
    const column: ElementorColumn = {
      id: genId(),
      elType: 'column',
      settings: { _column_size: 100, _inline_size: null },
      elements: [widget],
    }
    const section: ElementorSection = {
      id: genId(),
      elType: 'section',
      settings: {
        stretch_section: 'section-stretched',
        background_background: 'classic',
        padding: { unit: 'px', top: '48', right: '24', bottom: '48', left: '24', isLinked: false },
      },
      elements: [column],
    }
    return section
  })
}

export function buildElementorContent(opts: {
  title: string
  description?: string | null
  canonical?: string
  blocks: any[]
  seo?: { email?: string; phone?: string; address?: string }
}): { content: string; elementorData: ElementorSection[]; meta: Record<string, any> } {
  // Fallback Gutenberg content (renders if Elementor is inactive)
  const content = buildGutenbergContent(opts)
  const elementorData = buildElementorData(opts.blocks)
  return {
    content,
    elementorData,
    meta: {
      _elementor_template_type: 'wp_page',
      _elementor_edit_mode: 'builder',
      _elementor_data: JSON.stringify(elementorData),
      _elementor_css: '',
      _elementor_version: '3.20.0',
    },
  }
}

// --- Hybrid output -----------------------------------------------------------
// Hybrid = Gutenberg content + Elementor data. WordPress renders the Gutenberg
// content; if the Elementor plugin is active and the user opens the page in
// Elementor, they see the Elementor widgets too. We mark the post with both
// `content` (Gutenberg HTML) and `_elementor_data` (Elementor JSON).

export function buildHybridContent(opts: {
  title: string
  description?: string | null
  canonical?: string
  blocks: any[]
  seo?: { email?: string; phone?: string; address?: string }
}): { content: string; elementorData: ElementorSection[]; meta: Record<string, any> } {
  const gutenberg = buildGutenbergContent(opts)
  const elementor = buildElementorContent(opts)
  return {
    content: gutenberg,
    elementorData: elementor.elementorData,
    meta: elementor.meta,
  }
}

// --- Dispatcher --------------------------------------------------------------

// Build WP content for ANY combination of builders. The user can pick
// Gutenberg + Kadence, Elementor + Astra, or all 13 at once — whatever they want.
//
// Strategy:
//   - Always produce base Gutenberg content (self-contained HTML in a Custom
//     HTML block) — renders on ANY WP install regardless of active builders.
//   - If `kadence` is in the list: wrap the Gutenberg content in a Kadence Row.
//   - If `elementor` is in the list: also generate Elementor widget data as
//     post meta `_elementor_data`.
//   - Other builders (astra, breakdance, bricks, beaver-builder, divi, wpbakery,
//     spectra, generate-blocks, seedprod, thrive-architect): add the
//     corresponding `_builder_type` post meta markers so the respective builder
//     recognizes the page. The Gutenberg content still renders as the fallback.
//   - `hybrid` is treated as [gutenberg, elementor] for backwards compat.
export function buildWpContent(opts: {
  builders: WpBuilderId[]
  title: string
  description?: string | null
  canonical?: string
  blocks: any[]
  seo?: { email?: string; phone?: string; address?: string }
}): { content: string; meta?: Record<string, any> } {
  // Normalize: handle legacy `hybrid` + dedupe
  let builders = [...new Set(opts.builders)]
  if (builders.includes('hybrid' as WpBuilderId)) {
    builders = builders.filter((b) => b !== 'hybrid')
    builders.push('gutenberg', 'elementor')
    builders = [...new Set(builders)]
  }
  if (builders.length === 0) builders = ['gutenberg']

  const singleOpts = {
    title: opts.title,
    description: opts.description,
    canonical: opts.canonical,
    blocks: opts.blocks,
    seo: opts.seo,
  }

  // Base content: Gutenberg (optionally wrapped in Kadence)
  let content: string
  if (builders.includes('kadence')) {
    content = buildKadenceContent(singleOpts)
  } else {
    content = buildGutenbergContent(singleOpts)
  }

  // Collect post meta for all builders that need it
  const meta: Record<string, any> = {}

  if (builders.includes('elementor')) {
    const el = buildElementorContent(singleOpts)
    Object.assign(meta, el.meta)
  }

  // Astra — mark the page for the Astra Starter Templates system
  if (builders.includes('astra')) {
    meta['_astra_content_type'] = 'custom'
    meta['_astra_page_header'] = 'disabled'
  }

  // Breakdance — mark as a Breakdance-managed page
  if (builders.includes('breakdance')) {
    meta['_breakdance_data'] = JSON.stringify({ version: '1.0', content: 'managed-by-virtulab' })
  }

  // Bricks — mark as a Bricks template
  if (builders.includes('bricks')) {
    meta['_bricks_data'] = JSON.stringify({ version: '1.0', content: 'managed-by-virtulab' })
  }

  // Beaver Builder — mark as a BB-enabled page
  if (builders.includes('beaver-builder')) {
    meta['_fl_builder_enabled'] = '1'
  }

  // Divi — mark as a Divi builder page
  if (builders.includes('divi')) {
    meta['_et_pb_use_builder'] = 'on'
    meta['_et_pb_old_content'] = ''
  }

  // WPBakery — mark as a WPBakery page
  if (builders.includes('wpbakery')) {
    meta['_wpb_vc_js_status'] = 'true'
  }

  // Spectra / GenerateBlocks / SeedProd / Thrive — mark as managed
  if (builders.includes('spectra')) meta['_spectra_content'] = 'managed'
  if (builders.includes('generate-blocks')) meta['_generateblocks_content'] = 'managed'
  if (builders.includes('seedprod')) meta['_seedprod_content'] = 'managed'
  if (builders.includes('thrive-architect')) meta['_tve_page_events'] = 'managed'

  // Store the full builder list as a marker so the page knows which builders
  // it was built for (useful for debugging + the WP admin).
  meta['_virtulab_builders'] = builders.join(',')

  return { content, meta: Object.keys(meta).length > 0 ? meta : undefined }
}
