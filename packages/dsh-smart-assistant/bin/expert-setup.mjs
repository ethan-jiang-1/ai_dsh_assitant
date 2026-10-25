#!/usr/bin/env node
/**
 * `expert-setup`: assemble the management-post expert into an assistant working folder.
 *
 * Ships inside the tarball because the person who installed the plugin is the person who owns
 * the home. The default identity is already the management voice; this command adds the
 * management seed pages as drafts and may migrate an untouched pre-management generic soul.
 * It never promotes a page and never overwrites an edited soul — review and promotion stay the
 * principal's act.
 *
 * Usage:
 *   node <package>/bin/expert-setup.mjs --data-dir <assistant dir>
 *   node <package>/bin/expert-setup.mjs --data-dir <dir> --seeds-dir <seed dir>   # tests/dev
 *
 * No harness peers are imported: the command runs from an installed profile with plain Node.
 */
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const argv = process.argv.slice(2)
const option = (name) => {
  const index = argv.indexOf(name)
  return index === -1 ? undefined : argv[index + 1]
}
const dataDir = option('--data-dir')
if (dataDir === undefined || dataDir.trim() === '') {
  console.error('usage: node <package>/bin/expert-setup.mjs --data-dir <assistant dir>')
  process.exit(2)
}
const seedsDir = option('--seeds-dir') ?? join(packageRoot, 'seeds', 'management')

try {
  const { assembleExpertHome } = await import(join(packageRoot, 'lib', 'cli', 'expert-setup.js'))
  const result = await assembleExpertHome({ dataDir: resolve(dataDir), seedsDir: resolve(seedsDir) })
  console.log(`  soul    ${result.soul}`)
  for (const page of result.imported) console.log(`  seed    ${page.id}`)
  if (result.preserved.length > 0) {
    console.log(`  keep    ${result.preserved.length} existing page(s) kept their stable/deprecated status`)
  }
  console.log(`\nexpert-setup: ${result.imported.length} seed page(s) as drafts into ${join(resolve(dataDir), 'knowledge')}`)
  console.log('  next: review the drafts, then flip status: draft → stable by hand —')
  console.log('  that edit IS the approval; drafts stay out of search and the digest until then.')
} catch (error) {
  console.error(`expert-setup: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}
