import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/integrations/custom
// Body: { name, category, description, iconKey?, fields?: [{key,label,type}] }
// Lets users add a custom integration card to the catalog (the "+" feature).
// The new integration is persisted in the DB and shows up in the Integrations
// view alongside the built-in ones. Useful for in-house tools or niche services
// not in the default catalog.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const category = typeof body?.category === 'string' ? body.category.trim().toLowerCase() : 'custom'
    const description = typeof body?.description === 'string' ? body.description.trim() : ''
    const iconKey = typeof body?.iconKey === 'string' && body.iconKey.trim() ? body.iconKey.trim() : 'Plug'
    const fields = Array.isArray(body?.fields) ? body.fields : []

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }
    if (name.length > 60) {
      return NextResponse.json({ error: 'name is too long (max 60 chars)' }, { status: 400 })
    }

    // Don't allow duplicates with the built-in catalog
    const existing = await db.integration.findFirst({ where: { name } })
    if (existing) {
      return NextResponse.json({ error: 'An integration with that name already exists' }, { status: 409 })
    }

    const integration = await db.integration.create({
      data: {
        name,
        category: category || 'custom',
        description: description || 'Custom integration added by user.',
        iconKey,
        fields: JSON.stringify(fields),
        status: 'available',
      },
    })

    try {
      await db.activityLog.create({
        data: {
          projectId: null,
          action: 'integration.custom.add',
          detail: `Added custom integration: ${name}`,
        },
      })
    } catch {}

    return NextResponse.json({
      integration: { ...integration, fields: safeParse(integration.fields) },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to add custom integration'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function safeParse(s: string | null): unknown {
  if (!s) return []
  try {
    return JSON.parse(s)
  } catch {
    return []
  }
}
