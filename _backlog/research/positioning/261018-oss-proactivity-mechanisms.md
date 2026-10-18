---
topic: 定位
intent: "用户说老的 Hermes 有主动性但上手难、我们场景窄——这篇把 Hermes 的主动性/自生长机制与其上手代价拆开，再从同类开源 agent 里挑出窄场景可吸收的少数机制与明确不能搬的几条。"
---

# 261018 · 开源 agent 的主动性机制：Hermes 深挖与同类可搬运清单

> 调研日期 2026-10-18。方法：先读本仓已有的 Hermes 身份与引导调研底稿
> （历史档案 notes/research/2026-09-24-r4-hermes-identity-survey.md，**该路径已不在工作树**，
> 取法 `git -C <repo> show c335eeb45f7339ce4114d80f11797e7d373b1e28:notes/research/2026-09-24-r4-hermes-identity-survey.md`；
> 它覆盖 SOUL.md / AGENTS.md / 家的布局，**本文不重复**），再只补"主动性/成长/自运转"这一面；
> 同类项目用 `api.github.com` 树与 contents API 取一手文档与源码正文。
> 证据分级：**[affordance]** 源码/接口可指认 ｜ **[documented]** 官方文档载明 ｜ **[observed]** 外部观察（注明出处，本次未使用）。
> **事实**与**【推断】**在正文里分开写；不从未经核对的宣传语推出使用效果。
> **取证通道说明（重要）**：本网络下 `raw.githubusercontent.com` 直接 connection reset、`github.com/<...>/blob/...` 30 秒超时；
> 全部源码与文档正文经 `api.github.com` contents API（带 `?ref=<sha>`）读取。文中的 GitHub blob URL 是同 path@sha 的规范引用形式，
> 但我本人没有在浏览器里渲染过它们；Hermes 官方文档站（`hermes-agent.nousresearch.com/docs/...`）可直连（HTTP 200），有对应页时并列给出。

---

## 速览表

| 项目 | 版本基线（查证日 2026-10-18） | 主动性触发 | 送达面 | 开关/调频 | 沉淀物 | 上手代价（结构性） |
|---|---|---|---|---|---|---|
| **Hermes** `NousResearch/hermes-agent` | MIT；`main` @ `ccc6956`（2026-10-18T00:34:35Z）；254,725★ | ① gateway 60s tick 的 cron 调度器 ② 会话级 `/heartbeat`（idle-only）③ webhook 事件触发 ④ 轮后背景 fork（记忆/技能自省）⑤ 空闲触发的 curator ⑥ 建议面（用户点接受才建） | 20+ 平台适配器 / `local` 落 `~/.hermes/cron/output/{job}/<ts>.md` / `origin` 回原会话 | `/cron` · `hermes cron …` · `cronjob_manage` 工具；`hermes pause` 全局急停；每个子系统各有 enabled/write_approval 开关 | `cron/jobs.json`（纯 JSON）· `cron/output/*.md`（人可读）· `MEMORY.md`+`USER.md` · `skills/` · **`executions.db`+`state.db`（SQLite）** | 必须跑 **gateway daemon** 才有定时；模型 key/OAuth 自备；511 个文档页；`configuration.md` 247KB/142 节 |
| **OpenClaw** `openclaw/openclaw` | `main`（pushed 2026-10-18）；392,298★ | ① heartbeat（system-owned automation，默认 30m）② automations（`at`/`every`/`cron`/`on-exit`/`stream`）③ **condition watcher**（无头脚本 `fire:true` 才叫醒模型）④ dreaming（三阶段记忆固化，默认开） | owner DM / 指定 channel / `none`（纯内部） | `agents.*.heartbeat.*`；`heartbeatVisibility` 三级 precedence；`activeHours`；`pacing.min/max`；`/loop` | workspace 纯文件（`AGENTS.md`/`SOUL.md`/`USER.md`/`MEMORY.md`/`memory/YYYY-MM-DD.md`/`DREAMS.md`/`skills/`）+ **SQLite plugin state（recall store / preimages）** | workspace 文件 + gateway + 插件配置 + 原生 Android/iOS/watchOS 客户端；`openclaw.json`（JSON5）+ 多 agent roster + sandbox |
| **Letta** `letta-ai/letta-code` | `main`（pushed 2026-10-17）；3,645★（`letta-ai/letta` 已变为转发仓） | ① dreaming/`sleeptime`（**按已完成的 agent step 数或上下文压缩时**触发，不是钟表时间）② `letta cron`（本地存 `~/.letta/crons.json`，**只在进程开着时跑**）③ agent 可自己排程 | 会话内 / 新会话（默认每次新会话）/ 云沙箱 | `/sleeptime`、Dream settings、`letta cron`；可选"再让 agent 复核一遍" | **MemFS：git 支撑的记忆文件系统**，Markdown + YAML frontmatter，根文件进 system prompt、带索引的子目录不进上下文 | npm 全局装；面向编码场景（`/init`/`/remember`）；云/本地双轨 + channels + computers 概念 |
| **Khoj** `khoj-ai/khoj` | `master`（pushed 2026-08-02）；37,725★ | Automations：按 crontime 定时跑一条查询 | **邮件** | 网页 `/automations` 配置/分享/删除；本地时区排程 | 服务端数据库（未取得一手描述） | 自托管需自备 **Resend + Authentication** 才能发自动化邮件 |
| **Home Assistant** `home-assistant/core` | `dev`（pushed 2026-10-18）；91,576★ | 用户自写的 automation（trigger/condition/action） | 任意 notify 目标（含持久通知） | automation 的 `mode` 四选一 | （不在本助手约束内） | 低——但它的"主动性"是用户自己写的规则，不是 agent 主动性 |
| **AutoGPT** `Significant-Gravitas/AutoGPT` | `master`（pushed 2026-10-18）；187,630★ | 平台版：**每用户一条 APScheduler cron**（dream 03:00 / community Sun 04:00 / briefing 每日，用户本地时间） | 平台推送 | LaunchDarkly 功能位 + Web 界面 | Postgres + Redis + 向量/图（graphiti） | **反面教材**：classic 已官方标注 unsupported |

---

## 一、先把"主动性"分三档（后文全用这个刻度）

1. **定时自报**——按钟表跑，产出无条件送到人面前。最便宜，也最容易变成噪音。
2. **变化才报**——跑一个便宜的判定，只有"和上次不一样"才叫醒模型/才投递。这是"主动但不吵"的关键档。
3. **空闲才动**——不关心几点，只关心"人现在没在干活"。养护、整理、固化这类工作属于这档。

**【推断】** 本仓（窄场景 + 简单交互 + 严格本地）能承受的是第 2、3 档；第 1 档只有极少几条（比如一条早报）值得开。下文 Hermes 与同类项目的机制按这三档归类。

---

## 二、A. Hermes（NousResearch/hermes-agent，MIT，开源）主动性深挖

**版本基线**：查证日 2026-10-18；`main` 分支 commit `ccc695635094d7615373db267b77f894d978b1a0`（committer date 2026-10-18T00:34:35Z，题目 `test(ssl): stand in a Windows-like store for the platform-bundle test`）；仓库 `pushed_at` 2026-10-18T04:22:26Z；254,725★；MIT；创建于 2025-07-22。
（https://github.com/NousResearch/hermes-agent ；元数据经 `api.github.com/repos/NousResearch/hermes-agent`）

### 2.1 触发机制清单

#### H1 · Cron 调度器（第 1 档的主干）

**[documented]** Cron 执行由 **gateway daemon** 承担：「**Cron execution is handled by the gateway daemon.** The gateway ticks the scheduler every 60 seconds, running any due jobs in isolated agent sessions.」
（https://hermes-agent.nousresearch.com/docs/user-guide/features/cron ；
源码 https://github.com/NousResearch/hermes-agent/blob/ccc695635094d7615373db267b77f894d978b1a0/website/docs/user-guide/features/cron.md ）

- **[documented]** 排程形态四类：时长（`"30m"`/`"2h"`/`"1d"`）、`every` 短语（`"every 2h"`、`"every monday 9am"`）、5 字段 cron（`"0 9 * * *"`）、ISO 单次（`"2026-06-01T09:00:00Z"`）。
  （https://github.com/NousResearch/hermes-agent/blob/ccc695635094d7615373db267b77f894d978b1a0/cron/AGENTS.md ）
