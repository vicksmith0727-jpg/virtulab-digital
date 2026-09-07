// Block → HTML serializer for the export route.
// Produces self-contained, responsive, mobile-first HTML using the organic
// color tokens. No external CSS — everything is inlined in the export template.

export type ExportBlock = {
  id: string
  type: string
  props: Record<string, any>
}

export function esc(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function str(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback
  const s = String(value)
  return s.trim() || fallback
}

function num(value: unknown, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function arr(value: unknown): any[] {
  return Array.isArray(value) ? value : []
}

export function serializeBlock(block: ExportBlock): string {
  const p = block.props || {}
  switch (block.type) {
    case 'hero': {
      const bg = str(p.bg, 'forest')
      const align = str(p.align, 'left')
      return `<section class="hero hero-${esc(bg)} align-${esc(align)}">
        <div class="container">
          ${p.eyebrow ? `<p class="eyebrow">${esc(p.eyebrow)}</p>` : ''}
          <h1 class="hero-headline">${esc(p.headline)}</h1>
          ${p.subheadline ? `<p class="hero-sub">${esc(p.subheadline)}</p>` : ''}
          <div class="cta-row">
            ${p.ctaPrimary ? `<a class="btn btn-primary" href="#">${esc(p.ctaPrimary)}</a>` : ''}
            ${p.ctaSecondary ? `<a class="btn btn-ghost" href="#">${esc(p.ctaSecondary)}</a>` : ''}
          </div>
        </div>
      </section>`
    }
    case 'heading': {
      const size = str(p.size, 'xl')
      return `<section class="container"><div class="heading heading-${esc(size)}">
        ${p.eyebrow ? `<p class="eyebrow">${esc(p.eyebrow)}</p>` : ''}
        <h2>${esc(p.text)}</h2>
      </div></section>`
    }
    case 'paragraph': {
      const text = str(p.text)
      return `<section class="container"><p class="paragraph">${esc(text).replace(/\n/g, '<br>')}</p></section>`
    }
    case 'image': {
      const src = str(p.src)
      const alt = str(p.alt, 'Image')
      const caption = str(p.caption)
      const radius = str(p.radius, 'lg')
      const inner = src
        ? `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" />`
        : `<div class="img-placeholder">${esc(alt)}</div>`
      return `<section class="container"><figure class="image image-radius-${esc(radius)}">
        ${inner}
        ${caption ? `<figcaption>${esc(caption)}</figcaption>` : ''}
      </figure></section>`
    }
    case 'button': {
      const label = str(p.label, 'Button')
      const href = str(p.href, '#')
      const variant = str(p.variant, 'primary')
      const size = str(p.size, 'md')
      return `<section class="container"><a class="btn btn-${esc(variant)} btn-size-${esc(size)}" href="${esc(href)}">${esc(label)}</a></section>`
    }
    case 'features': {
      const items = arr(p.items)
      const cards = items
        .map(
          (it: any) => `<article class="feature">
            <div class="feature-icon" aria-hidden="true">${esc(it?.icon ?? '•')}</div>
            <h3>${esc(it?.title ?? '')}</h3>
            <p>${esc(it?.desc ?? '')}</p>
          </article>`,
        )
        .join('')
      return `<section class="container"><div class="features-head">
        ${p.title ? `<h2>${esc(p.title)}</h2>` : ''}
        ${p.subtitle ? `<p>${esc(p.subtitle)}</p>` : ''}
      </div><div class="grid grid-3">${cards}</div></section>`
    }
    case 'gallery': {
      const images = arr(p.images)
      const cols = Math.max(1, Math.min(6, num(p.columns, 4)))
      const tiles = images
        .map(
          (img: any) =>
            `<figure class="gallery-tile">${
              img?.src
                ? `<img src="${esc(img.src)}" alt="${esc(img?.alt ?? 'Gallery image')}" loading="lazy" />`
                : `<div class="img-placeholder">${esc(img?.alt ?? 'Image')}</div>`
            }</figure>`,
        )
        .join('')
      return `<section class="container">
        ${p.title ? `<h2 class="section-title">${esc(p.title)}</h2>` : ''}
        <div class="gallery" style="--cols:${cols}">${tiles}</div>
      </section>`
    }
    case 'testimonial': {
      return `<section class="container"><blockquote class="testimonial">
        <p class="quote">&ldquo;${esc(p.quote)}&rdquo;</p>
        <footer class="attribution">
          <div class="avatar">${esc(str(p.author).slice(0, 1).toUpperCase())}</div>
          <div><strong>${esc(p.author)}</strong><span>${esc(p.role)}</span></div>
        </footer>
      </blockquote></section>`
    }
    case 'pricing': {
      const tiers = arr(p.tiers)
      const cards = tiers
        .map(
          (t: any) => {
            const feats = arr(t?.features)
              .map((f: any) => `<li>${esc(f)}</li>`)
              .join('')
            return `<article class="tier ${t?.featured ? 'tier-featured' : ''}">
              <h3>${esc(t?.name ?? '')}</h3>
              <div class="price"><span>${esc(t?.price ?? '')}</span><span class="period">${esc(t?.period ?? '')}</span></div>
              <ul class="tier-features">${feats}</ul>
              <a class="btn btn-primary" href="#">${esc(t?.cta ?? 'Choose')}</a>
            </article>`
          },
        )
        .join('')
      return `<section class="container"><div class="features-head">
        ${p.title ? `<h2>${esc(p.title)}</h2>` : ''}
        ${p.subtitle ? `<p>${esc(p.subtitle)}</p>` : ''}
      </div><div class="grid grid-3">${cards}</div></section>`
    }
    case 'team': {
      const members = arr(p.members)
      const cards = members
        .map(
          (m: any) => `<article class="team-card">
            <div class="avatar avatar-lg">${esc(m?.initial ?? str(m?.name).slice(0, 1).toUpperCase())}</div>
            <h3>${esc(m?.name ?? '')}</h3>
            <p>${esc(m?.role ?? '')}</p>
          </article>`,
        )
        .join('')
      return `<section class="container">
        ${p.title ? `<h2 class="section-title">${esc(p.title)}</h2>` : ''}
        <div class="grid grid-3">${cards}</div>
      </section>`
    }
    case 'cta': {
      return `<section class="cta-band"><div class="container">
        <h2>${esc(p.headline)}</h2>
        ${p.subheadline ? `<p>${esc(p.subheadline)}</p>` : ''}
        ${p.ctaPrimary ? `<a class="btn btn-primary" href="#">${esc(p.ctaPrimary)}</a>` : ''}
      </div></section>`
    }
    case 'stats': {
      const stats = arr(p.stats)
      const items = stats
        .map(
          (s: any) => `<div class="stat"><div class="stat-value">${esc(s?.value ?? '')}</div><div class="stat-label">${esc(s?.label ?? '')}</div></div>`,
        )
        .join('')
      return `<section class="container"><div class="stats">${items}</div></section>`
    }
    case 'contact': {
      return `<section class="container"><div class="contact">
        ${p.title ? `<h2 class="section-title">${esc(p.title)}</h2>` : ''}
        <ul class="contact-list">
          ${p.email ? `<li><strong>Email</strong><span>${esc(p.email)}</span></li>` : ''}
          ${p.phone ? `<li><strong>Phone</strong><span>${esc(p.phone)}</span></li>` : ''}
          ${p.address ? `<li><strong>Address</strong><span>${esc(p.address)}</span></li>` : ''}
        </ul>
      </div></section>`
    }
    case 'newsletter': {
      return `<section class="container"><div class="newsletter">
        <h2>${esc(p.headline)}</h2>
        ${p.subheadline ? `<p>${esc(p.subheadline)}</p>` : ''}
        <form class="newsletter-form" onsubmit="return false">
          <input type="email" placeholder="you@example.com" aria-label="Email" />
          <button type="submit" class="btn btn-primary">${esc(p.cta ?? 'Subscribe')}</button>
        </form>
      </div></section>`
    }
    case 'faq': {
      const items = arr(p.items)
      const qs = items
        .map(
          (it: any, idx: number) => `<details class="faq-item"${idx === 0 ? ' open' : ''}>
            <summary>${esc(it?.q ?? '')}</summary>
            <p>${esc(it?.a ?? '')}</p>
          </details>`,
        )
        .join('')
      return `<section class="container">
        ${p.title ? `<h2 class="section-title">${esc(p.title)}</h2>` : ''}
        <div class="faq">${qs}</div>
      </section>`
    }
    case 'logos': {
      const names = arr(p.names)
      const chips = names.map((n: any) => `<span class="logo-chip">${esc(n)}</span>`).join('')
      return `<section class="container">
        ${p.title ? `<p class="logos-title">${esc(p.title)}</p>` : ''}
        <div class="logos">${chips}</div>
      </section>`
    }
    case 'footer': {
      const cols = arr(p.columns)
      const colsHtml = cols
        .map(
          (c: any) => `<div class="footer-col">
            <h4>${esc(c?.heading ?? '')}</h4>
            <ul>${arr(c?.links).map((l: any) => `<li><a href="#">${esc(l)}</a></li>`).join('')}</ul>
          </div>`,
        )
        .join('')
      return `<footer class="site-footer">
        <div class="container footer-grid">
          <div class="footer-brand">
            <p class="footer-tagline">${esc(p.tagline ?? '')}</p>
            ${p.copyright ? `<p class="footer-copy">${esc(p.copyright)}</p>` : ''}
          </div>
          ${colsHtml}
        </div>
      </footer>`
    }
    case 'spacer': {
      const h = num(p.height, 64)
      return `<div class="spacer" style="height:${h}px"></div>`
    }
    case 'divider': {
      return `<hr class="divider" />`
    }
    default: {
      return `<section class="container"><div class="unknown-block">Unsupported block: ${esc(block.type)}</div></section>`
    }
  }
}

export function buildExportHtml(opts: {
  title: string
  description?: string | null
  blocks: ExportBlock[]
}): string {
  const body = opts.blocks.map(serializeBlock).join('\n')
  const description = opts.description ? `<meta name="description" content="${esc(opts.description)}" />` : ''
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(opts.title)}</title>
  ${description}
  <style>
    :root {
      --forest: oklch(0.42 0.09 145);
      --sage: oklch(0.78 0.04 130);
      --terracotta: oklch(0.66 0.13 45);
      --clay: oklch(0.62 0.1 75);
      --cream: oklch(0.985 0.012 95);
      --sand: oklch(0.93 0.022 90);
      --bark: oklch(0.35 0.025 55);
      --moss: oklch(0.55 0.08 130);
      --background: oklch(0.985 0.012 95);
      --foreground: oklch(0.27 0.02 60);
      --primary: oklch(0.42 0.09 145);
      --primary-foreground: oklch(0.985 0.012 95);
      --accent: oklch(0.66 0.13 45);
      --accent-foreground: oklch(0.985 0.012 95);
      --muted: oklch(0.93 0.022 90);
      --muted-foreground: oklch(0.52 0.03 80);
      --border: oklch(0.88 0.025 85);
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: var(--foreground);
      background: var(--background);
      line-height: 1.6;
      font-size: 16px;
      -webkit-font-smoothing: antialiased;
    }
    img { max-width: 100%; height: auto; display: block; }
    a { color: var(--forest); text-decoration: none; }
    h1, h2, h3, h4 { margin: 0 0 0.5rem; line-height: 1.2; font-weight: 600; letter-spacing: -0.01em; }
    p { margin: 0 0 1rem; }
    .container { width: 100%; max-width: 1120px; margin: 0 auto; padding: 64px 24px; }
    .section-title { text-align: center; margin-bottom: 2rem; font-size: 2rem; }
    .eyebrow { text-transform: uppercase; letter-spacing: 0.12em; font-size: 0.78rem; color: var(--moss); margin: 0 0 0.75rem; font-weight: 600; }

    /* Hero */
    .hero { padding: 96px 24px; background: var(--cream); border-bottom: 1px solid var(--border); }
    .hero-forest { background: color-mix(in oklch, var(--forest) 12%, var(--cream)); }
    .hero-sage { background: color-mix(in oklch, var(--sage) 24%, var(--cream)); }
    .hero-terracotta { background: color-mix(in oklch, var(--terracotta) 18%, var(--cream)); }
    .hero-moss { background: color-mix(in oklch, var(--moss) 20%, var(--cream)); }
    .hero-clay { background: color-mix(in oklch, var(--clay) 18%, var(--cream)); }
    .hero-sand { background: color-mix(in oklch, var(--sand) 35%, var(--cream)); }
    .hero .container { padding: 0; max-width: 880px; }
    .align-center .container, .align-center { text-align: center; }
    .hero-headline { font-size: clamp(2.2rem, 6vw, 3.6rem); margin-bottom: 1rem; }
    .hero-sub { font-size: 1.125rem; color: var(--muted-foreground); max-width: 620px; }
    .align-center .hero-sub { margin-left: auto; margin-right: auto; }

    /* Buttons */
    .cta-row { display: flex; gap: 12px; margin-top: 1.5rem; flex-wrap: wrap; }
    .align-center .cta-row { justify-content: center; }
    .btn {
      display: inline-block; padding: 0.7rem 1.2rem; border-radius: 0.625rem;
      font-weight: 600; font-size: 0.95rem; border: 1px solid transparent; cursor: pointer;
      transition: transform 0.15s ease, background 0.15s ease;
    }
    .btn:hover { transform: translateY(-1px); }
    .btn-primary { background: var(--primary); color: var(--primary-foreground); }
    .btn-primary:hover { background: color-mix(in oklch, var(--primary) 88%, black); }
    .btn-ghost { background: transparent; color: var(--foreground); border-color: var(--border); }
    .btn-size-lg { padding: 0.85rem 1.5rem; font-size: 1rem; }
    .btn-size-sm { padding: 0.5rem 0.9rem; font-size: 0.85rem; }

    /* Grids */
    .grid { display: grid; gap: 24px; }
    .grid-3 { grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }

    /* Features */
    .features-head { text-align: center; max-width: 720px; margin: 0 auto 2.5rem; }
    .features-head h2 { font-size: 2rem; }
    .features-head p { color: var(--muted-foreground); }
    .feature { background: var(--cream); border: 1px solid var(--border); border-radius: 0.875rem; padding: 1.5rem; }
    .feature-icon { width: 40px; height: 40px; border-radius: 0.625rem; background: color-mix(in oklch, var(--sage) 30%, var(--cream)); color: var(--forest); display: flex; align-items: center; justify-content: center; font-size: 0.85rem; margin-bottom: 1rem; font-weight: 700; }
    .feature h3 { font-size: 1.1rem; }
    .feature p { color: var(--muted-foreground); margin: 0; font-size: 0.95rem; }

    /* Gallery */
    .gallery { display: grid; gap: 12px; grid-template-columns: repeat(var(--cols, 4), 1fr); }
    .gallery-tile { margin: 0; border-radius: 0.75rem; overflow: hidden; background: var(--muted); aspect-ratio: 1 / 1; }
    .gallery-tile img { width: 100%; height: 100%; object-fit: cover; }

    /* Image */
    .image { margin: 0; }
    .image img { border-radius: 0.875rem; width: 100%; }
    .image-radius-lg img, .image-radius-lg .img-placeholder { border-radius: 0.875rem; }
    .image-radius-md img, .image-radius-md .img-placeholder { border-radius: 0.5rem; }
    .image-radius-none img, .image-radius-none .img-placeholder { border-radius: 0; }
    .image figcaption { text-align: center; color: var(--muted-foreground); font-size: 0.85rem; margin-top: 0.5rem; }
    .img-placeholder { aspect-ratio: 16 / 9; background: var(--muted); color: var(--muted-foreground); display: flex; align-items: center; justify-content: center; border-radius: 0.875rem; }

    /* Testimonial */
    .testimonial { max-width: 760px; margin: 0 auto; padding: 2rem 0; }
    .quote { font-size: 1.35rem; line-height: 1.5; font-style: italic; margin-bottom: 1.5rem; color: var(--foreground); }
    .attribution { display: flex; align-items: center; gap: 12px; }
    .attribution strong { display: block; }
    .attribution span { color: var(--muted-foreground); font-size: 0.9rem; }
    .avatar { width: 40px; height: 40px; border-radius: 999px; background: var(--sage); color: var(--forest); display: flex; align-items: center; justify-content: center; font-weight: 700; }
    .avatar-lg { width: 64px; height: 64px; font-size: 1.25rem; }

    /* Pricing */
    .tier { background: var(--cream); border: 1px solid var(--border); border-radius: 1rem; padding: 1.75rem; display: flex; flex-direction: column; gap: 1rem; }
    .tier-featured { border-color: var(--forest); box-shadow: 0 0 0 1px var(--forest); }
    .tier .price { display: flex; align-items: baseline; gap: 4px; }
    .tier .price span:first-child { font-size: 2rem; font-weight: 700; }
    .tier .period { color: var(--muted-foreground); font-size: 0.9rem; }
    .tier-features { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; }
    .tier-features li { padding-left: 1.25rem; position: relative; font-size: 0.95rem; }
    .tier-features li::before { content: '✓'; position: absolute; left: 0; color: var(--forest); }

    /* Team */
    .team-card { text-align: center; padding: 1.5rem; border: 1px solid var(--border); border-radius: 0.875rem; background: var(--cream); }
    .team-card .avatar { margin: 0 auto 1rem; }
    .team-card h3 { font-size: 1.05rem; margin: 0; }
    .team-card p { color: var(--muted-foreground); margin: 0; font-size: 0.9rem; }

    /* CTA band */
    .cta-band { background: var(--forest); color: var(--primary-foreground); padding: 80px 24px; text-align: center; }
    .cta-band h2 { font-size: clamp(1.6rem, 4vw, 2.4rem); }
    .cta-band p { color: color-mix(in oklch, var(--primary-foreground) 85%, transparent); max-width: 560px; margin: 0 auto 1.5rem; }
    .cta-band .btn-primary { background: var(--accent); color: var(--accent-foreground); }

    /* Stats */
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 24px; text-align: center; }
    .stat-value { font-size: clamp(2rem, 5vw, 3rem); font-weight: 700; color: var(--forest); }
    .stat-label { color: var(--muted-foreground); font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.08em; }

    /* Contact */
    .contact { max-width: 720px; margin: 0 auto; text-align: center; }
    .contact-list { list-style: none; padding: 0; margin: 1.5rem 0 0; display: grid; gap: 12px; }
    .contact-list li { display: flex; justify-content: space-between; gap: 16px; padding: 12px 16px; background: var(--cream); border: 1px solid var(--border); border-radius: 0.625rem; }
    .contact-list strong { color: var(--forest); }

    /* Newsletter */
    .newsletter { max-width: 560px; margin: 0 auto; text-align: center; }
    .newsletter-form { display: flex; gap: 8px; margin-top: 1rem; flex-wrap: wrap; }
    .newsletter-form input { flex: 1; min-width: 220px; padding: 0.7rem 0.9rem; border-radius: 0.625rem; border: 1px solid var(--border); background: var(--cream); color: var(--foreground); }

    /* FAQ */
    .faq { max-width: 760px; margin: 0 auto; display: flex; flex-direction: column; gap: 8px; }
    .faq-item { background: var(--cream); border: 1px solid var(--border); border-radius: 0.625rem; padding: 1rem 1.25rem; }
    .faq-item summary { cursor: pointer; font-weight: 600; }
    .faq-item p { margin: 0.75rem 0 0; color: var(--muted-foreground); }

    /* Logos */
    .logos-title { text-align: center; color: var(--muted-foreground); margin-bottom: 1.25rem; text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.8rem; }
    .logos { display: flex; flex-wrap: wrap; justify-content: center; gap: 16px 32px; }
    .logo-chip { color: var(--bark); font-weight: 600; opacity: 0.7; }

    /* Footer */
    .site-footer { background: var(--bark); color: var(--cream); padding: 56px 24px 32px; }
    .footer-grid { display: grid; gap: 32px; grid-template-columns: 2fr 1fr 1fr 1fr; max-width: 1120px; margin: 0 auto; }
    .footer-tagline { font-size: 1.05rem; margin-bottom: 0.5rem; }
    .footer-copy { color: color-mix(in oklch, var(--cream) 70%, transparent); font-size: 0.85rem; }
    .footer-col h4 { color: var(--cream); margin-bottom: 0.75rem; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.08em; }
    .footer-col ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
    .footer-col a { color: color-mix(in oklch, var(--cream) 80%, transparent); font-size: 0.9rem; }
    .footer-col a:hover { color: var(--cream); }

    /* Layout utilities */
    .heading-xl h2 { font-size: 2.5rem; }
    .heading-lg h2 { font-size: 2rem; }
    .heading-md h2 { font-size: 1.5rem; }
    .heading-sm h2 { font-size: 1.25rem; }
    .paragraph { font-size: 1.05rem; color: var(--muted-foreground); }
    .divider { border: 0; border-top: 1px solid var(--border); margin: 0; }
    .spacer { width: 100%; }
    .unknown-block { padding: 1rem; color: var(--muted-foreground); border: 1px dashed var(--border); border-radius: 0.5rem; }

    @media (max-width: 720px) {
      .container { padding: 48px 20px; }
      .hero { padding: 64px 20px; }
      .footer-grid { grid-template-columns: 1fr 1fr; }
      .footer-brand { grid-column: 1 / -1; }
    }
    @media (max-width: 480px) {
      .footer-grid { grid-template-columns: 1fr; }
      .grid-3 { grid-template-columns: 1fr; }
      .gallery { grid-template-columns: repeat(2, 1fr) !important; }
    }
  </style>
</head>
<body>
${body}
</body>
</html>`
}
