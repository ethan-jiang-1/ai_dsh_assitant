# 判据复发追踪：eval 注记 + 收口行追问 + 扫描判据收卷

日期：2026-10-08 · 状态：**implemented**

> 承接：[语料吸收审计](../archived/research/2026-10-07-dsh-corpus-absorption-audit.md) R2 的现场实证——
> breakdown 同签名两度红（[BUG-001](../../_backlog/_done/_fixed_bugs/BUG-001-eval-behavior-tasks-red.md) →
> [BUG-003](../../_backlog/_done/_fixed_bugs/BUG-003-eval-floor-red.md)）暴露「修复→判据钉住复发」缺一环；
> 用户批准的 Goal A 切片 2/3（呈批对话 2026-10-08）。

## 决定

1. **eval 任务判据带复发史注记**（`dev/eval/tasks.mjs` breakdown 任务）：注记同签名两红史与根因差异——
   BUG-001（2026-10-01）根因 = 技能目录从未发布进会话（组合层缺口）；BUG-003（2026-10-07）根因 =
   环境泄漏 + 判据自身字面化。**同签名 ≠ 同根因，第二次红先重诊断再复用旧修法**。
2. **交付收口行补可选项「复发追问」**（[notes/README §二之二](../README.md)）：此行为此前红过吗、
   判据钉住复发了吗。推荐不门禁——与 A4 同口径（语义判断不门禁化，本 note 即 [A4 note](2026-10-07-dsh-corpus-absorption.md)
   的部分取代扩展，双方互链）。
3. **扫描判据收卷**：第一轮对抗性语义扫描（12 发现）的八维判据清单收卷为
   [research 台账](../archived/research/2026-10-07-semantic-sweep-criteria.md)；**立技能触发 =
   第三次同型扫描**（重复即建进度 1/3），届时按 DSH `dsh-code-review` 骨架立薄技能，在那之前不预建。
   本 note 是该触发条件的活家（deferred-with-trigger），冻结台账只存判据。

## 输掉的方案

1. **复发检查做成机械门禁**——输给「语义判断不门禁化」（A4 既有裁决）：门禁会逼出凑格式的
   追问行，且「红过几次」的判断依赖读修复 note 的语义。
2. **现在就立语义评审技能**——输给「重复即建」门槛（根 AGENTS.md：第三次重演才立技能）；
   扫描只跑过一轮，判据已收卷，第三次直接取用。
3. **触发条件只写进冻结台账**——输给 notes/README §二（deferred-with-trigger 归决定 note，
   冻结件不再编辑）；台账被引用，不承担活决定。
4. ** prove-it-red 对注记补一轮**——撤回呈批时的此承诺：注记与追问行不是新守卫，无新红可造；
   该判据的红绿证据已由 BUG-003 修复自身承担（`2f88e29`：14 预算扫描不变量断言先红后绿）。

## 交付收口

行为对齐——三要素：触发 = 用户推动 Goal A（「那就推动 goal A」）；用户看到 = 同签名复发可追溯
（任务注记 + 收口行追问）且扫描判据可检索（台账 + 生成索引）；完成条件 = 本节验收逐项对账。
**签收** = `pnpm verify` 全绿 + `pnpm test:tooling` 绿（6 spec 117 tests，真跑见下）。
**未跑项**：`pnpm eval` 全量（本批未触模型可见面——注记是代码注释，不改变行为）；`pnpm test`
全量（改动面 = 注释 + 两页 markdown，tooling 层 + verify 已覆盖；按窄证据不整跑）。

## 验证（真跑）

- `pnpm test:tooling`：6 spec / 117 tests 全绿（1.74s）——eval 判决核与工具核覆盖层。
- `pnpm verify`：35 门全绿（notes 形状 / 断链四连 / gen-notes-index freshness / entry-files）。
