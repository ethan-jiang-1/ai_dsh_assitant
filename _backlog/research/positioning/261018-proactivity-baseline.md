---
topic: 定位
intent: "把本仓今天已有的主动性机制、用户手上的开关、历史拍过的立场与未验证读数收成一张事实表，给下一步『借鉴外部主动性机制』的呈批卡当依据。"
---

# 主动性现状 + 历史摩擦证据（事实表）

> 立档：2026-10-18 ｜ 用途：下一步「借鉴外部主动性机制」的呈批卡取用 ｜ 本档**只收事实与出处，不含方案**；判断标【推断】。
> 坐标：`packages/dsh-smart-assistant/`（本包）与钉住的 `vendor/dsh/`（tag `dsh-v0.2.0-rc.2`，[package-catalog.md:79](../../../docs/package-catalog.md)）。
> 引用路径除写明 `vendor/dsh/` 外，均在包内。摘句只为定位，正文以原文件为准。

## 〇、读法（四个词，先对齐再读下面的表）

- **桌面 / 抽屉**：本仓自己的比喻。"桌面" = 常驻提示词段落（身份 + 手册 + 有界摘要 + 账本段），"抽屉" = 按需查询面（工具 + 检索）= [home.md:117-136](../../../docs/home.md#L117-L136)、[home.md:40-44](../../../docs/home.md#L40-L44)。
- **节拍器**：host 侧按 goal 轮数自动插入养护 turn 的机制（第 1 条），与"模型自己想起来要 curate"是两层 = [home.md:185-187](../../../docs/home.md#L185-L187)。
- **提案槽**：goal 完成时自动排的一条 propose-only turn（第 2 条）——"排"是自动的，"落地"永远是人 = [home.md:113-115](../../../docs/home.md#L113-L115)。
- **"花钱"**：本档只判"是否走一次模型回合"（有 token 成本），不判成本高低；第 1–4 条都是模型回合，第 5–8 条是机械刷新。

## 一、今天"没人开口也会发生"的事

八条。前四条是"会走模型回合"的（花钱），其余是机械刷新（不调模型）。
「能调什么工具」一栏：前三条与第四条都是**普通模型回合**，会话里的全工具面（五个自有工具 + `session_query` 族 + `schedule_*` + 技能等）都在场，没有按来源收窄。

| # | 触发者 | 频率 / 条件 | 能看到什么上下文 | 能调什么工具 | 用户在哪感知到它 | 花钱 |
|---|---|---|---|---|---|---|
| 1 | host 节拍器（本包） | 每个 goal 的第 N 轮（N 默认 5；`0` 关闭） | 该会话全部上下文 + 家手册 + 摘要 + 账本段 | 全工具面 | 该会话时间线里多一条非本人消息（context/waking 行）；**其它任何面都没有它** | 是一次模型回合 |
| 2 | 提案槽（本包） | 每次 goal `complete`（默认开，可关） | 同上 | 全工具面（指示只 propose） | 同上；产物（`skill-proposals/<name>.md`）要人自己去看 | 是一次模型回合 |
| 3 | goal 自动续跑（平台） | goal 处于 active 且 continuation 处于 armed，直到轮数上限（默认 256） | 同上 | 全工具面 | 会话时间线里的 `<goal_round>` 行 + goal 卡 | 每一轮都是一次模型回合 |
| 4 | 到期排程投递（vendor schedule） | 到点（六种时间形态）；重启后仍投递 | 原会话上下文 | 全工具面 | 原会话时间线里多一条 `schedule` 源消息（context/waking 行）；会话头/任务页另有标记与历史 | 是一次模型回合 |
| 5 | 摘要刷新（本包） | 每次房间写入触发重算（后台）+ 进程启动预热 | 四房间全量（记忆/线索/知识签树） | 不调工具（纯渲染） | **看不见摘要本身**（它是常驻提示词段落）；房间内容在右栏两间面板可见 | 否 |
| 6 | 桌面投影轮询（client） | 每 30s，且页面可见 + 桌面面板打开 | 经营账本投影 HTTP 只读端点 | 不调（HTTP GET） | 桌面数字自己变新，无提示 | 否 |
| 7 | 房间数据读回轮询（client） | 只在**本人点过**「刷新」之后，每 10s，最多 15 次 | 工作区 `.desk/state.json` 生成时间 | 不调（本地文件读） | 房间面板的 DATA GATE 自己解开 | 否 |
| 8 | 首开条 / 批准横幅（client） | 空白会话、或存在待审提案时自动出现 | 房间数据文件 / 待审提案清单 | 不调（点按钮才发指令） | composer 上方那条卡（这是最"主动"的可见面） | 否 |

**逐条出处**

1. **养护节拍器**：监听 `agent/inbox/inserted`，只在来源是 goal 轮（`source.kind === 'goal'`）时计数，命中 `round % N === 0` 就 `agent.followup()` 排一条 turn —— [self-turns.ts:50-83](../../../packages/dsh-smart-assistant/src/host/self-turns.ts#L50-L83)（判据 `isMaintenanceRound`、间隔 `DEFAULT_MAINTENANCE_EVERY_ROUNDS = 5` = [metronome.ts:17-26](../../../packages/dsh-smart-assistant/src/domain/home/metronome.ts#L17-L26)）。这条 turn 的正文指示加载 `home-curation` 技能并跑 curate、逐条处置发现项 = [metronome.ts:29-38](../../../packages/dsh-smart-assistant/src/domain/home/metronome.ts#L29-L38)。配置键 `maintenanceEveryRounds`（默认 5，最小 0 = 关）= [host/index.ts:105](../../../packages/dsh-smart-assistant/src/host/index.ts#L105)；**出厂 patch 没有覆盖它**（`assistant-memory` 行只覆盖 `digestMaxBytes`/`recallLimit`/`staleResearchDays` = [cordis.patch.yml:26-28](../../../packages/dsh-smart-assistant/cordis.patch.yml#L26-L28)）→ 要改只能改部署层 YAML。合同描述 = [home.md:185-187](../../../docs/home.md#L185-L187)。
2. **提案槽**：`goal/changed` 的 `complete` 分支排一条 propose-only turn = [self-turns.ts:87-103](../../../packages/dsh-smart-assistant/src/host/self-turns.ts#L87-L103)；正文 = [proposal.ts:119-127](../../../packages/dsh-smart-assistant/src/domain/skills/proposal.ts#L119-L127)（"反射一次，可复用就 propose_skill；没有就一行说没有"）。开关 `goalProposalTurns`（默认 true）= [host/index.ts:106](../../../packages/dsh-smart-assistant/src/host/index.ts#L106)；合同 = [home.md:113-115](../../../docs/home.md#L113-L115)。
3. **goal 自动续跑**：一条长目标跨 turn/重启持久，**自动续跑的轮数上限默认 256**、continuation 权限是进程内而非持久 = [vendor/dsh/packages/goal/goal/README.md:12](../../../vendor/dsh/packages/goal/goal/README.md#L12)；每轮注入的模型可见正文（`<goal_round> Objective … Round: n/max …`）= [goal-round-driver/src/prompt.ts:13-24](../../../vendor/dsh/packages/goal/goal-round-driver/src/prompt.ts#L13-L24)；轮次归属 `GoalMessageSource { goalId, revision, round }` 挂在 `user/message` 事件上 = 同 README:116。**它是第 1 条的底座**：没有活跃 goal 就没有 goal 轮，节拍器不响（[self-turns.ts:59](../../../packages/dsh-smart-assistant/src/host/self-turns.ts#L59)），非 goal 会话只能靠 persona/手册纪律（[self-turns.ts:36-42](../../../packages/dsh-smart-assistant/src/host/self-turns.ts#L36-L42)）。
4. **排程投递**：到期后 `sessionController.resolveAgent(原会话)` → `createUserMessage({ source: { kind: 'schedule' } })` → `agent.followup` → 等 `sessions.flush` 确认持久 = [runtime.ts:104-123](../../../vendor/dsh/packages/schedule/schedule/src/runtime.ts#L104-L123)；任务行独立于会话激活持久化 = [storage.ts:1-8](../../../vendor/dsh/packages/schedule/schedule/src/storage.ts#L1-L8)、绑定形状（`sessionId` 绑原会话，`status` active/inactive）= [storage.ts:36-40](../../../vendor/dsh/packages/schedule/schedule/src/storage.ts#L36-L40)。投递回执只证明进 inbox、不证明模型执行；flush 与任务行是两次写，崩溃可重复投递 = [vendor/dsh/packages/schedule/schedule/README.md:65](../../../vendor/dsh/packages/schedule/schedule/README.md#L65)。本包把它默认挂上 = [cordis.patch.yml:86-90](../../../packages/dsh-smart-assistant/cordis.patch.yml#L86-L90)、[README.md:116-121](../../README.md#L116-L121)。
5. **摘要刷新**：写入后 `touchDigest` 清缓存并后台重算 = [curate-digest.ts:62-68](../../../packages/dsh-smart-assistant/src/host/curate-digest.ts#L62-L68)；段落同步读缓存、冷缓存时先给状态句再后台补 = [curate-digest.ts:95-104](../../../packages/dsh-smart-assistant/src/host/curate-digest.ts#L95-L104)；启动预热 `prewarmHome`（scaffold + 首次 digest）= [curate-digest.ts:110-124](../../../packages/dsh-smart-assistant/src/host/curate-digest.ts#L110-L124)，构造期 fire-and-forget 与 `Service.init` 两处 = [host/index.ts:170](../../../packages/dsh-smart-assistant/src/host/index.ts#L170)、[host/index.ts:245](../../../packages/dsh-smart-assistant/src/host/index.ts#L245)。段落在提示词尾部带 = [memory-digest/index.ts:32-40](../../../packages/dsh-smart-assistant/src/agent/memory-digest/index.ts#L32-L40)。
6. **桌面投影轮询**：`setInterval(..., 30_000)`，页面可见才刷 = [desk-arms.ts:417-427](../../../packages/dsh-smart-assistant/src/client/desk/desk-arms.ts#L417-L427)（注释写明是本人 2026-10-11 的要求："账本可能从任何会话变动，开着桌面不许陈旧"）；另在会话状态变化时刷新 = [:413](../../../packages/dsh-smart-assistant/src/client/desk/desk-arms.ts#L413)。服务端**没有推送**：只有固定只读 GET = [operating.md:48-59](../../../docs/operating.md#L48-L59)。
7. **房间数据读回轮询**：刷新后每 10s 重读，最多 15 次后解锁并放弃 = [room-data-io.ts:370-383](../../../packages/dsh-smart-assistant/src/client/rooms/room-data-io.ts#L370-L383)；链路合同 = [architecture.md:266-269](../../../docs/architecture.md#L266-L269)。
8. **首开条 / 批准横幅**：两个座位都注册在 `conversation.input.dock`（`assistant-first-mile` order -10、`assistant-approval-banner` order -9）= [client/index.ts:293-320](../../../packages/dsh-smart-assistant/src/client/index.ts#L293-L320)；首开条的"空白会话"判据是本包自己的 = [first-mile.ts:26-32](../../../packages/dsh-smart-assistant/src/client/chrome/first-mile.ts#L26-L32)；座位清单 = [package-catalog.md:73](../../../docs/package-catalog.md#L73)。

**边界说明（不算主动性面）**：`time-context` 行按请求注入当前时间/时区 = [cordis.patch.yml:74-75](../../../packages/dsh-smart-assistant/cordis.patch.yml#L74-L75)；自动压缩行在 preset 且 `compaction-basic` 会按 provider/model 路由 = [vendor/dsh/packages/compaction/compaction-basic/src/index.ts:48-56](../../../vendor/dsh/packages/compaction/compaction-basic/src/index.ts#L48-L56) ——【推断】两者都由"本次请求的组装/压力"触发，不是无人值守的开口面。

## 二、用户手上的主动性开关清单

**A. 定时（vendor `schedule_*` 四件，全部是工具，不是 UI 表单）**

| 工具 | 参数 | 语义要点 |
|---|---|---|
| `schedule_create` | `prompt`(必填)、`title`(必填，≤ `MAX_TITLE_LENGTH`)；**六个时间参数只能给一个**：`after_seconds`、`at`（RFC3339 或 date+time+IANA tz）、`every_seconds`（≥ 下限，按创建时刻对齐）、`daily{time,time_zone}`、`weekly{time,time_zone,weekdays}`、`cron{expression,time_zone}` | 建在**当前会话**；不存在的本地时刻跳过、重复时刻只发早的那次；宕机后只补最近一次错过的 occurrence；崩溃可重复投递 |
| `schedule_list` | 无 | 只列**当前会话**的 active 任务 |
| `schedule_delete` | `id` | 任务可 active/inactive 都删；**不撤回已入队的消息** |
| `schedule_update` | `id`、可选 `title`/`prompt`、最多一个新时间参数 | 就地改、保留 id；改相对延时只能重建；冲突报错不覆盖 |

出处：[index.ts:450-575](../../../vendor/dsh/packages/schedule/tool-schedule/src/index.ts#L450-L575)（四件注册与参数）、[:372-400](../../../vendor/dsh/packages/schedule/tool-schedule/src/index.ts#L372-L400)（六种时间参数）、[:183-205](../../../vendor/dsh/packages/schedule/tool-schedule/src/index.ts#L183-L205)（四条 description 原文）。
注：本仓 [README.md:117-118](../../README.md#L117-L118) 只写了"`prompt`+`title` 必填、`after_seconds` 延时秒"——**实际参数面比这宽**（六种时间形态，如上）。

**用户能在界面上做什么（vendor `ui-schedule`，本包挂上）**：任务管理主页（`main` 座位）、右栏任务 tab、侧栏面板入口、会话头部的本会话任务列表、会话行标记与悬浮、创建卡（挂在产生它的回合尾部）、删除 toast、投递历史 = [ui-schedule/src/client/index.ts:112-219](../../../vendor/dsh/packages/client/ui-schedule/src/client/index.ts#L112-L219)；**页面没有创建表单**（"a new reminder starts in a Session"）= 同文件 [:174](../../../vendor/dsh/packages/client/ui-schedule/src/client/index.ts#L174)。

**缺什么（逐项，均以本轮读码为准）**

- **能不能命名**：能，`title` 必填（[index.ts:464-469](../../../vendor/dsh/packages/schedule/tool-schedule/src/index.ts#L464-L469)）；没有重名约束、没有分组/标签。
- **能不能暂停**：**不能**。全库没有 pause/resume/quiet 概念（本轮 grep `pause|resume|silent|quiet` 在 schedule 包内只命中一句无关注释），只有 `active`/`inactive` 两态 + 删除（[storage.ts:36-40](../../../vendor/dsh/packages/schedule/schedule/src/storage.ts#L36-L40)）。
- **能不能限定房间/线索**：不能。任务绑 `sessionId`（原会话），不绑事项、不绑房间、不绑业务线索；`schedule_list` 也只看本会话。
- **能不能设静默时段**：不能。没有任何时段门、投递预算或频率闸（对比：生态先例 `dsh-proactive` 有静默时段 + 每日投递预算，[261005-open-value-deficit.md:198-200](../../_archive/settled_issues/261005-open-value-deficit.md#L198-L200)）。
- **能不能看"它正在盯什么"**：**部分能**——vendor 任务页/会话头能看到排程（上文），但本插件自己的唯一「桌面」（经营账本投影）里**没有排程行**：投影只有 matters/evidence/proposals 与待认领片段（[projection.ts:53-115](../../../packages/dsh-smart-assistant/src/domain/operating/projection.ts#L53-L115)、[operating.md:85-87](../../../docs/operating.md#L85-L87)）；节拍器与 curate **任何界面都没有**。
- **谁能开**：只有模型。本包代码里**没有一处**调用 `schedule_create` 或排程服务——排程只能由一次模型回合按技能/手册去建（手册纪律 = [home-map.ts:84-89](../../../packages/dsh-smart-assistant/src/domain/home/home-map.ts#L84-L89)；技能 = [desk-daily-brief/SKILL.md:15-21](../../../packages/dsh-smart-assistant/presets/assistant/skills/desk-daily-brief/SKILL.md#L15-L21) 的 `every`=86400s 常态排程、[morning-brief/SKILL.md:16-24](../../../packages/dsh-smart-assistant/presets/assistant/skills/morning-brief/SKILL.md#L16-L24) 的"承诺即排程"、[morning-brief/SKILL.md:76](../../../packages/dsh-smart-assistant/presets/assistant/skills/morning-brief/SKILL.md#L76) 的每周一对账）。出厂**不带任何默认排程**：[README.md:116-121](../../README.md#L116-L121) 只说"`schedule_create` 即可建首个养护或提醒任务"。
- **web-only 边界**：纯 headless 组合里四个 `schedule_*` 永不注册 = [desk-daily-brief note:35](../../../notes/implemented/2026-10-10-desk-daily-brief.md#L35)、[vendor/dsh/packages/schedule/schedule/README.md:26](../../../vendor/dsh/packages/schedule/schedule/README.md#L26)。

**B. goal（主动性总闸）**：`create_goal`（`objective` 必填 + 可选 `max_goal_rounds`）/[`get_goal`]/`update_goal`（`edit`/`pause`/`resume`/`complete`/`blocked`）= [tool-goal/src/index.ts:52](../../../vendor/dsh/packages/goal/tool-goal/src/index.ts#L52)、[:209-260](../../../vendor/dsh/packages/goal/tool-goal/src/index.ts#L209-L260)；`pause` 撤销自动续跑、`resume` 重新武装 = [goal/README.md:56-62](../../../vendor/dsh/packages/goal/goal/README.md#L56-L62)；用户另有 `/goal` 斜杠命令 = [command-goal/src/index.ts:192-193](../../../vendor/dsh/packages/goal/command-goal/src/index.ts#L192-L193)。**模型可以自己建 goal**（description："keeps this session working across automatic continuation rounds"）= tool-goal/src/index.ts:52。
说明：`maintenanceEveryRounds`/`goalProposalTurns` 是 host 行 Config，只有默认值（[host/index.ts:102-106](../../../packages/dsh-smart-assistant/src/host/index.ts#L102-L106)），出厂 patch 未暴露给用户；`assistant_memory action=curate` 是模型工具动词、**没有 UI 按钮**（[package-catalog.md:60](../../../docs/package-catalog.md#L60)）。

**C. 观察仪器（开发者侧，不是产品开关）**：`pnpm observe --home <dir>`（A/B/C 读数）= [261011-input-observation.md:9](../usage/261011-input-observation.md#L9)；每周快照由 agent 扫读数档补摘，**刻意不进产品挂排程**（否则产品自己在观察环境里发消息，污染 A/C 两项）= [261007-input-boundary.md:25](../../_archive/settled_issues/261007-input-boundary.md#L25)、[triggers.md:25](../../triggers.md#L25)。

## 三、历史拍板过的立场（摘句 + 出处）

只摘与"主动性/自动开口/对外触达/预算/治理"直接相关的结论句；每条的完整推敲过程在原卡，本档不复述。

1. **"更新与主动性授权"（已确认"采用这套权限"）**：明确指令直接执行；模型推断的承诺/核对点/完成/放弃变化**待确认**；普通材料自动留存、模糊归属待认领；**提醒只按本案明确委托的核对点/已确认条件触发，不预设固定节律、不回复即升级** = [261008-ceo-operating-loop.md:267](../../_archive/settled_issues/261008-ceo-operating-loop.md#L267)；逐动作权限表同卡 [:204-210](../../_archive/settled_issues/261008-ceo-operating-loop.md#L204-L210)（对外动作只草拟、经验只提议、不新增自动启用权限）。
2. **对外与触达**：立场=辅助本人，对外内容由他过目、不代他出面；交互面只在 DSH 自己的 Web/Desktop，**不做 IM** = [README.md:12-15](../../README.md#L12-L15)、O6 = [README.md:31](../../README.md#L31)；不接外部数据源/不做 IM 的边界见 [261007-input-boundary.md:58](../../_archive/settled_issues/261007-input-boundary.md#L58)。
3. **主动性输出必须先答四问**：什么变了；为什么现在值得你关注；建议怎么做或还缺什么；你是否必须介入 = [261008:121](../../_archive/settled_issues/261008-ceo-operating-loop.md#L121)。
4. **主动性的形态口径**：晨报/巡检/催收做成**可见可开关的例行清单**（Martin Background Tasks、Lindy built-in routines 形态），**不做隐藏魔法**；节奏随真实事件顺延（防"狼来了"疲劳）；v1 最小主动数据集 = 行动表 due + 待拍板 + 缺的数 = [261005-open-value-deficit.md:260-263](../../_archive/settled_issues/261005-open-value-deficit.md#L260-L263)。不做清单：不做 IM 触达、**不做新闻聚合简报**（那是 heartbeat/闲聊型）= 同卡 [:182-183](../../_archive/settled_issues/261005-open-value-deficit.md#L182-L183)。
5. **净化自己 vs 进化懂你**：净化自己（重复/断链/预算）**继续默跑、零 UX、零卖点**；净化"你俩的事实底账"才报（一句话级，涉主人口径只提请不擅断）= [261005:216-219](../../_archive/settled_issues/261005-open-value-deficit.md#L216-L219)。
6. **节律立场**：CEO 与它的自然关系不是"聊天对象"，是"**每周一坐 15 分钟的随员**（批量拍板）+ 遇事立刻问的军师"；"打开频率低"因此从缺陷变成设计前提 = [261005:151-152](../../_archive/settled_issues/261005-open-value-deficit.md#L151-L152)。
7. **生态先例的借用方式**：`dsh-proactive`（host 级主动唤醒/静默门/投递预算）、`dsh-heartbeat`（心跳简报，能否开口由代码规则 + agent 判断双层把关）、`dsh-morning-paper`（报纸式视图，**零 token、从不调模型**）——只借思路不装包 = [261005:198-200](../../_archive/settled_issues/261005-open-value-deficit.md#L198-L200)（硬规则 7）。
8. **推送式主动生成被否**：`host` 不经模型回合直接生成简报 = 输掉的方案（绕开"模型无值班面"，也违反"简报是可回复的会话回合"的请示闭环）= [desk-daily-brief note:30](../../../notes/implemented/2026-10-10-desk-daily-brief.md#L30)。
9. **自动后台复盘延后**：触发条件 = 有真实使用数据说明"每会话复盘"的收益大于 token 代价与同意成本 = [architecture.md:186](../../../docs/architecture.md#L186)。
10. **全自动蒸馏维持延后**（判据不变：用量统计显示收益>成本）= [home.md:114-115](../../../docs/home.md#L114-L115)。
11. **预算闸门**：摘要预算吃紧只在"记忆行本身被挤下桌面"时拒绝纯新增；线索/签树被挤只报 finding 不堵记忆写入 = [home.md:127-128](../../../docs/home.md#L127-L128)；降级顺序**永不静默**、状态栏（地图）永不被驱逐 = [home.md:176-179](../../../docs/home.md#L176-L179)。
12. **治理面全部人工**：提案 propose-only、审批靠人改文件 status、`land_skill` 只接受 approved；goal 完成自动排的提案槽也只 propose = [home.md:105-115](../../../docs/home.md#L105-L115)。
13. **权限三分（账本）**：普通进展自动留存；确认性变化只走本人明确指示；推断的重大变化只走提案 = [operating.md:40](../../../docs/operating.md#L40)。

## 四、已知摩擦与未验证假设

**输入边界 30 天观察：读数档里只有基线与干跑，实测该环境 0 会话 —— 观察实际未启动。**

| 读数块 | 时间 | 内容 | 能不能当读数用 |
|---|---|---|---|
| 基线 | 2026-10-11 15:54 | 会话 0 / 本人轮次 0 / `[面板]` 0 / 注入前言 0（三项全空） | 是第 0 天的正确形态，但**不含任何观察** |
| 干跑（旧 `dev/trial-home`） | 2026-10-11 15:52 | 会话 4 / 本人轮次 2 / 面板标记 9 / 注入前言 13 / 9 次入口含 1 次零工具调用 | **不是基线**，只证明读数命令算得对 |
| 观察期新行 | — | **未见读数**（档内此后再无新行） | — |

- 读数档现状：基线（2026-10-11 15:54，**三项全空**）之后是同日旧 home 干跑，**此后再无新行** = [261011-input-observation.md:40-95](../usage/261011-input-observation.md#L40-L95)。补摘触发条件（最后一行读数 >7 天）在 2026-10-18 正好到期 = [triggers.md:25](../../triggers.md#L25)。
- **本档实测（2026-10-18）**：`dev/trial-home-30d/` 下没有会话目录（`session.v*.jsonl*` 日志 **0 个**）；`dev/trial-home-30d/storages/workspace.json` 的 `workspaceIds: []`（无 workspace 注册）；`assistant/` 四房间只有 scaffold 的 `SOUL.md`/`AGENTS.md`，无记忆/线索/知识/提案文件。对照：dev home 有 407 个会话日志、旧 `dev/trial-home` 有 4 个。
- 口径与判读（A 自发投递 / B 账本两段时长 / C 入口后的操作，剔除规则按结构判据）= [261011-input-observation.md:11-21](../usage/261011-input-observation.md#L11-L21)、[261007-input-boundary.md:103-105](../../_archive/settled_issues/261007-input-boundary.md#L103-L105)；重新讨论条件 = "30 天读数落账"（[261007:121](../../_archive/settled_issues/261007-input-boundary.md#L121)）。
- 【推断】"第 0 天 = 首条真人会话"（[261011-input-observation.md:51-52](../usage/261011-input-observation.md#L51-L52)）从未发生，所以 30 天窗口还没开始走；A/B/C **无任何真人读数**，不能拿它支持或反对任何输入通道候选。
- 干跑（旧 `dev/trial-home`，2026-10-01~05，**不是基线**）读到的旧信号：本人轮次 2、`[面板]` 标记 9、注入前言 13、9 次入口里 **1 次零工具调用**；并按结构判据纠正了"按文本前缀判会把 9 条机器消息 + 13 条注入前言算成本人的话" = [261011-input-observation.md:68-95](../usage/261011-input-observation.md#L68-L95)。这是口径校准证据，不是产品结论。
- 观察只能辅助选形态，**不能证明长期价值**；读数缺失须如实说"重新讨论条件尚未满足" = [261007:125-126](../../_archive/settled_issues/261007-input-boundary.md#L125-L126)。

**其余明确记为"待验证/未取/未证实"的条目**

- 晨报：机器面已收口（真模型 web 探针 `passed: true`，含四个 `schedule_*` 前置断言），但**口味面（真实节奏与话术负担）本人未取**，该行保留为本人验收面、"不记为通过" = [desk-daily-brief note:20-25](../../../notes/implemented/2026-10-10-desk-daily-brief.md#L20-L25)。
- 处理流体验裁决：2026-10-11 本人裁决"先挂着，等本人实际使用时再判"；2026-10-16 毕业但该行**保留为本人验收面、不记为通过** = [desk-operating-entry note:41](../../../notes/implemented/2026-10-06-desk-operating-entry.md#L41)。
- 桌面主对象化的真人读数：按用户铁律**无限期后置** = [desk-primary-view note:3](../../../notes/archived/2026-10-06-desk-primary-view.md#L3)。
- 接续：「首个技术切片**不证明** Agent 每次都遵从该提示，也**不证明**自然事项中有净价值」= [operating-continuity-readback note:11](../../../notes/implemented/2026-10-13-operating-continuity-readback.md#L11)；重看触发 = 本人真实使用中出现一件跨 ≥2 会话或日期的事项，或本人点名 = 同 note [:37-42](../../../notes/implemented/2026-10-13-operating-continuity-readback.md#L37-L42)；该 note 还留了一条自我更正（"3 files，64 tests"的绿不成立，测试生来就红）= [:28](../../../notes/implemented/2026-10-13-operating-continuity-readback.md#L28)。
- 全量 `pnpm eval` 现状：7/8 可执行任务通过、1 个 web-only 任务未评估，命令因 `first-open-intake` 失败退出 1 = [operating-continuity-readback note:26](../../../notes/implemented/2026-10-13-operating-continuity-readback.md#L26)。
- 桌面已知缺口（如实记）：滚动位置保留**未实现**；`turnSettled` 客户端不可得；**提醒通道恒 `synced`（V4/V5 未实现，投影 reminders 恒空）**；A2 推荐质量未定版 = [desk-operating-entry note:57](../../../notes/implemented/2026-10-06-desk-operating-entry.md#L57)；"自动周期催办"在该卡的排除项 = 同 note [:58](../../../notes/implemented/2026-10-06-desk-operating-entry.md#L58)。
- 261008 的 V1–V9 验收：**新增资产均未建**，权限/范围的确认"不是模拟或产品价值通过" = [261008:236](../../_archive/settled_issues/261008-ceo-operating-loop.md#L236)、[:262](../../_archive/settled_issues/261008-ceo-operating-loop.md#L262)；提醒协调的故障窗口"故障注入尚未执行，证据不足时不称可靠恢复已成立" = 同卡 [:230](../../_archive/settled_issues/261008-ceo-operating-loop.md#L230)。
- 节拍器 / 提案槽：本档只读到代码与 `tests/agent/maintenance-metronome.spec.ts`、`tests/host/skill-proposals.spec.ts` 这一层断言，**未见真模型端到端探针**；[desk-daily-brief note:35](../../../notes/implemented/2026-10-10-desk-daily-brief.md#L35) 记的先例（BUG-008：在托管不了该能力的组合里评分，让笔记记下过不可能出现的 PASS）说明这类"没跑过就当通过"是真踩过的坑。【推断】两条自发 turn 的实际产出质量（是否净收益、是否打断 goal）目前无实测读数。
- **当前在推的切片不算已完成**：`261018-desk-side-capture` 台账（快照 2026-10-18，**活状态以收口卡为准**）= 片 0 落地（余真模型端到端走查）、片 1（1a+1b）落地（余真模型端到端走查）、片 2/3/4 未开始 = [261018 收口卡:26-30](../../_archive/settled_issues/261018-desk-side-capture-closure.md)；它自己是"桌面自己收下一句话从未被裁决"的补裁决 = [proposed 卡:14](../../../notes/implemented/2026-10-18-desk-side-capture.md#L14)，其"账本收件箱"仍被 30 天观察推迟 = [:66](../../../notes/implemented/2026-10-18-desk-side-capture.md#L66)。

## 五、缺口表（只写现状与缺口）

读法：左列 = 外部已有结论里的共性（[261005-external-ux-patterns.md:208-220](261005-external-ux-patterns.md#L208-L220)，本次不重述其证据过程）；中列只写我们**现在有没有**对应物与其落点；**不含方案**。

| 外部普遍做成一等 UI 对象的事 | 我们的对应物 | 现状出处 |
|---|---|---|
| "它正在替我盯什么"的可见清单（Martin Background Tasks / Lindy built-in routines） | **半个**：vendor 任务管理页 + 会话头能列排程；但本插件唯一的「桌面」（账本投影）不含排程，节拍器与 curate **无任何界面** | [ui-schedule/index.ts:168-184](../../../vendor/dsh/packages/client/ui-schedule/src/client/index.ts#L168-L184)、[projection.ts:53-115](../../../packages/dsh-smart-assistant/src/domain/operating/projection.ts#L53-L115)、[operating.md:85-87](../../../docs/operating.md#L85-L87) |
| 主动性 = 可开关的**任务/模板清单**，用户从清单里挑 | **无**：主动性以散文形式藏在模型用技能与家手册里（`desk-daily-brief`/`morning-brief`/`home-curation`），界面上没有"能开哪些主动服务"的清单；用户建排程只能经对话（vendor 任务页明确没有创建表单） | [package-catalog.md:65-67](../../../docs/package-catalog.md#L65-L67)、[desk-daily-brief/SKILL.md:11-21](../../../packages/dsh-smart-assistant/presets/assistant/skills/desk-daily-brief/SKILL.md#L11-L21)、[ui-schedule/index.ts:174](../../../vendor/dsh/packages/client/ui-schedule/src/client/index.ts#L174) |
| 每项任务独立 toggle、cadence 可调、互动后顺延（防提醒疲劳） | **无**：只有 create/list/update/delete 与 active/inactive；无暂停、无静默时段、无节奏档、无顺延；删除不撤回已入队消息、崩溃可重复投递 | [index.ts:183-205](../../../vendor/dsh/packages/schedule/tool-schedule/src/index.ts#L183-L205)、[storage.ts:36-40](../../../vendor/dsh/packages/schedule/schedule/src/storage.ts#L36-L40)、[schedule/README.md:65](../../../vendor/dsh/packages/schedule/schedule/README.md#L65) |
| 冷启动即接数据源、连完首屏就有内容（或官方示范内容兜底） | **无数据源连接**（数据边界拍板）；兜底是首开条 + 首会话 intake + 示例边界标注（已有结论：我们"两头都弱，需诚实记账"） | [261005:255-259](../../_archive/settled_issues/261005-open-value-deficit.md#L255-L259)、[client/index.ts:293-303](../../../packages/dsh-smart-assistant/src/client/index.ts#L293-L303)、[home-map.ts:104-110](../../../packages/dsh-smart-assistant/src/domain/home/home-map.ts#L104-L110) |
| 出厂就带一份"主动价值"（每日简报/晨间唤醒是默认项） | **无默认排程**：本包代码从不自己建排程，第一条排程要由模型在一次回合里按技能建 | [README.md:116-121](../../README.md#L116-L121)（只写"即可建首个…任务"）；本包 `src/` 无 `schedule_create` 调用点 |
| 决策面（要你拍板的东西）在首屏 | **有**：pending 提案在事项卡上带"等你确认"chip、桌面头部有计数、详情逐条渲染 | [projection-panel.ts:219](../../../packages/dsh-smart-assistant/src/client/projection/projection-panel.ts#L219)、[:373](../../../packages/dsh-smart-assistant/src/client/projection/projection-panel.ts#L373)、[:408-409](../../../packages/dsh-smart-assistant/src/client/projection/projection-panel.ts#L408-L409)、[operating.md:40](../../../docs/operating.md#L40) |
| 主动产出/助手自己的动作有归处 | **缝**：节拍器与提案槽的产物只落在**会话时间线**里（vendor 把非 `user` 源渲染成 context/waking 行），不进桌面投影；skill 提案混在右栏 knowledge 面板里，curate findings 只在会话正文里 | [message.ts:76-92](../../../vendor/dsh/packages/client/ui-chat/src/client/conversation-nodes/message.ts#L76-L92)、[panels.ts:113-125](../../../packages/dsh-smart-assistant/src/client/rooms/panels.ts#L113-L125)、[self-turns.ts:71](../../../packages/dsh-smart-assistant/src/host/self-turns.ts#L71) |
| 主对象不是聊天（聊天是操作层） | **已具备**：独立 main「桌面」（账本投影）是默认入口 | [operating.md:85-87](../../../docs/operating.md#L85-L87)、[architecture.md:248](../../../docs/architecture.md#L248) |

## 六、证据限制清单

1. **只有文档、没有自家实测读数的结论**：主动性形态的口径（可见可开关的例行清单、随事件顺延、最小主动数据集）= 外部调研 + 内部推敲（[261005:246-267](../../_archive/settled_issues/261005-open-value-deficit.md#L246-L267)），**零本机读数**；外部该档自带的局限（JS 重站点抓不到、部分模式未找到一手来源）= [261005-external-ux-patterns.md:224-227](261005-external-ux-patterns.md#L224-L227)。
2. **设计意图未验证**：节拍器与提案槽的实际收益、打断成本、长会话下的 token 代价，无实测；两者的现有证据只到纯核/组合断言层（`tests/agent/maintenance-metronome.spec.ts`、`tests/host/skill-proposals.spec.ts`）。
3. **平台行为未在本机实测**：排程投递→模型回合这条链只读到源码（[runtime.ts:104-123](../../../vendor/dsh/packages/schedule/schedule/src/runtime.ts#L104-L123)）；【推断】它构成一次真模型回合（因此花钱），本轮未测其 token 量或失败率——注意投递回执只确认进 inbox、不确认模型执行（[schedule/README.md:65](../../../vendor/dsh/packages/schedule/schedule/README.md#L65)）。
4. **口味面（唯一真人输入）全部未取**：节奏、话术负担、误催容忍 = [261008:245](../../_archive/settled_issues/261008-ceo-operating-loop.md#L245)（V6 真人列"介入阈值、语气与误催容忍"）、[desk-daily-brief note:25](../../../notes/implemented/2026-10-10-desk-daily-brief.md#L25)、[desk-operating-entry note:41](../../../notes/implemented/2026-10-06-desk-operating-entry.md#L41)。
5. **运行产物一消失，live 证据降为不足**（源码可复跑）= [desk-operating-entry note:59](../../../notes/implemented/2026-10-06-desk-operating-entry.md#L59)；本档引用的 `.tmp/` 证据（如 261018 的 DOM/截图落点）属此类。
6. **UI 形态的读法**：本档对"用户在哪感知到它"的判断来自注册座位与渲染分支（[client/index.ts:293-320](../../../packages/dsh-smart-assistant/src/client/index.ts#L293-L320)、[message.ts:76-92](../../../vendor/dsh/packages/client/ui-chat/src/client/conversation-nodes/message.ts#L76-L92)），非本轮真机截图；具体观感需走查复核。
7. **本档自身的登记义务未做**：[`_backlog/research/README.md`](../README.md) 的索引行（引用卡/间接使用）本轮不得改动其它文件，故未登记；下一步立卡时应同 diff 补上。
8. **外部对照的等级**：本档只引用 [261005-external-ux-patterns.md](261005-external-ux-patterns.md) 已有的结论行，本轮**未复核其一手来源**；该档自标"部分模式未找到一手来源、JS 重站点取不到正文"（同档 :224-227），引用时按它的标注走。
