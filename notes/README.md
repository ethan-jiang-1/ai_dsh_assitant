# notes/ —— 开发记忆与证据链（本目录的分类 owner）

> **每个目录装什么、状态怎么读、由谁维护，以本文件为准**——职责由一个具名文件拥有，不由惯例拥有
> （借自 DSH 的 Agent Notes 分类学：主仓语料消化稿——主仓 checkout `deepseek-harness` 的
> `_dsh_plugin_agent_ready_development/repo-harness/08-repository-taxonomy.md` 与
> `_dsh_plugin_agent_ready_development/sdlc-reference/01-agent-note-lifecycle.md`，**不在本 pin 的 vendor 树内**；
> 本 pin 树内的机制正文 = [`vendor/dsh/.agents/notes/README.md`](../vendor/dsh/.agents/notes/README.md)。对齐与偏离登记见 §四）。
> **接下来做什么**：用户本轮请求优先。还要等人点头的持久取舍住 `proposed/`（问题/方案/验收；**点名或点头才开工**，与根 `AGENTS.md`「意图从哪来」同一条规则）。
> 推敲住 [`_backlog/issues/`](../_backlog/issues/README.md)，这次不修的缺陷住 [`_backlog/bugs/`](../_backlog/bugs/README.md)。本目录不装进行中的工作板，也不装调研底稿。

## 〇、什么是 note（规则的唯一家在本文件；根 AGENTS.md 只留指针）

一篇 note 是**一个还会被拿来改决定的取舍**。代码说系统现在做什么，测试钉住行为，现行文档写合同。
note 只补这四件事里真正会发生的那一件：有人把已经否掉的做法再提一遍；有人看着现在的代码编一个理由再改过去；
一条没人说得清在保护什么的约束卡在那里；不翻 git 就不知道为什么。

改动大小、是不是缺陷、加了测试、用户看得见，都不是写 note 的理由。机械或局部编辑不写。
plan 毕业不自动产生 note。切片记录、战役收口、收口数字、剩余工作清单、把行为修回既有契约的缺陷，都不是 note。

**本目录不跟踪。** 不记进度，不记「还剩什么」，不设要定期扫的账，不把篇数当状态。
`implemented/` 只放下次改相关决定时还要打开的篇。做完了、结论已经在合同或代码里、下次不会拿它来改决定的，
冻结进 `archived/`：可读、可引用、不再更新。从未构成取舍的记录不归档，直接删，历史留在 git。
延后的句子写在拥有该决定的 note 上，不在这里另开跟踪；[`triggers.md`](../_backlog/triggers.md) 也不自动收录。

- **新的、还要等人点头的取舍**进 `proposed/`。已经交付且确实有持久取舍的，直接写 `implemented/`。
  已有 owner 就改那篇。提案落地须把正文改写成已交付事实，不能只搬目录。
- **取代检查（每新增一篇 note 触发）**：搜 `proposed/`、`implemented/`、`rejected/` 找同决定。
  完整取代则吸收独有理由、备选、后果和必要的验证后**同 diff 删除旧的**。部分取代则双方保留互链。
  同一决定的事实变化更新原文。反转决定另写一篇并互链，不把旧篇改成相反的话。
- **implemented 必带「输掉的方案」**：备选只能记录、不能编造（机械门禁，旧 note 按门禁生效日祖父豁免）。
  过时提案转 `rejected/` 并写一行拒绝原因。`rejected/` 不再能阻止同一个错误时就删。

## 一、状态轴：一眼怎么读

| 位置 | 装什么 | 状态词（状态行里） | 读者怎么用 |
|---|---|---|---|
| `proposed/` | 毕业后、还要用户点头的持久取舍 | `proposed` | 看问题/方案/验收；**不能当已交付，也不是实施看板** |
| `implemented/` | 下次改决定时还要打开的取舍 | `implemented` | **当前** rationale owner。只改正文里已经不真的事实，不往上叠进度 |
| `rejected/` | 被否决的提案 + 一行拒绝原因 | `rejected` | 只在还能阻止同一个可信错误时保留；失效即删 |
| `archived/` | 未来决策价值低的 implemented 历史 | `implemented` + 一行 `已归档：YYYY-MM-DD` | 只作历史引用，**冻结不再编辑**，不是当前权威 |

