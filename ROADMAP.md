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

- ▶ **真实使用开跑**（不占开发轮；延后项触发的数据源——用量账本 `skill-usage.json` 已在采集。开发队列在此期间空转是真实状态）
- ⏸ **发布面裁决**：v0.1.0 `npm publish` 还是继续 private（用户拍板；release-smoke 已绿，`docs/discipline.md` 发布纪律已对齐）
- 🧹 **使用前清扫**：dev home 夹具尸体（archive 三 bundle + 悬链 `[[staging-gate]]`）+ 家 parked 线索 promote（目标=已有 decision 记忆）
- 🧹 **微切片**：curate 附 archive 规模一行（"N retired bundles, M snapshots"——live 助手观察登记）
- ⏳ 语义检索 / embedding（触发=真实漏召回；依据：三线提案 §六、R1/R3）
- ⏳ 全自动蒸馏（触发=用量统计显示收益>token+同意成本；采集工具已在场）
- ⏳ FTS/trigram 检索升级（触发=grep 真实漏召回；方法参照 dsh-knowledge-sqlite 实测表）
- ⏳ 跨 harness 共库（触发=第二消费方出现；memsearch 形态）
- ⏳ 技能 license/compatibility 字段（触发=provider 读它们或第二消费方；1g 审计 note）

## 搁置池

> 判据：只有"缺上游 seam"或"缺明确需求"才进这里；被否决的方案不进（那归提案的输赢表）。
> 升 pin（`pnpm sync-dsh`）时顺手回看一遍。条目复活按性质回队列或立新提案。

（空）

## 维护规则

- 轮序调整或新增：直接改本表，并在 notes/ 记一行原因。
- 2026-09-24：**立条目制**（借鉴 `ai_dsh_company` ROADMAP D23/D24 之形、按本仓哲学适配：
  只写接下来 / 完成即离队 / 队列=索引 / 两道机械门禁进 verify）。三线提案的 §六延后项
  表移交本队列（⏳ 各行），原表加移交注记；两份提案（tri-line、iteration-rhythm）毕业至
  `notes/implemented/`，全仓引用同步。档案：`notes/implemented/2026-09-24-roadmap-queue.md`。