- **[documented]** 每个作业的字段面：`skills`（可挂 0..n 个技能）、`model`/`provider` 覆盖、`script`（**运行前**的数据收集脚本，stdout 注入 prompt；`no_agent=True` 时脚本就是整个作业；永远是 `HERMES_HOME/scripts/` 下的**文件**，`script='echo hi'` 在创建时就被拒）、`context_from`（把作业 A 上次输出接进作业 B）、`workdir`、`deliver`、`enabled_toolsets`、per-job reasoning effort。（同上）
- **[documented]** 作业存 `~/.hermes/cron/jobs.json`——**纯 JSON**，原子写，跨 `hermes update`/重启/重启机器存活；手改坏了调度器会在下一次加载时修（丢弃非对象条目、重置非法 `repeat.completed`）并记警告。产出存 `~/.hermes/cron/output/{job_id}/{timestamp}.md`——**人可读的 Markdown**。
- **[documented]** 执行账本在 `~/.hermes/cron/executions.db`——**SQLite**。尝试状态 `claimed`→`running`→`completed`/`failed`/`unknown`；重启后用 PID + 进程启动指纹判定孤儿；「Unknown attempts are audit records and are never automatically rerun」。
- **[documented]** **cron 会话 `skip_memory=True`**：「memory providers intentionally do not run during cron.」——即定时运行**不会**污染长期记忆。这条对"主动性会不会把记忆搞脏"是个明确的答案。
- **[documented]** cron 运行的会话**不能**递归建 cron 作业，除非显式开 `cron.allow_agent_scheduling: true`（**默认 false**）。
- **[documented]** 加固不变量一大把：inactivity watchdog 默认 600s（`HERMES_CRON_TIMEOUT` 覆盖，`0` = 不限）；catch-up 窗口 = 半个周期、clamp 到 120s–2h；per-home tick lock `<home>/cron/.tick.lock`；**headless tick 拒绝而不 spawn**（`hermes cron tick` 走 `tick(headless=True)`，发现没有 gateway 拥有该 home 就跳过 agent 作业并盖 `last_fire_error`）；`scheduler_provider.py::_start_multiplex` 是**一个** ticker 顺序遍历所有 profile，绝不起 N 个线程。
- **[documented]** 「Scheduled and unattended runs have nobody to answer a prompt」——需要登录态的站点必须在运行前把登录准备好。

#### H2 · `/heartbeat`（会话级心跳，第 1 档）

**[documented]** 文档首句定义：「`/heartbeat` gives the **current session** one recurring instruction. Whenever the session is idle and the interval has elapsed, the prompt fires as a normal user turn — same conversation, same context, same prompt cache.」灵感来源是 Prime-Agent 的 `/heartbeat`。
（https://hermes-agent.nousresearch.com/docs/user-guide/features/heartbeat ）

- **只在本轮空闲时触发**：绝不打断正在跑的 turn；忙时等到下一次 idle 轮询。gateway 里被监视的会话会**主动醒来**，不需要新的入站消息。
- **错过的节拍合并**：忙过/进程没开过好几个间隔，只会得到**一次**心跳，不是积压；计时器每次触发后重锚。
- **用户消息优先**；心跳等输入队列排空。
- **归属设定它的那个面**：从消息平台设的心跳从 gateway 触发并回到那个聊天，即使同一会话在 TUI/桌面也开着——旁观者不抢这一拍。
- **cache 安全**：注入的 prompt 是**普通 user 消息**，不改 system prompt、不改 toolset。
- **一 session 一条**（对比 cron 无限条）；命令面 `/heartbeat every <interval> <prompt>` / `status` / `pause` / `resume` / `clear`，最小间隔 60s，`/hb` 别名。
- **持久化位置**：`SessionDB.state_meta`，键 `heartbeat:<session_id>`，跟随上下文压缩的会话轮转——**即状态住在 SQLite 里，不是纯文件**。
- **静默**：「A scheduled heartbeat turn may end with a bare silence marker (`NO_REPLY` / `[SILENT]`): the gateway sends nothing」。且心跳工作期间不发 typing 指示、工具进度、流式草稿或"仍在工作"气泡。
- **防造活**：「The injected prompt tells the agent to reply briefly and stop when nothing meaningful changed, so an idle heartbeat doesn't generate busywork.」（原文 "Don't-invent-work guard"）
- **选型规则（文档自己给的）**：需要会话上下文的循环用 `/heartbeat`；自包含的作业用 cron。

#### H3 · 事件触发（外部事件直接点火）

**[documented]** 「fire on **external events** — a webhook route with `cron_job` set fires the job the moment something happens (a PR gets feedback, a service posts an alert) instead of waiting for the next scheduled tick.」
（cron.md「What cron can do now」）

#### H4 · 预检脚本 + `wakeAgent: false`（第 2 档的正解）

**[documented]** 挂了 `script=` 的作业，脚本可以在运行期决定"要不要叫醒 agent"：末行 stdout 输出 `{"wakeAgent": false}` 就**整轮跳过 agent 运行**。文档给的理由就是省钱：「Useful for frequent polls (every 1–5 min) that only need to wake the LLM when state actually changed — otherwise you pay for zero-content agent turns over and over.」
（cron.md「Skipping the agent entirely: `wakeAgent`」）

**[documented]** 另一个更省的一档是 `no_agent` 模式：脚本就是整个作业，stdout 原样投递，**零 LLM 参与**。

#### H5 · 建议面（consent-first，"我说你可以做什么"而不是"我直接做了"）

**[affordance]** `cron/suggestions.py` 模块级文档：

> 「A suggestion is a ready-to-run cron job spec the user accepts (creates the real job) or dismisses (latched by `dedup_key` so it is never re-offered). Every proposal flows through here regardless of source: `catalog` (curated starters), `blueprint` (skill `blueprint:` blocks), `usage` (self-improvement review), `integration` (connected account). Accepting calls `cron.jobs.create_job` with the stored `job_spec` — no second job engine; **nothing auto-creates (consent-first)**.」
> 「Cap pending suggestions so the list never becomes a nag wall; when full, new ones are dropped.」`MAX_PENDING = 5`

（https://github.com/NousResearch/hermes-agent/blob/ccc695635094d7615373db267b77f894d978b1a0/cron/suggestions.py ）

- 存储 `~/.hermes/cron/suggestions.json`（原子替换、0600）；状态 `pending`/`accepted`/`dismissed`。
- **[affordance]** 内置目录（`cron/suggestion_catalog.py`）四条，每条是一个可直接跑的 `create_job` 规格——这是"产品化的主动行为"样本：
  - `catalog:daily-briefing` — `0 8 * * *`，早报（今日日程 + 天气 + 紧急项），`deliver: origin`；
  - `catalog:important-mail-monitor` — `every 30m`，**收件箱巡检**，prompt 里明确写「If nothing clears the bar, respond with `[SILENT]` so the user is not pinged」；
  - `catalog:weekly-review` — `0 18 * * 0`，周复盘；
  - `catalog:standup-reminder` — `0 9 * * 1-5`，工作日开场提醒。
  （https://github.com/NousResearch/hermes-agent/blob/ccc695635094d7615373db267b77f894d978b1a0/cron/suggestion_catalog.py ）

#### H6 · 轮后背景自省（每轮都可能动，不需要用户开口）

**[affordance]** `agent/background_review.py` 模块级文档：

> 「Background memory/skill review — fork the agent to evaluate the turn. **After every turn** `AIAgent.run_conversation` may spawn a daemon thread that replays the conversation snapshot in a forked `AIAgent` and asks "should any skill/memory be saved or updated?". **Writes go straight to the memory + skill stores**; the main conversation and prompt cache are never touched. The fork inherits the parent's live runtime … so it hits the same prefix cache, and runs under a dispatch-side tool whitelist.」

（https://github.com/NousResearch/hermes-agent/blob/ccc695635094d7615373db267b77f894d978b1a0/agent/background_review.py ）

