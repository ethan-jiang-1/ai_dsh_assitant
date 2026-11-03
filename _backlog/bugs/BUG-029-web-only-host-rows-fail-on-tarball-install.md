---
status: 排查中
severity: P1
opened: 2026-11-03
---

# BUG-029：tarball 安装时五个 web-only host 行导入失败

> 严重级别：P1 ｜发现：2026-11-03 ｜状态：排查中 ｜ 审查：—（出口前填）｜ 去向：—（出口前填）
> 证据来源：`pnpm product-smoke` 的临时 home；日志 `dsh: warning: 5 entries did not activate` +
> `assistant-product (dsh-smart-assistant/product): failed to import`（其余四行同）。source wrapper 与
> 已安装 `dsh 0.2.1-rc.5` 都复现；`dev` link 安装（`pnpm start`/dev home）不复现。
> 影响：产品首屏门、房间读回、经营投影、完整看板密度、Viki 五个 host 行不激活；`workspaceDir` 不落
> profile patch（`product-smoke` 的 `profile patch does not persist workspaceDir` 是同一根因的下游）。
> 不涉及：agent 面（preset/tools）仍装载，所以会话能开、模型能答——症状是「问答在、产品面死」。

## 根因（假设，未确认）

profile 的 `pnpm-workspace.yaml` 是 DSH 的 `nodeLinker: hoisted` + `autoInstallPeers: false`，所以
tarball 安装的 `dsh-smart-assistant` 自己没有 `@deepseek-ai/*`；五个 web-only host 行的 runtime import
（`@deepseek-ai/schemastery`、`@deepseek-ai/dsh-home-paths`，均为本包 peer）应由 Host 的 profile-resolution
addon 映射到 DSH 安装的同名副本。`assistant-memory` 等老 host 行能装载，说明映射对部分入口有效；这五个
入口是新加的，差异待取完整 import 错误后判定（peer 范围/入口解析/addon 覆盖面三者之一）。

**已排除**：不是 `insert`/裸 id 的 patch 形态问题（`--dump-config` 有行）；不是 tarball 缺 `lib`（临时 home
里 `lib/host/product/index.js` 存在）；不是 `workspaceDir` 的 settings writer（行本身没 import 成功）。

## 下一步（排查路径）

1. 用 `DSH_DEBUG=1`（或 vendor 的 loader 日志）重跑干净 tarball profile，取完整 `failed to import` 堆栈；
2. 直接 `node -e "import('<profile>/node_modules/dsh-smart-assistant/lib/host/product/index.js')"` 对照
   `assistant-memory` 的 import，确认缺的是哪个 bare specifier；
3. 读 `vendor/dsh/packages/boot/app-boot/src/profile-resolution/` 的匹配条件，确认它是否只覆盖
   已在 host 侧声明的 peer 名/入口；
4. 若确认是包侧 peer 声明/入口形态，补 peer 或改入口；若是 host addon 覆盖面，记录 deviations 并
   决定 workaround（不把 peer 改成 dependency，避免重复实例）。

## 修好定义

- 干净 tarball profile 启动日志无 `did not activate`，五个 web-only 行均为 started；
- `pnpm product-smoke` 的 `profile Config persists the canonical workspace` 断言绿；
- `pnpm product-native-smoke` 与 `dev` link 安装不回归；
- 一张能复现的 fixture 或 spec（干净 profile 的 import 失败 → 修复后绿）。

（P1 修复型本可自授权；但根因未确认前留在 `排查中`，确认后翻 `修复就绪` 再动。）
