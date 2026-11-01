---
status: 等人拍板
opened: 2026-11-02
---

# 推敲：dev 通道与用户安装路径对齐（同机制 + 有界差异）

> 立卡：2026-11-02 ｜ 状态：等人拍板 ｜ 类型：Task ｜ 可关闭：否 ｜ 结论：方案 B 技术面已落地（2026-11-02），待你验收 dev 手感

## 外部结果三要素

- **触发条件：** 本人 2026-11-02 点名"推动落地"（授权记录 = 本卡状态行）。
- **用户看到或得到什么：** dev 快环不再手写 profile 用户层；开发环有一条 `pnpm install-parity` 真走用户
  的 tarball 安装断点；dev 与用户安装路径的差异有唯一登记表（[docs/dev.md](../../docs/dev.md) §十），
  表外差异由 `dev-parity` 门禁点名；安装器"写默认 preset"的旧口径三处归一。
- **完成条件：** 验收 1–6 有真跑证据（见「验证进展」）；parity 表与门禁在场；`pnpm start` 的 dev 实例
  在真实 boot 上绿；结论去向 = implemented note。

**借鉴来源：** 隔壁 `ai_dsh_deep_research` 仓同日立的 dev-product-path-parity 卡（跨仓引物，不随本仓入库）。
它的判据是"**同机制 + 有界差异**"：dev 里验过的机制就是用户装上去会经过的机制；差异只许落在调试
必需项，登记成表，表外差异 = 门禁红。

**我们这边的相似度：有，但不是同一种成因。**

- 对方：dev 已经走 tarball + `dsh plugin add`，只差 5 处（profile 身份、团队层版本、profile 用户层
  写入者、重建语义、runtime）没登记。
- 我们：dev 快环**根本不走用户安装路径**——`dsh plugin add <repo 裸路径>` 是 pnpm link 语义，运行时是
  vendor 源码；而用户路径是 tarball + 已安装 `dsh`。
- 但我们的产品路径不是没人验：仓里有**八条真安装/启动 smoke**（release / upgrade / install-resilience /
  bootstrap-guards / web-install / standalone / product / product-native）。问题不是"产品没验"，是
  **开发环不经过它、差异没登记、证据只在发布清单里**。

所以能借的是**形状**（表 + 门禁 + 真 tarball 通道 + profile 写入者纪律），不能借它的**结论**——照抄
"安装源 = 同形"会写出一张假表。

**意图：**

1. **验证可迁移**：dev 侧的绿要能推出"用户装这个包会经过的断点是通的"；推不出的断点必须点名谁在验。
2. **差异有界且显性**：link、vendor 源码、隔离 home、热重建允许存在，但要登记成表；表外新增差异 = 门禁红。
3. **不为对齐牺牲快环**：`pnpm start` 的热环（改 src → `pnpm build` → 新会话生效）保留；不把 dev 改成
   每次 build 都要重装 tarball。

**期望结果：** `docs/dev.md` 有一张可对账的 parity 表（机制点 / 用户安装路径 / dev 快环 / 判定 / 证据）；
有一条真走 tarball 的常设通道，能在开发环里抓住"包装不上 / 组合缺行 / 依赖没声明"这类只在 tarball 上
暴露的回归；dev 快环的 profile 写入者与组合漂移可见、可对账；表外差异由 `pnpm verify` 点名。

## 当前情况

> 以下是立卡时（2026-11-02 早）的现状；落地后的现况以「切片台账」与「验证进展」为准，旧事实保留作推敲记录。

### 已经同形的（不要重做）

| 机制点 | 两边同在哪 |
|---|---|
| profile 创建 | `--from-default-profile web`：`dev/env/setup.sh:51` 与 `packages/dsh-smart-assistant/bootstrap.mjs:411` |
| roster / bundles 写入者 | 都是 `dsh plugin add`；都不手写 `dsh.profile.bundles`（安装纪律在 [docs/discipline.md](../../docs/discipline.md)） |
| 默认 preset | 都来自 bundle patch（bundle-first）；`dev` 的 profile patch 按约定留空（`docs/dev.md:187`） |
| 启动形态 | 都是 `dsh --profile <name>`；dev 只是多一层强制 home 的启动器（`dev/env/dsh.mjs`） |

### 还没登记、也没在开发环里走的

