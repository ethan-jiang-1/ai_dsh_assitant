# 2026-09-24 · 吸收 DSH Agent Note 生命周期四条（点与吸纳，不推翻）

日期：2026-09-24 · 状态：**implemented（门禁 22/22 绿，正反例在案）**

## 为什么

用户指定参考 `deepseek-harness/_agent_ready_development/sdlc-reference/01-agent-note-lifecycle.md`
（DSH `.agents/notes` 的生命周期总结），指令明确：**点和吸纳，不要推翻我们现在**。我们的
notes/ 体系（intents → proposed → implemented + rejected/postmortem/research + 两道提案门禁）
形状不同但已运转；对照后取四条真金，登记四条不吸，其余确认已有。

## 吸了什么（四条）

1. **写 note 的义务收窄**：只覆盖承载**持久决定理由**的改动（代码/测试/现行文档说不清的
   why 与放弃的备选）；机械或局部编辑豁免；决定随当前变更已交付的直接进 `implemented/`，
   不必从 `proposed/` 开始。——原表述"每个非平凡变更"偏宽，DSH 上游自己也收窄过（0008
   复核注记）。
2. **每新增一篇 note 触发取代检查**：搜活跃树找同决定/同机制的旧 note——完整取代则新
   owner 吸收独有理由/备选/后果/验证后**同 diff 删除旧的**（历史归 git，活动树不积压）；
   部分取代双方保留互链。我们原先只有弱版（"事实变化更新原文，反转新建互链"），没有
   触发动作与收敛语义。
3. **「输掉的方案」必带**："a decision recorded without what it beat invites
   re-litigation"——没记击败了什么的决定会重新开讼；备选只能记录、不能编造。我们的提案
   惯例里有（输赢表），但没有成为 implemented note 的统一义务。**升为机械门禁**：
   `implementedAlternativesProblems`（verify 22 检之一）——文件名日期 ≥ 2026-09-25 的
   implemented note 必须含 `## …输掉的方案…` 或 `## …Alternatives…` 节；旧 note 祖父豁免
   （免 retro-write 假备选，恰合"recorded, never invented"）。
4. **提案收敛出口**：过时提案转 `rejected/` 并写一行拒绝原因（而非滞留 proposed/——
   graduation 门禁逼空目录，现在有了明确去处）；`rejected/` 失去防错价值即删。

## 不吸什么（登记，触发条件）

- **`{class}` 封闭集目录**（feature/bug-fix/… 门禁拒未知类）：我们规模小，扁平 + 主题名
  够用，且我们的树有 research/postmortem/intents 不在其类集。触发=implemented/ 过百篇。
- **全格式门禁**（`# Agent Note:` 前三行/`Status:` 互验/`## Problem` 开头等）：推翻我们现有
  自由中文格式，与"不推翻"指令正面对撞。我们只机械化了值得机械化的那一节（输掉的方案）。
- **`archived/` 冻结树 + hash manifest**：反噪声机制本身好（信噪比主线），但 implemented/
  才十几篇，建冻结树是提前付维护费。触发=implemented/ 开始碍浏览。届时不带 manifest
  先立目录也可，登记在触发条目里再议。
- **双语 triplet**：不适用（单语仓）。

## 已有、无需动（确认清单）

proposed→implemented 同 diff 改写为已交付事实；相对 markdown 链接可机械检查；日期=首次
提出日期；不设 notes 集中索引（ROADMAP 是"接下来"的工作队列，不是 notes 索引——两回事，
DSH 的 no-index 理由对我们同样成立）。取代检查实做：本 note 与
[roadmap-queue](2026-09-24-roadmap-queue.md) 部分相邻（都管 notes/ROADMAP 秩序），互链不
收敛——那篇管队列机制，这篇管 note 生命周期义务。

## 输掉的方案

- **全盘照搬 DSH 生命周期**（含 class 目录/格式门禁/归档 manifest）：输给"不推翻"指令与
  当前规模——四条真金之外的东西在这个体量下是结构税，且我们的树形状（research/
  postmortem/intents）本来就不兼容它的类集。
- **「输掉的方案」门禁不设祖父豁免、旧 note 补写备选**：输给"备选只能记录不能编造"——
  为过门禁 retro 写出的备选是编造，恰是这条规则要防的。
- **用 `Status:` 行与目录互验**：我们的状态行是中文粗体、语义自由（proposal 毕业词表已
  机械化），加第三套状态语法是重复表达；目录本身就是状态（proposed/ 在场=未毕业，
  graduation 门禁已管）。

## 验证

`pnpm exec vitest run tests/verify-gates.spec.mjs` 10/10（新增正反例：门槛日期后的中文/
英文节名过、裸决定报、祖父豁免过）；`pnpm verify` 22/22（新检
`notes: implemented notes carry what they beat (输掉的方案)`）。

## 延伸（2026-09-24 同日晚）：WIP 卡片制（用户拍板）

用户指令：进行中的工作必须**显式化**——开工即立卡 `notes/proposed/`，粗体状态行即看板列
（调研中 → 待拍板 → 待实施 → 毕业），随进度移动。这与 DSH 的 `proposed/` 语义严丝合缝
（"未完成或仅部分完成的重大未来工作"），也与我们吸收的①互补不矛盾：**随当前变更已交付的
决定跳过 proposed 直接进 implemented；跨会话的长线工作（调研线、待建提案）以卡片住在
proposed/**。深评证据链仍住 `notes/research/`，卡片链接之；两道提案门禁不变，毕业照旧走
"同 diff 改写为已交付事实"。首两张卡：obsidian-interop、session-log-memory（同日立）。
