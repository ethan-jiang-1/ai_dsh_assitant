#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
const [url] = process.argv.slice(2)
if (!url) throw new Error('usage: projection-selection.mjs <url>')
const out = mkdtempSync(join(tmpdir(), 'projection-selection-'))
const shots = fileURLToPath(new URL('./webui-shots.mjs', import.meta.url))
const evalScript = `new Promise((resolve,reject)=>{const end=Date.now()+10000;const tick=()=>{const root=document.querySelector('[data-assistant-operating-desk]');const button=[...root?.querySelectorAll('button')??[]].find(b=>b.textContent.includes('回款 A'));if(!button){if(Date.now()>end)reject(new Error('matter list readiness timeout'));else setTimeout(tick,100);return}button.click();setTimeout(()=>{const text=root.innerText;if(!text.includes('客户提出延期')||!text.includes('simulated-session-a / simulated-event-a'))reject(new Error('selected evidence missing'));else resolve('selected evidence ready')},100)};tick()})`
const result = spawnSync(process.execPath, [shots, url, '--dom', '--size', '1280x800', '--out', out, '--name', 'selection', '--eval', evalScript], { encoding: 'utf8' })
if (result.status !== 0) throw new Error(`selection probe failed (${String(result.status)}): ${result.stderr}`)
const evidence = JSON.parse(readFileSync(join(out, 'selection-1280x800.dom.txt'), 'utf8'))
if (evidence.consoleErrors.length || evidence.networkFailures.length) throw new Error('browser console/network failures')
console.log(`PASS matter selection and evidence read-back: ${out}`)
