# 交接、备份与数据边界（当前合同）

> 本文件拥有：**agent 物 / 用户数据**的边界、交接扫描、插件数据的导出/导入、备份恢复、升级/卸载的数据承诺与格式兼容政策。
> 发布形态/渠道/版本/兼容宪章 = [`release.md`](release.md)；working folder 布局 = [`home.md`](home.md)；经营账本 = [`operating.md`](operating.md)；安装与分发 = 生成的 `_dist/安装手册.md`。
> 一个事实一个家：这里只写边界与操作合同，不复制四房间语义。

## 一、两个物

| 物 | 内容 | 归属 |
|---|---|---|
| **agent 物** | `lib/`、`bin/`、`presets/`、`seeds/`、`cordis.patch.yml`、`package.json`、`README`、默认身份与回退 | 包；可复制给任何人，不含用户数据 |
| **用户数据（插件拥有）** | `<dataDir>`（默认 `<dshHome>/assistant`）与 `<operatingDir>`（默认 `<dshHome>/assistant-operating`，含 `ledger.json` / `operations-archive.jsonl`） | 某一个人的 home |
| **用户数据（宿主拥有）** | `sessions/`、credentials、`settings`、`storages`、`session-search.db`、`cache/` 等 | 同一个 home；不进插件备份/交接物 |
| **交付物** | working folder 根或会话 cwd 下的 `deliverables/`（模型自发落点，见 [`home.md`](home.md) §一注） | 用户数据；不进 agent 物 |

**一个人 = 一个 `DSH_HOME`。** profile 是组合，不是租户；不同人用不同 home（不同机器、不同 OS 用户或显式隔离 home），不共享插件数据目录。同一 home 下的所有 profile 共用 `<dshHome>/assistant` 与 `<dshHome>/assistant-operating`——换 profile 名只隔离组合，**不隔离数据**；真正隔离试用用独立 `DSH_HOME`，或同时覆盖 memory/ledger/projection 的 `dataDir`。

### 数据平面映射（DSH 6+2）

本包按 DSH 的所有权/可见性/生命周期切分如下；这是本包的映射，不是把 DSH 平面改名。

| DSH 平面 | 本包 | 所有者 / 可见性 / 生命周期 |
|---|---|---|
| **D 定义** | `cordis.patch.yml`、preset 行、包内只读技能、Config 默认 | 包；只读；随包/版本 |
| **C 代码** | `lib/`、`bin/`、`bootstrap.mjs` | 包；只读；升级整体替换 |
| **W workspace** | 不拥有；只有用户自己的 `deliverables/` | 项目/用户；随项目；插件不写 |
| **U home** | `<dshHome>/assistant`（身份、记忆、线索、学到的技能、知识） | 插件拥有、用户可读可改；跨项目；升级/卸载保留 |
| **S session** | 宿主拥有；四个 prompt 段落随请求进日志；不新增 event 类型 | 会话；只追加；插件不写日志 |
| **H host state** | 不使用 `ctx.storageDomain`；`<dshHome>/assistant-operating` 是文件账本 + 操作归档 | 插件拥有、用户可读；单 writer；可导出 |
| **K cache** | 只有内存摘要缓存，可重建；补丁启用的 `session-search.db` 是宿主搜索索引 | 运行时/宿主；可丢弃 |
| **X credentials** | 宿主拥有；插件不读不写应由凭据服务管理的值；Viki key 只从环境变量读 | 用户/宿主；不进包、不进日志、不导出 |

刻意偏离：working folder 是**用户可见的 U 平面自定义根**，不是 `ctx.storageDomain` 的 host KV，也不是随项目走的 W；账本是**可导出的文件账本**，不是 H KV。理由与证据 = [`discipline.md`](discipline.md) 适配 13、[`release.md`](release.md) 与 `handoff-core`/`assistant-data`/`two-homes`/`old-home-compat` 测试。

### 数据卡

