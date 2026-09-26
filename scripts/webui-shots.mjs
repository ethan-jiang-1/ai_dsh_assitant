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
 * (see notes/proposed/2026-09-26-first-mile-landing.md).
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
 * prove: interaction states (menus open, tab chips clicked) — we only navigate, never
 * synthesize input; those states stay with DOM assertions.
 *
 * Usage:
 *   node scripts/webui-shots.mjs 'http://127.0.0.1:<port>/?token=<token>' \
 *     [--out <dir>] [--name <base>] [--size <WxH>]... [--budget <ms>] [--settle <ms>]
 *     [--dom] [--lang <bcp47>]
 *
 *   --out     target directory (default /tmp/dsh-webui-shots, created if missing).
 *             Evidence you want to cite from a note goes to notes/research/… instead —
 *             snapshots/ is session-replay fixtures only.
 *   --name    file base name (default shot-<unix-ms>); one pair per --size.
 *   --size    viewport, repeatable (default 1600x1000). Use a narrow one (e.g. 420x900)
 *             to approximate the right-sidebar pane width when a desk tab is open.
 *   --budget  max wall-clock ms to wait for the page's `load` event before capturing
 *             anyway (default 20000; the SSE connection can keep `load` from firing).
 *   --settle  extra wall-clock ms after load-or-budget before capture, letting async
 *             boot (combo fetch, React hydration) finish painting (default 4000).
 *   --dom     also write the JSON evidence file described above.
 *   --lang    browser locale (default zh-CN): the first-mile experience being reviewed
 *             is the Chinese one, and a fresh headless profile would otherwise render
 *             en-US. Sets both the Chrome UI language and the page's locale override.
 *
 * Chrome resolution order: $CHROME_BIN, then Google Chrome, then Edge (macOS app paths).
 * No npm dependency — child process + Node's built-in fetch/WebSocket (see
 * scripts/AGENTS.md: Node built-ins + repo-internal only).
 */
import { spawn } from 'node:child_process'
import { mkdirSync, existsSync, statSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const args = process.argv.slice(2)
const given = args.find(a => !a.startsWith('--'))
if (given === undefined) {
  console.error("usage: node scripts/webui-shots.mjs <url-with-token> [--out <dir>] [--name <base>] [--size <WxH>]... [--budget <ms>] [--settle <ms>] [--dom] [--lang <bcp47>]")
  process.exit(1)
}

const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && i + 1 < args.length ? args[i + 1] : fallback
}
const sizes = args.flatMap((a, i) => (a === '--size' && i + 1 < args.length ? [args[i + 1]] : []))

const outDir = option('out', '/tmp/dsh-webui-shots')
const name = option('name', `shot-${Date.now()}`)
const budget = Number(option('budget', '20000'))
const settle = Number(option('settle', '4000'))
const lang = option('lang', 'zh-CN')
const wantDom = args.includes('--dom')
const viewports = sizes.length > 0 ? sizes : ['1600x1000']

const chromeCandidates = [
  process.env.CHROME_BIN,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
].filter(Boolean)
const chrome = chromeCandidates.find(p => existsSync(p))
if (chrome === undefined) {
  console.error(`no Chrome/Edge binary found (tried: ${chromeCandidates.join(', ')}); set CHROME_BIN`)
  process.exit(1)
}

const sleep = ms => new Promise(resolve => { setTimeout(resolve, ms) })

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

  // --no-sandbox + a throwaway HOME: a capture process cannot initialize Chrome's own
  // sandbox under an outer file sandbox, and Crashpad insists on writing crash dumps
  // under $HOME/Library (both observed 2026-09-26). A process that renders one page and
  // exits has nothing worth sandboxing.
  const proc = spawn(chrome, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    // Node's WebSocket sends no same-origin handshake Chrome accepts; without this flag
    // the DevTools socket is refused (local loopback, one-shot process: acceptable).
    '--remote-allow-origins=*',
    `--lang=${lang}`,
    `--user-data-dir=${userDataDir}`,
    '--remote-debugging-port=0',
    'about:blank',
  ], { env: { ...process.env, HOME: userDataDir } })

  try {
    const browserWs = await waitForDevToolsUrl(proc)
    const httpBase = browserWs.replace(/^ws:/, 'http:').replace(/\/devtools\/browser\/.*$/, '')
    const targets = await (await fetch(`${httpBase}/json/list`)).json()
    const page = targets.find(t => t.type === 'page')
    if (page === undefined) throw new Error('chrome exposed no page target')

    const cdp = await Cdp.open(page.webSocketDebuggerUrl)
    // Enable before navigate: boot-time console errors, uncaught exceptions, and failed
    // resource loads are the first diagnosis when the app does not mount.
    await cdp.send('Page.enable')
    await cdp.send('Runtime.enable')
    await cdp.send('Network.enable')
    const [width, height] = viewport.split('x').map(Number)
    await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })
    // Language: the reviewed experience is the Chinese one, but a fresh headless profile
    // has no stored locale preference and the client falls back to navigator.language
    // (en-US). Neither --lang nor setLocaleOverride moves navigator.language in this
    // Chrome (observed 2026-09-26), so override it before any page script runs, and send
    // Accept-Language to match.
    await cdp.send('Emulation.setLocaleOverride', { locale: lang })
    await cdp.send('Emulation.setUserAgentOverride', { acceptLanguage: `${lang},${lang.split('-')[0]};q=0.9,en;q=0.8` })
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `Object.defineProperty(navigator, 'language', { get: () => ${JSON.stringify(lang)} });
Object.defineProperty(navigator, 'languages', { get: () => [${JSON.stringify(lang)}, ${JSON.stringify(lang.split('-')[0])}] });`,
    })
    await cdp.send('Page.navigate', { url: given })

    // Race: the page's load event (may never fire — SSE keeps the document loading)
    // against the wall-clock budget; whichever wins, settle a beat for async boot.
    const deadline = Date.now() + budget
    while (!cdp.fired('Page.loadEventFired') && Date.now() < deadline) await sleep(250)
    await sleep(settle)

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
              controls.push(el.tagName.toLowerCase() + ' h=' + Math.round(r.height) + ': ' + label.slice(0, 100))
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
            visibleText: (document.body.innerText || '').slice(0, 2000),
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
    cdp.socket.close()
  } catch (error) {
    failures += 1
    console.error(`  FAIL ${target}: ${String(error)}`)
  } finally {
    // Wait for Chrome to actually exit before deleting its profile: it keeps writing
    // files after SIGTERM, and racing the delete crashes the script (ENOTEMPTY, observed
    // 2026-09-26). A profile that still refuses deletion is /tmp residue, not a failure
    // of the capture — leave it rather than crashing the run.
    proc.kill('SIGTERM')
    await new Promise(resolve => {
      const timer = setTimeout(resolve, 5000)
      proc.once('exit', () => { clearTimeout(timer); resolve() })
    })
    try {
      rmSync(userDataDir, { recursive: true, force: true })
    } catch { /* residue in /tmp; harmless */ }
  }

  if (existsSync(target) && statSync(target).size > 0) {
    console.log(`  ok   ${target} (${(statSync(target).size / 1024).toFixed(0)} KiB, viewport ${viewport})`)
  } else if (!failures) {
    failures += 1
    console.error(`  FAIL ${target}: no file written`)
  }
}

process.exit(failures === 0 ? 0 : 1)