| 机制点 | 用户安装路径 | dev 快环 | 现状 |
|---|---|---|---|
| 安装源 | tarball：`dsh plugin add <tgz>`（`packages/dsh-smart-assistant/bootstrap.mjs:423-435`）；Plugins 页 / 市场按名字 | 裸路径 = link（`dev/env/setup.sh:97-99`） | **机制不同** |
| 包字节（`files` 白名单） | 以 tarball 清单为准（`packages/dsh-smart-assistant/package.json:125-136`） | 整棵 repo 可见 | **dev 不经过** |
| 依赖闭包 | profile 自己拥有运行时依赖（`yaml`），由 tarball 带来 | link 不装依赖 | **dev 不经过** |
| profile 用户层 | 产品 `assistant` profile 不写（bootstrap 只识别旧块并告警，`:450-455`） | `dev-task` 每次写 `profile-patch-headless.yml`；OV 在场时 `cp` 写 `dev` 的 patch | **dev 有 profile 写者** |
| 引擎门 | 安装时判 `engines.dsh` / `engines.pnpm`（tarball manifest） | link 安装判 `engines.dsh`；tarball manifest 与 `engines.pnpm` 不判 | 部分 |
| 运行时 | 已安装 `dsh`（版本在 `engines.dsh` 范围内） | vendor 源码 pin（tsx） | 允许差异（调试必需），版本面不同 |
| 重建 | 重装 tarball + 重启 | `pnpm build` 原地生效 | 允许差异（热环） |
| home / 凭据 / 工作区 | 产品 home（`~/.dsh-smart-assistant` 或 `--home`）+ 用户项目目录 | `dev/harness-home` + cwd = 仓根 | 允许差异（隔离） |
| 外部服务 | 无 | `dev/env/openviking-up.sh`（可选） | 允许差异（dev 工具） |
| profile 名 | `assistant` | `dev` / `dev-task` | 待判定（见未决 5） |

### 现状症状（都可复核）

1. **dev 快环当前就在写 profile 用户层，且与自己的合同相反。** `dev/env/setup.sh:104-114` 在 OV 插件
   在场时对 web profile 执行 `cp dev/profiles/profile-patch-ov.yml → $PROFDIR/cordis.patch.yml`——这是
   整份覆盖，会顺手改掉该 profile 里已有的行。与此同时 `docs/dev.md:187` 写的是"`dev` 不写 profile patch"。
2. **本机 dev home 还留着 bundle-first 之前的旧 override。** `dev/harness-home/profiles/dev/cordis.patch.yml`
   （2026-11-02 读数，mtime 2026-11-01）开头仍是 `- id: agent-preset-registry` → `default: assistant`。
   它会**掩盖**"默认值没进 bundle"的回归——正是 bundle-first 立 `dev` 不写 patch 这条约定的原因。
   setup.sh 对 web 列没有对账/清理路径。
3. **dev profile 的组合会漂移。** 本机 `dev` profile 的 bundles 里还有 `@openviking/dsh-memory-plugin` 与
   `@deepseek-ai/dsh-experimental-agent-team-profile`（后者不在 setup.sh 的建法里）。dev home 被历史实验
   改写后没有可见的对账。
4. **产品路径的安装断言不在开发环。** 八条 smoke 是发布清单（[docs/release.md](../../docs/release.md) §七）
   与人工命令；`pnpm verify` 不跑，`pnpm test` 也不 pack，仓内没有 CI 配置。`docs/release.md:42` 已经写明
   "链接安装 / source 直跑不能替代 tarball 安装"——原则在场，缺的是**开发环里真走一次**的常设通道。
5. **安装路径的事实已有第二份家并漂移。** `docs/product.md:53` 与 `_dist/安装手册.md:126` 仍说安装器
   "设默认 preset"，而 `packages/dsh-smart-assistant/bootstrap.mjs:444-455`（bundle-first 后）明说不写；
   同一份手册 `:123` 反而写"默认 preset 已经随 bundle 走"。手册口径的生成器在
   `scripts/release/export-dist.mjs:297`。

## 未决问题（立卡时）

1. **快环要不要保留 link？** 倾向保留（热重建是 `pnpm start` 的前提）。若保留，parity 表"安装源"一行
   要诚实写两列：快环 link = 允许差异；parity lane tarball = 同形。
2. **parity lane 长什么样、挂在哪？** 候选：a) `release-smoke` 加 `--composition-only`（pack → 干净
   home → `dsh plugin add` → `--dump-config` 断言 + 包字节断言，不 boot）；b) 新脚本 `dev-parity.mjs`；
   c) 只写进证据地图、不进门禁。倾向 a——复用同一份安装逻辑，且 release-smoke 已拥有包字节/依赖负例。
3. **`dev-task` 的 profile 用户层写怎么办？** 改成 `--patch`（`dev/env/dsh.mjs` 自动注入，或命令显式带）
   vs 保留并登记为允许差异 + 门禁只守"写者只碰 dev-task"。
4. **dev profile 组合要不要对账？** setup.sh 只在缺件时建 profile，之后不收敛 bundles。候选：声明基线 +
   多余时 warn / 摘除；或只做可见性（打印现状与基线 diff）。担心误摘手动装的插件（OV 是允许的可选层）。
