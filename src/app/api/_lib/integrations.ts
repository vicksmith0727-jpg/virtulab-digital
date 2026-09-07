// Integrations catalog (no paid-ad integrations anywhere).
// Used by the lazy-seed in the GET /api/integrations route.
//
// The catalog is grouped by category. Each entry maps to a real tool the user can
// connect. MCP (Model Context Protocol) servers are first-class: they are the
// standard way for the AI assistant to "know where to go" — connecting one exposes
// its tools to the assistant so it can route requests to the right place.

export type IntegrationSeed = {
  name: string
  category: string
  description: string
  iconKey: string
  // Optional homepage / repo link rendered in the UI as "Learn more".
  link?: string
  // Optional tool capability hints the AI router uses to recommend tools.
  capabilities?: string[]
  // 'apikey' (default) means the user pastes API keys into a form.
  // 'oauth' means the card shows a "Log in with X" button that starts an OAuth flow.
  // 'appPassword' is a special case for WordPress (username + app password).
  authMethod?: 'apikey' | 'oauth' | 'appPassword' | 'none' | 'auto'
  // OAuth provider slug (used by /api/oauth/[provider]/start). Only used when
  // authMethod === 'oauth'.
  oauthProvider?: string
  fields: { key: string; label: string; type: string; placeholder?: string; help?: string }[]
  status?: 'available' | 'connected'
}

