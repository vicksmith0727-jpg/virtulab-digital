import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { DEMO_PAGE_BLOCKS } from '@/lib/seed'
import { buildTemplateSeeds } from '../_lib/templates'
import { INTEGRATION_CATALOG } from '../_lib/integrations'

// POST /api/seed → initialize demo data
// - 1 demo User (if none)
// - 3 demo Projects (with home pages using DEMO_PAGE_BLOCKS)
// - Call the templates seeder (6 starter templates if empty)
export async function POST() {
  try {
    // 1. Ensure a demo user exists
    let user = await db.user.findFirst()
    if (!user) {
      user = await db.user.create({
        data: {
          email: 'demo@virtulab.local',
          name: 'VirtuaLab Digital Demo',
          plan: 'grove',
        },
      })
    }

    // 2. Create 3 demo projects if none exist
    const existing = await db.project.count()
    let projectsCreated = 0
    if (existing === 0) {
      const seeds = [
        {
          name: 'Hollow Field Farm',
          subdomain: 'hollowfield',
          description: 'A small family farm in Greenhollow growing organic greens and roots.',
        },
        {
          name: 'Slow Goods Studio',
          subdomain: 'slowgoods',
          description: 'A two-person studio making honest homewares and field journals.',
        },
        {
          name: 'Orchard Cafe',
          subdomain: 'orchard',
          description: 'A neighborhood cafe serving slow coffee and seasonal breads.',
        },
      ]
      for (const s of seeds) {
        const project = await db.project.create({
          data: {
            name: s.name,
            subdomain: s.subdomain,
            description: s.description,
            userId: user.id,
          },
        })
        await db.page.create({
          data: {
            projectId: project.id,
            name: 'Home',
            slug: 'home',
            isHome: true,
            blocks: JSON.stringify(DEMO_PAGE_BLOCKS),
            metaTitle: project.name,
            metaDesc: s.description,
          },
        })
        await db.activityLog.create({
          data: {
            projectId: project.id,
            action: 'project.create',
            detail: `Seeded project "${project.name}"`,
          },
        })
        projectsCreated++
      }
    }

    // 3. Seed templates if empty
    let templatesCreated = 0
    const templateCount = await db.template.count()
    if (templateCount === 0) {
      const seeds = buildTemplateSeeds()
      await db.template.createMany({
        data: seeds.map((s) => ({
          name: s.name,
          category: s.category,
          description: s.description,
          thumbnail: null,
          blocks: JSON.stringify(s.blocks),
          isPublic: true,
        })),
      })
      templatesCreated = seeds.length
    }

    // 4. Seed integrations if empty (lazy-seed equivalent)
    let integrationsCreated = 0
    const integrationCount = await db.integration.count()
    if (integrationCount === 0) {
      await db.integration.createMany({
        data: INTEGRATION_CATALOG.map((i) => ({
          name: i.name,
          category: i.category,
          description: i.description,
          iconKey: i.iconKey,
          fields: JSON.stringify(i.fields),
          status: i.status ?? 'available',
        })),
      })
      integrationsCreated = INTEGRATION_CATALOG.length
    }

    return NextResponse.json({
      ok: true,
      created: {
        projects: projectsCreated,
        templates: templatesCreated,
        integrations: integrationsCreated,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to seed demo data'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
