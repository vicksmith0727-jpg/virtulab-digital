import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { INTEGRATION_CATALOG } from '../_lib/integrations'

// GET /api/integrations → { integrations, connections }
// Lazy-seed the catalog if the Integration table is empty, AND upsert any catalog
// entries that aren't in the DB yet (so newly added integrations appear without a
// manual re-seed).
export async function GET() {
  try {
    let count = await db.integration.count()
    if (count === 0) {
      await db.integration.createMany({
        data: INTEGRATION_CATALOG.map((i) => ({
          name: i.name,
          category: i.category,
          description: i.description,
          iconKey: i.iconKey,
          fields: JSON.stringify(i.fields),
          status: i.status ?? 'available',
        })),
      })
      count = await db.integration.count()
    }

    // Upseert any catalog entries missing from the DB (e.g. WordPress, MCP servers,
    // OpenCode that were added after the initial seed).
    const existing = await db.integration.findMany({ select: { name: true } })
    const existingNames = new Set(existing.map((e) => e.name))
    const missing = INTEGRATION_CATALOG.filter((i) => !existingNames.has(i.name))
    if (missing.length > 0) {
      await db.integration.createMany({
        data: missing.map((i) => ({
          name: i.name,
          category: i.category,
          description: i.description,
          iconKey: i.iconKey,
          fields: JSON.stringify(i.fields),
          status: i.status ?? 'available',
        })),
      })
    }

    // ALWAYS sync existing integrations with the catalog — update descriptions,
    // categories, icons, and FIELDS. This ensures that when we change a catalog
    // entry (e.g. from manual fields to auto-detect with no fields), the DB
    // reflects the change. Without this, old field definitions persist forever.
    for (const i of INTEGRATION_CATALOG) {
      if (existingNames.has(i.name)) {
        await db.integration.updateMany({
          where: { name: i.name },
          data: {
            description: i.description,
            category: i.category,
            iconKey: i.iconKey,
            fields: JSON.stringify(i.fields),
          },
        }).catch(() => {})
      }
    }

    const integrations = await db.integration.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })
    const connections = await db.integrationConnection.findMany({
      include: { integration: true },
      orderBy: { createdAt: 'desc' },
    })

    // Build a lookup by name so we can enrich each integration row with the
    // catalog metadata that isn't stored in the DB (authMethod, oauthProvider,
    // link, capabilities). Custom user-added integrations won't be in the
    // catalog and will fall back to sensible defaults.
    const catalogByName = new Map(INTEGRATION_CATALOG.map((c) => [c.name, c]))

    return NextResponse.json({
      integrations: integrations.map((i) => {
        const cat = catalogByName.get(i.name)
        return {
          ...i,
          fields: safeParse(i.fields),
          authMethod: cat?.authMethod ?? 'apikey',
          oauthProvider: cat?.oauthProvider ?? null,
          link: cat?.link ?? null,
          capabilities: cat?.capabilities ?? [],
        }
      }),
      connections,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch integrations'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/integrations body { integrationId, projectId?, config }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const integrationId = typeof body?.integrationId === 'string' ? body.integrationId : null
    if (!integrationId) {
      return NextResponse.json({ error: 'integrationId is required' }, { status: 400 })
    }
    const integration = await db.integration.findUnique({ where: { id: integrationId } })
    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }
    const projectId = typeof body?.projectId === 'string' && body.projectId ? body.projectId : null
    const config = body?.config && typeof body.config === 'object' ? body.config : {}

    const connection = await db.integrationConnection.create({
      data: {
        integrationId,
        projectId: projectId ?? null,
        config: JSON.stringify(config),
        enabled: true,
      },
    })

    await db.activityLog.create({
      data: {
        projectId: projectId ?? null,
        action: 'integration.connect',
        detail: `Connected ${integration.name}`,
      },
    })

    return NextResponse.json({ connection })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create connection'
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
