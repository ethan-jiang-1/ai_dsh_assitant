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
 * Usage: node scripts/webui-preflight.mjs 'http://127.0.0.1:<port>/?token=<token>'
 */
const given = process.argv[2]
if (given === undefined) {
  console.error('usage: node scripts/webui-preflight.mjs <url-with-token>')
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
    if ((await response.text()).includes("id: 'dsh-smart-assistant'")) registered = true
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
        const manifest = await (await fetch(new URL(remotesEntry.url, base), {
          headers: cookies.length > 0 ? { cookie: cookies } : {},
        })).text()
        const namespaces = new Set([...manifest.matchAll(/namespace:\s*"([^"]+)"/g)].map(match => match[1]))
        ok(`Remote manifest: ${namespaces.size} namespace(s)`)
        // Read the runtime inject list from THIS repo's own bundle URL (a dedicated combo). Scanning
        // every combo instead would regex the first `const inject` of a 10 MB concatenation — someone
        // else's list (learned the hard way while building this very check).
        let declared = []
        for (const entry of entries.filter(candidate => candidate.id.startsWith('dsh-smart-assistant'))) {
          const text = await (await fetch(new URL(entry.url, base), {
            headers: cookies.length > 0 ? { cookie: cookies } : {},
          })).text()
          const injectLiteral = /const inject = \[([^\]]*)\]/.exec(text)?.[1]
          if (injectLiteral !== undefined) declared = declared.concat([...injectLiteral.matchAll(/'remote\.([A-Za-z0-9_]+)'/g)].map(match => match[1]))
        }
        for (const namespace of new Set(declared)) {
          if (namespaces.has(namespace)) ok(`remote.${namespace} is in the Remote manifest`)
          else fail(`our bundle injects remote.${namespace}, but the Remote manifest has no such namespace — this entry will stay pending in the browser (out-of-tree Remote namespaces need typert manifest integration)`)
        }
      } catch (error) {
        fail(`cannot read the Remote manifest: ${String(error)}`)
      }
    }
  }
}

if (failures > 0) {
  console.error(`\npreflight: ${failures} failure(s) — do NOT open this URL in a browser yet`)
  process.exit(1)
}
console.log('\npreflight: green — the page should boot; hand the URL over')
