'use client'

// Projects tab — grid of project cards + add/edit ProjectFormDialog +
// ProjectDetailDialog (per-project task list + time entries).
// Extracted from pm-view.tsx.

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  ArrowRight,
  FolderOpen,
  CircleDot,
  Clock,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
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
  type PmProject,
  type PmClient,
  type PmTask,
  type PmTimeEntry,
  type TaskPriority,
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_BADGE,
  PRIORITY_LABEL,
  PRIORITY_BADGE,
  formatDate,
  formatDuration,
} from './types'

export function ProjectsTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const projectsQuery = useQuery<{ projects: PmProject[] }>({
    queryKey: ['pm-projects'],
    queryFn: () => fetchJson('/api/pm/projects'),
  })

  const [addOpen, setAddOpen] = React.useState(false)
  const [editProject, setEditProject] = React.useState<PmProject | null>(null)
  const [openProject, setOpenProject] = React.useState<PmProject | null>(null)

  const deleteMut = useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/pm/projects?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pm-projects'] })
      void queryClient.invalidateQueries({ queryKey: ['pm-catalog'] })
      toast({ title: 'Project deleted' })
    },
    onError: () => toast({ title: 'Could not delete project', variant: 'destructive' }),
  })

  const projects = projectsQuery.data?.projects ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Projects ({projects.length})
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            One project belongs to one client. Click a project to see its tasks + time.
          </p>
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          className="bg-forest text-primary-foreground hover:bg-forest/90"
        >
          <Plus className="size-4" /> Add project
        </Button>
      </div>

      {projectsQuery.isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No projects yet. Add one to start tracking tasks + time against it.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {projects.map((p) => (
            <Card key={p.id} className="py-4 gap-0">
              <CardContent className="px-5 pt-0 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setOpenProject(p)}
                    className="text-left min-w-0"
                  >
                    <p className="text-sm font-semibold text-foreground truncate hover:text-forest">
                      {p.name}
                    </p>
                    {p.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {p.description}
                      </p>
                    )}
                  </button>
                  <Badge
                    variant="outline"
                    className={
                      PROJECT_STATUS_BADGE[p.status] ??
                      'bg-muted text-muted-foreground border-border text-[10px]'
                    }
                  >
                    {PROJECT_STATUS_LABEL[p.status] ?? p.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] px-1.5 py-0',
                      PRIORITY_BADGE[p.priority as TaskPriority],
                    )}
                  >
                    {PRIORITY_LABEL[p.priority as TaskPriority] ?? p.priority}
                  </Badge>
                  {p.dueDate && (
                    <span className="text-[10px] text-muted-foreground">
                      due {formatDate(p.dueDate)}
                    </span>
                  )}
                </div>
                {p.client && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="size-3" /> {p.client.name}
                  </p>
                )}
                <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                  <span>{p._count?.tasks ?? 0} tasks</span>
                  <span>·</span>
                  <span>{p._count?.timeEntries ?? 0} time entries</span>
                </div>
                <div className="flex items-center gap-1 pt-1 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => setOpenProject(p)}
                  >
                    Open <ArrowRight className="size-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 ml-auto"
                    onClick={() => setEditProject(p)}
                    aria-label="Edit project"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive hover:text-destructive"
                    onClick={() => deleteMut.mutate(p.id)}
                    aria-label="Delete project"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ProjectFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        mode="create"
        project={null}
      />
      <ProjectFormDialog
        open={!!editProject}
        onOpenChange={(o) => !o && setEditProject(null)}
        mode="edit"
        project={editProject}
      />
      <ProjectDetailDialog
        project={openProject}
        open={!!openProject}
        onOpenChange={(o) => !o && setOpenProject(null)}
      />
    </div>
  )
}

