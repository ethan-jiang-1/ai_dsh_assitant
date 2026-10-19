/**
 * The Viki tab: what the memory layer extracted, one row per file, full body on demand.
 *
 * B2 adds per-row deletion: references are fetched first, shown, and the delete only fires on the
 * explicit confirm; the host refuses without a snapshot commit, and the receipt carries the commit
 * id + "restore this delete" (forward-commit semantics). B3 adds the manual two-row comparison:
 * pick two, see them side by side, name which one wins — the other is deleted through B2.
 *
 * Read-only/delete/restore all go through `/api/assistant/viki`; no prompt, no model turn.
 *
 * @module dsh-smart-assistant/client/viki-panel
 */
import type { VikiEntry } from '../host/viki/client.ts'
import { ContentDrawer } from './content-drawer'
import { muted } from './dom-utils'
import { createElement, reactSurface } from './runtime'
import { MARK_TEAL } from './theme'
import {
  deleteViki, getVikiView, loadViki, loadVikiBody, referencesViki, resetVikiView, restoreViki,
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
export function VikiPanel(): ReturnType<typeof createElement> {
  const { useEffect, useState } = reactSurface()
  const view = useVikiView()
  const [drawer, setDrawer] = useState<{ title: string, body: string } | undefined>(undefined)
  const [note, setNote] = useState<string | undefined>(undefined)
  const [pending, setPending] = useState<{ entry: VikiEntry, references: VikiReferences } | undefined>(undefined)
  const [receipt, setReceipt] = useState<VikiReceipt | undefined>(undefined)
  const [selected, setSelected] = useState<readonly string[]>([])
  const [compare, setCompare] = useState<{ left: VikiEntry, right: VikiEntry, leftBody: string, rightBody: string } | undefined>(undefined)
  useEffect(() => {
    if (getVikiView().status === 'loading') void loadViki()
  }, [])
  const reload = (): void => {
    setNote(undefined)
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
    setSelected(current => current.includes(uri) ? current.filter(item => item !== uri) : [...current, uri].slice(-2))
  }
  const startCompare = (entries: readonly VikiEntry[]): void => {
    const left = entries.find(entry => entry.uri === selected[0])
    const right = entries.find(entry => entry.uri === selected[1])
    if (left === undefined || right === undefined) { setNote('先选两条再并排。'); return }
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
  const rows = list.entries.length === 0
    ? muted('Viki 里还没有记忆。对话抽取后会出现在这里。')
    : createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
      ...list.entries.map(entry => createElement('div', {
        key: entry.uri,
        style: {
          padding: '8px 10px', borderRadius: '8px', border: `1px solid ${selected.includes(entry.uri) ? MARK_TEAL : 'var(--dsw-alias-border-l3)'}`,
          background: 'var(--dsw-alias-bg-layer-2)',
        },
      },
      createElement('div', { style: { fontSize: '12px', lineHeight: 1.6, color: 'var(--dsw-alias-label-primary)' } }, entryLine(entry)),
      createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', fontSize: '11px', color: 'var(--dsw-alias-label-secondary)' } },
        createElement('span', { style: { flex: '1' } }, entry.source === 'peer' ? `来自 ${entry.peer ?? 'peer'}` : 'user 记忆'),
        smallButton(selected.includes(entry.uri) ? '已选' : '选择', () => { toggleSelect(entry.uri) }),
        smallButton('读全文', () => { open(entry) }),
        smallButton('删', () => { startDelete(entry) }, 'warn')))))
  const counts = `共 ${String(list.counts.total)} 条（user ${String(list.counts.user)} · peers ${String(list.counts.peers)} · events ${String(list.counts.events)}）`
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
    createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' } },
      createElement('span', { style: { flex: '1', fontSize: '12px', color: 'var(--dsw-alias-label-secondary)' } }, counts),
      smallButton('并排比较', () => { startCompare(list.entries) }),
      smallButton('重读', reload)),
    rows,
    pendingBlock,
    compareBlock,
    receiptBlock,
    note === undefined ? null : muted(note),
    drawer === undefined ? null : createElement(ContentDrawer, { title: drawer.title, body: drawer.body, onClose: () => { setDrawer(undefined) } }))
}
