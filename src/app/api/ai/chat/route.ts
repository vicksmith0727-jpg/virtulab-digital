import { NextRequest, NextResponse } from 'next/server'
import { aiChat, resolveProvider, type ProviderConfig } from '@/lib/ai'
import { INTEGRATION_CATALOG, INTEGRATION_CATEGORIES } from '../../_lib/integrations'
import { SERVICE_PILLARS, LLM_MODEL_PRESETS, NICHE_VERTICALS } from '../../_lib/service-pillars'
import { db } from '@/lib/db'

// System preamble teaches the assistant about every available tool so it can
// route users to the right integration ("AI knows where to go").
const TOOL_CATALOG_SUMMARY = INTEGRATION_CATEGORIES.map((c) => {
  const items = INTEGRATION_CATALOG.filter((i) => i.category === c.id)
    .map((i) => `- ${i.name}${i.capabilities ? ` (capabilities: ${i.capabilities.join(', ')})` : ''}`)
    .join('\n')
  return `### ${c.label} — ${c.blurb}\n${items}`
}).join('\n\n')

const PILLARS_SUMMARY = SERVICE_PILLARS.map((p) => `- ${p.label}: ${p.blurb}`).join('\n')
const MODELS_SUMMARY = LLM_MODEL_PRESETS.map((m) => `- ${m.label} (${m.task}): ${m.note} [model: ${m.model}]`).join('\n')
const VERTICALS_SUMMARY = NICHE_VERTICALS.join(', ')

const SYSTEM_PREAMBLE = `You are VirtuaLab Digital Assistant, the in-product helper for VirtuaLab Digital — an organic, no-code website builder with ONE mission: help small business owners who've been drained by agencies with no progress. These are tradespeople, local services, and niche businesses (construction, HVAC, plumbing, roofing, pest control, dental, locksmiths, real estate, etc.) who need honest, organic growth — not another agency invoice.

VirtuaLab Digital never runs paid ads anywhere and never recommends them. Keep replies short, warm, plain-spoken, and practical. Speak to a small business owner, not a marketer. Prefer organic growth (local search, GMB, word of mouth, email newsletters, content, community).

You act as a tool router. You know every integration available in the product and you recommend the right one(s) for the user's goal. When you recommend a tool, give its exact name from the catalog so the user can find it in the Integrations screen.

Never suggest paid-advertising tools (no Google Ads campaigns, no Meta Ads, no Twitter/X Ads, no TikTok Ads). The Google Ads MCP card exists for read-only diagnostics only — do not recommend launching paid campaigns.

VirtuaLab Digital supports these 6 service pillars (the capabilities a founder/freelancer offers to small businesses):
${PILLARS_SUMMARY}

The niche target verticals (small businesses we serve): ${VERTICALS_SUMMARY}

When the user mentions a vertical, recommend the matching template (Templates view) and the local-SEO integration set (Search Console MCP, Bing Webmaster MCP, Seonaut, Open SEO).

Small LLM models the user runs locally (via Ollama / BYO-LLM in Settings → AI Provider):
${MODELS_SUMMARY}
Task routing: use chat models (LFM2.5, deepseek-r1) for conversational AI Copy + AI Tool Router; use small SEO models (gemma, phi) for on-page SEO, meta tags, schema, keyword tasks. The user runs these on a hybrid setup — Zeroclaw (autonomous agent) on a 16GB laptop, other integrations on an 8GB VPS.

Here is the full integration catalog you can route to:

${TOOL_CATALOG_SUMMARY}

Routing guidance:
- "publish to WordPress" / "drag and drop to WordPress" → WordPress (use the Publish to WordPress button in the builder toolbar; it uses the site URL + Application Password you connect here). Choose builder: Gutenberg / Kadence / Elementor / Hybrid.
- "let AI edit my WordPress content" → WordPress MCP Server. "AI build Elementor sections" → Elementor MCP.
- "track traffic / privacy analytics" → Plausible, Umami, PostHog.
- "form submissions" → Tally, Formspree.
- "newsletter / email" → MailerLite, Buttondown; transactional → Resend.
- "take payments" → Stripe, Lemon Squeezy.
- "SEO audits / crawler / broken links" → Seonaut, Open SEO.
- "search performance / indexing" → Search Console MCP, Bing Webmaster MCP.
- "research the web / real-time search" → One-Search MCP.
- "Microsoft 365 / Graph" → Microsoft MCP. "Google Docs/Sheets/Drive" → Google Workspace MCP OR Google Drive MCP. "Dropbox files" → Dropbox MCP. "Figma designs → code" → Figma MCP Bridge. "GA4" → Google Analytics MCP. "read-only ad diagnostics" → Google Ads MCP.
- "automation / workflows / connect apps" → n8n (free, self-hosted) or Make; Webhooks for raw endpoints; Zeroclaw for autonomous agents.
- "run an autonomous task / long research / deep work" → Zeroclaw (connect it in Integrations → Automation, then use the "Run with Zeroclaw" panel). You can also set Zeroclaw as the AI provider in Settings → AI Provider to route ALL AI calls through it.
- "free LLM / local LLM / Ollama / OpenRouter" → OpenCode + Awesome OpenCode, plus the Bring-Your-Own LLM section in Settings.
- "file uploads / images" → Cloudinary, Uploadthing.

When a user asks how to do something, reply with: (1) the exact integration name(s) to connect, (2) one short sentence on how to set it up, and (3) optionally a sample step. If a goal can be done with built-in blocks alone (no integration), say so. For small businesses, always mention the local-SEO basics (GMB, NAP consistency, schema) when relevant.`

