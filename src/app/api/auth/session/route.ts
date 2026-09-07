import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/auth/session
// Returns the current user if a valid session cookie is present, or
// { authenticated: false } if not.
//
// The frontend uses this to decide: show the login/register page, or
// let the user into the app.
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('vl_session')?.value
    if (!token) {
      return NextResponse.json({ authenticated: false })
    }

    // Look up the session in the Settings table
    const session = await db.settings.findFirst({
      where: { key: `session_${token}` },
    })
    if (!session) {
      return NextResponse.json({ authenticated: false })
    }

    // Parse the session
    const data = (() => { try { return JSON.parse(session.value) } catch { return null } })()
    if (!data?.userId) {
      return NextResponse.json({ authenticated: false })
    }

    // Check if the session is expired (30 days)
    const ageDays = (Date.now() - (data.createdAt || 0)) / (1000 * 60 * 60 * 24)
    if (ageDays > 30) {
      // Expired — delete it
      await db.settings.delete({ where: { id: session.id } }).catch(() => {})
      return NextResponse.json({ authenticated: false })
    }

    // Load the user
    const user = await db.user.findUnique({ where: { id: data.userId } })
    if (!user) {
      return NextResponse.json({ authenticated: false })
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        role: user.role,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Session check failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
