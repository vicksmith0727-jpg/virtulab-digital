'use client'

// AiPersonaCard — name + tone + system-prompt override (used by the built-in AI).
//
// The built-in AI API (z-ai) and Bring-Your-Own LLM both apply this
// persona as the system preamble. The override, if set, fully
// replaces the default preamble. Extracted from settings-view.tsx.

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Sparkles,
  Loader2,
  Leaf,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { fetchJson } from '@/lib/client-utils'
import { type AccountResponse, DEFAULT_PREAMBLE } from './types'

export function AiPersonaCard() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const accountQuery = useQuery<AccountResponse>({
    queryKey: ['account'],
    queryFn: () => fetchJson('/api/account'),
  })

  const [personaName, setPersonaName] = React.useState('')
  const [personaTone, setPersonaTone] = React.useState('')
  const [personaSystem, setPersonaSystem] = React.useState('')

  // Prefill once the account loads.
  const loadedRef = React.useRef(false)
  React.useEffect(() => {
    if (loadedRef.current) return
    const u = accountQuery.data?.user
    if (!u) return
    setPersonaName(u.aiPersonaName || '')
    setPersonaTone(u.aiPersonaTone || '')
    setPersonaSystem(u.aiPersonaSystem || '')
    loadedRef.current = true
  }, [accountQuery.data])

  // Live preview of the effective system prompt — updates as the user types.
  const effectiveSystem = React.useMemo(() => {
    const override = personaSystem.trim()
    if (override) return override
    const namePart = personaName.trim() ? `Your name is ${personaName.trim()}.` : ''
    const tonePart = personaTone.trim() ? `Your tone is ${personaTone.trim()}.` : ''
    const parts = [namePart, tonePart, DEFAULT_PREAMBLE].filter(Boolean)
    return parts.join(' ')
  }, [personaName, personaTone, personaSystem])

  const saveMut = useMutation({
    mutationFn: (payload: {
      aiPersonaName?: string
      aiPersonaTone?: string
      aiPersonaSystem?: string
    }) =>
      fetchJson('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account'] })
      toast({ title: 'AI persona saved' })
    },
    onError: (err: Error) =>
      toast({
        title: 'Could not save persona',
        description: err.message,
        variant: 'destructive',
      }),
  })

  function save() {
    saveMut.mutate({
      aiPersonaName: personaName.trim(),
      aiPersonaTone: personaTone.trim(),
      aiPersonaSystem: personaSystem.trim(),
    })
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="size-4 text-forest" /> AI Persona
        </CardTitle>
        <CardDescription>
          Personalize how the built-in AI assistant speaks across AI Copy, the AI
          Tool Router, and all AI-powered tools.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="persona-name">Persona name</Label>
            <Input
              id="persona-name"
              value={personaName}
              onChange={(e) => setPersonaName(e.target.value)}
              placeholder="VirtuaLab Assistant"
            />
            <p className="text-[11px] text-muted-foreground">
              Used in the prompt: &ldquo;Your name is {`{name}`}.&rdquo;
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="persona-tone">Tone</Label>
            <Input
              id="persona-tone"
              value={personaTone}
              onChange={(e) => setPersonaTone(e.target.value)}
              placeholder="warm, organic, practical"
            />
            <p className="text-[11px] text-muted-foreground">
              Used in the prompt: &ldquo;Your tone is {`{tone}`}.&rdquo;
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="persona-system">
            System prompt override{' '}
            <span className="text-muted-foreground font-normal">
              (optional — replaces the default preamble if set)
            </span>
          </Label>
          <Textarea
            id="persona-system"
            value={personaSystem}
            onChange={(e) => setPersonaSystem(e.target.value)}
            placeholder="You are a helpful assistant for small businesses…"
            className="min-h-32 font-mono text-xs"
          />
          <p className="text-[11px] text-muted-foreground">
            If set, this <span className="font-medium text-foreground">completely replaces</span>{' '}
            the default preamble (the name + tone are ignored). Leave blank to use the
            default preamble with your name + tone.
          </p>
        </div>

        {/* Live preview */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Leaf className="size-3.5 text-forest" /> Effective system prompt (preview)
          </Label>
          <div
            className="rounded-lg border border-forest/30 bg-forest/5 p-3 text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto font-mono"
            style={{ scrollbarColor: 'var(--color-forest) transparent' }}
          >
            {effectiveSystem}
          </div>
        </div>

        {/* Note about how the persona is applied */}
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground leading-relaxed">
          This persona is used by the built-in AI API (z-ai) for AI Copy, the AI Tool
          Router, and all AI-powered tools. When you use Bring-Your-Own LLM
          (Ollama/OpenRouter/Groq), the persona is still applied as a system preamble.
        </div>

        <div className="flex justify-end">
          <Button
            onClick={save}
            disabled={saveMut.isPending}
            className="bg-forest text-primary-foreground hover:bg-forest/90"
          >
            {saveMut.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            Save persona
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
