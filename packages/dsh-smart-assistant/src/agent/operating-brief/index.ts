/**
 * The operating-ledger prompt section: the standing instruction that entrusted business
 * matters ride the authoritative ledger, not chat prose.
 *
 * The tool exists to make ledger actions real (durable receipts, real provenance), but the
 * first behavioural run showed the model settling an entrust request in prose instead — a
 * tool nobody introduces is a tool the model rationally skips. This section is that
 * introduction: stable instruction text, so it sits in the instruction band right after the
 * home manual, never in the volatile tail band.
 *
 * @module dsh-smart-assistant/operating-brief
 */

import type { Context } from '@deepseek-ai/cordis'

export const name = 'assistant-operating-brief'

export const inject = ['systemPrompt']

/** Instruction band, right after the home manual (300); stable text, not volatile state. */
export const OPERATING_BRIEF_SECTION_ORDER = 400

const TEXT = [
  'Operating matters — entrusted payments, commitments, risks the principal asked you to track — live in one',
  'authoritative ledger, not in this chat\'s prose. When they entrust a new matter, report progress or a date',
  'change on one, or ask what is being tracked: use the assistant_operating tool (`desk` lists matters;',
  '`entrust`/`report`/`revise` carry the change with real provenance). Never settle a business change in prose',
  'alone. A major change you inferred yourself goes in as a `propose` awaiting their explicit decision:',
  'use `confirm` only when they explicitly confirm it, or `reject` only when they explicitly reject it;',
  'completion needs verbatim arrival evidence; a fragment that names no matter is `note`d unclaimed —',
  'attribution is never guessed by title. "Put it on the desk" / "add an item" is also the ledger\'s job:',
  '`entrust` a new matter with their words verbatim (`note` it unclaimed when it names no matter).',
  'Never route business matters into the session desk file `.desk/state.json` — the operating desk',
  'renders this ledger, not that file. Route by their intent and what the thing IS: things to act on',
  '(matters, deadlines, decisions to make) go to the ledger desk; facts, preferences and portrait',
  'corrections go to `assistant_memory`; reference knowledge to the knowledge room. Not everything',
  'belongs on the desk — but whatever they explicitly send to the desk is recorded verbatim, even',
  'when they call it a test or a demo (label it in the title). Never refuse or re-qualify an explicit',
  'entrust, and never announce a matter as "on the desk" without citing its receipt.',
  'When the principal says "process it" / "carry on" without naming what — the ledger knows:',
  '`desk` lists the matters, `read` the one in question (or ask which). NEVER reconstruct intent by',
  'searching the filesystem, session logs, or the harness home — that path demands sandbox approvals,',
  'reads things they never asked you to read, and is always the wrong move.',
].join('\n')

/**
 * Register the operating-ledger section.
 * @param ctx - Agent-plane context; the section covers every agent joined to this preset.
 */
export function apply(ctx: Context): void {
  ctx.systemPrompt.section({
    name: 'assistant:operating-brief',
    order: OPERATING_BRIEF_SECTION_ORDER,
    text: () => TEXT,
  })
}
