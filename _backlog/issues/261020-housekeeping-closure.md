---
status: 推敲中
opened: 2026-10-20
---

# 收口：全仓打扫卫生（S1–S5 切片台账）

> 立卡：2026-10-20 ｜ 状态：推敲中 ｜ 类型：Task ｜ 可关闭：否 ｜
> 授权：用户 2026-10-20「修复全部」；提案与验收 owner = [housekeeping-campaign](../../notes/proposed/2026-10-20-housekeeping-campaign.md)

## 验收标准

- S1 真相对齐：`pnpm verify`、`pnpm test`、`pnpm test:composition` 全绿；catalog 重生成后
  source/catalog 清单计数一致；preflight 对空 manifest/抽不到 inject 明确红；包 README/docs 不再有
  与代码相反句。
- S2 证据主轴：真机 `shots` 的 `visibleText` 含模态；web 证据带 session id/时刻；`loop-probe`
  错误气泡红；`desk-walk` 的 `returned` 进 exit code；`--eval` 抛错硬失败。
- S3 测试接缝：新增 spec 先红后绿；`pnpm test` 全量绿；第 3 个 web 场景在隔离 home PASS。
- S4 结构归位：typecheck/test/verify 全绿，行为零变化；SCC 归零；client 目录分组。
- S5 上下文清理：`pnpm verify`；逐篇 note 判据（只在还会指导下次改动时留在 implemented）。
- 总：`pnpm verify`、`pnpm test`、`pnpm test:composition`、`pnpm web-expected`（隔离 home）全绿；
  已知“绿但语义错”的条目清零。

## 切片台账

| 片 | 状态 | 证据 / 停点 |
|---|---|---|
| S1 真相对齐 | 进行中 | 开工：先修包 README / docs 合同 / catalog / test 车道 / preflight |
| S2 证据主轴 | 待开工 | — |
| S3 测试接缝 | 待开工 | — |
| S4 结构归位 | 待开工 | — |
| S5 上下文清理 | 待开工 | — |

## 停点与授权

- 2026-10-20：用户点名修复全部；按 S1→S5 顺序，逐片提交。
- 每片收尾必须留下同 diff 的回归证据；阻断项如实写，不写成绿。
