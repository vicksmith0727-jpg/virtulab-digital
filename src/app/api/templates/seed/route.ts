import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { buildTemplateSeeds } from '../../_lib/templates'

// POST /api/templates/seed
// Idempotent: seeds all template definitions that aren't already in the DB.
// Existing templates (by name) are left untouched. New ones (e.g. local-business
// templates added later) get inserted automatically so the catalog stays fresh.
export async function POST() {
  try {
    const seeds = buildTemplateSeeds()
    const existing = await db.template.findMany({ select: { name: true } })
    const existingNames = new Set(existing.map((e) => e.name))
    const missing = seeds.filter((s) => !existingNames.has(s.name))

    if (missing.length === 0) {
      const count = await db.template.count()
      return NextResponse.json({ ok: true, count, added: 0 })
    }

    await db.template.createMany({
      data: missing.map((s) => ({
        name: s.name,
        category: s.category,
        description: s.description,
        thumbnail: null,
        blocks: JSON.stringify(s.blocks),
        isPublic: true,
      })),
    })

    const count = await db.template.count()
    return NextResponse.json({ ok: true, count, added: missing.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to seed templates'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
