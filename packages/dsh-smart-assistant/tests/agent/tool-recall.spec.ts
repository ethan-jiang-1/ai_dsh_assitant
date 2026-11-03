/**
 * Contract for the shipped read-only recall tool (`assistant_recall`) over the OpenViking HTTP face.
 *
 * The assertions pin the schema-facing behavior: find/search return a count + result, read/tree
 * require a viking URI, and a failed server response is a readable error rather than a silent
 * empty result. The tool won the A/B against allowlisting the read-only MCP tools; see
 * [the decision note](../../../../../notes/implemented/2026-10-20-on-demand-recall-path.md).
 */
import { describe, expect, it, vi } from 'vitest'
import { executeRecall } from '../../src/agent/tool-recall/index.ts'

const base = 'http://openviking.test'

function mockFetch(body: unknown, status = 200): typeof fetch {
  return vi.fn(async () => new Response(JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json' },
  })) as unknown as typeof fetch
}

describe('assistant_recall', () => {
  it('find returns a count and the JSON result', async () => {
    const fetchImpl = mockFetch({ status: 'ok', result: { memories: [{ uri: 'a' }, { uri: 'b' }] } })
    const result = await executeRecall({ action: 'find', query: '合同' }, { base, fetchImpl })
    expect(result.summary).toContain('find "合同": 2 memories')
    expect(result.result).toContain('"a"')
    expect(fetchImpl).toHaveBeenCalledWith(`${base}/api/v1/search/find`, expect.objectContaining({ method: 'POST' }))
  })

  it('search is the session-aware sibling of find: same shape, its own endpoint', async () => {
    const fetchImpl = mockFetch({ status: 'ok', result: { memories: [{ uri: 's-1' }] } })
    const result = await executeRecall({ action: 'search', query: '返利' }, { base, fetchImpl })
    expect(result.summary).toContain('search "返利": 1 memories')
    expect(fetchImpl).toHaveBeenCalledWith(`${base}/api/v1/search/search`, expect.objectContaining({ method: 'POST' }))
  })

  it('read requires a viking:// uri and returns the body', async () => {
    await expect(executeRecall({ action: 'read', uri: '/etc/passwd' }, { base, fetchImpl: mockFetch({ status: 'ok', result: 'x' }) }))
      .rejects.toThrow('viking://')
    const result = await executeRecall({ action: 'read', uri: 'viking://user/default/memories/identity.md' }, {
      base, fetchImpl: mockFetch({ status: 'ok', result: '# identity' }),
    })
    expect(result.result).toBe('# identity')
  })

  it('tree counts the directory entries', async () => {
    const result = await executeRecall({ action: 'tree', uri: 'viking://user/default/memories' }, {
      base, fetchImpl: mockFetch({ status: 'ok', result: [{ uri: 'a' }, { uri: 'b' }] }),
    })
    expect(result.summary).toContain('2 entries')
  })

  it('surfaces a server failure as a readable error', async () => {
    await expect(executeRecall({ action: 'find', query: 'x' }, {
      base, fetchImpl: mockFetch({ status: 'error', error: 'boom' }, 500),
    })).rejects.toThrow('OpenViking 500: boom')
  })

  it('formats a structured error body instead of [object Object]', async () => {
    const error = await executeRecall({ action: 'find', query: 'x' }, {
      base, fetchImpl: mockFetch({ status: 'error', error: { code: 'bad_uri', message: 'URI is invalid' } }, 400),
    }).catch((cause: unknown) => cause)
    const message = error instanceof Error ? error.message : String(error)
    expect(message).toContain('bad_uri')
    expect(message).not.toContain('[object Object]')
  })
})
