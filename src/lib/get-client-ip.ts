import { headers } from 'next/headers'

// Extract the real client IP — handles Cloudflare, reverse proxies, and VPNs.
export async function getClientIp(): Promise<string> {
  const headerList = await headers()

  // 1. Cloudflare
  const cfClientIp = headerList.get('cf-connecting-ip')
  if (cfClientIp) return cfClientIp

  // 2. X-Forwarded-For (first IP is the genuine client)
  const xForwardedFor = headerList.get('x-forwarded-for')
  if (xForwardedFor) {
    const ips = xForwardedFor.split(',').map((ip) => ip.trim())
    return ips[0]
  }

  // 3. X-Real-IP
  const xRealIp = headerList.get('x-real-ip')
  if (xRealIp) return xRealIp

  return '127.0.0.1'
}
