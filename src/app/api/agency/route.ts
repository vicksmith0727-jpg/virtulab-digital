import { NextResponse } from 'next/server'
import { getAgencyConfig } from '@/lib/agency'

// GET /api/agency
// Returns the parent agency config so the frontend can reference the main
// website, brand the builder as a sub-domain offering, and route published
// pages to the main agency domain.
export async function GET() {
  const cfg = getAgencyConfig()
  return NextResponse.json({
    agency: {
      name: cfg.name,
      mainUrl: cfg.mainUrl,
      mainDomain: cfg.mainDomain,
      subdomainLabel: cfg.subdomainLabel,
      isSubdomain: cfg.isSubdomain,
      mainSiteConnectionName: cfg.mainSiteConnectionName,
    },
  })
}
