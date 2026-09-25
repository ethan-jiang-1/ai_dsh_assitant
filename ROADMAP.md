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

- ▶ **DSH 对齐 · 门禁批**（语言分工/依赖姿态/严格 UTF-8+单结尾换行/新门禁必带反例夹具；卡 §三 A 组：[2026-09-25-dsh-alignment-borrowables](notes/proposed/2026-09-25-dsh-alignment-borrowables.md)）
- ▶ **DSH 对齐 · 文档批**（生成物登记表/tier 表/三重门禁表/探索路由加运行时查询/新行为归属四问/术语锚定括注/snapshots 边界/UPSTREAM 重审触发表；卡 §三 B 组）
- ▶ **DSH 对齐 · 状态可见批**（意图三通道 + 队列标记↔卡片状态词映射 + 卡片四节骨架 + ROADMAP 条目压回 ≤3 行；卡 §三 B16–B17）
- ⏳ `.agents/` 开发 skills（触发=下一次换 pin 或审计轮里同一多步流程真重复；落地时须在 AGENTS.md 写"开发用 vs 模型用"消歧句）
- ⏳ change-scope 脚本（触发=真实"跑错检查/漏跑检查"摩擦出现；最简形态见卡 §五）
- ▶ **真实使用开跑**（用户本人用起来——首批数据已由打磨战役产出：账本 4 技能 9 次真实加载、⏳ 判据对照全部未触发，档案见 `notes/implemented/2026-09-25-smart-assistant-polish-campaign.md` §八；后续用户会话的摩擦即新卡）
- ⏳ E · 名字链接在 Obsidian 可点（触发=窄用真被使用且不可点成为真实摩擦；三选项百行内备选见 [r5 §末](notes/research/archive/2026-09-24-r5-obsidian-interop-survey.md)——用户 2026-09-24 拍板不抢跑）
- ⏳ dsh-obsidian 挂桥（触发=用户想让助手直接操作某个外部 vault；设计参照已录 r5）
- ⏳ 会话日志薄动词 b1/b2（触发=真实使用中真去查历史会话且 rg 配方不够用；b2 后端可用性待细查）
- ⏳ workflow-as-MD（触发=真实使用出现多步编排需求；方向：程序性知识之上，编排是否也为 working folder 的 MD 文件——用户 2026-09-24 提出）
- ⏳ 语义检索 / embedding（触发=真实漏召回；依据：[三线合流 §六](notes/implemented/2026-09-24-tri-line-synthesis.md)、[R1 判据对照 §5](notes/research/archive/2026-09-24-r1-memory-ecosystem-survey.md)、[R3 设计 §7.2](notes/research/archive/2026-09-24-r3-knowledge-layer-survey.md)）
- ⏳ 全自动蒸馏（触发=用量统计显示收益>token+同意成本；采集工具已在场；依据：[R2 缺口清单 §9.3-5](notes/research/archive/2026-09-24-r2-skill-growth-survey.md)）
- ⏳ FTS/trigram 检索升级（触发=grep 真实漏召回；方法参照 [dsh-knowledge-sqlite 实测表（R3 §4.3/§7.2-3）](notes/research/archive/2026-09-24-r3-knowledge-layer-survey.md)）
- ⏳ 跨 harness 共库（触发=第二消费方出现；[memsearch 形态，R1 §6-7](notes/research/archive/2026-09-24-r1-memory-ecosystem-survey.md)）
- ⏳ 技能 license/compatibility 字段（触发=provider 读它们或第二消费方；[1g 审计](notes/implemented/2026-09-24-spec-field-audit.md)）

## 搁置池

> 判据：只有"缺上游 seam"或"缺明确需求"才进这里；被否决的方案不进（那归提案的输赢表）。
> 升 pin（`pnpm sync-dsh`）时顺手回看一遍。条目复活按性质回队列或立新提案。

（空）

## 维护规则

- 轮序调整或新增：直接改本表，并在 notes/ 记一行原因。
- 写条目自检（作者视角，借 DSH 散文标准）：**只拿到 HEAD、没有会话 transcript 的读者，能否解析
  每个引用并核验每个 claim？** 裸简称（R1/r5 §末之类）一律写成可点链接；条目 ≤3 行，正文搬卡。
- 2026-09-24：**立条目制**（借鉴 `ai_dsh_company` ROADMAP D23/D24 之形、按本仓哲学适配：
  只写接下来 / 完成即离队 / 队列=索引 / 两道机械门禁进 verify）。三线提案的 §六延后项
  表移交本队列（⏳ 各行），原表加移交注记；两份提案（tri-line、iteration-rhythm）毕业至
  `notes/implemented/`，全仓引用同步。档案：`notes/implemented/2026-09-24-roadmap-queue.md`。
