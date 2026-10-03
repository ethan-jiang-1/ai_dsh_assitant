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
//        [--follow-up 'second question'] [--dislike] [--size 1600,1000]
//        [--keep-browser] [--quiet]
//
//   '<gui-url>'  the booted GUI URL including its ?token= (preflight-green
//                URLs are the intended input)
//   --ask '…'    paste the question into the main composer, send it, wait
//                for the assistant's reply, and capture its tail — the full
//                first-use loop. NOTE: it creates a real session (and, on a
//                preset home, a real model call) in the target home — point
//                it at a throwaway home when the target must stay pristine.
//   --follow-up '…'
//                a second turn in the SAME session — multi-turn continuity
//                (P2) in one run.
//   --dislike    rate the LAST assistant message 👎 with a category and a
//                remark — exercises the feedback pipeline the friction
//                report (§7) runs on.
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
const followUpIndex = args.indexOf('--follow-up');
const followUp = followUpIndex >= 0 ? (args[followUpIndex + 1] ?? undefined) : undefined;
const sizeIndex = args.indexOf('--size');
const size = sizeIndex >= 0 ? (args[sizeIndex + 1] ?? '1600,1000') : '1600,1000';
const keepBrowser = flag('--keep-browser');
const quiet = flag('--quiet');
const dislike = flag('--dislike');
const approve = flag('--approve');
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
  // The default-workspace initialization is ASYNC on a fresh home (osascript +
  // mkdir): the first paint can transiently show the workspace question and
  // self-heal once initialization lands. Whether it self-heals IN PLACE (the
  // client re-renders) or stays stuck until a manual reload is exactly the
  // first-open question — so the whole surface is polled until the workspace
  // settles (max ~12s), and only a persistent stick fails. A single early
  // sample misreports a healthy home (observed 2026-10-01: registry
  // initialized:true while the first paint still asked the workspace question).
  let surface = await evaluate(`(() => {
    const text = document.body.textContent ?? '';
    return {
      firstMile: text.includes('第一次来'),
      roomJargon: text.includes('三室'),
      workspaceStuck: text.includes('Choose a workspace to start')
        || text.includes('Unable to create default workspace'),
      zhHero: text.includes('探索未至之境'),
    };
  })()`);
  for (let i = 0; i < 8 && surface?.workspaceStuck === true; i++) {
    await new Promise((resolve) => { setTimeout(resolve, 1500) });
    surface = await evaluate(`(() => {
      const text = document.body.textContent ?? '';
      return {
        firstMile: text.includes('第一次来'),
        roomJargon: text.includes('三室'),
        workspaceStuck: text.includes('Choose a workspace to start')
          || text.includes('Unable to create default workspace'),
        zhHero: text.includes('探索未至之境'),
      };
    })()`);
  }
  verdict.workspaceReady = surface?.workspaceStuck === false;
  verdict.firstMileStripShown = surface?.firstMile === true;
  verdict.noRoomJargon = surface?.roomJargon === false;
  verdict.zhHero = surface?.zhHero === true;

  // The full product loop. The composer is a framework contenteditable that
  // REJECTS execCommand('insertText') (returns false, editor state unmoved) —
  // the working insertion is a synthetic ClipboardEvent 'paste' carrying the
  // text (verified against this exact editor, 2026-10-01).
  //
  // One turn = paste-with-retry → send → wait for the stop button to vanish
  // (the reliable done-signal) → capture the reply tail. Paste needs RETRY
  // because a fresh home's composer silently drops text until the default
  // workspace lands (async, ~10s), and the send button is disabled while the
  // composer is empty — so "send enabled" is only usable as a POST-paste
  // proof, never as a pre-wait.
  //
  // Send/stop are matched by EXACT aria-label in both locales: substring
  // matching is poisoned by the sidebar's session items, whose aria-label
  // embeds the LLM-generated session TITLE — a title merely containing
  // "停止" matched forever and the probe timed out on a 4-second turn
  // (observed 2026-10-01).
  const runTurn = async (text) => {
    const result = { question: text, pasted: undefined, composerReady: false, sent: undefined, replySeconds: null, replyTail: '', waitSamples: [], approvals: 0, approvalPending: false };
    const pasteOnce = `(() => {
      const composer = document.querySelector('[data-composer-input="true"]');
      if (composer === null) return 'no-composer';
      composer.focus();
      const data = new DataTransfer();
      data.setData('text/plain', ${JSON.stringify(text)});
      composer.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
      return 'pasted';
    })()`;
    const sendEnabled = `(() => {
      const send = [...document.querySelectorAll('button')].find(b =>
        (b.getAttribute('aria-label') ?? '') === '发送消息'
        || (b.getAttribute('aria-label') ?? '') === 'Send message');
      return send !== undefined && send.disabled === false;
    })()`;
    let sendReady = false;
    for (let i = 0; i < 6 && !sendReady; i++) {
      result.pasted = await evaluate(pasteOnce);
      await new Promise((resolve) => { setTimeout(resolve, 1000) });
      sendReady = await evaluate(sendEnabled) === true;
    }
    result.composerReady = sendReady;
    if (!sendReady) { result.sent = 'composer-never-accepted-text'; return result; }
    await new Promise((resolve) => { setTimeout(resolve, 800) });
    result.sent = await evaluate(`(() => {
      const send = [...document.querySelectorAll('button')].find(b =>
        (b.getAttribute('aria-label') ?? '') === '发送消息'
        || (b.getAttribute('aria-label') ?? '') === 'Send message');
      if (send === undefined) return 'no-send-button';
      if (send.disabled) return 'send-disabled';
      send.click();
      return 'sent';
    })()`);
    if (result.sent !== 'sent') return result;
    const stopPresent = `[...document.querySelectorAll('button')].some(b => {
      const label = b.getAttribute('aria-label') ?? '';
      return label === '停止生成' || label === 'Stop generating';
    })`;
    let started = false;
    for (let i = 0; i < 20 && !started; i++) {
      started = await evaluate(stopPresent) === true;
      if (!started) await new Promise((resolve) => { setTimeout(resolve, 300) });
    }
    if (!started) { result.sent = 'sent-but-no-stop-button (turn may have failed instantly)'; return result; }
    const startedAt = Date.now();
    // While the turn runs, sample what the principal actually sees every
    // ~4.5s: a wait with no visible motion reads as "它死了" — the samples
    // distinguish a live wait (thinking rows, tool rows, growing text) from
    // a frozen screen. Markers are locale-neutral (zh + en) because the
    // locale preference is per-home.
    let done = false;
    for (let i = 0; i < 300 && !done; i++) {
      await new Promise((resolve) => { setTimeout(resolve, 1500) });
      done = await evaluate(stopPresent) === false;
      if (i % 3 === 0 && !done) {
        result.waitSamples.push(await evaluate(`(() => {
          const text = document.body.textContent ?? '';
          return {
            atSec: Math.round((Date.now() - ${startedAt}) / 1000),
            bodyLen: text.length,
            thinking: /思考|深度求索|正在读|正在|Thinking|thought/i.test(text),
            toolRow: /运行命令|加载技能|读取|Running|Loaded/i.test(text),
          };
        })()`));
      }
      // 审批门（2026-10-04）：回合可能停在 approval/asked 上等真人——UI 出现「允许一次」。
      // --approve 就地点掉并计数（探针冻结审批闭环的挂账能力，首开 UX 卡第 11 轮）；
      // 不带旗标则如实上报 parked，不再伪装成普通超时。
      const approvalState = await evaluate(`(() => {
        const b = [...document.querySelectorAll('button')].find(x => (x.textContent ?? '').trim() === '允许一次');
        if (b === undefined) return 'none';
        return 'present';
      })()`);
      if (approvalState === 'present') {
        if (approve) {
          const clicked = await evaluate(`(() => {
            const b = [...document.querySelectorAll('button')].find(x => (x.textContent ?? '').trim() === '允许一次');
            if (b === undefined) return 'gone';
            b.click();
            return 'clicked';
          })()`);
          if (clicked === 'clicked') result.approvals = (result.approvals ?? 0) + 1;
        } else {
          result.approvalPending = true;
        }
      }
    }
    if (!done) {
      result.sent = result.approvalPending === true
        ? 'turn parked at approval gate (pass --approve to auto-approve)'
        : 'timeout: turn still running after 450s';
      return result;
    }
    result.replySeconds = Math.round((Date.now() - startedAt) / 1000);
    // The reply renders into the conversation body; the tail carries its
    // closing sections (动作表/停止条件 live at the end of an answer).
    result.replyTail = (await evaluate(`(document.body.textContent ?? '').slice(-500)`)) ?? '';
    return result;
  };

  if (ask !== undefined && composerMounted) {
    verdict.ask = await runTurn(ask);
    // Multi-turn continuity (P2): a follow-up turn in the SAME session must
    // reach the prior turn's context without re-explaining the setup.
    if (followUp !== undefined && verdict.ask.replySeconds !== null) {
      verdict.followUp = await runTurn(followUp);
    }
    // The 👎 flow: rate the LAST assistant message with a category and a
    // remark — the signal the friction report (§7) and the next fix list run on.
    // SEQUENTIAL evaluate steps, not one async IIFE: the driver's evaluate
    // does not awaitPromise, so an async IIFE's promise is abandoned mid-flow
    // (observed 2026-10-01: dialog left open, no feedback event recorded).
    if (dislike) {
      const dislikeButtons = await evaluate(`[...document.querySelectorAll('button')].filter(b => (b.getAttribute('aria-label') ?? '') === '有问题的回答' || (b.getAttribute('aria-label') ?? '') === 'Bad response').length`);
      if (dislikeButtons === 0 || dislikeButtons === undefined) {
        verdict.dislike = 'no-dislike-button';
      } else {
        await evaluate(`(() => {
          const buttons = [...document.querySelectorAll('button')].filter(b => (b.getAttribute('aria-label') ?? '') === '有问题的回答' || (b.getAttribute('aria-label') ?? '') === 'Bad response');
          buttons[buttons.length - 1].click();
          return 'clicked';
        })()`);
        await new Promise((resolve) => { setTimeout(resolve, 1500) });
        await evaluate(`(() => {
          const cat = [...document.querySelectorAll('button')].find(b => (b.textContent ?? '').trim() === '其他' || (b.textContent ?? '').trim() === 'Other');
          if (cat) cat.click();
          return cat ? 'category-clicked' : 'no-category';
        })()`);
        await evaluate(`(() => {
          const ta = document.querySelector('[role=dialog] textarea, [class*=dialog] textarea, [class*=Feedback] textarea');
          if (ta === null) return 'no-textarea';
          const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
          setter.call(ta, '探针测试：回复应标注每个数字的数据时点');
          ta.dispatchEvent(new Event('input', { bubbles: true }));
          return 'remark-set';
        })()`);
        await new Promise((resolve) => { setTimeout(resolve, 800) });
        const submit = await evaluate(`(() => {
          const submit = [...document.querySelectorAll('button')].find(b => (b.textContent ?? '').trim() === '提交' || (b.textContent ?? '').trim().toLowerCase() === 'submit');
          if (submit === undefined) return 'no-submit';
          submit.click();
          return 'submitted';
        })()`);
        await new Promise((resolve) => { setTimeout(resolve, 2000) });
        verdict.dislike = submit;
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
const askOk = verdict.ask !== undefined
  && verdict.ask.pasted === 'pasted' && verdict.ask.composerReady === true
  && verdict.ask.sent === 'sent' && typeof verdict.ask.replySeconds === 'number'
  && verdict.ask.replyTail.trim().length > 0;
if (ask !== undefined && !askOk) exitCode = 1;
if (followUp !== undefined && (verdict.followUp === undefined
  || verdict.followUp.sent !== 'sent' || typeof verdict.followUp.replySeconds !== 'number')) exitCode = 1;
if (dislike && verdict.dislike !== 'submitted') exitCode = 1;
process.exit(exitCode);
