import { describe, expect, it } from 'vitest'
import { VikiClient } from '../../src/host/viki/client.ts'

/** Capture the request a VikiClient makes, replaying a canned JSON response. */
function clientWith(canned: unknown, status = 200) {
  const calls: { method: string, url: string, body: unknown }[] = []
  const client = new VikiClient({
    baseUrl: 'http://viki.test',
    fetch: (async (url: unknown, init?: { method?: string, body?: string }) => {
      calls.push({ method: init?.method ?? 'GET', url: String(url), body: init?.body === undefined ? undefined : JSON.parse(init.body) })
      return new Response(JSON.stringify({ status: 'ok', result: canned }), { status })
    }) as typeof fetch,
  })
  return { client, calls }
}

describe('VikiClient snapshot contract', () => {
  it('commit sends the required message field alongside paths and returns the commit oid', async () => {
    const { client, calls } = clientWith({ result: 'noop', commit_oid: 'oid-9' })
    const commit = await client.commit(['viking://user/default/memories'])
    expect(commit).toBe('oid-9')
    expect(calls).toHaveLength(1)
    expect(calls[0]!.method).toBe('POST')
    expect(calls[0]!.url).toBe('http://viki.test/api/v1/snapshot/commit')
    expect(calls[0]!.body).toMatchObject({ paths: ['viking://user/default/memories'] })
    expect(typeof (calls[0]!.body as { message?: unknown }).message).toBe('string')
    expect((calls[0]!.body as { message: string }).message.length).toBeGreaterThan(0)
  })

  it('keeps the tree when only stats/memories fails, and names it as a problem', async () => {
    // A stats outage must not blank the panel: the tree still lists, the cross-check degrades to
    // a problem line the diagnostics face renders.
    const client = new VikiClient({
      baseUrl: 'http://viki.test',
      fetch: (async (url: unknown) => {
        if (String(url).includes('/stats/memories')) return new Response(JSON.stringify({ status: 'error', error: 'boom' }), { status: 500 })
        return new Response(JSON.stringify({ status: 'ok', result: [] }))
      }) as typeof fetch,
    })
    const list = await client.list()
    expect(list.entries).toEqual([])
    expect(list.problems.some(problem => problem.startsWith('stats:'))).toBe(true)
  })

  it('throws VikiUnavailable when the server is unreachable, not an empty list', async () => {
    const client = new VikiClient({
      baseUrl: 'http://viki.test',
      fetch: (async () => { throw new Error('ECONNREFUSED') }) as unknown as typeof fetch,
    })
    await expect(client.list()).rejects.toThrow(/request failed.*ECONNREFUSED/s)
  })

  it('refuses to name a snapshot commit when the response carries no id', async () => {
    const { client } = clientWith({ result: 'noop' })
    await expect(client.commit(['viking://user/default/memories'])).rejects.toThrow(/no commit id/)
  })

  it('names a non-JSON health answer instead of guessing at its fields', async () => {
    const client = new VikiClient({
      baseUrl: 'http://viki.test',
      fetch: (async () => new Response('<html>not json</html>', { status: 200 })) as typeof fetch,
    })
    await expect(client.health()).rejects.toThrow(/non-JSON/)
  })

  it('reports not-configured before touching the network', async () => {
    const client = new VikiClient({ baseUrl: '', fetch: (async () => { throw new Error('must not be called') }) as unknown as typeof fetch })
    await expect(client.list()).rejects.toThrow(/not configured/)
  })

  it('restore and remove keep their wire shapes', async () => {
    const { client, calls } = clientWith({})

    await client.restore('oid-9')
    expect(calls[0]).toMatchObject({ method: 'POST', url: 'http://viki.test/api/v1/snapshot/restore' })
    expect(calls[0]!.body).toEqual({ source_commit: 'oid-9' })

    await client.remove('viking://user/default/memories/entities/公司/恒基地产.md')
    expect(calls[1]!.method).toBe('DELETE')
    expect(calls[1]!.url).toBe('http://viki.test/api/v1/fs?uri=viking%3A%2F%2Fuser%2Fdefault%2Fmemories%2Fentities%2F%E5%85%AC%E5%8F%B8%2F%E6%81%92%E5%9F%BA%E5%9C%B0%E4%BA%A7.md&recursive=false')
  })
})
