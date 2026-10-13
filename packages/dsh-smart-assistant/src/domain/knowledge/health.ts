/**
 * The knowledge-room curation check (tri-line proposal 2026-09-24, phase 2 slice 2c): the same
 * "let code check what code can check" contract as the home check, over the page graph.
 *
 * Broken-link tiers follow the OKF semantics the proposal settled (D7): a link whose target does
 * not exist is info — it may simply be not-yet-written knowledge; a link into a deprecated page
 * is warn — expired knowledge is still being cited; ambiguity and unreadable files are error —
 * both make retrieval silently wrong. Orphan pages, due `stale_after` stamps, aging drafts, and
 * stable pages without sources round out the graph's health.
 *
 * @module dsh-smart-assistant/knowledge/health
 */

import type { CurationFinding } from '../home/health.ts'
import type { RoomReadFailure } from '../home/room.ts'
import { MS_PER_DAY } from '../home/time.ts'
import { backlinksOf, resolveWikiLink, type KnowledgePage } from './page.ts'

/** What the knowledge check reads. */
export interface KnowledgeCurationInput {
  /** Parsed pages in the room. */
  readonly pages: readonly KnowledgePage[]
  /** Knowledge files that did not parse as pages. */
  readonly failures: readonly RoomReadFailure[]
  /** Timestamp used for age comparisons. */
  readonly now: Date
  /** Age at which a draft page is reported as stalled (mirrors the research room). */
  readonly staleResearchDays: number
}

function ageInDays(stamp: string, now: Date): number | undefined {
  const at = Date.parse(stamp)
  if (Number.isNaN(at)) return undefined
  return (now.getTime() - at) / MS_PER_DAY
}

/**
 * Check the knowledge room's page graph.
 * @param input - Parsed pages, unreadable files, and the clocks.
 * @returns Findings; the caller merges them into the home's curation brief.
 */
export function curateKnowledge(input: KnowledgeCurationInput): CurationFinding[] {
  const findings: CurationFinding[] = []
  const pages = input.pages

  for (const failure of input.failures) {
    findings.push({
      code: 'page-unreadable',
      severity: 'error',
      message: `${failure.path} is not a readable knowledge page (${failure.reason}) — a broken `
        + 'page silently leaves the room and its links',
      refs: [failure.path],
    })
  }

  for (const page of pages) {
    const seenTargets = new Set<string>()
    for (const target of page.links) {
      if (seenTargets.has(target)) continue
      seenTargets.add(target)
      const resolution = resolveWikiLink(target, pages)
      if (resolution.kind === 'missing') {
        findings.push({
          code: 'page-link-unwritten',
          severity: 'info',
          message: `"${page.id}" links to [[${target}]], which is not written yet — fine while the `
            + 'knowledge is still growing; write the page or drop the link when it never will be',
          refs: [page.id, target],
        })
      } else if (resolution.kind === 'ambiguous') {
        findings.push({
          code: 'page-link-ambiguous',
          severity: 'error',
          message: `[[${target}]] on "${page.id}" matches several page titles `
            + `(${resolution.candidates.join(', ')}) — retrieval cannot tell which one is meant: `
            + 'link by id or make the titles distinct',
          refs: [page.id, ...resolution.candidates],
        })
      } else if (resolution.page.status === 'deprecated') {
        findings.push({
          code: 'page-link-deprecated',
          severity: 'warn',
          message: `"${page.id}" still cites [[${target}]], which is deprecated — expired knowledge `
            + 'is being referenced as current: update the link or revive the page',
          refs: [page.id, target],
        })
      }
    }

    if (page.status === 'stable' && page.sources.length === 0) {
      findings.push({
        code: 'page-unproven',
        severity: 'warn',
        message: `stable page "${page.id}" carries no sources — unproven knowledge reads as `
          + 'established: add where it came from, or move it back to draft',
        refs: [page.id],
      })
    }

    if (page.status === 'stable' && page.links.length === 0 && backlinksOf(page, pages).length === 0) {
      findings.push({
        code: 'page-orphan',
        severity: 'info',
        message: `stable page "${page.id}" neither links out nor is linked to — an island the `
          + 'room cannot navigate to: link it to its neighbours or deprecate it',
        refs: [page.id],
      })
    }

    if (page.staleAfter !== undefined) {
      const due = Date.parse(page.staleAfter)
      if (!Number.isNaN(due) && input.now.getTime() > due) {
        findings.push({
          code: 'page-stale',
          severity: 'info',
          message: `page "${page.id}" passed its stale_after (${page.staleAfter}) — due for review: `
            + 'refresh it, or deprecate it while its content is still checkable',
          refs: [page.id],
        })
      }
    }

    if (page.status === 'draft' && page.generated !== undefined) {
      const age = ageInDays(page.generated.at, input.now)
      if (age !== undefined && age > input.staleResearchDays) {
        findings.push({
          code: 'page-draft-stale',
          severity: 'info',
          message: `draft page "${page.id}" has waited more than ${input.staleResearchDays} days for `
            + 'review — pick an exit: review it to stable (it needs sources) or deprecate it',
          refs: [page.id],
        })
      }
    }
  }

  return findings
}
