/**
 * Built Host projection plugin through real Cordis Loader and pinned Connection registry.
 * Requires `pnpm build`: the plugin is imported from lib, not substituted with source.
 * Pins exact GET bytes, method/path exclusion, fiber disposal/remount, and file failures.
 * Each fixture owns an independent temporary operating directory; no assistantMemory is used.
 * The shared Fetch handler is exercised directly with inert external auth input: this suite
 * does not assert physical HTTP admission, browser authentication, or rendered Client behavior.
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import { afterEach, describe, expect, it } from 'vitest'
import { HostConnectionService } from '../../../../vendor/dsh/packages/client/connection/src/rpc-host.ts'
import { Peer } from '../../../../vendor/dsh/packages/client/connection/src/peer.ts'
import * as projectionPlugin from '../../lib/host/desk-projection/index.js'

const fixtures = []
const route = '/api/assistant/desk-projection'
const projectionText = '{\n  "version": 1,\n  "desk": { "title": "经营桌面", "items": [] }\n}\n'

afterEach(async () => {
  for (const { ctx, dataDir } of fixtures.splice(0)) {
    try {
      await ctx.fiber.dispose()
    } finally {
      // dataDir is the exact mkdtemp result owned by this fixture.
      await rm(dataDir, { recursive: true, force: true })
    }
  }
})

/**
 * Real Loader and Connection; auth is inert because this seam never calls admit().
 *
 * Since dsh-v0.2.1-rc.2 the shared Fetch handler takes a REQUIRED Peer ("required, never defaulted"):
 * an exact route now admits only `principal.kind === 'owner'` and returns 403 otherwise, so a
 * peerless call is a fixture defect, not an admission decision. The owner Peer below mirrors the
 * one rpc-host itself constructs for the browser channel.
 */
async function hostRoot() {
  const dataDir = await mkdtemp(join(tmpdir(), 'assistant-projection-lifecycle-'))
  const ctx = new Context()
  fixtures.push({ ctx, dataDir })
  await ctx.plugin(Loader)
  new HostConnectionService(ctx, [], {})
  const connection = ctx.get('connection')
  const handler = connection.createSharedFetchHandler('/api')
  const ownerPeer = new Peer(ctx, { principal: { kind: 'owner' } })
  return {
    ctx, dataDir,
    file: join(dataDir, 'desk-projection.json'),
    request: (path = route, method = 'GET') => handler.fetch(new Request(`http://fixture.invalid${path}`, { method }), ownerPeer),
    async mount() {
      ctx.loader.builtins['assistant-projection'] = projectionPlugin
      await ctx.loader.root.update([{
        id: 'assistant-projection',
        name: 'cordis:assistant-projection',
        config: { dataDir, allowFixture: true },
      }])
      await ctx.loader.await()
    },
    async unmount() {
      await ctx.loader.root.update([])
      await ctx.loader.await()
    },
  }
}

async function expectProjection(host) {
  const response = await host.request()
  expect(response.status).toBe(200)
  expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8')
  expect(response.headers.get('cache-control')).toBe('no-store')
  expect(response.headers.get('x-content-type-options')).toBe('nosniff')
  expect(await response.text()).toBe(projectionText)
}

describe('built desk projection through Loader and real Host Connection', () => {
  it('serves the exact independent JSON only at the fixed GET route', async () => {
    const host = await hostRoot()
    await writeFile(host.file, projectionText, 'utf8')
    await host.mount()
    await expectProjection(host)
    expect((await host.request(route, 'POST')).status).toBe(404)
    expect((await host.request('/api/assistant/other')).status).toBe(404)
    expect((await host.request(`${route}/nested`)).status).toBe(404)
  })

  it('removes the route on unmount and re-adds it without duplicate registrations', async () => {
    const host = await hostRoot()
    await writeFile(host.file, projectionText, 'utf8')
    expect((await host.request()).status).toBe(404)
    await host.mount()
    await expectProjection(host)
    for (let cycle = 0; cycle < 2; cycle++) {
      await host.unmount()
      expect((await host.request()).status, 'unmounted projection route must be absent').toBe(404)
      await host.mount()
      await expectProjection(host)
    }
    await host.unmount()
    expect((await host.request()).status).toBe(404)
  })

  it('returns 404 for a missing projection and 422 for corrupt JSON without remounting', async () => {
    const host = await hostRoot()
    await host.mount()
    const missing = await host.request()
    expect(missing.status).toBe(404)
    expect(await missing.json()).toEqual({ error: 'projection-missing' })
    await writeFile(host.file, '{broken JSON', 'utf8')
    const corrupt = await host.request()
    expect(corrupt.status).toBe(422)
    expect(await corrupt.json()).toEqual({ error: 'projection-invalid-json' })
    await writeFile(host.file, projectionText, 'utf8')
    await expectProjection(host)
  })
})