**[documented]** 这是 Hermes"自我改进循环"的发动机，文档称其为「Hermes' consent-aware learning loop: repeated corrections and durable workflow lessons become compact memory entries or procedural skills, while `write_approval` can stage those writes for review before they affect future sessions.」
（https://hermes-agent.nousresearch.com/docs/user-guide/features/memory ）

配套的可见性与成本旋钮（全在 `configuration.md` / `memory.md`）：

| 旋钮 | 默认 | 作用 |
|---|---|---|
| `display.memory_notifications` | `on` | `off` 什么都不提示（评审照跑照写）／`verbose` 带改动预览；可按平台设 |
| `auxiliary.background_review.enabled` | `true` | `false` = 不做自动轮后 fork（手动 `/refine` 仍在） |
| `auxiliary.background_review.max_input_tokens` | 未设 = 模型的 75% 窗口、上限 600k | 一次评审重放输入 token 的**总量**上限 |
| `auxiliary.background_review.provider/model` | `auto` = 主模型 | 换便宜模型时自动改用**对话摘要**而非全量转写 |
| `auxiliary.background_review.defer` | — | 本地模型时等 GPU 空闲再跑 |
| `memory.write_approval` / `skills.write_approval` | `false` | `true` = 每次写入都暂存待批（`~/.hermes/pending/skills/`，`/skills pending|diff|approve|reject`） |
| `skills.guard_agent_created` | `false` | 对 agent 写的技能内容做危险模式扫描 |

**[documented]** 值得记的一条自我克制：「The scanner is **off by default** — real agent workflows that legitimately touch `~/.ssh/` or mention `$OPENAI_API_KEY` were tripping the heuristic too often.」

#### H7 · Curator（第 3 档：空闲触发，不是 cron）

**[documented]** 「The curator is triggered by an inactivity check, **not a cron job**. On CLI session start, during gateway housekeeping …, and on the `hermes serve` maintenance timer, Hermes checks whether: (1) Enough time has passed since the last curator run (`interval_hours`, default **7 days**), and (2) the agent has been idle long enough (`min_idle_hours`, default **2 hours**).」
（https://github.com/NousResearch/hermes-agent/blob/ccc695635094d7615373db267b77f894d978b1a0/website/docs/user-guide/features/curator.md ；
在线页同源 https://hermes-agent.nousresearch.com/docs/user-guide/features/curator ）

- **[documented]** 两阶段：**确定性迁移**（无 LLM，永远开）`active → stale`（14 天未用）`→ archived`（30 天未用，移入 `~/.hermes/skills/.archive/`，**从不自动删除**）；**LLM 合并**（默认 **关**，`curator.consolidate: true` 才开，"a full curation sweep typically takes 50–100 API calls"）。
- **[documented]** 豁免：被 pin 的技能、**任何 cron 作业引用到的技能**（含暂停/禁用的作业）；从未用过的技能有宽限地板（不到 14 天不归档）——「Zero uses is absence of evidence, not proof the skill is disposable.」
- **[documented]** **首次运行不立即跑**：第一次观测把 `last_run_at` 种成"现在"，第一次真正的 pass 推迟**整整一个 interval**——「This gives you a full interval to review your skill library, pin anything important, or opt out entirely before the curator ever touches it.」这是极便宜的安全垫。
- **[documented]** 回退设施很重：整树 tar.gz 快照（`~/.hermes/skills/.curator_backups/<utc-iso>/skills.tar.gz`，`keep: 2`）；**追加式 JSONL 台账** `~/.hermes/skills/.curator_ledger.jsonl`（actor/action/evidence + 每文件 `{path, sha256}` before/after + 内容寻址 blob 去重）；`hermes curator rollback <entry-id>` 能回退**单次**改动；台账 5MB 上限并自动压实。
  - **[推断]** 这是全文最值得注意的一处反差：Hermes 把**回退**做得比**触发**重得多。它默认"养护在后台自己动"，代价是必须自建一套 git 之外的版本机制；而本仓已经有 git。

#### H8 · Kanban dispatcher（多 agent 队列，不是用户侧主动性）

**[documented]** 持久化 SQLite 看板；dispatcher 是长驻循环（默认 60s）回收陈旧 claim、提升就绪任务、原子 claim 并 spawn 指定 profile；**默认跑在 gateway 内**（`kanban.dispatch_in_gateway: true`），独立形态是 systemd unit `plugins/kanban/systemd/hermes-kanban-dispatcher.service`。worker 用专门的 `kanban_*` 工具集，schema footprint 为 0。
（cron/AGENTS.md「Kanban (multi-agent work queue)」）

**【推断】** 这一档与本仓"一个一把手 + 一个助手"的形态无关，列在这里只为说明 Hermes 的"主动性"分层到哪一层为止；搬运它是纯负担。

#### 明确否证：Hermes **没有** dreaming / sleep-time / curiosity

**[affordance]** 全树 21,460 条路径中，`dream*`、`curio*`、`sleeptime*`、`sleep_time*` **零命中**。与 OpenClaw 的 `concepts/dreaming.md`、Letta 的 dreaming、AutoGPT 的 `copilot/dream/` 形成鲜明对照。
（树经 https://api.github.com/repos/NousResearch/hermes-agent/git/trees/main?recursive=1 ）
→ 这是一个**否定性结论**，按树列举得出，不是文档明文否认（见「未能证实清单」第 2 条）。

### 2.2 记忆与自改进里"不需要用户开口就会动"的部分

| 机制 | 是否自带"自己会动" | 判据 |
|---|---|---|
| `memories/MEMORY.md` + `USER.md` | **否**（被动） | 上限 2200 / 1375 字符；session 开始以 frozen snapshot 注入（保 prefix cache）；满则**报错不静默**，由 agent 当轮自己合并 |
| `session_search`（SQLite FTS5） | **否**（按需查） | 全部 CLI/消息会话存 `~/.hermes/state.db`；~20ms FTS5 查询；「Free — no LLM calls」 |
| 背景评审（H6）写入 memory/skills | **是** | 每轮后 fork，问"要不要存技能/记忆"，直接写存储 |
| curator 归档/合并（H7） | **是** | 空闲 + 间隔双条件满足即动；合并档默认关 |
| 建议面（H5）`usage` 源 | **半是** | 评审可以**提出**建议，但不建作业（consent-first，`MAX_PENDING = 5`） |
| cron 会话的记忆 | **否**（被刻意切断） | `skip_memory=True` |
| `/journey` 学习时间线 | **否**（纯查看） | `hermes journey list/delete/edit`，技能是**归档**（可恢复），记忆块是移除 |
| `goals` / `loops` / `hooks` | 本次未深读 | 见「未能证实清单」第 3 条 |

（https://hermes-agent.nousresearch.com/docs/user-guide/features/memory ）

### 2.3 "上手难"的具体来源（可指认的结构性代价，不是感觉）

#### (a) 配置面

- **[documented]** `website/docs/user-guide/configuration.md` 单页 247KB、**142 个标题**（含 Terminal backend 的 7 种后端、auxiliary 模型全参考、TTS/STT/显示/隐私/群聊/浏览器/Web 搜索…）。
- **[documented]** `cli-config.yaml.example` 2352 行、**28 个顶层节**、109 个叶子键——**而这只是最小示例**（`cron:` 一节只列了一个键 `catch_up_missed`）。
- **[documented]** `.env.example` 563 行。
- **[documented]** 配置有优先级层（`config.yaml` → `.env` → 环境变量 → 每 profile），且有迁移与世代管理（`hermes_cli/config_migrations.py`、`config_version_stamp.py`）。

#### (b) 概念数量（新手要同时装进脑子里的名词）

**[documented]** SOUL.md ｜ memories（MEMORY.md + USER.md）｜ skills（bundled / optional / hub / project-local / agent-created 五来源 + precedence + scan-time quarantine + bundle）｜ sessions（SQLite + FTS5）｜ tools & toolsets（`platform_toolsets` 按平台配）｜ plugins（树里 **22** 个 plugin 目录）｜ **gateway**（daemon，多 profile multiplexer）｜ cron ｜ kanban ｜ curator ｜ hooks ｜ MCP ｜ auxiliary models ｜ credential pool ｜ fallback providers ｜ **memory providers**（Hindsight / Mem0 / Honcho …，独立于内建存储）｜ ACP ｜ delegation / subagents ｜ worktree isolation。
（https://github.com/NousResearch/hermes-agent/tree/ccc695635094d7615373db267b77f894d978b1a0/plugins ；
https://hermes-agent.nousresearch.com/docs/user-guide/features/memory-providers ）

