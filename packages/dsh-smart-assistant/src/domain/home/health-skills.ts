/**
 * Learned-skill curation findings: usage-ledger health, shadowing, use-by dates, and the naming
 * and provenance rules the loader depends on. Pure; the caller assembles the input.
 *
 * @module dsh-smart-assistant/home/health-skills
 */

import type { CurationFinding, CurationInput } from './health-types.ts'
import { ageInDays } from './health-support.ts'

/** Check the learned skill bundles against the usage ledger and the loader's name rules. */
export function skillFindings(input: CurationInput): CurationFinding[] {
  const findings: CurationFinding[] = []

  if (input.skillUsageFailure !== undefined) {
    findings.push({
      code: 'skill-usage-unreadable',
      severity: 'warn',
      message: `${input.skillUsageFailure.path} is not a readable usage ledger `
        + `(${input.skillUsageFailure.reason}) — counts read as zero and would mislead a retirement decision`,
      refs: [input.skillUsageFailure.path],
    })
  }

  for (const [name, provider] of Object.entries(input.shadowedSkills)) {
    findings.push({
      code: 'skill-shadowed',
      severity: 'warn',
      message: `learned skill "${name}" is shadowed by provider "${provider}", which owns that name `
        + 'in the catalog — the learned bundle will never load: rename it and retire the shadowed '
        + 'bundle, or make the curated one yield',
      refs: [name],
    })
  }

  // Use-by dates: the age anchor is the last load from the usage ledger, or the learnedAt stamp
  // for a skill never loaded. A skill with neither (hand-written, no provenance) cannot be dated
  // and is left to its own findings; a shadowed skill's exit is the shadow finding above, and its
  // name-keyed ledger loads belong to the winner anyway.
  for (const skill of input.skills) {
    const name = skill.name
    if (name === undefined || name in input.shadowedSkills) continue
    const used = input.skillUsage[name]
    const anchor = used?.lastUsedAt ?? skill.learnedAt
    if (anchor === undefined) continue
    const age = ageInDays(anchor, input.now)
    if (!Number.isFinite(age)) continue
    const days = Math.floor(age)
    if (age > input.retireSkillDays) {
      findings.push({
        code: 'skill-retirable',
        severity: 'warn',
        message: `skill "${name}" has been unused for ${days} days, past the ${input.retireSkillDays}-day `
          + `threshold${used !== undefined ? ` (last loaded ${anchor.slice(0, 10)})` : ` (never loaded since it was learned ${anchor.slice(0, 10)})`}: `
          + 'retire it with assistant_reflect action=retire_skill — the bundle moves to skills/archive/ '
          + 'and stays recoverable',
        refs: [name],
      })
    } else if (age > input.staleSkillDays) {
      findings.push({
        code: 'skill-stale',
        severity: 'info',
        message: `skill "${name}" has not been loaded for ${days} days: keep it if it still matters, `
          + 'otherwise retire it',
        refs: [name],
      })
    }
  }

  for (const skill of input.skills) {
    if (skill.name === undefined) {
      findings.push({
        code: 'skill-missing-description',
        severity: 'warn',
        message: `skill bundle "${skill.dirName}" has no readable frontmatter — the loader ignores it`,
        refs: [skill.dirName],
      })
      continue
    }
    if (skill.name !== skill.dirName) {
      findings.push({
        code: 'skill-name-mismatch',
        severity: 'warn',
        message: `skill "${skill.name}" lives in directory "${skill.dirName}": `
          + 'the bundle is loaded by directory, so the two must agree',
        refs: [skill.name, skill.dirName],
      })
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(skill.name)) {
      findings.push({
        code: 'skill-invalid-name',
        severity: 'warn',
        message: `skill name "${skill.name}" is not kebab-case — the loader ignores it`,
        refs: [skill.name],
      })
    }
    if (skill.description === undefined || skill.description.trim().length === 0) {
      findings.push({
        code: 'skill-missing-description',
        severity: 'warn',
        message: `skill "${skill.name}" has no description, so no future session will know when to load it`,
        refs: [skill.name],
      })
    }
    if (skill.origin === undefined) {
      findings.push({
        code: 'skill-without-provenance',
        severity: 'info',
        message: `skill "${skill.name}" carries no metadata.origin — it was hand-written, or written `
          + 'without assistant_reflect',
        refs: [skill.name],
      })
    }
  }

  return findings
}
