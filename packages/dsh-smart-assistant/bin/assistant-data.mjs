#!/usr/bin/env node
/**
 * `assistant-data`: export/import the two plugin-owned user-data directories.
 *
 * The bundle holds `<assistant>` and `<assistant-operating>` plus a schema manifest. Harness
 * sessions, credentials, settings and storages are not included; the agent artifact is never
 * included. Import requires absent/empty destinations (or `--replace`, which stashes them beside
 * themselves first) and refuses an unknown schema. `status` is the read-only support view.
 *
 * Usage:
 *   node <package>/bin/assistant-data.mjs export --assistant <dir> --operating <dir> --out <bundle>
 *   node <package>/bin/assistant-data.mjs import --in <bundle> --assistant <dir> --operating <dir> [--replace]
 *   node <package>/bin/assistant-data.mjs status --assistant <dir> --operating <dir>
 *   node <package>/bin/assistant-data.mjs check --assistant <dir> --operating <dir>
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
  node <package>/bin/assistant-data.mjs import --in <bundle> --assistant <dir> --operating <dir> [--replace]
  node <package>/bin/assistant-data.mjs status --assistant <dir> --operating <dir>
  node <package>/bin/assistant-data.mjs check --assistant <dir> --operating <dir>`

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
    const result = await module.importData({ inDir, assistantDir, operatingDir, replace: argv.includes('--replace') })
    console.log(`assistant-data: imported ${result.assistantFiles} working-folder file(s) and ${result.operatingFiles} ledger file(s)`)
    for (const backup of result.backups) console.log(`  previous data kept at ${backup}`)
  } else if (command === 'status') {
    const assistantDir = option('--assistant')
    const operatingDir = option('--operating')
    if (assistantDir === undefined || operatingDir === undefined) {
      console.error(usage)
      process.exit(2)
    }
    const status = await module.statusData({ assistantDir, operatingDir })
    console.log(`assistant-data: working folder ${status.assistantDir}`)
    console.log(`  ${status.assistant.exists ? `${String(status.assistant.files)} file(s), ${String(status.assistant.bytes)} byte(s)` : 'missing'}${status.assistant.manualVersion === undefined ? '' : `, manual v${String(status.assistant.manualVersion)}`}`)
    console.log(`assistant-data: ledger ${status.operatingDir}`)
    console.log(`  ${status.operating.exists ? `${String(status.operating.files)} file(s), ${String(status.operating.bytes)} byte(s)` : 'missing'}`)
    console.log(status.ledger.state === 'missing'
      ? '  ledger.json: missing (first write creates it)'
      : status.ledger.state === 'ok'
        ? `  ledger.json: v${String(status.ledger.version)} state, ${String(status.ledger.bytes)} byte(s), ${String(status.ledger.operations)} recent operation(s)`
        : `  ledger.json: unreadable or not a v1 state (${String(status.ledger.bytes)} byte(s)) — back it up before repairing`)
    if (status.archive !== undefined) {
      console.log(`  operations-archive.jsonl: ${String(status.archive.operations)} archived operation(s), ${String(status.archive.bytes)} byte(s), ${String(status.archive.corruptLines)} bad line(s)`)
    }
  } else if (command === 'check') {
    const assistantDir = option('--assistant')
    const operatingDir = option('--operating')
    if (assistantDir === undefined || operatingDir === undefined) {
      console.error(usage)
      process.exit(2)
    }
    const result = await module.checkData({ assistantDir, operatingDir })
    console.log(`assistant-data: checked ${result.status.assistantDir} and ${result.status.operatingDir}`)
    for (const problem of result.problems) console.log(`  problem: ${problem}`)
    if (result.problems.length > 0) process.exit(1)
    console.log('  ok')
  } else {
    console.error(`assistant-data: unknown command ${JSON.stringify(command)}\n${usage}`)
    process.exit(2)
  }
} catch (error) {
  console.error(`assistant-data: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}
