/**
 * The dialogue idioms every conversational browser probe re-verified the hard way.
 *
 * Born from copy-paste (the 2026-10 audit counted the paste idiom in three files, the
 * approval dismissal in ten places, the send-button click in six): each copy carried the
 * same hard-won knowledge — the composer REJECTS execCommand('insertText'), so a synthetic
 * ClipboardEvent 'paste' is the only working insertion (verified 2026-10-01); send/stop
 * buttons are matched by EXACT aria-label in both locales because substring matching is
 * poisoned by sidebar session titles that merely contain the words; a fresh home's
 * composer silently drops text until the default workspace lands, so paste needs retry.
 * One copy drifting meant one probe lying differently than the others.
 *
 * What is deliberately NOT here: each probe's verdict logic (sampling, phase assertions,
 * approval counting). The library owns the mechanics; the probes keep their judgements and
 * their exact timing budgets — pass the original numbers, do not retune them here.
 *
 * Style: scripts/AGENTS.md — pure ESM, Node built-ins only.
 */
import { sleep } from './probe-utils.mjs'

// —— 页面表达式（evaluate 的字符串，两语文案精确匹配）——

export const deskPresent = `document.querySelector('[data-assistant-operating-desk]') !== null`

export const deskText = `(() => { const root = document.querySelector('[data-assistant-operating-desk]'); return root === null ? null : root.innerText })()`

/**
 * Open the full board from the one-page home: "全部" -> "完整看板". Idempotent: a board already
 * mounted (direct deep-link or an older composition) returns 'already'. The probes that assert
 * board internals call this after launch; a page with no matters has no "全部" link, which is a
 * genuine failure for those fixtures.
 * @param {(expression: string) => Promise<any>} evaluate - the CDP driver's evaluate.
 * @param {(ms: number) => Promise<void>} sleep - the probe-utils sleep.
 * @returns {'already'|'all'|'board'|'no-all'|'no-board'}
 */
export async function openBoard(evaluate, sleep) {
  if (await evaluate(`document.querySelector('[data-assistant-operating-desk]') !== null`) === true) return 'already'
  for (let i = 0; i < 30; i++) {
    if (await evaluate(`document.querySelector('[data-assistant-one-page-home]') !== null`) === true) break
    await sleep(500)
  }
  const all = await evaluate(`(() => {
    const button = [...document.querySelectorAll('button')].find(b => (b.textContent ?? '').trim().startsWith('全部'));
    if (button === undefined) return 'no-all';
    button.click(); return 'all';
  })()`)
  if (all !== 'all') return all
  await sleep(400)
  const board = await evaluate(`(() => {
    const button = [...document.querySelectorAll('button')].find(b => (b.textContent ?? '').trim() === '完整看板');
    if (button === undefined) return 'no-board';
    button.click(); return 'board';
  })()`)
  await sleep(400)
  return board
}

export const composerPresent = `document.querySelector('[data-composer-input="true"]') !== null`

/** A conversation took over the main area: the desk unmounted and the composer mounted. */
export const conversationActive = `document.querySelector('[data-assistant-operating-desk]') === null && document.querySelector('[data-composer-input="true"]') !== null`

/** A model turn is running (the stop button is present). Exact labels — see the header. */
export const turnRunning = `[...document.querySelectorAll('button')].some(b => ['停止生成','Stop generating'].includes(b.getAttribute('aria-label') ?? ''))`

/** The send button is present at all (it disappears while a turn runs). */
export const sendPresent = `[...document.querySelectorAll('button')].some(b => ['发送消息','Send message'].includes(b.getAttribute('aria-label') ?? ''))`

export const turnStopped = `!(${turnRunning})`

/**
 * Expression: the first `<button>` whose trimmed text matches, or undefined.
 *
 * `texts` may be one label or several (any of them matches). By default the trimmed text is
 * compared for EQUALITY: substring matching is poisoned by sidebar session titles that merely
 * contain the words (see the header), so pass `exact: false` only where a loose match is the
 * intent. `within` narrows the search to one selector's subtree, for labels that exist both on
 * the desk and in the chat chrome.
 * @param {string|string[]} texts - the label(s) to match.
 * @param {{ exact?: boolean, within?: string }} [options] - match and scope options.
 * @returns {string} an expression returning the element or undefined.
 */
export function buttonByText(texts, { exact = true, within } = {}) {
  const wanted = (Array.isArray(texts) ? texts : [texts])
    .map(text => exact ? `t === ${JSON.stringify(text)}` : `t.includes(${JSON.stringify(text)})`)
    .join(' || ')
  const root = within === undefined ? 'document' : `document.querySelector(${JSON.stringify(within)})`
  return `(() => {
  const root = ${root};
  const buttons = [...(root?.querySelectorAll('button') ?? [])];
  return buttons.find(b => { const t = (b.textContent ?? '').trim(); return ${wanted}; });
})()`
}

