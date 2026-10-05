/**
 * The post-write audit: what the write-time contract check cannot see (tri-line proposal
 * 2026-09-24, slice 1d; the caesarloo form — report, never block).
 *
 * `validateSkillDraft` already refuses an unusable frontmatter shape, so this pass covers the two
 * ways a *well-formed* skill still fails a future session: it points at a file that is not there
 * (the loader hands the model a pointer that hits a wall), and it carries what looks like a live
 * credential (the write surface is the attack surface — the ClawHavoc lesson). Findings ride the
 * `save_skill` result, so the model that just wrote the skill learns the problem in the same turn,
 * and the curation check, so the home cannot quietly keep a broken skill.
 *
 * @module dsh-smart-assistant/skills/audit
 */

import { access, constants } from 'node:fs/promises'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { CurationFinding } from '../home/health.ts'
import { listSkillFiles } from './scan.ts'

/** Credential shapes worth naming, deliberately conservative: prose must not trip them. */
const CREDENTIAL_PATTERNS: readonly { readonly pattern: RegExp, readonly label: string }[] = [
  { pattern: /-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----/, label: 'a private key block' },
  { pattern: /\bAKIA[0-9A-Z]{16}\b/, label: 'an AWS access key id' },
  { pattern: /\bsk-[A-Za-z0-9-]{20,}\b/, label: 'an API key (sk-…)' },
  { pattern: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/, label: 'a GitHub token' },
  {
    pattern: /\b(?:api[_-]?key|apikey|secret|token|password|passwd)\b\s*[:=]\s*["']?[A-Za-z0-9+/_=-]{16,}["']?/i,
    label: 'a credential assignment',
  },
]

/** Markdown links `[label](target)` — the explicit pointer form. */
const MARKDOWN_LINK = /\[[^\]]*\]\(([^)\s]+)(?:\s+[^)]*)?\)/g

/** Backticked paths into the spec's reserved `references/` convention. */
const REFERENCES_BACKTICK = /`((?:\.{1,2}\/)?references\/[^`|]+?)`/g

function looksLikeExternalTarget(target: string): boolean {
  return target.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('/')
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK)
    return true
  } catch {
    return false
  }
}

/**
 * Audit one skill's text for credential shapes.
 * @param name - Skill name, for the finding's refs.
 * @param text - The full skill file text (frontmatter and body — credentials rot in headers too).
 * @returns Credential findings; empty when the text looks clean.
 */
export function auditSkillCredentials(name: string, text: string): CurationFinding[] {
  const findings: CurationFinding[] = []
  for (const { pattern, label } of CREDENTIAL_PATTERNS) {
    if (!pattern.test(text)) continue
    findings.push({
      code: 'skill-credential-leak',
      severity: 'warn',
      message: `skill "${name}" carries what looks like ${label} — strip it from the skill, `
        + 'and rotate the credential if it was real: skills are plain files that travel',
      refs: [name],
    })
  }
  return findings
}

/**
 * Audit one skill's relative pointers: markdown links and backticked `references/` paths must
 * name a file that exists next to the bundle. URLs, anchors, and absolute paths are out of scope —
 * this is about the files a future session expects to find in the bundle.
 * @param name - Skill name, for the finding's refs.
 * @param baseDir - Directory relative targets resolve against (bundle dir, or room root for flat).
 * @param text - The full skill file text.
 * @returns Broken-reference findings; empty when every pointer resolves.
 */
export async function auditSkillReferences(
  name: string,
  baseDir: string,
  text: string,
): Promise<CurationFinding[]> {
  const targets = new Set<string>()
  for (const match of text.matchAll(MARKDOWN_LINK)) {
    const target = (match[1] ?? '').split('#')[0] ?? ''
    if (target.length > 0 && !looksLikeExternalTarget(target)) targets.add(target)
  }
  for (const match of text.matchAll(REFERENCES_BACKTICK)) {
    const target = (match[1] ?? '').split('#')[0] ?? ''
    if (target.length > 0) targets.add(target)
  }
  const findings: CurationFinding[] = []
  for (const target of targets) {
    if (await exists(join(baseDir, target))) continue
    findings.push({
      code: 'skill-broken-reference',
      severity: 'warn',
      message: `skill "${name}" points at "${target}", which does not exist next to its bundle — `
        + 'a future session following the pointer hits a wall: fix the path or ship the file',
      refs: [name, target],
    })
  }
  return findings
}

/**
 * Run both audits over one skill.
 * @param name - Skill name.
 * @param baseDir - Directory relative targets resolve against.
 * @param text - The full skill file text.
 * @returns Findings; empty when the skill is clean.
 */
export async function auditLearnedSkill(
  name: string,
  baseDir: string,
  text: string,
): Promise<CurationFinding[]> {
  return [...auditSkillCredentials(name, text), ...(await auditSkillReferences(name, baseDir, text))]
}

/**
 * Audit every skill file in a skills room (the archive is out of scope — retired skills stay
 * readable, they do not need to work).
 * @param skillsDir - Directory holding learned skill bundles and flat files.
 * @returns Findings across the room; unreadable files are left to the scan's own failures.
 */
export async function auditSkillsRoom(skillsDir: string): Promise<CurationFinding[]> {
  const findings: CurationFinding[] = []
  for (const entry of await listSkillFiles(skillsDir)) {
    const text = await readFile(entry.file, 'utf8').catch(() => undefined)
    if (text === undefined) continue
    findings.push(...await auditLearnedSkill(entry.name, entry.baseDir, text))
  }
  return findings
}
