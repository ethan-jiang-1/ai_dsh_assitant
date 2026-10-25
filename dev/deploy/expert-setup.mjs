#!/usr/bin/env node
/**
 * Repo wrapper for the expert assembly. The same assembly ships as `bin/expert-setup.mjs`;
 * this wrapper only resolves the repo's seed directory and imports the TypeScript source under
 * tsx, so `pnpm expert-setup` and the installed bin cannot diverge.
 *
 * Usage: `pnpm expert-setup -- --data-dir <assistant dir>`
 */
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assembleExpertHome } from '../../packages/dsh-smart-assistant/src/cli/expert-setup.ts'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const argv = process.argv.slice(2)
const dataDir = argv.includes('--data-dir') ? argv[argv.indexOf('--data-dir') + 1] : undefined
if (dataDir === undefined) {
  console.error('usage: pnpm expert-setup -- --data-dir <assistant dir>')
  process.exit(2)
}

try {
  const result = await assembleExpertHome({
    dataDir: resolve(dataDir),
    seedsDir: join(repoRoot, 'packages/dsh-smart-assistant/seeds/management'),
  })
  console.log(`  soul    ${result.soul}`)
  for (const page of result.imported) console.log(`  seed    ${page.id}`)
  if (result.preserved.length > 0) console.log(`  keep    ${result.preserved.length} stable/deprecated page(s) preserved`)
  console.log(`\nexpert-setup: ${result.imported.length} seed page(s) as drafts into ${join(resolve(dataDir), 'knowledge')}`)
  console.log('  next: review the drafts, then flip status: draft → stable by hand —')
  console.log('  that edit IS the approval; drafts stay out of search and the digest until then.')
} catch (error) {
  console.error(`expert-setup: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}
