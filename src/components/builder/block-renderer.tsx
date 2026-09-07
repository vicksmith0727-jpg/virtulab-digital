'use client'

import * as React from 'react'
import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Image as ImageIcon, Plus } from 'lucide-react'
import { motion, type Variants } from 'framer-motion'
import type { BlockInstance } from '@/lib/seed'
import { BLOCK_LOOKUP } from '@/lib/blocks'
import { FONT_FAMILY_STACKS } from './properties-panel'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const heroBgMap: Record<string, string> = {
  forest: 'bg-forest text-primary-foreground',
  sage: 'bg-sage text-secondary-foreground',
  terracotta: 'bg-terracotta text-primary-foreground',
  cream: 'bg-cream text-foreground',
  sand: 'bg-sand text-foreground',
}

const headingSizeMap: Record<string, string> = {
  sm: 'text-2xl sm:text-3xl',
  md: 'text-3xl sm:text-4xl',
  lg: 'text-4xl sm:text-5xl',
  xl: 'text-5xl sm:text-6xl',
}

// Heading tag rendering for the `level` prop (h1..h6). Falls back to h2.
const headingTagMap: Record<string, React.ElementType> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
}

const radiusMap: Record<string, string> = {
  none: 'rounded-none',
  sm: 'rounded-md',
  md: 'rounded-xl',
  lg: 'rounded-3xl',
  full: 'rounded-full',
}

const buttonVariantMap: Record<string, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  accent: 'bg-accent text-accent-foreground hover:bg-accent/90',
  outline: 'border border-border bg-background hover:bg-accent/10',
}

const buttonSizeMap: Record<string, string> = {
  sm: 'text-sm px-4 py-2',
  md: 'text-base px-6 py-3',
  lg: 'text-lg px-8 py-3.5',
}

const dividerColorMap: Record<string, string> = {
  border: 'border-border',
  forest: 'border-forest/40',
  sage: 'border-sage/60',
  terracotta: 'border-terracotta/50',
  sand: 'border-sand',
}

/* ------------------------------------------------------------------ */
/*  Typography helpers — apply fontFamily + fontWeight + fontSize     */
/* ------------------------------------------------------------------ */

// Returns a CSS `font-family` stack for the given option value, or undefined
// when the value is empty/unknown (caller decides whether to fall back).
function resolveFontFamily(value: any): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return FONT_FAMILY_STACKS[trimmed] ?? trimmed
}

// Builds a React.CSSProperties object for the font-family/weight/size props.
// Used by HeroBlock (headline) + HeadingBlock + ParagraphBlock.
function buildFontStyle(opts: {
  fontFamily?: any
  fontWeight?: any
  fontSize?: any
}): React.CSSProperties {
  const ff = resolveFontFamily(opts.fontFamily)
  const fw = typeof opts.fontWeight === 'string' && opts.fontWeight.trim() !== ''
    ? opts.fontWeight
    : undefined
  const fs = Number(opts.fontSize)
  const fontSizePx = Number.isFinite(fs) && fs > 0 ? `${fs}px` : undefined
  const style: React.CSSProperties = {}
  if (ff) style.fontFamily = ff
  if (fw) style.fontWeight = fw
  if (fontSizePx) style.fontSize = fontSizePx
  return style
}

/* ------------------------------------------------------------------ */
/*  Effects — scroll-into-view animation + hover                       */
/* ------------------------------------------------------------------ */