5. **身份是否对齐？** `dev` 保持现名 vs 改成 `assistant`。对方选同名是因为同一条命令覆盖两个入口；我们
   的产品入口是独立 home，同名会抹掉"我在 dev home 还是产品 home"的提示。

## 方案与取舍

### 推荐方案：B（快环保留 link + 新增 tarball parity lane + 表与门禁）

| 片 | 内容 | 退出判据 |
|---|---|---|
| P0 | 事实收口：parity 表落 `docs/dev.md`；`docs/product.md` / 手册生成器 / bootstrap 的"默认 preset 写者"口径归一 | 表在且每行有证据 owner；三处口径一致；`pnpm export-dist` + verify 绿 |
| P1 | parity lane：pack → 干净 home → `dsh plugin add <tgz>` → `--dump-config` 断言（`preset-assistant` / `default: assistant` / 客户端 bundle 行） | lane 绿；从 `files` 拿掉一项时点名红（prove-it-red） |
| P2 | profile 写入者与漂移可见：web profile 的 patch 不再被 setup.sh 覆盖（OV 行走 `--patch` 或显式登记）；`dev-task` 写入登记；dev bundles 对账（warn 起） | 本机旧 override 被清理；门禁能点名"dev 写了不该写的 profile 行" |
| P3 | 门禁 `dev-parity`：表在场且 ≥ 8 行；表外新增 profile 写者 / 安装源变化即红；parity lane 被 docs 与证据地图点名 | `pnpm verify` 新增核绿；负例注入红、还原绿 |

### 被放弃的选项

- **把 dev 快环改成 tarball**：热环每次 build 都要 pack + 重装，违背"不为对齐牺牲调试力"；安装源风险由
  P1 的 lane 覆盖，表里如实写两列。
- **把八条发布 smoke 塞进 `pnpm verify`**：多条要 Chrome / 网络 / 真安装，verify 会从结构门禁变成发布
  流水线，单次成本与阻断面都太大；只把最便宜的一条（无 boot、无浏览器）接进开发环。
- **照抄"团队层版本 = 运行中 dsh"**：我们没有团队层；对应物是 `engines.dsh` 与运行版本面，证据
  `compat-matrix` / `pnpm-matrix` 已经拥有。
- **只加表不加证据通道**：表要么写成"安装源 = 同形"（假），要么写成"不同"但没有补救（把已知风险写成
  文案）。

## 切片台账

| 片 | 状态 | 证据 |
|---|---|---|
| P0 安装路径事实单一 | 已落 | `docs/product.md` 的安装/默认 preset 两条与 `bootstrap.mjs` 现况一致；手册生成器 `export-dist.mjs` 同句修正并重生成 `_dist/安装手册.md`；`pnpm verify` 绿 |
| P1 install-parity 快通道 | 已落 | `pnpm install-parity` 连跑绿（本机热 store 约 4s）；把 `!lib/client` 注入 `files` 后点名红（"tarball is missing package/lib/client/index.js"），还原即绿 |
| P2 profile 用户层零写入 | 已落 | `bash dev/env/setup.sh` 把 `dev` / `dev-task` 的旧生成 patch 复位为 `[]` 并留 `.dev-backup`；生成 `dev-overlay-dev.yml`（OV 旋钮）与 `dev-overlay-dev-task.yml`（roster insert）；`pnpm dsh --profile dev --dump-config` 见 `openviking-memory-runtime` 与 `default: assistant`，`dev-task` 见 insert 的 registry 行；`pnpm start` 真 boot + preflight 绿 |
| P3 dev-parity 门禁 | 已落 | `pnpm verify` 新增核绿；向 `setup.sh` 注入旧 `cp ... "$dir/cordis.patch.yml"` 时该核点名红，还原即绿；`tests/tooling/dev-parity.spec.mjs` 覆盖七种接受/拒绝形态 |
| P4 全量地板 | 已落 | `pnpm test`（155 文件 / 1178 tests）、`pnpm typecheck`、`pnpm build`、`pnpm verify`（53 checks）全部真跑绿 |

## 验收标准

