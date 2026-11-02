# 发行版与发布宪章（当前合同）

> 本文件拥有：**术语与判据、六轴 owner、发布物形态、渠道、产物合同、兼容范围、版本与标签、生命周期十段索引、门禁、禁则与变更触发**。
> 操作步骤 = [`dev.md`](dev.md) §九；数据边界与卸载承诺 = [`delivery.md`](delivery.md)；安装/启动/工作区 = [`product.md`](product.md)；
> 测试证据 = [`testing.md`](testing.md)。宪章只写常设规则，不写进度、命令流水账或第二张证据表。

## 〇、术语与判据

**发布物（release artifact）≠ 发行版（distribution）。** 发布物是单个可下载产物（npm 包、tarball、安装器）；
发行版是把这些产物连同运行时来源、profile 归属、app surface、home 策略与生命周期一起承诺出去的那一份。

**三个对象，三种种类**（不是三个级别）：plugin 贡献 service/event/effect；bundle 是 rows 及其挂载代码的分发格式
（声明 `dsh.bundle.patch`）；profile 是 Harness home 里的具名组装（有序 bundle + 自己的 `cordis.patch.yml`）。
**profile 不是发布物，也不是隔离边界。**

本仓交付的发行版 = **一个 bundle**（`dsh-smart-assistant`）＋ **一份安装手册** ＋ **一个可选安装器**（`_dist/bootstrap.mjs`）
＋ **一个市场索引**（发现层）＋ **一种 custom profile 的建法**。运行入口始终是 `dsh --profile <name>`。

**profile 归属**（DSH 三种控制态，控制权依次收紧）：

| 归属 | 本仓 | 发行方能改 | 用户能改 |
|---|---|---|---|
| shipped template（`web`/`headless`/…） | 不用（只能建议） | 不能拥有 | 可整体重置 |
| **custom profile**（`--from-default-profile web`） | **`assistant` 属于这一种** | bundle 顺序与默认 patch | 覆盖 patch、增删 bundle、重置 |
| application-owned（Desktop 的 `desktop`） | 不涉及 | 应用独占 | 不经 CLI profile lookup |

**特殊之处在四层，不在 profile。** 剖面只是"组合边界 + 用户层"；让这个组合像产品的是：

1. **bundle patch**（`cordis.patch.yml`）：组合行、`preset-assistant` 行、默认值、两条禁用行；
2. **preset `assistant`**：模型可见面（工具、常驻段落、策展技能、学到的技能 provider）；
3. **client 插件**：`main` 槽里的经营桌面与首屏门——第一屏由发行版回答，不靠 profile；
4. **入口行 `assistant-product`**：工作区绑定、路由与 onboarding 状态。

所以判断标准是：**如果"必须有专用 profile 才像产品"，说明 bundle 里缺默认值，那是形态错误。**

**判据两句话**：**完整** = 六轴都有明确 owner，没有一格写"默认应该有"；**可控** = 改任一条不用 fork DSH。

### 术语表

| 用法 | 词 |
|---|---|
| 保留 | bundle、custom profile、preset、app surface、发行版、发布物、入口行（`assistant-product`）、专用 home、安装器 |
| 退役 | 产品 profile、产品 bundle、产品型插件、产品行、产品门、产品安装器、产品模式、插件即产品 <!-- term-policy: 退役词登记行，门禁跳过 --> |
| `product` 的合法用法 | ① 引述 DSH 时指整台运行中的 dsh；② 指这份业务（P1–P3、产品定位、产品口味）。**不修饰任何交付对象。** |

代码身份（`assistant-product`、`productHome`、`src/host/product/`）是身份名，不随说法改名；改它按
[`identity.md`](identity.md) 的代价表走。

## 一、六轴 owner

