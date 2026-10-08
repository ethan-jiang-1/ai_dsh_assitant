# playbooks_plan_and_validate/ · 需求对齐与验收方法演练场

本区是本项目长期维护的 **SKILL 形态方法实验场**：把上游能力适配到本仓的
[plans](../plans/README.md)，持续反复打磨，不发进 preset，也不自动进入技能发现目录。
它不追求适配各种项目，不承诺 promote 成通用 `.agents/skills/`；SKILL 形态只是为了让 agent
更容易消费。方法住这里，某件工作的判断住 plans，证据住 [reference](../reference/README.md)；
四门、授权和生命周期以 [章程](../README.md) 与 [notes 契约](../../notes/README.md) 为准。
这里不另立 tracker、排期或验收队列。

## 按需要读取

**先读入口，再按当前缺口展开；不是每张卡都跑完整套技能。**

| 现在要解决什么 | 读取 | 留下什么 |
|---|---|---|
| 意图模糊、词义冲突、判断没信心，或想法大到一次访谈装不下 | [requirements-elicitation](requirements-elicitation.md) | 本仓卡、人的确认边界、技能加载规则、澄清与决策地图 |
| 需要查事实、问别人、摸原型；或外部原始请求需要先核实 | [requirements-probes](requirements-probes.md) | 补证据的三种探针及 raw-request 分诊入口；结论回写消费卡 |
| 已对齐，需要编译、设计验收、评估候选切片或作毕业判断 | [requirements-synthesis](requirements-synthesis.md) | 本仓规格/验收、在授权范围内的候选拆解、四门判断或具体阻塞 |
| 需求已确认但“怎么算完成”仍模糊 | [validation-design](validation-design.md) | 同一张 plan 内的行为分类、验收矩阵、负例/互补状态、证据 owner 和真人判断点 |

后两篇先读入口的 **Human confidence gate / Load engines**，具体步骤分别留在各篇。
入口只在分支到场时引向它们；问卷与原型结果回到访谈，不自动变成规格或实施。

## 长期实验场契约

- 每份方法文档用英文、`kebab-case.md`，正文按输入、步骤、产物落点、完成或等待条件组织；
  frontmatter 保持 `name` / `description` / `whenToUse`，因为这是 agent 易于消费的形状，不是通用技能发行承诺。
- **进来的是有可核来源的方法草稿**：重复推敲的实证，或用户点名借鉴且已经读过完整本体的项目适配。
  后者可以尚未试用，但须如实标为未验证；摘要只能帮助定位本体，不能代替执行协议。
- 本区无卡片编号/状态行；`pnpm verify` 的 `playbookFrontmatterProblems` 只检查文档形状。
  语法绿不证明方法有效，也不证明上游技能已能被 harness 发现。
- **不设毕业线**：在本仓持续使用、复盘、拆分、合并和重写；真实事项试用是校准证据，
  不是 promote 条件。若未来需要独立通用技能，另立明确决定，不把本区默认搬走或复制两份。

当前需求三篇与验收设计篇均是持续打磨中的项目适配草稿；文档自审不算真实事项试用。

## 上游与本仓适配

汲取的是 FAQ 09 的 **“技能是引擎，本仓流程是容器”**：按功能补短板，逐个引入；
用完整协议喂输入、把产物接回下一环，让事实查证由 agent 承担，判断和授权不被技能接管。
“查证外包 / 按推荐确认 / 产物流动”的实际操作分别落在上述三篇，不在此复制协议。
**需求阶段没信心就请真人确认**；技术自主权不能绕过这一边界。

| 上游协议（相对上游 checkout） | 本仓借用及适配位置 |
|---|---|
| `skills/engineering/grill-with-docs/SKILL.md`、`skills/productivity/grilling/SKILL.md`、`skills/engineering/domain-modeling/SKILL.md` | 入口篇：组合访谈引擎；术语/取舍回本仓卡与现有 owners，不新建 glossary/ADR |
| `skills/engineering/wayfinder/SKILL.md` | 入口篇：大想法的决策地图；用卡内问题/依赖，不建 tracker、不自动取任务 |
| `skills/engineering/research/SKILL.md`、`skills/productivity/to-questionnaire/SKILL.md`、`skills/engineering/prototype/SKILL.md`（含分支资源） | 探针篇：按未知补证据，明确消费者；原型保留来源，判断不确定时不猜 |
| `skills/engineering/triage/SKILL.md`（含关联资源） | 探针篇：只作外部 raw-request 核实入口，复用本仓拒绝/缺陷记录与授权边界 |
| `skills/engineering/to-spec/SKILL.md`、`skills/engineering/to-tickets/SKILL.md` | 收口篇：编译和切片纪律写回本仓模板；保留必要证据路径/验收命令，不发布 ready 标签 |
| `skills/engineering/ask-matt/SKILL.md`（含阶段边界资源） | 收口篇：保持对齐依据；适配自动压缩和跨会话，不承诺上下文永不中断 |

FAQ 查证范围：上游 `_faq_on_digest/09_skills-for-requirements-engineering-of-agent-apps/` 的
`question.md`、`answer.md`、`skill-mapping.md`、`embed-into-existing-system.md`、
`max-leverage.md`。FAQ 负责功能位与嵌入精神，技能源负责运行协议；本仓 owners 负责落点、
证据标准和授权，三者有冲突时明确适配，而不是把上游默认当成本仓新制度。

基线 `fad9000`；checkout 位置、查证历史、纠错理由和验证记录见
[决定记录](../../notes/implemented/2026-10-08-requirements-elicitation-playbook.md)。
上游更新时重读所用协议及分支资源；本轮不 vendor、不安装、不修改全局发现配置。
