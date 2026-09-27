#!/usr/bin/env node
/**
 * `pnpm desk-loop` —— 从**真实会话日志**里读培养循环的健康度（摩擦在这里长什么样）。
 *
 * 为什么存在：本产品的"摩擦"多数是**循环**事实——本人点一行 → 面板发一条带 `[桌面] ` 标记的消息 →
 * 助手应当重写 `.desk/state.json` → 面板跟着变。这条链断在哪，本人的体验就是"它没理我"，于是他
 * **再点一次**。这段读法如果留给未来的会话临场发明，摩擦就永远只能靠碰巧被发现；本工具把读法钉下来，
 * 好让发现直接变成切片。
 *
 * 读什么（全部来自会话日志，不读 stdout，也不读面板内部状态）：
 *   · `user/message` 的 content 文本块 —— 面板自己的消息带 `[桌面] ` 标记（A10），本人的话没有；
 *   · `tool/call` 的 name/arguments —— 桌面写入（谓词与评测器共用：[`wrotePath`](eval/checks.mjs)）
 *     与技能加载（`skill` 工具点名 `desk-refresh`）。
 *
 * 不做什么：不判定质量、不做语义分类。"本人的话是不是在抱怨"这类判断留给人读（§5 只把材料摆出来）。
 *
 * 证伪（负例控制）：读数工具自己也会读错——首次实跑就抓到两个（注入前言被当成"本人的话"而切断窗口、
 * 会话 id 回退成路径）。所以分析部分与 IO 分离，`--self-check` 拿**合成会话**跑一遍已知答案，并进
 * `pnpm verify`（与评测器的 `--self-check` 同一约定）：改坏读数逻辑，门禁先红。
 *
 * 用法：
 *   pnpm desk-loop                # dev home 里的全部会话
 *   pnpm desk-loop -- --since 7   # 只看最近 7 天动过的会话
 *   pnpm desk-loop -- --all       # 连评测会话一起算（默认把它们单列，不混进"本人"的账）
 *   pnpm desk-loop -- --self-check
 *
 * @module dev/desk-loop-report
 */
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readEvents, sessionLogs } from './usage-report.mjs'
import { argumentsText, wrotePath } from './eval/checks.mjs'
import { TASKS } from './eval/tasks.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
// 与 scripts/dsh.mjs 同一条硬规则：永不继承 DSH_HOME（见 dev/usage-report.mjs 的同名说明）
const harnessHome = resolve(process.env.ASSISTANT_DSH_HOME ?? join(repoRoot, 'dev', 'harness-home'))

const PANEL_MARKER = '[桌面] '
const SKILL = 'desk-refresh'
const DESK_PATH = '.desk/state.json'
const REPEAT_WINDOW_MS = 15 * 60 * 1000
/** 家的四房间工具（`assistant_memory` / `assistant_knowledge` / `assistant_research` / `assistant_reflect`）。 */
const HOME_TOOLS = new Set(['assistant_memory', 'assistant_knowledge', 'assistant_research', 'assistant_reflect'])
const REACTION_WINDOW_MS = 10 * 60 * 1000

/** 评测会话的题面（用来把它们从"本人"的账里分出去：消息层与真人不可区分，题面可以）。 */
const TASK_PROMPTS = TASKS.map(task => task.prompt)

/**
 * 面板消息 → 动作名。模板的 owner 是 `client/index.ts` 的各 sender，这里只认**签名**（不复制文案全文）。
 * 为什么用 `includes` 而不是前缀：一个会话的**第一条**面板消息前面会粘上协作边界前言，前缀判定会把它
 * 落成"其他"（2026-09-27 实测：按前缀只有 7 条面板动作，按结构有 23 条）。
 * @param text - 面板消息正文。
 * @returns 动作名。
 */
function actionOf(text) {
  if (text.includes('刷新我的桌面')) return '刷新桌面'
  if (text.includes('请给我两三个选项')) return '看选项'
  if (text.includes('——我的决定是：')) return '回答'
  if (text.includes('」已经办完了')) return '办完了'
  if (text.includes('」不办了')) return '不办了'
  if (text.includes('」要改：')) return '改这条'
  if (text.includes('缺口的原始读数')) return '补上'
  if (text.includes('关于线索「')) return '问进展'
  return '其他'
}

