'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Workflow,
  ArrowRight,
  Play,
  Loader2,
  Plus,
  Pencil,
  Copy,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Trash2,
  ChevronDown,
  Leaf,
  Settings2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { fetchJson, DynamicIcon, getLucideIcon } from '@/lib/client-utils'

/* ------------------------------------------------------------------ */
/* Types — mirror the orchestration backend (src/app/api/_lib/orchestration.ts) */

type FlowStepInput = 'user' | 'previous' | 'fixed'

interface FlowStep {
  id: string
  toolId: string
  toolLabel: string
  category: string
  input: FlowStepInput
  inputKey?: string
  fixedValue?: string
  promptTemplate?: string
  label?: string
}

interface Flow {
  id: string
  name: string
  description: string
  category: string
  steps: FlowStep[]
  enabled: boolean
  trigger?: 'manual' | 'on-publish' | 'weekly' | 'daily' | 'monthly'
  createdAt: string
  updatedAt: string
}

interface FlowsResponse {
  templates: Flow[]
  custom: Flow[]
  note: string
}

interface FlowRunResult {
  stepId: string
  toolId: string
  label: string
  status: 'success' | 'error' | 'skipped'
  input: string
  output: any
  error?: string
  durationMs: number
}

interface FlowExecution {
  flowId: string
  flowName: string
  startedAt: string
  completedAt?: string
  results: FlowRunResult[]
  status: 'running' | 'completed' | 'failed'
}

interface ToolPickerOption {
  id: string
  label: string
  icon?: string
  category: string
  description?: string
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */

const CATEGORY_STYLE: Record<string, string> = {
  seo: 'border-forest/40 bg-forest/5 text-forest',
  content: 'border-sage/50 bg-sage/10 text-moss',
  social: 'border-terracotta/40 bg-terracotta/5 text-terracotta',
  pm: 'border-clay/40 bg-clay/5 text-clay',
  automation: 'border-bark/40 bg-bark/5 text-bark',
  custom: 'border-terracotta/40 bg-terracotta/5 text-terracotta',
}

const TRIGGER_LABEL: Record<string, string> = {
  manual: 'Manual',
  'on-publish': 'On publish',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
}

function categoryBadgeClass(category: string): string {
  return CATEGORY_STYLE[category] ?? 'border-border bg-muted text-foreground'
}

function truncate(s: string, n = 140): string {
  if (!s) return ''
  return s.length > n ? s.slice(0, n) + '…' : s
}

function formatOutput(output: any): string {
  if (output === null || output === undefined) return ''
  if (typeof output === 'string') return output
  try {
    return JSON.stringify(output, null, 2)
  } catch {
    return String(output)
  }
}

function copyText(text: string, label: string, toast: ReturnType<typeof useToast>['toast']) {
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    toast({ title: 'Clipboard unavailable', variant: 'destructive' })
    return
  }
  navigator.clipboard
    .writeText(text)
    .then(() => toast({ title: `${label} copied` }))
    .catch(() => toast({ title: `Could not copy ${label}`, variant: 'destructive' }))
}

/* ------------------------------------------------------------------ */
/* Main view                                                           */

