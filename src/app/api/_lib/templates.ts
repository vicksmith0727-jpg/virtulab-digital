// Shared API helpers for parsing blocks and building template seeds.
// This file is API-only and is not consumed by client components.
import { DEMO_PAGE_BLOCKS } from '@/lib/seed'
import { BLOCK_LOOKUP } from '@/lib/blocks'

export type BlockInstance = {
  id: string
  type: string
  props: Record<string, unknown>
}

export function parseBlocks<T = unknown>(raw: string | null | undefined): T[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

function findBlock<T extends { type: string }>(blocks: T[], type: string): T | undefined {
  return blocks.find((b) => b.type === type)
}

// Build a fresh block instance from BLOCK_DEFS defaults (used when DEMO_PAGE_BLOCKS
// doesn't include a particular block type — e.g. `contact` isn't in the demo page).
function freshBlock(type: string, overrides: Record<string, unknown> = {}): BlockInstance {
  const def = BLOCK_LOOKUP[type]
  const props = { ...(def?.defaults ?? {}), ...overrides }
  return {
    id: `${type}-tpl-${Math.random().toString(36).slice(2, 8)}`,
    type,
    props,
  }
}

// Compose is shared by buildTemplateSeeds() and localBusinessTemplates().
function compose(blocks: (BlockInstance | undefined)[]): BlockInstance[] {
  return blocks.filter((b): b is BlockInstance => Boolean(b))
}

// Shared block lookups used by both buildTemplateSeeds() and localBusinessTemplates().
// Hoisted to module scope so both functions can access them.
const _base = (DEMO_PAGE_BLOCKS as unknown as BlockInstance[])
const _hero = findBlock(_base, 'hero')
const _logos = findBlock(_base, 'logos')
const _features = findBlock(_base, 'features')
const _stats = findBlock(_base, 'stats')
const _testimonial = findBlock(_base, 'testimonial')
const _pricing = findBlock(_base, 'pricing')
const _faq = findBlock(_base, 'faq')
const _cta = findBlock(_base, 'cta')
const _footer = findBlock(_base, 'footer')
// `contact` isn't in DEMO_PAGE_BLOCKS — synthesize from defaults.
const _contact = freshBlock('contact')

// Build the 6 starter templates by composing DEMO_PAGE_BLOCKS in different orders/combos.
export function buildTemplateSeeds() {
  const hero = _hero
  const logos = _logos
  const features = _features
  const stats = _stats
  const testimonial = _testimonial
  const pricing = _pricing
  const faq = _faq
  const cta = _cta
  const footer = _footer
  const contact = _contact

  return [
    {
      name: 'Organic Storefront',
      category: 'organic',
      description: 'A warm storefront for makers, growers, and small CPG brands.',
      blocks: compose([hero, logos, features, stats, testimonial, cta, footer]),
    },
    {
      name: 'Studio Site',
      category: 'studio',
      description: 'A clean studio site — work, team, and contact in one page.',
      blocks: compose([
        { ...hero, props: { ...hero?.props, headline: 'A small studio with a long view' } },
        features,
        testimonial,
        cta,
        footer,
      ]),
    },
    {
      name: 'Farm Stand',
      category: 'farm',
      description: 'Down-to-earth farm stand with FAQ and newsletter signup.',
      blocks: compose([
        { ...hero, props: { ...hero?.props, headline: 'Grown down the road, picked this morning' } },
        features,
        faq,
        stats,
        footer,
      ]),
    },
    {
      name: 'Personal Portfolio',
      category: 'portfolio',
      description: 'A focused personal portfolio for designers and writers.',
      blocks: compose([
        { ...hero, props: { ...hero?.props, headline: 'Hi, I make things slowly' } },
        testimonial,
        cta,
        footer,
      ]),
    },
    {
      name: 'Cafe Menu',
      category: 'cafe',
      description: 'Cafe site with menu pricing and FAQ.',
      blocks: compose([
        { ...hero, props: { ...hero?.props, headline: 'Slow coffee, warm bread' } },
        features,
        pricing,
        faq,
        footer,
      ]),
    },
    {
      name: 'Nonprofit',
      category: 'nonprofit',
      description: 'Nonprofit landing page with stats, story, and call to action.',
      blocks: compose([
        { ...hero, props: { ...hero?.props, headline: 'Small acts, deep roots' } },
        stats,
        features,
        testimonial,
        cta,
        footer,
      ]),
    },

    // ---------------------------------------------------------------- Local business templates
    {
      name: 'Pest Control',
      category: 'pest-control',
      description: 'Pest control service site — emergency hero, services, guarantee, reviews, and same-day CTA.',
      blocks: compose([
        {
          ...hero,
          props: {
            ...hero?.props,
            eyebrow: 'Licensed & insured · Same-day service',
            headline: 'Bugs gone by bedtime. Guaranteed.',
            subheadline: 'Family-friendly pest control for homes and businesses. Free inspection, honest pricing, no long-term contracts.',
            ctaPrimary: 'Call (555) 010-BUGS',
            ctaSecondary: 'Book free inspection',
            bg: 'forest',
          },
        },
        {
          ...features,
          props: {
            title: 'What we handle',
            subtitle: 'Common pests, uncommon results.',
            items: [
              { icon: 'Bug', title: 'Ants & roaches', desc: 'Interior + exterior treatment that lasts.' },
              { icon: 'Rat', title: 'Rodents', desc: 'Traps, exclusion, and attic clean-up.' },
              { icon: 'Spider', title: 'Spiders & scorpions', desc: 'Web sweep + barrier spray.' },
              { icon: 'ShieldCheck', title: 'Termite monitoring', desc: 'Annual inspections + bait systems.' },
            ],
          },
        },
        { ...stats, props: { stats: [
          { value: '24/7', label: 'Emergency line' },
          { value: '12k+', label: 'Homes treated' },
          { value: '4.9★', label: 'Avg. rating' },
          { value: '100%', label: 'Satisfaction guarantee' },
        ] } },
        { ...testimonial, props: { quote: 'Called at 9pm, they were at my door by 10. Ants gone by morning. Worth every penny.', author: 'Dana R.', role: 'Homeowner, Akron OH' } },
        { ...faq, props: { title: 'Pest control FAQ', items: [
          { q: 'Are your treatments safe around kids and pets?', a: 'Yes. We use EPA-approved, low-toxicity products and targeted application — not blanket spraying.' },
          { q: 'How often do you come out?', a: 'Quarterly for most homes. One-time treatments available for one-off issues.' },
          { q: 'What if the pests come back?', a: 'We re-treat for free between scheduled visits. No questions asked.' },
        ] } },
        { ...contact, props: { title: 'Call or text us', email: 'service@bugfree.local', phone: '(555) 010-2847', address: 'Service area: Greater Akron & suburbs' } },
        { ...cta, props: { headline: 'Pest problem? Let’s fix it today.', subheadline: 'Free inspection. Same-day service available.', ctaPrimary: 'Book online' } },
        footer,
      ]),
    },
    {
      name: 'HVAC',
      category: 'hvac',
      description: 'HVAC contractor site — comfort hero, services (heating/cooling/indoor air), financing, reviews, 24/7 CTA.',
      blocks: compose([
        {
          ...hero,
          props: {
            ...hero?.props,
            eyebrow: 'Heating · Cooling · Indoor air',
            headline: 'Comfort that runs quietly in the background.',
            subheadline: 'NATE-certified technicians, upfront pricing, and a 10-year parts warranty. We install, service, and repair every major brand.',
            ctaPrimary: 'Schedule service',
            ctaSecondary: 'Get a free estimate',
            bg: 'terracotta',
          },
        },
        {
          ...features,
          props: {
            title: 'Services',
            subtitle: 'Year-round comfort, one phone call away.',
            items: [
              { icon: 'Flame', title: 'Heating', desc: 'Furnace + heat pump repair, install, and tune-ups.' },
              { icon: 'Snowflake', title: 'Cooling', desc: 'AC + mini-split service and replacement.' },
              { icon: 'Wind', title: 'Indoor air quality', desc: 'Filtration, humidifiers, and duct cleaning.' },
              { icon: 'Wrench', title: 'Maintenance plans', desc: 'Annual tune-ups + priority service.' },
            ],
          },
        },
        { ...stats, props: { stats: [
          { value: '25yr', label: 'In business' },
          { value: '30k+', label: 'Service calls' },
          { value: 'NATE', label: 'Certified techs' },
          { value: '10yr', label: 'Parts warranty' },
        ] } },
        { ...testimonial, props: { quote: 'Furnace died on the coldest day of the year. They had a new one installed by midnight. Lifesavers.', author: 'Greg M.', role: 'Homeowner, suburban Chicago' } },
        { ...pricing, props: {
          title: 'Maintenance plans',
          subtitle: 'Pay one flat fee. Skip the emergency calls.',
          tiers: [
            { name: 'Basic', price: '$12', period: '/mo', features: ['Annual tune-up', '15-point inspection', '10% off repairs', 'Priority booking'], cta: 'Choose Basic', featured: false },
            { name: 'Comfort', price: '$19', period: '/mo', features: ['2 tune-ups/yr', '20-point inspection', '15% off repairs', 'Priority + after-hours', 'Filter replacement'], cta: 'Choose Comfort', featured: true },
            { name: 'Total', price: '$29', period: '/mo', features: ['Unlimited tune-ups', 'Full inspection', '20% off repairs', '24/7 priority', 'Free filters + labor'], cta: 'Choose Total', featured: false },
          ],
        } },
        { ...faq, props: { title: 'HVAC FAQ', items: [
          { q: 'How often should I service my system?', a: 'Twice a year — heating in fall, cooling in spring. It catches 80% of breakdowns before they happen.' },
          { q: 'Do you offer financing?', a: 'Yes. 0% APR for 18 months on qualifying installs, with on-the-spot approval.' },
          { q: 'What brands do you service?', a: 'All of them — Carrier, Trane, Lennox, Rheem, Bryant, Goodman, and more.' },
        ] } },
        { ...contact, props: { title: '24/7 service line', email: 'service@comfortco.local', phone: '(555) 010-4826', address: 'Serving the tri-county area' } },
        { ...cta, props: { headline: 'Book your tune-up today.', subheadline: 'Flat-rate pricing. No overtime charges. NATE-certified techs.', ctaPrimary: 'Schedule now' } },
        footer,
      ]),
    },
    {
      name: 'Plumbing',
      category: 'plumbing',
      description: 'Plumber site — fast response hero, services, emergency CTA, financing, reviews.',
      blocks: compose([
        {
          ...hero,
          props: {
            ...hero?.props,
            eyebrow: 'Licensed plumber · 30-min response',
            headline: 'Leak stopped. Pipes fixed. No mess left behind.',
            subheadline: 'Residential + commercial plumbing. Upfront pricing, clean uniforms, and we haul away the old parts.',
            ctaPrimary: 'Call (555) 010-PIPE',
            ctaSecondary: 'Request a quote',
            bg: 'sage',
          },
        },
        {
          ...features,
          props: {
            title: 'Services',
            subtitle: 'From drips to main lines.',
            items: [
              { icon: 'Droplets', title: 'Repairs', desc: 'Leaks, clogs, drips, and running toilets.' },
              { icon: 'Wrench', title: 'Install', desc: 'Water heaters, faucets, fixtures, dishwashers.' },
              { icon: 'Pipes', title: 'Repipe', desc: 'Whole-home repipe + slab leak repair.' },
              { icon: 'ShieldCheck', title: 'Inspection', desc: 'Camera inspection + hydro jetting.' },
            ],
          },
        },
        { ...stats, props: { stats: [
          { value: '30min', label: 'Avg. response' },
          { value: '15yr', label: 'Licensed' },
          { value: '8k+', label: 'Jobs done' },
          { value: 'A+', label: 'BBB rating' },
        ] } },
        { ...testimonial, props: { quote: 'Water heater burst at 6am. They were here by 6:45, new one installed by 9. Professional start to finish.', author: 'Priya S.', role: 'Homeowner' } },
        { ...faq, props: { title: 'Plumbing FAQ', items: [
          { q: 'Do you charge for estimates?', a: 'Free estimates on scheduled work. Emergency calls have a flat trip fee, credited toward the repair.' },
          { q: 'Can you help after hours?', a: 'Yes — 24/7 emergency line. Real plumber, not a call center.' },
          { q: 'Are you licensed and insured?', a: 'Licensed master plumber, fully insured, workers comp, and background-checked techs.' },
        ] } },
        { ...contact, props: { title: 'Plumbing emergencies welcome', email: 'dispatch@pipepros.local', phone: '(555) 010-7473', address: 'Service area: metro + 30-mile radius' } },
        { ...cta, props: { headline: 'Pipe problem? We’re 30 minutes away.', subheadline: 'Upfront pricing. No surprise fees. Work guaranteed in writing.', ctaPrimary: 'Call now' } },
        footer,
      ]),
    },
    {
      name: 'Roofing',
      category: 'roofing',
      description: 'Roofing contractor site — storm-ready hero, services, free inspection CTA, warranty, reviews.',
      blocks: compose([
        {
          ...hero,
          props: {
            ...hero?.props,
            eyebrow: 'Storm damage? Free roof inspection',
            headline: 'A roof you won’t think about for 30 years.',
            subheadline: 'Asphalt, metal, and tile roofing. We handle insurance claims, install with a 50-year warranty, and clean up like we were never there.',
            ctaPrimary: 'Book free inspection',
            ctaSecondary: 'See our work',
            bg: 'clay',
          },
        },
        {
          ...features,
          props: {
            title: 'What we do',
            subtitle: 'From patch to total replacement.',
            items: [
              { icon: 'Home', title: 'Replacement', desc: 'Full tear-off + new roof in 1–2 days.' },
              { icon: 'Wrench', title: 'Repairs', desc: 'Leaks, missing shingles, flashing, vents.' },
              { icon: 'CloudRain', title: 'Storm damage', desc: 'Insurance claim help + tarp emergency.' },
              { icon: 'ShieldCheck', title: 'Inspection', desc: 'Free 22-point roof health check.' },
            ],
          },
        },
        { ...stats, props: { stats: [
          { value: '50yr', label: 'Material warranty' },
          { value: '10yr', label: 'Workmanship' },
          { value: '5k+', label: 'Roofs installed' },
          { value: '4.9★', label: 'Customer rating' },
        ] } },
        { ...testimonial, props: { quote: 'Hailstorm trashed our roof. They met the adjuster, handled the paperwork, and had a new roof on in 3 days. We paid our deductible, nothing more.', author: 'Tom & Lisa K.', role: 'Homeowners' } },
        { ...faq, props: { title: 'Roofing FAQ', items: [
          { q: 'How long does a new roof take?', a: 'Most homes are done in 1–2 days. We protect landscaping and clean up with a magnetic nail sweep.' },
          { q: 'Do you work with insurance?', a: 'Yes. We meet the adjuster on-site, document everything, and bill the insurance company directly.' },
          { q: 'What’s the warranty?', a: '50-year material warranty from the manufacturer + our 10-year workmanship guarantee.' },
        ] } },
        { ...contact, props: { title: 'Schedule a free inspection', email: 'info@roofright.local', phone: '(555) 010-7663', address: 'Serving the metro and surrounding counties' } },
        { ...cta, props: { headline: 'Not sure if you need a new roof?', subheadline: 'Free 22-point inspection. No pressure, no obligation.', ctaPrimary: 'Book inspection' } },
        footer,
      ]),
    },
    {
      name: 'Landscaping',
      category: 'landscaping',
      description: 'Landscaper site — curb appeal hero, services, seasonal plans, portfolio gallery, reviews.',
      blocks: compose([
        {
          ...hero,
          props: {
            ...hero?.props,
            eyebrow: 'Design · Build · Maintain',
            headline: 'A yard that makes the neighbors slow down.',
            subheadline: 'Full-service landscaping for homes and small commercial properties. Hardscaping, planting, lawn care, and seasonal cleanups.',
            ctaPrimary: 'Free design visit',
            ctaSecondary: 'See our work',
            bg: 'moss',
          },
        },
        {
          ...features,
          props: {
            title: 'Services',
            subtitle: 'Four seasons of curb appeal.',
            items: [
              { icon: 'Trees', title: 'Design & install', desc: 'Planting plans + full installation.' },
              { icon: 'PencilRuler', title: 'Hardscaping', desc: 'Patios, walkways, retaining walls.' },
              { icon: 'Scissors', title: 'Lawn care', desc: 'Mowing, edging, fertilizing, aeration.' },
              { icon: 'Snowflake', title: 'Seasonal cleanup', desc: 'Spring + fall, snow removal in winter.' },
            ],
          },
        },
        { ...stats, props: { stats: [
          { value: '18yr', label: 'In business' },
          { value: '450+', label: 'Properties maintained' },
          { value: '5★', label: 'Reviews' },
          { value: 'Same-day', label: 'Cleanup calls' },
        ] } },
        { ...testimonial, props: { quote: 'They turned a boring front yard into the prettiest on the block. Maintenance crew is reliable and the price is fair.', author: 'Mrs. Chen', role: 'Homeowner' } },
        { ...contact, props: { title: 'Get on the schedule', email: 'hello@greenblade.local', phone: '(555) 010-5263', address: 'Serving the northside + suburbs' } },
        { ...cta, props: { headline: 'Let’s plan your yard.', subheadline: 'Free design visit. Honest quote. No obligation.', ctaPrimary: 'Book a visit' } },
        footer,
      ]),
    },
    {
      name: 'Electrical',
      category: 'electrical',
      description: 'Electrician site — safety hero, services, EV charger install, panel upgrades, emergency CTA.',
      blocks: compose([
        {
          ...hero,
          props: {
            ...hero?.props,
            eyebrow: 'Licensed electrician · 24/7',
            headline: 'Wired right. The first time.',
            subheadline: 'Residential and light commercial electrical. Panel upgrades, EV chargers, lighting, generators, and code corrections.',
            ctaPrimary: 'Call (555) 010-SPARK',
            ctaSecondary: 'Book service',
            bg: 'forest',
          },
        },
        {
          ...features,
          props: {
            title: 'Services',
            subtitle: 'Safe, licensed, insured.',
            items: [
              { icon: 'Zap', title: 'Panel upgrades', desc: '100 → 200A, smart panels, sub-panels.' },
              { icon: 'BatteryCharging', title: 'EV chargers', desc: 'Level 2 home chargers, certified.' },
              { icon: 'Lightbulb', title: 'Lighting', desc: 'Indoor + outdoor, recessed, landscape.' },
              { icon: 'ShieldAlert', title: 'Code fixes', desc: 'Inspections + corrections for older homes.' },
            ],
          },
        },
        { ...stats, props: { stats: [
          { value: '20yr', label: 'Master licensed' },
          { value: '6k+', label: 'Jobs completed' },
          { value: '0', label: 'Code violations' },
          { value: '24/7', label: 'Emergency line' },
        ] } },
        { ...testimonial, props: { quote: 'Installed a Tesla charger and upgraded my panel in one afternoon. Clean, neat, and explained everything. Worth it.', author: 'Alex P.', role: 'Homeowner' } },
        { ...faq, props: { title: 'Electrical FAQ', items: [
          { q: 'Do you do emergency calls?', a: 'Yes, 24/7. Power out, sparks, burning smell — call immediately.' },
          { q: 'Can you install an EV charger?', a: 'Yes. We’re certified for all major brands and handle the panel upgrade if needed.' },
          { q: 'Are permits included?', a: 'We pull all permits and arrange inspection. You get a final sign-off card.' },
        ] } },
        { ...contact, props: { title: 'Electrician on call', email: 'service@brightspark.local', phone: '(555) 010-7725', address: 'Licensed in 3 counties' } },
        { ...cta, props: { headline: 'Need an electrician today?', subheadline: 'Upfront pricing. Licensed + insured.', ctaPrimary: 'Call now' } },
        footer,
      ]),
    },
    {
      name: 'Cleaning Service',
      category: 'cleaning',
      description: 'Cleaning service site — fresh hero, services, booking, recurring plans, reviews.',
      blocks: compose([
        {
          ...hero,
          props: {
            ...hero?.props,
            eyebrow: 'Bonded · Insured · Background-checked',
            headline: 'A clean home, the way you’d do it yourself.',
            subheadline: 'Recurring and one-time cleaning. Eco-friendly products, same team every visit, and a 100% re-clean guarantee.',
            ctaPrimary: 'Get a quote',
            ctaSecondary: 'See plans',
            bg: 'sand',
          },
        },
        {
          ...features,
          props: {
            title: 'Services',
            subtitle: 'We clean so you don’t have to.',
            items: [
              { icon: 'Sparkles', title: 'Recurring cleaning', desc: 'Weekly, bi-weekly, or monthly.' },
              { icon: 'Home', title: 'Deep clean', desc: 'One-time, top-to-bottom.' },
              { icon: 'Truck', title: 'Move in/out', desc: 'Whole-home for transitions.' },
              { icon: 'Briefcase', title: 'Office', desc: 'Small offices + common areas.' },
            ],
          },
        },
        { ...pricing, props: {
          title: 'Recurring plans',
          subtitle: 'The more we visit, the less you pay.',
          tiers: [
            { name: 'Weekly', price: '$110', period: '/visit', features: ['Same team every week', 'Priority booking', '10% off extras', 'Free deep clean yearly'], cta: 'Choose weekly', featured: true },
            { name: 'Bi-weekly', price: '$130', period: '/visit', features: ['Same team', 'Standard booking', '5% off extras', 'Free deep clean yearly'], cta: 'Choose bi-weekly', featured: false },
            { name: 'Monthly', price: '$160', period: '/visit', features: ['Same team', 'Flexible booking', 'Standard pricing', 'Add-ons available'], cta: 'Choose monthly', featured: false },
          ],
        } },
        { ...testimonial, props: { quote: 'I cancelled my old service after one visit from this team. They actually cleaned behind the toilet. Huge difference.', author: 'Jordan W.', role: 'Busy parent' } },
        { ...contact, props: { title: 'Book your clean', email: 'book@freshsweep.local', phone: '(555) 010-2533', address: 'Serving the metro area' } },
        { ...cta, props: { headline: 'Reclaim your weekends.', subheadline: 'Eco-friendly products. 100% re-clean guarantee.', ctaPrimary: 'Book now' } },
        footer,
      ]),
    },
    {
      name: 'General Contractor',
      category: 'contractor',
      description: 'General contractor site — build hero, services, project gallery, reviews, free estimate CTA.',
      blocks: compose([
        {
          ...hero,
          props: {
            ...hero?.props,
            eyebrow: 'Licensed · Bonded · Insured',
            headline: 'Renovations done the right way.',
            subheadline: 'Kitchens, baths, additions, and whole-home remodels. Fixed-price bids, a project manager who answers the phone, and clean job sites.',
            ctaPrimary: 'Get a fixed-price bid',
            ctaSecondary: 'View past projects',
            bg: 'terracotta',
          },
        },
        {
          ...features,
          props: {
            title: 'What we build',
            subtitle: 'From the first sketch to the final walkthrough.',
            items: [
              { icon: 'ChefHat', title: 'Kitchens', desc: 'Cabinets, counters, layout, lighting.' },
              { icon: 'Bath', title: 'Bathrooms', desc: 'Vanities, tile, walk-in showers.' },
              { icon: 'Home', title: 'Additions', desc: 'Second stories, master suites, ADUs.' },
              { icon: 'Building', title: 'Whole-home', desc: 'Gut renovations + historic restorations.' },
            ],
          },
        },
        { ...stats, props: { stats: [
          { value: '22yr', label: 'Building' },
          { value: '350+', label: 'Projects done' },
          { value: 'A+', label: 'BBB rating' },
          { value: '100%', label: 'Licensed + insured' },
        ] } },
        { ...testimonial, props: { quote: 'They finished our kitchen 3 days early and $800 under bid. The project manager texted every morning with the day’s plan. Best contractor experience we’ve had.', author: 'The Patels', role: 'Kitchen remodel' } },
        { ...faq, props: { title: 'Remodeling FAQ', items: [
          { q: 'Do you give free estimates?', a: 'Yes. Free in-home consultation with a fixed-price bid within 5 business days.' },
          { q: 'How long does a kitchen take?', a: 'Typical kitchen remodel: 4–6 weeks from demo to final walkthrough, depending on material lead times.' },
          { q: 'Are you licensed?', a: 'Licensed GC, bonded, and insured. We pull all permits and arrange inspections.' },
        ] } },
        { ...contact, props: { title: 'Start your project', email: 'build@cornerstonegc.local', phone: '(555) 010-2633', address: 'Licensed in the tri-state area' } },
        { ...cta, props: { headline: 'Ready to build?', subheadline: 'Fixed-price bids. A real project manager. Clean job sites.', ctaPrimary: 'Request a bid' } },
        footer,
      ]),
    },

    // ---------------------------------------------------------------- More niche verticals
    // Generated with the localBusiness helper for compactness. Each is a full
    // landing page: hero + services + stats + testimonial + FAQ + contact + CTA.
    ...localBusinessTemplates(),
  ]
}

// Helper: build a batch of local-business templates from compact specs.
// Each spec: { category, name, eyebrow, headline, subheadline, cta, bg, services: [{icon,title,desc}x4], stats: [{value,label}x4], testimonial: {quote,author,role}, faq: [{q,a}x3], contact: {email,phone,address} }
function localBusinessTemplates(): ReturnType<typeof buildTemplateSeeds> {
  const specs = [
    {
      category: 'construction',
      name: 'Construction & Concrete',
      eyebrow: 'Licensed · Bonded · Insured',
      headline: 'Built to last. Priced to make sense.',
      subheadline: 'Foundations, driveways, flatwork, and full commercial builds. Honest bids, on-time delivery, and concrete that doesn’t crack.',
      cta: 'Get a free estimate',
      bg: 'bark',
      services: [
        { icon: 'Building', title: 'Foundations', desc: 'Residential + commercial footings + slabs.' },
        { icon: 'Truck', title: 'Flatwork', desc: 'Driveways, patios, sidewalks, approach ramps.' },
        { icon: 'HardHat', title: 'Commercial', desc: 'Tilt-up, retaining walls, parking lots.' },
        { icon: 'Wrench', title: 'Repairs', desc: 'Crack repair, resurfacing, sealing.' },
      ],
      stats: [
        { value: '30yr', label: 'In business' },
        { value: '1.2M+', label: 'Sq ft poured' },
        { value: 'A+', label: 'BBB rating' },
        { value: 'On-time', label: 'Delivery record' },
      ],
      testimonial: { quote: 'Poured our 4,000 sq ft shop floor in one day. Zero cracks a year later. These guys know their mix.', author: 'Randy T.', role: 'Farm owner' },
      faq: [
        { q: 'How thick should a driveway be?', a: '4–6 inches of 4,000-psi concrete on prepared subbase. We size to your soil + loads.' },
        { q: 'Do you handle permits?', a: 'Yes. We pull all permits and arrange inspections.' },
        { q: 'How long before I can drive on it?', a: '7 days for full strength; light foot traffic after 24 hours.' },
      ],
      contact: { email: 'quote@solidpour.local', phone: '(555) 010-2668', address: 'Serving metro + 50-mile radius' },
    },
    {
      category: 'fire-protection',
      name: 'Fire Protection',
      eyebrow: 'NFPA certified · 24/7 monitoring',
      headline: 'Fire safety that passes inspection the first time.',
      subheadline: 'Fire alarms, sprinklers, extinguishers, and suppression for commercial + residential. Annual inspections, code compliance, and emergency service.',
      cta: 'Schedule inspection',
      bg: 'terracotta',
      services: [
        { icon: 'Flame', title: 'Alarms', desc: 'Design, install, monitor fire alarm systems.' },
        { icon: 'Droplets', title: 'Sprinklers', desc: 'Wet/dry systems, inspections, retrofit.' },
        { icon: 'ShieldCheck', title: 'Extinguishers', desc: 'Sales, service, annual tags.' },
        { icon: 'Building', title: 'Suppression', desc: 'Kitchen hoods, paint booths, server rooms.' },
      ],
      stats: [
        { value: 'NFPA', label: 'Certified' },
        { value: '24/7', label: 'Monitoring' },
        { value: '2k+', label: 'Systems serviced' },
        { value: '100%', label: 'Code compliance' },
      ],
      testimonial: { quote: 'Failed fire marshal inspection twice before they took over. Passed on the first try after their retrofit.', author: 'Maria L.', role: 'Restaurant owner' },
      faq: [
        { q: 'How often do I need inspections?', a: 'Alarms + sprinklers annually per NFPA 72. Extinguishers annually per NFPA 10.' },
        { q: 'Do you monitor 24/7?', a: 'Yes. UL-listed central station monitoring with 30-second notification.' },
        { q: 'Can you retrofit older buildings?', a: 'Yes — we handle historic + occupied retrofits with minimal disruption.' },
      ],
      contact: { email: 'service@guardianfp.local', phone: '(555) 010-3473', address: 'Licensed statewide' },
    },
    {
      category: 'locksmith',
      name: 'Locksmith & Digital Locks',
      eyebrow: 'Licensed · Mobile · 20-min response',
      headline: 'Locked out? We’re 20 minutes away.',
      subheadline: 'Residential, automotive, and commercial locksmith. Smart locks, vaults, safes, and emergency lockout service — 24/7.',
      cta: 'Call (555) 010-KEYS',
      bg: 'forest',
      services: [
        { icon: 'Key', title: 'Lockouts', desc: 'Home, car, business — 24/7 emergency.' },
        { icon: 'Lock', title: 'Smart locks', desc: 'Keypad, fingerprint, app-controlled.' },
        { icon: 'Safe', title: 'Safes & vaults', desc: 'Sales, install, combo changes.' },
        { icon: 'Building', title: 'Commercial', desc: 'Master keying, panic bars, access control.' },
      ],
      stats: [
        { value: '20min', label: 'Avg. response' },
        { value: '15yr', label: 'Licensed' },
        { value: '10k+', label: 'Jobs done' },
        { value: '24/7', label: 'Emergency' },
      ],
      testimonial: { quote: 'Locked out at midnight with a toddler inside. They were there in 18 minutes. Lifesavers.', author: 'Dana K.', role: 'Homeowner' },
      faq: [
        { q: 'Can you unlock my car without damage?', a: 'Yes. We use non-destructive tools for 99% of vehicles.' },
        { q: 'Do you install smart locks?', a: 'Yes — August, Yale, Schlage, Kwikset, and most major brands.' },
        { q: 'Are you licensed?', a: 'Licensed + bonded + background-checked. We show ID on arrival.' },
      ],
      contact: { email: 'dispatch@quickkey.local', phone: '(555) 010-5397', address: 'Mobile service, metro wide' },
    },
    {
      category: 'dental',
      name: 'Dental Practice',
      eyebrow: 'Accepting new patients · Most insurance',
      headline: 'Gentle dentistry for nervous patients.',
      subheadline: 'Family, cosmetic, and emergency dental. Same-day crowns, clear aligners, and a team that actually listens.',
      cta: 'Book a cleaning',
      bg: 'sage',
      services: [
        { icon: 'Smile', title: 'General', desc: 'Cleanings, fillings, exams, X-rays.' },
        { icon: 'Sparkles', title: 'Cosmetic', desc: 'Whitening, veneers, bonding.' },
        { icon: 'Stethoscope', title: 'Emergency', desc: 'Toothache, broken tooth, same day.' },
        { icon: 'AlignHorizontalJustifyCenter', title: 'Ortho', desc: 'Clear aligners + traditional braces.' },
      ],
      stats: [
        { value: '4.9★', label: 'Patient rating' },
        { value: '20yr', label: 'Serving the community' },
        { value: 'Same-day', label: 'Crowns (CEREC)' },
        { value: 'Sat', label: 'Appointments' },
      ],
      testimonial: { quote: 'I cried at every dentist until here. They let me hold a stress ball and explained every step. No pain, no fear.', author: 'Sam R.', role: 'Patient' },
      faq: [
        { q: 'Do you take my insurance?', a: 'We accept most PPO plans. Call with your member ID and we’ll verify before your visit.' },
        { q: 'How often should I get a cleaning?', a: 'Every 6 months for most adults. We may recommend 3–4 months for gum disease.' },
        { q: 'Do you see kids?', a: 'Yes — we see the whole family starting at age 1.' },
      ],
      contact: { email: 'hello@smilestudio.local', phone: '(555) 010-3368', address: '123 Main St, Suite 200' },
    },
    {
      category: 'wellness',
      name: 'Wellness Clinic',
      eyebrow: 'IV therapy · NAD+ · Aesthetics',
      headline: 'Feel better, not just looked at.',
      subheadline: 'IV drips, vitamin shots, NAD+, Botox, fillers, and weight management. Medically supervised, honestly priced.',
      cta: 'Book a consult',
      bg: 'moss',
      services: [
        { icon: 'Droplets', title: 'IV therapy', desc: 'Hydration, energy, recovery drips.' },
        { icon: 'Syringe', title: 'Aesthetics', desc: 'Botox, fillers, facials, lasers.' },
        { icon: 'Pill', title: 'Weight mgmt', desc: 'Medical supervision + GLP-1s.' },
        { icon: 'HeartPulse', title: 'NAD+ & peptides', desc: 'Longevity + recovery protocols.' },
      ],
      stats: [
        { value: 'MD-led', label: 'Medical director' },
        { value: '15k+', label: 'Treatments' },
        { value: '4.9★', label: 'Reviews' },
        { value: 'Walk-in', label: 'Welcome' },
      ],
      testimonial: { quote: 'My energy is night-and-day since starting NAD+. The team actually explains the science, not just the price.', author: 'Jordan A.', role: 'Member' },
      faq: [
        { q: 'How often should I get IV therapy?', a: 'Weekly to monthly depending on goals. We personalize at consult.' },
        { q: 'Is Botox safe?', a: 'Yes when administered by trained professionals. Our nurse injectors are supervised by an MD.' },
        { q: 'Do you offer memberships?', a: 'Yes — discounted monthly drip + aesthetic packages. No commitment.' },
      ],
      contact: { email: 'hello@vitalwellness.local', phone: '(555) 010-9355', address: 'Riverwalk Plaza, Suite 150' },
    },
    {
      category: 'senior-living',
      name: 'Senior Living',
      eyebrow: 'Independent · Assisted · Memory care',
      headline: 'A place where Mom feels at home.',
      subheadline: 'Independent living, assisted living, and memory care. 24/7 nursing, chef-prepared meals, and a community that feels like family.',
      cta: 'Book a tour',
      bg: 'sage',
      services: [
        { icon: 'Home', title: 'Independent', desc: 'Active 55+ living with amenities.' },
        { icon: 'HeartHandshake', title: 'Assisted', desc: 'Help with ADLs, medication, meals.' },
        { icon: 'Brain', title: 'Memory care', desc: 'Dementia-trained staff, secure units.' },
        { icon: 'Stethoscope', title: 'Skilled nursing', desc: '24/7 RN care, rehab, post-hospital.' },
      ],
      stats: [
        { value: '4.8★', label: 'Family rating' },
        { value: '24/7', label: 'Nursing on-site' },
        { value: '120+', label: 'Residents' },
        { value: 'Pet-friendly', label: 'Welcome' },
      ],
      testimonial: { quote: 'Moving Mom was the hardest decision. The staff treated her like their own. She’s thriving.', author: 'The Garcias', role: 'Family' },
      faq: [
        { q: 'What’s included in monthly rent?', a: 'Meals, activities, housekeeping, transportation, and basic care. No hidden fees.' },
        { q: 'Do you accept Medicaid?', a: 'We accept private pay + long-term care insurance. Medicaid waivers on a waitlist basis.' },
        { q: 'Can I visit anytime?', a: 'Yes — family is welcome anytime. We just ask you sign in at the front desk.' },
      ],
      contact: { email: 'tour@maplewoodliving.local', phone: '(555) 010-7364', address: '100 Maple Lane' },
    },
    {
      category: 'hair-replacement',
      name: 'Hair Replacement',
      eyebrow: 'Non-surgical · Natural results',
      headline: 'Get your hair back. Your confidence too.',
      subheadline: 'Non-surgical hair restoration, PRP, low-level laser, and natural-looking systems. Free consultation, real before/afters.',
      cta: 'Free consultation',
      bg: 'forest',
      services: [
        { icon: 'Sparkles', title: 'PRP therapy', desc: 'Platelet-rich plasma for regrowth.' },
        { icon: 'Lightbulb', title: 'LLLT', desc: 'Laser caps + in-clinic sessions.' },
        { icon: 'Scissors', title: 'Hair systems', desc: 'Custom, undetectable, monthly service.' },
        { icon: 'Pill', title: 'Medical', desc: 'Finasteride, minoxidil, monitoring.' },
      ],
      stats: [
        { value: '90%', label: 'See regrowth' },
        { value: '12yr', label: 'Specializing' },
        { value: '800+', label: 'Clients' },
        { value: 'Free', label: 'First consult' },
      ],
      testimonial: { quote: 'I was skeptical. 6 months of PRP and I have hair I haven’t seen in 10 years. Worth it.', author: 'Marcus B.', role: 'Client' },
      faq: [
        { q: 'Does PRP hurt?', a: 'Minimal discomfort — we use a numbing cream. Sessions take ~45 minutes.' },
        { q: 'How long until I see results?', a: 'PRP: 3–6 months. Hair systems: same day. We set expectations at consult.' },
        { q: 'Is it covered by insurance?', a: 'Usually not, as it’s cosmetic. We offer payment plans.' },
      ],
      contact: { email: 'hello@hairworks.local', phone: '(555) 010-4247', address: 'Medical Plaza, Suite 300' },
    },
    {
      category: 'coaching',
      name: 'Coaching Business',
      eyebrow: '1:1 · Group · Online',
      headline: 'Get unstuck. Get a plan. Get moving.',
      subheadline: 'Business, career, and life coaching. Honest feedback, a clear path, and accountability that actually works.',
      cta: 'Book a free call',
      bg: 'clay',
      services: [
        { icon: 'Briefcase', title: 'Business', desc: 'Strategy, ops, team-building.' },
        { icon: 'TrendingUp', title: 'Career', desc: 'Transitions, negotiation, growth.' },
        { icon: 'Heart', title: 'Life', desc: 'Habits, clarity, momentum.' },
        { icon: 'Users', title: 'Group', desc: 'Masterminds + cohorts.' },
      ],
      stats: [
        { value: '500+', label: 'Clients coached' },
        { value: '12yr', label: 'Experience' },
        { value: '4.9★', label: 'Reviews' },
        { value: '30min', label: 'Free intro call' },
      ],
      testimonial: { quote: 'I went from stuck to a 3x income in 18 months. The clarity alone was worth it.', author: 'Priya M.', role: 'Client' },
      faq: [
        { q: 'How does coaching work?', a: 'Weekly or bi-weekly 1:1 calls, async support, and a shared action plan. 3-month minimum to start.' },
        { q: 'What’s the difference from therapy?', a: 'Coaching is forward-focused and action-oriented. We’re not treating mental health conditions.' },
        { q: 'Do you offer sliding scale?', a: 'Yes, limited spots. Mention it on the intro call.' },
      ],
      contact: { email: 'hello@claritycoach.local', phone: '(555) 010-6228', address: 'Remote + local' },
    },
    {
      category: 'real-estate',
      name: 'Real Estate',
      eyebrow: 'Residential · Commercial · Investments',
      headline: 'Sold. For the right number.',
      subheadline: 'Residential, commercial, and investment property. Honest comps, professional photos, and a marketing plan that actually shows up in search.',
      cta: 'Free home valuation',
      bg: 'terracotta',
      services: [
        { icon: 'Home', title: 'Buy', desc: 'First-time, move-up, investors.' },
        { icon: 'Tag', title: 'Sell', desc: 'Staging, photos, MLS + online.' },
        { icon: 'Building', title: 'Commercial', desc: 'Lease + sale, retail, office.' },
        { icon: 'TrendingUp', title: 'Invest', desc: 'Rental portfolio, 1031s.' },
      ],
      stats: [
        { value: '4.9★', label: 'Client rating' },
        { value: '200+', label: 'Homes sold' },
        { value: '14 days', label: 'Avg. on market' },
        { value: '99.2%', label: 'List-to-sale' },
      ],
      testimonial: { quote: 'Sold our house for $40k over asking in 9 days. Their photos + listing copy were on another level.', author: 'The Nguyens', role: 'Sellers' },
      faq: [
        { q: 'What’s your commission?', a: 'Standard 5–6%, negotiable on higher-value listings. Full-service, no hidden fees.' },
        { q: 'How do you price my home?', a: 'A comparative market analysis + recent sales within 90 days. We walk you through the math.' },
        { q: 'Do you do virtual tours?', a: 'Yes — 3D tours + drone for every listing, included.' },
      ],
      contact: { email: 'hello@cornerstonere.local', phone: '(555) 010-7325', address: 'Main Office, downtown' },
    },
    {
      category: 'professional-services',
      name: 'Professional Services',
      eyebrow: 'Legal · Accounting · Consulting',
      headline: 'Sound advice. Plain English. Fair fees.',
      subheadline: 'Attorneys, CPAs, and consultants for small businesses. Fixed-fee options, no billable-hour surprises.',
      cta: 'Schedule consult',
      bg: 'forest',
      services: [
        { icon: 'Scale', title: 'Legal', desc: 'Contracts, entity, employment, IP.' },
        { icon: 'Calculator', title: 'Accounting', desc: 'Bookkeeping, taxes, payroll.' },
        { icon: 'Briefcase', title: 'Consulting', desc: 'Strategy, ops, growth.' },
        { icon: 'ShieldCheck', title: 'Compliance', desc: 'Licenses, filings, audits.' },
      ],
      stats: [
        { value: '25yr', label: 'Combined experience' },
        { value: '600+', label: 'Clients served' },
        { value: 'Fixed-fee', label: 'Options' },
        { value: 'A+', label: 'BBB rating' },
      ],
      testimonial: { quote: 'They explained my LLC + tax setup in 20 minutes that my old lawyer couldn’t in 3 hours. Half the price.', author: 'Devin K.', role: 'Small business owner' },
      faq: [
        { q: 'Do you offer fixed fees?', a: 'Yes — most contracts, entity setup, and monthly bookkeeping are flat-fee. Litigation is hourly.' },
        { q: 'Can you represent me in court?', a: 'For business disputes, yes. We refer out specialized personal matters.' },
        { q: 'Do you do remote?', a: 'Yes — video consults + e-sign. Most work is handled remotely.' },
      ],
      contact: { email: 'hello@meridianpro.local', phone: '(555) 010-7733', address: 'Financial District, Suite 400' },
    },
    {
      category: 'university',
      name: 'University Program',
      eyebrow: 'Degree · Certificate · Continuing ed',
      headline: 'An education that fits your life.',
      subheadline: 'Online + on-campus programs for working adults. Transfer-friendly, career-focused, and priced honestly.',
      cta: 'Request info',
      bg: 'sage',
      services: [
        { icon: 'GraduationCap', title: 'Degrees', desc: 'Associate, bachelor, master.' },
        { icon: 'Award', title: 'Certificates', desc: 'Stackable, career-aligned.' },
        { icon: 'Laptop', title: 'Online', desc: 'Asynchronous, flexible.' },
        { icon: 'Briefcase', title: 'Career', desc: 'Placement + employer partners.' },
      ],
      stats: [
        { value: '12k+', label: 'Students' },
        { value: '88%', label: 'Job placement' },
        { value: '7wk', label: 'Avg. course length' },
        { value: '$0', label: 'Application fee' },
      ],
      testimonial: { quote: 'Finished my bachelor’s at 38 while working full-time. The transfer credits saved me two years.', author: 'Ellen W.', role: 'Alum' },
      faq: [
        { q: 'Will my credits transfer?', a: 'We accept most regionally-accredited credits. Free transcript review before you apply.' },
        { q: 'Is it accredited?', a: 'Yes — regionally accredited. Programs meet the same standards as traditional schools.' },
        { q: 'Can I get financial aid?', a: 'Yes — FAFSA, scholarships, and payment plans. Most students qualify for some aid.' },
      ],
      contact: { email: 'admissions@pathwayu.local', phone: '(555) 010-8267', address: 'Online + 3 campuses' },
    },
    {
      category: 'sports-it',
      name: 'Sports & IT',
      eyebrow: 'Training · Facilities · Tech',
      headline: 'Train hard. Recover smart. Stay online.',
      subheadline: 'Sports performance training, physical therapy, and IT support for athletes + gyms. Body and tech, same team.',
      cta: 'Book a session',
      bg: 'moss',
      services: [
        { icon: 'Dumbbell', title: 'Performance', desc: 'Strength, speed, agility.' },
        { icon: 'HeartPulse', title: 'PT + recovery', desc: 'Injury rehab, massage, cold plunge.' },
        { icon: 'Laptop', title: 'IT for gyms', desc: 'Wifi, member software, backups.' },
        { icon: 'Trophy', title: 'Team packages', desc: 'School + club partnerships.' },
      ],
      stats: [
        { value: '15yr', label: 'Training athletes' },
        { value: '40+', label: 'Teams served' },
        { value: '4.9★', label: 'Reviews' },
        { value: 'Same-day', label: 'IT response' },
      ],
      testimonial: { quote: 'My sprint times dropped 0.3s in 8 weeks. The recovery room is unreal.', author: 'Tyrell J.', role: 'Track athlete' },
      faq: [
        { q: 'Do you work with kids?', a: 'Yes — age-appropriate training starting at 10. We have a separate youth program.' },
        { q: 'Do you take insurance for PT?', a: 'Yes — most major plans. We verify before your first visit.' },
        { q: 'Can you set up our gym’s wifi?', a: 'Yes — we design + install member-grade networks and support them.' },
      ],
      contact: { email: 'hello@apexfitit.local', phone: '(555) 010-7263', address: 'Sports Complex, Bldg 4' },
    },
    {
      category: 'ecommerce',
      name: 'E-commerce Store',
      eyebrow: 'Shopify · WooCommerce · Custom',
      headline: 'A store that loads fast and sells.',
      subheadline: 'E-commerce sites on Shopify, WooCommerce, or custom. Fast checkout, honest product copy, and SEO that works.',
      cta: 'Get a store audit',
      bg: 'terracotta',
      services: [
        { icon: 'ShoppingCart', title: 'Store build', desc: 'Shopify, WooCommerce, custom.' },
        { icon: 'Image', title: 'Product photos', desc: 'Pro shoots + AI edits.' },
        { icon: 'PenLine', title: 'Copy', desc: 'Honest product descriptions.' },
        { icon: 'Search', title: 'SEO', desc: 'Category, product, schema.' },
      ],
      stats: [
        { value: '200+', label: 'Stores launched' },
        { value: '1.8s', label: 'Avg. load time' },
        { value: '+42%', label: 'Avg. conversion lift' },
        { value: 'A+', label: 'Lighthouse' },
      ],
      testimonial: { quote: 'They rebuilt our store and we did 3x revenue in Q4. The speed alone made checkout convert.', author: 'Aisha P.', role: 'Store owner' },
      faq: [
        { q: 'Which platform should I pick?', a: 'Shopify if you want simple + hosted. WooCommerce if you own it. Custom if you have scale needs. We help you decide.' },
        { q: 'Do you handle the photos?', a: 'Yes — we coordinate product shoots + AI background cleanup. You keep the originals.' },
        { q: 'Can you migrate my existing store?', a: 'Yes — we migrate products, customers, and order history with zero downtime.' },
      ],
      contact: { email: 'hello@cartandco.local', phone: '(555) 010-2263', address: 'Remote + local studio' },
    },
    {
      category: 'pastry',
      name: 'Pastry & Bakery',
      eyebrow: 'Fresh daily · Custom orders',
      headline: 'Bread that’s worth getting up for.',
      subheadline: 'Sourdough, pastries, custom cakes, and wholesale. Baked fresh daily, honest ingredients, no shortcuts.',
      cta: 'Order ahead',
      bg: 'clay',
      services: [
        { icon: 'Croissant', title: 'Daily bread', desc: 'Sourdough, baguette, country loaves.' },
        { icon: 'Cake', title: 'Custom cakes', desc: 'Weddings, birthdays, events.' },
        { icon: 'Cookie', title: 'Pastries', desc: 'Croissants, danish, kouign-amann.' },
        { icon: 'Truck', title: 'Wholesale', desc: 'Cafes, restaurants, offices.' },
      ],
      stats: [
        { value: '5am', label: 'Fresh daily' },
        { value: '12yr', label: 'Baking' },
        { value: '4.9★', label: 'Reviews' },
        { value: 'Same-day', label: 'Custom orders' },
      ],
      testimonial: { quote: 'Their kouign-amann ruined every other pastry for me. We drive 30 minutes for it.', author: 'The Olsens', role: 'Regulars' },
      faq: [
        { q: 'How much notice for a custom cake?', a: '3 days minimum. Weddings + sculpted cakes 2+ weeks.' },
        { q: 'Do you ship?', a: 'Locally only for now. We’re working on a shipping program for sturdier items.' },
        { q: 'Are you gluten-free?', a: 'We have a small GF selection baked in a separate area. Ask staff for today’s options.' },
      ],
      contact: { email: 'hello@fieldflour.local', phone: '(555) 010-2257', address: '142 Baker St' },
    },
    {
      category: 'tattoo',
      name: 'Tattoo Studio',
      eyebrow: 'Licensed · Sterile · Custom',
      headline: 'A tattoo you’ll keep forever.',
      subheadline: 'Custom + flash tattoos by licensed artists. Sterile environment, honest pricing, free touch-ups.',
      cta: 'Book a consult',
      bg: 'bark',
      services: [
        { icon: 'Brush', title: 'Custom', desc: 'One-of-a-kind designs, your story.' },
        { icon: 'Image', title: 'Flash', desc: 'Pre-drawn, same-day pieces.' },
        { icon: 'Eraser', title: 'Cover-ups', desc: 'Re-work old tattoos artistically.' },
        { icon: 'Sparkles', title: 'Touch-ups', desc: 'Free within 6 months.' },
      ],
      stats: [
        { value: '4.9★', label: 'Reviews' },
        { value: '10yr', label: 'Artists combined' },
        { value: 'Sterile', label: 'Licensed shop' },
        { value: 'Free', label: 'Consults' },
      ],
      testimonial: { quote: 'They took my messy old tattoo and turned it into a sleeve I love. The artist listened, didn’t rush.', author: 'Ray M.', role: 'Client' },
      faq: [
        { q: 'How do I book?', a: 'DM the artist directly or use our form. A $50 deposit holds your slot, applied to your total.' },
        { q: 'How much does a tattoo cost?', a: 'Custom: $150/hr min. Flash: by piece. We quote before we start, no surprises.' },
        { q: 'Do you do piercings?', a: 'No — tattoos only. We can refer you to a trusted piercing shop.' },
      ],
      contact: { email: 'book@ironhart.local', phone: '(555) 010-8288', address: 'Arts District, Studio 12' },
    },
    {
      category: 'pet-sanctuary',
      name: 'Pet Sanctuary',
      eyebrow: 'Adopt · Foster · Volunteer',
      headline: 'Every animal deserves a soft landing.',
      subheadline: 'A no-kill sanctuary for rescued, senior, and special-needs pets. Adopt, foster, volunteer, or donate — every bit helps.',
      cta: 'Meet our animals',
      bg: 'moss',
      services: [
        { icon: 'PawPrint', title: 'Adopt', desc: 'Dogs, cats, and small animals.' },
        { icon: 'Home', title: 'Foster', desc: 'Short-term homes, all supplies.' },
        { icon: 'HeartHandshake', title: 'Volunteer', desc: 'Walk, socialize, fundraise.' },
        { icon: 'Heart', title: 'Sponsor', desc: 'Monthly giving for a resident.' },
      ],
      stats: [
        { value: 'No-kill', label: 'Promise' },
        { value: '1.2k+', label: 'Adopted' },
        { value: '60+', label: 'Current residents' },
        { value: '501c3', label: 'Nonprofit' },
      ],
      testimonial: { quote: 'Adopted our senior dog here 2 years ago. They were honest about his health. He’s our whole family now.', author: 'The Parkers', role: 'Adopters' },
      faq: [
        { q: 'What’s the adoption fee?', a: 'Dogs $250, cats $100, small animals $25. Includes spay/neuter + vaccines. Sliding scale for seniors.' },
        { q: 'Can I foster if I rent?', a: 'Yes — we just need landlord approval. We provide food + vet care while you foster.' },
        { q: 'Do you take surrenders?', a: 'We do when we have space. We also help with rehoming support to keep pets in homes.' },
      ],
      contact: { email: 'hello@softpaws.local', phone: '(555) 010-7387', address: '45 acres, county road 9' },
    },
    {
      category: 'ngo',
      name: 'NGO & Humanitarian',
      eyebrow: 'Registered · Transparent · Volunteer-run',
      headline: 'Small acts. Real impact.',
      subheadline: 'A registered nonprofit delivering food, shelter, and education where it’s needed most. 100% of donations go to programs — overhead is volunteer-funded.',
      cta: 'Donate',
      bg: 'forest',
      services: [
        { icon: 'Utensils', title: 'Food aid', desc: 'Weekly pantries + meal delivery.' },
        { icon: 'Home', title: 'Shelter', desc: 'Transitional housing + rent help.' },
        { icon: 'GraduationCap', title: 'Education', desc: 'Tutoring + scholarships.' },
        { icon: 'HeartHandshake', title: 'Volunteer', desc: 'Skill-based + hands-on.' },
      ],
      stats: [
        { value: '100%', label: 'To programs' },
        { value: '50k+', label: 'People served' },
        { value: '4.9★', label: 'Charity Navigator' },
        { value: '12yr', label: 'Operating' },
      ],
      testimonial: { quote: 'I lost my job in the pandemic. They kept my family housed + fed for 4 months. I volunteer now.', author: 'Maria G.', role: 'Recipient + volunteer' },
      faq: [
        { q: 'Is my donation tax-deductible?', a: 'Yes — we’re a registered 501(c)(3). You get a receipt instantly.' },
        { q: 'Where does my money go?', a: '100% to programs. Overhead is covered by a separate volunteer fund. We publish annual reports.' },
        { q: 'Can I volunteer?', a: 'Yes — sign up online. We have weekly + one-time opportunities. Background check required for kid-facing roles.' },
      ],
      contact: { email: 'hello@fieldofhands.local', phone: '(555) 010-9463', address: 'Community Center, 22 Oak St' },
    },
  ]

  return specs.map((s) => ({
    name: s.name,
    category: s.category,
    description: `${s.name} template — local-SEO ready (hero, services, NAP contact, FAQ, schema).`,
    blocks: compose([
      {
        ..._hero,
        props: {
          ..._hero?.props,
          eyebrow: s.eyebrow,
          headline: s.headline,
          subheadline: s.subheadline,
          ctaPrimary: s.cta,
          ctaSecondary: 'Learn more',
          bg: s.bg,
        },
      },
      {
        ..._features,
        props: {
          title: 'Services',
          subtitle: `${s.name} — what we do.`,
          items: s.services,
        },
      },
      { ..._stats, props: { stats: s.stats } },
      { ..._testimonial, props: { quote: s.testimonial.quote, author: s.testimonial.author, role: s.testimonial.role } },
      { ..._faq, props: { title: `${s.name} FAQ`, items: s.faq } },
      { ..._contact, props: { title: 'Get in touch', email: s.contact.email, phone: s.contact.phone, address: s.contact.address } },
      { ..._cta, props: { headline: s.headline, subheadline: s.subheadline, ctaPrimary: s.cta } },
      _footer,
    ]),
  }))
}
