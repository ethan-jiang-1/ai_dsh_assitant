#!/usr/bin/env node
/**
 * proactive-shots — seed-state evidence for「它替你看过」three desk states (261018 proactive,
 * acceptance row 3): due / quiet / dup, each on a seeded isolated home.
 *
 *   due   : seed ledger with an overdue active matter and NO receipt after its checkpoint
 *           (the e2e seed ledger already is exactly this shape) → row 1 must render.
 *   quiet : empty ledger tables + no active schedule → the proactive block renders NOTHING
 *           (the suggest block stays — it is an offer, not a fact row).
 *   dup   : two active weeklies carrying ONE identical prompt with different titles — the
 *           10-13 incident shape → row 3 must state the duplicate and offer the deep link.
 *
 * Per state: write seeds → start probe service (no replay patch — nothing here needs a model
 * round) → CDP open → wait for desk → assert innerText → screenshot → stop service.
 *
 * Usage (repo root): node dev/probes/web/proactive-shots.mjs [--home <dir>] [--keep-service]
 * Prereq: `pnpm build` current (the service serves lib/). First run prepares the probe home
 * (prepare+setup are idempotent). Verdict: JSON on stdout; any failed assertion exits 1.
 */
import { execSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpDir } from '../../env/tmp.mjs'
import { launchCdpBrowser } from './cdp-driver.mjs'
import { deskPresent, deskText, pollUntil } from './dialogue.mjs'
import { option } from './probe-utils.mjs'
import { startProbeService, stopStaleProbeServices } from './probe-service.mjs'

const repoRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..')
const args = process.argv.slice(2)
const home = option(args, 'home', join(tmpDir('probe-home'), 'proactive-shots-home'))
const shotDir = tmpDir('shots')
mkdirSync(shotDir, { recursive: true })

if (!existsSync(join(home, 'profiles', 'dev', 'cordis.patch.yml'))) {
  // Idempotent and env-prefixed per the double-home rule; the probe home never touches ~/.dsh.
  execSync(`ASSISTANT_DSH_HOME=${JSON.stringify(home)} bash dev/env/prepare.sh`, { cwd: repoRoot, stdio: 'inherit' })
  execSync(`ASSISTANT_DSH_HOME=${JSON.stringify(home)} bash dev/env/setup.sh`, { cwd: repoRoot, stdio: 'inherit' })
}
await stopStaleProbeServices(home)

const seedLedger = JSON.parse(readFileSync(join(repoRoot, 'dev', 'fixtures', 'desk-process', 'seed-ledger.json'), 'utf8'))
const emptyLedger = { ...seedLedger, matters: {}, operations: {}, unclaimed: {}, nextMatterSeq: 1, nextUnclaimedSeq: 1 }
const emptySchedule = { unit: { name: 'schedule', version: 1 }, global: null, tables: { tasks: {} } }
const nextMonday = new Date(Date.now() + 24 * 3600_000)
nextMonday.setUTCMinutes(0, 0, 0)
const weeklyTask = (id, title, sessionId) => ({
  sessionId,
  record: {
    id, kind: 'weekly', title,
    prompt: '[weekly review] — present the weekly reconciliation per the morning-brief skill',
    time: '09:00:00.000', timeZone: 'Asia/Shanghai', weekdays: [1],
    scheduledAt: nextMonday.toISOString().replace(/\.\d{3}Z$/, '.000Z'),
  },
  status: 'active',
  deliveryHistory: { records: [], earlierRecordsUnavailable: false },
})
const dupSchedule = {
  unit: { name: 'schedule', version: 1 }, global: null,
  tables: { tasks: {
    'schedule-seed-a': weeklyTask('schedule-seed-a', '每周对账（周一 09:00）', 'session-seed-a'),
    'schedule-seed-b': weeklyTask('schedule-seed-b', '每周复盘（到期承诺与本周期决策）', 'session-seed-b'),
  } },
}

