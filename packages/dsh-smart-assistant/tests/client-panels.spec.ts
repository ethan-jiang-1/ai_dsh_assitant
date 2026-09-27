/**
 * Rendering smoke tests for the three desk panels.
 *
 * The browser half is a classic script (zero imports/exports — see its file header), so the test
 * installs the page-global facade, evaluates the script, then materializes the factory with a
 * module-table require stub. The panels read one shared store, which the factory exposes for
 * exactly this: fill it and every section renders without a browser.
 */
import { describe, expect, it } from 'vitest'
import { inertReactShim, loadClientRegistration, materializeClient } from './client-harness.ts'

const registration = await loadClientRegistration()
/** The panels call useState/useEffect; these tests render one snapshot. */
const reactShim = inertReactShim()

interface DeskStore {
  data?: Record<string, unknown> | undefined
  note?: string | undefined
  source?: string | undefined
  pending?: { rowId: string, at: number, action: string } | undefined
  lastReceipt?: { rowId: string, action: string, at: number } | undefined
  /** An action that left but whose desk rewrite never arrived (R1). */
  stalled?: { rowId: string, at: number, action: string } | undefined
  readError?: string | undefined
  focusKnowledge?: 'drafts' | undefined
  misses: Set<string>
  /** The newest Session's updatedAt, so the panels can say when they lag the conversation. */
  sessionUpdatedAt?: number | undefined
  /** The Session whose workspace answered the last load — tab bodies withhold other sessions' data. */
  sourceSession?: string | undefined
  listeners: Set<() => void>
}

interface PanelExports {
  DeskPanel: () => unknown
  KnowledgePanel: () => unknown
  MemoryPanel: () => unknown
  /** Release the data gate when the poller gives up (R1). */
  expirePending: () => void
  /** Settle a pending/stalled row when a load reports the file moved past the send. */
  settlePending: (generatedAt: string | undefined) => void
  /** Retire a receipt whose decision is still open in the file (R11). */
  retireStaleReceipt: (data: Record<string, unknown> | undefined) => void
  DeskTabBody: (props: { sessionId?: string }) => unknown
  KnowledgeTabBody: (props: { sessionId?: string }) => unknown
  MemoryTabBody: (props: { sessionId?: string }) => unknown
  deskStore: DeskStore
}

