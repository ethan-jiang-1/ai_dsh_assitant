# 开发纪律对照表（当前合同 · 只写现在）

> 本文是本 repo 对 DSH 研发纪律的**逐源枚举与声明** —— 不从记忆继承
> （"你无法继承你从没清点过的东西"）。每行 = DSH 做法 → 本仓落点 → 状态
> （✅ 照搬 / ⚠️ 带约束的适配 / ⏸ 刻意不做 + 触发条件 / ⏳ 部分 + 等待条件）。
> 来源：`ai_dsh_company` 五轮实践的对齐复盘（仓外原文的出处与章节映射登记在
> `notes/implemented/2026-09-23-discipline-alignment.md` 的输入节——合同文档不引仓外绝对路径）；
> 决策记录：同该 note。
> **默认严格按本表走；偏离或裁剪不是错，但必须先登记（一行 note：约束 → 适配 → 证据）再动手。**

## 表

| DSH 纪律（源头） | 本仓落点 | 状态 |
|---|---|---|
| 文档只写 now；一个事实一个家（root AGENTS.md / `docs/AGENTS.md` tier 表） | docs/ 只写现在，无历史叙事；历史与输掉的方案全在 notes/ | ✅ 照搬 |
| 决策 Note same-PR；完成的条目离开队列、不许标 ✅ 留场（`.agents/notes/README.md`） | notes/proposed→implemented 与切片同 diff；intents 台账只记"接下来" | ✅ 照搬 |
| 计划文件被明确否决："a plan directory creates a second durable home"（2026-07-22 note :54） | 不建 plans/tasks 物种；交接文档只放 /tmp；I14 养护空槽走会话内 turn，不落计划文件 | ✅ 照搬 |
| 会话日志即真相（log-only 持久层；复盘用日志 seq 重建，不凭自述） | 排查/复盘读 `dev/harness-home/sessions/**/session.v3.jsonl.zstd` 逐事件还原（`docs/dev.md` §五） | ✅ 照搬 |
| 轮内任务面：plan 呈批（反馈门①）+ `todo_write` 活清单（反馈门②）+ steer，机制在 base bundle 零接线 | 本 repo 开发流程见 AGENTS.md 硬规则 5；本插件 preset 已挂 `tool-todo` 且**连必填 config 一起抄**（`allowParallelInProgress: true`——不抄 config 会在挂载时炸且 UI 吞错误） | ✅ 照搬 |
| 默认翻转 + 适配声明：默认严格，偏离/裁剪须登记（镜像 "Require evidence for public choices"） | AGENTS.md 硬规则 4；每条适配登记于本文"已声明的适配" | ✅ 照搬 |
| 窄证据 + 只报告实跑过的命令（根 AGENTS.md / `dsh-pre-push-checks` skill） | AGENTS.md 硬规则 3 | ✅ 照搬 |
| 机械门禁带反证（每条先造红再证绿） | `pnpm verify` 12 条（结构 / 身份一致 / 双门面 / 自包含 / 技能语法 / 提交安全） | ✅ 照搬 |
| 语义漂移探针：门禁抓不住"读起来过期"，用新上下文只读入口链答"现在"问题 | 并入未来 live 会话检查档（当前形态 = 按需审计轮） | ✅ 适配（触发：入口链长到值得单做）。两轮实录：第一轮零过期；第二轮（2026-09-23 信噪比审计，`notes/implemented/2026-09-23-signal-tier-dedup.md`）抓出机械门禁未覆盖的漂移 6 处——探针职责面实证 |
| 继承跟 pin 走：升 pin 重校纪律表（vendor 的套路在演进，一次性快照会再烂） | `sync-dsh` 收尾清单第 4 步 + `pnpm verify` 强制本文存在 | ✅ 照搬 |
| 测试纪律：本地窄证据 + 非平凡改动 same-PR 更新快照 | `pnpm test` 60/60 纯核；快照 harness day 0 未建（触发条件在 `snapshots/README.md`） | ⏳ 部分照搬（等第一处 live-only 回归出现再建） |
| 文档词数预算 + slop 门禁（`doc-budgets` manifest + `verify-doc-budgets`） | 刻意不做 | ⏸ 触发条件：docs 腐化实证（与来源仓同款推迟理由）。第二轮审计（2026-09-23）证据：轻度腐化——多重书写 ×2、内部矛盾 ×1、过期数字 ×1，一轮修完；暂不立案，再犯即触发 |
| Issue → PR 连续流 + Project 状态机（队列不积累历史） | 不适用：本地单人仓无协作面 | ⚠️ 适配：一次切片 = 一个 commit（note 同 diff）；队列语义 = intents 台账 + 触发条件表，不建队列文件 |

## 已声明的适配（约束 → 适配 → 证据）

1. **无 GitHub 协作面**（约束：本地单人仓）→ 无 Issues/PR 流；等价物 = 切片 diff + note 三段流
   （证据：本表与 notes 流自 day 0 的实际运转）。
2. **工作队列不落文件**（约束："second durable home" 否决 + 队列不积累历史）→ "接下来"住在
   handoff（/tmp，会话级，刻意不进 repo）与 intents 台账 + architecture.md 延后项表（触发条件）；
   完成的进 `notes/implemented/`，离队。
3. **切片可以全新会话**（约束：上下文经济）→ 交接靠入口链（AGENTS.md → docs → notes）本身，
   不靠长活上下文。

## 复查环（防"一次性快照再烂"）

- `pnpm sync-dsh` 升 pin 时：对照本文逐行重校（vendor 的套路在演进，继承必须跟着 pin 走）。
- 语义漂移（读起来过期、自相矛盾）：机械门禁抓不住，靠新上下文探针与审计切片。
