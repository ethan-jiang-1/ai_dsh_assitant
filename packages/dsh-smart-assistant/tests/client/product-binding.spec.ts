/**
 * The product binding's deterministic rules (`src/client/product/product-binding.ts`): the
 * route payload the client accepts, the surface each state asks for, and the reason/block
 * predicates the dock and the composer block share.
 */
import { describe, expect, it } from 'vitest'
import {
  parseProductBinding,
  productGateBlocks,
  productGateReason,
  productGateView,
} from '../../src/client/product/product-binding.ts'

describe('product gate binding', () => {
  it('accepts the route shape, including optional workspace, onboarding and error fields', () => {
    expect(parseProductBinding({
      version: 1,
      configured: true,
      status: 'ready',
      workspaceDir: '/abs/workspace',
      workspaceId: 'ws-1',
      onboarding: true,
    })).toEqual({
      version: 1,
      configured: true,
      status: 'ready',
      workspaceDir: '/abs/workspace',
      workspaceId: 'ws-1',
      onboarding: true,
    })
    expect(parseProductBinding({
      version: 1,
      configured: true,
      status: 'workspace-missing',
      workspaceDir: '/abs/gone',
      error: 'workspace-missing',
    })).toMatchObject({ status: 'workspace-missing', error: 'workspace-missing' })
  })

  it('rejects a wrong version, unknown status, wrong field types and non-objects', () => {
    for (const value of [
      null,
      [],
      { version: 2, configured: true, status: 'ready' },
      { version: 1, configured: 'yes', status: 'ready' },
      { version: 1, configured: true, status: 'loud' },
      { version: 1, configured: true, status: 'ready', workspaceDir: 42 },
      { version: 1, configured: true, status: 'ready', onboarding: 'yes' },
      { version: 1, configured: true, status: 'ready', error: 42 },
    ]) {
      expect(parseProductBinding(value)).toBeUndefined()
    }
  })

  it('renders the existing dashboard for absent, pending or onboarding-disabled bindings', () => {
    expect(productGateView(undefined)).toBe('legacy')
    expect(productGateView({ version: 1, configured: false, status: 'not-configured', onboarding: false })).toBe('legacy')
    expect(productGateView({ version: 1, configured: true, status: 'pending' })).toBe('legacy')
  })

  it('asks for onboarding when unconfigured and the product wants a first-run choice', () => {
    expect(productGateView({ version: 1, configured: false, status: 'not-configured' })).toBe('onboarding')
    expect(productGateView({ version: 1, configured: false, status: 'not-configured', onboarding: true })).toBe('onboarding')
  })

  it('renders the workspace surface only when ready, and recovery when the binding is unusable', () => {
    expect(productGateView({ version: 1, configured: true, status: 'ready', workspaceId: 'ws' })).toBe('ready')
    expect(productGateView({ version: 1, configured: true, status: 'workspace-missing' })).toBe('recovery')
    expect(productGateView({ version: 1, configured: true, status: 'invalid' })).toBe('recovery')
  })
})

describe('product gate copy and input withholding', () => {
  it('explains why input is inert only while the gate is up', () => {
    const onboarding = { version: 1, configured: false, status: 'not-configured' } as const
    const missing = { version: 1, configured: true, status: 'workspace-missing', workspaceDir: '/gone' } as const
    const invalid = { version: 1, configured: true, status: 'invalid', error: 'workspace-forbidden' } as const
    expect(productGateReason('onboarding', onboarding)).toContain('项目目录')
    expect(productGateReason('recovery', missing)).toContain('不在了')
    expect(productGateReason('recovery', invalid)).toContain('不可用')
    expect(productGateReason('ready', { version: 1, configured: true, status: 'ready' })).toBeUndefined()
    expect(productGateReason('legacy', undefined)).toBeUndefined()
  })

  it('withholds input for onboarding and recovery only', () => {
    expect(productGateBlocks('onboarding')).toBe(true)
    expect(productGateBlocks('recovery')).toBe(true)
    expect(productGateBlocks('ready')).toBe(false)
    expect(productGateBlocks('legacy')).toBe(false)
  })
})
