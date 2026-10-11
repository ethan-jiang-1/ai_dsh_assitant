---
status: 推敲中
opened: 2026-10-11
---

# 推敲：唯一桌面退役后的两处残差——机器标记与 walk view 消费面

> 立卡：2026-10-11 ｜ 状态：推敲中 ｜ 可关闭：否

**问题与期望结果：** [会话桌面清理卡](../../_backlog/_archive/settled_issues/261011-session-desk-cleanup.md) 闭合时发现两处不在其范围、但同样源于「旧概念」的东西。两处都不是缺陷，是**要不要继续这样**的判断。

**残差一：`sendPrompt` 的机器标记仍叫 `[桌面] `**（`src/client/desk-io.ts`）。它现在也标记「刷新房间数据」这类房间消息（`askRefresh` 的提示词已改口径），字面与内容对不上。**为什么当时不改**：标记是面板消息识别面的字面量，`dev/reports/usage-report.mjs` 用正则 `/^\s*\[桌面\]/` 区分「面板代发」与「本人的话」，`dev/reports/desk-loop-report.mjs` 有 `PANEL_MARKER = '[桌面] '`，改它属 dev 工具面连带改动。**候选**：改 `[面板] `（标记本义＝面板代发，与桌面无关），同 diff 更新两个报告与夹具。**触发**：下次动 desk-io 的面板消息通道、或有人读报告时被标记字面误导。

**残差二：walk view 旧内容仍被两个存活面消费。** `dashboard.ts`（无投影 store 时的回退主面板）与 `first-mile.ts`（首开引导条）读 `.desk/state.json` 的 `decisions`/`actions`/`gaps`/`threads` 分区渲染「要你拍的 / 在跟的 / 缺的数」。这些分区**已不在 `desk-refresh` 的契约里**（文件现在只承载房间数据：memories/knowledge/skills），所以这两个面实际上只在旧文件上才有内容；新 home 上它们渲染的是空态（blank 场景的「还没有经营事项资料」「没有等你拍板的事」即此）。**为什么当时不动**：这已不是「删组件」，而是「这两个面该显示什么」——按唯一桌面 note，业务状态的正解是账本投影（主区全局桌面已如此），所以候选是把两处改读投影（或直接退役回退面板），但那是**信息架构的取舍**，要本人拍板。**触发**：下次动 `dashboard.ts`/`first-mile.ts`，或本人裁决首开与回退面的信息层级时。

**红线（沿用清理卡）：** 不得复活任何「桌面」命名的会话侧入口（出处 = [唯一桌面 note](../../notes/implemented/2026-10-11-one-operating-desk.md) 的约束节）。
