/**
 * The Viki API key is a secret, so its source order is a contract: an environment variable wins
 * over the deprecated inline config value, and a custom `apiKeyEnv` is honored. The resolver is
 * pure, which lets the test prove the order without starting a server.
 */

import { describe, expect, it } from 'vitest'
import { DEFAULT_VIKI_API_KEY_ENV, resolveVikiApiKey } from '../../src/host/viki/auth.ts'

describe('resolveVikiApiKey', () => {
  it('prefers the environment over an inline config key', () => {
    expect(resolveVikiApiKey({ apiKey: 'inline-key' }, { [DEFAULT_VIKI_API_KEY_ENV]: 'env-key' })).toEqual({
      apiKey: 'env-key',
      source: 'env',
      envName: DEFAULT_VIKI_API_KEY_ENV,
    })
  })

  it('reads a custom apiKeyEnv and falls back to the inline key with its source named', () => {
    expect(resolveVikiApiKey({ apiKeyEnv: 'MY_OV_KEY', apiKey: 'inline-key' }, { MY_OV_KEY: 'custom-key' })).toEqual({
      apiKey: 'custom-key',
      source: 'env',
      envName: 'MY_OV_KEY',
    })
    expect(resolveVikiApiKey({ apiKeyEnv: 'MY_OV_KEY', apiKey: 'inline-key' }, {})).toEqual({
      apiKey: 'inline-key',
      source: 'config',
      envName: 'MY_OV_KEY',
    })
  })

  it('treats blank values as absent and reports no key', () => {
    expect(resolveVikiApiKey({ apiKey: '   ' }, { [DEFAULT_VIKI_API_KEY_ENV]: '   ' })).toEqual({
      source: 'none',
      envName: DEFAULT_VIKI_API_KEY_ENV,
    })
  })
})