#### (c) 必须自备的东西

- **[documented]** **一个模型 provider 的 key 或 OAuth**（`hermes model` 交互式选）。
- **[documented]** **要"主动性"就必须跑 gateway daemon**：「The gateway must be running: agent jobs execute inside the gateway, and a tick never starts one. With no gateway up, agent jobs are skipped with a logged reason.」安装形态 `hermes gateway install` / `sudo hermes gateway install --system`。
- **[documented]** **要投递就必须接一个平台适配器**：deliver 目标表列了 20+ 个（telegram / discord / slack / whatsapp / signal / matrix / mattermost / email / sms / homeassistant / dingtalk / feishu / wecom / weixin / bluebubbles / qqbot / bot-chat / all / origin / local）。
- **[documented]** 无人值守最省事的一条路是**换成一个托管 OAuth**：「`hermes setup --portal` is the lowest-friction option for unattended runs since OAuth refresh is automatic.」

#### (d) 文档结构对新手的要求

- **[documented]** 文档站 **511** 个页面：`user-guide/` 379、`developer-guide/` 63、`guides/` 37、`reference/` 16、`getting-started/` 9、`integrations/` 5。单 `user-guide/features/` 就有 **57** 页。
- **[documented]** quickstart 自己给出的规则就是"上手难"的自证：「**Rule of thumb:** if Hermes cannot complete a normal chat, do not add more features yet. Get one clean conversation working first, then layer on gateway, cron, skills, voice, or routing.」
  （https://github.com/NousResearch/hermes-agent/blob/ccc695635094d7615373db267b77f894d978b1a0/website/docs/getting-started/quickstart.md ）
- **[documented]** `cron/AGENTS.md` 本身是一份 13KB 的加固不变量清单（multiplexed profile 的 ContextVar scope、PID+启动时间指纹、tick lock、stale-code yield gate、外部 worker 自举、PM generation lease、`_inflight_key(job_id) = (home key, job id)`…）。

> **【推断】必须把两种"难"分开**：(c)(d) 里那份 13KB 不变量是**维护者**难度（改 Hermes 源码的人要懂），不是**用户**上手难度。用户侧的上手难度来自 (a)(b)(c) 三项：一个 247KB 的配置参考、十几个概念、以及"不跑 gateway 就没有主动性"这条硬门槛。用户说"上手难度颇高"，可指认的部分在这里。

### 2.4 它有没有"主动性开关 / 默认节律 / 静默时段 / 投递预算"

| 打扰治理项 | Hermes 有没有 | 出处 |
|---|---|---|
| **全局急停** | **有** | `hermes pause [--reason …]` / `hermes resume`：内置 ticker 跳过 dispatch，托管 cron 的 fire webhook 回 `503` + `Retry-After: 60`，misfire 补偿扫描也停；**在跑的 run 不杀**，工作不丢。手动 `hermes cron run` 是操作者override，暂停期间仍执行 |
| **单作业静默** | **有** | 成功运行的最终回复含 `[SILENT]` → 完全抑制投递，输出仍存本地审计；**失败的作业一律投递，不受 `[SILENT]` 影响** |
| **声明失败** | **有** | `[CRON_FAILURE]` 单独放**首行**才把该 run 记为失败（脚本作业不看它，脚本用非零退出码） |
| **默认节律** | **有** | gateway 每 **60s** tick；心跳最小 60s；脚本超时默认 3600s；cron inactivity watchdog 默认 600s |
| **重复失败提醒** | **有** | `cron.failure_nudge_threshold: 3`（默认；`0` 关）；成功一次即清零；单次作业永不提醒 |
| **不可达自动重跑** | **有** | `cron.retry_unreachable: true`（默认）：一次模型调用都没发生时按 **5 / 15 / 30 分钟**梯子重跑（灵感注明来自 Claude Cowork 的定时任务重跑），**期间抑制中间失败通知**；梯子结束或跑到模型即重置 |
| **配额窗口持有** | **有** | `cron/quota_hold.py`：provider 回 `retry after <N>s` 且整条 fallback 链都不可用时，把 `next_run_at` 停到窗口边界，进入 hold 时只投**一次**失败告警：「no further alerts are sent while the provider is unavailable」 |
| **停机后不轰炸** | **有** | `cron.catch_up_missed: true`（默认）：重启后漏掉的槽**只补一次**；关掉则跳过并记日志；grace 窗口 = 半周期 clamp 120s–2h；`cron.misfire_grace_minutes: 10` |
| **配置不对不烧钱** | **有** | `cron.preflight`：预检失败时 `last_status = blocked_config`，**只投一次**告警且**完全不发 LLM 调用** |
| **静默时段 / 免打扰窗口** | **未找到** | 本次抓取的 8 个文档页 + heartbeat/cron/curator 源码里无 `quiet_hours` / DND / active-hours 一等概念 → **未能证实其存在** |
| **投递预算（每日上限 / 频次配额）** | **未找到** | 同上。仅有的"上限"语义是 `MAX_PENDING = 5`（建议面）与 `failure_nudge_threshold` |
| **心跳级可见性开关** | **部分** | Hermes 只有"发/不发"（`[SILENT]`）；OpenClaw 才有三等分的 `showOk/showAlerts/useIndicator`（见 §3.1） |
| **后台评审的提示开关** | **有** | `display.memory_notifications: off|on|verbose`（**只关提示，不关写入**） |

---

## 三、B. 同类开源项目的主动性机制

入选理由：**OpenClaw** 是"Muse 工作区致敬"的对象且它的 heartbeat/dreaming 是当下最成熟的公开设计；**Letta** 的 MemFS 是"记忆本身就是 git 仓"的极端答案，正好压在本仓硬约束上；**Khoj** 是"日报式主动研究"最接近的产品形态；**Home Assistant** 提供最久经考验的并发/节流原语；**AutoGPT** 作为反面教材（classic 已官方停维），且其 platform 版意外地和 Hermes/OpenClaw 撞到了同一套词汇。

### 3.1 OpenClaw（`openclaw/openclaw`）

**版本基线**：`main`（pushed 2026-10-18T04:23:06Z）；392,298★；创建 2025-11-24。以下均取 `api.github.com` contents API 于该分支的正文。

#### (1) 主动性由什么触发

- **[documented] Heartbeat = 一条 system-owned automation。**「Under the hood, heartbeat cadence is owned by the Automations scheduler: the gateway maintains **one system-owned automation job per heartbeat-enabled agent** (visible in `openclaw cron list --all` as `Heartbeat (agent-id)`). Heartbeat config remains the desired-state input, while the persisted monitor schedule owns the actual tick…」「Edit `agents.*.heartbeat`, not the automation job.」
- **[documented] 默认节律**：`30m`；解析到 Anthropic OAuth/token 认证时抬到 `1h`（只在 `heartbeat.every` 未设时）。`"0m"` 只关循环节拍，**定点事件唤醒仍可用**。
- **[documented] 提示词逐字作为定时 user 消息发送**；心跳运行**共用**普通 turn 的 system prompt，**没有**心跳专属的 system-prompt 段落。
- **[documented] Automations（= cron）** 六种 schedule kind（OpenClaw 文档的 automation/cron-jobs 一节，非本仓路径）：

  | kind | CLI | 说明 |
  |---|---|---|
  | `at` | `--at` | 一次性时间戳（ISO 或 `20m` 相对量） |
  | `every` | `--every` | 固定间隔 |
  | `cron` | `--cron` | 5 或 6 字段 + 可选 `--tz` |
  | `on-exit` | `--on-exit` | **被观察命令退出时触发一次**（跨 turn 拆除存活） |
  | `stream` | `--stream-command` | 受监督长驻命令的 stdout/stderr **按行批量**触发 |