/**
 * 行身份：面板模板把行放进『「…」』，取第一个。**没有「…」时不能退回动作名**——那会把所有同类消息
 * 塌成同一个身份，于是"两条无关的消息"被读成"同一行被点了两次"（2026-09-27 实测：22 组重复里有一批是
 * 这么来的假阳性）。没有行名就用正文本身（截断）当身份：只有**真的同一条消息**才会撞上。
 * @param text - 面板消息正文。
 * @param action - 动作名。
 * @returns 行身份。
 */
function rowKeyOf(text, action) {
  const open = text.indexOf('「')
  const close = open < 0 ? -1 : text.indexOf('」', open)
  if (close > open) return text.slice(open + 1, close)
  const body = text.replace(/\s+/g, ' ').trim()
  return body === '' ? action : `${action}｜${body.slice(0, 60)}`
}

/** 一条 user/message 的纯文本（多个块拼起来）。 */
function textOf(event) {
  const blocks = event.data?.content
  if (!Array.isArray(blocks)) return ''
  return blocks.flatMap(block => block?.type === 'text' && typeof block.text === 'string' ? [block.text] : []).join('\n')
}

/**
 * 这条 user/message 是"人（或面板）说的"还是**注入的前言**？——按日志的**结构**判定，不猜文本。
 *
 * 为什么必须分开（2026-09-27 实测）：preset 会话每一轮前会注入若干消息（AGENTS.md 指令、运行时上下文、
 * 技能目录……），它们以 user/message 落盘、**夹在面板动作与那一轮工具调用之间**。把它们当"人说的"，
 * 既污染 §5，又切断窗口，让 §4 读出假的 86%。文本启发式（`<`/`[` 开头）随后又漏掉了**纯文本形态**的
 * 注入（`Current runtime context. …`）——所以改用 `data.source`：它是序列化 JSON，带 `kind`。
 *   · `kind: 'user'` 且 `rpcId` 形如 `desk-…` ⇒ **面板消息**（面板经 RPC 发的那条）；
 *   · `kind: 'user'` 其余 ⇒ **本人的话**（首轮里可能粘着协作边界前言，仍算他说的一轮）；
 *   · 其它 kind（`agent-instructions` / `runtime-context` / `skill-catalog` …）⇒ **注入前言**。
 * @param event - 一条 user/message 事件。
 * @returns `'panel' | 'injected' | 'human'`。
 */
function speakerOf(event) {
  const raw = event.data?.source
  let source = raw
  if (typeof raw === 'string') {
    try {
      source = JSON.parse(raw)
    } catch {
      source = undefined
    }
  }
  const kind = String(source?.kind ?? '')
  if (kind !== 'user') return 'injected'
  return typeof source?.rpcId === 'string' && source.rpcId.startsWith('desk-') ? 'panel' : 'human'
}

/**
 * 剥掉粘在**首轮**前面的协作边界前言。
 *
 * 前言是 harness 注入的，落盘时挂在第一条 user/message 的正文前面（`source.kind` 仍是 `'user'`，
 * 所以结构判定分不出来——这是第四个被真机抓出来的读数缺陷，2026-09-27）：它会整段冒充"本人的话"
 * （§5/§6 里出现一串 `[Collaboration boundary] You may change the working tree…`），也会把面板消息的
 * `[桌面] ` 前缀顶掉。剥法是机械的：以该标记开头 ⇒ 丢掉第一个空行（含）之前的部分；剩下的才是他说的话。
 * @param text - 消息纯文本。
 * @returns 剥掉前言后的正文（可能为空＝这一轮没有人的内容）。
 */
function stripPreamble(text) {
  const marker = '[Collaboration boundary]'
  const trimmed = text.trimStart()
  if (!trimmed.startsWith(marker)) return text
  const rest = trimmed.slice(marker.length)
  const blank = rest.indexOf('\n\n')
  return blank < 0 ? '' : rest.slice(blank + 2)
}

/**
 * 把一个会话切成"反应窗"：每条用户消息之后、下一条用户消息之前的工具调用。
 * @param events - 一个会话的事件序列（seq 序）。
 * @returns `{ message, at, tools }` 列表。
 */
