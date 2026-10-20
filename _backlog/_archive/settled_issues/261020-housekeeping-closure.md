---
status: 已结
opened: 2026-10-20
---

# 收口：全仓打扫卫生（S1–S5 切片台账）

> 立卡：2026-10-20 ｜ 状态：已结 ｜ 类型：Task ｜ 可关闭：是 ｜
> 授权：用户 2026-10-20「修复全部」；决定 note = [housekeeping-campaign](../../../notes/implemented/2026-10-20-housekeeping-campaign.md)

## 结论

S1–S5 全部交付，收尾地板：`pnpm typecheck` 0、`pnpm test` 103 文件 / 846 测试全绿、
`pnpm test:composition` 7 文件 / 50 测试全绿、`pnpm verify` 43 项全绿、隔离 home 的
`pnpm web-expected` PASS。审计发现的两处假绿（preflight 0 namespace、`test:composition` 只跑一个 spec）
已修并在真机/全量上复核；新增的 note 证据门把"当前理由里夹交付流水"挡在门外。

## 切片台账

| 片 | 状态 | 证据 |
|---|---|---|
| S1 真相对齐 | 已完成 `9c2c08b` | 包 README/docs/YAML 对到代码；catalog 生成器认连字符并重生成；`test:composition` 跑整层；`pnpm test` 先 build；`pnpm start` 补 submodule/依赖；preflight 真机解析 30 个 namespace 且四个 `remote.*` 全在 |
| S2 证据主轴 | 已完成 `0df2eac` | 真机 `shots` 的 `visibleText` 2999 字、含"预览版说明"模态；`--eval` 抛错 exit 1；`loop-probe` 产出终态截图且 `errorBubble: []`；`web-expected` PASS |
| S3 测试接缝 | 已完成 `424dc7b` | 四个模型工具 `execute` 6 案；rooms-route/viki/knowledge-approve 三条真 wiring；drawer spec 改成实际断言的 fetch；`projection-selection` 成命令；`corpus-links` 超时 20s |
| S4 结构归位 | 已完成 `10de2ad` + `f2a1b4c` | client 分五组、入口抽 `local-state`（6 案）、测试面移到 `tests/support/client-surface.ts`（factory 只剩 3 键）；host 公开契约抽 `service.ts`（type-only SCC 归零）；route 核入目录；`pnpm clean` 清旧产物；typecheck/test/verify 全绿 |
| S5 上下文清理 | 已完成 `4deeddf` | implemented 只留决定与输掉的方案；两篇纯历史归档并修入链；新增 note 证据门（43 项 verify 在列） |

## 外部剩余 / 没做的取舍

- `web-expected` 仍需运行中的隔离实例，未进 `verify` 链；`pnpm start` + 场景命令是当前闭环。
- 第三个 web 场景没有新录基线；`projection-selection` 升成可复跑命令，作为交互证据门。
- `knowledge-approve` 直调 lane 与 `domain/knowledge/ingest.ts` 的 dev-only 定位按既有理由保留。

## 停点与授权

- 2026-10-20：用户点名修复全部；S1→S5 逐片提交。
- 每片收尾留下同 diff 的回归证据；阻断项如实写，不写成绿。
