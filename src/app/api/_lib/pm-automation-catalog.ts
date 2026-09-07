// Project Management + Automation tool catalog.
// These are project-management and automation features for the agency/freelancer
// who runs VirtuaLab Digital. They live in the nav as "Projects" and "Automation"
// dropdowns, each with a "+" to add custom features.

export type PmTool = {
  id: string
  label: string
  icon: string
  description: string
  // 'builtin' = runs in-app (kanban, tasks, time tracking, clients, proposals, invoices)
  // 'integration' = links to an existing integration (n8n, Zeroclaw, Make, Webhooks)
  kind: 'builtin' | 'integration'
  integrationName?: string // for kind: 'integration'
}

// ── Project Management tools (built-in to VirtuaLab Digital) ──
export const PM_TOOLS: PmTool[] = [
  {
    id: 'kanban',
    label: 'Kanban Board',
    icon: 'Trello',
    description: 'Visual project board — To Do, In Progress, Review, Done. Drag cards across columns. Per-project + agency-wide boards.',
    kind: 'builtin',
  },
  {
    id: 'tasks',
    label: 'Tasks & To-Dos',
    icon: 'CheckSquare',
    description: 'Per-project + personal task lists. Assign, due dates, priorities, recurring tasks. Sync with the Kanban board.',
    kind: 'builtin',
  },
  {
    id: 'time-tracker',
    label: 'Time Tracker',
    icon: 'Clock',
    description: 'Track time per project + per task. Start/stop timer, manual entry. Billable vs non-billable. Export timesheets.',
    kind: 'builtin',
  },
  {
    id: 'clients',
    label: 'Client CRM',
    icon: 'Users',
    description: 'Client database — contact info, projects, billing history, notes, communication log. One client → many projects.',
    kind: 'builtin',
  },
  {
    id: 'proposals',
    label: 'Proposals & Quotes',
    icon: 'FileText',
    description: 'Create + send proposals/quotes. Templates, e-sign, track opens, auto-convert to project on acceptance.',
    kind: 'builtin',
  },
  {
    id: 'invoices',
    label: 'Invoices & Billing',
    icon: 'Receipt',
    description: 'Create invoices from tracked time or fixed-fee. Stripe/Lemon Squeezy integration. Recurring invoices, reminders.',
    kind: 'builtin',
  },
  {
    id: 'calendar',
    label: 'Calendar & Deadlines',
    icon: 'Calendar',
    description: 'See all project deadlines, client calls, content publishing dates in one calendar. Sync with Google Calendar.',
    kind: 'builtin',
  },
  {
    id: 'files',
    label: 'Project Files',
    icon: 'FolderOpen',
    description: 'Per-project file storage. Briefs, assets, deliverables, signed contracts. Integrates with Google Drive / Dropbox MCP.',
    kind: 'builtin',
  },
  {
    id: 'retainers',
    label: 'Retainer Tracker',
    icon: 'Repeat',
    description: 'Track monthly retainer hours. See remaining vs used. Auto-alert when 80% consumed. Roll-over rules.',
    kind: 'builtin',
  },
  {
    id: 'reporting',
    label: 'Client Reporting',
    icon: 'BarChart3',
    description: 'Auto-generate monthly client reports — SEO progress, traffic, tasks done, hours used, next-month plan. PDF + email.',
    kind: 'builtin',
  },
]

// ── Automation tools (link to integrations + built-in workflows) ──
export const AUTOMATION_TOOLS: PmTool[] = [
  {
    id: 'n8n-workflows',
    label: 'n8n Workflows',
    icon: 'Workflow',
    description: 'Open-source workflow automation. Connect VirtuaLab Digital to 400+ apps. Auto-post to social, sync CRM, trigger on new lead.',
    kind: 'integration',
    integrationName: 'n8n',
  },
  {
    id: 'zeroclaw-agents',
    label: 'Zeroclaw Agents',
    icon: 'Bot',
    description: 'Autonomous AI agents. Run background research, outreach, monitoring. Deploy on your 16GB laptop.',
    kind: 'integration',
    integrationName: 'Zeroclaw',
  },
  {
    id: 'make-workflows',
    label: 'Make Workflows',
    icon: 'Workflow',
    description: 'Visual automation connecting VirtuaLab Digital to thousands of apps. Cloud-hosted alternative to n8n.',
    kind: 'integration',
    integrationName: 'Make',
  },
  {
    id: 'webhooks',
    label: 'Webhook Triggers',
    icon: 'Webhook',
    description: 'Send events to any URL — new project, page published, form submission, invoice paid. Custom integrations.',
    kind: 'integration',
    integrationName: 'Webhooks',
  },
  {
    id: 'auto-publish',
    label: 'Auto-Publish to WP',
    icon: 'Send',
    description: 'Auto-publish pages to WordPress when approved. Status: pending review → publish. Gutenberg/Kadence/Elementor/Hybrid.',
    kind: 'builtin',
  },
  {
    id: 'auto-social',
    label: 'Auto-Social Posting',
    icon: 'Share2',
    description: 'Auto-post new content to Facebook, X, Instagram, LinkedIn when a page is published. Schedule for optimal times.',
    kind: 'builtin',
  },
  {
    id: 'auto-report',
    label: 'Auto Client Reports',
    icon: 'Mail',
    description: 'Auto-generate + email monthly client reports on the 1st of each month. SEO progress, traffic, tasks, hours.',
    kind: 'builtin',
  },
  {
    id: 'auto-backup',
    label: 'Auto-Backup Projects',
    icon: 'DatabaseBackup',
    description: 'Auto-backup all projects to your connected storage (Google Drive, Dropbox, Cloudinary) every night. 30-day retention.',
    kind: 'builtin',
  },
  {
    id: 'auto-seo-audit',
    label: 'Auto Weekly SEO Audit',
    icon: 'Radar',
    description: 'Run a full SEO audit on every published project every Monday. Email you a summary + the top 5 issues to fix.',
    kind: 'builtin',
  },
  {
    id: 'auto-keyword-alert',
    label: 'Keyword Rank Alerts',
    icon: 'Bell',
    description: 'Get alerted when a tracked keyword drops 3+ positions. Daily check via GSC MCP. Email + inbox notification.',
    kind: 'builtin',
  },
]
