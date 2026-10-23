---
status: 已修
severity: P1
opened: 2026-10-23
---

# BUG-025：空 home 的首开引导卡不出现——空判据读的是 keys 数，不是房间内容

> 严重级别：P1（重要）｜发现：2026-10-23｜状态：已修

## 症状

全新 working folder（四房间为空、无 desk 文件）里开一个空白会话，`conversation.input.dock` 渲染的是
**「有桌面」分支**：「这是你的一把手桌面——三句话，说完就办」＋「打开桌面全景」。

设计的 Day-0 分支（「第一次来？说一句话，它先问你。」＋三问说明＋示例句＋「开始第一件事」＋自带输入框）
不出现。结果：唯一一个解释「第一句话说什么、它接下来会做什么」的界面，在真正第一次打开时是缺席的。

## 根因（假设 → 已确认）

`packages/dsh-smart-assistant/src/client/chrome/first-mile.ts:99`：

```ts
const hasDesk = walk.data !== undefined && Object.keys(walk.data).length > 0
```

`loadDesk()` 把 `/api/assistant/rooms` 的成功响应整体写进 `walk.data`
（`src/client/rooms/room-data-io.ts:205`）。该响应即使四房间全空，也是一个带
`schemaVersion` / `generatedAt` / `memories: []` / `knowledge: []` / `skills: []` / … 的对象，
`Object.keys(...).length` 恒大于 0。所以 Day-0 分支在任何 rooms 路由可用的组合里都不可达。

同一子系统里已有正确的空判据 `isEmptyRooms()`
（`src/client/rooms/room-data-io.ts:198`，`memories/knowledge/skills` 全空），但它只用于
session 的 `misses` 标记，没有用于这张卡。

## 复现

1. `ASSISTANT_DSH_HOME=.tmp/ux-fresh-home bash dev/env/start.sh`（空 home；四房间为空、无 desk 文件）
2. 打开 URL → 新会话
3. 看 `conversation.input.dock`：出现「这是你的一把手桌面——三句话，说完就办」；
   `第一次来` / `开始第一件事` 均不在 DOM。

证据（本次真跑）：`.tmp/shots/ux-fresh-blank-1600x1000.png` 与同名 `.dom.txt`；
空 home 的 `assistant/` 下四个房间目录均为空、无 desk 文件。

## 修复关联

首开重做（[261023 收口](../../_archive/settled_issues/261023-first-run-ux-reframe.md)）把默认首开移到了 L0 一页纸，但这张 dock 卡在
空白会话里仍会出现；按 (a) 独立修，判据取「四房间内容为空」（rows + counts，含 research）——与
`first-conversation` 技能的触发同源。账本有事项、房间全空的组合由首页承接，不在本卡范围。

## 修复

`first-mile.ts` 的 `hasDesk` 从 `Object.keys(walk.data).length > 0` 改为房间内容计数：
memories / knowledge（stable + draft）/ skills / research（rows + counts）。空 rooms payload 因此走 Day-0；
legacy counts-only payload 仍走「有桌面」分支。回归 spec：
`tests/client/first-mile.spec.ts` 的「a genuinely empty room projection still shows Day-0 (BUG-025)」。

## 修好定义

- 空 home（四房间内容为空：rows + counts）+ 空白会话：DOM 出现 Day-0 文案，且不出现
  「这是你的一把手桌面——三句话，说完就办」；
- 有任一 memory / desk 数据时：反过来，出现「有桌面」分支、不出现 Day-0 文案；
- 证据：`first-mile.spec.ts` 的 BUG-025 回归案；`pnpm test` / `pnpm verify` 绿。
