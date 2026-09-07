import { NextRequest, NextResponse } from 'next/server'
import { generateText, resolveProvider, type ProviderConfig } from '@/lib/ai'
import { FLOW_TEMPLATES, type Flow, type FlowStep, type FlowRunResult, type FlowExecution } from '../_lib/orchestration'
import { db } from '@/lib/db'

// POST /api/flows/run
// Body: { flowId, userInput? }
//
// Executes a flow — runs each step in sequence, passing the output of
// each step to the next step's input. Returns the full execution log.
//
// For AI tools (endpoint: 'ai-chat'): calls generateText with the step's prompt template.
// For built-in SEO tools (endpoint: 'seo-check' or 'seo-audit'): calls the relevant API.
// For the enriched keyword research: calls /api/seo/keyword-research.

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const flowId = typeof body?.flowId === 'string' ? body.flowId : ''
    const userInput = typeof body?.userInput === 'string' ? body.userInput.trim() : ''

    if (!flowId) return NextResponse.json({ error: 'flowId is required' }, { status: 400 })

    // Find the flow — check templates first, then custom flows
    let flow: Flow | null = null
    if (flowId.startsWith('template-')) {
      const idx = parseInt(flowId.replace('template-', ''))
      const template = FLOW_TEMPLATES[idx]
      if (template) {
        flow = {
          ...template,
          id: flowId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      }
    } else {
      const setting = await db.settings.findFirst({ where: { key: 'custom-flows' } })
      const customFlows: Flow[] = setting?.value ? (() => { try { return JSON.parse(setting.value) } catch { return [] } })() : []
      flow = customFlows.find((f) => f.id === flowId) ?? null
    }

    if (!flow) return NextResponse.json({ error: 'Flow not found' }, { status: 404 })
    if (flow.steps.length === 0) return NextResponse.json({ error: 'Flow has no steps' }, { status: 400 })

    const provider = await resolveProvider().catch(() => undefined)
    const execution: FlowExecution = {
      flowId,
      flowName: flow.name,
      startedAt: new Date().toISOString(),
      results: [],
      status: 'running',
    }

    let previousOutput: any = null

    for (const step of flow.steps) {
      const stepStart = Date.now()
      const result: FlowRunResult = {
        stepId: step.id,
        toolId: step.toolId,
        label: step.label || step.toolLabel,
        status: 'success',
        input: '',
        output: null,
        durationMs: 0,
      }

      try {
        // Determine the input for this step
        let input = ''
        if (step.input === 'user') {
          input = userInput
        } else if (step.input === 'previous') {
          if (previousOutput === null) {
            result.status = 'skipped'
            result.error = 'No previous output available'
            execution.results.push(result)
            continue
          }
          // If inputKey is specified, extract that key; otherwise use the whole output
          if (step.inputKey && typeof previousOutput === 'object') {
            input = previousOutput[step.inputKey] ?? JSON.stringify(previousOutput)
          } else {
            input = typeof previousOutput === 'string' ? previousOutput : JSON.stringify(previousOutput, null, 2)
          }
        } else if (step.input === 'fixed') {
          input = step.fixedValue || ''
        }
        result.input = input.slice(0, 500)

        // Resolve the prompt template
        let prompt = step.promptTemplate || input
        if (step.promptTemplate) {
          prompt = step.promptTemplate
            .replace(/\{input\}/g, input)
            .replace(/\{prev\.output\}/g, typeof previousOutput === 'string' ? previousOutput : JSON.stringify(previousOutput, null, 2))
        }

        // Execute the tool based on its category/endpoint
        if (step.toolId === 'keyword-research-enriched') {
          // Enriched keyword research
          const system = 'You are an expert SEO researcher. Return ONLY a valid JSON object. No markdown.'
          const fullPrompt = `Perform comprehensive keyword research for: "${input}"
Return JSON with: primaryKeyword, searchIntent, peopleAlsoSearch (5-8), peopleAlsoAsk (5-8), faqs (5 with Q+A), suggestedKeywords (8-10 with intent+difficulty), semanticKeywords (10-15), longTailVariations (5-8), contentGaps (3-5), titleIdeas (3-5), metaDescription.`
          const raw = await generateText(fullPrompt, system, provider)
          try {
            result.output = JSON.parse(raw.replace(/```json|```/g, '').trim())
          } catch {
            result.output = { rawResponse: raw }
          }
        } else if (step.toolId === 'audit' || step.toolId === 'broken-links' || step.toolId === 'headings' || step.toolId === 'schema-validator') {
          // Built-in SEO check — call /api/seo/check internally
          const checkRes = await fetch(new URL('/api/seo/check', req.url), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tool: step.toolId === 'audit' ? undefined : step.toolId, url: input }),
          })
          if (checkRes.ok) {
            const checkData = await checkRes.json()
            result.output = checkData.result
          } else {
            result.output = { error: 'Check failed' }
          }
        } else {
          // AI tool — use generateText
          const system = 'You are VirtuaLab Digital Assistant — honest, practical, no hype, no paid ads. Return clean content.'
          const raw = await generateText(prompt, system, provider)
          result.output = raw
        }

        previousOutput = result.output
        result.durationMs = Date.now() - stepStart
      } catch (err) {
        result.status = 'error'
        result.error = err instanceof Error ? err.message : 'Step failed'
        result.durationMs = Date.now() - stepStart
      }

      execution.results.push(result)

      // If a step fails, stop the flow (unless it's the last step)
      if (result.status === 'error' && step !== flow.steps[flow.steps.length - 1]) {
        execution.status = 'failed'
        break
      }
    }

    execution.completedAt = new Date().toISOString()
    if (execution.status === 'running') execution.status = 'completed'

    // Log the flow execution
    try {
      await db.activityLog.create({
        data: {
          action: 'flow.run',
          detail: `Ran flow "${flow.name}" — ${execution.results.length} steps, ${execution.status}`,
        },
      })
    } catch {}

    return NextResponse.json({ ok: true, execution })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Flow execution failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
