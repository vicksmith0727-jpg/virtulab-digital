import { NextResponse } from 'next/server'
import { INTEGRATION_CATALOG, INTEGRATION_CATEGORIES } from '../../_lib/integrations'

// GET /api/ai/tools → returns the catalog the AI uses (for the AI Tool Router UI)
// The frontend "AI Tool Router" panel fetches this to render the tool list and
// recommend integrations to the user based on their goal.
export async function GET() {
  return NextResponse.json({
    categories: INTEGRATION_CATEGORIES,
    tools: INTEGRATION_CATALOG.map((i) => ({
      name: i.name,
      category: i.category,
      description: i.description,
      link: i.link ?? null,
      capabilities: i.capabilities ?? [],
      fieldsCount: i.fields.length,
    })),
  })
}
