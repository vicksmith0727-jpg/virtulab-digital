'use client'

// Coming-soon tab + Custom PM tab. Extracted from pm-view.tsx.

import {
  AlertCircle,
  Pencil,
  Trash2,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DynamicIcon } from '@/lib/client-utils'
import { type CustomTool } from '@/components/shared/add-custom-tool-dialog'

export function ComingSoonTab({
  icon,
  title,
  description,
  onInspect,
}: {
  icon: string
  title: string
  description: string
  onInspect?: () => void
}) {
  return (
    <Card className="py-10">
      <CardContent className="pt-0 text-center max-w-xl mx-auto">
        <span className="inline-flex items-center justify-center size-14 rounded-2xl bg-forest/10 text-forest mb-4">
          <DynamicIcon name={icon} className="size-7" />
        </span>
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground mt-2">{description}</p>
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-terracotta/30 bg-terracotta/10 text-terracotta px-3 py-1 text-xs font-medium uppercase tracking-wider">
          <AlertCircle className="size-3.5" /> Coming soon
        </div>
        {onInspect && (
          <div className="mt-5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onInspect}
              className="text-forest border-forest/40 hover:bg-forest/10"
            >
              <Pencil className="size-3.5" /> Inspect / clone as custom
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Custom PM tab — rendered for each user-added custom PM tool         */
/* Shows the tool label/description + a "Run" button that opens the    */
/* shared CustomToolRunDialog (AI prompt runner or placeholder).       */
/* ------------------------------------------------------------------ */

export function CustomPmTab({
  tool,
  onOpen,
  onEdit,
  onDelete,
}: {
  tool: CustomTool
  onOpen: () => void
  onEdit?: () => void
  onDelete?: () => void
}) {
  const isAi = tool.endpoint === 'ai-chat' && Boolean(tool.prompt)
  return (
    <Card className="py-10">
      <CardContent className="pt-0 text-center max-w-xl mx-auto">
        <span className="inline-flex items-center justify-center size-14 rounded-2xl bg-sage/20 text-forest mb-4">
          <DynamicIcon name={tool.iconKey} className="size-7" />
        </span>
        <div className="flex items-center justify-center gap-2 mb-2">
          <h2 className="text-xl font-semibold text-foreground">{tool.label}</h2>
          <Badge variant="outline" className="text-clay border-clay/40 bg-clay/5">
            CUSTOM
          </Badge>
          {isAi && (
            <Badge variant="outline" className="text-forest border-sage/50 bg-sage/10">
              <Sparkles className="size-3" /> AI
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {tool.description || 'Custom PM tool added by you.'}
        </p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <Button
            type="button"
            onClick={onOpen}
            className="bg-forest text-primary-foreground hover:bg-forest/90"
          >
            <ArrowRight className="size-4" /> {isAi ? 'Run tool' : 'Open tool'}
          </Button>
          {onEdit && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="text-forest border-forest/40 hover:bg-forest/10"
            >
              <Pencil className="size-3.5" /> Edit
            </Button>
          )}
          {onDelete && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDelete}
              className="text-destructive border-destructive/40 hover:bg-destructive/10"
            >
              <Trash2 className="size-3.5" /> Delete
            </Button>
          )}
        </div>
        {!isAi && (
          <p className="text-[11px] text-muted-foreground mt-3">
            This custom tool has no AI prompt — clicking opens a placeholder.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
