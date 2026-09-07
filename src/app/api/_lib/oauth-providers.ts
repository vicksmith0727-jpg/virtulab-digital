// OAuth provider configurations.
// Each provider has an authorization URL + token URL + scope.
// Client IDs / secrets come from env vars (set in .env). If missing, the
// /start endpoint returns a "demo mode" redirect that simulates a successful
// OAuth round-trip so the UI flow is testable without registered apps.

export type OAuthProviderConfig = {
  // Provider slug (matches oauthProvider in the integration catalog)
  id: string
  // Human label
  label: string
  // Authorization endpoint (where the user logs in)
  authUrl: string
  // Token endpoint (where we exchange the code for an access token)
  tokenUrl: string
  // User profile endpoint (to fetch the connected account's name/email)
  profileUrl?: string
  // Default scopes
  scope: string
  // Env var names for client id / secret
  clientIdEnv: string
  clientSecretEnv: string
  // Whether to use PKCE (X/Twitter uses PKCE)
  pkce?: boolean
  // Whether the provider supports state param (most do)
  useState?: boolean
}

export const OAUTH_PROVIDERS: Record<string, OAuthProviderConfig> = {
  gsc: {
    id: 'gsc',
    label: 'Google Search Console',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    profileUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    clientIdEnv: 'GSC_CLIENT_ID',
    clientSecretEnv: 'GSC_CLIENT_SECRET',
    useState: true,
  },
  facebook: {
    id: 'facebook',
    label: 'Facebook',
    authUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v19.0/oauth/access_token',
    profileUrl: 'https://graph.facebook.com/v19.0/me?fields=name,id',
    scope: 'pages_show_list,pages_read_engagement',
    clientIdEnv: 'FACEBOOK_CLIENT_ID',
    clientSecretEnv: 'FACEBOOK_CLIENT_SECRET',
    useState: true,
  },
  x: {
    id: 'x',
    label: 'X (Twitter)',
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    profileUrl: 'https://api.twitter.com/2/users/me',
    scope: 'tweet.read users.read',
    clientIdEnv: 'X_CLIENT_ID',
    clientSecretEnv: 'X_CLIENT_SECRET',
    pkce: true,
    useState: true,
  },
  instagram: {
    id: 'instagram',
    label: 'Instagram',
    authUrl: 'https://api.instagram.com/oauth/authorize',
    tokenUrl: 'https://api.instagram.com/oauth/access_token',
    profileUrl: 'https://graph.instagram.com/me?fields=id,username',
    scope: 'instagram_basic',
    clientIdEnv: 'INSTAGRAM_CLIENT_ID',
    clientSecretEnv: 'INSTAGRAM_CLIENT_SECRET',
    useState: true,
  },
  linkedin: {
    id: 'linkedin',
    label: 'LinkedIn',
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    profileUrl: 'https://api.linkedin.com/v2/me',
    scope: 'r_organization_social,r_organization_social_feed,w_organization_social',
    clientIdEnv: 'LINKEDIN_CLIENT_ID',
    clientSecretEnv: 'LINKEDIN_CLIENT_SECRET',
    useState: true,
  },
}

export function getProvider(id: string): OAuthProviderConfig | undefined {
  return OAUTH_PROVIDERS[id]
}

export function hasCredentials(provider: OAuthProviderConfig): boolean {
  return Boolean(
    process.env[provider.clientIdEnv] && process.env[provider.clientSecretEnv],
  )
}

// Build the redirect URI for a given provider. This is the VirtuaLab Digital
// callback URL the provider will redirect back to after the user logs in.
export function buildRedirectUri(provider: string, reqOrigin: string): string {
  return `${reqOrigin}/api/oauth/${provider}/callback`
}
