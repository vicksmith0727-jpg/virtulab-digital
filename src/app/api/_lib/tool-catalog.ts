// Full tool catalog — all tools across SEO, Social Media, and Content Generation.
// This powers the "Tools" dropdown in the nav and the individual tool views.
// Inspired by SomnusAI's tool structure but adapted for small businesses.

export type ToolCategory = 'seo' | 'social' | 'content'
export type ToolId = string

export type ToolDef = {
  id: ToolId
  label: string
  icon: string // lucide icon name
  category: ToolCategory
  description: string
  // Which endpoint to call: 'seo-check' | 'seo-audit' | 'ai-chat' | 'seo-sitemap' | 'seo-meta' | 'builtin'
  endpoint: 'seo-check' | 'seo-audit' | 'ai-chat' | 'seo-sitemap' | 'seo-meta' | 'builtin'
  // What input the tool needs: 'url' | 'text' | 'project' | 'url-or-project' | 'none'
  input: 'url' | 'text' | 'project' | 'url-or-project' | 'none'
  // Whether this tool is built-in (runs server-side) or AI-powered
  builtin?: boolean
  ai?: boolean
  // If the tool needs an external API (not built-in, not AI)
  needsApiKey?: string
  needsIntegration?: string
}

// ── SEO Tools (31 tools, already in /api/seo/tools) ──
// We import those dynamically — this catalog adds the Social + Content tools.

// ── Social Media Tools ──
export const SOCIAL_TOOLS: ToolDef[] = [
  {
    id: 'social-hub',
    label: 'Social Hub',
    icon: 'Share2',
    category: 'social',
    description: 'View all your social accounts in one place. Schedule, draft, and track posts across Facebook, X, Instagram, LinkedIn.',
    endpoint: 'builtin',
    input: 'none',
    builtin: true,
  },
  {
    id: 'caption-generator',
    label: 'Caption Generator',
    icon: 'MessageSquare',
    category: 'social',
    description: 'AI-generate engaging captions for any platform — Facebook, Instagram, X, LinkedIn. Pick tone, length, hashtags.',
    endpoint: 'ai-chat',
    input: 'text',
    ai: true,
  },
  {
    id: 'hashtag-sets',
    label: 'Hashtag Sets',
    icon: 'Hash',
    category: 'social',
    description: 'Generate hashtag sets by niche. Mix branded, community, and trending tags for maximum reach.',
    endpoint: 'ai-chat',
    input: 'text',
    ai: true,
  },
  {
    id: 'bio-optimizer',
    label: 'Bio Optimizer',
    icon: 'User',
    category: 'social',
    description: 'Optimize your social media bios for each platform. Keyword-rich, character-limit-aware, with CTA.',
    endpoint: 'ai-chat',
    input: 'text',
    ai: true,
  },
  {
    id: 'repurpose-blog',
    label: 'Repurpose Blog',
    icon: 'RefreshCw',
    category: 'social',
    description: 'Turn a blog post into 10 social posts — one per platform, each optimized for that platform\'s format.',
    endpoint: 'ai-chat',
    input: 'text',
    ai: true,
  },
  {
    id: 'carousel-writer',
    label: 'Carousel / Thread Writer',
    icon: 'GalleryVertical',
    category: 'social',
    description: 'Generate Instagram carousel slides or X/Twitter threads from a topic. Each slide has a hook + content.',
    endpoint: 'ai-chat',
    input: 'text',
    ai: true,
  },
  {
    id: 'social-calendar',
    label: 'Content Calendar Generator',
    icon: 'Calendar',
    category: 'social',
    description: 'Generate a 30-day social content calendar for your niche. Mix of educational, promotional, engagement posts.',
    endpoint: 'ai-chat',
    input: 'text',
    ai: true,
  },
  {
    id: 'social-audit',
    label: 'Social Profile Audit',
    icon: 'Search',
    category: 'social',
    description: 'Audit a social media profile (URL). Check bio, post frequency, engagement signals, consistency.',
    endpoint: 'seo-check',
    input: 'url',
    builtin: true,
  },
  {
    id: 'comment-responder',
    label: 'Comment Responder',
    icon: 'MessageCircle',
    category: 'social',
    description: 'AI-generate replies to comments. Pick tone (friendly, professional, witty) and language.',
    endpoint: 'ai-chat',
    input: 'text',
    ai: true,
  },
  {
    id: 'reel-script',
    label: 'Reel / Short Script',
    icon: 'Video',
    category: 'social',
    description: 'Generate a script for a 30-60 second Reel/Short. Hook, body, CTA, shot list.',
    endpoint: 'ai-chat',
    input: 'text',
    ai: true,
  },
]

