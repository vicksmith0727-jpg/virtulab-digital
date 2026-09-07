import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/account
// Returns the current user's profile, role, access permissions, AI persona,
// plan, and usage stats. The frontend uses this for:
//   - Settings (personal info, role, access control, AI persona, plan)
//   - Dashboard (usage monitor + plan badge)
//   - Nav (hide features the user can't access)

async function getOrCreateUser() {
  let user = await db.user.findFirst()
  if (!user) {
    user = await db.user.create({
      data: {
        email: 'demo@virtulab.local',
        name: 'VirtuaLab Demo',
        plan: 'grove',
        role: 'owner',
        canAccessAPISettings: true,
        canAccessExternalSecrets: true,
      },
    })
  }
  return user
}

export async function GET() {
  try {
    const user = await getOrCreateUser()

    // Compute usage stats
    const [projectCount, pageCount, integrationCount, taskCount, timeEntries, automations] = await Promise.all([
      db.project.count().catch(() => 0),
      db.page.count().catch(() => 0),
      db.integrationConnection.count().catch(() => 0),
      db.task.count().catch(() => 0),
      db.timeEntry.count().catch(() => 0),
      db.automation.count().catch(() => 0),
    ])

    const billableMin = await db.timeEntry.aggregate({
      _sum: { durationMin: true },
      where: { billable: true },
    }).catch(() => ({ _sum: { durationMin: 0 } }))

    // Plan limits (for the usage monitor)
    const planLimits: Record<string, { projects: number; pages: number; integrations: number; label: string }> = {
      seed: { projects: 1, pages: 3, integrations: 5, label: 'Seed (Free)' },
      sprout: { projects: 10, pages: 50, integrations: 20, label: 'Sprout ($19/mo)' },
      grove: { projects: 100, pages: 500, integrations: 50, label: 'Grove ($49/mo)' },
      forest: { projects: -1, pages: -1, integrations: -1, label: 'Forest (Unlimited)' },
    }
    const plan = (user.plan || 'seed') as keyof typeof planLimits
    const limits = planLimits[plan] || planLimits.seed

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        plan: user.plan,
        role: user.role,
        // Access control flags
        canAccessBuilder: user.canAccessBuilder,
        canAccessSEO: user.canAccessSEO,
        canAccessSocial: user.canAccessSocial,
        canAccessContent: user.canAccessContent,
        canAccessPM: user.canAccessPM,
        canAccessAutomation: user.canAccessAutomation,
        canAccessInbox: user.canAccessInbox,
        canAccessIntegrations: user.canAccessIntegrations,
        canAccessAnalytics: user.canAccessAnalytics,
        canAccessSettings: user.canAccessSettings,
        canAccessAPISettings: user.canAccessAPISettings,
        canAccessExternalSecrets: user.canAccessExternalSecrets,
        // AI persona
        aiPersonaName: user.aiPersonaName,
        aiPersonaTone: user.aiPersonaTone,
        aiPersonaSystem: user.aiPersonaSystem,
      },
      usage: {
        projects: projectCount,
        pages: pageCount,
        integrations: integrationCount,
        tasks: taskCount,
        timeEntries,
        billableHours: Math.round((billableMin._sum?.durationMin ?? 0) / 60),
        automations,
      },
      plan: {
        current: plan,
        label: limits.label,
        limits: {
          projects: limits.projects,
          pages: limits.pages,
          integrations: limits.integrations,
        },
        // Usage as % of limit (for the progress bars)
        usagePercent: {
          projects: limits.projects > 0 ? Math.round((projectCount / limits.projects) * 100) : 0,
          pages: limits.pages > 0 ? Math.round((pageCount / limits.pages) * 100) : 0,
          integrations: limits.integrations > 0 ? Math.round((integrationCount / limits.integrations) * 100) : 0,
        },
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch account'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PATCH /api/account
// Body: any subset of { name, email, avatarUrl, plan, role, canAccess*, aiPersona* }
// Updates the current user's profile, role, access, or persona.
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const user = await getOrCreateUser()

    const data: any = {}
    // Profile fields
    if (typeof body?.name === 'string') data.name = body.name.trim()
    if (typeof body?.email === 'string') data.email = body.email.trim()
    if (typeof body?.avatarUrl === 'string') data.avatarUrl = body.avatarUrl.trim()
    if (typeof body?.plan === 'string') data.plan = body.plan
    // Role
    if (typeof body?.role === 'string' && ['owner', 'admin', 'member'].includes(body.role)) {
      data.role = body.role
    }
    // Access control flags
    for (const key of [
      'canAccessBuilder', 'canAccessSEO', 'canAccessSocial', 'canAccessContent',
      'canAccessPM', 'canAccessAutomation', 'canAccessInbox', 'canAccessIntegrations',
      'canAccessAnalytics', 'canAccessSettings', 'canAccessAPISettings', 'canAccessExternalSecrets',
    ]) {
      if (typeof body?.[key] === 'boolean') data[key] = body[key]
    }
    // AI persona
    if (typeof body?.aiPersonaName === 'string') data.aiPersonaName = body.aiPersonaName.trim() || null
    if (typeof body?.aiPersonaTone === 'string') data.aiPersonaTone = body.aiPersonaTone.trim() || null
    if (typeof body?.aiPersonaSystem === 'string') data.aiPersonaSystem = body.aiPersonaSystem.trim() || null

    const updated = await db.user.update({ where: { id: user.id }, data })
    return NextResponse.json({
      ok: true,
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        plan: updated.plan,
        role: updated.role,
        aiPersonaName: updated.aiPersonaName,
        aiPersonaTone: updated.aiPersonaTone,
        aiPersonaSystem: updated.aiPersonaSystem,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update account'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
