// Tool Orchestration Engine — chains multiple tools into automation flows.
//
// A "flow" is a sequence of steps, each step being a tool invocation.
// Each step's output feeds into the next step's input, enabling pipelines like:
//
//   Keyword Research → Content Brief → Blog Generator → Meta Title → Meta Description → Publish
//
// Or for SEO:
//   Full Audit → Broken Links → Headings → Schema Validator → Schema Generator → Fix + Re-audit
//
// Flows can be:
//   - Run manually (click "Run flow" in the UI)
//   - Triggered by events (page published, new project created, weekly schedule)
//   - Connected to the Automation view's on/off toggles
//
// Each step has:
//   - toolId: which tool to run (references the tool catalogs)
//   - input: where the input comes from — 'user' (typed by user), 'previous' (output of the previous step), or 'fixed' (a preset value)
//   - inputKey: if 'previous', which key from the previous step's output to use
//   - promptTemplate: for AI tools, a template string with {input} and {previous.X} placeholders

export type FlowStepInput = 'user' | 'previous' | 'fixed'

export type FlowStep = {
  id: string
  toolId: string
  toolLabel: string
  category: string
  input: FlowStepInput
  inputKey?: string // which key from the previous step's output
  fixedValue?: string // for 'fixed' input type
  promptTemplate?: string // for AI tools — template with {input}, {prev.output} etc.
  label?: string // custom label for this step in the flow
}

export type Flow = {
  id: string
  name: string
  description: string
  category: string // 'seo' | 'content' | 'social' | 'pm' | 'automation' | 'custom'
  steps: FlowStep[]
  enabled: boolean
  trigger?: 'manual' | 'on-publish' | 'weekly' | 'daily' | 'monthly'
  createdAt: string
  updatedAt: string
}

export type FlowRunResult = {
  stepId: string
  toolId: string
  label: string
  status: 'success' | 'error' | 'skipped'
  input: string
  output: any
  error?: string
  durationMs: number
}

export type FlowExecution = {
  flowId: string
  flowName: string
  startedAt: string
  completedAt?: string
  results: FlowRunResult[]
  status: 'running' | 'completed' | 'failed'
}

// ── Pre-built flow templates ──────────────────────────────────────────────
// These are the "wired" flows the user asked for — tools chained together
// into meaningful pipelines.

