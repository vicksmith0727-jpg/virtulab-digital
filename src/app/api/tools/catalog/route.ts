import { NextResponse } from 'next/server'
import { SOCIAL_TOOLS, CONTENT_TOOLS } from '../../_lib/tool-catalog'

// GET /api/tools/catalog
// Returns the full tool catalog grouped by category (seo, social, content).
// The frontend uses this to render the "Tools" dropdown + the individual tool views.
export async function GET() {
  // SEO tools are managed by /api/seo/tools (31 tools). We reference them here
  // so the nav dropdown can show the count, but the actual SEO tool list comes
  // from the SEO tools endpoint.
  return NextResponse.json({
    categories: [
      { id: 'seo', label: 'SEO Tools', count: 31, view: 'seo-tools' },
      { id: 'social', label: 'Social Media Tools', count: SOCIAL_TOOLS.length, view: 'social-tools' },
      { id: 'content', label: 'Content Generation', count: CONTENT_TOOLS.length, view: 'content-tools' },
    ],
    social: SOCIAL_TOOLS,
    content: CONTENT_TOOLS,
    note: 'SEO tools (31) come from /api/seo/tools. Social + Content tools are listed here. Use the "+" to add custom tools.',
  })
}
