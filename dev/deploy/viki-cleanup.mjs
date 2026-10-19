#!/usr/bin/env node
/**
 * B4: out-of-scope Viki cleanup. Dry-run by default; `--apply` snapshots the space's memories
 * tree first, then deletes only records outside the `--keep-peer` allowlist. `identity.md`,
 * `soul.md` and `.overview.md` are always protected. The receipt records what was kept, removed,
 * protected and the backup commit — the real data run is the principal's.
 *
 * Usage:
 *   node dev/deploy/viki-cleanup.mjs --url http://127.0.0.1:1933 --space default \
 *     --keep-peer github.com-owner-workspace [--keep-peer ...] [--dry-run|--apply] [--out receipt.json]
 */
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { VikiClient } from '../../packages/dsh-smart-assistant/lib/host/viki/client.js'

const PROTECTED = /(^|\/)(identity\.md|soul\.md|\.overview\.md)$/u

/** Parse the peer out of a viking URI (undefined for a user/<space>/memories path). */
export function peerOf(uri) {
  const match = /^viking:\/\/user\/([^/]+)\/peers\/([^/]+)\//u.exec(uri)
  return match?.[2]
}

/**
 * Pure plan: which entries are kept, removed or protected.
 * @param entries - The `VikiList.entries`.
 * @param options - `{ keepPeers }` (a record outside every kept peer is removable).
 * @returns `{ keep, remove, protectedFiles }` as URI lists.
 */
export function planCleanup(entries, options) {
  const keepPeers = new Set(options.keepPeers ?? [])
  const keep = []
  const remove = []
  const protectedFiles = []
  for (const entry of entries) {
    if (PROTECTED.test(entry.uri)) { protectedFiles.push(entry.uri); continue }
    const peer = peerOf(entry.uri)
    if (peer !== undefined && keepPeers.has(peer)) keep.push(entry.uri)
    else remove.push(entry.uri)
  }
  return { keep, remove, protectedFiles }
}

/**
 * Execute a plan. Dry-run never touches the server; apply commits the tree, then deletes the plan.
 * @param client - A VikiClient-compatible surface (`list`/`commit`/`remove`).
 * @param plan - The `planCleanup` result.
 * @param options - `{ apply, out }`.
 * @returns The receipt object.
 */
export async function runCleanup(client, plan, options = {}) {
  const space = options.space ?? 'default'
  const receipt = {
    at: new Date().toISOString(),
    dryRun: options.apply !== true,
    keep: plan.keep,
    remove: plan.remove,
    protected: plan.protectedFiles,
    removed: [],
    commitId: undefined,
  }
  if (options.apply === true) {
    const root = `viking://user/${space}/memories`
    receipt.commitId = await client.commit([root])
    for (const uri of plan.remove) {
      await client.remove(uri)
      receipt.removed.push(uri)
    }
  }
  if (typeof options.out === 'string' && options.out !== '') {
    writeFileSync(resolve(options.out), JSON.stringify(receipt, null, 2) + '\n', 'utf8')
  }
  return receipt
}

/** CLI parsing: repeatable --keep-peer, --apply switches the write path on. */
export function parseArgs(argv) {
  const args = { url: process.env.OPENVIKING_URL ?? '', space: 'default', keepPeers: [], apply: false, out: '' }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--url') args.url = argv[++index] ?? args.url
    else if (arg === '--space') args.space = argv[++index] ?? args.space
    else if (arg === '--keep-peer') args.keepPeers.push(argv[++index] ?? '')
    else if (arg === '--apply') args.apply = true
    else if (arg === '--out') args.out = argv[++index] ?? ''
    else if (arg === '--help' || arg === '-h') args.help = true
  }
  return args
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help === true || args.url === '') {
    console.error('usage: node dev/deploy/viki-cleanup.mjs --url <viki-base> [--space default] [--keep-peer <peer>]... [--apply] [--out <receipt.json>]')
    process.exit(args.help === true ? 0 : 1)
  }
  const client = new VikiClient({ baseUrl: args.url, space: args.space })
  const list = await client.list()
  const plan = planCleanup(list.entries, { keepPeers: args.keepPeers })
  const receipt = await runCleanup(client, plan, { apply: args.apply, out: args.out, space: args.space })
  console.log(JSON.stringify(receipt, null, 2))
  if (receipt.dryRun) console.error('dry-run: nothing deleted; add --apply to snapshot + delete')
}

if (process.argv[1] !== undefined && import.meta.url === new URL(`file://${resolve(process.argv[1])}`).href) {
  await main()
}
