# 触发演进：propose-only 提案收件箱（阶段 3 全部）

日期：2026-09-24 · 状态：**implemented**
依据：三线合流提案阶段 3（3a 批量边界检测 / 3b 草稿收件箱 / 3c propose-only 默认）；
D10 已定参数（run2skill 形态：批量边界+收件箱+不可变版本链，propose-only 默认）；
R2 §9.3-5 + §6（翻车案例全部指向缺门的全自动；生态收敛在"半自动：建议+人审门"）。

## 决定（3a/3b/3c 合一片）

1. **批量边界 = goal 完成**（3a）：`goal/changed` operation `complete` → `followup()`
   一条 plugin 源**提案槽**消息（与节拍器同构——1e 亲验过的事件面这次直接用；为此走正门
   加了 `@deepseek-ai/dsh-goal` 门面条目：paths + project reference + devDependency，
   type-only augmentation import，同 dsh-host-webserver 先例）。`goalProposalTurns` 配置行
   可关。R2 点名的 sessionQuery+llm.stream+timer 全自动蒸馏零件**继续不用**——延后判据
   不变。
2. **提案收件箱 `skill-proposals/`**（3b）：`<name>.md`，frontmatter
   {status: proposed|approved|rejected|landed, revision, created, updated, source,
   description, whenToUse?}，正文=提议的技能正文。顶层目录（不在 skills/ 内——技能房间
   扫描零接触）。
3. **版本链 = revision 计数器（登记解释，run2skill 语义的等效实现）**：同名重提=改稿
   （revision+1、正文替换）；**审批永远绑定批准时刻的文件内容**——不可变文件链的目的
   （旧批准不得 bless 改稿）被结构性满足，而无需一版一文件。rejected/landed 是留置尸体。
4. **人审 = 手改 status**（与知识 draft 同构）：approved 是人的编辑；`land_skill` 只接受
   approved——落进 skills/ 时 provenance 盖 `proposal:<name>#r<N>`，提案记 landed。
   **没有 agent 自己批准自己的路径**（approved 未落地时拒绝改稿重提——不许从悬着的
   批准底下换内容）。
5. **propose-only 默认**（3c）：提案槽只教 propose_skill；`save_skill` 仍是手动通道
   （人显式要求时）；全自动蒸馏延后（用量统计正是采集其判据证据的工具——1a）。
6. **可见性**：brief 报待审提案（pending_proposals）；curate 报 `proposal-awaiting-land`
   （approved 未落地）与 `proposal-stale`（30 天无人处置，复用 staleResearchDays）。
7. **runner 收尾宽限**：goal 完成边界排队的提案槽 turn 需要跑完——`awaitGoalSettlement`
   加 quiet 窗口（5s 静默 / 20s 上限；1e 修的静止≠结束 bug 的对偶面）。

## 输掉的方案

| 输掉的 | 为什么输 |
|---|---|
| 一版一文件的不可变链 | 目的（审批绑定内容）由 revision 计数器结构性满足；文件链是重量不是目的 |
| session-end 全自动蒸馏 | D10 落选 D；延后判据不变（真实使用数据） |
| agent 自己翻 approved | 没有门；手改文件=人审的物理形态（与知识 draft 同判） |
| 提案塞进 skills/ 子目录 | 技能房间扫描要加特判；顶层 skill-proposals/ 零接触 |
| 提案进 knowledge 房间 | 载体不同（SKILL 语义 vs 知识页）；混住破坏"一个房间一个职责" |

## 证据

- `tests/host/skill-proposals.spec.ts`（5 测试：词汇校验与槽 prompt / 提案不碰技能房间+同名
  改稿 revision+created 保留+未批不能落+手改 approved 后落地 provenance `#r2`+landed
  尸体+落地后重开新轮+悬批下拒绝改稿 / 契约拒绝（坏名/空 description）/ curate 报
  awaiting-land 与 fresh 提案不误报 / 词汇 roundtrip）。**135/135 全绿**；
  typecheck/build/verify 16/16。
- **live E2E**（preset-runner one-shot，2026-09-24，会话
  `session-138b867f-c8bc-468c-89d8-be1217020027`，"Skill proposal slot" 8 处在日志；
  runner 收尾宽限实测生效——提案槽 turn 在 goal 完成边界跑完）：
  (a) 槽消息首行逐字 `[Skill proposal slot] The goal just completed — a natural batch boundary…`；
  (b) propose_skill 结果逐字（revision 1、明说 "does not load until a person approves"）；
  (c) brief Pending 节逐字（`proposal-fixture (r1, proposed)`）；
  (d) 模拟人审 fs 翻 status→approved（live 助手准确指出家根在 assistant/ 子目录）；
  (e) land_skill 结果逐字 + 落盘路径在案；
  (f) curate：learned skills 1→2，digest 含 knowledge 页与阶段 2 夹具的
  `[[staging-gate]]` 悬链仍被正确报出（跨切片一致性顺带复验）。
  **门的意义全程在案**：提案→人审→落地，模型无自批路径。
