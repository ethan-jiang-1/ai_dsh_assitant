日期：2026-11-03 · 状态：**implemented**

# 七维二轮：自述面、测试所有权与 web-only 生命周期

## 问题（可观察行为）

一轮收口把"本轮修了什么"当成"现在还剩什么"，于是七维自评全 A-；fresh-eyes 复评发现三类债：
①自述面——活跃收口卡的"仍余/下一步"与自己的台账相反，生成安装手册的 headless 段落后于 self-disable；
②测试所有权——facade 级 spec 让入口绿，但 `assistant_reflect brief`、`sendPrompt` 的 15-poll
过期、content-drawer 的真实 DOM 关闭没有会为回归而失败的断言；
③web-only 生命周期——五个 host 行用 `disabled: !!js "!ctx.get('connection')"` 自禁用，而
`connection` 在 entry 创建之后才注册，Loader 跳过 entry 且永不启动，产品行不落 `workspaceDir`。

## 决定

1. **评分口径按当前债，不按本轮修复**；活跃卡只留一个停点 + 一个切片台账，历史评分表必须标注"历史"。
   生成物（`_dist/安装手册.md`）的正文随合同同 diff 更新，freshness 门只钉版本/包名/基线三行不够。
2. **地板单一入口**：`pnpm check` = typecheck → test → verify；阶段收口另加 `pnpm check:full`
   （floor + `web-face-check --all` + `upgrade-smoke` + `release-smoke`），由 runner 汇总每条车道的
   通过/阻断/失败，不用 `&&` 链吞掉阻断。
3. **测试所有权在模块/facade 边界**：每个实质行为有会为回归失败的 spec；测试类型按层（domain/host/
   agent/client/composition/tooling），不为 `tests/cli` 单开第二层——CLI 行为 spec 住 tooling 是
   已声明例外（共用 throwaway 夹具，被测面是 facade）。coverage 仍是读数，不设阈值。
4. **web-only 行的生命周期**：web 侧靠 `inject = ['connection', ...]` 启动；headless 在 profile
   overlay 里显式 `disabled: true`（`dev/profiles/profile-patch-headless.yml` 是样板）。
   **不在 bundle patch 里用 `disabled` 表达式 gate 晚注册的服务**——entry 创建时表达式为真会被
   跳过，启动审计只报无 stack 的 `failed to import`。
5. **旧安装器块清理**：只删自己写的精确 4 行，其他字节不动；编辑过就 fail loud。升级/重跑
   `bootstrap` 时自动清；包已移除的旧 home 用发布目录的
   `bootstrap.mjs --cleanup-legacy --home <home>`（不需要包在场）。vendor 的 `remove` 没有 bundle
   钩子，所以自动清理只发生在重跑安装器时，文档必须给出独立命令。
6. **结构切片**：`assistant-data-bundle.ts` 按 5 个动词拆 `src/cli/assistant-data/*`，公共面仍是
   `assistant-data.ts` facade；scratch 门禁跳过"已删除但未暂存"的 tracked 文件，不让 verify 在重构
   中途 ENOENT 崩。
7. **notes/backlog 的自述腐化同 diff 处理**：实现的决策反转要加收窄指针并改写正文；活跃清单/卡
   状态与台账同源；trigger 条件已到场的行改指向，不留在"刻意不做"。

## 输掉的方案

- **保留 self-disable 表达式**：web 上五行被跳过、产品行不落 `workspaceDir`；启动审计的
  `failed to import` 不是 importer 错误，排障会被引向 peer/subpath 的假方向。
- **改成 `profileContext.bundles` gate**：实测该服务在 entry 创建时不可用（或 bundles 不含 web-app 名），
  web 里五行被误禁——不能作为稳定门。
- **只等 vendor 修审计**：vendor 的误判确实存在，但本地产品行不启动是独立缺陷；先做包侧正确姿态，
  上游修复后也不冲突。
- **把 peer 改成 dependency 以绕过解析**：会造重复实例，破坏 `@deepseek-ai` 单实例契约。
- **为 `tests/cli` 单开层**：同一行为两个家；已有 tooling 层与 facade 足够，登记例外。
- **在 remove 时自动清 profile 块**：vendor 明确不碰用户 patch，bundle 没有 remove 钩子；只能提供
  独立资产命令 + 文档。
- **给 coverage 设阈值**：没有"删了才对"的死代码实证，阈值会逼出凑覆盖。

## 后果

- 七维达到 A（9.0）的判定线；产品面（首屏门/房间/投影/ui-mode/Viki）在 tarball 安装里启动，
  headless 五行显式停用，旧安装器 home 有自动/独立两条清理路径。
- 生成物与自述面的漂移有了本轮的可复用检查：活跃卡历史表标注、安装手册随合同、notes 收窄指针。
- 剩余开放项（非本轮目标）：client bundling 按 vendor `clientBundle()` 重写的可选片、vendor 启动审计的
  上游修复、registry 发布凭证；触发条件在收口卡与 `_backlog/triggers.md`。
