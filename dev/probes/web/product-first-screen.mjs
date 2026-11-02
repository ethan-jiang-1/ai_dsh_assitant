#!/usr/bin/env node
/**
 * Product first-screen probe: the two defects the 261102 card measured, on the live UI.
 *
 * The card's evidence was structural (CDP snapshots): the dashboard gate only covers the desk
 * path (E4-2), and a reload pulls the principal out of the conversation (E5). This probe keeps
 * both as one repeatable verdict after the gate moved into the conversation:
 *
 * 1. unbound first screen: the desk gate asks for a project and no longer offers 「稍后」
 *    (that escape unlocked the desk's own input lane while the product was unbound);
 * 2. 「新会话」 before binding: the conversation strip explains the inert input and the
 *    composer itself is disabled (the block, not a hidden button);
 * 3. binding through the product route, then reload: the principal stays in the conversation
 *    they were in — the remembered main view, not a forced desk.
 *
 * It posts the workspace directly (the native directory dialog is not drivable); the picker
 * flow and the follow-up Session open are covered by `tests/client/product-*.spec.ts` and the
 * product web-face scenes.
 *
 * Usage:
 *   node dev/probes/web/product-first-screen.mjs '<url-with-token>' [--quiet]
 *
 * Exits 0 only when every expectation holds. The verdict is one JSON object on stdout.
 * Style: scripts/AGENTS.md — pure ESM, Node built-ins only; Chrome over the shared CDP driver.
 */
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { findChromeBinary, launchCdpBrowser } from './cdp-driver.mjs'
import { pollUntil } from './dialogue.mjs'
import { sleep } from './probe-utils.mjs'
import { mkTmpDir } from '../../env/tmp.mjs'

const args = process.argv.slice(2)
const url = args.find(argument => !argument.startsWith('--'))
const quiet = args.includes('--quiet')
const say = message => { if (!quiet) console.error(`  ..  ${message}`) }

if (url === undefined || !/^https?:\/\//.test(url)) {
  console.error("product-first-screen: pass a booted GUI URL like 'http://127.0.0.1:<port>/?token=<t>'")
  process.exit(2)
}
if (findChromeBinary() === undefined) {
  console.error('product-first-screen: BLOCKED — no Chrome/Edge binary (set DSH_PROBE_CHROME or CHROME_BIN)')
  process.exit(2)
}

const project = mkTmpDir('product-first-screen', 'project-')
mkdirSync(project, { recursive: true })

const verdict = {
  deskGate: false,
  noLaterEscape: false,
  newSessionBlocked: false,
  dockExplains: false,
  bindAccepted: false,
  reloadStaysInConversation: false,
  mainView: null,
}

const browser = await launchCdpBrowser({ url })
const { evaluate } = browser

/** Evaluate, treating a navigation-destroyed context as "not yet" instead of a probe failure. */
async function safeEvaluate(expression) {
  try { return await evaluate(expression) } catch { return undefined }
}

async function waitFor(fn, label) {
  const value = await pollUntil(safeEvaluate, fn, { intervalMs: 400, budget: 75, checkFirst: true })
  if (value !== true) throw new Error(`timed out waiting for ${label}`)
}

try {
  say('waiting for the unbound desk gate')
  await waitFor(
    "document.body.innerText.includes('选一个项目目录') && document.body.innerText.includes('选择项目目录')",
    'the unbound gate',
  )
  verdict.deskGate = true
  verdict.noLaterEscape = (await evaluate("!document.body.innerText.includes('稍后')")) === true

  say('opening a new session before binding')
  const clicked = await evaluate(`(() => {
    const button = [...document.querySelectorAll('button')].find(candidate =>
      ((candidate.getAttribute('aria-label') ?? '') + (candidate.textContent ?? '')).includes('新建会话'))
    if (button === undefined) return false
    button.click()
    return true
  })()`)
  if (clicked !== true) throw new Error('no new-session button')

  await waitFor(
    "document.body.innerText.includes('先选择一个项目目录')",
    'the product gate dock',
  )
  verdict.dockExplains = true
  // The dock and the composer block share one seat and one copy line. Assert the block's own
  // surface — the editor is disabled/inert AND its placeholder carries the reason — not the
  // seat's innerText, which the dock alone satisfies.
  verdict.newSessionBlocked = await evaluate(`(() => {
    const seat = document.querySelector('[data-composer-seat]')
    if (seat === null) return false
    const editor = seat.querySelector('[contenteditable], [role="textbox"], textarea')
    if (editor === null) return false
    const disabled = editor.getAttribute('aria-disabled') === 'true'
      || editor.getAttribute('contenteditable') === 'false'
      || editor.hasAttribute('disabled')
      || editor.inert === true
    const placeholder = seat.querySelector('[data-composer-placeholder]')?.textContent ?? ''
    return disabled && placeholder.includes('先选择一个项目目录')
  })()`) === true

  say(`binding the project ${project}`)
  // The driver's evaluate is synchronous (no awaitPromise): start the POST, park its status on
  // the page, then poll it. A reload later drops the parking spot, which is fine — it is read
  // before the reload.
  await evaluate(`(() => {
    window.__productProbe = {}
    fetch('/api/assistant/product', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ workspaceDir: ${JSON.stringify(project)} }),
    }).then(response => { window.__productProbe.status = response.status })
      .catch(error => { window.__productProbe.error = String(error) })
    return true
  })()`)
  await pollUntil(safeEvaluate, 'window.__productProbe !== undefined && window.__productProbe.status !== undefined', {
    intervalMs: 300, budget: 50, checkFirst: true,
  })
  const status = await evaluate('window.__productProbe.status')
  verdict.bindAccepted = status === 200
  if (status !== 200) verdict.bindError = await evaluate('window.__productProbe.error')

  say('reloading to prove the conversation survives')
  await evaluate('location.reload()').catch(() => undefined)
  await sleep(1200)
  await waitFor(
    "document.readyState === 'complete' && document.querySelector('[data-conversation-region=\"chat\"]') !== null && !document.body.innerText.includes('先选择一个项目目录')",
    'the conversation after reload',
  )
  verdict.reloadStaysInConversation = await evaluate(`(() => {
    const chat = document.querySelector('[data-conversation-region="chat"]') !== null
    const desk = document.querySelector('[data-assistant-one-page-home]') !== null
    const seat = document.querySelector('[data-composer-seat]')
    return chat && !desk && seat !== null && !seat.innerText.includes('先选择一个项目目录')
  })()`) === true
  verdict.mainView = await evaluate("localStorage.getItem('dsha:main-view')")
} catch (error) {
  verdict.failure = error instanceof Error ? error.message : String(error)
} finally {
  await browser.close()
}

const pass = verdict.deskGate
  && verdict.noLaterEscape
  && verdict.newSessionBlocked
  && verdict.dockExplains
  && verdict.bindAccepted
  && verdict.reloadStaysInConversation
  && verdict.mainView === 'chat'

process.stdout.write(`${JSON.stringify({ pass, ...verdict }, null, 2)}\n`)
process.exit(pass ? 0 : 1)
