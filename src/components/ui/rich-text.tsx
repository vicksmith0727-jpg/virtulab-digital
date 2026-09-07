'use client'

import React, { useMemo } from 'react'
import { parseStreamingContent } from '@/lib/utils/markdown'

interface RichTextProps {
  content: string
  className?: string
}

export function RichText({ content, className = '' }: RichTextProps) {
  const sanitizedHtml = useMemo(() => parseStreamingContent(content), [content])

  return (
    <div
      className={`prose prose-sm text-bark whitespace-pre-wrap break-words leading-relaxed tracking-wide space-y-2 [word-break:break-word] ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  )
}
