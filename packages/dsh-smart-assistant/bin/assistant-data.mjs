#!/usr/bin/env node
/**
 * `assistant-data`: export/import the two plugin-owned user-data directories.
 *
 * The bundle holds `<assistant>` and `<assistant-operating>` plus a schema manifest. Harness
 * sessions, credentials, settings and storages are not included; the agent artifact is never
 * included. Import requires absent/empty destinations and refuses an unknown schema.
 *
 * Usage:
 *   node <package>/bin/assistant-data.mjs export --assistant <dir> --operating <dir> --out <bundle>
 *   node <package>/bin/assistant-data.mjs import --in <bundle> --assistant <dir> --operating <dir>
 *
 * No harness peers are imported: the command runs from an installed profile with plain Node.
 */
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const argv = process.argv.slice(2)
const command = argv[0]
const option = (name) => {
  const index = argv.indexOf(name)
  return index === -1 ? undefined : argv[index + 1]
}

const usage = `usage:
  node <package>/bin/assistant-data.mjs export --assistant <dir> --operating <dir> --out <bundle>
  node <package>/bin/assistant-data.mjs import --in <bundle> --assistant <dir> --operating <dir>`

if (command === '--help' || command === undefined) {
  console.log(usage)
  process.exit(command === undefined ? 2 : 0)
}

try {
  const module = await import(join(packageRoot, 'lib', 'cli', 'assistant-data.js'))
  if (command === 'export') {
    const assistantDir = option('--assistant')
    const operatingDir = option('--operating')
    const outDir = option('--out')
    if (assistantDir === undefined || operatingDir === undefined || outDir === undefined) {
      console.error(usage)
      process.exit(2)
    }
    const result = await module.exportData({ assistantDir, operatingDir, outDir })
    console.log(`assistant-data: exported ${result.manifest.files} file(s), ${result.manifest.bytes} byte(s) → ${result.outDir}`)
    console.log(`  manifest schemaVersion ${result.manifest.schemaVersion}; includes assistant + assistant-operating`)
  } else if (command === 'import') {
    const inDir = option('--in')
    const assistantDir = option('--assistant')
    const operatingDir = option('--operating')
    if (inDir === undefined || assistantDir === undefined || operatingDir === undefined) {
      console.error(usage)
      process.exit(2)
    }
    const result = await module.importData({ inDir, assistantDir, operatingDir })
    console.log(`assistant-data: imported ${result.assistantFiles} working-folder file(s) and ${result.operatingFiles} ledger file(s)`)
  } else {
    console.error(`assistant-data: unknown command ${JSON.stringify(command)}\n${usage}`)
    process.exit(2)
  }
} catch (error) {
  console.error(`assistant-data: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}