- **[documented] 整点表达式自动错峰**最多 5 分钟（`--exact` 关，`--stagger 30s` 显式）。
- **[documented] 条件门（condition watcher，第 2 档）**：给 `every`/`cron`/`stream` 挂一个**无头条件脚本**，只有脚本返回 `fire: true` 才跑正常 payload。脚本必须返回 `{ fire, message?, state? }`；上一次的 JSON `state` 以 `trigger.state` 传回并可持久化，**state 上限 16KB**。文档给的例子就是变化检测：拿 `gh pr checks` 的聚合状态和 `trigger.state.status` 比，不同才 fire 并把差异写进 message。`once: true` 则在第一次成功 fire 后禁用作业。
- **[documented] 自定速（pacing，第 2/3 档之间）**：`pacing.min` / `pacing.max`（如 `15m`/`4h`，至少给一个界）。运行中的 agent-turn 作业可以调 `automations` 工具 `action: "next_check", in: "30m"` **提议**下次检查时间；「OpenClaw silently clamps it to the configured bounds」；**失败、超时、跳过的 run 丢弃提议**。
- **[documented] `/loop [interval] <prompt>`**：owner-only 聊天快捷方式，把循环作业绑到该会话；省略 interval 就让它**在 1 分钟到 1 小时之间自定速**（靠 `next_check`）。
- **[documented] Dreaming**：`memory-core` 插件，**默认开启**（`plugins.entries.memory-core.config.dreaming.enabled: false` 关）。「Dreaming is the background memory consolidation system in `memory-core`. It moves strong short-term signals into durable memory while keeping the process explainable and reviewable.」三阶段 light → REM → deep，**只有 deep 写 `MEMORY.md`**；**它自己也变成一条 cron**：「`memory-core` auto-manages one cron job for a full dreaming sweep」。
- **[documented] Dreaming 的输入被刻意收窄**：「Only interactive sessions are eligible. **Cron, heartbeat, subagent, and unknown sessions stay out of durable candidate ingestion.**」——和 Hermes 的 `skip_memory=True` 是同一个直觉。

#### (2) 用户在哪看到、怎么开关/调频

- **[documented]** 心跳默认投给 **operator 的 DM**（`commands.ownerAllowFrom` 里第一条具体项，其次频道的 `allowFrom`，**永不发给群**；解析不到就 `reason=no-route` 跳过，不跑模型）。`target: "last"` 跟随最近会话（含群），`target: "none"` 纯内部。
- **[documented] 可见性三开关、四级 precedence**（per-account → per-channel → `channels.defaults` → 内建）：`showOk`（默认 false，隐藏 `HEARTBEAT_OK`）、`showAlerts`（默认 true）、`useIndicator`（默认 true）。**三个都关 → 该心跳运行直接被跳过，不产生模型调用**（`reason=alerts-disabled`）。`directPolicy: "block"` 可只压制私聊投递而仍跑 turn。
- **[documented] 响应契约**：没事就回 `NO_REPLY`；**只有 ≥4 字符的严格前缀**（`NO_R`）也算安静回复（仅限心跳）；遗留的 `HEARTBEAT_OK` 在开头/结尾且剩余内容 ≤300 字符时被丢弃（抑制预算是固定的）；结构化 `heartbeat_respond` 工具用 `notify: false/true` 优先于文本回退。
- **[documented] 默认提示词刻意收窄**：「Follow the heartbeat monitor scratch context when provided. Recurring tasks are automations; create or change their schedules with the automations tool, not heartbeat scratch. **Do not infer or repeat old tasks from prior chats.** If nothing needs attention, reply `NO_REPLY`.」文档另注：「so a default install stays quiet instead of rehashing stale conversation context.」
- **[documented] 主动行为是 opt-in**：默认心跳**不**从旧聊天推断循环工作；要周期检查就去建 automation；要"偶尔问一句你需不需要什么"就自己建一条作业并把时间约束到不在夜里。
- **[documented] 用户可见的调频入口**：`openclaw automations list|get|show|runs <job-id>`；Control UI；`/loop status|stop`。

#### (3) 沉淀了什么，是否人可读 / 可 git / 可回退

- **[documented] Workspace（`~/.openclaw/workspace`，默认 cwd）里的纯文件**：`AGENTS.md`（每次会话开头加载）、`SOUL.md`、`USER.md`（可选，**独立 4000 字符预算**）、`IDENTITY.md`、`BOOT.md`（可选启动清单）、`BOOTSTRAP.md`（一次性首次仪式，用完请删）、`memory/YYYY-MM-DD.md`（每日记忆日志，建议会话开头读今天+昨天）、`MEMORY.md`（可选，仅主私密会话加载）、`skills/`（该 workspace 最高优先级的技能位置）。
- **[documented] 注入有界**：`agents.defaults.bootstrapMaxChars` 默认 **20000**、`bootstrapTotalMaxChars` 默认 **60000**；缺必填文件注入"missing file"标记后继续；单个文件编辑器上限 2 MiB。
- **[documented] 明确推荐 git**：「Treat the workspace as private memory. Put it in a **private** git repo so it is backed up and recoverable.」新 workspace 若装了 git 会自动 init。**并明确列出不该提交的**：`~/.openclaw/openclaw.json`（配置）、`state/openclaw.sqlite`（共享 setup 状态与 attestation）、`agents/<id>/agent/openclaw-agent.sqlite`（模型认证、路由状态、**standing intents**、session 行、转写、**记忆索引状态**）、`codex-home/`、`credentials/`、`sessions/`、`~/.openclaw/skills/`（managed skills）。
- **[documented] Dreaming 的落点三样**：机器状态在 **SQLite-backed plugin state**（recall store、phase signals、ingestion checkpoint、锁）+ 接受一次 `MEMORY.md` 重写之前的 **rewrite preimages**（也在 SQLite）+ **人可读输出** `DREAMS.md`（Dream Diary）与可选 `memory/dreaming/<phase>/YYYY-MM-DD.md`。
- **[documented] 长期晋升只写 `MEMORY.md`**；晋升条目带尾部 recall 元数据：最多三个概念标签 `<!-- trigger: phrase one, phrase two -->` 与有界的 `<!-- importance: N -->`（1–10）。
- **[documented] Dream Diary 明确不是晋升源**：「The diary is for human reading in the Dreams UI, not a promotion source.」
- **[documented] 三道晋升门**：`minScore` / `minRecallCount` / `minUniqueQueries` **必须全过**；模型不可用或重写校验失败时**回退到旧的 append-only 晋升路径**。
- **[documented] 回退面**：`openclaw doctor --fix` 是一等修复入口（迁移 heartbeat scratch 的旧 `tasks:` 块、转换 legacy trigger 脚本、物化缺失的 monitor 行）。

#### (4) 上手代价与"不开口也有价值"的门槛