// Maps an `effect` prop value to a framer-motion `initial`/`whileInView` pair.
// `none` returns null (no animation).
function getMotionVariant(effect: string | undefined): Variants | null {
  switch (effect) {
    case 'fade-in':
      return {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { duration: 0.5 } },
      }
    case 'fade-up':
      return {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
      }
    case 'fade-down':
      return {
        hidden: { opacity: 0, y: -20 },
        show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
      }
    case 'slide-left':
      return {
        hidden: { x: 40 },
        show: { x: 0, transition: { duration: 0.5 } },
      }
    case 'slide-right':
      return {
        hidden: { x: -40 },
        show: { x: 0, transition: { duration: 0.5 } },
      }
    case 'zoom-in':
      return {
        hidden: { scale: 0.9 },
        show: { scale: 1, transition: { duration: 0.5 } },
      }
    case 'blur-in':
      return {
        hidden: { filter: 'blur(8px)', opacity: 0 },
        show: { filter: 'blur(0px)', opacity: 1, transition: { duration: 0.5 } },
      }
    default:
      return null
  }
}

// Maps a `hoverEffect` prop value to a Tailwind class string applied to the
// block wrapper. `none` returns an empty string.
const HOVER_CLASS: Record<string, string> = {
  lift: 'hover:-translate-y-1 hover:shadow-lg transition-all duration-200',
  zoom: 'hover:scale-105 transition-transform duration-200',
  glow: 'hover:shadow-[0_0_20px_var(--forest)] transition-shadow duration-200',
  shadow: 'hover:shadow-xl transition-shadow duration-200',
  none: '',
}

/* ------------------------------------------------------------------ */
/*  Color helpers — backwards-compat with the old named-token props     */
/* ------------------------------------------------------------------ */

// Organic palette tokens. Old hero `bg` values (forest/sage/terracotta/cream/
// sand/moss/clay/bark) map to their CSS variables; any other string (hex, rgb,
// oklch, named CSS color, etc.) is treated as a raw CSS color and used as-is.
const TOKEN_TO_VAR: Record<string, string> = {
  forest: 'var(--forest)',
  sage: 'var(--sage)',
  terracotta: 'var(--terracotta)',
  cream: 'var(--cream)',
  sand: 'var(--sand)',
  moss: 'var(--moss)',
  clay: 'var(--clay)',
  bark: 'var(--bark)',
}

function isNamedToken(v: any): v is keyof typeof TOKEN_TO_VAR {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(TOKEN_TO_VAR, v)
}

// Returns a CSS color value (hex/rgb/oklch) or a var(--token) reference. Returns
// undefined when the input is empty — caller decides whether to fall back.
function resolveColor(v: any): string | undefined {
  if (v === null || v === undefined) return undefined
  if (typeof v !== 'string') return undefined
  const trimmed = v.trim()
  if (trimmed === '') return undefined
  if (isNamedToken(trimmed)) return TOKEN_TO_VAR[trimmed]
  return trimmed
}

export function getIcon(name?: string): LucideIcon {
  if (!name) return (LucideIcons as any).Sprout ?? ImageIcon
  const ic = (LucideIcons as any)[name]
  return (ic as LucideIcon) ?? (LucideIcons as any).Sprout ?? ImageIcon
}

function Inner({ children }: { children: React.ReactNode }) {
  return <div className="max-w-6xl mx-auto px-4 sm:px-6">{children}</div>
}

/* ------------------------------------------------------------------ */
/*  Sub-renderers                                                      */
/* ------------------------------------------------------------------ */

