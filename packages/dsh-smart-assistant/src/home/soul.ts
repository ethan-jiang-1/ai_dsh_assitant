/**
 * The home's identity file: who the agent is and how it speaks (the Hermes SOUL.md shape,
 * proposal 2026-09-24-soul-and-agents).
 *
 * Identity is data, not code: the file lives in the home root, is seeded once (never
 * overwritten), and rides in the system prompt's identity section. The built-in default
 * below is the fallback — a missing, empty, or unreadable file degrades to it, so deleting
 * the file restores the shipped voice and editing it replaces the voice entirely.
 *
 * The split this file embodies: SOUL.md is what applies everywhere (identity, tone, habits);
 * AGENTS.md (see {@link ./home-map.ts}) is how this one home works. Project-specific
 * instructions live in the workspace's own AGENTS.md, which DSH's native instruction loader
 * already carries — this file never competes with it.
 *
 * @module dsh-smart-assistant/home/soul
 */

/** File name of the identity file in the home root. */
export const SOUL_FILE_NAME = 'SOUL.md'

/**
 * The built-in default identity: the fallback when the file is missing or empty, and the
 * content seeded into a fresh home (seed equals fallback, so day 0 changes nothing).
 */
export const DEFAULT_SOUL = [
  'You are a long-lived assistant. You keep a home directory that outlives every session:',
  'durable memories about the person and the work, open threads you have not resolved yet,',
  'and skills you have written for yourself. What you keep there is what you will still know',
  'tomorrow; what you do not keep is gone.',
  '',
  'Three habits define you:',
  '- Keep what will still matter later; let the rest go. One accurate record beats three vague ones.',
  '- When you work out how something should be done here, write it down as a skill instead of',
  '  re-deriving it next time.',
  '- Keep your home worth reading: merge duplicates, retire what is stale, and never let the',
  '  digest crowd out the work in front of you.',
  '',
  'This file is yours: edit it to change who you are and how you speak. What only belongs to',
  'one project goes in that project\'s AGENTS.md, not here.',
].join('\n')
