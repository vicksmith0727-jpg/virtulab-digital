// Block definitions for the drag & drop website builder.
// Each block has: type, label, icon (lucide name), default props, and a render spec.
// The canvas reads from these definitions to render previews and the properties panel
// edits the props object.

import type { LucideIcon } from 'lucide-react'
import {
  Heading,
  Type,
  Image as ImageIcon,
  MousePointerClick,
  LayoutGrid,
  Star,
  Quote,
  CreditCard,
  Mail,
  Phone,
  MapPin,
  Users,
  Calendar,
  ShoppingBag,
  Layers,
  PanelBottom as FooterIcon,
  Square,
  GalleryHorizontalEnd,
  ListChecks,
  TrendingUp,
  HelpCircle,
} from 'lucide-react'

export type BlockType =
  | 'hero'
  | 'heading'
  | 'paragraph'
  | 'image'
  | 'button'
  | 'features'
  | 'gallery'
  | 'testimonial'
  | 'pricing'
  | 'team'
  | 'cta'
  | 'stats'
  | 'contact'
  | 'newsletter'
  | 'faq'
  | 'logos'
  | 'footer'
  | 'spacer'
  | 'divider'

export interface BlockDef {
  type: BlockType
  label: string
  category: 'layout' | 'content' | 'media' | 'marketing' | 'social'
  icon: LucideIcon
  description: string
  defaults: Record<string, any>
  schema: { key: string; label: string; type: 'text' | 'textarea' | 'color' | 'image' | 'number' | 'list' | 'switch' | 'select' }[]
}

