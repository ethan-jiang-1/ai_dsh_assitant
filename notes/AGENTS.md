# AGENTS.md —— `notes/` 收件与写入

> 根 [`AGENTS.md`](../AGENTS.md) 管全仓；本文件拥有 `notes/` 的**收件、写入时机与验证对账**。
> note 是什么、何时必须写、状态词、命名、取代与归档以 [`README.md`](README.md) 为准；本文件不定义 note 类型。

## 收件

只从 `_backlog` 的 `待落地` issue 卡或 `修复落地` bug 卡进来；卡上 `去向` 已选（值见 [`_backlog/AGENTS.md`](../_backlog/AGENTS.md)）。`待落地` 不写 note；issue 卡没有 `待落地` 不在这里写 note；bug 卡在 `修复落地` 出口按去向处理。

## 按去向做

| 去向 | 写入时机 | 动作 |
|---|---|---|
| `implemented` | 交付 / 卡关闭同变更 | 写 implemented；正文改写成交付后的事实；对账验收与审查 |
| `proposed` | 卡关闭同变更 | 写 proposed 卡；**卡关闭 ≠ 批准**；毕业才写 implemented |
| `rejected` | 卡关闭同变更 | 仅防复犯价值；一行原因；否则按 `none` |
| `deferred` | 不写 | 触发条件进 trigger / owner；卡关闭留指针 |
| `none` | 不写 | 链已有决定/合同；不复制 |

## 写入时机

- `待落地` 只选载体，不写 note；`implemented` 与交付/卡关闭同变更；`proposed` 与卡关闭同变更。
- `none` / `deferred` 不进本目录；`rejected` 只在还能阻止同一个可信错误时保留。
- `proposed` 毕业时把正文改写成交付后的事实；不把迁移计划、未来时态或剩余清单留在 implemented。

## 对账

- note 的验证节只写实际跑过的命令；卡上 `## 验收标准` / `## 修好定义` 与 `审查：` 对得上。
- `审查：跳过` 不写成 verified；`BLOCKED` 如实写阻断 + 原因。
- `等人拍板` 未答复：不写 implemented、不归档；`可关闭：是` 只在归档 + 去向载体成立时翻。

## 边界

- note 的义务判据 = [`README.md`](README.md) §〇；状态轴/命名/取代/归档 = §一/§二；proposed 骨架 = §二之二；TDD 证据环 = §二之三。
- 不设索引/跟踪/进度；不写 postmortem；不把计划写成事实。
