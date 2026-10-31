/**
 * The product route and state machine: GET reports the binding, POST changes it, and invalid
 * paths or files never turn into a silent ready state.
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { createProductRoute } from '../../src/host/product/route.ts'
import { createProductState } from '../../src/host/product/state.ts'
import { productSettingsPath, readProductSettings, writeProductSettings } from '../../src/domain/product/settings.ts'

const repoTmp = fileURLToPath(new URL('../../../../.tmp/', import.meta.url))
const dirs: string[] = []

afterEach(async () => {
  for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true })
})

interface Fixture {
  root: string
  home: string
  workspace: string
  second: string
  userHome: string
  packageRoot: string
  settingsPath: string
  created: string[]
  route: ReturnType<typeof createProductRoute>
  state: ReturnType<typeof createProductState>
}

async function fixture(): Promise<Fixture> {
  const root = await mkdtemp(join(repoTmp, 'product-route-'))
  dirs.push(root)
  const home = join(root, 'home')
  const workspace = join(root, 'workspace')
  const second = join(root, 'workspace-two')
  await mkdir(home)
  await mkdir(workspace)
  await mkdir(second)
  const userHome = join(root, 'user-home')
  const packageRoot = join(root, 'package')
  await mkdir(userHome)
  await mkdir(packageRoot)
  const settingsPath = productSettingsPath(home)
  const created: string[] = []
  const registry = {
    create: async (path: string) => {
      created.push(path)
      return { id: `ws-${created.length}`, path }
    },
  }
  const state = createProductState({
    registry,
    home,
    settingsPath,
    userHome,
    packageRoot,
    now: () => new Date('2026-11-01T00:00:00.000Z'),
  })
  return {
    root, home, workspace, second, userHome, packageRoot, settingsPath, created,
    state,
    route: createProductRoute(state),
  }
}

const url = 'http://localhost/api/assistant/product'
const get = (): Request => new Request(url)
const post = (body: string): Request => new Request(url, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body,
})

describe('product route', () => {
  it('reports not-configured before any settings file exists', async () => {
    const f = await fixture()
    const response = await f.route.fetch(get())
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ version: 1, configured: false, status: 'not-configured' })
  })

  it('registers a stored workspace and returns the registration id', async () => {
    const f = await fixture()
    await writeProductSettings(f.settingsPath, f.workspace)
    const state = createProductState({
      registry: { create: async path => ({ id: 'ws-stored', path }) },
      home: f.home,
      settingsPath: f.settingsPath,
      userHome: f.userHome,
      packageRoot: f.packageRoot,
    })
    const response = await createProductRoute(state).fetch(get())
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      version: 1,
      configured: true,
      status: 'ready',
      workspaceDir: f.workspace,
      workspaceId: 'ws-stored',
    })
  })

  it('accepts a new workspace, persists it, and reads it back', async () => {
    const f = await fixture()
    const response = await f.route.fetch(post(JSON.stringify({ workspaceDir: f.second })))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      version: 1,
      configured: true,
      status: 'ready',
      workspaceDir: f.second,
      workspaceId: 'ws-1',
    })
    expect(await readProductSettings(f.settingsPath)).toMatchObject({
      kind: 'ok',
      settings: { workspaceDir: f.second, updatedAt: '2026-11-01T00:00:00.000Z' },
    })
    expect(JSON.parse(await readFile(f.settingsPath, 'utf8'))).toMatchObject({ version: 1, workspaceDir: f.second })
    expect(await (await f.route.fetch(get())).json()).toMatchObject({ status: 'ready', workspaceDir: f.second })
  })

  it('rejects relative, missing and forbidden workspaces with stable codes and no write', async () => {
    const f = await fixture()
    for (const [value, code] of [
      ['relative/path', 'workspace-not-absolute'],
      [join(f.root, 'missing'), 'workspace-missing'],
      [f.home, 'workspace-forbidden'],
      [f.packageRoot, 'workspace-forbidden'],
    ] as const) {
      const response = await f.route.fetch(post(JSON.stringify({ workspaceDir: value })))
      expect(response.status).toBe(422)
      expect(await response.json()).toEqual({ error: code })
    }
    expect(await readProductSettings(f.settingsPath)).toEqual({ kind: 'missing' })
    expect(f.created).toHaveLength(0)
  })

  it('reports a corrupt file as invalid instead of not-configured', async () => {
    const f = await fixture()
    await mkdir(join(f.home, 'assistant-product'), { recursive: true })
    await writeFile(f.settingsPath, '{', 'utf8')
    const state = createProductState({
      registry: { create: async path => ({ id: 'ws', path }) },
      home: f.home,
      settingsPath: f.settingsPath,
      userHome: f.userHome,
      packageRoot: f.packageRoot,
    })
    const response = await createProductRoute(state).fetch(get())
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      version: 1,
      configured: true,
      status: 'invalid',
      error: 'settings-invalid',
    })
  })

  it('reports a stored path that disappeared as workspace-missing', async () => {
    const f = await fixture()
    await writeProductSettings(f.settingsPath, f.workspace)
    await rm(f.workspace, { recursive: true, force: true })
    const state = createProductState({
      registry: { create: async path => ({ id: 'ws', path }) },
      home: f.home,
      settingsPath: f.settingsPath,
      userHome: f.userHome,
      packageRoot: f.packageRoot,
    })
    const response = await createProductRoute(state).fetch(get())
    expect(await response.json()).toEqual({
      version: 1,
      configured: true,
      status: 'workspace-missing',
      workspaceDir: f.workspace,
      error: 'workspace-missing',
    })
  })

  it('rejects query strings, malformed bodies and oversized payloads', async () => {
    const f = await fixture()
    expect((await f.route.fetch(new Request(`${url}?x=1`))).status).toBe(400)
    expect((await f.route.fetch(post('{'))).status).toBe(400)
    expect((await f.route.fetch(post(JSON.stringify({ workspaceDir: 42 })))).status).toBe(400)
    expect((await f.route.fetch(post('x'.repeat(5000)))).status).toBe(413)
  })

  it('does not accept a method other than GET/POST', async () => {
    const f = await fixture()
    const response = await f.route.fetch(new Request(url, { method: 'PUT' }))
    expect(response.status).toBe(405)
    expect(await response.json()).toEqual({ error: 'method-not-allowed' })
  })
})
