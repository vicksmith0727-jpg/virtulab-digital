import { NextResponse } from 'next/server'
import { readdir, stat } from 'fs/promises'
import path from 'path'

// GET /api/media
// Lists all uploaded media files in /public/uploads, newest first.
// Returns { media: [{ url, filename, size, modifiedAt }] }.
export const runtime = 'nodejs'

export async function GET() {
  try {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    let files: string[] = []
    try {
      files = await readdir(uploadsDir)
    } catch {
      // dir doesn't exist yet
      return NextResponse.json({ media: [] })
    }

    const items = await Promise.all(
      files.map(async (filename) => {
        try {
          const filepath = path.join(uploadsDir, filename)
          const s = await stat(filepath)
          return {
            url: `/uploads/${filename}`,
            filename,
            size: s.size,
            modifiedAt: s.mtime.toISOString(),
          }
        } catch {
          return null
        }
      }),
    )

    const media = items
      .filter((x): x is { url: string; filename: string; size: number; modifiedAt: string } => x !== null)
      .sort((a, b) => (a.modifiedAt < b.modifiedAt ? 1 : -1))

    return NextResponse.json({ media })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list media'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
