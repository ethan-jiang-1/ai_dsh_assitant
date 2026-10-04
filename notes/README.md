# notes/ —— 开发记忆与证据链（本目录的分类 owner）

> **每个目录装什么、状态怎么读、由谁维护，以本文件为准**——职责由一个具名文件拥有，不由惯例拥有
> （借自 DSH `.agents/notes/` 的分类学：`_agent_ready_development/repo-harness/08-repository-taxonomy.md`、
> `sdlc-reference/01-agent-note-lifecycle.md`；对齐与偏离登记见 §四）。
> **接下来做什么**：用户本轮请求优先；毕业待拍板的提案住 `proposed/`（问题/方案/验收；**用户点头才开工**
> ——"批"发生在 proposed→implemented 之间，依据 [proposed-card-positioning](implemented/2026-10-04-proposed-card-positioning.md)），
> 想法/触发型住 [`_backlog/plans/`](../_backlog/plans/README.md)（2026-09-28 起 ROADMAP 队列退役）。本目录只管已决与证据。

## 〇、何时写与取代检查（规则的唯一家在本文件；根 AGENTS.md 只留指针）

- **义务范围**：note 只收**承载持久决定理由**的改动——代码、测试与现行文档说不清的 why 与放弃的备选；
  机械或局部编辑豁免。决定随当前变更已交付的，直接写 `implemented/`，不必从 `proposed/` 开始；
  非平凡改动同 diff 新增或更新相关 note；提案落地须改写为实际决定与证据，不能只搬目录。
- **取代检查（每新增一篇 note 触发）**：搜活跃树找同决定/同机制的旧 note——完整取代则新 note
  吸收其独有理由/备选/后果/验证后**同 diff 删除旧的**（历史归 git）；部分取代则双方保留互链、
  更新仍有效的事实。同一决定的事实变化更新原文，反转决定即完整取代。
- **implemented 必带「输掉的方案」**：没记击败了什么的决定会重新开讼；备选只能记录、不能编造
  （机械门禁，旧 note 按门禁生效日祖父豁免）。过时提案转 `rejected/` 并写一行拒绝原因，而非滞留
  `proposed/`；`rejected/` 失去防错价值即删。

## 一、状态轴：一眼怎么读

| 位置 | 装什么 | 状态词（状态行里） | 读者怎么用 |
|---|---|---|---|
| `proposed/` | 未完成或仅部分完成的**重大未来工作**（提案） | `proposed` | 看问题/方案/验收/风险；**不能当已交付** |
| `implemented/` | 已交付决定 + 它击败的备选 + 后果 | `implemented` | **当前 rationale owner**，随实现保持 current |
| `rejected/` | 被否决的提案 + 一行拒绝原因 | `rejected` | 只在还能阻止同一个可信错误时保留；失效即删 |
| `archived/` | 未来决策价值低的 implemented 历史 + **收卷调研证据台账**（`research/` 子目录） | `implemented`（台账 = `已收卷`）+ 一行 `已归档：YYYY-MM-DD`（台账行免） | 只作历史引用，**冻结不再编辑**，不是当前权威 |
| `intents.md` | **已拍板的方向判据**：产品初衷（P1–P3）、结果意图（O1–O6）、研发姿态判据与用户原话 | — | 判据唯一权威；机制意图 I1–I15 已冻结至 `archived/2026-09-23-mechanism-intents.md` |

> **调研层并入（用户 2026-09-28 拍板）**：进行中的调研/推敲住 [`_backlog/plans/`](../_backlog/plans/README.md)
> （一个思考一个家）；收卷证据台账 = `archived/research/`（子目录深度与原路径一致，冻结文件内部链接零改）。
> 依据：[research-absorbed-into-backlog](implemented/2026-09-28-research-absorbed-into-backlog.md)。

