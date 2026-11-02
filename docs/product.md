# 发行形态与工作区（当前合同）

> 本文件拥有：**发行形态（custom profile）、安装/启动、用户工作区绑定、一次作业的交付包与项目面**的合同。
> working folder 的四房间 = [`home.md`](home.md)；经营账本 = [`operating.md`](operating.md)；数据卡与备份 = [`delivery.md`](delivery.md)；
> 发布宪章 = [`release.md`](release.md)；身份名 = [`identity.md`](identity.md)。本文件只写发行形态这一层的合同，不复制四房间语义。

## 一、发行形态是什么

发行形态 = 一个 **bundle** ＋ 一种 **custom profile** 的建法；profile 是组合边界，不是身份来源，也不是启动器或另一个 home：

```text
① 插件包（只读、随版本）      bundle patch / preset / skills / seeds / locale / client
② 专用 custom profile（用户侧）assistant：web 模板 + 本 bundle + 默认 preset + 用户 Config
③ 用户 workspace（用户项目）   项目文件 + deliverables/<date>-<slug>/（交付包）
④ 宿主 home（DSH 运行态）      sessions / credentials / storages / workspace registry / 专用 home（可选）
```

- **① 插件内容在包里**：静态内容随包，不写进用户项目，也不写进 profile。
- **② 身份在 bundle**：`assistant` 是稳定、非 shipped 的 custom profile；bundle 的 patch 决定组合与默认值；用户设置写 profile patch。profile 被重置后装一次即恢复身份——身份不在 profile 里。
- **③ 生产状态与产物在 workspace**：一次作业的交付包、README、交付物、`present` 都落在用户项目。
- **④ 助手大脑在 home**：四房间/账本跟人走（home 单例），不按 workspace 分区；专用 home 是 ④ 的部署选项，不是 ② 的要求。

**不发布 profile 目录，也不发布第二个可执行文件。** profile 是用户机器上的组合；安装器/一次性 CLI 只负责“生成 profile + 装 bundle”，运行时仍由 `dsh --profile assistant` 提供。

## 二、安装与启动

### 2.1 四条路径

| 路径 | 谁 | 怎么做 | home | 工作区绑定 |
|---|---|---|---|---|
| **A. Plugins 页（DSH 推荐）** | web/Desktop 用户 | 启动 profile → **Plugins** → **Add plugin** → **Install a third-party plugin** → 填 tarball 绝对路径/包名/Git/本地目录 → 启用 → 重启；dedicated `assistant` profile 先建/启动它，再在页面装 | 当前 `DSH_HOME` / Desktop profile | 首启 onboarding 写 profile Config |
| **B. CLI**（自动化 / 非 GUI surface） | 自动化/本地 tarball/headless·SDK·ACP | 先建 profile（`--from-default-profile web --dump-config`，对自定义名字 `dsh plugin` 只建 base-only），再 `dsh plugin --profile assistant add <tgz>` → 重启 | 当前 `DSH_HOME` | 同上 |
| **C. 安装器**（可选，独立发布资产，**不在包里**） | 不熟 DSH/离线 | `node bootstrap.mjs --package <解开的包> --workspace <目录>`；之后 `--product` 启动 | 默认 `~/.dsh-smart-assistant`（可 `--home`） | 首启 `ASSISTANT_WORKSPACE` + 入口行写 profile Config |
| **D. Desktop** | Desktop 用户 | Desktop 的 Plugins 页同上；CLI 不碰 `desktop` | Desktop 的 `desktop` profile | 首启 onboarding（若客户端可用）；不承诺独立 profile/home |

**Plugins 页是 DSH 推荐入口**：它没有 profile 参数，装的是“当前 profile”，**不创建** profile。要用 dedicated `assistant` profile，先建并启动它，再在页面装、启用、重启。CLI 面向 `dsh web` 自动化，headless/SDK/ACP 没有 Plugins 页，也用 CLI 显式 profile；Desktop 只用 Desktop 的 Plugins 页；安装器是 shell/自托管路径，不是 DSH 的默认安装方式。

