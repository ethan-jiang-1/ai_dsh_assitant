/**
 * The Viki tab: what the memory layer extracted, one row per file, full body on demand
 * ([viki-read](../../../../../notes/implemented/2026-10-19-viki-read.md)).
 *
 * Per-row deletion ([viki-delete](../../../../../notes/implemented/2026-10-19-viki-delete.md)): references are
 * fetched first, shown, and the delete only fires on the explicit confirm; the host refuses
 * without a snapshot commit, and the receipt carries the commit id + "restore this delete"
 * (forward-commit semantics). The manual two-row comparison rides the same backed-up delete:
 * pick two, see them side by side, name which one wins — the other is deleted with a snapshot.
 *
 * Read-only/delete/restore all go through `/api/assistant/viki`; no prompt, no model turn.
 *
 * @module dsh-smart-assistant/client/viki-panel
 */
import type { VikiDiagnostics, VikiEntry, VikiSearch } from '../../domain/viki/types.ts'
import { ContentDrawer } from './content-drawer'
import { muted } from '../chrome/dom-utils'
import { createElement, reactSurface } from '../chrome/runtime'
import { MARK_TEAL } from '../chrome/theme'
import {
  deleteViki, getVikiView, loadViki, loadVikiBody, loadVikiDiagnostics, loadVikiSearch, referencesViki, resetVikiView, restoreViki,
  useVikiView, type VikiReceipt, type VikiReferences,
} from './viki-data-io'

const TYPE_LABEL: Readonly<Record<string, string>> = {
  events: '事件', profile: '画像', preferences: '偏好', entities: '实体', cases: '案例', patterns: '模式', tools: '工具', skills: '技能',
}

const WARN = 'var(--dsha-warn)'

function entryLine(entry: VikiEntry): string {
  const type = entry.memoryType === undefined ? '记忆' : TYPE_LABEL[entry.memoryType] ?? entry.memoryType
  return `${type} · ${entry.summary ?? entry.eventName ?? entry.name}`
}

function smallButton(label: string, onClick: () => void, tone: 'normal' | 'warn' = 'normal'): ReturnType<typeof createElement> {
  return createElement('button', {
    onClick,
    style: {
      padding: '2px 8px', fontSize: '11px', cursor: 'pointer', borderRadius: '5px',
      border: `1px solid ${tone === 'warn' ? WARN : MARK_TEAL}`,
      background: 'var(--dsw-alias-bg-base)', color: tone === 'warn' ? WARN : MARK_TEAL,
    },
  }, label)
}

function referencesBlock(references: VikiReferences): ReturnType<typeof createElement> {
  const lines = [
    ...references.knowledge.map(id => `知识页 ${id} 引用了它`),
    ...references.siblings.map(uri => `近重复：${uri.split('/').pop() ?? uri}`),
  ]
  return createElement('div', { style: { marginTop: '6px', fontSize: '11px', lineHeight: 1.7, color: 'var(--dsw-alias-label-secondary)' } },
    ...(lines.length === 0 ? ['没有知识页或近重复引用它。'] : lines))
}