export const BLOCK_DEFS: BlockDef[] = [
  {
    type: 'hero',
    label: 'Hero',
    category: 'marketing',
    icon: Heading,
    description: 'Large headline with subheadline and CTAs.',
    defaults: {
      eyebrow: 'Organic & homegrown',
      headline: 'Grow your brand the natural way',
      subheadline: 'A no-code website builder crafted for makers, growers, and small studios. No paid ads. Just good roots.',
      ctaPrimary: 'Start building',
      ctaSecondary: 'See templates',
      bg: '#f4f0e8',
      textColor: '#1a2818',
      accentColor: '#2d5a3d',
      align: 'left',
      headlineFontFamily: 'system',
      headlineFontWeight: '700',
      headlineFontSize: 0,
      subheadlineFontSize: 0,
    },
    schema: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'headline', label: 'Headline', type: 'text' },
      { key: 'subheadline', label: 'Subheadline', type: 'textarea' },
      { key: 'ctaPrimary', label: 'Primary CTA', type: 'text' },
      { key: 'ctaSecondary', label: 'Secondary CTA', type: 'text' },
      { key: 'bg', label: 'Background color', type: 'color' },
      { key: 'textColor', label: 'Text color', type: 'color' },
      { key: 'accentColor', label: 'Accent color (CTAs)', type: 'color' },
      { key: 'headlineFontFamily', label: 'Headline font family', type: 'select' },
      { key: 'headlineFontWeight', label: 'Headline font weight', type: 'select' },
      { key: 'headlineFontSize', label: 'Headline size (px, 0 = auto)', type: 'number' },
      { key: 'subheadlineFontSize', label: 'Subheadline size (px, 0 = auto)', type: 'number' },
      { key: 'align', label: 'Alignment', type: 'select' },
    ],
  },
  {
    type: 'heading',
    label: 'Heading',
    category: 'content',
    icon: Type,
    description: 'Section title — choose H1–H6, any color, font, size.',
    defaults: {
      text: 'A heading that turns heads',
      eyebrow: 'Section',
      level: 'h2',
      size: 'xl',
      color: '#1a2818',
      fontFamily: 'system',
      fontWeight: '600',
      fontSize: 0,
    },
    schema: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'text', label: 'Text', type: 'text' },
      { key: 'level', label: 'Heading level', type: 'select' },
      { key: 'color', label: 'Text color', type: 'color' },
      { key: 'fontFamily', label: 'Font family', type: 'select' },
      { key: 'fontWeight', label: 'Font weight', type: 'select' },
      { key: 'fontSize', label: 'Font size (px, 0 = auto)', type: 'number' },
      { key: 'size', label: 'Preset size', type: 'select' },
    ],
  },
  {
    type: 'paragraph',
    label: 'Paragraph',
    category: 'content',
    icon: Square,
    description: 'Body text — any color, font, size.',
    defaults: {
      text: 'Tell your story in plain, honest language. No buzzwords, no fluff — just what your people need to hear.',
      color: '#3d3a30',
      fontFamily: 'system',
      fontWeight: '400',
      fontSize: 0,
    },
    schema: [
      { key: 'text', label: 'Text', type: 'textarea' },
      { key: 'color', label: 'Text color', type: 'color' },
      { key: 'fontFamily', label: 'Font family', type: 'select' },
      { key: 'fontWeight', label: 'Font weight', type: 'select' },
      { key: 'fontSize', label: 'Font size (px, 0 = auto)', type: 'number' },
    ],
  },
  {
    type: 'image',
    label: 'Image',
    category: 'media',
    icon: ImageIcon,
    description: 'Single responsive image.',
    defaults: {
      src: '',
      alt: 'A natural scene',
      radius: 'lg',
      caption: '',
    },
    schema: [
      { key: 'src', label: 'Image URL', type: 'image' },
      { key: 'alt', label: 'Alt text', type: 'text' },
      { key: 'caption', label: 'Caption', type: 'text' },
      { key: 'radius', label: 'Corner radius', type: 'select' },
    ],
  },
  {
    type: 'button',
    label: 'Button',
    category: 'content',
    icon: MousePointerClick,
    description: 'Call-to-action button — pick any colors.',
    defaults: { label: 'Get started', href: '#', variant: 'primary', size: 'lg', bgColor: '#2d5a3d', textColor: '#ffffff', radius: 'md' },
    schema: [
      { key: 'label', label: 'Label', type: 'text' },
      { key: 'href', label: 'Link', type: 'text' },
      { key: 'bgColor', label: 'Background color', type: 'color' },
      { key: 'textColor', label: 'Text color', type: 'color' },
      { key: 'radius', label: 'Corner radius', type: 'select' },
      { key: 'variant', label: 'Variant', type: 'select' },
      { key: 'size', label: 'Size', type: 'select' },
    ],
  },
  {
    type: 'features',
    label: 'Features Grid',
    category: 'marketing',
    icon: LayoutGrid,
    description: '3-column feature grid with icons.',
    defaults: {
      title: 'Everything you need, nothing you don’t',
      subtitle: 'A lean toolkit that grows with you.',
      items: [
        { icon: 'Sprout', title: 'Drag & drop', desc: 'Move blocks anywhere. No code, no fuss.' },
        { icon: 'Leaf', title: 'Organic themes', desc: 'Earth-toned palettes tuned for makers.' },
        { icon: 'Globe', title: 'Publish anywhere', desc: 'Custom domain or free subdomain.' },
      ],
    },
    schema: [{ key: 'items', label: 'Items', type: 'list' }],
  },
  {
    type: 'gallery',
    label: 'Gallery',
    category: 'media',
    icon: GalleryHorizontalEnd,
    description: 'Multi-image grid.',
    defaults: {
      title: 'From the studio',
      images: [
        { src: '', alt: 'Gallery image' },
        { src: '', alt: 'Gallery image' },
        { src: '', alt: 'Gallery image' },
        { src: '', alt: 'Gallery image' },
      ],
      columns: 4,
    },
    schema: [
      { key: 'columns', label: 'Columns', type: 'number' },
      { key: 'images', label: 'Images', type: 'list' },
    ],
  },
  {
    type: 'testimonial',
    label: 'Testimonial',
    category: 'marketing',
    icon: Quote,
    description: 'Quote with attribution.',
    defaults: {
      quote: 'We replaced three tools with this one. The organic themes alone are worth it.',
      author: 'Mara Olsen',
      role: 'Founder, Hollow Field Farm',
    },
    schema: [
      { key: 'quote', label: 'Quote', type: 'textarea' },
      { key: 'author', label: 'Author', type: 'text' },
      { key: 'role', label: 'Role', type: 'text' },
    ],
  },
  {
    type: 'pricing',
    label: 'Pricing',
    category: 'marketing',
    icon: CreditCard,
    description: '3-tier pricing table.',
    defaults: {
      title: 'Simple, honest pricing',
      subtitle: 'No hidden fees. No paid traffic. Cancel anytime.',
      tiers: [
        { name: 'Seed', price: 'Free', period: 'forever', features: ['1 site', 'Organic themes', 'Subdomain'], cta: 'Start free', featured: false },
        { name: 'Sprout', price: '$19', period: '/mo', features: ['10 sites', 'Custom domain', 'AI copy', 'Analytics'], cta: 'Choose Sprout', featured: true },
        { name: 'Grove', price: '$49', period: '/mo', features: ['Unlimited sites', 'Team seats', 'Integrations', 'Priority support'], cta: 'Choose Grove', featured: false },
      ],
    },
    schema: [{ key: 'tiers', label: 'Tiers', type: 'list' }],
  },
  {
    type: 'team',
    label: 'Team',
    category: 'social',
    icon: Users,
    description: 'Team member cards.',
    defaults: {
      title: 'The people behind it',
      members: [
        { name: 'Iris Park', role: 'Design', initial: 'IP' },
        { name: 'Theo Stone', role: 'Engineering', initial: 'TS' },
        { name: 'Noa Reed', role: 'Growth', initial: 'NR' },
      ],
    },
    schema: [{ key: 'members', label: 'Members', type: 'list' }],
  },
  {
    type: 'cta',
    label: 'CTA Band',
    category: 'marketing',
    icon: MousePointerClick,
    description: 'Full-width call-to-action banner.',
    defaults: { headline: 'Ready to plant your first page?', subheadline: 'Build, preview, and publish in minutes.', ctaPrimary: 'Start free' },
    schema: [
      { key: 'headline', label: 'Headline', type: 'text' },
      { key: 'subheadline', label: 'Subheadline', type: 'textarea' },
      { key: 'ctaPrimary', label: 'Button', type: 'text' },
    ],
  },
  {
    type: 'stats',
    label: 'Stats',
    category: 'marketing',
    icon: TrendingUp,
    description: 'Row of big numbers.',
    defaults: {
      stats: [
        { value: '12k+', label: 'Sites published' },
        { value: '98%', label: 'Lighthouse score' },
        { value: '0', label: 'Paid ads run' },
        { value: '24/7', label: 'Uptime' },
      ],
    },
    schema: [{ key: 'stats', label: 'Stats', type: 'list' }],
  },
  {
    type: 'contact',
    label: 'Contact',
    category: 'social',
    icon: Phone,
    description: 'Contact info + form.',
    defaults: {
      title: 'Say hello',
      email: 'hello@yourstudio.com',
      phone: '+1 (555) 010-2024',
      address: '42 Orchard Lane, Greenhollow',
    },
    schema: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'address', label: 'Address', type: 'text' },
    ],
  },
  {
    type: 'newsletter',
    label: 'Newsletter',
    category: 'marketing',
    icon: Mail,
    description: 'Email signup form.',
    defaults: {
      headline: 'Get the field notes',
      subheadline: 'One quiet email a month. No spam, ever.',
      cta: 'Subscribe',
    },
    schema: [
      { key: 'headline', label: 'Headline', type: 'text' },
      { key: 'subheadline', label: 'Subheadline', type: 'textarea' },
      { key: 'cta', label: 'Button', type: 'text' },
    ],
  },
  {
    type: 'faq',
    label: 'FAQ',
    category: 'content',
    icon: HelpCircle,
    description: 'Accordion of common questions.',
    defaults: {
      title: 'Questions, answered',
      items: [
        { q: 'Is it really no-code?', a: 'Yes. Drag blocks, edit text, publish. No developer needed.' },
        { q: 'Do you run paid ads?', a: 'Never. Growth comes from organic search and word of mouth.' },
        { q: 'Can I use my own domain?', a: 'On Sprout and above, yes. Connect any domain in minutes.' },
      ],
    },
    schema: [{ key: 'items', label: 'Items', type: 'list' }],
  },
  {
    type: 'logos',
    label: 'Logo Cloud',
    category: 'social',
    icon: Layers,
    description: 'Row of partner/press logos.',
    defaults: { title: 'Trusted by quiet makers everywhere', names: ['Hollow Field', 'Slow Goods', 'Field & Co', 'Mossworks', 'North Yard'] },
    schema: [{ key: 'names', label: 'Names', type: 'list' }],
  },
  {
    type: 'footer',
    label: 'Footer',
    category: 'layout',
    icon: FooterIcon,
    description: 'Multi-column site footer.',
    defaults: {
      tagline: 'Grown locally. Built honestly.',
      columns: [
        { heading: 'Product', links: ['Builder', 'Templates', 'Pricing', 'Integrations'] },
        { heading: 'Company', links: ['About', 'Field notes', 'Careers', 'Contact'] },
        { heading: 'Resources', links: ['Docs', 'Community', 'Status', 'Changelog'] },
      ],
      copyright: '© 2025 Your Studio. Rooted in honest work.',
    },
    schema: [{ key: 'columns', label: 'Columns', type: 'list' }],
  },
  {
    type: 'spacer',
    label: 'Spacer',
    category: 'layout',
    icon: Square,
    description: 'Vertical breathing room.',
    defaults: { height: 64 },
    schema: [{ key: 'height', label: 'Height (px)', type: 'number' }],
  },
  {
    type: 'divider',
    label: 'Divider',
    category: 'layout',
    icon: Square,
    description: 'Horizontal rule — pick any color.',
    defaults: { color: '#d8d0c0' },
    schema: [{ key: 'color', label: 'Line color', type: 'color' }],
  },
]

export const BLOCK_LOOKUP: Record<string, BlockDef> = Object.fromEntries(
  BLOCK_DEFS.map((b) => [b.type, b]),
)

export const BLOCK_CATEGORIES = [
  { id: 'layout', label: 'Layout' },
  { id: 'content', label: 'Content' },
  { id: 'media', label: 'Media' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'social', label: 'Social' },
] as const