function materialize(): PanelExports {
  return materializeClient(registration, reactShim) as unknown as PanelExports
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

/** True when the tree renders at least one element of this tag. */
function hasTag(node: unknown, tag: string): boolean {
  if (node === null || node === undefined || typeof node !== 'object') return false
  if (Array.isArray(node)) return node.some(child => hasTag(child, tag))
  const element = node as { type?: unknown, props?: { children?: unknown } }
  if (typeof element.type === 'function') {
    return hasTag((element.type as (props: unknown) => unknown)(element.props), tag)
  }
  if (element.type === tag) return true
  return hasTag(element.props === undefined ? [] : element.props.children, tag)
}

/** The first rendered button whose text is exactly `label`, or undefined. */
function findButton(node: unknown, label: string): { props: { onClick?: () => void } } | undefined {
  if (node === null || node === undefined || typeof node !== 'object') return undefined
  if (Array.isArray(node)) {
    for (const child of node) {
      const hit = findButton(child, label)
      if (hit !== undefined) return hit
    }
    return undefined
  }
  const element = node as { type?: unknown, props?: { children?: unknown } }
  if (typeof element.type === 'function') {
    return findButton((element.type as (props: unknown) => unknown)(element.props), label)
  }
  if (element.type === 'button' && textsOf(element).join('') === label) {
    return element as { props: { onClick?: () => void } }
  }
  return findButton(element.props === undefined ? [] : element.props.children, label)
}

/** Labels of the buttons rendered disabled — the busy freeze must be mechanical, not copy. */
function disabledButtonLabels(node: unknown): string[] {
  if (node === null || node === undefined || typeof node !== 'object') return []
  if (Array.isArray(node)) return node.flatMap(disabledButtonLabels)
  const element = node as { type?: unknown, props?: { children?: unknown, disabled?: unknown } }
  if (typeof element.type === 'function') {
    return disabledButtonLabels((element.type as (props: unknown) => unknown)(element.props))
  }
  const own = element.type === 'button' && element.props?.disabled === true ? textsOf(element) : []
  return [...own, ...disabledButtonLabels(element.props === undefined ? [] : element.props.children)]
}

/** Buttons rendered disabled — the busy freeze must be mechanical, not just a line of copy. */
function disabledButtons(node: unknown): number {
  if (node === null || node === undefined || typeof node === 'boolean') return 0
  if (Array.isArray(node)) return node.reduce((sum, child) => sum + disabledButtons(child), 0)
  const element = node as { type?: unknown, props?: { children?: unknown, disabled?: unknown } }
  if (typeof element.type === 'function') {
    return disabledButtons((element.type as (props: unknown) => unknown)(element.props))
  }
  let own = element.type === 'button' && element.props?.disabled === true ? 1 : 0
  return own + disabledButtons(element.props === undefined ? [] : element.props.children)
}

describe('desk panels', () => {
  it('renders the desk sections from the shared store', () => {
    const exports = materialize()
    exports.deskStore.data = {
      generatedAt: '2026-09-26T13:00:00+08:00',
      counts: { memories: 7, knowledgeStable: 10, knowledgeDraft: 3, skills: 2, threads: 1 },
      decisions: [
        // The first row is the assistant's own upkeep on purpose: the regression this pins is that
        // the lead card used to take decisions[0] and so promoted housekeeping to the principal.
        { id: 'd0', question: '培养面接着做深，还是先停一停？', context: '形态已定', kind: 'upkeep' },
        { id: 'd1', question: '要不要授权读公司盘？', context: '读它才能定因', kind: 'business', rank: 2 },
        { id: 'd2', question: '摘要预算怎么处置？', context: '3962/4096 贴顶', kind: 'business', rank: 1 },
      ],
      gaps: [{ id: 'g1', what: '本季度原始读数', why: '有它才能从框架走到定因' }],
      actions: [{
        id: 'a1', what: '填口径卡', owner: '你', due: '今天内',
        metric: '四个空格写全', stop: '两个口径结论相反就停', status: 'open',
      }, {
        id: 'a2', what: '季末破价承诺清零', owner: 'VP-Sales', due: '09-30 前', status: 'done',
      }],
      threads: [{ id: 't1', title: 'Q3 掉了 20%', lean: '先定口径', why: '口径未定则无法归因' }],
      recentActivity: [{ at: '2026-09-26T13:10:00+08:00', what: '按你的更正重写了一条记忆' }],
    }
    const text = textsOf(exports.DeskPanel()).join(' | ')

    expect(text).toContain('我的桌面')
    // Real-use feedback (2026-09-26): a pile of equal rows never says where to start — the desk
    // answers with ONE lead item. Reviews (2026-09-26) added the second half of the rule: the lead
    // must be the principal's BUSINESS (kind + rank), never whatever the model wrote first.
    expect(text).toContain('从这开始')
    expect(text).toContain('先办这件')
    expect(text).toContain('摘要预算怎么处置？')            // rank 1 wins
    expect(text).not.toContain('要不要授权读公司盘？')      // folded: business, not the lead
    expect(text).not.toContain('培养面接着做深')            // upkeep never reaches the lead card
    expect(text).toContain('等你决定（还有 1 条）')
    expect(text).toContain('助手自己的事（1）')
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
    // Actions split by state: open ones are the working surface, done ones move to a dimmed
    // follow-through group — a tracker that hides finished work hides the assistant's follow-through.
    expect(text).toContain('在办的事（1）')
    expect(text).toContain('已办（1）')
    expect(text).toContain('✓ 季末破价承诺清零')
    // A closed row carries no close-out buttons: only the open one offers 办完了/不办了.
    expect(text.split('办完了').length - 1).toBe(1)
    expect(text.split('不办了').length - 1).toBe(1)
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
    // Skills are a count, not a list: the principal cannot judge them, and their descriptions are
    // model-facing English (repository rule) — content eligibility before layout (2026-09-26 reviews).
    expect(text).toContain('共 2 件（随包 1 · 学来的 1）')
    expect(text).not.toContain('management-breakdown')
    expect(text).not.toContain('repo-to-knowledge')
    // Lifecycle: a draft can be approved, a stable page can be retired, a deprecated one carries
    // no action (there is nothing left to decide about it).
    expect(text).toContain('过时了')
    // Provenance is the trust line.
    expect(text).toContain('ai_dsh_company:kb/ceo/CHARTER.md')
    // Drafts lead: their title appears before the stable page's.
    expect(text.indexOf('management-lens-ceo')).toBeLessThan(text.indexOf('Agent preset semantics'))
  })

  it('renders the memory audit list with provenance and a correction action', () => {
    const exports = materialize()
    exports.deskStore.data = {
      counts: { memories: 1, threads: 1 },
      memories: [
        {
          id: 'm1',
          kind: 'fact',
          updated: '2026-09-26T05:10:02.454Z',
          text: '会话日志住在 sessions/<cwd>/<id>/ 下',
          source: '用户 2026-09-26 更正（补文件位置）',
        },
        { id: 'm2', kind: 'preference', updated: '2026-09-25T10:00:00.000Z', text: '结论先行，别铺垫' },
        { id: 'm3', kind: 'decision', updated: '2026-09-25T11:00:00.000Z', text: 'dev home 只用于开发' },
        { id: 'm4', kind: 'other', updated: '2026-09-25T12:00:00.000Z', text: '一条未分类的记录' },
      ],
    }
    const text = textsOf(exports.MemoryPanel()).join(' | ')

    expect(text).toContain('记忆室')
    expect(text).toContain('会话日志住在')
    expect(text).toContain('这条记错了')
    expect(text).toContain('用户 2026-09-26 更正')
    // Grouped by what the record is about — how the principal works versus the world it learned.
    expect(text).toContain('你的偏好（1）')
    expect(text).toContain('你的决定（1）')
    expect(text).toContain('事实（1）')
    expect(text).toContain('其它（1）')
    // Preferences lead: the digital twin's core is knowing how the principal works.
    expect(text.indexOf('你的偏好')).toBeLessThan(text.indexOf('事实（1）'))
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

    expect(desk).toContain('目前没有需要你拍板的经营事项')
    expect(desk).toContain('（没有卡住的事）')
    expect(desk).toContain('（还没有可讲的变动）')
    expect(knowledge).toContain('（还没有知识页，或桌面文件尚未刷新）')
    expect(memory).toContain('（还没有记忆，或桌面文件尚未刷新）')
    // The loader's reason reaches every panel, so an empty page is explained rather than mute.
    expect(desk).toContain('没有 .desk/state.json')
  })

  it('gives every gap an in-place way to supply the missing reading (R5)', () => {
    const exports = materialize()
    exports.deskStore.data = {
      generatedAt: '2026-09-27T12:00:00+08:00',
      gaps: [{ id: 'g1', what: '「20%」的原始读数', why: '没有它就没有基线' }],
    }
    const desk = textsOf(exports.DeskPanel()).join(' | ')
    expect(desk).toContain('「20%」的原始读数')
    expect(desk).toContain('没有它就没有基线')
    // Before R5 the gap was inert text: the one thing only the principal could supply had no
    // control at all, and the desk told him to go back to the conversation.
    expect(findButton(exports.DeskPanel(), '补上')).toBeDefined()
  })

  it('leads with an options-bearing decision when no business decision is waiting (R4)', () => {
    const exports = materialize()
    // The live shape that motivated R4: every decision filed as upkeep, but one of them carries the
    // options only the principal can pick. Before the fix the card said nothing needed his call.
    exports.deskStore.data = {
      generatedAt: '2026-09-27T12:00:00+08:00',
      decisions: [
        { id: 'u1', kind: 'upkeep', question: '两张知识页 draft：批准还是提意见？只有你能把草案变定稿', options: [{ label: '批准两张' }, { label: '先看再定' }] },
        { id: 'u2', kind: 'upkeep', question: '培养面接着做深，还是先停一停？' },
      ],
    }
    const desk = textsOf(exports.DeskPanel()).join(' | ')
    expect(desk).toContain('先办这件')
    expect(desk).toContain('只有你能把草案变定稿')
    expect(desk).not.toContain('目前没有需要你拍板的经营事项')
    // …and the same row is not also folded below.
    expect(desk).toContain('助手自己的事（1）')
  })

  it('keeps the honest empty state when neither business nor options are waiting (R4)', () => {
    const exports = materialize()
    exports.deskStore.data = {
      generatedAt: '2026-09-27T12:00:00+08:00',
      decisions: [{ id: 'u1', kind: 'upkeep', question: '我自己的配置待定' }],
    }
    const desk = textsOf(exports.DeskPanel()).join(' | ')
    expect(desk).toContain('目前没有需要你拍板的经营事项')
    expect(desk).toContain('助手自己的事（1）')
    expect(desk).not.toContain('先办这件')
  })

  it('binds each tab body to its own session instead of showing another session’s desk', () => {
    const exports = materialize()
    exports.deskStore.data = { counts: { memories: 7 } }
    // The store currently holds session s1's desk; a tab living in session s2 must not present it.
    exports.deskStore.sourceSession = 's1'
    const foreign = textsOf(exports.DeskTabBody({ sessionId: 's2' })).join(' | ')
    expect(foreign).toContain('正在读这个会话的桌面…')
    expect(foreign).not.toContain('我的桌面')

    // The matching session renders the full room, exactly like the main page.
    const own = textsOf(exports.DeskTabBody({ sessionId: 's1' })).join(' | ')
    expect(own).toContain('我的桌面')
    expect(own).toContain('从这开始')
    expect(own).toContain('目前没有需要你拍板的经营事项')

    // The other rooms bind the same way.
    const knowledge = textsOf(exports.KnowledgeTabBody({ sessionId: 's1' })).join(' | ')
    expect(knowledge).toContain('知识室')
    const memory = textsOf(exports.MemoryTabBody({ sessionId: 's1' })).join(' | ')
    expect(memory).toContain('记忆室')
  })

  it('says so when a tab is not mounted inside any session', () => {
    const exports = materialize()
    const text = textsOf(exports.DeskTabBody({})).join(' | ')
    expect(text).toContain('没有落在任何会话')
  })

  it('gives the bound tab an error-with-retry and an empty-state refresh button, not an eternal "reading"', () => {
    const exports = materialize()
    // A5: a corrupt file is an error with a way out.
    exports.deskStore.readError = '桌面文件损坏（JSON 解析失败）'
    const broken = textsOf(exports.DeskTabBody({ sessionId: 's1' })).join(' | ')
    expect(broken).toContain('读桌面文件失败')
    expect(broken).toContain('让助手重写一份')
    // A6: the empty state is exactly the state that needs a one-click refresh.
    exports.deskStore.readError = undefined
    exports.deskStore.misses.add('s1')
    const empty = textsOf(exports.DeskTabBody({ sessionId: 's1' })).join(' | ')
    expect(empty).toContain('还没有 .desk/state.json')
    expect(empty).toContain('刷新桌面')
  })

  it('presents the three rooms as three QUESTIONS and lands the draft pointer on the drafts (S4)', () => {
    const exports = materialize()
    exports.deskStore.data = {
      generatedAt: '2026-09-26T13:00:00+08:00',
      counts: { knowledgeDraft: 2 },
      knowledge: [
        { id: 'k1', title: 'draft-1', status: 'draft' },
        { id: 'k2', title: 'draft-2', status: 'draft' },
        { id: 'k3', title: 'stable-1', status: 'stable' },
      ],
      memories: [{ id: 'm1', kind: 'fact', text: '一条记录' }],
    }
    // The rooms keep their names but each opens with the question it answers (user ruling:
    // keep the entries, change the semantics).
    const desk = textsOf(exports.DeskPanel()).join(' | ')
    const knowledge = textsOf(exports.KnowledgePanel()).join(' | ')
    const memory = textsOf(exports.MemoryPanel()).join(' | ')
    expect(desk).toContain('现在要采取什么行动？')
    expect(knowledge).toContain('你凭什么这样判断？')
    expect(memory).toContain('你把我理解成什么？')
    // The desk's draft pointer sends the principal over; the room highlights the very block
    // they were pointed at (selectPanel takes only a room id — the flag is the anchor).
    exports.deskStore.focusKnowledge = 'drafts'
    const focused = textsOf(exports.KnowledgePanel()).join(' | ')
    expect(focused).toContain('↑ 你从桌面点过来的那批')
    expect(focused).toContain('draft-1')
  })

  it('shows a first-open landing guide when no desk file exists, and the source line explains itself (S6)', () => {
    const exports = materialize()
    // No file at all → the panel says what it is and how to get in — the principal's real first
    // reaction (2026-09-26 trial) was "不知道怎么落脚，不知道要干什么".
    exports.deskStore.data = undefined
    exports.deskStore.note = '最近 5 个会话的工作区里都没有 .desk/state.json'
    const empty = textsOf(exports.DeskPanel()).join(' | ')
    expect(empty).toContain('第一次来这里？')
    expect(empty).toContain('在旁边的对话里跟助手说句话')
    expect(empty).toContain('这里是你的仪表盘')
    // With data → the workspace line explains the follow-the-conversation rule, not a raw path.
    exports.deskStore.data = { generatedAt: '2026-09-26T13:00:00+08:00' }
    exports.deskStore.source = '/Users/somewhere/company'
    exports.deskStore.note = undefined
    const filled = textsOf(exports.DeskPanel()).join(' | ')
    expect(filled).toContain('桌面跟随当前对话的工作区')
    expect(filled).toContain('换一个对话，桌面跟着换')
    expect(filled).not.toContain('第一次来这里？')
  })

  it('an answered decision stops looking answerable — read-only with a reversal hint (S7)', () => {
    const exports = materialize()
    exports.deskStore.data = {
      generatedAt: '2026-09-26T22:40:00+08:00',
      decisions: [{ id: 'd1', question: '季末破价例外签单？', kind: 'business',
        options: [{ label: '守默认' }, { label: '允许例外' }] }],
    }
    // Answered and settled: the row carries its receipt and a reversal path — but no buttons.
    exports.deskStore.lastReceipt = { rowId: 'd1', action: '回答', at: new Date('2026-09-26T22:43:07+08:00').getTime() }
    const settled = textsOf(exports.DeskPanel()).join(' | ')
    expect(settled).toContain('✓ 已更新')
    expect(settled).toContain('已回答——改主意？在对话里说一声')
    expect(settled).not.toContain('看选项')
    expect(settled).not.toContain('守默认')   // option buttons gone too
    // In flight: read-only from the click, but it says ONE thing — the in-flight line. The 已回答 line
    // is what replaces it once the file moves (R11, narrow review 2026-09-27: the two used to
    // co-render, so a just-answered row simultaneously claimed "已回答" and "正在处理").
    exports.deskStore.lastReceipt = undefined
    exports.deskStore.pending = { rowId: 'd1', at: new Date('2026-09-26T22:40:39+08:00').getTime(), action: '回答' }
    const inFlight = textsOf(exports.DeskPanel()).join(' | ')
    expect(inFlight).toContain('已交给助手')
    expect(inFlight).not.toContain('已回答——改主意？')
    expect(inFlight).not.toContain('允许例外')
  })

  it('carries the freshness warning in every room, not only the desk (A7)', () => {
    const exports = materialize()
    exports.deskStore.data = {
      generatedAt: '2026-09-26T13:00:00+08:00',
      counts: { memories: 1 },
      memories: [{ id: 'm1', kind: 'fact', text: '一条记录' }],
    }
    exports.deskStore.sessionUpdatedAt = new Date('2026-09-26T13:05:00+08:00').getTime()
    const knowledge = textsOf(exports.KnowledgePanel()).join(' | ')
    const memory = textsOf(exports.MemoryPanel()).join(' | ')
    expect(knowledge).toContain('对话比这份桌面新')
    expect(memory).toContain('对话比这份桌面新')
  })

  it('freezes actions behind the DATA GATE — queue acceptance is not completion (real use queued one decision three times and left an action with seven contradictory orders)', () => {
    const exports = materialize()
    exports.deskStore.data = {
      generatedAt: '2026-09-26T13:00:00+08:00',
      decisions: [{ id: 'd1', question: '要不要授权读公司盘？', context: '读它才能定因', kind: 'business' }],
      // A row that carries action buttons, so "the gate is mechanical" can be asserted on a row
      // button rather than on the escape hatch (which must stay live — see below).
      actions: [{ id: 'a1', what: '季末守住纪律', status: 'open' }],
    }
    // The action left AFTER the file was last written → still in flight: buttons frozen, the
    // receipt lands on the row that was acted on. (The old freeze lifted when the queue accepted
    // the message — milliseconds — which is exactly why three clicks queued three prompts.)
    exports.deskStore.pending = { rowId: 'd1', at: new Date('2026-09-26T13:05:00+08:00').getTime(), action: '回答' }
    const inFlight = textsOf(exports.DeskPanel()).join(' | ')
    expect(inFlight).toContain('已交给助手')
    expect(inFlight).toContain('正在处理')
    expect(inFlight).toContain('回复出现在对话里')
    // S7: the answered row is read-only — no answer buttons AT ALL (stronger than frozen).
    expect(inFlight).not.toContain('看选项')
    // The gate is mechanical, on every row button the panel renders…
    const frozen = disabledButtonLabels(exports.DeskPanel())
    expect(frozen.length).toBeGreaterThanOrEqual(1)
    expect(frozen).toContain('办完了')
    // …and the escape hatch is NOT one of them: a frozen surface whose 刷新桌面 is disabled by the
    // same flag has no way out at all (self-review R1, 2026-09-27 — the live desk sat 13 h stale
    // behind exactly that combination).
    expect(frozen).not.toContain('刷新桌面')

    // The desk file is rewritten past the send → the gate lifts and the row carries its receipt.
    exports.deskStore.pending = undefined
    exports.deskStore.lastReceipt = { rowId: 'd1', action: '回答', at: new Date('2026-09-26T13:06:30+08:00').getTime() }
    exports.deskStore.data = { ...exports.deskStore.data, generatedAt: '2026-09-26T13:06:00+08:00' }
    const settled = textsOf(exports.DeskPanel()).join(' | ')
    expect(settled).toContain('✓ 已更新')
    expect(disabledButtons(exports.DeskPanel())).toBe(0)
  })

  it('releases the frozen surface and says so when the assistant never rewrites the desk (R1)', () => {
    const exports = materialize()
    exports.deskStore.data = {
      generatedAt: '2026-09-26T13:00:00+08:00',
      actions: [{ id: 'a1', what: '季末守住纪律', status: 'open' }],
    }
    const sentAt = new Date('2026-09-27T10:00:00+08:00').getTime()
    exports.deskStore.pending = { rowId: 'a1', at: sentAt, action: '办完了' }
    expect(disabledButtonLabels(exports.DeskPanel())).toContain('办完了')

    // The poller's re-read budget runs out; expiry is the release valve. Before R1 the pending
    // flag stayed set forever, so every action button in all three rooms stayed dead while still
    // claiming "正在处理", and 刷新桌面 — the only way out — was disabled by that same flag.
    exports.expirePending()

    expect(exports.deskStore.pending).toBeUndefined()
    const after = textsOf(exports.DeskPanel()).join(' | ')
    expect(after).not.toContain('正在处理')
    // The row keeps an honest, durable state: the action left, the desk did not catch up. Silence
    // would read as "done", and a transient note is wiped by the next successful load.
    expect(after).toContain('桌面还没跟上')
    expect(after).toContain('点「刷新桌面」再试')
    expect(exports.deskStore.stalled?.rowId).toBe('a1')
    expect(disabledButtonLabels(exports.DeskPanel())).toEqual([])

    // …and the desk file finally moving past the send settles that row.
    exports.deskStore.data = { ...exports.deskStore.data, generatedAt: '2026-09-27T10:05:00+08:00' }
    exports.settlePending('2026-09-27T10:05:00+08:00')
    expect(exports.deskStore.stalled).toBeUndefined()
    expect(textsOf(exports.DeskPanel()).join(' | ')).toContain('✓ 已更新')
  })

  it('keeps every text colour in the client at or above AA on white (R8/R11)', async () => {
    // A source-level guard, because the first R8 sweep missed two colours and only a reviewer caught
    // them (R11, narrow review 2026-09-27). Anything the component tests cannot see, this can.
    const { readFileSync } = await import('node:fs')
    const source = readFileSync(new URL('../src/client/index.ts', import.meta.url), 'utf8')
    const luminance = (colour: string): number => {
      const hex = colour.replace('#', '')
      const channels = [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16) / 255)
      const linear = channels.map(value => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
      return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!
    }
    const contrastOnWhite = (colour: string): number => (1.05) / (luminance(colour) + 0.05)
    const literals = [...source.matchAll(/color:\s*'(#[0-9a-fA-F]{6})'/g)].map(match => match[1] as string)
    const below = [...new Set(literals)].filter(colour => contrastOnWhite(colour) < 4.5)
    expect(literals.length).toBeGreaterThan(3)
    expect(below).toEqual([])
  })

  it('lets a decision be answered again when the file still carries it (R11)', () => {
    const exports = materialize()
    const data = { generatedAt: '2026-09-27T12:00:00+08:00', decisions: [{ id: 'd1', question: '季末破价例外？' }] }
    exports.deskStore.data = data
    exports.deskStore.lastReceipt = { rowId: 'd1', action: '回答', at: new Date('2026-09-27T11:00:00+08:00').getTime() }
    // The assistant re-opened the row (or the answer never landed): the file still lists it, so the
    // receipt's "已回答" claim is stale and the row must be answerable again.
    exports.retireStaleReceipt(data)
    expect(exports.deskStore.lastReceipt).toBeUndefined()
    // But a receipt for a row the file no longer carries stands: that is what "recorded" looks like.
    exports.deskStore.lastReceipt = { rowId: 'd1', action: '回答', at: Date.now() }
    exports.retireStaleReceipt({ generatedAt: '2026-09-27T12:05:00+08:00', decisions: [] })
    expect(exports.deskStore.lastReceipt).toBeDefined()
  })

  it('gives an id-less row a stable identity from its own text (R11)', () => {
    const exports = materialize()
    exports.deskStore.data = {
      generatedAt: '2026-09-27T12:00:00+08:00',
      threads: [{ title: '口径问题', lean: '等你定' }, { title: '另一条线索', lean: '也在等' }],
    }
    // Two id-less threads used to collapse onto the literal "undefined": one gate and one receipt
    // covered both rows at once.
    exports.deskStore.pending = { rowId: '口径问题', at: Date.now(), action: '问进展' }
    const desk = textsOf(exports.DeskPanel()).join(' | ')
    expect(desk).toContain('口径问题')
    // The refresh row carries a global "an action is in flight" line, so the row-level marker is the
    // one that must appear exactly once: only the thread whose identity matches is frozen.
    expect(desk.match(/正在处理/g)?.length).toBe(1)
    expect(desk.match(/已交给助手/g)?.length).toBe(2)
  })

  it('keeps a durable trace of what was dropped and flags a status it cannot read (R9)', () => {
    const exports = materialize()
    exports.deskStore.data = {
      generatedAt: '2026-09-27T12:00:00+08:00',
      actions: [
        { id: 'a1', what: '季末守住纪律', status: 'open' },
        { id: 'a2', what: '起草回话模板', status: 'dropped', note: '你 22:44 说不做了：口径变了' },
        { id: 'a3', what: '门槛缺口一页纸', status: 'in-flight' },
      ],
    }
    const desk = textsOf(exports.DeskPanel()).join(' | ')
    // A dropped action used to render nowhere: the principal clicked 不办了 and the surface he acted
    // on kept no trace of it.
    expect(desk).toContain('已撤（1）')
    expect(desk).toContain('✕ 起草回话模板')
    expect(desk).toContain('你 22:44 说不做了：口径变了')
    // …and a status this surface does not know says so instead of rendering as in-flight.
    expect(desk).toContain('（状态「in-flight」不在面板认识的集合里）')
  })

  it('makes an actionable count a real button and marks a non-open thread (R9)', () => {
    const exports = materialize()
    exports.deskStore.data = {
      generatedAt: '2026-09-27T12:00:00+08:00',
      counts: { memories: 7 },
      threads: [{ id: 't1', title: '口径问题', status: 'parked', lean: '等你定' }],
    }
    const panel = exports.DeskPanel()
    // The count used to be an onClick div with no role and no tab stop: mouse-only.
    expect(findButton(panel, '7记忆')).toBeDefined()
    // A parked thread used to return to 在跟的事 looking exactly like a live one.
    expect(textsOf(panel).join(' | ')).toContain('（状态：parked）')
  })

  it('draws its controls at the 24px target and its text at AA contrast (R8)', () => {
    const exports = materialize()
    exports.deskStore.data = {
      generatedAt: '2026-09-27T12:00:00+08:00',
      actions: [{ id: 'a1', what: '季末守住纪律', status: 'open', note: '它记：22:41 曾按允许例外改写，22:43 随口径回退' }],
    }
    const button = findButton(exports.DeskPanel(), '办完了') as unknown as
      { props: { style?: Record<string, unknown> } } | undefined
    const style = button?.props.style
    // 12px text + 4px padding + 1px border ≈ 24px: the row buttons were 18px, under WCAG 2.2's minimum
    // target, and the palette was 3.74 / 2.32 / 1.92 : 1 on white (self-review R8, 2026-09-27).
    expect(style?.fontSize).toBe('12px')
    expect(style?.padding).toBe('4px 8px')
    expect(style?.color).toBe('#0f766e')          // 5.47:1
    const note = textsOf(exports.DeskPanel()).join(' | ')
    expect(note).toContain('它记：')
  })

  it('clamps long free text with an expander and renders minimal markdown (R7)', () => {
    const exports = materialize()
    const longLean = `当前口径**已消解**，${'但要等 CFO 更正行落盘之后才对外引用，之前一律按旧数讲。'.repeat(15)}`
    exports.deskStore.data = {
      generatedAt: '2026-09-27T12:00:00+08:00',
      threads: [{ id: 't1', title: '口径问题', lean: longLean, why: '短说明' }],
    }
    const desk = textsOf(exports.DeskPanel()).join(' | ')
    // The live desk rendered one lean 345 px tall — 35% of the narrow pane (R7).
    expect(findButton(exports.DeskPanel(), '展开全部')).toBeDefined()
    // …and it rendered the model's asterisks verbatim.
    expect(hasTag(exports.DeskPanel(), 'strong')).toBe(true)
    expect(desk).not.toContain('**已消解**')

    // A short line needs no expander.
    exports.deskStore.data = {
      generatedAt: '2026-09-27T12:00:00+08:00',
      threads: [{ id: 't1', title: '口径问题', lean: '一句话说清' }],
    }
    expect(findButton(exports.DeskPanel(), '展开全部')).toBeUndefined()
  })

  it('shows a long provenance line in full instead of hiding it in a tooltip (R7)', () => {
    const exports = materialize()
    const sources = Array.from({ length: 11 }, (_, index) => `kb/cfo/company-facts.md#L${index * 7 + 1}`)
    exports.deskStore.data = {
      generatedAt: '2026-09-27T12:00:00+08:00',
      knowledge: [{ id: 'k1', title: '一页', status: 'stable', sources }],
    }
    const before = textsOf(exports.KnowledgePanel()).join(' | ')
    // The live page carried 11 sources / 945 characters; the line showed ~12% of them and the rest
    // only existed in a mouse-only title attribute.
    expect(before).toContain('来源：')
    expect(before).toContain('…')
    const all = findButton(exports.KnowledgePanel(), `全部（${sources.join(' · ').length} 字）`)
    expect(all).toBeDefined()
  })

  it('dates the counts it prints (R7)', () => {
    const exports = materialize()
    exports.deskStore.data = { generatedAt: '2026-09-27T09:15:00+08:00', counts: { memories: 7 } }
    const desk = textsOf(exports.DeskPanel()).join(' | ')
    // The numbers used to have no date of their own while the staleness line sat screens above.
    expect(desk).toContain('我记住的规模 · 09-27 09:15')
  })

  it('keeps a decision answerable when the receipt came from reading its options (R2)', () => {
    const exports = materialize()
    exports.deskStore.data = {
      generatedAt: '2026-09-27T10:00:00+08:00',
      decisions: [{
        id: 'd1', question: '季末破价例外？', kind: 'business',
        options: [{ label: '允许 48 小时' }, { label: '一律不允' }],
      }],
    }
    const at = new Date('2026-09-27T10:01:00+08:00').getTime()
    // 看选项 is a READ. Before R2 its receipt closed the row, printed a false "已回答" and hid the
    // options the principal had just asked for.
    exports.deskStore.pending = { rowId: 'd1', at, action: '看选项' }
    expect(textsOf(exports.DeskPanel()).join(' | ')).toContain('允许 48 小时')
    exports.deskStore.pending = undefined
    exports.deskStore.lastReceipt = { rowId: 'd1', action: '看选项', at }
    const afterRead = textsOf(exports.DeskPanel()).join(' | ')
    expect(afterRead).toContain('允许 48 小时')
    expect(afterRead).not.toContain('已回答')

    // Answering it is what closes the row.
    exports.deskStore.lastReceipt = { rowId: 'd1', action: '回答', at }
    const afterAnswer = textsOf(exports.DeskPanel()).join(' | ')
    expect(afterAnswer).toContain('已回答')
    expect(afterAnswer).not.toContain('允许 48 小时')
  })

  it('acts on 办完了 with one click, still confirming 不办了 (R3)', () => {
    const exports = materialize()
    exports.deskStore.data = {
      generatedAt: '2026-09-27T10:00:00+08:00',
      actions: [{ id: 'a1', what: '季末守住纪律', status: 'open' }],
    }
    // Completing fires immediately: the click reaches the send path (which reports the missing
    // session in this fixture) and never turns into a confirmation prompt.
    findButton(exports.DeskPanel(), '办完了')?.props.onClick?.()
    expect(exports.deskStore.note).toContain('还没有会话')
    expect(textsOf(exports.DeskPanel()).join(' | ')).not.toContain('确认办完了')

    // Dropping still arms first — it is the destructive one. The arm label is component state and
    // this harness renders a single snapshot, so the contract is asserted on the effect instead:
    // the first click must NOT reach the send path.
    exports.deskStore.note = undefined
    findButton(exports.DeskPanel(), '不办了')?.props.onClick?.()
    expect(exports.deskStore.note).toBeUndefined()
  })

  it('renders the options the assistant presented as one-click answers on the row', () => {
    const exports = materialize()
    exports.deskStore.data = {
      decisions: [{
        id: 'd1', question: '季末破价例外？', kind: 'business',
        options: [{ label: '允许 48 小时', cost: '口径风险', irreversible: true }, { label: '一律不允' }],
        reply: '选项已给，等你挑',
      }],
    }
    const text = textsOf(exports.DeskPanel()).join(' | ')
    expect(text).toContain('季末破价例外？')
    expect(text).toContain('允许 48 小时')
    expect(text).toContain('一律不允')
    expect(text).toContain('它说：选项已给，等你挑')
  })

  it('renders the action outcome note the assistant recorded — real files carry it, the panel used to drop it', () => {
    const exports = materialize()
    exports.deskStore.data = {
      actions: [
        { id: 'a1', what: '口径卡', status: 'open', note: '收到 7 条互斥指令，已封存' },
        { id: 'a2', what: '台账', status: 'done', owner: 'VP-Sales', note: '用户指示不办，已记原因' },
      ],
    }
    const text = textsOf(exports.DeskPanel()).join(' | ')
    expect(text).toContain('它记：收到 7 条互斥指令，已封存')
    expect(text).toContain('它记：用户指示不办，已记原因')
  })
})
