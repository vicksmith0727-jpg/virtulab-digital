// Zeroclaw integration — real wiring, not just a catalog card.
//
// Zeroclaw (github.com/zeroclaw-labs/zeroclaw) is "fully autonomous AI personal
// assistant infrastructure" — a Rust-based agent runtime you can deploy anywhere.
//
// This module:
//   1. Looks up the user's connected Zeroclaw IntegrationConnection (by name).
//   2. Exposes runZeroclawTask(prompt) → sends a task to the connected endpoint.
//   3. Exposes asZeroclawProvider() → returns a ProviderConfig that routes AI
//      calls (chat + generate) through Zeroclaw when it's connected AND enabled
//      as the active provider (set via /api/settings/llm with kind:'zeroclaw').
//
// API shape auto-detection:
//   - If the endpoint ends in /chat/completions or /v1/chat/completions, we POST
//     an OpenAI-compatible payload.
//   - Otherwise, we POST { prompt, ... } and read a JSON { response } or { output }
//     or plain text back. This works with most simple agent endpoints.

import type { ProviderConfig } from './ai'

export type ZeroclawConnection = {
  endpoint: string
  token: string
  model?: string
}

export async function getZeroclawConnection(): Promise<ZeroclawConnection | null> {
  try {
    const { db } = await import('@/lib/db')
    const integration = await db.integration.findFirst({
      where: { name: 'Zeroclaw' },
    })
    if (!integration) return null
    const conn = await db.integrationConnection.findFirst({
      where: { integrationId: integration.id, enabled: true },
    })
    if (!conn) return null
    const config = (() => {
      try {
        return JSON.parse(conn.config)
      } catch {
        return {}
      }
    })()
    const endpoint = (config.endpoint || '').trim()
    const token = (config.token || '').trim()
    if (!endpoint || !token) return null
    return { endpoint, token, model: config.model }
  } catch {
    return null
  }
}

// Send a task to Zeroclaw. Returns the agent's text response.
// Throws on non-2xx or network error.
export async function runZeroclawTask(
  prompt: string,
  opts: { system?: string; maxTokens?: number } = {},
): Promise<string> {
  const conn = await getZeroclawConnection()
  if (!conn) {
    throw new Error('Zeroclaw is not connected. Connect it in Integrations first.')
  }

  const endpoint = conn.endpoint.replace(/\/$/, '')
  const isChatCompletions =
    endpoint.endsWith('/chat/completions') ||
    endpoint.endsWith('/v1/chat/completions')

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${conn.token}`,
  }

  if (isChatCompletions) {
    // OpenAI-compatible shape
    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: conn.model || 'default',
        messages: [
          ...(opts.system ? [{ role: 'system', content: opts.system }] : []),
          { role: 'user', content: prompt },
        ],
        max_tokens: opts.maxTokens ?? 1200,
        temperature: 0.6,
      }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Zeroclaw error ${res.status}: ${text.slice(0, 200)}`)
    }
    const data = await res.json()
    return data?.choices?.[0]?.message?.content ?? ''
  }

  // Simple prompt → response shape. Send { prompt } and read back
  // { response } | { output } | { result } | { text } | plain text.
  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt,
      ...(opts.system ? { system: opts.system } : {}),
      max_tokens: opts.maxTokens ?? 1200,
    }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Zeroclaw error ${res.status}: ${text.slice(0, 200)}`)
  }
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const data = await res.json()
    return (
      data?.response ||
      data?.output ||
      data?.result ||
      data?.text ||
      data?.message ||
      ''
    )
  }
  return res.text()
}

// Return a ProviderConfig that routes AI calls through the connected Zeroclaw
// endpoint. Used when the user has set kind:'zeroclaw' in /api/settings/llm.
// Falls back to undefined (use built-in) if Zeroclaw isn't connected.
export async function asZeroclawProvider(): Promise<ProviderConfig | undefined> {
  const conn = await getZeroclawConnection()
  if (!conn) return undefined
  // If the endpoint is OpenAI-compatible, route via the existing custom-provider
  // path by returning a 'custom' ProviderConfig pointing at the chat/completions
  // endpoint. Otherwise return a special 'zeroclaw' kind the caller handles.
  const endpoint = conn.endpoint.replace(/\/$/, '')
  const chatUrl = endpoint.endsWith('/chat/completions')
    ? endpoint
    : endpoint.endsWith('/v1')
      ? endpoint + '/chat/completions'
      : endpoint + '/v1/chat/completions'
  return {
    kind: 'custom',
    baseUrl: chatUrl.replace('/chat/completions', ''),
    apiKey: conn.token,
    model: conn.model || 'default',
  }
}
