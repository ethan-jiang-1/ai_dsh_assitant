#!/usr/bin/env node
/**
 * Screenshot a running dsh web UI with headless Chrome over the DevTools protocol —
 * the "seeing" half of the evidence pipeline (the "parsing" half is webui-preflight.mjs).
 *
 * Why this exists (2026-09-26): the S5 density slice and every visual judgment were
 * blocked on "no real screenshot" — the method discipline (no visual conclusion without
 * a real render) was right, but nobody in this repo could produce the render. The dev
 * machine has Chrome, and a headless capture of the served page IS a real render. This
 * turns "waiting for a human to bring a screenshot" into "produce the evidence yourself"
 * (see notes/archived/2026-09-26-first-mile-landing.md).
 *
 * Two outputs per viewport, because the two readers differ:
 *   <name>-<WxH>.png      the render itself — for humans, reviews, and image-capable models.
 *   <name>-<WxH>.dom.txt  JSON: visible text outline with pixel heights, interactive
 *                         controls, boot diagnostics, console errors, failed requests.
 *                         This is what a text-only model (and a grep) can check.
 *
 * Why CDP instead of `--screenshot=<file>`: the web client keeps an SSE connection open,
 * so the page never fires `load` and one-shot capture flags hang forever (observed
 * 2026-09-26 with both `--virtual-time-budget` and `--timeout`). Driving the protocol
 * ourselves means we decide when to capture: after `load` OR after a wall-clock budget,
 * whichever comes first, plus a settle delay for async boot/hydration.
 *
 * What it proves: what the served UI actually renders at capture time. What it does NOT
 * prove: arbitrary interaction states. `--eval` can synthesize the specific click/menu a
 * snippet names, but only the state that snippet reaches; it is not a general UI driver.
 *
 * Usage:
 *   node dev/probes/web/webui-shots.mjs 'http://127.0.0.1:<port>/?token=<token>' \
 *     [--out <dir>] [--name <base>] [--size <WxH>]... [--budget <ms>] [--settle <ms>]
 *     [--dom] [--lang <bcp47>]
 *
 *   --out     target directory (default <repo>/.tmp/shots via dev/env/tmp.mjs, created if missing).
 *             A one-off capture stays in that directory. notes/ holds decisions, not screenshot
 *             folders. snapshots/ is session-replay fixtures only.
 *   --name    file base name (default shot-<unix-ms>); one pair per --size.
 *   --size    viewport, repeatable (default 1600x1000). Use a narrow one (e.g. 420x900)
 *             to approximate the right-sidebar pane width when a desk tab is open.
 *   --budget  max wall-clock ms to wait for the page's `load` event before capturing
 *             anyway (default 20000; the SSE connection can keep `load` from firing).
 *   --settle  extra wall-clock ms after load-or-budget before capture, letting async
 *             boot (combo fetch, React hydration) finish painting (default 4000).
 *   --dom     also write the JSON evidence file described above.
 *   --plain   screenshot only, via Chrome's own `--screenshot` flag (no DevTools protocol).
 *             Use it when the page's main thread is busy: a wedged renderer answers no
 *             protocol call while the compositor still has a frame to capture, so the PNG
 *             survives and the DOM evidence does not (observed 2026-09-26 on the dsh web
 *             client under Chrome 153.0.8010.54).
 *   --eval    run a page-context JS snippet after load+settle, then settle again before
 *             capturing; repeatable, run in order. This is how interaction states are
 *             reached (e.g. dismiss a notice, open the command menu) — a scripted click
 *             is weaker evidence than a human click, but enough to answer "does this
 *             surface contain X", which is what the UI slices need.
 *   --require-eval <text>
 *             the LAST --eval result must contain <text>, else exit non-zero before any
 *             screenshot is written. Scene harnesses pass `ready: <token>` so a readiness
 *             wait that timed out cannot silently capture (and refresh) the wrong state.
 *   --timeout watchdog override in ms (default: budget + settle + 1.5s per --eval + 30s);
 *             raise it when an awaited promise eval waits longer than that.
 *   --lang    browser locale (default zh-CN): the first-mile experience being reviewed
 *             is the Chinese one, and a fresh headless profile would otherwise render
 *             en-US. Sets both the Chrome UI language and the page's locale override.
 *
 * Chrome resolution: the shared resolver in cdp-driver.mjs ($DSH_PROBE_CHROME, then the
 * legacy alias $CHROME_BIN, then Google Chrome, then Edge — macOS app paths). This script
 * kept its own resolver (and its own env name) before 2026-10-14; a user who set only
 * CHROME_BIN kept working through the alias.
 * No npm dependency — child process + Node's built-in fetch/WebSocket (see
 * scripts/AGENTS.md: Node built-ins + repo-internal only).
 */