function reactionWindows(events) {
  const windows = []
  let current
  for (const event of events) {
    if (event.type === 'user/message') {
      const speaker = speakerOf(event)
      // 注入的前言既不算一条消息、也不切断窗口：它夹在面板动作与那一轮工具调用之间。
      if (speaker === 'injected') continue
      const message = stripPreamble(textOf(event))
      // 首轮可能**只剩前言**：那一轮没有人的内容，同样不算一条消息、也不切断窗口。
      if (message.trim() === '') continue
      if (current !== undefined) windows.push(current)
      current = { message, at: Number(event.time ?? 0), panel: speaker === 'panel', tools: [] }
      continue
    }
    if (event.type === 'tool/call' && current !== undefined) {
      current.tools.push({ name: String(event.data?.name ?? ''), argumentsText: argumentsText(event.data?.arguments) })
    }
  }
  if (current !== undefined) windows.push(current)
  return windows
}

/**
 * 会话身份从**日志目录名**取（`session-<uuid>`）：事件里的 data.sessionId 并不总在，回退到日志路径会印出
 * "/Users/b" 这种废值（2026-09-27 实测）。
 * @param log - 会话日志路径。
 * @returns 短 id。
 */
function sessionIdOf(log) {
  return (/(?:^|\/)session-([0-9a-f-]+)(?:\/|$)/.exec(log)?.[1] ?? 'unknown').slice(0, 8)
}

/**
 * 一个会话的关键事实（与 IO 无关，`--self-check` 直接喂合成事件）。
 * @param log - 日志路径（用来取 id 与判定评测会话）。
 * @param events - 事件序列。
 * @returns 会话对象，或在没有可用窗口时返回 undefined。
 */
export function buildSession(log, events) {
  if (events.length === 0) return undefined
  const windows = reactionWindows(events).filter(window => window.message.trim() !== '')
  if (windows.length === 0) return undefined
  return {
    id: sessionIdOf(log),
    startedAt: Number(events[0]?.time ?? windows[0].at),
    // 评测会话判定：题面命中**且整个会话只有那一条消息**。desk-refresh 那条评测的题面**就是**面板的刷新
    // 文案，只看题面会把"真人以刷新开场"的会话误判成评测（自检抓到的第一版缺陷）；"≤2 条"也不够——
    // 一次刷新加一句"好的"就是两条。评测是 headless one-shot：题面进去、答案出来，会话就结束。
    evalRun: windows.length === 1 && TASK_PROMPTS.includes(windows[0].message.trim()),
    windows,
  }
}

/**
 * 分析一组会话。**纯函数**（无 IO），因此可以拿合成会话证伪。
 * @param sessions - `buildSession` 的结果（去掉 undefined）。
 * @param options - `{ includeEval }`。
 * @returns 五节发现与人/eval 的计数。
 */
