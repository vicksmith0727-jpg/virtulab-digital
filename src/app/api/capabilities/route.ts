import { NextResponse } from 'next/server'
import { SERVICE_PILLARS, LLM_MODEL_PRESETS, NICHE_VERTICALS } from '../_lib/service-pillars'

// GET /api/capabilities
// Returns the 6 founder service pillars, the small LLM model presets with task
// routing, and the niche target verticals. The frontend uses this to render a
// "Service Pillars" section and the model preset chips.
export async function GET() {
  return NextResponse.json({
    pillars: SERVICE_PILLARS,
    models: LLM_MODEL_PRESETS,
    verticals: NICHE_VERTICALS,
  })
}