- **[documented] 成本警告是文档自己写的**：「Heartbeats run full agent turns. Shorter intervals burn more tokens.」并给出省法：`isolatedSession: true`（**~100K tokens 降到 ~2-5K 每次运行**）、`lightContext: true`（跳过 workspace bootstrap 文件）、换便宜模型（示例 `ollama/llama3.2:1b`）、保持 monitor scratch 小、`target: "none"` 只做内部状态更新。
- **[documented] 一个真实的坑（文档自己记的）**：心跳若在共享会话里把运行时模型切成小的本地模型，**这个模型会留在会话上**，下一个主会话 turn 可能报上下文溢出；恢复消息会把"heartbeat model bleed"点名为可能原因。解法是 `isolatedSession: true`（+ `lightContext: true`）。
- **[documented] 另一个坑（文档自己记的）**：croner 的 **day-of-month 与 day-of-week 是 OR 逻辑**——`0 9 15 * 1` 本意"15 号且是周一"，实际是"每月 15 号 **加上** 每周一"，「This fires roughly 5-6 times a month instead of 0-1 times a month」；要 AND 得写 `+1`。
- **[documented] 忙时不叠**：主队列忙、同 agent 的自动化在跑、同 agent 有任何 reply/内嵌 run、或目标会话有活跃/排队工作 → 计划心跳延后；**没有事件的纯监视轮**记为 skipped 并等下一个持久化节拍（而不是挂着一个运行中的自动化）。
- **[documented] 事件唤醒自带限速**：事件 turn **至少间隔 30 秒、每分钟最多 5 次**；「a flood guard after five starts within 60 seconds」。
- **[documented] 渠道不通不烧钱**：渠道自报未就绪时，**没有计划任务也没有排队事件**的环境心跳轮**跳过模型 turn**；就绪重试从 1 分钟起翻倍到心跳间隔。若 turn 中途渠道掉线挡住告警，**不消耗该节拍槽**，1 分钟宽限后重试。
- **[documented] 活跃时段**：`heartbeat.activeHours` 按**配置的时区**判定，窗外跳过到下一个窗内节拍（有 `{ start: "08:00", end: "24:00" }` 的示例）。
- **[documented] 心跳不延长会话寿命**：空闲过期看 `lastInteractionAt`（最后一条真实用户/频道消息），日常过期看 `sessionStartedAt`。
- **概念/依赖面【documented】**：`~/.openclaw/openclaw.json`（JSON5）、agents roster / `agents.entries.*`、sandbox + `workspaceAccess`、channels + accounts、`heartbeatVisibility` 四级 precedence、`cron.triggers.enabled`、`tools.exec.notifyOnExit`、`openclaw doctor`；仓库 `apps/` 下有 Android / iOS / watchOS **原生客户端**。
- **【推断】** OpenClaw 的"不开口也有价值"门槛**很高**：默认心跳的提示词明确不许它从旧聊天推断工作，所以**全新安装的默认状态是安静的**——价值要靠用户（或 owner）自己去建 automation 或写 monitor scratch 才产生。它把"主动"做成了**可配置的能力**，不是**开箱的体验**。

### 3.2 Letta（活动源码 `letta-ai/letta-code`）

**版本基线**：`letta-ai/letta` 主仓 `main` 现在只有 15 个文件（README 指向 `letta-ai/letta-code`，旧 V1 API server 在 `archive` 分支）；`letta-ai/letta-code` `main`（pushed 2026-10-17T20:30:16Z），3,645★，创建 2025-10-25。文档取 `docs.letta.com`。

#### (1) 触发机制

- **[documented] Dreaming = 后台 subagent，触发条件不是钟表时间**：「Dreaming uses background subagents to review recent conversations, consolidate useful lessons, and update memory without interrupting your active work. Configure dreaming with `/sleeptime` in the CLI or Dream settings in the app. **Choose when it runs: after a set number of completed agent steps or when the context window is compacted.**」
  （https://docs.letta.com/configuration/memory ）
- **[documented] 可选二次复核**：「**Select Agent reviews before applying** to have your agent review and revise proposed memory updates in a second background conversation. **This uses more model tokens and does not ask you for approval.**」——注意这是**复核**不是**征求同意**，文档明说不会问你。
- **[documented] Schedules**：`letta cron add`；**默认每次运行开一条新会话**——「This prevents recurring tasks from bloating your agent's context window or cluttering your primary chat history」；可用 `--conversation default|<id>|self` 改。**agent 自己也能排程**：「Your agent can also schedule tasks itself. Simply ask it in chat.」
  （https://docs.letta.com/configuration/schedules ）
- **[documented] 本地 vs 云两条完全不同的路**：

  | | 本地调度 | 云调度 |
  |---|---|---|
  | 存放 | 本机 `~/.letta/crons.json` | Letta Cloud |
  | 何时触发 | **只在有 CLI 或 server 进程开着时** | 服务端计时，总是 |
  | 时区 | 按本机时区求值 | 重复的 `--cron` 按 **UTC** |
  | 离线 | **暂停直到你重启 Letta** | 在目标机器跑，机器离线则退回沙箱 |

#### (2) 用户在哪看到、怎么开关/调频

**[documented]** `/memory`（CLI）或直接看 `$MEMORY_DIR`；`/doctor` 审计记忆层级是否漂移或过大（含 system-prompt token 用量）；`/sleeptime` 与 app 的 Dream settings 调触发；`letta cron` 增删；`letta computers list` 选执行目标。

#### (3) 沉淀物：**MemFS —— git 支撑的记忆文件系统**

**[documented]** 「MemFS is how a Letta agent works with its long-term memory. **The memory itself is part of the agent's state, held in a git repository that belongs to the agent**… MemFS projects that repository onto whatever computer the agent is running on, as a real checkout the agent reads and edits with ordinary file tools. **Edits are local until committed and pushed**, at which point they become the agent's memory everywhere. All Letta agents use MemFS.」

- **[documented] 结构**：除 `MEMORY.md` 索引外，每个 memory 是一份 **Markdown + YAML frontmatter**（`name` / `description`）；按路径寻址（label `persona` → `persona.md`）。
- **[documented] 分层进上下文的规则（本仓最该看的一条）**：「**Files at the memory root are loaded into the agent's system prompt on every turn.** Use them for the agent's identity, important user preferences, durable project facts, and critical workflow rules. **Directories with their own `MEMORY.md` index stay out of context until they are needed.** The root `MEMORY.md` lists them, so directory and file names act as signposts the agent follows to read the right file. **This keeps the active context lean while preserving deeper reference material.**」
- **[documented] 默认没有向量索引**：「**MemFS does not include a semantic or vector index by default.** Agents find memory in its Markdown files with **normal file-search and read tools**.」要关键词/语义/混合搜索得自己装 `@letta-ai/memfs-search` mod（语义模式还需额外装 QMD 并对其建索引）。
- **[documented] 整理前先备份**：「The memory workflow **backs up the current repository** before splitting large files, merging duplicates, or restructuring the hierarchy.」
- **[documented] 会话历史搜索是另一件事**：云上 `letta messages search` 支持全文/向量/混合；本地后端目前只搜会话转写。

（https://docs.letta.com/concepts/memfs ）

#### (4) 上手代价

**[documented]** npm 全局装 `@letta-ai/letta-code`；主要语汇面向编码场景（`/init` 检视仓库、`/remember always use pnpm in this repo`、"the lesson belongs to which file"）；云/本地双轨、channels（Slack/Telegram/Discord/WhatsApp/Signal/自定义）、**computers**（BYO machine / cloud sandbox）三个额外概念。

### 3.3 Khoj（`khoj-ai/khoj`）

**版本基线**：`master`（pushed 2026-08-02T01:55:40Z）；37,725★；创建 2021-08-16。

- **[documented] 机制**：Automations——「schedule repeated jobs for Khoj to do on your behalf. Automations allow you run your query automatically at a scheduled time and frequency.」用**本地时区**排程。
- **[documented] 送达面 = 邮件**：「**Khoj will send its research to you as an email.**」在 `app.khoj.dev/automations` 配置、分享、删除。
- **[documented] 自托管的门槛写在文档里**：「Self hosting users need to setup **Resend** and Authentication setup to have Khoj send automation emails.」
- **[documented] 整个 automations 文档只有 14 行**——没有调度器实现、存储位置、并发语义、静默/预算的任何描述。
  （https://github.com/khoj-ai/khoj/blob/master/documentation/docs/features/automations.md ）
- **【推断】** 它唯一值得借鉴的是**形状**："定时跑一条查询 → 结果整理成人能读的一份东西 → 送到一个用户本来就会看的地方"。**管道不可搬**：送达靠第三方邮件服务（Resend），与本仓"严格本地"直接冲突；我也没有拿到它调度器的一手描述。

### 3.4 Home Assistant（`home-assistant/core`）

**版本基线**：`dev`（pushed 2026-10-18T01:21:17Z）；91,576★；文档站版本 2026.10.2。

- **[documented] Automation modes**：`single`（**默认**，"Doesn't start a new run while the automation is running, **and logs a warning**"）/ `restart`（停掉当前 run 从头再来）/ `queued`（等前面的跑完，按启动顺序）/ `parallel`（立刻并行开一份）。文档还给了 8 个 action 的对照图，并提醒"大多数情况 Single 就是你想要的"。
  （https://www.home-assistant.io/docs/automation/modes/ ）
- **[documented] Notify 是 building block**：必须至少配一个 notifier；notify 实体的 state 是**最后一次发送的时间戳**。
  （https://www.home-assistant.io/integrations/notify/ ）
