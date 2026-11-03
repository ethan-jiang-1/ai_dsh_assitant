---
status: 已修
severity: P1
opened: 2026-11-03
---

# BUG-029：web-only host 行在 tarball 安装里报 "failed to import" 且产品面不工作

> 严重级别：P1 ｜发现：2026-11-03 ｜状态：已修 ｜ 审查：agent — product-smoke/headless/verify ｜ 去向：implemented（[bundle-first 决策 6](../../../notes/implemented/2026-11-02-bundle-first-lifecycle.md)）
> 症状：干净 tarball profile 启动打印 `5 entries did not activate` / `assistant-product ... failed to import`
> （其余四行同）；产品首屏门、房间、投影、ui-mode、Viki 五行走不到，`workspaceDir` 不落 profile patch；
> agent 面（preset/tools）仍活，所以「问答在、产品面死」。

## 根因（已确认）

五个 web-only 行在 bundle patch 里写了
`disabled: !!js "!ctx.get('connection')"`。`connection` 由 web-app bundle 在**同一次 boot 的稍后**注册：
entry 创建时表达式为真，Loader 跳过 entry；等 `connection` 出现时，启动审计只看到「enabled 但无 fiber」，
重新 import（成功）后仍不启动，于是打印无 stack 的 `failed to import`。**这不是 peer/resolution/subpath
问题**：同包的 `operating-ledger`/`knowledge-approve-remote` 也是 subpath 且不警告；`ui-mode` 没有
runtime peer 也中招；一个 3 行本地插件复现同样一行。

## 修复

- 删掉五行的 `disabled` 表达式；五行本来就有 `inject = ['connection', ...]`，在 web 里正常启动。
- headless 改由 profile overlay 显式停用：`dev/profiles/profile-patch-headless.yml` 加五条
  `- id: ... disabled: true`；`release-smoke` 的 headless patch 同步。
- 门禁 `webOnlyRowsProblems` 改为：web 侧行**不得**带 `disabled` 表达式；headless overlay 必须逐行
  `disabled: true`（负例：表达式回归、overlay 漏行）。
- 文档（product/release/architecture/discipline/README/bundle-first note）同步为「inject 激活 +
  headless overlay 显式 disabled」，不再宣称 bundle patch 自禁用。

## 修好定义（已满足）

- `pnpm product-smoke` 通过：web 启动无五行警告（不再出现 `did not activate`）、
  `profile Config persists the canonical workspace` 绿；旧 profile 块清理段也通过。
- `pnpm dsh --profile dev-task --dump-config` 五行 `disabled: true`；`pnpm dsh --profile dev-task "one task"`
  只剩 MISSING_CREDENTIAL，没有 pending 警告。
- `pnpm check`：1,261 用例、verify 60/60；`webOnlyRowsProblems` 的红绿夹具覆盖「表达式回归」与
  「headless overlay 漏行」。
- 没有改 vendor；上游审计的误判行为记录在卡里，若上游修复可撤销本地 workaround。
