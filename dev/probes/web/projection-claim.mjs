#!/usr/bin/env node
// The claim arm's browser affordances (principal direction, 2026-10-12: every desk item
// selects into a contextual action). Assertions run as page-context functions whose return
// values the probe checks in Node (the shots-eval lesson, K1/K2 limitation ⑤): a failed
// assertion, a readiness timeout, or browser console/network problems each fail the run.
//
// Read-only on purpose: it drives selection and asserts the detail pane plus the contextual
// 「认领这件事」 button on the live projection — it does NOT click the claim action, which
// would create a session in the walked home (test residue). The click-through wiring is proven
// at the component level (projection-panel.spec) and the inject face (client-entry.spec); the
// full claim loop with a replayed model turn is a registered follow-up (the seed ledger carries
// no unclaimed fragments yet, so a deterministic replay has nothing to claim).
import { launchCdpBrowser } from './cdp-driver.mjs'

const [url] = process.argv.slice(2)
if (!url) throw new Error('usage: projection-claim.mjs <url>')

const handle = await launchCdpBrowser({ url, windowSize: '1280,800' })
if (handle.failed !== undefined) {
  console.error(`FAIL browser launch: ${handle.failed}`)
  process.exit(1)
}
const { evaluate, consoleProblems, exceptions } = handle
const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms) })
const problems = () => ({ consoleProblems, exceptions })

// Readiness: the desk list carrying the unclaimed fragment of the walked home's real ledger.
let clicked = false
for (let i = 0; i < 40 && !clicked; i++) {
  clicked = await evaluate(`(() => {
    const root = document.querySelector('[data-assistant-operating-desk]')
    const card = [...(root?.querySelectorAll('button.dsha-card') ?? [])].find(b => (b.textContent ?? '').includes('二期款已经付了'))
    if (card === undefined) return false
    card.click(); return true
  })()`) === true
  if (!clicked) await sleep(500)
}
if (!clicked) {
  handle.close()
  console.error(`FAIL fragment card readiness: never appeared within 20s ${JSON.stringify(problems())}`)
  process.exit(1)
}

// The selected fragment must read back in the detail pane with its contextual action present.
await sleep(600)
const detail = await evaluate(`(() => {
  const root = document.querySelector('[data-assistant-operating-desk]')
  const text = root?.innerText ?? ''
  const claim = [...(root?.querySelectorAll('button') ?? [])].find(b => (b.textContent ?? '').trim() === '认领这件事')
  return {
    noteVisible: text.includes('二期款已经付了'),
    sourceVisible: text.includes('来自 session-'),
    claimButtonPresent: claim !== undefined,
  }
})()`)
if (detail?.noteVisible !== true || detail?.sourceVisible !== true || detail?.claimButtonPresent !== true) {
  handle.close()
  console.error(`FAIL claim detail: ${JSON.stringify({ detail, ...problems() })}`)
  process.exit(1)
}
if (consoleProblems.length > 0 || exceptions.length > 0) {
  handle.close()
  console.error(`FAIL browser problems: ${JSON.stringify(problems())}`)
  process.exit(1)
}
handle.close()
console.log('PASS unclaimed fragment selects into a contextual claim detail')
