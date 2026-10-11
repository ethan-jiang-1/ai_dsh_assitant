#!/usr/bin/env node
/** Real Web read verification; shots owns CDP. Requires a caller-prepared isolated Host fixture. */
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkTmpDir } from '../../env/tmp.mjs'

const [url, expectedText] = process.argv.slice(2)
if (!url || !expectedText) throw new Error('usage: projection-panel.mjs <isolated-url> <expected-visible-text>')
const output = mkTmpDir('projection-panel', 'projection-panel-')
const shots = fileURLToPath(new URL('./webui-shots.mjs', import.meta.url))
const result = spawnSync(process.execPath, [shots, url, '--dom', '--size', '1280x800', '--out', output, '--name', 'projection', '--eval', `new Promise((resolve,reject)=>{const end=Date.now()+10000;const tick=()=>{if(document.querySelector('[data-assistant-operating-desk]')?.innerText.includes(${JSON.stringify(expectedText)}))resolve('projection ready');else if(Date.now()>end)reject(new Error('projection readiness timeout'));else setTimeout(tick,100)};tick()})`], { encoding: 'utf8' })
if (result.status !== 0) throw new Error(`shots failed (${String(result.status)}): ${result.stderr}`)
const evidence = JSON.parse(readFileSync(join(output, 'projection-1280x800.dom.txt'), 'utf8'))
if (!evidence.visibleText.includes(expectedText)) throw new Error(`expected visible projection text: ${expectedText}`)
if (evidence.consoleErrors.length || evidence.networkFailures.length) throw new Error('browser console/network failures: inspect retained DOM evidence')
console.log(`PASS real projection panel: ${expectedText}; evidence ${output}`)
