/**
 * Generic CDP driver: launch a throwaway headless Chrome against a URL,
 * connect over the Chrome DevTools Protocol, and expose evaluate/click plus
 * the page's own console problems and uncaught exceptions.
 *
 * This module is project-agnostic — copy it into any repo that ships a web
 * UI and write a scenario against it (in the source repo `ai_dsh_loop_advisor`,
 * see its scripts/cdp-probe.mjs for the loop-advisor scenario and its
 * docs/cdp-probe.md for the pattern and the environment gotchas this driver
 * already handles — those paths are that repo's, not this one's).
 *
 * Provenance: borrowed verbatim from the sibling repo `ai_dsh_loop_advisor`
 * (scripts/lib/cdp-driver.mjs, 2026-10-01) at the owner's instruction — the
 * driver is deliberately self-contained so repos copy it rather than depend
 * on it. This repo's scenario lives in dev/probes/web/webui-loop-probe.mjs.
 *
 * Hard-won rules encoded here (break them and the probe lies or hangs):
 * 1. `--remote-debugging-port=0` + read the real port from DevToolsActivePort
 *    in the profile dir. A fixed port collides with an orphaned previous
 *    probe's Chrome, and the probe then silently inspects that zombie's stale
 *    page instead of the fresh one it launched.
 * 2. `--no-sandbox` and the GPU/crashpad disable flags: restricted
 *    environments (CI, agent sandboxes) cannot initialize Chrome's internal
 *    sandbox, and the GPU process dies with "GPU process isn't usable".
 * 3. A desktop `--window-size`: headless defaults to 800x600, and responsive
 *    UIs present completely different layouts on narrow frames — the probe
 *    would test a product no real user sits on.
 * 4. Never use --virtual-time-budget on a page with a live websocket: page
 *    events keep resetting virtual time and the dump never happens. Use a
 *    real-time budget and poll.
 * 5. Every CDP evaluate races a timeout: a dropped socket must fail the call,
 *    not hang the probe forever.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { mkTmpDir } from '../../env/tmp.mjs';

const CHROME_CANDIDATES = [
  process.env.DSH_PROBE_CHROME,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
].filter(Boolean);

export function findChromeBinary() {
  return CHROME_CANDIDATES.find(candidate => fs.existsSync(candidate));
}

/**
 * Launch a throwaway headless Chrome and attach to its page target.
 * @param {object} options
 * @param {string} options.url - the page to load (include any auth token).
 * @param {string} [options.chromeBin] - browser binary; auto-detected when absent.
 * @param {string} [options.windowSize] - `--window-size` value; default `1600,1000`.
 * @param {number} [options.bootTimeoutMs] - how long to wait for CDP + the page.
 * @returns {Promise<object>} handle: { evaluate, click, consoleProblems, exceptions, close }.
 */
export async function launchCdpBrowser({ url, chromeBin, windowSize = '1600,1000', bootTimeoutMs = 20000, evaluateTimeoutMs = 20000 } = {}) {
  const bin = chromeBin ?? findChromeBinary();
  if (bin === undefined) throw new Error('no Chrome/Edge binary found (set DSH_PROBE_CHROME)');
  const profileDir = mkTmpDir('chrome-profile', 'cdp-driver-');
  const chrome = spawn(bin, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-software-rasterizer',
    '--disable-dev-shm-usage',
    '--disable-crash-reporter',
    `--crash-dumps-dir=${profileDir}`,
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--remote-debugging-port=0',
    `--window-size=${windowSize}`,
    url,
  ], { stdio: 'ignore' });

  const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms) });
  const problems = [];
  const exceptions = [];

  // Port 0: the OS picks the debugging port and Chrome writes it here.
  let cdpPort = null;
  for (let i = 0; i < 40 && cdpPort === null; i++) {
    try {
      cdpPort = Number(fs.readFileSync(path.join(profileDir, 'DevToolsActivePort'), 'utf8').split('\n')[0]);
    } catch {}
    if (cdpPort === null) await sleep(250);
  }
  if (cdpPort === null) throw new Error('DevToolsActivePort never appeared');

  let target = undefined;
  for (let i = 0; i < 20 && target === undefined; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${cdpPort}/json/list`)).json();
      target = list.find(entry => entry.type === 'page' && entry.webSocketDebuggerUrl !== undefined);
    } catch {}
    if (target === undefined) await sleep(500);
  }
  if (target === undefined) throw new Error('no CDP page target appeared');

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = () => reject(new Error('CDP websocket failed')) });

  let seq = 0;
  const pending = new Map();
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id !== undefined && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
      return;
    }
    if (message.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(message.params.type)) {
      const text = message.params.args.map(arg => arg.value ?? arg.description ?? '').join(' ');
      problems.push(`console.${message.params.type}: ${text.slice(0, 300)}`);
    }
    if (message.method === 'Runtime.exceptionThrown') {
      const details = message.params.exceptionDetails;
      exceptions.push(`exception: ${(details.exception?.description ?? details.text).slice(0, 300)}`);
    }
  };
  const send = (method, params = {}) => new Promise((resolve) => {
    const id = ++seq;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
    // A dropped CDP socket must fail the call, not hang the probe forever. The budget is the
    // caller's: a heavy mount (a conversation's first render, a replay burst) can legitimately
    // need more than the 20s default on a loaded machine, and a probe that reds there blames the
    // code for the host (BUG-009, 2026-10-11: load 20-26 on 10 cores reproduced it on two
    // different code revisions).
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        resolve({ result: { exceptionDetails: { text: `CDP evaluate timed out after ${evaluateTimeoutMs}ms: ${method}` } } });
      }
    }, evaluateTimeoutMs);
  });

  await send('Runtime.enable');

  const evaluate = async (expression) => {
    const reply = await send('Runtime.evaluate', { expression, returnByValue: true });
    if (reply.result?.exceptionDetails !== undefined) {
      return { error: reply.result.exceptionDetails.exception?.description ?? reply.result.exceptionDetails.text };
    }
    return reply.result?.result?.value;
  };
  const click = async (selector) => evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (el === null) return 'no-element';
    el.click();
    return 'clicked';
  })()`);

  // Viewport emulation: the projection panel's narrow-pane layout is container-query driven,
  // so a real metrics override — not a CSS trick — is the honest resize.
  const setViewport = (width, height) => send('Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor: 1, mobile: false,
  });
  // Offline/online emulation for live Connection disconnect/recovery probes: the page's
  // fetch and event channel fail while offline and re-establish when back online.
  const setNetworkOffline = (offline) => send('Network.enable').then(() =>
    send('Network.emulateNetworkConditions', { offline, latency: 0, downloadThroughput: 0, uploadThroughput: 0 }));

  const handle = {
    evaluate,
    click,
    setViewport,
    captureScreenshot: async () => {
      await send('Page.enable');
      const reply = await send('Page.captureScreenshot', { format: 'png' });
      if (typeof reply.result?.data !== 'string') throw new Error('CDP screenshot failed');
      return Buffer.from(reply.result.data, 'base64');
    },
    setNetworkOffline,
    consoleProblems: problems,
    exceptions,
    profileDir,
    close: () => { chrome.kill() },
  };
  handle.settle = async () => {
    chrome.kill();
    // Chrome releases the throwaway profile asynchronously; a plain settle —
    // an unref'd timer would let node drain the loop before this resolves.
    await new Promise((resolve) => { setTimeout(resolve, 1200) });
    try { fs.rmSync(profileDir, { recursive: true, force: true, maxRetries: 3 }) } catch {}
  };
  void bootTimeoutMs;
  return handle;
}
