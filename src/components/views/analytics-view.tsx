'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts'
import {
  Folder,
  Rocket,
  Blocks,
  Plug,
  Activity,
  TrendingUp,
  Clock,
  ArrowUpRight,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */

interface Analytics {
  stats: {
    totalProjects: number
    publishedProjects: number
    totalBlocks: number
    totalIntegrations: number
    recentActivity: Array<{
      id?: string
      action?: string
      detail?: string | null
      projectId?: string | null
      createdAt?: string
    }>
    topProjects: Array<{
      id?: string
      name?: string
      blocks?: number
      status?: string
      updatedAt?: string
    }>
  }
}

async function fetchJson(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error((await res.text().catch(() => '')) || 'Request failed')
  return res.json()
}

const barColors = ['var(--color-forest)', 'var(--color-chart-2)', 'var(--color-chart-3)', 'var(--color-chart-4)', 'var(--color-chart-5)']

/* ------------------------------------------------------------------ */

export function AnalyticsView() {
  const setView = useAppStore((s) => s.setView)
  const query = useQuery<Analytics>({
    queryKey: ['analytics'],
    queryFn: () => fetchJson('/api/analytics'),
  })

  const stats = query.data?.stats
  const kpis = [
    { key: 'totalProjects', label: 'Projects', value: stats?.totalProjects, icon: Folder },
    { key: 'publishedProjects', label: 'Published', value: stats?.publishedProjects, icon: Rocket },
    { key: 'totalBlocks', label: 'Total blocks', value: stats?.totalBlocks, icon: Blocks },
    { key: 'totalIntegrations', label: 'Integrations', value: stats?.totalIntegrations, icon: Plug },
  ]

  const chartData =
    stats?.topProjects?.map((p) => ({
      name: p?.name ?? 'Project',
      blocks: Number(p?.blocks ?? 0),
    })) ?? []

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-8">
          <p className="text-sm text-muted-foreground">Your studio at a glance</p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            Analytics
          </h1>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {kpis.map((k) => {
            const Icon = k.icon
            return (
              <Card key={k.key} className="py-4 gap-0">
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      {k.label}
                    </p>
                    <span className="size-7 rounded-lg bg-forest/10 text-forest flex items-center justify-center">
                      <Icon className="size-3.5" />
                    </span>
                  </div>
                  {query.isLoading ? (
                    <Skeleton className="h-8 w-12 mt-2" />
                  ) : (
                    <p className="text-3xl font-semibold text-forest tracking-tight mt-1">
                      {k.value ?? 0}
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          {/* Bar chart */}
          <Card className="py-4">
            <CardHeader className="px-6 pb-0">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="size-4 text-forest" /> Blocks per project
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 sm:px-4 pt-2">
              {query.isLoading ? (
                <Skeleton className="h-64 w-full rounded-md" />
              ) : chartData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                  No project data yet.
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                      <XAxis
                        dataKey="name"
                        stroke="var(--color-muted-foreground)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                        height={50}
                      />
                      <YAxis
                        stroke="var(--color-muted-foreground)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        cursor={{ fill: 'var(--color-muted)', opacity: 0.4 }}
                        contentStyle={{
                          background: 'var(--color-card)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 8,
                          fontSize: 12,
                          color: 'var(--color-foreground)',
                        }}
                      />
                      <Bar dataKey="blocks" radius={[6, 6, 0, 0]} maxBarSize={48}>
                        {chartData.map((_, i) => (
                          <Cell key={i} fill={barColors[i % barColors.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top projects */}
          <Card className="py-4">
            <CardHeader className="px-6 pb-0">
              <CardTitle className="text-base flex items-center gap-2">
                <Folder className="size-4 text-forest" /> Top projects
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 sm:px-4 pt-2">
              {query.isLoading ? (
                <Skeleton className="h-64 w-full rounded-md" />
              ) : !stats?.topProjects?.length ? (
                <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                  No projects yet.
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {stats.topProjects.slice(0, 6).map((p, i) => (
                    <li
                      key={p.id ?? i}
                      className="flex items-center justify-between py-3 px-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {p.name ?? 'Untitled'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {p.blocks ?? 0} blocks
                          {p.updatedAt
                            ? ` · updated ${new Date(p.updatedAt).toLocaleDateString()}`
                            : ''}
                        </p>
                      </div>
                      {p.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0"
                          onClick={() =>
                            setView({ name: 'builder', projectId: p.id! })
                          }
                        >
                          Edit <ArrowUpRight className="size-3.5" />
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent activity */}
        <Card className="py-4">
          <CardHeader className="px-6 pb-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="size-4 text-forest" /> Recent activity
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pt-2">
            {query.isLoading ? (
              <div className="space-y-3 pt-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !stats?.recentActivity?.length ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No activity yet. Edit a project to get started.
              </div>
            ) : (
              <ol className="relative pl-6">
                <span className="absolute left-2 top-2 bottom-2 w-px bg-border" aria-hidden />
                {stats.recentActivity.slice(0, 12).map((a, i) => {
                  const date = a.createdAt ? new Date(a.createdAt) : null
                  return (
                    <li key={i} className="relative pb-5 last:pb-0">
                      <span
                        className={cn(
                          'absolute -left-[14px] top-1.5 size-2.5 rounded-full bg-forest ring-4 ring-background',
                        )}
                        aria-hidden
                      />
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-sm font-medium text-foreground">
                          {a.action ?? 'Activity'}
                        </span>
                        {date && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="size-3" />
                            {date.toLocaleString()}
                          </span>
                        )}
                      </div>
                      {a.detail && (
                        <p className="text-sm text-muted-foreground mt-0.5">{a.detail}</p>
                      )}
                    </li>
                  )
                })}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
