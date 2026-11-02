---
description: "A DSH bundle that turns an agent preset into a long-lived assistant with its own working folder: memory, research, skills, knowledge, and an operating ledger."
kind: "package-bundle"
---

# dsh-smart-assistant

装进一个 DSH **web** profile 后，新会话默认就是「章鱼管家」：一个有自己 working folder 的常驻助手——
记忆、线索、技能、知识页与经营账本都在它的 home 里，交付包落在你的项目目录。不是通用编码助手；
要一个随项目走的代码 agent，用 DSH 自带的 preset 更合适。

## 装什么、装到哪

- 这是一个 **bundle**（`package.json` 声明 `dsh.bundle.patch`），不是普通依赖：装进 profile 后自动贡献一层组合。
- 它插入/覆盖的主要行：`preset-assistant`（模型可见面）、`assistant-product`（工作区绑定与首屏门）、
  `assistant-memory`、`assistant-operating-ledger`、`assistant-desk-projection`，以及两条 vendor 行停用
  （`ui-sidebar-terminal`、`ui-trajectory`）。完整清单以 `--dump-config` 为准。
- **适用面：web。** 它覆盖的行与 client 插件只在 web 组合里成立；headless/SDK/ACP 要显式停用 `assistant-product`（见「安装」末段）。
- 版本：DSH `>=0.2.1-rc.2 <0.3.0-0`、Node `^22.19.0 || >=24`、pnpm `>=10.6.0`。不满足时 DSH 在写依赖前拒绝。
- **装进哪个 profile**：任意 web profile 都能工作。推荐新建一个 **custom profile `assistant`** 再装——
  本 bundle 的默认值带产品口味（停用右栏终端、关运行轨迹页、界面语言中文），装进你已有的 profile 会改它的组合。
- DSH 本体的 `@deepseek-ai/*` 由宿主提供（peer）；唯一运行期依赖是 `yaml`，首次安装需要 registry 或内网镜像。

## 安装

默认入口是 **Plugins 页**（`dsh web` 与 Desktop 同一句；页面装的是**当前 profile**，不创建 profile）：

1. 建并启动一个 profile。推荐专用组合（一次建成，`--dump-config` 不能省——没有它会直接启动）：
   ```sh
   dsh --profile assistant --from-default-profile web --dump-config
   dsh --profile assistant
   ```
2. 侧栏 **Plugins** → **Add plugin** → **Install a third-party plugin** → 填 `dsh-smart-assistant`（或本地 tarball 的绝对路径）。
3. 启用，**重启 profile**（bundle 成员变化要重启），首屏按提示选项目目录。

**CLI（仅 `dsh web` 自动化 / 无 Plugins 页的 surface）**：先确认 profile 已经建好——对自定义名字，`dsh plugin`
只会建一个 base-only profile，没有 web-app 就起不了 Web。

```sh
dsh plugin --profile assistant add dsh-smart-assistant@<version>   # 钉 exact 版本
```

**安装器（仅 shell/自托管，不在包里）**：发布资产里的 `bootstrap.mjs` 负责建/复用 profile、装包、起 Web：

```sh
node bootstrap.mjs --package ./package --workspace /path/to/your-project
node bootstrap.mjs --package ./package --stop --home ~/.dsh-smart-assistant
```

**headless / SDK / ACP**：装包即可。五个 web-only 行（`assistant-product`、`assistant-desk-projection`、`assistant-ui-mode`、`assistant-rooms`、`assistant-viki`）在 bundle patch 里按 `connection` 自禁用，headless 组合不需要手写 patch；若仍看到 pending，先检查 bundle 版本与 `connection` 服务。

**市场（Discover）**：DSH 没有中心化市场，市场是索引源模式。索引只是发现层，安装仍是上面三条通道之一。

## 验证

```sh
dsh --profile assistant --dump-config     # 找 preset-assistant、assistant-product，以及 agent-preset-registry 的 default: assistant
```

界面上看到这些算成功：Plugins 列表里有它且已启用；首屏出现「选一个项目目录」；新会话的预设是「章鱼管家」；
右栏有记忆/知识/技能三个房间 tab，右栏终端与「运行轨迹」页不在。`--dump-config` 有行但界面没有 = 没重启或没硬刷新。

