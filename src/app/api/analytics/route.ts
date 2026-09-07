import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

function countBlocks(blocksJson: string | null): number {
  if (!blocksJson) return 0
  try {
    const parsed = JSON.parse(blocksJson)
    return Array.isArray(parsed) ? parsed.length : 0
  } catch {
    return 0
  }
}

// GET /api/analytics → dashboard stats
export async function GET() {
  try {
    const [projects, pages, integrations, recentActivity] = await Promise.all([
      db.project.findMany({ select: { id: true, status: true } }),
      db.page.findMany({ select: { id: true, blocks: true } }),
      db.integration.findMany({ select: { id: true } }),
      db.activityLog.findMany({ take: 10, orderBy: { createdAt: 'desc' } }),
    ])

    const totalProjects = projects.length
    const publishedProjects = projects.filter((p) => p.status === 'published').length
    const totalBlocks = pages.reduce((sum, p) => sum + countBlocks(p.blocks), 0)
    const totalIntegrations = integrations.length

    const topProjects = await db.project.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 3,
    })

    return NextResponse.json({
      stats: {
        totalProjects,
        publishedProjects,
        totalBlocks,
        totalIntegrations,
        recentActivity,
        topProjects,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch analytics'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
