/**
 * Minimal OpenViking read client for the Viki tab (B1). It knows only the four reads the panel
 * needs — `fs/ls`, `fs/attrs`, `content/read`, `stats/memories` — and walks the two real trees
 * (`user/<space>/memories` and `peers/<peer>/memories/events/YYYY/MM/DD`) explicitly because a
 * single `recursive=true` stops at YYYY/MM on this pin (measured 2026-10-19).
 *
 * The base URL/API key come from the caller (config/env); the server being absent is a normal
 * `VikiUnavailable`, never a startup failure. The shape is pinned by tests/host/viki-route.spec.ts
 * against a mock server, and by the live 0.4.22 server for the real read.
 *
 * @module dsh-smart-assistant/host/viki/client
 */
import { createHash } from 'node:crypto'

/** One `fs/ls` entry. */
export interface VikiFsEntry {
  readonly uri: string
  readonly size?: number
  readonly isDir?: boolean
  readonly modTime?: string
  readonly abstract?: string
}

/** The `fs/attrs` memory block (the summary/title/type live here, not in `fs/ls.abstract`). */
export interface VikiAttrs {
  readonly event_name?: string
  readonly summary?: string
  readonly memory_type?: string
  readonly source_extraction_id?: string
  readonly version?: number
}

/** One row the panel lists. */
export interface VikiEntry {
  readonly uri: string
  readonly name: string
  readonly source: 'user' | 'peer'
  readonly peer?: string
  readonly size?: number
  readonly modTime?: string
  readonly summary?: string
  readonly memoryType?: string
  readonly eventName?: string
}

/** The list projection. */
export interface VikiList {
  readonly connected: true
  readonly generatedAt?: string
  readonly revision: string
  readonly space: string
  readonly peers: readonly string[]
  readonly entries: readonly VikiEntry[]
  readonly counts: { readonly total: number, readonly user: number, readonly peers: number, readonly events: number }
  readonly stats?: unknown
  readonly problems: readonly string[]
}

/** The server is not configured, unreachable, or answered non-ok. */
export class VikiUnavailable extends Error {
  constructor(message: string, override readonly cause?: unknown) {
    super(message)
    this.name = 'VikiUnavailable'
  }
}

export interface VikiClientOptions {
  readonly baseUrl: string
  readonly apiKey?: string
  readonly space?: string
  readonly peer?: string
  readonly fetch?: typeof fetch
  readonly maxDepth?: number
}

const DEFAULT_SPACE = 'default'
const MAX_DEPTH = 8

