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

const WRITE_TOOLS = new Set(['edit', 'write', 'multi_edit', 'patch', 'apply_patch', 'notebook_edit'])

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
        // The desk loop's guarantee is a real rewrite: the panel renders whatever the file says,
        // so a session that *reports* a refresh without writing the file produces a lying desk.
        // Two real write shapes, both seen in live runs: the write/edit tools with the path in
        // their arguments, and bash driving `fs.writeFileSync` (a big JSON is easier through
        // node). Bash mentions of the path that are mere reads (`cat`, `2>/dev/null`) must not
        // count, hence the write-primitive requirement. Exotic write idioms would false-negative
        // — widen this when a real run shows one, not preemptively.
        const wanted = String(check.path ?? '')
        const viaTools = observed.toolCalls.filter(call => WRITE_TOOLS.has(call.name) && call.argumentsText.includes(wanted))
        const viaBash = observed.toolCalls.filter(call =>
          call.name === 'bash' && call.argumentsText.includes(wanted)
          && /writeFileSync|writeFile\(|fs\.write|>\s*["']?[^"';|]*desk|tee\s/.test(call.argumentsText))
        if (viaTools.length === 0 && viaBash.length === 0) {
          reasons.push(`no write-tool call touched "${wanted}" — the loop's guarantee is a real rewrite, not a report`)
        }
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
