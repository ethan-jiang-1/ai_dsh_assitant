# dsh-smart-assistant

一个 DSH 插件：给 agent 一个**自己的 working folder**（跨会话的工作目录），并让它始终"有用的多、没用的少"。

- **四个房间**：`memory/`（已确立的事实/偏好/决定）、`research/`（未决线索，backlog 语义）、
  `skills/`（学到的本事）、`knowledge/`（领域知识页，`[[互链]]`）。
- **自有工具**：`assistant_memory`、`assistant_recall`、`assistant_research`、`assistant_reflect`、`assistant_knowledge`、`assistant_operating`
  （动词清单以生成物 catalog 为准）。
- **一个机器能跑的养护检查**：`assistant_memory action=curate`。
- **一个 agent preset**：`assistant`（挂上它，这个会话就是"有 working folder 的助手"）。
- **一个只读部署自检 CLI**：`ov-doctor`（`bin/ov-doctor.mjs`；装好可选 OpenViking 层后在 profile 内运行，见安装手册的 OV 自检节）。
- **一个专家装配 CLI**：`expert-setup`（`bin/expert-setup.mjs`；把管理种子显式导入为 `draft`，不自动 stable）。
- **一个数据备份/诊断 CLI**：`assistant-data`（`bin/assistant-data.mjs`；导出/导入 `assistant` + `assistant-operating`，带 schema manifest；另有 `status`/`check`、`import --replace` 与显式 `purge`）。
- **一个独立启动脚本**：`bootstrap.mjs`（解开的包目录里用已安装 `dsh` 建隔离 profile；先用 npm 打包再安装，home 默认在包外，不碰日用 `~/.dsh`）。
- **默认身份是管理岗**（P1）：`SOUL.md` 是数据，种子与回退一致；管理种子只在显式装配时进入知识室，安装不写 working folder。

## Install

```sh
dsh plugin --profile web add /path/to/dsh-smart-assistant-<version>.tgz
```

安装只带定义；在 Web UI 的 Settings → Agent 预设里把 `章鱼管家` 设为默认，或 headless 用
`agent-preset-registry.default: assistant` 的 profile patch。需要 DSH `>=0.2.1-rc.2 <0.3.0-0`、
Node `^22.19.0 || >=24`，以及 PATH 上的 `pnpm >= 10.6.0`（10.4 及更低会报
`ERR_PNPM_ADDING_TO_ROOT`；Corepack 已启用也算）。首次安装需要访问 npm registry 或内网镜像，
拉唯一依赖 `yaml`；之后运行不需要网络。

Desktop 使用保留的 `desktop` profile：先在 Desktop 应用里初始化一次，再
`dsh plugin --profile desktop add ...` 并重启应用（本轮未在 Desktop 真机验证）。

## What it contributes

`cordis.patch.yml` 是一层 bundle patch：host 面的 working-folder 服务（四房间、摘要、curate）、
经营账本/投影、房间与 Viki 路由，以及 `assistant` preset（六个工具、四个常驻段落、策展技能、
学到的技能 provider 与遮蔽盾）。客户端贡献桌面与房间 tab；行、exports、工具动词的精确清单以
[生成物 catalog](../../docs/package-catalog.md) 为准。

## Configuration

`assistant-memory` 行可配 `dataDir`（默认 `<dshHome>/assistant`）、`digestMaxBytes`、`recallLimit`、
`staleResearchDays`；`assistant-operating-ledger` 行有独立的 `dataDir`（默认
`<dshHome>/assistant-operating`）与 `keepOperations`（默认 256）；`assistant-desk-projection` 有
`maxProjectionBytes`（默认 8 MiB）与 `allowFixture`（默认 `false`：无账本时 404，不把
`desk-projection.json` 模拟资料当成真桌面）。patch 是整行 config 替换，不是深合并。

Viki 的 API key 从 `apiKeyEnv`（默认 `OPENVIKING_API_KEY`）读；内联 `apiKey` 只为旧 home 保留，
会以明文写进 profile patch，不推荐。

## Data

- **Working folder**：`<dshHome>/assistant`，用户可读可改的 home 数据，由本插件拥有：`SOUL.md`、`AGENTS.md`、
  `memory/`、`research/`、`skills/`、`knowledge/`、`skill-proposals/`、`audit/`、`skill-usage.json`、
  `ui-mode.json`、`deliverables/`。学到的技能是本插件注册的 provider 根（`skills/`），不是 `$DSH_HOME/skills`；
  策展技能随包只读，位于 `presets/assistant/skills/`。`AGENTS.md` 按 generation 迁移已知旧段落；
  匹配不到的旧手册不重写，prompt 标记 stale。