function HeroBlock({ block }: { block: BlockInstance }) {
  const p = block.props
  // Background: keep the old named-token class system for backwards-compat
  // (forest/sage/terracotta/cream/sand). For any other color value (hex/rgb/
  // oklch/named CSS color) use an inline backgroundColor style.
  const bgValue = typeof p.bg === 'string' ? p.bg.trim() : ''
  const bgClass = bgValue && heroBgMap[bgValue] ? heroBgMap[bgValue] : ''
  const bgStyle =
    bgValue && !heroBgMap[bgValue] ? { backgroundColor: bgValue } : undefined
  const textColor = resolveColor(p.textColor)
  const accentColor = resolveColor(p.accentColor)
  const align = p.align === 'center' ? 'items-center text-center' : 'items-start text-left'
  // Typography — applied to headline + subheadline. Hero supports its own
  // set of headline font props (separate from the heading block's).
  const headlineStyle = {
    ...(textColor ? { color: textColor } : null),
    ...buildFontStyle({
      fontFamily: p.headlineFontFamily,
      fontWeight: p.headlineFontWeight,
      fontSize: p.headlineFontSize,
    }),
  }
  const subFs = Number(p.subheadlineFontSize)
  const subheadlineStyle: React.CSSProperties = {
    ...(textColor ? { color: textColor } : null),
    ...(Number.isFinite(subFs) && subFs > 0 ? { fontSize: `${subFs}px` } : null),
  }
  return (
    <section className={cn('w-full py-16 sm:py-24', bgClass)} style={bgStyle}>
      <Inner>
        <div className={cn('flex flex-col gap-5 max-w-3xl', align)}>
          {p.eyebrow && (
            <span
              className="inline-flex items-center gap-2 rounded-full border border-current/20 bg-current/10 px-3 py-1 text-xs font-medium uppercase tracking-wider opacity-80"
              style={textColor ? { color: textColor } : undefined}
            >
              {p.eyebrow}
            </span>
          )}
          {p.headline && (
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-balance leading-[1.05]"
              style={headlineStyle}
            >
              {p.headline}
            </h1>
          )}
          {p.subheadline && (
            <p
              className="text-base sm:text-lg opacity-85 text-balance max-w-2xl"
              style={subheadlineStyle}
            >
              {p.subheadline}
            </p>
          )}
          {(p.ctaPrimary || p.ctaSecondary) && (
            <div className="flex flex-wrap gap-3 mt-2">
              {p.ctaPrimary && (
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className={cn(
                    'inline-flex items-center justify-center rounded-md px-6 py-3 text-sm font-medium shadow-sm transition hover:opacity-90',
                    !accentColor && 'bg-background text-foreground hover:bg-background/90',
                  )}
                  style={accentColor ? { backgroundColor: accentColor } : undefined}
                >
                  {p.ctaPrimary}
                </a>
              )}
              {p.ctaSecondary && (
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className={cn(
                    'inline-flex items-center justify-center rounded-md px-6 py-3 text-sm font-medium border transition hover:opacity-90',
                    !accentColor && 'border-current/30 hover:bg-current/10',
                  )}
                  style={
                    accentColor
                      ? { borderColor: accentColor, color: accentColor }
                      : undefined
                  }
                >
                  {p.ctaSecondary}
                </a>
              )}
            </div>
          )}
        </div>
      </Inner>
    </section>
  )
}

function HeadingBlock({ block }: { block: BlockInstance }) {
  const p = block.props
  const size = headingSizeMap[p.size as string] ?? headingSizeMap.xl
  const color = resolveColor(p.color)
  // Typography — level (h1..h6), fontFamily, fontWeight, fontSize. When
  // fontSize > 0 it overrides the preset size class.
  const Tag = headingTagMap[p.level as string] ?? 'h2'
  const fontStack = buildFontStyle({
    fontFamily: p.fontFamily,
    fontWeight: p.fontWeight,
    fontSize: p.fontSize,
  })
  const headingStyle: React.CSSProperties = {
    ...(color ? { color } : null),
    ...fontStack,
  }
  return (
    <Inner>
      <div className="py-10">
        {p.eyebrow && (
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-accent mb-3">
            {p.eyebrow}
          </div>
        )}
        <Tag
          className={cn('font-semibold tracking-tight', !color && 'text-foreground', size)}
          style={headingStyle}
        >
          {p.text}
        </Tag>
      </div>
    </Inner>
  )
}