| 轴 | 本仓定法 | DSH 机制 | 读回方式 | owner |
|---|---|---|---|---|
| **运行时** | 用户自带的 `dsh`（npm 全局 / Desktop 内置 / 源码树）；floor = `engines.dsh` + `engines.node` + `engines.pnpm`；不打包运行时 | 写依赖前按 `engines.dsh`（无则 peer）拒绝 | `dsh --version`；安装失败信息 | 本节；§五；[`dev.md`](dev.md) §一 |
| **profile** | **custom profile** `assistant`，非 shipped；安装器或用户 `--from-default-profile web` 建；发行方拥有 bundle 顺序与默认 patch | `--from-default-profile` 只限首次（破坏性重置）；`dsh plugin` 对自定义名只装 base | `$DSH_HOME/profiles/assistant/package.json` 的 `dsh.profile.bundles` | 本节；[`product.md`](product.md) §二 |
| **patch 层** | 默认值进 bundle patch；用户设置写 profile patch；不写 home patch | bundle → profile → home → `--patch`，后层**整份替换** `config`；app 参数只有行保留 `!!js` 才压过 config | `dsh --profile assistant --dump-config`；`skippedBundles` | 本节；[`product.md`](product.md) §十 |
| **app surface** | **web**（client 插件 + web-only 行）；headless/SDK/ACP 要显式禁用入口行 | profile 决定起哪个 surface | 启动日志 `dsh web: <url>` | 本节；[`product.md`](product.md) §四 |
| **home 与数据** | 专用 home 是部署选项（默认 `~/.dsh-smart-assistant`）；插件两目录 + 宿主面；卸载只回收包与 patch 层 | Workspace registry、Session log、`header.cwd`、storage domain | 数据卡逐行 | [`delivery.md`](delivery.md) §一 |
| **生命周期** | Plugins 页默认；CLI 仅 web 自动化；安装器仅 shell/自托管；无命令级回滚 | Plugins 页 / `dsh plugin`；成员变化要重启 | 安装三态 + 卸载后文件 | 本节 §七；§三 |

## 二、发布物形态

- **只发布 bundle。** `package.json` 的 `dsh.bundle.patch` 是作者发布物；profile 是用户侧组合，不是发布物。
- **应用仍由 `dsh --profile` 启动。** 安装器（`_dist/bootstrap.mjs`，**不在包里**）只做四件事：解析 home、确保
  `assistant` profile 存在（不存在才从 web 模板建）、装 tarball、起 `dsh --profile assistant`；它不写 profile patch、
  不写工作区绑定、不新增 app bin。native 路径 = 建 profile → Plugins 页/CLI 装 → `dsh --profile assistant`；
  Desktop 用 Desktop 的 Plugins 页。
- 包贡献的 preset、client、bundled skill、工具与段落都在 bundle 层声明；不得把 profile 选择、凭据或用户默认写进包。

## 三、渠道与安装入口

- **主渠道 = npm registry（包名 `dsh-smart-assistant`）**；`dsh plugin add <spec>` 与 Plugins 页按名字安装，
  市场索引只是**发现层**（见 §三之二）。**发布动作由本人执行**——agent 无 registry 凭证；`private` 必须缺省，
  它会让 `npm publish` 以 `EPRIVATE` 拒绝，而 `--dry-run` 不经过那条分支（假绿）。
- **离线/自托管渠道 = 手工 tarball ＋ `export-dist` 生成的安装手册**（同一份字节，可控交付）。
- 包是预构建产物：`lib/`、`client` bundle、`bin/`、`presets/`、`seeds/`、`locale/`、`icon.svg`、
  `cordis.patch.yml`、`LICENSE`、`README` 必须随包；**sourcemap 不进包**（源码不随包，map 只剩泄漏价值）。
- **默认部署 = 专用 profile + 安装器**。理由是我们的默认值带产品口味（禁右栏终端、关轨迹页、`locale: zh`、
  会话视图默认），装进别人既有的 web profile 就是改他的组合。**但 bundle 不假设 profile 名**：装进任意 web profile
  都能工作（`product-native-smoke` 证明），这是健壮性，不是推荐路径。
