'use client'

// AI Provider — choose between the built-in Z.ai assistant, any
// OpenAI-compatible endpoint (Ollama / OpenRouter / Groq / LM Studio / etc.),
// or the connected Zeroclaw autonomous agent. Model presets with task routing
// (chat vs. SEO) are fetched from /api/capabilities and rendered as a second
// row of chips below the general presets. Extracted from settings-view.tsx.

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Sparkles,
  Loader2,
  Cpu,
  Plug,
  Bot,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { fetchJson } from '@/lib/client-utils'

type ProviderKind = 'builtin' | 'custom' | 'zeroclaw'

export function AiProviderCard() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const providerQuery = useQuery<{
    provider: {
      kind: ProviderKind
      baseUrl?: string
      apiKey?: string
      model?: string
    }
  }>({
    queryKey: ['settings', 'llm'],
    queryFn: () => fetchJson('/api/settings/llm'),
  })

  // Zeroclaw connection status — gates whether the third option is enabled.
  const zeroclawQuery = useQuery<{ connected: boolean; endpoint: string | null }>({
    queryKey: ['zeroclaw'],
    queryFn: () => fetchJson('/api/zeroclaw/run'),
  })
  const zeroclawConnected = !!zeroclawQuery.data?.connected

  // Model presets with task routing — chat vs. SEO small models for Ollama.
  const capabilitiesQuery = useQuery<{
    models: { id: string; label: string; baseUrl: string; model: string; task: 'chat' | 'seo' | 'general'; note: string }[]
  }>({
    queryKey: ['capabilities'],
    queryFn: () => fetchJson('/api/capabilities'),
  })
  const chatModels = (capabilitiesQuery.data?.models ?? []).filter((m) => m.task === 'chat')
  const seoModels = (capabilitiesQuery.data?.models ?? []).filter((m) => m.task === 'seo')

  const [kind, setKind] = React.useState<ProviderKind>('builtin')
  const [baseUrl, setBaseUrl] = React.useState('')
  const [apiKey, setApiKey] = React.useState('')
  const [model, setModel] = React.useState('')
  const loadedRef = React.useRef(false)

  // Prefill from server when it arrives. The API key is masked on the server side
  // (e.g. `ab12••••••••`), so we never prefill that field — we leave it blank with a
  // placeholder telling the user to leave blank for local/no-auth providers.
  React.useEffect(() => {
    if (loadedRef.current) return
    const p = providerQuery.data?.provider
    if (!p) return
    const next: ProviderKind =
      p.kind === 'custom' ? 'custom' : p.kind === 'zeroclaw' ? 'zeroclaw' : 'builtin'
    setKind(next)
    setBaseUrl(p.baseUrl ?? '')
    setModel(p.model ?? '')
    setApiKey('')
    loadedRef.current = true
  }, [providerQuery.data])

  const saveMut = useMutation({
    mutationFn: (payload: {
      kind: ProviderKind
      baseUrl?: string
      apiKey?: string
      model?: string
    }) =>
      fetchJson('/api/settings/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'llm'] })
      toast({ title: 'AI provider updated' })
    },
    onError: (err: any) =>
      toast({
        title: 'Could not save provider',
        description: err?.message || 'Please try again.',
        variant: 'destructive',
      }),
  })

  function applyPreset(id: 'ollama' | 'openrouter' | 'groq' | 'lmstudio') {
    setKind('custom')
    switch (id) {
      case 'ollama':
        setBaseUrl('http://localhost:11434/v1')
        setModel('llama3.1')
        setApiKey('')
        break
      case 'openrouter':
        setBaseUrl('https://openrouter.ai/api/v1')
        setModel('meta-llama/llama-3.1-8b-instruct:free')
        break
      case 'groq':
        setBaseUrl('https://api.groq.com/openai/v1')
        setModel('llama-3.1-8b-instant')
        break
      case 'lmstudio':
        setBaseUrl('http://localhost:1234/v1')
        setModel('local-model')
        setApiKey('')
        break
    }
  }

  function applyModelPreset(p: { baseUrl: string; model: string }) {
    setKind('custom')
    setBaseUrl(p.baseUrl)
    setModel(p.model)
    setApiKey('') // local Ollama models are no-auth
  }

  function save() {
    if (kind === 'builtin') {
      saveMut.mutate({ kind: 'builtin' })
      return
    }
    if (kind === 'zeroclaw') {
      saveMut.mutate({ kind: 'zeroclaw' })
      return
    }
    saveMut.mutate({
      kind: 'custom',
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      model: model.trim(),
    })
  }

  const canSave =
    kind === 'builtin' ||
    kind === 'zeroclaw' ||
    (baseUrl.trim().length > 0 && model.trim().length > 0)

  // The Zeroclaw option is disabled until Zeroclaw is connected. We wrap the
  // button in a tooltip so the user knows where to go.
  const ZeroclawOption = (
    <button
      type="button"
      disabled={!zeroclawConnected}
      onClick={() => zeroclawConnected && setKind('zeroclaw')}
      aria-disabled={!zeroclawConnected}
      className={cn(
        'flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition',
        !zeroclawConnected && 'cursor-not-allowed opacity-50',
        kind === 'zeroclaw'
          ? 'border-forest bg-forest/5 text-forest'
          : 'border-border text-foreground hover:bg-muted',
      )}
    >
      <span className="flex items-center gap-2 font-medium text-sm">
        <Bot className="size-4" /> Zeroclaw (autonomous agent)
      </span>
      <span className="text-xs text-muted-foreground">
        {zeroclawConnected
          ? 'Route all AI Copy + AI Chat through your connected Zeroclaw agent endpoint.'
          : 'Connect Zeroclaw in Integrations first.'}
      </span>
    </button>
  )

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="size-4 text-forest" /> AI Provider
        </CardTitle>
        <CardDescription>
          Power AI Copy and the AI Tool Router with the built-in assistant, your
          own OpenAI-compatible endpoint, or your Zeroclaw autonomous agent.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Provider kind picker — Built-in + Bring your own (2-col), then Zeroclaw full-width */}
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setKind('builtin')}
              className={cn(
                'flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition',
                kind === 'builtin'
                  ? 'border-forest bg-forest/5 text-forest'
                  : 'border-border text-foreground hover:bg-muted',
              )}
            >
              <span className="flex items-center gap-2 font-medium text-sm">
                <Sparkles className="size-4" /> Built-in (Z.ai)
              </span>
              <span className="text-xs text-muted-foreground">
                Use VirtuaLab Digital&rsquo;s built-in AI. No setup. Works everywhere.
              </span>
            </button>
            <button
              type="button"
              onClick={() => setKind('custom')}
              className={cn(
                'flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition',
                kind === 'custom'
                  ? 'border-forest bg-forest/5 text-forest'
                  : 'border-border text-foreground hover:bg-muted',
              )}
            >
              <span className="flex items-center gap-2 font-medium text-sm">
                <Cpu className="size-4" /> Bring your own (OpenAI-compatible)
              </span>
              <span className="text-xs text-muted-foreground">
                Plug in any OpenAI-compatible endpoint. Works with FREE providers like
                Ollama (local), OpenRouter free models, Groq, LM Studio.
              </span>
            </button>
          </div>
          {zeroclawConnected ? (
            ZeroclawOption
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="block">{ZeroclawOption}</span>
              </TooltipTrigger>
              <TooltipContent>Connect Zeroclaw in Integrations first</TooltipContent>
            </Tooltip>
          )}
        </div>

        {kind === 'custom' && (
          <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
            {/* General presets */}
            <div>
              <Label className="text-xs text-muted-foreground">Quick presets — general</Label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {[
                  { id: 'ollama', label: 'Ollama (local)' },
                  { id: 'openrouter', label: 'OpenRouter' },
                  { id: 'groq', label: 'Groq' },
                  { id: 'lmstudio', label: 'LM Studio' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p.id as any)}
                    className="inline-flex items-center rounded-full border border-forest/40 bg-forest/10 px-3 py-1 text-xs font-medium text-forest hover:bg-forest/20 transition"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Model presets with task routing — fetched from /api/capabilities */}
            {(chatModels.length > 0 || seoModels.length > 0) && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Model presets — task routed (Ollama local)
                </Label>
                {chatModels.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Chat models
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {chatModels.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          title={m.note}
                          onClick={() => applyModelPreset(m)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-forest/40 bg-forest/10 px-3 py-1 text-xs font-medium text-forest hover:bg-forest/20 transition"
                        >
                          {m.label}
                          <span className="inline-flex items-center rounded-full bg-forest/20 px-1.5 py-0.5 text-[10px] text-forest">
                            chat
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {seoModels.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      SEO models
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {seoModels.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          title={m.note}
                          onClick={() => applyModelPreset(m)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-sage/50 bg-sage/15 px-3 py-1 text-xs font-medium text-forest hover:bg-sage/25 transition"
                        >
                          {m.label}
                          <span className="inline-flex items-center rounded-full bg-sage/30 px-1.5 py-0.5 text-[10px] text-forest">
                            seo
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Chat models for AI Copy + Router. SEO models for on-page tasks (meta,
                  schema, keywords). All run on{' '}
                  <code className="bg-muted px-1 py-0.5 rounded">http://localhost:11434/v1</code>{' '}
                  (Ollama local).
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="llm-base">Base URL</Label>
              <Input
                id="llm-base"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="http://localhost:11434/v1"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="llm-key">API Key</Label>
              <Input
                id="llm-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="API Key (leave blank for local / no-auth providers)"
              />
              <p className="text-xs text-muted-foreground">
                Leave blank for local / no-auth providers like Ollama or LM Studio.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="llm-model">Model</Label>
              <Input
                id="llm-model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="llama3.1 / meta-llama/llama-3.1-8b-instruct:free / llama-3.1-8b-instant"
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Examples: Ollama local (free) → base{' '}
              <code className="bg-muted px-1 py-0.5 rounded">http://localhost:11434/v1</code>,
              model <code className="bg-muted px-1 py-0.5 rounded">llama3.1</code>. OpenRouter
              free → base{' '}
              <code className="bg-muted px-1 py-0.5 rounded">https://openrouter.ai/api/v1</code>,
              model{' '}
              <code className="bg-muted px-1 py-0.5 rounded">meta-llama/llama-3.1-8b-instruct:free</code>.
              See the OpenCode integration for more.
            </p>
          </div>
        )}

        {kind === 'zeroclaw' && (
          <div className="rounded-xl border border-forest/30 bg-forest/5 p-4 text-sm text-foreground/80">
            All AI Copy and AI Chat calls will route through your connected Zeroclaw
            agent endpoint. Manage the connection in{' '}
            <span className="font-medium text-forest">Integrations → Automation → Zeroclaw</span>.
          </div>
        )}

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Plug className="size-3.5" />
            {providerQuery.isLoading
              ? 'Loading current provider…'
              : kind === 'builtin'
                ? 'Using built-in Z.ai assistant.'
                : kind === 'zeroclaw'
                  ? `Routing through Zeroclaw${
                      zeroclawQuery.data?.endpoint ? ` (${zeroclawQuery.data.endpoint})` : ''
                    }`
                  : `Endpoint: ${baseUrl || '(not set)'}`}
          </div>
          <Button
            onClick={save}
            disabled={!canSave || saveMut.isPending}
            className="bg-forest text-primary-foreground hover:bg-forest/90"
          >
            {saveMut.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            Save provider
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