> **调研不在本目录**：进行中的调研住 [`_backlog/research/`](../_backlog/research/README.md)。收卷之后，还会被重提的事实写进拥有该决定的 note；不另留调研目录。

**命名**：`YYYY-MM-DD-<topic>.md`，日期是主题**首次提出**日（不是实现或归档日）。
**状态行**：文件前 6 行内一行 `日期：YYYY-MM-DD · 状态：**<状态词>**（说明可省）`；
目录与状态词必须一致（机械门禁）。文件名的日期必须等于状态行的日期。
**互引**：note 之间只用**相对 Markdown 链接**（不用裸文字或编号）——可机械检查，且跨目录移动后仍然有效。
**生命周期是移动不是复制**：`proposed → implemented` 必须把正文改写成已交付事实（删迁移计划、未来时态和剩余清单）；
`proposed → rejected` 在状态行写一行原因；`implemented → archived` 在决定不再指导下次改动时冻结，状态词仍是 `implemented`，加一行 `已归档：YYYY-MM-DD`（要不要冻结、怎么移、入链怎么修 = [`.agents/skills/note-archive-judgment/SKILL.md`](../.agents/skills/note-archive-judgment/SKILL.md)）。

## 二、刻意不做

- **不设集中索引，也不设跟踪账。** 目录树就是清单。手写索引、生成索引、篇数、剩余工作、定期扫的观察列表都不留在本目录。
- **不设 `postmortem/`**：把行为修回既有契约的缺陷，记录在 bug 卡和测试里。只有修复本身选出了以后还会被重提的做法，才写 note（AGENTS.md 曾列 postmortem 目录但从未存在，2026-09-25 删除该说法）。
- **不采用 `{lifecycle}/{class}/` 两级路径**（DSH 用它）：偏离理由见 §四。
- 提案过时转 `rejected/` 而非滞留 `proposed/`；`archived/` 只收已交付（implemented）的 note。
- **延后不在这里跟踪**：未裁决的推敲留 `_backlog/issues/`。已裁决「该做但不现在」的那一句写在决定 note 上，旧卡关闭。索引不自动加行，规则见 [triggers.md](../_backlog/triggers.md) 与 [治理决定](implemented/2026-10-02-backlog-governance-borrow.md)。永不做的负知识留在输掉的方案。

## 二之二、`proposed/` 卡片的骨架（推荐形态）

新卡片四节：`## 问题（可观察行为）` / `## 提案` / `## 输掉的方案` / `## 验收`。
落地之后，正文只留决定、它击败的做法、以及还会约束以后的后果。不在 note 上追加收口行、复发史、未跑清单或「下次从这里接着做」。
那些是该片的测试和提交说明。机械门禁只查状态行、命名和「输掉的方案」；再钉正文结构会逼出凑节。

**状态词唯一**：卡片不使用"调研中/待拍板/待实施"这类第二套阶段词——生命周期词就是状态（§一表），
可执行性看卡自身的状态行与用户拍板。两套词并存即噪声（用户 2026-09-25 立的设计纪律：一词一义）。

**已获点名授权的卡**：授权是**决定事实**，记在状态行（如"已授权实施"）并可指针到收口卡；
切片推进、停点与证据缺口住 [`_backlog/issues/`](../_backlog/issues/README.md) 的收口卡，
卡正文仍只承载问题/方案/取舍/验收——毕业（implemented）时才把正文整体改写为已交付事实。

