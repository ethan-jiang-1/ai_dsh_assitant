---
status: 推敲中
opened: 2026-10-16
---

# 推敲：verify 内联检查体核化——P3 片 8 推进台账

> 立卡：2026-10-16 ｜ 状态：推敲中 ｜ 类型：Task ｜ 可关闭：否 ｜ 授权：2026-10-16 本人在对话中点名推进 **P3 片 8**（原[结构还清 note](../../notes/implemented/2026-10-16-structure-paydown.md)「不做（延后）」条目的延后句子在此刻被触发）；本卡是该授权的**推进台账**（切片推进、停点与证据缺口住这里）。

**问题与期望结果：** `scripts/checks/verify.mjs` 里住着 8–9 个**内联检查体**（实测共 159 行 ≥11 行的 + skill-name 语法 8 行 ≈ 167 行），它们把"检查逻辑"放在了 `verify.mjs` 里——而 [scripts/AGENTS.md](../scripts/AGENTS.md) 纪律 2 的合同是：**可夹具化的纯核放 `scripts/checks/gates/` 的族模块**（收路径/输入、返回问题串数组；`scripts/checks/verify-checks.mjs` 是汇总出口），`verify.mjs` 只拥有"什么算语料、退出码、逐条报告"。
本人得到（外部结果）：改一个检查的判据时，改写族核 + 在**同名夹具**里造红，不必翻 553 行的 runner；判定语义零变化。
**完成条件** = 六族逐族核化（核 + 同名负例夹具 + 接线同 diff）、每族一次提交锚点、`pnpm test:tooling && pnpm verify` 全绿、`verify.mjs` 收敛到 ~420 行。

**当前情况：** 前提已实测（2026-10-16）：553 行里 8–9 个内联体共 ~167 行，**全部可夹具化**——I/O 留 runner、核只收输入（与既有 `gates/*.mjs` 的 `{ repoRoot, packageDir, corpus, … }` 约定一致；commit safety 的 `git check-ignore` 作为注入的 `isIgnored` 谓词）。对卡上数字的两处修正已记在[结构还清 note](../../notes/implemented/2026-10-16-structure-paydown.md)：件数是 8–9 不是 5、收敛目标是 **~420** 不是 ~300。

**未决问题：** `queue: digested proposals graduate out of notes/proposed/`（11 行）的族归属待定——是并入 `notes-governance` 还是新立 `queue` 族，按"一个事实一个家"在动手那一族时定，卡上记结论。

**下一步：** agent 逐族实施：核进 `gates/<family>.mjs` → `verify-checks.mjs` 加导出 → `verify.mjs` 的 check 体缩成"备语料 → 调核 → 报" → 同名负例夹具先造红再绿。

## 验收标准

行为分类（[validation-design](../methods/validation-design.md)）：全部是 **deterministic（工具核）**——无 model behavior（不建 eval），无 human judgment。总判据：**判定语义零变化**（同一份语料下每个核报出的问题串与改前逐字一致），差别只在"住哪"。

| 族 | 核（家） | 可执行验收 | 红的形态 |
|---|---|---|---|
| resolution（4 件：import/paths/reference、runtime tsconfig、skill-name 语法、frontmatter keys） | 扩 `scripts/checks/gates/resolution.mjs` | `pnpm test:tooling && pnpm verify` 绿 + `tests/tooling/resolution.spec.mjs` 夹具 | 夹具给的输入让核报不出问题 = 核没真咬 |
| self-containment | 新 `scripts/checks/gates/self-containment.mjs` | 同上 + `tests/tooling/self-containment.spec.mjs` | 越包相对导入 / `vendor/` 提及 造不出红 |
| home-doc-contract | 新 `scripts/checks/gates/home-doc-contract.mjs` | 同上 + `tests/tooling/home-doc-contract.spec.mjs` | 房间常量或四个工具名缺席造不出红 |
| commit-safety | 新 `scripts/checks/gates/commit-safety.mjs` | 同上 + `tests/tooling/commit-safety.spec.mjs` | 注入的 `isIgnored` 假实现下，该忽略/该跟踪两侧都造得出红 |
| queue | 待定（并入 notes-governance 或新族） | 同上（族名随落地定） | 消化后的提案仍列在 proposed 造不出红 |
| 收尾 | — | `pnpm verify` 41 项绿 + `wc -l scripts/checks/verify.mjs` ≤ 430 | 收敛未达 = 有体内联未抽 |

**排除：** 不改任何检查的**判定语义**（纯搬迁 + 输入外置，问题串逐字不变）；不加新检查；不动 `vendor/`；不动模型可见面；不跑 eval、不动 gen-catalog。

## 收口记录（逐族）

| 族 | 提交 | 状态 | 真证据（红形态 + 门） |
|---|---|---|---|
| ① 立卡 | — | 待做 | 本卡 + 活跃清单 + note 延后条目加指针（零代码） |
| resolution | — | 未开工 | — |
| self-containment | — | 未开工 | — |
| home-doc-contract | — | 未开工 | — |
| commit-safety | — | 未开工 | — |
| queue | — | 未开工 | — |
| 收尾 | — | 未开工 | — |

真证据（真跑过的命令、夹具红形态、行数实测）记在**该族的提交说明**；本表只留族的状态与指针。

## 证据索引（不复述，点进去看）

- 分层合同与 prove-it-red 纪律：[scripts/AGENTS.md](../scripts/AGENTS.md) 门禁三条纪律
- 既有族核与夹具的对名先例：`scripts/checks/gates/backlog.mjs` ↔ `tests/tooling/backlog.spec.mjs`；汇总出口 `scripts/checks/verify-checks.mjs`
- 判定语义的锚：改前每个 check 在仓库现况下报出的问题串（各族提交说明里记"改前/改后同为空"）
- 延后句子的原产地：[结构还清 note](../../notes/implemented/2026-10-16-structure-paydown.md)「不做（延后）」

**关闭条件：** 六族逐族核化落地、`pnpm test:tooling && pnpm verify` 全绿、`verify.mjs` ≤ 430 行 → [结构还清 note](../../notes/implemented/2026-10-16-structure-paydown.md) 的「不做（延后）」条目改写为已交付一行；本卡头部写 `可关闭：是` 并按 [backlog 关闭条件](../README.md)归档进 `_archive/settled_issues/`。
