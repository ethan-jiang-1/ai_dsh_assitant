/** Bind the projection data object to the calling apply fiber, not a Slot render lifetime. */
import { createProjectionReader } from './projection-reader'

type ReaderArguments = Parameters<typeof createProjectionReader>

/**
 * @param owner - Calling plugin context; effect owns abort and observable unsubscription.
 * @param connection - Active Client transport observations.
 * @param snapshot - Stable platform publisher, shared with Slot inject hooks.
 * @param web - Native browser Fetch/address adapter.
 * @returns Reader actions; unloading the calling fiber makes them inert.
 */
export function mountProjectionReader(
  owner: { effect: (install: () => () => void) => unknown },
  connection: ReaderArguments[0], snapshot: ReaderArguments[1], web: ReaderArguments[2],
): ReturnType<typeof createProjectionReader> {
  const reader = createProjectionReader(connection, snapshot, web)
  owner.effect(() => reader.dispose)
  return reader
}