| # | 行为 | 类 | 输入/状态 | 通过信号 | 负例/互补 | 证据 owner | 人判断 |
|---|---|---|---|---|---|---|---|
| 1 | parity 表可对账 | 确定性 | `docs/dev.md` 的 parity 表 | ≥ 8 个机制点，每行有产品路径、dev 路径、判定与证据 owner | 删一行或加一个未登记差异 → `pnpm verify` 红 | 新 `dev-parity` 核 + 红夹具 | 无 |
| 2 | 真 tarball 通道 | 编排 | pack → 干净 home → `dsh plugin add <tgz>` → `--dump-config` | tarball 含客户端 bundle（`lib/client/index.js`）；dump 含 `preset-assistant`、`default: assistant`、host 行；不 boot | 从 `files` 拿掉 `lib/client` 或一个运行时依赖 → lane 红 | parity lane + `release-smoke` 同源断言 | 无 |
| 3 | 快环 link 有据 | 确定性 | dev profile 的安装形态 | 表里登记 link 为允许差异，且 lane 在场 | 删掉 lane 或把 link 写成"同形" → 红 | 同 #1 的核 | 无 |
| 4 | profile 写入者边界 | 确定性 | `dev/env/setup.sh`、`dev/profiles/*` | web profile 的 `cordis.patch.yml` 不被 dev 脚本覆盖；`dev-task` 的写有 marker 且被表登记 | 让 setup.sh 再写 web patch → 红 | 新门禁核 + 真机 dev home 复核 | 无 |
| 5 | 安装路径事实单一 | 确定性 | `docs/product.md`、手册生成器、`packages/dsh-smart-assistant/bootstrap.mjs` | 三处都不再声称安装器写默认 preset；`pnpm export-dist` 后手册一致 | 让生成器再写旧句 → verify 红 | `release: the exported install manual matches the package` 门禁 + 手册 diff | 无 |
| 6 | 全量不回归 | 编排 | 收尾 | `pnpm typecheck && pnpm test && pnpm verify` 绿；发布前八条 smoke 按清单真跑 | 任一 smoke BLOCKED 时如实报阻断 | [docs/testing.md](../../docs/testing.md) 的「一页证据地图」 | dev 手感与"允许差异"边界 |

**人判断**：dev 手感（快环速度 vs 对齐收益）与 parity 表"允许差异"的边界，在阶段收尾请本人看一眼——
与对方卡一样，这是"够不够接近"的产品口味，不是机器能判的。

## 验证进展（2026-11-02）

| 验收 | 证据 |
|---|---|
| 1 parity 表可对账 | 表在 [docs/dev.md](../../docs/dev.md) §十（13 个机制点，每行有产品路径/dev 快环/判定/证据 owner）；`dev-parity` 核对在场与行数 |
| 2 真 tarball 通道 | `pnpm install-parity` 绿：tarball 表面 321 files、无 src/map、peer 已具体化、干净 web profile 装得上、`yaml` 依赖可解析、dump 出 `preset-assistant` + `default: assistant` + host 行、install 不写 profile patch |
| 3 快环 link 有据 | 表内 link 判为"有界（热重建）"且 lane 在场；lane 被删时门禁红（spec 覆盖） |
| 4 profile 写入者边界 | setup.sh 不再写 `$dir/cordis.patch.yml`；旧生成 patch 迁移有 backup；`dev-task` 的 roster insert 只住 overlay |
| 5 安装路径事实单一 | product.md / 手册 / bootstrap 三处一致；手册由 `pnpm export-dist` 重生成 |
| 6 全量不回归 | 见切片台账 P4；发布前八条 smoke 未在本次改动面内（dev 脚本/文档/门禁），发布时按清单跑 |

**待你验收：** dev 启动的手感（`pnpm start` 的热环是否仍够快）与 parity 表里"允许差异"的边界
（尤其是"安装源 = link 快环 + lane 证据"这一行）。

## 仍未取（本轮有意不做）

- **profile 名对齐（`dev` vs `assistant`）**：登记为有界差异（隔离 + 入口提示）；触发 = 本人要求同名。
- **dev profile 组合对账**：setup.sh 仍不收敛 `dev` 的 bundles（本机曾有 team bundle 漂移）；本轮只把
  "dev 写入者"收口。触发 = 再出现"只在 dev home 装过的插件掩盖缺依赖/preset"的回归。
- **launcher 注入的单元级测试**：本轮由 `dev-parity` 文本守 + 真机 dump/`pnpm start` 证明；触发 = 注入
  逻辑出现第二种 shape（如按子命令注入）。
- **安装器的 `npm pack` 与发布物 `pnpm pack` 的字节差**：仓内直跑安装器时 manifest 会带 `workspace:`
  peers（profile 的 `autoInstallPeers: false` + `engines.dsh` 让今天的安装照常工作；手册走的是已具体化
  的 `_dist` 包，用户路径不受影响）。触发 = DSH 开始 auto-install peers，或 product-smoke 要证明
  "仓内直跑的安装器字节"。

## 下一步

- 等你验收 dev 手感与"允许差异"边界；点头后按关闭条件把本卡归档，结论指向已写的
  [implemented note](../../notes/implemented/2026-11-02-dev-product-install-parity.md)。

## 关闭条件

验收 1–6 有真跑证据；parity 表与门禁在场；结论去向已记录 =
[implemented note](../../notes/implemented/2026-11-02-dev-product-install-parity.md)；仍未取的触发条件写在本卡。
