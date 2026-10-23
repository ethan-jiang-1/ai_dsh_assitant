/**
 * A2 A/B prototype: OpenViking read-only recall as one native tool.
 *
 * One-off branch `ab/a2-recall`; not production. The tool is deliberately one schema with four
 * verbs (find/search/read/tree) over the stateless OpenViking HTTP face — the A/B compares this
 * against A1's seven read-only MCP tools. No write verbs, no session mutation.
 *
 * @module dsh-smart-assistant/tool-recall
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool, type InferValue } from '@deepseek-ai/dsh-tools'
import { presentationMeta } from '../tool-support/presentation.ts'

export const name = 'assistant-recall-tool'
export const inject = ['tools']

const ACTIONS = ['find', 'search', 'read', 'tree'] as const
type Action = (typeof ACTIONS)[number]

const DEFAULT_BASE = 'http://127.0.0.1:1933'

const DESCRIPTION = [
  'Read-only recall over the OpenViking memory layer.',
  'Actions:',
  '- find: stateless semantic search; returns matching memory entries (URI/abstract/score).',
  '- search: session-aware search; same shape when the server supports it.',
  '- read: read one memory file by `viking://...` URI.',
  '- tree: list one OpenViking directory by `viking://...` URI.',
  'Use this when the preloaded recall block is not enough and you need to expand a URI or look up',
  'a fact that is not in the current context. It never writes memory, the ledger, or the repo.',
].join('\n')

const OUTPUT = {
  type: 'object',
  additionalProperties: false,
  properties: {
    action: { type: 'string', required: true },
    summary: { type: 'string', required: true },
    result: { type: 'string', required: true },
  },
} as const

/** The canonical result type, derived from `OUTPUT` so the schema and the projector cannot drift. */
export type RecallOutput = InferValue<typeof OUTPUT>

/** Arguments the model passes. */
export interface RecallArgs {
  readonly action: Action
  readonly query?: string
  readonly uri?: string
  readonly limit?: number
}

/** Optional injection seam for the unit test; production reads the env once. */
export interface RecallOptions {
  readonly base?: string
  readonly apiKey?: string
  readonly fetchImpl?: typeof fetch
}

function baseUrl(options: RecallOptions): string {
  return (options.base ?? process.env.OPENVIKING_URL?.trim() ?? DEFAULT_BASE).replace(/\/+$/u, '')
}

function formatError(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

async function request(path: string, init: RequestInit, options: RecallOptions): Promise<unknown> {
  const base = baseUrl(options)
  const key = options.apiKey ?? process.env.OPENVIKING_API_KEY?.trim() ?? ''
  const fetchImpl = options.fetchImpl ?? globalThis.fetch
  const response = await fetchImpl(`${base}/api/v1${path}`, {
    ...init,
    headers: {
      ...(key === '' ? {} : { authorization: `Bearer ${key}` }),
      ...(init.body === undefined ? {} : { 'content-type': 'application/json' }),
    },
  })
  const parsed = await response.json().catch(() => undefined) as { status?: unknown, error?: unknown, result?: unknown } | undefined
  if (!response.ok || parsed === undefined || parsed.status !== 'ok') {
    throw new Error(`OpenViking ${String(response.status)}: ${formatError(parsed?.error)}`)
  }
  return parsed.result
}

/**
 * Execute one read-only recall verb. Exported for the unit spec; the tool below is the only
 * production caller.
 * @param args - Model arguments.
 * @param options - Test injection (base/apiKey/fetch).
 * @returns action + human summary + JSON result string.
 */
export async function executeRecall(
  args: RecallArgs,
  options: RecallOptions = {},
): Promise<{ action: string, summary: string, result: string }> {
  if (args.action === 'find' || args.action === 'search') {
    const query = args.query?.trim() ?? ''
    if (query === '') throw new Error(`assistant_recall ${args.action} requires query`)
    const limit = Math.min(Math.max(args.limit ?? 5, 1), 20)
    const path = args.action === 'find' ? '/search/find' : '/search/search'
    const result = await request(path, {
      method: 'POST',
      body: JSON.stringify({ query, limit, target_uri: 'viking://user/default' }),
    }, options)
    const rows = result !== null && typeof result === 'object' && Array.isArray((result as { memories?: unknown }).memories)
      ? (result as { memories: unknown[] }).memories
      : []
    return {
      action: args.action,
      summary: `${args.action} "${query}": ${String(rows.length)} memories.`,
      result: JSON.stringify(result),
    }
  }
  const uri = args.uri?.trim() ?? ''
  if (uri === '') throw new Error(`assistant_recall ${args.action} requires uri`)
  if (!uri.startsWith('viking://')) throw new Error('assistant_recall uri must start with viking://')
  if (args.action === 'read') {
    const result = await request(`/content/read?uri=${encodeURIComponent(uri)}`, { method: 'GET' }, options)
    return { action: 'read', summary: `read ${uri}`, result: String(result) }
  }
  const result = await request(`/fs/ls?uri=${encodeURIComponent(uri)}&output=original`, { method: 'GET' }, options)
  const count = Array.isArray(result) ? result.length : 0
  return { action: 'tree', summary: `tree ${uri}: ${String(count)} entries.`, result: JSON.stringify(result) }
}

function render(_args: RecallArgs, value: RecallOutput): Array<{ type: 'text', text: string }> {
  return [{ type: 'text', text: `${value.summary}\n${value.result}` }]
}

/**
 * Register the A2 prototype tool.
 * @param ctx - Agent-plane context.
 */
export function apply(ctx: Context): void {
  ctx.tools.register(defineTool({
    name: 'assistant_recall',
    description: DESCRIPTION,
    parameters: {
      action: {
        type: 'string',
        required: true,
        enum: ACTIONS,
        description: 'find | search | read | tree',
      },
      query: { type: 'string', description: 'find/search: free-text query.' },
      uri: { type: 'string', description: 'read/tree: viking://... URI.' },
      limit: { type: 'number', description: 'find/search: 1–20 (default 5).' },
    },
    output: {
      schema: OUTPUT,
      render,
      presentationMeta: (_args, value) => presentationMeta(value.summary),
    },
    async execute(args): Promise<RecallOutput> {
      return executeRecall(args)
    },
  }))
}
