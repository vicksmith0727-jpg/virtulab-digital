'use client'

import * as React from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, Plus } from 'lucide-react'
import type { BlockInstance } from '@/lib/seed'
import { BlockRenderer } from './block-renderer'
import { BLOCK_LOOKUP } from '@/lib/blocks'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

/* ------------------------------------------------------------------ */

function SortableItem({
  block,
  selected,
  onSelect,
  onDelete,
}: {
  block: BlockInstance
  selected: boolean
  onSelect: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('relative group/canvas', isDragging && 'z-50')}
    >
      {/* Drag handle */}
      <button
        type="button"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
        onClick={(e) => {
          e.stopPropagation()
          onSelect()
        }}
        className={cn(
          'absolute -left-2 top-2 z-30 size-7 -translate-x-full rounded-md border border-border bg-card text-muted-foreground flex items-center justify-center shadow-sm cursor-grab active:cursor-grabbing hover:text-foreground hover:border-primary/40 transition',
          selected ? 'opacity-100' : 'opacity-0 group-hover/canvas:opacity-100',
        )}
      >
        <GripVertical className="size-3.5" />
      </button>

      {/* Delete button when selected */}
      {selected && (
        <button
          type="button"
          aria-label="Delete block"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="absolute -top-7 right-0 z-30 inline-flex items-center gap-1 rounded-md bg-destructive text-white px-2 py-0.5 text-xs font-medium shadow-sm hover:bg-destructive/90"
        >
          <Trash2 className="size-3" />
          Delete
        </button>
      )}

      <div className="select-none">
        <BlockRenderer
          block={block}
          selected={selected}
          onSelect={onSelect}
        />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

export function Canvas({
  blocks,
  onChange,
  selectedBlockId,
  onSelect,
}: {
  blocks: BlockInstance[]
  onChange: (blocks: BlockInstance[]) => void
  selectedBlockId: string | null
  onSelect: (id: string | null) => void
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = blocks.findIndex((b) => b.id === active.id)
    const newIndex = blocks.findIndex((b) => b.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const next = arrayMove(blocks, oldIndex, newIndex)
    onChange(next)
  }

  function handleDelete(id: string) {
    onChange(blocks.filter((b) => b.id !== id))
    if (selectedBlockId === id) onSelect(null)
  }

  // Handle drop from the block palette (HTML5 drag-and-drop, not dnd-kit).
  // The palette sets dataTransfer with the block type; here we read it,
  // create a new block instance, and append it to the canvas.
  function handlePaletteDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    const blockType = e.dataTransfer.getData('application/virtulab-block')
    if (!blockType) return
    const def = BLOCK_LOOKUP[blockType]
    if (!def) return
    const newBlock: BlockInstance = {
      id: `${blockType}-${Date.now().toString(36)}`,
      type: blockType,
      props: { ...def.defaults },
    }
    onChange([...blocks, newBlock])
    onSelect(newBlock.id)
  }

  function handleDragOver(e: React.DragEvent) {
    // Allow drop — without this the browser won't fire onDrop
    if (e.dataTransfer.types.includes('application/virtulab-block')) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
    }
  }

  return (
    <div
      className="min-h-[60vh] rounded-xl bg-background"
      onClick={() => onSelect(null)}
      onDrop={handlePaletteDrop}
      onDragOver={handleDragOver}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1">
            {blocks.map((b) => (
              <SortableItem
                key={b.id}
                block={b}
                selected={selectedBlockId === b.id}
                onSelect={() => onSelect(b.id)}
                onDelete={() => handleDelete(b.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {blocks.length === 0 && (
        <div className="border-2 border-dashed border-border rounded-2xl p-10 sm:p-16 text-center">
          <div className="mx-auto size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-4">
            <Plus className="size-6" />
          </div>
          <h3 className="text-lg font-medium text-foreground">Your canvas is empty</h3>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-md mx-auto">
            Drag a block from the left panel, or click a block to add it here. Start with a Hero
            and grow from the ground up.
          </p>
        </div>
      )}

      {blocks.length > 0 && (
        <div className="pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              const def = BLOCK_LOOKUP['heading']
              if (!def) return
              const newBlock: BlockInstance = {
                id: `heading-${Date.now().toString(36)}`,
                type: 'heading',
                props: { ...def.defaults },
              }
              onChange([...blocks, newBlock])
            }}
            className="text-muted-foreground"
          >
            <Plus className="size-4" /> Add block
          </Button>
        </div>
      )}
    </div>
  )
}
