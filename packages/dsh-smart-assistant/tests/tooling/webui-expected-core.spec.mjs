/**
 * Fixtures for the web-face expected-comparison core (`dev/probes/web/webui-expected-core.mjs`,
 * test-strategy adoption slice 2). Every accepted and rejected shape is pinned here on
 * throwaway objects — the real snapshot scenario is never touched, and no capture runs.
 *
 * The end-to-end capture chain (real Chrome → shots → this core) is exercised by actually
 * running `pnpm web-expected` against the isolated home; its prove-it-red record lives in
 * the scenario README. This file owns what a real capture cannot cheaply prove: that each
 * ignored field is truly ignored, each compared field truly bites, unknown fields
 * surface instead of sneaking past, and — since the explicit-scenario gate (261020 audit
 * #8: the silent blank-only default left the banner scenario unverified after the S4
 * client refactor) — that scenario discovery stays honest and a bare invocation is
 * refused with the discovered list instead of quietly comparing one scenario.
 *
 * Deliberately plain .mjs, like the other tooling specs: vitest runs it, while
 * `tsc -p tsconfig.test.json` does not include non-TS files.
 */
import { homedir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { buildCaptureEvalArgs, buildMissingScenarioUsage, buildWaitSnippet, compareEvidence, discoverScenarios, normalizeDomEvidence } from '../../../../dev/probes/web/webui-expected-core.mjs'

describe('capture actions precede asynchronous content readiness', () => {
  it('forwards scene evals in order before the wait token', () => {
    const result = buildCaptureEvalArgs(['--eval', 'openConversation()', '--size', '1600x1000', '--eval', 'inspectBounds()'], '待审批')
    expect(result.slice(0, 4)).toEqual(['--eval', 'openConversation()', '--eval', 'inspectBounds()'])
    expect(result[4]).toBe('--eval')
    expect(result[5]).toContain("const needle = '待审批'")
    expect(buildCaptureEvalArgs([], undefined)).toEqual([])
  })
})

/** A minimal well-formed capture: complete, right viewport, empty failure lists. */
function evidence(overrides = {}) {
  return {
    title: 'DSH 本地构建',
    href: 'http://127.0.0.1:53108/?token=abc',
    lang: 'en-US',
    viewport: '1600x1000',
    pageHeight: 1000,
    screens: 1,
    readyState: 'complete',
    bootEntries: 67,
    capturedAt: '2026-10-20T12:00:00.000Z',
    elementCount: 600,
    visibleText: '章鱼管家\n新会话',
    textOutline: ['span h=24: 章鱼管家', 'span h=22: 新会话'],
    controls: ['button h=24: 新建会话', 'button h=28: 设置'],
    consoleErrors: [],
    networkFailures: [],
    ...overrides,
  }
}

describe('normalizeDomEvidence keeps only the compared contract', () => {
  it('drops every ignored field and keeps the compared ones', () => {
    const normalized = normalizeDomEvidence(evidence())
    for (const dropped of ['href', 'lang', 'elementCount', 'pageHeight', 'screens', 'bootEntries', 'capturedAt']) {
      expect(normalized).not.toHaveProperty(dropped)
    }
    expect(normalized.title).toBe('DSH 本地构建')
    expect(normalized.viewport).toBe('1600x1000')
    expect(normalized.readyState).toBe('complete')
    expect(normalized.visibleText).toBe('章鱼管家\n新会话')
  })

  it('tokenizes the per-serve origin inside compared strings', () => {
    const withFailure = evidence({ networkFailures: ['ERR_CONNECTION_REFUSED http://127.0.0.1:53108/combo'] })
    const normalized = normalizeDomEvidence(withFailure)
    expect(normalized.networkFailures[0]).toBe('ERR_CONNECTION_REFUSED {{origin}}/combo')
  })

  it('tokenizes the user home so a diagnostics config path is portable', () => {
    const normalized = normalizeDomEvidence(evidence({ visibleText: `config ${homedir()}/.openviking/ov.conf` }))
    expect(normalized.visibleText).toBe('config {{home}}/.openviking/ov.conf')
  })

  it('surfaces an unknown top-level field as unowned instead of silently dropping it', () => {
    const normalized = normalizeDomEvidence(evidence({ newShotsChannel: ['x'] }))
    expect(normalized.unowned).toEqual({ newShotsChannel: ['x'] })
  })

  it('rejects a non-object capture outright', () => {
    expect(() => normalizeDomEvidence(null)).toThrow(/must be a JSON object/)
    expect(() => normalizeDomEvidence([1, 2])).toThrow(/must be a JSON object/)
  })
})

describe('compareEvidence accepts the matching state and bites on every compared field', () => {
  it('passes when actual equals the expectation', () => {
    const problems = compareEvidence(normalizeDomEvidence(evidence()), normalizeDomEvidence(evidence()))
    expect(problems).toEqual([])
  })

  it('passes despite unbounded ignored-field drift (counts, port, locale)', () => {
    const drifted = evidence({ elementCount: 9999, pageHeight: 4321, href: 'http://127.0.0.1:9/?token=z', lang: 'zh-CN' })
    const problems = compareEvidence(normalizeDomEvidence(drifted), normalizeDomEvidence(evidence()))
    expect(problems).toEqual([])
  })

  it('bites on visible-text drift and names the change', () => {
    const problems = compareEvidence(
      normalizeDomEvidence(evidence({ visibleText: '章鱼管家\n再见' })),
      normalizeDomEvidence(evidence()),
    )
    expect(problems.some(p => p.startsWith('visibleText:'))).toBe(true)
    expect(problems.some(p => p.includes('新会话') && p.includes('再见'))).toBe(true)
  })

  it('bites when a control disappears', () => {
    const problems = compareEvidence(
      normalizeDomEvidence(evidence({ controls: ['button h=24: 新建会话'] })),
      normalizeDomEvidence(evidence()),
    )
    expect(problems.some(p => p.startsWith('controls:') && p.includes('missing'))).toBe(true)
  })

  it('bites on console errors — a blank state with console noise is a failure', () => {
    const problems = compareEvidence(
      normalizeDomEvidence(evidence({ consoleErrors: ['error: boom'] })),
      normalizeDomEvidence(evidence()),
    )
    expect(problems.some(p => p.startsWith('consoleErrors:'))).toBe(true)
  })

  it('bites when the capture is not fully loaded', () => {
    const problems = compareEvidence(
      normalizeDomEvidence(evidence({ readyState: 'interactive' })),
      normalizeDomEvidence(evidence()),
    )
    expect(problems.some(p => p.startsWith('readyState:'))).toBe(true)
  })

  it('bites when the capture geometry does not match the scenario', () => {
    const problems = compareEvidence(
      normalizeDomEvidence(evidence({ viewport: '420x900' })),
      normalizeDomEvidence(evidence()),
    )
    expect(problems.some(p => p.startsWith('viewport:'))).toBe(true)
  })
})

describe('buildWaitSnippet compiles a scene readiness token into a polling eval', () => {
  it('polls for the needle and resolves ready on sight', () => {
    const snippet = buildWaitSnippet('在等你审批')
    expect(snippet).toContain("'在等你审批'")
    expect(snippet).toContain('setInterval')
    expect(snippet).toContain('document.body.innerText.includes(needle)')
    expect(snippet).toContain("resolve('ready: ' + needle)")
  })

  it('times out by resolving, not rejecting — an absent token stays a content drift', () => {
    const snippet = buildWaitSnippet('no-such-thing', 15_000)
    expect(snippet).toContain('15000')
    expect(snippet).toContain("resolve('timeout: ' + needle)")
    expect(snippet).not.toContain('reject(')
  })

  it('escapes the needle so a quote in the token cannot break the snippet literal', () => {
    const snippet = buildWaitSnippet("boss' 决策")
    expect(snippet).toContain("\\' 决策")
  })
})

/** A Dirent-like entry, as readdirSync(root, { withFileTypes: true }) yields them. */
const dirent = (name, isDirectory = true) => ({ name, isDirectory: () => isDirectory })

describe('discoverScenarios lists only runnable scenario directories', () => {
  it('returns an empty list for an empty web-face root', () => {
    expect(discoverScenarios([], () => true)).toEqual([])
  })

  it('returns both scenario names, sorted, when the root holds two', () => {
    const names = discoverScenarios([dirent('first-open-draft-banner'), dirent('blank-first-open')], () => true)
    expect(names).toEqual(['blank-first-open', 'first-open-draft-banner'])
  })

  it('skips directories without a committed expectation, and non-directory entries entirely', () => {
    const names = discoverScenarios(
      [dirent('blank-first-open'), dirent('draft-notes'), dirent('README.md', false), dirent('.DS_Store', false)],
      name => name === 'blank-first-open',
    )
    expect(names).toEqual(['blank-first-open'])
  })
})

describe('buildMissingScenarioUsage refuses a bare run instead of guessing a scenario', () => {
  const names = ['blank-first-open', 'first-open-draft-banner']

  it('returns null for an explicit invocation — the gate must not touch it', () => {
    expect(buildMissingScenarioUsage('snapshots/web-face/first-open-draft-banner', names, 'snapshots/web-face')).toBeNull()
  })

  it('names every scenario, its contract README, and a copy-pasteable --scenario value', () => {
    const message = buildMissingScenarioUsage(undefined, names, 'snapshots/web-face')
    expect(message).toContain('--scenario snapshots/web-face/blank-first-open')
    expect(message).toContain('--scenario snapshots/web-face/first-open-draft-banner')
    for (const name of names) expect(message).toContain(`snapshots/web-face/${name}/README.md`)
  })

  it('prints the required-argument usage form, not an optional one', () => {
    const message = buildMissingScenarioUsage(undefined, names, 'snapshots/web-face')
    expect(message).toContain('usage: node dev/probes/web/webui-expected.mjs')
    expect(message).not.toContain('[--scenario')
  })

  it('states honestly when no runnable scenario exists', () => {
    const message = buildMissingScenarioUsage(undefined, [], 'snapshots/web-face')
    expect(message).toContain('no runnable scenarios')
  })
})
