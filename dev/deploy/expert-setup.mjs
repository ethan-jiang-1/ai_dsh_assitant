#!/usr/bin/env node
/**
 * Turn a (fresh) assistant working folder into the management-post expert's folder — the one
 * command of the expert deployment assembly (repo README「方向判据」: P1 base + O5 one-command shape).
 *
 * What it does, and what it deliberately does NOT do:
 *   · SOUL.md — written ONLY while it is still the untouched generic seed. An edited soul is the
 *     principal's identity; overwriting it would be the assembly erasing its owner.
 *   · Knowledge seeds — imported as drafts through the same governed path as any document
 *     (`sources` required, provenance honest). Drafts do not enter search or the digest: promoting
 *     them to stable is the principal's approval, made by hand.
 *   · The deployment shape (read-only permissions, preset default) lives in the profile patch,
 *     not here — permission is a deployment decision, not a folder decision.
 *
 * Usage:
 *   node scripts/expert-setup.mjs --data-dir <assistant dir>
 *
 * @module scripts/expert-setup
 */
import { readdir, readFile } from 'node:fs/promises'
import { existsSync, mkdirSync } from 'node:fs'
import { basename, dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import AssistantMemory from '../../packages/dsh-smart-assistant/src/index.ts'
import { DEFAULT_SOUL } from '../../packages/dsh-smart-assistant/src/home/soul.ts'
import { planSourcePage } from '../../packages/dsh-smart-assistant/src/knowledge/ingest.ts'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const argv = process.argv.slice(2)
const dataDirArg = argv.includes('--data-dir') ? argv[argv.indexOf('--data-dir') + 1] : undefined
if (dataDirArg === undefined) {
  console.error('usage: node scripts/expert-setup.mjs --data-dir <assistant dir>')
  process.exit(2)
}
const dataDir = resolve(dataDirArg)

const MANAGEMENT_SOUL = [
  'You are a management-post expert serving one principal — a founder or executive of a small',
  'company. Your value is judgement made visible: problems taken apart into facts, testable',
  'hypotheses, criteria and actions; plans whose every action has an owner, a timing, a metric',
  'and a stop condition; and an honest "I do not know" when the knowledge is not there.',
  '',
  'Working habits:',
  '- You assist; you do not represent. Anything that leaves the desk goes out under the',
  '  principal\'s name, and they see it first.',
  '- Facts need provenance. Company facts — headcount, margins, customers, thresholds — come',
  '  from the principal or your knowledge room, never from you.',
  '- Where the lenses disagree (whole outcome, cash, customer reality), keep the disagreement',
  '  visible; the principal decides.',
  '- Learn the principal\'s standards: when you adopt one of their criteria, remember where you',
  '  learned it, and say so.',
  '',
  'This file is yours: edit it to change who you are and how you speak. What only belongs to one',
  'project goes in that project\'s AGENTS.md, not here.',
].join('\n') + '\n'

const seedDir = join(repoRoot, 'packages/dsh-smart-assistant/seeds/management')
mkdirSync(dataDir, { recursive: true })
const service = new AssistantMemory(new Context(), { dataDir })
const soulPath = join(dataDir, 'SOUL.md')

// The scaffold is asynchronous (the service prewarms on construction); wait for it to lay down the
// seed soul before deciding whether to replace it — racing it would read a half-born folder.
for (let waited = 0; !existsSync(soulPath) && waited < 5000; waited += 100) {
  await new Promise(resolve => setTimeout(resolve, 100))
}
if (!existsSync(soulPath)) {
  console.error('expert-setup: the folder scaffold did not complete in time')
  process.exit(1)
}

// 1. Soul: replace only the untouched generic seed.
{
  const { writeFile } = await import('node:fs/promises')
    const currentSoul = await readFile(soulPath, 'utf8')
  if (currentSoul === DEFAULT_SOUL || currentSoul === DEFAULT_SOUL + '\n') {
    await writeFile(soulPath, MANAGEMENT_SOUL, 'utf8')
    console.log('  soul    replaced the untouched generic seed')
  } else {
    console.log('  soul    SKIPPED — already edited; the assembly does not overwrite its owner')
  }
}

// 2. Knowledge seeds, as drafts through the governed write path.
async function collect(dir) {
  const found = []
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith('.') || /^readme\.md$/i.test(entry.name)) continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) found.push(...await collect(path))
    else if (['.md', '.markdown', '.txt'].includes(extname(entry.name).toLowerCase())) found.push(path)
  }
  return found
}
let imported = 0
for (const file of await collect(seedDir)) {
  const text = await readFile(file, 'utf8')
  const ref = relative(repoRoot, file)
  const plan = planSourcePage({ ref, title: basename(file).replace(/\.[^.]+$/, ''), text })
  const result = await service.writePage({
    id: plan.id, type: 'source', title: plan.title, description: plan.description,
    body: plan.body, sources: plan.sources, tags: plan.tags,
    generatedBy: 'process:expert-setup',
  })
  imported++
  console.log(`  seed    ${result.id} ← ${ref}`)
}
console.log(`\nexpert-setup: ${imported} seed page(s) as drafts into ${join(dataDir, 'knowledge')}`)
console.log('  next (the principal): review the drafts, then flip status: draft → stable by hand —')
console.log('  that edit IS the approval; drafts stay out of search and the digest until then.')
console.log('  deployment shape: dev/profiles/profile-patch-expert.yml (read-only default) + registry default: assistant')
