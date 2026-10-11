---
status: 推敲中
opened: 2026-10-11
---

# 推敲：会话桌面子系统清理——退役后的组件、spec 与场景收尾

> 立卡：2026-10-11 ｜ 状态：推敲中 ｜ 可关闭：否

**问题与期望结果：** [唯一桌面 note](../notes/implemented/2026-10-11-one-operating-desk.md) 已把会话侧桌面的全部用户入口下架（房间 tab、视图 tab、chip、摘要条、命令、视图预写），但组件与其 spec 暂留未删（当轮只拆注册、避免赶工回归）。本卡收尾删除，让「旧概念已废」在代码里也成立，而不是只在一篇 note 里。

**清理清单：**

1. 删 `src/client/panels.ts` 的 `DeskPanel`/`DeskIcon`（确认无他用后）与 `client-panels.spec.ts` 的 DeskPanel 断言块、`client-desk-core.spec.ts`（其 store 时序规则经 DeskPanel 断言——随面退役，或改挂仍存活的消费者）。
2. 删 `room-tabs.ts` 的 `DeskTabBody`/`DeskViewBody`/`AssistantDeskChip` 与 `client-room-tabs.spec.ts` 的 desk 块；`client-desk-io.spec.ts` 保留 R11 切片机制（记忆/知识两间仍消费），仅清 desk 残留。
3. web-face 两场景重录：会话视图条上的「桌面」tab 消失属预期漂移；按 [snapshots 契约](../snapshots/AGENTS.md) 在对应契约 home 重录并复跑绿。
4. `docs/home.md` §五与 [architecture.md](../docs/architecture.md) 客户端行核对：`.desk/state.json` 的口径收窄为「记忆/知识两间的数据文件」，不再出现「桌面」呈现语义。

**触发与红线：** 下次动 client 桌面相关文件、或 pin 升级触碰 `conversation.view`/`sidebarRight` seam 时执行。删除全程不得复活任何「桌面」命名的会话侧入口（红线出处 = 唯一桌面 note 的约束节）。