export const FLOW_TEMPLATES: Omit<Flow, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'SEO Content Pipeline',
    description: 'Keyword Research (with PAS/PAA/FAQs) → Content Brief → Blog Generator → Meta Title → Meta Description → Schema Generator',
    category: 'seo',
    enabled: false,
    trigger: 'manual',
    steps: [
      {
        id: 'step-1',
        toolId: 'keyword-research-enriched',
        toolLabel: 'Keyword Research (Enriched)',
        category: 'seo',
        input: 'user',
        label: 'Research keywords + PAS + PAA + FAQs',
      },
      {
        id: 'step-2',
        toolId: 'content-brief',
        toolLabel: 'Content Brief Generator',
        category: 'content',
        input: 'previous',
        inputKey: 'keywords',
        label: 'Generate content brief from keywords',
        promptTemplate: 'Create an SEO content brief using these keywords: {prev.output}. Include: target keyword, 5 secondary keywords, H1/H2 structure, word count, meta title + description.',
      },
      {
        id: 'step-3',
        toolId: 'blog-generator',
        toolLabel: 'Blog Generator',
        category: 'content',
        input: 'previous',
        inputKey: 'brief',
        label: 'Write the blog post',
        promptTemplate: 'Write a full blog post based on this content brief: {prev.output}. SEO-optimized. 800-1200 words. Include H1, H2s, intro, body, conclusion, meta title, meta description.',
      },
      {
        id: 'step-4',
        toolId: 'meta-title-gen',
        toolLabel: 'Meta Title Generator',
        category: 'content',
        input: 'previous',
        label: 'Generate 5 meta title options',
        promptTemplate: 'Generate 5 meta title options under 60 chars for this blog post: {prev.output}. Keyword-first, click-worthy.',
      },
      {
        id: 'step-5',
        toolId: 'meta-desc-gen',
        toolLabel: 'Meta Description Generator',
        category: 'content',
        input: 'previous',
        label: 'Generate 5 meta description options',
        promptTemplate: 'Generate 5 meta description options under 160 chars for this blog post: {prev.output}. Include CTA, keyword, honest promise.',
      },
      {
        id: 'step-6',
        toolId: 'schema-gen',
        toolLabel: 'Schema Generator',
        category: 'content',
        input: 'previous',
        label: 'Generate Article + FAQ schema',
        promptTemplate: 'Generate JSON-LD schema (Article + FAQPage) for this blog post: {prev.output}. Return only the JSON-LD.',
      },
    ],
  },
  {
    name: 'Full SEO Audit + Fix Pipeline',
    description: 'Full Audit → Broken Links → Headings → Schema → Schema Generator → Re-audit',
    category: 'seo',
    enabled: false,
    trigger: 'weekly',
    steps: [
      {
        id: 'step-1',
        toolId: 'audit',
        toolLabel: 'Full SEO Audit',
        category: 'audit',
        input: 'user',
        label: 'Run full audit (URL)',
      },
      {
        id: 'step-2',
        toolId: 'broken-links',
        toolLabel: 'Broken Link Checker',
        category: 'audit',
        input: 'previous',
        inputKey: 'url',
        label: 'Check broken links',
      },
      {
        id: 'step-3',
        toolId: 'headings',
        toolLabel: 'Heading Structure Analyzer',
        category: 'audit',
        input: 'previous',
        inputKey: 'url',
        label: 'Analyze heading structure',
      },
      {
        id: 'step-4',
        toolId: 'schema-validator',
        toolLabel: 'Schema Validator',
        category: 'technical',
        input: 'previous',
        inputKey: 'url',
        label: 'Validate schema',
      },
      {
        id: 'step-5',
        toolId: 'schema-gen',
        toolLabel: 'Schema Generator',
        category: 'content',
        input: 'previous',
        label: 'Generate missing schema',
        promptTemplate: 'Based on this audit result, generate JSON-LD schema for the missing types: {prev.output}',
      },
    ],
  },
  {
    name: 'Social Media Content Pipeline',
    description: 'Blog Post → Repurpose into 5 social posts → Caption Generator → Hashtag Sets → Schedule',
    category: 'social',
    enabled: false,
    trigger: 'manual',
    steps: [
      {
        id: 'step-1',
        toolId: 'repurpose-blog',
        toolLabel: 'Repurpose Blog',
        category: 'social',
        input: 'user',
        label: 'Turn blog into 5 social posts',
        promptTemplate: 'Turn this blog post into 5 social posts (1 Facebook, 1 Instagram, 1 X, 1 LinkedIn, 1 Story): {input}',
      },
      {
        id: 'step-2',
        toolId: 'caption-generator',
        toolLabel: 'Caption Generator',
        category: 'social',
        input: 'previous',
        label: 'Generate captions for each platform',
        promptTemplate: 'Generate engaging captions for these social posts: {prev.output}. Tone: warm, organic. Include 2-3 hashtags per post.',
      },
      {
        id: 'step-3',
        toolId: 'hashtag-sets',
        toolLabel: 'Hashtag Sets',
        category: 'social',
        input: 'previous',
        label: 'Generate hashtag sets',
        promptTemplate: 'Generate 3 hashtag sets (10 tags each) for these social posts: {prev.output}. Mix branded, community, and trending.',
      },
    ],
  },
  {
    name: 'Local SEO Pipeline',
    description: 'Keyword Research (Local) → Schema Generator (LocalBusiness) → Content Brief → Landing Page Copy → Meta Tags → Audit',
    category: 'seo',
    enabled: false,
    trigger: 'manual',
    steps: [
      {
        id: 'step-1',
        toolId: 'keyword-research-enriched',
        toolLabel: 'Keyword Research (Local + PAS + PAA)',
        category: 'seo',
        input: 'user',
        label: 'Research local keywords + PAA + FAQs',
      },
      {
        id: 'step-2',
        toolId: 'schema-gen',
        toolLabel: 'Schema Generator (LocalBusiness)',
        category: 'content',
        input: 'previous',
        label: 'Generate LocalBusiness schema',
        promptTemplate: 'Generate LocalBusiness JSON-LD schema for: {prev.output}. Include NAP, opening hours, geo coordinates, price range.',
      },
      {
        id: 'step-3',
        toolId: 'content-brief',
        toolLabel: 'Content Brief',
        category: 'content',
        input: 'previous',
        label: 'Create content brief',
        promptTemplate: 'Create a content brief for a local service page using: {prev.output}',
      },
      {
        id: 'step-4',
        toolId: 'landing-page-copy',
        toolLabel: 'Landing Page Copy',
        category: 'content',
        input: 'previous',
        label: 'Generate landing page copy',
        promptTemplate: 'Generate full landing page copy based on this brief: {prev.output}',
      },
      {
        id: 'step-5',
        toolId: 'meta-title-gen',
        toolLabel: 'Meta Title',
        category: 'content',
        input: 'previous',
        label: 'Generate meta title',
      },
      {
        id: 'step-6',
        toolId: 'meta-desc-gen',
        toolLabel: 'Meta Description',
        category: 'content',
        input: 'previous',
        label: 'Generate meta description',
      },
    ],
  },
  {
    name: 'Hub & Spoke Content Pipeline',
    description: 'Hub & Spoke Generator → for each spoke: Content Brief → Blog Generator → Meta Tags → Schema → internal link map',
    category: 'seo',
    enabled: false,
    trigger: 'manual',
    steps: [
      {
        id: 'step-1',
        toolId: 'hub-spoke-generator',
        toolLabel: 'Hub & Spoke Generator',
        category: 'strategy',
        input: 'user',
        label: 'Generate hub + spokes architecture',
      },
      {
        id: 'step-2',
        toolId: 'content-brief',
        toolLabel: 'Content Brief (per spoke)',
        category: 'content',
        input: 'previous',
        label: 'Generate brief for each spoke',
        promptTemplate: 'Create a content brief for each spoke page in this hub-and-spoke plan: {prev.output}',
      },
      {
        id: 'step-3',
        toolId: 'blog-generator',
        toolLabel: 'Blog Generator (per spoke)',
        category: 'content',
        input: 'previous',
        label: 'Write each spoke page',
        promptTemplate: 'Write a full blog post for each spoke based on these briefs: {prev.output}',
      },
    ],
  },
]
