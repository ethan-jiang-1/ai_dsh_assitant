/**
 * The session-trace report (`dev/reports/session-trace.mjs`) is the symptom -> session -> request
 * join. Two reported symptoms depend on modes added after the first release: "did my tool ride in
 * the request?" (the count alone cannot answer it, the names can) and "which session is mine?"
 * (`ls -t` points at someone else's conversation under parallel sessions — session-logs.mjs:78-82).
 * This spec drives the CLI against a synthetic home so both answers stay pinned.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, afterEach } from 'vitest'
import { temp, disposeTempDirs } from './verify-gates-harness.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const trace = join(repoRoot, 'dev', 'reports', 'session-trace.mjs')
const haveZstd = spawnSync('zstd', ['--version'], { encoding: 'utf8' }).status === 0

afterEach(disposeTempDirs)

/** Write one compressed session log under `<home>/sessions/<project>/session-<uuid>/`. */
function writeSession(home, project, id, events) {
  const dir = join(home, 'sessions', project, `session-${id}`)
  mkdirSync(dir, { recursive: true })
  const jsonl = events.map(event => JSON.stringify(event)).join('\n') + '\n'
  const compressed = spawnSync('zstd', ['-q', '-c'], { input: jsonl })
  if (compressed.status !== 0) throw new Error(`zstd failed: ${compressed.stderr}`)
  const log = join(dir, 'session.v4.jsonl.zstd')
  writeFileSync(log, compressed.stdout)
  return log
}

function run(args) {
  return spawnSync(process.execPath, [trace, ...args], { cwd: repoRoot, encoding: 'utf8' })
}

describe.skipIf(!haveZstd)('session-trace report', () => {
  it('names the tools that went out with the request (--tools), not just the count', () => {
    const home = temp('trace-home-')
    writeSession(home, '--proj--', 'aaa', [
      { type: 'session', id: 'session-aaa', createdAt: 1, cwd: '/work', agentPreset: 'assistant' },
      { type: 'turn/start', data: { turn: 1 } },
      { type: 'request/header', data: { header: { config: { model: 'm' }, tools: [{ name: 'assistant_memory' }, { name: 'bash' }] } } },
    ])
    const counted = run(['aaa', '--home', home])
    expect(counted.status).toBe(0)
    expect(counted.stdout).toContain('request: model=m tools=2')
    expect(counted.stdout).not.toContain('tools: assistant_memory')

    const named = run(['aaa', '--home', home, '--tools'])
    expect(named.status).toBe(0)
    expect(named.stdout).toContain('tools: assistant_memory bash')
  })

  it('shows the assembled system prompt by heading and size (--system)', () => {
    const home = temp('trace-home-')
    writeSession(home, '--proj--', 'ddd', [
      { type: 'session', id: 'session-ddd', createdAt: 1, cwd: '/work' },
      { type: 'system/message', data: { message: { content: [{ type: 'text', text: '# Operating manual\n\nbody line\n\n## Dated commitments\nmore\n' }] } } },
    ])
    const result = run(['ddd', '--home', home, '--system'])
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('system: ')
    expect(result.stdout).toContain('# Operating manual')
    expect(result.stdout).toContain('## Dated commitments')
    // Without the flag the prompt is not printed; the trace is for one question at a time.
    expect(run(['ddd', '--home', home]).stdout).not.toContain('# Operating manual')
  })

  it('lists candidate sessions with their cwd and time (--recent) instead of guessing "newest"', () => {
    const home = temp('trace-home-')
    writeSession(home, '--proj--', 'bbb', [
      { type: 'session', id: 'session-bbb', createdAt: 1, cwd: '/work/b', agentPreset: 'standard' },
    ])
    const result = run(['--recent', '5', '--home', home])
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('session-bbb')
    expect(result.stdout).toContain('/work/b')
    expect(result.stdout).toContain('standard')
  })

  it('still refuses to guess when a prefix is ambiguous', () => {
    const home = temp('trace-home-')
    for (const id of ['ccc1', 'ccc2']) {
      writeSession(home, '--proj--', id, [{ type: 'session', id: `session-${id}`, createdAt: 1, cwd: '/work' }])
    }
    const result = run(['ccc', '--home', home])
    expect(result.status).toBe(2)
    expect(result.stderr).toContain('matches 2 logs')
  })
})
