// Shared types, constants, and formatters for the PM view + extracted
// sub-components. Extracted from `pm-view.tsx` so the giant 2.7k-line view
// could be split into focused per-tab files.

import type { useQuery } from '@tanstack/react-query'

/* ---- Catalog / tools ---- */

export interface PmTool {
  id: string
  label: string
  icon: string
  description: string
  kind: 'builtin' | 'integration'
}

export interface PmCatalogResponse {
  tools: PmTool[]
  stats: {
    tasks: number
    clients: number
    projects: number
    timeEntries: number
    totalBillableHours: number
  }
  note: string
}

/* ---- Tasks ---- */

export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface PmTask {
  id: string
  title: string
  description?: string | null
  status: TaskStatus
  priority: TaskPriority
  dueDate?: string | null
  completedAt?: string | null
  projectRecordId?: string | null
  clientId?: string | null
  assignee?: string | null
  createdAt?: string
  updatedAt?: string
}

/* ---- Clients ---- */

export interface PmClient {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  company?: string | null
  notes?: string | null
  status: string
  _count?: { projects: number; tasks: number }
}

/* ---- Projects ---- */

export interface PmProject {
  id: string
  name: string
  description?: string | null
  status: string
  priority: string
  dueDate?: string | null
  client?: { id: string; name: string } | null
  _count?: { tasks: number; timeEntries: number }
}

/* ---- Time ---- */

export interface PmTimeEntry {
  id: string
  description: string
  startedAt: string
  endedAt?: string | null
  durationMin: number
  billable: boolean
  projectRecordId?: string | null
  clientId?: string | null
  task?: string | null
}

/* ---- Constants ---- */

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'To Do',
  'in-progress': 'In Progress',
  review: 'Review',
  done: 'Done',
}

export const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: 'bg-sand text-bark border-border',
  'in-progress': 'bg-forest/10 text-forest border-forest/30',
  review: 'bg-terracotta/10 text-terracotta border-terracotta/30',
  done: 'bg-moss/15 text-moss border-moss/30',
}

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}

export const PRIORITY_BADGE: Record<TaskPriority, string> = {
  low: 'bg-muted text-muted-foreground border-border',
  medium: 'bg-sage/15 text-moss border-sage/30',
  high: 'bg-terracotta/15 text-terracotta border-terracotta/30',
  urgent: 'bg-destructive/10 text-destructive border-destructive/30',
}

export const PROJECT_STATUS_LABEL: Record<string, string> = {
  planning: 'Planning',
  active: 'Active',
  review: 'In Review',
  completed: 'Completed',
  'on-hold': 'On Hold',
}

export const PROJECT_STATUS_BADGE: Record<string, string> = {
  planning: 'bg-sand text-bark border-border',
  active: 'bg-forest/10 text-forest border-forest/30',
  review: 'bg-terracotta/10 text-terracotta border-terracotta/30',
  completed: 'bg-moss/15 text-moss border-moss/30',
  'on-hold': 'bg-muted text-muted-foreground border-border',
}

export const KANBAN_COLUMNS: TaskStatus[] = ['todo', 'in-progress', 'review', 'done']

/* ---- Formatters ---- */

export function formatDuration(min: number): string {
  if (!min) return '0m'
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function formatDate(d?: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDateTime(d?: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function relativeDate(d?: string | null): string {
  if (!d) return ''
  const date = new Date(d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays === -1) return 'Yesterday'
  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`
  if (diffDays < 7) return `in ${diffDays}d`
  return formatDate(d)
}

/* ---- Re-export of the useQuery return type for OverviewTab props ---- */

export type CatalogQuery = ReturnType<typeof useQuery<PmCatalogResponse>>
