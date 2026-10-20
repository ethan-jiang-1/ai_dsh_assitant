#!/usr/bin/env node
/**
 * Pre-flight a running dsh web UI before any human opens it.
 *
 * Learned the hard way (2026-09-24, two rounds): a client bundle the shell cannot parse
 * kills the whole browser boot with an opaque "loaded without registering" error, and the
 * first human to open the page becomes the crash-test dummy. This script plays that role
 * instead: it walks the served index exactly like a browser would (token → cookie →
 * document), fetches every plugin combo script, and compiles each one as a classic-script
 * body — parse only, never executed.
 *
 * What it proves: the server is up, the auth flow works, the boot graph is composed, every
 * served combo parses, and this repo's client bundle is aboard with its registration.
 * What it does NOT prove: that the client tree executes and renders — that is still the
 * browser session's job.
 *
 * Usage: node dev/probes/web/webui-preflight.mjs 'http://127.0.0.1:<port>/?token=<token>'
 */
import { inspectRemoteNamespaces } from './preflight-core.mjs'

const positional = process.argv.slice(2)
const given = positional.find(argument => !argument.startsWith('--'))
if (given === undefined) {
  console.error('usage: node dev/probes/web/webui-preflight.mjs <url-with-token>')
  process.exit(1)
}

let failures = 0
const ok = (message) => console.log(`  ok   ${message}`)
const fail = (message) => {
  failures += 1
  console.error(`  FAIL ${message}`)
}

const base = new URL('/', given)

// ① The browser's auth flow: token in, cookie out.
let cookies = ''
try {
  const boot = await fetch(given, { redirect: 'manual' })
  cookies = boot.headers.getSetCookie().map(entry => entry.split(';')[0]).join('; ')
  if (cookies.length === 0 && boot.status !== 200) {
    fail(`token exchange returned ${boot.status} with no cookie — copy the URL exactly as printed`)
  } else {
    ok(`token exchange (${boot.status}, ${cookies.length > 0 ? 'cookie set' : 'no cookie needed'})`)
  }
} catch (error) {
  fail(`cannot reach the server: ${String(error)}`)
  process.exit(1)
}

// ② The document the browser would render.
let html = ''
try {
  const page = await fetch(base, { headers: cookies.length > 0 ? { cookie: cookies } : {} })
  html = await page.text()
  if (page.status !== 200) {
    fail(`index returned ${page.status}`)
  } else if (!html.includes('__ModuleLoader__')) {
    fail('the index carries no __ModuleLoader__ bootstrap — the boot graph is not composed')
  } else {
    ok('index served with the module-loader bootstrap')
  }
} catch (error) {
  fail(`cannot read the index: ${String(error)}`)
  process.exit(1)
}

// ③ Every combo script the document references, compiled as a classic-script body.
// 0.1.7's frontend references combo scripts relatively (`plugins/…`), the 0.1.5 build used an
// absolute path — accept both and normalize to absolute for fetching.
const comboUrls = [...new Set([...html.matchAll(/(?:src|href)="([^"]*plugins\/[^"]+)"/g)]
  .map(match => match[1].replaceAll('&amp;', '&')))]
if (comboUrls.length === 0) fail('the index references no plugin combo scripts')
for (const combo of comboUrls) {
  try {
    const response = await fetch(new URL(combo, base), { headers: cookies.length > 0 ? { cookie: cookies } : {} })
    const text = await response.text()
    if (response.status !== 200) {
      fail(`${combo} → ${response.status}`)
      continue
    }
    try {
      void new Function(text)
      ok(`${combo} parses (${text.length} bytes)`)
    } catch (error) {
      fail(`${combo} does not parse as a classic script: ${String(error)}`)
      // The known culprit class, surfaced for a fast diagnosis: ESM statements in a combo.
      const offender = /^[\t ]*(?:import|export)\b.*$/m.exec(text)?.[0]
      if (offender !== undefined) console.error(`       first ESM-looking line: ${offender.trim().slice(0, 120)}`)
    }
  } catch (error) {
    fail(`${combo}: ${String(error)}`)
  }
}

