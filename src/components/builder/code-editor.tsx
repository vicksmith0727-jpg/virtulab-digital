'use client'

/**
 * Code editor for the VirtuaLab Digital builder's "Code" and "Hybrid" modes.
 *
 * Provides:
 *   - `CodeEditor`  : a styled <textarea> with Copy + Apply/Sync buttons
 *   - `blocksToHtml`: best-effort serializer — BlockInstance[] → readable HTML
 *   - `parseHtmlToBlocks`: best-effort parser — HTML string → BlockInstance[]
 *
 * Both converters are deliberately simple ("best-effort"). They round-trip the
 * common block types (hero, heading, paragraph, image, button, cta, spacer,
 * divider, footer) but do NOT try to perfectly serialize complex list-based
 * blocks (features, pricing, faq, team, gallery, stats, logos). For those, the
 * parser keeps the data-block wrapper + inner HTML as a raw "html" block prop
 * so the user can edit it without losing the content.
 */

import * as React from 'react'
import { Copy, Loader2, Check } from 'lucide-react'
import type { BlockInstance } from '@/lib/seed'
import { BLOCK_LOOKUP } from '@/lib/blocks'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/*  HTML serialization — blocks → HTML                                  */
/* ------------------------------------------------------------------ */

function esc(s: unknown): string {
  if (s === null || s === undefined) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function attr(name: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return ''
  return ` ${name}="${esc(value)}"`
}

/**
 * Serialize a single BlockInstance into a self-contained HTML <section> with a
 * `data-block="TYPE"` attribute. The output is meant to be human-readable and
 * editable in the code editor — it is NOT the same format the publish endpoint
 * uses. The parser below can round-trip this output.
 */
export function blockToHtml(block: BlockInstance): string {
  const p = block.props || {}
  const open = (extra = '') => `<section data-block="${esc(block.type)}"${extra}>`
  const close = () => `</section><!-- /${esc(block.type)} -->`

  switch (block.type) {
    case 'hero': {
      const align = p.align === 'center' ? 'center' : 'left'
      const bgStyle = p.bg ? ` style="background:${esc(p.bg)}"` : ''
      const textStyle = p.textColor ? ` style="color:${esc(p.textColor)}"` : ''
      const parts: string[] = []
      parts.push(open(` class="hero align-${align}"${bgStyle}`))
      if (p.eyebrow) parts.push(`  <p class="eyebrow">${esc(p.eyebrow)}</p>`)
      if (p.headline) parts.push(`  <h1${textStyle}>${esc(p.headline)}</h1>`)
      if (p.subheadline) parts.push(`  <p class="sub">${esc(p.subheadline)}</p>`)
      parts.push('  <div class="cta-row">')
      if (p.ctaPrimary) parts.push(`    <a class="btn btn-primary" href="#">${esc(p.ctaPrimary)}</a>`)
      if (p.ctaSecondary) parts.push(`    <a class="btn btn-ghost" href="#">${esc(p.ctaSecondary)}</a>`)
      parts.push('  </div>')
      parts.push(close())
      return parts.join('\n')
    }
    case 'heading': {
      const level = (p.level && /^h[1-6]$/.test(p.level)) ? p.level : 'h2'
      const parts: string[] = [open(' class="heading"')]
      if (p.eyebrow) parts.push(`  <p class="eyebrow">${esc(p.eyebrow)}</p>`)
      parts.push(`  <${level}>${esc(p.text)}</${level}>`)
      parts.push(close())
      return parts.join('\n')
    }
    case 'paragraph': {
      return [open(' class="paragraph"'), `  <p>${esc(p.text)}</p>`, close()].join('\n')
    }
    case 'image': {
      const parts: string[] = [open(' class="image"')]
      parts.push(`  <figure>`)
      parts.push(`    <img${attr('src', p.src)}${attr('alt', p.alt)}${attr('loading', 'lazy')} />`)
      if (p.caption) parts.push(`    <figcaption>${esc(p.caption)}</figcaption>`)
      parts.push(`  </figure>`)
      parts.push(close())
      return parts.join('\n')
    }
    case 'button': {
      return [
        open(' class="button"'),
        `  <a class="btn"${attr('href', p.href || '#')}>${esc(p.label)}</a>`,
        close(),
      ].join('\n')
    }
    case 'cta': {
      const parts: string[] = [open(' class="cta-band"')]
      if (p.headline) parts.push(`  <h2>${esc(p.headline)}</h2>`)
      if (p.subheadline) parts.push(`  <p>${esc(p.subheadline)}</p>`)
      if (p.ctaPrimary) parts.push(`  <a class="btn btn-primary" href="#">${esc(p.ctaPrimary)}</a>`)
      parts.push(close())
      return parts.join('\n')
    }
    case 'spacer': {
      const h = Number(p.height) || 64
      return `<div data-block="spacer" class="spacer" style="height:${h}px"></div>`
    }
    case 'divider': {
      return `<hr data-block="divider" class="divider" />`
    }
    case 'footer': {
      const parts: string[] = ['<footer data-block="footer" class="site-footer">']
      parts.push(`  <p class="tagline">${esc(p.tagline)}</p>`)
      const cols: any[] = Array.isArray(p.columns) ? p.columns : []
      for (const c of cols) {
        parts.push('  <div class="footer-col">')
        parts.push(`    <h4>${esc(c?.heading)}</h4>`)
        parts.push('    <ul>')
        for (const l of (Array.isArray(c?.links) ? c.links : [])) {
          parts.push(`      <li><a href="#">${esc(l)}</a></li>`)
        }
        parts.push('    </ul>')
        parts.push('  </div>')
      }
      if (p.copyright) parts.push(`  <p class="copyright">${esc(p.copyright)}</p>`)
      parts.push('</footer>')
      return parts.join('\n')
    }
    default: {
      // For complex list-based blocks (features, pricing, faq, team, gallery,
      // stats, logos, testimonial, contact, newsletter), emit a generic
      // wrapper with the raw JSON props as a data-props attribute. The parser
      // can reconstruct these exactly without trying to interpret the HTML.
      const def = BLOCK_LOOKUP[block.type]
      const label = def?.label ?? block.type
      const json = JSON.stringify(p)
      return [
        open(` data-label="${esc(label)}"`),
        `  <div data-raw-props="${esc(json)}">`,
        `    <!-- ${esc(label)} block — edit via drag & drop or paste JSON below -->`,
        `  </div>`,
        close(),
      ].join('\n')
    }
  }
}

export function blocksToHtml(blocks: BlockInstance[]): string {
  return blocks.map(blockToHtml).join('\n\n')
}

/* ------------------------------------------------------------------ */
/*  HTML parser — HTML → blocks                                         */
/* ------------------------------------------------------------------ */

function newBlockId(type: string): string {
  return `${type}-${Math.random().toString(36).slice(2, 9)}`
}

function blockFromDefaults(type: string, overrides: Record<string, any> = {}): BlockInstance {
  const def = BLOCK_LOOKUP[type]
  return {
    id: newBlockId(type),
    type,
    props: { ...(def?.defaults ?? {}), ...overrides },
  }
}

function readRawProps(el: Element): Record<string, any> | null {
  const inner = el.querySelector('[data-raw-props]')
  if (!inner) return null
  const raw = inner.getAttribute('data-raw-props')
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/**
 * Parse an HTML string into BlockInstance[]. Best-effort: recognizes the
 * common block types via `data-block` attributes; for unknown top-level
 * elements, wraps the content in a paragraph block. Throws if the HTML can't
 * be parsed.
 */
export function parseHtmlToBlocks(html: string): BlockInstance[] {
  if (!html || !html.trim()) return []
  const parser = new DOMParser()
  const doc = parser.parseFromString(`<div id="__root">${html}</div>`, 'text/html')
  // DOMParser returns a full Document; check for a parser-error marker.
  const parserError = doc.querySelector('parsererror')
  if (parserError) {
    throw new Error(parserError.textContent || 'Invalid HTML')
  }
  const root = doc.getElementById('__root')
  if (!root) return []

  const blocks: BlockInstance[] = []
  for (const el of Array.from(root.children)) {
    const block = elementToBlock(el)
    if (block) blocks.push(block)
  }
  return blocks
}

function elementToBlock(el: Element): BlockInstance | null {
  const type = el.getAttribute('data-block') || inferTypeFromTag(el)
  switch (type) {
    case 'hero': {
      const headline = textOf(el.querySelector('h1, h2, h3'))
      const sub = textOf(el.querySelector('p.sub, p:not(.eyebrow):not(.cta-row *)'))
      const eyebrow = textOf(el.querySelector('p.eyebrow'))
      const ctaPrimary = textOf(el.querySelector('a.btn-primary'))
      const ctaSecondary = textOf(el.querySelector('a.btn-ghost, a.btn-secondary'))
      const alignClass = el.getAttribute('class') || ''
      const align = alignClass.includes('align-center') ? 'center' : 'left'
      const styleAttr = el.getAttribute('style') || ''
      const bgMatch = styleAttr.match(/background:\s*([^;]+)/)
      const textMatch = styleAttr.match(/color:\s*([^;]+)/)
      // Check inner h1/h2 for an inline color style too.
      const hStyle = el.querySelector('h1, h2, h3')?.getAttribute('style') || ''
      const hTextMatch = hStyle.match(/color:\s*([^;]+)/)
      return blockFromDefaults('hero', {
        eyebrow: eyebrow || '',
        headline: headline || '',
        subheadline: sub || '',
        ctaPrimary: ctaPrimary || '',
        ctaSecondary: ctaSecondary || '',
        bg: bgMatch ? bgMatch[1].trim() : 'forest',
        textColor: (textMatch?.[1] || hTextMatch?.[1] || '').trim() || '#1a2818',
        accentColor: '#2d5a3d',
        align,
      })
    }
    case 'heading': {
      const headingEl = el.querySelector('h1, h2, h3, h4, h5, h6')
      const level = headingEl ? headingEl.tagName.toLowerCase() : 'h2'
      const text = textOf(headingEl)
      const eyebrow = textOf(el.querySelector('p.eyebrow'))
      return blockFromDefaults('heading', {
        text: text || '',
        eyebrow: eyebrow || '',
        level,
        size: 'xl',
      })
    }
    case 'paragraph': {
      const p = textOf(el.querySelector('p'))
      return blockFromDefaults('paragraph', { text: p || '' })
    }
    case 'image': {
      const img = el.querySelector('img')
      const caption = textOf(el.querySelector('figcaption'))
      return blockFromDefaults('image', {
        src: img?.getAttribute('src') || '',
        alt: img?.getAttribute('alt') || '',
        caption: caption || '',
      })
    }
    case 'button': {
      const a = el.querySelector('a')
      return blockFromDefaults('button', {
        label: textOf(a) || 'Button',
        href: a?.getAttribute('href') || '#',
      })
    }
    case 'cta': {
      const headline = textOf(el.querySelector('h2, h1'))
      const sub = textOf(el.querySelector('p'))
      const cta = textOf(el.querySelector('a'))
      return blockFromDefaults('cta', {
        headline: headline || '',
        subheadline: sub || '',
        ctaPrimary: cta || '',
      })
    }
    case 'spacer': {
      const style = el.getAttribute('style') || ''
      const m = style.match(/height:\s*(\d+)/)
      return blockFromDefaults('spacer', { height: m ? Number(m[1]) : 64 })
    }
    case 'divider': {
      return blockFromDefaults('divider')
    }
    case 'footer': {
      const tagline = textOf(el.querySelector('p.tagline'))
      const copyright = textOf(el.querySelector('p.copyright'))
      const cols: any[] = []
      el.querySelectorAll('.footer-col').forEach((col) => {
        const heading = textOf(col.querySelector('h4'))
        const links: string[] = []
        col.querySelectorAll('li a, ul a').forEach((a) => links.push(textOf(a)))
        cols.push({ heading: heading || '', links })
      })
      return blockFromDefaults('footer', {
        tagline: tagline || '',
        copyright: copyright || '',
        columns: cols.length ? cols : undefined,
      })
    }
    default: {
      // Try the raw-props fallback for complex list blocks.
      const rawProps = readRawProps(el)
      if (rawProps) {
        // The data-block attribute should tell us the type.
        const rawType = el.getAttribute('data-block')
        if (rawType && BLOCK_LOOKUP[rawType]) {
          return blockFromDefaults(rawType, rawProps)
        }
      }
      // Fall back to a paragraph block containing the element's text content
      // so the user's content is never silently lost.
      const text = (el.textContent || '').trim()
      if (!text) return null
      return blockFromDefaults('paragraph', { text })
    }
  }
}

function inferTypeFromTag(el: Element): string | null {
  const tag = el.tagName.toLowerCase()
  if (tag === 'footer') return 'footer'
  if (tag === 'hr') return 'divider'
  // Inspect children to guess a block type for plain HTML the user wrote
  // (no data-block attribute).
  const h1 = el.querySelector('h1')
  if (h1 && el.querySelectorAll('h2, h3').length === 0) {
    // h1 + paragraphs → hero
    if (el.querySelectorAll('p').length >= 1) return 'hero'
  }
  if (el.querySelector('h2, h3, h4, h5, h6') && el.querySelector('p')) return 'heading'
  if (tag === 'p') return 'paragraph'
  if (tag === 'img') return 'image'
  if (tag === 'a') return 'button'
  return null
}

function textOf(el: Element | null | undefined): string {
  if (!el) return ''
  return (el.textContent || '').trim()
}

/* ------------------------------------------------------------------ */
/*  CodeEditor component                                               */
/* ------------------------------------------------------------------ */

export function CodeEditor({
  value,
  onChange,
  onApply,
  applyLabel = 'Apply to canvas',
  syncing = false,
  showApply = true,
  readOnly = false,
  minClassName = 'min-h-[400px]',
}: {
  value: string
  onChange: (v: string) => void
  onApply?: () => void
  applyLabel?: string
  syncing?: boolean
  showApply?: boolean
  readOnly?: boolean
  minClassName?: string
}) {
  const { toast } = useToast()
  const [copied, setCopied] = React.useState(false)

  function handleCopy() {
    if (!value) return
    navigator.clipboard
      ?.writeText(value)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
        toast({ title: 'Copied to clipboard' })
      })
      .catch(() =>
        toast({ title: 'Could not copy', variant: 'destructive' }),
      )
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-card">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-muted/40">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-md bg-forest/10 text-forest px-2 py-0.5 font-medium">
            HTML
          </span>
          <span className="hidden sm:inline">
            {readOnly ? 'Read-only preview of the current page' : 'Edit raw HTML — best-effort parser applies it to the canvas'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="h-7 px-2 text-xs"
            disabled={!value}
          >
            {copied ? <Check className="size-3.5 text-forest" /> : <Copy className="size-3.5" />}
            Copy
          </Button>
          {showApply && onApply && (
            <Button
              type="button"
              size="sm"
              onClick={onApply}
              disabled={syncing}
              className="h-7 px-2 text-xs bg-forest text-primary-foreground hover:bg-forest/90"
            >
              {syncing ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {applyLabel}
            </Button>
          )}
        </div>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        spellCheck={false}
        placeholder={readOnly ? 'No blocks on this page yet.' : '<!-- Write or paste HTML here, then click Apply to canvas -->\n<section data-block="hero">\n  <h1>Hello world</h1>\n</section>'}
        className={cn(
          'flex-1 w-full resize-none rounded-none border-0 bg-muted/60 text-foreground font-mono text-xs sm:text-sm p-4 leading-relaxed',
          'focus:outline-none focus:ring-2 focus:ring-forest/40',
          'placeholder:text-muted-foreground/60',
          minClassName,
        )}
        style={{ scrollbarColor: 'var(--color-forest) transparent' }}
      />
    </div>
  )
}
