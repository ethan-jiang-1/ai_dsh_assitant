# 活触发器索引：借鉴 postponed_plans 的索引+义务，不借池

日期：2026-10-08 · 状态：**implemented**

> 承接：用户点名——`ai_dsh_deep_research/_backlog/_postponed_plans` 的思路可以借鉴，
> 因为本仓也可能存在「裁决不做/维持但带活触发器」的关闭件。调查证实存在（见下）；
> 借法形状经用户拍板选定为「只借索引+扫描义务」。
> 制度出场上承 [backlog-governance-borrow](2026-10-02-backlog-governance-borrow.md)（2026-10-02 那轮借鉴未考虑过此格）。

## 缺口（证据）

本仓四门给每张关闭卡都安排了家，但**触发条件本身没有可见面**，散在三处且无任何扫描义务：

- 冻结卡状态行：[260928-workflow-as-md](../../_backlog/_done/_closed_plans/260928-workflow-as-md.md)（「第三次重推演」）、
  [261004-approve-direct-call](../../_backlog/_done/_closed_plans/261004-approve-direct-call.md)、
  [261007-process-budget-audit](../../_backlog/_done/_closed_plans/261007-process-budget-audit.md)（明确写「触发条件以本表为家」）及 2026-09-29 批量清理批多卡；
- 决定 note：[recurrence-tracking](2026-10-08-recurrence-tracking.md)、
  [bug-007](2026-10-07-bug-007-concurrency-lifecycle-minors.md)、turnaround 阶段 4-5 各 owner note；
- `docs/discipline.md` ⏸ 行（docs 词数预算）。

立卡前的取代检查只在有人**重提同一主题**时才起作用；「慢门禁出现」「docs 腐化再犯」这类
触发不是重提案——没人会想到去翻冻结件，触发实际沉底。deep_research 的格子的核心创新
恰好是这两件：**索引行**（裁决+触发一行一条）+ **per-run 扫描义务**（「不是死档」）。

## 决定

1. **新账本 `_backlog/triggers.md`**：每行 = 对象 + 裁决 + 可判定触发条件 + **家的指针**。
   触发的事实家不变（决定 note / 冻结卡状态行 / ⏸ 行）——索引只做可见面，不构成第二事实家。
   写行（关闭件落地带可判定触发时同 diff 加行）与删行（触发到场按写回规则以新卡重进后删行）
   规则住文件头部；收行门槛 = 只收「条件可判定且未满足」的行，「用户点名/需要时重立」这类
   非触发不收（防索引膨胀成 _closed_plans 账本的复本）。
2. **扫描义务进章程**：`_backlog/README.md` 新增专节（收割、走查、阶段收口扫一眼；
   立新卡前的取代检查也扫），AGENTS.md `_backlog/` 行补一句路由。
3. **借法边界**：只借索引+义务，**不借池**——卡不搬家，「位置即状态」「毕业卡永不复活」
   与挂起池边界三条既有裁决不动。

## 输掉的方案

1. **整池照搬**（新建 `_postponed_plans/`、卡搬进去）——输给三条既有裁决（位置即状态、
   毕业卡永不复活、挂起池边界划开两 home）+ 30+ 张已关闭卡的重审成本；本仓四门已给每张卡
   安排了家，deep_research 需要池是因为它的毕业判断产出「不做/维持」后卡无家可归，
   本仓缺的只是可见面，不是格子。
2. **不借**（维持现状）——输给实证：触发条件已实际沉在冻结件里（process-budget-audit
   「以本表为家」即自证），取代检查兜不住非重提案型触发。
3. **扫描义务门禁化**（verify 加第四查）——输给「语义判断不门禁化」同口径（A4 既有裁决）：
   「触发是否到场」依赖读家的语义，机械门禁只能查行存在性，会逼出凑格式行；先以义务运行，
   复发再议（复发才升格判据）。

## 交付收口

外部结果三要素：触发 = 用户点名借鉴 postponed_plans；用户看到 = `_backlog/triggers.md`
活触发器索引（16 行）+ 章程与 AGENTS.md 的扫描义务；完成条件 = 索引行全部指向真实存在的
文件 + `pnpm verify` 绿。**签收** = verify 全绿（真跑见下）。**未跑项**：`pnpm test` 全量、
`pnpm eval`（改动面 = 四页 markdown，零代码零模型可见面；verify 的 notes 形状/断链/
索引互查已覆盖本切片回归面，按窄证据不整跑）。

## 验证（真跑）

- `pnpm verify`：全绿（backlog-liveness 三查 + notes 形状 + 断链四连在内）。
