import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getZeroclawConnection } from '@/lib/zeroclaw'

// GET /api/settings/llm → returns the current LLM provider config
// POST /api/settings/llm body { kind, baseUrl?, apiKey?, model? } → saves it
//
// Users can switch the AI provider used for AI Copy + AI Chat:
//   kind: 'builtin'                  → use VirtuaLab Digital's built-in z-ai SDK
//   kind: 'custom' + baseUrl + model → use any OpenAI-compatible endpoint
//      (Ollama, OpenRouter, Groq, LM Studio, vLLM, OpenAI itself…)
//   kind: 'zeroclaw'                  → route through the connected Zeroclaw agent
//      (autonomous agent infra — see Integrations → Automation → Zeroclaw)
// This is how the "free LLM" story works (Ollama local = $0, OpenRouter free models = $0).

async function getOrCreateUser() {
  let user = await db.user.findFirst()
  if (!user) {
    user = await db.user.create({
      data: { email: 'demo@virtulab.local', name: 'VirtuaLab Digital Demo', plan: 'grove' },
    })
  }
  return user
}

export async function GET() {
  try {
    const setting = await db.settings.findFirst({ where: { key: 'llmProvider' } })
    if (setting?.value) {
      const parsed = JSON.parse(setting.value)
      // Don't leak the API key back in full
      if (parsed?.apiKey) parsed.apiKey = parsed.apiKey.slice(0, 4) + '••••••••'
      return NextResponse.json({ provider: parsed })
    }
    return NextResponse.json({ provider: { kind: 'builtin' } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to read provider'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const kind = ['custom', 'zeroclaw'].includes(body?.kind) ? body.kind : 'builtin'
    const baseUrl = typeof body?.baseUrl === 'string' ? body.baseUrl.trim() : ''
    const apiKey = typeof body?.apiKey === 'string' ? body.apiKey.trim() : ''
    const model = typeof body?.model === 'string' ? body.model.trim() : ''

    if (kind === 'custom') {
      if (!baseUrl) return NextResponse.json({ error: 'baseUrl is required' }, { status: 400 })
      if (!model) return NextResponse.json({ error: 'model is required' }, { status: 400 })
    }
    if (kind === 'zeroclaw') {
      // Verify Zeroclaw is connected before allowing it as the provider
      const conn = await getZeroclawConnection()
      if (!conn) {
        return NextResponse.json(
          {
            error:
              'Zeroclaw is not connected. Connect it in Integrations → Automation → Zeroclaw first.',
          },
          { status: 400 },
        )
      }
    }

    const user = await getOrCreateUser()
    const value = JSON.stringify({ kind, baseUrl, apiKey, model })

    const existing = await db.settings.findFirst({
      where: { userId: user.id, key: 'llmProvider' },
    })
    if (existing) {
      await db.settings.update({ where: { id: existing.id }, data: { value } })
    } else {
      await db.settings.create({ data: { userId: user.id, key: 'llmProvider', value } })
    }

    return NextResponse.json({ ok: true, provider: { kind, baseUrl, model } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save provider'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
