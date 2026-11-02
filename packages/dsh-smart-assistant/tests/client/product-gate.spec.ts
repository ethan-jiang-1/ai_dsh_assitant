/**
 * The product gate in front of the dashboard (`src/client/product/product-gate.ts`).
 *
 * Acceptance points:
 * - A legacy face renders the wrapped dashboard unchanged (manual installs stay plain DSH).
 * - Onboarding withholds the dashboard and carries only the project picker — the retired
 *   「稍后」 escape must not come back (it unlocked the desk's own input lane).
 * - Ready shows the project bar, the one start action and the change action, with the
 *   dashboard under it.
 * - Recovery explains the unusable binding and offers a reselection.
 */
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { inertReactShim, loadClientRegistration, materializeClient, textsOf } from '../support/client-harness.ts'

const registration = await loadClientRegistration()

interface ClientExports {
  ProductGate: (props: { base: (props: unknown) => unknown, face: unknown }) => unknown
  createProductFace: () => unknown
  setProductFace: (face: unknown, next: Partial<{ binding: unknown, busy: boolean, error: string | undefined }>) => void
}

function materialize(): ClientExports {
  return materializeClient(registration, inertReactShim()) as unknown as ClientExports
}

const base = (): unknown => createElement('div', null, 'BASE-DASHBOARD')
const ONBOARDING = { version: 1, configured: false, status: 'not-configured' as const }
const READY = {
  version: 1, configured: true, status: 'ready' as const,
  workspaceDir: '/projects/assistant', workspaceId: 'ws-1',
}

describe('product gate over the dashboard', () => {
  it('renders the dashboard unchanged for a legacy face', () => {
    const surface = materialize()
    const face = surface.createProductFace()
    surface.setProductFace(face, { binding: undefined })
    expect(textsOf(surface.ProductGate({ base, face }))).toContain('BASE-DASHBOARD')
  })

  it('asks for a project on first run and offers no later escape', () => {
    const surface = materialize()
    const face = surface.createProductFace()
    surface.setProductFace(face, { binding: ONBOARDING })
    const texts = textsOf(surface.ProductGate({ base, face })).join('\n')
    expect(texts).toContain('选一个项目目录')
    expect(texts).toContain('选择项目目录')
    expect(texts).not.toContain('稍后')
    expect(texts).not.toContain('BASE-DASHBOARD')
  })

  it('shows the project bar, the one start action and the dashboard once bound', () => {
    const surface = materialize()
    const face = surface.createProductFace()
    surface.setProductFace(face, { binding: READY })
    const texts = textsOf(surface.ProductGate({ base, face })).join('\n')
    expect(texts).toContain('工作区 · assistant')
    expect(texts).toContain('开始一件事')
    expect(texts).toContain('换项目')
    expect(texts).toContain('BASE-DASHBOARD')
  })

  it('explains an unusable binding and offers a reselection', () => {
    const surface = materialize()
    const face = surface.createProductFace()
    surface.setProductFace(face, { binding: { version: 1, configured: true, status: 'workspace-missing', workspaceDir: '/gone' } })
    const texts = textsOf(surface.ProductGate({ base, face })).join('\n')
    expect(texts).toContain('上次的项目目录不在了')
    expect(texts).toContain('选择另一个目录')
    expect(texts).not.toContain('BASE-DASHBOARD')
  })
})
