'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Sprout,
  Leaf,
  MousePointerClick,
  Sparkles,
  Globe,
  Plug,
  Shield,
  ArrowRight,
  Moon,
  Sun,
  Menu,
  Check,
  Star,
  Briefcase,
  Search,
  Wrench,
  Code2,
  PenLine,
  Workflow,
  Store,
  Server,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { cn } from '@/lib/utils'
import { fetchJson } from '@/lib/client-utils'

/* ------------------------------------------------------------------ */


interface AgencyData {
  agency: {
    name: string
    mainUrl: string
    mainDomain: string
    subdomainLabel: string
    isSubdomain: boolean
    mainSiteConnectionName: string
  }
}

// Map a service pillar id to a relevant Lucide icon (per task spec).
const PILLAR_ICONS: Record<string, typeof Briefcase> = {
  'strategy': Briefcase,
  'ai-seo': Search,
  'technical-seo': Wrench,
  'web-dev': Code2,
  'content': PenLine,
  'marketing-ops': Workflow,
}

interface ServicePillar {
  id: string
  label: string
  blurb: string
  relatedCapabilities: string[]
  aiHint: string
}

function Nav({ onOpenMenu }: { onOpenMenu?: () => void }) {
  const setView = useAppStore((s) => s.setView)
  const theme = useAppStore((s) => s.theme)
  const toggleTheme = useAppStore((s) => s.toggleTheme)

  const agencyQuery = useQuery<AgencyData>({
    queryKey: ['agency'],
    queryFn: () => fetchJson('/api/agency'),
  })
  const agency = agencyQuery.data?.agency

  return (
    <header className="sticky top-0 z-40 glass-organic border-b border-border/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
        <button
          type="button"
          className="flex items-center gap-2"
          onClick={() => setView({ name: 'landing' })}
          aria-label="Sage by VirtuaLab Digital home"
        >
          <span className="size-8 rounded-full bg-forest text-primary-foreground flex items-center justify-center">
            <Sprout className="size-4" />
          </span>
          <span className="font-semibold text-foreground">Sage</span>
        </button>

        {agency?.name && (
          <span className="hidden sm:inline-block text-xs text-muted-foreground truncate max-w-[18rem]">
            a sub-domain offering by {agency.name}
          </span>
        )}

        <nav className="hidden sm:flex items-center gap-6 ml-6 text-sm">
          <a href="#product" className="text-foreground/70 hover:text-foreground transition">Product</a>
          <a href="#templates" className="text-foreground/70 hover:text-foreground transition">Templates</a>
          <a href="#pricing" className="text-foreground/70 hover:text-foreground transition">Pricing</a>
        </nav>

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="size-9"
        >
          {theme === 'light' ? <Moon className="size-4" /> : <Sun className="size-4" />}
        </Button>

        {onOpenMenu && (
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden"
            onClick={onOpenMenu}
            aria-label="Open menu"
          >
            <Menu className="size-4" />
          </Button>
        )}

        <Button
          size="sm"
          className="hidden sm:inline-flex bg-forest text-primary-foreground hover:bg-forest/90"
          onClick={() => setView({ name: 'dashboard' })}
        >
          Sign in / Open app
        </Button>
      </div>
    </header>
  )
}

/* ------------------------------------------------------------------ */

const features = [
  { icon: MousePointerClick, title: 'Drag & drop canvas', desc: 'Move blocks anywhere. Live preview. No code, ever.' },
  { icon: Leaf, title: 'Organic themes', desc: 'Earth-toned palettes tuned for makers, growers & small studios.' },
  { icon: Sparkles, title: 'AI copy assistant', desc: 'Generate honest, on-brand copy in one click.' },
  { icon: Plug, title: 'Quiet integrations', desc: 'Forms, analytics, email — the few tools that earn their keep.' },
  { icon: Globe, title: 'Custom domains', desc: 'Connect your own domain or use a free subdomain.' },
  {
    icon: Shield,
    title: 'No paid ads, ever',
    desc: 'Agencies drain small businesses with ad spend and retainers. We don\u2019t. Every tool here is built for organic, local growth — search, GMB, word of mouth, content.',
  },
]

const logoCloud = ['Hollow Field', 'Slow Goods', 'Field & Co', 'Mossworks', 'North Yard', 'Orchard']

