# 标签即版本：tag 名 = 该提交里的包版本

日期：2026-10-25 · 状态：**implemented**

## 决定

tag 名必须逐字等于它在的那个提交里 `packages/dsh-smart-assistant/package.json` 的 `version`。规则与发布顺序 =
[`docs/dev.md`](../../docs/dev.md) §九；门禁 = `release: every tag names the package version at its commit`
（纯核 `tagVersionProblems`，负例夹具 = [`vendor-release.spec.mjs`](../../packages/dsh-smart-assistant/tests/tooling/vendor-release.spec.mjs)）。

触发：先打了 `0.1.0`，而 manifest 还写 `0.0.0`——tag 是在给一个不存在的产物命名，`pnpm export-dist` 出来的
包名与手册版本也仍是 0.0.0，两边对不上。

**旧 tag 的处理**：`0.0.1`（2026-10-22 的里程碑）同样不对齐——它指向的提交里 manifest 是 0.0.0。它被删除
（本地 + 远端）；提交仍在 `master` 历史里，需要时从 `git log` 找到那次里程碑提交（workbench tabs /
shared desk projection）再打 tag——但恢复即违反本规则。

## 输掉的方案

- **保留 `0.0.1`，在门禁里祖父豁免**：门禁从此永久带例外，而它从未对应过任何版本；例外条目会在每次审计时
  被重新解释一遍。
- **重写历史把 `0.0.1` 指向的提交改成 0.0.1**：会改掉所有 SHA（当时 153 处 note/backlog 引用失效），代价远大于
  一个三天前的里程碑标签。
- **带 `v` 前缀或轻量 tag**：`v0.1.0` 与版本字符串不再逐字相等，门禁得做归一化，归一化规则又多一个漂移面；
  轻量 tag 没有说明，发布信息少一半。
- **只写文档、不建门禁**：这次的错法（先打 tag、后想起版本）正是"每次都记得"失效的现场。

## 后果

- 发布动作固定为：bump 两处版本 → `pnpm export-dist` → `pnpm verify && pnpm release-smoke` → 提交 →
  打 annotated tag → `git push origin master <版本>`。
- 根 private 工作区与插件包版本保持同值，避免"哪个 version 才算数"的二次解释。
- `0.1.0` 重建在版本提交上；对远端而言是"删旧 tag + 推新 tag"，已经推过的旧 tag 名不再指向旧提交。