export function analyzeSessions(sessions, { includeEval = false } = {}) {
  const human = sessions.filter(session => !session.evalRun)
  const evalRuns = sessions.filter(session => session.evalRun)
  const considered = includeEval ? sessions : human

  const noWrite = []
  const noSkill = []
  const repeats = []
  const doubleAnswers = []
  const reactions = []
  const unconsulted = []
  let panelActions = 0
  let refreshAsks = 0
  let humanTurns = 0

  for (const session of considered) {
    // §6 的口径：**只看真有面板动作的会话**——那才是"在用这个产品"的人。dev home 里同时住着我自己的
    // 探针与评测会话（"Reply with exactly one word: ready" 之类），把它们算进"助手没问自己的房间"
    // 是把噪声当信号（2026-09-27 实测：143 轮里 55 轮"没查"，其中大半是探针）。
    const sessionUsesPanel = session.windows.some(window => window.panel === true)
    const actions = []
    for (const window of session.windows) {
      if (window.panel !== true) {
        // 本人的话：如果前面 10 分钟内有面板动作，把它作为"反应"摆出来（人工读，不判定）
        const previous = actions[actions.length - 1]
        if (previous !== undefined && window.at - previous.at <= REACTION_WINDOW_MS) {
          reactions.push({ session: session.id, at: window.at, action: previous, said: window.message.trim().slice(0, 160) })
        }
        // §6：这一轮他说话了，助手有没有问过自己的房间（家的四工具）？产品的核心承诺是"记得住、
        // 用得上"；一轮里一个房间工具都没用，是"没查"的机械信号（不判定对错——有时确实不需要）。
        if (sessionUsesPanel) humanTurns += 1
        if (sessionUsesPanel && !window.tools.some(call => HOME_TOOLS.has(call.name))) {
          unconsulted.push({ session: session.id, at: window.at, said: window.message.replace(/\s+/g, ' ').trim().slice(0, 120) })
        }
        continue
      }
      panelActions += 1
      const body = window.message.startsWith(PANEL_MARKER)
        ? window.message.slice(PANEL_MARKER.length)
        : window.message
      const action = {
        session: session.id, at: window.at, action: actionOf(body),
        rowKey: rowKeyOf(body, actionOf(body)), asksRefresh: body.includes(SKILL),
      }
      actions.push(action)
      // §1 只在**承诺了重写**的动作上算：`回顾一下` / `curate` 这类按钮的消息里没有那句承诺，
      // 把它们的窗口也算作"没重写"是冤枉（2026-09-27 实测修正）。
      if (action.asksRefresh) refreshAsks += 1
      if (action.asksRefresh && !wrotePath(window.tools, DESK_PATH)) noWrite.push(action)
      if (action.asksRefresh && !window.tools.some(call => call.name === 'skill' && call.argumentsText.includes(SKILL))) {
        noSkill.push(action)
      }
    }

    // 同一行在 15 分钟内的连续动作算**一簇**（成对展开会把"点了 4 次"读成 6 组，夸大摩擦）。
    // 两节可以同时命中且**都该报**：一簇 4 次里答了 3 次，既是"被反复动"也是"决定被答多次"
    // （2026-09-27 实测：整簇都是回答才进 §3 的写法把这一簇的 3 次回答藏掉了）。
    const clusters = []
    const byRow = new Map()
    for (const action of actions) {
      const cluster = byRow.get(action.rowKey) ?? []
      const previous = cluster[cluster.length - 1]
      if (previous !== undefined && action.at - previous.at > REPEAT_WINDOW_MS) {
        if (cluster.length > 1) clusters.push(cluster)
        byRow.set(action.rowKey, [action])
        continue
      }
      cluster.push(action)
      byRow.set(action.rowKey, cluster)
    }
    for (const cluster of byRow.values()) if (cluster.length > 1) clusters.push(cluster)
    for (const cluster of clusters) {
      repeats.push(cluster)
      if (cluster.filter(item => item.action === '回答').length > 1) doubleAnswers.push(cluster)
    }
  }

  return { human, evalRuns, considered, panelActions, refreshAsks, noWrite, noSkill, repeats, doubleAnswers, reactions, humanTurns, unconsulted }
}

