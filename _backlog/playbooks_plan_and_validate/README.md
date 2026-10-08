# playbooks_plan_and_validate/ · 需求对齐与验收方法演练场

本区是本项目长期维护的 **SKILL 形态方法实验场**：把需求对齐与质量验收沉淀为本仓自己的
可复用能力，服务 [plans](../plans/README.md) 的产出质量（需求清楚、验收有方）。
它持续反复打磨，不发进 preset，也不自动进入技能发现目录；不追求适配各种项目，
也不承诺 promote 成通用 `.agents/skills/`——SKILL 形态只是为了让 agent 容易消费。
某件工作的判断住 plans，证据住 [reference](../reference/README.md)；四门、授权和生命周期
以 [章程](../README.md) 与 [notes 契约](../../notes/README.md) 为准。
这里不另立 tracker、排期或验收队列。

## 按需要读取

**先确定自己在哪条链，再按当前缺口展开；不是每张卡都跑完整套。**

### 需求链：决定要做什么

| 现在要解决什么 | 读取 | 留下什么 |
|---|---|---|
| 意图模糊、词义冲突、判断没信心，或想法大到一次访谈装不下 | [requirements-elicitation](requirements-elicitation.md) | 本仓卡、人的确认边界、技能加载规则、澄清与决策地图 |
| 需要查事实、问别人、摸原型；或外部原始请求需要先核实 | [requirements-probes](requirements-probes.md) | 补证据的三种探针及 raw-request 分诊入口；结论回写消费卡 |
| 已对齐，需要编译、评估候选切片或作毕业判断 | [requirements-synthesis](requirements-synthesis.md) | 本仓需求规格、边界、候选拆解、四门判断或具体阻塞 |

### 验证链：判断做出来没有

验证链只消费已确认的 plan；不能替需求链补产品决定，也不能用验收结果偷偷改需求。
**时序**：validation-design 在 synthesis 的切片评估与毕业判断**之前**——仅当四门判断指向
doing-now/proposal（需要可执行验收）才需要矩阵，deferred/rejection/digestion 出口不需要；
validation-evidence 在实施前或实施中指定证据，validation-judgment 在实施后收货。

| 现在要解决什么 | 读取 | 留下什么 |
|---|---|---|
| 已确认的行为还没有可判定的完成条件 | [validation-design](validation-design.md) | 同一张 plan 内的验收矩阵、行为分类、负例/互补状态和真人判断点 |
| 计划已有判据，需要选择可信证据 | [validation-evidence](validation-evidence.md) | 现有测试、组合、渲染、eval 或真人证据 owner；不建新队列 |
| 实施声称完成，需要逐行收货和归因 | [validation-judgment](validation-judgment.md) | pass/fail/blocked/human-pending 结果、限制、回退路径或需求缺口 |

需求链的缺口回到需求篇；验证链发现判据改变了意图时也回到需求链。需求入口的
**Human confidence gate** 是两链共用的判断边界——验证链遇到不确定的产品选择同样回到人；
**skill loading** 规则约束任何被点名的上游技能。验证链不重新进行访谈。

## 长期实验场契约

- 每份方法文档用英文、`kebab-case.md`，正文按输入、步骤、产物落点、完成或等待条件组织；
  frontmatter 保持 `name` / `description` / `whenToUse`，因为这是 agent 易于消费的形状，不是通用技能发行承诺。
- **进来的是有可核来源的方法草稿**：重复推敲的实证，或用户点名借鉴且已经读过完整本体的项目适配。
  后者可以尚未试用，但须如实标为未验证；摘要只能帮助定位本体，不能代替执行协议。
- 本区无卡片编号/状态行；`pnpm verify` 的 `playbookFrontmatterProblems` 只检查文档形状。
  语法绿不证明方法有效，也不证明上游技能已能被 harness 发现。
- **不设毕业线**：在本仓持续使用、复盘、拆分、合并和重写；真实事项试用是校准证据，
  不是 promote 条件。若未来需要独立通用技能，另立明确决定，不把本区默认搬走或复制两份。

当前需求三篇与验收三篇均是持续打磨中的项目适配草稿；文档自审不算真实事项试用。

## 能力与依赖

这些 playbook 是**本仓自己的能力**：每篇独立定义本仓的输入、步骤、产物落点和完成线。
唯一的外部依赖是 **Matt Pocock 的 SKILL 本体**——各篇写明执行时需要哪个技能、喂什么输入、
结果回哪里；技能在会话目录里可调用就调用，不可调用但完整本体可读就读源并如实声明，
两者都不可行就停住该分支。本仓 owners（plans/notes/docs/testing/snapshots）负责落点、
证据标准和授权；**需求阶段没信心就请真人确认**，技术自主权不能绕过。

| 本仓能力 | 依赖的 SKILL 本体（相对上游 checkout） |
|---|---|
| [requirements-elicitation](requirements-elicitation.md)：访谈、术语、大想法决策地图 | `skills/engineering/grill-with-docs/SKILL.md`、`skills/productivity/grilling/SKILL.md`、`skills/engineering/domain-modeling/SKILL.md`、`skills/engineering/wayfinder/SKILL.md` |
| [requirements-probes](requirements-probes.md)：research/问卷/原型与 raw-request 核实 | `skills/engineering/research/SKILL.md`、`skills/productivity/to-questionnaire/SKILL.md`、`skills/engineering/prototype/SKILL.md`（含分支资源）、`skills/engineering/triage/SKILL.md`（含关联资源） |
| [requirements-synthesis](requirements-synthesis.md)：编译需求、候选切片与四门判断 | `skills/engineering/to-spec/SKILL.md`、`skills/engineering/to-tickets/SKILL.md`、`skills/engineering/codebase-design/SKILL.md`、`skills/engineering/ask-matt/SKILL.md`（阶段边界资源） |
| [validation-design](validation-design.md)：验收判据与矩阵 | `skills/engineering/tdd/SKILL.md`（红灯先行/独立预期值/垂直切片）、`skills/engineering/codebase-design/SKILL.md`（seam 词汇） |
| [validation-evidence](validation-evidence.md)：证据路由 | 表主是本仓 [testing 证据地图](../../docs/testing.md)与现有 owners；上游无对应技能本体 |
| [validation-judgment](validation-judgment.md)：收货与归因 | `skills/engineering/code-review/SKILL.md`（双轴分报）、`skills/engineering/diagnosing-bugs/SKILL.md`（失败归因回环）、`skills/engineering/retro/SKILL.md`（验收漏检沉淀为检查/标准） |

表未列出的上游技能 = 本仓无对应功能位，取舍理由见决定记录（如 `pr` 的合并证据打包、
`improve-codebase-architecture` 的结构门均不进 plan 验收）。

上游 FAQ（`_faq_on_digest/09_…`、`10_…`）只用于定位技能与发现缺口，不是能力依据；
协议与分支资源以 SKILL 本体为准。基线 `fad9000`；checkout 位置、查证历史、纠错理由和
验证记录见 [决定记录](../../notes/implemented/2026-10-08-requirements-elicitation-playbook.md)。
上游更新时重读本表点名的本体及分支资源；不 vendor、不安装、不修改全局发现配置。