export const INTEGRATION_CATALOG: IntegrationSeed[] = [
  // ---------------------------------------------------------------- AI (built-in)
  {
    name: 'AI Copy (built-in)',
    category: 'ai',
    description:
      'Generate organic, on-brand copy directly inside the canvas. Uses your connected LLM provider (Built-in or Bring-Your-Own). No setup.',
    iconKey: 'Sparkles',
    fields: [],
    status: 'connected',
    capabilities: ['copywriting', 'block-content'],
  },

  // ---------------------------------------------------------------- CMS
  {
    name: 'WordPress',
    category: 'cms',
    description:
      'Publish your drag & drop pages to a self-hosted or WordPress.com site as posts/pages via the REST API. Supports Gutenberg, Kadence, Elementor, or Hybrid output. Uses an Application Password — no plugin required.',
    iconKey: 'PenLine',
    link: 'https://github.com/WordPress/wordpress-develop',
    capabilities: ['publish', 'cms', 'export', 'gutenberg', 'kadence', 'elementor', 'hybrid', 'seo'],
    authMethod: 'appPassword',
    fields: [
      { key: 'siteUrl', label: 'Site URL', type: 'text', placeholder: 'https://your-site.com', help: 'Your WordPress site root.' },
      { key: 'username', label: 'Username', type: 'text', help: 'A user with edit_posts capability.' },
      { key: 'appPassword', label: 'Application Password', type: 'password', help: 'WP Admin → Users → Profile → Application Passwords.' },
      { key: 'defaultStatus', label: 'Default post status', type: 'text', placeholder: 'draft', help: 'draft, pending, or publish.' },
      { key: 'defaultBuilder', label: 'Default builder', type: 'select', placeholder: 'gutenberg', help: 'gutenberg, kadence, elementor, or hybrid.' },
      { key: 'email', label: 'Business email (for SEO schema)', type: 'text', placeholder: 'hello@yourbusiness.com' },
      { key: 'phone', label: 'Business phone (for SEO schema)', type: 'text', placeholder: '+1 (555) 010-2024' },
      { key: 'address', label: 'Business address (for SEO schema)', type: 'text', placeholder: '42 Orchard Lane, Greenhollow' },
    ],
  },
  {
    name: 'WordPress MCP Server',
    category: 'cms',
    description:
      'MCP server that exposes WordPress posts, pages, media, and settings to AI assistants. Auto-detected when running locally (no manual endpoint). Lets the AI read and write your WP content on command.',
    iconKey: 'Network',
    link: 'https://github.com/RaheesAhmed/wordpress-mcp-server',
    authMethod: 'auto',
    capabilities: ['mcp', 'wordpress', 'content-automation', 'auto-detect'],
    fields: [],
  },
  {
    name: 'WordPress MCP (tropk-ai)',
    category: 'cms',
    description:
      'Connect WordPress to Claude.ai, Lovable, Cursor, Windsurf, and VirtuaLab Digital. 500+ pre-built tools across content, Elementor, Rank Math SEO, ACF, WooCommerce and ops. OAuth 2.1 with dynamic client registration — one-click connect, no API keys. Auto-detected when running locally.',
    iconKey: 'Network',
    link: 'https://github.com/tropk-ai/mcp-for-wordpress',
    authMethod: 'auto',
    capabilities: ['mcp', 'wordpress', 'elementor', 'rank-math-seo', 'woocommerce', 'acf', 'content-automation', 'auto-detect'],
    fields: [],
  },
  {
    name: 'Elementor MCP',
    category: 'cms',
    description:
      'MCP server for the Elementor page builder. Lets the AI create and edit Elementor sections, widgets, and templates programmatically.',
    iconKey: 'LayoutTemplate',
    link: 'https://github.com/msrbuilds/elementor-mcp',
    capabilities: ['mcp', 'elementor', 'page-builder'],
    fields: [
      { key: 'endpoint', label: 'MCP Endpoint', type: 'text' },
      { key: 'siteUrl', label: 'WordPress URL', type: 'text' },
    ],
  },
  {
    name: 'WordPress Plugin Boilerplate',
    category: 'cms',
    description:
      'Starter boilerplate for building a WordPress plugin that ships your VirtuaLab Digital blocks as a custom block set. Great for developers.',
    iconKey: 'Blocks',
    link: 'https://github.com/DevinVinson/WordPress-Plugin-Boilerplate',
    capabilities: ['developer', 'plugin'],
    fields: [],
  },

  // ---------------------------------------------------------------- MCP servers (ALL auto-detect — open-source, no manual endpoint)
  // These are open-source MCP servers the user runs on their laptop or VPS.
  // The app auto-detects them on common ports — no manual endpoint entry.
  // Each MCP server may need its own OAuth credentials configured at the MCP
  // server level (not in VirtuaLab Digital). We just connect to the MCP endpoint.
  {
    name: 'Microsoft MCP',
    category: 'mcp',
    description:
      "Microsoft's official MCP server. Connects the AI to Microsoft 365, Graph. Auto-detected when running locally or on your VPS — no manual endpoint.",
    iconKey: 'Boxes',
    link: 'https://github.com/microsoft/mcp',
    authMethod: 'auto',
    capabilities: ['mcp', 'microsoft-365', 'graph', 'auto-detect'],
    fields: [],
  },
  {
    name: 'Google MCP',
    category: 'mcp',
    description:
      "Google's MCP server for Google services. Auto-detected when running — no manual endpoint.",
    iconKey: 'Boxes',
    link: 'https://github.com/google/mcp',
    authMethod: 'auto',
    capabilities: ['mcp', 'google', 'auto-detect'],
    fields: [],
  },
  {
    name: 'Google Workspace MCP',
    category: 'mcp',
    description:
      'MCP server for Google Workspace — Docs, Sheets, Drive, Calendar, Gmail. Auto-detected when running — no manual endpoint. OAuth credentials are configured at the MCP server level, not here.',
    iconKey: 'Briefcase',
    link: 'https://github.com/taylorwilsdon/google_workspace_mcp',
    authMethod: 'auto',
    capabilities: ['mcp', 'docs', 'sheets', 'drive', 'gmail', 'auto-detect'],
    fields: [],
  },
  {
    name: 'Google Analytics MCP (official)',
    category: 'mcp',
    description:
      "Google's official MCP server for GA4. Auto-detected when running — no manual endpoint.",
    iconKey: 'LineChart',
    link: 'https://github.com/googleanalytics/google-analytics-mcp',
    authMethod: 'auto',
    capabilities: ['mcp', 'analytics', 'ga4', 'auto-detect'],
    fields: [],
  },
  {
    name: 'Google Ads MCP (official)',
    category: 'mcp',
    description:
      "Google's official MCP server for Google Ads. Read-only diagnostics. Auto-detected when running — no manual endpoint. (VirtuaLab Digital never recommends running paid ads.)",
    iconKey: 'Megaphone',
    link: 'https://github.com/googleads/google-ads-mcp',
    authMethod: 'auto',
    capabilities: ['mcp', 'ads', 'diagnostics', 'auto-detect'],
    fields: [],
  },
  {
    name: 'Google Analytics MCP (community)',
    category: 'mcp',
    description:
      'A community MCP server for Google Analytics. Auto-detected when running — no manual endpoint.',
    iconKey: 'LineChart',
    link: 'https://github.com/surendranb/google-analytics-mcp',
    authMethod: 'auto',
    capabilities: ['mcp', 'analytics', 'ga4', 'auto-detect'],
    fields: [],
  },
  {
    name: 'Search Console MCP',
    category: 'mcp',
    description:
      'MCP server for Google Search Console. Auto-detected when running — no manual endpoint.',
    iconKey: 'Search',
    link: 'https://github.com/saurabhsharma2u/search-console-mcp',
    authMethod: 'auto',
    capabilities: ['mcp', 'seo', 'search-console', 'auto-detect'],
    fields: [],
  },
  {
    name: 'Bing Webmaster MCP',
    category: 'mcp',
    description:
      'MCP server for Bing Webmaster Tools. Auto-detected when running — no manual endpoint.',
    iconKey: 'Globe',
    link: 'https://github.com/isiahw1/mcp-server-bing-webmaster',
    authMethod: 'auto',
    capabilities: ['mcp', 'seo', 'bing', 'auto-detect'],
    fields: [],
  },
  {
    name: 'One-Search MCP',
    category: 'mcp',
    description:
      'A unified web-search MCP. The AI can run real-time web searches. Auto-detected when running — no manual endpoint.',
    iconKey: 'SearchCode',
    link: 'https://github.com/yokingma/one-search-mcp',
    authMethod: 'auto',
    capabilities: ['mcp', 'web-search', 'research', 'auto-detect'],
    fields: [],
  },

  // ---------------------------------------------------------------- Design & storage MCP (auto-detect)
  {
    name: 'Figma MCP Bridge',
    category: 'mcp',
    description:
      'Figma plugin + MCP server — turn Figma designs into code. Auto-detected when running — no manual endpoint. Figma access token is configured at the MCP server level.',
    iconKey: 'Figma',
    link: 'https://github.com/gethopp/figma-mcp-bridge',
    authMethod: 'auto',
    capabilities: ['mcp', 'figma', 'design-to-code', 'auto-detect'],
    fields: [],
  },
  {
    name: 'Google Drive MCP',
    category: 'mcp',
    description:
      'MCP server for Google Drive. Auto-detected when running — no manual endpoint. OAuth credentials are configured at the MCP server level.',
    iconKey: 'HardDrive',
    link: 'https://github.com/piotr-agier/google-drive-mcp',
    authMethod: 'auto',
    capabilities: ['mcp', 'google-drive', 'storage', 'content', 'auto-detect'],
    fields: [],
  },
  {
    name: 'Dropbox MCP',
    category: 'mcp',
    description:
      "Dropbox's official MCP server. Auto-detected when running — no manual endpoint. Dropbox access token is configured at the MCP server level.",
    iconKey: 'Box',
    link: 'https://github.com/dropbox/mcp-server-dash',
    authMethod: 'auto',
    capabilities: ['mcp', 'dropbox', 'storage', 'auto-detect'],
    fields: [],
  },

  // ---------------------------------------------------------------- SEO tools (BUILT-IN — runs inside VirtuaLab Digital, no endpoint to connect)
  {
    name: 'Open SEO',
    category: 'seo',
    description:
      'BUILT-IN open-source SEO toolkit — meta tags, sitemaps, schema, and audits. Runs directly in VirtuaLab Digital, no endpoint to connect. Open the SEO Tools panel and click "Run Full Audit".',
    iconKey: 'SearchCheck',
    link: 'https://github.com/every-app/open-seo',
    authMethod: 'none',
    capabilities: ['seo', 'audits', 'schema', 'sitemaps', 'builtin'],
    fields: [],
  },
  {
    name: 'Seonaut',
    category: 'seo',
    description:
      'BUILT-IN SEO crawler + auditor (inspired by the open-source Seonaut). Crawls your page, finds broken links, missing meta, slow pages, image issues. Runs directly, no endpoint to connect.',
    iconKey: 'Radar',
    link: 'https://github.com/StJudeWasHere/seonaut',
    authMethod: 'none',
    capabilities: ['seo', 'crawler', 'audits', 'builtin'],
    fields: [],
  },
  {
    name: 'Google Search Console',
    category: 'seo',
    description: 'Monitor search performance and indexing. Log in with Google to connect — no manual verification token needed.',
    iconKey: 'Search',
    authMethod: 'oauth',
    oauthProvider: 'gsc',
    capabilities: ['seo', 'search-console', 'oauth'],
    fields: [
      { key: 'siteUrl', label: 'Site URL (auto-detected after login)', type: 'text', placeholder: 'https://your-site.com' },
    ],
  },
  {
    name: 'Bing Webmaster',
    category: 'seo',
    description: 'Submit sitemaps and track Bing search visibility. The classic direct connection (no MCP).',
    iconKey: 'Globe',
    fields: [
      { key: 'siteUrl', label: 'Site URL', type: 'text' },
      { key: 'apiKey', label: 'API Key', type: 'password' },
    ],
  },

  // ---------------------------------------------------------------- Social (OAuth login)
  {
    name: 'Facebook',
    category: 'social',
    description: 'Log in with Facebook to connect your Pages. Post updates and read insights from your published site.',
    iconKey: 'Facebook',
    authMethod: 'oauth',
    oauthProvider: 'facebook',
    capabilities: ['social', 'oauth', 'pages', 'insights'],
    fields: [],
  },
  {
    name: 'X (Twitter)',
    category: 'social',
    description: 'Log in with X to share new pages and read engagement. OAuth 2.0 with PKCE.',
    iconKey: 'Twitter',
    authMethod: 'oauth',
    oauthProvider: 'x',
    capabilities: ['social', 'oauth', 'posts'],
    fields: [],
  },
  {
    name: 'Instagram',
    category: 'social',
    description: 'Log in with Instagram (Meta Business) to connect your business profile and post previews.',
    iconKey: 'Instagram',
    authMethod: 'oauth',
    oauthProvider: 'instagram',
    capabilities: ['social', 'oauth', 'business'],
    fields: [],
  },
  {
    name: 'LinkedIn',
    category: 'social',
    description: 'Log in with LinkedIn to auto-share new posts to your company page. OAuth 2.0.',
    iconKey: 'Linkedin',
    authMethod: 'oauth',
    oauthProvider: 'linkedin',
    capabilities: ['social', 'oauth', 'company-page'],
    fields: [],
  },

  // ---------------------------------------------------------------- Analytics
  {
    name: 'Plausible',
    category: 'analytics',
    description: 'Privacy-friendly, cookie-free web analytics. Light and fast.',
    iconKey: 'BarChart3',
    capabilities: ['analytics'],
    fields: [
      { key: 'siteId', label: 'Site ID', type: 'text' },
      { key: 'domain', label: 'Domain', type: 'text' },
    ],
  },
  {
    name: 'Umami',
    category: 'analytics',
    description: 'Open-source, self-hosted web analytics. Simple, fast, no cookies.',
    iconKey: 'BarChart2',
    capabilities: ['analytics'],
    fields: [
      { key: 'websiteId', label: 'Website ID', type: 'text' },
      { key: 'scriptSrc', label: 'Script URL', type: 'text' },
    ],
  },
  {
    name: 'PostHog',
    category: 'analytics',
    description: 'Product analytics, session replay, and feature flags.',
    iconKey: 'MousePointerClick',
    capabilities: ['analytics', 'product'],
    fields: [
      { key: 'apiKey', label: 'Project API Key', type: 'password' },
      { key: 'host', label: 'Host', type: 'text' },
    ],
  },

  // ---------------------------------------------------------------- Forms
  {
    name: 'Tally',
    category: 'forms',
    description: 'Beautiful, no-code forms and surveys.',
    iconKey: 'ClipboardList',
    capabilities: ['forms'],
    fields: [{ key: 'formId', label: 'Form ID', type: 'text' }],
  },
  {
    name: 'Formspree',
    category: 'forms',
    description: 'Send form submissions to your inbox without a backend.',
    iconKey: 'Inbox',
    capabilities: ['forms'],
    fields: [{ key: 'formId', label: 'Form ID', type: 'text' }],
  },

  // ---------------------------------------------------------------- Email
  {
    name: 'MailerLite',
    category: 'email',
    description: 'Email marketing and automation for growing newsletters.',
    iconKey: 'Send',
    capabilities: ['email', 'newsletter'],
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password' },
      { key: 'groupId', label: 'Group ID', type: 'text' },
    ],
  },
  {
    name: 'Buttondown',
    category: 'email',
    description: 'A tiny, thoughtful newsletter service for writers.',
    iconKey: 'Newspaper',
    capabilities: ['email', 'newsletter'],
    fields: [{ key: 'apiKey', label: 'API Key', type: 'password' }],
  },
  {
    name: 'Resend',
    category: 'email',
    description: 'Developer-first transactional email API.',
    iconKey: 'Mail',
    capabilities: ['email', 'transactional'],
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password' },
      { key: 'from', label: 'From Address', type: 'text' },
    ],
  },

  // ---------------------------------------------------------------- Payments
  {
    name: 'Stripe',
    category: 'payments',
    description: 'Accept payments and subscriptions worldwide.',
    iconKey: 'CreditCard',
    capabilities: ['payments'],
    fields: [
      { key: 'publishableKey', label: 'Publishable Key', type: 'password' },
      { key: 'secretKey', label: 'Secret Key', type: 'password' },
    ],
  },
  {
    name: 'Lemon Squeezy',
    category: 'payments',
    description: 'Merchant of record for software sales and subscriptions.',
    iconKey: 'Citrus',
    capabilities: ['payments'],
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password' },
      { key: 'storeId', label: 'Store ID', type: 'text' },
    ],
  },

  // ---------------------------------------------------------------- Automation (auto-detect for open-source)
  {
    name: 'n8n',
    category: 'automation',
    description:
      'Open-source, self-hostable workflow automation. Connect VirtuaLab Digital to 400+ apps and build your own nodes. A free, private Zapier alternative. Auto-detected when running locally (default :5678) — no manual endpoint.',
    iconKey: 'Workflow',
    link: 'https://github.com/n8n-io',
    authMethod: 'auto',
    capabilities: ['automation', 'workflows', 'auto-detect'],
    fields: [],
  },
  {
    name: 'Zeroclaw',
    category: 'automation',
    description:
      'Fast, small, fully autonomous AI assistant infrastructure you can deploy anywhere. Swappable parts, any platform. Auto-detected when running locally (default :3001) — no manual endpoint. Use as a backend agent or route ALL AI through it via Settings → AI Provider.',
    iconKey: 'Bot',
    link: 'https://github.com/zeroclaw-labs/zeroclaw',
    authMethod: 'auto',
    capabilities: ['automation', 'agent', 'autonomous', 'auto-detect'],
    fields: [],
  },
  {
    name: 'Webhooks',
    category: 'automation',
    description: 'Send events to any URL — a generic connector for the rest.',
    iconKey: 'Webhook',
    capabilities: ['automation', 'webhooks'],
    fields: [
      { key: 'url', label: 'Endpoint URL', type: 'text' },
      { key: 'secret', label: 'Signing Secret', type: 'password' },
    ],
  },
  {
    name: 'Make',
    category: 'automation',
    description: 'Visual automation that connects VirtuaLab Digital to thousands of apps.',
    iconKey: 'Workflow',
    capabilities: ['automation'],
    fields: [{ key: 'webhookUrl', label: 'Webhook URL', type: 'text' }],
  },

  // ---------------------------------------------------------------- AI Coding / Free LLM (auto-detect)
  {
    name: 'OpenCode',
    category: 'coding',
    description:
      'Open-source AI coding agent (Claude Code alternative). Supports many LLM providers — including FREE ones (Ollama local, OpenRouter free models, Groq). Auto-detected when installed — use as your free LLM provider via Settings → AI Provider. Routes AI Copy + AI Chat through local Ollama = $0.',
    iconKey: 'Code2',
    link: 'https://github.com/anomalyco/opencode',
    authMethod: 'auto',
    capabilities: ['coding-agent', 'free-llm', 'byo-llm', 'auto-detect'],
    fields: [],
  },
  {
    name: 'Kilocode',
    category: 'coding',
    description:
      'Open-source AI coding agent (Claude Code alternative). Supports Gemini, Ollama, + free LLM providers. Auto-detected when installed — route AI through it for $0. Uses Google Gemini API (free tier: gemini-2.0-flash) or local Ollama models.',
    iconKey: 'Code2',
    link: 'https://github.com/kilocode/kilo',
    authMethod: 'auto',
    capabilities: ['coding-agent', 'free-llm', 'byo-llm', 'gemini', 'auto-detect'],
    fields: [],
  },
  {
    name: 'Gemini CLI',
    category: 'coding',
    description:
      "Google's open-source Gemini CLI — brings Gemini directly into your terminal. Free tier: gemini-2.0-flash (15 RPM, 1500 RPD). Auto-detected when installed. Pairs perfectly with Kilocode + OpenCode for free AI coding on your Linux laptop.",
    iconKey: 'Terminal',
    link: 'https://github.com/google-gemini/gemini-cli',
    authMethod: 'auto',
    capabilities: ['coding-agent', 'free-llm', 'gemini', 'google', 'auto-detect'],
    fields: [],
  },
  {
    name: 'Awesome OpenCode',
    category: 'coding',
    description:
      'A curated list of OpenCode plugins, providers, and configs. The fastest way to find a free LLM provider that works with VirtuaLab Digital.',
    iconKey: 'BookMarked',
    link: 'https://github.com/awesome-opencode',
    authMethod: 'none',
    capabilities: ['registry', 'free-llm'],
    fields: [],
  },

  // ---------------------------------------------------------------- Knowledge & Graph (open-source, auto-detect)
  {
    name: 'Obsidian MCP',
    category: 'mcp',
    description:
      'Connect Obsidian vault to VirtuaLab Digital via community MCP server. The AI can read, create, and link your notes. Turn content research into linked knowledge graphs. Auto-detected when the MCP server is running.',
    iconKey: 'NotebookPen',
    link: 'https://github.com/StevenStevenson/obsidian-mcp',
    authMethod: 'auto',
    capabilities: ['mcp', 'obsidian', 'notes', 'knowledge-graph', 'auto-detect'],
    fields: [],
  },
  {
    name: 'Graphify',
    category: 'mcp',
    description:
      'Knowledge graph generator — turn content into linked notes with bi-directional links. Creates Obsidian-compatible markdown with graph relationships. Great for hub-and-spoke content + topical authority mapping.',
    iconKey: 'Share2',
    link: 'https://github.com/graphify',
    authMethod: 'auto',
    capabilities: ['mcp', 'knowledge-graph', 'content', 'obsidian', 'auto-detect'],
    fields: [],
  },

  // ---------------------------------------------------------------- Storage
  {
    name: 'Cloudinary',
    category: 'storage',
    description: 'Image and video upload, optimization, and delivery.',
    iconKey: 'Cloud',
    capabilities: ['storage', 'images'],
    fields: [
      { key: 'cloudName', label: 'Cloud Name', type: 'text' },
      { key: 'apiKey', label: 'API Key', type: 'text' },
      { key: 'apiSecret', label: 'API Secret', type: 'password' },
    ],
  },
  {
    name: 'Uploadthing',
    category: 'storage',
    description: 'Type-safe file uploads for modern web apps.',
    iconKey: 'UploadCloud',
    capabilities: ['storage', 'uploads'],
    fields: [{ key: 'secret', label: 'Upload Secret', type: 'password' }],
  },
]

// Flatten to a quick lookup + category list
export const INTEGRATION_CATEGORIES = [
  { id: 'ai', label: 'AI', blurb: 'Built-in + Bring-Your-Own LLM' },
  { id: 'cms', label: 'CMS', blurb: 'Publish to WordPress & friends' },
  { id: 'mcp', label: 'MCP Servers', blurb: 'Tools the AI can call directly' },
  { id: 'social', label: 'Social', blurb: 'Log in with Facebook, X, Instagram, LinkedIn' },
  { id: 'seo', label: 'SEO', blurb: 'Search, audits, schema' },
  { id: 'analytics', label: 'Analytics', blurb: 'Privacy-friendly traffic' },
  { id: 'forms', label: 'Forms', blurb: 'Capture responses' },
  { id: 'email', label: 'Email', blurb: 'Newsletters & transactional' },
  { id: 'payments', label: 'Payments', blurb: 'Take money, honestly' },
  { id: 'automation', label: 'Automation', blurb: 'Wire everything together' },
  { id: 'coding', label: 'AI Coding', blurb: 'Free / open LLM providers' },
  { id: 'storage', label: 'Storage', blurb: 'Files & media' },
] as const
