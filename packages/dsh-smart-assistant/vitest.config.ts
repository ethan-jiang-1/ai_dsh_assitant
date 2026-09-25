import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/**
 * Two pinned vendor packages ship **declarations only** in this checkout — `lib/types/**` is
 * committed, the JS bundle is produced by the release pipeline — so bare-name resolution through
 * `node_modules` fails for them. The dev runtime never notices, because `pnpm gen-paths` maps
 * `@deepseek-ai/*` to vendor **src**; these aliases make the tests resolve the same source a real
 * session runs, instead of diverging from it (or crashing).
 *
 * Exact matches only: subpath imports must keep going through the package's own exports map.
 *
 * A general "resolve every vendor package to src" variant was attempted on 2026-09-25 and reverted:
 * it needs the whole vendor graph to be source-complete (nested `vendor/*` packages included) plus a
 * directory→entry-file mapping — more machinery than these two packages justify. See
 * notes/implemented/2026-09-25-dsh-0-1-7-migration.md for the vendor-rebuild blocker it ran into.
 */
const vendorSource = relative =>
  fileURLToPath(new URL(`../../vendor/dsh/packages/preset/${relative}`, import.meta.url))

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@deepseek-ai\/dsh-agent-preset$/, replacement: vendorSource('agent-preset/src/index.ts') },
      { find: /^@deepseek-ai\/dsh-agent-preset-registry$/, replacement: vendorSource('agent-preset-registry/src/index.ts') },
    ],
  },
})
