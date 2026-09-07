import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

// POST /api/auth/register
// Body: { name, email, password }
// Creates a new user with a bcrypt-hashed password. Returns a session token
// (stored in an httpOnly cookie) + the user profile (without the password).
//
// This is a simple session-token auth (not NextAuth.js) for the sandbox.
// In production, swap for NextAuth.js with the same API shape.

const SESSION_COOKIE = 'vl_session'
const SESSION_DAYS = 30

export async function POST(req: NextRequest) {
  try {
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
