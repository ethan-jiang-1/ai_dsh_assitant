# _done/ · 归档（位置即状态）

> 归档件默认忽略、点名才读（`_` 前缀语义 = 不在活跃队列，非禁读）。迁移规矩：`git mv`、
> 文件名不变、**内容不重写**（推敲过程本身是证据）——毕业/关闭只在状态行补去向指针，且该指针
> 是归档卡唯一会活的部分（它指向的 note 挪走时指针跟着更新）；挂起不补任何东西（没有判断落地）。
> 规矩手册 = [`../README.md`](../README.md)。
>
> **编号权威（bugs 侧）住本目录**：Next BUG ID = 已分配最大号 + 1
> （活跃 ∪ 归档一起算；已分配至 BUG-007 ⇒ Next = 8）。

## 布局

- [`_closed_plans/`](_closed_plans/README.md)：毕业的推敲卡（四门；索引在其 README，新→旧）。
- [`_suspended_plans/`](_suspended_plans/README.md)：挂起的推敲卡（未裁决即搁置；不是完成）。
- [`_fixed_bugs/`](_fixed_bugs/README.md)：修完归档的缺陷卡（**Next BUG ID 权威**）。
- [`_suspended_bugs/`](_suspended_bugs/README.md)：已查明、修复未确认的缺陷卡（编号保留）。
- [`_reference/`](_reference/README.md)：随卡归档的调研材料（调研卡收卷台账不在此，见其 README）。

## 挂起推敲卡（暂停——不是完成）

| 卡 | 为何挂起 | 重启条件 |
|---|---|---|
| （空——第一次挂起自建行） | | |

## 挂起缺陷卡（已查明——修复未确认）

| 编号 | 标题 | 为何挂起 |
|---|---|---|
| （空——第一次挂起自建行） | | |

## 随卡归档的调研材料

| 文件 | 服务的卡 | 日期 |
|---|---|---|
| [tech-exploration/261005-repo-entry-tooling-audit.md](_reference/tech-exploration/261005-repo-entry-tooling-audit.md) | [261005-repo-navigability](_closed_plans/261005-repo-navigability.md) | 2026-10-05 |
| [tech-exploration/261005-repo-test-asset-audit.md](_reference/tech-exploration/261005-repo-test-asset-audit.md) | [261005-repo-navigability](_closed_plans/261005-repo-navigability.md) | 2026-10-05 |
| [261007-semantic-sweep-src.md[tech-exploration/261007-semantic-sweep-src.md](_reference/tech-exploration/261007-semantic-sweep-src.md) | [BUG-003～007](_fixed_bugs/BUG-007-concurrency-lifecycle-minors.md)（巡检五卡，全毕业） | 2026-10-07 |
