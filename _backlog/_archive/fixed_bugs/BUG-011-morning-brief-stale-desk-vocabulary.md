---
status: 已修
severity: P2
opened: 2026-10-11
---

# BUG-011（已修）：`morning-brief` 技能仍按退役的 `actions[]`/decisions/gaps 写触发与对账口径

> 严重级别：P2（次要）｜发现：2026-10-11｜状态：已修（2026-10-11）

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

## 修复（2026-10-11，同一刀里连扫出的第二处一起修）

**① `morning-brief`（卡里的本体）**——把「桌面文件字段」换成「账本」口径，其余一个字不动（把「desk」当*面板*的比喻保留，错的是它引用的字段）：

| 位置 | 改前 | 改后 |
|---|---|---|
| 描述 / 触发 (a) | 写了一条带 `due` 的桌面 `actions[]` 行 | 通过 `assistant_operating`（`entrust`/`report`/`revise`）给事项落下 `promised_deadline`/`next_checkpoint` |
| §1 | `{the action's what}`；「action 的日期动了 / 掉了」 | `{the matter's what}`；`revise` 移动 / `complete` 完成 / 丢弃 |
| §2 读什么 | `The desk slice (decisions, actions, gaps)` | 账本（`assistant_operating action=desk`）：在办事项 + 承诺日/核对点/预测 + 待确认提案 + **已提交的回执**（「其它都不算进展」） |
| §2/§4 | `Needing their call (decisions…)`、`Blocking gaps` | 待确认提案与到点核对；**卡在等输入的事**（模型须说清「为什么这个数对这次判断要紧」） |
| §3 | 更新桌面 action 的 `due` | 用 `revise`（带已读修订）移动事项日期 |
| §4/§5 | 「桌面实际持有的东西」 | 「账本实际持有的东西」；桌面面板是账本的投影 |

**② `action-plan`（扫描抓到的第二处，同类且更险）**——它教「计划落成动作 → **refresh the desk** 让动作出现」，
而 `desk-refresh` 明写「业务事项永不写进 `.desk/state.json`」——**两条模型可见指令互相矛盾**。改后：动作以
`assistant_operating entrust` 落成账本事项（引本人原话），带日期的同回合按 `morning-brief` 排提醒；并明写
「永不写进 `.desk/state.json`（那里只放房间数据，见 `desk-refresh`）」。

**③ 扫描结论（卡里第 4 条）**：`grep "actions[]|decisions[]|gaps[]|Blocking gaps|tracks actions from the working folder|refresh the desk"`
在 `presets/assistant/skills/` 与 `src/agent/` 全域**零命中**；`desk-refresh` 与 `src/agent/operating-brief`（「matters,
deadlines, decisions to make 进账本」）本就正确、未动。

## 证据（模型可见面纪律 = build → composition → 聚焦 eval → 真机会话读数）

| 层 | 命令 / 读数 | 结果 |
|---|---|---|
| 构建 | `pnpm build` | 0 |
| 真实组合 | `pnpm test:composition` | 6/6 通过（preset 行与技能装载未受文本改动影响） |
| 行为回归 | `pnpm eval --only desk-single-matter`（一次性 home `.tmp/eval-clean-bug011`） | **PASS 29s**（真模型：`assistant_operating` 用了、回答含 NB-02/第二期/10-13） |
| 真机行为（**只有它管用**：排程工具在 headless profile 里是禁用的，见 [BUG-008](BUG-008-schedule-tools-missing.md)） | 重启走查实例加载新技能 → `pnpm desk-walk '<URL>' --home <dir>`（真模型两条路，全绿：`return-invariant` pending 0、`intake-return` 建成并选中 m-7）→ 读会话日志（读法＝[usage-report](../../reports/usage-report.mjs) 的 `sessionLogs`/`readEvents`） | `SKILL: morning-brief` → `entrust 商标续展材料递交（2026-11-20 前）` → `SCHEDULE_LIST`（防堆叠）→ `SCHEDULE_CREATE {date 2026-11-20, time 09:00, time_zone Asia/Shanghai}` + `prompt "[due follow-up] 事项 m-7…"` → 同回合建 `weekly {09:00, Asia/Shanghai, weekdays [1]}` 周坐 ✓✓ |

**限制**：`pnpm eval` 的 desk 任务只断言工具与回答（不含排程——headless 托管不了，BUG-008）；排程与周坐行为由上面那条 web 会话日志取证，属一次性真实读数（读法已命名，可重取）。
