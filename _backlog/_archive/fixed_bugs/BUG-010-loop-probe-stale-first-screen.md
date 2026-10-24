---
status: 已修
severity: P2
opened: 2026-10-11
---

# BUG-010：首用闭环探针的首屏断言停在「打开即对话」时代——唯一桌面之后首屏是桌面页

> 严重级别：P2（次要）｜发现：2026-10-11｜状态：已修（2026-10-11）

## 症状

`pnpm loop-probe '<URL>' --ask '你好'` 对走查实例（web 会话，preflight 绿、真人可正常使用）判红：

```json
{ "booted": true, "composerMounted": false, "firstMileStripShown": false,
  "noRoomJargon": true, "workspaceReady": true, "zhHero": false, "replySeconds": null }
```

`consoleErrors`/`exceptions` 都是空——页面没坏，是**探针看的那个首屏不再是它以为的首屏**。

## 根因

该探针写于「打开即对话 / hero + 首开引导条在首屏」的时代。2026-10-11 的**唯一桌面**裁决把默认主区
改成**账本桌面页**（[唯一桌面 note](../../../notes/implemented/2026-10-11-one-operating-desk.md)），
所以首屏既没有 composer、也没有 vendor hero、也没有首开引导条——三个断言按设计就该是 false。
`noRoomJargon`/`workspaceReady`/`booted` 仍绿，正说明页面本身是好的。

## 复现

```sh
pnpm loop-probe '<任一 dev 实例 URL>' --ask '你好'   # composerMounted/firstMileStripShown/zhHero 全 false
```

## 修复（按候选 1 执行，2026-10-11）

`dev/probes/web/webui-loop-probe.mjs` 的场景契约改成两步，判据面回到真实首屏：

- **首屏 = 桌面页**：`deskFirstScreen`（`[data-assistant-operating-desk]` 且含「你的桌面」）、
  `deskCopyZh`（中文文案「重新读取」＋「＋ 交代新事项」在场，接替原 `zhHero` 的角色）、
  `noRoomJargon`、`workspaceReady` 照旧；`zhHero`/首屏 composer/首屏引导条断言删除。
- **进会话（只在要跑回合时）**：走桌面自己的门「＋ 交代新事项」（退路＝「新建会话」），进了才判
  `composerMounted` 与 `firstMileStripShown`（引导条两种变体都算在场——「第一次来」是全新 home、
  「这是你的一把手桌面」是有数据的 home，按 home 新旧二选一会把健康 home 判红）。不带回合的
  surface-only 运行**不建会话**（副作用归零）。
- 头注写明为什么；`AGENTS.md` 命令表那一行同步成「首屏=桌面页 → 进会话 → 真发问真等回复」。

**红→绿证据**：同一只探针在全新一次性 home（`.tmp/loop-probe-home`，真服务 + 真模型）上——
改前 `composerMounted/firstMileStripShown/zhHero` 全 false（对健康实例判红）；改后
`{deskFirstScreen, deskCopyZh, noRoomJargon, workspaceReady, entry: desk-intake, composerMounted,
firstMileStripShown}` 全 true，`--ask '你好'` 真回合 17s、`approvals: 0`、`consoleProblems: []`，**exit 0**。

**连带抓到的真缺陷（当场修掉，另立 commit）**：`startIntake` 原先要求投影 `ready` 才开会话，
而全新 home 的投影是 `missing`（404＝没有账本）⇒「＋ 交代新事项」在 Day-0 是**死按钮**。
修法：`missing` 视为「没有事项」（绑定时的 id 集诚实地为空），`loading/error/disconnected` 视为真未知
（不绑路径，但门照样开）。守卫：`tests/client/client-entry.spec.ts` 新增无投影用例。载体 commit
`5a7c00a`。

**与 BUG-009 的区别**：这张是**断言过时**（必然红，与负载无关）；BUG-009 是同一类探针在**高负载下**
的挂载期假红。两张一起看，浏览器探针面当前**两条都不能当回归信号**。
