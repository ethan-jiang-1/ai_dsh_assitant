---
status: 已修
severity: P1
opened: 2026-11-01
---

# BUG-028：安装手册的"建 profile"命令漏了 `--dump-config`——它会直接启动 Web，且 `--from-default-profile` 会替换已有 profile

> 严重级别：P1（重要）｜发现：2026-11-01｜状态：已修（2026-11-02）

## 症状

生成的手册第一节写着：

```sh
dsh --profile assistant --from-default-profile web      # _dist/安装手册.md:43-44
```

两件未声明的事同时发生：

1. **它会 boot**。launcher 只有在给了 `--dump-config` / `--dump-default-config` /
   `--dump-config-schema` 时才走 dump；没有则 `{ mode: 'profile' }`，也就是**真的启动 Web**
   （`vendor/dsh/apps/cli/src/args.ts` 的 `resolveBoot`：`dumps.length === 0 ⇒ mode: 'profile'`）。
   手册把这一步描述成"一次性建 profile（CLI 自动化）"，读者会以为它建完就退。
2. **它会替换已有 profile**。传了 `--from-default-profile` 就在 load 前调
   `initializeProfileFromDefault`（`vendor/dsh/apps/cli/src/profile-boot.ts` 的 `prepareProfile`），
   即删除该 profile 的依赖与用户 patch。手册在上一行用括号提醒"已有 profile 不要用"，
   但同一份生成物在 §六 又教用户拿 `dsh plugin add` 升级同一个 profile——两条指令相撞时，
   代价是用户的依赖与 patch。

仓内所有脚本调用都带 `--dump-config`（`bootstrap.mjs:397`、`scripts/release/release-smoke.mjs:170,321`），
所以**只有手册这一条是裸的**：脚本对、文档错，且文档是唯一发给用户的产物。

## 根因（假设）

手册正文在 [`export-dist.mjs`](../../scripts/release/export-dist.mjs) 里是一个模板字符串，
命令是手写进去的，没有复用脚本里已验证的那条（`--from-default-profile web --dump-config`）。
生成器只校验版本号与条目存在性，不校验命令形状。

## 复现

干净 home 上跑手册第 43 行：进程不退出、打印 `dsh web: http://…/?token=…`；
对一个已存在的 profile 再跑一次，随后 `--dump-config` 可看到依赖与用户 patch 已空。

## 修复关联

- 与 [插件生命周期对齐卡](../settled_issues/261101-plugin-lifecycle-align.md) 的 S4（文档分层）同批处理：
  该卡要把手册从"十步部署 runbook"改成"产品手册十段"，这条命令属于其中"安装"段。
- 建议形状：`dsh --profile assistant --from-default-profile web --dump-config`，
  并在同句写明"只用于全新 profile；已有 profile 会丢失依赖与 patch"，与 `docs/release.md` 口径一致。

## 修复（2026-11-02）

- `scripts/release/export-dist.mjs` 的手册模板改成
  `dsh --profile assistant --from-default-profile web --dump-config`，并写明「只用于全新 profile、
  它是破坏性重置、不带 `--dump-config` 会直接 boot」。
- 生成后新增文本判据：手册里任何 `dsh … --from-default-profile` 行都必须带 `--dump-config`，否则
  `export-dist` 报红（`manual only quotes dump-mode profile creation`）。
- 证据：`pnpm export-dist` 该条 ok（`every --from-default-profile carries --dump-config`）；
  生成的 `_dist/安装手册.md` 第一节已是 dump 形态。

## 修好定义

- 生成的 `_dist/安装手册.md` 里任何 `--from-default-profile` 都带 `--dump-config`；
- `export-dist` 增加一条文本判据：手册模板中出现 `--from-default-profile` 而无 `--dump-config` 即红
  （带负例夹具，见 [`scripts/AGENTS.md`](../../scripts/AGENTS.md) 门禁纪律 1）；
- 手册与 `bootstrap.mjs` 的建 profile 命令同源，不再各写一份。
