/**
 * Behavioural checks for the eval harness (`pnpm eval`).
 *
 * Every check is mechanical and reads only what the session log recorded, so a task's verdict can
 * be re-derived by someone else — that is the whole point of turning the first lap's hand-read
 * baseline into a regression. Three honest limits, stated rather than hidden:
 *   · `answer-matches` is a regex over the final answer: it can pass on a lucky phrasing and fail on
 *     a correct one worded differently. It is used only where the behaviour has a fixed vocabulary
 *     (the scope sentence, the retirement vocabulary).
 *   · Checks assert *absence* of harm (no write tools, no commit) rather than the quality of the
 *     reasoning. Quality stays a human read; the harness keeps the floor.
 *   · A task can pass by doing nothing useful. Every task therefore carries at least one positive
 *     check (a home tool was used, or the answer says the expected thing).
 *
 * @module dev/eval/checks
 */

import { readFileSync, statSync } from 'node:fs'
import { isAbsolute, join } from 'node:path'

const WRITE_TOOLS = new Set(['edit', 'write', 'multi_edit', 'patch', 'apply_patch', 'notebook_edit'])

/**
 * Did these tool calls really WRITE `path`? The desk loop's guarantee is a real rewrite: the panel
 * renders whatever the file says, so a session that *reports* a refresh without writing produces a
 * lying desk. Two real write shapes, both seen in live runs: the write/edit tools with the path in
 * their arguments, and bash driving `fs.writeFileSync` (a big JSON is easier through node). Bash
 * mentions of the path that are mere reads (`cat`, `2>/dev/null`) must not count, hence the
 * write-primitive requirement. Exotic write idioms would false-negative — widen this when a real run
 * shows one, not preemptively. Exported because `dev/reports/desk-loop-report.mjs` reads the same fact.
 * @param toolCalls - `{ name, argumentsText }` records from one session log.
 * @param path - the path that must have been written.
 * @returns true when at least one call wrote it.
 */
export function wrotePath(toolCalls, path) {
  const viaTools = toolCalls.some(call => WRITE_TOOLS.has(call.name) && call.argumentsText.includes(path))
  const viaBash = toolCalls.some(call =>
    call.name === 'bash' && call.argumentsText.includes(path)
    && /writeFileSync|writeFile\(|fs\.write|>\s*["']?[^"';|]*desk|tee\s|json\.dump|open\([^)]*['\"]w['\"]/.test(call.argumentsText))
  return viaTools || viaBash
}

/**
 * Read `path` and check it carries the desk contract's mandatory shape.
 *
 * Why (2026-09-27, `pnpm desk-loop` first real reading): panel messages name the `desk-refresh` skill and the
 * model rewrites the file, but in 13 of the 14 panel actions that asked for the skill it never LOADED it — it
 * improvised. (Denominator matters: only actions whose own text names the skill promise a rewrite.)
 * A file that parses but carries none of the contract then renders as a legitimately empty desk, so the
 * principal reads "nothing is happening". The browser half guards that at render time
 * (`looksLikeDesk` in the client); this guard is the development-time one, so the regression fails HERE
 * rather than in front of the principal. The two live apart because the client is a classic script with
 * no imports — the contract itself is owned by `presets/assistant/skills/desk-refresh/SKILL.md`.
 * @param path - the file to read (relative to the process CWD, which is the session workspace).
 * @param required - keys the parsed object must carry.
 * @param options - `{ anyOf?: string[], since?: number }`: `anyOf` needs at least one key present (a file
 *   with only `generatedAt` renders as an empty desk — the very case this guard exists for); `since`
 *   (epoch ms) rejects a file older than the run, so a leftover from an earlier run cannot go green.
 * @returns `{ ok, reason }`; `reason` is empty when ok.
 */
export function fileShape(path, required, options = {}) {
  let text
  try {
    text = readFileSync(path, 'utf8')
  } catch (reason) {
    return { ok: false, reason: `could not read "${path}" (${String(reason)})` }
  }
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, reason: `"${path}" is not JSON` }
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, reason: `"${path}" is not a JSON object` }
  }
  const missing = required.filter(key => parsed[key] === undefined)
  if (missing.length > 0) {
    return { ok: false, reason: `"${path}" lacks ${missing.join(', ')} — the desk contract's mandatory shape` }
  }
  const anyOf = Array.isArray(options.anyOf) ? options.anyOf : []
  if (anyOf.length > 0 && !anyOf.some(key => parsed[key] !== undefined)) {
    return { ok: false, reason: `"${path}" carries none of ${anyOf.join('/')} — a file with only the header renders as an empty desk` }
  }
  if (typeof options.since === 'number' && options.since > 0) {
    let modified = 0
    try {
      modified = statSync(path).mtimeMs
    } catch {
      return { ok: false, reason: `could not stat "${path}"` }
    }
    if (modified < options.since) {
      return { ok: false, reason: `"${path}" was last written ${Math.round((options.since - modified) / 1000)}s before this run — a stale file is not a rewrite` }
    }
  }
  return { ok: true, reason: '' }
}

