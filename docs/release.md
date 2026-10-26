# 发布与发行宪章（当前合同）

> 本文件拥有：**什么可以发布、通过什么渠道、产物必须长什么样、版本与标签怎么定、哪些事永远不做**。
> 操作步骤 = [`dev.md`](dev.md) §九；数据边界 = [`delivery.md`](delivery.md)；测试证据 = [`testing.md`](testing.md)。
> 宪章只写常设规则，不写进度、命令流水账或第二张证据表。

## 一、发布物形态

- **只发布 bundle。** `package.json` 的 `dsh.bundle.patch` 是作者发布物；profile 是用户侧组合，不是发布物。
- **不在包里新增应用入口。** 不提供“起一个 DSH”的 bin 或独立 CLI；独立启动用 `bootstrap.mjs` 调已安装的 `dsh`，见 [`delivery.md`](delivery.md) §二。
- 包贡献的 preset、client、bundled skill、工具与段落都在 bundle 层声明；不得把 profile 选择、凭据或用户默认写进包。

## 二、渠道

- **当前唯一渠道 = 手工 tarball + `export-dist` 生成的安装手册。** 包保持 `private: true`，不发布到 npm、registry 或市场。
- tarball 是预构建产物：`lib/`、`client` bundle、`bin/`、`presets/`、`seeds/`、`cordis.patch.yml`、`bootstrap.mjs`、`LICENSE`、`README` 必须随包。
- 换渠道（npm、市场、Desktop 壳）不是“顺手加一步”，而是新提案：同 diff 更新本宪章、安装路径、兼容声明和真实安装 smoke。

## 三、产物合同

- **自包含**：发布物不引用仓库内其他目录、`vendor/`、workspace 协议或 sibling 包；`pnpm verify` 与 `pnpm release-smoke` 守这条。
- **元数据**：`engines.dsh`、`engines.node`、`repository`、`license`、`description`、`dsh.bundle.patch` 必须与实际一致；README 写 Install / What it contributes / Configuration / Data / Compatibility / Uninstall。
- **不含用户数据**：不写 `assistant/`、`assistant-operating/`、sessions、profiles、storages、deliverables、`.env`、credentials、宿主绝对路径或符号链接。`handoff-scan` 与 `export-dist` 对真实 tarball 跑扫描，失败即不可发布。
- 发布物以 `pnpm pack` 的真实字节为准；链接安装/source 直跑不能替代 tarball 安装。

## 四、兼容

- **`engines.dsh` 是唯一安装门**；peer 范围只在没有 `engines.dsh` 时兜底。共享 DSH 包始终 peer + dev 双写。
- 范围是**宽 minor、窄 major**：当前 `>=0.2.1-rc.2 <0.3.0-0`。未来 `0.2.x` 自动放行；`0.3.x`（含 `0.3.0-rc`）需要重新验证并发新版本。
- **不精确钉死一个小版本。** 下界只写真实跑过安装/启动/核心工具的最低版本；未跑过的更老版本不得靠“范围看起来宽”宣称支持。
- 上界写 `<0.3.0-0` 而不是 `<0.3.0`：预发布参与匹配，后者会放进 `0.3.0-rc.1`。
- 历史 typecheck 台账在 repo-only [`release-verification.json`](../packages/dsh-smart-assistant/release-verification.json)，不随包发布，也不是当前支持承诺。真实最小/最大矩阵未跑时，结论写“未跑”，不写“已验证”。
- **当前实测矩阵**：`0.2.1-rc.2` 与 `0.2.1-rc.3` 干净 home 安装 + `preset-assistant` 组合通过（rc.3 另跑过标准 Web boot 与 preset UI）；`0.2.0-rc.2` 拒绝安装（该版本按 peer 回退诊断，未写入 profile）。`0.3.x` **尚未发布**（npm 与 vendor 都没有 0.3 CLI），所以没有可跑的真实矩阵；范围边界测试明确拒绝 `0.3.0-alpha/rc/release`。等 0.3 发布后再用 `compat-matrix` 跑，不提前放宽。命令 = `pnpm compat-matrix -- --dsh <path> --version <v> --expect install|reject`；目标 CLI 可用 `npm install --prefix .tmp/dsh-<version> @deepseek-ai/dsh@<version>` 取得（`.tmp` 内，不入库）。
- 版本豁免是用户的显式逃生门，不是作者的支持策略。