import { spawn } from 'node:child_process'
import { mkdirSync, existsSync, statSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpDir } from '../../env/tmp.mjs'
import { findChromeBinary } from './cdp-driver.mjs'
import { option, sleep } from './probe-utils.mjs'

const args = process.argv.slice(2)
const targetUrl = args.find(a => !a.startsWith('--'))
if (targetUrl === undefined) {
  console.error("usage: node dev/probes/web/webui-shots.mjs <url-with-token> [--out <dir>] [--name <base>] [--size <WxH>]... [--budget <ms>] [--settle <ms>] [--dom] [--plain] [--eval <js>]... [--require-eval <text>] [--lang <bcp47>]")
  process.exit(1)
}

const sizes = args.flatMap((a, i) => (a === '--size' && i + 1 < args.length ? [args[i + 1]] : []))
const evals = args.flatMap((a, i) => (a === '--eval' && i + 1 < args.length ? [args[i + 1]] : []))
// 261019 (BUG-021): a readiness wait that times out used to be indistinguishable from success —
// the run captured whatever was on screen and `--refresh` committed it. With this flag the LAST
// eval's return value must contain the text, so a scene's readiness token becomes a real gate.
const requireEval = option(args, 'require-eval', undefined)

const outDir = option(args, 'out', tmpDir('shots'))
const name = option(args, 'name', `shot-${Date.now()}`)
const budget = Number(option(args, 'budget', '20000'))
const settle = Number(option(args, 'settle', '4000'))
const lang = option(args, 'lang', 'zh-CN')
const wantDom = args.includes('--dom')
const plain = args.includes('--plain')
const viewports = sizes.length > 0 ? sizes : ['1600x1000']

const chrome = findChromeBinary()
if (chrome === undefined) {
  console.error('no Chrome/Edge binary found (set DSH_PROBE_CHROME or CHROME_BIN)')
  process.exit(1)
}

/** Resolve once Chrome prints its DevTools endpoint on stderr; fail after 20s. */
function waitForDevToolsUrl(proc) {
  return new Promise((resolve, reject) => {
    let buffer = ''
    const timer = setTimeout(() => reject(new Error('chrome never printed a DevTools endpoint')), 20000)
    proc.stderr.on('data', chunk => {
      buffer += chunk
      const match = /DevTools listening on (ws:\/\/\S+)/.exec(buffer)
      if (match !== null) {
        clearTimeout(timer)
        resolve(match[1])
      }
    })
    proc.on('exit', code => {
      clearTimeout(timer)
      reject(new Error(`chrome exited before exposing DevTools (exit ${code})`))
    })
  })
}

/**
 * The Chrome flags both capture paths share. Kept in one place because the two used to
 * carry copies that drifted; the per-path flags (CDP endpoint vs `--screenshot`) stay at
 * their spawn site.
 * @param options - the capture's profile directory and viewport.
 * @returns the shared argument list, in launch order.
 */
function sharedChromeArgs({ userDataDir, viewport }) {
  return [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    // Without this, headless Chrome consults the system proxy/PAC configuration and every
    // HTTP load hangs forever while `data:` URLs still work — the misleading symptom that
    // cost a long diagnosis on 2026-09-26 (requests were issued, no response ever landed,
    // the server answered curl in milliseconds).
    '--no-proxy-server',
    `--lang=${lang}`,
    `--user-data-dir=${userDataDir}`,
    // Crashpad must not write under ~/Library (denied in a sandboxed session), but do NOT
    // reach for that by overriding HOME: on Chrome 153.0.8010.54 an overridden HOME makes
    // the browser fail to produce any output at all (observed 2026-09-26, cost: a long
    // detour). The dedicated flag is the supported way.
    `--crash-dumps-dir=${userDataDir}`,
    `--window-size=${viewport.replace('x', ',')}`,
  ]
}

