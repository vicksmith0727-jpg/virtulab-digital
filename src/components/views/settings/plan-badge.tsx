'use client'

// PlanBadge — color-coded plan badge used in Profile + Team cards.
// Color-coded by plan: forest (Seed), sage (Sprout), terracotta
// (Grove), bark (Forest). Extracted from settings-view.tsx.

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function PlanBadge({ plan }: { plan: string }) {
  const label = plan.charAt(0).toUpperCase() + plan.slice(1)
  const cls =
    {
      seed: 'text-forest border-forest/40 bg-forest/5',
      sprout: 'text-moss border-sage/50 bg-sage/10',
      grove: 'text-terracotta border-terracotta/40 bg-terracotta/5',
      forest: 'text-bark border-bark/40 bg-bark/5',
    }[plan] || 'text-forest border-forest/40 bg-forest/5'
  return (
    <Badge variant="outline" className={cn('capitalize', cls)}>
      {label}
    </Badge>
  )
}
