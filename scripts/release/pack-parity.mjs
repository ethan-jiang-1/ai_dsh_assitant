#!/usr/bin/env node
/**
 * Prove that the two packers used in this repo see the same package content.
 *
 * The shape gates judge a `pnpm pack` tarball while the publish step runs `npm publish`; if the
 * two packers disagree, "judged bytes" and "published bytes" are different artifacts. This script
 * packs once with each, extracts both tarballs, and compares the file list plus per-file SHA-256.
 * Tarball-level gzip bytes may differ (mtime), so content is the contract, not the container hash.
 *
 * Usage: node scripts/release/pack-parity.mjs [--keep]
 * Exit 0 = same file set and same content; 1 = difference printed.
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { mkTmpDir } from '../../dev/env/tmp.mjs'

const root = mkTmpDir('pack-parity', 'run-')
const keep = process.argv.includes('--keep')
const repoRoot = join(import.meta.dirname, '..', '..')
const packageDir = join(repoRoot, 'packages', 'dsh-smart-assistant')
const failures = []
const ok = message => console.log(`  ok   ${message}`)
const fail = message => { failures.push(message); console.log(`  FAIL ${message}`) }

function run(command, args, cwd) {
  return spawnSync(command, args, { cwd, encoding: 'utf8' })
}

function listFiles(dir, prefix = '') {
  const out = []
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    const rel = prefix === '' ? name : `${prefix}/${name}`
    if (statSync(path).isDirectory()) out.push(...listFiles(path, rel))
    else out.push(rel)
  }
  return out.sort()
}

function hashTree(dir) {
  return new Map(listFiles(dir).map(rel => [rel, createHash('sha256').update(readFileSync(join(dir, rel))).digest('hex')]))
}

try {
  const pnpmDir = join(root, 'pnpm')
  const npmDir = join(root, 'npm')
  mkdirSync(pnpmDir, { recursive: true })
  mkdirSync(npmDir, { recursive: true })
  const pnpmPack = run('pnpm', ['pack', '--pack-destination', pnpmDir], packageDir)
  const npmPack = run('npm', ['pack', '--pack-destination', npmDir, '--cache', join(repoRoot, '.tmp', 'npm-cache')], packageDir)
  if (pnpmPack.status !== 0) fail(`pnpm pack failed: ${(pnpmPack.stderr ?? '').trim().slice(0, 300)}`)
  if (npmPack.status !== 0) fail(`npm pack failed: ${(npmPack.stderr ?? '').trim().slice(0, 300)}`)

  const pnpmTar = readdirSync(pnpmDir).find(name => name.endsWith('.tgz'))
  const npmTar = readdirSync(npmDir).find(name => name.endsWith('.tgz'))
  if (pnpmTar === undefined) fail('pnpm pack produced no tarball')
  if (npmTar === undefined) fail('npm pack produced no tarball')
  if (pnpmTar !== undefined && npmTar !== undefined) {
    const pnpmTree = join(root, 'pnpm-tree')
    const npmTree = join(root, 'npm-tree')
    mkdirSync(pnpmTree, { recursive: true })
    mkdirSync(npmTree, { recursive: true })
    const pnpmUnpack = run('tar', ['-xzf', join(pnpmDir, pnpmTar), '-C', pnpmTree], root)
    const npmUnpack = run('tar', ['-xzf', join(npmDir, npmTar), '-C', npmTree], root)
    if (pnpmUnpack.status !== 0) fail('cannot unpack pnpm tarball')
    if (npmUnpack.status !== 0) fail('cannot unpack npm tarball')
    const a = hashTree(join(pnpmTree, 'package'))
    const b = hashTree(join(npmTree, 'package'))
    const names = new Set([...a.keys(), ...b.keys()])
    let differences = 0
    for (const name of [...names].sort()) {
      if (a.get(name) !== b.get(name)) {
        differences += 1
        fail(`${name}: pnpm=${a.get(name) ?? '(missing)'} npm=${b.get(name) ?? '(missing)'}`)
      }
    }
    if (differences === 0) ok(`${String(a.size)} files, identical content in pnpm and npm tarballs`)
    else fail(`${String(differences)} file difference(s) between packers`)
  }
} catch (error) {
  fail(`threw: ${error instanceof Error ? error.message : String(error)}`)
} finally {
  if (keep || failures.length > 0) console.log(`\nkept ${root}`)
  else rmSync(root, { recursive: true, force: true })
}

console.log('')
if (failures.length === 0) {
  console.log('pack-parity: passed')
  process.exit(0)
}
console.log(`pack-parity: ${failures.length} failure(s)`)
process.exit(1)
