'use client'

// Tasks tab — full task list with filters + add + edit + delete.
// Also exports TaskCreateDialog and TaskEditDialog so the Kanban tab can
// reuse them. Extracted from pm-view.tsx.

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  formatDate,
} from './types'

export function TasksTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const tasksQuery = useQuery<{ tasks: PmTask[] }>({
    queryKey: ['pm-tasks'],
    queryFn: () => fetchJson('/api/pm/tasks'),
  })

  const [filterStatus, setFilterStatus] = React.useState<string>('all')
  const [filterPriority, setFilterPriority] = React.useState<string>('all')
  const [filterAssignee, setFilterAssignee] = React.useState<string>('all')
  const [addOpen, setAddOpen] = React.useState(false)
  const [editTask, setEditTask] = React.useState<PmTask | null>(null)

  const allTasks = tasksQuery.data?.tasks ?? []
  const assignees = Array.from(
    new Set(allTasks.map((t) => t.assignee).filter(Boolean) as string[]),
  ).sort()

  const filtered = allTasks.filter((t) => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false
    if (filterAssignee !== 'all' && t.assignee !== filterAssignee) return false
    return true
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/pm/tasks?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pm-tasks'] })
      void queryClient.invalidateQueries({ queryKey: ['pm-catalog'] })
      toast({ title: 'Task deleted' })
    },
    onError: () => toast({ title: 'Could not delete task', variant: 'destructive' }),
  })

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Tasks ({filtered.length})
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Filter, add, edit, and mark tasks done.
          </p>
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          className="bg-forest text-primary-foreground hover:bg-forest/90"
        >
          <Plus className="size-4" /> Add task
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {KANBAN_COLUMNS.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {(['low', 'medium', 'high', 'urgent'] as TaskPriority[]).map((p) => (
              <SelectItem key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterAssignee} onValueChange={setFilterAssignee} disabled={assignees.length === 0}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Assignee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All assignees</SelectItem>
            {assignees.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {tasksQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No tasks match. Add one to get started.
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border overflow-hidden">
          {filtered.map((t) => (
            <li
              key={t.id}
              className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-card hover:bg-muted/40 transition"
            >
              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                <CheckCircle2
                  className={cn(
                    'mt-0.5 size-4 shrink-0',
                    t.status === 'done'
                      ? 'text-moss fill-moss/30'
                      : 'text-muted-foreground/60',
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'text-sm font-medium text-foreground truncate',
                      t.status === 'done' && 'line-through text-muted-foreground',
                    )}
                  >
                    {t.title}
                  </p>
                  {t.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {t.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] px-1.5 py-0',
                        STATUS_COLORS[t.status as TaskStatus],
                      )}
                    >
                      {STATUS_LABEL[t.status as TaskStatus] ?? t.status}
                    </Badge>
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
                        due {formatDate(t.dueDate)}
                      </span>
                    )}
                    {t.assignee && (
                      <span className="text-[10px] text-muted-foreground">
                        · {t.assignee}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => setEditTask(t)}
                  aria-label="Edit task"
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-destructive hover:text-destructive"
                  onClick={() => deleteMut.mutate(t.id)}
                  aria-label="Delete task"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <TaskEditDialog
        task={editTask}
        open={!!editTask}
        onOpenChange={(o) => !o && setEditTask(null)}
      />
      <TaskCreateDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  )
}

/* ---- Task create / edit dialogs ----------------------------------- */

export function TaskCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  return (
    <TaskFormDialog
      open={open}
      onOpenChange={onOpenChange}
      mode="create"
      task={null}
    />
  )
}

export function TaskEditDialog({
  task,
  open,
  onOpenChange,
}: {
  task: PmTask | null
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  return (
    <TaskFormDialog
      open={open}
      onOpenChange={onOpenChange}
      mode="edit"
      task={task}
    />
  )
}

function TaskFormDialog({
  open,
  onOpenChange,
  mode,
  task,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  mode: 'create' | 'edit'
  task: PmTask | null
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [form, setForm] = React.useState({
    title: '',
    description: '',
    status: 'todo' as TaskStatus,
    priority: 'medium' as TaskPriority,
    dueDate: '',
    assignee: '',
  })

  React.useEffect(() => {
    if (open) {
      setForm({
        title: task?.title ?? '',
        description: task?.description ?? '',
        status: (task?.status as TaskStatus) ?? 'todo',
        priority: (task?.priority as TaskPriority) ?? 'medium',
        dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : '',
        assignee: task?.assignee ?? '',
      })
    }
  }, [open, task])

  const saveMut = useMutation({
    mutationFn: async () => {
      const body: any = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        status: form.status,
        priority: form.priority,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
        assignee: form.assignee.trim() || undefined,
      }
      if (mode === 'edit' && task) {
        body.id = task.id
        return fetchJson('/api/pm/tasks', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }
      return fetchJson('/api/pm/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pm-tasks'] })
      void queryClient.invalidateQueries({ queryKey: ['pm-catalog'] })
      toast({
        title: mode === 'edit' ? 'Task updated' : 'Task created',
        description: form.title.trim() || undefined,
      })
      onOpenChange(false)
    },
    onError: () =>
      toast({ title: 'Could not save task', variant: 'destructive' }),
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    saveMut.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Edit task' : 'Add task'}</DialogTitle>
          <DialogDescription>
            {mode === 'edit'
              ? 'Update the task fields below.'
              : 'Create a new task. It will appear on the Kanban board and the Tasks list.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Title *</Label>
            <Input
              id="task-title"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Send March invoice"
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-desc">Description</Label>
            <Textarea
              id="task-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional notes…"
              className="min-h-16 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="task-status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as TaskStatus })}
              >
                <SelectTrigger id="task-status" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KANBAN_COLUMNS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-priority">Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => setForm({ ...form, priority: v as TaskPriority })}
              >
                <SelectTrigger id="task-priority" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['low', 'medium', 'high', 'urgent'] as TaskPriority[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORITY_LABEL[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="task-due">Due date</Label>
              <Input
                id="task-due"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-assignee">Assignee</Label>
              <Input
                id="task-assignee"
                value={form.assignee}
                onChange={(e) => setForm({ ...form, assignee: e.target.value })}
                placeholder="e.g. You"
                className="h-9"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saveMut.isPending}
              className="bg-forest text-primary-foreground hover:bg-forest/90"
            >
              {saveMut.isPending && <Loader2 className="size-4 animate-spin mr-1" />}
              {mode === 'edit' ? 'Save changes' : 'Add task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
