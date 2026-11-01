/**
 * The product route and state machine: GET reports the binding, POST changes it, and invalid
 * paths or failed persistence never turn into a silent ready state. The binding is Config/env,
 * not a settings file.
 */
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { createProductRoute } from '../../src/host/product/route.ts'
import { createProductState, type ProductSettingsWriter } from '../../src/host/product/state.ts'

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
  created: string[]
  writes: { namespace: string, patch: object }[]
  state: ReturnType<typeof createProductState>
  route: ReturnType<typeof createProductRoute>
}

interface FixtureOptions {
  readonly config?: { workspaceDir?: string, onboarding?: boolean }
  readonly env?: Record<string, string | undefined>
  readonly settings?: ProductSettingsWriter | null
}

async function fixture(options: FixtureOptions = {}): Promise<Fixture> {
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
  const created: string[] = []
  const writes: { namespace: string, patch: object }[] = []
  const registry = {
    create: async (path: string) => {
      created.push(path)
      return { id: `ws-${created.length}`, path }
    },
  }
  const settings = options.settings === null
    ? undefined
    : options.settings ?? {
        update: async (namespace: string, patch: object) => {
          writes.push({ namespace, patch })
        },
      }
  const state = createProductState({
    registry,
    ...(options.config === undefined ? {} : { config: options.config }),
    ...(options.env === undefined ? {} : { env: options.env }),
    ...(settings === undefined ? {} : { settings }),
    home,
    userHome,
    packageRoot,
  })
  return {
    root, home, workspace, second, userHome, packageRoot, created, writes,
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
  it('reports not-configured and offers onboarding before Config/env exists', async () => {
    const f = await fixture()
    const response = await f.route.fetch(get())
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      version: 1,
      configured: false,
      status: 'not-configured',
      onboarding: true,
    })
  })

  it('honors a deployment that turns onboarding off', async () => {
    const f = await fixture({ config: { onboarding: false } })
    expect(await (await f.route.fetch(get())).json()).toMatchObject({
      configured: false,
      status: 'not-configured',
      onboarding: false,
    })
  })

  it('registers the Config workspace without writing settings', async () => {
    const root = await mkdtemp(join(repoTmp, 'product-config-'))
    dirs.push(root)
    const workspace = join(root, 'workspace')
    const home = join(root, 'home')
    await mkdir(workspace)
    await mkdir(home)
    const created: string[] = []
    const writes: object[] = []
    const state = createProductState({
      registry: { create: async path => { created.push(path); return { id: 'ws-config', path } } },
      config: { workspaceDir: workspace },
      settings: { update: async (_namespace, patch) => { writes.push(patch) } },
      home,
      userHome: join(root, 'user-home'),
      packageRoot: join(root, 'package'),
    })
    const response = await createProductRoute(state).fetch(get())
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      version: 1,
      configured: true,
      status: 'ready',
      workspaceDir: workspace,
      workspaceId: 'ws-config',
      onboarding: true,
    })
    expect(created).toEqual([workspace])
    expect(writes).toEqual([])
  })

  it('lets the env override Config and persists it to the profile patch', async () => {
    const root = await mkdtemp(join(repoTmp, 'product-env-'))
    dirs.push(root)
    const workspace = join(root, 'workspace')
    const home = join(root, 'home')
    await mkdir(workspace)
    await mkdir(home)
    const writes: { namespace: string, patch: object }[] = []
    const state = createProductState({
      registry: { create: async path => ({ id: 'ws-env', path }) },
      config: {},
      env: { ASSISTANT_WORKSPACE: workspace },
      settings: { update: async (namespace, patch) => { writes.push({ namespace, patch }) } },
      home,
      userHome: join(root, 'user-home'),
      packageRoot: join(root, 'package'),
    })
    expect(await (await createProductRoute(state).fetch(get())).json()).toMatchObject({
      status: 'ready',
      workspaceDir: workspace,
      workspaceId: 'ws-env',
    })
    expect(writes).toEqual([{ namespace: 'assistant-product', patch: { workspaceDir: workspace } }])
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
      onboarding: true,
    })
    expect(f.writes).toEqual([{ namespace: 'assistant-product', patch: { workspaceDir: f.second } }])
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
    expect(f.created).toHaveLength(0)
    expect(f.writes).toHaveLength(0)
  })

  it('reports a Config path that disappeared as workspace-missing', async () => {
    const root = await mkdtemp(join(repoTmp, 'product-missing-'))
    dirs.push(root)
    const workspace = join(root, 'gone')
    const home = join(root, 'home')
    await mkdir(home)
    const state = createProductState({
      registry: { create: async path => ({ id: 'ws', path }) },
      config: { workspaceDir: workspace },
      home,
      userHome: join(root, 'user-home'),
      packageRoot: join(root, 'package'),
    })
    expect(await (await createProductRoute(state).fetch(get())).json()).toEqual({
      version: 1,
      configured: true,
      status: 'workspace-missing',
      workspaceDir: workspace,
      onboarding: true,
      error: 'workspace-missing',
    })
  })

  it('refuses a POST when the settings service is absent', async () => {
    const f = await fixture({ settings: null })
    const response = await f.route.fetch(post(JSON.stringify({ workspaceDir: f.second })))
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'settings-unavailable' })
  })

  it('keeps env-launched workspaces usable but reports a persistence failure', async () => {
    const root = await mkdtemp(join(repoTmp, 'product-env-nosettings-'))
    dirs.push(root)
    const workspace = join(root, 'workspace')
    const home = join(root, 'home')
    await mkdir(workspace)
    await mkdir(home)
    const state = createProductState({
      registry: { create: async path => ({ id: 'ws-env', path }) },
      env: { ASSISTANT_WORKSPACE: workspace },
      home,
      userHome: join(root, 'user-home'),
      packageRoot: join(root, 'package'),
    })
    expect(await (await createProductRoute(state).fetch(get())).json()).toMatchObject({
      status: 'ready',
      workspaceId: 'ws-env',
      error: 'settings-unavailable',
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
