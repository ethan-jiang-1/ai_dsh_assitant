---
topic: 平台与仓内事实
intent: "把 DSH 的启动/profile/workspace/session/prompt/产物约束与本仓现状钉在一处，供问题卡区分平台硬约束和产品选择。"
---

# 平台与仓内事实

> 立档：2026-11-01 ｜ 服务卡：[插件即产品](../../issues/261101-plugin-as-product.md)

## 0. 这篇回答什么

只回答三件事：

1. DSH 现在允许产品怎样“有自己的启动 profile、在启动时知道工作区、把产物落到工作区”；
2. 本仓哪些合同与这个目标直接冲突；
3. 哪些已经对齐，不必重做。

不回答“大脑跟人还是跟项目”——那是问题卡的拍板点。

## 1. 启动与 profile

| 事实 | 证据 | 对产品的含义 |
|---|---|---|
| `dsh` 启动器只认 `--profile`、`--from-default-profile`、`--patch` 与 dump 族；**没有 `--workspace` / `--cwd`**。启动器自己的旗标读到第一个不认识的 token 为止，其余交给被启动的应用 | [args.ts](../../../vendor/dsh/apps/cli/src/args.ts) | “启动时知道工作区”只能由产品启动器写进自己的设置/补丁，DSH 不会代传 |
| `--from-default-profile web` 用 shipped 模板**替换**同名 custom profile；`dsh plugin --profile <p> add <spec>` 管理依赖并更新 `dsh.profile.bundles` | [args.ts](../../../vendor/dsh/apps/cli/src/args.ts)、[bootstrap.mjs](../../../packages/dsh-smart-assistant/bootstrap.mjs) | “独立的启动 profile”= 产品启动器经官方 CLI 建一个自己的 profile；DSH 没有第三方 profile 模板机制 |
| profile 是用户侧的 named composition，不是发布物；同一 `$DSH_HOME` 下所有 profile 共用 sessions、Workspace registry、credentials 与插件数据 | [docs/delivery.md](../../../docs/delivery.md) §一、FAQ 26 · 15 四空间 | 产品不能拿“换 profile”当隔离；隔离仍靠独立 `$DSH_HOME` |
| CLI 改变 profile 的 bundle membership 后需要重启 profile；Web Plugin Manager/HMR 是另一条应用路径 | [web-app README](../../../vendor/dsh/packages/bundle/web-app/README.md) | 启动器每次启动负责“版本对账 + 必要时重装 + 重启即生效” |

## 2. Workspace 与会话根

| 事实 | 证据 | 对产品的含义 |
|---|---|---|
| Workspace 是 Host 侧登记：uuid + realpath 规范化路径 + 标题 + 有序会话账户；存在 `$DSH_HOME/storages/workspace.json` | [workspace.md](../../../vendor/dsh/docs/subsystems/workspace.md) | 产品可以替用户登记工作区，但登记只是导航/分组，不是权限 |
| `ctx.workspaceRegistry.create(path)` 要求绝对、已存在的目录；按 canonical path 幂等；返回既有记录 | [workspace/src/index.ts](../../../vendor/dsh/packages/workspace/workspace/src/index.ts) | Host 行可以在 boot 时把启动器给的工作区登记好；路径缺失时不能悄悄建目录 |
| Web 首用只在 Workspace registry 为空且没有任何会话时调 `initializeDefault()`，在 `<Documents>/deepseek-harness/default-workspace` 建默认工作区 | FAQ 26 · 16、[workspace.md](../../../vendor/dsh/docs/subsystems/workspace.md) | 产品若在 boot 时先登记自己的工作区，就不会冒出 Documents 默认工作区 |
| 会话创建接受 `workspaceId` 或 `cwd`，二选一；`workspaceId` 由 Host 取 registration 的 canonical path 写入 `header.cwd` | [session-controller README](../../../vendor/dsh/packages/api/session-controller/README.md)、FAQ 26 · 90 | 产品会话必须**创建时**就落在工作区 |
| `header.cwd` 创建后不可变，是原始项目身份、工具目录与 sandbox 默认 workspace root；`working_directory` 只改后续相对操作，不改 header 与 sandbox roots | [working-directory.md](../../../vendor/dsh/docs/subsystems/working-directory.md) | “能力施加到工作区”= 会话一开始就建在工作区；事后改目录不够 |
| 删除 Workspace 只删登记、顺序与账户；目录、文件、会话日志不动 | [workspace.md](../../../vendor/dsh/docs/subsystems/workspace.md) | 产品不能把 Workspace 删除当“删项目” |
| Client 侧已有 `remote.session.create` 与 `uiWorkspace.startSession(workspaceId, { agentPreset })`；本包 client 已注入 `workspaces` / `uiWorkspace` / `remote.session` | [workspace-controller README](../../../vendor/dsh/packages/api/workspace-controller/README.md)、[src/client/index.ts](../../../packages/dsh-smart-assistant/src/client/index.ts) | 产品首页可以用现成服务在工作区里开会话，不必新造会话控制器 |