/** 报告正文（给人读的 markdown）。 */
export function renderReport(analysis, { home, sinceDays, includeEval } = {}) {
  const { human, evalRuns, considered, panelActions, refreshAsks, noWrite, noSkill, repeats, doubleAnswers, reactions, humanTurns, unconsulted } = analysis
  // 分母跟着分子走：§1/§4 只统计**点名了 desk-refresh** 的动作（没点名的那次点击本来就没承诺重写桌面），
  // 所以百分比也按同一个分母算——此前印的是「n/全部面板动作」，把 1/14 与 13/14 说成了 1/23 与 13/23
  // （窄审抓到，2026-09-27：口径混用的读数比没有读数更坏）。
  const pct = (count) => refreshAsks === 0 ? '—' : `${Math.round(count / refreshAsks * 100)}%`
  const when = (at) => new Date(at).toISOString().replace('T', ' ').slice(0, 16)
  const lines = []
  lines.push(`# 培养循环摩擦报告 — ${home}`)
  lines.push('')
  lines.push(`会话 ${considered.length}（本人 ${human.length} · 评测 ${evalRuns.length}${includeEval ? '，已含' : '，默认不计'}）`
    + `｜面板动作 ${panelActions}（其中点名 desk-refresh 的 ${refreshAsks}）${sinceDays === undefined ? '' : `｜窗口：最近 ${sinceDays} 天`}`)
  lines.push('')
  lines.push(`## 1. 点名了 desk-refresh 的面板动作里，桌面文件没有被重写（循环的硬保证）— ${noWrite.length}/${refreshAsks}（${pct(noWrite.length)}）`)
  lines.push('')
  lines.push('这一类的体验就是"它没理我"：本人点了、消息发了、文件没动，面板自然也不变。')
  lines.push('')
  for (const item of noWrite.slice(0, 20)) lines.push(`- ${when(item.at)} · 会话 ${item.session} · ${item.action} · 「${item.rowKey.slice(0, 60)}」`)
  if (noWrite.length === 0) lines.push('- （无）')
  lines.push('')
  lines.push(`## 2. 同一行被反复动（同一行 15 分钟内 ≥2 次）— ${repeats.length} 处`)
  lines.push('')
  for (const cluster of repeats.slice(0, 20)) {
    const first = cluster[0]
    const last = cluster[cluster.length - 1]
    lines.push(`- ${when(first.at)} → ${when(last.at)} · 会话 ${first.session} · **${cluster.length} 次**（${cluster.map(item => item.action).join('/')}）`
      + ` · 「${first.rowKey.slice(0, 60)}」`)
  }
  if (repeats.length === 0) lines.push('- （无）')
  lines.push('')
  lines.push(`## 3. 同一个决定被答了多次 — ${doubleAnswers.length} 处`)
  lines.push('')
  for (const cluster of doubleAnswers.slice(0, 20)) {
    const answers = cluster.filter(item => item.action === '回答').length
    lines.push(`- ${when(cluster[0].at)} → ${when(cluster[cluster.length - 1].at)} · 会话 ${cluster[0].session}`
      + ` · **答了 ${answers} 次**（共动 ${cluster.length} 次） · 「${cluster[0].rowKey.slice(0, 60)}」`)
  }
  if (doubleAnswers.length === 0) lines.push('- （无）')
  lines.push('')
  lines.push(`## 4. 面板消息点名了 desk-refresh，那一轮却没加载它 — ${noSkill.length}/${refreshAsks}（${pct(noSkill.length)}）`)
  lines.push('')
  lines.push('面板的提示语写死了"完成后加载 desk-refresh 技能"；没加载却动了桌面，就是冷发现不可靠的那一类。')
  lines.push('')
  for (const item of noSkill.slice(0, 20)) lines.push(`- ${when(item.at)} · 会话 ${item.session} · ${item.action} · 「${item.rowKey.slice(0, 60)}」`)
  if (noSkill.length === 0) lines.push('- （无）')
  lines.push('')
  lines.push(`## 5. 面板动作之后 10 分钟内本人的话（人工读，不判定）— ${reactions.length} 条`)
  lines.push('')
  for (const item of reactions.slice(0, 25)) {
    lines.push(`- ${when(item.at)} · 会话 ${item.session}`)
    lines.push(`  - 面板：${item.action.action}「${item.action.rowKey.slice(0, 60)}」`)
    lines.push(`  - 本人：${item.said}`)
  }
  if (reactions.length === 0) lines.push('- （无）')
  lines.push('')
  lines.push(`## 6. 真人在用面板的会话里，他**打字**的那几轮有没有问过自己的房间 — ${unconsulted.length}/${humanTurns}（${humanTurns === 0 ? '—' : `${Math.round(unconsulted.length / humanTurns * 100)}%`}）`)
  lines.push('')
  lines.push('口径：**只数有面板动作的会话**（真在用这个产品的人）；家的四房间工具（memory / knowledge / research / '
    + 'reflect）一个都没用的回合。**这是"没查"的机械信号，不是判负**：有些回合确实不需要查（"你好"、纯写作、'
    + '接着上一句往下走）。列出来是为了让人看几眼，判断"它是不是在忽略自己的记忆"——那才是产品承诺的核心。')
  lines.push('')
  for (const item of unconsulted.slice(0, 25)) {
    lines.push(`- ${when(item.at)} · 会话 ${item.session} · 本人：${item.said}`)
  }
  if (unconsulted.length === 0) lines.push('- （无）')
  lines.push('')
  lines.push('## 限制（先说清，免得把数字当结论）')
  lines.push('')
  lines.push('- 分类读日志的**结构**：`source.kind === "user"` 且 `rpcId` 形如 `desk-…` ＝ 面板消息；'
    + '`kind === "user"` 其余 ＝ 本人的话；其它 kind（agent-instructions / runtime-context / skill-catalog…）＝ 注入前言（不进窗口、不切断窗口）。')
  lines.push('- 评测会话按"题面命中 **且** 整个会话只有那一条消息"识别（评测是 headless one-shot）；'
    + '`desk-refresh` 那条评测的题面就是面板的刷新文案，所以"只有一次点击、之后一个字没说"的真人会话会被算成评测'
    + '（用 `--all` 仍能看它的数据）。')
  lines.push('- §1/§4 只认"同一窗口内的工具调用"；跨窗口的补救（例如下一轮才写文件）不算数——那是另一种问题（延迟），不是这一节要量的。')
  lines.push('')
  lines.push('## 怎么读')
  lines.push('')
  lines.push('- §1 有量 ⇒ 循环在"写文件"这一步真的丢过东西：先看是不是模型侧不遵守（对照 §4），是则考虑机械兜底；')
  lines.push('  单条则看那一轮它到底干了什么（会话 id 可以直接 rg）。')
  lines.push('- §2 有量 ⇒ 行上的按钮要么在骗人（点了没反应），要么反馈太慢（本人等不及）——两轮整改已修掉几个已知源，')
  lines.push('  剩下的按同一把尺子变成切片。')
  lines.push('- §3 有量 ⇒ 决定没被接住（回答落盘失败或行没撤），这是信任问题，优先于任何新功能。')
  lines.push('- 读到的摩擦**先与修复对齐**：一条摩擦的时间若早于相关修复的提交，它已经闭环（例：`2109ae56` 的'
    + '"三答一问"早于 S7，是那一片的输入）。')
  lines.push('- §5/§6 是唯一需要人眼的两段：本人那句话是不是新的别扭（§5）、它是不是在忽略自己的记忆（§6），'
    + '决定要不要立新切片。')
  return lines.join('\n') + '\n'
}

