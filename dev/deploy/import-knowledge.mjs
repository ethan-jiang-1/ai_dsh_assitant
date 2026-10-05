#!/usr/bin/env node
/**
 * Bulk-import documents into a working folder's knowledge room, as staged drafts.
 *
 * The mechanical half of O1's foundation: segment a document, derive a stable id from its
 * provenance, and write one governed **source page** per document. Concept pages stay model work
 * (`assistant_reflect save_page`) once an evaluation set exists to judge them against.
 *
 * Usage:
 *   node scripts/import-knowledge.mjs --data-dir <assistant dir> <file-or-dir>... [--dry-run]
 *
 * Deliberately takes an explicit `--data-dir` (no `DSH_HOME` inheritance, matching the repo's
 * double-home rule) and imports only text/markdown for now — docx/pdf conversion waits for a real
 * document set (see notes/implemented/2026-09-25-knowledge-ingest-core.md §四).
 *
 * @module scripts/import-knowledge
 */
import { readdir, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { basename, dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import AssistantMemory from '../../packages/dsh-smart-assistant/src/index.ts'
import { planSourcePage } from '../../packages/dsh-smart-assistant/src/domain/knowledge/ingest.ts'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const argv = process.argv.slice(2)
const dryRun = argv.includes('--dry-run')
const dataDirArg = argv.includes('--data-dir') ? argv[argv.indexOf('--data-dir') + 1] : undefined
const inputs = argv.filter((value, index) => !value.startsWith('--') && index !== argv.indexOf('--data-dir') + 1)
const TEXT_EXTENSIONS = new Set(['.md', '.markdown', '.txt'])

if (dataDirArg === undefined || inputs.length === 0) {
  console.error('usage: node scripts/import-knowledge.mjs --data-dir <assistant dir> <file-or-dir>... [--dry-run]')
  process.exit(2)
}
const dataDir = resolve(dataDirArg)
if (!dryRun && !existsSync(dataDir)) {
  console.error(`import-knowledge: data dir does not exist: ${dataDir}`)
  process.exit(2)
}

/** Every readable text document under the given paths, in a stable order. */
async function collect(path) {
  const absolute = resolve(path)
  const stats = await import('node:fs/promises').then(fs => fs.stat(absolute))
  if (stats.isFile()) return TEXT_EXTENSIONS.has(extname(absolute).toLowerCase()) ? [absolute] : []
  const found = []
  for (const entry of (await readdir(absolute, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith('.')) continue
    found.push(...await collect(join(absolute, entry.name)))
  }
  return found
}

/** Title from the document itself: its first heading, else the file name. */
function titleOf(text, file) {
  const heading = text.split('\n').find(line => /^#{1,6}\s+\S/.test(line))
  return heading !== undefined ? heading.replace(/^#{1,6}\s+/, '').trim() : file.replace(/\.[^.]+$/, '')
}

const collected = (await Promise.all(inputs.map(collect))).flat()
// A directory's README states the convention, it is not knowledge. Skipping it silently would hide
// a mistake, so the summary reports how many were skipped and why.
const files = collected.filter(file => !/^readme\.md$/i.test(basename(file)))
const skipped = collected.length - files.length
if (files.length === 0) {
  console.error('import-knowledge: no .md/.markdown/.txt documents found')
  process.exit(1)
}

const service = new AssistantMemory(new Context(), { dataDir })
const written = []
for (const file of files) {
  const text = await readFile(file, 'utf8')
  // Provenance should name the document the way a person would cite it: repo-relative inside the
  // repo, absolute outside it (a `../../../tmp/...` reference locates nothing).
  const insideRepo = !relative(repoRoot, file).startsWith('..')
  const ref = insideRepo ? relative(repoRoot, file) : file
  const plan = planSourcePage({ ref, title: titleOf(text, file), text })
  if (dryRun) {
    written.push({ id: plan.id, path: '(dry run)', ref, bytes: Buffer.byteLength(plan.body, 'utf8'), sections: plan.sections.length })
    continue
  }
  const result = await service.writePage({
    id: plan.id,
    type: 'source',
    title: plan.title,
    description: plan.description,
    body: plan.body,
    sources: plan.sources,
    tags: plan.tags,
    generatedBy: 'process:import-knowledge',
  })
  written.push({ id: result.id, path: result.path, ref, bytes: Buffer.byteLength(plan.body, 'utf8'), sections: plan.sections.length, findings: result.findings.length })
}

for (const entry of written) {
  const findings = entry.findings === undefined ? '' : `, ${entry.findings} finding(s)`
  console.log(`  ${entry.id} ← ${entry.ref} (${entry.sections} section(s), ${entry.bytes} bytes${findings})`)
}
console.log(`import-knowledge: ${written.length} source page(s) ${dryRun ? 'planned' : 'written as drafts'} into ${join(dataDir, 'knowledge')}${skipped > 0 ? ` (skipped ${skipped} README convention file(s))` : ''}`)
