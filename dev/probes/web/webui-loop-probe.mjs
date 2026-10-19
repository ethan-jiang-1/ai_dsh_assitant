#!/usr/bin/env node
// First-use loop probe: launch a throwaway headless Chrome against a booted
// GUI URL (via the generic CDP driver in cdp-driver.mjs, adjacent), assert
// the first-open surface this repo promises, and — with --ask — drive the
// full product loop (type a real question, send it, wait for the real reply).
//
// WHAT THE FIRST SCREEN IS (rewritten 2026-10-11, BUG-010): the 唯一桌面 decision made the
// ledger desk page the default main area, so the first-open surface is
// `[data-assistant-operating-desk]` — not a conversation. The composer, the vendor hero and our
// first-mile strip live INSIDE a conversation, so this probe now asserts the desk first, then
// (only when a turn is requested, because that is what creates a session) walks in through the
// desk's own door 「＋ 交代新事项」 and asserts the composer and the strip there. Before this the
// probe red-flagged a perfectly healthy instance: composerMounted/firstMileStripShown/zhHero were
// false by design on the desk page.
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
//   node dev/probes/web/webui-loop-probe.mjs '<gui-url>' [--ask 'question']
//        [--follow-up 'second question'] [--walk '["msg2","msg3"]'] [--dislike] [--size 1600,1000]
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
//   --walk '["…","…"]'
//     Multi-turn naive walk (2026-10-06, new-UX landing discipline): a JSON array of further
//     messages run sequentially in the SAME session after --ask — the self-test instrument for
//     Day-0 arcs the single turn cannot cover (e.g. the three-question intake to its brief).
//     Each turn gets the same verdict shape as --ask (paste/send/reply); exit 1 if any turn
//     fails to send.
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
import { launchCdpBrowser } from './cdp-driver.mjs';
import process from 'node:process';
import { flag, option, sleep } from './probe-utils.mjs';
import { buttonByText, clickByText, pasteUntilSendable, pollUntil, sendClick, sendEnabled, turnRunning } from './dialogue.mjs';