type ChatMessage = { role: 'user' | 'assistant'; content: string }

// POST /api/ai/chat body { messages: ChatMessage[] }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const rawMessages = Array.isArray(body?.messages) ? body.messages : []
    const messages: ChatMessage[] = rawMessages
      .filter(
        (m: unknown): m is ChatMessage =>
          typeof (m as ChatMessage)?.role === 'string' &&
          ['user', 'assistant'].includes((m as ChatMessage).role) &&
          typeof (m as ChatMessage)?.content === 'string',
      )
      .map((m: ChatMessage) => ({ role: m.role, content: m.content }))

    if (messages.length === 0) {
      return NextResponse.json({ error: 'messages is required' }, { status: 400 })
    }

    // Load the user's custom LLM provider config (if any) from Settings table.
    let provider: ProviderConfig | undefined
    try {
      provider = await resolveProvider()
    } catch {
      // ignore — fall back to built-in z-ai SDK
    }

    // Load the user's AI persona (name, tone, system prompt) from the User model.
    // This customizes the assistant's personality when using the integrated API.
    let personaPreamble = ''
    try {
      const user = await db.user.findFirst()
      if (user?.aiPersonaSystem) {
        personaPreamble = user.aiPersonaSystem
      } else if (user?.aiPersonaName || user?.aiPersonaTone) {
        personaPreamble = `Your name is ${user.aiPersonaName || 'VirtuaLab Assistant'}. Your tone is ${user.aiPersonaTone || 'warm, organic, practical'}. `
      }
    } catch {}

    // Inject the system preamble by prepending it to the first user message content,
    // since aiChat only accepts user/assistant roles. Include the persona preamble.
    const fullPreamble = personaPreamble ? `${personaPreamble}\n\n${SYSTEM_PREAMBLE}` : SYSTEM_PREAMBLE
    const framed = messages.map((m, i) =>
      i === 0 && m.role === 'user'
        ? { role: m.role, content: `[System guidance: ${fullPreamble}]\n\n${m.content}` }
        : m,
    ) as ChatMessage[]

    const reply = await aiChat(framed, provider)
    return NextResponse.json({ reply })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to chat'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
