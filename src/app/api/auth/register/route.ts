import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getClientIp } from '@/lib/get-client-ip'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

// POST /api/auth/register
// Body: { name, email, password }
// Creates a new user. Rate-limits registrations per IP (max 3 per 24h).

const SESSION_COOKIE = 'vl_session'
const SESSION_DAYS = 30
const MAX_REGISTRATIONS = 3
const COOLDOWN_WINDOW_MS = 24 * 60 * 60 * 1000

export async function POST(req: NextRequest) {
  try {
    // ── IP-based registration tracking ──
    const clientIp = await getClientIp()
    const now = new Date()

    const track = await db.registrationTrack.findUnique({ where: { ip: clientIp } })
    if (track) {
      const timePassed = now.getTime() - track.updatedAt.getTime()
      if (timePassed < COOLDOWN_WINDOW_MS) {
        if (track.count >= MAX_REGISTRATIONS) {
          return NextResponse.json(
            { error: 'Registration threshold exceeded. Multiple free signups from this network are temporarily blocked.' },
            { status: 429 },
          )
        }
        await db.registrationTrack.update({
          where: { ip: clientIp },
          data: { count: track.count + 1 },
        })
      } else {
        await db.registrationTrack.update({
          where: { ip: clientIp },
          data: { count: 1 },
        })
      }
    } else {
      await db.registrationTrack.create({ data: { ip: clientIp, count: 1 } })
    }

    const body = await req.json().catch(() => ({}))
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body?.password === 'string' ? body.password : ''

    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'Name is required (min 2 chars)' }, { status: 400 })
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password is required (min 6 chars)' }, { status: 400 })
    }

    // Check if email already exists
    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'An account with that email already exists' }, { status: 409 })
    }

    // Hash the password
    const hashed = await bcrypt.hash(password, 10)

    // Create the user
    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashed,
        plan: 'seed',
        role: 'owner',
        canAccessAPISettings: true,
        canAccessExternalSecrets: true,
      },
    })

    // Generate a session token
    const token = crypto.randomBytes(32).toString('hex')

    // Store the session in the Settings table (key: session_{token}, value: userId)
    await db.settings.create({
      data: {
        userId: user.id,
        key: `session_${token}`,
        value: JSON.stringify({ userId: user.id, createdAt: Date.now() }),
      },
    })

    // Send a welcome email (fire-and-forget — don't block registration)
    fetch(new URL('/api/email', req.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email }),
    }).catch(() => {})

    // Set the cookie
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
    const message = err instanceof Error ? err.message : 'Registration failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
