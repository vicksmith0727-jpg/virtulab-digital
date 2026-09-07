'use client'

// The card rendered for each built-in SEO tool in the tool grid.
// Extracted from seo-tools-view.tsx.

import {
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DynamicIcon } from '@/lib/client-utils'
import { BuiltInToolEditButton } from '@/components/shared/add-custom-tool-dialog'
import { cn } from '@/lib/utils'
import { type SeoToolDef } from './types'

export function SeoToolCard({
  tool,
  onOpen,
  onEdit,
}: {
  tool: SeoToolDef
  onOpen: () => void
  onEdit: () => void
}) {
  const needsApi = Boolean(tool.needsApiKey || tool.needsIntegration)
  const isAudit = tool.id === 'audit'
  return (
    <Card className="py-4 transition-shadow hover:shadow-md flex flex-col h-full">
      <CardContent className="pt-0 space-y-3 flex-1 flex flex-col">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'size-10 rounded-xl flex items-center justify-center shrink-0',
              needsApi
                ? 'bg-terracotta/10 text-terracotta'
                : tool.ai
                  ? 'bg-sage/20 text-forest'
                  : 'bg-forest/10 text-forest',
            )}
          >
            <DynamicIcon name={tool.icon} className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-foreground truncate">{tool.label}</h3>
              <div className="flex flex-wrap items-center gap-1 justify-end shrink-0">
                {tool.ai && (
                  <Badge
                    variant="outline"
                    className="text-forest border-sage/50 bg-sage/10"
                    title="Uses the in-product AI assistant"
                  >
                    <Sparkles className="size-2.5 mr-0.5" />
                    AI
                  </Badge>
                )}
                {tool.builtin && !needsApi && (
                  <Badge
                    variant="outline"
                    className="text-forest border-forest/40"
                    title="Runs directly inside VirtuaLab Digital — no setup"
                  >
                    BUILT-IN
                  </Badge>
                )}
                {needsApi && (
                  <Badge
                    variant="outline"
                    className="text-terracotta border-terracotta/40 bg-terracotta/5"
                    title={`Needs ${tool.needsApiKey || tool.needsIntegration}`}
                  >
                    NEEDS API
                  </Badge>
                )}
                {/* Master panel: inspect + clone button on built-in tools */}
                <BuiltInToolEditButton label={tool.label} onClick={onEdit} />
              </div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground line-clamp-3">{tool.description}</p>
          </div>
        </div>
        <div className="mt-auto">
          <Button
            className={cn(
              'w-full text-primary-foreground',
              needsApi
                ? 'bg-terracotta hover:bg-terracotta/90'
                : 'bg-forest hover:bg-forest/90',
            )}
            size="sm"
            onClick={onOpen}
          >
            {needsApi ? 'Connect' : isAudit ? 'Open audit' : 'Open'}
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
