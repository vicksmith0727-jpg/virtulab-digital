'use client'

// Custom integration ("+" card) dialog — user-added in-house tools / niche
// services. POSTs /api/integrations/custom. The new integration shows up in
// the catalog as a regular IntegrationCard after the refresh. Extracted
// from integrations-view.tsx.

import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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

export function CustomIntegrationDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [customForm, setCustomForm] = React.useState({
    name: '',
    category: 'custom',
    description: '',
    iconKey: 'Plug',
  })
  // Repeatable fields: each row has { key, label, type }
  const [customFields, setCustomFields] = React.useState<
    { key: string; label: string; type: 'text' | 'password' | 'number' }[]
  >([])

  function resetCustomForm() {
    setCustomForm({ name: '', category: 'custom', description: '', iconKey: 'Plug' })
    setCustomFields([])
  }

  const addCustomMut = useMutation({
    mutationFn: (payload: {
      name: string
      category: string
      description?: string
      iconKey?: string
      fields?: { key: string; label: string; type: string }[]
    }) =>
      fetchJson('/api/integrations/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      queryClient.invalidateQueries({ queryKey: ['ai-tools'] })
      toast({ title: 'Custom integration added' })
      onOpenChange(false)
      resetCustomForm()
    },
    onError: (err: any) => {
      const msg = err?.message || 'Could not add integration'
      toast({ title: 'Add failed', description: msg, variant: 'destructive' })
    },
  })

  function submitCustomForm(e: React.FormEvent) {
    e.preventDefault()
    const name = customForm.name.trim()
    if (!name) return
    addCustomMut.mutate({
      name,
      category: customForm.category.trim().toLowerCase() || 'custom',
      description: customForm.description.trim(),
      iconKey: customForm.iconKey.trim() || 'Plug',
      fields: customFields
        .filter((f) => f.key.trim() && f.label.trim())
        .map((f) => ({ key: f.key.trim(), label: f.label.trim(), type: f.type })),
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="size-4 text-forest" /> Add custom integration
          </DialogTitle>
          <DialogDescription>
            Connect an in-house tool or niche service. You&rsquo;ll be able to
            use it just like any other integration.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submitCustomForm} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="custom-name">Name *</Label>
            <Input
              id="custom-name"
              required
              value={customForm.name}
              onChange={(e) =>
                setCustomForm({ ...customForm, name: e.target.value })
              }
              placeholder="e.g. Inventory Sync"
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="custom-category">Category</Label>
            <Input
              id="custom-category"
              list="custom-category-list"
              value={customForm.category}
              onChange={(e) =>
                setCustomForm({ ...customForm, category: e.target.value })
              }
              placeholder="custom"
              className="h-9"
            />
            <datalist id="custom-category-list">
              <option value="custom" />
              <option value="internal" />
              <option value="webhook" />
              <option value="api" />
            </datalist>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="custom-description">Description</Label>
            <Textarea
              id="custom-description"
              value={customForm.description}
              onChange={(e) =>
                setCustomForm({ ...customForm, description: e.target.value })
              }
              placeholder="What does this integration do?"
              className="min-h-16 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="custom-icon">Icon</Label>
            <Input
              id="custom-icon"
              list="custom-icon-list"
              value={customForm.iconKey}
              onChange={(e) =>
                setCustomForm({ ...customForm, iconKey: e.target.value })
              }
              placeholder="Plug"
              className="h-9"
            />
            <datalist id="custom-icon-list">
              <option value="Plug" />
              <option value="Webhook" />
              <option value="Cloud" />
              <option value="Database" />
              <option value="Code" />
              <option value="Key" />
            </datalist>
            <p className="text-xs text-muted-foreground">
              Lucide icon name (e.g. Plug, Webhook, Cloud). Used for the card
              thumbnail.
            </p>
          </div>

          {/* Repeatable fields list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Fields</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setCustomFields([
                    ...customFields,
                    { key: '', label: '', type: 'text' as const },
                  ])
                }
              >
                <Plus className="size-3.5" /> Add field
              </Button>
            </div>

            {customFields.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No fields yet. Add one if your integration needs credentials
                or configuration.
              </p>
            ) : (
              <div className="space-y-2">
                {customFields.map((field, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row gap-1.5 sm:items-center"
                  >
                    <Input
                      value={field.key}
                      onChange={(e) => {
                        const next = [...customFields]
                        next[idx] = { ...field, key: e.target.value }
                        setCustomFields(next)
                      }}
                      placeholder="key"
                      className="h-8 sm:flex-1 text-xs"
                      aria-label={`Field ${idx + 1} key`}
                    />
                    <Input
                      value={field.label}
                      onChange={(e) => {
                        const next = [...customFields]
                        next[idx] = { ...field, label: e.target.value }
                        setCustomFields(next)
                      }}
                      placeholder="Label"
                      className="h-8 sm:flex-1 text-xs"
                      aria-label={`Field ${idx + 1} label`}
                    />
                    <Select
                      value={field.type}
                      onValueChange={(v) => {
                        const next = [...customFields]
                        next[idx] = {
                          ...field,
                          type: v as 'text' | 'password' | 'number',
                        }
                        setCustomFields(next)
                      }}
                    >
                      <SelectTrigger className="h-8 sm:w-28 text-xs" aria-label={`Field ${idx + 1} type`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">text</SelectItem>
                        <SelectItem value="password">password</SelectItem>
                        <SelectItem value="number">number</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      aria-label="Remove field"
                      onClick={() =>
                        setCustomFields(
                          customFields.filter((_, i) => i !== idx),
                        )
                      }
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

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
              disabled={addCustomMut.isPending || !customForm.name.trim()}
              className="bg-forest text-primary-foreground hover:bg-forest/90"
            >
              {addCustomMut.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Add integration
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
