import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getProvider, hasCredentials, buildRedirectUri } from '../../../_lib/oauth-providers'
import { INTEGRATION_CATALOG } from '../../../_lib/integrations'

type Params = { params: Promise<{ provider: string }> }

// GET /api/oauth/[provider]/callback
// Handles the OAuth provider's redirect back to VirtuaLab Digital after the
// user logs in. Exchanges the code for an access token (real mode) or creates
// a demo connection (demo mode when no client creds are configured).
//
// After success, redirects to / (the SPA) which shows the Integrations view
// with the new connection. We pass ?oauth=success so the UI can show a toast.
//
// Query params (from the provider):
//   - code: the authorization code
//   - state: the state we sent in /start (verified against our DB)
//   - demo: 1 if demo mode

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { provider: providerId } = await params
    const provider = getProvider(providerId)
    if (!provider) {
      return NextResponse.redirect(new URL('/?oauth=error&reason=unknown_provider', req.url))
    }

    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const isDemo = url.searchParams.get('demo') === '1'

    if (!code || !state) {
      return NextResponse.redirect(new URL('/?oauth=error&reason=missing_params', req.url))
    }

    // Verify state against our DB scratchpad
    let userId: string | null = null
    let storedState: any = null
    try {
      const setting = await db.settings.findFirst({
        where: { key: `oauth_state_${state}` },
      })
      if (setting) {
        userId = setting.userId
        storedState = JSON.parse(setting.value)
        // Clean up the state so it can't be replayed
        await db.settings.delete({ where: { id: setting.id } }).catch(() => {})
      }
    } catch {}

    if (!userId) {
      // No user session — fall back to creating/getting the demo user
      try {
        let user = await db.user.findFirst()
        if (!user) {
          user = await db.user.create({
            data: { email: 'demo@virtulab.local', name: 'VirtuaLab Demo', plan: 'grove' },
          })
        }
        userId = user.id
      } catch (e) {
        return NextResponse.redirect(new URL('/?oauth=error&reason=no_user', req.url))
      }
    }

    const integrationName = storedState?.integrationName ||
      INTEGRATION_CATALOG.find((i) => i.oauthProvider === providerId)?.name ||
      provider.label
    const projectId = storedState?.projectId || null

    // Find the integration in the catalog
    const integration = await db.integration.findFirst({ where: { name: integrationName } })
    if (!integration) {
      return NextResponse.redirect(new URL('/?oauth=error&reason=no_integration', req.url))
    }

    // Exchange code for access token (real mode) or use a demo token (demo mode)
    let accessToken = ''
    let refreshToken = ''
    let profile: any = null

    if (isDemo || !hasCredentials(provider)) {
      // Demo mode — synthesize a token + fake profile
      accessToken = `demo_token_${providerId}_${Date.now().toString(36)}`
      refreshToken = `demo_refresh_${providerId}_${Date.now().toString(36)}`
      profile = { name: `Demo ${provider.label} user`, id: 'demo' }
    } else {
      // Real mode — exchange the code for tokens
      const redirectUri = buildRedirectUri(providerId, url.origin)
      const tokenRes = await fetch(provider.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: process.env[provider.clientIdEnv]!,
          client_secret: process.env[provider.clientSecretEnv]!,
          ...(provider.pkce && storedState?.pkceVerifier
            ? { code_verifier: storedState.pkceVerifier }
            : {}),
        }),
      })
      if (!tokenRes.ok) {
        const text = await tokenRes.text().catch(() => '')
        return NextResponse.redirect(
          new URL(`/?oauth=error&reason=token_exchange&detail=${encodeURIComponent(text.slice(0, 100))}`, req.url),
        )
      }
      const tokenData = await tokenRes.json()
      accessToken = tokenData.access_token
      refreshToken = tokenData.refresh_token || ''
      // Fetch the profile if we can
      if (provider.profileUrl && accessToken) {
        try {
          const profileRes = await fetch(provider.profileUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
          })
          if (profileRes.ok) profile = await profileRes.json()
        } catch {}
      }
    }

    // Create the IntegrationConnection
    const config = {
      accessToken,
      refreshToken,
      profile: profile ? JSON.stringify(profile).slice(0, 500) : null,
      connectedAt: new Date().toISOString(),
      demo: isDemo,
    }
    const connection = await db.integrationConnection.create({
      data: {
        integrationId: integration.id,
        projectId,
        config: JSON.stringify(config),
        enabled: true,
      },
    })

    // Log activity
    try {
      await db.activityLog.create({
        data: {
          projectId,
          action: 'oauth.connect',
          detail: `Connected ${integrationName} via OAuth${isDemo ? ' (demo)' : ''}`,
        },
      })
    } catch {}

    // Redirect to the SPA root with a success flag. The frontend reads
    // ?oauth=success and shows a toast + switches to the Integrations view.
    const redirectUrl = new URL('/?oauth=success', req.url)
    redirectUrl.searchParams.set('provider', providerId)
    redirectUrl.searchParams.set('integration', integrationName)
    return NextResponse.redirect(redirectUrl)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OAuth callback failed'
    return NextResponse.redirect(
      new URL(`/?oauth=error&reason=${encodeURIComponent(message.slice(0, 80))}`, req.url),
    )
  }
}