/** The Viki tab glyph (same 14px seat as the room icons). */
export function VikiIcon(props: { size?: number }): ReturnType<typeof createElement> {
  const size = props.size ?? 16
  return createElement('svg', {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true,
  },
  createElement('circle', { cx: 12, cy: 12, r: 8.5, stroke: 'currentColor', strokeWidth: 1.6 }),
  createElement('path', { d: 'M12 7.5v9M7.5 12h9', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' }))
}

/** Render the Viki tab. */
export function VikiPanel(props: { sessionId?: string } = {}): ReturnType<typeof createElement> {
  const { useEffect, useState } = reactSurface()
  const sessionId = props.sessionId
  const view = useVikiView()
  const [drawer, setDrawer] = useState<{ title: string, body: string } | undefined>(undefined)
  const [note, setNote] = useState<string | undefined>(undefined)
  const [pending, setPending] = useState<{ entry: VikiEntry, references: VikiReferences } | undefined>(undefined)
  const [receipt, setReceipt] = useState<VikiReceipt | undefined>(undefined)
  const [selected, setSelected] = useState<readonly string[]>([])
  const [compareMode, setCompareMode] = useState(false)
  const [compare, setCompare] = useState<{ left: VikiEntry, right: VikiEntry, leftBody: string, rightBody: string } | undefined>(undefined)
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false)
  const [diagnostics, setDiagnostics] = useState<VikiDiagnostics | undefined>(undefined)
  const [diagnosticsNote, setDiagnosticsNote] = useState<string | undefined>(undefined)
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState<VikiSearch | undefined>(undefined)
  const [searchNote, setSearchNote] = useState<string | undefined>(undefined)
  const [searching, setSearching] = useState(false)
  const loadDiagnostics = (): void => {
    setDiagnosticsNote(undefined)
    void loadVikiDiagnostics(sessionId).then(result => {
      if (result.ok) setDiagnostics(result.diagnostics)
      else setDiagnosticsNote(result.reason)
    })
  }
  const toggleDiagnostics = (): void => {
    if (diagnosticsOpen) { setDiagnosticsOpen(false); return }
    setDiagnosticsOpen(true)
    if (diagnostics === undefined) loadDiagnostics()
  }
  const runSearch = (): void => {
    const text = query.trim()
    if (text === '') { setSearch(undefined); setSearchNote(undefined); return }
    setSearch(undefined)
    setSearchNote(undefined)
    setSelected([])
    setCompare(undefined)
    setCompareMode(false)
    setSearching(true)
    void loadVikiSearch(text).then(result => {
      setSearching(false)
      if (result.ok) setSearch(result.search)
      else setSearchNote(result.reason)
    })
  }
  const clearSearch = (): void => {
    setQuery('')
    setSearch(undefined)
    setSearchNote(undefined)
    setSearching(false)
    setSelected([])
    setCompare(undefined)
    setCompareMode(false)
  }
  useEffect(() => {
    if (getVikiView().status === 'loading') void loadViki()
  }, [])
  const reload = (): void => {
    setNote(undefined)
    setSelected([])
    setCompare(undefined)
    setCompareMode(false)
    resetVikiView()
    void loadViki()
  }
  const open = (entry: VikiEntry): void => {
    void loadVikiBody(entry.uri).then(result => {
      if (result.ok) setDrawer({ title: entry.eventName ?? entry.name, body: result.body })
      else setNote(`读正文失败：${result.reason}`)
    })
  }
  const startDelete = (entry: VikiEntry): void => {
    setReceipt(undefined)
    setNote(undefined)
    void referencesViki(entry.uri).then(references => { setPending({ entry, references }) })
  }
  const confirmDelete = (): void => {
    if (pending === undefined) return
    void deleteViki(pending.entry.uri, true).then(result => {
      setPending(undefined)
      if (!result.ok) { setNote(`删除失败：${result.reason}`); return }
      setSelected(current => current.filter(item => item !== pending.entry.uri))
      setCompare(undefined)
      setReceipt(result.receipt)
      void loadViki()
    })
  }
  const restore = (): void => {
    if (receipt === undefined) return
    void restoreViki(receipt.commitId).then(result => {
      if (!result.ok) { setNote(`恢复失败：${result.reason}`); return }
      setReceipt(undefined)
      setNote(`已恢复 ${receipt.commitId}（forward-commit：该 commit 之后的改动可能一并回退）`)
      void loadViki()
    })
  }
  const toggleSelect = (uri: string): void => {
    setCompare(undefined)
    if (selected.includes(uri)) {
      setSelected(selected.filter(item => item !== uri))
      setNote(undefined)
      return
    }
    if (selected.length >= 2) {
      setNote('最多选两条；先取消一条再选。')
      return
    }
    setSelected([...selected, uri])
    setNote(undefined)
  }
  const clearSelection = (): void => {
    setSelected([])
    setCompare(undefined)
    setNote(undefined)
  }
  const exitCompare = (): void => {
    setCompareMode(false)
    setSelected([])
    setCompare(undefined)
    setNote(undefined)
  }
  const startCompare = (entries: readonly VikiEntry[]): void => {
    const left = entries.find(entry => entry.uri === selected[0])
    const right = entries.find(entry => entry.uri === selected[1])
    if (left === undefined || right === undefined) { setNote('这两条已不在当前列表；重新选两条对比。'); return }
    void Promise.all([loadVikiBody(left.uri), loadVikiBody(right.uri)]).then(([leftResult, rightResult]) => {
      setCompare({
        left, right,
        leftBody: leftResult.ok ? leftResult.body : `（读失败：${leftResult.reason}）`,
        rightBody: rightResult.ok ? rightResult.body : `（读失败：${rightResult.reason}）`,
      })
    })
  }
  const keepOne = (winner: VikiEntry, loser: VikiEntry): void => {
    setCompare(undefined)
    setSelected([])
    void deleteViki(loser.uri, true).then(result => {
      if (!result.ok) { setNote(`删除失败：${result.reason}`); return }
      setReceipt(result.receipt)
      setNote(`保留了「${winner.eventName ?? winner.name}」，删除了「${loser.eventName ?? loser.name}」`)
      void loadViki()
    })
  }
  const retry = smallButton('重试', reload)
  const root = (...children: (string | ReturnType<typeof createElement> | null)[]): ReturnType<typeof createElement> =>
    createElement('div', { style: { flex: '1', minHeight: '0', overflowY: 'auto', padding: '2px' } }, ...children)
  if (view.status === 'loading') return root(muted('正在读 Viki 的记忆…'))
  if (view.status === 'unavailable') return root(muted('Viki 未连接——OpenViking server 不在线或未配置。这不会影响其他房间。'), retry)
  if (view.status === 'error') return root(muted(`读 Viki 失败：${view.reason ?? '未知原因'}`), retry)
  const list = view.list
  if (list === undefined) return root(muted('Viki 还没有返回数据。'), retry)
  const renderEntry = (entry: VikiEntry): ReturnType<typeof createElement> => {
    const score = (entry as { score?: unknown }).score
    return createElement('div', {
      key: entry.uri,
      style: {
        padding: '8px 10px', borderRadius: '8px', border: `1px solid ${compareMode && selected.includes(entry.uri) ? MARK_TEAL : 'var(--dsw-alias-border-l3)'}`,
        background: 'var(--dsw-alias-bg-layer-2)',
      },
    },
    createElement('div', { style: { fontSize: '12px', lineHeight: 1.6, color: 'var(--dsw-alias-label-primary)' } }, entryLine(entry)),
    createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', fontSize: '11px', color: 'var(--dsw-alias-label-secondary)' } },
      createElement('span', { style: { flex: '1' } }, `${entry.source === 'peer' ? `来自 ${entry.peer ?? 'peer'}` : 'user 记忆'}${typeof score === 'number' ? ` · ${score.toFixed(2)}` : ''}`),
      ...(compareMode ? [smallButton(selected.includes(entry.uri) ? '移出' : '选入', () => { toggleSelect(entry.uri) })] : []),
      smallButton('读全文', () => { open(entry) }),
      smallButton('删', () => { startDelete(entry) }, 'warn')))
  }
  const rows = list.entries.length === 0
    ? muted('Viki 里还没有记忆。对话抽取后会出现在这里。')
    : createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
      ...list.entries.map(renderEntry))
  const searchRows = search === undefined ? null : createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
    createElement('div', { style: { fontSize: '11px', color: 'var(--dsw-alias-label-secondary)', marginBottom: '2px' } }, `搜索「${search.query}」· ${String(search.entries.length)} 条`),
    ...(search.entries.length === 0 ? [muted('没有匹配的记忆。')] : search.entries.map(renderEntry)),
    ...(search.problems.length === 0 ? [] : [muted(`检索问题：${search.problems.join('；')}`)]))
  const counts = `共 ${String(list.counts.total)} 条（user ${String(list.counts.user)} · peers ${String(list.counts.peers)} · events ${String(list.counts.events)}）`
  const compareBar = !compareMode ? null : createElement('div', {
    style: { marginBottom: '8px', padding: '8px 10px', borderRadius: '8px', border: `1px solid ${MARK_TEAL}`, background: 'var(--dsw-alias-bg-layer-2)' },
  },
  createElement('div', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-primary)' } }, `排查重复：已选 ${String(selected.length)} 条${selected.length === 2 ? '，可以开始了' : `，再选 ${String(2 - selected.length)} 条`}`),
  createElement('div', { style: { marginTop: '2px', fontSize: '10.5px', color: 'var(--dsw-alias-label-secondary)' } }, '选两条并排看；仅用于核对重复/冲突；最多 2 条。'),
  createElement('div', { style: { display: 'flex', gap: '6px', marginTop: '4px' } },
    selected.length === 2 ? smallButton('开始对比', () => { startCompare(search?.entries ?? list.entries) }) : null,
    smallButton('清除', clearSelection),
    smallButton('退出', exitCompare)))
  const kv = (label: string, value: string, tone: 'normal' | 'warn' | 'mono' = 'normal'): ReturnType<typeof createElement> =>
    createElement('div', { style: { display: 'flex', gap: '8px', fontSize: '11px', lineHeight: 1.7 } },
      createElement('span', { style: { flex: '0 0 78px', color: 'var(--dsw-alias-label-secondary)' } }, label),
      createElement('span', {
        style: {
          flex: '1', minWidth: '0', overflowWrap: 'anywhere',
          color: tone === 'warn' ? WARN : tone === 'mono' ? 'var(--dsw-alias-label-secondary)' : 'var(--dsw-alias-label-primary)',
          ...(tone === 'mono' ? { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' } : {}),
        },
      }, value))
  const diagnosticsBody = diagnostics === undefined
    ? muted(diagnosticsNote === undefined ? '正在读诊断…' : `诊断读取失败：${diagnosticsNote}`)
    : (() => {
        const snapshot = diagnostics
        if (snapshot === undefined) return muted('正在读诊断…')
        const health = snapshot.health
        const stats = snapshot.stats
        const tasks = snapshot.tasks ?? []
        const commit = tasks.find(task => task.type === 'session_commit')
        const failed = tasks.filter(task => task.status === 'failed').length
        const running = tasks.filter(task => task.status === 'running' || task.status === 'pending').length
        const categories = stats === undefined
          ? '—'
          : ['events', 'profile', 'preferences', 'entities']
            .map(key => `${TYPE_LABEL[key] ?? key} ${String(stats.byCategory[key] ?? 0)}`)
            .join(' · ')
        const problems = snapshot.problems.length === 0 ? '无读取失败' : snapshot.problems.slice(0, 3).join('；')
        return createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '1px' } },
          kv('健康', health === undefined ? '未连接' : `${health.healthy ? '已连接' : '异常'} · ${health.version ?? '—'} · ${health.authMode ?? '—'}`, health?.healthy === true ? 'normal' : 'warn'),
          kv('分类', categories),
          kv('最近 commit', commit === undefined ? '—' : `${commit.status}${commit.error === undefined ? '' : ` · ${commit.error}`}`, commit !== undefined && commit.status !== 'completed' ? 'warn' : 'normal'),
          kv('任务', tasks.length === 0 ? '0' : `${String(failed)} failed · ${String(running)} running`),
          kv('pending', String(snapshot.pending ?? '—')),
          kv('skills', String(snapshot.skills?.total ?? '—')),
          kv('用量', snapshot.tokens === undefined ? '—' : `~${snapshot.tokens.total.toLocaleString()} · ${snapshot.tokens.basis === 'usage' ? 'usage' : '估算'}`),
          kv('problems', problems, snapshot.problems.length > 0 ? 'warn' : 'normal'),
          kv('config', snapshot.config?.path ?? '—', 'mono'),
          kv('provider', [snapshot.config?.provider, snapshot.config?.model].filter(value => value !== undefined && value !== '').join(' / ') || '—'),
          kv('storage', snapshot.config?.storage ?? '—', 'mono'),
          kv('Viki URL', snapshot.vikiUrl, 'mono'),
          createElement('div', { style: { marginTop: '4px', fontSize: '10px', color: 'var(--dsw-alias-label-secondary)' } }, '不含 API key；诊断只读，不影响记忆层。'))
      })()
  const diagnosticsBlock = diagnosticsOpen
    ? createElement('div', {
        style: { marginTop: '8px', padding: '8px 10px', borderRadius: '8px', border: `1px solid ${MARK_TEAL}`, background: 'var(--dsw-alias-bg-layer-2)' },
      },
      createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' } },
        createElement('span', { style: { fontSize: '12px', fontWeight: 600, color: 'var(--dsw-alias-label-primary)' } }, '诊断'),
        createElement('span', { style: { fontSize: '10px', padding: '0 5px', borderRadius: '8px', border: `1px solid ${MARK_TEAL}`, color: MARK_TEAL } }, '研发'),
        createElement('span', { style: { fontSize: '10px', color: 'var(--dsw-alias-label-secondary)' } }, '只读'),
        createElement('span', { style: { flex: '1' } }),
        smallButton('排查重复…', () => { setCompareMode(true); setSelected([]); setCompare(undefined); setNote(undefined) }),
        smallButton('重读', loadDiagnostics),
        smallButton('收起', () => { setDiagnosticsOpen(false) })),
      diagnosticsBody)
    : null
  const pendingBlock = pending === undefined ? null : createElement('div', {
    style: { marginTop: '8px', padding: '8px 10px', borderRadius: '8px', border: `1px solid ${WARN}`, background: 'var(--dsw-alias-bg-layer-2)' },
  },
  createElement('div', { style: { fontSize: '12px', lineHeight: 1.6, color: 'var(--dsw-alias-label-primary)' } }, `删除「${pending.entry.eventName ?? pending.entry.name}」？先备份，再删。`),
  referencesBlock(pending.references),
  createElement('div', { style: { display: 'flex', gap: '6px', marginTop: '6px' } },
    smallButton('确认删除', confirmDelete, 'warn'),
    smallButton('取消', () => { setPending(undefined) })))
  const receiptBlock = receipt === undefined ? null : createElement('div', {
    style: { marginTop: '8px', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--dsw-alias-border-l3)', background: 'var(--dsw-alias-bg-layer-2)' },
  },
  createElement('div', { style: { fontSize: '12px', lineHeight: 1.6, color: 'var(--dsw-alias-label-primary)' } }, `已删除「${receipt.uri.split('/').pop() ?? receipt.uri}」`),
  createElement('div', { style: { fontSize: '11px', color: 'var(--dsw-alias-label-secondary)' } }, `备份 commit ${receipt.commitId}；恢复的是该 commit 的状态，之后的其他改动可能一并回退。`),
  createElement('div', { style: { marginTop: '6px' } }, smallButton('恢复这次删除', restore)))
  const compareBlock = compare === undefined ? null : createElement('div', {
    style: { marginTop: '8px', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--dsw-alias-border-l3)', background: 'var(--dsw-alias-bg-layer-2)' },
  },
  createElement('div', { style: { fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--dsw-alias-label-primary)' } }, '两条并排：以哪条为准？'),
  createElement('div', { style: { display: 'flex', gap: '8px' } },
    ...[compare.left, compare.right].map((entry, index) => createElement('div', { key: entry.uri, style: { flex: '1', minWidth: '0' } },
      createElement('div', { style: { fontSize: '12px', fontWeight: 600, color: 'var(--dsw-alias-label-primary)' } }, `${index === 0 ? 'A' : 'B'} · ${entry.eventName ?? entry.name}`),
      createElement('div', { style: { fontSize: '11px', color: 'var(--dsw-alias-label-secondary)' } }, entry.summary ?? ''),
      createElement('div', { style: { marginTop: '4px', fontSize: '11px', lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: '160px', overflowY: 'auto', color: 'var(--dsw-alias-label-primary)' } }, index === 0 ? compare.leftBody : compare.rightBody)))),
  createElement('div', { style: { display: 'flex', gap: '6px', marginTop: '6px' } },
    smallButton('以 A 为准（删 B）', () => { keepOne(compare.left, compare.right) }, 'warn'),
    smallButton('以 B 为准（删 A）', () => { keepOne(compare.right, compare.left) }, 'warn'),
    smallButton('两条都留', () => { setCompare(undefined) })))
  return root(
    createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px', fontSize: '11px', color: 'var(--dsw-alias-label-secondary)' } },
      createElement('span', { style: { color: MARK_TEAL } }, '●'),
      createElement('span', { style: { flex: '1' } }, counts),
      list.problems.length > 0 ? createElement('span', { style: { color: WARN } }, `${String(list.problems.length)} 个读取问题`) : null),
    createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' } },
      smallButton(diagnosticsOpen ? '收起诊断' : '诊断', toggleDiagnostics),
      smallButton('重读', reload)),
    createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' } },
      createElement('input', {
        value: query,
        placeholder: '搜索记忆…',
        onChange: (event: { target: { value: string } }) => { setQuery(event.target.value) },
        style: {
          flex: '1', minWidth: '0', padding: '6px 8px', fontSize: '11px', borderRadius: '6px',
          border: '1px solid var(--dsw-alias-border-l3)', background: 'var(--dsw-alias-bg-base)',
          color: 'var(--dsw-alias-label-primary)',
        },
      }),
      smallButton('搜索', runSearch),
      search === undefined && searchNote === undefined ? null : smallButton('清除', clearSearch)),
    compareBar,
    searching ? muted('正在搜索…') : searchNote === undefined ? (search === undefined ? rows : searchRows) : muted(`搜索失败：${searchNote}`),
    diagnosticsBlock,
    pendingBlock,
    compareBlock,
    receiptBlock,
    note === undefined ? null : muted(note),
    drawer === undefined ? null : createElement(ContentDrawer, { title: drawer.title, body: drawer.body, onClose: () => { setDrawer(undefined) } }))
}
