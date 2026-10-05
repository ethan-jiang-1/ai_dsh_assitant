/**
 * The stable package entry: a thin re-export of the host-plane service implementation
 * (`src/host/index.ts`). This file owns no logic — every export (including the default
 * `AssistantMemory` service class and the `ctx.assistantMemory` cordis module augmentation,
 * which lives with the implementation) keeps the same identity it had when the entry was
 * the implementation itself. Subpath rows resolve through package.json exports, which point
 * at the built tree (`lib/`) that mirrors `src/` — moving an implementation file moves its
 * lib output, and only the exports targets change, never the keys.
 */
export * from './host/index.ts'
export { default } from './host/index.ts'
