---
status: 已修
severity: P1
opened: 2026-10-19
---

# BUG-016：桌面投递回执刷新即失，挂起的问题在桌面上没有任何入口

> 严重级别：P1（重要）｜发现：2026-10-19｜状态：已修

## 症状

桌面受理位交代一句后刷新页面：在途条/终态行完全消失（连"还没进账"都没有），而回合可能仍在跑或已挂起等你回答。若助手是在 capture 车道里问了话（"要不要立项？"），刷新后桌面上没有任何入口指向那个问题——行 2 只数待认领/提案，`openQuestions` 从未被喂过。

## 根因（假设）

已确认：`captureReceipt` 只活在非持久的 view store 里（`src/client/projection-view.ts` 明写 Nonpersistent），"刷新不丢"只对 `SessionStatus` 成立，对"我在等哪一条"不成立；`ProjectionPanel` 调用 `deriveProactiveFace` 时没有传 `openQuestions`（`src/client/projection-panel.ts`），所以 `N 句等你答` 是死分支。2026-10-19 的端到端探针：`inflightBeforeReload: true` → reload → `inflightAfterReload: false`、全文无"还没进账"，当时账本未变。

## 复现

隔离 home 起 dev 服务，输入任意一句点「交给助手」，等虚线行出现后刷新；或用本轮的一次性探针（刷新前/后各取一次 `.dsha-inflight` 是否存在）。

## 修复关联

与 [回执终态 note](../../notes/implemented/2026-10-19-desk-receipt-terminal-state.md) 的 per-page 边界是同一处；候选：把回执与 `seenRunning` 落 sessionStorage（还是"本页投递事实"），或从 `SessionStatus` 重新推导出"这一会话有挂起问题"并把 `openQuestions` 接线。两条都改客户端可见行为，先定一条再动。

## 修好定义

刷新后：仍在跑的投递仍显示在途（或至少会话状态）；挂起的问题在桌面上有一个可点的入口（行 2 的"等你答"或等价物）；组件/纯核各一条判据，且真机刷新复验。

## 修复（2026-10-19）

- 回执（含 lane/label）落 `sessionStorage`（per tab，读取时重新校验形状），关闭时删除；刷新后在途/终态行仍在。
- `openQuestions` 从 `SessionStatus.pendingInteraction` 接线；在途条可见时其所属会话不计入，避免双计；行 2 有挂起问题时动作变「去答问题」，直接打开那个会话。
- 判据：`tests/client/projection-view.spec.ts` 刷新持久化 1 案、`tests/client/projection-panel.spec.ts` 计数与不双计 2 案；真机：自制探针刷新后 `inflightAfterReload: true`；`desk-capture-live` 真车道桌面出现「1 句等你答 / 去答问题」。
