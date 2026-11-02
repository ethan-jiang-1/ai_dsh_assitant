/**
 * The product face's shared state and operations (`src/client/product/product-face.ts`).
 *
 * Acceptance points:
 * - One route read per materialization: a 404 or an unexpected payload leaves the face legacy;
 *   a valid payload becomes the binding both surfaces render.
 * - A pick/POST round trip marks busy, persists the binding, and calls the caller's follow-up;
 *   a cancel or a refused POST leaves the binding untouched with a readable error.
 * - The composer-block applier blocks every listed Session while onboarding/recovery is up and
 *   clears exactly the Sessions it blocked when the face turns ready.
 * - The session-list subscription carries a Session created while unbound into the block.
 */
import { describe, expect, it } from 'vitest'
import {
  applyProductInputGate,
  chooseProductWorkspace,
  initProductFaceStore,
  loadProductFace,
  mountProductInputGate,
  productFaceState,
  setProductFace,
  startSessionInBinding,
  type ComposerBlockWriter,
} from '../../src/client/product/product-face.ts'
import type { ProductBinding, ProductGateRuntime } from '../../src/client/product/product-binding.ts'

const READY: ProductBinding = {
  version: 1,
  configured: true,
  status: 'ready',
  workspaceDir: '/tmp/project',
  workspaceId: 'ws-1',
}

const ONBOARDING: ProductBinding = { version: 1, configured: false, status: 'not-configured' }

function runtime(overrides: Partial<ProductGateRuntime> = {}): ProductGateRuntime {
  return {
    fetch: async () => ({ ok: false, status: 404, json: async () => undefined }) as unknown as Response,
    baseURI: () => 'http://localhost/',
    ...overrides,
  }
}

function recorder(): { writer: ComposerBlockWriter, writes: [string, { reason: string } | undefined][] } {
  const writes: [string, { reason: string } | undefined][] = []
  return {
    writes,
    writer: { set: (sessionId, block) => { writes.push([sessionId, block]) } },
  }
}

describe('product face store', () => {
  it('starts legacy and accepts a valid route payload', async () => {
    initProductFaceStore(runtime({
      fetch: async () => ({ ok: true, json: async () => READY }) as unknown as Response,
    }))
    expect(productFaceState().binding).toBeUndefined()
    await loadProductFace()
    expect(productFaceState().binding).toEqual(READY)
  })

  it('stays legacy for a 404 or an unexpected payload', async () => {
    for (const fetch of [
      async () => ({ ok: false, status: 404, json: async () => undefined }) as unknown as Response,
      async () => ({ ok: true, json: async () => ({ version: 2 }) }) as unknown as Response,
      async () => ({ ok: true, json: async () => undefined }) as unknown as Response,
    ]) {
      initProductFaceStore(runtime({ fetch }))
      await loadProductFace()
      expect(productFaceState().binding).toBeUndefined()
    }
  })

  it('survives a transport failure', async () => {
    initProductFaceStore(runtime({ fetch: async () => { throw new Error('offline') } }))
    await loadProductFace()
    expect(productFaceState().binding).toBeUndefined()
  })
})

describe('choosing a project directory', () => {
  it('picks, posts, stores the ready binding and runs the follow-up', async () => {
    const posted: unknown[] = []
    initProductFaceStore(runtime({
      pickDirectory: async () => '/tmp/project',
      fetch: async (input, init) => {
        posted.push({ url: String(input), body: init?.body })
        return { ok: true, json: async () => READY } as unknown as Response
      },
    }))
    let after: ProductBinding | undefined
    await chooseProductWorkspace(binding => { after = binding })
    expect(posted).toEqual([{ url: 'http://localhost/api/assistant/product', body: JSON.stringify({ workspaceDir: '/tmp/project' }) }])
    expect(productFaceState().binding).toEqual(READY)
    expect(productFaceState().busy).toBe(false)
    expect(after).toEqual(READY)
  })

  it('leaves the binding untouched when the picker is cancelled or absent', async () => {
    initProductFaceStore(runtime({ pickDirectory: async () => null }))
    await chooseProductWorkspace()
    expect(productFaceState().binding).toBeUndefined()
    expect(productFaceState().error).toBeUndefined()

    initProductFaceStore(runtime())
    await chooseProductWorkspace()
    expect(productFaceState().error).toContain('目录选择器')
  })

  it('turns a refused POST into the readable message for its stable code', async () => {
    initProductFaceStore(runtime({
      pickDirectory: async () => '/',
      fetch: async () => ({ ok: false, status: 400, json: async () => ({ error: 'workspace-forbidden' }) }) as unknown as Response,
    }))
    await chooseProductWorkspace()
    expect(productFaceState().binding).toBeUndefined()
    expect(productFaceState().error).toContain('不能作为项目')
  })

  it('reports an unreadable success payload instead of inventing a binding', async () => {
    initProductFaceStore(runtime({
      pickDirectory: async () => '/tmp/project',
      fetch: async () => ({ ok: true, json: async () => ({ version: 9 }) }) as unknown as Response,
    }))
    await chooseProductWorkspace()
    expect(productFaceState().binding).toBeUndefined()
    expect(productFaceState().error).toContain('没有登记成功')
  })

  it('opens a Session in the bound project through the runtime', () => {
    const started: string[] = []
    initProductFaceStore(runtime({ startSession: workspaceId => { started.push(workspaceId) } }))
    startSessionInBinding(READY)
    expect(started).toEqual(['ws-1'])
  })
})

describe('the composer input gate', () => {
  it('blocks every listed Session while onboarding is up and clears only what it blocked', () => {
    const { writer, writes } = recorder()
    const blocked = new Set<string>()

    applyProductInputGate(writer, ['a', 'b'], 'onboarding', 'reason', blocked)
    expect(writes).toEqual([['a', { reason: 'reason' }], ['b', { reason: 'reason' }]])
    expect([...blocked]).toEqual(['a', 'b'])

    applyProductInputGate(writer, ['a', 'b'], 'ready', undefined, blocked)
    expect(writes.slice(2)).toEqual([['a', undefined], ['b', undefined]])
    expect([...blocked]).toEqual([])
  })

  it('does nothing for legacy and ready faces', () => {
    const { writer, writes } = recorder()
    applyProductInputGate(writer, ['a'], 'legacy', undefined, new Set())
    applyProductInputGate(writer, ['a'], 'ready', undefined, new Set())
    expect(writes).toEqual([])
  })

  it('blocks a Session created while unbound through the list subscription', () => {
    const { writer, writes } = recorder()
    const listeners = new Set<() => void>()
    let ids: string[] = []
    initProductFaceStore()
    setProductFace({ binding: ONBOARDING })
    mountProductInputGate({
      sessions: {
        list: {
          getSnapshot: () => ({ ids }),
          subscribe: (listener) => { listeners.add(listener); return () => { listeners.delete(listener) } },
        },
      },
      effect: (install) => { install() },
    }, writer)

    ids = ['session-new']
    for (const listener of [...listeners]) listener()
    expect(writes).toContainEqual(['session-new', { reason: expect.stringContaining('项目目录') as unknown as string }])

    setProductFace({ binding: READY })
    expect(writes).toContainEqual(['session-new', undefined])
  })
})
