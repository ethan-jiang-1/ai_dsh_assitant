---
status: 等人拍板
severity: P1
opened: 2026-10-19
---

# BUG-021：blank-first-open 基线录的是 dev home，场景契约已失效

> 严重级别：P1（重要）｜发现：2026-10-19｜状态：等人拍板

## 症状

`snapshots/web-face/blank-first-open/expected.dom.json` 的 visibleText 是工作区 `ai_dsh_assitant`、`1 件在办 · 2 条待认领`、两条 weekly 在 2026-10-19 09:00——与当前 dev home 的 ledger/schedule 逐字吻合；按场景 README 起的真隔离 home 是 `默认工作区`、无计数、无看板/流水、`还没有经营事项资料`。`pnpm web-expected` 对隔离 home 报 31 行 textOutline 缺失 + 工作区名不一致。场景 README 与 snapshot.yml 仍写"隔离 home / 还没有经营事项资料 / 共享 dev home 时间戳漂移不可用"。

## 根因（假设）

已确认：基线是在 dev home（或同数据 home）上 `--refresh` 的，不是 README 的隔离 home。放大器：`buildWaitSnippet` 等不到 `--wait-text` 时 resolve `timeout: ...` 而不是失败（`dev/probes/web/webui-expected-core.mjs`），`webui-expected` 不检查 eval 结果，于是"等不到就照样拍/照样重录"。基线还嵌了一次性首开弹窗与一条会自走的 weekly 时刻：本人点过"继续"或时间过 09:00，它自己就红。

## 复现

按 README 起隔离 home → `pnpm web-expected '<url>' --wait-text '还没有经营事项资料'`；或对 dev home 跑同一命令（当前只差"预览版说明"弹窗即 exit 1）。

## 修复关联

触及 snapshots 场景合同与测试工具行为（readiness 超时是否硬失败），属已记录决定，故停等人拍板。

## 修好定义

按场景 README 的隔离 home 重录并通过；readiness 超时成为硬失败（负例独红）；基线不再依赖一次性弹窗与 live 时刻（或在场景里显式确认弹窗/固定时刻）。