/** The browser-level diagnosis a wedged renderer leaves behind (it answers no evaluate). */
function diagnostics(cdp) {
  const log = cdp.events
    .filter(e => e.method === 'Log.entryAdded' || e.method === 'Inspector.targetCrashed')
    .map(e => e.method === 'Inspector.targetCrashed' ? 'TARGET CRASHED' : `${e.params.entry.level}: ${e.params.entry.text}`)
    .slice(-10)
  const requests = cdp.events
    .filter(e => e.method === 'Network.requestWillBeSent')
    .map(e => e.params.request.url)
    .slice(-6)
  return { log, requests }
}

/** A minimal CDP client over one page-target WebSocket. */
class Cdp {
  constructor(socket) {
    this.socket = socket
    this.nextId = 0
    this.pending = new Map()
    this.events = []
    this.socket.addEventListener('message', ev => {
      const message = JSON.parse(ev.data)
      if (message.id !== undefined) {
        this.pending.get(message.id)?.(message)
        this.pending.delete(message.id)
      } else {
        this.events.push(message)
      }
    })
    // A dead target must fail the capture, not hang it: without this, every pending
    // response waits forever and the tool looks like a freeze (observed 2026-09-26).
    this.socket.addEventListener('close', () => {
      for (const resolve of this.pending.values()) resolve({ error: { message: 'DevTools socket closed' } })
      this.pending.clear()
    })
  }

  static async open(webSocketDebuggerUrl) {
    const socket = new WebSocket(webSocketDebuggerUrl)
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve)
      socket.addEventListener('error', () => reject(new Error(`cannot open DevTools socket ${webSocketDebuggerUrl}`)))
    })
    return new Cdp(socket)
  }

  send(method, params = {}) {
    const id = ++this.nextId
    return new Promise(resolve => {
      this.pending.set(id, resolve)
      this.socket.send(JSON.stringify({ id, method, params }))
    })
  }

  fired(method) {
    return this.events.some(event => event.method === method)
  }
}

