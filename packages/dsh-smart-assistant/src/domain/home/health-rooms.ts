/**
 * Room-level curation findings: unreadable entries, duplicate ids, byte budgets, dangling
 * references, stalled threads and the digest budget. Pure; the caller assembles the input.
 *
 * @module dsh-smart-assistant/home/health-rooms
 */

import type { CurationFinding, CurationInput } from './health-types.ts'
import { ageInDays, findNearDuplicates } from './health-support.ts'

/** Check the rooms themselves (memory, research, notes/identity budgets, digest pressure). */
export function roomFindings(input: CurationInput): CurationFinding[] {
  const findings: CurationFinding[] = []
  const known = new Set(input.knownIds)


  for (const failure of [...input.memoryFailures, ...input.researchFailures]) {
    findings.push({
      code: 'unreadable-file',
      severity: 'warn',
      message: `${failure.path} is not a readable entry (${failure.reason}) — `
        + 'a file that does not parse is silently absent from the digest',
      refs: [failure.path],
    })
  }

  for (const id of input.duplicatedIds) {
    findings.push({
      code: 'duplicate-id',
      severity: 'warn',
      message: `"${id}" exists both in a room and in its archive — bookkeeping went wrong`,
      refs: [id],
    })
  }

  if (
    input.notesBytes !== undefined
    && input.notesMaxBytes !== undefined
    && input.notesBytes > input.notesMaxBytes
  ) {
    findings.push({
      code: 'notes-over-budget',
      severity: 'warn',
      message: `the working folder notes (AGENTS.md) are ${String(input.notesBytes)} bytes but the `
        + `prompt keeps ${String(input.notesMaxBytes)} — the tail is cut from every request; shorten the `
        + 'file or move detail into a skill',
      refs: ['AGENTS.md'],
    })
  }

  if (
    input.soulBytes !== undefined
    && input.soulMaxBytes !== undefined
    && input.soulBytes > input.soulMaxBytes
  ) {
    findings.push({
      code: 'soul-over-budget',
      severity: 'warn',
      message: `the identity file (SOUL.md) is ${String(input.soulBytes)} bytes but the prompt keeps `
        + `${String(input.soulMaxBytes)} — the voice is cut from every request; shorten the file`,
      refs: ['SOUL.md'],
    })
  }

  for (const record of input.memories) {
    if (record.supersedes !== undefined && !known.has(record.supersedes)) {
      findings.push({
        code: 'dangling-reference',
        severity: 'warn',
        message: `"${record.id}" supersedes "${record.supersedes}", which does not exist`,
        refs: [record.id, record.supersedes],
      })
    }
  }

  for (const thread of input.threads) {
    if (thread.promotedTo !== undefined && !known.has(thread.promotedTo)) {
      findings.push({
        code: 'dangling-reference',
        severity: 'warn',
        message: `"${thread.id}" was promoted to "${thread.promotedTo}", which does not exist`,
        refs: [thread.id, thread.promotedTo],
      })
    }
    if (thread.status === 'open' && ageInDays(thread.updated, input.now) > input.staleResearchDays) {
      findings.push({
        code: 'stale-thread',
        severity: 'info',
        message: `"${thread.id}" has been open for more than ${input.staleResearchDays} days: `
          + 'pick an exit — promote, park, or drop it with a reason',
        refs: [thread.id],
      })
    }
  }

  findings.push(...findNearDuplicates(input.memories))

  if (input.digestTruncated) {
    // The message names what is actually being squeezed (2026-10-02 keying fix): memory-line
    // omission is actionable by memory consolidation; lower-section truncation is not — pointing
    // the model at memory retirement there would misdirect the cure.
    findings.push({
      code: 'digest-over-budget',
      severity: 'warn',
      message: input.digestOmittedMemories > 0
        ? `the digest hit its ${input.digestMaxBytes}-byte budget and ${String(input.digestOmittedMemories)} `
          + 'active memory record(s) are invisible in every session — retire the weakest active records or tighten their phrasing'
        : `the digest hit its ${input.digestMaxBytes}-byte budget — lower-priority lines (threads / knowledge `
          + 'signposts) are omitted from the desktop, but every memory still rides and the rooms stay intact '
          + 'and searchable; memory writes remain open. Raise the budget only if the omitted signposts matter '
          + 'more than the resident-context cost',
      refs: [],
    })
  }

  return findings
}
