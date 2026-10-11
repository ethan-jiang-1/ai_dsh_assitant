---
status: 推敲中
opened: 2026-10-11
---

# 推敲：首屏 hero 标题「探索未至之境」在部署层改不了

> 立卡：2026-10-11 ｜ 状态：推敲中 ｜ 可关闭：否

**问题与期望结果：** 空会话首屏的 vendor hero 标题是**写死的 locale 串**（`EmptyHero` 直渲），locale Config 没有字典覆盖口——本包在部署层改不了它，也没法换成本产品的口吻。期望：要么上游给一个 headline 槽位/覆盖口，要么我们在自己的首屏接管里连标题一起接管。

**已知事实（2026-10-10 走查记录）：** 该串由 vendor 客户端 `EmptyHero` 直接渲染；本包已消费的座位（`conversation.hero.brand.mark` 等）都不覆盖标题文本；向上游提槽位是当时记下的方向，但**没有提案**。

**候选（未裁决）：**
1. 向上游提「hero headline 槽位或 locale 覆盖口」——最小、最正，但要等 pin；
2. 本包在自己的空白相位接管里盖掉（已有 `conversation.input.dock` 的复合卡；标题仍是 vendor 的）——需要 vendor 缝（chain 槽 owner-only 限制是已知阻碍，见 [首开 UX 卡](../../_backlog/_archive/settled_issues/261001-first-open-ux.md) 的历史）；
3. 接受现状：它是 harness 的品牌文案，不是本产品的（**当前默认**）。

**触发：** 本人点名要改首屏标题，或 pin 升级带来 hero 槽位。

**来源：** [K4 收口卡](261010-desk-k4-closure.md)的第五项（本轮从那里拆出，避免它继续压在验收卡上）。