| 事实 | 依赖层级 | 承诺/平面 | 权威 | 位置 | 作用域 | 寿命 | 谁看得见 | 进插件备份 | 迁移/删除 | 卸载后 |
|---|---|---|---|---|---|---|---|---|---|---|
| 记忆/线索/知识/技能/提案 | N0 `ctx.fs`（文件） | P2 / U | 插件 + 用户 | `<dataDir>/{memory,research,knowledge,skills,skill-proposals}/` | home 单例，无项目键 | 房间生命周期；archive 保留 | 用户；模型经工具 | 是 | frontmatter 只增可选；`purge` 逐条擦除 | 保留 |
| 身份与手册 | N0 文件 | P2 / U | 用户 + 插件 | `<dataDir>/SOUL.md`、`AGENTS.md` | home 单例 | 身份永不覆盖；手册按已知文本迁移 | 用户；模型逐字进 prompt | 是 | generation 迁移；`refresh-manual` 备份后再生 | 保留 |
| 用量、治理、界面、交付 | N0 文件 + 自有 CLI | P2 / U | 插件/用户 | `<dataDir>/skill-usage.json`、`audit/approvals.jsonl`、`audit/purges.jsonl`、`ui-mode.json`（v1 envelope）、`deliverables/` | home 单例 | usage 可删；审计只追加；deliverables 无生命周期 | 用户；模型不可见 ui-mode/audit | 是 | `purge` 房间记录；approvals/deliverables 手动；提案 `archive-proposals` | 保留 |
| 经营账本状态 | N0 文件 + 自有服务 | P3 / H | 插件 | `<operatingDir>/ledger.json` | home 单例 | 最近 256 条操作 + 全量计数；压缩后仍有界 | 用户；模型经工具 | 是 | v1 只增；`operationCount` 回填；不做硬删 | 保留 |
| 账本操作归档 | N0 文件 + 自有服务 | P3 / H | 插件 | `<operatingDir>/operations-archive.jsonl` | home 单例 | 只追加；完整回执历史；读取有 256 MiB 上限 | 用户；模型经工具按 id 读 | 是 | 按 `operationId` 去重；需要导出/轮转 | 保留 |
| 会话搜索索引 | N1 `session-query-sqlite` | 宿主 K | 宿主（本包补丁启用） | `<dshHome>/session-search.db` | session/corpus | 首次检索创建；可重建 | 宿主；模型经 `session_query` | 否 | 删文件即重建 | **保留；要清就删此文件** |
| 会话/凭据/设置/宿主 KV | N0/N1 宿主 | S / H / X | 宿主 | `$DSH_HOME/sessions/`、`.credentials.yaml`、`storages/`、`profiles/` 等 | session/home/profile | 宿主决定 | 宿主/模型经工具 | 否 | 宿主迁移/备份；不进插件 bundle | 保留 |
| 客户端 UI 状态 | 平台 `localStorage`（非 N0） | 客户端 | 设备/浏览器 | localStorage：`dsha:ui-mode:v1`（旧 `dsha:ui-mode` 首次读迁移）、`dsha:receipt-since`、`dsha-proactive-ui-v1`、`dsh-assistant-debug`；sessionStorage：`dsha-capture-seen-running-v1`、`dsha-capture-receipt-v1` | origin/设备 | 可丢弃；换源/清站点即失 | 浏览器 | 否 | 无版本/迁移（G35）；清站点数据 | 保留；清站点数据 |
| OpenViking 记忆 | E2 外部服务 | E2 外部服务 | 外部服务 | OpenViking server（可选） | 外部 | 由服务决定 | 面板/模型经工具 | 否 | 按 OpenViking 手册 | 按 OpenViking 手册清理 |

客户端键没有版本号/迁移（G35）；换源或清站点即重置，持有的是 UI 偏好/回执游标，不复制 session-derived 事实。

**模拟夹具不是数据**：`<operatingDir>/desk-projection.json` 是评估/夹具输入，不是经营账本。无 `ledger.json` 时
桌面默认 404；只有 `assistant-desk-projection` 显式配 `allowFixture: true` 才回退它。真实 home 里出现该文件时
`assistant-data check` 会点名，避免模拟事项冒充真事项。

**作用域**：working folder 与账本都是 home 单例，**不按 workspace 分区**；多项目共享是产品选择，要隔离用独立 `DSH_HOME`。客户端键只属于设备，不参与模型请求。

