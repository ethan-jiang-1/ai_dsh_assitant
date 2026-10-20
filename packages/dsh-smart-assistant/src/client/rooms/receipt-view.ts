/**
 * The A3 receipt view: one human sentence plus a short grouped list of what changed in the four
 * rooms since the principal last looked. The baseline is browser-local (localStorage, with an
 * in-memory fallback for the classic-script test harness); "全部标为已读" moves it to now.
 *
 * The arithmetic is the pure core (`domain/maintenance/receipt.ts`); this module owns only the
 * baseline and the presentation. It never sends a prompt or asks the model to phrase anything.
 *
 * @module dsh-smart-assistant/client/receipt-view
 */
import type { DeskData } from './room-data-core'
import {
  buildReceipt,
  type Receipt, type ReceiptChange, type ReceiptRoom, type ReceiptSnapshot,
} from '../../domain/maintenance/receipt.ts'
import { createElement, reactSurface } from '../chrome/runtime'
import { MARK_TEAL } from '../chrome/theme'

const STORAGE_KEY = 'dsha:receipt-since'
let fallbackSince: string | undefined

/** Read the last "mark all read" marker; localStorage when available, an in-memory fallback otherwise. */
export function readReceiptSince(): string | undefined {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) ?? fallbackSince
  } catch {
    return fallbackSince
  }
}

/**
 * Move the receipt baseline to one instant (default now).
 * @param at - ISO marker; the next render shows only changes strictly after it.
 */
export function markReceiptRead(at: string = new Date().toISOString()): void {
  fallbackSince = at
  try { globalThis.localStorage?.setItem(STORAGE_KEY, at) } catch { /* no storage: in-memory is enough */ }
}

/** Clear both markers (tests / a fresh browser profile). */
export function resetReceiptBaseline(): void {
  fallbackSince = undefined
  try { globalThis.localStorage?.removeItem(STORAGE_KEY) } catch { /* no storage */ }
}

function snapshotOf(data: DeskData | undefined): ReceiptSnapshot {
  return {
    ...(data?.generatedAt === undefined ? {} : { generatedAt: data.generatedAt }),
    ...(data?.revision === undefined ? {} : { revision: data.revision }),
    ...(data?.memories === undefined ? {} : { memories: data.memories }),
    ...(data?.knowledge === undefined ? {} : { knowledge: data.knowledge }),
    ...(data?.research === undefined ? {} : { research: data.research }),
    ...(data?.skills === undefined ? {} : { skills: data.skills }),
  }
}

const ROOM_LABEL: Readonly<Record<ReceiptRoom, string>> = {
  memory: '记忆', knowledge: '知识', research: '线索', skills: '技能', viki: 'Viki',
}

const KIND_LABEL: Readonly<Record<string, string>> = {
  approved: '已批准', deprecated: '已过时', corrected: '已更正', retired: '已退役', landed: '已落地', updated: '有更新',
}

/** The one-line human sentence; client-side because it is skin copy, not model-facing text. */
function summaryText(receipt: Receipt): string {
  if (receipt.total === 0) return receipt.since === undefined ? '还没有收据' : '自上次以来还没有变化'
  const parts = (['memory', 'knowledge', 'research', 'skills', 'viki'] as const)
    .filter(room => receipt.counts[room] > 0)
    .map(room => `${ROOM_LABEL[room]} ${String(receipt.counts[room])}`)
  return `自上次以来：${parts.join(' · ')}`
}

function changeLine(change: ReceiptChange): string {
  const label = KIND_LABEL[change.kind] ?? change.kind
  const what = change.title === undefined || change.title.length === 0 ? change.id : change.title
  return `${ROOM_LABEL[change.room]} · ${what} · ${label}`
}

/**
 * Render the receipt block. Callers place it at the top of a room panel.
 * @param props - the current rooms projection (may be undefined before the first read).
 * @returns The receipt element.
 */
export function ReceiptView(props: { data?: DeskData | undefined }): ReturnType<typeof createElement> {
  const { useEffect, useState } = reactSurface()
  const [since, setSince] = useState<string | undefined>(readReceiptSince())
  useEffect(() => {
    if (since !== undefined) return
    const now = new Date().toISOString()
    markReceiptRead(now)
    setSince(now)
  }, [since])
  const receipt = buildReceipt(snapshotOf(props.data), props.data?.ledger, since)
  const details = receipt.changes.slice(0, 6)
  const markAllRead = (): void => {
    const now = new Date().toISOString()
    markReceiptRead(now)
    setSince(now)
  }
  return createElement('div', {
    style: {
      margin: '0 0 10px', padding: '8px 10px', borderRadius: '8px',
      border: '1px solid var(--dsw-alias-border-l3)', background: 'var(--dsw-alias-bg-layer-2)',
    },
  },
  createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
    createElement('span', { style: { flex: '1', fontSize: '12px', lineHeight: 1.5, color: 'var(--dsw-alias-label-primary)' } }, summaryText(receipt)),
    createElement('button', {
      onClick: markAllRead,
      style: {
        flex: '0 0 auto', padding: '3px 8px', fontSize: '11px', cursor: 'pointer', borderRadius: '5px',
        border: `1px solid ${MARK_TEAL}`, background: 'var(--dsw-alias-bg-base)', color: MARK_TEAL,
      },
    }, '全部标为已读')),
  details.length === 0
    ? null
    : createElement('ul', {
        style: { margin: '6px 0 0', paddingLeft: '18px', fontSize: '11px', lineHeight: 1.7, color: 'var(--dsw-alias-label-secondary)' },
      },
      ...details.map(change => createElement('li', { key: `${change.room}:${change.id}:${change.at}` }, changeLine(change)))),
  receipt.total > details.length
    ? createElement('div', { style: { marginTop: '4px', fontSize: '11px', color: 'var(--dsw-alias-label-secondary)' } }, `还有 ${String(receipt.total - details.length)} 条，打开房间可逐条看`)
    : null)
}
