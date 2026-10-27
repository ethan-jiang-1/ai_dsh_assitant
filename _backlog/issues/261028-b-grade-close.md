---
status: 推敲中
opened: 2026-10-28
---

# 收口：⑤/⑥ B 级缺口（真 DOM / Viki / pre-push / TZ）

> 立卡：2026-10-28 ｜ 状态：推敲中（用户授权静默自主执行） ｜ 类型：Task ｜ 可关闭：否

## 外部结果三要素

- **触发**：六维复评把 ⑤ 测试资产与 ⑥ 反馈通路定为 B：客户端无真 DOM/store 重渲染、Viki 4 个调试面仍手工、浏览器车道未写入 pre-push、时区未钉。
- **用户得到**：客户端交互有一层真 DOM 回归；`pnpm web-face-check --all` 一键跑 8 面（4 客户 + 4 Viki）；pre-push 明确要求浏览器证据；时间渲染有确定断言。
- **完成条件**：B1–B4 各自提交并验证；`pnpm test` / `pnpm verify` / `pnpm web-face-check --all` 全绿；本卡归档。

## 切片台账

| 片 | 状态 | 证据 |
|---|---|---|
| B1 真 DOM 客户端 spec（happy-dom/react-dom + useSyncExternalStore 红绿） | 已交付 | `projection-panel-dom.spec.mjs` 2 it：输入→提交、外部 store 更新；无订阅版实测红（2 failed），恢复后绿；145 文件 / 1101 测试、verify 50 |
| B2 Viki 4 面纳入 `web-face-check --all`（mock + #debug=1 + evals） | 已交付 | `pnpm web-face-check --all` 8/8 PASS；Viki mock 固定 19433、connected/diagnostics/search/disconnected 全绿；mock 与 service 均收；默认 4 客户面 |
| B3 pre-push/证据地图写入浏览器车道（不进 verify） | 已交付 | pre-push 规则改为 `pnpm web-face-check --all` 8 面；testing 已定姿态补「浏览器证据车道」；明确 test/verify 绿不证明页面 |
| B4 TZ=Asia/Shanghai + format 确定性测试 | 待开始 | — |

## 仍未取

- 命令参数形状门、coverage 阈值、performance/load：沿用六维审计的触发条件，不在这四片里硬凑。
- Viki live 服务（非 mock）不在 B2 内；B2 只证明调试面板在固定 mock 下的渲染。

## 验收标准

- **B1**：新 client DOM spec 覆盖输入→提交→store 更新重渲染；把 `useSyncExternalStore` 换成直接读 snapshot 会红；不改变产品代码。
- **B2**：`pnpm web-face-check --all` 8 面 PASS；mock 与 service 都收干净；默认 4 客户面，`--all` 才跑 Viki；文档同步。
- **B3**：`pre-push-evidence` 与 `docs/testing.md` 明确客户端/快照改动跑 `--all`；说明浏览器不进 verify。
- **B4**：vitest 环境钉 `Asia/Shanghai`；format 测试对固定时刻断言；全量测试绿。
- **总验收**：`pnpm test` 全绿、`pnpm verify` 全绿、`pnpm web-face-check --all` 8/8；无产品行为变化。
