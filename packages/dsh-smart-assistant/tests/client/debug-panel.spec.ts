/**
 * The L2 debug panel: a separate, read-only surface that shows what the browser actually holds.
 * The value of this test is the separation itself — the product home must not need the debug
 * facts, and the debug panel must not invent host facts the client cannot see.
 */
import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import { bindClientRequire } from '../../src/client/chrome/runtime'
import { DebugPanel } from '../../src/client/debug/debug-panel'
import type { ProjectionPanelProps } from '../../src/client/projection/projection-panel'
import type { DeskLanes } from '../../src/client/projection/desk-surface'
import type { ProjectionDownload } from '../../src/client/projection/projection-reader'
import type { OperatingProjection } from '../../src/client/projection/operating-projection'
import { createProjectionViewStore } from '../../src/client/projection/projection-view'
import { defineStore } from '@deepseek-ai/dsh-client-store'

const react = {
  createElement,
  useState: <T,>(initial: T | (() => T)): [T, (next: T) => void] => [typeof initial === 'function' ? (initial as () => T)() : initial, () => {}],
  useEffect: () => {},
  useRef: <T,>(value: T): { current: T } => ({ current: value }),
}
bindClientRequire(() => react)

function text(node: unknown): string {
  if (Array.isArray(node)) return node.map(text).join(' ')
  if (typeof node === 'string') return node
  if (node !== null && typeof node === 'object' && 'props' in node) return text((node as { props: { children?: unknown } }).props.children)
  return ''
}

const projection: OperatingProjection = {
  schemaVersion: 2,
  ledgerId: 'ledger-a',
  revision: 7,
  matters: [],
  receipts: [],
  unclaimed: [],
}

function props(): ProjectionPanelProps & { sessionId: string } {
  const view = createProjectionViewStore(defineStore).create()
  const value: ProjectionDownload = { status: 'ready', data: projection }
  const lanes: DeskLanes = {
    refreshProjection: () => {},
    onAsk: () => {},
    onCapture: () => {},
    onOpenSession: () => {},
    onProcess: () => {},
    onClaim: () => {},
    onDiscard: () => {},
    onWake: () => {},
  }
  return {
    surface: { lanes },
    useProjection: <S,>(select: (candidate: ProjectionDownload) => S): S => select(value),
    useStore: <S,>(select: (candidate: ReturnType<typeof view.getSnapshot>) => S): S => select(view.getSnapshot()),
    useSessionStatus: <S,>(select: (candidate: ReadonlyMap<string, { running?: boolean }>) => S): S => select(new Map()),
    actions: view.actions,
    sessionId: 'session-a',
  }
}

describe('DebugPanel', () => {
  it('renders the machine facts, the parsed projection and the bound session, read-only', () => {
    const copy = text(DebugPanel(props()))
    expect(copy).toContain('开发调试')
    expect(copy).toContain('非产品面')
    expect(copy).toContain('projection.status')
    expect(copy).toContain('ready')
    expect(copy).toContain('ledger-a')
    expect(copy).toContain('session-a')
    expect(copy).toContain('"revision": 7')
    // The product page's language must not leak in: this is the machine surface.
    expect(copy).not.toContain('最近哪件事让你拿不准')
  })
})
