# methods/ · 按当前问题选择方法

这里的方法辅助 [backlog 流程](../README.md)：澄清需求、补事实、比较方案、准备验收标准、交接结论。先用下表选一篇，再读它的步骤；每张卡不必跑完整套。执行到需要外部技能的步骤时，才加载完整本体及点名资源；技能未注册或本地缺失时，按 [来源与读取](#外部技能的来源与读取) 查固定版本。读取失败只阻断依赖该技能的步骤，其余工作继续。

backlog 负责把问题想清楚，向 notes 申请后续处理，是前后两段。这里准备结论、依据和必要的验收标准；下游是否形成 note、怎么处理，由 [notes 流程](../../notes/README.md) 决定。申请提交不等于 note 已生成，也不等于下游完成。

## 现在需要哪篇

| 当前情况 | 方法 | 结果写在哪里 |
|---|---|---|
| 需求不清楚，术语有歧义，或问题太大需要拆开讨论 | [澄清需求](requirements-elicitation.md) | 原卡上的目标、边界、已确认回答和待确认问题 |
| 缺事实，需要调研、询问或试原型；收到的报告还未经核实 | [补充证据](requirements-probes.md) | 短结论回原卡，长依据进 [research](../research/README.md) 并链接 |
| 需求已清楚，但不知道怎样算完成 | [设计验收标准](validation-design.md) | 原卡的验收标准，必要时用表格列明 |
| 信息已齐，需要整理需求、比较方案或决定是否关闭 | [整理方案与结论](requirements-synthesis.md) | 原卡的方案、取舍、结论和关闭条件 |
| 结论已确定，需要申请后续处理或指向已有决定 | [申请下游处理](issue-to-note.md) | 原卡的结论与申请去向；是否成为 note 由下游决定 |

通常先澄清需求、补齐事实，再整理方案。决定做的事项，整理方案时先补齐验收标准，再确定方案和必要的分步安排。决定延后、不做或指向已有结论的，不必设计尚未要做的实现验收。

需要用户判断时，写清已知事实、选择的影响、建议和具体问题，等答复后再继续依赖该答复的部分。事实查证由 agent 完成；人的业务选择、品味和授权不能靠猜测补齐。

## 后续需要验证时

这两篇是按需使用的辅助方法，不另立实施流程或验收队列。实施和 note 的维护遵循下游规则。

| 当前情况 | 方法 | 用途 |
|---|---|---|
| 已有验收标准，需要知道用什么证据检查 | [选择证据](validation-evidence.md) | 按 [测试证据地图](../../docs/testing.md) 找已有命令或资产，说明它能证明什么 |
| 声称做完，需要检查是否符合要求 | [判断验收结果](validation-judgment.md) | 逐项记录通过、不通过、证据不足或等待用户判断；结果回到承载该工作的现有记录 |

发现需求不清时，回到具体问题补充确认；发现实现不符合标准时，记录实际差异。不能改标准来迁就实现。

## 方法的维护

这些是持续打磨中的本仓方法，用英文供 agent 执行。文件保留 `name` / `description` / `whenToUse` frontmatter，正文写输入、步骤、结果位置和完成条件。它们不发进 preset，也不自动进入技能发现目录。

方法依据应来自实际使用，或已经完整阅读的外部技能；未试用的适配须如实说明。文档自审和 `pnpm verify` 的形状检查不证明方法有效。问题和结论留在卡片，方法里不维护进度或待办。

## 外部技能的来源与读取

表内技能的原始作者是 Matt Pocock；本仓适配所依据的版本位于 [ethan-jiang-1/skills](https://github.com/ethan-jiang-1/skills/tree/fad900074ddc0ce2f5e612e52ec75fda8a8f36d3)，基线 `fad900074ddc0ce2f5e612e52ec75fda8a8f36d3`。路径均相对此仓库根目录。原作者仓库为 [mattpocock/skills](https://github.com/mattpocock/skills)，本地适配版本不假定与它当前版本相同。

执行时先看当前技能目录：能调用就调用；未注册但能读取完整本体及分支资源的，说明是读源执行后再继续。可在现有技能安装目录或本地 checkout 找表中路径；没有本地副本时，可从上面的固定版本读取。两者都不可用就报告缺少哪个本体、阻断哪一步，继续不依赖它的工作。摘要和 FAQ 只帮助定位，不能替代执行说明。这里不安装技能、不修改全局发现配置。

| 方法 | 需要时读取的技能本体（相对上述版本根目录） |
|---|---|
| [澄清需求](requirements-elicitation.md) | `skills/engineering/grill-with-docs/SKILL.md`、`skills/productivity/grilling/SKILL.md`、`skills/engineering/domain-modeling/SKILL.md`、`skills/engineering/wayfinder/SKILL.md` |
| [补充证据](requirements-probes.md) | `skills/engineering/research/SKILL.md`、`skills/productivity/to-questionnaire/SKILL.md`、`skills/engineering/prototype/SKILL.md`、`skills/engineering/triage/SKILL.md`，含各自点名的资源 |
| [整理方案与结论](requirements-synthesis.md) | `skills/engineering/to-spec/SKILL.md`、`skills/engineering/to-tickets/SKILL.md`；需要分析模块接口时读 `skills/engineering/codebase-design/SKILL.md` |
| [设计验收标准](validation-design.md) | `skills/engineering/tdd/SKILL.md`、`skills/engineering/codebase-design/SKILL.md` |
| [选择证据](validation-evidence.md) | 无外部技能依赖；按本仓 [证据地图](../../docs/testing.md) |
| [判断验收结果](validation-judgment.md) | 需要相应步骤时读 `skills/engineering/code-review/SKILL.md`、`skills/engineering/diagnosing-bugs/SKILL.md`、`skills/engineering/retro/SKILL.md` |
| [申请下游处理](issue-to-note.md) | 无外部技能依赖；向 [notes 入口](../../notes/README.md) 申请处理 |

来源更新时，重新核对实际使用的技能本体和分支资源，再调整本仓方法。技能的 tracker、模板和发布默认行为不替代本仓卡片位置或用户授权。
