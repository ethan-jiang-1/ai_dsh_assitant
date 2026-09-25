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

- ⏳ 升级 pin 到 `dsh-v0.1.7-rc.2`（**用户 2026-09-25 拍板：等并行方案会话落定后自动启动**——判据=它的在制文件（`notes/research/2026-09-25-grand-plan-*.md` 与 `notes/README.md`）被提交、工作树只剩本仓自身改动；依据：上游已有 0.1.5-rc.3 / 0.1.7-rc.1 / 0.1.7-rc.2，本仓钉 `dsh-v0.1.5-rc.2`，落后两个 minor RC；兄弟仓 `ai_dsh_architect` 已钉 0.1.7-rc.1。**不并发启动**：pin 升级触及 `vendor/`、两份 tsconfig 解析入口与 `docs/discipline.md` 纪律表，按"同仓并发会污染提交边界"的教训须串行）
- ⏳ 技能触发面：`session-recall` 在账本窗口与全量日志里都是 0 加载（另 5 件策展技能都被加载过）——判它是"罕见情况的招牌"还是"描述没接上真实场景"（触发=真实使用里确实需要回忆历史会话；依据：[责任圈卡](notes/proposed/2026-09-25-owner-mandate-and-real-use-baseline.md) §十一）
- ⏳ 家的内存段瘦身（合并/下沉记忆、压缩措辞）（触发=真实使用中确实感到摘要偏薄；降级已优雅故不紧急，依据：[责任圈卡](notes/proposed/2026-09-25-owner-mandate-and-real-use-baseline.md) §九）
- ▶ **长期责任圈（职责，不完成）**：按圈推进产品收敛——每圈测差距→切片→更新队列→摆下一圈；圈纪律、意图级仪表与逐圈记录见[责任圈卡](notes/proposed/2026-09-25-owner-mandate-and-real-use-baseline.md)（职责无终点，本行不按"完成即离队"退场）
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
- **延后只能住本表**：note 里不得只写"延后/触发="而不给队列归宿——凡在 note 里写下触发条件的行，
  必须同时指明本文件（机械门禁 `deferral homes` 管）；明确**永不**做的（负知识）才留在 note 的输掉的方案里。
- 写条目自检（作者视角，借 DSH 散文标准）：**只拿到 HEAD、没有会话 transcript 的读者，能否解析
  每个引用并核验每个 claim？** 裸简称（R1/r5 §末之类）一律写成可点链接；条目 ≤3 行，正文搬卡。
- 2026-09-24：**立条目制**（借鉴 `ai_dsh_company` ROADMAP D23/D24 之形、按本仓哲学适配：
  只写接下来 / 完成即离队 / 队列=索引 / 两道机械门禁进 verify）。三线提案的 §六延后项
  表移交本队列（⏳ 各行），原表加移交注记；两份提案（tri-line、iteration-rhythm）毕业至
  `notes/implemented/`，全仓引用同步。档案：`notes/implemented/2026-09-24-roadmap-queue.md`。
