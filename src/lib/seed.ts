// Seed content for the demo, used by API when DB is empty.
import { BLOCK_DEFS } from './blocks'

export type BlockInstance = {
  id: string
  type: string
  props: Record<string, any>
}

function def(type: string, props: Record<string, any>): BlockInstance {
  const blockDef = BLOCK_DEFS.find((b) => b.type === type)
  return {
    id: `${type}-${Math.random().toString(36).slice(2, 9)}`,
    type,
    props: { ...(blockDef?.defaults ?? {}), ...props },
  }
}

export const DEMO_PAGE_BLOCKS: BlockInstance[] = [
  def('hero', {
    eyebrow: 'Rooted & ready',
    headline: 'A website builder for organic brands',
    subheadline:
      'Drag, drop, publish. Beautiful earthy themes, no code, no paid ads — just a quiet way to grow your corner of the web.',
    ctaPrimary: 'Start building',
    ctaSecondary: 'Browse templates',
  }),
  def('logos', {
    title: 'Trusted by quiet makers',
    names: ['Hollow Field', 'Slow Goods', 'Field & Co', 'Mossworks', 'North Yard', 'Orchard'],
  }),
  def('features', {
    title: 'A small, sharp toolkit',
    subtitle: 'Only the tools that earn their keep.',
    items: [
      { icon: 'Sprout', title: 'Drag & drop canvas', desc: 'Move blocks anywhere. Live preview. No code.' },
      { icon: 'Leaf', title: 'Organic themes', desc: 'Earth-toned palettes tuned for makers and growers.' },
      { icon: 'Sparkles', title: 'AI copy assistant', desc: 'Generate honest, on-brand copy in one click.' },
    ],
  }),
  def('stats', {
    stats: [
      { value: '12k+', label: 'Sites published' },
      { value: '98', label: 'Avg. Lighthouse' },
      { value: '0', label: 'Paid ads run' },
      { value: '42', label: 'Integrations' },
    ],
  }),
  def('testimonial', {
    quote:
      'We replaced three tools with this one. Our site loads faster, reads warmer, and we haven’t touched a line of code.',
    author: 'Mara Olsen',
    role: 'Founder, Hollow Field Farm',
  }),
  def('pricing', {}),
  def('faq', {}),
  def('cta', {
    headline: 'Ready to plant your first page?',
    subheadline: 'Build, preview, and publish in minutes. No credit card to start.',
    ctaPrimary: 'Start free',
  }),
  def('footer', {}),
]