const states = [
  {
    id: 'due',
    seed: { ledger: seedLedger, schedule: emptySchedule },
    assert: {
      // The seed ledger carries one unclaimed fragment, so row 2 legitimately shows up too.
      includes: ['天，账上没有结果', '看这件事', '它在等你'],
      excludes: [],
    },
  },
  {
    id: 'quiet',
    seed: { ledger: emptyLedger, schedule: emptySchedule },
    assert: {
      includes: ['让它替你盯'],
      excludes: ['它在等你', '它下次替你看', '天，账上没有结果'],
    },
  },
  {
    id: 'dup',
    seed: { ledger: emptyLedger, schedule: dupSchedule },
    assert: {
      includes: ['发现 2 条重复盯守', '去任务页'],
      excludes: ['它在等你'],
    },
  },
]

const writeSeed = ({ ledger, schedule }) => {
  const operatingDir = join(home, 'assistant-operating')
  mkdirSync(operatingDir, { recursive: true })
  writeFileSync(join(operatingDir, 'ledger.json'), JSON.stringify(ledger, null, 2))
  // The operating service derives its directory name from the workspace; seed under BOTH the
  // plain name and whatever the dev home already uses, so either layout resolves.
  const storages = join(home, 'storages')
  mkdirSync(storages, { recursive: true })
  writeFileSync(join(storages, 'schedule.json'), JSON.stringify(schedule, null, 2))
}

const verdict = { probe: 'proactive-shots', home, states: {} }
let failed = false
for (const state of states) {
  writeSeed(state.seed)
  const { service, url, pidFile } = await startProbeService({ repoRoot, home, pidName: '.proactive-shots.pid' })
  let browser = undefined
  try {
    browser = await launchCdpBrowser({ url, evaluateTimeoutMs: 20_000 })
    const deskUp = await pollUntil(browser.evaluate, deskPresent, { checkFirst: true, budget: 40 })
    if (deskUp !== true) throw new Error('desk never mounted')
    // 261019: dismiss the first-open dialogs before the evidence frame. The preview notice and
    // the keyless API-key prompt both sit over the due/dup rows (the second appears after the
    // first is acknowledged); the innerText assertions never depended on them, but the PNGs are
    // the human-review half and should show the desk.
    await new Promise(resolve => setTimeout(resolve, 2500)) // let the projection + catalog settle
    for (let round = 0; round < 6; round += 1) {
      await browser.evaluate(`(() => {
        const labels = ['继续', '稍后配置'];
        const button = [...document.querySelectorAll('button')].find(x => labels.includes(x.textContent.trim()));
        if (button) button.click();
        return button === undefined ? null : button.textContent.trim();
      })()`)
      await new Promise(resolve => setTimeout(resolve, 600))
    }
    await new Promise(resolve => setTimeout(resolve, 1000))
    const text = await browser.evaluate(deskText)
    const missing = state.assert.includes.filter(phrase => String(text).includes(phrase) === false)
    const leaking = state.assert.excludes.filter(phrase => String(text).includes(phrase) === true)
    const png = await browser.captureScreenshot()
    const shotPath = join(shotDir, `proactive-face-${state.id}-1500x1000.png`)
    writeFileSync(shotPath, png)
    const pass = missing.length === 0 && leaking.length === 0
    verdict.states[state.id] = { pass, missing, leaking, shot: shotPath, textHead: String(text).slice(0, 300) }
    if (!pass) failed = true
  } catch (error) {
    verdict.states[state.id] = { pass: false, error: String(error).slice(0, 300) }
    failed = true
  } finally {
    try { browser?.close() } catch { /* already gone */ }
    service.kill('SIGTERM')
    try { existsSync(pidFile) && (await import('node:fs')).rmSync(pidFile) } catch { /* best effort */ }
  }
}
console.log(JSON.stringify(verdict, null, 2))
process.exit(failed ? 1 : 0)
