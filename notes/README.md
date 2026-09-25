# notes/ —— 开发记忆与证据链（本目录的分类 owner）

> **每个目录装什么、状态怎么读、由谁维护，以本文件为准**——职责由一个具名文件拥有，不由惯例拥有
> （借自 DSH `.agents/notes/` 的分类学：`_agent_ready_development/repo-harness/08-repository-taxonomy.md`、
> `sdlc-reference/01-agent-note-lifecycle.md`；对齐与偏离登记见 §四）。
> **工作队列不在这里**：接下来做什么只读 [`ROADMAP.md`](../ROADMAP.md)（队列=索引，完成即离队）。

## 一、状态轴：一眼怎么读

| 位置 | 装什么 | 状态词（状态行里） | 读者怎么用 |
|---|---|---|---|
| `proposed/` | 未完成或仅部分完成的**重大未来工作**（提案） | `proposed` | 看问题/方案/验收/风险；**不能当已交付** |
| `implemented/` | 已交付决定 + 它击败的备选 + 后果 | `implemented` | **当前 rationale owner**，随实现保持 current |
| `rejected/` | 被否决的提案 + 一行拒绝原因 | `rejected` | 只在还能阻止同一个可信错误时保留；失效即删 |
| `archived/` | 未来决策价值低的 implemented 历史 | `implemented` + 一行 `已归档：YYYY-MM-DD` | 只作历史引用，**冻结不再编辑**，不是当前权威 |
| `research/` | 进行中的开发者调研底稿 | `进行中` | 工作面 |
| `research/archive/` | 已收卷的调研（结论已消化） | `已收卷` | 证据档案：可读可引，不再是工作面 |
| `intents.md` | 用户原始意图清单（所有设计的判据） | — | 判据唯一权威 |

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

## 三、当前清单（2026-09-25 重整）

- `proposed/`：活动提案见目录本身（文件存在=有待评审的未来工作）。
- `implemented/`：38 篇（当前权威决定与理由）。
- `rejected/`：空——先立目录与门禁，等第一个被否决的提案入住（负知识不与"输掉的方案"混住）。
- `archived/`：6 篇（2026-09-23/24 的战役与外部吸收记录；决定已消化、只余历史引用价值）。
- `research/`：空（无进行中调研）；`research/archive/`：9 篇（r1–r6 普查与三份 shortlist，全部已收卷）。

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