- **【推断】** HA 的"主动性"是**用户自己写的规则**（trigger / condition / action），不是 agent 的主动性；它对本文的价值只有一条：把"同一条主动行为不要叠着跑"做成了内建的枚举语义。
- **未能证实**：HA core 里有没有"静默时段 / 免打扰"这个一等概念——本次抓取的两页里没有；我**没有**抓 companion app 的通知文档，所以记为未能证实，正文不据此下结论。

### 3.5 AutoGPT（`Significant-Gravitas/AutoGPT`）——反面教材 + 一个意外

**版本基线**：`master`（pushed 2026-10-18T00:04:19Z）；187,630★；创建 2023-03-16。

- **[documented] classic 是官方标注的停维实验**：`classic/README.md` 原文——「**This project is unsupported, and dependencies will not be updated.** It was an experiment that has concluded its initial research phase.」「referring to this codebase for **educational purposes only**.」
  （https://github.com/Significant-Gravitas/AutoGPT/blob/master/classic/README.md ）
- **[affordance]** 全树 10,752 条路径里 **`continuous` 零命中**——曾经最有名的"主动性"形态（连续自主循环）在仓库里连路径都没剩下。
- **[affordance] 平台版换了一套答案，而且是每用户一条云 cron**：
  - `autogpt_platform/backend/backend/copilot/dream/scheduling.py`（437 行）：APScheduler 按用户注册 `community_rebuild_{user_id}`（周日 **04:00 用户本地时间**）与 `dream_nightly_batch_{user_id}`（每日 **03:00 用户本地时间**）。
  - **三重开关门**："1. Registration helper (this file) — cheapest gate; LD flag check runs before the Redis CAS-style dedup… 2. Scheduler `@expose` body — defense-in-depth for direct callers… 3. Execution wrapper — runtime gate; if the flag flips off after registration, the scheduled job still fires but short-circuits before the body runs."
  - **时区漂移补偿**（值得记下的教训）："APScheduler binds the cron trigger to the timezone at job-creation time — **a later `User.timezone` change silently leaves the cron firing at the old local time.**" 解法：Redis 去重键里存注册时的时区，每次比对，不一致就 `replace_existing=True` 重注册。
  - `copilot/briefing/scheduling.py`（219 行）：单作业 `morning_briefing_{user_id}`，每日用户本地时间；**这个 helper 跑在每个聊天 turn 上**（"Hot-path cost"），所以先查进程内缓存的 flag、再靠 Redis 标记短路，只有标记过期后的第一次调用才付一次时区查询 + 调度器 RPC；失败只记 WARN 并吞掉（"must never raise"）。
  （https://github.com/Significant-Gravitas/AutoGPT/tree/master/autogpt_platform/backend/backend/copilot ）
- **【推断】** AutoGPT 走的是和 Hermes/OpenClaw 相反的路：把"主动性"做成**每用户一条云 cron 行**，代价是 APScheduler + Redis + LaunchDarkly + Postgres + 一整套时区漂移处理。对"纯本地、单用户、窄场景"来说这是最不该抄的一档。

### 3.6 一个值得记下的收敛信号

**[affordance/documented]** 四个互不相关的项目独立走到了同一个位置：**后台 fork 一个 agent 去固化记忆/技能，且绝不打扰主对话**——Hermes `agent/background_review.py`（"the main conversation and prompt cache are never touched"）+ `cron/curator`；OpenClaw `memory-core` 的 dreaming（"without interrupting your active work" 的 Diaries 与三阶段）；Letta dreaming（"without interrupting your active work"，后台 subagent）；AutoGPT `copilot/dream`。

**【推断】** 这不是巧合，而是这个问题的稳定解：**主对话是稀缺资源，固化/整理是富余工作**。另一个共同点是三家都**刻意把"非交互来源"排除出固化语料**（Hermes `skip_memory=True`；OpenClaw "Cron, heartbeat, subagent, and unknown sessions stay out of durable candidate ingestion"）——防止自己喂自己。

---

## 四、可搬运清单（含"不搬"的理由）

### 4.1 可原样搬（对"窄场景 + 简单交互 + 本地文件"成立）

| 编号 | 机制 | 出处 | 解决什么问题 | 代价 |
|---|---|---|---|---|
| **M1** | **变化门**：巡检先跑便宜的判定，只有"和上次不一样"才叫醒模型 | OpenClaw `trigger.script` + `trigger.state`（state 上限 16KB）；Hermes 预检脚本 `{"wakeAgent": false}` | 主动巡检的真实成本不是调度，是**叫醒模型**；没有变化门，5 分钟一次巡检就是 5 分钟一次的纯烧钱 | 每条巡检要写一小段判定；状态文件必须有上限、必须能"坏了就重建"；OpenClaw 的 16KB cap 是个好默认 |
| **M2** | **静默标记 + 显式"别造活"指令**：无事时回一个约定标记，宿主端就是不投递 | Hermes `[SILENT]`（**成功才可静默，失败一律投递**）；OpenClaw `NO_REPLY`（含 ≥4 字符前缀容错）+ 默认提示词里那句 "Do not infer or repeat old tasks from prior chats" | 主动产出退化成噪音 | 几乎为零。**但必须同时定"失败一律投递"的例外**，否则静默会吞掉故障——这是两家都写进文档的对称设计 |
| **M3** | **建议而非代劳**：产出"可以替你做的作业规格"，用户一键接受才创建；`dedup_key` 记住已忽略就永不再提；待处理上限防成唠叨墙 | Hermes `cron/suggestions.py`（`MAX_PENDING = 5`，"nothing auto-creates (consent-first)"）+ `cron/suggestion_catalog.py` 四条内置目录 | 窄场景里助手最该说的是"我还能替你做什么"，而不是直接做；同时给了用户一个低成本的"不" | 需要一个建议的存储 + 一个接受入口。**入口本身就是本仓的简单交互面**（受理位/卡片），不是额外负担 |
| **M4** | **空闲触发而非钟表触发**：养护/整理类工作在"会话启动 + 距上次够久 + 人真的空闲够久"时才动 | Hermes curator（`interval_hours` 7d + `min_idle_hours` 2h，检查点 = CLI 会话启动 / gateway 家务 / 维护定时器） | 这类工作不需要准时，只需要别在人干活时做 | 需要一个"最近活动时间"的读法。**必抄的一个细节**：curator 第一次运行把 `last_run_at` 种成"现在"、把首次真正的 pass 推迟整整一个 interval，让人先看一眼再让它动手 |
| **M5** | **git 就是回退机制，并显式维护"什么不进仓库"的清单** | OpenClaw 官方推荐 workspace 进私有 git 仓，并逐条列出不该提交的 SQLite/凭据/managed skills；Letta MemFS 把记忆本身做成 git 仓（"Edits are local until committed and pushed, at which point they become the agent's memory everywhere"） | 自改进写坏了要能退 | 对本仓几乎为零（已经是纯文件 + git）。**但那份"不进仓"清单是必需的**，否则状态文件（M1 的判定状态、运行台账）会和记忆文件互相污染 |
| **M6** | **记忆分层：根文件常驻，带自己索引的子目录不进上下文，直到被读** | Letta MemFS：「Files at the memory root are loaded into the agent's system prompt on every turn… Directories with their own `MEMORY.md` index stay out of context until they are needed… This keeps the active context lean」 | 常驻上下文有界这条硬约束的正解 | 需要一份根索引 + 一个"按 signpost 去读"的习惯；本仓 `memory/` 房间已接近这个形状，**差额只是"显式的根索引"这一件** |
| **M7** | **同一条主动行为的并发模式**：single（默认，重入即忽略并记警告）/ queued / restart / parallel | Home Assistant automation modes | 上一轮巡检还没跑完，下一轮又到了 | 一个枚举 + 一处判断。HA 的默认值是 `single` + 记警告，值得照抄默认 |

### 4.2 改造后可搬

