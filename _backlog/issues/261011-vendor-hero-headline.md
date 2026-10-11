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

**来源：** [K4 收口卡](../_archive/settled_issues/261010-desk-k4-closure.md)的第五项（本轮从那里拆出，避免它继续压在验收卡上）。

## 2026-10-11 整理结论（按[整理方案与结论](../methods/requirements-synthesis.md)）

**前提复核（仍成立）**：标题来自 vendor 包内**静态 locale 键** ——
`vendor/dsh/packages/client/ui-conversation/src/client/locales.ts:77` 的 `'hero.headline': '探索未至之境'`，
该包的 `apply.ts` 直接 import 自己的 `zh`；客户端插件侧没有「把字典合并进别人命名空间」的口子
（本包已消费的 `conversation.hero.brand.mark` / `.workspace` / `.agentPreset` 都不含标题文本）。
不是本包配置能改的东西。

**新事实（改变分量）**：**唯一桌面之后，hero 不再是首屏**（2026-10-11 决定）。它只在
「本人主动开一个空会话」时出现；首屏是账本桌面页，用的是本包自己的中文文案。因此这条串现在的实际影响
只是「空会话里一行 vendor 品牌语」，不再是产品第一印象。

| 候选 | 做法 | 代价 / 收益 |
|---|---|---|
| 1 上游提槽位 | 向上游要一个 hero headline 槽位或 locale 覆盖口 | 正确但要跨仓排期；在拿到之前这条一直挂着 |
| 2 本包接管首屏 | 我们自己渲染空会话首屏（连标题一起接管） | 需要抢占 vendor 的 conversation 主区，越界风险大；而首屏已经不是它了，收益最低 |
| 3 接受现状 + 触发 | 承认 vendor 品牌语，触发＝上游发布带来标题槽位/覆盖口 | 零成本；影响面已缩到「空会话一行字」 |

**推荐：候选 3。** 依据：影响面被唯一桌面缩小到一次主动动作之后的空会话；候选 1 可以随时另立
（若本人在意这行字，提上游的申请仍然成立）；候选 2 代价最高而收益最小。**决定权在本人**（产品口吻），
已并入本轮的人判批次。

**若采候选 3**：触发行写进 [triggers.md](../triggers.md)（对象＝hero 标题覆盖口，触发＝读 vendor 时发现
上游发布带来标题槽位或 locale 覆盖口）；「本人点名要改」不进触发表（该表明确不收「用户点名」），
留在本卡与上面这句里。