mkdirSync(outDir, { recursive: true })
let failures = 0
for (const viewport of viewports) {
  // A dedicated throwaway user-data-dir per capture: the default profile is owned by
  // any running Chrome instance ("Failed to create headless user data directory
  // container", 2026-09-26), and sharing across viewports would couple their state.
  const userDataDir = join(outDir, '.chrome-profile', `${name}-${viewport}`)
  mkdirSync(userDataDir, { recursive: true })
  const target = join(outDir, `${name}-${viewport}.png`)

  let watchdog
  let cdp
  let proc
  let chromeStderr = ''

  if (plain) {
    // Screenshot-only path: no protocol client, so a busy main thread cannot stall it.
    // Chrome writes the file when the first frame is ready and then idles; we poll for
    // the file and take the whole process group down afterwards.
    const plainProc = spawn(chrome, [
      ...sharedChromeArgs({ userDataDir, viewport }),
      `--screenshot=${target}`,
      targetUrl,
    ], { env: process.env, detached: true, stdio: 'ignore' })
    const plainDeadline = Date.now() + budget + settle + 20_000
    while ((!existsSync(target) || statSync(target).size === 0) && Date.now() < plainDeadline) await sleep(500)
    try { process.kill(-plainProc.pid, 'SIGKILL') } catch { /* already gone */ }
    await sleep(500)
    try { rmSync(userDataDir, { recursive: true, force: true }) } catch { /* residue */ }
    if (existsSync(target) && statSync(target).size > 0) {
      console.log(`  ok   ${target} (${(statSync(target).size / 1024).toFixed(0)} KiB, viewport ${viewport}, plain)`)
    } else {
      failures += 1
      console.error(`  FAIL ${target}: --plain produced no screenshot`)
    }
    continue
  }

  // The CDP path only: --plain returns above, so it never spawns this browser.
  // --no-sandbox + a throwaway HOME: a capture process cannot initialize Chrome's own
  // sandbox under an outer file sandbox, and Crashpad insists on writing crash dumps
  // under $HOME/Library (both observed 2026-09-26). A process that renders one page and
  // exits has nothing worth sandboxing.
  proc = spawn(chrome, [
    ...sharedChromeArgs({ userDataDir, viewport }),
    // Node's WebSocket sends no same-origin handshake Chrome accepts; without this flag
    // the DevTools socket is refused (local loopback, one-shot process: acceptable).
    '--remote-allow-origins=*',
    '--remote-debugging-port=0',
    // Start at the target URL, never about:blank + Page.navigate: on Chrome 153.0.8010.54
    // a protocol-initiated navigation issues no subresource request at all and the page
    // hangs (evaluate and screenshot both stall), while the same URL opened at launch
    // loads normally — isolated 2026-09-26 after a long "the server must be broken"
    // detour. The cost is that the locale override lands after the first document, so the
    // first paint follows the host's own locale settings.
    targetUrl,
  ], {
    env: process.env,
    // Own process group: Chrome's helper processes (network, gpu, renderers) outlive a
    // parent-only SIGTERM and accumulate across captures until new instances misbehave —
    // 26 leftovers were measured before a long "HTTP hangs" diagnosis on 2026-09-26.
    // Killing the group is what actually cleans up.
    detached: true,
  })

  // Chrome's stderr is the only place a dead network service reports itself; keep a
  // bounded tail (declared with the other capture state) so the watchdog can print it
  // instead of swallowing it (observed 2026-09-26: HTTP loads hung with no other symptom).
  proc.stderr.on('data', chunk => { chromeStderr = (chromeStderr + chunk).slice(-4000) })

  try {
    // Watchdog: a page that wedges Chrome would otherwise hang the whole capture with no
    // output (observed 2026-09-26). Killing the process closes the DevTools socket, which
    // rejects every pending response and lands the failure in the catch below.
    // `--timeout` exists because an awaited promise eval (a real wait for a timeout to expire,
    // a turn to settle) can legitimately outlive any formula over budget/settle/eval count.
    const watchdogMs = Number(option(args, 'timeout', String(budget + settle + evals.length * 1500 + 30_000)))
    watchdog = setTimeout(() => {
      console.error(`  !!   watchdog: no capture after ${watchdogMs}ms — killing chrome`)
      // A killed Chrome does not reliably close the DevTools socket, so a pending CDP
      // response may never settle; report what the browser-level channels saw and exit
      // rather than hanging the caller (observed 2026-09-26).
      if (cdp !== undefined) {
        const { log, requests } = diagnostics(cdp)
        if (log.length > 0) console.error(`       browser log: ${log.join(' | ')}`)
        if (requests.length > 0) console.error(`       last requests: ${requests.join(' | ')}`)
      }
      if (chromeStderr.length > 0) {
        const tail = chromeStderr.trim().split('\n').filter(line => line.trim().length > 0).slice(-6)
        console.error(`       chrome stderr: ${tail.join(' | ')}`)
      }
      proc.kill('SIGKILL')
      try { process.kill(-proc.pid, 'SIGKILL') } catch { /* already gone */ }
      setTimeout(() => process.exit(1), 1000)
    }, watchdogMs)

    const browserWs = await waitForDevToolsUrl(proc)
    const httpBase = browserWs.replace(/^ws:/, 'http:').replace(/\/devtools\/browser\/.*$/, '')
    const targets = await (await fetch(`${httpBase}/json/list`)).json()
    const page = targets.find(t => t.type === 'page')
    if (page === undefined) throw new Error('chrome exposed no page target')

    cdp = await Cdp.open(page.webSocketDebuggerUrl)
    // Enable before navigate: boot-time console errors, uncaught exceptions, and failed
    // resource loads are the first diagnosis when the app does not mount.
    await cdp.send('Page.enable')
    await cdp.send('Runtime.enable')
    await cdp.send('Network.enable')
    // Log + Inspector keep reporting when the renderer's main thread is wedged: a crashed
    // target or a browser-level complaint is the only evidence left in that state
    // (observed 2026-09-26, where evaluate and screenshot both hung with no output).
    await cdp.send('Log.enable')
    await cdp.send('Inspector.enable')
    const [width, height] = viewport.split('x').map(Number)
    await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })
    // Best-effort locale: the first document is already loading (see the spawn comment),
    // so this reaches reloads and later documents. A capture that must read Chinese UI
    // needs the host's locale preference set instead of a browser override.
    await cdp.send('Emulation.setLocaleOverride', { locale: lang })
    await cdp.send('Emulation.setUserAgentOverride', { acceptLanguage: `${lang},${lang.split('-')[0]};q=0.9,en;q=0.8` })

    // The document started before we connected, so a captured load event is not reliable.
    // Ask the page instead; if it is still booting, give it the budget, then settle a beat
    // for async hydration before capturing.
    const ready = await cdp.send('Runtime.evaluate', { expression: 'document.readyState', returnByValue: true })
    if (ready.result?.result?.value !== 'complete') {
      const deadline = Date.now() + budget
      while (!cdp.fired('Page.loadEventFired') && Date.now() < deadline) await sleep(250)
    }
    await sleep(settle)

    let lastEvalDetail
    for (const snippet of evals) {
      // awaitPromise lets a snippet wait for real time (a tab to open, a turn to settle)
      // instead of the caller padding the run with throwaway evals.
      const outcome = await cdp.send('Runtime.evaluate', { expression: snippet, returnByValue: true, awaitPromise: true })
      if (outcome.result?.exceptionDetails !== undefined) {
        const details = outcome.result.exceptionDetails
        const reason = details.exception?.description ?? details.text ?? JSON.stringify(details)
        throw new Error(`--eval threw: ${String(reason).slice(0, 400)}`)
      }
      const detail = outcome.result?.result?.value ?? 'ok'
      lastEvalDetail = detail
      console.log(`  ..   eval → ${String(detail).slice(0, 120)}`)
      // Let React commit whatever the snippet triggered before the next snippet or capture.
      await sleep(1500)
    }
    if (requireEval !== undefined && !String(lastEvalDetail ?? '').includes(requireEval)) {
      throw new Error(`--require-eval: the last eval never reported "${requireEval}" (last: ${String(lastEvalDetail ?? '').slice(0, 160)})`)
    }

    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' })
    if (shot.error !== undefined) throw new Error(`capture rejected: ${JSON.stringify(shot.error)}`)
    writeFileSync(target, Buffer.from(shot.result.data, 'base64'))

    if (wantDom) {
      // The DOM evidence is the text-readable half of the pair. `visibleText` is what the
      // screen literally reads (the fastest way for a text model to "look"); the outline
      // adds per-block pixel heights, which is what density judgments need.
      const evaluation = await cdp.send('Runtime.evaluate', {
        returnByValue: true,
        expression: `(() => {
          // "Visible" deliberately does NOT require a layout box: the app container uses
          // display:contents, which has no box of its own but visible children. Requiring
          // a nonzero rect silently skipped the whole app subtree and produced an empty
          // outline for a fully rendered page (observed 2026-09-26).
          const visible = el => {
            const s = getComputedStyle(el)
            return s.display !== 'none' && s.visibility !== 'hidden'
          }
          const lines = []
          const controls = []
          const walk = (el, depth) => {
            // Depth cap is generous on purpose: a React app nests deep, and a shallow cap
            // silently yields an empty outline (observed 2026-09-26 — a rendered page read
            // as blank). The line cap, not the depth cap, is what bounds the output.
            if (!visible(el) || depth > 30 || lines.length > 500) return
            const r = el.getBoundingClientRect()
            const own = [...el.childNodes]
              .filter(n => n.nodeType === Node.TEXT_NODE)
              .map(n => n.textContent.trim()).filter(Boolean).join(' ')
            if (own) lines.push('  '.repeat(depth) + el.tagName.toLowerCase() + ' h=' + Math.round(r.height) + ': ' + own.slice(0, 120))
            if (el.tagName === 'BUTTON' || el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && el.type !== 'hidden')) {
              const label = (el.getAttribute('aria-label') || el.placeholder || el.innerText || '').trim()
              // The disabled attribute is part of the evidence: a frozen surface and a live one
              // differ only by it, so a control list without it cannot prove a gate opened.
              const state = el.disabled === true ? 'disabled ' : ''
              controls.push(state + el.tagName.toLowerCase() + ' h=' + Math.round(r.height) + ': ' + label.slice(0, 100))
            }
            for (const c of el.children) walk(c, depth + 1)
          }
          walk(document.body, 0)
          return JSON.stringify({
            title: document.title,
            href: location.href,
            lang: navigator.language,
            viewport: innerWidth + 'x' + innerHeight,
            pageHeight: document.body.scrollHeight,
            screens: Math.max(1, Math.round(document.body.scrollHeight / innerHeight * 10) / 10),
            readyState: document.readyState,
            bootEntries: (globalThis.__DSH_BOOT__ && globalThis.__DSH_BOOT__.entries ? globalThis.__DSH_BOOT__.entries.length : -1),
            elementCount: document.querySelectorAll('*').length,
            capturedAt: new Date().toISOString(),
            visibleText: (document.body.innerText || '').slice(0, 20000),
            textOutline: lines,
            controls,
          }, null, 1)
        })()`,
      })
      const domTarget = join(outDir, `${name}-${viewport}.dom.txt`)
      const outline = evaluation.result?.result?.value
      if (typeof outline !== 'string') {
        // Surface the raw response instead of crashing on undefined: an evaluate that
        // threw inside the page carries exceptionDetails, and anything else here is a
        // protocol surprise we want to read, not swallow.
        throw new Error(`DOM evidence evaluate returned no value: ${JSON.stringify(evaluation).slice(0, 500)}`)
      }
      // Console/traffic evidence lives on the Node side (CDP events), not in the page
      // expression — the page cannot see its own protocol session.
      const pageData = JSON.parse(outline)
      pageData.consoleErrors = [
        ...cdp.events
          .filter(e => e.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(e.params.type))
          .map(e => e.params.type + ': ' + e.params.args.map(a => a.value ?? a.description ?? a.type).join(' ').slice(0, 200)),
        ...cdp.events
          .filter(e => e.method === 'Runtime.exceptionThrown')
          .map(e => 'exception: ' + (e.params.exceptionDetails.text + ' ' + (e.params.exceptionDetails.exception?.description ?? '')).slice(0, 200)),
      ].slice(0, 30)
      pageData.networkFailures = cdp.events
        .filter(e => e.method === 'Network.loadingFailed')
        .map(e => (e.params.errorText ?? '') + ' ' + (e.params.blockedReason ?? '')).slice(0, 10)
      writeFileSync(domTarget, JSON.stringify(pageData, null, 1))
      console.log(`  ok   ${domTarget} (DOM evidence)`)
    }
    clearTimeout(watchdog)
    cdp.socket.close()
  } catch (error) {
    failures += 1
    console.error(`  FAIL ${target}: ${String(error)}`)
    // A wedged renderer answers no evaluate, so the browser-level channels are the only
    // diagnosis: surface whatever Log/Inspector reported before the watchdog fired.
    if (cdp !== undefined) {
      const { log, requests } = diagnostics(cdp)
      if (log.length > 0) console.error(`       browser log: ${log.join(' | ')}`)
      if (requests.length > 0) console.error(`       last requests: ${requests.join(' | ')}`)
    }
  } finally {
    clearTimeout(watchdog)
    // Kill the whole group, then insist: a parent-only SIGTERM leaves Chrome's helpers
    // running (see the spawn comment). A profile that still refuses deletion is residue in
    // the out dir, not a failure of the capture — leave it rather than crashing the run.
    const killGroup = signal => { try { process.kill(-proc.pid, signal) } catch { /* already gone */ } }
    killGroup('SIGTERM')
    await new Promise(resolve => {
      const timer = setTimeout(resolve, 5000)
      proc.once('exit', () => { clearTimeout(timer); resolve() })
    })
    killGroup('SIGKILL')
    try {
      rmSync(userDataDir, { recursive: true, force: true })
    } catch { /* residue in the out dir; harmless */ }
  }

  if (existsSync(target) && statSync(target).size > 0) {
    console.log(`  ok   ${target} (${(statSync(target).size / 1024).toFixed(0)} KiB, viewport ${viewport})`)
  } else if (!failures) {
    failures += 1
    console.error(`  FAIL ${target}: no file written`)
  }
}

process.exit(failures === 0 ? 0 : 1)