## 3. 提示词与常驻段落（per-workspace 大脑的硬约束）

| 事实 | 证据 | 对产品的含义 |
|---|---|---|
| `PromptSection.text` 的 provider 拿到的是 `AssembleContext { scope?, signal? }`——**没有 session、没有 cwd、没有 workspace** | [system-prompt/src/index.ts](../../../vendor/dsh/packages/core/system-prompt/src/index.ts) | 想按会话/按工作区动态渲染“桌面”（身份/手册/摘要）没有现成入口 |
| `PromptContext` 同样只有 `AssembleContext` | 同上 | 换成 user-role 快照也拿不到 session |
| 会话 cwd 以“required user-context snapshot”随请求进入模型上下文；目录变化经 `working-directory/change` 通知 | [working-directory.md](../../../vendor/dsh/docs/subsystems/working-directory.md) | 模型知道自己在哪个目录；手册不必烘绝对路径 |
| 本包四段落（soul / manual / operating brief / digest）由 preset 行全局注册，服务是进程单例 | [docs/architecture.md](../../../docs/architecture.md) §二、[memory-digest/index.ts](../../../packages/dsh-smart-assistant/src/agent/memory-digest/index.ts) | “每个工作区一套大脑”会同时改服务、段落、面板、账本、备份与测试；平台没有现成接缝 |

**判据**：如果产品选“大脑跟项目走”，要么接受“一个产品实例只服务一个工作区、进程级配置就是当前工作区”，要么先在平台侧找到/新建一个“请求级 session 上下文”的接缝。后者不是本仓能偷偷加的。

## 4. 产物与 present

| 事实 | 证据 | 对产品的含义 |
|---|---|---|
| DSH 没有通用 artifact store；“产物”拆成 `present`、`workspace/changes`、attachments、spill、会话导出 | FAQ 26 · 14 | 产品的交付物应该写成工作区文件，再用 `present` 声明 |
| `present` 只把**绝对路径**写进 `deliverables/presented` 事件，不复制内容；相对路径按会话 cwd 解析；不要求 Workspace 登记 | FAQ 26 · 14 | run bundle 的交付物必须是工作区里的普通文件；present 不会替它搬家 |
| 会话导出的 ZIP 只含日志、附件与 present 声明，**不含被 present 的工作区文件内容** | FAQ 26 · 14 | “把会话带走”不等于“把项目带走”；产品要分别说明 |
| `workspace/changes` 的逐文件 diff 只在 Host 内存、会话销毁即止；attachments 在 `$DSH_HOME/attachments` 且无自动 GC；spill 默认在 OS 临时目录 | FAQ 26 · 14 | 都不要当 run bundle 的存储 |

## 5. 沙箱与写入边界