// ④ This repo's client bundle is aboard with its registration.
const ours = comboUrls.filter(combo => combo.includes('dsh-smart-assistant'))
if (ours.length === 0) {
  fail('no combo script carries dsh-smart-assistant — the client face is not in the boot graph')
} else {
  let registered = false
  for (const combo of ours) {
    const response = await fetch(new URL(combo, base), { headers: cookies.length > 0 ? { cookie: cookies } : {} })
    // 格式无关匹配：tsc 直出是 `id: 'dsh-smart-assistant'`，tsdown iife 是 `id: "dsh-smart-assistant"`
    // （2026-10-07 S2 实测）——检查意图是「以本名注册」，不是引号风格。
    if ((await response.text()).match(/id:\s*['"]dsh-smart-assistant['"]/)) registered = true
  }
  if (registered) ok('dsh-smart-assistant client bundle registers under its name')
  else fail('the combo carries our bundle but no __ModuleLoader__ registration for dsh-smart-assistant')
}

// ⑤ The boot graph must be satisfiable, and every `remote.<ns>` our bundle injects must exist in
// the Remote manifest — otherwise the entry stays "pending (waiting for service: remote.<ns>)"
// in the browser and a human has to read the boot overlay to find out. Learned the hard way
// (2026-09-25): the Remote manifest is generated at build time from the vendor workspace's typert
// artifacts, so a namespace contributed by an out-of-tree plugin is absent from it.
const bootMarker = 'globalThis["__DSH_BOOT__"] = '
const bootStart = html.indexOf(bootMarker)
if (bootStart < 0) {
  fail('the index carries no __DSH_BOOT__ graph — cannot verify plugin activation')
} else {
  const tail = html.slice(bootStart + bootMarker.length)
  let depth = 0
  let end = -1
  for (let index = 0; index < tail.length; index += 1) {
    const char = tail[index]
    if (char === '{') depth += 1
    else if (char === '}') {
      depth -= 1
      if (depth === 0) { end = index + 1; break }
    }
  }
  let graph
  try {
    graph = JSON.parse(tail.slice(0, end))
  } catch (error) {
    fail(`__DSH_BOOT__ is not valid JSON: ${String(error)}`)
  }
  if (graph !== undefined) {
    const entries = graph.entries ?? []
    const provided = new Set(entries.map(entry => entry.id))
    ok(`boot graph: ${entries.length} entries, rev ${graph.rev}`)

    // ⑤a This repo's entries: every package-id inject must be provided by another graph entry.
    // Scoped to our own ids on purpose — the vendor graph legitimately references modules that
    // ride inside a combo rather than as their own entry (e.g. client-ui-primitives).
    for (const entry of entries.filter(candidate => candidate.id.startsWith('dsh-smart-assistant'))) {
      for (const dependency of entry.inject ?? []) {
        if (dependency.startsWith('@deepseek-ai/') && !provided.has(dependency)) {
          fail(`${entry.id} injects ${dependency}, which no entry in the boot graph provides`)
        }
      }
    }

    // ⑤b Every remote namespace this repo's bundle injects must exist in the Remote manifest.
    const remotesEntry = entries.find(entry => entry.id === '@deepseek-ai/dsh-api-remotes')
    if (remotesEntry === undefined) {
      fail('the boot graph carries no @deepseek-ai/dsh-api-remotes entry — cannot check Remote namespaces')
    } else if (ours.length > 0) {
      try {
        const manifestText = await (await fetch(new URL(remotesEntry.url, base), {
          headers: cookies.length > 0 ? { cookie: cookies } : {},
        })).text()
        // Read the runtime inject list from THIS repo's own bundle URL (a dedicated combo). Scanning
        // every combo instead would regex the first `const inject` of a 10 MB concatenation — someone
        // else's list (learned the hard way while building this very check).
        const bundleTexts = []
        for (const entry of entries.filter(candidate => candidate.id.startsWith('dsh-smart-assistant'))) {
          bundleTexts.push(await (await fetch(new URL(entry.url, base), {
            headers: cookies.length > 0 ? { cookie: cookies } : {},
          })).text())
        }
        const inspection = inspectRemoteNamespaces({ manifestText, bundleTexts })
        if (inspection.namespaces.length > 0) ok(`Remote manifest: ${inspection.namespaces.length} namespace(s)`)
        for (const problem of inspection.problems) fail(problem)
        for (const namespace of inspection.declared) {
          if (inspection.namespaces.includes(namespace)) ok(`remote.${namespace} is in the Remote manifest`)
        }
      } catch (error) {
        fail(`cannot read the Remote manifest: ${String(error)}`)
      }
    }
  }
}

// ⑥ Review readiness: the room panels read the host rooms route; a green boot with an unreachable
// route still hands an empty/error page. The route is owner-only, so call it with the browser
// cookie earned above. An honest empty home is still a valid projection (schemaVersion+generatedAt).
let roomsFound = ''
try {
  const response = await fetch(new URL('api/assistant/rooms', base), {
    headers: cookies.length > 0 ? { cookie: cookies } : {},
  })
  if (!response.ok) {
    fail(`/api/assistant/rooms returned ${String(response.status)} — the room panels would render an error`)
  } else {
    const body = await response.json()
    if (body?.schemaVersion !== 1 || typeof body.generatedAt !== 'string') {
      fail('/api/assistant/rooms did not return the rooms projection (schemaVersion+generatedAt)')
    } else {
      roomsFound = `schemaVersion ${String(body.schemaVersion)}, generatedAt ${String(body.generatedAt)}`
    }
  }
} catch (error) {
  fail(`cannot read /api/assistant/rooms: ${String(error)}`)
}
if (roomsFound !== '') ok(`rooms route reachable: ${roomsFound}`)

if (failures > 0) {
  console.error(`\npreflight: ${failures} failure(s) — do NOT open this URL in a browser yet`)
  process.exit(1)
}
console.log('\npreflight: green — the page should boot; hand the URL over')
