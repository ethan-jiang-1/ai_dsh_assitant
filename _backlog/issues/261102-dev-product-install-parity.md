---
status: 推敲中
opened: 2026-11-02
---

# 推敲：dev 通道与用户安装路径对齐（同机制 + 有界差异）

> 立卡：2026-11-02 ｜ 状态：推敲中 ｜ 类型：Task ｜ 可关闭：否

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

## 未决问题

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

## 验收标准

| # | 行为 | 类 | 输入/状态 | 通过信号 | 负例/互补 | 证据 owner | 人判断 |
|---|---|---|---|---|---|---|---|
| 1 | parity 表可对账 | 确定性 | `docs/dev.md` 的 parity 表 | ≥ 8 个机制点，每行有产品路径、dev 路径、判定与证据 owner | 删一行或加一个未登记差异 → `pnpm verify` 红 | 新 `dev-parity` 核 + 红夹具 | 无 |
| 2 | 真 tarball 通道 | 编排 | pack → 干净 home → `dsh plugin add <tgz>` → `--dump-config` | dump 含 `preset-assistant`、`default: assistant`、客户端 bundle 行；不 boot | 从 `files` 拿掉 `lib/client` 或一个运行时依赖 → lane 红 | parity lane + `release-smoke` 同源断言 | 无 |
| 3 | 快环 link 有据 | 确定性 | dev profile 的安装形态 | 表里登记 link 为允许差异，且 lane 在场 | 删掉 lane 或把 link 写成"同形" → 红 | 同 #1 的核 | 无 |
| 4 | profile 写入者边界 | 确定性 | `dev/env/setup.sh`、`dev/profiles/*` | web profile 的 `cordis.patch.yml` 不被 dev 脚本覆盖；`dev-task` 的写有 marker 且被表登记 | 让 setup.sh 再写 web patch → 红 | 新门禁核 + 真机 dev home 复核 | 无 |
| 5 | 安装路径事实单一 | 确定性 | `docs/product.md`、手册生成器、`packages/dsh-smart-assistant/bootstrap.mjs` | 三处都不再声称安装器写默认 preset；`pnpm export-dist` 后手册一致 | 让生成器再写旧句 → verify 红 | `release: the exported install manual matches the package` 门禁 + 手册 diff | 无 |
| 6 | 全量不回归 | 编排 | 收尾 | `pnpm typecheck && pnpm test && pnpm verify` 绿；发布前八条 smoke 按清单真跑 | 任一 smoke BLOCKED 时如实报阻断 | [docs/testing.md](../../docs/testing.md) 的「一页证据地图」 | dev 手感与"允许差异"边界 |

**人判断**：dev 手感（快环速度 vs 对齐收益）与 parity 表"允许差异"的边界，在阶段收尾请本人看一眼——
与对方卡一样，这是"够不够接近"的产品口味，不是机器能判的。

## 下一步

- **等点名**：本卡不自动开工（卡上的方案不授予实施权限）。若同意方向 B，按 P0→P3 推进；若要 A（dev
  改走 tarball）或只要表（C），先说，P1/P2 的形状会不同。
- **可以立刻顺手做的**：P0 的文案收口（`docs/product.md:53` 与手册生成器 `scripts/release/export-dist.mjs:297`）
  是局部机械修正，不必等整卡；但改生成器要重跑 `pnpm export-dist`，会动 `_dist/` 产物，仍算 P0 的验收。

## 关闭条件

验收 1–6 有真跑证据；parity 表与门禁在场；结论去向（implemented note 或并入既有 install 决策）已记录；
P2 第 4 项若延后，触发条件写回本卡。
