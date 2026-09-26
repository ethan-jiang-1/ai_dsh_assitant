# 队列 · 条目制

> 性质：**根部队列，只写"接下来"**——队列 + 搁置池 + 维护规则；**完成即离队**（不打 ✅，
> 记录活在收尾 note + git）。历史与既成事实不进本文件：合同在 `docs/`，决策与档案在
> `notes/`，现在由 `git log` 说话。
> **队列 = 有序索引，不是全文**：条目 ≤3 行（主题 / 标记 / 链接或触发条件）；全文住
> `notes/proposed/` 的提案或条目开工时的 plan。`pnpm verify` 两道门禁管秩序：
> proposal-scheduled（提案必须在队列有归宿）、proposal-graduated（消化的提案必须离开
> `notes/proposed/`）。
> **每条目换全新对话**：交接靠入口链（AGENTS.md → 本文件 → 条目链接），不靠队列携带历史。
> 标记：▶ 可开工 ｜ ⏸ 等用户拍板 ｜ 🧹 卫生小修 ｜ ⏳ 触发型（不占轮，触发到了变 ▶）。

## 队列

- ▶ **CEO 助手的 Sidebar 培养面**（用户拍板的当前 Goal，进行中）——三个面板已上线并接真实数据（我的桌面＝行动面／知识室＝懂什么／记忆室＝全量记忆审计清单）；桌面协议闭环（助手写 .desk/state.json，面板经 workspaceFiles 读，端到端真跑过）；**就地更正循环**（每行"这条记错了/有问题"→内联输入→送回对话→助手改并刷新）＝养成数字分身的入口；preflight 已加环境就绪关口（防交一个啥都看不到的 URL）。⏸ 待用户：形态问题（主区域整页 vs 右侧栏 tab）、更正循环实测反馈；底层实现（自有 Remote 命名空间/typert）按用户拍板后置到 UX 之后——卡：[2026-09-25-ceo-sidebar-ux](notes/proposed/2026-09-25-ceo-sidebar-ux.md) · **接手入口：[handoff](notes/research/2026-09-26-handoff-ceo-sidebar-cultivation.md)**
- ▶ **专家部署的组合件 v0**（进行中：可装可跑的件已齐——SOP 技能×2 + `pnpm expert-setup` 装配 + read-only 权限形状 + P1 行为 live 验证；迁移带出的"策展技能全缺"真 bug **已修**（baseUrl = profile 目录 → 按包名解析；红夹具 + live 重跑 + 账本三证据），`pnpm eval` 行为回归 **3/3**；剩 §四 的触发项：IM 渠道（等你选）、MCP、概念页抽取）——卡：[2026-09-25-expert-pack-v0](notes/proposed/2026-09-25-expert-pack-v0.md)
- ▶ **会话日志代次配方**（写者已 v4、读方与配方仍写死 v3 的静默失效：开发仪表**已修**（代次无关发现 + 夹具），**模型可见**两处（手册段 + `session-recall` 技能）**已改成代次无关**，验收四条全绿（红夹具 + eval 3/3 + live 探针）；同批修掉这条技能的两处不可用（frontmatter parse 失败被静默 skip、`rg` 包装脚本缺 `--`）——见卡 §四/§六）——卡：[2026-09-25-session-log-generation-recipe](notes/proposed/2026-09-25-session-log-generation-recipe.md)
- 🧹 **信噪比清理包**（进行中，用户已拍板按序全做）：handoff 过时绕过法 / notes/README 陈旧计数 / dev.md 断表 / ROADMAP 条目瘦身 / 卡 §九 链接化——卡：[2026-09-26-signal-noise-sweep](notes/proposed/2026-09-26-signal-noise-sweep.md)
- ⏳ 知识导入的转换与概念抽取（触发=①第一份真实 docx/pdf 文档集出现 ②评测集 v0 就位；依据：[导入纯核 note](notes/implemented/2026-09-25-knowledge-ingest-core.md) §四）
- ⏳ **vendor `lib/` 重建（换 pin 的常规收尾）**（触发=需要 boot/release-smoke/plugin-add 出的 profile 时；测试已改为解析 vendor src，不再依赖它）——三条路与已试步骤见迁移记录 §六
- ⏸ **阶段 0-3 · 评测集 v0**（30–50 条真实经营问题，含应拒答题与判分规则；**题目由你本人出**——这是 G2 关口，agent 只整理格式）
- ⏳ 家的内存段瘦身（合并/下沉记忆、压缩措辞）（触发=真实使用中确实感到摘要偏薄；降级已优雅故不紧急，依据：[责任圈卡](notes/proposed/2026-09-25-owner-mandate-and-real-use-baseline.md) §九）
- ▶ **长期责任圈（职责，不完成）**：北极星＝中小企业 CEO/VP 的**数字分身**（管理岗基座＋跟本人学；首位真人＝用户本人）——总纲 [企业聪明助手总体思路](notes/research/2026-09-25-grand-plan-enterprise-expert-assistant.md)，圈纪律与逐圈记录见[责任圈卡](notes/proposed/2026-09-25-owner-mandate-and-real-use-baseline.md)（职责无终点，不按"完成即离队"退场）
- ⏳ 负例控制存量补课（触发=下一次改动某条尚无红夹具的结构性门禁时，同 diff 补它的造红夹具；存量不追账，理由见[红证据档案](notes/research/archive/2026-09-25-old-gate-red-controls.md)）
- ⏳ `implemented/` 冻结树 / class 子目录（触发=`implemented/` 篇数过百或浏览开始碍事；依据[吸收 note](notes/implemented/2026-09-24-agent-note-lifecycle-absorption.md)）
- ⏳ `/personality` 类会话 overlay（触发=真实需求出现；依据[soul-and-agents](notes/implemented/2026-09-24-soul-and-agents.md)）
- ⏳ 文档词数预算 manifest（触发=docs 腐化实证；判据在 [discipline](docs/discipline.md)）
- ⏳ change-scope 脚本（触发=真实"跑错检查/漏跑检查"摩擦出现；最简形态见卡 §五）
- ▶ **真实使用开跑**（用户本人用起来；首批数据与 ⏳ 对照见[打磨战役 §八](notes/implemented/2026-09-25-smart-assistant-polish-campaign.md)，摩擦即新卡）
- 🔒 ⏳ dsh-obsidian 挂桥（用户判触发）（触发=用户想让助手直接操作某个外部 vault；设计参照已录 r5）
- 🔒 ⏳ 会话日志薄动词 b1/b2（用户判触发）（触发=真实使用中真去查历史会话且 rg 配方不够用；b2 后端可用性待细查）
- 🔒 ⏳ workflow-as-MD（用户判触发）（触发=真实使用出现多步编排需求；方向：程序性知识之上，编排是否也为 working folder 的 MD 文件——用户 2026-09-24 提出）
- ⏳ 语义检索 / embedding（触发=真实漏召回；依据 [三线合流 §六](notes/implemented/2026-09-24-tri-line-synthesis.md)、[R1 §5](notes/research/archive/2026-09-24-r1-memory-ecosystem-survey.md)、[R3 §7.2](notes/research/archive/2026-09-24-r3-knowledge-layer-survey.md)）
- ⏳ 全自动蒸馏（触发=用量统计显示收益>token+同意成本；采集工具已在场；依据：[R2 缺口清单 §9.3-5](notes/research/archive/2026-09-24-r2-skill-growth-survey.md)）
- ⏳ FTS/trigram 检索升级（触发=grep 真实漏召回；方法参照 [R3 实测表 §4.3/§7.2-3](notes/research/archive/2026-09-24-r3-knowledge-layer-survey.md)）
- ⏳ 跨 harness 共库（触发=第二消费方出现；[memsearch 形态](notes/research/archive/2026-09-24-r1-memory-ecosystem-survey.md)）
- ⏳ 技能 license/compatibility 字段（触发=provider 读它们或第二消费方；[1g 审计](notes/implemented/2026-09-24-spec-field-audit.md)）

