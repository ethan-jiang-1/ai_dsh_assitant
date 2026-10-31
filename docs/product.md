# 产品形态与工作区（当前合同）

> 本文件拥有：**产品启动器、产品 home、用户工作区绑定、一次作业的交付包（run bundle）与项目面**的合同。
> working folder 的四房间 = [`home.md`](home.md)；经营账本 = [`operating.md`](operating.md)；数据卡与备份 = [`delivery.md`](delivery.md)；
> 发布宪章 = [`release.md`](release.md)；身份名 = [`identity.md`](identity.md)。本文件只写产品这一层的合同，不复制四房间语义。

## 一、两个入口

| 入口 | 谁用 | 形态 |
|---|---|---|
| **产品启动器**（推荐） | 拿到 tarball 的用户 | 解包后 `node bootstrap.mjs --workspace <目录>`：建/复用一个自己的 `assistant` profile，装当前包，设默认 preset，起 `dsh --profile assistant` |
| **手工装包**（高级/已有 DSH） | 已维护自己 profile 的用户 | `dsh plugin --profile <p> add <tgz>`，再在 Settings 选 `章鱼管家`——没有产品设置，产品行 idle，行为与旧版一致 |

启动器是**部署包装**，不是新的应用运行时：应用仍由 `dsh --profile` 启动；不打包 DSH/Node，不手写 profile manifest，不新增 app bin。

## 二、产品 home 与 profile

- **默认 home = 产品自有 home**（`~/.dsh-smart-assistant`，可由 `--home` 改；具体目录名 = 启动器实现，文档不另抄）。启动器显式设 `DSH_HOME`，**不继承日用 `~/.dsh`**。
- `--home ~/.dsh` 是用户显式共享日用 home：会与用户其他 DSH 用途共用 sessions/workspace registry/credentials；启动器打警告后继续。
- profile 默认 `assistant`：启动器经官方 CLI 从 web 模板创建，只写自己的依赖与 `agent-preset-registry.default`；用户在 profile 里的其他插件/配置保留。
- 外来同名 profile：启动器拒绝，让用户换 `--profile`。
- 版本对账：已装版本 ≠ 启动器版本时重装 tarball；失败保留旧装并退出。同版本不重装（开发期换内容请用新 home 或 bump 版本）。

## 三、启动合同

```sh
node bootstrap.mjs --workspace <dir> [--home <dir>] [--profile assistant] [--dsh <cmd>] [--offline]
node bootstrap.mjs --product [--home <dir>]        # 之后复用上次绑定
node bootstrap.mjs --stop [--home <dir>] [--product]
node bootstrap.mjs --no-start ...
```

- `--workspace` 首次必填，之后从 `<home>/assistant-product/settings.json` 读取。
- 校验：绝对、存在、是目录、可读写；拒绝 `/`、用户 home 根、产品 home 内、包目录内（解析符号链接后）；路径缺失**不空建**。
- 绑定写成 `<home>/assistant-product/settings.json`（`{version:1, workspaceDir, updatedAt}`，0600）；启动器在 boot 前写，Host 产品行在 boot 时读。
- 启动 cwd 钉在工作区；Web 端口 `--port 0`（OS 分配 + token），日志 token 打码；`--stop` 收进程组。
- 无 `--workspace`/`--product` → 原 standalone 模式（home 在包旁、`assistant-standalone`、内部 workspace）；两者共用 profile/安装/boot 流水线。

## 四、工作区合同

- **登记**：Host 行 `assistant-product`（web-only）在 boot 时用 `ctx.workspaceRegistry.create()` 登记 settings 的 `workspaceDir`；幂等；按 canonical path 去重。
- **会话**：客户端用 `uiWorkspace.startSession(workspaceId, { agentPreset: 'assistant' })` 开会话；`header.cwd` = 工作区，sandbox 可写根 = 工作区。
- **缺失/非法**：路由返回 `workspace-missing` / `invalid`；客户端首页显示恢复面（用 `--workspace` 重启），不自动建目录、不崩。
- **没有 settings**：产品行 `not-configured`，客户端门透明，行为与旧版一致。
- **跨 profile**：同一 home 下其他 profile 打开产品会话时，`assistant` preset 不在组合里，失败码 = `agent-preset/not-found`；文档要求从产品入口打开。
- **headless**：产品行是 web-only（必注 `connection`/`workspaceRegistry`）；headless profile patch 里 `disabled: true`（同 `schedule` 先例）。

