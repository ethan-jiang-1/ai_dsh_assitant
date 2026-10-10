#!/usr/bin/env node
// K2 evidence probe: matter selection + evidence read-back on the live projection panel.
//
// Rewritten 2026-10-10 onto cdp-driver (K1/K2 accepted-limitation item ⑤): the previous
// shape ran its assertion as a webui-shots `--eval` promise, but shots treats a thrown or
// rejected eval as a LOG LINE and exits 0 — measured both shapes, both exit 0 — so the
// probe's PASS was toothless. Assertions now run as page-context functions whose return
// values the probe checks in Node; a failed assertion, a readiness timeout, or browser
// console/network problems each fail the run. The screenshot artifact the old shape
// produced as a side effect is gone: the assertion verdict is the probe's product.
import { launchCdpBrowser } from './cdp-driver.mjs'

const [url] = process.argv.slice(2)
if (!url) throw new Error('usage: projection-selection.mjs <url>')

const handle = await launchCdpBrowser({ url, windowSize: '1280,800' })
if (handle.failed !== undefined) {
  console.error(`FAIL browser launch: ${handle.failed}`)
  process.exit(1)
}
const { evaluate, consoleProblems, exceptions } = handle
const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms) })
const problems = () => ({ consoleProblems, exceptions })

// Readiness: the desk panel with the fixture matter (回款 A), then click its card.
let clicked = false
for (let i = 0; i < 40 && !clicked; i++) {
  clicked = await evaluate(`(() => {
    const root = document.querySelector('[data-assistant-operating-desk]');
    const button = [...(root?.querySelectorAll('button') ?? [])].find(b => (b.textContent ?? '').includes('回款 A'));
    if (button === undefined) return false;
    button.click(); return true;
  })()`) === true
  if (!clicked) await sleep(500)
}
if (!clicked) {
  handle.close()
  console.error(`FAIL matter list readiness: 回款 A never appeared within 20s ${JSON.stringify(problems())}`)
  process.exit(1)
}

// The selected evidence must read back in the detail pane (quote + source session/event).
await sleep(600)
const readback = await evaluate(`(() => {
  const root = document.querySelector('[data-assistant-operating-desk]');
  const text = root?.innerText ?? '';
  return { quoteVisible: text.includes('客户提出延期'), sourceVisible: text.includes('simulated-session-a / simulated-event-a') };
})()`)
if (readback?.quoteVisible !== true || readback?.sourceVisible !== true) {
  handle.close()
  console.error(`FAIL selected evidence missing: ${JSON.stringify({ readback, ...problems() })}`)
  process.exit(1)
}
if (consoleProblems.length > 0 || exceptions.length > 0) {
  handle.close()
  console.error(`FAIL browser problems: ${JSON.stringify(problems())}`)
  process.exit(1)
}
handle.close()
console.log('PASS matter selection and evidence read-back')
