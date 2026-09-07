import { db } from '@/lib/db'

interface RateLimitConfig {
  key: string       // Unique identifier (e.g., "ip:ai-chat")
  limit: number     // Max requests allowed in the window
  windowMs: number  // Time window in milliseconds
}

export async function checkRateLimit({ key, limit, windowMs }: RateLimitConfig) {
  const now = new Date()

  const record = await db.rateLimit.findUnique({ where: { key } })

  if (!record) {
    const resetAt = new Date(now.getTime() + windowMs)
    await db.rateLimit.create({
      data: { key, tokens: limit - 1, resetAt },
    })
    return { success: true, remaining: limit - 1, resetAt }
  }

  if (now > record.resetAt) {
    const resetAt = new Date(now.getTime() + windowMs)
    await db.rateLimit.update({
      where: { key },
      data: { tokens: limit - 1, resetAt },
    })
    return { success: true, remaining: limit - 1, resetAt }
  }

  if (record.tokens <= 0) {
    return { success: false, remaining: 0, resetAt: record.resetAt }
  }

  const updated = await db.rateLimit.update({
    where: { key },
    data: { tokens: record.tokens - 1 },
  })

  return { success: true, remaining: updated.tokens, resetAt: updated.resetAt }
}

// Check if user is a paid subscriber (bypasses rate limiting)
export async function isPaidUser(userId?: string): Promise<boolean> {
  if (!userId) return false
  try {
    const user = await db.user.findUnique({ where: { id: userId } })
    return user?.plan === 'grove' || user?.plan === 'forest'
  } catch {
    return false
  }
}
