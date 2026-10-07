# BUG-003：eval 行为地板 2/5 红——breakdown-uses-skill 复发 + first-open-intake 新红

> 严重级别：P1（重要——评测是行为回归的主仪表，红着的主仪表让每次交付都带噪声；与 BUG-001 同判据）｜发现：2026-10-07（巡检全量跑）｜状态：活跃

## 症状

`pnpm eval` 3/5（dev home，2026-10-07）：
- `breakdown-uses-skill` FAIL——答案不含「停止条件」层，**与 [BUG-001](../_done/_fixed_bugs/BUG-001-eval-behavior-tasks-red.md)（2026-10-01）同签名**（当时根因=技能目录不发布 + wrote-path 判定窄，10-02 修复验 5/5）；
- `first-open-intake` FAIL——`first-conversation` 技能未按名加载（whenToUse 不触发）；
- desk-refresh-loop / scope-honesty / continuity-from-home PASS（BUG-001 修复对 desk 侧仍有效）。

## 根因（假设）

2026-10-07 opening-brief 四片（`7fe774a` auto-send 退役 / `636a4a6` 拍板感 / `532c19d` 周坐 / `fda4495` 弧线收口）是模型可见面改动，落地时未跑全量 eval——**审计 R2「模型可见面回归资产薄」的现场实证**（A2 路由硬化当日才落，堵住的是未来不是存量）。first-open-intake 大概率 Slice 1 首开行为变化（auto-send 退役改变首次消息模式）所致；breakdown 复发指向技能 whenToUse 竞争再稀释或段落组装变化。验证途径：`git stash` 对照 / 逐 slice 二分。

## 复现

`pnpm eval -- --only breakdown-uses-skill`；`pnpm eval -- --only first-open-intake`（全新 home 复现注意 BUG-001 的凭据 0600 教训）。

## 修复关联

修复完成判据（沿用 BUG-001）：全新 home 上 5/5 且连续两轮全绿；证据面 = [语义扫描报告](../reference/tech-exploration/261007-semantic-sweep-src.md) 收口节 + 本卡。