### 2.2 安装器（可选，独立资产 `bootstrap.mjs`，不在包里）

发布物里它是 `_dist/bootstrap.mjs` ＋ `.sha256`，与 tarball 同目录；`--package` 指向解开的包。

它是 shell/自托管路径，不是 DSH 的默认安装方式。

```sh
node bootstrap.mjs --package <解开的包> --workspace <dir> [--home <dir>] [--profile assistant] [--dsh <cmd>] [--offline]
node bootstrap.mjs --package <解开的包> --product [--home <dir>]
node bootstrap.mjs --package <解开的包> --stop [--home <dir>] [--product]
node bootstrap.mjs --no-start ...
```

- **profile**：不存在才从 shipped web 模板创建；已有 `assistant` profile 不重置；外来同名 profile 拒绝；缺 web-app 给明确错误。
- **安装**：`npm pack`（安装器；发布物本身由 `pnpm pack` 产出）→ `dsh plugin --profile assistant add <tarball>`；版本对账；同版本跳过；失败保留旧装。不手写 `dsh.profile.bundles`。
- **默认 preset**：`agent-preset-registry.default: assistant` 由 bundle patch 携带（整行 config 替换）；安装器不写 profile patch，装完用 `--dump-config` 校验组合。
- **工作区**：`--workspace` 只做路径预检并给子进程设一次性 `ASSISTANT_WORKSPACE`；**不写**工作区绑定文件、不写 home patch。`--product` 不要求工作区，首启由入口行/客户端决定。
- **启动**：`dsh --profile assistant --port 0 --no-open`；cwd 为工作区（有 `--workspace` 时）或专用 home；token URL 打码；`--stop` 收进程组。
- **standalone**：保留为 dev/demo 模式，不是产品主路径。

### 2.3 版本与安装状态

- 本 pin 的 DSH 安装门只读 `engines.dsh`/peer（`vendor/dsh/packages/boot/app-boot/src/plugin-compatibility.ts`）；不兼容在写入前拒绝。exemption 只对 exact package + exact dsh version，是风险接受，不是兼容证明。
- “装成功”有三个状态：pnpm exit 0 → dependency 写入 → `dsh.profile.bundles` 含该 bundle；只有第三个让功能存在。CLI 装完宿主不知道，必须重启 profile；应用内装可能返回 `restart-required`。
- 升级先升版本号再打包；同名同版本重装不会刷新。

## 三、工作区解析

入口行 `assistant-product` 是唯一的工作区 owner：

- **Config**：`workspaceDir?: string`（volatile；profile patch 可写）；`onboarding?: boolean`（部署默认，默认 true）。
- **优先级**：`ASSISTANT_WORKSPACE`（一次性 env）> effective Config `workspaceDir`（profile/home/CLI patch 合成）> `not-configured`。
- **持久化**：env/客户端选择成功登记后，入口行调用 `ctx.settings.update('assistant-product', { workspaceDir })` 写当前 profile patch；没有 settings 服务时状态 `invalid` + `error: settings-unavailable`，不静默丢。
- **不写**：工作区绑定文件、home patch、其他 profile。
- **校验**：绝对、存在、是目录、可读写；拒绝 `/`、用户 home 根、专用 home 内、包目录内（解析符号链接后）；路径缺失**不空建**。
- **缺失/非法**：路由返回 `workspace-missing` / `invalid`；客户端显示恢复面，可重选；不崩。

专用 home 是**部署选项**：安装器默认 `~/.dsh-smart-assistant`；native 路径用当前 `DSH_HOME`；要隔离就显式设 `DSH_HOME`。`--home ~/.dsh` 是用户显式共享日用 home，安装器打警告后继续。

## 四、会话与工作区

