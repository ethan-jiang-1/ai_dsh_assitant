/**
 * Rendering smoke tests for the three desk panels.
 *
 * The browser half is a classic script (zero imports/exports — see its file header), so the test
 * installs the page-global facade, evaluates the script, then materializes the factory with a
 * module-table require stub. The panels read one shared store, which the factory exposes for
 * exactly this: fill it and every section renders without a browser.
 */
import { createElement } from 'react'
import { describe, expect, it } from 'vitest'

interface Registration {
  id: string
  factory: (require: (spec: string) => unknown) => Record<string, unknown>
}

const registrations: Registration[] = []
;(globalThis as Record<string, unknown>).__ModuleLoader__ = {
  load: (registration: Registration) => { registrations.push(registration) },
}
// @ts-expect-error TS2306 the browser half is intentionally not a module
await import('../src/client/index.ts')

/** Minimal hook shim: the panels use useState/useEffect, and these tests render one snapshot. */
const reactShim = {
  createElement,
  useState: <T,>(initial: T): [T, (next: T) => void] => [initial, () => {}],
  useEffect: (): void => {},
}

interface DeskStore {
  data?: Record<string, unknown> | undefined
  note?: string | undefined
  source?: string | undefined
  busy?: string | undefined
  listeners: Set<() => void>
}

interface PanelExports {
  DeskPanel: () => unknown
  KnowledgePanel: () => unknown
  MemoryPanel: () => unknown
  deskStore: DeskStore
}

function materialize(): PanelExports {
  const registration = registrations[0]
  if (registration === undefined) throw new Error('no registration was submitted')
  const exports = registration.factory((spec) => {
    if (spec === 'react') return reactShim
    throw new Error(`unexpected module-table require: ${spec}`)
  })
  return exports as unknown as PanelExports
}

/** Every string in a rendered element tree, for asserting on copy without a DOM. */
function textsOf(node: unknown): string[] {
  if (node === null || node === undefined || typeof node === 'boolean') return []
  if (typeof node === 'string') return [node]
  if (typeof node === 'number') return [String(node)]
  if (Array.isArray(node)) return node.flatMap(textsOf)
  const element = node as { type?: unknown, props?: { children?: unknown } }
  // A custom component is an element whose type is a function: invoke it the way React would, so
  // the rows the panels delegate to (CorrectableRow) contribute their copy to the tree.
  if (typeof element.type === 'function') {
    return textsOf((element.type as (props: unknown) => unknown)(element.props))
  }
  return element.props === undefined ? [] : textsOf(element.props.children)
}

