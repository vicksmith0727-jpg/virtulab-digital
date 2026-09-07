'use client'

// Active-tool router dialog + the "needs API" placeholder dialog.
// Extracted from seo-tools-view.tsx.

import {
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DynamicIcon } from '@/lib/client-utils'
import { type SeoToolDef, type ToastFn } from './types'
import { AiGenericDialog } from './ai-tool-dialog'
import { CheckDialog } from './check-dialog'

export function ActiveToolDialog({
  tool,
  open,
  onOpenChange,
  toast,
}: {
  tool: SeoToolDef
  open: boolean
  onOpenChange: (o: boolean) => void
  toast: ToastFn
}) {
  if (tool.input === 'none') {
    return <NeedsApiDialog tool={tool} open={open} onOpenChange={onOpenChange} />
  }
  if (tool.input === 'text') {
    return <AiGenericDialog tool={tool} open={open} onOpenChange={onOpenChange} toast={toast} />
  }
  // Default: input === 'url' → focused check dialog
  return <CheckDialog tool={tool} open={open} onOpenChange={onOpenChange} toast={toast} />
}

/* ------------------------------------------------------------------ */
/* "Needs API" notice dialog (rank-tracker / competitor / backlinks)  */
/* ------------------------------------------------------------------ */

export function NeedsApiDialog({
  tool,
  open,
  onOpenChange,
}: {
  tool: SeoToolDef
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const required = tool.needsApiKey || tool.needsIntegration || 'an external API'
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DynamicIcon name={tool.icon} className="size-4 text-terracotta" />
            {tool.label}
            <Badge variant="outline" className="text-terracotta border-terracotta/40 bg-terracotta/5">
              NEEDS API
            </Badge>
          </DialogTitle>
          <DialogDescription>{tool.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg border border-terracotta/40 bg-terracotta/5 p-4 text-sm text-foreground/90 leading-relaxed">
            <div className="flex items-start gap-2">
              <AlertTriangle className="size-4 text-terracotta shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p>
                  This tool needs <span className="font-semibold text-terracotta">{required}</span> to
                  run.
                </p>
                <p className="text-muted-foreground">
                  Connect it in <span className="font-medium">Integrations</span> first, then come
                  back here. Built-in tools above need no setup — they run directly inside
                  VirtuaLab Digital.
                </p>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
