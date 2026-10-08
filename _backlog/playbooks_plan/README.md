# playbooks_plan/ · 推敲方法的演练场（playbook 草稿区）

> 性质：**开发方法论 playbook 的草稿区**——把"这件事该怎么推敲"写成可复用、可调整的
> **SKILL 形态**文档，先在 `_backlog/` 里打磨，成熟后毕业为**开发用技能**（`.agents/skills/`）。
> 它不是推敲卡（不承载某一件具体工作的判断材料，那是 [plans/](../plans/README.md)），
> 也不是模型可见面（不发进 preset）。规矩手册 = [`../README.md`](../README.md)。

## 为什么有这个区（与既有三处刻意不重叠）

一个事实一个家：`_backlog/` 里已经有三种东西在管"想法怎么变成工作"，本区是第四种，
管的是**方法本身**：

| 家 | 装什么 | 时间指向 |
|---|---|---|
| [`plans/`](../plans/README.md) | 某一件具体工作的推敲（问题/证据/候选/毕业门） | 这件事的现在 |
| [`reference/`](../reference/README.md) | 喂那些卡的调研证据 | 这件事的证据 |
| [`../README.md`](../README.md)（章程） | 制度：布局、四门、铁律 | 常设 |
| **`playbooks_plan/`（本区）** | **"该怎么推敲"的方法**——提问纪律、探针路由、成文形态 | 下一次任何事 |

判据：**卡片会被毕业，方法不会**——同一套提问纪律要在下一张卡上再用一遍，所以它必须有
一个不属于任何单张卡的家。这正是根 `AGENTS.md`「重复即建」规则针对的情形；本区是那件
开发技能**毕业之前的演练场**。

## 这里的文件是什么形态

- **`README.md`**（本文件）= 本区的账本与留区契约。
- **`*.md`（SKILL 形态）**= 一份 playbook 草稿，**带 YAML frontmatter**（`name` / `description` /
  `whenToUse`），正文按"什么时候用 → 怎么做 → 硬细节 → 完成线"组织，与
  [`.agents/skills/`](../../.agents/skills/) 下的在役技能同形——这样毕业就是**搬家**，
  不是重写（正文按在役语料校准，去掉"草稿区"口径）。
- **英文**：进 agent 上下文的方法文档按本仓语言分工用英文；本 README 是人读的账本，用中文。

## 为什么放 `_backlog/` 而不是直接建技能

1. **先调整**：方法的形状要在一到两轮真实推敲里被用过、被顶回来、再改，才配进
   `.agents/skills/`（在役技能会被 fresh agent 直接信任，草稿不该享受这份信任）。
2. **不占工作面**：`_backlog/` 是"没点名不取用"的区（见 [章程](../README.md) 谁写谁读），
   草稿在这里不会污染开工入口链。
3. **毕业通道已经存在**：成熟 = 满足留区契约的毕业条件（下节），此时 `git mv` 成
   `.agents/skills/<name>/SKILL.md`；技能语法门对两处**同一把尺**——`pnpm verify` 的
   `contract: skill files carry valid frontmatter` 一查同时跑 `skillFrontmatterProblems`
   （两个在役 home，`<name>/SKILL.md` 形态）与 `playbookFrontmatterProblems`（本区，扁平
   `<name>.md` 形态），所以草稿在留区期间**就已经**被 frontmatter 校验覆盖，不会等到毕业才发现
   语法坏了。

## 留区契约

- **什么进来**：把某个**反复出现的推敲动作**写成方法（提问纪律、证据路由、成文形态），
  且它已经在至少一轮真实推敲里被用过——**空想的方法不进**（无实证来源的 playbook
  会用一套自洽的话术伪造权威）。
- **什么不进**：某一件具体工作的判断材料（→ [`plans/`](../plans/README.md)）；
  调研证据（→ [`reference/`](../reference/README.md)）；已经定稿且在役的方法（→
  [`.agents/skills/`](../../.agents/skills/)，直接建技能）。
- **命名**：`kebab-case.md`，与它将来的技能目录同名——毕业 `git mv` 后零改名。
- **无编号、无状态行**：本区不是卡片区，`backlog-liveness` 门禁只管 `plans/` `bugs/`
  `reference/` 三区（本区的语法由技能 frontmatter 门覆盖）。
- **毕业即搬走**：成熟后 `git mv` 进 [`.agents/skills/<name>/SKILL.md`](../../.agents/skills/)，
  本索引删行；**与在役技能同名时不许并存**（同一份方法两个家必然漂移）。

## 索引

| Playbook | 一句话 | 状态 |
|---|---|---|
| [requirements-elicitation.md](requirements-elicitation.md) | 需求推敲——把模糊意图磨成能呈批的提案：frontier 提问纪律、fact/decision 分离、三类探针路由、自主权边界提问类，结论落 `plans/` → `proposed/` | 草稿（2026-10-08 立；待一到两轮真实推敲校准后毕业为 `.agents/skills/requirements-elicitation/`） |
