# 决策：采纳 ai_dsh_company 的 DSH 对齐经验（差距评估 + 采纳清单）

日期：2026-09-23 · 状态：**implemented**（2026-09-23 拍板采纳并落切片，见文末落地节）

## 输入

`/Users/bowhead/ai_dsh_company/notes/research/2026-09-23-dsh-inround-task-surface.md`
（另一 DSH 项目五轮实践后的对齐复盘：他们自创"垂直轮 + roadmap"，发现走样，
D23 拍板转严格 DSH 套路 + 防再犯五件套；§七是给新项目的可迁移清单）。

## 结论先行

**结构差距 ≈ 0，习惯差距 4 处，全部是"登记型"成本（写表/写行），无一处要动代码或架构。**

为什么结构几乎零差距：本 repo 立项时的 handoff 正是上一个项目教训的产物
（docs=now、notes 三段流、窄证据、机械门禁、one-home-per-fact 从 day 0 就是骨架）；
ai_dsh_company 的 §三对照表甚至直接判定我们同款的 notes 流"对齐（形态一致）"。
他们付了五轮学费的地方，我们的初始合同已经避开。

## 逐源对照（第一遍枚举；源头 = 本文引的 vendor 路径 + 三个专项审计）

| DSH 纪律（源头） | 本仓落点 | 状态 |
|---|---|---|
| docs 只写 now；词数预算 + slop 门禁（root AGENTS.md / doc-budgets manifest） | docs/ 五份只写现在；历史与尸体全在 notes/ | ✅ 照搬。词数/slop 门禁未做 —— 触发条件：docs 腐化实证 |
| 决策 Note same-PR（`.agents/notes/README.md`） | notes/proposed→implemented 与切片同 diff | ✅ 照搬（已实践：每个切片 note 同 commit） |
| 会话日志即真相；**计划文件否决**（"a plan directory creates a second durable home"，2026-07-22 note :54） | 不建 plans/tasks 物种；交接文档只放 /tmp；I14 空槽走会话内 turn 不落计划文件 | ✅ 照搬 |
| **轮内任务面**：plan mode 开工呈批 + todo_write 实施期活清单 + steer（tool-todo 为 base 行，TodoPanel 开箱即用） | 我们的 preset 已挂 `tool-todo` 且**连必填 config 一起抄**（`allowParallelInProgress: true`——ai_dsh_company R1 的挂载炸弹我们没踩）；但 repo 侧 dev-loop 纪律**没有登记**这两步 | ⚠️ **缺口 1（同其病根 4"在场没人用"）**：登记零成本 |
| 队列不积累历史（Issues/Project 关闭即离场） | 无 roadmap 物种；intents.md 是**意图台账**（非工作队列），延后项表带触发条件住在 architecture.md | ✅ 适配已成立：本地单人仓无 GitHub 面 → 意图清单 + 触发条件表；保持"只有接下来"。**禁令**：任何清单完成后不许标 ✅ 留场，完成的进 implemented/ |
| 窄证据 + 只报告实跑命令（root AGENTS.md / dsh-pre-push-checks） | AGENTS.md 硬规则 3 | ✅ 照搬（本场会话全程实践） |
| 机械门禁带反证 | `pnpm verify` 12 条（每条先造红再证绿） | ✅ 照搬 |
| 语义漂移探针（新上下文只读入口链答"现在"问题） | 本场会话即实证：AGENTS.md + handoff 足以交接，零过期 | ✅ 适配：探针并入未来 live 会话检查档（暂不单做） |
| **默认翻转**：默认严格 DSH 套路，偏离须登记 + 约束证据 | 硬规则只有"不猜 API 去读" | ⚠️ **缺口 2**：一句话进硬规则 |
| **纪律表逐源枚举**（"你无法继承你从没清点过的东西"） | 我们的规则来自 handoff 的记忆沉淀，无成文枚举表 | ⚠️ **缺口 3**：本文的表即第一遍；转正后住 docs/ |
| **继承跟 pin 走**（升 pin 重校） | `sync-dsh` 已带 typecheck；流程合同重校未列入 | ⚠️ **缺口 4（一行字）**：sync-dsh 的动作加"对照 docs/ 纪律表重校" |

## 采纳切片（待拍板）

1. 枚举表从本 note 转正为 `docs/discipline.md`（当前合同；每行 = DSH 做法 → 本仓落点 → 状态/触发条件）。
2. AGENTS.md 硬规则补两行：默认翻转（缺口 2）+ 轮内任务面纪律（缺口 1：开工 plan 呈批、
   实施期维护 todo_write、人可 steer）；命令表 `sync-dsh` 行加重校（缺口 4）。
3. 不做的事：不建 plans/ 队列文件（second durable home 否决；我们的"队列"就是 intents 台账 +
   延后项表）；不加词数/slop 门禁（无腐化实证，触发条件已写明）。

## 与 I14 的关系（不冲突，互相加强）

I14 的"养护空槽"是**助手侧**的迭代节奏，本 note 是**本 repo 开发流程**的节奏纪律；
两层共用同一批 DSH 原生面（goal 轮次、todo、plan、steer），都不需要发明新文件或新面板。
ai_dsh_company 的教训反过来印证 I14 决策：节奏靠机制与纪律，不靠计划文件。

## 落地（2026-09-23）

- **docs/discipline.md 落成**（逐源枚举表 = 本文 §逐源对照的转正 + 两处扩充）：
  合并了原文 §七之 2"声明每一条适配"（原表并入"默认翻转"行未单列）与原文 §二测试纪律
  （"非平凡改动 same-PR 更新快照"原表漏收，补为 ⏳ 行）；另加"已声明的适配"节
  （无协作面 / 队列不落文件 / 交接靠入口链——即原文 §七之 8 的等价物映射）。
- **AGENTS.md 硬规则 3 条 → 5 条**：补缺口 2（默认严格，偏离登记，指向 docs/discipline.md）
  与缺口 1（轮内任务面：plan 呈批 / todo 活清单 / steer）。
- **缺口 4（继承跟 pin 走）三处闭环**：AGENTS.md 命令表 sync-dsh 行加"对照 docs/discipline.md
  重校"；`scripts/sync-dsh.mjs` 收尾清单加同款提醒；`pnpm verify` 强制 docs/discipline.md 存在
  （纪律表从此不可静默删除）。
- 语义探针保持"并入未来 live 会话检查档"的适配不动（触发条件见 docs/discipline.md 表）。
