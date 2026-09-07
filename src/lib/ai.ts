import ZAI from 'z-ai-web-dev-sdk'

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null

export async function getZai() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create()
  }
  return zaiInstance
}

// ProviderConfig: stored in the Settings table under key 'llmProvider'.
// If present, all AI calls route to this OpenAI-compatible endpoint instead of
// the built-in z-ai SDK. This is how users plug in FREE providers like:
//   - Ollama local:       { baseUrl: 'http://localhost:11434/v1', model: 'llama3.1' }
//   - OpenRouter free:    { baseUrl: 'https://openrouter.ai/api/v1', apiKey: '...', model: 'meta-llama/llama-3.1-8b-instruct:free' }
//   - Groq free:          { baseUrl: 'https://api.groq.com/openai/v1', apiKey: '...', model: 'llama-3.1-8b-instant' }
//   - Zeroclaw:           { kind: 'zeroclaw' } → routes through the connected
//                          Zeroclaw agent endpoint (see src/lib/zeroclaw.ts)
//   - Any OpenAI-compat:   LM Studio, vLLM, OpenAI itself, etc.
export type ProviderConfig = {
  kind: 'builtin' | 'custom' | 'zeroclaw'
  baseUrl?: string
  apiKey?: string
  model?: string
}

export async function resolveProvider(): Promise<ProviderConfig | undefined> {
  try {
    const { db } = await import('@/lib/db')
    const setting = await db.settings.findFirst({ where: { key: 'llmProvider' } })
    if (setting?.value) {
      const parsed = JSON.parse(setting.value) as ProviderConfig
      if (!parsed) return undefined
      // Zeroclaw: resolve the connected Zeroclaw endpoint into a custom provider
      if (parsed.kind === 'zeroclaw') {
        const { asZeroclawProvider } = await import('@/lib/zeroclaw')
        return (await asZeroclawProvider()) ?? undefined
      }
      if (parsed.kind === 'custom' && parsed.baseUrl && parsed.model) {
        return parsed
      }
    }
  } catch {
    // ignore
  }
  return undefined
}

// ── Fallback chain: gemma → phi → built-in (GLM) ──
// When BYO-LLM is set, we try the primary model first. If it fails
// (Ollama offline, model not loaded, timeout), we fall back to the
// secondary model. If that also fails, we fall back to the built-in
// z-ai SDK (GLM-5.3-Flash).
//
// Sage persona is ALWAYS injected — it comes from the User model in the
// database, not from the model. So the voice stays consistent regardless
// of which model responds.

const FALLBACK_CHAIN = [
  { model: 'gemma', label: 'Gemma (fast, 200ms)' },
  { model: 'phi', label: 'Phi (fast, 300ms)' },
]

const FALLBACK_TIMEOUT_MS = 5000 // 5s per model before falling back

async function callWithTimeout(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  provider: ProviderConfig,
  model: string,
  opts: { temperature?: number; max_tokens?: number },
): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FALLBACK_TIMEOUT_MS)
  try {
    const res = await fetch(`${provider.baseUrl!.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(provider.apiKey ? { Authorization: `Bearer ${provider.apiKey}` } : {}),
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages,
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.max_tokens ?? 1200,
      }),
    })
    clearTimeout(timer)
    if (!res.ok) throw new Error(`${res.status}`)
    const data = await res.json()
    return data?.choices?.[0]?.message?.content ?? ''
  } catch (err) {
    clearTimeout(timer)
    throw err
  }
}

// Call with fallback: try primary → fallback models → built-in
async function callWithFallback(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  provider: ProviderConfig | undefined,
  opts: { temperature?: number; max_tokens?: number },
): Promise<string> {
  // If no custom provider, use built-in directly
  if (!provider || provider.kind !== 'custom') {
    const zai = await getZai()
    const res = await zai.chat.completions.create({
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.max_tokens ?? 1200,
    })
    return res.choices?.[0]?.message?.content ?? ''
  }

  // Try the user's configured model first
  const primaryModel = provider.model || 'gemma'
  const models = [primaryModel, ...FALLBACK_CHAIN.filter((f) => f.model !== primaryModel).map((f) => f.model)]

  for (const model of models) {
    try {
      const result = await callWithTimeout(messages, provider, model, opts)
      if (result) return result
    } catch {
      // Fall through to next model
    }
  }

  // All custom models failed — fall back to built-in z-ai SDK (GLM)
  // Sage persona still applies — it's injected at the route level
  const zai = await getZai()
  const res = await zai.chat.completions.create({
    messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.max_tokens ?? 1200,
  })
  return res.choices?.[0]?.message?.content ?? ''
}

export async function generateText(
  prompt: string,
  system?: string,
  provider?: ProviderConfig,
): Promise<string> {
  return callWithFallback(
    [
      ...(system ? [{ role: 'system' as const, content: system }] : []),
      { role: 'user' as const, content: prompt },
    ],
    provider,
    { temperature: 0.7, max_tokens: 1200 },
  )
}

export async function generateBlockContent(opts: {
  kind: string
  business: string
  tone?: string
  provider?: ProviderConfig
}): Promise<Record<string, string>> {
  const tone = opts.tone ?? 'warm, organic, trustworthy, concise'
  const system =
    'You are a copywriter for a no-code website builder. Return ONLY a compact JSON object, no markdown fences, no commentary.'
  const prompt = `Write marketing copy for a "${opts.kind}" website block for the business: ${opts.business}.
Tone: ${tone}.
Return JSON with keys appropriate to the block type:
- hero: { headline, subheadline, ctaPrimary, ctaSecondary }
- features: { title, subtitle, items: [ {title, desc} x3 ] }
- testimonial: { quote, author, role }
- pricing: { title, subtitle, tiers: [ {name, price, period, features: [x4], cta} x3 ] }
- cta: { headline, subheadline, ctaPrimary }
- about: { headline, body }
- footer: { tagline, columns: [ {heading, links: [x3]} x3 ] }
Keep all copy short, organic, human, no hype, no paid-ad language.`
  const out = await generateText(prompt, system, opts.provider)
  try {
    const cleaned = out.replace(/```json|```/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return {}
  }
}

export async function aiChat(
  messages: { role: 'user' | 'assistant'; content: string }[],
  provider?: ProviderConfig,
): Promise<string> {
  return callWithFallback(
    messages.map((m) => ({ role: m.role as 'system' | 'user' | 'assistant', content: m.content })),
    provider,
    { temperature: 0.6, max_tokens: 800 },
  )
}
