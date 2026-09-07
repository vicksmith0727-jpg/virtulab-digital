// The 9 founder service pillars — the capabilities VirtuaLab Digital supports.
// These are the services a small-business-focused agency/freelancer offers,
// and the AI Tool Router uses them to recommend the right tools + templates.
//
// The mission: help small business owners who've been drained by agencies with
// no progress. Every capability here is built around honest, organic, local
// growth — no paid ads, no churn, no fluff.

export type ServicePillar = {
  id: string
  label: string
  blurb: string
  // The integration capabilities (from INTEGRATION_CATALOG) that map to this pillar
  relatedCapabilities: string[]
  // The AI routing hint — what the assistant should recommend for this pillar
  aiHint: string
}

export const SERVICE_PILLARS: ServicePillar[] = [
  {
    id: 'strategy',
    label: 'Executive & Client Strategy',
    blurb: 'Project management, discovery, proposals, retention.',
    relatedCapabilities: ['automation'],
    aiHint: 'For client strategy: use the AI Tool Router to draft proposals, project plans, and discovery questions. Connect n8n for client onboarding automations.',
  },
  {
    id: 'ai-seo',
    label: 'Advanced AI & Next-Gen SEO',
    blurb: 'Reverse AI prompting, AI SEO, AEO & GEO (answer/generative engine optimization).',
    relatedCapabilities: ['seo', 'mcp', 'web-search', 'research'],
    aiHint: 'For AI SEO / AEO / GEO: use One-Search MCP for research, Open SEO + Seonaut for audits, Search Console MCP for performance. Use the small SEO models (gemma, phi) via BYO-LLM for fast on-page tasks.',
  },
  {
    id: 'technical-seo',
    label: 'Core & Technical SEO',
    blurb: 'Technical audits, schema, on/off-page, local/hyperlocal (GMB), QA.',
    relatedCapabilities: ['seo', 'search-console', 'bing', 'audits', 'schema'],
    aiHint: 'For technical SEO: Seonaut (crawler), Open SEO (schema/audits), Search Console MCP + Bing Webmaster MCP (indexing). Local SEO templates include GMB-optimized NAP blocks.',
  },
  {
    id: 'web-dev',
    label: 'Web Development',
    blurb: 'Custom web development & website design.',
    relatedCapabilities: ['publish', 'cms', 'gutenberg', 'kadence', 'elementor', 'hybrid', 'design-to-code'],
    aiHint: 'For web dev: use the drag & drop builder, then Publish to WordPress (Gutenberg/Kadence/Elementor/Hybrid). For design→code, connect Figma MCP Bridge.',
  },
  {
    id: 'content',
    label: 'Content & Multi-Media Production',
    blurb: 'Copywriting, podcast (Riverside), video (CapCut), YouTube SEO, Canva + AI images.',
    relatedCapabilities: ['copywriting', 'block-content', 'storage', 'images'],
    aiHint: 'For content: use AI Copy (built-in) for copywriting, Cloudinary/Uploadthing for media, Image Generation for AI images. For YouTube SEO, use the small models for transcript optimization.',
  },
  {
    id: 'marketing-ops',
    label: 'Marketing, Automation & Operations',
    blurb: 'Automation, email/CRM, social media, lead gen, inbox, market research.',
    relatedCapabilities: ['automation', 'email', 'newsletter', 'forms', 'social', 'oauth'],
    aiHint: 'For marketing ops: n8n (automation), MailerLite/Buttondown (email), Tally/Formspree (lead gen), Facebook/X/Instagram/LinkedIn (social, OAuth login), Zeroclaw (autonomous outreach research).',
  },
]

// Small LLM models the user runs locally (Ollama-style) for different tasks.
// These show up as preset chips in Settings → AI Provider, with task routing
// guidance: chatting → conversational models, SEO → small fast models.
export type LlmModelPreset = {
  id: string
  label: string
  baseUrl: string
  model: string
  task: 'chat' | 'seo' | 'general'
  note: string
}

export const LLM_MODEL_PRESETS: LlmModelPreset[] = [
  // ── Fastest (automation pipeline steps) ──
  {
    id: 'qwen25-1b',
    label: 'Qwen2.5 1.5B (fastest)',
    baseUrl: 'http://localhost:11434/v1',
    model: 'qwen2.5:1.5b',
    task: 'seo',
    note: 'Fastest model. ~150ms. Use for quick classification, keyword extraction, yes/no decisions in automation chains.',
  },
  {
    id: 'deepseek-r1',
    label: 'DeepSeek R1 (1.5B)',
    baseUrl: 'http://localhost:11434/v1',
    model: 'deepseek-r1:1.5b',
    task: 'seo',
    note: 'Reasoning model. ~200ms. Use for SEO analysis, intent classification, content gap detection.',
  },
  {
    id: 'qwen25-coder',
    label: 'Qwen2.5 Coder (3B)',
    baseUrl: 'http://localhost:11434/v1',
    model: 'qwen2.5-coder:3b',
    task: 'seo',
    note: 'Code-focused. ~300ms. Use for schema generation, code snippets, technical SEO.',
  },
  // ── Chat models (conversational + content) ──
  {
    id: 'lfm25',
    label: 'LiquidAI LFM2.5 (2.6B)',
    baseUrl: 'http://localhost:11434/v1',
    model: 'hf.co/LiquidAI/LFM2.5-2.6B-GGUF:Q5_K_M',
    task: 'chat',
    note: 'Chat model. ~400ms. Good for AI Copy + AI Tool Router chat.',
  },
  {
    id: 'gemma4',
    label: 'Gemma4 (content gen)',
    baseUrl: 'http://localhost:11434/v1',
    model: 'gemma4:latest',
    task: 'general',
    note: 'Content generation. ~500ms. Use for blog posts, social captions, final output in pipelines.',
  },
  {
    id: 'qwen25-7b',
    label: 'Qwen2.5 7B (heavy)',
    baseUrl: 'http://localhost:11434/v1',
    model: 'qwen2.5:7b',
    task: 'general',
    note: 'Bigger model. ~1-2s. Use for complex reasoning, long-form content, strategy analysis.',
  },
]

// Niche target verticals — the small-business categories VirtuaLab Digital
// serves. These map to local-business templates (see src/app/api/_lib/templates.ts)
// and inform the AI router's recommendations.
export const NICHE_VERTICALS: string[] = [
  'Construction & Concrete Services',
  'Electrical',
  'Fireprotection',
  'HVAC',
  'Roofing',
  'Plumbing',
  'Home Improvement & Outdoor Living',
  'Flooring & Epoxy Coating',
  'Garage Flooring Services',
  'House Cleaning & General Cleaning Services',
  'Pest Control (Fumigation, Food, General, Termite)',
  'Lawn Care & Landscaping',
  'Locksmith, Digital Lock, Vault',
  'General Healthcare Services',
  'Dental',
  'Orthopaedic',
  'Wellness Clinics',
  'Senior Living',
  'Hair Replacement',
  'Coaching Businesses',
  'Real Estate & Real Estate Magazines',
  'Professional Services',
  'University & Higher Education',
  'Sports & IT',
  'E-commerce & Pastry',
  'Basic Tattoo Services',
  'Pet Sanctuary',
  'NGO & Humanitarian Organizations',
]
