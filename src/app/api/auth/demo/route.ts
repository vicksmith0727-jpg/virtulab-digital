import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

// POST /api/auth/demo
// Creates or logs in the demo user — bypasses all rate limits + IP tracking.
// This is the "Continue as demo" button's backend. Always works.

const SESSION_COOKIE = 'vl_session'
const SESSION_DAYS = 30

export async function POST() {
  try {
    // Find or create the demo user
    let user = await db.user.findUnique({ where: { email: 'demo@virtulab.local' } })

    if (!user) {
      const hashed = await bcrypt.hash('demodemo', 10)
      user = await db.user.create({
        data: {
          name: 'Demo User',
          email: 'demo@virtulab.local',
          password: hashed,
          plan: 'grove',
          role: 'owner',
          canAccessAPISettings: true,
          canAccessExternalSecrets: true,
        },
      })
    }

    // Create a session token
    const token = crypto.randomBytes(32).toString('hex')
    await db.settings.create({
      data: {
        userId: user.id,
        key: `session_${token}`,
        value: JSON.stringify({ userId: user.id, createdAt: Date.now() }),
      },
    })

    const res = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        role: user.role,
      },
    })
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DAYS * 24 * 60 * 60,
      path: '/',
    })
    return res
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Demo login failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
