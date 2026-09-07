import { NextResponse } from 'next/server'

// GET /api/builder-mode
// Returns the three VirtuaLab Digital builder modes so the frontend can render
// a mode switcher in the builder toolbar. Each mode changes how the user
// interacts with the canvas:
//   - 'drag-drop'  : the default visual drag & drop canvas (no code)
//   - 'code'       : pure code editor — write HTML/CSS directly
//   - 'hybrid'     : split view — drag & drop on top, code panel below (edit
//                    the HTML and see it reflected in the canvas)
//
// The mode is a client-side preference (stored in the Zustand store), so this
// endpoint just returns the options + descriptions for the UI.

export const BUILDER_MODES = [
  {
    id: 'drag-drop' as const,
    label: 'Drag & Drop',
    icon: 'MousePointerClick',
    description: 'Visual canvas — drag blocks, edit text inline, pick colors. No code. Best for most users.',
  },
  {
    id: 'code' as const,
    label: 'Pure Code',
    icon: 'Code2',
    description: 'Write raw HTML + CSS directly. Full control, no canvas. Best for developers who want pixel-perfect control.',
  },
  {
    id: 'hybrid' as const,
    label: 'Hybrid',
    icon: 'Columns2',
    description: 'Split view — drag & drop canvas on top, live code editor below. Edit either side and the other updates in real time.',
  },
]

export async function GET() {
  return NextResponse.json({ modes: BUILDER_MODES })
}
