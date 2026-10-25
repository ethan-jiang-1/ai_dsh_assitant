---
topic: 技术
intent: "为交付合同、数据边界、独立启动与出厂身份四张问题卡提供 DSH 平台事实和第三方插件先例。"
---

# DSH 插件交付事实：启动、兼容、preset、数据根

> 服务于 [分发合同](../../settled_issues/261025-distribution-contract.md)、[agent/数据边界](../../settled_issues/261025-agent-data-boundary.md)、[目录独立启动](../../settled_issues/261025-standalone-directory-start.md)、[出厂身份](../../settled_issues/261025-factory-identity-first-run.md)。
> 证据来自 pin `dsh-v0.2.1-rc.2` 的源码与文档；只做静态核读，未跑跨版本安装。待验证项在文末。

## 一、应用启动：只有 profile

- DSH 的常设规则：**只有 `dsh` profile 启动受支持的 Node 应用**；包内 `bin`、demo、SDK argv 都不能当应用启动器（[vendor/dsh/AGENTS.md](../../../../vendor/dsh/AGENTS.md)、[architecture.md](../../../../vendor/dsh/docs/architecture.md)）。
- 一个 bundle 的形态是 npm 包 + `dsh.bundle.patch`；安装进 profile 后由 `dsh plugin add` 管理（[publish.md](../../../../vendor/dsh/docs/user/develop/basic/publish.md)）。
- 官方“干净环境”路径就是 profile + 独立 home：`release-smoke` 在临时 `DSH_HOME` 里从模板建 profile、`dsh plugin add`、`--dump-config` 读组合（[release-smoke.mjs](../../../../scripts/release/release-smoke.mjs)）；dev 手册的隔离模型同形（[dev.md](../../../../docs/dev.md)）。
- `sdk-minimal` 也是“同一个 launcher 后面的独立 bundle”，不是包自带的可执行入口（[architecture.md](../../../../vendor/dsh/docs/architecture.md)）。

**对本仓的含义**：目录独立启动应做成“用已安装的 `dsh` 建/用一个隔离 profile 的引导脚本”，不是新增应用入口；`ov-doctor` 这类只读 doctor 不属于应用启动器。

## 二、兼容性：`engines.dsh`，缺省用 peers

- 官方规则：bundle 用 `engines.dsh` 声明支持的 DSH 版本；安装和 profile 启动会拒绝不满足的包；没有 `engines.dsh` 时改看 `@deepseek-ai/dsh*` peer 范围（[publish.md](../../../../vendor/dsh/docs/user/develop/basic/publish.md)、[app-boot README](../../../../vendor/dsh/packages/boot/app-boot/README.md)）。
- 本包当前**没有** `engines.dsh`，只有一个 `dsh.compatibility.dshReleases` 映射（[package.json](../../../../packages/dsh-smart-assistant/package.json)）。pin 住的 vendor 里没有读取这个映射的代码；真正生效的是 peer 范围（[package.json](../../../../packages/dsh-smart-assistant/package.json)）。
- 第三方先例：OpenViking 的 0.5.8 在 pin 换到 `0.2.1-rc.2` 后被兼容闸判为不兼容，**整 bundle 静默跳过**，第二记忆层失效；0.5.20 起把 peer 上限放宽到 `<1.0.0-0` 才恢复（[OpenViking README](../../../../vendor/thirdparty/openviking/README.md)）。它的 0.5.26 manifest 带 `engines.node`、peer 范围、`repository`、`license`，没有自定义兼容字段（[0.5.26 tgz](../../../../vendor/thirdparty/openviking/dsh-memory-plugin-0.5.26.tgz)）。

**对本仓的含义**：兼容声明必须机器可执行，失败必须可见；`dsh.compatibility` 表不能当唯一口径。

## 三、默认 preset：用户设置优先于部署默认

- `agent-preset-registry` 的 `selectedDefault` 是**用户设置**，新会话优先用它而不是部署的 `default`（[registry README](../../../../vendor/dsh/packages/preset/agent-preset-registry/README.md)）。
- Web 的官方选择面是 Settings / 新会话的 preset 卡组；已安装的自定义 preset 出现在 custom 组，用户可以选默认（[ui-agent-preset README](../../../../vendor/dsh/packages/client/ui-agent-preset/README.md)）。
- profile patch 里的 `agent-preset-registry.default` 是部署/自动化路径；headless 没有 UI，才需要它。安装器没有 post-install hook，也不应该替用户改默认。
- 本包手册目前只写了“手改 profile YAML”这一步（[安装手册](../../../../_dist/安装手册.md)）；这不等于 Web 用户没有 UI 路径。

**对本仓的含义**：Web 手册应先写 UI 选择；profile patch 作为 headless/自动化附录。是否在安装后直接是 assistant，取决于用户默认，不应由安装器静默覆盖。

## 四、数据根：一个 home

- `resolveDshHome` 的优先级是显式配置 > `$DSH_HOME` > `~/.dsh`；官方原则是“用户数据住一个根”，插件从 home 派生路径，展示时用 `~/.dsh` / `$DSH_HOME` 符号，不泄露机器绝对路径（[home-paths README](../../../../vendor/dsh/packages/util/home-paths/README.md)）。
- profiles、sessions、credentials、settings、storages 都是 home 级；preset 是组合，不是租户。官方没有“一个 home 多用户”的支持面。
- 本插件自己的两个持久化面是 `<home>/assistant` 与 `<home>/assistant-operating`（[home.md](../../../../docs/home.md)、[operating.md](../../../../docs/operating.md)）；sessions/credentials/settings 由宿主拥有。

**对本仓的含义**：“不同人”最自然的边界是不同 home；插件数据备份/交接只需覆盖自己两个目录，整 home 备份才覆盖宿主数据。

## 五、第三方包形状（可借的发布姿势）

- OpenViking 0.5.26 的 manifest：`engines.node`、peer 范围、`files` 白名单、`repository`、`license`、`publishConfig`，`dsh.bundle.patch` 指向 `cordis.patch.yml`；没有 postinstall（[0.5.26 tgz](../../../../vendor/thirdparty/openviking/dsh-memory-plugin-0.5.26.tgz)）。
- 它的分发形态是 npm tarball；用户用 `dsh plugin add <tgz>` 安装。官方文档同时支持 npm 与 tarball（[publish.md](../../../../vendor/dsh/docs/user/develop/basic/publish.md)）。

**对本仓的含义**：手工 tgz 是合法渠道；包元数据可以补齐，但不必为了“像正式发行”引入 registry。

## 待验证（不写成事实）

1. 干净 home 安装后，`assistant` 是否真的出现在 Web 的 custom preset 组、能否设为默认——需要真机 `pnpm shots --dom`/截图证据，不能只读 registry 合同推断。
2. 本包声明的旧 DSH 版本（0.1.5/0.1.7/0.2.0）是否真的能被当前 peer 范围放行；未实测前不写“支持”。
3. `dsh plugin add` 对同包新 tgz 的升级语义（覆盖/重装/需先 remove）——需要干净 home 实验。
4. 离线安装时唯一运行时依赖 `yaml` 的可获得性（registry/缓存/随包）——未测。