- **Ledger**：`<dshHome>/assistant-operating`，权威 `ledger.json`（最近 256 条操作 + 累计计数）+
  `operations-archive.jsonl`（完整操作历史）+ 单 writer 锁；可用 `assistant-data` 导出/导入。
- **Profile 不是租户**：同一 `DSH_HOME` 下的所有 profile 共用这两个目录；换 profile 名只隔离组合，不隔离数据。
  真要隔离试用，用独立 `DSH_HOME`，或同时覆盖 memory/ledger/projection 的 `dataDir`。
- **Host-owned**：sessions、credentials、settings、storages 在 `$DSH_HOME` 下由宿主管理，插件备份不包含它们。
  补丁启用的 `session-search.db` 是会话全文索引（派生、可重建），卸载后仍留在盘上；要清就删它。
  客户端 localStorage/sessionStorage 键属于设备，清站点数据即清，卸载不自动清。
  working folder 或会话 cwd 下的 `deliverables/` 是用户数据。
- **备份/恢复**：`assistant-data` 只带这两个目录，排除 `writer.lock` / `*.tmp`，拒绝符号链接；import 要求实例已停止。
  首次启动前目标为空即可直接 import；已经启动过的 home 先 `import --replace --dry-run` 看计划，再用 `--replace`
  把现有目录移到 `.pre-import-*` 旁路。手动 `cp -R` 也要先删掉备份里的 `writer.lock`，并另备 sessions/credentials。
- **诊断/擦除**：`assistant-data status` 报路径/大小/手册 generation/账本健康/归档操作数；`check` 再报相对路径、
  坏 ledger/归档行、旧手册与符号链接，有问题以非零退出。`purge --kind ... --id ... --reason ... --yes`
  是显式硬删除：删 active/archive/snapshot 副本，并向 `audit/purges.jsonl` 写审计；不删 sessions/账本历史。
  `refresh-manual --yes` 先把 `AGENTS.md` 备份为 `.bak-*` 再写入当前 generation，供迁移表覆盖不到的旧手册。
- **并发**：同一 home 只应有一个写入者；账本拒绝第二 writer，房间写是原子但 last-write-wins。
- **Package**：不写任何用户数据/secret；`handoff-scan` 拒绝数据、凭据、宿主路径与活密钥，`release-smoke`
  断言安装不创建 working folder。Viki key 不落配置；bootstrap 的 `bootstrap.json` 0600、日志 token 已打码。
- **升级/卸载**：两个插件目录保留；房间格式只增可选字段，手册按 generation 迁移，账本 v1 旧字节可读；
  `assistant-data` 提供带 `schemaVersion` 的备份/恢复；不把 sessions/credentials 打进 bundle。
  完整数据卡（每个面的归属/寿命/备份/卸载去向）= [`docs/delivery.md`](../../docs/delivery.md) §一。

| DSH 平面 | 本包 |
|---|---|
| D 定义 / C 代码 | bundle patch、preset、包内只读技能、`lib/bin`；只读，随版本替换 |
| W workspace | 不拥有；只有用户自己的 `deliverables/` |
| U home | `<dshHome>/assistant`；用户可见可改，跨项目，升级/卸载保留 |
| S session / H host state / K cache / X credentials | 宿主拥有；本包不写 session、不用 storageDomain、只有内存摘要缓存、不读凭据 |

这个 home 根是**用户可见的 U 平面**（人能读、能 review、能导出），不是 `ctx.storageDomain` 的 host KV，也不是
随项目走的 workspace；因此使用文件格式 + `curate` 而不是 KV schema。转换边界的合同 = [`docs/delivery.md`](../../docs/delivery.md)。

## Compatibility

机器可安装范围见 `engines.dsh`（当前 `>=0.2.1-rc.2 <0.3.0-0`）、`engines.node` 与
`engines.pnpm`（`>=10.6.0`）；当前 pin 是 `dsh-v0.2.1-rc.2`。上界用 `<0.3.0-0` 而非 `<0.3.0`：
预发布参与匹配，`0.3.0-rc.1` 会被 `<0.3.0` 放进来，而它是下一个 breaking minor 的 RC。未来
0.2.x 自动放行；0.3.x 需要重新验证并发新版本。pnpm 下界来自 profile 的
`pnpm-workspace.yaml` 设置支持：10.4 及更低直接拒绝安装，10.5 会忽略 linker 设置。
历史 typecheck 台账在 repo-only `release-verification.json`，不随包发布，也不是当前支持承诺；
更老的 DSH 版本不在支持矩阵内。

