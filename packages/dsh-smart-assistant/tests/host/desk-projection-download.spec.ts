/** Fixed download: unchanged bytes, query rejection, missing/corrupt/I/O errors and byte cap. */
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createDeskProjectionRoute } from '../../src/host/desk-projection-download.ts'

const homes: string[] = []
afterEach(async () => {
  for (const home of homes.splice(0)) await rm(home, { recursive: true, force: true })
})

describe('fixed independent desk projection download', () => {
  it('allows the exact byte limit, refuses invalid UTF-8, and honors prior cancellation', async () => {
    const home = await mkdtemp(join(tmpdir(), 'desk-download-'))
    homes.push(home)
    const file = join(home, 'desk-projection.json')
    await writeFile(file, '{}')
    const route = createDeskProjectionRoute(home, 2)
    expect((await route.fetch(new Request('http://localhost/api/assistant/desk-projection'))).status).toBe(200)
    await writeFile(file, Buffer.from([0x22, 0xff, 0x22]))
    expect((await createDeskProjectionRoute(home).fetch(new Request('http://localhost/api/assistant/desk-projection'))).status).toBe(422)
    const controller = new AbortController()
    controller.abort()
    await expect(route.fetch(new Request('http://localhost/api/assistant/desk-projection', { signal: controller.signal }))).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('refuses oversized multibyte data before emitting any projection', async () => {
    const home = await mkdtemp(join(tmpdir(), 'desk-download-'))
    homes.push(home)
    await writeFile(join(home, 'desk-projection.json'), '{"text":"中文"}')
    const response = await createDeskProjectionRoute(home, 14).fetch(new Request('http://localhost/api/assistant/desk-projection'))
    expect(response.status).toBe(413)
    expect(await response.json()).toEqual({ error: 'projection-too-large' })
  })

  it('distinguishes missing, malformed, and unreadable files without leaking paths', async () => {
    const home = await mkdtemp(join(tmpdir(), 'desk-download-'))
    homes.push(home)
    const route = createDeskProjectionRoute(home)
    const request = () => new Request('http://localhost/api/assistant/desk-projection')
    const missing = await route.fetch(request())
    expect(missing.status).toBe(404)
    expect(await missing.json()).toEqual({ error: 'projection-missing' })
    await writeFile(join(home, 'desk-projection.json'), '{invalid')
    const corrupt = await route.fetch(request())
    expect(corrupt.status).toBe(422)
    expect(await corrupt.json()).toEqual({ error: 'projection-invalid-json' })
    const unreadable = await createDeskProjectionRoute(join(home, 'desk-projection.json')).fetch(request())
    expect(unreadable.status).toBe(500)
    expect(await unreadable.json()).toEqual({ error: 'projection-unavailable' })
  })

  it('refuses query-selected files before reading, and never exposes deployment paths', async () => {
    const home = await mkdtemp(join(tmpdir(), 'desk-download-'))
    homes.push(home)
    const route = createDeskProjectionRoute(home)
    const response = await route.fetch(new Request('http://localhost/api/assistant/desk-projection?path=/etc/passwd'))
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'unexpected-query' })
  })

  it('downloads the fixed JSON file without a Session and does not modify it', async () => {
    const home = await mkdtemp(join(tmpdir(), 'desk-download-'))
    homes.push(home)
    const literal = '{"schemaVersion":1,"ledgerId":"simulated-k1","revision":7,"matters":[]}'
    await writeFile(join(home, 'desk-projection.json'), literal)
    const route = createDeskProjectionRoute(home)
    expect(route.path).toBe('/api/assistant/desk-projection')
    expect(route.methods).toEqual(['GET'])
    const response = await route.fetch(new Request('http://localhost/api/assistant/desk-projection'))
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('content-type')).toContain('application/json')
    expect(await response.text()).toBe(literal)
    expect(await readFile(join(home, 'desk-projection.json'), 'utf8')).toBe(literal)
  })
})

describe('ledger-rendered projection (K3 slice E)', () => {
  it('serves the v2 projection rendered from the authoritative ledger in preference to a fixture', async () => {
    const home = await mkdtemp(join(tmpdir(), 'desk-download-'))
    homes.push(home)
    const { Context } = await import('@deepseek-ai/cordis')
    const { default: AssistantOperatingLedger } = await import('../../src/host/operating-ledger/index.ts')
    const service = new AssistantOperatingLedger(new Context(), { dataDir: home })
    const receipt = await service.submitOperation({
      kind: 'create', operationId: 'op-dl-1', title: 'NB-02 第二期回款',
      source: { sessionId: 'session-A', quote: '帮我盯着' },
    })
    await service.stop()
    // A stale fixture must not win over the authoritative ledger.
    await writeFile(join(home, 'desk-projection.json'), JSON.stringify({ schemaVersion: 1, ledgerId: 'fixture', revision: 0, matters: [] }))

    const response = await createDeskProjectionRoute(home).fetch(new Request('http://localhost/api/assistant/desk-projection'))
    expect(response.status).toBe(200)
    const body: any = await response.json()
    expect(body.schemaVersion).toBe(2)
    expect(body.matters[0].id).toBe(receipt.matterId)
    expect(body.matters[0].evidence[0].sessionId).toBe('session-A')
    expect(body.receipts).toEqual([{ operationId: 'op-dl-1', matterId: receipt.matterId, sessionId: 'session-A', submittedAt: body.receipts[0].submittedAt, status: 'committed', revision: 1, kind: 'create', quote: '帮我盯着' }])
  })

  it('reports a corrupt authoritative ledger loudly instead of silently serving the fixture', async () => {
    const home = await mkdtemp(join(tmpdir(), 'desk-download-'))
    homes.push(home)
    await writeFile(join(home, 'ledger.json'), '{corrupt')
    await writeFile(join(home, 'desk-projection.json'), JSON.stringify({ schemaVersion: 1, ledgerId: 'fixture', revision: 0, matters: [] }))
    const response = await createDeskProjectionRoute(home).fetch(new Request('http://localhost/api/assistant/desk-projection'))
    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({ error: 'projection-invalid-json' })
    // A structurally wrong (non-v1) ledger is a version problem, not a silent fallback.
    await writeFile(join(home, 'ledger.json'), '{"version":99}')
    const wrongVersion = await createDeskProjectionRoute(home).fetch(new Request('http://localhost/api/assistant/desk-projection'))
    expect(wrongVersion.status).toBe(422)
    expect(await wrongVersion.json()).toEqual({ error: 'projection-invalid' })
  })
})