const args = process.argv.slice(2);
const guiUrl = args.find(a => !a.startsWith('--'));
const ask = option(args, 'ask');
const followUp = option(args, 'follow-up');
const walkIndex = args.indexOf('--walk');
let walk = undefined;
if (walkIndex >= 0) {
  try { walk = JSON.parse(args[walkIndex + 1] ?? '[]'); if (!Array.isArray(walk)) walk = undefined }
  catch { walk = undefined }
  if (walk === undefined) { console.error('loop-probe: --walk expects a JSON array of strings'); process.exit(2) }
}
const size = option(args, 'size', '1600,1000');
const keepBrowser = flag(args, 'keep-browser');
const quiet = flag(args, 'quiet');
const dislike = flag(args, 'dislike');
const approve = flag(args, 'approve');
const say = (message) => { if (!quiet) console.error(`  ..  ${message}`) };
// Whether this run drives real turns — those are the runs that enter a conversation (creating a
// session); a surface-only run must stay side-effect-free.
const wantsTurn = ask !== undefined || followUp !== undefined || (walk !== undefined && walk.length > 0) || dislike;

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
  // First-open surface (product-owned promises): the ledger desk page is the default main area
  // since the 唯一桌面 decision (2026-10-11) — these four describe THAT screen.
  deskFirstScreen: false,
  deskCopyZh: null,
  noRoomJargon: null,
  workspaceReady: null,
  // Conversation surface — asserted after the desk's own door is used, and only when a turn runs
  // (entering a conversation creates a session, so a surface-only run stays side-effect-free).
  entry: undefined,
  composerMounted: null,
  firstMileStripShown: null,
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
  // Boot wait: the DESK PAGE is the first mount this probe needs (唯一桌面, 2026-10-11). A fixed
  // settle + poll proved steadier than a one-shot read (driver doc §判定轮询).
  // The room-jargon guard pins the first-open UX card's fix: governance vocabulary never leaks back.
  // Our own desk copy in Chinese is what says the first screen is OURS and localized, now that the
  // vendor hero (whose zh string used to carry that role) is one click deeper.
  // The default-workspace initialization is ASYNC on a fresh home (osascript +
  // mkdir): the first paint can transiently show the workspace question and
  // self-heal once initialization lands. Whether it self-heals IN PLACE (the
  // client re-renders) or stays stuck until a manual reload is exactly the
  // first-open question — so the whole surface is polled until the workspace
  // settles (max ~12s), and only a persistent stick fails. A single early
  // sample misreports a healthy home (observed 2026-10-01: registry
  // initialized:true while the first paint still asked the workspace question).
  // 2026-10-04 (auditor-caught): poll until the WHOLE surface settles, not just
  // the workspace chip — the first-mile strip depends on session.blank owner
  // data that hydrates after first paint, so the one-shot sample misreported
  // it absent on a healthy home (live DOM showed the strip rendered). Any
  // marker still failing may be mid-hydration; only a failure that persists
  // the full budget is a real failure.
  const deskSurface = `(() => {
    const root = document.querySelector('[data-assistant-operating-desk]');
    const text = document.body.textContent ?? '';
    return {
      desk: root !== null && (root.textContent ?? '').includes('你的桌面'),
      deskCopy: text.includes('重新读取') && text.includes('交代新事项'),
      roomJargon: text.includes('三室'),
      workspaceStuck: text.includes('Choose a workspace to start')
        || text.includes('Unable to create default workspace'),
    };
  })()`
  const surface = await pollUntil(evaluate, deskSurface, {
    intervalMs: 1500, budget: 8, checkFirst: true,
    isDone: state => state?.desk === true && state?.deskCopy === true
      && state?.roomJargon === false && state?.workspaceStuck === false,
  });
  verdict.workspaceReady = surface?.workspaceStuck === false;
  verdict.noRoomJargon = surface?.roomJargon === false;
  verdict.deskFirstScreen = surface?.desk === true;
  verdict.deskCopyZh = surface?.deskCopy === true;

  // 进会话（只在要跑回合时）：走桌面自己的门——「＋ 交代新事项」（它同时也是交代首事臂的入口），
  // 没有它才退到「新建会话」。进了之后才判 composer 与首开引导条。
  if (wantsTurn) {
    verdict.entry = await evaluate(`(() => {
      const root = document.querySelector('[data-assistant-operating-desk]');
      const door = ${buttonByText('交代新事项', { exact: false, within: '[data-assistant-operating-desk]' })};
      if (door !== undefined) { door.click(); return 'desk-intake' }
      const fresh = ${buttonByText('新建会话', { exact: false })};
      if (fresh !== undefined) { fresh.click(); return 'new-session' }
      return 'no-entry';
    })()`);
    const composerMounted = await pollUntil(evaluate, `document.querySelector('[data-composer-input="true"]') !== null`, { checkFirst: true, budget: 40 })
    verdict.composerMounted = composerMounted === true;
    // 首开引导条是我们自己的中文文案，两种变体都算在场（全新 home 是「第一次来」，有数据的是
    // 「这是你的一把手桌面」）——按 home 新旧二选一判会把健康 home 判红。
    verdict.firstMileStripShown = await evaluate(`(() => {
      const text = document.body.textContent ?? '';
      return text.includes('第一次来') || text.includes('这是你的一把手桌面');
    })()`) === true;
  }

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
    const { pasteResult, sendable } = await pasteUntilSendable(evaluate, text, { attempts: 6, gapMs: 1000 });
    result.pasted = pasteResult;
    result.composerReady = sendable;
    if (!sendable) { result.sent = 'composer-never-accepted-text'; return result; }
    await sleep(800);
    result.sent = await evaluate(sendClick);
    if (result.sent !== 'sent') return result;
    let started = false;
    for (let i = 0; i < 20 && !started; i++) {
      started = await evaluate(turnRunning) === true;
      if (!started) await sleep(300);
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
      await sleep(1500);
      done = await evaluate(turnRunning) === false;
      if (i % 3 === 0 && !done) {
        result.waitSamples.push(await evaluate(`(() => {
          const text = document.body.textContent ?? '';
          return {
            atSec: Math.round((Date.now() - ${startedAt}) / 1000),
            bodyLen: text.length,
            thinking: /思考|深度求索|正在读|正在|Thinking|thought/i.test(text),
            toolRow: /运行命令|加载技能|读取|Running|Loaded/i.test(text),
            // 摩擦 1 取证（首开 UX 卡第 13 轮）：桌面过期警告的出现/消失时刻——
            // 区分「回合期间的诚实显示」与「回合结束后的重读滞后」，修法完全不同。
            yamlHead: /(^|\\n)\\s*---/.test(text.slice(0, 3000)),
          };
        })()`));
      }
      // 审批门（2026-10-04）：回合可能停在 approval/asked 上等真人——UI 出现「允许一次」。
      // --approve 就地点掉并计数（探针冻结审批闭环的挂账能力，首开 UX 卡第 11 轮）；
      // 不带旗标则如实上报 parked，不再伪装成普通超时。
      const approvalState = await evaluate(`(${buttonByText('允许一次')}) === undefined ? 'none' : 'present'`);
      if (approvalState === 'present') {
        if (approve) {
          const clicked = await evaluate(clickByText('允许一次', { notFound: 'gone' }));
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
    // 回合结束不等于取证结束：摩擦 1 的定罪窗口恰在「回合结束后」——桌面文件已被
    // 面板若重读滞后，警告会多挂一个轮询拍。跟随采样 8 拍（~12s），
    // 看警告是立刻消失（诚实显示）还是滞留（重读滞后 = 要修的是面板，不是文案）。
    result.postTurnSamples = [];
    for (let i = 0; i < 8; i++) {
      await sleep(1500);
      result.postTurnSamples.push(await evaluate(`(() => {
        const text = document.body.textContent ?? '';
        return {
          atSec: Math.round((Date.now() - ${startedAt}) / 1000),
          bodyLen: text.length,
        };
      })()`));
    }
    result.replySeconds = Math.round((Date.now() - startedAt) / 1000);
    // The reply renders into the conversation body; the tail carries its
    // closing sections (动作表/停止条件 live at the end of an answer).
    result.replyTail = (await evaluate(`(document.body.textContent ?? '').slice(-500)`)) ?? '';
    return result;
  };

  if (ask !== undefined && verdict.composerMounted === true) {
    verdict.ask = await runTurn(ask);
    // Multi-turn continuity (P2): a follow-up turn in the SAME session must
    // reach the prior turn's context without re-explaining the setup.
    if (followUp !== undefined && verdict.ask.replySeconds !== null) {
      verdict.followUp = await runTurn(followUp);
    }
    // The naive walk: further turns in the same session, sequential (each waits for its
    // reply before the next paste — the composer is one editor, parallel pastes would eat
    // each other).
    if (walk !== undefined && walk.length > 0 && verdict.ask.replySeconds !== null) {
      verdict.walkTurns = [];
      for (const message of walk) verdict.walkTurns.push(await runTurn(message));
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
        await sleep(1500);
        await evaluate(clickByText(['其他', 'Other'], { notFound: 'no-category' }));
        await evaluate(`(() => {
          const ta = document.querySelector('[role=dialog] textarea, [class*=dialog] textarea, [class*=Feedback] textarea');
          if (ta === null) return 'no-textarea';
          const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
          setter.call(ta, '探针测试：回复应标注每个数字的数据时点');
          ta.dispatchEvent(new Event('input', { bubbles: true }));
          return 'remark-set';
        })()`);
        await sleep(800);
        const submit = await evaluate(`(() => {
          const submit = [...document.querySelectorAll('button')].find(b => (b.textContent ?? '').trim() === '提交' || (b.textContent ?? '').trim().toLowerCase() === 'submit');
          if (submit === undefined) return 'no-submit';
          submit.click();
          return 'submitted';
        })()`);
        await sleep(2000);
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
if (verdict.deskFirstScreen === false || verdict.deskCopyZh === false) exitCode = 1;
if (verdict.noRoomJargon === false || verdict.workspaceReady === false) exitCode = 1;
if (wantsTurn && (verdict.composerMounted !== true || verdict.firstMileStripShown !== true)) exitCode = 1;
const askOk = verdict.ask !== undefined
  && verdict.ask.pasted === 'pasted' && verdict.ask.composerReady === true
  && verdict.ask.sent === 'sent' && typeof verdict.ask.replySeconds === 'number'
  && verdict.ask.replyTail.trim().length > 0;
if (ask !== undefined && !askOk) exitCode = 1;
if (followUp !== undefined && (verdict.followUp === undefined
  || verdict.followUp.sent !== 'sent' || typeof verdict.followUp.replySeconds !== 'number')) exitCode = 1;
if (walk !== undefined && (verdict.walkTurns ?? []).some(turn =>
  turn.sent !== 'sent' || typeof turn.replySeconds !== 'number')) exitCode = 1;
if (dislike && verdict.dislike !== 'submitted') exitCode = 1;
process.exit(exitCode);
