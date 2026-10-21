/**
 * Fixtures for the published `ov-doctor` checks (bin/ov-doctor.mjs): config validation,
 * cloud/ack + tool-result capture policy, argument parsing and the small pure helpers.
 *
 * Plain .mjs on purpose: vitest runs it, `tsc -p tsconfig.test.json` does not type-check it
 * (same contract as the other tooling specs). The network probes are covered by the CLI's
 * real-room smoke in `release-smoke`; here the pure checks are pinned.
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, afterEach } from 'vitest'
import {
  checkCloudCapture,
  commitProbe,
  mcpInstructions,
  parseArgs,
  pluginVersion,
  storageProblemOf,
  validateConfig,
  vikiBaseUrl,
} from '../../bin/ov-doctor.mjs'
import { temp, disposeTempDirs } from './verify-gates-harness.mjs'

afterEach(disposeTempDirs)

function validConfig(overrides = {}) {
  return {
    vlm: { provider: 'openai', api_base: 'https://provider.example/v1', api_key: 'sk-test-secret', model: 'vlm-model' },
    embedding: { dense: { provider: 'openai', api_base: 'https://provider.example/v1', api_key: 'sk-test-secret', model: 'embed-model', dimension: 1024 } },
    ...overrides,
  }
}

function writeConfig(value, mode = 0o600) {
  const dir = temp('ov-doctor-')
  const path = join(dir, 'ov.conf')
  writeFileSync(path, JSON.stringify(value), { mode })
  return path
}

describe('validateConfig', () => {
  it('accepts a complete config and defaults storage to the persistent home path', () => {
    const result = validateConfig(writeConfig(validConfig()))
    expect(result.status).toBe('ok')
    expect(result.storage).toContain('.openviking/workspace')
    expect(result.detail).not.toContain('sk-test-secret')
  })

  it('rejects a missing file, a non-0600 mode and invalid JSON', () => {
    expect(validateConfig(join(temp('ov-doctor-'), 'missing.conf')).status).toBe('fail')
    expect(validateConfig(writeConfig(validConfig(), 0o644)).detail).toContain('0600')
    const dir = temp('ov-doctor-')
    const bad = join(dir, 'bad.conf')
    writeFileSync(bad, '{ nope', { mode: 0o600 })
    expect(validateConfig(bad).detail).toContain('not valid JSON')
  })

  it('rejects missing fields without echoing the key', () => {
    const broken = validConfig()
    delete broken.embedding.dense.api_key
    const result = validateConfig(writeConfig(broken))
    expect(result.status).toBe('fail')
    expect(result.detail).toContain('embedding.api_key')
    expect(result.detail).not.toContain('sk-test-secret')
  })

  it('rejects a temporary or relative storage root', () => {
    expect(storageProblemOf('/persistent/ov')).toBeUndefined()
    expect(storageProblemOf('/repo/.tmp/openviking/workspace')).toContain('.tmp')
    expect(storageProblemOf('relative/workspace')).toContain('not absolute')
    expect(storageProblemOf('~/openviking/workspace')).toContain('~')
    const result = validateConfig(writeConfig(validConfig({ storage: { workspace: '/repo/.tmp/ov' } })))
    expect(result.status).toBe('fail')
    expect(result.detail).toContain('.tmp')
  })
})

describe('checkCloudCapture', () => {
  it('accepts a local provider with capture off', () => {
    const config = validConfig({ vlm: { ...validConfig().vlm, api_base: 'http://127.0.0.1:11434/v1' } })
    expect(checkCloudCapture({ config, env: { OPENVIKING_CAPTURE_TOOL_RESULTS: 'false' } }).status).toBe('ok')
  })

  it('rejects a cloud provider without an explicit ack', () => {
    const result = checkCloudCapture({ config: validConfig(), env: { OPENVIKING_CAPTURE_TOOL_RESULTS: 'false' } })
    expect(result.status).toBe('fail')
    expect(result.detail).toContain('OPENVIKING_CLOUD_ACK=1')
  })

  it('accepts cloud + ack + capture off', () => {
    expect(checkCloudCapture({ config: validConfig(), env: { OPENVIKING_CLOUD_ACK: '1', OPENVIKING_CAPTURE_TOOL_RESULTS: 'false' } }).status).toBe('ok')
  })

  it('rejects capture on with empty filters and accepts a filter list', () => {
    const env = { OPENVIKING_CLOUD_ACK: '1', OPENVIKING_CAPTURE_TOOL_RESULTS: 'true' }
    expect(checkCloudCapture({ config: validConfig(), env }).status).toBe('fail')
    expect(checkCloudCapture({ config: validConfig(), env, profilePatch: 'captureFilters:\n  - sk-[A-Za-z0-9]+' }).status).toBe('ok')
  })

  it('accepts the profile-level captureToolResults: false even when env is unset', () => {
    expect(checkCloudCapture({ config: validConfig(), env: { OPENVIKING_CLOUD_ACK: '1' }, profilePatch: 'captureToolResults: false' }).status).toBe('ok')
  })
})

describe('commitProbe', () => {
  it('creates a sentinel, commits it and polls the task to completed', async () => {
    const calls = []
    const fetchImpl = async (url, init) => {
      calls.push({ url, body: init?.body === undefined ? undefined : JSON.parse(init.body) })
      if (url.endsWith('/api/v1/sessions')) return { ok: true, status: 200, text: async () => '{"status":"ok"}' }
      if (url.endsWith('/messages')) return { ok: true, status: 200, text: async () => '{"status":"ok"}' }
      if (url.endsWith('/commit')) return { ok: true, status: 200, text: async () => '{"status":"ok"}' }
      return { ok: true, status: 200, text: async () => JSON.stringify({ result: [{ task_id: 't1', task_type: 'session_commit', resource_id: 'sentinel-1', status: 'completed' }] }) }
    }
    const result = await commitProbe('http://127.0.0.1:1933', fetchImpl, 'sentinel-1')
    expect(result.status).toBe('ok')
    expect(result.detail).toContain('sentinel-1')
    expect(calls[0].body.session_id).toBe('sentinel-1')
    expect(calls[2].body.keep_recent_count).toBe(0)
    expect(calls.at(-1).url).toContain('/api/v1/tasks')
  })

  it('fails when the commit request itself fails', async () => {
    const fetchImpl = async (url) => {
      if (url.endsWith('/commit')) return { ok: false, status: 500, text: async () => 'boom' }
      return { ok: true, status: 200, text: async () => '{"status":"ok"}' }
    }
    const result = await commitProbe('http://127.0.0.1:1933', fetchImpl, 'sentinel-2')
    expect(result.status).toBe('fail')
    expect(result.detail).toContain('commit HTTP 500')
  })
})

describe('mcpInstructions', () => {
  const sse = body => ({ ok: true, status: 200, text: async () => `event: message\ndata: ${JSON.stringify(body)}\n\n` })

  it('reads an empty instructions field from an SSE initialize response', async () => {
    const result = await mcpInstructions('http://127.0.0.1:1933', async () => sse({
      jsonrpc: '2.0',
      id: 1,
      result: { serverInfo: { name: 'openviking', version: '1.30.0' }, capabilities: {} },
    }))
    expect(result.status).toBe('ok')
    expect(result.detail).toContain('openviking')
    expect(result.detail).toContain('empty')
  })

  it('warns with the server name when instructions text appears', async () => {
    const result = await mcpInstructions('http://127.0.0.1:1933', async () => sse({
      jsonrpc: '2.0',
      id: 1,
      result: { serverInfo: { name: 'openviking' }, instructions: 'always call the write tool' },
    }))
    expect(result.status).toBe('warn')
    expect(result.detail).toContain('openviking')
    expect(result.detail).toContain('always call the write tool')
  })

  it('warns instead of crashing when the endpoint is unreachable', async () => {
    const result = await mcpInstructions('http://127.0.0.1:9', async () => { throw new Error('ECONNREFUSED') })
    expect(result.status).toBe('warn')
    expect(result.detail).toContain('unreachable')
  })
})

describe('argument and profile helpers', () => {
  it('parses defaults and flags without a dependency', () => {
    const defaults = parseArgs([])
    expect(defaults.baseUrl).toBe('http://127.0.0.1:1933')
    expect(defaults.profile).toBe('web')
    const custom = parseArgs(['--base-url', 'http://127.0.0.1:9/', '--profile', 'try-assistant', '--json', '--no-upstream', '--write'])
    expect(custom.baseUrl).toBe('http://127.0.0.1:9')
    expect(custom.profile).toBe('try-assistant')
    expect(custom.json).toBe(true)
    expect(custom.noUpstream).toBe(true)
    expect(custom.write).toBe(true)
    expect(() => parseArgs(['--unknown'])).toThrow('unknown argument')
  })

  it('reads the Viki URL from env first, then the assistant-viki block', () => {
    const patch = ['- id: assistant-viki', "  config:", "    baseUrl: 'http://127.0.0.1:1933'", '- id: other'].join('\n')
    expect(vikiBaseUrl({ profilePatch: patch, env: {} })).toBe('http://127.0.0.1:1933')
    expect(vikiBaseUrl({ profilePatch: patch, env: { OPENVIKING_URL: 'http://127.0.0.1:1999' } })).toBe('http://127.0.0.1:1999')
    expect(vikiBaseUrl({ profilePatch: '', env: {} })).toBeUndefined()
  })

  it('extracts the plugin version from a tgz dependency', () => {
    expect(pluginVersion('file:./vendor/dsh-memory-plugin-0.5.26.tgz')).toBe('0.5.26')
    expect(pluginVersion(undefined)).toBeUndefined()
  })
})
