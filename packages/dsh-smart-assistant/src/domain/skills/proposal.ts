/**
 * The skill-proposal inbox (tri-line proposal 2026-09-24, phase 3): the entry side of the
 * governance gate. A proposal slot proposes; a person approves by editing `status` in the file
 * (the same review shape as knowledge drafts); `land_skill` materializes an approved proposal
 * into the skills room. Nothing a session writes promotes itself.
 *
 * The run2skill version-chain is realized as a `revision` counter on a single current file:
 * re-proposing the same name replaces the content and bumps the revision, so an approval always
 * binds to the content in the file at approval time — which is the chain's purpose (a stale
 * approval must never bless revised text). The rejected and landed statuses stay in place as
 * corpses, like every other exit in this home.
 *
 * @module dsh-smart-assistant/skills/proposal
 */

import type { RoomEntry } from '../home/room.ts'

/** Proposal lifecycle. */
export const PROPOSAL_STATUSES = ['proposed', 'approved', 'rejected', 'landed'] as const

/** A proposal's lifecycle status. */
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number]

/** One skill awaiting (or having had) human review. */
export interface SkillProposal {
  /** Proposal id and skill name (they are the same kebab-case string). */
  readonly id: string
  /** Lifecycle status; `approved` is always a hand edit. */
  readonly status: ProposalStatus
  /** How many times this name has been proposed; approval binds to the current revision. */
  readonly revision: number
  /** The proposed skill's description — what a future session would see first. */
  readonly description: string
  /** Optional extra trigger guidance. */
  readonly whenToUse?: string
  /** ISO-8601 creation timestamp of the first proposal of this name. */
  readonly created: string
  /** ISO-8601 timestamp of the last write. */
  readonly updated: string
  /** The session or source that proposed it. */
  readonly source?: string
  /** The proposed skill's body. */
  readonly body: string
}

/**
 * Report every reason a frontmatter mapping is not a valid proposal.
 * @param data - Parsed frontmatter fields.
 * @returns Problem descriptions; empty means valid.
 */
export function validateProposalData(data: Readonly<Record<string, unknown>>): string[] {
  const problems: string[] = []
  if (typeof data.description !== 'string' || data.description.trim().length === 0) {
    problems.push('missing description')
  }
  if (!PROPOSAL_STATUSES.includes(data.status as ProposalStatus)) {
    problems.push(`status must be one of ${PROPOSAL_STATUSES.join(', ')}`)
  }
  if (!Number.isInteger(data.revision) || (data.revision as number) < 1) {
    problems.push('revision must be a positive integer')
  }
  if (typeof data.created !== 'string' || data.created.length === 0) problems.push('missing created')
  if (typeof data.updated !== 'string' || data.updated.length === 0) problems.push('missing updated')
  if (data.whenToUse !== undefined && typeof data.whenToUse !== 'string') {
    problems.push('whenToUse must be a string')
  }
  if (data.source !== undefined && typeof data.source !== 'string') problems.push('source must be a string')
  return problems
}

/**
 * Read a proposal from a room entry.
 * @param entry - Parsed room entry; the id is the proposed skill's name.
 * @returns The proposal, or `undefined` when the entry is not a valid proposal.
 */
export function proposalFromEntry(entry: RoomEntry): SkillProposal | undefined {
  if (validateProposalData(entry.data).length > 0) return undefined
  if (entry.body.trim().length === 0) return undefined
  const data = entry.data
  return {
    id: entry.id,
    status: data.status as ProposalStatus,
    revision: data.revision as number,
    description: data.description as string,
    ...(typeof data.whenToUse === 'string' ? { whenToUse: data.whenToUse } : {}),
    created: data.created as string,
    updated: data.updated as string,
    ...(typeof data.source === 'string' ? { source: data.source } : {}),
    body: entry.body,
  }
}

/**
 * Render a proposal's frontmatter fields in reading order.
 * @param proposal - Proposal to serialize.
 * @returns Frontmatter fields and the body to write.
 */
export function proposalToDocument(proposal: SkillProposal): { data: Record<string, unknown>, body: string } {
  return {
    data: {
      status: proposal.status,
      revision: proposal.revision,
      created: proposal.created,
      updated: proposal.updated,
      ...(proposal.source !== undefined ? { source: proposal.source } : {}),
      description: proposal.description,
      ...(proposal.whenToUse !== undefined ? { whenToUse: proposal.whenToUse } : {}),
    },
    body: proposal.body,
  }
}

/**
 * Render the proposal-slot instruction for a completed goal.
 * @returns The message text, model-facing English.
 */
export function renderProposalPrompt(): string {
  return [
    '[Skill proposal slot] The goal just completed — a natural batch boundary. Reflect once on',
    'the whole run: if a procedure proved reusable, propose it with assistant_reflect',
    'action=propose_skill (name, description, body). It lands in the proposal inbox for a person',
    'to review — NOT in your skills. Proposing the same name again revises the proposal (the',
    'revision bumps and the old text is replaced). If nothing was reusable, say so in one line.',
  ].join('\n')
}
