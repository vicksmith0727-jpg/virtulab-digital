'use client'

import * as React from 'react'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */

export function PreviewFrame({ children }: { children: React.ReactNode }) {
  const previewDevice = useAppStore((s) => s.previewDevice)

  if (previewDevice === 'desktop') {
    return <div className="w-full min-h-full bg-background">{children}</div>
  }

  if (previewDevice === 'tablet') {
    return (
      <div className="w-full min-h-full flex justify-center py-6 bg-muted/40">
        <div
          className="bg-background rounded-[18px] border-2 border-border shadow-xl overflow-hidden"
          style={{ width: '768px', maxWidth: '100%' }}
        >
          <div className="flex items-center justify-center py-2 bg-muted/60 border-b border-border">
            <span className="size-1.5 rounded-full bg-foreground/20" />
          </div>
          {children}
        </div>
      </div>
    )
  }

  // mobile
  return (
    <div className="w-full min-h-full flex justify-center py-6 bg-muted/40">
      <div
        className="bg-background rounded-[24px] border-2 border-border shadow-xl overflow-hidden"
        style={{ width: '390px', maxWidth: '100%' }}
      >
        <div className="flex items-center justify-center py-2 bg-muted/60 border-b border-border">
          <span className="size-1.5 rounded-full bg-foreground/20" />
        </div>
        {children}
      </div>
    </div>
  )
}
