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
  'alone. A major change you inferred yourself goes in as a `propose` awaiting their explicit confirmation;',
  'completion needs verbatim arrival evidence; a fragment that names no matter is `note`d unclaimed —',
  'attribution is never guessed by title.',
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