function ParagraphBlock({ block }: { block: BlockInstance }) {
  const p = block.props
  const color = resolveColor(p.color)
  // Typography — fontFamily, fontWeight, fontSize.
  const fontStack = buildFontStyle({
    fontFamily: p.fontFamily,
    fontWeight: p.fontWeight,
    fontSize: p.fontSize,
  })
  const style: React.CSSProperties = {
    ...(color ? { color } : null),
    ...fontStack,
  }
  return (
    <Inner>
      <p
        className={cn(
          'py-6 text-base sm:text-lg leading-relaxed max-w-3xl text-balance',
          !color && 'text-foreground/80',
        )}
        style={style}
      >
        {p.text}
      </p>
    </Inner>
  )
}

function ImageBlock({ block }: { block: BlockInstance }) {
  const p = block.props
  const radius = radiusMap[p.radius as string] ?? radiusMap.lg
  return (
    <Inner>
      <figure className="py-8">
        {p.src ? (
          <img
            src={p.src}
            alt={p.alt ?? ''}
            className={cn('w-full h-auto object-cover aspect-video', radius)}
          />
        ) : (
          <div
            className={cn(
              'w-full aspect-video organic-grain bg-muted flex items-center justify-center text-muted-foreground',
              radius,
            )}
          >
            <div className="flex flex-col items-center gap-2 opacity-70">
              <ImageIcon className="size-10" />
              <span className="text-xs uppercase tracking-wider">No image</span>
            </div>
          </div>
        )}
        {p.caption && (
          <figcaption className="mt-3 text-center text-xs text-muted-foreground">
            {p.caption}
          </figcaption>
        )}
      </figure>
    </Inner>
  )
}

function ButtonBlock({ block }: { block: BlockInstance }) {
  const p = block.props
  const v = buttonVariantMap[p.variant as string] ?? buttonVariantMap.primary
  const s = buttonSizeMap[p.size as string] ?? buttonSizeMap.md
  const radius = radiusMap[p.radius as string] ?? 'rounded-md'
  const bgColor = resolveColor(p.bgColor)
  const textColor = resolveColor(p.textColor)
  return (
    <Inner>
      <div className="py-6">
        <a
          href={p.href ?? '#'}
          onClick={(e) => e.preventDefault()}
          className={cn(
            'inline-flex items-center justify-center font-medium transition hover:opacity-90',
            v,
            s,
            radius,
          )}
          style={{
            ...(bgColor ? { backgroundColor: bgColor } : null),
            ...(textColor ? { color: textColor } : null),
          }}
        >
          {p.label}
        </a>
      </div>
    </Inner>
  )
}

function FeaturesBlock({ block }: { block: BlockInstance }) {
  const p = block.props
  const items: any[] = Array.isArray(p.items) ? p.items : []
  return (
    <Inner>
      <section className="py-14">
        <div className="max-w-2xl mb-10">
          {p.title && (
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground text-balance">
              {p.title}
            </h2>
          )}
          {p.subtitle && (
            <p className="mt-3 text-foreground/70 text-balance">{p.subtitle}</p>
          )}
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it, i) => {
            const Icon = getIcon(it?.icon)
            return (
              <div
                key={i}
                className="rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition"
              >
                <div className="size-11 rounded-xl bg-forest/10 text-forest flex items-center justify-center mb-4">
                  <Icon className="size-5" />
                </div>
                <h3 className="font-semibold text-foreground mb-1.5">
                  {it?.title}
                </h3>
                <p className="text-sm text-foreground/70 leading-relaxed">
                  {it?.desc}
                </p>
              </div>
            )
          })}
        </div>
      </section>
    </Inner>
  )
}

