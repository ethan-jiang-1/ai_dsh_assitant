/**
 * Fixture-testable cores of the mechanical gates, consumed by scripts/verify.mjs and pinned by
 * the per-family specs in packages/dsh-smart-assistant/tests/tooling/.
 *
 * Since 2026-10-14 the cores live in scripts/checks/gates/<family>.mjs (one module per gate
 * family; cross-family helpers live in gates/shared.mjs, which this barrel deliberately does
 * NOT re-export). This file remains the single import surface so verify.mjs and the fixtures
 * never name a family path, and gateWiringProblems still sees exactly the wired cores.
 *
 * Each exported function takes the paths/inputs it needs and returns a list of problem strings
 * (empty = pass). verify.mjs owns what counts as the corpus and the exit code; these functions
 * own the diagnostics, so every accepted and rejected shape can be exercised against throwaway
 * fixtures without touching the real vendor tree, ROADMAP, or notes.
 */
export * from './gates/backlog.mjs'
export * from './gates/build-freshness.mjs'
export * from './gates/corpus-links.mjs'
export * from './gates/commit-safety.mjs'
export * from './gates/dev-tree.mjs'
export * from './gates/docs-commands.mjs'
export * from './gates/frontmatter-config.mjs'
export * from './gates/home-doc-contract.mjs'
export * from './gates/identity-composition.mjs'
export * from './gates/language-text.mjs'
export * from './gates/notes-governance.mjs'
export * from './gates/resolution.mjs'
export * from './gates/self-containment.mjs'
export * from './gates/test-client-safety.mjs'
export * from './gates/tool-comments.mjs'
export * from './gates/vendor-release.mjs'
