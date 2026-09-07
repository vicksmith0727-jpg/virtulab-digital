import { NextRequest, NextResponse } from 'next/server'
import { generateBlockContent, resolveProvider } from '@/lib/ai'

const VALID_KINDS = ['hero', 'features', 'testimonial', 'pricing', 'cta', 'about', 'footer'] as const
type Kind = (typeof VALID_KINDS)[number]

// POST /api/ai/generate body { kind, business, tone? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const kind = typeof body?.kind === 'string' ? body.kind : ''
    const business = typeof body?.business === 'string' ? body.business.trim() : ''
    const tone = typeof body?.tone === 'string' ? body.tone.trim() : undefined

    if (!business) {
      return NextResponse.json({ error: 'business is required' }, { status: 400 })
    }
    if (!VALID_KINDS.includes(kind as Kind)) {
      return NextResponse.json(
        { error: `kind must be one of: ${VALID_KINDS.join(', ')}` },
        { status: 400 },
      )
    }

    // Honor the user's Bring-Your-Own LLM provider if configured.
    const provider = await resolveProvider()
    const content = await generateBlockContent({ kind, business, tone, provider })
    return NextResponse.json({ content })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate content'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
