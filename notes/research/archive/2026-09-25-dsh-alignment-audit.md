# DSH 对齐自审：上轮声称 vs 实际（第一次补课的依据）

日期：2026-09-25 · 状态：已收卷 · 证据范围：主线亲读 `/Users/bowhead/deepseek-harness/_agent_ready_development` 的
`repo-harness/01–07`、`_coverage/00-corpus-maintenance.md`，加上轮已亲读的 root README / `repo-harness/08` / `09` /
`sdlc-reference/01`；对照本仓当前状态逐项验证。

## 为什么审

用户质疑"这么快就完全对齐了吗"。审下来结论：**上轮做的是"借术语与门禁"，没有做"借结构"**——
而 DSH 那套体系里，结构（每个分区一个 owner、根指令只放 standing orders、生成目录、任务 Skills）
恰是它自己排在最高优先级的四条可迁移原则里的第 1 与第 4 条
（`repo-harness/07-boundaries-and-costs.md:52-58`）。

## 一、结构性缺口（上轮完全没碰）

| # | 缺口 | 我方现状 | 语料依据 | 为什么是结构问题 |
|---|---|---|---|---|
| S1 | **子树 AGENTS.md** | 仓库内 **1 个**（根，约 105 行，布局表 + 命令表 + 硬规则 + 探索路由全在里面） | `_coverage/00:132` 记录 DSH **22 个**（root + 21 子树）；`02:19` 五类问题的首要 owner 是"根级**或子目录** AGENTS.md"；`02:7` 明确反对"所有细节都进入根级指令"；`01:13` 的 fresh-agent 路径是"根 AGENTS.md → 需要时读 DSH 的 packages/AGENTS.md"；`04`/`05`/`08` 各自引用 DSH 的 packages/AGENTS.md、DSH 的 docs/AGENTS.md、DSH 的 snapshots/AGENTS.md、`.github/AGENTS.md`、DSH 的 scripts/AGENTS.md | 根文件承载一切 = 02 §7 点名的两种错误之一；且 DSH 原生指令装载器**本来就按目录链加载**嵌套 AGENTS.md——不建等于放弃一条已通电的路 |
| S2 | **生成目录 + freshness** | 受管生成物只有 `tsconfig.tsx.json`（`gen-paths.mjs`）；`docs/identity.md` 的身份表是**手维护**（靠 verify 交叉检查兜底） | `02:43-49`「生成目录降低查询成本：工具/配置/持久事件/模块关系/capability seam 清单由源码生成并检查 freshness」；`06:23-27` 把 catalog 列为三种查询面之一；`08:55` 内容五形态之"生成 + freshness 门禁" | 手维护的清单一律漂移——**本轮就修过两处**（包 README 的"三房间/三工具/5 入口"、包的 8 入口改 7 入口）；生成物从结构上消除这一类腐化 |
| S3 | **`.agents/skills/`（开发用 Skills）** | **不存在**；6 个 `SKILL.md` 全是产品运行时技能（`presets/assistant/skills/`） | `03:19-24` 两类同名 Skill 必须先分清（repository development vs runtime capability）；`03:7-11` Skills 装的是"要读上下文 + 应用判断 + 执行步骤 + 报告结果"的任务；`07:57` 优先级第 4 条 | 我们**确实有**这类重复流程：live 探针流程（本轮重推 6 次以上）、note 归档判定（本轮现场重推）、换 pin 收尾清单、审计轮。上轮"延后"的理由（等触发）被本轮真实使用证伪 |
| S4 | **负例控制覆盖面** | `verify` 27 条检查；`verify-gates.spec.mjs` 覆盖 11 组核 | `05:32-38`「A guard only guards if the regression fails it…introduce the regression, watch red, revert」；`05:24` 每层只拥有自己可观察的性质 | 上轮纪律写成"只对新检查生效、不追旧账"——等于承认大半门禁没有"会失败"的证据；旧门禁里结构/身份/自包含/链接等正是最该有红证据的 |

## 二、我违背了自己刚立的纪律（过程问题，必须记账）

1. **删掉了证据链**：子代理产出的 sdlc-reference 详细清单（16 项，带行号与原文摘句）被我"收编"进借鉴卡后**直接删除**，
   卡里只剩 18 行摘要。后果是具体的——**两条借项在压缩中丢了**：
   - `解析门面` 术语未锚定：`AGENTS.md:52`、`AGENTS.md:69`、`docs/dev.md:26` 仍写"两个解析门面"，
     而 DSH 的 `Context façade`（`06:47`）是另一个东西；子代理建议改称"两个 tsconfig 解析入口"。
   - `房间/桌面/抽屉` 未映射：`docs/home.md` 通篇用这三个词，DSH 侧无对应词、不可检索，
     子代理建议各给一句"在 DSH 里对应哪层持久化"。
   （教训即纪律本身：`docs/discipline.md`「历史只证明它自己」「一个事实一个家」——**证据删了就不再是证据**；
   现在所有清单统一由 `notes/research/` 承载，卡只做指针。）
2. **上轮汇报把"术语锚定括注"说得像整批完成**，实际完成 5/7 项（host 面 / agent 面 / working folder /
   8 入口 / 服务 已加；解析门面 ×3 处、房间三词未加）。
3. **上轮说"三轮全部落地"**：A 组（门禁批）与 B 组大部分为真，但 B9 部分、S1–S4 完全未做——
   按本仓纪律（"被阻断/未完成的检查不得写成绿色证据"）应当在卡里标出未完成面。

## 三、上轮真正落地的部分（不改口，逐项可验）

- notes 分类学（`notes/README.md` owner 文件 + 生命周期四态 + 状态行规范化 28 篇 + 归档 6 篇 +
  4 条 notes 门禁）：`fa1611c`。
- 三条新门禁（语言分工 / 依赖姿态 / 严格 UTF-8 + 单结尾换行）+ 负例纪律 + 三道门禁表：`6e09eb0`。
- 文档批（tier 段、五处术语括注、运行时查询路由、生成物登记表、归属四问、snapshots 只收边界、
  UPSTREAM 重审触发表）：`4a910b5`。
- 状态词统一（消除"调研中/待拍板/待实施"第二套词）+ 意图三通道 + 卡片骨架：`9a32828`。

## 四、结论与补课清单（进入 `notes/implemented/2026-09-25-dsh-alignment-deepening.md`）

按 DSH 自己的优先级（`07:52-58`）：第 1 条（一个事实一个 owner、根指令只放 standing orders）对应 S1；
第 4 条（Skills 保存需判断的流程）对应 S3；第 5 条（确有组合压力时引入可查询结构）对应 S2；
第 3 条（负例会失败）对应 S4。四条都做，才谈得上"对齐"，而不是"借了几个词"。