- **安装入口按面分工**：Plugins 页（web 与 Desktop 同一句，装的是**当前 profile**，不创建 profile）；
  CLI `dsh plugin --profile <p> add`（仅 web 自动化；**先建 profile**——自定义名上 `dsh plugin` 只装 base，
  没有 web-app 就起不了 Web）；Desktop 只用 Desktop 的 Plugins 页；安装器仅 shell/自托管。
- 换渠道（市场、Desktop 壳）不是"顺手加一步"，而是新提案：同 diff 更新本宪章、安装路径、兼容声明和真实安装 smoke。

### 三之二、市场索引（发现层）

- 产物 = `_dist/market/index.json` ＋ 图标，由**官方 generator** 生成：输入一行包名，读 npm registry，
  每个可安装版本必须已发布且声明 `dsh.bundle`。所以顺序锁死：**先 npm 发布，再生成索引**。
- 索引是发现层不是分发层：DSH 出厂不配任何索引，用户要在 Discover 里自己加 URL；自定义市场 bundle
  （`@deepseek-ai/dsh-experimental-plugin-market-bundle`）出厂关着。
- 索引里的一切都是**声明**：`name`/`version`/`engines.dsh` 必须与包 manifest 一致、`publishTimestamp` 取
  registry 发布时间；生成后必须过 `parseMarketIndex`——这条校验在 `pnpm market` 里，不在 `export-dist`。

## 四、产物合同

- **自包含**：发布物不引用仓库内其他目录、`vendor/`、workspace 协议或 sibling 包；`pnpm verify` 与 `pnpm release-smoke` 守这条。
- **元数据**：`engines.dsh`、`engines.node`、`repository`、`license`、`description`、`icon`、`keywords`、
  `locale/{en,zh}.json` 的 `meta.title/description`、`dsh.bundle.patch` 必须与实际一致。
- **README 保持 DSH 的七节形**：装什么/安装/验证/配置/升级/卸载与数据/排障。架构与实现说明不进 README
  （它们住 [`architecture.md`](architecture.md) 与生成物 [`package-catalog.md`](package-catalog.md)）。
- **安装手册保持十段形**：是什么/前置/选运行时/安装/首启/验证/配置/升级/卸载/排错，另加安全。
- 形状判据在 `scripts/release/publish-shape.mjs`：`export-dist` 对真实产物逐条判（`private` 缺省、bundle 补丁、
  `engines.dsh`、图标与描述、locale 完整、README 七节、手册十段、包内无源码载荷），不靠人记。
- **不含用户数据**：不写 `assistant/`、`assistant-operating/`、sessions、profiles、storages、deliverables、`.env`、credentials、宿主绝对路径或符号链接。`handoff-scan` 与 `export-dist` 对真实 tarball 跑扫描，失败即不可发布。
- 发布物以 `pnpm pack` 的真实字节为准；链接安装/source 直跑不能替代 tarball 安装。dev 侧的差异表与开发环的 tarball 通道 = [`dev.md`](dev.md) §十。
- **校验和**：`export-dist` 同时产出 tarball 与安装器的 `.sha256`；离线交付按校验和核对。

## 五、兼容

