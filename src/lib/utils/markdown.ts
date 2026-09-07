/**
 * Safely parses streaming text containing mixed markdown syntax and raw URLs.
 * Handles split or incomplete markdown tokens gracefully during SSE transit.
 */

export function parseStreamingContent(text: string): string {
  if (!text) return ''

  const urlRegex = /(https?:\/\/[^\s<]+[^.,:;"')\s])/g

  let processed = text

  // 1. Convert raw URLs into clickable anchor elements
  processed = processed.replace(urlRegex, (url) => {
    const index = text.indexOf(url)
    if (index > 0 && text[index - 1] === '(') return url
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-terracotta underline font-semibold hover:text-clay transition-colors">${url}</a>`
  })

  // 2. Parse bold markers (**bold**)
  const boldParts = processed.split('**')
  if (boldParts.length > 1) {
    processed = boldParts.reduce((acc, part, i) => {
      if (i % 2 !== 0) {
        const hasClosing = i < boldParts.length - 1
        return acc + (hasClosing ? `<strong class="font-bold text-forest">${part}</strong>` : `**${part}`)
      }
      return acc + part
    }, '')
  }

  // 3. Process bullet points
  processed = processed
    .split('\n')
    .map((line) => {
      if (line.trim().startsWith('- ')) {
        return `<li class="list-disc list-inside ml-2 my-1 text-bark/90">${line.trim().substring(2)}</li>`
      }
      return line
    })
    .join('\n')

  return processed
}
