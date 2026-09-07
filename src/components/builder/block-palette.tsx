'use client'

import * as React from 'react'
import { Search } from 'lucide-react'
import { BLOCK_DEFS, BLOCK_CATEGORIES, type BlockDef } from '@/lib/blocks'
import type { BlockInstance } from '@/lib/seed'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */

export function BlockPalette({
  onAdd,
}: {
  onAdd: (block: BlockInstance) => void
}) {
  const [query, setQuery] = React.useState('')

  const filtered = BLOCK_DEFS.filter((b) =>
    b.label.toLowerCase().includes(query.toLowerCase()),
  )

  function addBlock(def: BlockDef) {
    const block: BlockInstance = {
      id: `${def.type}-${Date.now().toString(36)}`,
      type: def.type,
      props: { ...def.defaults },
    }
    onAdd(block)
  }

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search blocks"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 pl-8 text-sm"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-5">
          {BLOCK_CATEGORIES.map((cat) => {
            const items = filtered.filter((b) => b.category === cat.id)
            if (items.length === 0) return null
            return (
              <div key={cat.id}>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                  {cat.label}
                </h4>
                <div className="grid gap-1.5">
                  {items.map((b) => {
                    const Icon = b.icon
                    return (
                      <button
                        key={b.type}
                        type="button"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('application/virtulab-block', b.type)
                          e.dataTransfer.effectAllowed = 'copy'
                        }}
                        onClick={() => addBlock(b)}
                        title={b.description}
                        className={cn(
                          'group w-full flex items-start gap-3 rounded-lg border border-border bg-background p-2.5 text-left',
                          'hover:border-forest/50 hover:bg-forest/5 transition',
                          'cursor-grab active:cursor-grabbing',
                        )}
                      >
                        <span className="size-8 rounded-md bg-forest/10 text-forest flex items-center justify-center shrink-0">
                          <Icon className="size-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-foreground">
                            {b.label}
                          </span>
                          <span className="block text-xs text-muted-foreground line-clamp-2">
                            {b.description}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              No blocks match &ldquo;{query}&rdquo;.
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
