import { NextRequest, NextResponse } from 'next/server'
import { aiChat, resolveProvider, type ProviderConfig } from '@/lib/ai'
import { ASYMMETRICAL_SEO_STRATEGIST_PROMPT } from '@/ai/personas/seo-strategist'
import { ChatRouteSchema } from '@/lib/validations/chat'
import { db } from '@/lib/db'

// POST /api/ai/chat
// Body: { messages: [{role, content}], projectId?, sessionId? }
//
// Zod-validated. Enforces the Asymmetrical SEO Strategist persona as the system
// message. Persists chat sessions + messages to the database. Loads history
// from the DB for context when a sessionId is provided.
//
// Returns: { reply, sessionId } — the sessionId can be used in subsequent
// calls to maintain conversation context across requests.

type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string }

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json().catch(() => ({}))

    // 1. Zod validation
    const validation = ChatRouteSchema.safeParse(rawBody)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      )
    }

    const { messages, projectId, sessionId } = validation.data

    // 2. Resolve or create a chat session for persistence
    let activeSessionId = sessionId
    const incomingUserMessage = messages[messages.length - 1]

    if (activeSessionId) {
      // Verify the session exists
      const existing = await db.chatSession.findUnique({ where: { id: activeSessionId } })
      if (!existing) {
        activeSessionId = undefined
      }
    }

    if (!activeSessionId) {
      // Create a new session
      const session = await db.chatSession.create({
        data: {
          projectId: projectId ?? null,
          title: incomingUserMessage?.content?.slice(0, 40) + '…' || 'New Strategy Thread',
        },
      })
      activeSessionId = session.id
    }

    // 3. Write the incoming user message to the DB
    if (incomingUserMessage && incomingUserMessage.role === 'user') {
      await db.chatMessage.create({
        data: {
          chatSessionId: activeSessionId,
          role: incomingUserMessage.role,
          content: incomingUserMessage.content,
        },
      })
    }

    // 4. Load historical messages from the DB for context (if session has history)
    const historicalLogs = await db.chatMessage.findMany({
      where: { chatSessionId: activeSessionId },
      orderBy: { createdAt: 'asc' },
      select: { role: true, content: true },
      take: 50, // last 50 messages for context
    })

    // 5. Build the finalized message array with the system persona prepended
    const provider = await resolveProvider().catch(() => undefined)

    // Load any custom persona from the User model (overrides the default if set)
    let personaPreamble = ASYMMETRICAL_SEO_STRATEGIST_PROMPT
    try {
      const user = await db.user.findFirst()
      if (user?.aiPersonaSystem) {
        personaPreamble = user.aiPersonaSystem
      } else if (user?.aiPersonaName || user?.aiPersonaTone) {
        personaPreamble = `Your name is ${user.aiPersonaName || 'VirtuaLab Assistant'}. Your tone is ${user.aiPersonaTone || 'warm, organic, practical'}. ${ASYMMETRICAL_SEO_STRATEGIST_PROMPT}`
      }
    } catch {}

    // Use historical logs if available, otherwise use the provided messages
    const contextMessages = historicalLogs.length > 0
      ? historicalLogs.map((log) => ({
          role: log.role as 'user' | 'assistant',
          content: log.content,
        }))
      : messages.map((m) => ({ role: m.role, content: m.content }))

    // Inject the persona as the first user message (aiChat only accepts user/assistant)
    const framed: ChatMessage[] = [
      {
        role: 'user',
        content: `[System guidance: ${personaPreamble}]\n\n${contextMessages[0]?.content ?? ''}`,
      },
      ...contextMessages.slice(1),
    ]

    // 6. Call the AI
    const reply = await aiChat(framed, provider)

    // 7. Persist the assistant's reply to the DB
    await db.chatMessage.create({
      data: {
        chatSessionId: activeSessionId,
        role: 'assistant',
        content: reply,
      },
    })

    // Touch the session to update the timestamp
    await db.chatSession.update({
      where: { id: activeSessionId },
      data: { updatedAt: new Date() },
    })

    return NextResponse.json({
      reply,
      sessionId: activeSessionId,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to chat'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET /api/ai/chat?projectId=X
// Returns chat sessions for a project (for the UI to show chat history).
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const projectId = url.searchParams.get('projectId')
    const sessionId = url.searchParams.get('sessionId')

    // If sessionId is provided, return the messages for that session
    if (sessionId) {
      const session = await db.chatSession.findUnique({
        where: { id: sessionId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            select: { id: true, role: true, content: true, createdAt: true },
          },
        },
      })
      if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
      return NextResponse.json({ session })
    }

    // Otherwise, list all sessions for the project
    const sessions = await db.chatSession.findMany({
      where: projectId ? { projectId } : {},
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { messages: true } },
      },
      take: 50,
    })

    return NextResponse.json({ sessions })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch sessions'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PATCH /api/ai/chat
// Body: { sessionId, title }
// Renames a chat session.
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : ''
    const title = typeof body?.title === 'string' ? body.title.trim() : ''

    if (!sessionId) return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
    if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 })

    const session = await db.chatSession.update({
      where: { id: sessionId },
      data: { title },
    })
    return NextResponse.json({ session })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to rename session'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE /api/ai/chat?sessionId=X
// Deletes a chat session + all its messages (cascade).
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const sessionId = url.searchParams.get('sessionId')
    if (!sessionId) return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })

    await db.chatSession.delete({ where: { id: sessionId } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete session'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
