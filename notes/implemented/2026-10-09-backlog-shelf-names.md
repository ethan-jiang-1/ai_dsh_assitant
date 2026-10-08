# _backlog 架子：issues、bugs、research、methods、_archive

日期：2026-10-09 · 状态：**implemented**

活跃区四格。`issues/` 放还在推敲的事，文件名 `YYMMDD-<slug>.md`。`bugs/` 放发现时决定这次不修的缺陷，文件名 `BUG-<NNN>-<slug>.md`。`research/` 放喂这些卡的原料。`methods/` 放需求怎么问清、做完怎么算数。已经离开活跃区的在 `_archive/`：`closed/` 是有结论的推敲，`bugs/` 是修完的缺陷，`suspended/` 是明确搁置，`research/` 是跟最后一张活卡一起离开的原料。地图在 [`_backlog/README.md`](../../_backlog/README.md)。

缺陷单独成架，是为了提交时只改 `bugs/`。新卡写进这个目录，下一个号和活跃表都在 [`bugs/README.md`](../../_backlog/bugs/README.md)，修完 `git mv` 到 [`_archive/bugs/`](../../_backlog/_archive/bugs/README.md)。

四门、不调度、户口还在。历史卡正文不改写，旧卡不补 Feature / Task。毕业门禁的检查名是 `backlog: graduated issues leave the active shelf`，只扫 `issues/`。部分前身是 [2026-10-02 的治理借鉴](2026-10-02-backlog-governance-borrow.md)：那篇拥有四门和不调度，这篇拥有现在的目录名。

## 输掉的方案

- 只改叫 `tasks/`。一个名字盖不住推敲和缺陷两种卡。
- `features/` 和 `tasks/` 分成两个目录。四门一样，类型是状态行上的字段。提前分目录会把还没定的卡猜错，旧卡也不回填。
- 缺陷并进 `issues/`。一个目录两种文件名，提交缺陷要改同一张混表。缺陷要单独出来，自动提交才有固定落点。
- 只改 README、目录名不动。地图会和盘上的目录对不上。
- 保留 `plans/`。和会话里的 Plan Mode 撞名，读起来像可以拿去实施。
- 保留 `reference/` 和 `playbooks_plan_and_validate/`。前者像手册，后者是一句带 plan 的话。现名是 `research/` 和 `methods/`。
- 保留 `_done/`。里面还有没做完就被搁置的卡。现名 `_archive/`，前面的 `_` 表示默认跳过。
