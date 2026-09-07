import { NextResponse } from 'next/server'
import { PM_TOOLS } from '../../_lib/pm-automation-catalog'
import { db } from '@/lib/db'

// GET /api/pm/catalog
// Returns the project management tool catalog + live counts (tasks, clients, projects, time entries).
export async function GET() {
  try {
    const [taskCount, clientCount, projectCount, timeEntries] = await Promise.all([
      db.task.count(),
      db.client.count(),
      db.projectRecord.count(),
      db.timeEntry.count(),
    ])
    const totalBillableMin = await db.timeEntry.aggregate({
      _sum: { durationMin: true },
      where: { billable: true },
    }).catch(() => ({ _sum: { durationMin: 0 } }))

    return NextResponse.json({
      tools: PM_TOOLS,
      stats: {
        tasks: taskCount,
        clients: clientCount,
        projects: projectCount,
        timeEntries,
        totalBillableHours: Math.round((totalBillableMin._sum?.durationMin ?? 0) / 60),
      },
      note: 'All PM tools are built-in. Use the "+" to add custom features.',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch PM catalog'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
