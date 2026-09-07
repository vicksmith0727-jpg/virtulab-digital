'use client'

// Connect / Configure dialog for an integration. Renders the field schema
// (text / password / number) and POSTs to /api/integrations on save.
// Extracted from integrations-view.tsx.

import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { type Integration } from './types'

export function ConnectDialog({
  integration,
  open,
  onOpenChange,
}: {
  integration: Integration | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [config, setConfig] = React.useState<Record<string, any>>({})

  // Reset the form whenever the dialog opens for a new integration.
  React.useEffect(() => {
    if (open && integration) {
      const initial: Record<string, any> = {}
      ;(integration.fields ?? []).forEach((f: any) => {
        initial[f?.key ?? f?.name ?? ''] = ''
      })
      setConfig(initial)
    }
  }, [open, integration])

  const connectMut = useMutation({
    mutationFn: (payload: { integrationId: string; config: Record<string, any> }) =>
      fetchJson('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      toast({ title: 'Integration connected' })
      onOpenChange(false)
    },
    onError: () => toast({ title: 'Connection failed', variant: 'destructive' }),
  })

  function submitConnect(e: React.FormEvent) {
    e.preventDefault()
    if (!integration) return
    connectMut.mutate({
      integrationId: integration.id,
      config,
    })
  }

  const fields = integration?.fields ?? []

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {integration ? `Connect ${integration.name}` : 'Connect integration'}
          </DialogTitle>
          <DialogDescription>
            Enter your credentials below. They&rsquo;re stored in your project only.
          </DialogDescription>
        </DialogHeader>

        {integration ? (
          <form onSubmit={submitConnect} className="space-y-3">
            {fields.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                This integration needs no configuration.
              </p>
            ) : (
              fields.map((f: any, i: number) => {
                const key = f?.key ?? f?.name ?? `field-${i}`
                const label = f?.label ?? key
                const type =
                  f?.type === 'password' || f?.type === 'secret'
                    ? 'password'
                    : f?.type === 'number'
                      ? 'number'
                      : 'text'
                return (
                  <div key={i} className="space-y-1.5">
                    <Label htmlFor={key}>{label}</Label>
                    <Input
                      id={key}
                      type={type}
                      placeholder={f?.placeholder ?? ''}
                      value={config[key] ?? ''}
                      onChange={(e) =>
                        setConfig({ ...config, [key]: e.target.value })
                      }
                      className="h-9"
                    />
                    {f?.help && (
                      <p className="text-xs text-muted-foreground">{f.help}</p>
                    )}
                  </div>
                )
              })
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={connectMut.isPending}
                className="bg-forest text-primary-foreground hover:bg-forest/90"
              >
                {connectMut.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Save connection
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
