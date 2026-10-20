/**
 * The desk's capture-status mirror: the platform's per-session status narrowed into the desk's
 * `CaptureStatus` shape and published as a snapshot store.
 *
 * One mirror per client apply — the seen-running set and the store live inside the mount, never
 * at module level. Like every module of this face it stays free of bare-runtime imports (tsdown
 * inlines the whole `src/client` tree into one classic script, see `./index.ts`).
 *
 * @module dsh-smart-assistant/client/desk-capture-status
 */

import type { ClientContext } from '../chrome/contracts'
import { readSeenRunning, writeSeenRunning } from '../local-state'
import type { CaptureStatus } from './desk-process'

/** The slice of the platform store module this mirror consumes (structural, like the entry's require). */
export interface SnapshotStore<T> {
  getSnapshot(): T
  subscribe(listener: () => void): () => void
  set(value: T): void
}

/** The store-module surface the mirror needs. */
export interface SnapshotStoreApi {
  createSnapshotStore<T>(initial: T): SnapshotStore<T>
}

/**
 * Mount the capture-status mirror for one apply: narrow the platform's per-session status into
 * `CaptureStatus` and publish it as a snapshot store.
 * @param ctx - the apply context's session-status face and effect owner.
 * @param storeApi - the platform store module; absent leaves the mirror unmounted.
 * @returns the store the desk panel reads, or undefined when no store module exists.
 */
export function mountSessionCaptureStatuses(
  ctx: Pick<ClientContext, 'uiSession' | 'effect'>,
  storeApi: SnapshotStoreApi | undefined,
): SnapshotStore<ReadonlyMap<string, CaptureStatus>> | undefined {
  // 片 1b: the platform's per-session status, mirrored into a snapshot store so the desk panel
  // can read it through a selector hook like the projection. The desk owns no copy of "whose
  // turn it is" — it re-reads the platform's own answer, which is what makes it survive a reload.
  // The injected face types `pendingInteraction` as `unknown` (it is a declaration-merged
  // domain value), so the shape is re-narrowed once, here, instead of being guessed at each
  // read. `completionUnread` is not in the injected type at all; it is read structurally.
  const toCaptureStatus = (value: { readonly running?: boolean, readonly pendingInteraction?: unknown }): CaptureStatus => {
    const pending = value.pendingInteraction as { readonly kind?: unknown } | null | undefined
    const completionUnread = (value as { readonly completionUnread?: boolean }).completionUnread
    return {
      ...(value.running === undefined ? {} : { running: value.running }),
      ...(pending === undefined || pending === null ? {} : { pendingInteraction: typeof pending.kind === 'string' ? { kind: pending.kind } : {} }),
      ...(completionUnread === true ? { completionUnread: true } : {}),
    }
  }
  const seenRunning = readSeenRunning()
  const readStatuses = (): ReadonlyMap<string, CaptureStatus> => new Map(
    [...(ctx.uiSession?.sessionStatus.getSnapshot() ?? [])].map(([id, value]) => {
      if (value.running === true && !seenRunning.has(id)) {
        seenRunning.add(id)
        writeSeenRunning(seenRunning)
      }
      return [id, { ...toCaptureStatus(value), seenRunning: seenRunning.has(id) }]
    }),
  )
  const sessionStatuses = storeApi?.createSnapshotStore<ReadonlyMap<string, CaptureStatus>>(readStatuses())
  if (sessionStatuses !== undefined && ctx.uiSession !== undefined) {
    const status = ctx.uiSession.sessionStatus
    ctx.effect(() => status.subscribe(() => { sessionStatuses.set(readStatuses()) }))
  }
  return sessionStatuses
}
