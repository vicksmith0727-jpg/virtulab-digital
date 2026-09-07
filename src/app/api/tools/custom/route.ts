import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/tools/custom
// Body: { label, description, iconKey?, category, endpoint, input, prompt? }
//
// Adds a custom tool to any category (seo, social, content, pm, automation).
// Stored in the Settings table under key `custom-tools` as a JSON array.
// The frontend merges these with the built-in catalog tools.
//
// This powers the "+" button in every tool category view.

async function getOrCreateUser() {
  let user = await db.user.findFirst()
  if (!user) {
    user = await db.user.create({
      data: { email: 'demo@virtulab.local', name: 'VirtuaLab Demo', plan: 'grove' },
    })
  }
  return user
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const label = typeof body?.label === 'string' ? body.label.trim() : ''
    const description = typeof body?.description === 'string' ? body.description.trim() : ''
    const category = typeof body?.category === 'string' ? body.category.trim() : 'custom'
    const iconKey = typeof body?.iconKey === 'string' && body.iconKey.trim() ? body.iconKey.trim() : 'Wrench'
    const endpoint = typeof body?.endpoint === 'string' ? body.endpoint : 'ai-chat'
    const input = typeof body?.input === 'string' ? body.input : 'text'
    const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : ''

    if (!label) return NextResponse.json({ error: 'label is required' }, { status: 400 })
    if (label.length > 80) return NextResponse.json({ error: 'label too long (max 80)' }, { status: 400 })

    const user = await getOrCreateUser()

    // Read existing custom tools
    const existing = await db.settings.findFirst({
      where: { userId: user.id, key: 'custom-tools' },
    })
    const tools: any[] = existing ? (() => { try { return JSON.parse(existing.value) } catch { return [] } })() : []

    // Check for duplicate label within the same category
    const dup = tools.find((t) => t.label.toLowerCase() === label.toLowerCase() && t.category === category)
    if (dup) {
      return NextResponse.json({ error: 'A tool with that name already exists in this category' }, { status: 409 })
    }

    // Add the new custom tool
    const newTool = {
      id: `custom-${Date.now().toString(36)}`,
      label,
      description: description || 'Custom tool added by user.',
      iconKey,
      category,
      endpoint,
      input,
      prompt,
      builtin: false,
      ai: endpoint === 'ai-chat',
      custom: true,
    }
    tools.push(newTool)

    // Save back
    const value = JSON.stringify(tools)
    if (existing) {
      await db.settings.update({ where: { id: existing.id }, data: { value } })
    } else {
      await db.settings.create({ data: { userId: user.id, key: 'custom-tools', value } })
    }

    // Log
    try {
      await db.activityLog.create({
        data: { action: 'tool.custom.add', detail: `Added custom tool "${label}" to ${category}` },
      })
    } catch {}

    return NextResponse.json({ ok: true, tool: newTool })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to add custom tool'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET /api/tools/custom?category=X
// Returns all custom tools, optionally filtered by category.
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const category = url.searchParams.get('category')

    const setting = await db.settings.findFirst({ where: { key: 'custom-tools' } })
    if (!setting?.value) return NextResponse.json({ tools: [] })

    let tools: any[] = (() => { try { return JSON.parse(setting.value) } catch { return [] } })()
    if (category) tools = tools.filter((t) => t.category === category)

    return NextResponse.json({ tools })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch custom tools'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE /api/tools/custom?id=X
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const user = await getOrCreateUser()
    const existing = await db.settings.findFirst({
      where: { userId: user.id, key: 'custom-tools' },
    })
    if (!existing?.value) return NextResponse.json({ error: 'Tool not found' }, { status: 404 })

    const tools: any[] = (() => { try { return JSON.parse(existing.value) } catch { return [] } })()
    const filtered = tools.filter((t) => t.id !== id)
    await db.settings.update({ where: { id: existing.id }, data: { value: JSON.stringify(filtered) } })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete custom tool'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
