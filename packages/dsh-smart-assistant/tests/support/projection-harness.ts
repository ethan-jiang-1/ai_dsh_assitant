/**
 * The shared render harness for the desk panel specs: the React shim, node expansion/text,
 * the lane surface, the fixture builder, and the DOM-like finders. Extracted from
 * `projection-panel.spec.ts` so per-face specs render the same panel without a spec importing
 * another spec.
 */
import { createElement } from 'react'
import { vi } from 'vitest'
import { bindClientRequire } from '../../src/client/chrome/runtime'
import { ProjectionPanel, type ProjectionPanelProps } from '../../src/client/projection/projection-panel'
import type { DeskLanes } from '../../src/client/projection/desk-surface'
import type { ProjectionDownload } from '../../src/client/projection/projection-reader'
import { createProjectionViewStore } from '../../src/client/projection/projection-view'
import { defineStore } from '@deepseek-ai/dsh-client-store'
import { deskEn } from '../../src/client/chrome/locales'

export const react = {
  createElement,
  useState: <T,>(initial: T | (() => T)): [T, (next: T) => void] => [typeof initial === 'function' ? (initial as () => T)() : initial, () => {}],
  useEffect: () => {},
  useRef: <T,>(value: T): { current: T } => ({ current: value }),
  useCallback: <T extends (...args: never[]) => unknown>(callback: T): T => callback,
}
bindClientRequire(() => react)
/** Invoke function components the way React would; the proactive strips are child components now. */
export function expand(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(expand)
  if (node !== null && typeof node === 'object' && 'type' in node) {
    const element = node as { type: unknown, props: unknown }
    if (typeof element.type === 'function') return expand((element.type as (props: unknown) => unknown)(element.props))
  }
  return node
}
export function text(node: unknown): string {
  const expanded = expand(node)
  if (Array.isArray(expanded)) return expanded.map(text).join(' ')
  if (typeof expanded === 'string') return expanded
  if (expanded !== null && typeof expanded === 'object' && 'props' in expanded) {
    return text((expanded as { props: { children?: unknown } }).props.children)
  }
  return ''
}
/** The platform status map as a selector hook; fixtures that do not exercise it pass an empty map. */
export const noStatuses = <S,>(select: (value: ReadonlyMap<string, { running?: boolean, pendingInteraction?: { kind?: string } | undefined, completionUnread?: boolean }>) => S): S => select(new Map())
export const noop = (): void => {}
export function render(value: ProjectionDownload): string {
  const view = createProjectionViewStore(defineStore).create()
  return text(ProjectionPanel(panelProps(value, view)))
}
/** Render with the proactive catalog hook (261018 片 1 row 3) and the tasks deep-link. */
export type CatalogState = import('../../src/client/proactive/proactive-face-source').ProactiveCatalogState
export type UiState = import('../../src/client/proactive/proactive-face').ProactiveUiState
export type StatusMap = ReadonlyMap<string, { running?: boolean, pendingInteraction?: { kind?: string } | undefined, completionUnread?: boolean }>

/** A lane surface with inert defaults; tests override only the callback they assert on. */
export function surface(lanes: Partial<DeskLanes> = {}): ProjectionPanelProps['surface'] {
  return {
    lanes: {
      refreshProjection: vi.fn(),
      onAsk: vi.fn(),
      onCapture: noop,
      onOpenSession: noop,
      onProcess: noop,
      onClaim: noop,
      onDiscard: noop,
      onWake: noop,
      ...lanes,
    },
  }
}

