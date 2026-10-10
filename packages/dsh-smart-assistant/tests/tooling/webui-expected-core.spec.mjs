/**
 * Fixtures for the web-face expected-comparison core (`dev/probes/web/webui-expected-core.mjs`,
 * test-strategy adoption slice 2). Every accepted and rejected shape is pinned here on
 * throwaway objects — the real snapshot scenario is never touched, and no capture runs.
 *
 * The end-to-end capture chain (real Chrome → shots → this core) is exercised by actually
 * running `pnpm web-expected` against the isolated home; its prove-it-red record lives in
 * the scenario README. This file owns what a real capture cannot cheaply prove: that each
 * ignored field is truly ignored, each compared field truly bites, and unknown fields
 * surface instead of sneaking past.
 *
 * Deliberately plain .mjs, like verify-gates.spec.mjs: vitest runs it, while
 * `tsc -p tsconfig.test.json` does not include non-TS files.
 */
import { describe, expect, it } from 'vitest'
import { buildCaptureEvalArgs, buildWaitSnippet, compareEvidence, normalizeDomEvidence } from '../../../../dev/probes/web/webui-expected-core.mjs'

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
    for (const dropped of ['href', 'lang', 'elementCount', 'pageHeight', 'screens', 'bootEntries']) {
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
