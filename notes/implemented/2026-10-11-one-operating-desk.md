# 唯一桌面：经营账本投影独占「桌面」名与会话侧桌面退役

日期：2026-10-11 · 状态：**implemented**

## 决定

「桌面」在产品里只有一个：主区的**全局经营桌面**，由权威账本即时投影（[operating.md](../../docs/operating.md) §三）。本人在 2026-10-11 真机走查（真模型轮）确立的原则：**用户脑海里一旦有自己的桌面，不管叫什么、在哪里的同名面都是那张桌面**——管家不给用户第二个桌面。四条配套裁决：

1. **会话侧桌面全部入口下架**：右栏「我的桌面」房间 tab（含 guide）、对话内「桌面」视图 tab（`dsh-smart-assistant-desk-view`）、会话头 chip、常驻桌面摘要条（`assistant-desk-summary`）、`/`+ 菜单的桌面命令。`.desk/state.json` 不再作为用户可见「桌面」出现；它仍是会话工作目录文件（[home.md](../../docs/home.md) §五），供记忆/知识两间读取。
2. **模型路由**：经营简报明确「put it on the desk / add an item」= 账本的事——`entrust` 逐字引用、无归属 `note` 待认领，**禁止把业务内容写进 `.desk/state.json`**；真实组合测试断言该句在场（`preset-composition.spec.ts`）。
3. **加事项的 UI 入口**：桌面工具栏「＋ 交代新事项」按钮（进对话交代，模型 `entrust`）。走查直接发现：真人找不到手动加事项的入口。
4. **留痕**：本篇是「什么概念对、什么概念旧」的权威——旧概念 = 会话桌面（`.desk/state.json` 渲染面）作为用户可见「桌面」/业务内容写入目标；对的概念 = 账本投影是唯一桌面、一切业务写入走 `assistant_operating`（权限三分，[operating.md](../../docs/operating.md) §二）。

## 输掉的方案

1. **两张桌面并存 + 教用户区分**：实测失败——本人分不清两张「桌面」，真模型也把「放一个 item 到桌面」写进 `.desk/state.json` 而非 `assistant_operating`。教区分的成本高于少一张面板。
2. **会话侧桌面改名保留**（本人原话：「除非是你把名字换了」）：否——它的数据源是会话工作目录文件（对话推导），不是权威账本；保留第二个数据面就保留「同一件事两处状态」的根问题，改名只是把困惑藏进新词。
3. **桌面表单直写账本**：否——客户端不拥有经营权威数据；写入必须走 `assistant_operating` 带逐字引用与来源会话，表单直写绕过溯源与提案通道（确认/拒绝裁决链）。

## 约束以后的后果

- 任何新面叫「桌面」、或让用户以为存在第二张桌面，都是回归本决定。
- 组件级删除（`DeskPanel`/`DeskTabBody`/`DeskViewBody`/`AssistantDeskChip`/`DeskSummaryDock` 及其 spec，已下架暂留）与 web-face 场景重录 = [会话桌面子系统清理卡](../../_backlog/_archive/settled_issues/261011-session-desk-cleanup.md)；删除时不得复活任何「桌面」命名的会话侧入口。
- [桌面主对象化](../archived/2026-10-06-desk-primary-view.md) 中被本篇取代的部分：会话内「桌面」视图、`DeskSummaryDock` 摘要条、视图偏好预写；其缝探索事实（`conversation.view` 槽机制）与 Phase A 历史仍有效。
- 规格卡（[desk-operating-entry](2026-10-06-desk-operating-entry.md)）与 [K4 收口卡](../../_backlog/_archive/settled_issues/261010-desk-k4-closure.md) 持有走查发现与验收。