const stats = [
  { value: '12k+', label: 'Sites published' },
  { value: '98%', label: 'Avg. Lighthouse' },
  { value: '0', label: 'Paid ads run' },
  { value: '24/7', label: 'Uptime' },
]

const pricing = [
  {
    name: 'Seed',
    price: 'Free',
    period: 'forever',
    features: ['1 site', 'Organic themes', 'Free subdomain', 'Self-host on your own VPS — free forever.', 'Community support'],
    cta: 'Start free',
    featured: false,
    selfHostable: true,
  },
  {
    name: 'Sprout',
    price: '$19',
    period: '/mo',
    features: ['10 sites', 'Custom domain', 'AI copy assistant', 'Basic analytics'],
    cta: 'Choose Sprout',
    featured: true,
    selfHostable: false,
  },
  {
    name: 'Grove',
    price: '$49',
    period: '/mo',
    features: ['Unlimited sites', 'Team seats', 'All integrations', 'Priority support'],
    cta: 'Choose Grove',
    featured: false,
    selfHostable: false,
  },
]

const faqs = [
  { q: 'Is it really no-code?', a: 'Yes. Drag blocks, edit text, publish. No developer required.' },
  { q: 'Do you run paid ads?', a: 'Never. Growth comes from organic search and word of mouth — no advertising.' },
  { q: 'Can I use my own domain?', a: 'On Sprout and above, yes. Connect any domain in minutes.' },
  { q: 'What are the themes like?', a: 'All earth-toned and organic — forest greens, sage, terracotta, cream. Calm by default.' },
]

/* ------------------------------------------------------------------ */

