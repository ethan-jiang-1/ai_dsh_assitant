# 维护面 A3：自上次以来变了什么

日期：2026-10-19 · 状态：**implemented**（A 卡 v2 A3；2026-10-19「落地计划」授权；切片证据见下）

## 问题（可观察行为）

A1a 面板读真值、A2 直写当场生效后，用户仍看不见**静默更新**：模型的记忆 `save`/`curate`、知识草稿、技能写入、模型的 promote/deprecate 都不会在面板上留下"最近变了什么"。用户要的是一眼收据：**自上次打开维护面板以来，四个房间各发生了什么**，并能"全部标为已读"。

## 决定

1. **纯核** `buildReceipt(snapshot, ledger, since)`（[`receipt.ts`](../../packages/dsh-smart-assistant/src/domain/maintenance/receipt.ts)）：账本行（`at/kind/id/title/room/before/after`）+ 房间内容戳（memory/knowledge/research `updated`、skills `learnedAt`）；**忽略 skills 的 `lastUsedAt`**；同 `room:id` 的账行与房间行去重（账行优先）；`since` 缺省 = 空收据；按 `at` 倒序。
2. **route 带账本**：`GET /api/assistant/rooms` 的列表增加 `ledger`（最近 200 行 `approvals.jsonl`）；`readApprovals(host, limit)` 在 [`approval-audit.ts`](../../packages/dsh-smart-assistant/src/host/approval-audit.ts)；`generatedAt`/`revision` 覆盖账本时间。直写账行加可选 `room`（knowledge/memory/skills），旧行按 kind + skills 名单 fallback。
3. **客户端收据**：[`receipt-view.ts`](../../packages/dsh-smart-assistant/src/client/receipt-view.ts) 的 `ReceiptView` 放知识/记忆面板顶部——一句人话（`自上次以来：记忆 +N · 知识 M · 技能 K`）+ 分组明细 + 「全部标为已读」；baseline 住 `localStorage`（`dsha:receipt-since`，浏览器实例级，带内存 fallback）；首次打开无 baseline 时设为 now 并显示"还没有收据"；`mark all read` 写 now 并立即清空。**不投 prompt、不跑模型。**
4. **直写后即时可见**：A2 的客户端动作在 patch 房间行的同时追加一条本地账行（`source: panel-direct`、`room`、`before/after`），收据立刻反映；下一次 route 读用服务端账本替换。
5. **同 diff**：`docs/architecture.md` 的 `assistant-rooms` 行/浏览器链/功能路由写清 `ledger` + receipt。

## 输掉的方案

- **新增 `SessionEvent` 做变更流**：`docs/identity.md` 明确不新增；账本 + 房间 `updated` 已经足够。
- **服务端 baseline**：多一个要同步的状态；浏览器实例级 localStorage 足够回答"自上次打开"。
- **把 `lastUsedAt` 当内容变更**：每次加载都"变了"，收据立刻变成噪声。
- **只数文件 mtime、不读账本**：promote/deprecate/land/correct/retire 没有文件内容变化，账本是唯一时间源。
- **为收据自动轮询**：A1a 的 session-settle 重读已够；收据是派生物。
- **让模型生成"一句话"**：那会引入模型回合；纯核的分组计数已经是"人话"。
- **把中文摘要放 `src/domain`**：语言门禁把 `src/domain` 当模型可见面；摘要文案移进 `src/client`（皮肤面），纯核只出结构。

## 真机验收（2026-10-20）

- `自上次以来还没有变化` 与 `全部标为已读` 在知识室真机可交互；点击后页面正常、零 console error。
- 证据：`.tmp/shots/abc-receipt-1600x1000.*`。

## 验收与证据

- **纯核**：`tests/domain/receipt.spec.ts` 4 条（首次空、账本+房间分组、`lastUsedAt` 不计数、同 id 去重、缺 `room` fallback）。
- **host**：`tests/host/rooms-route.spec.ts` 5 条（列表带 `ledger`、`generatedAt`/`revision` 随账本变）；`tests/host/approval-audit.spec.ts` 5 条（`readApprovals` 读最新行、跳过 corrupt 行、room/before-after）。
- **client**：`tests/client/client-receipt.spec.ts` 4 条（baseline 句/明细、空 delta、首次收据、两面板嵌入）；`tests/client/client-room-actions.spec.ts` 4 条含直写后本地账行。
- **全量**：`vitest run` → 92 files / 786 tests passed；`node scripts/checks/verify.mjs` → 42 checks passed；`tsc -b` + `tsdown` 绿。
- **人判（A 卡关闭条件，不在本 note）**：本人打开面板看"自上次以来"是否像一句人话，点"全部标为已读"后归零。
- **提交**：`627b1f2`（A3 纯核/route ledger/收据 UI/docs）。

**还会约束以后**：A1b 退役 `.desk/state.json` 时收据不受影响（它只读 route + 账本）；B/C 的新写入带 `room` 即可进收据；新房间（Viki）若要进收据，只需在纯核加一段与 `room` 枚举，不改 baseline。
