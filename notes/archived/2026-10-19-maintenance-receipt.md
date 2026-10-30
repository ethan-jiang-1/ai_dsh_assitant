# 维护面 A3：自上次以来变了什么

日期：2026-10-19 · 状态：**implemented**
已归档：2026-10-30（收据决定已由 receipt.ts 模块契约与 docs/architecture.md §七 持有，本篇只余历史）

## 问题（可观察行为）

A1a 面板读真值、A2 直写当场生效后，用户仍看不见**静默更新**：模型的记忆 `save`/`curate`、知识草稿、技能写入、模型的 promote/deprecate 都不会在面板上留下"最近变了什么"。用户要的是一眼收据：**自上次打开维护面板以来，四个房间各发生了什么**，并能"全部标为已读"。

## 决定

1. **纯核** `buildReceipt(snapshot, ledger, since)`（[`receipt.ts`](../../packages/dsh-smart-assistant/src/domain/maintenance/receipt.ts)）：账本行（`at/kind/id/title/room/before/after`）+ 房间内容戳（memory/knowledge/research `updated`、skills `learnedAt`）；**忽略 skills 的 `lastUsedAt`**；同 `room:id` 的账行与房间行去重（账行优先）；`since` 缺省 = 空收据；按 `at` 倒序。
2. **route 带账本**：`GET /api/assistant/rooms` 的列表增加 `ledger`（最近 200 行 `approvals.jsonl`）；`readApprovals(host, limit)` 在 [`approval-audit.ts`](../../packages/dsh-smart-assistant/src/host/approval-audit.ts)；`generatedAt`/`revision` 覆盖账本时间。直写账行加可选 `room`（knowledge/memory/skills），旧行按 kind + skills 名单 fallback。
3. **客户端收据**：[`receipt-view.ts`](../../packages/dsh-smart-assistant/src/client/rooms/receipt-view.ts) 的 `ReceiptView` 放知识/记忆面板顶部——一句人话（`自上次以来：记忆 +N · 知识 M · 技能 K`）+ 分组明细 + 「全部标为已读」；baseline 住 `localStorage`（`dsha:receipt-since`，浏览器实例级，带内存 fallback）；首次打开无 baseline 时设为 now 并显示"还没有收据"；`mark all read` 写 now 并立即清空。**不投 prompt、不跑模型。**
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
