/**
 * The curation check: a pure function over the home's parsed files that reports what has rotted.
 *
 * This is the "let code check what code can check" half of the home's design. It never guesses and
 * never repairs — it names candidates (near-duplicates, dangling references, budget pressure,
 * threads that stopped moving, skills the loader would silently ignore) and leaves the decision to
 * the agent or the person. The same function backs `assistant_memory action=curate` and the tests,
 * so the brief the model reads and the brief CI asserts are the same brief.
 *
 * The rules live by family (`health-rooms.ts`, `health-skills.ts`) and this module composes them in
 * one stable order; the vocabulary is `health-types.ts`.
 *
 * @module dsh-smart-assistant/home/health
 */

import type { CurationBrief, CurationFinding, CurationInput } from './health-types.ts'
import { compareFindings } from './health-types.ts'
import { roomFindings } from './health-rooms.ts'
import { skillFindings } from './health-skills.ts'
import { skillUsageLines } from '../skills/usage.ts'

export { compareFindings } from './health-types.ts'

export type {
  CurationBrief,
  CurationFinding,
  CurationInput,
  FindingCode,
  LearnedSkillInfo,
} from './health-types.ts'

/**
 * Check a home's parsed state.
 * @param input - Parsed records, threads, skills, and the current digest size.
 * @returns Findings (warns first) and headline counts.
 */
export function curateHome(input: CurationInput): CurationBrief {
  // Room findings come first and skill findings second: `sort` is stable, so this order is the
  // tie-break within one severity — the order the brief has always shipped.
  const findings: CurationFinding[] = [...roomFindings(input), ...skillFindings(input)]

  findings.sort(compareFindings)

  const openThreads = input.threads.filter(thread => thread.status === 'open').length
  // Usage lines cover loadable learned skills only: a shadowed name's loads belong to the
  // winning provider's body, so attributing them to the shadowed bundle would read as use.
  const shadowedNames = new Set(Object.keys(input.shadowedSkills))
  const learnedNames = input.skills
    .flatMap(skill => skill.name !== undefined ? [skill.name] : [])
    .filter(name => !shadowedNames.has(name))
  return {
    findings,
    skillUsage: skillUsageLines(input.skillUsage, learnedNames, input.now, 'least-used'),
    ...(input.skillUsageSince !== undefined ? { skillUsageSince: input.skillUsageSince } : {}),
    counts: {
      memories: input.memories.length,
      activeMemories: input.memories.filter(record => record.status === 'active').length,
      threads: input.threads.length,
      openThreads,
      parkedThreads: input.threads.filter(thread => thread.status === 'parked').length,
      learnedSkills: input.skills.length,
      knowledgePages: input.knowledgePages,
      retiredSkillBundles: input.retiredSkillBundles,
      skillSnapshots: input.skillSnapshots,
      digestBytes: input.digestBytes,
      digestMaxBytes: input.digestMaxBytes,
    },
  }
}
