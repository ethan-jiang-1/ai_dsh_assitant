#!/usr/bin/env node
// First-use loop probe: launch a throwaway headless Chrome against a booted
// GUI URL (via the generic CDP driver in scripts/lib/cdp-driver.mjs), assert
// the first-open surface this repo promises, and — with --ask — drive the
// full product loop (type a real question, send it, wait for the real reply).
//
// Why this exists: the 2026-10-01 first-open UX campaign rehearsed exactly
// this loop by hand — six separate `pnpm shots` invocations with fragile
// inline JS, one finding per run (composer rejects execCommand; the send/
// stop buttons are the reliable turn-completion signal; a fresh home must
// not be stuck on the workspace question). This script freezes that
// knowledge into one repeatable command so the loop can be re-proven
// after any composition or bundle change instead of re-improvised.
//
// Usage:
//   node scripts/webui-loop-probe.mjs '<gui-url>' [--ask 'question']
//        [--size 1600,1000] [--keep-browser] [--quiet]
//
//   '<gui-url>'  the booted GUI URL including its ?token= (preflight-green
//                URLs are the intended input)
//   --ask '…'    paste the question into the main composer, send it, wait
//                for the assistant's reply, and capture its tail — the full
//                first-use loop. NOTE: it creates a real session (and, on a
//                preset home, a real model call) in the target home — point
//                it at a throwaway home when the target must stay pristine.
//   --quiet      print only the JSON verdict (no progress lines)
//
// Prints one JSON verdict object on stdout. Exits 0 when every expectation
// held, 1 otherwise, 2 on usage/environment errors.
//
// Style: scripts/AGENTS.md — pure ESM, Node built-ins only, comments carry
// the why. The composer interaction knowledge below is this repo's own
// hard-won material (2026-10-01, first-open UX campaign).
import { launchCdpBrowser } from './lib/cdp-driver.mjs';
import process from 'node:process';

const args = process.argv.slice(2);
const guiUrl = args.find(a => !a.startsWith('--'));
const flag = (name) => args.includes(name);
const askIndex = args.indexOf('--ask');
const ask = askIndex >= 0 ? (args[askIndex + 1] ?? undefined) : undefined;
const sizeIndex = args.indexOf('--size');
const size = sizeIndex >= 0 ? (args[sizeIndex + 1] ?? '1600,1000') : '1600,1000';
const keepBrowser = flag('--keep-browser');
const quiet = flag('--quiet');
const say = (message) => { if (!quiet) console.error(`  ..  ${message}`) };

if (guiUrl === undefined || !/^https?:\/\//.test(guiUrl) || !guiUrl.includes('token=')) {
  console.error("webui-loop-probe: PASS a booted GUI URL like 'http://127.0.0.1:<port>/?token=<t>'");
  process.exit(2);
}
if (ask !== undefined && ask.trim().length === 0) {
  console.error('webui-loop-probe: --ask needs a non-empty question');
  process.exit(2);
}

const verdict = {
  booted: false,
  // First-open surface (product-owned promises, see the UX card 261001):
  composerMounted: false,
  firstMileStripShown: false,
  noRoomJargon: null,
  workspaceReady: null,
  zhHero: null,
  // --ask loop:
  askQuestion: undefined,
  pasted: undefined,
  sent: undefined,
  replySeconds: null,
  replyTail: '',
  consoleProblems: [],
  exceptions: [],
};

const handle = await launchCdpBrowser({ url: guiUrl, windowSize: size }).catch((error) => ({ failed: String(error?.message ?? error) }));
if (handle.failed !== undefined) {
  verdict.error = handle.failed;
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(1);
}
verdict.booted = true;
const { evaluate, consoleProblems, exceptions } = handle;
verdict.consoleProblems = consoleProblems;
verdict.exceptions = exceptions;