/**
 * Expression: click the first button matching `texts`, reporting what happened.
 * @param {string|string[]} texts - the label(s) to match.
 * @param {{ exact?: boolean, within?: string, notFound?: string }} [options] - match options plus
 * the token to report when nothing matches, so each probe keeps its own wording.
 * @returns {string} an expression returning 'clicked' or the not-found token.
 */
export function clickByText(texts, { notFound = 'button-not-found', ...match } = {}) {
  return `(() => {
  const button = ${buttonByText(texts, match)};
  if (button === undefined) return ${JSON.stringify(notFound)};
  button.click(); return 'clicked';
})()`
}

/** Fire-and-forget dismissal of the 「允许一次」 approval gate, when one is showing. */
export const dismissApproval = clickByText('允许一次')

export const sendEnabled = `(() => {
  const send = [...document.querySelectorAll('button')].find(b => ['发送消息','Send message'].includes(b.getAttribute('aria-label') ?? ''));
  return send !== undefined && send.disabled === false;
})()`

/** Click the send button; returns 'no-send-button' | 'send-disabled' | 'sent'. */
export const sendClick = `(() => {
  const send = [...document.querySelectorAll('button')].find(b => ['发送消息','Send message'].includes(b.getAttribute('aria-label') ?? ''));
  if (send === undefined) return 'no-send-button';
  if (send.disabled) return 'send-disabled';
  send.click(); return 'sent';
})()`

/**
 * The working composer insertion: a synthetic ClipboardEvent 'paste' carrying the text.
 * @param {string} text - the text to paste.
 * @returns {string} an expression returning 'no-composer' | 'pasted'.
 */
export const pasteExpression = (text) => `(() => {
  const composer = document.querySelector('[data-composer-input="true"]');
  if (composer === null) return 'no-composer';
  composer.focus();
  const data = new DataTransfer();
  data.setData('text/plain', ${JSON.stringify(text)});
  composer.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  return 'pasted';
})()`

// —— 轮询环 ——

/**
 * Poll a check expression until its value counts as done. Covers both loop orders the
 * probes proved necessary: `checkFirst` (no wasted sleep when the state is already there —
 * conversation takeovers, desk mounts) and the default sleep-first (a turn just started —
 * idle waits, auto-return watches). `eachCycle` runs after every sleep (the probes use it
 * to dismiss approval gates while waiting).
 * @param {(expression: string) => Promise<any>} evaluate - the CDP driver's evaluate.
 * @param {string} check - expression whose value decides done-ness.
 * @param {object} [options]
 * @param {number} [options.intervalMs=500] - sleep between attempts.
 * @param {number} [options.budget=60] - maximum attempts.
 * @param {string} [options.eachCycle] - expression evaluated each cycle after the sleep.
 * @param {boolean} [options.checkFirst=false] - check before the first sleep.
 * @param {(value: any) => boolean} [options.isDone] - done predicate; default `=== true`.
 * @returns {Promise<any>} the last check value (done or not — the caller judges).
 */
export async function pollUntil(evaluate, check, { intervalMs = 500, budget = 60, eachCycle, checkFirst = false, isDone = (value) => value === true } = {}) {
  let value = undefined
  if (checkFirst) {
    for (let i = 0; i < budget; i++) {
      value = await evaluate(check)
      if (isDone(value)) return value
      await sleep(intervalMs)
    }
    return value
  }
  for (let i = 0; i < budget; i++) {
    await sleep(intervalMs)
    if (eachCycle !== undefined) await evaluate(eachCycle)
    value = await evaluate(check)
    if (isDone(value)) return value
  }
  return value
}

/**
 * Paste with retry until the composer accepts the text (send button enabled). A fresh
 * home's composer silently drops text until the default workspace lands (async, ~10s), so
 * one paste is never a proof.
 * @param {(expression: string) => Promise<any>} evaluate - the CDP driver's evaluate.
 * @param {string} text - the text to paste.
 * @param {object} [options]
 * @param {number} [options.attempts=10] - paste retries.
 * @param {number} [options.gapMs=800] - wait between paste and the send-enabled check.
 * @returns {Promise<{ pasteResult: any, sendable: boolean }>} the last paste verdict and
 *   whether the send button ended up enabled.
 */
export async function pasteUntilSendable(evaluate, text, { attempts = 10, gapMs = 800 } = {}) {
  let pasteResult = undefined
  for (let i = 0; i < attempts; i++) {
    pasteResult = await evaluate(pasteExpression(text))
    await sleep(gapMs)
    if (await evaluate(sendEnabled) === true) return { pasteResult, sendable: true }
  }
  return { pasteResult, sendable: false }
}