/** The first honest line: frontmatter `title:` if present, else the first non-heading line. */
function summaryOfBody(body: string): string | undefined {
  let inFront = false
  for (const raw of body.split('\n')) {
    const line = raw.trim()
    if (line === '') continue
    if (line === '---') { inFront = !inFront; continue }
    if (inFront) {
      const title = /^title:\s*(.+)$/iu.exec(line)
      if (title?.[1] !== undefined) return title[1].replace(/^["']|["']$/gu, '').slice(0, 200)
      continue
    }
    if (line.startsWith('#')) return line.replace(/^#+\s*/u, '').slice(0, 200)
    return line.slice(0, 200)
  }
  return undefined
}

export class VikiClient {
  private readonly baseUrl: string
  private readonly apiKey: string | undefined
  private readonly fetchImpl: typeof fetch
  private readonly space: string
  private readonly peer: string | undefined
  private readonly maxDepth: number

  constructor(options: VikiClientOptions) {
    this.baseUrl = options.baseUrl.trim().replace(/\/+$/u, '')
    this.apiKey = options.apiKey
    this.fetchImpl = options.fetch ?? globalThis.fetch
    this.space = options.space ?? DEFAULT_SPACE
    this.peer = options.peer
    this.maxDepth = options.maxDepth ?? MAX_DEPTH
  }

  /** Whether a URI is inside the configured user/peer memories (the route's whitelist too). */
  allows(uri: string): boolean {
    if (uri.split('/').includes('..')) return false
    const user = `viking://user/${this.space}/memories/`
    if (uri.startsWith(user)) return true
    const peerPrefix = `viking://user/${this.space}/peers/`
    if (!uri.startsWith(peerPrefix)) return false
    const rest = uri.slice(peerPrefix.length)
    if (!rest.includes('/memories/')) return false
    const peer = rest.split('/')[0] ?? ''
    return this.peer === undefined || peer === this.peer
  }

  /** Enumerate both trees, attach attrs summaries and cross-check `stats/memories`. */
  async list(): Promise<VikiList> {
    if (this.baseUrl === '') throw new VikiUnavailable('OpenViking is not configured')
    const entries: VikiEntry[] = []
    const problems: string[] = []
    const peers = new Set<string>()
    const userRoot = `viking://user/${this.space}/memories`
    try {
      await this.walk(userRoot, 'user', undefined, 0, entries, problems)
    } catch (error) {
      if (error instanceof VikiUnavailable) throw error
      problems.push(`user tree: ${String(error)}`)
    }
    let peerDirs: VikiFsEntry[] = []
    try {
      peerDirs = (await this.ls(`viking://user/${this.space}/peers`)).filter(entry => entry.isDir === true)
    } catch (error) {
      if (error instanceof VikiUnavailable) throw error
      problems.push(`peers tree: ${String(error)}`)
    }
    for (const dir of peerDirs) {
      const peer = dir.uri.split('/').pop() ?? ''
      if (peer === '' || (this.peer !== undefined && peer !== this.peer)) continue
      peers.add(peer)
      try {
        await this.walk(`${dir.uri}/memories`, 'peer', peer, 0, entries, problems)
      } catch (error) {
        if (error instanceof VikiUnavailable) throw error
        problems.push(`peer ${peer}: ${String(error)}`)
      }
    }
    entries.sort((left, right) => left.uri.localeCompare(right.uri))
    const stats = await this.stats().catch(error => {
      problems.push(`stats: ${String(error)}`)
      return undefined
    })
    const statsEvents = Number((stats as { memories?: { events?: unknown } } | undefined)?.memories?.events ?? NaN)
    const events = entries.filter(entry => entry.memoryType === 'events').length
    if (Number.isFinite(statsEvents) && statsEvents !== events) {
      problems.push(`stats/memories reports ${String(statsEvents)} events but the tree enumerates ${String(events)}`)
    }
    const user = entries.filter(entry => entry.source === 'user').length
    const counts = { total: entries.length, user, peers: entries.length - user, events }
    const generatedAt = entries.map(entry => entry.modTime).filter((value): value is string => typeof value === 'string').sort().at(-1)
    const revision = createHash('sha256').update(JSON.stringify({ space: this.space, entries: entries.map(entry => entry.uri) })).digest('hex')
    return {
      connected: true,
      ...(generatedAt === undefined ? {} : { generatedAt }),
      revision,
      space: this.space,
      peers: [...peers].sort(),
      entries,
      counts,
      ...(stats === undefined ? {} : { stats }),
      problems,
    }
  }

  /** Read one file body (the route decides whether the URI is allowed). */
  async read(uri: string): Promise<string> {
    if (this.baseUrl === '') throw new VikiUnavailable('OpenViking is not configured')
    if (!this.allows(uri)) throw new VikiUnavailable(`URI is outside the configured memories: ${uri}`)
    const result = await this.get(`/content/read?uri=${encodeURIComponent(uri)}`)
    if (typeof result === 'string') return result
    const record = result as { content?: unknown, text?: unknown }
    return typeof record.content === 'string' ? record.content : typeof record.text === 'string' ? record.text : ''
  }

  private async walk(
    uri: string,
    source: 'user' | 'peer',
    peer: string | undefined,
    depth: number,
    entries: VikiEntry[],
    problems: string[],
  ): Promise<void> {
    if (depth > this.maxDepth) {
      problems.push(`tree deeper than ${String(this.maxDepth)} at ${uri}`)
      return
    }
    let children: VikiFsEntry[]
    try {
      children = await this.ls(uri)
    } catch (error) {
      if (error instanceof VikiUnavailable) throw error
      problems.push(`ls ${uri}: ${String(error)}`)
      return
    }
    for (const child of children) {
      const name = child.uri.split('/').pop() ?? ''
      if (name === '' || name.startsWith('.') || name === '.overview.md') continue
      if (child.isDir === true) {
        await this.walk(child.uri, source, peer, depth + 1, entries, problems)
        continue
      }
      let attrs: VikiAttrs | undefined
      try {
        attrs = await this.attrs(child.uri)
      } catch (error) {
        if (error instanceof VikiUnavailable) throw error
        problems.push(`attrs ${child.uri}: ${String(error)}`)
      }
      let summary = attrs?.summary
      if (summary === undefined || summary === '') {
        try {
          summary = summaryOfBody(await this.read(child.uri))
        } catch { /* the row still lists; the summary stays empty */ }
      }
      entries.push({
        uri: child.uri,
        name,
        source,
        ...(peer === undefined ? {} : { peer }),
        ...(child.size === undefined ? {} : { size: child.size }),
        ...(child.modTime === undefined ? {} : { modTime: child.modTime }),
        ...(summary === undefined || summary === '' ? {} : { summary }),
        ...(attrs?.memory_type === undefined ? {} : { memoryType: attrs.memory_type }),
        ...(attrs?.event_name === undefined ? {} : { eventName: attrs.event_name }),
      })
    }
  }

  private async ls(uri: string): Promise<VikiFsEntry[]> {
    const result = await this.get(`/fs/ls?uri=${encodeURIComponent(uri)}&output=original`)
    return Array.isArray(result) ? result as VikiFsEntry[] : []
  }

  private async attrs(uri: string): Promise<VikiAttrs | undefined> {
    const result = await this.get(`/fs/attrs?uri=${encodeURIComponent(uri)}`) as { attrs?: { memory?: VikiAttrs } } | undefined
    return result?.attrs?.memory
  }

  private async stats(): Promise<unknown> {
    return this.get('/stats/memories')
  }

  private async get(path: string): Promise<unknown> {
    let response: Response
    try {
      response = await this.fetchImpl(`${this.baseUrl}/api/v1${path}`, {
        headers: this.apiKey === undefined || this.apiKey === '' ? {} : { authorization: `Bearer ${this.apiKey}` },
      })
    } catch (error) {
      throw new VikiUnavailable(`OpenViking request failed: ${String(error)}`, error)
    }
    let body: unknown
    try {
      body = await response.json()
    } catch (error) {
      throw new VikiUnavailable(`OpenViking returned non-JSON (HTTP ${String(response.status)})`, error)
    }
    if (!response.ok || (body as { status?: unknown })?.status !== 'ok') {
      throw new VikiUnavailable(`OpenViking answered ${String(response.status)}: ${String((body as { error?: unknown })?.error ?? '')}`)
    }
    return (body as { result?: unknown }).result
  }
}