// ── 证伪：合成会话 → 已知答案 ────────────────────────────────────────────────────────────────
const MINUTE = 60 * 1000
const T0 = Date.UTC(2026, 8, 27, 10, 0, 0)

/**
 * 造一条 user/message。`source` 是**结构**（真实日志里就是序列化 JSON）：`rpcId` 形如 `desk-…` ⇒ 面板消息；
 * 其它 kind ⇒ 注入前言。
 * @param at - 时间戳。
 * @param text - 正文。
 * @param source - `{ kind, rpcId? }`。
 */
function userMessage(at, text, source = { kind: 'user' }) {
  return { type: 'user/message', time: at, data: { content: [{ type: 'text', text }], source: JSON.stringify(source) } }
}
/** 造一条 tool/call。 */
function toolCall(at, name, args) {
  return { type: 'tool/call', time: at, data: { name, arguments: JSON.stringify(args) } }
}

/**
 * 拿合成会话验证读数逻辑本身（CI 意义上的负例控制）。**每一条断言都对应一个真发生过的读数缺陷**
 * 或一个契约要求：注入前言切断窗口（假的 86%）、纯文本注入被当成本人的话、混合重复被漏掉、
 * 会话 id 回退成路径、题面撞车把真人会话算成评测。
 * @returns 出错时抛，正常时返回一句人话。
 */
