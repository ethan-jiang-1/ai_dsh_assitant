/**
 * The four desk→conversation seed texts — one per arm (process, process-resume, claim, wake) —
 * with the projection views they read. These are the principal-visible, logged opening notes of a
 * desk-launched session: the sender prefixes the `[面板]` marker, and each text states its arm's
 * contract (what to read first, what may not be assumed). Kept apart from `./desk-process` so the
 * bind/return judges and the wording they are delivered with are read separately.
 *
 * @module dsh-smart-assistant/client/desk-process-messages
 */

/** The matter fields the processing-session seed needs (structural view of a projection matter). */
export interface ProcessingContextMatter {
  readonly id: string
  readonly title: string
  readonly summary: string
  readonly times: { readonly promisedDeadline?: string; readonly nextCheckpoint?: string }
}

/**
 * The visible context note seeded into a fresh processing session (principal decision,
 * 2026-10-11: the matter IS the session's context). The sender prefixes the `[面板]` marker
 * so the log keeps machine-written prompts apart from the principal's own words.
 * @param matter - the bound matter from the projection snapshot.
 * @returns the seed message text, principal-visible and logged.
 */
export function processingContextMessage(matter: ProcessingContextMatter): string {
  const times = [
    matter.times.promisedDeadline !== undefined ? `承诺 ${matter.times.promisedDeadline}` : undefined,
    matter.times.nextCheckpoint !== undefined ? `核对 ${matter.times.nextCheckpoint}` : undefined,
  ].filter(part => part !== undefined).join('、')
  const head = `正在处理事项「${matter.title}」（${matter.id}）`
  return `${head}${times === '' ? '' : `：${times}`}。${matter.summary} 首次回应前先成功读取绑定事项：assistant_operating read ${matter.id}。读回失败时明确说明无法核实，不能写入或假装完整。成功后按六类交接：目的与委托原话、进展事实、已定决定及其依据、承诺/预测/核对/完成四种时间、业务未知或待裁决、已有下一步；无记录就说未知，建议须与已定下一步分开。材料里的预测不改变承诺，待确认提案不能说成已决定。随后等我具体指令；普通进展仍按既有规则留存，明确变更与推断提案遵循各自权限。`
}

/**
 * The resume seed for a bound processing session the principal re-entered from the desk
 * (Q11, confirmed 2026-10-12: a desk 处理 click on an already-bound matter is an explicit
 * continuation intent — new-session and reused-session bindings carry the same contract).
 *
 * Unlike the fresh seed this carries NO cached facts: the session's own history may be stale
 * or compacted away, so the resume contract points at the authoritative ledger and forbids
 * answering from the conversation's memory of the matter. The title is sourced from the
 * projection read (displayContext stays visual-only); the id alone is enough when the
 * projection cannot supply one.
 * @param matter - `{ id, title? }` from the projection snapshot.
 * @returns the seed message text, principal-visible and logged.
 */
export function resumeContextMessage(matter: { readonly id: string; readonly title?: string }): string {
  const head = matter.title !== undefined && matter.title !== '' ? `继续处理事项「${matter.title}」（${matter.id}）` : `继续处理这件事（${matter.id}）`
  return `${head}。回到这件事时先成功读取最新台账：assistant_operating read ${matter.id}——不要凭这段对话里的旧印象作答。读回失败时明确说明无法核实，不能写入或假装完整。读回成功后按六类交接现状：目的与委托原话、进展事实、已定决定及其依据、承诺/预测/核对/完成四种时间、业务未知或待裁决、下一步或等待条件；无记录就说未知，建议须与已定下一步分开，待确认提案不能说成已定。随后等我具体指令。`
}

/** The unclaimed-fragment fields the claim-session seed needs (structural projection view). */
export interface ClaimContextFragment {
  readonly id: string
  readonly note: string
  readonly sessionId: string
}

/**
 * The visible context note seeded into a claim session (principal direction, 2026-10-12: the
 * fragment IS the session's context). The decision the desk cannot make — which matter this is,
 * or that it is a new one — is the conversation's whole point; the seed names the fragment,
 * states the no-guess rule, and points at the tool path. Like the matter seed, the sender
 * prefixes the `[面板]` marker so the log keeps machine-written prompts apart from the
 * principal's own words.
 * @param fragment - the bound fragment from the projection snapshot.
 * @returns the seed message text, principal-visible and logged.
 */
export function claimContextMessage(fragment: ClaimContextFragment): string {
  return `正在处理待认领片段（unclaimed ${fragment.id}，来自 ${fragment.sessionId}）：「${fragment.note}」。这条信息还没归户——请先与我确认它属于哪件在办事项、还是应当立为新事项；等我明确答复后，再用 assistant_operating claim（带 unclaimed_id ${fragment.id}）或 entrust 落账，并保留原文与来源。未经我确认不要自行归户。`
}

/**
 * The visible context note seeded into a discard session (desk-side capture, 2026-10-18: the
 * fragment's terminal state needs a door). The principal judged this fragment noise by pressing the desk's
 * 「是噪音，不归户」, so the seed states the judgment and asks only for the one-line reason the
 * ledger requires — discard removes the fragment from the lane, so it must not happen on a guess.
 * Same `[面板]` marker as the other seeds: machine-written prompts stay apart from the
 * principal's own words.
 * @param fragment - the bound fragment from the projection snapshot.
 * @returns the seed message text, principal-visible and logged.
 */
export function discardContextMessage(fragment: ClaimContextFragment): string {
  return `正在处理待认领片段（unclaimed ${fragment.id}，来自 ${fragment.sessionId}）：「${fragment.note}」。我判它是噪音、不归户——**先问我一句为什么**（一行就够），再把我的原话当作 reason，用 assistant_operating discard（带 unclaimed_id ${fragment.id}）落账：这条会离开待认领通道，理由留在账本，片段原话仍留在当初的记录里。若我改口说它其实属于某件事，改走 claim 或 entrust。未经我确认不要 discard，也不要替我想理由。`
}

/** The settled-matter fields the wake-session seed needs (structural projection view). */
export interface WakeContextMatter {
  readonly id: string
  readonly title: string
  readonly status: 'completed' | 'abandoned'
  readonly summary: string
}

/**
 * The visible context note seeded into a wake session (principal direction, 2026-10-12: waking
 * always has a cause — something changed). The seed names the settled matter, states the
 * cause-first rule (the reason becomes a ledger material), and points at the reopen tool path.
 * Like the other seeds, the sender prefixes the `[面板]` marker so the log keeps machine-written
 * prompts apart from the principal's own words.
 * @param matter - the bound matter from the projection snapshot.
 * @returns the seed message text, principal-visible and logged.
 */
export function wakeContextMessage(matter: WakeContextMatter): string {
  const stateLabel = matter.status === 'completed' ? '已完成' : '已放弃'
  return `正在唤醒一件${stateLabel}的事项「${matter.title}」（${matter.id}）。重新打开它需要一个理由——请先与我确认是什么变化需要唤醒它（比如出现了新的情况、之前的了结有误）；等我明确答复后，先用 assistant_operating read ${matter.id} 核对台账，再用 assistant_operating reopen（带上变化原因）落账，原因会作为材料入账。未经我确认不要自行 reopen。`
}