## 搁置池

> 判据：只有"缺上游 seam"或"缺明确需求"才进这里；被否决的方案不进（那归提案的输赢表）。
> 升 pin（`pnpm sync-dsh`）时顺手回看一遍。条目复活按性质回队列或立新提案。

（空）

## 维护规则

- 轮序调整或新增：直接改本表，并在 notes/ 记一行原因。
- **保留项标记 `🔒`（用户判触发）**：出现在队列行上表示"条件可能已满足，但只有用户能判它成立"——
  会话可以报告与建议，**不得自行判触发、不得删除该行、不得实现该条目**（机械门禁 `reserved items` 管形态）。
- **冻结流程扩张（用户 2026-09-25 拍板，随《总体思路》§七）**：不新增门禁、不再重组 notes 结构，
  除非被**产品回归**驱动；证据阶梯＝领域评测 > 真实用户会话 > 代理会话 > 单元测试 > 机械门禁，
  上层缺席时下层绿不算前进；每周至少一个用户可感知的变化。
- **延后只能住本表**：note 里不得只写"延后/触发="而不给队列归宿——凡在 note 里写下触发条件的行，
  必须同时指明本文件（机械门禁 `deferral homes` 管）；明确**永不**做的（负知识）才留在 note 的输掉的方案里。
- 写条目自检（作者视角，借 DSH 散文标准）：**只拿到 HEAD、没有会话 transcript 的读者，能否解析
  每个引用并核验每个 claim？** 裸简称（R1/r5 §末之类）一律写成可点链接；条目 ≤3 行，正文搬卡。
- 2026-09-24：**立条目制**（借鉴 `ai_dsh_company` ROADMAP D23/D24 之形、按本仓哲学适配：
  只写接下来 / 完成即离队 / 队列=索引 / 两道机械门禁进 verify）。三线提案的 §六延后项
  表移交本队列（⏳ 各行），原表加移交注记；两份提案（tri-line、iteration-rhythm）毕业至
  `notes/implemented/`，全仓引用同步。档案：`notes/implemented/2026-09-24-roadmap-queue.md`。
- 2026-09-25：**`session-recall` 0 加载的条目离队**——问题是"罕见情况的招牌还是描述没接上场景"，
  答案是**两者都不是**：它的 frontmatter parse 失败，加载器静默 skip（`action-plan` 同病）。
  修法与证据：[策展技能被静默跳过](notes/implemented/2026-09-25-curated-skill-frontmatter-silent-skip.md)；
  "真实使用里技能是否真被加载"这一观察由 ▶ 真实使用开跑 条目承担。
