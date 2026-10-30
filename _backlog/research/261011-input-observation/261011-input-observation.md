---
topic: 使用
intent: "把输入边界 30 天观察的读数落在一处：口径、过滤规则、每周快照与限制，供 30 天后比较输入通道候选。"
---

# 输入边界 30 天观察的读数记录

> 立档：2026-10-11 ｜ 拥有它的卡：[输入边界](../../_archive/settled_issues/261007-input-boundary.md)（本人 2026-10-11 拍板：专用试用环境 + 先观察 30 天）
> 读数命令：`pnpm observe --home <dir>`（脚本 [dev/reports/input-observation.mjs](../../../dev/reports/input-observation.mjs)）

## 口径（2026-10-11 定）

| 指标 | 怎么取（机械） | 读数如何辅助判断 | 限制 |
|---|---|---|---|
| A 自发投递 | 脚本列出「非注入、非面板标记」的本人轮次。分类是**结构判据**：`data.source.kind`（非 `user` 即注入前言）＋ `rpcId: desk-…` 即面板写入；缺 `source` 的旧日志退回文本前缀（含 2026-10-11 前的旧标记 `[桌面] `）。**是否「业务碎片」由人判** | ≥4 次 ≈ 每周一次 → 可能已有自发投递习惯；为 0 需追问原因，不能反证周坐足够 | 一次读数只代表这一段；「非回答提问」是脚本给的启发式提示（前一条助手消息以问号结尾），不是过滤 |
| B 时长 | 账本：①事项 `createdAt` → `times.completedAt`（未闭合的列出挂起天数）；②提案 `proposedAt` → 解决时刻（未决的列出） | 若主要靠周坐闭合，可考虑加强周坐；周度快照只给时间区间，不测精确时长 | **改基说明**：原口径看桌面 `.desk/state.json` 的 gaps；该文件现在只承载房间数据（memories/knowledge/skills），gaps 随唯一桌面退役（2026-10-11） |
| C 入口后的操作 | 每条面板写入的消息**之后那一回合**的工具调用（两代标记都算入口） | 「有入口无调用」＝操作代理信号（干跑已抓到 1 例）；写文件不等于真补数或真拍板，需看内容 | 点击少不能单独证明主动性无价值 |

**剔除规则**：观察环境的前提是「该 home 只用于试用」。机器写的轮次不靠人剔——面板写入带 `rpcId: desk-…`
（两代标记都是），注入前言带 `kind: runtime-context|skill-catalog|time-context|agent-instructions`，
脚本按结构排除。开发/eval/演示会话一律不出现在这个 home 里（那正是选专用环境的原因）。

**环境创建约定**（可重跑）：

**每周快照机制（2026-10-11 定，不占本人时间）**：agent 在本仓会话开始时扫一眼本档；最后一行读数距今 >7 天就用
`pnpm observe --home dev/trial-home-30d` 补摘一行追加在下（触发条件在 [triggers.md](../../triggers.md)）。
不在产品里挂每周排程——那会让产品自己在观察环境里发消息，而 A/C 两项正是要数机器行为。

```sh
export ASSISTANT_DSH_HOME=<repo>/dev/trial-home-30d
bash dev/env/prepare.sh && bash dev/env/setup.sh      # 幂等
pnpm dsh --profile dev --port 0 --no-open             # 交给人之前先 pnpm preflight '<URL>'
pnpm observe --home "$ASSISTANT_DSH_HOME" --label baseline
```

## 读数记录

基线与每周快照都贴在这里（读数块由 `pnpm observe` 直接输出；只追加，不改历史）。

### 基线：`dev/trial-home-30d`，2026-10-11（环境建好、尚未使用）

专用试用环境 `dev/trial-home-30d`（gitignore 覆盖；另建，不碰日用 home 与 dev home）。基线在**任何真人会话之前**摘，
因此三项读数全为空——这正是第 0 天的正确形态；之后每有一周真人使用，就追加一行读数。

**开始日的两次动作（按这个顺序，别颠倒）**：

1. **环境初始化（机器，会在 C 里留一条入口）**：新 home 的工作区注册表为空、`.desk/state.json` 还没生成，
   所以 `pnpm preflight` 对全新 home 会如实报红（`registers no workspaces` / `no .desk/state.json`）。
   正式交给本人之前，在那个 home 跑一次桌面初始化（助手按 `desk-refresh` 写一份骨架），再重跑 preflight 至绿——
   **这一步排在基线之后**（基线必须是无任何活动的空环境），它产生的机器入口不进 A（结构判据排除）。
