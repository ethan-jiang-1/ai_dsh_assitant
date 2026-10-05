/**
 * `assistant_knowledge`: the model-facing read surface over the home's knowledge room.
 *
 * Read-only on purpose (the proposal's settled retrieval shape, D6): search ranks retrievable
 * pages by keyword — deprecated hits stay visible with their status so the model can judge
 * them, drafts are staged out of recall — and `get` reads one page by id together with its
 * backlinks, computed on demand over the whole room. Pages enter the room through the
 * reflection flow or research promotion, never through this tool.
 *
 * @module dsh-smart-assistant/tool-knowledge
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { KnowledgePage } from '../../domain/knowledge/page.ts'
import { callCard, presentationMeta, resultCard } from '../tool-support/presentation.ts'

export const name = 'assistant-knowledge-tool'

export const inject = ['assistantMemory', 'tools']

const ACTIONS = ['search', 'get'] as const

type Action = (typeof ACTIONS)[number]

const DESCRIPTION = [
  'Read the knowledge room: domain pages that interlink ([[wikilinks]]).',
  'Actions:',
  '- search: rank retrievable pages against keywords and optional required tags; returns why',
  '  each one matched. Deprecated pages stay searchable with their status flagged.',
  '- get: read one page by id, with its backlinks computed over the room. Drafts are readable',
  '  by id even though they never appear in search results.',
  'This tool is read-only: pages enter the room through the reflection flow or research',
  'promotion. When the digest signpost tree is not enough, search; when a link points at a',
  'page, get it by id.',
].join('\n')

const PAGE_ITEM = {
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'string', required: true },
    type: { type: 'string', required: true },
    status: { type: 'string', required: true },
    title: { type: 'string' },
    description: { type: 'string' },
    stale_after: { type: 'string' },
    body: { type: 'string' },
    why: { type: 'array', items: { type: 'string' } },
  },
} as const

const OUTPUT = {
  type: 'object',
  additionalProperties: false,
  properties: {
    action: { type: 'string', required: true },
    summary: { type: 'string', required: true },
    pages: { type: 'array', required: true, items: PAGE_ITEM },
    backlinks: { type: 'array', required: true, items: { type: 'string' } },
  },
} as const

interface PageItem {
  id: string
  type: string
  status: string
  title?: string
  description?: string
  stale_after?: string
  body?: string
  why?: string[]
}

interface KnowledgeOutput {
  action: string
  summary: string
  pages: PageItem[]
  backlinks: string[]
}

function item(page: KnowledgePage, extra: Partial<PageItem>): PageItem {
  return {
    id: page.id,
    type: page.type,
    status: page.status,
    ...(page.title !== undefined ? { title: page.title } : {}),
    ...(page.description !== undefined ? { description: page.description } : {}),
    ...(page.staleAfter !== undefined ? { stale_after: page.staleAfter } : {}),
    ...extra,
  }
}

function render(_args: { action: Action }, value: KnowledgeOutput): { type: 'text', text: string }[] {
  const lines = [value.summary]
  for (const page of value.pages) {
    const why = page.why !== undefined && page.why.length > 0 ? ` — ${page.why.join(', ')}` : ''
    lines.push(`- [${page.status}] ${page.title ?? page.id} (${page.id})${why}`)
    if (page.body !== undefined && page.body.trim().length > 0) lines.push(page.body.trim())
  }
  if (value.backlinks.length > 0) lines.push(`Linked from: ${value.backlinks.join(', ')}.`)
  return [{ type: 'text', text: lines.join('\n') }]
}

/**
 * Register the knowledge tool.
 * @param ctx - Agent-plane context.
 */
export function apply(ctx: Context): void {
  ctx.tools.register(defineTool({
    name: 'assistant_knowledge',
    description: DESCRIPTION,
    parameters: {
      action: { type: 'string', required: true, enum: ACTIONS, description: 'search | get' },
      query: { type: 'string', description: 'search: free-text terms matched against title, description, and body.' },
      tags: { type: 'array', items: { type: 'string' }, description: 'search: require these tags.' },
      id: { type: 'string', description: 'get: page id (the name in [[links]] or the digest tree).' },
      limit: { type: 'number', description: 'search: maximum pages returned.' },
    },
    output: {
      schema: OUTPUT,
      render,
      presentationMeta: (_args, value) => presentationMeta(value.summary),
    },
    async execute(args): Promise<KnowledgeOutput> {
      switch (args.action) {
        case 'search': {
          const hits = await ctx.assistantMemory.searchKnowledge({
            ...(args.query !== undefined ? { text: args.query } : {}),
            ...(args.tags !== undefined ? { tags: args.tags } : {}),
            ...(args.limit !== undefined ? { limit: args.limit } : {}),
          })
          return {
            action: 'search',
            summary: hits.length === 0
              ? 'No retrievable page matched. Widen the terms, or the knowledge may not be written yet.'
              : `${hits.length} page(s), strongest first:`,
            pages: hits.map(hit => item(hit.page, { why: [...hit.why] })),
            backlinks: [],
          }
        }
        case 'get': {
          if (args.id === undefined || args.id.trim().length === 0) {
            throw new Error('assistant_knowledge get requires id')
          }
          const found = await ctx.assistantMemory.readKnowledgePage(args.id)
          if (found === undefined) throw new Error(`no knowledge page "${args.id}"`)
          const { page, backlinks } = found
          return {
            action: 'get',
            summary: `Page "${page.id}" (${page.status}, ${page.type})`
              + (page.sources.length > 0 ? ` — sources: ${page.sources.map(source => source.resource).join('; ')}` : ' — no sources recorded'),
            pages: [item(page, { body: page.body })],
            backlinks: [...backlinks],
          }
        }
        /* v8 ignore next 2 -- the enum in the parameter schema admits only the cases above */
        default:
          throw new Error(`unsupported action ${String(args.action)}`)
      }
    },
    presentCall: args => callCard(`Knowledge ${args.action}`, args.query ?? args.id ?? args.action),
    presentResult: (_args, result) => resultCard(result.meta, 'Knowledge'),
  }))
}
