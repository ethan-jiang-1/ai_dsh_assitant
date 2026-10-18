---
status: 推敲中
opened: 2026-10-18
---

# 收口卡：桌面侧受理新事项（261018-desk-side-capture 五片推进台账）

> 立卡：2026-10-18 ｜ 状态：推敲中（已授权实施）｜ 类型：Feature ｜ 可关闭：否 ｜ 授权：本人 2026-10-18「听你的建议…推进，别墨迹」；授权指针记在 [proposed 卡](../../notes/proposed/2026-10-18-desk-side-capture.md) 状态行

**问题与期望结果：** 落地 [proposed 卡](../../notes/proposed/2026-10-18-desk-side-capture.md) 的五片——桌面侧受理新事项的入口与状态显性化。期望：本人看着桌面想起一件事时，在桌面上就能收下它，且四态（未投递／在途／轮到我／待归户）各有其形、状态取自原生而非页面自存。

**当前情况：** 4 项判定已由本人逐条拍板并归档（[结项卡](../_archive/settled_issues/261018-desk-side-capture.md)）；片 0 的「弃置＝留档带一行原因」（与事项 `abandon` 同构）由本人 2026-10-18 照 agent 建议拍定。

**未决问题：** 见 proposed 卡各片；片 4 顺带要核"DSH 右侧栏能否就地承载会话"（若能，`＋` 可改成不夺主区）。

**下一步：** 按片推进，每片先答"怎么算对"（造红→实现→变绿）；片间证据记在本卡台账。

## 验收标准

承接 [proposed 卡](../../notes/proposed/2026-10-18-desk-side-capture.md) 的「验收」节（每片：命令 / 断言对象 / 红的形态），不在此复述以免两处维护；本卡只记**逐片真证据**与停点。

## 台账

| 片 | 状态 | 真证据 |
|---|---|---|
| 0 未成出口（弃置终态） | 落地（**余真模型端到端走查**） | 域 4 案（`tests/domain/operating-projection.spec.ts`：离开通道 + 理由留史 + 原话仍在／未知片段与空理由拒绝／重复弃置拒绝／投影不再列出且回执可读）；服务 1 案（`tests/host/operating-ledger.spec.ts`：空理由在账本边界拒绝、决定留史、原 `note` 回执仍在）；工具边界 1 案（`tests/agent/tool-operating.spec.ts`：缺 reason 抛错、desk 栏清空）；客户端 8 案判据（`tests/client/client-desk-process.spec.ts`：他人 claim 不能结算本路径、无事项可选中、共享闸门）+ 1 案按钮（`tests/client/projection-panel.spec.ts`：「是噪音，不归户」回传 id）；真机 DOM 两出口并列（`.tmp/shots/s0-fragment-actions-clean-1500x1000.{png,dom.txt}`，`button h=32: 是噪音，不归户`）。全量：`pnpm test` 666 全绿、`pnpm verify` 42 条、`pnpm eval -- --only desk-evidence-recommendation` PASS。**未做**：真模型端到端（点弃置 → 会话 → 模型真调 discard → 栏消失 → 回桌面）——判据层与 DOM 层已证，端到端待补（形态照 `desk-process-e2e.mjs --scenario claim` 的 replay 场景） |
| 1 受理位与状态显性化 | **1a 落地**；1b 未开始 | **1a**：受理位（桌面头部下常驻一行，Enter/按钮提交，提交即清草稿）+ 投递（复用 intake 的会话选择判据但**不 openSession**，走 `[桌面] ` 独立来源标记的 queue 通道）+ 在途条（客户端投递回执驱动，随投影 revision 越过即消失；虚线形态不复用事项卡）+ 两门重量文案。证据：`tests/client/client-desk-arms.spec.ts` 3 案（当前会话不新建/不打开、无会话时新建但仍不打开、空白不投）、`tests/client/projection-panel.spec.ts` 3 案（两门文案在场、提交回传原话并清草稿、在途条显示与越过即止 + 否定断言不出现"已记下"）、`tests/client/projection-view.spec.ts` 2 案（草稿与回执的瞬态）；`pnpm test` 673 全绿、`pnpm verify` 42 条；真机截图 `.tmp/shots/s1a-capture-row-1500x1000.png`。**1b（三态接原生 `SessionStatus`）未开始** |
| 2 助手侧默认与「要问就正经问」 | 未开始 | — |
| 3 intake 返回语义修订 | 未开始 | — |
| 4 验收资产 | 未开始 | — |

## 关闭条件

- 五片验收全绿（proposed 卡的验收表逐行有真证据）→ 头部改 `可关闭：是`，与 proposed 卡毕业（正文改写为已交付事实）同一次改动归档。
- 或本人叫停：状态行记结论与去向，按入口流程归档。
