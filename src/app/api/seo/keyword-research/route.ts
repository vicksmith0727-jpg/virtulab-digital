import { NextRequest, NextResponse } from 'next/server'
import { generateText, resolveProvider } from '@/lib/ai'
import { db } from '@/lib/db'

// POST /api/seo/keyword-research
// Body: { keyword, location?, niche? }
//
// Enriched keyword research — not just keyword suggestions, but a full
// content research package:
//   - Primary keyword + search intent
//   - People Also Search (PAS) — related searches Google shows
//   - People Also Ask (PAA) — questions Google shows
//   - FAQs — common questions about the topic
//   - Suggested keywords — long-tail variations
//   - Semantic keywords — related terms Google expects
//   - Content gaps — what competitors cover that you don't
//
// Uses the connected LLM (built-in z-ai or BYO via Ollama/OpenRouter/Groq).
// If GSC MCP is connected, it can also pull real search data — but for the
// AI-powered research, this endpoint is self-contained.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const keyword = typeof body?.keyword === 'string' ? body.keyword.trim() : ''
    const location = typeof body?.location === 'string' ? body.location.trim() : ''
    const niche = typeof body?.niche === 'string' ? body.niche.trim() : ''

    if (!keyword) {
      return NextResponse.json({ error: 'keyword is required' }, { status: 400 })
    }

    const provider = await resolveProvider().catch(() => undefined)

    const system = `You are an expert SEO researcher. Return ONLY a valid JSON object, no markdown, no commentary. Be specific and practical. For a small business, focus on local + commercial intent keywords.`

    const prompt = `Perform comprehensive keyword research for: "${keyword}"
${location ? `Location: ${location}` : ''}
${niche ? `Niche: ${niche}` : ''}

Return a JSON object with these exact keys:
{
  "primaryKeyword": "the main keyword",
  "searchIntent": "informational | commercial | transactional | navigational",
  "peopleAlsoSearch": ["5-8 related searches Google would show"],
  "peopleAlsoAsk": ["5-8 questions Google would show in PAA"],
  "faqs": [{"question": "...", "answer": "40-60 word answer"}],
  "suggestedKeywords": [{"keyword": "...", "intent": "info|commercial|local", "difficulty": "low|medium|high", "relevance": "high|medium|low"}],
  "semanticKeywords": ["10-15 semantically related terms"],
  "longTailVariations": ["5-8 long-tail keyword variations"],
  "contentGaps": ["3-5 topics competitors cover that this content should address"],
  "titleIdeas": ["3-5 title ideas using the primary keyword"],
  "metaDescription": "a suggested meta description under 160 chars"
}

Be specific to "${keyword}" and ${location || 'the general market'}. No generic placeholders.`

    const raw = await generateText(prompt, system, provider)

    // Parse the JSON
    let result: any = null
    try {
      const cleaned = raw.replace(/```json|```/g, '').trim()
      result = JSON.parse(cleaned)
    } catch {
      // If parsing fails, return the raw text
      result = { rawResponse: raw, error: 'Could not parse JSON — showing raw output' }
    }

    // Log the research
    try {
      await db.activityLog.create({
        data: {
          action: 'seo.keyword-research',
          detail: `Keyword research for "${keyword}" — ${result?.suggestedKeywords?.length || 0} keywords, ${result?.peopleAlsoAsk?.length || 0} PAA, ${result?.faqs?.length || 0} FAQs`,
        },
      })
    } catch {}

    return NextResponse.json({
      ok: true,
      keyword,
      location: location || null,
      result,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Keyword research failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
