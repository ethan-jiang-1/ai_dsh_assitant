# 2026-09-28 · research 层并入 _backlog（一个思考一个家）

日期：2026-09-28 · 状态：**implemented**（用户 2026-09-28 拍板：「notes/research 这个就没有必要存在了，我们有 _backlog 了」
——推翻本人当日早些「复发才升格、暂不并」的判断，原判断留本文输掉的方案节）。

## 问题

`_backlog/plans/` 立层后，notes/research（已退役） 成了**第二个推敲家**：进行中的调研/推敲有两个可去的
桶（research 底稿 vs plans 卡），「该进哪个桶」的纠结正是来源仓 D31 输掉方案里记录过的病。

## 决定

1. **notes/research（已退役） 目录退役**：进行中的调研 = `_backlog/plans/` 调研卡（补「待答问题 / 待跑实验 /
   喂给谁」字段与形态规范，见 [_backlog/plans/README.md](../../_backlog/plans/README.md)）。
2. **收卷证据台账 = `notes/archived/research/`**（原 notes/archived/research/ 整树 git mv）：
   子目录深度与原路径一致（2 层），14 篇冻结调研的内部相对链接**零改动**；入站引用
   （ROADMAP 残留指针、implemented 卡、docs）同 diff 修为 `notes/archived/research/`。
3. **形态规范随迁**：一手引证 / 证据分级 / 版本基线 / 承重结论内联自足 / 普查亲验，落到
   plans/README（调研卡按此写）；`research/` 的状态行户口检查改挂 `archived/research/`
   （松口径 `已收卷`，冻结文件内容零改）。
4. 当日唯一活跃稿（十维自评）随迁并收卷（结论已消化：[质量维持卡](2026-09-28-harness-quality-upkeep.md)）。

## 输掉的方案

- **「复发才升格、暂不并」（本人原判断）**：理由是本仓 research 无死稿病、两家互链即可——被用户
  拍板推翻：功能重叠本身就是第二事实家，等病发再并 = 明知重叠还养着；本仓 research 与 plans 卡
  的差异只是字段侧重，并入后纠结消失。
- **收卷台账并入 `_backlog/_done/`**：被队列条目与 implemented 卡**活引用**的证据（走查、grand-plan、
  R1–R3）落进「fresh agent 默认忽略」的 `_done` = 埋掉活证据；notes/archived/research/ 保住
  「可读可引的证据档案」语义。
- **收卷台账平铺进 `notes/archived/`**：需改 14 篇冻结稿的状态行与内部链接（深度 3→2）才能过
  状态门禁——违背「冻结不再编辑」；子目录方案零内容改动。

## 验证

- `pnpm verify` 32/32（真跑）；`pnpm test` 289/289（verify 夹具同步改挂 archived/research）。
- 全仓 grep：notes/research（已退役） 断链零残留（dev home 产品数据里的旧指针除外——试车场数据，不追）。
