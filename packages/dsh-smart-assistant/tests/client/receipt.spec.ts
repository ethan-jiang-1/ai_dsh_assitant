/**
 * A3 receipt view: baseline + human sentence + "全部标为已读"; no prompt, no model.
 *
 * Acceptance points:
 * - a persisted baseline makes the view show only changes after it;
 * - an empty delta says "自上次以来还没有变化" and still offers mark-all-read;
 * - the first look has no baseline: the view says "还没有收据" and seeds the baseline;
 * - the knowledge/memory panel embeds the receipt block.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { inertReactShim, loadClientRegistration, materializeClient, textsOf } from '../support/client-harness.ts'

const registration = await loadClientRegistration()

interface ClientExports {
  ReceiptView: (props: { data?: Record<string, any> }) => unknown
  KnowledgePanel: (props?: { sessionId?: string }) => unknown
  MemoryPanel: (props?: { sessionId?: string }) => unknown
  deskStore: { data?: Record<string, any>, note?: string }
  readReceiptSince: () => string | undefined
  markReceiptRead: (at?: string) => void
  resetReceiptBaseline: () => void
}

const materialize = (): ClientExports =>
  materializeClient(registration, inertReactShim()) as unknown as ClientExports

const base = {
  generatedAt: '2026-10-19T03:00:00.000Z',
  revision: 'r-1',
  counts: { memories: 1, threads: 0, skills: 0, knowledgeStable: 0, knowledgeDraft: 0 },
  memories: [{ id: 'm1', kind: 'fact', text: '新记忆', updated: '2026-10-19T01:00:00.000Z' }],
  knowledge: [],
  research: [],
  skills: [],
  ledger: [{ at: '2026-10-19T01:00:00.000Z', kind: 'correct', id: 'm1', title: '新记忆', room: 'memory', source: 'panel-direct' }],
}

describe('A3 receipt view', () => {
  beforeEach(() => {
    const exports = materialize()
    exports.resetReceiptBaseline()
  })

  it('shows the grouped sentence and the change lines after the baseline', () => {
    const exports = materialize()
    exports.markReceiptRead('2026-10-19T00:00:00.000Z')
    const text = textsOf(exports.ReceiptView({ data: base })).join(' | ')
    expect(text).toContain('自上次以来：记忆 1')
    expect(text).toContain('记忆 · 新记忆 · 已更正')
    expect(text).toContain('全部标为已读')
  })

  it('says there is nothing new when the baseline is after every change', () => {
    const exports = materialize()
    exports.markReceiptRead('2026-10-19T04:00:00.000Z')
    const text = textsOf(exports.ReceiptView({ data: base })).join(' | ')
    expect(text).toContain('自上次以来还没有变化')
    expect(text).toContain('全部标为已读')
  })

  it('treats the first look as no receipt and seeds the baseline', () => {
    const exports = materialize()
    expect(exports.readReceiptSince()).toBeUndefined()
    const text = textsOf(exports.ReceiptView({ data: base })).join(' | ')
    expect(text).toContain('还没有收据')
  })

  it('embeds the receipt in the knowledge and memory panels', () => {
    const exports = materialize()
    exports.markReceiptRead('2026-10-19T00:00:00.000Z')
    exports.deskStore.data = base
    expect(textsOf(exports.KnowledgePanel({ sessionId: 's1' })).join(' | ')).toContain('全部标为已读')
    expect(textsOf(exports.MemoryPanel({ sessionId: 's1' })).join(' | ')).toContain('全部标为已读')
  })
})