/**
 * Evaluate one task against one session's observed behaviour.
 * @param task - `{ checks: Check[] }` (see `tasks.mjs`).
 * @param observed - `{ toolCalls, answerText }` read from the session log.
 * @returns `{ passed, reasons }`; `reasons` lists every failed check, empty when passed.
 */
export function evaluateTask(task, observed) {
  const reasons = []
  for (const check of task.checks) {
    switch (check.kind) {
      case 'no-write-tools': {
        const wrote = observed.toolCalls.filter(call => WRITE_TOOLS.has(call.name))
        if (wrote.length > 0) reasons.push(`used write tools (${wrote.map(call => call.name).join(', ')}) — the task is to report, not to edit`)
        break
      }
      case 'no-git-commit': {
        const committed = observed.toolCalls.filter(call => call.name === 'bash' && /git\s+commit/.test(call.argumentsText))
        if (committed.length > 0) reasons.push('ran `git commit` — sessions hand off uncommitted work')
        break
      }
      case 'used-home-tool': {
        const used = observed.toolCalls.filter(call => call.name.startsWith('assistant_'))
        if (used.length === 0) reasons.push('no home-room tool was used (expected the answer to come from its own memory/knowledge)')
        break
      }
      case 'wrote-path': {
        const wanted = String(check.path ?? '')
        if (!wrotePath(observed.toolCalls, wanted)) {
          reasons.push(`no write-tool call touched "${wanted}" — the loop's guarantee is a real rewrite, not a report`)
        }
        break
      }
      case 'file-shape': {
        // The session runs in its own throwaway workspace (BUG-003): a relative check path
        // belongs to that workspace, not to run.mjs's cwd.
        const raw = String(check.path ?? '')
        const target = observed.workspaceRoot !== undefined && !isAbsolute(raw)
          ? join(observed.workspaceRoot, raw)
          : raw
        const shape = fileShape(target, Array.isArray(check.required) ? check.required : [], {
          anyOf: Array.isArray(check.anyOf) ? check.anyOf : [],
          since: typeof observed.startedAt === 'number' ? observed.startedAt : 0,
        })
        if (!shape.ok) reasons.push(shape.reason)
        break
      }
      case 'skill-loaded': {
        // The strong, mechanical signal for P1: a messy business problem should make the session
        // reach for the breakdown skill BY NAME (its whenToUse), without being told to.
        const wanted = check.skill
        const loaded = observed.toolCalls.filter(call => call.name === 'skill' && call.argumentsText.includes(`"${wanted}"`))
        if (loaded.length === 0) reasons.push(`no skill call loaded "${wanted}" by name — the task expects its whenToUse to fire`)
        break
      }
      case 'answer-matches': {
        const pattern = new RegExp(check.pattern, 'iu')
        if (!pattern.test(observed.answerText)) reasons.push(`final answer does not match /${check.pattern}/`)
        break
      }
      default:
        reasons.push(`unknown check kind "${String(check.kind)}" — the harness refuses to guess`)
    }
  }
  return { passed: reasons.length === 0, reasons }
}

/**
 * Extract one tool call's argument text for pattern checks. The log stores parsed arguments for
 * some calls and a JSON string for others (verified in real logs), so both shapes are accepted.
 * @param raw - `data.arguments` from a `tool/call` event.
 */
export function argumentsText(raw) {
  if (typeof raw === 'string') return raw
  if (raw === null || typeof raw !== 'object') return ''
  try {
    return JSON.stringify(raw)
  } catch {
    return ''
  }
}
