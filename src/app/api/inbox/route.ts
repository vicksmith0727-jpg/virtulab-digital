import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/inbox
// Unified inbox — aggregates messages from connected email + social integrations.
// Currently a lightweight implementation that returns a mock/demo stream so the
// UI can render the unified inbox. When real email/social MCP servers are
// connected, this endpoint will query them for actual messages.
//
// Each message: { id, source, from, subject, preview, body, timestamp, read, starred, type }
// source: 'email' | 'facebook' | 'instagram' | 'x' | 'linkedin'
// type: 'message' | 'comment' | 'mention' | 'review' | 'dm'

export async function GET() {
  try {
    // Check what integrations are connected
    const connections = await db.integrationConnection.findMany({
      where: { enabled: true },
      include: { integration: true },
    })

    const connectedSources: string[] = []
    for (const conn of connections) {
      const name = conn.integration.name
      if (name === 'MailerLite' || name === 'Buttondown' || name === 'Resend') {
        connectedSources.push('email')
      }
      if (name === 'Facebook') connectedSources.push('facebook')
      if (name === 'X (Twitter)') connectedSources.push('x')
      if (name === 'Instagram') connectedSources.push('instagram')
      if (name === 'LinkedIn') connectedSources.push('linkedin')
    }

    // Generate a demo inbox stream (in a real deployment, this would query the
    // connected MCP servers for actual messages)
    const now = Date.now()
    const demoMessages = [
      {
        id: 'demo-1',
        source: 'email' as const,
        from: 'sarah@fieldloaf.bakery',
        subject: 'Re: Your bread order',
        preview: 'Hi! Can I pick up the sourdough on Saturday morning instead of Friday?',
        body: 'Hi! Can I pick up the sourdough on Saturday morning instead of Friday? Something came up and I won\'t be in town Friday. Thanks!',
        timestamp: new Date(now - 1000 * 60 * 30).toISOString(),
        read: false,
        starred: false,
        type: 'message' as const,
      },
      {
        id: 'demo-2',
        source: 'instagram' as const,
        from: '@localfoodie_42',
        subject: 'Comment on your post',
        preview: 'Love the kouign-amann! Where can I buy these?',
        body: 'Love the kouign-amann! Where can I buy these? Do you ship?',
        timestamp: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
        read: false,
        starred: true,
        type: 'comment' as const,
      },
      {
        id: 'demo-3',
        source: 'facebook' as const,
        from: 'John Martinez',
        subject: 'New review: 5 stars',
        preview: 'Best bakery in town. The sourdough is incredible and the staff is so friendly.',
        body: 'Best bakery in town. The sourdough is incredible and the staff is so friendly. We drive 30 minutes just for their bread. Highly recommend!',
        timestamp: new Date(now - 1000 * 60 * 60 * 5).toISOString(),
        read: true,
        starred: true,
        type: 'review' as const,
      },
      {
        id: 'demo-4',
        source: 'x' as const,
        from: '@hollow_field',
        subject: 'Mentioned you',
        preview: 'Just had the most amazing loaf from @fieldloaf — you need to try this!',
        body: 'Just had the most amazing loaf from @fieldloaf — you need to try this! #localbread #sourdough',
        timestamp: new Date(now - 1000 * 60 * 60 * 8).toISOString(),
        read: true,
        starred: false,
        type: 'mention' as const,
      },
      {
        id: 'demo-5',
        source: 'email' as const,
        from: 'marcus@greenblade.lawncare',
        subject: 'Partnership inquiry',
        preview: 'We love your work. Can we discuss a referral partnership for our lawn care clients?',
        body: 'Hi team, we love your work. Can we discuss a referral partnership for our lawn care clients? We think there\'s a natural overlap. Let\'s set up a call next week. — Marcus',
        timestamp: new Date(now - 1000 * 60 * 60 * 24).toISOString(),
        read: false,
        starred: false,
        type: 'message' as const,
      },
      {
        id: 'demo-6',
        source: 'linkedin' as const,
        from: 'Priya Sharma',
        subject: 'Connection request',
        preview: 'I run a local food co-op and would love to connect. We\'re always looking for local bakers.',
        body: 'I run a local food co-op and would love to connect. We\'re always looking for local bakers to feature in our monthly box. Would you be interested?',
        timestamp: new Date(now - 1000 * 60 * 60 * 26).toISOString(),
        read: true,
        starred: false,
        type: 'message' as const,
      },
    ]

    // Count unread
    const unreadCount = demoMessages.filter((m) => !m.read).length
    const starredCount = demoMessages.filter((m) => m.starred).length

    return NextResponse.json({
      messages: demoMessages,
      connectedSources,
      stats: {
        total: demoMessages.length,
        unread: unreadCount,
        starred: starredCount,
        email: demoMessages.filter((m) => m.source === 'email').length,
        facebook: demoMessages.filter((m) => m.source === 'facebook').length,
        instagram: demoMessages.filter((m) => m.source === 'instagram').length,
        x: demoMessages.filter((m) => m.source === 'x').length,
        linkedin: demoMessages.filter((m) => m.source === 'linkedin').length,
      },
      note: 'Demo inbox. Connect email + social integrations to pull real messages. When MCP servers for social are connected, this endpoint queries them for actual DMs, comments, mentions, and reviews.',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch inbox'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
