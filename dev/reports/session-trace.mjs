#!/usr/bin/env node
/**
 * Locate one session log and print its timeline: the missing symptom → session → request/tool
 * join. The reports aggregate (usage/desk-loop) and the probes return ids, but before this
 * command an agent had to `find` the zstd file and `zstd -dc | jq` by hand.
 *
 * Usage:
 *   pnpm session <session-id|prefix> [--home <dir>] [--max <chars>] [--reasoning] [--tools]
 *   pnpm session --recent [n] [--home <dir>]
 *
 * The id is the session directory name (`session-<uuid>`), matched as an exact name or a
 * prefix. More than one match is an error (the caller must disambiguate), not a "newest wins"
 * guess — parallel sessions would make that guess wrong (the same lesson as sessionSnapshot).
 *
 * Exit codes: 0 found; 1 no match / read failure; 2 bad usage or ambiguous prefix.
 *
 * Style: scripts/AGENTS.md — pure ESM, Node built-ins only.
 */
import { statSync } from 'node:fs'
import { basename, dirname } from 'node:path'
import { devHome } from '../env/home.mjs'
import {
  classifyUserMessage,
  readEvents,
  sessionLogs,
  stripPanelMarker,
  stripPreamble,
  userMessageText,
} from '../lib/session-logs.mjs'

const args = process.argv.slice(2)
const value = flag => {
  const index = args.indexOf(flag)
  return index === -1 ? undefined : args[index + 1]
}
const idArg = args.find(argument => !argument.startsWith('--') && argument !== value('--home') && argument !== value('--max'))
const home = devHome(value('--home'))
const max = Number(value('--max') ?? (args.includes('--full') ? 4000 : 240))
const reasoning = args.includes('--reasoning')
const showTools = args.includes('--tools')

// `--recent` exists because "the newest session" is not an identity under parallel sessions
// (session-logs.mjs:78-82 records that incident). It lists candidates with their cwd and time so
// the caller picks by context instead of trusting mtime alone.
if (args.includes('--recent')) {
  const count = Number(value('--recent') ?? 10) || 10
  const logs = sessionLogs(home)
    .map(log => {
      let mtime = 0
      try { mtime = statSync(log).mtimeMs } catch {}
      return { log, mtime }
    })
    .sort((left, right) => right.mtime - left.mtime)
    .slice(0, count)
  for (const { log, mtime } of logs) {
    const id = basename(dirname(log))
    let cwd = '(unknown)'
    let preset = '(unknown)'
    try {
      const session = readEvents(log).find(event => event.type === 'session')
      cwd = session?.cwd ?? cwd
      preset = session?.agentPreset ?? preset
    } catch {}
    const when = mtime === 0 ? '(unknown)' : new Date(mtime).toISOString().slice(0, 16).replace('T', ' ')
    console.log(`${id}  ${when}  ${preset}  ${cwd}`)
  }
  if (logs.length === 0) console.error(`session: no logs under ${home}/sessions`)
  process.exit(0)
}

if (idArg === undefined) {
  console.error('usage: pnpm session <session-id|prefix> [--home <dir>] [--max <chars>] [--reasoning] [--tools]')
  console.error('       pnpm session --recent [n] [--home <dir>]')
  process.exit(2)
}

const logs = sessionLogs(home)
// Accept both `session-<uuid>` and the bare uuid/prefix; the directory name is the identity.
const target = idArg.startsWith('session-') ? idArg : `session-${idArg}`
const matches = logs.filter(log => {
  const id = basename(dirname(log))
  return id === target || id.startsWith(target)
})
if (matches.length === 0) {
  console.error(`session: no log matching "${idArg}" under ${home}/sessions`)
  process.exit(1)
}
if (matches.length > 1) {
  console.error(`session: "${idArg}" matches ${matches.length} logs; use more characters:`)
  for (const log of matches) console.error(`  ${basename(dirname(log))}`)
  process.exit(2)
}

const log = matches[0]
const id = basename(dirname(log))
const events = readEvents(log)
const session = events.find(event => event.type === 'session')
const slice = text => {
  const value = String(text ?? '').replace(/\s+/g, ' ').trim()
  return value.length <= max ? value : `${value.slice(0, max)}…`
}
const textParts = content => Array.isArray(content)
  ? content.filter(part => part?.type === 'text').map(part => String(part.text ?? '')).join('\n')
  : String(content ?? '')

console.log(`session: ${id}`)
console.log(`log: ${log}`)
if (session !== undefined) {
  const created = Number(session.createdAt)
  console.log(`cwd: ${session.cwd ?? '(unknown)'}`)
  console.log(`preset: ${session.agentPreset ?? '(unknown)'}  created: ${Number.isFinite(created) ? new Date(created).toISOString() : '(unknown)'}`)
}
for (const event of events) {
  switch (event.type) {
    case 'session':
      break
    case 'turn/start':
      console.log(`\n── turn ${event.data?.turn ?? '?'} ──`)
      break
    case 'turn/end': {
      const reason = event.data?.reason ?? event.data?.status ?? 'done'
      console.log(`── turn ${event.data?.turn ?? '?'} end (${typeof reason === 'object' ? JSON.stringify(reason) : reason}) ──`)
      break
    }
    case 'user/message': {
      const kind = classifyUserMessage(event)
      const text = kind === 'panel'
        ? stripPanelMarker(userMessageText(event))
        : kind === 'injected'
          ? userMessageText(event)
          : stripPreamble(userMessageText(event))
      if (kind === 'injected' && !args.includes('--injected')) break
      console.log(`user[${kind}]: ${slice(text)}`)
      break
    }
    case 'assistant/message': {
      const content = event.data?.message?.content
      const text = textParts(content)
      const reasoningText = Array.isArray(content)
        ? content.filter(part => part?.type === 'reasoning').map(part => String(part.text ?? '')).join('\n')
        : ''
      if (text !== '') console.log(`assistant: ${slice(text)}`)
      if (reasoning && reasoningText !== '') console.log(`reasoning: ${slice(reasoningText)}`)
      break
    }
    case 'tool/call':
      console.log(`tool→ ${event.data?.name ?? '?'}: ${slice(event.data?.arguments ?? '')}`)
      break
    case 'tool/result':
      console.log(`tool← ${slice(textParts(event.data?.message?.content ?? event.data?.result ?? ''))}`)
      break
    case 'request/header': {
      const header = event.data?.header ?? {}
      const config = header.config ?? {}
      const tools = Array.isArray(header.tools) ? header.tools.length : 0
      console.log(`request: model=${config.model ?? '?'} tools=${tools}`)
      // The count alone cannot answer "did my tool ride in the request?" — the names can, and
      // that is the symptom this report exists to settle (no zstd|jq by hand).
      if (showTools && Array.isArray(header.tools)) {
        const names = header.tools.map(tool => tool?.name ?? tool?.function?.name ?? '?').filter(name => name !== '?')
        if (names.length > 0) console.log(`tools: ${names.join(' ')}`)
      }
      break
    }
    case 'request/context': {
      const data = event.data ?? {}
      console.log(`context: model=${data.model ?? '?'} window=${data.contextWindow ?? '?'} ${data.systemPromptUpdate ?? ''}`.trim())
      break
    }
    default:
      break
  }
}