export function LandingView() {
  const setView = useAppStore((s) => s.setView)

  // Service pillars — fetched from /api/capabilities. Used to render the
  // "Built for the work that matters" section before pricing. Falls back
  // to nothing if the fetch fails (the section simply isn't shown).
  const capabilitiesQuery = useQuery<{ pillars: ServicePillar[] }>({
    queryKey: ['capabilities'],
    queryFn: () => fetchJson('/api/capabilities'),
  })
  const pillars = capabilitiesQuery.data?.pillars ?? []

  // Parent agency — fetched from /api/agency. Used to brand the builder as a
  // sub-domain offering (nav line, footer line, hero badge) and to link out
  // to the main agency website.
  const agencyQuery = useQuery<AgencyData>({
    queryKey: ['agency'],
    queryFn: () => fetchJson('/api/agency'),
  })
  const agency = agencyQuery.data?.agency

  return (
    <div className="organic-bg min-h-screen flex flex-col">
      <Nav />

      {/* Hero */}
      <section className="relative px-4 sm:px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="max-w-3xl"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-forest/30 bg-forest/10 text-forest px-3 py-1 text-xs font-medium uppercase tracking-wider">
                <Leaf className="size-3.5" />
                Organic & homegrown
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-terracotta/30 bg-terracotta/10 text-accent px-3 py-1 text-xs font-medium uppercase tracking-wider">
                <Store className="size-3.5" />
                For small businesses
              </span>
              {agency?.isSubdomain && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-sage/40 bg-sage/20 text-forest px-2.5 py-1 text-[11px] font-medium">
                  Sub-domain offering
                </span>
              )}
            </div>
            <h1 className="mt-5 text-4xl sm:text-6xl lg:text-7xl font-semibold tracking-tight text-foreground text-balance leading-[1.04]">
              Grow your corner of the web,
              <span className="block text-forest">the natural way.</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-foreground/70 max-w-2xl text-balance">
              A no-code website builder for small businesses drained by agencies. Honest tools,
              organic growth, zero ad spend — built for tradespeople and local services, not
              marketers.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                size="lg"
                className="bg-forest text-primary-foreground hover:bg-forest/90"
                onClick={() => setView({ name: 'dashboard' })}
              >
                Start building <ArrowRight className="size-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setView({ name: 'templates' })}
              >
                See templates
              </Button>
            </div>
            <div className="mt-6 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Check className="size-3.5 text-forest" /> Free forever plan</span>
              <span className="flex items-center gap-1.5"><Check className="size-3.5 text-forest" /> No credit card</span>
              <span className="flex items-center gap-1.5"><Check className="size-3.5 text-forest" /> No paid ads</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Logo cloud */}
      <section className="py-10 border-y border-border bg-cream/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground mb-6">
            Trusted by quiet makers everywhere
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {logoCloud.map((name, i) => (
              <span
                key={i}
                className="text-lg sm:text-xl font-semibold text-foreground/40 tracking-tight"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="product" className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight text-foreground text-balance">
              A small, sharp toolkit
            </h2>
            <p className="mt-3 text-foreground/70 text-balance">
              Only the tools that earn their keep. Nothing you don&rsquo;t.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => {
              const Icon = f.icon
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  className="rounded-2xl border border-border bg-card p-6 hover:shadow-md transition"
                >
                  <div className="size-11 rounded-xl bg-forest/10 text-forest flex items-center justify-center mb-4">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1.5">{f.title}</h3>
                  <p className="text-sm text-foreground/70 leading-relaxed">{f.desc}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Stats band */}
      <section className="border-y border-border bg-sand/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-2 sm:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-4xl sm:text-5xl font-semibold text-forest tracking-tight">
                {s.value}
              </div>
              <div className="mt-1.5 text-sm text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex justify-center mb-4 text-accent">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="size-5 fill-accent" />
            ))}
          </div>
          <blockquote className="text-2xl sm:text-3xl font-medium text-foreground leading-snug text-balance">
            &ldquo;We replaced three tools with this one. Our site loads faster, reads warmer, and we
            haven&rsquo;t touched a line of code.&rdquo;
          </blockquote>
          <div className="mt-6 flex flex-col items-center gap-1">
            <span className="font-semibold text-foreground">Mara Olsen</span>
            <span className="text-sm text-muted-foreground">Founder, Hollow Field Farm</span>
          </div>
        </div>
      </section>

      {/* Service Pillars — six pillars for small businesses */}
      {pillars.length > 0 && (
        <section className="py-20 px-4 sm:px-6 border-t border-border">
          <div className="max-w-6xl mx-auto">
            <div className="max-w-2xl mx-auto text-center mb-12">
              <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight text-foreground text-balance">
                Built for the work that matters
              </h2>
              <p className="mt-3 text-foreground/70 text-balance">
                Six service pillars for small businesses — honest, organic, no agency bloat.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {pillars.map((p, i) => {
                const Icon = PILLAR_ICONS[p.id] ?? Briefcase
                const caps = (p.relatedCapabilities ?? []).slice(0, 4)
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.3, delay: i * 0.04 }}
                    className={cn(
                      'rounded-2xl border border-forest/25 bg-forest/5 p-6',
                      'hover:border-forest/40 hover:bg-forest/10 transition-colors',
                    )}
                  >
                    <div className="size-11 rounded-xl bg-forest/15 text-forest flex items-center justify-center mb-4">
                      <Icon className="size-5" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1.5">{p.label}</h3>
                    <p className="text-sm text-foreground/70 leading-relaxed mb-3">
                      {p.blurb}
                    </p>
                    {caps.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {caps.map((c) => (
                          <span
                            key={c}
                            className="inline-flex items-center rounded-full border border-forest/30 bg-forest/5 px-2 py-0.5 text-[11px] text-forest/80"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* Pricing preview */}
      <section id="pricing" className="py-20 px-4 sm:px-6 border-t border-border bg-cream/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight text-foreground text-balance">
              Simple, honest pricing
            </h2>
            <p className="mt-3 text-foreground/70 text-balance">
              No hidden fees. No paid traffic. Cancel anytime.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {pricing.map((t) => (
              <div
                key={t.name}
                className={cn(
                  'relative rounded-2xl border p-6 flex flex-col',
                  t.featured
                    ? 'border-forest bg-forest text-primary-foreground shadow-lg'
                    : 'border-border bg-card',
                )}
              >
                {t.featured && (
                  <span className="absolute -top-3 left-6 inline-flex items-center rounded-full bg-accent text-accent-foreground px-3 py-1 text-xs font-medium">
                    Popular
                  </span>
                )}
                {t.selfHostable && !t.featured && (
                  <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full border border-forest/40 bg-forest/10 text-forest px-3 py-1 text-xs font-medium">
                    <Server className="size-3" /> Self-hostable
                  </span>
                )}
                <h3 className="text-lg font-semibold">{t.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-semibold">{t.price}</span>
                  <span className={cn('text-sm', t.featured ? 'opacity-80' : 'text-muted-foreground')}>
                    {t.period}
                  </span>
                </div>
                <ul className="mt-6 space-y-2.5 text-sm flex-1">
                  {t.features.map((f) => (
                    <li
                      key={f}
                      className={cn('flex items-start gap-2', t.featured ? 'opacity-90' : 'text-foreground/80')}
                    >
                      <Check className="mt-0.5 size-3.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                {t.selfHostable && !t.featured && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-4 w-full border-forest/40 text-forest hover:bg-forest/10"
                    onClick={() => setView({ name: 'self-host' })}
                  >
                    <Server className="size-3.5" /> Self-host guide
                  </Button>
                )}
                <Button
                  variant={t.featured ? 'secondary' : 'default'}
                  className={cn(
                    'mt-3 w-full',
                    t.featured && 'bg-background text-foreground hover:bg-background/90',
                  )}
                  onClick={() => setView({ name: 'dashboard' })}
                >
                  {t.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight text-foreground text-center mb-8 text-balance">
            Questions, answered
          </h2>
          <Accordion
            type="single"
            collapsible
            className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border"
          >
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="px-5">
                <AccordionTrigger className="text-base font-medium text-foreground hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-foreground/70 leading-relaxed">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Templates teaser */}
      <section className="px-4 sm:px-6 pb-8">
        <div className="max-w-6xl mx-auto rounded-3xl border border-border bg-cream/40 px-6 sm:px-10 py-10 sm:py-12 grid md:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground text-balance">
              Start from a quiet, well-tuned template
            </h2>
            <p className="mt-2 text-foreground/70 max-w-2xl text-balance">
              Organic themes built for makers, growers, and small studios. Pick one and make it yours in minutes.
            </p>
          </div>
          <Button
            size="lg"
            variant="outline"
            className="border-forest/40 text-forest hover:bg-forest/10"
            onClick={() => setView({ name: 'templates' })}
          >
            Browse templates <ArrowRight className="size-4" />
          </Button>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 sm:px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-3xl bg-forest text-primary-foreground px-6 sm:px-12 py-12 sm:py-16 text-center relative overflow-hidden">
            <div className="absolute inset-0 organic-grain opacity-30 pointer-events-none" />
            <div className="relative">
              <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight text-balance">
                Ready to plant your first page?
              </h2>
              <p className="mt-3 opacity-85 max-w-xl mx-auto text-balance">
                Build, preview, and publish in minutes. No credit card to start.
              </p>
              <Button
                size="lg"
                className="mt-8 bg-background text-foreground hover:bg-background/90"
                onClick={() => setView({ name: 'dashboard' })}
              >
                Start free <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border bg-bark text-cream/90">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="size-8 rounded-full bg-forest flex items-center justify-center text-primary-foreground">
                <Sprout className="size-4" />
              </span>
              <span className="font-semibold text-cream">Sage</span>
            </div>
            <p className="text-sm text-cream/70 max-w-xs">
              Grown locally. Built honestly. No paid ads, ever.
            </p>
            {agency?.name && (
              <p className="mt-3 text-xs text-cream/70">
                VirtuaLab Digital is the self-serve builder by {agency.name}.
                {agency.mainUrl && (
                  <a
                    href={agency.mainUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 inline-flex items-center gap-1 text-cream hover:text-cream underline underline-offset-2"
                  >
                    Visit the main website <ArrowRight className="size-3" />
                  </a>
                )}
              </p>
            )}
          </div>
          <div>
            <h4 className="font-medium text-cream mb-3">Product</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#product" className="text-cream/70 hover:text-cream transition">Builder</a></li>
              <li><a href="#templates" className="text-cream/70 hover:text-cream transition">Templates</a></li>
              <li><a href="#pricing" className="text-cream/70 hover:text-cream transition">Pricing</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-cream mb-3">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-cream/70 hover:text-cream transition">About</a></li>
              <li><a href="#" className="text-cream/70 hover:text-cream transition">Field notes</a></li>
              <li><a href="#" className="text-cream/70 hover:text-cream transition">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-cream mb-3">Resources</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-cream/70 hover:text-cream transition">Docs</a></li>
              <li><a href="#" className="text-cream/70 hover:text-cream transition">Community</a></li>
              <li><a href="#" className="text-cream/70 hover:text-cream transition">Status</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-cream/10 py-6 text-center text-xs text-cream/60">
          © 2025 VirtuaLab Digital. Rooted in honest work.
        </div>
      </footer>
    </div>
  )
}