**秘密**：working folder、账本、归档都是明文；不要把 API key、token、密码写进记忆/知识/账本。Viki 的 key 从 `apiKeyEnv`（默认 `OPENVIKING_API_KEY`）解析，内联 `apiKey` 仅为旧 home 保留并会把明文写进 profile patch。bootstrap 的 `bootstrap.json`（含 launch URL）为 0600，`logs/bootstrap.log` 在拿到 URL 后把 token 替换为 `[redacted]`。

**并发**：同一 home 只应有一个写入者。账本用 `writer.lock` 跨进程独占，第二个 writer 会被拒绝；房间/技能/提案/审批是原子写但 **last-write-wins**，并发写不保证合并。读可以并行；需要并行写实验时用独立 `DSH_HOME`。

## 二、交接

交接物是 **agent 物**：`pnpm export-dist` 的 tarball，或一份只含 agent 文件的目录。不要把整个开发仓目录直接递人——
`dev/harness-home/`、`.env.local`、`sessions/`、`deliverables/`、`.tmp/` 等都是运行现场。

机械检查：

```sh
node scripts/release/handoff-scan.mjs <目录或 tarball>
```

- 路径面拒绝：`assistant/`、`assistant-operating/`、`data/`、`sessions/`、`deliverables/`、`profiles/`、`storages/`、
  `logs/`、`dev/harness-home/`、`dev/trial-home*`、`.tmp/`、`.desk/`、`.pi/`、`_dist/`、`node_modules/`、`.git/`；
  以及任意深度的 `.env`、`.env.local`、`.credentials.yaml`、`auth.json`、`*.key`、`*.pem`、`id_rsa`、`id_ed25519`。
- 文本面拒绝：机器家目录的绝对路径前缀（具体规则 = `scripts/release/handoff-core.mjs`）与明显的活密钥形状。
  文本面只检查不超过 512 KiB 的可读文本；二进制/压缩件不做内容检查，tarball 的清单边界另由 `export-dist` 守。
- 符号链接拒绝：交接物必须是普通文件，不能指向 home 外。
- `export-dist` 与 `release-smoke` 对 tarball 跑同一条扫描；扫描失败即发布物不可信。

交接后的独立启动用包内 [`bootstrap.mjs`](../packages/dsh-smart-assistant/bootstrap.mjs)：它用已安装的兼容 `dsh` 在 `--home` 下建一个专用 profile，先用 Node 的 `npm pack` 把当前目录打成 tarball 再装进 profile（这样 profile 拥有 `yaml` 依赖），然后起 `--port 0`；`DSH_HOME`、workspace、agents-home、temp 都在该 home 下，不碰日用 `~/.dsh`。home 默认在包目录**旁边**的 `assistant-data/`；指向包内（含符号链接解析后）会被拒绝。搬移整个 home 时，对新路径重跑一次 `bootstrap --home <新路径> --no-start`：脚本检测到旧 profile 的 `file:` 依赖失效或 profile manifest 损坏后会重建 profile，数据目录保留；不要只 `mv` 后直接启动。没有 `dsh` 的环境不是这条路径的范围。

允许的符号根：`~/.dsh`、`$DSH_HOME`、包内相对路径、`seeds/...`。手册和模型可见文案用符号根，不写宿主绝对路径。

## 三、备份、恢复与迁移

插件数据 = 两个目录；备份/恢复/诊断用包内 `assistant-data`（[`bin/assistant-data.mjs`](../packages/dsh-smart-assistant/bin/assistant-data.mjs)，
实现 = [`src/cli/assistant-data.ts`](../packages/dsh-smart-assistant/src/cli/assistant-data.ts)）：

```sh
node <DSH_HOME>/profiles/web/node_modules/dsh-smart-assistant/bin/assistant-data.mjs export \
  --assistant <DSH_HOME>/assistant --operating <DSH_HOME>/assistant-operating --out <备份目录>

# 首次启动前恢复（目标不存在或为空）：
node .../assistant-data.mjs import --in <备份目录> \
  --assistant <DSH_HOME>/assistant --operating <DSH_HOME>/assistant-operating

# 已经启动过的 home：停实例，先 dry-run 看计划，再让 import 把现有两目录移到旁路后恢复：
node .../assistant-data.mjs import --replace --dry-run --in <备份目录> \
  --assistant <DSH_HOME>/assistant --operating <DSH_HOME>/assistant-operating
node .../assistant-data.mjs import --replace --in <备份目录> \
  --assistant <DSH_HOME>/assistant --operating <DSH_HOME>/assistant-operating

node .../assistant-data.mjs status --assistant <DSH_HOME>/assistant --operating <DSH_HOME>/assistant-operating
node .../assistant-data.mjs check  --assistant <DSH_HOME>/assistant --operating <DSH_HOME>/assistant-operating
```