| 事实 | 证据 | 对产品的含义 |
|---|---|---|
| `workspace-write` 的可写根 = 会话 `header.cwd`（+ 平台临时目录）；读取不受该写入围栏限制 | FAQ 26 · 16、[working-directory.md](../../../vendor/dsh/docs/subsystems/working-directory.md) | 工作区拿到的是写入围栏内的能力，不是安全边界 |
| Host 插件代码不自动受会话 sandbox 约束；插件应通过自己的目标路径规则控制写入 | FAQ 26 · 15 | 产品 Host 行写 `$DSH_HOME/assistant-product` 是正常的；不要宣称模型只能读工作区 |

## 6. 本仓现状：与新目标直接冲突的合同

| 文件 | 现在写着 | 冲突 |
|---|---|---|
| [根 AGENTS.md](../../../AGENTS.md) 首段 | working folder = 本插件 `dataDir`，**不是**进程 cwd/workspace | 把“工作区”写成不相关的东西；产品形态里它是作业面 |
| [根 README.md](../../../README.md) 「装法」 | 三步：装包 → Settings 选预设 → 可选改 profile patch | 产品应是“一条命令启动”，不是三步装配 |
| [docs/delivery.md](../../../docs/delivery.md) §一 | DSH 平面映射里 W workspace = **不拥有**；working folder 与账本是 **home 单例，不按 workspace 分区** | 新形态要在 W 平面拥有一个产物面（仍可不做 per-workspace 大脑） |
| [docs/release.md](../../../docs/release.md) §一/§八 | **不在包里新增应用入口**；只发布 bundle；独立启动用 bootstrap | 产品启动器是包内部署包装，宪章要改写 |
| [docs/identity.md](../../../docs/identity.md) §一末 | **不新增起 DSH 的应用入口**：不提供 `dsh` 启动 bin 或独立 CLI | 与“独立启动 profile + 启动器”直接冲突 |
| [bootstrap.mjs](../../../packages/dsh-smart-assistant/bootstrap.mjs) | 默认 home 在包旁边的 `assistant-data/`，`workspace = <home>/workspace`，拒绝日用 `~/.dsh`，profile `assistant-standalone` | **home 隔离的方向是对的**（复核后产品也改为自有 home）；冲突是 workspace 是它自己造的、不是用户的，profile 名也不是产品名，且没有产品设置/工作区登记 |
| [docs/home.md](../../../docs/home.md) §一注 | 家的 `deliverables/` 是模型自发落点，不是契约 | 新形态要把产物落点升级为工作区契约，并把家的那份标 legacy |
| [home-map.ts](../../../packages/dsh-smart-assistant/src/domain/home/home-map.ts) | `CURRENT_DELIVERY_BULLETS` 已说“deliver under the session cwd”；`CURRENT_LAYOUT_TREE` 仍列家的 `deliverables/` | 行为方向已对，缺稳定形态与工作区保证 |
| [cordis.patch.yml](../../../packages/dsh-smart-assistant/cordis.patch.yml) | host 行里没有“产品/工作区”行 | 工作区登记、产品设置与状态查询没有落点 |
| [export-dist.mjs](../../../scripts/release/export-dist.mjs) | 安装手册模板以“装进 web profile”为主路径 | `_dist/安装手册.md` 是生成物；产品路径要改生成器 |
| [dev/env/setup.sh](../../../dev/env/setup.sh) | dev 的 `dev` profile 建自 web 模板，默认 preset 用 profile patch 设 | 产品 profile 的建法可以复用，但默认 home/工作区语义不同 |

## 7. 已经对齐的部分

