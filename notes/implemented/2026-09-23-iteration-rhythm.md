# 决策：I14 的"养护空槽"落点（加工 → 空槽 → 打扫）

日期：2026-09-23 · 状态：**已消化（2026-09-24 毕业至 implemented/）——三条归宿：b 层 host 节拍器已实施并 live 实证（切片 1e，`2026-09-24-maintenance-metronome.md`）；a 层 persona 纪律随 preset 在场；c 层手动 /curate 未立案（节拍器 + persona 已覆盖该场景，需要时再提）**

## 问题

I14：加工要步步为营 —— 干一段时间，留一个空槽给"打扫卫生"（跑 `curate`、处理发现项）。
先要弄清 DSH 原生怎么规划迭代：有没有 backlog、加工队列、轮间钩子。

## DSH 原生事实（vendor/dsh @ fb2c4b9，专项调研 + 亲手复核）

**原生有**：

- **goal 续轮机制**（`dsh-goal-round-driver`）：只认 `source.kind==='goal'` 的 user/message 推进
  `roundsStarted`；到 `maxGoalRounds` 自动 block（code `round-limit`）；每轮注入
  `<goal_round>Objective/Round: N/M` 提示（packages/goal/goal-round-driver/src/index.ts:166-192、
  src/prompt.ts:12-25）。
- **轮间让路栅栏**：任何非 goal 消息进 nextTurn inbox 会置 `competingQueued=true`，driver 推迟
  下一轮加工直到该 turn 消费完（goal-round-driver/src/index.ts:296-303、103-109）。
  —— **这就是"空槽"的原生安全位**（必须走 `followup()`/nextTurn；steer 不触发栅栏）。
- **真空闲相**：`agent.runMaintenance()`（packages/core/agent/src/runtime-types.ts:194-202）；
  schedule runtime 是官方给的 idle → maintenance → followup 参考实现
  （packages/schedule/schedule/src/runtime.ts:228-320，"never calls steer()"）。
- **jobs**：进程内长任务（`JobKindMap` 可声明合并扩展），完成通知以 plugin-source 消息回投
  （忙 → 注入 next-step inbox；闲 → followup 唤醒，packages/jobs/tool-jobs/src/index.ts:277-297）。
- **schedule**：session-local 定时提醒（`after/at/every`，下限 300s），到期作为普通 turn 回原会话；
  base 不挂，官方路径是 profile patch（docs/user/guide/schedule.md:3）。

**原生没有**（都是刻意不做）：

- 跨 turn 的持久 backlog / 队列消费 —— schedule 文档明说 "missed intervals do not create a backlog"；
- cron / snooze；goal 轮间没有官方 "between-rounds policy hook"（"每 N 轮插一件事"没有现成开关）。
- **结论**：DSH 的 backlog 语义刻意留给领域插件 —— 本 repo 的 `research/` 房间就是那个 backlog；
  harness 层提供的是轮次、让路、空闲相、回投这些**机制**，不提供**节奏政策**。

## 决策（三层里选 b 为主，a 垫底，c 兜底）

- **(b) host 侧节拍器（推荐，未来的窄切片）**：`assistantMemory` 旁加一个函数插件
  （inject `['agents','goals']`）监听 `goal/changed`，数 `roundsStarted`，每到 N 就对 agent
  `followup()` 一条 `source:{kind:'plugin', plugin:'dsh-smart-assistant'}` 的养护 turn；
  driver 栅栏自动让下一轮加工排队等它。N 走服务 config（同 `digestMaxBytes` 的行配置模式）。
  模板：schedule runtime.ts:228-320、tool-jobs onJobDone。
  > **2026-09-24 实施修正**（切片 1e，[maintenance-metronome](2026-09-24-maintenance-metronome.md)）：
  > 上面设想的触发信号被亲验推翻——`goal/changed` 只在 goal 变更时发，**轮次推进不经过它**。
  > 实际采用 `agent/inbox/inserted`（goal 轮消息 source 自带 goalId/round，无状态节拍）；
  > followup、让路栅栏、config 行（`maintenanceEveryRounds` 默认 5）仍按本条设计落地。
- **(a) 先垫底（零代码，可立即做）**：`home-curation` 技能 + persona 写节拍纪律
  （"加工几段主动跑 curate"）——纯纪律，无强制，但它让 (b) 出现前的行为先对。
- **(c) 用户显式 `/curate` 命令**（模板 command-goal）：手动兜底，靠人记得，不作为主路径。

**边界澄清**：(b) 是"会话内的养护 turn"，**不是** architecture.md 第六节延后的
"自动后台复盘（`session/end` + `ctx.jobs`）" —— 后者是跨会话复盘，触发条件未到，仍然延后。

## 被否决的方案

- **schedule 作节拍器**：≥5 分钟墙钟粒度、无 cron、与加工进度对不上；base 不挂还要加行。否。
- **host 侧拦截每轮 turn 强制先养护**：与 driver 的 idle requestDrive 竞争、行为不可预期；
  让路栅栏的设计就是"排队不抢跑"。否。
- **自建跨会话加工队列**：DSH 明确不做 backlog 是有理由的（会话死亡边界复杂）；
  我们已有 `research/` 房间承担"悬着的事"。否。

## 设计五问

- **ctx 键**：不加新服务键 —— 节拍器挂在 `assistantMemory` 同一插件内，复用其 config 行。
- **日志税**：养护 turn 是普通 user/message（plugin source），逐字进会话日志；
  `curate` 的调用与结果走既有 `tool/call`/`tool/result`。不新增 SessionEventMap 成员。
- **UI 层**：day 0 无专属卡片 —— 养护 turn 用通用 present 卡；触发条件见 architecture.md 第六节。
- **证据**：纯核部分（轮次计数判据）进 vitest；接线部分"只有跑起来才看得出"，
  等 dev 端到端通了在真实会话里验（见 snapshots/README.md 的触发条件）。
- **自动化预算**：养护 turn 是自动化任务——启动前定三上限（最长墙钟 / 最多轮次与工具调用 /
  最多输出量），到限即停并汇报"跑到哪、还差什么"；turn 可中断；拿到关键证据就收口，
  不为"跑完整"放开跑。
