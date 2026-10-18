---
status: 已修
severity: P1
opened: 2026-10-19
---

# BUG-017：「到期没结果」行被任何回执清掉——claim/update 也算"看过"

> 严重级别：P1（重要）｜发现：2026-10-19｜状态：已修

## 症状

m-1（合同 NB-02 第二期款）承诺/核对都在 2026-10-13，到期 6 天、账上没有结果；桌面「它替你看过」里**不出现**到期行。当前 dev home 的 live 投影里，到期后的回执全是 `update`/`claim`（10-13 15:32、15:33、20:52），没有一条是结果；纯核对该投影只返回 `waiting-for-you`。

## 根因（假设）

已确认：`deriveProactiveFace` 的到期行判据是"到期时刻之后有任何回执就清"（`src/client/proactive-face.ts`，测试 `proactive-face.spec.ts` 也钉住了这个语义），而行文案写的是"账上没有结果"。`claim` 只是把片段归户、`update` 可能只是复述"仍未到账"，都不是结果。真正要选的是判据：**任何回执算看过**，还是**只有结果类 kind 算**（complete / 带证据的 update）——这需要本人拍板，故停在等人拍板。

## 复现

当前 dev home 直接看桌面即复现（无到期行）；或拉 `api/assistant/desk-projection` 后把 m-1 的 times+receipts 喂给 `deriveProactiveFace`。

## 修复关联

若选"结果类 kind"：收窄回执的窄视图并改判据与文案；若选"任何回执"：把文案从"账上没有结果"改成"到期后还没进展"。两种都要同 diff 改测试与 [proactive note](../../notes/implemented/2026-10-18-proactive-face.md) 的判据句。

## 修好定义

本人选定判据后：m-1 这种"到期后有 claim/update 但无结果"的形状要么出现在到期行、要么文案不再声称"没结果"；新增一条正例/负例判据，真机桌面上可见。

## 修复（2026-10-19）

本人指令「都修了」后选定口径：只有 **committed 的 `complete` 回执**能清到期行；`claim` / `update`（含"仍未到账"报告）不再清。收窄 `ProactiveProjectionView.receipts` 的窄视图（kind/status）；纯核 1 案覆盖 update/claim/complete/rejected 四种。live 投影（m-1，到期后只有 claim/update）现在产出 `due-no-result`；真车道桌面出现「到期 5 天，账上没有结果」。