**命名**：`YYYY-MM-DD-<topic>.md`，日期是主题**首次提出**日（不是实现或归档日）。
**状态行**：文件前 6 行内一行 `日期：YYYY-MM-DD · 状态：**<状态词>**（说明可省）`；
目录与状态词必须一致（机械门禁）。文件名的日期必须等于状态行的日期。
**互引**：note 之间只用**相对 Markdown 链接**（不用裸文字或编号）——可机械检查，且跨目录移动后仍然有效。
**生命周期是移动不是复制**：`proposed → implemented` 必须把正文改写成已交付事实（删迁移计划与未来时态）；
`proposed → rejected` 在状态行写一行原因；`implemented → archived` 只对低未来决策价值者，且冻结。

## 二、刻意不做

- **不设集中索引**（无 `INDEX.md`）：生命周期目录树本身就是工作清单；第二份清单必然漂移。
- **不设 `postmortem/`**：事故记录属于"已交付决定"，进 `implemented/`（AGENTS.md 曾列该目录但从未存在，2026-09-25 删除该说法）。
- **不采用 `{lifecycle}/{class}/` 两级路径**（DSH 用它）：偏离理由见 §四。
- 提案过时转 `rejected/` 而非滞留 `proposed/`；`archived/` 只收已交付（implemented）的 note。
- **延后/触发的家 = `_backlog/plans/` 卡的状态行**（2026-09-28 起，原 ROADMAP 队列退役）：note 里写触发条件须指明其 plans 卡；明确**永不**做的（负知识）留在输掉的方案。

## 二之二、`proposed/` 卡片的骨架（推荐形态）

新卡片四节：`## 问题（可观察行为）` / `## 提案` / `## 输掉的方案` / `## 验收`。
**为什么只推荐不门禁**：机械门禁已覆盖"状态行与目录一致、命名、implemented 必带输掉的方案"
（见 §一）；再钉卡片正文结构会在小切片上逼出凑节标题的噪声。卡片形状是给人读的，语义由评审把关。

**状态词唯一**：卡片不使用"调研中/待拍板/待实施"这类第二套阶段词——生命周期词就是状态（§一表），
可执行性看卡自身的状态行与用户拍板。两套词并存即噪声（用户 2026-09-25 立的设计纪律：一词一义）。

**上游边界（2026-09-28）**：不成熟、未到「问题/方案/验收」三件的思考，先住
[`_backlog/plans/`](../_backlog/plans/README.md) 推敲（毕业四门见其
[`_backlog/README.md`](../_backlog/README.md)）——本目录收毕业后的提案，不是停车场也不是推敲场。

## 三、不设计数清单（2026-09-26 拆除原"当前清单"）

第二份清单必然漂移（§二）——本节曾维护各目录的篇数快照，2026-09-26 审计时计数已全数过期，按自身原则拆除。
各目录现状直接看目录树本身；"接下来做什么"看 [`_backlog/plans/`](../_backlog/plans/README.md) 与 proposed/。
`rejected/` 空目录是刻意的：先立目录与门禁，等第一个被否决的提案入住（负知识不与"输掉的方案"混住）。

## 四、与 DSH 的对齐与偏离登记

**借（直接继承）**：生命周期四态与"目录↔状态词互校"；归档冻结（不可编辑）；rejected 留一行原因、失效即删；
路径树即工作清单、不设集中索引；note 间相对链接；`implemented` 是**当前** rationale owner（随实现保持 current）；
`proposed → implemented` 是同 diff 的正文改写。

**适配（同精神、异形态）**：DSH 用置顶三行 `# Agent Note: <title>` / 空行 / `Status: <status>`，
我们用 `日期：YYYY-MM-DD · 状态：**<状态词>**`（本仓人面文档用中文的语言分工；门禁等价，位置与词表都机械校验）。

**偏离（记录理由）**：不采用 DSH 的 `{lifecycle}/{class}/` 两级路径——
① 本仓需求的可见性是"当前/将来/过去式"的**生命周期**轴，class（feature/bug-fix/process/…）是正交的第二轴；
② 44 篇一次性迁移的 churn 与误分类风险大于可读性增益；
③ DSH `repo-harness/09-plugin-author-entry.md` 明说插件仓继承的是分类学**精神**（一个事实一个 owner、
生成物有生成器、决定有记录），不强制复制其 Notes 机制。note 量级显著上升时重评此条。
