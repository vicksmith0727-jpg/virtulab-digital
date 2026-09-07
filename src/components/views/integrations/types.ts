// Shared types + helpers for the Integrations view + extracted sub-components.
// Extracted from integrations-view.tsx so the giant 1.9k-line view could be
// split into focused files (integration-card, auto-detect-panel, ai-router-hero,
// zeroclaw-banner, connect-dialog, custom-integration-dialog).

import {
  Brain,
  Workflow,
  Bot,
  Code2,
  Network,
  Radar,
} from 'lucide-react'

/* ---- Integration / Connection / Tool types ------------------------ */

export interface Integration {
  id: string
  name: string
  category: string
  description?: string | null
  iconKey?: string | null
  fields?: any[]
  status?: string
  // Catalog-only fields, not persisted on the Integration row but merged in
  // via OAUTH_FALLBACK / toolsByName so the frontend can branch on them.
  authMethod?: 'apikey' | 'oauth' | 'appPassword' | 'none' | 'auto' | null
  oauthProvider?: string | null
  link?: string | null
  capabilities?: string[]
}

export interface Connection {
  id: string
  integrationId: string
  projectId?: string | null
  config: any
  enabled: boolean
  integration?: { id: string; name: string; category: string }
}

export interface ToolInfo {
  name: string
  category: string
  description: string
  link: string | null
  capabilities: string[]
  fieldsCount: number
}

/* ---- Auth-method helpers ------------------------------------------ */

// Catalog-only metadata that the API may not surface. We use this to render
// the "Log in with X" OAuth button for social + Google Search Console even
// if the backend doesn't return authMethod/oauthProvider on the row.
// Keep in sync with src/app/api/_lib/integrations.ts.
export const OAUTH_FALLBACK: Record<string, { authMethod: string; oauthProvider: string }> = {
  'Facebook': { authMethod: 'oauth', oauthProvider: 'facebook' },
  'X (Twitter)': { authMethod: 'oauth', oauthProvider: 'x' },
  'Instagram': { authMethod: 'oauth', oauthProvider: 'instagram' },
  'LinkedIn': { authMethod: 'oauth', oauthProvider: 'linkedin' },
  'Google Search Console': { authMethod: 'oauth', oauthProvider: 'gsc' },
}

// Reference-only integrations (no fields, just catalog entries to learn from).
// The backend doesn't surface authMethod on the row, so we mirror the catalog
// here so the card shows a "Reference" badge instead of a Connect button.
export const NONE_AUTH_FALLBACK = new Set<string>([
  'WordPress Plugin Boilerplate',
  'Awesome OpenCode',
])

export function resolveAuthMethod(integration: Integration): {
  authMethod: string
  oauthProvider?: string
} {
  if (integration.authMethod) {
    return { authMethod: integration.authMethod, oauthProvider: integration.oauthProvider ?? undefined }
  }
  const fb = OAUTH_FALLBACK[integration.name]
  if (fb) return { authMethod: fb.authMethod, oauthProvider: fb.oauthProvider }
  if (NONE_AUTH_FALLBACK.has(integration.name)) return { authMethod: 'none' }
  // WordPress uses an Application Password (username + app password) — not OAuth.
  if (integration.name === 'WordPress') return { authMethod: 'appPassword' }
  return { authMethod: 'apikey' }
}

// Stable id for each integration card so AI-router chips can scroll to them.
export function cardSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-')
}

// Safely parse a connection.config (Prisma stores it as a JSON string).
export function parseConfig(cfg: any): Record<string, any> | null {
  if (!cfg) return null
  if (typeof cfg === 'string') {
    try {
      return JSON.parse(cfg)
    } catch {
      return null
    }
  }
  if (typeof cfg === 'object') return cfg as Record<string, any>
  return null
}

/* ---- Auto-detect helpers ------------------------------------------ */

// DiscoveredService shape returned by GET /api/integrations/auto-detect.
export interface DiscoveredService {
  kind: 'ollama' | 'n8n' | 'zeroclaw' | 'opencode-cli' | 'wordpress-mcp' | 'mcp'
  name: string
  endpoint: string
  status: 'reachable' | 'unreachable'
  responseTimeMs?: number
  details?: string
}

// Map a discovered service "kind" → the lucide icon to render in the panel.
export function iconForServiceKind(kind: string) {
  switch (kind) {
    case 'ollama':
      return Brain
    case 'n8n':
      return Workflow
    case 'zeroclaw':
      return Bot
    case 'opencode-cli':
      return Code2
    case 'wordpress-mcp':
    case 'mcp':
      return Network
    default:
      return Radar
  }
}

// Map an integration catalog name → the discovery "kind". This lets the
// per-card "Auto-detect" button find its matching discovered service after
// a scan. Kilocode reuses the OpenCode CLI detection (it's the same family).
export const INTEGRATION_NAME_TO_KIND: Record<string, string> = {
  'n8n': 'n8n',
  'Zeroclaw': 'zeroclaw',
  'OpenCode': 'opencode-cli',
  'Kilocode': 'opencode-cli',
  'WordPress MCP Server': 'wordpress-mcp',
  'WordPress MCP (tropk-ai)': 'wordpress-mcp',
}

export function kindForIntegrationName(name: string): string | null {
  return INTEGRATION_NAME_TO_KIND[name] ?? null
}
