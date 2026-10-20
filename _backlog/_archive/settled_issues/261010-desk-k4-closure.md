---
status: 已结
opened: 2026-10-10
---

# 推敲：章鱼管家 K4 收口——本人体验裁决与三处规格/实现差额

> 立卡：2026-10-10 ｜ 状态：已结（2026-10-11 关闭）｜ 结论：三处差额按本人点名「都补」全部落地——②交代首事臂（`IntakePath` + `judgeIntakeReturn` + 桌面「＋ 交代新事项」绑定，返回时选中新建的那件事，负例矩阵在 `tests/client/client-desk-process.spec.ts`）；③第四种业务时间（`completedAt` 由账本在完成时盖下、reopen 清除，投影/解析/详情四处打通）；④窄视口「所选消失恢复」由 `projection-live-mechanics.mjs` 新相位落证。①本人的体验裁决**转正为 [规格卡](../../../notes/proposed/2026-10-06-desk-operating-entry.md) §验收的开放行**（只有本人能给的口味输入，不是待办）。

**问题与期望结果：** 桌面运营入口（[规格卡](../../../notes/proposed/2026-10-06-desk-operating-entry.md)）的 K1–K3 链、K4 确定性面（浏览器端到端探针）与 K1/K2 八项限制补证都已落地或转正（索引见下）。「K3–K4 完整通过」只差四件：**一件必须本人做**（体验裁决），**三件各是二选一**（补切片 or 接受并改规格）。

## 收口记录（本轮逐条落地）

| 项 | 结果 | 证据 |
|---|---|---|
| ② 交代首事臂没有返回 | **补**：两条臂共用同一组返回前提，交代臂以「绑定后、投影里原本不存在的事项 id 有了 committed 回执」结算，返回时选中新建的那件事 | `src/client/desk/desk-process.ts`（`IntakePath`/`bindIntakePath`/`judgeIntakeReturn`）；`src/client/index.ts`（「＋ 交代新事项」绑定 + 返回选中）；负例矩阵 `tests/client/client-desk-process.spec.ts`（22 条）；接线 `tests/client/projection-panel.spec.ts` |
| ③ 第四种时间是空的 | **补**：完成时刻由账本在完成那一步盖下（模型不可自报）、reopen 同一次纠正清掉；投影、客户端解析、详情各一处渲染 | commit `681c85b`；`tests/host/operating-ledger.spec.ts`、`tests/domain/operating-projection.spec.ts`、`tests/client/operating-projection.spec.ts`、`tests/client/projection-panel.spec.ts`；契约 `docs/operating.md` §二 |
| ④ 窄视口「所选消失恢复」未取证 | **做掉**：所选事项从投影消失时详情如实说「所选事项不在当前投影中」（不静默退回列表、不错显示别的事项），放回去后选择仍指着同一条 | commit `02a8266`；`projection-live-mechanics.mjs` 相位 `selection-vanish-and-recover`（全新 home 上 PASS） |
| ① 本人体验裁决 | **转正**：留在 [规格卡](../../notes/proposed/2026-10-06-desk-operating-entry.md) §验收的「本人的体验裁决」行（含 30 秒走查法与复走预期现状） | 规格卡 §验收 |

## 已闭合、不再列（历史留在 git）

- **浏览器端到端探针**：`dev/probes/web/desk-process-e2e.mjs` 两轮确定性回放（回读→留在对话→显式拒绝→返回仍选原事项），并抓出修掉了会话选择与结算刷新两处真缺口。
- **K1/K2 八项**：①–⑧ 逐项已补证或转为已接受限制（唯第 4 项的「所选消失恢复」子项见上）。
- **独立 review（code-review 双轴）**：两处硬违规与两处注释张力已修；其余四条结构性坏味道转为「下次动到对应文件时」的触发，不占本卡。
- **混合回合自动返回**：2026-10-11 已改为留在对话（原第 ⑦ 条 c 项，不再是待裁决项）。
- **V4/V5 提醒协调**：**未实施，但 K4 不依赖它**——提醒未同步只显示提示、不阻止返回；需求归 [261008](../../_backlog/_archive/settled_issues/261008-ceo-operating-loop.md) 的 V 列表。
- **vendor hero 标题覆盖口**：转 [261011-vendor-hero-headline(261011-vendor-hero-headline.md)。

## 证据索引（不复述，点进去看）

- 探针与限制补证的判断记录：`dev/probes/web/desk-process-e2e.mjs`、`dev/probes/web/projection-live-mechanics.mjs`（含头注与负例）。
- 合同：[`docs/operating.md`](../../../docs/operating.md)（账本 12 动作、投影与读回链）、[`docs/architecture.md`](../../../docs/architecture.md) §七/§八（浏览器动作链与功能路由）。
- 红绿：`tests/host/operating-ledger.spec.ts`、`tests/client/projection-*.spec.ts`、`tests/client/client-desk-process.spec.ts`。
- 复走经验已归位：[`docs/dev.md`](../../../docs/dev.md) §五踩坑清单（typecheck 后重跑 build、管道吞退出码、经启动器只杀启动器、旗标顺序、未声明 inject 直接抛、探针完成信号、重录 home 契约）。

**关闭条件：** 上面 1 得到本人裁决，2–4 各得到「补」或「接受」的明确结论 → 按 [backlog 条件](../../README.md)收口（预期形态：结论并进规格卡，本卡进 `_archive/settled_issues/`）。
