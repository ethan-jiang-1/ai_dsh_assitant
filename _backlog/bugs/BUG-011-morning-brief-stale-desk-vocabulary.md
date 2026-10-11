---
status: 活跃
severity: P2
opened: 2026-10-11
---

# BUG-011：`morning-brief` 技能仍按退役的 `actions[]`/decisions/gaps 写触发与对账口径

> 严重级别：P2（次要）｜发现：2026-10-11｜状态：活跃

## 症状

模型可见的技能文件 `packages/dsh-smart-assistant/presets/assistant/skills/morning-brief/SKILL.md`
仍以**已退役的桌面字段**描述「什么时候加载」和「读什么」：

| 行 | 现文 | 今天的事实 |
|---|---|---|
| 4 | 触发 (a)：`Any turn that writes a desk actions[] row with a due` | 事项与到期日现在写进**账本**（`assistant_operating` 的 entrust/report 等），桌面文件只承载房间数据；`actions[]` 已随唯一桌面退役 |
| 31 | `The desk slice for this session (decisions, actions, gaps — their current state)` | 同三段都已退役；今天要读的是账本投影（事项/提案/核对点/预测） |
| 45 | `Needing their call (decisions whose moment has come)` | 对应的现行概念是**待确认提案**（`proposals[].status === 'pending'`）与到点核对 |
| 47 / 79 | `Blocking gaps (only the missing data that blocks a due item)` | 「缺口/gaps」没有数据源了（桌面文件不再有该段）；今天对应的是「卡在等输入的事项/提案」 |

## 为什么仍算缺陷（行为没坏，但判据面是错的）

真机观察里行为**是通的**：走查 home 的真实会话出现过 `schedule_create` 带 `[due follow-up]` 与
`weekly {time 09:00:00, time_zone Asia/Shanghai, weekdays [1]}`（见 [开屏卡](../_archive/settled_issues/261007-opening-brief-and-rhythm.md)
#6 的读数；读法＝`dev/reports/usage-report.mjs` 的 `sessionLogs`/`readEvents`）。也就是说**模型自行泛化**把
「事项有了到期日」映射到了技能的意图上。

风险在于：触发条件写的对象（`actions[]`）在新数据模型下**永不发生**，技能只靠 (b)(c) 两条与模型自觉加载；
「gaps」一行则可能让模型去报一个不存在的东西，或者干脆空着——两种都不是设计意图。

## 修复关联

1. 把触发 (a) 改写成账本口径（「本轮通过 `assistant_operating` 给某事项落下到期日/核对点」）；
2. 第 31 行的「读什么」改成账本投影的字段（matters / proposals / checkpoints / forecasts / materials）；
3. 「blocking gaps」两处改写成「卡在等输入的（待确认提案、缺读数的事项）」；
4. 属**模型可见面改动**：按包纪律走 `pnpm build` → `pnpm test:composition` → 聚焦 `pnpm eval`，
   并顺带扫一遍**其余模型可见面**是否也引用了退役段（本次只发现这一处：
   `grep -rl "actions\[\]|decisions\[\]|gaps\[\]" presets/assistant/skills src/agent` 只命中它）。

**与 ②#6 的关系**：这正是开屏卡 #6「周坐四个对账口径」的**一致性**面——业务口径由本人判（四项意图不变），
对象与写法由本卡修。两件事分开记录、合并实施。
