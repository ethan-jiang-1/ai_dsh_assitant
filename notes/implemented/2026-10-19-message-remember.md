# 维护面 C2：assistant 消息上的「记下来」

日期：2026-10-19 · 状态：**implemented**（C 卡 v2 C2；v1 assistant 消息）

## 问题（可观察行为）

"我想让它记住这句"今天只能靠一句含糊的"记一下"。要的是在一条 assistant 消息上直接点「记下来」，一次确认即进记忆，零模型回合；文本由 host 从 durable 消息读，不信 client 传的正文。

## 决定

1. **槽**：`conversation.chat.assistant-actions`（vendor 既有，list/session scope，`messageId`）；只追加一个「记下来」，不替换/删除 shipped 动作。用户消息没有现成槽，v1 不做。
2. **客户端**：`RememberAction` 只发 `{sessionId, messageId}` 到 A2 的 `POST /api/assistant/rooms`（`memory.remember`）；不传正文；无 prompt。
3. **host**：`RoomsActions.remember(sessionId,messageId)` → `ctx.sessionQuery.readEvent` 取 durable 消息 → 提取 text parts → `saveMemory({ text: 逐字, kind:'fact', source: 'panel:message:<sessionId>/<messageId>' })`。白名单只为这一条新建开口；不写 `why`。
4. **预算负例**：`saveMemory` 满预算时抛错 → route `action-failed` → 面板显示"没记下：…"。
5. **测试**：host 的 `memory.remember` 200/400/预算拒绝；client 的按钮/只发 ids/缺 id 不渲染；`client-entry` 的 slot 注册。

## 验收与证据

- `tests/host/rooms-actions.spec.ts` 加 `memory.remember`（200 + ids、缺 message 400、预算拒绝 400）。
- `tests/client/client-message-action.spec.ts` 2 条（渲染/只发 ids；缺 id 不渲染）。
- `client-entry` 的 `conversation.chat.assistant-actions` slot 注册 + key。
- `vitest` **812 tests**；`verify` **42**；`tsc`/`tsdown` 绿。
- 人判：在一条 assistant 消息上点「记下来」，刷新后记忆里能看到逐字文本与来源。

## 输掉的方案

- 用户消息动作 v1 → 没有现成槽；另开片。
- client 传正文 → 不可信；host 用 `sessionQuery` 读 durable 消息。
- 候选队列/二次确认 → 一次点击即确认（Claude Code/Letta 同形）。
- 模型抽取 → 零模型回合是 P3 的成本前提。
- 写 `why` → 记忆没有该字段；来源用 `source`。