2. **交给本人开始用**：从 `pnpm dsh --profile dev --port 0 --no-open`（带 `ASSISTANT_DSH_HOME`）拿 URL 并 `pnpm preflight` 复核；
   首条真人会话即第 0 天之后的第 1 天读数起点。

### 读数 baseline（2026-10-11 15:54）

环境：`dev/trial-home-30d` ｜ 会话 0 个 ｜ 本人轮次 0 ｜ `[面板]` 标记 0 ｜ 注入前言 0

**A 自发投递（候选 0 条，"是否业务碎片"由人判）**
- （无：该环境还没有本人轮次）

**B 时长**
- （该环境还没有账本）

**C 入口后的操作（0 次入口）**
- （无：该环境还没有面板写入的入口消息）


### 干跑（**不是基线**）：旧 `dev/trial-home`，2026-10-11

用途：验证读数命令在真日志上算得对。该 home 是 2026-10-01~10-05 的旧现场（4 个会话、无账本），
**不作为观察基线**——基线在选定环境、开始日那天摘。干跑顺带证明了两件事：分类若按文本前缀判，
会把 9 条旧 `[桌面] ` 机器消息与 13 条注入前言算成「本人的话」（本人轮次 15 → 修正为 2）；
以及 C 能抓到「有入口、零工具调用」这种操作代理信号。

### 读数 dryrun（旧 trial-home，非基线）（2026-10-11 15:52）

环境：`dev/trial-home` ｜ 会话 4 个 ｜ 本人轮次 2 ｜ `[面板]` 标记 9 ｜ 注入前言 13

**A 自发投递（候选 2 条，"是否业务碎片"由人判）**
- 2026-10-04 10:33 · da0b6585 · 大客户要求再让 5 个点的折扣，不然就去找别家，但这单毛利本来就很薄，怎么办？
- 2026-10-03 18:26 · 39cb4fdc · 大客户X这单要我再让5个点的折扣，不然就威胁找别家。这单毛利本来就薄，但X明年还有两台视觉检测设备的采购计划，X在我们这行里口碑也大，做成了

**B 时长**
- （该环境还没有账本）

**C 入口后的操作（9 次入口）**
- 2026-10-04 10:41 · da0b6585 · 「我批准知识页「大客户 X 让价现场处置（5 个点）」。请把它从 draft 翻成 stable。完成后加载 desk-r」→ assistant_reflect, skill, skill, assistant_memory, assistant_research, write
- 2026-10-01 01:22 · 8774f7b3 · 「刷新我的桌面：加载 desk-refresh 技能，严格按它把桌面文件重写一遍。」→ **无工具调用**
- 2026-10-03 18:41 · 39cb4fdc · 「我批准知识页「价格让步判决与让步交换结构（客户压价）」。请把它从 draft 翻成 stable。完成后加载 desk-」→ **无工具调用**
- 2026-10-03 18:42 · 39cb4fdc · 「刷新我的桌面：加载 desk-refresh 技能，严格按它把桌面文件重写一遍。」→ skill, assistant_memory, assistant_memory, assistant_research, bash, bash, write, bash
- 2026-10-03 18:42 · 39cb4fdc · 「我批准知识页「管理视角 · 销售」。请把它从 draft 翻成 stable。完成后加载 desk-refresh 技能」→ assistant_reflect, skill, assistant_memory, assistant_memory, assistant_memory, assistant_research, bash, write, bash
- 2026-10-03 18:43 · 39cb4fdc · 「我批准知识页「管理视角 · 财务」。请把它从 draft 翻成 stable。完成后加载 desk-refresh 技能」→ assistant_reflect, skill, assistant_memory, assistant_memory, assistant_memory, assistant_research, bash, write, bash
- 2026-10-03 18:44 · 39cb4fdc · 「我批准知识页「管理视角 · 总经理」。请把它从 draft 翻成 stable。完成后加载 desk-refresh 技」→ assistant_reflect, skill, assistant_memory, assistant_memory, assistant_memory, assistant_research, bash, write, bash
- 2026-10-03 18:45 · 39cb4fdc · 「刷新我的桌面：加载 desk-refresh 技能，严格按它把桌面文件重写一遍。」→ assistant_memory, assistant_memory, assistant_research, bash, edit, bash
- 2026-10-03 18:46 · 39cb4fdc · 「刷新我的桌面：加载 desk-refresh 技能，严格按它把桌面文件重写一遍。」→ skill, assistant_memory, assistant_memory, assistant_research, bash, write, edit, bash