- **登记**：Host 行 `assistant-product`（web-only）在 boot 时用 `ctx.workspaceRegistry.create()` 登记工作区；幂等；按 canonical path 去重。
- **会话**：客户端用 `uiWorkspace.startSession(workspaceId, { agentPreset: 'assistant' })` 开会话并选中；`header.cwd` = 工作区，sandbox 可写根 = 工作区。
- **换项目**：客户端用 DSH 目录选择器选新目录 → POST 入口路由 → 校验/登记/写 Config；旧 workspace registration 与会话不删；当前会话不迁移，新会话用新工作区。
- **首启**：`not-configured` 且 `onboarding` 未关时，桌面显示“选一个项目目录”；**未绑定时会话也走同一道门**——每个 Session 的 composer 被 `ctx.conversation.blocks` 禁用，dock 给出原因与选择按钮。没有“稍后”：它会解锁桌面的第二条输入车道。不阻塞 Host boot；不依赖 `welcome-notice`/`settings.onboarding`。
- **首屏**：第一次打开是桌面（`main` 的「今天」）；之后按“上次主视图”恢复——偏好=会话就不选面板（平台自己恢复 Session），偏好=桌面才选桌面。偏好住浏览器 `dsha:main-view`，只记视图、不记业务数据。
- **没有入口行**：手工装包但没有入口行/旧 profile 时，客户端门透明，行为与普通 DSH 一致。
- **跨 profile**：同一 home 下其他 profile 打开产品会话时，`assistant` preset 不在组合里，失败码 = `agent-preset/not-found`；文档要求从专用 profile 打开。
- **headless**：五个 web-only 行（`assistant-product`、`assistant-desk-projection`、`assistant-ui-mode`、`assistant-rooms`、`assistant-viki`）在 bundle patch 里用 `disabled: !!js "!ctx.get('connection')"` 自禁用；headless 组合不需要手写 patch。profile 层显式 `disabled` 是双保险。

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
- 用户可见文案叫“交付包 / 一次作业”，不叫 run bundle（内部术语）。

## 六、项目面

| 面 | Owner | 助手怎么碰 |
|---|---|---|
| `<workspace>/AGENTS.md` | 用户 | 读；建议追加；不静默覆盖（DSH 原生指令装载器从项目根读到会话 cwd） |
| `<workspace>/.dsh/skills/`、`.agents/skills/` | 用户 | 读；建议；不静默写；项目技能 rank 100/200 会遮蔽学到的 300，curate 的 `skill-shadowed` 解释 |

## 七、数据归属

数据卡（每个面的 owner、位置、寿命、备份、卸载去向）的唯一家 = [`delivery.md`](delivery.md) §一；本文件不维护第二张表。
一句话分工：插件拥有 `assistant` 与 `assistant-operating` 两个目录；宿主拥有 sessions/credentials/settings/storages；
用户拥有交付包与项目文件。

## 八、失败模式

| 症状 | 先查 |
|---|---|
| `workspace directory does not exist` | 路径拼错/目录被移走；产品不会空建 |
| `a workspace inside the product home...` | 工作区不能放在专用 home 里 |
| `profile "assistant" exists but is not owned...` | 同名 profile 不是本产品；换 `--profile` 或移除 |
| 首屏显示“上次的项目目录不在了” | Config 里的路径失效；在首屏重选 |
| 未绑定项目时 composer 被禁、dock 给出选择按钮 | 这是工作区门，不是输入故障；选项目目录后新会话落在项目里。`onboarding:false` 的部署/非产品场景保持透明 |
| 首屏显示“选一个项目目录”但没有选择器 | 当前组合没有 `remote.directoryPicker`；在 profile patch 设置 `assistant-product.workspaceDir` |
| 产品会话在别的 profile 打开报 `agent-preset/not-found` | 从专用 profile 打开；该 profile 没有 `assistant` preset |
| headless 仍看到 web-only 行 pending | bundle patch 的 self-disable 表达式未生效（旧包/被 profile 覆盖）；检查 `connection` 与 pin，profile 层可显式 `disabled: true` 双保险 |
| `the profile dump has no assistant-product row` | 包旧/未 build；重装当前 tarball |
| 装完“没生效” | CLI 装完宿主不知道；重启 profile；客户端模块变更刷新 |
| Desktop 装完界面没有 | 用了 `--profile web`/`--profile desktop` CLI；Desktop 只在 Plugins 页装 |