**上游边界（2026-09-28）**：不成熟、未到「问题/提案/验收」三件的思考，先住
[`_backlog/issues/`](../_backlog/issues/README.md) 推敲（结论、交接与关闭按
[backlog 关闭条件](../_backlog/README.md#关闭条件)处理）——本目录收毕业后的提案，不是停车场也不是推敲场。
**「验收」节必须可执行**（命令、断言对象、红的形态——实施者不看对话就能复现）；
写不出可执行验收 = 提案未成熟，见 §二之三。

## 二之三、实施走 test-first 证据环（proposed → implemented 的执行纪律）

（2026-10-05 用户拍板：从 proposed 推进到 implemented 必须遵循 TDD 式手段——先考虑怎么测、
实现后看测试是否满足、反复做对；全程要证据，不随性发挥。）

提案实施不是"写完再补证据"，四条纪律：

1. **开工先答「怎么算对」**：动手前把该片的验收落成**可执行验据**——哪条命令、断言什么、
   红长什么样。代码片 = spec 先行（先造红再实现）；文档/组合/配置片 = 先指明会因它而红的
   门禁、探针或 diff 检查。找不到任何可红的检查 = 该片不可验收，先补验据设计再动手。
2. **循环 = 造红 → 实现 → 变绿**：允许迭代，但每轮以红绿收口；红绿机制的政策 owner 是
   [`docs/testing.md`](../docs/testing.md)（prove-it-red——新守卫造回归、看红、还原；
   禁掩盖修法——改断言迁就实现不是修法）。绿了才算做完一片。
3. **真证据记在交付里，不靠另开一篇来装**：真跑过的命令与红绿形态写在该片的验收记录（卡或提交说明）。
   被阻断的检查如实写「阻断 + 原因」，不得写成绿。只有 §〇 要求留下 note 时，验收节才把这些命令收进来；
   没有持久取舍，不为记账开一篇。改动面 → 最小可信证据的选择 owner =
   [pre-push-evidence 技能](../.agents/skills/pre-push-evidence/SKILL.md)。
4. **验收写不出 = 提案未成熟**：proposed 卡的「验收」节按 §二之二必须可执行；做不到就回
   [`_backlog/issues/`](../_backlog/issues/README.md) 继续推敲，不进实施。

本文件不记「再出现就升级」的观察。真证据的家是测试和现行文档。

## 三、不设计数清单（2026-09-26 拆除原"当前清单"）

本文件不维护篇数、名单或「接下来做哪篇」。目录里有什么，看目录。接下来做什么看用户本轮请求和 [`_backlog/issues/`](../_backlog/issues/README.md)。

## 四、与 DSH 的对齐与偏离登记

平台 note 制度的正文在 `vendor/dsh/.agents/notes/README.md`。本文件只登记本仓借了什么、改了什么。主仓的归档步骤在 `vendor/dsh/.agents/skills/dsh-archive-agent-notes/SKILL.md`，作用于主仓的 class 目录，不作用于本目录。

**借（直接继承）**：生命周期四态与"目录↔状态词互校"；归档冻结（不可编辑）；rejected 留一行原因、失效即删；
路径树即工作清单、不设集中索引；note 间相对链接；`implemented` 是**当前** rationale owner（随实现保持 current）；
`proposed → implemented` 是同 diff 的正文改写。

**适配（同精神、异形态）**：DSH 用置顶三行 `# Agent Note: <title>` / 空行 / `Status: <status>`，
我们用 `日期：YYYY-MM-DD · 状态：**<状态词>**`（本仓人面文档用中文的语言分工；门禁等价，位置与词表都机械校验）。

**偏离（记录理由）**：不采用 DSH 的 `{lifecycle}/{class}/` 两级路径——
① 本仓需求的可见性是"当前/将来/过去式"的**生命周期**轴，class（feature/bug-fix/process/…）是正交的第二轴；
② 全量一次性迁移的 churn 与误分类风险大于可读性增益；
③ DSH 主仓语料 `repo-harness/09-plugin-author-entry.md`（不在本 pin 树内）明说插件仓继承的是分类学**精神**（一个事实一个 owner、
生成物有生成器、决定有记录），不强制复制其 Notes 机制。note 量级显著上升时重评此条。
不设收卷调研目录：调研住 `_backlog/research/`，持久结论进决定 note。
