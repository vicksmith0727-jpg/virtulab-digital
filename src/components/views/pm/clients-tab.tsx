'use client'

// Clients tab — grid of client cards + add/edit ClientFormDialog.
// Extracted from pm-view.tsx.

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Pencil,
  Trash2,
  Mail,
  Phone,
  Building2,
  Loader2,
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
import { useToast } from '@/hooks/use-toast'
import { fetchJson } from '@/lib/client-utils'
import { type PmClient } from './types'

export function ClientsTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const clientsQuery = useQuery<{ clients: PmClient[] }>({
    queryKey: ['pm-clients'],
    queryFn: () => fetchJson('/api/pm/clients'),
  })

  const [addOpen, setAddOpen] = React.useState(false)
  const [editClient, setEditClient] = React.useState<PmClient | null>(null)

  const deleteMut = useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/pm/clients?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pm-clients'] })
      void queryClient.invalidateQueries({ queryKey: ['pm-catalog'] })
      toast({ title: 'Client deleted' })
    },
    onError: () => toast({ title: 'Could not delete client', variant: 'destructive' }),
  })

  const clients = clientsQuery.data?.clients ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Clients ({clients.length})</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            One client → many projects. Add, edit, archive.
          </p>
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          className="bg-forest text-primary-foreground hover:bg-forest/90"
        >
          <Plus className="size-4" /> Add client
        </Button>
      </div>

      {clientsQuery.isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No clients yet. Add one to start tracking projects + tasks against it.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {clients.map((c) => (
            <Card key={c.id} className="py-4 gap-0">
              <CardContent className="px-5 pt-0 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {c.name}
                    </p>
                    {c.company && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Building2 className="size-3" /> {c.company}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      c.status === 'active'
                        ? 'bg-moss/15 text-moss border-moss/30 text-[10px]'
                        : 'bg-muted text-muted-foreground border-border text-[10px]'
                    }
                  >
                    {c.status}
                  </Badge>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {c.email && (
                    <a
                      href={`mailto:${c.email}`}
                      className="flex items-center gap-1.5 hover:text-forest truncate"
                    >
                      <Mail className="size-3 shrink-0" /> {c.email}
                    </a>
                  )}
                  {c.phone && (
                    <p className="flex items-center gap-1.5">
                      <Phone className="size-3 shrink-0" /> {c.phone}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                  <span>{c._count?.projects ?? 0} projects</span>
                  <span>·</span>
                  <span>{c._count?.tasks ?? 0} tasks</span>
                </div>
                <div className="flex items-center justify-end gap-1 pt-1 border-t border-border">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => setEditClient(c)}
                    aria-label="Edit client"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive hover:text-destructive"
                    onClick={() => deleteMut.mutate(c.id)}
                    aria-label="Delete client"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ClientFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        mode="create"
        client={null}
      />
      <ClientFormDialog
        open={!!editClient}
        onOpenChange={(o) => !o && setEditClient(null)}
        mode="edit"
        client={editClient}
      />
    </div>
  )
}

function ClientFormDialog({
  open,
  onOpenChange,
  mode,
  client,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  mode: 'create' | 'edit'
  client: PmClient | null
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [form, setForm] = React.useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    notes: '',
    status: 'active',
  })

  React.useEffect(() => {
    if (open) {
      setForm({
        name: client?.name ?? '',
        email: client?.email ?? '',
        phone: client?.phone ?? '',
        company: client?.company ?? '',
        notes: client?.notes ?? '',
        status: client?.status ?? 'active',
      })
    }
  }, [open, client])

  const saveMut = useMutation({
    mutationFn: async () => {
      const body: any = {
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        company: form.company.trim() || undefined,
        notes: form.notes.trim() || undefined,
        status: form.status,
      }
      if (mode === 'edit' && client) {
        body.id = client.id
        return fetchJson('/api/pm/clients', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }
      return fetchJson('/api/pm/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pm-clients'] })
      void queryClient.invalidateQueries({ queryKey: ['pm-catalog'] })
      toast({
        title: mode === 'edit' ? 'Client updated' : 'Client added',
        description: form.name.trim() || undefined,
      })
      onOpenChange(false)
    },
    onError: () =>
      toast({ title: 'Could not save client', variant: 'destructive' }),
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
          <DialogTitle>{mode === 'edit' ? 'Edit client' : 'Add client'}</DialogTitle>
          <DialogDescription>
            {mode === 'edit'
              ? 'Update the client details below.'
              : 'Add a new client to your CRM.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="client-name">Name *</Label>
            <Input
              id="client-name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Jane Doe"
              className="h-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="client-company">Company</Label>
              <Input
                id="client-company"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="e.g. Field Loaf Bakery"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="client-status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v })}
              >
                <SelectTrigger id="client-status" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="churned">Churned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="client-email">Email</Label>
              <Input
                id="client-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="jane@example.com"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="client-phone">Phone</Label>
              <Input
                id="client-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="555-123-4567"
                className="h-9"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="client-notes">Notes</Label>
            <Textarea
              id="client-notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional notes…"
              className="min-h-16 text-sm"
            />
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
              {mode === 'edit' ? 'Save changes' : 'Add client'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