| 编号 | 机制 | 出处 | 改造点 |
|---|---|---|---|
| **M8** | **节律自定速**：作业给一个 min/max 边界，运行中的 agent 可以**提议**下次何时再看，宿主侧静默 clamp | OpenClaw `pacing.min`/`pacing.max` + `automations` 工具 `action: "next_check"`；`/loop` 省略 interval 时在 1 分钟–1 小时之间自定速 | **边界必须由宿主写死**（本仓的"简单交互"意味着模型只提议、不改频率）；照抄它对失败路径的处理：**失败、超时、跳过的 run 丢弃提议**，否则一次失败会把下次检查推得莫名其妙 |
| **M9** | **心跳重新锚定而非积压**：忙时/停机错过多个间隔，只给**一次**，计时器每次触发后重锚 | Hermes `/heartbeat`「Missed ticks coalesce … you get **one** heartbeat turn, not a backlog」；cron 侧 `cron.catch_up_missed` 默认 true（重启后只补一次） | 本仓没有常驻进程，"节拍"要改成"打开时的补一次"。**这条是防雪崩的关键**，直接抄语义 |
| **M10** | **预检失败不烧钱**：运行前校验配置能否产出成功结果，不合法就只投一次告警、完全不发 LLM 调用 | Hermes `cron.preflight`（`last_status = blocked_config`，"ONE alert is delivered (it is not repeated every tick), and **no LLM call is made**"） | 窄场景下配置错误主要来自"数据源没接上"；把这条做成"M1 变化门之前的一道门"即可 |

### 4.3 明确**不**搬

| 编号 | 不搬的东西 | 出处 | 为什么不搬 |
|---|---|---|---|
| **N1** | **Gateway / daemon 常驻 + 多 profile 多路复用 + 平台适配器投递面** | Hermes gateway（"Cron execution is handled by the gateway daemon"、"**The gateway must be running**"；`cron/scheduler_gateway_gate.py` 在没有 gateway 拥有该 home 时**跳过** agent 作业）；OpenClaw gateway + channels；Khoj 的邮件投递（自托管要 Resend） | 本仓硬约束是**严格本地、不做 IM**。引入常驻网关后，"主动"就变成"必须有个服务在线"，运维面、凭据面、故障面全部翻倍；而窄场景里"用户下次打开助手时看到"与"此刻推一条消息"的价值差，远小于这堆代价。**反向证据也在 Hermes 自己身上**：它把状态放在 gateway 的 tick 上，于是必须同时维护 tick lock、多 profile scope、headless 拒绝策略、外部 worker 自举——13KB 不变量清单里大半是这一条的利息 |
| **N2** | **把记忆/技能沉淀放进 SQLite 或向量库** | Hermes `~/.hermes/state.db`（全会话 + FTS5）、`cron/executions.db`、心跳状态在 `SessionDB.state_meta`；OpenClaw dreaming 的 recall store / rewrite preimages / 迁移状态在 `openclaw.sqlite` 与 `openclaw-agent.sqlite`（workspace 文档**明说**这些不该进 git）；Khoj 的服务端库 | 直接违反本仓三条硬约束（人可读纯文件、可 git 回退、无 SQLite/FTS 强制）。**而且利息是可见的**：OpenClaw 不得不额外维护"哪些状态在 SQLite、因此不能跟 workspace 一起备份"的清单，dreaming 还要单独处理 artifact repair / dangling entry / 崩溃后的下一次夜间修复。**Letta 给了反例答案**：默认无向量索引，用普通文件搜索与读取就好。→ 【推断】本仓若要索引，应做成**可重建的纯文本派生索引**（可丢、可 gitignore、坏了就重建），绝不作为唯一真相源 |
| **N3** | **`cron.allow_agent_scheduling`（让 agent 自己排自己的班）** | Hermes 同名字段，**默认 false**；开了才有"cron librarian 作业整理整张表"这类形态 | 窄场景下"助手给自己排班"会让"它今天为什么做了这个"变得不可解释；Hermes 自己把默认设成 false 也说明这是危险档。**可搬的是它的替代方案** = M3（建议 + 用户一键接受）。另注：Hermes 连"cron 运行里的会话不能递归建 cron"都默认挡掉了 |
| **N4** | **按用户注册云 cron 行 + 功能位 + Redis 去重 + 时区漂移补偿**（整台机械结构） | AutoGPT `copilot/dream/scheduling.py`、`copilot/briefing/scheduling.py` | 那是多租户云服务的解法；本仓是单机单用户纯本地，这套结构 100% 是纯开销。**但要从它身上搬走一条教训**：APScheduler 在创建时绑定时区，用户改时区后任务会**静默留在旧本地时间**——本仓只要用本地时间 + 一个显式的时区字段，就不会有这个 bug |

---

## 五、未能证实清单

1. **GitHub 网页/raw 通道不可达**：`raw.githubusercontent.com` 直接 `curl: (35) Recv failure: Connection reset by peer`；`github.com/<...>/blob/...` 30 秒超时。全部源码与文档正文经 `api.github.com` contents API（带 `?ref=<sha>`）读取；文中 blob URL 是同 path@sha 的规范引用形式，**我本人没有在浏览器里渲染过**。Hermes 官方文档站可直连（HTTP 200），有对应页时已并列给出。
2. **Hermes 无 dreaming / sleep-time / curiosity**：这是**否定性结论**，按全树 21,460 条路径的 `dream*`/`curio*`/`sleeptime*` 零命中得出，**不是**文档明文否认；我没有通读 Hermes 全部源码来排除"用别的名字实现了同类东西"。
3. **Hermes 的静默时段 / 免打扰窗口、投递预算（每日上限）**：在本次抓取的 8 个文档页（heartbeat / cron / automate-with-cron / daily-briefing-bot / configuration / memory / skills / cron-internals）与 heartbeat/cron/curator 相关源码中**未见一等概念**。我没有通读 511 个文档页，所以只能说"未能证实其存在"，**不能**说"它没有"。
4. **Hermes 心跳的配置面未获源码复核**：`cli-config.yaml.example`（2352 行）里只有 `cron:` 一个键 `catch_up_missed`，没有 heartbeat 块；heartbeat 的键名与默认值全部取自功能文档，未定位其 config schema 定义文件。
5. **Hermes 的 `goals` / `loops` / `hooks` / `kanban-multi-gateway` 四个文档页未深读**（`hooks.md` 有 130KB）；它们在"主动性"里的位置只能记作未评估，本文未据其下任何结论。
6. **Home Assistant 的"静默时段 / 免打扰"**：未在 Home Assistant 文档的 automation modes 与 notify 集成两页中找到一等概念；我**没有**抓 companion app 的通知文档，故记为未能证实，正文未据此下结论。HA 的"主动性 = 用户自写规则"这一条是【推断】，基于它文档里给出的 trigger/condition/action 形状，不是文档明说。
7. **Letta 的旧 MemGPT 论文期结论未核**：OpenClaw 文档称其 dreaming「is informed by sleep-time compute (arXiv:2504.13171)」并引"Generative Agents"的记忆框架——**这是 OpenClaw 的说法**，我没有读这两篇论文原文。`letta-ai/letta` 主仓 `main` 只剩 15 个文件（README 指向 `letta-ai/letta-code`，V1 API server 在 `archive` 分支）；我读的是 `letta-code` 的树与 `docs.letta.com`，未核 `archive` 分支的历史实现。
8. **Khoj 的自动化服务端机制未取得一手描述**：其 automations 文档只有 14 行，未说明调度器、存储位置、并发语义或静默/预算；我只掌握了"定时跑查询 + 邮件投递 + 自托管需 Resend"三点。
9. **"上手难度"读数没有任何一手用户研究支持**：本文只给**可指认的结构性代价**（配置页数/节数、概念数、必须自备的外部件、"不跑 gateway 就没有主动性"这类硬门槛）。**把"上手难"换算成时间、放弃率或学习曲线的说法，本文一条都没有**，也不应从上述结构性代价推出使用效果。
10. **本文未验证任何机制的实际使用效果**：所有"H1–H8 / M1–M10"都是**机制的接口与文档事实**。它们在本仓窄场景下"是否真的有用、会不会真的不吵"，需要在真机走查里用本仓自己的证据面判（首用闭环探针 / 桌面走查 / 输入边界观察），本文不替代那一步。
