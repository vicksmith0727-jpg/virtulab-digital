import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { parseBlocks } from '../_lib/templates'

// GET /api/templates → templates with blocks parsed to arrays
export async function GET() {
  try {
    const templates = await db.template.findMany({
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json({
      templates: templates.map((t) => ({ ...t, blocks: parseBlocks(t.blocks) })),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch templates'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