export function FlowsView() {
  const { toast } = useToast()

  const flowsQuery = useQuery<FlowsResponse>({
    queryKey: ['flows'],
    queryFn: () => fetchJson('/api/flows'),
  })

  const [runFlow, setRunFlow] = React.useState<Flow | null>(null)
  const [editFlow, setEditFlow] = React.useState<Flow | null>(null)
  const [createOpen, setCreateOpen] = React.useState(false)
  // Prefilled user input to seed the Run dialog with — set when another view
  // dispatches a `flows:run-template-0` event (e.g. from the Keyword Research
  // dialog's "Run full SEO Content Pipeline" button).
  const [prefilledInput, setPrefilledInput] = React.useState('')

  function handleClone(flow: Flow) {
    const clone: Flow = {
      ...flow,
      id: `flow-${Date.now().toString(36)}`,
      name: `${flow.name} (copy)`,
      category: 'custom',
      steps: flow.steps.map((s, i) => ({ ...s, id: `step-${i + 1}` })),
    }
    setEditFlow(clone)
  }

  // Listen for cross-view events: `flows:run-template-0` (from the SEO Keyword
  // Research dialog's "Run full SEO Content Pipeline" button) auto-opens the
  // run dialog for the SEO Content Pipeline template with the keyword prefilled.
  React.useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail ?? {}
      const userInput = typeof detail.userInput === 'string' ? detail.userInput : ''
      // Wait for templates to be available before opening the run dialog.
      const templates = flowsQuery.data?.templates ?? []
      const target = templates[0] ?? null
      if (!target) {
        toast({
          title: 'Flows still loading',
          description: 'Please try again in a moment.',
          variant: 'destructive',
        })
        return
      }
      setPrefilledInput(userInput)
      setRunFlow(target)
    }
    window.addEventListener('flows:run-template-0', handler as EventListener)
    return () => window.removeEventListener('flows:run-template-0', handler as EventListener)
  }, [flowsQuery.data])

  const isLoading = flowsQuery.isLoading
  const templates = flowsQuery.data?.templates ?? []
  const custom = flowsQuery.data?.custom ?? []

  return (
    <div className="organic-bg min-h-full flex flex-col">
      {/* Hero */}
      <section className="relative px-4 sm:px-6 pt-12 pb-12 sm:pt-16 sm:pb-14 border-b border-border bg-forest text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 organic-grain opacity-25 pointer-events-none" />
        <div className="max-w-6xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="max-w-3xl"
          >
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cream/30 bg-cream/10 text-cream px-3 py-1 text-xs font-medium uppercase tracking-wider">
                <Workflow className="size-3.5" />
                Orchestration
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sage/40 bg-sage/15 text-sage px-3 py-1 text-xs font-medium uppercase tracking-wider">
                <Sparkles className="size-3.5" />
                Pipeline automation
              </span>
            </div>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-balance leading-[1.05]">
              Orchestration — wire your tools into automation flows
            </h1>
            <p className="mt-4 text-lg sm:text-xl text-cream/85 max-w-2xl text-balance">
              Chain multiple tools into pipelines. Each step&apos;s output feeds into the next. Run
              manually or trigger on events.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Body */}
      <section className="flex-1 px-4 sm:px-6 py-10 sm:py-12">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Heading + count */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Flow templates ({templates.length}) + Custom flows ({custom.length})
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Pick a template to run as-is, or clone + edit it to fit your workflow.
              </p>
            </div>
          </div>

          {/* Templates */}
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {templates.map((flow) => (
                <FlowCard
                  key={flow.id}
                  flow={flow}
                  onRun={() => setRunFlow(flow)}
                  onEdit={() => setEditFlow(flow)}
                  onClone={() => handleClone(flow)}
                  isTemplate
                />
              ))}

              {/* Custom flows */}
              {custom.map((flow) => (
                <FlowCard
                  key={flow.id}
                  flow={flow}
                  onRun={() => setRunFlow(flow)}
                  onEdit={() => setEditFlow(flow)}
                  onClone={() => handleClone(flow)}
                />
              ))}

              {/* "+" create card */}
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className={cn(
                  'group flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 min-h-64',
                  'border-forest/40 hover:border-forest bg-forest/5 hover:bg-forest/10 transition text-forest/70 hover:text-forest',
                )}
              >
                <span className="size-12 rounded-full bg-forest/15 text-forest flex items-center justify-center group-hover:scale-110 transition">
                  <Plus className="size-6" />
                </span>
                <div className="text-center">
                  <p className="font-semibold">Create a custom flow</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Build a pipeline from scratch — pick tools, wire inputs, set a trigger.
                  </p>
                </div>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Sticky footer */}
      <footer className="mt-auto border-t border-border bg-bark text-cream/90">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-cream/60">
          <span>VirtuaLab Digital — orchestration engine, built in.</span>
          <span className="flex items-center gap-1.5">
            <Leaf className="size-3.5" /> Each step feeds the next.
          </span>
        </div>
      </footer>

      {/* Dialogs */}
      <RunFlowDialog
        flow={runFlow}
        initialInput={prefilledInput}
        open={!!runFlow}
        onOpenChange={(o) => {
          if (!o) {
            setRunFlow(null)
            setPrefilledInput('')
          }
        }}
        toast={toast}
      />
      <EditFlowDialog
        flow={editFlow}
        open={!!editFlow}
        onOpenChange={(o) => !o && setEditFlow(null)}
        toast={toast}
      />
      <EditFlowDialog
        flow={null}
        open={createOpen}
        onOpenChange={setCreateOpen}
        toast={toast}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Flow card — large card with pipeline visualization                   */

