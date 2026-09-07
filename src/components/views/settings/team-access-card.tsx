'use client'

// TeamAccessCard — master-panel role + 12 access toggles.
//
// Since this is a single-user demo (no real auth), this card lets the
// owner configure the role + which features the account can access.
// The nav (in app-shell) reads these flags and hides inaccessible
// features. Extracted from settings-view.tsx.

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users,
  Lock,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { fetchJson } from '@/lib/client-utils'
import { type AccountResponse, ACCESS_FLAGS } from './types'

export function TeamAccessCard() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const accountQuery = useQuery<AccountResponse>({
    queryKey: ['account'],
    queryFn: () => fetchJson('/api/account'),
  })

  const [role, setRole] = React.useState<'owner' | 'admin' | 'member'>('owner')
  const [access, setAccess] = React.useState<Record<string, boolean>>({})

  // Prefill once the account loads.
  const loadedRef = React.useRef(false)
  React.useEffect(() => {
    if (loadedRef.current) return
    const u = accountQuery.data?.user
    if (!u) return
    setRole(u.role || 'owner')
    const next: Record<string, boolean> = {}
    for (const f of ACCESS_FLAGS) {
      next[f.key] = Boolean((u as any)[f.key])
    }
    setAccess(next)
    loadedRef.current = true
  }, [accountQuery.data])

  // When the role is 'member', admin-only toggles are forced off + disabled.
  const memberLocked = role === 'member'

  function toggle(key: string, value: boolean) {
    // Admin-only toggles can't be enabled while role is 'member'.
    const flag = ACCESS_FLAGS.find((f) => f.key === key)
    if (flag?.adminOnly && memberLocked) return
    setAccess((prev) => ({ ...prev, [key]: value }))
  }

  function patchRole(next: 'owner' | 'admin' | 'member') {
    setRole(next)
    // If we just dropped to member, force admin-only flags off.
    if (next === 'member') {
      setAccess((prev) => {
        const copy = { ...prev }
        for (const f of ACCESS_FLAGS) {
          if (f.adminOnly) copy[f.key] = false
        }
        return copy
      })
    }
  }

  const saveMut = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      fetchJson('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account'] })
      toast({ title: 'Access control saved' })
    },
    onError: (err: Error) =>
      toast({
        title: 'Could not save access control',
        description: err.message,
        variant: 'destructive',
      }),
  })

  function save() {
    const payload: Record<string, unknown> = { role }
    for (const f of ACCESS_FLAGS) {
      payload[f.key] = Boolean(access[f.key])
    }
    saveMut.mutate(payload)
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="size-4 text-forest" /> Team &amp; Access Control
        </CardTitle>
        <CardDescription>
          As the master-panel owner, you control which features this account can
          access. API Settings + External Secrets are restricted to Owner + Admin.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Role */}
        <div className="space-y-1.5">
          <Label htmlFor="role-select">Your role</Label>
          <Select value={role} onValueChange={(v) => patchRole(v as 'owner' | 'admin' | 'member')}>
            <SelectTrigger id="role-select" className="w-full sm:w-56">
              <SelectValue placeholder="Pick a role…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="owner">Owner (full access)</SelectItem>
              <SelectItem value="admin">Admin (no API/secrets)</SelectItem>
              <SelectItem value="member">Member (limited)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            Role changes the available feature toggles below. Member role hides API
            Settings + External Secrets.
          </p>
        </div>

        <Separator />

        {/* Access grid */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Access control — 12 feature flags
          </Label>
          <div className="grid sm:grid-cols-2 gap-3">
            {ACCESS_FLAGS.map((f) => {
              const value = Boolean(access[f.key])
              const locked = f.adminOnly && memberLocked
              return (
                <div
                  key={f.key}
                  className={cn(
                    'flex items-start justify-between gap-3 rounded-xl border p-3 transition',
                    locked
                      ? 'border-border bg-muted/40 opacity-70'
                      : 'border-border bg-card hover:border-forest/30',
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-foreground">{f.label}</p>
                      {f.adminOnly && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center">
                              <Lock className="size-3 text-terracotta" aria-label="Admin/Owner only" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>Admin / Owner only</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                      {f.desc}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {locked ? (
                      <span className="text-[10px] uppercase tracking-wider text-terracotta">
                        Locked
                      </span>
                    ) : null}
                    <Switch
                      checked={value}
                      disabled={locked}
                      onCheckedChange={(c) => toggle(f.key, c)}
                      aria-label={`Toggle ${f.label} access`}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Role summary */}
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
          <CheckCircle2 className="size-3.5 text-forest shrink-0 mt-0.5" />
          <span>
            Toggling a feature off hides its nav item. API Settings + External
            Secrets are reserved for Owner + Admin — they&rsquo;re locked when the
            role is Member.
          </span>
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
              <Users className="size-4" />
            )}
            Save access
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