describe('desk panels', () => {
  it('renders the desk sections from the shared store', () => {
    const exports = materialize()
    exports.deskStore.data = {
      generatedAt: '2026-09-26T13:00:00+08:00',
      counts: { memories: 7, knowledgeStable: 10, knowledgeDraft: 3, skills: 2, threads: 1 },
      decisions: [{ id: 'd1', question: '要不要授权读公司盘？', context: '读它才能定因' }],
      gaps: [{ id: 'g1', what: '本季度原始读数', why: '有它才能从框架走到定因' }],
      actions: [{
        id: 'a1', what: '填口径卡', owner: '你', due: '今天内',
        metric: '四个空格写全', stop: '两个口径结论相反就停', status: 'open',
      }],
      threads: [{ id: 't1', title: 'Q3 掉了 20%', lean: '先定口径', why: '口径未定则无法归因' }],
      recentActivity: [{ at: '2026-09-26T13:10:00+08:00', what: '按你的更正重写了一条记忆' }],
    }
    const text = textsOf(exports.DeskPanel()).join(' | ')

    expect(text).toContain('我的桌面')
    expect(text).toContain('等你决定')
    expect(text).toContain('要不要授权读公司盘？')
    // A decision is answerable in place, and can also be opened into options — the mirror of a
    // correction row (there the principal says what is wrong, here what they have decided).
    expect(text).toContain('回答')
    expect(text).toContain('看选项')
    // The action plan lives here instead of vanishing into the conversation: what, who, when,
    // how it is measured, and when to stop.
    expect(text).toContain('在办的事')
    expect(text).toContain('填口径卡')
    expect(text).toContain('负责人：你')
    expect(text).toContain('时点：今天内')
    expect(text).toContain('度量：四个空格写全')
    expect(text).toContain('停止条件：两个口径结论相反就停')
    expect(text).toContain('办完了')
    expect(text).toContain('缺什么')
    expect(text).toContain('本季度原始读数')
    expect(text).toContain('在跟的事')
    expect(text).toContain('Q3 掉了 20%')
    // The activity list answers "what have you been doing?" — the question a long-lived
    // assistant has to keep answering.
    // A thread carries the research room's exits where the principal sees it: ask, park, close.
    expect(text).toContain('问进展')
    expect(text).toContain('先放放')
    expect(text).toContain('收了')
    expect(text).toContain('它最近做了什么')
    expect(text).toContain('按你的更正重写了一条记忆')
    expect(text).toContain('先定口径')
    // The four counts, and the freshness line the principal uses to judge staleness. The stamp is
    // rendered in local time, so the expectation is computed the same way instead of hard-coded
    // (a fixed string would pass in one timezone and fail in another).
    expect(text).toContain('知识')
    expect(text).toContain('更新于')
    // The desk's quick actions: the whole-point-of-a-desk prompts, one click each.
    expect(text).toContain('回顾一下')
    expect(text).toContain('体检')
    const stamp = new Date('2026-09-26T13:00:00+08:00')
    const pad = (part: number): string => String(part).padStart(2, '0')
    expect(text).toContain(`${pad(stamp.getMonth() + 1)}-${pad(stamp.getDate())}`)
  })

  it('renders drafts before stable pages, with the approval action on drafts only', () => {
    const exports = materialize()
    exports.deskStore.data = {
      counts: { knowledgeDraft: 1 },
      knowledge: [
        { id: 'k1', title: 'management-lens-ceo', status: 'draft', type: 'source', sources: ['ai_dsh_company:kb/ceo/CHARTER.md'] },
        { id: 'k2', title: 'Agent preset semantics', status: 'stable', type: 'how-it-works' },
        { id: 'k3', title: 'old note', status: 'deprecated', type: 'concept' },
      ],
      skills: [
        { name: 'management-breakdown', description: 'how to break a business problem down', kind: 'curated' },
        { name: 'repo-to-knowledge', description: 'how to distill in-repo material', kind: 'learned' },
      ],
    }
    const text = textsOf(exports.KnowledgePanel()).join(' | ')

    expect(text).toContain('待你审批（1）')
    expect(text).toContain('已确认（1）')
    expect(text).toContain('management-lens-ceo')
    expect(text).toContain('批准')
    expect(text).toContain('有问题')
    // Two sources, split on purpose: what ships with the deployment, and what it picked up.
    expect(text).toContain('随包（1）')
    expect(text).toContain('学来的（1）')
    expect(text).toContain('management-breakdown')
    expect(text).toContain('repo-to-knowledge')
    // Lifecycle: a draft can be approved, a stable page can be retired, a deprecated one carries
    // no action (there is nothing left to decide about it).
    expect(text).toContain('过时了')
    expect(text).toContain('这技能有问题')
    expect(text).toContain('没用了')
    // Provenance is the trust line.
    expect(text).toContain('ai_dsh_company:kb/ceo/CHARTER.md')
    // Drafts lead: their title appears before the stable page's.
    expect(text.indexOf('management-lens-ceo')).toBeLessThan(text.indexOf('Agent preset semantics'))
  })

  it('renders the memory audit list with provenance and a correction action', () => {
    const exports = materialize()
    exports.deskStore.data = {
      counts: { memories: 1, threads: 1 },
      memories: [{
        id: 'm1',
        kind: 'fact',
        updated: '2026-09-26T05:10:02.454Z',
        text: '会话日志住在 sessions/<cwd>/<id>/ 下',
        source: '用户 2026-09-26 更正（补文件位置）',
      }],
    }
    const text = textsOf(exports.MemoryPanel()).join(' | ')

    expect(text).toContain('记忆室')
    expect(text).toContain('会话日志住在')
    expect(text).toContain('这条记错了')
    expect(text).toContain('用户 2026-09-26 更正')
    expect(text).toContain('fact')
  })

  it('warns when the desk file lags the conversation, and stays quiet when it does not', () => {
    const exports = materialize()
    exports.deskStore.data = { generatedAt: '2026-09-26T13:00:00+08:00' }

    // Five minutes of conversation after the file was written: the panel must not present a stale
    // snapshot as current.
    exports.deskStore.sessionUpdatedAt = new Date('2026-09-26T13:05:00+08:00').getTime()
    const stale = textsOf(exports.DeskPanel()).join(' | ')
    expect(stale).toContain('对话比这份桌面新')
    expect(stale).toContain('刷新桌面')

    // A file written within the same minute as the newest turn is current (the refresh itself
    // takes a moment; a minute of slack keeps the warning honest).
    exports.deskStore.sessionUpdatedAt = new Date('2026-09-26T13:00:30+08:00').getTime()
    const fresh = textsOf(exports.DeskPanel()).join(' | ')
    expect(fresh).not.toContain('对话比这份桌面新')
  })

  it('says so when there is nothing yet instead of rendering empty sections', () => {
    const exports = materialize()
    exports.deskStore.data = {}
    exports.deskStore.note = '最近 5 个会话的工作区里都没有 .desk/state.json'
    const desk = textsOf(exports.DeskPanel()).join(' | ')
    const knowledge = textsOf(exports.KnowledgePanel()).join(' | ')
    const memory = textsOf(exports.MemoryPanel()).join(' | ')

    expect(desk).toContain('（没有等你拍板的事）')
    expect(desk).toContain('（没有卡住的事）')
    expect(desk).toContain('（还没有可讲的变动）')
    expect(knowledge).toContain('（还没有知识页，或桌面文件尚未刷新）')
    expect(memory).toContain('（还没有记忆，或桌面文件尚未刷新）')
    // The loader's reason reaches every panel, so an empty page is explained rather than mute.
    expect(desk).toContain('没有 .desk/state.json')
  })
})