## 五、版本与标签

- 两处 manifest（根工作区 + 插件包）的 `version` 同步；标签名逐字等于该提交里的包版本，annotated，不带 `v` 前缀。
- 顺序固定：bump → `pnpm export-dist` → `pnpm verify` + 发布 smoke → commit → tag → push。操作细节只住在 [`dev.md`](dev.md) §九。
- **已推送的 tag 不移动。** 发错版本就 bump 新 patch；不改历史 tag，不用 `-f` 重推。
- tag 必须指向实际包含该版本 manifest 和导出产物的提交；`release:` 门禁与手册 freshness 必须同时绿。

## 六、生命周期

- **安装不写用户数据**：`dsh plugin add` 只装包；不创建 working folder、不导入 seeds、不改默认 preset。
- **升级/卸载保留数据**：两个插件目录（`<dshHome>/assistant`、`<dshHome>/assistant-operating`）跨升级和 remove 保留；remove 后重装必须回到组合。
- 备份/恢复只走 `assistant-data`（两目录 + schema manifest）；sessions、credentials、settings、storages 另备整 home，绝不混进插件备份。
- 数据格式变更必须显式迁移或拒绝，不在安装时静默重写。

## 七、门禁

门禁覆盖与“能证明什么”的唯一表主是 [`testing.md`](testing.md)。发布前至少：

- `pnpm verify`（结构/身份/链接/兼容声明/标签）；
- `pnpm release-smoke`（真实 tarball、干净 home、安装、组合、零写入）；
- `pnpm upgrade-smoke`（升级/remove 的数据边界与重装）；
- `pnpm standalone-smoke`（无 `.git` 目录、隔离 home、preflight、client 真 boot/preset UI、stop/restart；无 Chrome 时明确 skip）；
- `pnpm prompt-smoke`（无 key 回放 one-shot，断言四个 prompt 段落与六个工具进入请求）；
- `pnpm compat-matrix -- --dsh <path> --version <v> --expect install|reject`（真实 DSH CLI 的安装/拒绝矩阵；干净 home，不调模型）；
- `pnpm agent-preset-ui '<URL>'`（Web 选择，人工探针；不冒充自动门禁）。

未实际跑过的检查不得进入“绿”的结论；被跳过的检查写明原因。

## 八、禁则

- 不把用户数据、凭据、sessions、profiles、宿主路径或符号链接放进发布物。
- 不新增包内 app bin/应用入口来绕过 DSH profile 启动。
- 不精确 pin DSH 小版本，不把历史台账当当前支持，不用版本豁免当兼容策略。
- 不自动导入 seeds、不自动改默认 preset、不手写/篡改用户 profile manifest。
- 不修改 `vendor/`；升级只走 `pnpm sync-dsh`。
- 不在未跑真实安装/生命周期 smoke 时声称“已发布/已验证”。

## 九、变更触发

以下每一项都必须重新提案、补矩阵/测试并更新本宪章，不得静默扩张：

- 转 npm / registry / 市场 / Desktop 壳；
- 支持 DSH `0.3.x` 或 `1.x`；
- 新增包内 app bin、独立应用入口或多租户；
- 把 working folder 或账本迁到 `ctx.storageDomain`；
- 增加英文 locale 或面向非中文用户的 UI；
- 数据格式大版本迁移或跨机器共享。

## 十、谁能改

本宪章由 [`docs/AGENTS.md`](AGENTS.md) 的 owner 表登记。修改它必须与代码/合同/测试同 diff；只改一句口号、不补对应证据，等于没改。
