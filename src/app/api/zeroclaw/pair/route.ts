import { NextRequest, NextResponse } from 'next/server'
import { pairZeroclaw, checkZeroclawHealth } from '@/lib/zeroclaw'
import { db } from '@/lib/db'

// POST /api/zeroclaw/pair
// Body: { endpoint, pairingCode }
//
// Pairs the SaaS with a running ZeroClaw daemon using the one-time
// pairing code shown in the terminal. Creates an IntegrationConnection
// with the returned token + endpoint.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const endpoint = typeof body?.endpoint === 'string' ? body.endpoint.trim() : ''
    const pairingCode = typeof body?.pairingCode === 'string' ? body.pairingCode.trim() : ''

    if (!endpoint || !pairingCode) {
      return NextResponse.json(
        { error: 'endpoint and pairingCode are required' },
        { status: 400 },
      )
    }

    // Check health first
    const health = await checkZeroclawHealth(endpoint)
    if (!health.healthy) {
      return NextResponse.json(
        { error: `ZeroClaw at ${endpoint} is not reachable. Is the daemon running?` },
        { status: 400 },
      )
    }

    // Pair
    const pairResult = await pairZeroclaw(endpoint, pairingCode)
    if (!pairResult.ok) {
      return NextResponse.json(
        { error: pairResult.error || 'Pairing failed' },
        { status: 400 },
      )
    }

    // Find or create the Zeroclaw integration connection
    const integration = await db.integration.findFirst({ where: { name: 'Zeroclaw' } })
    if (!integration) {
      return NextResponse.json(
        { error: 'Zeroclaw integration not found in catalog' },
        { status: 400 },
      )
    }

    const existing = await db.integrationConnection.findFirst({
      where: { integrationId: integration.id },
    })

    const config = JSON.stringify({
      endpoint,
      token: pairResult.token,
      autoDetected: true,
      pairedAt: new Date().toISOString(),
    })

    let connection
    if (existing) {
      connection = await db.integrationConnection.update({
        where: { id: existing.id },
        data: { config, enabled: true },
      })
    } else {
      connection = await db.integrationConnection.create({
        data: { integrationId: integration.id, config, enabled: true },
      })
    }

    // Log
    try {
      await db.activityLog.create({
        data: {
          action: 'zeroclaw.pair',
          detail: `Paired with ZeroClaw at ${endpoint}`,
        },
      })
    } catch {}

    return NextResponse.json({
      ok: true,
      connection,
      endpoint,
      health: health.details,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Pairing failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
