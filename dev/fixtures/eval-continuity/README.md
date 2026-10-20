# 续接评测夹具（种子账本）

本目录只装 [`seed-ledger.json`](seed-ledger.json) 一件资产：首回合续接判据的**已知账本**，服务真实
运行（评测与 web 探针），不被 vitest spec import——spec 侧共享夹具的家是
[`packages/dsh-smart-assistant/tests/support/`](../../../packages/dsh-smart-assistant/tests/support/)。

## 预期集合（独立陈述，不按回答反推）

- `m-1`「合同 XR-09 尾款收回」active：承诺 2026-10-20，一条 pending reschedule 提案 `p-1`；
- `m-2`「合同 XR-09 预付款开票」＝相似名干扰项——wrong-matter 负例需要它在场；
- `m-3`「九月社保缴纳」completed；`u-1` 未认领片段；
- 独有标记（金额 12.8 / 王会计）只存在于账本：答案带标记即忠实读回，不是复述问句。

种子在会话开跑**之前**被 `assertSeed`（[`dev/lib/continuity-core.mjs`](../../lib/continuity-core.mjs)）
断言在场——种子不完整 = BLOCKED，不进判决。

## 消费方与复跑

| 消费方 | 入口 | 证明什么 |
|---|---|---|
| 副入口（headless）续接地板 | `pnpm eval:continuity`（[`continuity-run.mjs`](../../eval/continuity-run.mjs)） | 首回合五判据：读对事项 → 读回带标记 → 先读后答 → 承诺期限与待确认在场 → 全程无授权写入 + 账本字节不变 |
| web 主入口续接地板 | [`desk-continuity-live.mjs`](../../probes/web/desk-continuity-live.mjs) | 同一批判据（复用 `analyzeContinuity`），走真模型 web 会话的「处理」路径 |
| 晨报 web 回归 | [`desk-daily-brief-live.mjs`](../../probes/web/desk-daily-brief-live.mjs) | `desk-daily-brief` 任务原句与 checks 在真 web 会话里跑（headless 结构性不可满足） |

```sh
pnpm eval:continuity                                   # 供给一次性 home → 种子 → 真会话 → 判决 → 清理
node dev/eval/continuity-run.mjs --self-check          # 评测器负例红绿对照（已挂 pnpm verify）
```

## 能证 / 不能证

能证：续接**行为地板**——读纪律、忠实标记、权限边界（无授权写入与账本字节不变）。不能证：web
处理路径的种子链（client spec 与真实组合测试的事）、话术与层级（`pnpm desk-walk` / `pnpm shots`
的事）、真实业务价值（只有自然观察能给）；机器不判质量。