function ProjectFormDialog({
  open,
  onOpenChange,
  mode,
  project,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  mode: 'create' | 'edit'
  project: PmProject | null
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [form, setForm] = React.useState({
    name: '',
    description: '',
    status: 'planning',
    priority: 'medium',
    dueDate: '',
    clientId: '',
  })

  React.useEffect(() => {
    if (open) {
      setForm({
        name: project?.name ?? '',
        description: project?.description ?? '',
        status: project?.status ?? 'planning',
        priority: project?.priority ?? 'medium',
        dueDate: project?.dueDate
          ? new Date(project.dueDate).toISOString().slice(0, 10)
          : '',
        clientId: project?.client?.id ?? '',
      })
    }
  }, [open, project])

  const clientsQuery = useQuery<{ clients: PmClient[] }>({
    queryKey: ['pm-clients'],
    queryFn: () => fetchJson('/api/pm/clients'),
  })

  const saveMut = useMutation({
    mutationFn: async () => {
      const body: any = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        status: form.status,
        priority: form.priority,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
        clientId: form.clientId || undefined,
      }
      if (mode === 'edit' && project) {
        body.id = project.id
        return fetchJson('/api/pm/projects', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }
      return fetchJson('/api/pm/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pm-projects'] })
      void queryClient.invalidateQueries({ queryKey: ['pm-catalog'] })
      toast({
        title: mode === 'edit' ? 'Project updated' : 'Project added',
        description: form.name.trim() || undefined,
      })
      onOpenChange(false)
    },
    onError: () =>
      toast({ title: 'Could not save project', variant: 'destructive' }),
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    saveMut.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Edit project' : 'Add project'}</DialogTitle>
          <DialogDescription>
            {mode === 'edit'
              ? 'Update the project details below.'
              : 'Create a new project. Optionally link to a client.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="proj-name">Name *</Label>
            <Input
              id="proj-name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. March SEO retainer"
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="proj-desc">Description</Label>
            <Textarea
              id="proj-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional notes…"
              className="min-h-16 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="proj-status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v })}
              >
                <SelectTrigger id="proj-status" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="review">In Review</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on-hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proj-priority">Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => setForm({ ...form, priority: v })}
              >
                <SelectTrigger id="proj-priority" className="h-9">
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
              <Label htmlFor="proj-due">Due date</Label>
              <Input
                id="proj-due"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proj-client">Client</Label>
              <Select
                value={form.clientId}
                onValueChange={(v) =>
                  setForm({ ...form, clientId: v === 'none' ? '' : v })
                }
              >
                <SelectTrigger id="proj-client" className="h-9">
                  <SelectValue placeholder="No client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No client</SelectItem>
                  {(clientsQuery.data?.clients ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              {mode === 'edit' ? 'Save changes' : 'Add project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ProjectDetailDialog({
  project,
  open,
  onOpenChange,
}: {
  project: PmProject | null
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const tasksQuery = useQuery<{ tasks: PmTask[] }>({
    queryKey: ['pm-tasks'],
    queryFn: () => fetchJson('/api/pm/tasks'),
    enabled: open && !!project,
  })
  const timeQuery = useQuery<{ entries: PmTimeEntry[] }>({
    queryKey: ['pm-time', { projectRecordId: project?.id }],
    queryFn: () =>
      fetchJson(`/api/pm/time?projectRecordId=${encodeURIComponent(project!.id)}`),
    enabled: open && !!project,
  })

  if (!project) return null

  const tasks = (tasksQuery.data?.tasks ?? []).filter(
    (t) => t.projectRecordId === project.id,
  )
  const entries = timeQuery.data?.entries ?? []
  const totalMin = entries.reduce((s, e) => s + (e.durationMin || 0), 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="size-4 text-forest" /> {project.name}
          </DialogTitle>
          <DialogDescription>
            {project.description || 'No description.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] px-1.5 py-0',
                PROJECT_STATUS_BADGE[project.status] ??
                  'bg-muted text-muted-foreground border-border',
              )}
            >
              {PROJECT_STATUS_LABEL[project.status] ?? project.status}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] px-1.5 py-0',
                PRIORITY_BADGE[project.priority as TaskPriority],
              )}
            >
              {PRIORITY_LABEL[project.priority as TaskPriority] ?? project.priority}
            </Badge>
            {project.dueDate && (
              <span className="text-xs text-muted-foreground">
                due {formatDate(project.dueDate)}
              </span>
            )}
          </div>

          <Separator />

          <div>
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
              Tasks ({tasks.length})
            </p>
            {tasksQuery.isLoading ? (
              <Skeleton className="h-12" />
            ) : tasks.length === 0 ? (
              <p className="text-xs text-muted-foreground">No tasks linked.</p>
            ) : (
              <ul className="space-y-1 max-h-40 overflow-y-auto pr-1 -mr-1">
                {tasks.map((t) => (
                  <li
                    key={t.id}
                    className="text-xs flex items-center gap-2 py-1 border-b border-border last:border-0"
                  >
                    <CircleDot
                      className={cn(
                        'size-3 shrink-0',
                        t.status === 'done'
                          ? 'text-moss'
                          : t.status === 'in-progress'
                            ? 'text-forest'
                            : t.status === 'review'
                              ? 'text-terracotta'
                              : 'text-muted-foreground',
                      )}
                    />
                    <span
                      className={cn(
                        'flex-1 truncate',
                        t.status === 'done' && 'line-through text-muted-foreground',
                      )}
                    >
                      {t.title}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Separator />

          <div>
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
              Time entries ({entries.length} · {formatDuration(totalMin)})
            </p>
            {timeQuery.isLoading ? (
              <Skeleton className="h-12" />
            ) : entries.length === 0 ? (
              <p className="text-xs text-muted-foreground">No time tracked yet.</p>
            ) : (
              <ul className="space-y-1 max-h-40 overflow-y-auto pr-1 -mr-1">
                {entries.slice(0, 8).map((e) => (
                  <li
                    key={e.id}
                    className="text-xs flex items-center gap-2 py-1 border-b border-border last:border-0"
                  >
                    <Clock className="size-3 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate">{e.description}</span>
                    <span className="tabular-nums">{formatDuration(e.durationMin)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