- bundle = `assistant/` + `assistant-operating/` + `manifest.json`；manifest 的 `schemaVersion` 当前为 `1`。
- **不含** sessions/credentials/settings/storages/`session-search.db`；这些要另备整 home。账本里的 session/event 定位在只恢复插件两目录后仍指向原 home 的会话；要把证据链一起带走，另备 `sessions/`。
- `export` 排除 `writer.lock` / `*.tmp` / `*.takeover`，拒绝符号链接（备份必须是普通文件）；旧的带锁 bundle 在 import 时也会被剔除。导出前停实例，得到跨房间一致的快照。
- `import` 要求实例已停止；默认要求两个目标目录不存在或为空，非空拒绝、不覆盖。`--replace` 把非空目标改名为 `<dir>.pre-import-<id>` 旁路后再导入，失败时恢复旁路；旁路不删除，确认后可手动清。`--dry-run` 只做与真导入相同的校验并报告文件数与将被旁路的目标，不写盘。
- 未知 `schemaVersion` 拒绝导入；不猜、不半导入。导入先写 sibling temp，再 rename 就位；失败不留下半成品。
- `status` 读路径/文件数/字节数、手册 generation、`ledger.json` 是否 v1、归档操作数，以及 memory/research/skills archive、提案收件箱、approvals 的 retention 读数（只读，不删）；`check` 再加相对路径、坏 ledger/归档行、旧手册、符号链接、超大归档/审批、提案积压与备份总量（>512 MiB 提示手工导出/归档），问题以非零退出。
- 原始 `cp -R` 等价可用；它不校验 manifest、不排除 `writer.lock`、也不保证目标为空——需要“可验证的恢复”时用 `assistant-data`。手动 `cp -R` 备份必须删掉 `<备份>/assistant-operating/writer.lock` 与 `*.tmp`，否则换机恢复后账本会把旧 host 的锁当活锁。

**显式擦除（硬删除）**：

```sh
node .../assistant-data.mjs purge --assistant <DSH_HOME>/assistant [--operating <DSH_HOME>/assistant-operating] \
  --kind <memory|research|knowledge|skill|proposal|ledger> --id <id> --reason "<why>" --yes
```

- 删除该记录在 active、`archive/` 与（技能）`archive/snapshots/` 下的全部副本；不删 sessions、credentials、账本历史、client 状态或别条记录。
- 必须给 `--reason` 与 `--yes`；id 不合法、记录不存在、候选是符号链接都拒绝。
- 删除前后各追加一行到 `<dataDir>/audit/purges.jsonl`（0600，`requested`/`deleted`，失败记 `failed`）；审计本身也是插件数据，随备份走。`--kind ledger --operating ... --id <operationId>` 还会从 `ledger.json` 与 `operations-archive.jsonl` 移除该操作（sessions 仍不删）。
- 账本里的 material/quote 与 `discard` 是审计历史，不随房间记录擦除；要连账本一起擦除需另做显式操作。
- 删除后可能留下悬空 `[[链接]]`/source；`curate` 会报，恢复需从备份。

**手册再生**：`assistant-data refresh-manual --assistant <DSH_HOME>/assistant --yes` 把现有 `AGENTS.md` 复制为
`AGENTS.md.bak-<stamp>`（0600）后写入当前 generation。它是给迁移表覆盖不到的更老手册的逃生门；手改内容在备份里，
不碰 `SOUL.md`。不带 `--yes` 拒绝。