## 九、边界

- 专用 home（若使用）是**数据边界**；profile 仍不是租户，同一 home 下 profile 共用数据。
- 大脑仍跟人走（home 单例），**不按工作区分区**；per-workspace 大脑是另立决定（见 `_backlog` 的触发）。
- 不发布 profile 目录；不手写 `dsh.profile.bundles`；不做第二个 launcher/桌面壳。
- 不打包 DSH 运行时/Electron；不做非技术用户的 GUI 安装器/签名/离线包（O5 的下一步）；可选安装器（§2.2）是 shell/自托管路径。
- 不复制会话日志进工作区；不替用户删项目文件；不做多租户。
- Desktop 是同一 bundle 的另一条 profile 线；CLI 不能管理 `desktop`；真机矩阵另立。

## 十、vendor row 覆盖台账

本包 `cordis.patch.yml` 会改到 vendor 声明的行。**每一处都要有复核条件与退役条件**，因为
"bundle 在 roster ≠ patch 生效"：裸 id 找不到目标时只有一条 `entry not found` 警告，行不会出现。
台账是这份清单的唯一家；`pnpm verify` 的 `overrides` 门守"裸 id 覆盖必须在台账里"。

| 行 id | 我们改什么 | 为什么 | 复核条件（换 pin 时看） | 退役条件 |
|---|---|---|---|---|
| `agent-preset-registry` | `config.default: assistant`（**裸 id，整行 config 替换**） | 部署默认 preset 属于 bundle 默认值；装完即产品 | vendor 若给这行加字段，这里要一并写全（整行替换会丢） | 不退役（这是产品定义）；用户 `selectedDefault` 优先，卸载即回退 `standard` |
| `ui-chat` | `config.transcriptView: detailed`（**裸 id，整行配置替换**） | 本 pin 的**预构建 client bundle** 缺 `?? defaultMode` 兜底：全新 home 无存档时 `conversation.view` 崩 | 发布人口重新构建后有兜底就不再需要 | 发布人口自 rc.5 起已带兜底（`_backlog/_archive/research/261101-plugin-lifecycle` E 系列记录）；**抬 floor 到实测版本时退役**（2026-11-02 决议：抬 pin 单独做） |
| `locale` | `config.preference: zh`（**裸 id，整行配置替换**） | 目标用户是中文管理者，无偏好时首开随浏览器协商会落英文 | vendor 若改 locale 配置键名/层级 | 不退役（产品口味）；用户可在 Settings 改 |
| `session-query-sqlite` | `config.path` + `openAt: first-search`（**裸 id，整行配置替换**） | base 出厂 `never` + `:memory:`；本产品要"首次检索才建索引 + 持久" | base 行若改 config 形状或默认值 | base 出厂即带缓存路径默认时退役 |
| `tool-skill` | 同 id 重声明为 host 行（**裸 id，`disabled: false`**） | BUG-001：以 preset 行挂载时目录监听器在 one-shot 里不发布 | vendor 若修好 preset 行的目录发布 | 上游修好后退役（条件写在 BUG-001 归档） |
| `ui-sidebar-terminal` | `disabled: true`（**裸 id**） | 管理岗用户不用开发工具，占注意力 | vendor 若把终端行改名/拆行 | 不退役（产品选择）；终端 API 仍留给 headless |
| `ui-trajectory` | `disabled: true`（**裸 id**） | 主 Tab 每多一页就多一个注意力入口；管理者不看运行轨迹（2026-11-02 本人点名去掉） | vendor 若把轨迹页拆成 host 面的独立入口，或产品改要看轨迹 | 不退役（产品选择）；要看时在 profile patch 里覆盖回来即可 |

复核动作：`pnpm sync-dsh -- --tag <tag>` 之后逐行看这张表；`pnpm verify` 会红在没有台账条目的裸 id 覆盖上。
