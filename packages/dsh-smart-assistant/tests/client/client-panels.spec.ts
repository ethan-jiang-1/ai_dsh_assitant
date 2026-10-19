/**
 * Rendering smoke tests for the two room panels (`src/client/panels.ts`): the knowledge room's
 * review queues and the memory room's correction surface. The session desk panel that used to
 * live here is retired (one 桌面 = the ledger's, 2026-10-11).
 *
 * The browser half is multi-module source (relative imports, tsdown-inlined into one classic
 * script — see the entry's file header), so the test installs the page-global facade,
 * evaluates the script, then materializes the factory with a module-table require stub. The
 * panels read one shared store, which the factory exposes for exactly this: fill it and every
 * section renders without a browser.
 *
 * Module-aligned splits out of this file: room tab bodies → client-room-tabs.spec.ts, store
 * mechanics → client-room-data-core.spec.ts, io/slice paths → client-room-data-io.spec.ts, the color
 * contract → client-theme.spec.ts.
 */
import { describe, expect, it } from 'vitest'
import { inertReactShim, loadClientRegistration, materializeClient, textsOf } from '../support/client-harness.ts'

const registration = await loadClientRegistration()
/** The panels call useState/useEffect; these tests render one snapshot. */
const reactShim = inertReactShim()

/** One session's slice of desk state (R11): the flat fields are the primary session's slice. */
interface DeskSlice {
  data?: Record<string, unknown> | undefined
  source?: string | undefined
  readError?: string | undefined
  pending?: { rowId: string, at: number, action: string } | undefined
  lastReceipt?: { rowId: string, action: string, at: number } | undefined
  /** An action that left but whose desk rewrite never arrived (R1). */
  stalled?: { rowId: string, at: number, action: string } | undefined
  sessionUpdatedAt?: number | undefined
  seq?: number | undefined
}

interface DeskStore extends DeskSlice {
  note?: string | undefined
  focusKnowledge?: 'drafts' | undefined
  misses: Set<string>
  /** The Session whose workspace answered the last walk — the flat fields above belong to it. */
  sourceSession?: string | undefined
  /** One slice per tab-bound session that is not the primary (R11). */
  bySession: Record<string, DeskSlice>
  /** Sessions with a mounted tab — the follow-the-conversation reload refreshes these (R11). */
  boundSessions: Set<string>
  listeners: Set<() => void>
}

interface PanelExports {
  DeskPanel: (props?: { sessionId?: string }) => unknown
  KnowledgePanel: (props?: { sessionId?: string }) => unknown
  MemoryPanel: (props?: { sessionId?: string }) => unknown
  /** Release the data gate when the poller gives up (R1); the session scopes it (R11). */
  expirePending: (sessionId?: string) => void
  /** Settle a pending/stalled row when a load reports the file moved past the send (R11-scoped). */
  settlePending: (generatedAt: string | undefined, sessionId?: string) => void
  /** Retire a receipt whose decision is still open in the file (R11). */
  retireStaleReceipt: (data: Record<string, unknown> | undefined, sessionId?: string) => void
  /** Does this JSON carry the desk contract's shape at all (R12)? */
  looksLikeDesk: (parsed: Record<string, unknown>) => boolean
  DeskTabBody: (props: { sessionId?: string }) => unknown
  KnowledgeTabBody: (props: { sessionId?: string }) => unknown
  MemoryTabBody: (props: { sessionId?: string }) => unknown
  /** The tab-strip title factory: icon glyph before the room's title (user steer 2026-09-28). */
  roomTabTitle: (icon: (props: { size: number }) => unknown, fallback: string) =>
    (props: { useTabInfo?: () => { tab?: { title?: string } } }) => unknown
  deskStore: DeskStore
  /** The slice a surface reads: flat for the primary, `bySession[sid]` for a bound tab (R11). */
  deskSlice: (sessionId?: string) => DeskSlice
  /** Wiring entry (acceptance round 3, 2026-09-29): captures a fake remote/session ctx so the
    * load paths can be driven headless — claiming, carry, and per-slice seq live behind it. */
  apply: (ctx: unknown) => void
  /** Read one Session's desk file into its slice (R11): the claim path and the slice's own load
    * sequence are the acceptance targets of round 3. */
  loadDeskFor: (sessionId: string) => void
}

function materialize(): PanelExports {
  return materializeClient(registration, reactShim) as unknown as PanelExports
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
describe('desk panels', () => {
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
    expect(text).toContain('学来的 1 件')
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
        // First-open UX card (2026-10-01): a built-in seed's provenance renders
        // as product language — the principal reads the approval flow, and a
        // repo path there is developer coordinates leaking onto their surface.
        { id: 'm5', kind: 'fact', updated: '2026-10-01T02:34:00.000Z', text: '管理岗基座：总经理视角的判断框架', source: 'packages/dsh-smart-assistant/seeds/management/management-lens-ceo.md' },
      ],
    }
    const text = textsOf(exports.MemoryPanel()).join(' | ')

    expect(text).toContain('记忆室')
    expect(text).toContain('会话日志住在')
    expect(text).toContain('这条记错了')
    expect(text).toContain('内置基座种子页')
    expect(text).not.toContain('packages/dsh-smart-assistant/seeds/')
    expect(text).toContain('用户 2026-09-26 更正')
    // Grouped by what the record is about — how the principal works versus the world it learned.
    expect(text).toContain('你的偏好（1）')
    expect(text).toContain('你的决定（1）')
    expect(text).toContain('事实（2）')
    expect(text).toContain('其它（1）')
    // Preferences lead: the digital twin's core is knowing how the principal works.
    expect(text.indexOf('你的偏好')).toBeLessThan(text.indexOf('事实（2）'))
  })

  it('carries the freshness warning in every room, not only the global desk (A7)', () => {
    const exports = materialize()
    exports.deskStore.data = {
      generatedAt: '2026-09-26T13:00:00+08:00',
      counts: { memories: 1 },
      memories: [{ id: 'm1', kind: 'fact', text: '一条记录' }],
    }
    exports.deskStore.sessionUpdatedAt = new Date('2026-09-26T13:05:00+08:00').getTime()
    const knowledge = textsOf(exports.KnowledgePanel()).join(' | ')
    const memory = textsOf(exports.MemoryPanel()).join(' | ')
    expect(knowledge).toContain('对话比这份房间数据新')
    expect(memory).toContain('对话比这份房间数据新')
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
    // 2026-10-04: the toggle now says what it opens (来源全文) — the CEO clicked it expecting
    // the page body and got source paths (friction #4).
    const all = findButton(exports.KnowledgePanel(), `来源全文（${sources.join(' · ').length} 字）`)
    expect(all).toBeDefined()
  })

  it('shows the content excerpt on a draft approval card (CEO friction #2: blind approval)', () => {
    const exports = materialize()
    exports.deskStore.data = {
      generatedAt: '2026-10-04T12:00:00+08:00',
      knowledge: [{ id: 'k1', title: '判决页', status: 'draft', excerpt: '结论先行：不要按他开口的方式让。该让的是结构，不是价格水平。' }],
    }
    const texts = textsOf(exports.KnowledgePanel()).join(' | ')
    expect(texts).toContain('结论先行：不要按他开口的方式让')
    expect(texts).toContain('待你审批')
  })

})
