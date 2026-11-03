/**
 * Internal helpers for the curation check: near-duplicate detection and the home-family aging
 * arithmetic. Deliberately not a shared `time.ts` helper — each room's `ageInDays` has its own
 * NaN contract (`time.ts` records why), and this one belongs to the home checks only.
 *
 * @module dsh-smart-assistant/home/health-support
 */

import type { MemoryRecord } from '../memory/record.ts'
import type { CurationFinding } from './health-types.ts'
import { MS_PER_DAY } from './time.ts'

const NEAR_DUPLICATE_THRESHOLD = 0.6
const MAX_DUPLICATE_PAIRS = 10

function tokens(text: string): Set<string> {
  const set = new Set<string>()
  for (const token of text.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
    if (token.length >= 3) set.add(token)
  }
  return set
}

function jaccard(left: ReadonlySet<string>, right: ReadonlySet<string>): number {
  if (left.size === 0 || right.size === 0) return 0
  let shared = 0
  for (const token of left) if (right.has(token)) shared += 1
  return shared / (left.size + right.size - shared)
}

export function ageInDays(updated: string, now: Date): number {
  const at = Date.parse(updated)
  if (Number.isNaN(at)) return Number.POSITIVE_INFINITY
  return (now.getTime() - at) / MS_PER_DAY
}

export function findNearDuplicates(memories: readonly MemoryRecord[]): CurationFinding[] {
  const findings: CurationFinding[] = []
  const tokenSets = memories.map(record => tokens(record.text))
  for (let left = 0; left < memories.length; left += 1) {
    for (let right = left + 1; right < memories.length; right += 1) {
      const leftRecord = memories[left]
      const rightRecord = memories[right]
      if (leftRecord === undefined || rightRecord === undefined) continue
      const overlap = jaccard(tokenSets[left] ?? new Set(), tokenSets[right] ?? new Set())
      if (overlap < NEAR_DUPLICATE_THRESHOLD) continue
      findings.push({
        code: 'near-duplicate',
        severity: 'info',
        message: `"${leftRecord.id}" and "${rightRecord.id}" say nearly the same thing `
          + `(${Math.round(overlap * 100)}% overlap): keep the better-phrased one and supersede the other`,
        refs: [leftRecord.id, rightRecord.id],
      })
      if (findings.length >= MAX_DUPLICATE_PAIRS) return findings
    }
  }
  return findings
}

