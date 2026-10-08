# _backlog

还没定的事放这里。没有点名，不要开工。定了要做、还要人点头的，写成 [`notes/proposed/`](../notes/README.md)。

| 路径 | 放什么 | 不要当成 |
|---|---|---|
| [`issues/`](issues/README.md) | 还在推敲的事。文件名 `YYMMDD-<slug>.md` | 排期，也不是拿来就做的实施计划 |
| [`bugs/`](bugs/README.md) | 发现时决定这次不修的缺陷。文件名 `BUG-<NNN>-<slug>.md` | 当场就能修的事。那种不建卡 |
| [`research/`](research/README.md) | 喂这些卡的调研 | 结论，也不是手册 |
| [`methods/`](methods/README.md) | 需求怎么问清、做完怎么算数 | 待办，也不是技能目录 |
| [`triggers.md`](triggers.md) | 以后干活会自己撞上的条件 | 待办清单 |
| [`_archive/`](_archive/README.md) | 已经离开活跃区。父级的 `_` 表示别当成待办 | 待办 |

`issues/` 里卡的类型写在状态行，能判断再写：`Feature`（可观察行为会变）、`Task`（要交出代码、文档、配置或结论）、`未定`。旧卡没有这一格，不补判。缺陷卡在 `bugs/`，写症状、根因、复现。

## 一张卡怎么离开

推敲卡有四条出路。走完就 `git mv` 到 [`_archive/settled_issues/`](_archive/settled_issues/README.md)，文件名不变，正文不改，状态行补去向。

| 判断 | 然后 |
|---|---|
| 该做 | 写成 `notes/proposed/`（问题 / 方案 / 验收）。点头才做 |
| 该做但不现在 | 触发条件写进决定它的 note，卡关闭。条件到了就新开一张，并链到旧卡 |
| 不做 | 理由进 owner note 的输掉的方案。还要防再犯，就另写 `notes/rejected/` |
| 消化 | 结论已经在某篇 note 或合同里 |

缺陷修完进 [`_archive/fixed_bugs/`](_archive/fixed_bugs/README.md)。还没结论、被明确搁置的，进 [`_archive/suspended_issues/`](_archive/suspended_issues/README.md)。挂起不是做完，也不是授权。

原料在最后一张活卡离开时，跟着搬到 [`_archive/research/`](_archive/research/README.md)。

`methods/` 一直留在原地打磨，不归档。

## 不会变的规矩

- 这里不排期。做什么由用户本轮请求决定。
- 卡记思考，note 记决定。下一个问题回这里新开一张，不塞进某篇 note。
- 当场修掉的缺陷不建卡。
- 推敲卡用立卡日作文件名：`YYMMDD-<slug>.md`。缺陷用 `BUG-<NNN>-<slug>.md`，下一个号写在 [`bugs/README.md`](bugs/README.md)。提交缺陷只改 `bugs/`。
- 状态行带 🔒 的卡，只有用户能判触发。规则在 [`issues/README.md`](issues/README.md)。
- 各 README 的名单和目录必须一致。`pnpm verify` 查三件事：这些目录在不在、活跃卡前 12 行有没有 `状态：`、每张卡有没有被名单点到。毕业门已经写「已过」的卡还留在 `issues/`，也会被点名。