**提案轮转**：`assistant-data archive-proposals --assistant <DSH_HOME>/assistant --yes` 只把 `status: landed`
或 `rejected` 的提案移进 `skill-proposals/archive/`；`proposed`/`approved` 留在收件箱。再提案仍从归档副本继承
`revision`/`created`，不重开历史；归档是移动，不删除。

**加密传输**：`assistant-data seal --in <bundle> --out <file>` 从 `ASSISTANT_DATA_PASSPHRASE`（或 `--passphrase-env` 指定变量）读口令，生成 AES-256/PBKDF2 文件；`unseal --in <file> --out <dir>` 解到空目录。口令不进命令行/包；加密不是签名，收件方仍需信任文件来源。

**合并（保守）**：`assistant-data merge --in <bundle> --assistant <dir> --operating <dir> [--apply] [--prefer current|incoming]` 默认 dry-run；只补目标缺失文件、目标独有文件不删；冲突默认保留当前，`--prefer incoming` 才替换工作目录文件并留 `.merge-backup-*`；账本冲突永不覆盖。

**归档轮转**：`assistant-data rotate --assistant <DSH_HOME>/assistant --operating <DSH_HOME>/assistant-operating --older-than <days> [--apply]` 默认只列候选；`--apply` 才把超过天数的 `audit/approvals.jsonl`、房间 archive、`operations-archive.jsonl` 整体移到 `<root>/archive-maintenance/<stamp>/`，并写 `audit/maintenance.jsonl`。不做自动轮转、不按 JSONL 行删。

**旧回执分页**：桌面活动流最近窗口之外，`GET /api/assistant/operating-receipts?before=<ISO>&limit=<n>` 从状态与归档分页返回 receipt；客户端「加载更早账本」消费它，不复制业务状态。

**升级/卸载**：装新 tarball 不动用户数据；`--dump-config` 仍应有 `preset-assistant`，新会话验证一次。升级/remove 保留两个插件目录；remove 后重装回到组合。`pnpm upgrade-smoke` 证明“旧→新→remove”的两目录边界与组合恢复；真实旧字节的读取由 `tests/host/old-home-compat.spec.ts` 的冻结 v19 fixture 证明（房间、技能、提案、用量、手册迁移、账本回执）。

**格式兼容政策**：

- 房间 frontmatter **只增可选字段**；新增必填字段或改语义必须先写迁移，再改校验。旧文件读不懂时由 `curate` 报 `unreadable-file`/`page-unreadable`，不静默跳过。
- 手册按 generation 迁移：只替换已知的精确旧段落并盖**实际达到的**版本戳（v15 只到 v20 就标 v20，不冒充 v21）；匹配不到的旧手册不重写，prompt 段末尾带 generation warning，`curate` 报 `manual-stale-scaffold`。更老的手册用 `assistant-data refresh-manual --yes` 备份后再生。
- 账本 v1 只增字段：`operationCount` 缺失时按当前操作数回填；旧 `ledger.json` 首次写入时压缩；归档行按 `operationId` 去重，状态副本优先。
- bundle manifest `schemaVersion` 是**包格式**版本，不是房间内容版本；不匹配拒绝导入。
- 不在安装时静默重写用户数据；迁移要么可重复、可校验，要么 fail loud。

## 四、证据 owner

回归资产与命令按 [testing.md](testing.md) 的**一页证据地图**；本文件不维护第二张表。直接入口：
交接扫描 = [`handoff-core.spec.mjs`](../packages/dsh-smart-assistant/tests/tooling/handoff-core.spec.mjs) + `release-smoke`/`export-dist` 对真实 tarball；导出/导入/状态/诊断 = [`assistant-data.spec.mjs`](../packages/dsh-smart-assistant/tests/tooling/assistant-data.spec.mjs) + `release-smoke` 的 installed roundtrip；旧 home 读取 = [`old-home-compat.spec.ts`](../packages/dsh-smart-assistant/tests/host/old-home-compat.spec.ts)；账本归档 = [`operating-ledger-archive.spec.ts`](../packages/dsh-smart-assistant/tests/host/operating-ledger-archive.spec.ts)；升级/卸载 = `pnpm upgrade-smoke`；独立启动 = `pnpm standalone-smoke`；Web 选择 = `pnpm agent-preset-ui '<URL>'`（需运行中的干净实例）。
