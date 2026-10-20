/**
 * The desk suggestion block's handlers: the 试跑/盯上 deliveries through the arms' capture lane,
 * and the dismiss/forget/collapse clicks on the client-local proactive UI state. The Chinese
 * prompts and labels the handlers submit are the product copy — they live here, with the
 * handlers that submit them.
 *
 * `createProactiveHandlers` is a factory rather than module state for the same reason as the
 * arms: the bound faces are per materialization. Like every module of this face it stays free of
 * bare-runtime imports (tsdown inlines the whole `src/client` tree into one classic script, see
 * `./index.ts`).
 *
 * @module dsh-smart-assistant/client/proactive-handlers
 */

import { forgetAcceptedWatch, forgetPendingWatch, PROACTIVE_SUGGESTIONS, rememberPendingWatch } from './proactive-face'
import type { ProactiveUiState } from './proactive-face'
import { writeProactiveUi } from '../local-state'

/** The proactive UI snapshot store the handlers read and set. */
interface ProactiveUiStore {
  getSnapshot(): ProactiveUiState
  subscribe(listener: () => void): () => void
  set(value: ProactiveUiState): void
}

/** The arms face the watch handler needs: the capture lane into the intake conversation. */
interface CaptureArms {
  captureFromDesk(text: string, options?: { lane?: 'capture' | 'action', label?: string }): Promise<string | undefined>
}

/** Everything the handlers close over. */
export interface ProactiveHandlerDeps {
  readonly arms: CaptureArms
  readonly proactiveUi: ProactiveUiStore | undefined
}

/** The suggestion-block action faces the desk's main slot injects. */
export interface ProactiveHandlers {
  onSuggestAction(kind: 'trial' | 'watch', id: string): Promise<void>
  onSuggestDismiss(id: string): void
  onWatchForget(title: string): void
  onSuggestCollapse(collapsed: boolean): void
}

/**
 * Build the suggestion handlers over one desk materialization.
 * @param deps - the arms' capture lane and the proactive UI store.
 * @returns the four action faces the main slot injects.
 */
export function createProactiveHandlers(deps: ProactiveHandlerDeps): ProactiveHandlers {
  const { arms, proactiveUi } = deps
  const suggestName = (id: string): string | undefined => PROACTIVE_SUGGESTIONS.find(suggestion => suggestion.id === id)?.name
  const onSuggestAction = async (kind: 'trial' | 'watch', id: string): Promise<void> => {
    // A watch acceptance is remembered by its DELIVERY SESSION (session-keyed reconciliation, 2026-10-19): the model builds
    // the schedule while serving that session, and the catalog reports the receiving session,
    // so the pending acceptance can be reconciled without guessing a model-built title.
    const isRetry = id.startsWith('retry:')
    const name = suggestName(id) ?? (isRetry ? id.slice('retry:'.length) : undefined)
    if (name === undefined) return
    if (kind === 'trial') {
      void arms.captureFromDesk(
        `先试跑一次「${name}」：现在就按这个口径替我看一遍——真读真判断、不建排程、不写账本，看完用一句话说结论，并说明想停的时候怎么说。`,
        { lane: 'action', label: `先试跑「${name}」` },
      )
      return
    }
    const sessionId = await arms.captureFromDesk(
      `替我盯上「${name}」：按既有技能替我建对应的排程（title 用本人看得懂的话），建完同回合回一句盯守口径，并说明不想收的时候怎么说一声就停。`,
      { lane: 'action', label: isRetry ? `再试一次「${name}」` : `替你盯上「${name}」` },
    )
    if (sessionId !== undefined && proactiveUi !== undefined) {
      const next = rememberPendingWatch(proactiveUi.getSnapshot(), { id, name, at: new Date().toISOString(), sessionId })
      proactiveUi.set(next)
      writeProactiveUi(next)
    }
  }
  const onSuggestDismiss = (id: string): void => {
    if (proactiveUi === undefined) return
    const current = proactiveUi.getSnapshot()
    const next: ProactiveUiState = { ...current, ignored: [...current.ignored, id] }
    proactiveUi.set(next)
    writeProactiveUi(next)
  }
  // The Q5 row's 忽略 (261019): forget a failed acceptance by title/name. Without this the row
  // was permanent — the only action (retry) appended another acceptance for the same title.
  const onWatchForget = (title: string): void => {
    if (proactiveUi === undefined) return
    const next = forgetPendingWatch(forgetAcceptedWatch(proactiveUi.getSnapshot(), title), title)
    proactiveUi.set(next)
    writeProactiveUi(next)
  }
  // The suggestion block's collapse (261019): client-local, default expanded, persisted so a
  // principal who finds it heavy does not have to collapse it on every visit.
  const onSuggestCollapse = (collapsed: boolean): void => {
    if (proactiveUi === undefined) return
    const next: ProactiveUiState = { ...proactiveUi.getSnapshot(), collapsed }
    proactiveUi.set(next)
    writeProactiveUi(next)
  }
  return { onSuggestAction, onSuggestDismiss, onWatchForget, onSuggestCollapse }
}