## Uninstall

```sh
dsh plugin --profile <p> remove dsh-smart-assistant
```

卸载不删 `<dshHome>/assistant` 与 `<dshHome>/assistant-operating`；先 `assistant-data export` 备份。
卸载也不会删宿主数据：要清会话全文索引就删 `<dshHome>/session-search.db`，要清其余宿主数据按
[`docs/delivery.md`](../../docs/delivery.md) §一数据卡逐项处理；客户端 localStorage 键用“清除站点数据”。
OpenViking 是独立可选层，另停 server 并按其安装手册清理。

## 它是什么形状

**当前声明了什么，以生成物为准**：[`docs/package-catalog.md`](../../docs/package-catalog.md)
（由 `scripts/generate/gen-catalog.mjs` 从 exports、组合行、工具源码与技能目录抽取；`pnpm verify` 守 freshness）。
这里只留一句形状概括，不再手维护清单（手维护的清单必然漂移）：

- plugin 子路径按 host / agent / client 三平面分布（host 含知识批准服务，agent 含自有工具、常驻段落、
  learn、遮蔽盾与 dev 的 `./preset-runner`），另有非 plugin 导出（`./package.json`）。**计数与逐行清单以
  [生成物 catalog](../../docs/package-catalog.md) 为准——本句不携带数字。**

装法、身份名、working folder 的契约分别在仓库的 `README.md`、`docs/identity.md`、`docs/home.md`。

Web 客户端贡献独立全局桌面（唯一「桌面」，账本投影）与右栏可按需添加的四个房间 tab（记忆 / 知识 / Viki / 技能）。默认主面板选择只在页面初始化时尝试，不随重挂覆盖用户导航；导航与数据读取的当前合同在 [浏览器动作链](../../docs/architecture.md#浏览器动作链一次点击--可见的桌面变化)。客户端不拥有经营权威数据。

Host 的 `./desk-projection` 是固定只读投影下载：有权威 `ledger.json` 时活渲染 v2 投影，无账本时回退固定 fixture；不是经营 writer 或通用文件读取。Config `dataDir` 与 agent working folder 独立；缺失、损坏和 I/O 错误分别返回错误，且 fiber 卸载撤销路由。目录/状态码/限额合同由上面的浏览器动作链拥有；此入口不向模型添加工具或提示词。

Client 内部下载对象处理连接代际、手动重读、陈旧缓存与迟到结果拒绝，使用平台 snapshot publisher；apply 承担 effect disposal，并通过 Slot inject hooks 供全局主区消费。它使用经营 v1/v2 双信封解析器验证身份、修订、事项状态及证据定位；解析失败保留最后有效内容。主面板显示完整集合和缺失/空/错误/陈旧状态；事项选择显示摘要、状态、证据 quote 与 Session/event 定位，宽区双栏、窄区单 pane 保留选择与列表位置；事项选择、处理路径与自动回桌已提供，业务写入仍由模型经账本动作完成（客户端不直接写经营账本）；`ready` 不等于业务成功。对象无持久缓存，组件不自行订阅或发起下载。

## 依赖姿态

Host 运行期 `@deepseek-ai/*` 使用 **peerDependencies**；仅类型关系（例如 Connection 下载声明）使用开发依赖：DSH 的公开 API 仍是 pre-stable，
精确钉死会让每次上游同步都变成一次发版。**当前可安装范围由 `engines.dsh` 机器声明**；`release-verification.json`（repo-only，不进 tarball）是每个 pin 上跑过 typecheck 的历史验证台账，不当作当前支持承诺。`engines.node` 与 pin 住的 DSH 保持一致。`yaml` 是唯一的运行时 dependency。

## 自包含

发布产物（`lib/`、`bin/`、`presets/`、`cordis.patch.yml`）不引用 repo 内任何其他目录，也不引用 `vendor/`；
`pnpm verify` 机械检查这一点。唯一运行期 npm 依赖是 `yaml`（首次安装从 registry 拉取），其余全部由宿主
DSH 提供；因此“自包含”指 agent 物自包含，不是离线安装包。真实安装形状（`pnpm pack` → 干净 home →
`dsh plugin add`）由 `pnpm release-smoke` 验证；`bin/ov-doctor.mjs` 随包安装，另一人不需要仓库。