## 配置

默认值在 bundle patch；你的覆盖写当前 profile 的 patch（Settings 里的改动也落这一层）。**patch 对同一行是整份替换**，
不是深合并——覆盖时要把想保留的字段一起写全。

| 行 | 字段 | 默认 |
|---|---|---|
| `assistant-product` | `workspaceDir`（volatile）、`onboarding` | 未绑定；`onboarding: true` |
| `assistant-memory` | `dataDir`、`digestMaxBytes`、`recallLimit`、`staleResearchDays` | `<dshHome>/assistant`；见行内 schema |
| `assistant-operating-ledger` | `dataDir`、`keepOperations`、`maxArchiveBytes` | `<dshHome>/assistant-operating`；256；256 MiB |
| `assistant-desk-projection` | `maxProjectionBytes`、`allowFixture` | 8 MiB；`false`（无账本时 404，不把模拟资料当桌面） |

`ASSISTANT_WORKSPACE` 是一次性启动覆盖，不落盘。Viki 的 key 从 `apiKeyEnv`（默认 `OPENVIKING_API_KEY`）读；
凭据写进 patch 会跟着配置一起被备份/分享，不要写。

## 升级

```sh
dsh plugin --profile assistant add dsh-smart-assistant@<new-version>
# 重启 profile（运行中的 Web 不会热替换代码）
dsh --profile assistant --dump-config      # 仍应看到 preset-assistant 与 default: assistant
```

- **没有命令级回滚**（DSH 也没有）：回退 = 重装旧版本。升级前记下当前版本。
- working folder、账本与 `<dshHome>/cache/assistant/` 跨升级保留；升级不写用户数据。
- 升级后默认预设没变回去，先看 `--dump-config`：用户级 `selectedDefault` 优先于 bundle 默认。

## 卸载与数据

```sh
dsh plugin --profile assistant remove dsh-smart-assistant
```

删掉的是包与 patch 层。**数据一律留下**：

| 留下什么 | 在哪 | 要清怎么清 |
|---|---|---|
| 助手大脑（四房间、身份、手册、笔记、技能、审计） | `<dshHome>/assistant` | 先 `assistant-data export` 备份，再手动删目录 |
| 经营账本与操作归档 | `<dshHome>/assistant-operating` | 同上 |
| 会话全文索引（可重建） | `<dshHome>/cache/assistant/` | 删该目录 |
| 会话、凭据、设置、storages | 宿主 `$DSH_HOME` | 按 DSH 自己的方式清；插件备份不含它们 |
| 客户端 UI 偏好 | 浏览器 localStorage | 清除站点数据 |

换机/恢复用包内 `assistant-data`（`export` / `import`；已启动过的 home 走 `import --replace`，它把现有目录移到
`.pre-import-*` 旁路，不需要先清空）。备份带 `schemaVersion`，不匹配会拒绝导入。

## 排障

| 现象 | 原因与处理 |
|---|---|
| 装完界面没有它 | CLI 装完宿主不知道：重启 profile；浏览器刷新不加载新模块，要硬刷新 |
| `--dump-config` 有 `assistant-product` 但首屏是普通页面 | 当前组合没有该行（旧包/未 build）或 `onboarding: false`；重装当前 tarball，或删掉该覆盖 |
| 首屏一直「选一个项目目录」 | Config 里没有 `workspaceDir` 且组合里没有目录选择器：在 profile patch 设 `assistant-product.workspaceDir`，或装 `remote.directoryPicker` |
| 产品会话在别的 profile 打开报 `agent-preset/not-found` | 该 profile 没有 `assistant` preset；从专用 profile 打开 |
| headless 仍看到 web-only 行 pending | bundle patch 的 self-disable 未生效（旧包/被 profile 覆盖）；升级当前 tarball，或在 profile 层显式 `disabled: true` 双保险 |
| 装不上，报版本不兼容 | `engines.dsh` / `engines.pnpm` 不满足；升 DSH 或 pnpm，不要用强制安装绕过 |
