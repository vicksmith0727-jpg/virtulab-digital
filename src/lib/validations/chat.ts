import { z } from 'zod'

// Chat route input validation — enforces strict payload structure for /api/ai/chat.
// projectId is optional (for the dashboard assistant which has no project context).
// messages is required, validated for role + content length.

export const ChatRouteSchema = z.object({
  // Project tracking parameter (optional — dashboard assistant has no project)
  projectId: z.string().optional(),

  // Session ID for chat persistence (optional — auto-created if not provided)
  sessionId: z.string().optional(),

  // Message array validation matching standard chat structures
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'system'], {
          errorMap: () => ({ message: "Role must be 'user', 'assistant', or 'system'." }),
        }),
        content: z
          .string()
          .min(1, { message: 'Message content cannot be blank.' })
          .max(4000, { message: 'Message content exceeds maximum character length (4000).' }),
      }),
    )
    .min(1, { message: 'The chat history must contain at least one valid message.' })
    .max(100, { message: 'Chat history payload is too large.' }),
})

// TypeScript type inference to keep your type systems clean
export type ChatRouteInput = z.infer<typeof ChatRouteSchema>
