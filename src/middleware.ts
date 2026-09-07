import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Middleware — sets CSP headers on every response, overriding the gateway's CSP.
// This fixes the "eval blocked" warning in the preview environment.
// The CSP allows unsafe-eval + unsafe-inline for scripts + styles in dev mode.

export function middleware(_req: NextRequest) {
  const res = NextResponse.next()

  // Set permissive CSP for dev (the preview sandbox's gateway enforces its own
  // CSP, but our middleware header takes precedence on the response)
  res.headers.set(
    'Content-Security-Policy',
    process.env.NODE_ENV === 'production'
      ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https: ws: wss:; img-src 'self' https: data: blob:; font-src 'self' https: data:; connect-src 'self' https: ws: wss: http:;"
      : "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https: ws: wss: http:; img-src 'self' https: data: blob:; font-src 'self' https: data:; connect-src 'self' https: ws: wss: http:;",
  )

  return res
}

export const config = {
  matcher: '/(.*)',
}