try {
  // Boot wait: the composer is the first mount this probe needs. A fixed
  // settle + single read proved steadier than a fast poll (driver doc §判定轮询).
  let composerMounted = false;
  for (let i = 0; i < 40 && !composerMounted; i++) {
    composerMounted = await evaluate(`document.querySelector('[data-composer-input="true"]') !== null`) === true;
    if (!composerMounted) await new Promise((resolve) => { setTimeout(resolve, 500) });
  }
  verdict.composerMounted = composerMounted;

  // The blank-session guidance strip is this repo's own copy (hardcoded zh),
  // so its presence is locale-independent. The room-jargon guard pins the
  // first-open UX card's fix: governance vocabulary never leaks back.
  const surface = await evaluate(`(() => {
    const text = document.body.textContent ?? '';
    return {
      firstMile: text.includes('第一次来'),
      roomJargon: text.includes('三室'),
      workspaceStuck: text.includes('Choose a workspace to start')
        || text.includes('Unable to create default workspace'),
      zhHero: text.includes('探索未至之境'),
    };
  })()`);
  verdict.firstMileStripShown = surface?.firstMile === true;
  verdict.noRoomJargon = surface?.roomJargon === false;
  verdict.workspaceReady = surface?.workspaceStuck === false;
  verdict.zhHero = surface?.zhHero === true;

  // The full product loop. The composer is a framework contenteditable that
  // REJECTS execCommand('insertText') (returns false, editor state unmoved) —
  // the working insertion is a synthetic ClipboardEvent 'paste' carrying the
  // text (verified against this exact editor, 2026-10-01). Send/stop are
  // matched by both locales: the zh preference is per-home, and the en
  // fallback is what an unset preference shows.
  if (ask !== undefined && composerMounted) {
    verdict.askQuestion = ask;
    const paste = await evaluate(`(() => {
      const composer = document.querySelector('[data-composer-input="true"]');
      if (composer === null) return 'no-composer';
      composer.focus();
      const data = new DataTransfer();
      data.setData('text/plain', ${JSON.stringify(ask)});
      composer.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
      return 'pasted';
    })()`);
    verdict.pasted = paste;
    await new Promise((resolve) => { setTimeout(resolve, 1200) });
    const send = await evaluate(`(() => {
      // Exact aria-label match on purpose: substring matching is poisoned by
      // the sidebar's session items, whose aria-label embeds the LLM-generated
      // session TITLE — a title merely containing "停止" (e.g. asking about
      // stop conditions) matches forever and the probe times out on a turn
      // that finished in seconds (observed 2026-10-01).
      const send = [...document.querySelectorAll('button')].find(b =>
        (b.getAttribute('aria-label') ?? '') === '发送消息'
        || (b.getAttribute('aria-label') ?? '') === 'Send message');
      if (send === undefined) return 'no-send-button';
      if (send.disabled) return 'send-disabled';
      send.click();
      return 'sent';
    })()`);
    verdict.sent = send;
    if (send === 'sent') {
      // The running turn shows the stop button and removes it on completion —
      // the reliable done-signal (text length never settles while streaming).
      // Exact aria-label match: see the send-button note — the sidebar's
      // session items carry title-derived labels that poison substrings.
      const find = `[...document.querySelectorAll('button')].some(b => {
        const label = b.getAttribute('aria-label') ?? '';
        return label === '停止生成' || label === 'Stop generating';
      })`;
      let started = false;
      for (let i = 0; i < 20 && !started; i++) {
        started = await evaluate(find) === true;
        if (!started) await new Promise((resolve) => { setTimeout(resolve, 300) });
      }
      if (!started) {
        verdict.sent = 'sent-but-no-stop-button (turn may have failed instantly)';
      } else {
        const startedAt = Date.now();
        let done = false;
        for (let i = 0; i < 300 && !done; i++) {
          await new Promise((resolve) => { setTimeout(resolve, 1500) });
          done = await evaluate(find) === false;
        }
        if (!done) {
          verdict.sent = 'timeout: turn still running after 450s';
        } else {
          verdict.replySeconds = Math.round((Date.now() - startedAt) / 1000);
          // The reply is rendered into the conversation body; the tail carries
          // its closing sections (动作表/停止条件 live at the end of an answer).
          verdict.replyTail = (await evaluate(`(document.body.textContent ?? '').slice(-500)`)) ?? '';
        }
      }
    }
  }
} finally {
  verdict.consoleProblems = consoleProblems.slice(0, 10);
  verdict.exceptions = exceptions.slice(0, 10);
  if (!keepBrowser) await handle.settle();
}

console.log(JSON.stringify(verdict, null, 2));
let exitCode = 0;
if (verdict.booted === false || verdict.error !== undefined) exitCode = 1;
if (verdict.composerMounted === false || verdict.firstMileStripShown === false) exitCode = 1;
if (verdict.noRoomJargon === false || verdict.workspaceReady === false) exitCode = 1;
if (ask !== undefined && (verdict.pasted !== 'pasted' || verdict.sent !== 'sent'
  || typeof verdict.replySeconds !== 'number' || verdict.replyTail.trim().length === 0)) exitCode = 1;
process.exit(exitCode);