function FlowCard({
  flow,
  onRun,
  onEdit,
  onClone,
  isTemplate,
}: {
  flow: Flow
  onRun: () => void
  onEdit: () => void
  onClone: () => void
  isTemplate?: boolean
}) {
  return (
    <Card
      className={cn(
        'flex flex-col border-2 overflow-hidden transition hover:shadow-md',
        isTemplate ? 'border-forest/20' : 'border-terracotta/30 bg-terracotta/5',
      )}
    >
      <CardContent className="pt-6 pb-5 px-5 flex flex-col gap-4 flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <Badge variant="outline" className={cn('text-[10px] uppercase tracking-wider', categoryBadgeClass(flow.category))}>
                {flow.category}
              </Badge>
              {flow.trigger && (
                <Badge variant="outline" className="text-[10px] uppercase tracking-wider border-bark/40 bg-bark/5 text-bark">
                  <Clock className="size-3" />
                  {TRIGGER_LABEL[flow.trigger] ?? flow.trigger}
                </Badge>
              )}
              {isTemplate && (
                <Badge variant="outline" className="text-[10px] uppercase tracking-wider border-sage/50 bg-sage/10 text-moss">
                  Template
                </Badge>
              )}
            </div>
            <h3 className="text-lg font-semibold text-foreground leading-tight">{flow.name}</h3>
          </div>
          <span className="size-9 rounded-xl bg-forest/15 text-forest flex items-center justify-center shrink-0">
            <Workflow className="size-4" />
          </span>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">{flow.description}</p>

        {/* Pipeline visualization */}
        <div className="rounded-xl border border-border bg-background/60 p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Pipeline · {flow.steps.length} steps
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {flow.steps.map((step, i) => {
              const IconCmp = getLucideIcon(iconForToolId(step.toolId))
              return (
                <React.Fragment key={step.id}>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border border-forest/30 bg-forest/5 px-2.5 py-1 text-xs font-medium text-forest whitespace-nowrap"
                    title={step.label || step.toolLabel}
                  >
                    <IconCmp className="size-3" />
                    {step.label || step.toolLabel}
                  </span>
                  {i < flow.steps.length - 1 && (
                    <ArrowRight className="size-3 text-muted-foreground/70 shrink-0" />
                  )}
                </React.Fragment>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 mt-auto pt-1">
          <Button
            type="button"
            className="bg-forest text-primary-foreground hover:bg-forest/90"
            onClick={onRun}
          >
            <Play className="size-4" /> Run flow
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-forest hover:text-forest hover:bg-forest/10"
            onClick={onEdit}
          >
            <Pencil className="size-3.5" /> Edit
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={onClone}
          >
            <Copy className="size-3.5" /> Clone
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Run flow dialog — input + run + execution log                       */

function RunFlowDialog({
  flow,
  initialInput,
  open,
  onOpenChange,
  toast,
}: {
  flow: Flow | null
  initialInput?: string
  open: boolean
  onOpenChange: (o: boolean) => void
  toast: ReturnType<typeof useToast>['toast']
}) {
  const [userInput, setUserInput] = React.useState('')
  const [execution, setExecution] = React.useState<FlowExecution | null>(null)
  const [running, setRunning] = React.useState(false)

  React.useEffect(() => {
    if (!open) {
      setUserInput('')
      setExecution(null)
      setRunning(false)
    } else if (initialInput) {
      setUserInput(initialInput)
    }
  }, [open, initialInput])

  // The first step's input source — drives whether we show a text input.
  const firstStepNeedsUserInput = flow?.steps?.[0]?.input === 'user'
  const firstStepLabel = flow?.steps?.[0]?.label || flow?.steps?.[0]?.toolLabel || 'input'

  async function run() {
    if (!flow) return
    if (firstStepNeedsUserInput && !userInput.trim()) {
      toast({ title: 'Enter your input first', variant: 'destructive' })
      return
    }
    setRunning(true)
    setExecution(null)
    try {
      const data = await fetchJson<{ ok: boolean; execution: FlowExecution; error?: string }>('/api/flows/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flowId: flow.id,
          userInput: firstStepNeedsUserInput ? userInput.trim() : undefined,
        }),
      })
      if (data?.ok && data.execution) {
        setExecution(data.execution)
        const failed = data.execution.results.filter((r) => r.status === 'error').length
        if (failed > 0) {
          toast({
            title: `Flow finished with ${failed} error${failed > 1 ? 's' : ''}`,
            description: `${data.execution.results.length} steps run.`,
            variant: 'destructive',
          })
        } else {
          toast({
            title: 'Flow complete',
            description: `${data.execution.results.length} steps · ${data.execution.flowName}`,
          })
        }
      } else {
        toast({ title: 'Flow failed', description: data?.error || 'Unknown error', variant: 'destructive' })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Flow failed'
      toast({ title: 'Flow failed', description: msg, variant: 'destructive' })
    } finally {
      setRunning(false)
    }
  }

  function copyAllOutputs() {
    if (!execution) return
    const parts = execution.results.map((r) => {
      const head = `=== ${r.label} (${r.status.toUpperCase()}) — ${r.durationMs}ms ===\nINPUT: ${r.input || '(none)'}\n\nOUTPUT:`
      const body = formatOutput(r.output) || r.error || '(empty)'
      return `${head}\n${body}\n`
    })
    const all = `FLOW: ${execution.flowName}\nSTARTED: ${execution.startedAt}\nCOMPLETED: ${execution.completedAt ?? '(incomplete)'}\nSTATUS: ${execution.status}\n\n${parts.join('\n---\n\n')}`
    copyText(all, 'All outputs', toast)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Workflow className="size-4 text-forest" />
            {flow?.name ?? 'Run flow'}
          </DialogTitle>
          <DialogDescription>{flow?.description ?? ''}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1 -mr-1 space-y-4">
          {/* Input row */}
          {firstStepNeedsUserInput && (
            <div className="space-y-1.5">
              <Label htmlFor="flow-user-input" className="text-xs text-muted-foreground uppercase tracking-wider">
                {firstStepLabel}
                <span className="text-destructive ml-0.5">*</span>
              </Label>
              <Input
                id="flow-user-input"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Enter a keyword, URL, or topic…"
                disabled={running}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !running) run()
                }}
              />
              <p className="text-[11px] text-muted-foreground">
                This will be the input to the first step of the flow.
              </p>
            </div>
          )}

          {/* Pipeline progress */}
          {flow && (
            <div className="rounded-xl border border-border bg-background/60 p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Pipeline progress
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {flow.steps.map((step, i) => {
                  const result = execution?.results[i]
                  const IconCmp = getLucideIcon(iconForToolId(step.toolId))
                  const stateClass = !result
                    ? running
                      ? i === (execution?.results.length ?? 0)
                        ? 'border-forest/30 bg-forest/5 text-forest animate-pulse'
                        : 'border-border bg-muted/40 text-muted-foreground'
                      : 'border-border bg-background text-muted-foreground'
                    : result.status === 'success'
                      ? 'border-forest/50 bg-forest/10 text-forest'
                      : result.status === 'error'
                        ? 'border-destructive/50 bg-destructive/10 text-destructive'
                        : 'border-clay/40 bg-clay/10 text-clay'
                  return (
                    <React.Fragment key={step.id}>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap transition',
                          stateClass,
                        )}
                        title={step.label || step.toolLabel}
                      >
                        {result?.status === 'success' && <CheckCircle2 className="size-3" />}
                        {result?.status === 'error' && <XCircle className="size-3" />}
                        {result?.status === 'skipped' && <AlertTriangle className="size-3" />}
                        {!result && running && i === (execution?.results.length ?? 0) && (
                          <Loader2 className="size-3 animate-spin" />
                        )}
                        <IconCmp className={cn('size-3', !result && 'opacity-70')} />
                        {step.label || step.toolLabel}
                      </span>
                      {i < flow.steps.length - 1 && (
                        <ArrowRight className="size-3 text-muted-foreground/60 shrink-0" />
                      )}
                    </React.Fragment>
                  )
                })}
              </div>
            </div>
          )}

          {/* Running indicator */}
          {running && !execution && (
            <div className="rounded-lg border border-forest/30 bg-forest/5 p-4 text-sm text-foreground flex items-center gap-2">
              <Loader2 className="size-4 animate-spin text-forest" />
              Running flow — each step runs in sequence, output feeds the next…
            </div>
          )}

          {/* Execution log */}
          {execution && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-forest uppercase tracking-wider">
                  Execution log · {execution.results.length} steps
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={copyAllOutputs}
                  >
                    <Copy className="size-3" /> Copy all outputs
                  </Button>
                </div>
              </div>
              <div className="space-y-2.5">
                {execution.results.map((r, i) => (
                  <ExecutionStepCard key={`${r.stepId}-${i}`} result={r} />
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={running}>
            Close
          </Button>
          <Button
            type="button"
            className="bg-forest text-primary-foreground hover:bg-forest/90"
            disabled={running}
            onClick={run}
          >
            {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
            {execution ? 'Run again' : 'Run'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/* Execution step card — input + output + status + duration            */

function ExecutionStepCard({ result }: { result: FlowRunResult }) {
  const [open, setOpen] = React.useState(false)
  const statusIcon =
    result.status === 'success' ? (
      <CheckCircle2 className="size-4 text-forest" />
    ) : result.status === 'error' ? (
      <XCircle className="size-4 text-destructive" />
    ) : (
      <AlertTriangle className="size-4 text-clay" />
    )
  const statusBorder =
    result.status === 'success'
      ? 'border-forest/30'
      : result.status === 'error'
        ? 'border-destructive/40'
        : 'border-clay/40'

  const outputText = formatOutput(result.output)
  const isLong = outputText.length > 240

  return (
    <div className={cn('rounded-lg border bg-background overflow-hidden', statusBorder)}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-start gap-3 p-3">
          <span className="mt-0.5">{statusIcon}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{result.label}</span>
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] uppercase tracking-wider',
                  result.status === 'success'
                    ? 'border-forest/40 bg-forest/5 text-forest'
                    : result.status === 'error'
                      ? 'border-destructive/40 bg-destructive/5 text-destructive'
                      : 'border-clay/40 bg-clay/5 text-clay',
                )}
              >
                {result.status}
              </Badge>
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                <Clock className="size-2.5" />
                {result.durationMs}ms
              </Badge>
            </div>
            {result.input && (
              <p className="text-xs text-muted-foreground mt-1.5">
                <span className="font-medium text-foreground/70">Input:</span>{' '}
                <code className="text-[11px] bg-muted/60 rounded px-1 py-0.5">{truncate(result.input, 120)}</code>
              </p>
            )}
            {result.error && (
              <p className="text-xs text-destructive mt-1.5">
                <span className="font-medium">Error:</span> {result.error}
              </p>
            )}
          </div>
          {isLong && (
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs shrink-0">
                <ChevronDown className="size-3" />
                {open ? 'Collapse' : 'Expand'}
              </Button>
            </CollapsibleTrigger>
          )}
        </div>
        <CollapsibleContent>
          <div className="border-t border-border/60 px-3 pb-3 pt-2.5 bg-muted/20">
            <div className="rounded-md bg-bark/95 text-cream p-3 text-xs font-mono max-h-72 overflow-y-auto leading-relaxed whitespace-pre-wrap break-words">
              {outputText || '(no output)'}
            </div>
          </div>
        </CollapsibleContent>
        {!isLong && outputText && (
          <div className="border-t border-border/60 px-3 pb-3 pt-2.5 bg-muted/20">
            <div className="rounded-md bg-bark/95 text-cream p-3 text-xs font-mono max-h-72 overflow-y-auto leading-relaxed whitespace-pre-wrap break-words">
              {outputText}
            </div>
          </div>
        )}
      </Collapsible>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Edit flow dialog — add/remove/reorder steps + tool picker          */

function EditFlowDialog({
  flow,
  open,
  onOpenChange,
  toast,
}: {
  flow: Flow | null
  open: boolean
  onOpenChange: (o: boolean) => void
  toast: ReturnType<typeof useToast>['toast']
}) {
  const queryClient = useQueryClient()

  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [category, setCategory] = React.useState<string>('custom')
  const [trigger, setTrigger] = React.useState<string>('manual')
  const [steps, setSteps] = React.useState<FlowStep[]>([])

  React.useEffect(() => {
    if (!open) return
    if (flow) {
      setName(flow.name)
      setDescription(flow.description)
      setCategory(flow.category === 'seo' || flow.category === 'content' || flow.category === 'social' ? 'custom' : flow.category)
      setTrigger(flow.trigger ?? 'manual')
      setSteps(flow.steps.map((s) => ({ ...s })))
    } else {
      setName('')
      setDescription('')
      setCategory('custom')
      setTrigger('manual')
      setSteps([])
    }
  }, [open, flow])

  // Fetch all available tools for the picker — SEO tools + Social + Content.
  const seoToolsQuery = useQuery<{ tools: ToolPickerOption[] }>({
    queryKey: ['seo-tools-for-flows'],
    queryFn: () => fetchJson('/api/seo/tools'),
    enabled: open,
  })
  const catalogQuery = useQuery<{ social: ToolPickerOption[]; content: ToolPickerOption[] }>({
    queryKey: ['tools-catalog-for-flows'],
    queryFn: () => fetchJson('/api/tools/catalog'),
    enabled: open,
  })

  const allTools: ToolPickerOption[] = React.useMemo(() => {
    const seo = (seoToolsQuery.data?.tools ?? []).map((t) => ({ ...t, category: `seo · ${t.category}` }))
    const social = (catalogQuery.data?.social ?? []).map((t) => ({ ...t, category: 'social' }))
    const content = (catalogQuery.data?.content ?? []).map((t) => ({ ...t, category: 'content' }))
    return [...seo, ...social, ...content]
  }, [seoToolsQuery.data, catalogQuery.data])

  const saveMut = useMutation({
    mutationFn: (payload: { name: string; description: string; category: string; steps: FlowStep[]; trigger?: string }) =>
      fetchJson('/api/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flows'] })
      toast({ title: 'Flow saved', description: 'Your custom flow is ready to run.' })
      onOpenChange(false)
    },
    onError: (err: Error) =>
      toast({ title: 'Could not save flow', description: err.message, variant: 'destructive' }),
  })

  function addStep() {
    setSteps((prev) => [
      ...prev,
      {
        id: `step-${Date.now().toString(36)}`,
        toolId: '',
        toolLabel: '',
        category: 'seo',
        input: prev.length === 0 ? 'user' : 'previous',
        promptTemplate: '',
        label: '',
      },
    ])
  }

  function updateStep(id: string, patch: Partial<FlowStep>) {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  function removeStep(id: string) {
    setSteps((prev) => prev.filter((s) => s.id !== id))
  }

  function moveStep(id: string, dir: -1 | 1) {
    setSteps((prev) => {
      const idx = prev.findIndex((s) => s.id === id)
      if (idx < 0) return prev
      const target = idx + dir
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }

  function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) {
      toast({ title: 'Name is required', variant: 'destructive' })
      return
    }
    if (steps.length === 0) {
      toast({ title: 'Add at least one step', variant: 'destructive' })
      return
    }
    // Validate every step has a toolId + toolLabel
    const validSteps: FlowStep[] = steps.map((s, i) => {
      const tool = allTools.find((t) => t.id === s.toolId)
      return {
        ...s,
        toolLabel: s.toolLabel || tool?.label || `Step ${i + 1}`,
        category: s.category || tool?.category?.split(' · ')[0] || 'custom',
      }
    })
    const missingTool = validSteps.find((s) => !s.toolId)
    if (missingTool) {
      toast({ title: 'Every step needs a tool', variant: 'destructive' })
      return
    }
    saveMut.mutate({
      name: trimmed,
      description: description.trim(),
      category,
      steps: validSteps,
      trigger,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="size-4 text-forest" />
            {flow ? `Edit — ${flow.name}` : 'Create a custom flow'}
          </DialogTitle>
          <DialogDescription>
            Each step runs a tool. The first step takes your input; each subsequent step uses the previous
            step&apos;s output. Use{' '}
            <code className="text-[11px] bg-muted/60 rounded px-1 py-0.5">{'{input}'}</code> and{' '}
            <code className="text-[11px] bg-muted/60 rounded px-1 py-0.5">{'{prev.output}'}</code> placeholders
            in prompt templates.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1 -mr-1 space-y-4">
          {/* Flow metadata */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="flow-name" className="text-xs text-muted-foreground uppercase tracking-wider">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="flow-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. My Weekly Content Pipeline"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="flow-trigger" className="text-xs text-muted-foreground uppercase tracking-wider">
                Trigger
              </Label>
              <Select value={trigger} onValueChange={setTrigger}>
                <SelectTrigger id="flow-trigger">
                  <SelectValue placeholder="Pick a trigger" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="on-publish">On publish</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="flow-desc" className="text-xs text-muted-foreground uppercase tracking-wider">
              Description
            </Label>
            <Textarea
              id="flow-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this flow does + which tools it chains…"
              className="min-h-16"
            />
          </div>

          {/* Steps */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                Steps ({steps.length})
              </Label>
              <Button type="button" variant="outline" size="sm" onClick={addStep} className="h-7 text-xs">
                <Plus className="size-3.5" /> Add step
              </Button>
            </div>

            {steps.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-forest/30 bg-forest/5 p-6 text-center text-sm text-muted-foreground">
                No steps yet. Click <span className="text-forest font-medium">Add step</span> to start building
                your pipeline.
              </div>
            ) : (
              <ol className="space-y-2.5">
                {steps.map((step, i) => (
                  <li key={step.id}>
                    <FlowStepEditor
                      step={step}
                      index={i}
                      total={steps.length}
                      tools={allTools}
                      toolsLoading={seoToolsQuery.isLoading || catalogQuery.isLoading}
                      onChange={(patch) => updateStep(step.id, patch)}
                      onRemove={() => removeStep(step.id)}
                      onMoveUp={() => moveStep(step.id, -1)}
                      onMoveDown={() => moveStep(step.id, 1)}
                    />
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saveMut.isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-forest text-primary-foreground hover:bg-forest/90"
            disabled={saveMut.isPending || !name.trim() || steps.length === 0}
            onClick={handleSave}
          >
            {saveMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            Save flow
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/* Single step editor row                                              */

function FlowStepEditor({
  step,
  index,
  total,
  tools,
  toolsLoading,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  step: FlowStep
  index: number
  total: number
  tools: ToolPickerOption[]
  toolsLoading: boolean
  onChange: (patch: Partial<FlowStep>) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const selectedTool = tools.find((t) => t.id === step.toolId)
  return (
    <div className="rounded-lg border border-border bg-background p-3 space-y-3">
      {/* Row header */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center justify-center size-6 rounded-full bg-forest/15 text-forest text-xs font-semibold shrink-0">
          {index + 1}
        </span>
        <span className="text-sm font-medium text-foreground flex-1 truncate">
          {step.label || selectedTool?.label || 'Untitled step'}
        </span>
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground"
            onClick={onMoveUp}
            disabled={index === 0}
            title="Move up"
          >
            <ChevronDown className="size-3.5 rotate-180" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground"
            onClick={onMoveDown}
            disabled={index === total - 1}
            title="Move down"
          >
            <ChevronDown className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            onClick={onRemove}
            title="Remove"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Tool picker */}
      <div className="space-y-1.5">
        <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Tool</Label>
        {toolsLoading ? (
          <Skeleton className="h-9 w-full" />
        ) : (
          <Select
            value={step.toolId}
            onValueChange={(v) => {
              const tool = tools.find((t) => t.id === v)
              onChange({
                toolId: v,
                toolLabel: tool?.label ?? step.toolLabel,
                category: tool?.category?.split(' · ')[0] ?? step.category,
              })
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pick a tool" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {tools.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  <span className="flex items-center gap-2">
                    <DynamicIcon name={t.icon} className="size-3.5 text-forest" />
                    <span className="truncate">{t.label}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{t.category}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Label (optional, custom step label) */}
      <div className="space-y-1.5">
        <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">
          Step label (optional)
        </Label>
        <Input
          value={step.label ?? ''}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder={step.toolLabel || 'e.g. Generate blog post'}
        />
      </div>

      {/* Input source */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Input source</Label>
          <Select
            value={step.input}
            onValueChange={(v: string) => onChange({ input: v as FlowStepInput })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">User input (typed at run)</SelectItem>
              <SelectItem value="previous">Previous step output</SelectItem>
              <SelectItem value="fixed">Fixed value</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {step.input === 'previous' && (
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">
              Input key (from previous output)
            </Label>
            <Input
              value={step.inputKey ?? ''}
              onChange={(e) => onChange({ inputKey: e.target.value })}
              placeholder="e.g. keywords (blank = whole output)"
            />
          </div>
        )}

        {step.input === 'fixed' && (
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Fixed value</Label>
            <Input
              value={step.fixedValue ?? ''}
              onChange={(e) => onChange({ fixedValue: e.target.value })}
              placeholder="The fixed input to pass to this step"
            />
          </div>
        )}
      </div>

      {/* Prompt template */}
      <div className="space-y-1.5">
        <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">
          Prompt template (AI tools) ·{' '}
          <code className="text-[10px] bg-muted/60 rounded px-1">{'{input}'}</code>{' '}
          <code className="text-[10px] bg-muted/60 rounded px-1">{'{prev.output}'}</code>
        </Label>
        <Textarea
          value={step.promptTemplate ?? ''}
          onChange={(e) => onChange({ promptTemplate: e.target.value })}
          placeholder="e.g. Write an SEO blog post using these keywords: {prev.output}"
          className="min-h-16 text-xs font-mono"
        />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Tool id → icon-name resolver (best-effort, falls back to Workflow)  */

function iconForToolId(toolId: string): string {
  if (!toolId) return 'Workflow'
  // Special-case the enriched keyword-research tool used by templates.
  if (toolId === 'keyword-research-enriched') return 'SearchCode'
  // Audit-related tools
  if (toolId === 'audit' || toolId === 'broken-links' || toolId === 'headings' || toolId === 'schema-validator') return 'ClipboardCheck'
  // Common content tools
  if (toolId === 'blog-generator') return 'FileText'
  if (toolId === 'content-brief') return 'FileText'
  if (toolId === 'meta-title-gen') return 'Type'
  if (toolId === 'meta-desc-gen') return 'Type'
  if (toolId === 'schema-gen') return 'Code2'
  if (toolId === 'landing-page-copy') return 'FileText'
  // Social tools
  if (toolId === 'repurpose-blog') return 'RefreshCw'
  if (toolId === 'caption-generator') return 'MessageSquare'
  if (toolId === 'hashtag-sets') return 'Hash'
  // Strategy tools
  if (toolId === 'hub-spoke-generator') return 'Network'
  return 'Workflow'
}
