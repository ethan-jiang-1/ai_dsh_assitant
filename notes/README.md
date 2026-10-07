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

- **集中索引只能是生成物**：[`INDEX.md`](INDEX.md) 由 `pnpm gen-notes-index` 生成（只读文件名日期与首个
  标题，正文一律链接过去），freshness 由 `pnpm verify`（`gen-notes-index --check`）守——改了卡没重生成
  即红（2026-10-07 取代"完全不设"的旧裁决：旧裁决针对的是**手维护**清单必然漂移，生成物 + 门禁没有
  漂移通道；手写清单仍然禁止）。
- **不设 `postmortem/`**：事故记录属于"已交付决定"，进 `implemented/`（AGENTS.md 曾列该目录但从未存在，2026-09-25 删除该说法）。
- **不采用 `{lifecycle}/{class}/` 两级路径**（DSH 用它）：偏离理由见 §四。
- 提案过时转 `rejected/` 而非滞留 `proposed/`；`archived/` 只收已交付（implemented）的 note。
- **延后归属按裁决分开**：未裁决的推敲/待用户判触发留 `_backlog/plans/`；已裁决“该做但不现在”的触发条件归决定 note（deferred-with-trigger），旧卡关闭，不另立等待卡。触发到场以引用旧卡的新卡/RFC 重进，不复活毕业卡；完整规则见 [backlog 毕业四门](../_backlog/README.md)，依据 [治理决定](implemented/2026-10-02-backlog-governance-borrow.md)。永不做的负知识留在输掉的方案。

## 二之二、`proposed/` 卡片的骨架（推荐形态）

新卡片四节：`## 问题（可观察行为）` / `## 提案` / `## 输掉的方案` / `## 验收`。
**交付收口行**（随卡毕业为 implemented 时验证节携带，推荐形态）：`行为对齐`——外部结果三要素是什么
（呼应根 AGENTS.md「开工先定外部结果」）、签收方式记其一（用户真机走查 / `pnpm eval` 判决 /
新上下文评审）、未跑项如实列出——机器全绿不替代这一行（语义判断不门禁化，阶段收尾语义审计轮抽查）。
**为什么只推荐不门禁**：机械门禁已覆盖"状态行与目录一致、命名、implemented 必带输掉的方案"
（见 §一）；再钉卡片正文结构会在小切片上逼出凑节标题的噪声。卡片形状是给人读的，语义由评审把关。

**状态词唯一**：卡片不使用"调研中/待拍板/待实施"这类第二套阶段词——生命周期词就是状态（§一表），
可执行性看卡自身的状态行与用户拍板。两套词并存即噪声（用户 2026-09-25 立的设计纪律：一词一义）。

**上游边界（2026-09-28）**：不成熟、未到「问题/方案/验收」三件的思考，先住
[`_backlog/plans/`](../_backlog/plans/README.md) 推敲（毕业四门见其
[`_backlog/README.md`](../_backlog/README.md)）——本目录收毕业后的提案，不是停车场也不是推敲场。
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
3. **implemented 只收真证据**：提案改写为 implemented 时，note 必须记录**真跑过的命令与
   红绿形态**（含造红的红）；被阻断的检查如实写「阻断 + 原因」，不得写成绿；未验项不得写
   implemented。改动面 → 最小可信证据的选择 owner =
   [pre-push-evidence 技能](../.agents/skills/pre-push-evidence/SKILL.md)。
4. **验收写不出 = 提案未成熟**：proposed 卡的「验收」节按 §二之二必须可执行；做不到就回
   [`_backlog/plans/`](../_backlog/plans/README.md) 继续推敲，不进实施。

升级触发：再出现 implemented note 无真证据落档（随性发挥复发）时，把「implemented 必带真跑
命令」升为机械门禁（负例夹具同 diff）；无复发不预铺。

## 三、不设计数清单（2026-09-26 拆除原"当前清单"）

第二份清单必然漂移（§二）——本节曾维护各目录的篇数快照，2026-09-26 审计时计数已全数过期，按自身原则拆除。
各目录现状直接看目录树本身；"接下来做什么"看 [`_backlog/plans/`](../_backlog/plans/README.md) 与 proposed/。
`rejected/` 存仍有防错价值的被否决提案；负知识不与其他提案中的“输掉的方案”混住，去留按 §一。

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