export function selfCheck() {
  const logA = '/tmp/home/sessions/--proj--/session-aaaaaaaa-1111-2222-3333-444444444444/session.v4.jsonl.zstd'
  const logB = '/tmp/home/sessions/--proj--/session-bbbbbbbb-1111-2222-3333-444444444444/session.v4.jsonl.zstd'
  const logC = '/tmp/home/sessions/--proj--/session-cccccccc-1111-2222-3333-444444444444/session.v4.jsonl.zstd'
  const desk = { kind: 'user', rpcId: 'desk-1-abc' }

  const sessionA = buildSession(logA, [
    // 首轮带着协作边界前言：面板标记必须仍被认出，而且它不算"人说的话"
    userMessage(T0, '[Collaboration boundary] You may change the working tree, but you do not commit — '
      + `commit authority belongs to the person.\n\n${PANEL_MARKER}刷新我的桌面：加载 desk-refresh 技能，严格按它把桌面文件重写一遍。`, desk),
    // 两种注入形态都夹在面板动作与工具调用之间：`<…>` 与**纯文本**（后者曾骗过启发式）——都不得切断窗口
    userMessage(T0 + 1000, '<system-reminder>\nA skill is a reusable set of task-specific instructions.', { kind: 'skill-catalog' }),
    userMessage(T0 + 1500, 'Current runtime context. This snapshot supersedes earlier runtime-context snapshots.', { kind: 'runtime-context' }),
    toolCall(T0 + 2000, 'skill', { name: 'desk-refresh' }),
    toolCall(T0 + 3000, 'write', { file_path: '/ws/.desk/state.json', content: '{}' }),
    userMessage(T0 + 4 * MINUTE, '好的'),
    // 只有前言、没有人话的一轮：不得进 §5/§6
    userMessage(T0 + 6 * MINUTE, '[Collaboration boundary] You may change the working tree, but you do not commit — commit authority belongs to the person.'),
  ])

  const answer = `${PANEL_MARKER}关于这个待决事项：「季末破例？」——我的决定是：不允许。完成后加载 desk-refresh 技能，把桌面文件重写一遍。`
  const sessionB = buildSession(logB, [
    userMessage(T0, answer, desk),
    toolCall(T0 + 1000, 'read', { file_path: '/home/assistant/knowledge/x.md' }),   // 既没写文件也没加载技能
    userMessage(T0 + 3 * MINUTE, answer, desk),                                     // 同一条决定再答一次
    toolCall(T0 + 3 * MINUTE + 1000, 'read', { file_path: '/home/assistant/knowledge/x.md' }),
    userMessage(T0 + 5 * MINUTE, `${PANEL_MARKER}行动「守住纪律」要改：改成只压流程。完成后加载 desk-refresh 技能，把桌面文件重写一遍。`, desk),
    toolCall(T0 + 5 * MINUTE + 1000, 'write', { file_path: '/ws/.desk/state.json', content: '{}' }),
    toolCall(T0 + 5 * MINUTE + 2000, 'skill', { name: 'desk-refresh' }),
  ])

  // 评测会话：题面命中 tasks.mjs，且是 one-shot 形状（只有那条题面）
  const sessionC = buildSession(logC, [userMessage(T0, TASK_PROMPTS[0] ?? 'eval task')])
  const sessions = [sessionA, sessionB, sessionC]
  if (sessions.some(session => session === undefined)) throw new Error('a synthetic session produced no windows')

  const humanOnly = analyzeSessions(sessions)
  const withEval = analyzeSessions(sessions, { includeEval: true })
  const expect = (label, actual, wanted) => {
    if (actual !== wanted) throw new Error(`${label}: got ${actual}, want ${wanted}`)
  }

  expect('sessions (human)', humanOnly.considered.length, 2)
  expect('sessions (eval)', humanOnly.evalRuns.length, 1)
  expect('sessions (--all)', withEval.considered.length, 3)
  expect('session id from the log path', sessionA.id, 'aaaaaaaa')
  // §1：A 写了（两种注入前言都没切断窗口）；B 的两条"回答"都没写（第二条又答了一次，仍然没落盘）
  expect('no-write count', humanOnly.noWrite.length, 2)
  expect('no-write rows are the answers', humanOnly.noWrite.every(item => item.action === '回答'), true)
  // §4：那两条问了技能却没加载；A 的刷新加载了；B 的"要改"也加载了
  expect('no-skill count', humanOnly.noSkill.length, 2)
  // 分母口径：只有**点名了 desk-refresh** 的动作进这个分母（合成会话：A 的刷新 1 条 + B 的两条回答与一条
  // "要改" 3 条 ＝ 4），它必须与"全部面板动作"分开数——混用会把 1/4 说成 1/4 之外的数（真机上是 1/14 vs 1/23）。
  expect('refresh-ask denominator', humanOnly.refreshAsks, 4)
  expect('panel actions counted separately', humanOnly.panelActions, 4)
  // §3：同一条决定答两次
  expect('double answers', humanOnly.doubleAnswers.length, 1)
  // §2：B 的两条"回答"落在同一行 ⇒ 一处"被反复动"；§3 同一簇里答了两次 ⇒ 也算"被答多次"
  expect('repeats', humanOnly.repeats.length, 1)
  expect('a cluster can be both sections', humanOnly.doubleAnswers.length, 1)
  // §5：A 之后本人说了"好的"；注入的 runtime-context 不得被当成本人的话
  expect('reactions', humanOnly.reactions.length, 1)
  expect('reaction text', humanOnly.reactions[0].said, '好的')
  // 前言不得冒充本人的话：只有前言的轮既不算人说话，也不进 §5/§6
  expect('preamble-only turns are not human turns', humanOnly.humanTurns, 1)

  // §6：本人的回合里有没有问过自己的房间。B 会话里没有人说话；A 里"好的"那一轮没有房间工具 ⇒ 1 条；
  // 再造一轮带 assistant_memory 的，必须**不算**没查。
  expect('human turns counted', humanOnly.humanTurns, 1)
  expect('unconsulted human turns', humanOnly.unconsulted.length, 1)
  expect('unconsulted is the human turn', humanOnly.unconsulted[0].said, '好的')
  // 会话里有面板动作 ⇒ 进 §6 口径；本人的那一轮查了记忆 ⇒ 不算"没查"
  const consulted = analyzeSessions([buildSession(logB, [
    userMessage(T0, `${PANEL_MARKER}刷新我的桌面：加载 desk-refresh 技能，严格按它把桌面文件重写一遍。`, desk),
    toolCall(T0 + 500, 'skill', { name: 'desk-refresh' }),
    toolCall(T0 + 800, 'write', { file_path: '/ws/.desk/state.json', content: '{}' }),
    userMessage(T0 + 2 * MINUTE, '上次那个季末破例，我们最后怎么定的？'),
    toolCall(T0 + 2 * MINUTE + 1000, 'assistant_memory', { action: 'search', query: '季末破例' }),
  ])])
  expect('consulted turn is not flagged', consulted.unconsulted.length, 0)
  // 口径：没有面板动作的会话不进 §6（探针会话的噪声）
  const probeOnly = analyzeSessions([buildSession(logB, [userMessage(T0, 'Reply with exactly one word: ready')])])
  expect('sessions without panel actions are out of section 6', probeOnly.humanTurns, 0)
  expect('consulted turn still counts', consulted.humanTurns, 1)

  // 混合重复：同一行"答完又问别的"——曾经被两个条件同时漏掉
  const mixed = analyzeSessions([buildSession(logB, [
    userMessage(T0, answer, desk),
    userMessage(T0 + 2 * MINUTE, `${PANEL_MARKER}行动「季末破例？」不办了：请记一行原因。完成后加载 desk-refresh 技能，把桌面文件重写一遍。`, desk),
  ])])
  expect('answer-then-drop counts as a repeat', mixed.repeats.length, 1)
  expect('answer-then-drop is not a double answer', mixed.doubleAnswers.length, 0)

  return 'desk-loop --self-check: ok — synthetic sessions yield the known counts (结构判类：注入前言不切断窗口、'
    + '纯文本注入不算本人的话、协作边界前言不冒充本人的话、混合重复算重复、§6 只数面板会话、题面撞车不误判真人会话)'
}

function main() {
  const argv = process.argv.slice(2)
  if (argv.includes('--self-check')) {
    process.stdout.write(selfCheck() + '\n')
    return
  }
  const sinceIndex = argv.indexOf('--since')
  const sinceDays = sinceIndex >= 0 ? Number(argv[sinceIndex + 1]) : undefined
  const includeEval = argv.includes('--all')
  const cutoff = sinceDays === undefined ? undefined : Date.now() - sinceDays * 24 * 60 * 60 * 1000

  const sessions = []
  for (const log of sessionLogs(harnessHome)) {
    const session = buildSession(log, readEvents(log))
    if (session === undefined) continue
    if (cutoff !== undefined && session.startedAt < cutoff) continue
    sessions.push(session)
  }

  const analysis = analyzeSessions(sessions, { includeEval })
  process.stdout.write(renderReport(analysis, { home: harnessHome, sinceDays, includeEval }))
}

// 只在直接运行时做 IO；被 import（测试/自检）时不动文件系统。
if (process.argv[1] !== undefined && import.meta.url === `file://${process.argv[1]}`) main()
