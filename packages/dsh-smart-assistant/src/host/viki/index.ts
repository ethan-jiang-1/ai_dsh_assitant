/**
 * Host plugin row `assistant-viki`: registers the exact Viki read route over the configured
 * OpenViking server. `baseUrl`/`apiKey` come from config, then `OPENVIKING_URL`/
 * `OPENVIKING_API_KEY`, then the local `127.0.0.1:1933` default; an unreachable server is a
 * 503 on read, never a startup failure. The delete/restore POST actions ride the same route.
 *
 * @module
 */
import z from '@deepseek-ai/schemastery'
import type Schema from '@deepseek-ai/schemastery'
import type { Context } from '@deepseek-ai/cordis'
import { createVikiRoute, type VikiActions, type VikiReader } from './route.ts'
import { VikiClient } from './client.ts'
import { recordApproval } from '../approval-audit.ts'
import type { AssistantMemory } from '../service.ts'

export const name = 'assistant-viki'
export const inject = ['connection', 'assistantMemory'] as const

export interface Config {
  /** OpenViking base URL (no `/api/v1` suffix); config → `OPENVIKING_URL` → local `127.0.0.1:1933`. */
  baseUrl?: string
  /** API key for `Authorization: Bearer`; defaults to `OPENVIKING_API_KEY`. */
  apiKey?: string
  /** OpenViking space; defaults to `default`. */
  space?: string
  /** Restrict to one peer; absent means every peer under the space (still read-only). */
  peer?: string
}

export const Config: Schema<Config> = z.object({
  baseUrl: z.string().default(''),
  apiKey: z.string().default(''),
  space: z.string().default('default'),
  peer: z.string().default(''),
})

/** Local default: the OpenViking server's dev port, matching the plugin's own default. */
const DEFAULT_BASE_URL = 'http://127.0.0.1:1933'

export function apply(ctx: Context, config: Config): void {
  const memory = (ctx as unknown as { assistantMemory: AssistantMemory }).assistantMemory
  const space = config.space?.trim() || 'default'
  const peer = config.peer?.trim() || undefined
  const configuredBaseUrl = config.baseUrl?.trim() || process.env.OPENVIKING_URL?.trim() || ''
  const baseUrl = configuredBaseUrl || DEFAULT_BASE_URL
  if (configuredBaseUrl === '') {
    ctx.logger.warn(`assistant-viki: no baseUrl/OPENVIKING_URL; using ${DEFAULT_BASE_URL} (set it explicitly for a remote server)`)
  }
  const apiKey = config.apiKey?.trim() || process.env.OPENVIKING_API_KEY?.trim() || undefined
  const client = new VikiClient({ baseUrl, space, ...(apiKey === undefined ? {} : { apiKey }), ...(peer === undefined ? {} : { peer }) })
  const reader: VikiReader = {
    list: () => client.list(),
    read: uri => client.read(uri),
  }
  const actions: VikiActions = {
    commit: paths => client.commit(paths),
    remove: uri => client.remove(uri),
    restore: commit => client.restore(commit),
    references: async (uri) => {
      const list = await client.list()
      const target = list.entries.find(entry => entry.uri === uri)
      const siblings = target === undefined ? [] : list.entries
        .filter(entry => entry.uri !== uri && (
          (entry.eventName !== undefined && entry.eventName === target.eventName)
          || (entry.summary !== undefined && entry.summary === target.summary)
        ))
        .map(entry => entry.uri)
      const knowledge = (await memory.listKnowledge()).entries
        .filter(page => JSON.stringify({ sources: page.sources, links: page.links }).includes(uri))
        .map(page => page.id)
      return { knowledge, siblings }
    },
    audit: async (uri, commitId, title) => {
      await recordApproval(memory, 'retire', uri, {
        source: 'panel-direct', room: 'viki', ...(title === undefined ? {} : { title }),
        before: { status: 'active' }, after: { status: 'deleted', commitId },
      })
    },
  }
  ctx.effect(() => ctx.connection.fetch.register(createVikiRoute(reader, {
    allowedSpaces: [space],
    allowedPeers: peer === undefined ? [] : [peer],
  }, actions)))
}
