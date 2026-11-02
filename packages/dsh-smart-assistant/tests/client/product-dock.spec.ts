/**
 * The product gate's conversation strip (`src/client/product/product-dock.ts`).
 *
 * Acceptance points:
 * - It renders nothing for a ready or legacy face (the strip must not add noise once bound).
 * - Onboarding explains the inert input and offers the one action; recovery offers the
 *   reselection copy; a failed operation shows its error under the strip.
 */
import { describe, expect, it } from 'vitest'
import { inertReactShim, loadClientRegistration, materializeClient, textsOf } from '../support/client-harness.ts'

const registration = await loadClientRegistration()

interface ClientExports {
  ProductGateDock: (props: { face: unknown }) => unknown
  createProductFace: () => unknown
  setProductFace: (face: unknown, next: Partial<{ binding: unknown, busy: boolean, error: string | undefined }>) => void
}

function materialize(): ClientExports {
  return materializeClient(registration, inertReactShim()) as unknown as ClientExports
}

const ONBOARDING = { version: 1, configured: false, status: 'not-configured' as const }
const READY = { version: 1, configured: true, status: 'ready' as const, workspaceId: 'ws-1' }

describe('product gate dock', () => {
  it('renders nothing once the project is bound or the face is legacy', () => {
    const surface = materialize()
    const face = surface.createProductFace()

    surface.setProductFace(face, { binding: READY })
    expect(surface.ProductGateDock({ face })).toBeNull()

    surface.setProductFace(face, { binding: undefined })
    expect(surface.ProductGateDock({ face })).toBeNull()
  })

  it('explains the inert input and offers the picker while unbound', () => {
    const surface = materialize()
    const face = surface.createProductFace()
    surface.setProductFace(face, { binding: ONBOARDING })
    const texts = textsOf(surface.ProductGateDock({ face })).join('\n')
    expect(texts).toContain('先选择一个项目目录')
    expect(texts).toContain('选择项目目录')
  })

  it('offers the reselection copy in the recovery state', () => {
    const surface = materialize()
    const face = surface.createProductFace()
    surface.setProductFace(face, { binding: { version: 1, configured: true, status: 'workspace-missing', workspaceDir: '/gone' } })
    const texts = textsOf(surface.ProductGateDock({ face })).join('\n')
    expect(texts).toContain('上次的项目目录不在了')
    expect(texts).toContain('选择另一个目录')
  })

  it('shows the last operation error under the strip', () => {
    const surface = materialize()
    const face = surface.createProductFace()
    surface.setProductFace(face, { binding: ONBOARDING, error: '这个目录不能作为项目。' })
    expect(textsOf(surface.ProductGateDock({ face })).join('\n')).toContain('这个目录不能作为项目。')
  })

  it('reports the busy state on the action', () => {
    const surface = materialize()
    const face = surface.createProductFace()
    surface.setProductFace(face, { binding: ONBOARDING, busy: true })
    expect(textsOf(surface.ProductGateDock({ face })).join('\n')).toContain('正在登记')
  })
})
