#!/usr/bin/env node
/**
 * approve-direct-probe — does the knowledge-approve direct-call lane actually mount on this pin?
 *
 * A2a (2026-10-19): the old 261004 conclusion ("the classic-script face cannot supply a strict
 * codec, so the lane is dead") was a codec-shape misread. This probe is the real-machine judge:
 * it clicks 有问题 → 点这里去审批 → 批准 in the real web UI and reads the durable approval line
 * from `<home>/assistant/audit/approvals.jsonl`.
 *
 * PASS = the newest `promote` line carries `source: "panel-direct"` (the click reached
 * `promotePage` without a model turn). A line with `source: "assistant_reflect"` means the panel
 * fell back to the prompt path — FAIL for the direct lane, and exactly the state A2's host POST
 * must replace.
 *
 * Usage: node dev/probes/web/approve-direct-probe.mjs '<url-with-token>' [--home <dsh-home>]
 * Exit 0 + JSON verdict on stdout; exit 1 when no direct approval line appears.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { launchCdpBrowser } from './cdp-driver.mjs'
import { option } from './probe-utils.mjs'

const args = process.argv.slice(2)
const url = args.find(arg => !arg.startsWith('--'))
if (url === undefined) {
  console.error('usage: node dev/probes/web/approve-direct-probe.mjs <url-with-token> [--home <dsh-home>]')
  process.exit(1)
}
const home = option(args, 'home', join(process.cwd(), '.tmp', 'dsh-expected-banner-home'))
const ledgerPath = join(home, 'assistant', 'audit', 'approvals.jsonl')
const sleep = ms => new Promise(resolve => { setTimeout(resolve, ms) })

const page = await launchCdpBrowser({ url })
const verdict = {
  probe: 'approve-direct-probe',
  url,
  home,
  ledgerPath,
  actions: [],
  lastLine: null,
  consoleProblems: page.consoleProblems,
  exceptions: page.exceptions,
  verdict: 'FAIL',
}

const clickText = async (text) => {
  const clicked = await page.evaluate(`(() => {
    const button = [...document.querySelectorAll('button')].find(candidate => (candidate.textContent || '').includes(${JSON.stringify(text)}));
    if (button === undefined) return false;
    button.click();
    return true;
  })()`)
  verdict.actions.push({ click: text, clicked })
  return clicked === true
}

const waitForText = async (text, timeoutMs = 15000) => {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const present = await page.evaluate(`[...document.querySelectorAll('button')].some(candidate => (candidate.textContent || '').includes(${JSON.stringify(text)}))`)
    if (present === true) return true
    await sleep(250)
  }
  return false
}

const readNewestPromote = () => {
  let lines = []
  try { lines = readFileSync(ledgerPath, 'utf8').trim().split('\n').filter(line => line.length > 0) } catch { return { error: 'ledger-missing' } }
  const parsed = []
  for (const line of lines) {
    try { parsed.push(JSON.parse(line)) } catch { /* keep looking for the newest readable line */ }
  }
  const promotes = parsed.filter(line => line.kind === 'promote' && typeof line.id === 'string')
  return promotes.at(-1) ?? { error: 'no-promote-line' }
}

try {
  await sleep(1200)
  // The isolated banner home presets the notice ack; only the optional API-key guide may appear.
  await clickText('稍后配置')
  if (!(await waitForText('有问题'))) throw new Error('default desk button 有问题 missing')
  await clickText('有问题')
  if (!(await waitForText('点这里去审批'))) throw new Error('approval banner 点这里去审批 missing (is the route seeded?)')
  await clickText('点这里去审批')
  if (!(await waitForText('批准'))) throw new Error('knowledge panel 批准 button missing')
  await clickText('批准')
  // The direct lane is synchronous at the host; the prompt fallback needs a model turn. Give the
  // ledger a short settle, then read the newest promote line — do not mistake absence for PASS.
  await sleep(2500)
  verdict.lastLine = readNewestPromote()
  verdict.verdict = verdict.lastLine.source === 'panel-direct' && verdict.lastLine.error === undefined ? 'PASS' : 'FAIL'
} catch (error) {
  verdict.error = String(error)
} finally {
  console.log(JSON.stringify(verdict, null, 2))
  page.close()
  await page.settle()
  process.exit(verdict.verdict === 'PASS' ? 0 : 1)
}
