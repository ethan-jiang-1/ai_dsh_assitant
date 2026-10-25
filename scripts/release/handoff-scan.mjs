#!/usr/bin/env node
/**
 * Handoff scan for an agent artifact (a package directory or a packed tarball).
 *
 * The tarball's own inventory already forbids source/tests/vendor; this scan answers the other
 * half: no user state, credentials, harness-home data, machine-local paths, or obvious live
 * secrets. Run it before handing a directory to another person, and in the release scripts so a
 * tarball cannot regress unnoticed.
 *
 * Usage:
 *   node scripts/release/handoff-scan.mjs <dir|tarball>
 *
 * Exit 0 = clean; 1 = findings; 2 = usage/read failure.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { handoffProblems } from './handoff-core.mjs'
import { mkTmpDir } from '../../dev/env/tmp.mjs'

const target = process.argv[2]
if (target === undefined) {
  console.error('usage: node scripts/release/handoff-scan.mjs <dir|tarball>')
  process.exit(2)
}

const abs = resolve(target)
if (!existsSync(abs)) {
  console.error(`handoff-scan: not found: ${abs}`)
  process.exit(2)
}

const TEXT_EXTENSIONS = new Set(['.md', '.txt', '.json', '.jsonl', '.yml', '.yaml', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.css', '.html', '.sh', '.toml', '.ini', '.cfg', '.conf'])
const MAX_TEXT_BYTES = 512 * 1024
const entries = []
const files = []
const extraProblems = []

function scanTree(root, prefix = '') {
  for (const entry of readdirSync(join(root, prefix), { withFileTypes: true })) {
    const rel = prefix === '' ? entry.name : `${prefix}/${entry.name}`
    entries.push(rel)
    if (entry.isSymbolicLink()) {
      extraProblems.push(`${rel} is a symlink; handoff artifacts must be plain files`)
      continue
    }
    if (entry.isDirectory()) {
      scanTree(root, rel)
      continue
    }
    const path = join(root, rel)
    const info = statSync(path)
    const extension = extname(entry.name).toLowerCase()
    if (info.size > MAX_TEXT_BYTES || (extension !== '' && !TEXT_EXTENSIONS.has(extension))) continue
    const bytes = readFileSync(path)
    if (bytes.includes(0)) continue
    files.push({ path: rel, text: bytes.toString('utf8') })
  }
}

let scanRoot = abs
let tempDir
try {
  if (statSync(abs).isFile()) {
    tempDir = mkTmpDir('handoff-scan', 'scan-')
    const extracted = spawnSync('tar', ['-xzf', abs, '-C', tempDir], { encoding: 'utf8' })
    if (extracted.status !== 0) {
      console.error(`handoff-scan: cannot extract ${abs}: ${(extracted.stderr ?? '').trim()}`)
      process.exit(2)
    }
    scanRoot = join(tempDir, 'package')
    if (!existsSync(scanRoot)) scanRoot = tempDir
  }
  scanTree(scanRoot)
} finally {
  if (tempDir !== undefined) rmSync(tempDir, { recursive: true, force: true })
}

const problems = [...extraProblems, ...handoffProblems({ entries, files })]
console.log(`handoff-scan: ${abs}`)
console.log(`  ${entries.length} entries, ${files.length} text file(s) inspected`)
if (problems.length === 0) {
  console.log('  ok   no user data, credentials, host paths or live-secret shapes')
  process.exit(0)
}
for (const problem of problems) console.error(`  FAIL ${problem}`)
process.exit(1)
