'use client'

// Overview tab for the PM view — KPI cards + today's tasks + tool grid + the
// "+" custom-tool card. Extracted from pm-view.tsx.

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  CheckSquare,
  Users,
  FolderOpen,
  Clock,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchJson, DynamicIcon } from '@/lib/client-utils'
import { cn } from '@/lib/utils'
import { AddCustomToolCard } from '@/components/shared/add-custom-tool-dialog'
import {
  type PmTask,
  type TaskPriority,
  type CatalogQuery,
  PRIORITY_BADGE,
  PRIORITY_LABEL,
  relativeDate,
} from './types'

export function OverviewTab({
  catalogQuery,
  onAddCustom,
}: {
  catalogQuery: CatalogQuery
  onAddCustom: () => void
}) {
  const stats = catalogQuery.data?.stats
  const kpis = [
    { key: 'tasks', label: 'Tasks', value: stats?.tasks, icon: CheckSquare },
    { key: 'clients', label: 'Clients', value: stats?.clients, icon: Users },
    { key: 'projects', label: 'Projects', value: stats?.projects, icon: FolderOpen },
    {
      key: 'billable',
      label: 'Billable hours',
      value: stats?.totalBillableHours,
      icon: Clock,
    },
  ]

  const tasksQuery = useQuery<{ tasks: PmTask[] }>({
    queryKey: ['pm-tasks'],
    queryFn: () => fetchJson('/api/pm/tasks'),
  })

  const todayTasks = (tasksQuery.data?.tasks ?? []).filter(
    (t) => t.status === 'todo' || t.status === 'in-progress',
  )

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
                {catalogQuery.isLoading ? (
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Tasks */}
        <Card className="py-4">
          <CardHeader className="px-6 pb-0">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckSquare className="size-4 text-forest" /> Today&rsquo;s Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pt-2">
            {tasksQuery.isLoading ? (
              <div className="space-y-2 pt-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : todayTasks.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <CheckCircle2 className="size-6 mx-auto mb-2 text-moss" />
                No tasks to do today. Add one from the Tasks tab.
              </div>
            ) : (
              <ul className="divide-y divide-border max-h-96 overflow-y-auto pr-1 -mr-1">
                {todayTasks.slice(0, 12).map((t) => (
                  <li key={t.id} className="py-3 flex items-start gap-3">
                    <span
                      className={cn(
                        'mt-1 size-2.5 rounded-full shrink-0',
                        t.status === 'in-progress' ? 'bg-forest' : 'bg-sage',
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {t.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] px-1.5 py-0',
                            PRIORITY_BADGE[t.priority as TaskPriority],
                          )}
                        >
                          {PRIORITY_LABEL[t.priority as TaskPriority] ?? t.priority}
                        </Badge>
                        {t.dueDate && (
                          <span className="text-xs text-muted-foreground">
                            due {relativeDate(t.dueDate)}
                          </span>
                        )}
                        {t.assignee && (
                          <span className="text-xs text-muted-foreground">
                            · {t.assignee}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent activity / tool grid */}
        <Card className="py-4">
          <CardHeader className="px-6 pb-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="size-4 text-forest" /> PM Tools
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pt-2">
            {catalogQuery.isLoading ? (
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {(catalogQuery.data?.tools ?? []).slice(0, 10).map((tool) => (
                  <div
                    key={tool.id}
                    className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-2.5"
                  >
                    <span className="mt-0.5 size-7 rounded-md bg-forest/10 text-forest flex items-center justify-center shrink-0">
                      <DynamicIcon name={tool.icon} className="size-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {tool.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground line-clamp-2">
                        {tool.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* "+" custom tool card at the end of the Overview tab */}
      <div>
        <div className="flex items-baseline gap-2 border-b border-border pb-2 mb-4">
          <h3 className="text-lg font-semibold text-foreground">Your tools</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AddCustomToolCard
            onClick={onAddCustom}
            title="Add custom PM tool"
            subtitle="Add your own PM tool — saved to your project only."
            ariaLabel="Add custom PM tool"
          />
        </div>
      </div>
    </div>
  )
}
