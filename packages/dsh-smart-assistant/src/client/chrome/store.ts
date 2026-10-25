/**
 * A tiny local snapshot-store surface for the browser half. The web shell's module table does
 * not carry `@deepseek-ai/dsh-client-store` (it is a package-library, not a client module), and
 * a bare runtime import is forbidden by the browser-bundle gate. The two primitives used here
 * are small enough to own: a snapshot store and an immer-free action store whose actions mutate
 * a shallow draft. Business state is flat or replaces nested objects, so this is sufficient.
 */

/** A synchronous snapshot store consumed by the slot renderer's `useStore`. */
export interface SnapshotStore<T> {
  getSnapshot(): T
  subscribe(listener: () => void): () => void
  set(value: T): void
}

/** The bound actions a component sees: the draft argument is removed. */
type BoundActions<A extends Record<string, (...args: any[]) => any>> = {
  [K in keyof A]: A[K] extends (draft: any, ...args: infer P) => any ? (...args: P) => void : never
}

/** A store definition handle: `create()` returns one fresh instance per mount. */
export interface StoreHandle<S, A extends Record<string, (draft: S, ...args: any[]) => void>> {
  readonly spec: { init(): S; actions: A }
  create(): {
    getSnapshot(): S
    subscribe(listener: () => void): () => void
    actions: BoundActions<A>
  }
}

/**
 * Create a snapshot store.
 * @param initial - Initial snapshot.
 * @returns get/subscribe/set with reference-change notification.
 */
export function createSnapshotStore<T>(initial: T): SnapshotStore<T> {
  let value = initial
  const listeners = new Set<() => void>()
  return {
    getSnapshot: () => value,
    subscribe: listener => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    set: next => {
      if (Object.is(next, value)) return
      value = next
      for (const listener of [...listeners]) listener()
    },
  }
}

/**
 * Define a non-persistent action store.
 * @param spec - `init()` and draft-mutating actions.
 * @returns a handle whose `create()` owns one instance.
 */
export function defineStore<S, A extends Record<string, (draft: S, ...args: any[]) => void>>(spec: {
  init(): S
  actions: A
}): StoreHandle<S, A> {
  return {
    spec,
    create() {
      let state = spec.init()
      const listeners = new Set<() => void>()
      const actions = Object.fromEntries(Object.entries(spec.actions).map(([name, action]) => [name, (...args: any[]) => {
        const draft = { ...state } as S
        action(draft, ...args)
        state = draft
        for (const listener of [...listeners]) listener()
      }])) as BoundActions<A>
      return {
        getSnapshot: () => state,
        subscribe: listener => {
          listeners.add(listener)
          return () => { listeners.delete(listener) }
        },
        actions,
      }
    },
  }
}
