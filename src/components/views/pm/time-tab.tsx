'use client'

// Time Tracker tab — start/stop timer + manual entry + recent entries list.
// Extracted from pm-view.tsx. Uses sessionStorage to keep a running timer
// alive across tab switches.

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Loader2,
  Plus,
  Trash2,
  Clock,
  Play,
  Square,
  TimerReset,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { fetchJson } from '@/lib/client-utils'
import {
  type PmProject,
  type PmTimeEntry,
  formatDuration,
  formatDateTime,
} from './types'

export function TimeTrackerTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const timeQuery = useQuery<{ entries: PmTimeEntry[] }>({
    queryKey: ['pm-time'],
    queryFn: () => fetchJson('/api/pm/time'),
  })

  const projectsQuery = useQuery<{ projects: PmProject[] }>({
    queryKey: ['pm-projects'],
    queryFn: () => fetchJson('/api/pm/projects'),
  })

  // Active timer — single running entry tracked client-side.
  const [activeTimer, setActiveTimer] = React.useState<{
    description: string
    startedAt: number
    projectRecordId: string
  } | null>(null)

  // Restore from sessionStorage on mount.
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = window.sessionStorage.getItem('pm-active-timer')
    if (raw) {
      try {
        setActiveTimer(JSON.parse(raw))
      } catch {
        window.sessionStorage.removeItem('pm-active-timer')
      }
    }
  }, [])

  React.useEffect(() => {
    if (typeof window === 'undefined') return
    if (activeTimer) {
      window.sessionStorage.setItem('pm-active-timer', JSON.stringify(activeTimer))
    } else {
      window.sessionStorage.removeItem('pm-active-timer')
    }
  }, [activeTimer])

  const [manual, setManual] = React.useState({
    description: '',
    durationMin: '',
    projectRecordId: '',
    billable: true,
  })

  const [elapsed, setElapsed] = React.useState(0)
  React.useEffect(() => {
    if (!activeTimer) {
      setElapsed(0)
      return
    }
    const tick = () => setElapsed(Math.floor((Date.now() - activeTimer.startedAt) / 1000))
    tick()
    const i = window.setInterval(tick, 1000)
    return () => window.clearInterval(i)
  }, [activeTimer])

  const startMut = useMutation({
    mutationFn: () =>
      fetchJson('/api/pm/time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: activeTimer!.description,
          startedAt: new Date(activeTimer!.startedAt).toISOString(),
          billable: true,
          projectRecordId: activeTimer!.projectRecordId || undefined,
        }),
      }),
  })

  const stopMut = useMutation({
    mutationFn: (id: string) =>
      fetchJson('/api/pm/time', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, endedAt: new Date().toISOString() }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pm-time'] })
      void queryClient.invalidateQueries({ queryKey: ['pm-catalog'] })
      setActiveTimer(null)
      toast({ title: 'Time entry saved' })
    },
    onError: () => toast({ title: 'Could not stop timer', variant: 'destructive' }),
  })

  function handleStart() {
    if (!manual.description.trim()) {
      toast({ title: 'Enter a description first', variant: 'destructive' })
      return
    }
    const t = {
      description: manual.description.trim(),
      startedAt: Date.now(),
      projectRecordId: manual.projectRecordId,
    }
    setActiveTimer(t)
    void startMut.mutateAsync()
  }

  const addManualMut = useMutation({
    mutationFn: () =>
      fetchJson('/api/pm/time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: manual.description.trim(),
          durationMin: Number(manual.durationMin) || 0,
          billable: manual.billable,
          projectRecordId: manual.projectRecordId || undefined,
          startedAt: new Date().toISOString(),
        }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pm-time'] })
      void queryClient.invalidateQueries({ queryKey: ['pm-catalog'] })
      toast({ title: 'Time entry added' })
      setManual({ description: '', durationMin: '', projectRecordId: '', billable: true })
    },
    onError: () =>
      toast({ title: 'Could not add time entry', variant: 'destructive' }),
  })

  const toggleBillableMut = useMutation({
    mutationFn: (vars: { id: string; billable: boolean }) =>
      fetchJson('/api/pm/time', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pm-time'] })
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/pm/time?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pm-time'] })
      void queryClient.invalidateQueries({ queryKey: ['pm-catalog'] })
      toast({ title: 'Time entry deleted' })
    },
    onError: () =>
      toast({ title: 'Could not delete time entry', variant: 'destructive' }),
  })

  const entries = timeQuery.data?.entries ?? []
  const totalBillableMin = entries
    .filter((e) => e.billable)
    .reduce((s, e) => s + (e.durationMin || 0), 0)
  const totalMin = entries.reduce((s, e) => s + (e.durationMin || 0), 0)

  function fmtElapsed(s: number): string {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec
      .toString()
      .padStart(2, '0')}`
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Timer card */}
        <Card className="lg:col-span-1 py-4">
          <CardHeader className="px-6 pb-0">
            <CardTitle className="text-base flex items-center gap-2">
              <TimerReset className="size-4 text-forest" /> Timer
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pt-2 space-y-3">
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
              <p className="text-4xl font-mono font-semibold text-forest tabular-nums">
                {activeTimer ? fmtElapsed(elapsed) : '00:00:00'}
              </p>
              <p className="text-xs text-muted-foreground mt-1.5">
                {activeTimer
                  ? `Timing: ${activeTimer.description}`
                  : 'No active timer'}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="time-desc">Description</Label>
              <Input
                id="time-desc"
                value={manual.description}
                onChange={(e) => setManual({ ...manual, description: e.target.value })}
                placeholder="What are you working on?"
                className="h-9"
                disabled={!!activeTimer}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="time-project">Project</Label>
              <Select
                value={manual.projectRecordId}
                onValueChange={(v) =>
                  setManual({ ...manual, projectRecordId: v === 'none' ? '' : v })
                }
                disabled={!!activeTimer}
              >
                <SelectTrigger id="time-project" className="h-9">
                  <SelectValue placeholder="No project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {(projectsQuery.data?.projects ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {activeTimer ? (
              <Button
                className="w-full bg-terracotta text-primary-foreground hover:bg-terracotta/90"
                onClick={() => stopMut.mutate(activeTimer.description)}
                disabled={stopMut.isPending}
              >
                {stopMut.isPending ? (
                  <Loader2 className="size-4 animate-spin mr-1" />
                ) : (
                  <Square className="size-4" />
                )}{' '}
                Stop &amp; save
              </Button>
            ) : (
              <Button
                className="w-full bg-forest text-primary-foreground hover:bg-forest/90"
                onClick={handleStart}
                disabled={startMut.isPending}
              >
                {startMut.isPending ? (
                  <Loader2 className="size-4 animate-spin mr-1" />
                ) : (
                  <Play className="size-4" />
                )}{' '}
                Start
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Manual entry + totals */}
        <Card className="lg:col-span-2 py-4">
          <CardHeader className="px-6 pb-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="size-4 text-forest" /> Manual entry
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pt-2 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="manual-desc">Description</Label>
                <Input
                  id="manual-desc"
                  value={manual.description}
                  onChange={(e) => setManual({ ...manual, description: e.target.value })}
                  placeholder="What did you do?"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="manual-dur">Duration (minutes)</Label>
                <Input
                  id="manual-dur"
                  type="number"
                  min="1"
                  value={manual.durationMin}
                  onChange={(e) => setManual({ ...manual, durationMin: e.target.value })}
                  placeholder="e.g. 60"
                  className="h-9"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="billable"
                checked={manual.billable}
                onCheckedChange={(v) => setManual({ ...manual, billable: v })}
              />
              <Label htmlFor="billable" className="text-sm">
                Billable
              </Label>
              <Button
                className="ml-auto"
                onClick={() => addManualMut.mutate()}
                disabled={
                  addManualMut.isPending ||
                  !manual.description.trim() ||
                  !manual.durationMin
                }
              >
                {addManualMut.isPending ? (
                  <Loader2 className="size-4 animate-spin mr-1" />
                ) : (
                  <Plus className="size-4" />
                )}{' '}
                Add entry
              </Button>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Total billable
                </p>
                <p className="text-2xl font-semibold text-forest mt-0.5">
                  {formatDuration(totalBillableMin)}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Total tracked
                </p>
                <p className="text-2xl font-semibold text-foreground mt-0.5">
                  {formatDuration(totalMin)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent entries */}
      <Card className="py-4">
        <CardHeader className="px-6 pb-0">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="size-4 text-forest" /> Recent entries
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 pt-2">
          {timeQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No time entries yet. Start the timer or add one manually.
            </div>
          ) : (
            <ul className="divide-y divide-border max-h-96 overflow-y-auto pr-1 -mr-1">
              {entries.slice(0, 30).map((e) => (
                <li key={e.id} className="py-2.5 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {e.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(e.startedAt)}
                      {e.endedAt ? ` → ${formatDateTime(e.endedAt)}` : ' · running'}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      e.billable
                        ? 'bg-forest/10 text-forest border-forest/30 text-[10px]'
                        : 'bg-muted text-muted-foreground border-border text-[10px]'
                    }
                  >
                    {e.billable ? 'Billable' : 'Non-billable'}
                  </Badge>
                  <span className="text-sm font-semibold text-foreground tabular-nums min-w-16 text-right">
                    {formatDuration(e.durationMin)}
                  </span>
                  <Switch
                    checked={e.billable}
                    onCheckedChange={(v) =>
                      toggleBillableMut.mutate({ id: e.id, billable: v })
                    }
                    aria-label="Toggle billable"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive hover:text-destructive"
                    onClick={() => deleteMut.mutate(e.id)}
                    aria-label="Delete entry"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
