// Shared types + helpers for the Settings view + extracted sub-components.
// Extracted from settings-view.tsx so the giant 1.2k-line view could be
// split into focused files (ai-persona-card, team-access-card, ai-provider-card).

/* ---- Account API types (mirrors /api/account response shape) -------- */

export interface AccountUser {
  id: string
  email: string
  name: string | null
  avatarUrl?: string | null
  plan: string
  role: 'owner' | 'admin' | 'member'
  canAccessBuilder: boolean
  canAccessSEO: boolean
  canAccessSocial: boolean
  canAccessContent: boolean
  canAccessPM: boolean
  canAccessAutomation: boolean
  canAccessInbox: boolean
  canAccessIntegrations: boolean
  canAccessAnalytics: boolean
  canAccessSettings: boolean
  canAccessAPISettings: boolean
  canAccessExternalSecrets: boolean
  aiPersonaName: string | null
  aiPersonaTone: string | null
  aiPersonaSystem: string | null
}

export interface AccountResponse {
  user: AccountUser
  usage: {
    projects: number
    pages: number
    integrations: number
    tasks: number
    billableHours: number
  }
  plan: {
    current: string
    label: string
    limits: { projects: number; pages: number; integrations: number }
    usagePercent: { projects: number; pages: number; integrations: number }
  }
}

export const DEFAULT_PREAMBLE =
  'You are a helpful assistant for small businesses using VirtuaLab Digital. Be honest, practical, and concise. Never use hype, paid-promo language, or marketing speak. When in doubt, suggest the organic, no-paid-ads approach.'

export const ACCESS_FLAGS: {
  key: keyof AccountUser
  label: string
  desc: string
  adminOnly?: boolean
}[] = [
  { key: 'canAccessBuilder', label: 'Builder', desc: 'Open projects in the drag & drop builder.' },
  { key: 'canAccessSEO', label: 'SEO Tools', desc: 'Access the SEO tools catalog.' },
  { key: 'canAccessSocial', label: 'Social Media', desc: 'Access the social media tools.' },
  { key: 'canAccessContent', label: 'Content Generation', desc: 'Access the content tools.' },
  { key: 'canAccessPM', label: 'Projects', desc: 'Access project management (Kanban, tasks, time, clients).' },
  { key: 'canAccessAutomation', label: 'Automation', desc: 'Access automations and toggles.' },
  { key: 'canAccessInbox', label: 'Inbox', desc: 'Access the unified inbox.' },
  { key: 'canAccessIntegrations', label: 'Integrations', desc: 'Connect and manage integrations.' },
  { key: 'canAccessAnalytics', label: 'Analytics', desc: 'View analytics dashboards.' },
  { key: 'canAccessSettings', label: 'Settings', desc: 'View and edit account settings.' },
  { key: 'canAccessAPISettings', label: 'API Settings', desc: 'API keys + external endpoints.', adminOnly: true },
  { key: 'canAccessExternalSecrets', label: 'External Secrets', desc: 'Stored secrets + credentials.', adminOnly: true },
]
