/**
 * The product gate's state machine: the route payload the client accepts and the surface each
 * state asks for. The component itself is covered by the entry registration and the web-face
 * scenes; these are the deterministic rules behind it.
 */
import { describe, expect, it } from 'vitest'
import { parseProductBinding, productGateView } from '../../src/client/product/product-gate.ts'

describe('product gate binding', () => {
  it('accepts the route shape, including optional workspace and error fields', () => {
    expect(parseProductBinding({
      version: 1,
      configured: true,
      status: 'ready',
      workspaceDir: '/abs/workspace',
      workspaceId: 'ws-1',
    })).toEqual({
      version: 1,
      configured: true,
      status: 'ready',
      workspaceDir: '/abs/workspace',
      workspaceId: 'ws-1',
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
      { version: 1, configured: true, status: 'ready', error: 42 },
    ]) {
      expect(parseProductBinding(value)).toBeUndefined()
    }
  })

  it('renders the existing dashboard for absent, unconfigured or pending bindings', () => {
    expect(productGateView(undefined)).toBe('legacy')
    expect(productGateView({ version: 1, configured: false, status: 'not-configured' })).toBe('legacy')
    expect(productGateView({ version: 1, configured: true, status: 'pending' })).toBe('legacy')
  })

  it('renders the workspace surface only when ready, and recovery when the binding is unusable', () => {
    expect(productGateView({ version: 1, configured: true, status: 'ready', workspaceId: 'ws' })).toBe('ready')
    expect(productGateView({ version: 1, configured: true, status: 'workspace-missing' })).toBe('recovery')
    expect(productGateView({ version: 1, configured: true, status: 'invalid' })).toBe('recovery')
  })
})
