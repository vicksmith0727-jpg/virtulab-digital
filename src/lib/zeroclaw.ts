// Zeroclaw integration — real wiring for the ZeroClaw daemon API.
//
// ZeroClaw (github.com/zeroclaw-labs/zeroclaw) is a Rust-based autonomous agent.
// The daemon exposes:
//   - POST /webhook   — { "message": "your prompt" } → agent response
//   - POST /pair      — pair with X-Pairing-Code header
//   - GET  /health    — health check
//   - GET  /ws/chat   — WebSocket agent chat
//   - GET  /api/*     — REST API (bearer token)
//
// Default port: 42617 (auto-detected)
// Legacy port: 3001

import type { ProviderConfig } from './ai'

export type ZeroclawConnection = {
  endpoint: string
  token: string
  model?: string
  autoDetected?: boolean
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
    if (!endpoint) return null
    // For auto-detected connections, token may be 'auto-detected'
    // — we still allow the connection, ZeroClaw's pairing handles auth
    return { endpoint, token: token || 'auto-detected', model: config.model, autoDetected: config.autoDetected }
  } catch {
    return null
  }
}

// Send a task to Zeroclaw via the webhook endpoint.
// The daemon accepts POST /webhook with { "message": "prompt" }.
export async function runZeroclawTask(
  prompt: string,
  opts: { system?: string; maxTokens?: number } = {},
): Promise<string> {
  const conn = await getZeroclawConnection()
  if (!conn) {
    throw new Error('Zeroclaw is not connected. Connect it in Integrations first.')
  }

  const base = conn.endpoint.replace(/\/$/, '')

  // Try the webhook endpoint first (ZeroClaw daemon's native API)
  const webhookRes = await fetch(`${base}/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(conn.token && conn.token !== 'auto-detected'
        ? { Authorization: `Bearer ${conn.token}` }
        : {}),
    },
    body: JSON.stringify({
      message: prompt,
      ...(opts.system ? { system: opts.system } : {}),
    }),
  })

  if (webhookRes.ok) {
    const data = await webhookRes.json().catch(() => ({}))
    return (
      data?.response ||
      data?.output ||
      data?.result ||
      data?.message ||
      data?.reply ||
      (typeof data === 'string' ? data : '')
    )
  }

  // Fallback: try OpenAI-compatible chat/completions
  const isChatEndpoint = base.endsWith('/chat/completions') || base.endsWith('/v1/chat/completions')
  const chatUrl = isChatEndpoint
    ? base
    : `${base}/v1/chat/completions`

  try {
    const chatRes = await fetch(chatUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(conn.token && conn.token !== 'auto-detected'
          ? { Authorization: `Bearer ${conn.token}` }
          : {}),
      },
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

    if (chatRes.ok) {
      const data = await chatRes.json()
      return data?.choices?.[0]?.message?.content ?? ''
    }
  } catch {
    // Fallback failed too
  }

  throw new Error(`Zeroclaw error: webhook returned ${webhookRes.status}`)
}

// Pair with ZeroClaw using the one-time pairing code.
export async function pairZeroclaw(
  endpoint: string,
  pairingCode: string,
): Promise<{ ok: boolean; token?: string; error?: string }> {
  try {
    const base = endpoint.replace(/\/$/, '')
    const res = await fetch(`${base}/pair`, {
      method: 'POST',
      headers: {
        'X-Pairing-Code': pairingCode,
      },
    })

    if (!res.ok) {
      return { ok: false, error: `Pairing failed: ${res.status}` }
    }

    const data = await res.json().catch(() => ({}))
    return {
      ok: true,
      token: data?.token || data?.apiKey || data?.access_token || 'paired',
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Pairing failed',
    }
  }
}

// Check ZeroClaw daemon health
export async function checkZeroclawHealth(
  endpoint: string,
): Promise<{ healthy: boolean; details?: any }> {
  try {
    const base = endpoint.replace(/\/$/, '')
    const res = await fetch(`${base}/health`)
    if (!res.ok) return { healthy: false }
    const data = await res.json().catch(() => ({}))
    return { healthy: true, details: data }
  } catch {
    return { healthy: false }
  }
}

// Return a ProviderConfig that routes AI calls through ZeroClaw.
export async function asZeroclawProvider(): Promise<ProviderConfig | undefined> {
  const conn = await getZeroclawConnection()
  if (!conn) return undefined

  const base = conn.endpoint.replace(/\/$/, '')

  // ZeroClaw's daemon doesn't expose a standard /v1/chat/completions
  // — it uses /webhook. So we return a 'zeroclaw' kind that the
  // fallback chain in ai.ts handles by calling runZeroclawTask.
  // For now, we return undefined so the fallback chain uses built-in GLM.
  // The /api/zeroclaw/run endpoint handles direct ZeroClaw calls.
  return undefined
}
