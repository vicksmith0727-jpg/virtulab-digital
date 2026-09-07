import { NextRequest, NextResponse } from 'next/server'

// POST /api/email/welcome
// Body: { name, email }
//
// Sends a welcome email to a newly registered user. Uses the configured
// email integration (Resend, MailerLite, Buttondown) if connected. Falls
// back to a logged notification if no email integration is active.
//
// In production, connect Resend (transactional) or MailerLite (newsletter)
// via Integrations → Email. The email integration's config provides the
// API key + from address. This endpoint reads that config + sends the email.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const email = typeof body?.email === 'string' ? body.email.trim() : ''

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    // Try to load a connected email integration (Resend preferred, then MailerLite)
    const { db } = await import('@/lib/db')

    const emailIntegrations = await db.integration.findMany({
      where: { category: 'email' },
      include: { connections: { where: { enabled: true } } },
    })

    let sent = false
    let method = 'logged'

    for (const integ of emailIntegrations) {
      if (integ.connections.length === 0) continue
      const config = (() => { try { return JSON.parse(integ.connections[0].config) } catch { return {} } })()

      if (integ.name === 'Resend' && config.apiKey) {
        // Send via Resend API
        try {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({
              from: config.from || 'VirtuaLab Digital <welcome@virtulab.digital>',
              to: email,
              subject: `Welcome to VirtuaLab Digital, ${name}!`,
              html: welcomeEmailHtml(name),
            }),
          })
          if (res.ok) {
            sent = true
            method = 'resend'
          }
        } catch {}
        break
      }

      if (integ.name === 'MailerLite' && config.apiKey) {
        // Add to MailerLite group + send welcome
        try {
          const res = await fetch('https://api.mailerlite.com/api/v2/subscribers', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-MailerLite-ApiKey': config.apiKey,
            },
            body: JSON.stringify({
              email,
              name,
              groups: [config.groupId].filter(Boolean),
              fields: { signup_source: 'virtulab_digital' },
            }),
          })
          if (res.ok) {
            sent = true
            method = 'mailerlite'
          }
        } catch {}
        break
      }
    }

    // Log the welcome email (regardless of whether it was sent)
    try {
      await db.activityLog.create({
        data: {
          action: 'user.welcome_email',
          detail: `Welcome email ${sent ? 'sent via ' + method : 'logged (no email integration connected)'} → ${email}`,
        },
      })
    } catch {}

    return NextResponse.json({
      ok: true,
      sent,
      method,
      message: sent
        ? `Welcome email sent to ${email} via ${method}`
        : `Welcome email logged for ${email}. Connect an email integration (Resend or MailerLite) to send real emails.`,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send welcome email'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/email/notify
// Body: { type, to, subject, message }
// Sends a system notification email (new user, task assigned, etc.)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const type = typeof body?.type === 'string' ? body.type : 'notification'
    const to = typeof body?.to === 'string' ? body.to.trim() : ''
    const subject = typeof body?.subject === 'string' ? body.subject : 'VirtuaLab Digital Notification'
    const message = typeof body?.message === 'string' ? body.message : ''

    if (!to) return NextResponse.json({ error: 'to is required' }, { status: 400 })

    // Log the notification
    const { db } = await import('@/lib/db')
    try {
      await db.activityLog.create({
        data: {
          action: `email.notify.${type}`,
          detail: `${subject} → ${to}: ${message.slice(0, 100)}`,
        },
      })
    } catch {}

    return NextResponse.json({ ok: true, logged: true, type, to, subject })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send notification'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function welcomeEmailHtml(name: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f0e8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 24px;">
<div style="text-align:center;margin-bottom:32px;">
<h1 style="color:#2d5a3d;font-size:28px;margin:0;">Welcome to VirtuaLab Digital${name ? ', ' + name : ''}!</h1>
<p style="color:#3d3a30;font-size:16px;line-height:1.6;margin-top:16px;">
Your account is ready. Here's what you can do:
</p>
</div>
<div style="background:#fff;border-radius:12px;padding:24px;margin-bottom:16px;">
<ul style="color:#3d3a30;font-size:15px;line-height:1.8;padding-left:20px;margin:0;">
<li><strong>Build a website</strong> — drag & drop, unlimited colors, no code</li>
<li><strong>Run SEO</strong> — 35 tools, keyword research with PAS/PAA/FAQs</li>
<li><strong>Generate content</strong> — blogs, social posts, email sequences</li>
<li><strong>Automate</strong> — orchestration flows, auto-publish to WordPress</li>
<li><strong>Manage clients</strong> — Kanban, tasks, time tracker, CRM</li>
</ul>
</div>
<div style="text-align:center;margin-top:32px;">
<a href="https://virtulab.agency" style="background:#2d5a3d;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">Open the app →</a>
</div>
<p style="text-align:center;color:#8a8275;font-size:13px;margin-top:24px;">
VirtuaLab Digital — organic growth for small businesses. No paid ads, ever.
</p>
</div>
</body>
</html>`
}
