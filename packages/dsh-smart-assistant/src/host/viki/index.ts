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
import { readFileSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { VikiDiagnostics, VikiTask } from '../../domain/viki/types.ts'
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

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function statsView(value: unknown): VikiDiagnostics['stats'] {
  if (value === null || typeof value !== 'object') return undefined
  const record = value as { total_memories?: unknown, by_category?: unknown }
  const total = Number(record.total_memories)
  if (!Number.isFinite(total)) return undefined
  const byCategory: Record<string, number> = {}
  if (record.by_category !== null && typeof record.by_category === 'object' && !Array.isArray(record.by_category)) {
    for (const [key, raw] of Object.entries(record.by_category as Record<string, unknown>)) {
      const count = Number(raw)
      if (Number.isFinite(count)) byCategory[key] = count
    }
  }
  return { total, byCategory }
}

function tasksView(value: unknown): VikiTask[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value.slice(0, 8).flatMap((row) => {
    if (row === null || typeof row !== 'object') return []
    const record = row as Record<string, unknown>
    if (typeof record.task_id !== 'string' || typeof record.task_type !== 'string' || typeof record.status !== 'string') return []
    return [{
      id: record.task_id,
      type: record.task_type,
      status: record.status,
      ...(typeof record.created_at_iso === 'string' ? { createdAt: record.created_at_iso } : {}),
      ...(typeof record.error === 'string' && record.error !== '' ? { error: record.error.slice(0, 200) } : {}),
    }]
  })
}

function skillsView(value: unknown): VikiDiagnostics['skills'] {
  if (value === null || typeof value !== 'object') return undefined
  const record = value as { total?: unknown, root_uris?: unknown }
  const total = Number(record.total)
  if (!Number.isFinite(total)) return undefined
  const roots = Array.isArray(record.root_uris)
    ? record.root_uris.filter((item): item is string => typeof item === 'string')
    : []
  return { total, roots }
}

function configSummary(path: string): NonNullable<VikiDiagnostics['config']> {
  try {
    const data = JSON.parse(readFileSync(path, 'utf8')) as {
      vlm?: { provider?: unknown, model?: unknown }
      storage?: { workspace?: unknown }
    }
    return {
      path,
      ...(typeof data.vlm?.provider === 'string' ? { provider: data.vlm.provider } : {}),
      ...(typeof data.vlm?.model === 'string' ? { model: data.vlm.model } : {}),
      ...(typeof data.storage?.workspace === 'string' ? { storage: data.storage.workspace } : {}),
    }
  } catch {
    return { path }
  }
}

function pendingCount(dir: string): number {
  try {
    return readdirSync(dir).filter(name => name.endsWith('.json')).length
  } catch {
    return 0
  }
}

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
  const configPath = process.env.OPENVIKING_CONF?.trim() || join(homedir(), '.openviking', 'ov.conf')
  const pendingDir = process.env.OPENVIKING_PENDING_DIR?.trim() || join(homedir(), '.openviking', 'pending')
  const reader: VikiReader = {
    list: () => client.list(),
    read: uri => client.read(uri),
    diagnostics: async () => {
      const problems: string[] = []
      const health = await client.health().catch(error => { problems.push(`health: ${messageOf(error)}`); return undefined })
      const list = await client.list().catch(error => { problems.push(`list: ${messageOf(error)}`); return undefined })
      const tasks = await client.tasks().catch(error => { problems.push(`tasks: ${messageOf(error)}`); return undefined })
      const skills = await client.skills().catch(error => { problems.push(`skills: ${messageOf(error)}`); return undefined })
      if (list !== undefined) problems.push(...list.problems)
      const stats = statsView(list?.stats)
      const taskRows = tasksView(tasks)
      const skillRows = skillsView(skills)
      return {
        connected: health?.healthy ?? (list !== undefined),
        generatedAt: new Date().toISOString(),
        vikiUrl: baseUrl,
        ...(health === undefined ? {} : { health }),
        ...(stats === undefined ? {} : { stats }),
        ...(taskRows === undefined ? {} : { tasks: taskRows }),
        ...(skillRows === undefined ? {} : { skills: skillRows }),
        pending: pendingCount(pendingDir),
        config: configSummary(configPath),
        problems,
      }
    },
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
