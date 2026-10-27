/**
 * The per-home interface-density route (`src/host/ui-mode/route.ts`): GET reads, POST writes
 * one small file, and invalid input never replaces a good value.
 */
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { createUiModeRoute } from '../../src/host/ui-mode/route.ts'

const repoTmp = fileURLToPath(new URL('../../../../.tmp/', import.meta.url))
const dirs: string[] = []

afterEach(async () => {
  for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true })
})

async function fixture() {
  const dir = await mkdtemp(join(repoTmp, 'ui-mode-route-'))
  dirs.push(dir)
  return { dir, route: createUiModeRoute(dir) }
}

const url = 'http://localhost/api/assistant/ui-mode'
const get = (): Request => new Request(url)
const post = (body: string): Request => new Request(url, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body,
})

describe('ui-mode route', () => {
  it('answers standard when no file exists, and survives a write/read round-trip', async () => {
    const { dir, route } = await fixture()
    const missing = await route.fetch(get())
    expect(missing.status).toBe(200)
    expect(await missing.json()).toEqual({ mode: 'standard' })

    const written = await route.fetch(post(JSON.stringify({ mode: 'expert' })))
    expect(written.status).toBe(200)
    expect(await written.json()).toEqual({ mode: 'expert' })
    expect(JSON.parse(await readFile(join(dir, 'ui-mode.json'), 'utf8'))).toEqual({ version: 1, mode: 'expert' })

    expect(await (await route.fetch(get())).json()).toEqual({ mode: 'expert' })
  })

  it('rejects an unknown mode and a malformed body without touching the stored value', async () => {
    const { dir, route } = await fixture()
    await route.fetch(post(JSON.stringify({ mode: 'standard' })))
    const badMode = await route.fetch(post(JSON.stringify({ mode: 'loud' })))
    expect(badMode.status).toBe(400)
    expect(await badMode.json()).toEqual({ error: 'invalid-mode' })
    const badJson = await route.fetch(post('{'))
    expect(badJson.status).toBe(400)
    expect(await badJson.json()).toEqual({ error: 'invalid-json' })
    expect(JSON.parse(await readFile(join(dir, 'ui-mode.json'), 'utf8'))).toEqual({ version: 1, mode: 'standard' })
  })

  it('reports a corrupt file instead of silently replacing it', async () => {
    const { dir, route } = await fixture()
    await writeFile(join(dir, 'ui-mode.json'), '{', 'utf8')
    const response = await route.fetch(get())
    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({ error: 'ui-mode-invalid' })
  })

  it('rejects a query string', async () => {
    const { route } = await fixture()
    const response = await route.fetch(new Request(`${url}?x=1`))
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'unexpected-query' })
  })
})
