'use client'

// Kanban tab — 4-column board with a "move to column" select on each card.
// Click a card to edit it via TaskEditDialog. Extracted from pm-view.tsx.

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { fetchJson } from '@/lib/client-utils'
import { cn } from '@/lib/utils'
import {
  type PmTask,
  type TaskStatus,
  type TaskPriority,
  KANBAN_COLUMNS,
  STATUS_LABEL,
  STATUS_COLORS,
  PRIORITY_LABEL,
  PRIORITY_BADGE,
  relativeDate,
} from './types'
import { TaskEditDialog } from './tasks-tab'

export function KanbanTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const tasksQuery = useQuery<{ tasks: PmTask[] }>({
    queryKey: ['pm-tasks'],
    queryFn: () => fetchJson('/api/pm/tasks'),
  })

  const updateMut = useMutation({
    mutationFn: (vars: { id: string; status?: TaskStatus }) =>
      fetchJson('/api/pm/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars),
      }),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ['pm-tasks'] })
      const prev = queryClient.getQueryData<{ tasks: PmTask[] }>(['pm-tasks'])
      if (prev) {
        queryClient.setQueryData<{ tasks: PmTask[] }>(['pm-tasks'], {
          tasks: prev.tasks.map((t) =>
            t.id === vars.id ? { ...t, status: vars.status ?? t.status } : t,
          ),
        })
      }
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['pm-tasks'], ctx.prev)
      toast({ title: 'Could not move task', variant: 'destructive' })
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['pm-tasks'] })
    },
  })

  const [editTask, setEditTask] = React.useState<PmTask | null>(null)

  const allTasks = tasksQuery.data?.tasks ?? []

  return (
    <div className="space-y-4">
      {tasksQuery.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {KANBAN_COLUMNS.map((c) => (
            <Skeleton key={c} className="h-64" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {KANBAN_COLUMNS.map((col) => {
            const colTasks = allTasks.filter((t) => t.status === col)
            return (
              <div
                key={col}
                className="rounded-xl border border-border bg-card/60 flex flex-col min-h-48"
              >
                <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {STATUS_LABEL[col]}
                  </span>
                  <span
                    className={cn(
                      'text-[10px] font-semibold px-1.5 py-0.5 rounded-full border',
                      STATUS_COLORS[col],
                    )}
                  >
                    {colTasks.length}
                  </span>
                </div>
                <div className="p-2 space-y-2 max-h-[28rem] overflow-y-auto">
                  {colTasks.length === 0 ? (
                    <div className="text-xs text-muted-foreground py-4 text-center">
                      No tasks
                    </div>
                  ) : (
                    colTasks.map((t) => (
                      <div
                        key={t.id}
                        className="rounded-lg border border-border bg-card p-3 cursor-pointer hover:border-forest/40 transition"
                        onClick={() => setEditTask(t)}
                      >
                        <p className="text-sm font-medium text-foreground line-clamp-2">
                          {t.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
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
                            <span className="text-[10px] text-muted-foreground">
                              {relativeDate(t.dueDate)}
                            </span>
                          )}
                          {t.assignee && (
                            <span className="text-[10px] text-muted-foreground">
                              · {t.assignee}
                            </span>
                          )}
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-border">
                          <Select
                            value={t.status}
                            onValueChange={(v) =>
                              updateMut.mutate({ id: t.id, status: v as TaskStatus })
                            }
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {KANBAN_COLUMNS.map((s) => (
                                <SelectItem key={s} value={s} className="text-xs">
                                  {STATUS_LABEL[s]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <AlertCircle className="size-3.5" /> Use the small status menu on each card to
        move it across columns. Click a card to edit it.
      </p>

      <TaskEditDialog
        task={editTask}
        open={!!editTask}
        onOpenChange={(o) => !o && setEditTask(null)}
      />
    </div>
  )
}