function GalleryBlock({ block }: { block: BlockInstance }) {
  const p = block.props
  const cols = Number(p.columns) || 4
  const images: any[] = Array.isArray(p.images) ? p.images : []
  const colClass =
    cols <= 2
      ? 'sm:grid-cols-2'
      : cols === 3
        ? 'sm:grid-cols-3'
        : 'sm:grid-cols-2 lg:grid-cols-4'
  return (
    <Inner>
      <section className="py-12">
        {p.title && (
          <h2 className="text-3xl font-semibold tracking-tight text-foreground mb-8 text-balance">
            {p.title}
          </h2>
        )}
        <div className={cn('grid grid-cols-1 gap-4', colClass)}>
          {images.map((img, i) => (
            <div
              key={i}
              className="aspect-square overflow-hidden rounded-xl bg-muted organic-grain"
            >
              {img?.src ? (
                <img
                  src={img.src}
                  alt={img.alt ?? ''}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground/60">
                  <ImageIcon className="size-8" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </Inner>
  )
}

function TestimonialBlock({ block }: { block: BlockInstance }) {
  const p = block.props
  return (
    <Inner>
      <section className="py-16">
        <figure className="mx-auto max-w-3xl text-center">
          <div className="flex justify-center mb-6">
            <span className="text-5xl text-accent leading-none">&ldquo;</span>
          </div>
          <blockquote className="text-2xl sm:text-3xl font-medium text-foreground leading-snug text-balance">
            {p.quote}
          </blockquote>
          <figcaption className="mt-8 flex flex-col items-center gap-1">
            <span className="font-semibold text-foreground">{p.author}</span>
            <span className="text-sm text-muted-foreground">{p.role}</span>
          </figcaption>
        </figure>
      </section>
    </Inner>
  )
}

function PricingBlock({ block }: { block: BlockInstance }) {
  const p = block.props
  const tiers: any[] = Array.isArray(p.tiers) ? p.tiers : []
  return (
    <Inner>
      <section className="py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          {p.title && (
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground text-balance">
              {p.title}
            </h2>
          )}
          {p.subtitle && (
            <p className="mt-3 text-foreground/70 text-balance">{p.subtitle}</p>
          )}
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {tiers.map((t, i) => {
            const featured = !!t?.featured
            return (
              <div
                key={i}
                className={cn(
                  'relative rounded-2xl border p-6 flex flex-col',
                  featured
                    ? 'border-forest bg-forest text-primary-foreground shadow-lg'
                    : 'border-border bg-card',
                )}
              >
                {featured && (
                  <span className="absolute -top-3 left-6 inline-flex items-center rounded-full bg-accent text-accent-foreground px-3 py-1 text-xs font-medium">
                    Popular
                  </span>
                )}
                <h3 className="text-lg font-semibold">{t?.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-semibold">{t?.price}</span>
                  {t?.period && (
                    <span className={cn('text-sm', featured ? 'opacity-80' : 'text-muted-foreground')}>
                      {t.period}
                    </span>
                  )}
                </div>
                <ul className="mt-6 space-y-2.5 text-sm flex-1">
                  {(Array.isArray(t?.features) ? t.features : []).map((f: any, j: number) => (
                    <li key={j} className={cn('flex items-start gap-2', featured ? 'opacity-90' : 'text-foreground/80')}>
                      <span className="mt-1.5 size-1.5 rounded-full bg-accent shrink-0" />
                      <span>{String(f)}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className={cn(
                    'mt-6 inline-flex items-center justify-center rounded-md px-4 py-2.5 text-sm font-medium transition',
                    featured
                      ? 'bg-background text-foreground hover:bg-background/90'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90',
                  )}
                >
                  {t?.cta}
                </a>
              </div>
            )
          })}
        </div>
      </section>
    </Inner>
  )
}

function TeamBlock({ block }: { block: BlockInstance }) {
  const p = block.props
  const members: any[] = Array.isArray(p.members) ? p.members : []
  return (
    <Inner>
      <section className="py-14">
        {p.title && (
          <h2 className="text-3xl font-semibold tracking-tight text-foreground mb-8 text-balance">
            {p.title}
          </h2>
        )}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5"
            >
              <div className="size-14 rounded-full bg-forest/10 text-forest flex items-center justify-center text-lg font-semibold shrink-0">
                {(m?.initial as string) || (m?.name as string)?.[0] || '?'}
              </div>
              <div>
                <div className="font-semibold text-foreground">{m?.name}</div>
                <div className="text-sm text-muted-foreground">{m?.role}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </Inner>
  )
}

function CtaBlock({ block }: { block: BlockInstance }) {
  const p = block.props
  return (
    <section className="py-16">
      <Inner>
        <div className="rounded-3xl bg-forest text-primary-foreground px-6 sm:px-12 py-12 sm:py-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 organic-grain opacity-30 pointer-events-none" />
          <div className="relative">
            {p.headline && (
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-balance max-w-2xl mx-auto">
                {p.headline}
              </h2>
            )}
            {p.subheadline && (
              <p className="mt-3 opacity-85 max-w-xl mx-auto text-balance">
                {p.subheadline}
              </p>
            )}
            {p.ctaPrimary && (
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="mt-8 inline-flex items-center justify-center rounded-md bg-background text-foreground px-6 py-3 text-sm font-medium hover:bg-background/90 transition"
              >
                {p.ctaPrimary}
              </a>
            )}
          </div>
        </div>
      </Inner>
    </section>
  )
}

function StatsBlock({ block }: { block: BlockInstance }) {
  const p = block.props
  const stats: any[] = Array.isArray(p.stats) ? p.stats : []
  return (
    <section className="border-y border-border bg-sand/40">
      <Inner>
        <div className="py-12 grid grid-cols-2 sm:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-4xl sm:text-5xl font-semibold text-forest tracking-tight">
                {s?.value}
              </div>
              <div className="mt-1.5 text-sm text-muted-foreground">{s?.label}</div>
            </div>
          ))}
        </div>
      </Inner>
    </section>
  )
}

function ContactBlock({ block }: { block: BlockInstance }) {
  const p = block.props
  return (
    <Inner>
      <section className="py-16 grid gap-10 md:grid-cols-2">
        <div>
          {p.title && (
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground mb-6">
              {p.title}
            </h2>
          )}
          <ul className="space-y-4 text-sm">
            {p.email && (
              <li className="flex items-center gap-3">
                <span className="size-9 rounded-lg bg-forest/10 text-forest flex items-center justify-center">
                  <LucideIcons.Mail className="size-4" />
                </span>
                <a href={`mailto:${p.email}`} className="hover:underline">
                  {p.email}
                </a>
              </li>
            )}
            {p.phone && (
              <li className="flex items-center gap-3">
                <span className="size-9 rounded-lg bg-forest/10 text-forest flex items-center justify-center">
                  <LucideIcons.Phone className="size-4" />
                </span>
                <span>{p.phone}</span>
              </li>
            )}
            {p.address && (
              <li className="flex items-center gap-3">
                <span className="size-9 rounded-lg bg-forest/10 text-forest flex items-center justify-center">
                  <LucideIcons.MapPin className="size-4" />
                </span>
                <span>{p.address}</span>
              </li>
            )}
          </ul>
        </div>
        <form
          onSubmit={(e) => e.preventDefault()}
          className="rounded-2xl border border-border bg-card p-6 space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Name"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            />
            <input
              type="email"
              placeholder="Email"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <textarea
            placeholder="Your message"
            className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="h-10 w-full rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
          >
            Send message
          </button>
        </form>
      </section>
    </Inner>
  )
}

function NewsletterBlock({ block }: { block: BlockInstance }) {
  const p = block.props
  return (
    <Inner>
      <section className="py-14">
        <div className="rounded-3xl border border-border bg-cream/60 px-6 py-10 sm:py-12 text-center">
          {p.headline && (
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground text-balance">
              {p.headline}
            </h2>
          )}
          {p.subheadline && (
            <p className="mt-2 text-foreground/70 max-w-xl mx-auto text-balance">
              {p.subheadline}
            </p>
          )}
          <form
            onSubmit={(e) => e.preventDefault()}
            className="mt-6 flex flex-col sm:flex-row gap-2 max-w-md mx-auto"
          >
            <input
              type="email"
              placeholder="you@studio.com"
              className="h-11 flex-1 rounded-md border border-input bg-background px-3 text-sm"
            />
            <button
              type="submit"
              className="h-11 rounded-md bg-primary text-primary-foreground px-5 text-sm font-medium hover:bg-primary/90"
            >
              {p.cta || 'Subscribe'}
            </button>
          </form>
        </div>
      </section>
    </Inner>
  )
}

function FaqBlock({ block }: { block: BlockInstance }) {
  const p = block.props
  const items: any[] = Array.isArray(p.items) ? p.items : []
  return (
    <Inner>
      <section className="py-16">
        <div className="max-w-3xl mx-auto">
          {p.title && (
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground mb-8 text-center text-balance">
              {p.title}
            </h2>
          )}
          <div className="divide-y divide-border rounded-2xl border border-border bg-card overflow-hidden">
            {items.map((it, i) => (
              <details key={i} className="group p-5">
                <summary className="flex items-center justify-between cursor-pointer list-none gap-4">
                  <span className="font-medium text-foreground">{it?.q}</span>
                  <span className="size-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm group-open:rotate-45 transition-transform">
                    <Plus className="size-3.5" />
                  </span>
                </summary>
                <p className="mt-3 text-sm text-foreground/70 leading-relaxed pr-10">
                  {it?.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </Inner>
  )
}

function LogosBlock({ block }: { block: BlockInstance }) {
  const p = block.props
  const names: any[] = Array.isArray(p.names) ? p.names : []
  return (
    <Inner>
      <section className="py-12">
        {p.title && (
          <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground mb-6">
            {p.title}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {names.map((n, i) => (
            <span
              key={i}
              className="text-lg sm:text-xl font-semibold text-foreground/40 tracking-tight"
            >
              {String(n)}
            </span>
          ))}
        </div>
      </section>
    </Inner>
  )
}

function FooterBlock({ block }: { block: BlockInstance }) {
  const p = block.props
  const columns: any[] = Array.isArray(p.columns) ? p.columns : []
  return (
    <footer className="border-t border-border bg-bark text-cream/90">
      <Inner>
        <div className="py-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <span className="size-8 rounded-full bg-forest flex items-center justify-center text-primary-foreground">
                <LucideIcons.Sprout className="size-4" />
              </span>
              <span className="font-semibold text-cream">VirtuaLab Digital</span>
            </div>
            <p className="text-sm text-cream/70 max-w-xs">{p.tagline}</p>
          </div>
          {columns.map((c, i) => (
            <div key={i}>
              <h4 className="font-medium text-cream mb-3">{c?.heading}</h4>
              <ul className="space-y-2 text-sm">
                {(Array.isArray(c?.links) ? c.links : []).map((l: any, j: number) => (
                  <li key={j}>
                    <a
                      href="#"
                      onClick={(e) => e.preventDefault()}
                      className="text-cream/70 hover:text-cream transition"
                    >
                      {String(l)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-cream/10 py-6 text-xs text-cream/60">
          {p.copyright}
        </div>
      </Inner>
    </footer>
  )
}

function SpacerBlock({ block }: { block: BlockInstance }) {
  const h = Number(block.props.height) || 64
  return <div style={{ height: `${h}px` }} aria-hidden />
}

function DividerBlock({ block }: { block: BlockInstance }) {
  const p = block.props
  // Backwards-compat: old `color` was a named token ('border'|'forest'|'sage'|
  // 'terracotta'|'sand') that mapped to a Tailwind border-color class. New
  // blocks store an arbitrary CSS color (hex/rgb/oklch/named). If it's a known
  // token, keep the class system; otherwise use inline borderColor.
  const colorValue = typeof p.color === 'string' ? p.color.trim() : ''
  const colorClass = colorValue && dividerColorMap[colorValue] ? dividerColorMap[colorValue] : ''
  const colorStyle =
    colorValue && !dividerColorMap[colorValue] ? { borderColor: colorValue } : undefined
  return (
    <Inner>
      <hr className={cn('my-6 border-t', colorClass)} style={colorStyle} />
    </Inner>
  )
}

/* ------------------------------------------------------------------ */
/*  BlockRenderer                                                      */
/* ------------------------------------------------------------------ */

function renderInner(block: BlockInstance) {
  switch (block.type) {
    case 'hero': return <HeroBlock block={block} />
    case 'heading': return <HeadingBlock block={block} />
    case 'paragraph': return <ParagraphBlock block={block} />
    case 'image': return <ImageBlock block={block} />
    case 'button': return <ButtonBlock block={block} />
    case 'features': return <FeaturesBlock block={block} />
    case 'gallery': return <GalleryBlock block={block} />
    case 'testimonial': return <TestimonialBlock block={block} />
    case 'pricing': return <PricingBlock block={block} />
    case 'team': return <TeamBlock block={block} />
    case 'cta': return <CtaBlock block={block} />
    case 'stats': return <StatsBlock block={block} />
    case 'contact': return <ContactBlock block={block} />
    case 'newsletter': return <NewsletterBlock block={block} />
    case 'faq': return <FaqBlock block={block} />
    case 'logos': return <LogosBlock block={block} />
    case 'footer': return <FooterBlock block={block} />
    case 'spacer': return <SpacerBlock block={block} />
    case 'divider': return <DividerBlock block={block} />
    default: return null
  }
}

export function BlockRenderer({
  block,
  selected,
  onSelect,
  onChange,
}: {
  block: BlockInstance
  selected?: boolean
  onSelect?: () => void
  onChange?: (props: Record<string, any>) => void
}) {
  const def = BLOCK_LOOKUP[block.type]
  const label = def?.label ?? block.type
  const isEditable = !!onSelect
  const Icon = def?.icon

  // onChange is for future inline editing
  void onChange

  // Effects — common to every block. The user picks a scroll-into-view
  // animation + a hover effect via the EFFECTS section in the properties
  // panel. Stored on the block's props object.
  const effect: string | undefined = block.props?.effect
  const hoverEffect: string | undefined = block.props?.hoverEffect
  const motionVariant = getMotionVariant(effect)
  const hoverClass = HOVER_CLASS[hoverEffect ?? 'none'] ?? ''

  const content = renderInner(block)

  // Wrap the block content in a motion.div so the scroll-into-view animation
  // plays whenever the block enters the viewport (once per page load). When
  // no animation is set, fall back to a plain div so we don't pay the
  // framer-motion cost.
  const animated =
    motionVariant !== null ? (
      <motion.div
        variants={motionVariant}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className={cn('block-render', hoverClass)}
      >
        {content}
      </motion.div>
    ) : (
      <div className={cn('block-render', hoverClass)}>{content}</div>
    )

  if (!isEditable) {
    return animated
  }

  return (
    <div
      className={cn(
        'relative group/block transition outline-none',
        selected ? 'z-10' : 'z-0',
      )}
      onClick={(e) => {
        e.stopPropagation()
        onSelect?.()
      }}
    >
      <div
        className={cn(
          'absolute inset-0 pointer-events-none transition-all rounded-[2px]',
          selected
            ? 'ring-2 ring-primary'
            : 'group-hover/block:ring-1 group-hover/block:ring-primary/40',
        )}
      />
      {selected && (
        <div className="absolute -top-7 left-0 z-20 pointer-events-auto flex items-center gap-1">
          <span className="inline-flex items-center gap-1 rounded-md bg-primary text-primary-foreground px-2 py-0.5 text-xs font-medium shadow-sm">
            {Icon ? <Icon className="size-3" /> : null}
            {label}
          </span>
        </div>
      )}
      {animated}
    </div>
  )
}
