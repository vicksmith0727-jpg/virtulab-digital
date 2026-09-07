import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Proxy (formerly middleware in Next.js 15) — sets CSP headers on every response.
// This overrides the preview gateway's restrictive CSP that blocks eval().
// In Next.js 16, "middleware" was renamed to "proxy".

export function proxy(_req: NextRequest) {
  const res = NextResponse.next()

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