- **`engines.dsh` 是唯一安装门**；peer 范围只在没有 `engines.dsh` 时兜底。共享 DSH 包始终 peer + dev 双写。`dsh.compatibility.dshReleases` 不在本 pin 的 reader 里（`plugin-compatibility.ts` 已核）；升级到读取该字段的 DSH 时再补，不写假声明。
- 范围是**宽 minor、窄 major**：当前 `>=0.2.1-rc.2 <0.3.0-0`。未来 `0.2.x` 自动放行；`0.3.x`（含 `0.3.0-rc`）需要重新验证并发新版本。
- **不精确钉死一个小版本。** 下界只写真实跑过安装/启动/核心工具的最低版本；未跑过的更老版本不得靠“范围看起来宽”宣称支持。
- 上界写 `<0.3.0-0` 而不是 `<0.3.0`：预发布参与匹配，后者会放进 `0.3.0-rc.1`。
- **`engines.pnpm` 是 profile 布局的前置**：当前 `>=10.6.0`。pnpm 9/10.4 直接以 `ERR_PNPM_ADDING_TO_ROOT` 拒绝安装；10.5 能装但会忽略 profile `pnpm-workspace.yaml` 的 `nodeLinker`/`autoInstallPeers`。实测矩阵：9.15.9 与 10.4.0 拒绝，10.6.0 / 11.28.5 / 12.15.0 干净 home 安装 + `preset-assistant` 组合通过。命令 = `pnpm pnpm-matrix -- --pnpm <v> --expect install|reject`（需要 Corepack 联网）。
- 历史 typecheck 台账在 repo-only [`release-verification.json`](../packages/dsh-smart-assistant/release-verification.json)，不随包发布，也不是当前支持承诺。真实最小/最大矩阵未跑时，结论写“未跑”，不写“已验证”。
- **当前实测矩阵**：`0.2.1-rc.2` 与 `0.2.1-rc.3` 干净 home 安装 + `preset-assistant` 组合通过（rc.3 另跑过标准 Web boot 与 preset UI）；`0.2.0-rc.2` 拒绝安装（该版本按 peer 回退诊断，未写入 profile）。`0.3.x` **尚未发布**（npm 与 vendor 都没有 0.3 CLI），所以没有可跑的真实矩阵；范围边界测试明确拒绝 `0.3.0-alpha/rc/release`。等 0.3 发布后再用 `compat-matrix` 跑，不提前放宽。命令 = `pnpm compat-matrix -- --dsh <path> --version <v> --expect install|reject`；目标 CLI 可用 `npm install --prefix .tmp/dsh-<version> @deepseek-ai/dsh@<version>` 取得（`.tmp` 内，不入库）。
- **Node 实测**：本轮发布矩阵跑在 22.23.1（macOS arm64）；`engines.node` 的 `>=24` 分支沿用 DSH 的声明，本仓尚未在 Node 24 上跑安装矩阵。
- 版本豁免是用户的显式逃生门，不是作者的支持策略。

## 六、版本与标签

- 两处 manifest（根工作区 + 插件包）的 `version` 同步；标签名逐字等于该提交里的包版本，annotated，不带 `v` 前缀。
- 顺序固定：bump → `pnpm export-dist` → `pnpm verify` + 发布 smoke → commit → tag → push。操作细节只住在 [`dev.md`](dev.md) §九。
- **已推送的 tag 不移动。** 发错版本就 bump 新 patch；不改历史 tag，不用 `-f` 重推。
- tag 必须指向实际包含该版本 manifest 和导出产物的提交；`release:` 门禁与手册 freshness 必须同时绿。

## 七、生命周期十段（索引，不是展开）

| 阶段 | 本仓的做法 | owner |
|---|---|---|
| 打包 | 只发 bundle；patch 指一份；预构建、无 sourcemap；元数据与 locale 齐 | §四；`publish-shape.mjs` |
| 发布 | npm 主渠道；tarball 离线；市场索引只做发现；产出 checksum | §三；[`dev.md`](dev.md) §九 |
| 安装 | Plugins 页默认；CLI 仅 web 自动化且先建 profile；Desktop 应用内；安装器仅 shell/自托管 | §三；[`product.md`](product.md) §二 |
| 初始化 | profile 首建由 DSH `initProfile`；不自造"首启"标记 | [`product.md`](product.md) §2.2 |
| 特殊初始化 | 一次性动作自己保证幂等；凭据必须可判定；不在安装时静默改数据 | [`delivery.md`](delivery.md) §三 |
| 配置 | 默认值进 bundle patch；可变项做 Config（`.volatile()` 才上设置页）；用户覆盖写 profile patch | §一 patch 轴；[`product.md`](product.md) §三 |
| 启动 | named profile；不做第二 launcher；安装器最多建 profile、装包、exec | §二 |
| 更新 | 卸载再安装（或 add 新版本）；成员变化要重启；**没有命令级回滚**，回退 = 重装旧版本 | README 升级；§八 |
| 卸载 | 只回收包与 patch 层；数据一律留下并文档化位置 | [`delivery.md`](delivery.md) §一 |
| 文档 | README 七节 + 手册十段，与发布物同版本 | §四 |

