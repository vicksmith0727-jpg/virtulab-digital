import { NextResponse } from 'next/server'
import { WP_BUILDERS } from '../../_lib/wp-export'

// GET /api/wordpress/builders
// Returns all WordPress page builders VirtuaLab Digital can publish to.
// The user can pick ANY combination — e.g. Gutenberg + Kadence, Elementor + Astra,
// or all 13 at once. The frontend renders these as checkboxes.
export async function GET() {
  return NextResponse.json({
    builders: WP_BUILDERS,
    note: 'Pick any combination. The export always includes a Gutenberg Custom HTML fallback so the page renders even if a builder plugin is inactive. Builder-specific post meta is added for each selected builder so the respective editor recognizes the page.',
  })
}