/** The one fixture builder every render site uses; a new lane or hook no longer edits each test. */
export function panelProps(
  value: ProjectionDownload,
  view: ReturnType<ReturnType<typeof createProjectionViewStore>['create']>,
  lanes: Partial<DeskLanes> = {},
  options: { statuses?: StatusMap, catalog?: CatalogState, ui?: UiState } = {},
): ProjectionPanelProps {
  const statuses = options.statuses ?? new Map()
  return {
    t: (key, params) => Object.entries(params ?? {}).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), deskEn[key]),
    surface: surface(lanes),
    useProjection: <S,>(select: (candidate: ProjectionDownload) => S): S => select(value),
    useStore: <S,>(select: (candidate: ReturnType<typeof view.getSnapshot>) => S): S => select(view.getSnapshot()),
    useSessionStatus: <S,>(select: (candidate: StatusMap) => S): S => select(statuses),
    actions: view.actions,
    ...(options.catalog === undefined ? {} : {
      useCatalog: <S,>(select: (state: CatalogState) => S): S => select(options.catalog as CatalogState),
    }),
    ...(options.ui === undefined ? {} : {
      useProactiveUi: <S,>(select: (state: UiState) => S): S => select(options.ui as UiState),
    }),
  }
}
export function renderWithCatalog(value: ProjectionDownload, catalog: CatalogState, ui: UiState = { ignored: [], accepted: [] }, statuses: StatusMap = new Map()): { tree: string, view: ReturnType<ReturnType<typeof createProjectionViewStore>['create']>, openTasks: ReturnType<typeof vi.fn>, openSession: ReturnType<typeof vi.fn>, suggestAction: ReturnType<typeof vi.fn>, suggestDismiss: ReturnType<typeof vi.fn>, suggestCollapse: ReturnType<typeof vi.fn>, watchForget: ReturnType<typeof vi.fn>, node: unknown } {
  const view = createProjectionViewStore(defineStore).create()
  const openTasks = vi.fn()
  const openSession = vi.fn()
  const suggestAction = vi.fn()
  const suggestDismiss = vi.fn()
  const watchForget = vi.fn()
  const suggestCollapse = vi.fn()
  const node = ProjectionPanel(panelProps(value, view, {
    onOpenSession: openSession, onOpenTasks: openTasks, onSuggestAction: suggestAction,
    onSuggestDismiss: suggestDismiss, onWatchForget: watchForget, onSuggestCollapse: suggestCollapse,
  }, { statuses, catalog, ui }))
  return { tree: text(node), view, openTasks, openSession, suggestAction, suggestDismiss, suggestCollapse, watchForget, node }
}
/** Collect every string attribute value matching a key anywhere in the tree (data-* assertions). */
export function collectAttr(node: unknown, key: string, into: string[] = []): string[] {
  if (Array.isArray(node)) { for (const child of node) collectAttr(child, key, into); return into }
  const expanded = expand(node)
  if (expanded !== node) return collectAttr(expanded, key, into)
  if (node !== null && typeof node === 'object' && 'props' in node) {
    const props = (node as { props: Record<string, unknown> }).props
    if (typeof props[key] === 'string') into.push(props[key] as string)
    collectAttr(props['children'], key, into)
  }
  return into
}
export function findButton(node: unknown, label: string): { onClick?: () => void, disabled?: boolean } | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const hit = findButton(child, label)
      if (hit !== undefined) return hit
    }
    return undefined
  }
  const expanded = expand(node)
  if (expanded !== node) return findButton(expanded, label)
  if (node !== null && typeof node === 'object' && 'props' in node) {
    const props = (node as { props: { children?: unknown, onClick?: () => void, disabled?: boolean } }).props
    if (text(node) === label && props.onClick !== undefined) return props
    return findButton(props.children, label)
  }
  return undefined
}
/** Locate a node by its class name — for asserting on ATTRIBUTES (placeholders live there). */
export function findByClass(node: unknown, className: string): { className?: string, children?: unknown, placeholder?: string, value?: string, disabled?: boolean, onInput?: (event: { target: { value: string } }) => void, onKeyDown?: (event: { key: string, preventDefault: () => void }) => void } | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const hit = findByClass(child, className)
      if (hit !== undefined) return hit
    }
    return undefined
  }
  const expanded = expand(node)
  if (expanded !== node) return findByClass(expanded, className)
  if (node !== null && typeof node === 'object' && 'props' in node) {
    const props = (node as { props: { className?: string, children?: unknown } }).props
    if (props.className === className) return props
    return findByClass(props.children, className)
  }
  return undefined
}

/** Card labels are their full text; cards (unlike action buttons) are located by substring. */
export function findButtonBySubstring(node: unknown, label: string): { onClick?: () => void } | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const hit = findButtonBySubstring(child, label)
      if (hit !== undefined) return hit
    }
    return undefined
  }
  const expanded = expand(node)
  if (expanded !== node) return findButtonBySubstring(expanded, label)
  if (node !== null && typeof node === 'object' && 'props' in node) {
    const props = (node as { props: { children?: unknown, onClick?: () => void } }).props
    if (text(node).includes(label) && props.onClick !== undefined) return props
    return findButtonBySubstring(props.children, label)
  }
  return undefined
}