## 八、门禁

门禁覆盖与“能证明什么”的唯一表主是 [`testing.md`](testing.md)。发布前至少：

- `pnpm verify`（结构/身份/链接/兼容声明/标签/退役词/骨架）；
- `pnpm release-smoke`（真实 tarball、干净 home、安装、组合、零写入；无 key 的 live turn = BLOCKED，exit 2）；
- `pnpm upgrade-smoke`（升级/remove 的数据边界与重装）；
- `pnpm install-resilience-smoke`（损坏 tarball 被拒、profile 不残留、有效 tarball 重试成功）；
- `pnpm bootstrap-guards-smoke`（独立启动的坏输入：profile 穿越/保留名/缺旧 pnpm/npm 在创建 home 前拒绝）；
- `pnpm pnpm-matrix -- --pnpm <v> --expect install|reject`（发布物/依赖变化时至少覆盖 10.6 下界与当前开发 pnpm；需要 Corepack 联网）；
- `pnpm web-install-smoke`（标准 web profile：干净 home 安装 → preflight → client boot/preset UI；可选 `--upgrade-tarball` 覆盖运行中升级 → 重启 → 复验；无 Chrome = BLOCKED，exit 2）；
- `pnpm standalone-smoke`（无 `.git` 目录、隔离 home、preflight、client 真 boot/preset UI、stop/restart、搬移 home；安装器按发布形态在包外运行；无 Chrome = BLOCKED，exit 2）；
- `pnpm product-smoke`（安装器：包外安装器 + `--package`、profile/装包、`--workspace` 只设 env、profile Config、工作区登记、in-process 会话 cwd、外来 profile/缺工作区拒绝、stop）；
- `pnpm product-native-smoke`（无安装器：web 模板建 `assistant` profile → `dsh plugin add` → 真 boot → GET `not-configured`/onboarding → POST → 登记 + Config + 会话 cwd）；
- `pnpm prompt-smoke`（无 key 回放 one-shot，断言四个 prompt 段落与六个工具进入请求）；
- `pnpm compat-matrix -- --dsh <path> --version <v> --expect install|reject`（真实 DSH CLI 的安装/拒绝矩阵；干净 home，不调模型）；
- `pnpm agent-preset-ui '<URL>'`（Web 选择，人工探针；不冒充自动门禁）。

未实际跑过的检查不得进入“绿”的结论；被阻断的检查报 `BLOCKED` 并 exit 2，不打印 `passed`，也不并入绿名单。

## 九、禁则

- 不把用户数据、凭据、sessions、profiles、宿主路径或符号链接放进发布物。
- 不打包 DSH 运行时、不新增绕过 `dsh --profile` 的应用入口；部署包装（`bootstrap.mjs`）不属于应用入口。
- **部署默认由 bundle patch 声明；不覆盖用户已选的 preset**（`selectedDefault` 优先）。安装器不写 profile patch。
- 不精确 pin DSH 小版本，不把历史台账当当前支持，不用版本豁免当兼容策略。
- 不自动导入 seeds、不手写/篡改用户 profile manifest。
- 不修改 `vendor/`；升级只走 `pnpm sync-dsh`。
- 不在未跑真实安装/生命周期 smoke 时声称“已发布/已验证”。

## 十、变更触发

以下每一项都必须重新提案、补矩阵/测试并更新本宪章，不得静默扩张：

- Desktop 壳或自建桌面壳；
- 支持 DSH `0.3.x` 或 `1.x`；
- 打包 DSH 运行时、新增绕过 `dsh --profile` 的应用入口，或多租户；
- 把 working folder 或账本迁到 `ctx.storageDomain`；
- 增加英文 locale 或面向非中文用户的 UI；
- 数据格式大版本迁移或跨机器共享。

## 十一、谁能改

本宪章由 [`docs/AGENTS.md`](AGENTS.md) 的 owner 表登记。修改它必须与代码/合同/测试同 diff；只改一句口号、不补对应证据，等于没改。
