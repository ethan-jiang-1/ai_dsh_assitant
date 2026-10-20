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
    expect(calls[0].method).toBe('POST')
    expect(calls[0].url).toBe('http://viki.test/api/v1/snapshot/commit')
    expect(calls[0].body).toMatchObject({ paths: ['viking://user/default/memories'] })
    expect(typeof (calls[0].body as { message?: unknown }).message).toBe('string')
    expect((calls[0].body as { message: string }).message.length).toBeGreaterThan(0)
  })

  it('restore and remove keep their wire shapes', async () => {
    const { client, calls } = clientWith({})

    await client.restore('oid-9')
    expect(calls[0]).toMatchObject({ method: 'POST', url: 'http://viki.test/api/v1/snapshot/restore' })
    expect(calls[0].body).toEqual({ source_commit: 'oid-9' })

    await client.remove('viking://user/default/memories/entities/公司/恒基地产.md')
    expect(calls[1].method).toBe('DELETE')
    expect(calls[1].url).toBe('http://viki.test/api/v1/fs?uri=viking%3A%2F%2Fuser%2Fdefault%2Fmemories%2Fentities%2F%E5%85%AC%E5%8F%B8%2F%E6%81%92%E5%9F%BA%E5%9C%B0%E4%BA%A7.md&recursive=false')
  })
})