// ── Content Generation Tools ──
export const CONTENT_TOOLS: ToolDef[] = [
  {
    id: 'blog-generator',
    label: 'Blog Generator',
    icon: 'FileText',
    category: 'content',
    description: 'Generate a full blog post from a topic + keyword. SEO-optimized, with H1/H2/H3 structure, meta tags, internal link suggestions.',
    endpoint: 'ai-chat',
    input: 'text',
    ai: true,
  },
  {
    id: 'programmatic-seo',
    label: 'Programmatic SEO',
    icon: 'Layers',
    category: 'content',
    description: 'Generate 100s of SEO landing pages from a template + data. For service-area pages, location pages, product variants.',
    endpoint: 'ai-chat',
    input: 'text',
    ai: true,
  },
  {
    id: 'content-decay',
    label: 'Content Decay Detector',
    icon: 'TrendingDown',
    category: 'content',
    description: 'Find blog posts that are losing traffic. Compare historical vs current performance (needs GSC MCP).',
    endpoint: 'builtin',
    input: 'none',
    needsIntegration: 'Google Search Console MCP',
  },
  {
    id: 'ai-overview-optimizer',
    label: 'AI Overview Optimizer',
    icon: 'Sparkles',
    category: 'content',
    description: 'Optimize content to appear in Google AI Overviews / ChatGPT / Perplexity. Structure for answer engines (AEO/GEO).',
    endpoint: 'ai-chat',
    input: 'text',
    ai: true,
  },
  {
    id: 'content-rewriter',
    label: 'Content Rewriter',
    icon: 'RefreshCw',
    category: 'content',
    description: 'Rewrite existing content for better SEO, readability, and freshness. Keep the meaning, improve the wording.',
    endpoint: 'ai-chat',
    input: 'text',
    ai: true,
  },
  {
    id: 'meta-title-gen',
    label: 'Meta Title Generator',
    icon: 'Type',
    category: 'content',
    description: 'AI-generate optimized meta titles under 60 chars. Keyword-first, click-worthy, not clickbait.',
    endpoint: 'ai-chat',
    input: 'text',
    ai: true,
  },
  {
    id: 'meta-desc-gen',
    label: 'Meta Description Generator',
    icon: 'AlignLeft',
    category: 'content',
    description: 'AI-generate optimized meta descriptions under 160 chars. With CTA, keyword, honest promise.',
    endpoint: 'ai-chat',
    input: 'text',
    ai: true,
  },
  {
    id: 'faq-generator',
    label: 'FAQ Generator',
    icon: 'HelpCircle',
    category: 'content',
    description: 'Generate FAQ sections with schema-ready Q&A. Great for rich results + voice search.',
    endpoint: 'ai-chat',
    input: 'text',
    ai: true,
  },
  {
    id: 'schema-generator',
    label: 'Schema Generator (JSON-LD)',
    icon: 'Code2',
    category: 'content',
    description: 'Generate LocalBusiness / FAQ / Article / Product / Breadcrumb JSON-LD schema. Copy-paste into your HTML.',
    endpoint: 'ai-chat',
    input: 'text',
    ai: true,
  },
  {
    id: 'content-brief',
    label: 'Content Brief Generator',
    icon: 'ClipboardList',
    category: 'content',
    description: 'Generate an SEO content brief: target keyword, secondary keywords, H1/H2 structure, word count, internal links, meta.',
    endpoint: 'ai-chat',
    input: 'text',
    ai: true,
  },
  {
    id: 'outline-generator',
    label: 'Blog Outline Generator',
    icon: 'List',
    category: 'content',
    description: 'Generate a blog post outline from a topic. H1, H2s, H3s, key points per section, suggested intro + conclusion.',
    endpoint: 'ai-chat',
    input: 'text',
    ai: true,
  },
  {
    id: 'landing-page-copy',
    label: 'Landing Page Copy',
    icon: 'Layout',
    category: 'content',
    description: 'Generate full landing page copy: hero headline, subheadline, features, benefits, testimonial placeholders, CTA.',
    endpoint: 'ai-chat',
    input: 'text',
    ai: true,
  },
  {
    id: 'email-sequence',
    label: 'Email Sequence Writer',
    icon: 'Mail',
    category: 'content',
    description: 'Generate a 5-7 email nurture sequence. Welcome, value, soft pitch, hard pitch, follow-up. Subject lines included.',
    endpoint: 'ai-chat',
    input: 'text',
    ai: true,
  },
  {
    id: 'press-release',
    label: 'Press Release Writer',
    icon: 'Newspaper',
    category: 'content',
    description: 'Generate a press release for your business announcement. Newsworthy angle, quotes, boilerplate, contact.',
    endpoint: 'ai-chat',
    input: 'text',
    ai: true,
  },
  {
    id: 'product-description',
    label: 'Product Description Writer',
    icon: 'ShoppingBag',
    category: 'content',
    description: 'Generate e-commerce product descriptions. Features, benefits, specs, SEO keywords, emotional hook.',
    endpoint: 'ai-chat',
    input: 'text',
    ai: true,
  },
]