## 五、一次作业的交付包（run bundle）

一次作业 = 会话 cwd 下的一个文件夹：

```text
<session cwd>/deliverables/<YYYY-MM-DD>-<slug>/
├── README.md          # 问题与假设 / 依据（含定位） / 产出 / 未决与状态
└── ...交付物（present）
```

- README 是**记录**，不是第二份报告；正文在交付物文件里。
- `present` 只记路径、不复制；会话导出不含交付物内容。
- run 身份 = 文件夹名 + 日期；**不要求模型写 session id**（Host 的机器 manifest 是后续项）。
- 四件物分权：

| 物 | 位置 | Authority | 关系 |
|---|---|---|---|
| 交付包 | `<workspace>/deliverables/<date>-<slug>/` | 用户可拿走的完整正文 | README 指向它；`present` |
| run README | 同目录 `README.md` | 本次作业的问/据/出/未决/状态 | 记录，不是第三份正文 |
| 知识页 | `<home>/assistant/knowledge/` | 助手可复用的理解/教训（draft→stable 人审） | 只蒸馏，不复制正文 |
| 账本事项 | `<home>/assistant-operating/ledger.json` | 业务进展/待办/复查 | 按 id/标题关联，不加 schema |

- 生命周期：用户拥有；插件不删、不轮转；`assistant-data` 不含它；用户随项目备份。
- 旧 home 根下的 `deliverables/` 是历史遗留；新作业写到会话 cwd。
- 用户可见文案叫“交付包 / 一次作业”，不叫 run bundle（内部术语）。

## 六、项目面

| 面 | Owner | 助手怎么碰 |
|---|---|---|
| `<workspace>/AGENTS.md` | 用户 | 读；建议追加；不静默覆盖（DSH 原生指令装载器从项目根读到会话 cwd） |
| `<workspace>/.dsh/skills/`、`.agents/skills/` | 用户 | 读；建议；不静默写；项目技能 rank 100/200 会遮蔽学到的 300，curate 的 `skill-shadowed` 解释 |

## 七、数据归属（速查）

| 事实 | 位置 | Owner | 备份 |
|---|---|---|---|
| 助手大脑（四房间/SOUL/MANUAL/AGENTS/技能/审计） | `<productHome>/assistant` | 插件 | `assistant-data` |
| 经营账本 | `<productHome>/assistant-operating` | 插件 | `assistant-data` |
| 产品设置（workspace 绑定） | `<productHome>/assistant-product/settings.json` | 插件/机器本地 | 不备份（换机重选） |
| 交付包 / run README | `<workspace>/deliverables/` | 用户 | 随项目 |
| 项目 `AGENTS.md` / 项目技能 | `<workspace>/` | 用户 | 随项目 |
| sessions / credentials / storages / workspace registry | `<productHome>/` | 宿主 | 另备整 home |

完整数据卡与卸载责任 = [`delivery.md`](delivery.md) §一。

## 八、失败模式

| 症状 | 先查 |
|---|---|
| `workspace directory does not exist` | 路径拼错/目录被移走；产品不会空建 |
| `a workspace inside the product home...` | 工作区不能放在产品 home 里 |
| `profile "assistant" exists but is not owned...` | 同名 profile 不是本产品；换 `--profile` 或移除 |
| 首页显示“上次的项目目录不在了” | 设置里的路径失效；用 `--workspace` 重绑 |
| 产品会话在别的 profile 打开报 `agent-preset/not-found` | 从产品入口打开；该 profile 没有 `assistant` preset |
| headless 多一条 `assistant-product` pending | headless profile patch 未加 `disabled: true` |
| `the profile dump has no assistant-product row` | 包旧/未 build；重装当前 tarball |

## 九、边界

- 产品 home 是**数据边界**；profile 仍不是租户，同一 home 下 profile 共用数据。
- 大脑仍跟人走（home 单例），**不按工作区分区**；per-workspace 大脑是另立决定（见 `_backlog` 的触发）。
- 不打包 DSH 运行时/Electron；不做非技术用户的安装器/签名/离线包（O5 的下一步）。
- 不复制会话日志进工作区；不替用户删项目文件；不做多租户。
