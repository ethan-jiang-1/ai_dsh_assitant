---
status: 活跃
severity: P2
opened: 2026-10-11
---

# BUG-010：首用闭环探针的首屏断言停在「打开即对话」时代——唯一桌面之后首屏是桌面页

> 严重级别：P2（次要）｜发现：2026-10-11｜状态：活跃

## 症状

`pnpm loop-probe '<URL>' --ask '你好'` 对走查实例（web 会话，preflight 绿、真人可正常使用）判红：

```json
{ "booted": true, "composerMounted": false, "firstMileStripShown": false,
  "noRoomJargon": true, "workspaceReady": true, "zhHero": false, "replySeconds": null }
```

`consoleErrors`/`exceptions` 都是空——页面没坏，是**探针看的那个首屏不再是它以为的首屏**。

## 根因

该探针写于「打开即对话 / hero + 首开引导条在首屏」的时代。2026-10-11 的**唯一桌面**裁决把默认主区
改成**账本桌面页**（[唯一桌面 note](../../notes/implemented/2026-10-11-one-operating-desk.md)），
所以首屏既没有 composer、也没有 vendor hero、也没有首开引导条——三个断言按设计就该是 false。
`noRoomJargon`/`workspaceReady`/`booted` 仍绿，正说明页面本身是好的。

## 复现

```sh
pnpm loop-probe '<任一 dev 实例 URL>' --ask '你好'   # composerMounted/firstMileStripShown/zhHero 全 false
```

## 修复关联

探针的**场景契约要跟着产品走**，两个候选（未裁决，选一个即可）：
1. **改成「桌面首屏 + 进会话问答」两步**：首屏断言改看桌面（`你的桌面`/`重新读取`/`＋ 交代新事项` +
   `workspaceReady`），再点「＋ 交代新事项」或「新建会话」进会话，然后才发问、等回复——闭环语义
   （真发问真等回复）不变，判据面回到真实首屏；
2. 保留现断言但**显式声明前置**（要求调用方先把实例停在会话页），并在头注写明这不是首屏判据。

方向 1 更值（首屏=桌面正是产品决定，探针应替它站岗）。修的时候同 diff 更新探针头注与
[`docs/testing.md`](../../docs/testing.md) 证据地图里对它的描述（若提到首屏判据）。

**与 BUG-009 的区别**：这张是**断言过时**（必然红，与负载无关）；BUG-009 是同一类探针在**高负载下**
的挂载期假红。两张一起看，浏览器探针面当前**两条都不能当回归信号**。