- [home-map.ts](../../../packages/dsh-smart-assistant/src/domain/home/home-map.ts) 的 `CURRENT_DELIVERY_BULLETS` 已经写明：交付物写到会话 cwd，`present` 声明，工作目录是笔记本不是交付架。
- [docs/delivery.md](../../../docs/delivery.md) 已把大脑、账本、宿主数据、交付物的所有权分表；`assistant-data` 两目录备份、`handoff-scan`、`release-smoke` 都在位。
- `present` 已在 preset 里；根 `.gitignore` 已有 `/deliverables/`，说明“cwd=项目、产物落 cwd”的现场惯例已经存在。
- [notes/implemented/2026-10-28-data-plane-alignment.md](../../../notes/implemented/2026-10-28-data-plane-alignment.md) 已把“所有权先于存储、可见性硬约束、平台不兜底”落成数据卡口径。

## 8. 验证状态（技术探针已跑 1–3）

**已证**（详见 [技术探针](261101-technical-probes.md)）：

1. **boot 登记 + 会话 cwd**：`workspaceRegistry.create()` 幂等；`sessionController.create({ workspaceId })` 产生的会话 `header.cwd` = 工作区（与进程 cwd 无关）；`storages/workspace.json` 持久化。机制成立，产品 smoke 只需复跑。
2. **headless 注入**：base+headless 里 4 条既有 web-only 行 pending 等 `connection`（汇总 warning）；产品 web 行要按 `schedule` 先例禁用，或接受第 5 条。不是“optional inject 自动不 pending”。
3. **跨 profile 打开产品会话**：缺 preset 的失败码 = `agent-preset/not-found`，不是静默换 preset。

**还没证**：

4. **无会话的第一屏**：registry 非空、无会话时，Web 首屏是否停在产品首页而不是自动建会话；client 门需要一次真渲染。
5. **client 门的依赖面**：`GET /api/assistant/product` 与 `uiWorkspace.startSession` 在不新增 `remote.workspace` 注入的前提下够不够用；产品 web 行自身的 settings/route 行为要 host spec + product-smoke。
6. **profile 更新**：版本变化时重装 tarball 的失败/回滚路径；用户自装插件/改配置是否被保留。
7. **模型行为与 session id**：手册改成“工作区 + deliverables/<date>-<slug>/”后，模型是否稳定照做；模型不保证知道自己的 session id，run README 不能强制它写。
8. **product-smoke 的上限**：它能证 profile/登记/URL，不能证浏览器首屏；会话 cwd 可用 in-process 探针（见 §8.1），不必等浏览器。
9. **Windows / Desktop**：启动器的 `.cmd` shim 与 Desktop 保留 profile 不在本轮宣称范围；沿用现有边界。

## 9. 证据索引

- DSH 启动与 profile：[args.ts](../../../vendor/dsh/apps/cli/src/args.ts)、[web-app README](../../../vendor/dsh/packages/bundle/web-app/README.md)
- Workspace 登记与首用：[workspace.md](../../../vendor/dsh/docs/subsystems/workspace.md)、[workspace/src/index.ts](../../../vendor/dsh/packages/workspace/workspace/src/index.ts)、[workspace-controller README](../../../vendor/dsh/packages/api/workspace-controller/README.md)
- 会话根与沙箱：[working-directory.md](../../../vendor/dsh/docs/subsystems/working-directory.md)、[session-controller README](../../../vendor/dsh/packages/api/session-controller/README.md)
- 提示词段落：[system-prompt/src/index.ts](../../../vendor/dsh/packages/core/system-prompt/src/index.ts)
- 本仓冲突面：[根 README.md](../../../README.md)、[根 AGENTS.md](../../../AGENTS.md)、[docs/delivery.md](../../../docs/delivery.md)、[docs/release.md](../../../docs/release.md)、[docs/identity.md](../../../docs/identity.md)、[docs/home.md](../../../docs/home.md)、[bootstrap.mjs](../../../packages/dsh-smart-assistant/bootstrap.mjs)、[cordis.patch.yml](../../../packages/dsh-smart-assistant/cordis.patch.yml)
- 外部参考：FAQ 26（`deepseek-harness/_faq_on_digested/26_plugin-as-product`，10/13/14/15/16 与 90/91/93 篇）——只作判据来源，不复制其正文。
