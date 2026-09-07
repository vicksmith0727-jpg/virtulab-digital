import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getProvider, hasCredentials, buildRedirectUri } from '../../../_lib/oauth-providers'
import { INTEGRATION_CATALOG } from '../../../_lib/integrations'

type Params = { params: Promise<{ provider: string }> }

// GET /api/oauth/[provider]/start
// Begins an OAuth flow for the given provider. If the provider has client
// credentials configured via env vars, redirects to the provider's auth URL.
// If not, enters "demo mode" — redirects to the callback with a fake code so
// the UI flow can be tested end-to-end without registering an app.
//
// Query params:
//   - projectId: optional, to associate the connection with a project
//   - integrationName: optional, to override the default integration lookup

function genState(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
}

function genPkceVerifier(): string {
  // 43-128 char random string; URL-safe
  return Array.from({ length: 64 }, () =>
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'.charAt(
      Math.floor(Math.random() * 66),
    ),
  ).join('')
}

async function pkceChallenge(verifier: string): Promise<string> {
  // S256 challenge
  const crypto = globalThis.crypto
  const data = new TextEncoder().encode(verifier)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { provider: providerId } = await params
    const provider = getProvider(providerId)
    if (!provider) {
      return NextResponse.json({ error: `Unknown OAuth provider: ${providerId}` }, { status: 400 })
    }

    const url = new URL(req.url)
    const projectId = url.searchParams.get('projectId') || null
    const integrationName =
      url.searchParams.get('integrationName') ||
      INTEGRATION_CATALOG.find((i) => i.oauthProvider === providerId)?.name ||
      provider.label

    // Determine the origin for the redirect URI. In the sandbox, the browser
    // hits the gateway on port 81, so we use the request's origin.
    const origin = url.origin
    const redirectUri = buildRedirectUri(providerId, origin)

    // Store the state + verifier in the DB so the callback can verify it.
    // We use the Settings table as a scratchpad for OAuth flow state.
    const state = genState()
    const pkceVerifier = provider.pkce ? genPkceVerifier() : undefined

    let userId = null
    try {
      const user = await db.user.findFirst()
      userId = user?.id ?? null
    } catch {}

    if (userId) {
      try {
        await db.settings.create({
          data: {
            userId,
            key: `oauth_state_${state}`,
            value: JSON.stringify({
              provider: providerId,
              integrationName,
              projectId,
              pkceVerifier,
              createdAt: Date.now(),
            }),
          },
        })
      } catch {
        // ignore — stateless fallback below
      }
    }

    // Demo mode: no client credentials → simulate a successful OAuth round-trip
    // by redirecting to the callback with a fake code + the state. The callback
    // will detect demo mode (no creds) and create a "demo" connection.
    if (!hasCredentials(provider)) {
      const callbackUrl = new URL(redirectUri)
      callbackUrl.searchParams.set('code', `demo_${providerId}_${Date.now().toString(36)}`)
      callbackUrl.searchParams.set('state', state)
      callbackUrl.searchParams.set('demo', '1')
      return NextResponse.redirect(callbackUrl)
    }

    // Real OAuth: build the authorization URL and redirect the user there.
    const authUrl = new URL(provider.authUrl)
    authUrl.searchParams.set('client_id', process.env[provider.clientIdEnv]!)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', provider.scope)
    if (provider.useState) authUrl.searchParams.set('state', state)
    if (provider.pkce && pkceVerifier) {
      const challenge = await pkceChallenge(pkceVerifier)
      authUrl.searchParams.set('code_challenge', challenge)
      authUrl.searchParams.set('code_challenge_method', 'S256')
    }

    return NextResponse.redirect(authUrl)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to start OAuth'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
