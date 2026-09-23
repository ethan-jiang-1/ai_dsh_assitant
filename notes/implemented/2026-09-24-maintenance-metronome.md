# 2026-09-24 · I14 节拍器（治理环切片 1e）（已实现）

依据：三线合流提案 `notes/proposed/2026-09-24-tri-line-synthesis.md` 阶段 1 切片 1e；
设计定稿在 `notes/proposed/2026-09-23-iteration-rhythm.md`（b 层 host 节拍器为主、a 层
persona 纪律垫底、c 层手动兜底）；意图 I14（加工 → 空槽 → 打扫，槽由加工节奏触发且可配置）。
战役首批数据（两个数据点：助手不会主动跑 curate）证明 a 层不够，b 层的时间到了。

## 问题

curate 是被动的：persona 与技能只在模型"想到"时触发养护。连续多轮加工（goal 驱动的工作）
中间没有自然的打扫时机，家的腐坏（断链、重复、死技能）只能等到人想起来。

## 决定（按 iteration-rhythm note 的 b 层设计，机制亲验后有一处修正）

1. **触发信号修正**：note 设想"监听 `goal/changed` 数 `roundsStarted`"——亲验后发现
   `goal/changed` 只在 goal **变更**（create/edit/pause/resume/complete/block/clear）时发，
   **轮次推进不经过它**（`GoalOperation` 联合类型里没有轮次类；round-driver 源码
   166-192：轮次=driver 以 `source:{kind:'goal',round}` 的 user message `followup()` 进
   nextTurn，fold 数 `goal` 类消息推进 `roundsStarted`）。**实际可用信号是
   `agent/inbox/inserted`**（driver 自己用它做让路栅栏，goal-round-driver/src/index.ts:300）：
   每个 goal 轮的提示入队时必发，payload 带 agent + message，`message.source` 上的
   `goalId`/`round` 就是节拍器需要的全部状态。
2. **无状态节拍**：`round % maintenanceEveryRounds === 0` 即触发——轮号随 goal 从 1 重新
   计数，换 goal 自动重置，无需自己维护计数器；仅一张 `goalId → 已触发轮号` 小表去重
   （driver 对 stale attempt 会重排队同一轮，防重复触发）。
3. **安全空槽**：触发时 `agent.followup()` 一条 `source:{kind:'plugin',
   plugin:'dsh-smart-assistant'}` 的养护消息——非 goal 消息进 nextTurn 即置
   `competingQueued`，driver 推迟下一轮加工直到该 turn 消费完（note 点名的"空槽原生
   安全位"；steer 不触发栅栏，所以必须走 followup）。
4. **消息内容**：指示跑 `assistant_memory action=curate` 并逐条处理或显式搁置；明说
   "paused goal work resumes right after this turn"（被打断的加工立刻恢复）。
5. **配置行**：`maintenanceEveryRounds`（默认 5，`0` 关闭；同 `digestMaxBytes` 的行配置
   模式）。非 goal 会话不经过轮次——由 persona 纪律（a 层）覆盖，与 note 的分层一致。
6. **边界澄清**（note 原文照抄）：这是**会话内的养护 turn**，不是延后的跨会话自动复盘
   （`session/end` + `ctx.jobs`）——后者触发条件未到，仍然延后。

## DSH 接缝（亲验）

- `agent/inbox/inserted`：`vendor/dsh/packages/core/agent/src/runtime-types.ts:285`
  （`{agent, message}` payload，scoped）——goal-round-driver/src/index.ts:300 同款用法。
- `goal/changed`：`vendor/dsh/packages/goal/goal/src/domain.ts:114`（payload `{agent, change}`；
  `GoalOperation` 联合 14-22 行**无轮次类**——触发信号修正的依据）。
- 轮次机制：goal-round-driver/src/index.ts:166-192（round=roundsStarted+1，`followup` 入队）。
- `agent.followup(message: UserMessage)`：runtime-types.ts:222。
- plugin 消息源：`{kind:'plugin', plugin}`（llm/src/message.ts:104，`ContextFormed` 为可选
  form 字段）；`createUserMessage` 自 `@deepseek-ai/dsh-llm`（已在门面与依赖里）。
- 让路栅栏：`agent/inbox/inserted` 置 `competingQueued`（goal-round-driver/src/index.ts:296-303）。

## 输掉的方案

| 输掉的 | 为什么输 |
|---|---|
| 监听 `goal/changed` 数轮次（note 原设想） | 亲验否决：轮次推进不发该事件——见决定 1 |
| 自维护 per-agent 轮次计数器 | 轮号已在消息源上，自计数还要处理 goal 切换重置——状态是负担 |
| schedule 定时器（note 已否） | ≥5 分钟墙钟粒度与加工节奏对不上（维持原判） |
| 每 N 轮强制拦截 turn 先养护（note 已否） | 与 driver 栅栏竞争、行为不可预期（维持原判） |
| 引 `@deepseek-ai/dsh-goal` 依赖拿 `'goal'` 源类型 | 一个类型加一条门面依赖不值——widened kind 检查（运行时值一致，注释说明） |

## 证据

- 纯核 + 接线：`tests/maintenance-metronome.spec.ts`（5 测试：interval 谓词全边界 /
  prompt 渲染 / 第 2 轮触发且 plugin 源与文案正确 / 同轮重排不重触发、下个间隔再触发 /
  换 goal 重置、非 goal 消息忽略、0 关闭）。**105/105 全绿**（`pnpm test`）。
- 机械门禁：`pnpm typecheck` && `pnpm build` && `pnpm verify` 16/16。
- **live 实证（两轮，第一轮的否定结果如实保留）**：
  1. 第一轮（会话 `session-11b110e6…`）：**否定**——goal 只跑 4 轮（模型把 6 个数压缩进
     4 轮），未到 5 轮间隔，节拍器无从触发；live 助手如实报告否定并标记"harness 侧值得
     追查"。诊断出**真问题一枚**：preset-runner 的完成判定是 `agent.whenIdle()`（静止），
     而 goal driver 在静止后还要做 durability checkpoint 才排下一轮——runner 在第 1 轮后
     就退出。修复：`awaitGoalSettlement`（`ctx.goals.get(agent)` 轮询 goal 相位 +
     250ms 驱动轮询 + 30s 停滞保护）——静止 ≠ goal 会话的结束。
  2. 第二轮（会话 `session-a1127685-ce16-433b-8b0d-f3d5cf02dd7a`，assistant preset，
     `[Maintenance slot] Round 5` 3 处在日志）：任务强制每轮 get_goal 报轮号（防压缩），
     goal 跑满 6 轮。**第 5 轮触发**：养护消息逐字送达（live 报告全文引用，与
     `renderMaintenancePrompt` 输出一致）；养护轮按指示加载 home-curation → 跑 curate →
     家干净 → 一行回复；**让路栅栏按设计工作**——养护轮消费后第 5 轮正式继续、第 6 轮、
     `update_goal complete` 正常收尾（6 轮 goal + 1 养护轮 = 7 个 assistant turn）。
     顺带：养护轮里加载 home-curation 被用量账本记录——1a 的采集管道在养护轮同样工作。
  3. 测试设计教训（如实）：第一轮的 goal 任务没约束"每轮一个数"，模型合理压缩导致
     轮数不足——**负结果来自测试设计，不是机制缺陷**；第二轮用 get_goal 轮号自我 pacing
     修正。节拍器机制两轮对比后判定为实证通过。
