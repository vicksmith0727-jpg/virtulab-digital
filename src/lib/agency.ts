// Agency configuration — VirtuaLab Digital is a sub-domain offering of a
// parent Digital Marketing agency. This module centralizes the parent agency
// identity + main-website URL so the builder can:
//   1. Reference the parent agency in the UI ("a self-serve offering by {agency}")
//   2. Link to the parent agency's main website
//   3. Route published pages to the main website's domain (not the virtulab subdomain)
//
// All values are configurable via env vars so a deployment can point at any
// parent agency. Defaults are sensible for a fresh install.

export type AgencyConfig = {
  // Parent agency name (the main brand this builder belongs to)
  name: string
  // The agency's MAIN website URL (where traffic should route)
  mainUrl: string
  // The agency's MAIN domain (derived from mainUrl, used for canonical URLs + sitemap)
  mainDomain: string
  // This builder's subdomain label (e.g. "builder" → builder.agency.com)
  subdomainLabel: string
  // Whether this instance IS the subdomain builder (vs a standalone install)
  isSubdomain: boolean
  // The default WordPress "publish to main site" connection name to look up
  mainSiteConnectionName: string
}

function deriveDomain(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
  }
}

export function getAgencyConfig(): AgencyConfig {
  const name = process.env.AGENCY_NAME || 'VirtuaLab Agency'
  const mainUrl = (process.env.AGENCY_MAIN_URL || 'https://virtulab.agency').replace(/\/$/, '')
  const subdomainLabel = process.env.AGENCY_SUBDOMAIN_LABEL || 'builder'
  const isSubdomain = process.env.AGENCY_IS_SUBDOMAIN !== 'false' // default true
  const mainSiteConnectionName = process.env.AGENCY_MAIN_WP_CONNECTION || 'WordPress (Main Site)'
  return {
    name,
    mainUrl,
    mainDomain: deriveDomain(mainUrl),
    subdomainLabel,
    isSubdomain: isSubdomain !== false,
    mainSiteConnectionName,
  }
}
