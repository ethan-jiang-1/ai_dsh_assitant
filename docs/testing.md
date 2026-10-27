# testing.md —— 测试面合同（当前 · 只写现在）

> 本文件拥有**本仓测试面合同**：一页证据地图、插件证据五台阶、本仓执行的政策条款、已定姿态与升级触发条件。
> 主仓测试政策的正文在 `vendor/dsh/docs/testing.md`。本文件不抄它的 coverage 门、snapshot 车道和 CI 矩阵；刻意不采纳的项在「已定姿态」与 [`discipline.md`](discipline.md)。
> 命令清单 owner = 根 `AGENTS.md` 命令表（展开细节在 `docs/dev.md` §四，不复述清单）。机制分层表 = `discipline.md` 六层反馈（不复制）。
> 执行细则（逐面判断规则与已知假绿清单）= `.agents/skills/pre-push-evidence/`（路由表主在本文「一页证据地图」，技能不复制表）。
> 路径基准：本文件中的 `tests/…` 一律**包内相对**（= `packages/dsh-smart-assistant/tests/…`），其余路径仓根相对。
>
> 入口分工：`pnpm test` 覆盖源码与服务级合同；真实 preset 装载使用 `preset-composition.spec.ts` 与 `dev/probes/session/preset-runner*.patch.yml`；浏览器交互使用 `snapshots/web-face/`。三者分别回答规则、组合、界面问题，不把 end-to-end 当作唯一理解方式。

## 一页证据地图（改什么 → 跑什么 → 回归资产在哪 → 谁能证明什么）

本表是证据路由的**唯一表主**（pre-push-evidence 技能与根 README「按问题找」链接到此，不复制）；
每个切片的**收尾地板** = `pnpm typecheck && pnpm test && pnpm verify` 全绿，本表回答的是地板之上按改动面还要加跑什么；
逐面**判断细则**与已知假绿清单 = [pre-push-evidence 技能](../.agents/skills/pre-push-evidence/SKILL.md)；目录轴的深表（目录=被测 interface）见下节。

| 改动面 | 最小证据（命令） | 回归资产的家 | 能证明 / 不能证明 |
|---|---|---|---|
| 纯核（`src/domain`：布局/词汇/检索排序/渲染） | `pnpm test:domain` | `tests/domain/*.spec` | 规则与边界正例 / 组合装载、模型可见面 |
| 服务行为（`src/host`：四房间读写、curate、根文件、品牌、旧 home、账本归档） | `pnpm test:host` | `tests/host/*.spec` + `tests/host/fixtures/old-home-v19/` | 服务级合同（真 cordis + 临时 home）、旧字节读取、账本压缩/回执 / 段落组装、装载 |
| 固定只读投影下载（独立 Host 文件，非经营 writer） | `pnpm build` → `pnpm test:host` + `pnpm test:composition`；隔离服务（`allowFixture: true`，如 `dev/probes/web/projection-fixture.patch.yml`）运行 `node dev/probes/web/desk-projection-download.mjs '<url>' dev/fixtures/desk-projection/desk-projection.json` | `tests/host/desk-projection-download.spec.ts` + `tests/composition/desk-projection-lifecycle.spec.mjs` + `dev/fixtures/desk-projection/` | 固定字节、错误/限额、真实注册撤销、默认拒绝夹具；HTTP 探针额外证明认证拒绝与 cookie 下载 / 不证明业务 schema、Client mount/断连/呈现或持久经营写 |
| **模型可见面**（工具描述 / prompt 段落 / persona / digest） | `pnpm build` → `pnpm test:composition` → **`pnpm eval --only <task-id>`**（行为判决，任务清单 `pnpm eval --list`；`repo-live-probe` 是取证非回归，见已定姿态） | `tests/agent/*.spec` + `dev/eval/` | agent spec：段落合同。eval：伤害地板、技能按名加载、回答正则（可凑巧命中）/ 段落是否进入请求、组装转录、领域质量（`eval:domain` 人判） |
| agent 面合同（段落预算 / 养护回合的合同层） | `pnpm test:agent`（真服务 + 临时 home）；改动同时触模型可见面时按上一行加链 | `tests/agent/*.spec` | 段落就绪 / 预算 / 回合占位等合同 / Loader 组装、UI 读回 |
| client 面（`src/client`：注册与交互状态） | `pnpm test`（整包套件——`entry.spec` 断言全 slot 面，加一个注册会红没打开过的 spec）+ 现有 web-face 场景（清单以 `snapshots/web-face/` 为准）→ `pnpm web-expected --scenario <场景>` | `tests/client/*.spec` + `snapshots/web-face/` | 注册、组件树、色彩契约 / 真浏览器渲染（场景期望管） |
| 导出形态 / 组合行身份 / 注册撤销 | 台阶①③守卫（现读 patch，新行自动被扫） | `tests/composition/export-shape` + `registry-lifecycle` | 行身份与生命周期 / 行为正确 |
| 组装后组合（服务/段落/工具 scope） | `pnpm build` → `pnpm test:composition` | `tests/composition/`（`preset-composition.spec` 是组装证据；同层还有导出/生命周期/遮蔽 spec） | 真 Loader 组装 / vendor rows、完整产品 boot |
| web 渲染面（首开/座位/文案） | `pnpm web-expected --scenario <场景>`（隔离 home 真渲染，场景必填；过目 diff 后 `--refresh`） | `snapshots/web-face/`（场景清单以目录为准） | 渲染期望 / 交互逻辑（client spec 管） |
| 行为地板 / 领域质量 | `pnpm eval`（`--only` 聚焦）/ `pnpm eval:continuity`（隔离 fixture 的首回合续接地板：一次性 home + 种子账本 + 前置断言 + 会话日志判据，无授权写入与账本字节不变为负例；评估器红绿对照挂 `pnpm verify`）/ `pnpm eval:domain`（人判）/ `node dev/probes/web/desk-daily-brief-live.mjs`（**web-only 任务**的驱动：`schedule_*` 只活在 web 组合里，runner 对该任务诚实报 NOT EVALUATED；探针在真模型 web 会话里跑**同一个任务**的 prompt 与 checks，并先断言 `request/header.tools` 含四个 `schedule_*`） | `dev/eval/`（任务集 `tasks.mjs`、领域题 `domain/`、续接驱动 + `dev/fixtures/eval-continuity/`）、`dev/probes/web/desk-daily-brief-live.mjs`（web-only 驱动） | 无害地板、续接行为地板与人判质量 / 机器不判质量 |
| 发布物 / 依赖 / preset 包装 / exports | `pnpm gen-catalog`（freshness）+ `pnpm build` + `pnpm release-smoke`；keyless 回放 `dev/probes/session/preset-runner-replay.patch.yml` | `scripts/release/release-smoke.mjs` | 安装形状与组合断言 / 长期行为 |
| 兼容范围边界 | `pnpm test`（`tests/tooling/compatibility-range.spec.mjs`） | 同左 | 0.2.x 放行、0.3.0 预发布/正式拒绝 / 这些版本上的真实运行（T6 矩阵） |
| pnpm 版本矩阵 | `pnpm pnpm-matrix -- --pnpm <v> --expect install|reject` | `scripts/release/pnpm-matrix.mjs` | 10.6 下界安装 + 组合、9/10.4 拒绝 / Windows、Node 24、Corepack 离线 |
| bootstrap 守卫 | `pnpm bootstrap-guards-smoke` | `scripts/release/bootstrap-guards-smoke.mjs` | 路径穿越/保留名/缺旧 pnpm/npm 在创建 home 前拒绝、victim 存活 / Windows 真机、注入式 pnpm |
| 模型可见请求（T4） | `pnpm prompt-smoke`（无 key replay one-shot；读 `system/message` + `request/header.tools`） | `scripts/release/prompt-smoke.mjs` | 四个段落与六个工具确实进入请求 / 长会话回放、话术质量 |
| 真实 DSH 兼容矩阵（T6） | `pnpm compat-matrix -- --dsh <path> --version <v> --expect install|reject` | `scripts/release/compat-matrix.mjs` | 目标 CLI 的安装/拒绝与组合 / 模型回合、全 minor 组合 |
| 升级 / 卸载的数据边界 | `pnpm upgrade-smoke`（干净 home：合成旧包→新包→remove） | `scripts/release/upgrade-smoke.mjs` | 安装/升级/remove 不碰两目录、组合恢复 / 真实历史数据的**安装**迁移（读取兼容另见下行） |
| 旧字节兼容 | `pnpm test:host` | `tests/host/old-home-compat.spec.ts` + `tests/host/fixtures/old-home-v19/` | 冻结 v19 home 的房间/技能/提案/用量/手册迁移/账本回执可读 / 0.1.0 之前的未知字节、未来版本、损坏文件 |
| 账本有界与归档 | `pnpm test:host` | `tests/host/operating-ledger-archive.spec.ts` | 压缩后 `ledger.json` 有界、归档回执可读、幂等重试、matter snapshot 合并、投影 revision 单调 / 多次崩溃/并发压缩、超大归档 |
| 安装并发/事务 | `pnpm install-resilience-smoke`（两个并发 add，最终依赖/组合断言） | `scripts/release/install-resilience-smoke.mjs` | DSH 0.2.1 的 120s profile 锁下串行化与最终状态 / 更复杂并发、跨 profile 并发 |
| 安装失败/重试 | `pnpm install-resilience-smoke [-- --dsh <path>]`（损坏 tarball + 有效重试；默认从 PATH 找 dsh） | `scripts/release/install-resilience-smoke.mjs` | 失败不残留依赖/文件，重试可恢复 / 真实网络中断、磁盘满 |
| 标准 Web 安装/升级 | `pnpm web-install-smoke -- --dsh <path> [--tarball <tgz>] [--upgrade-tarball <tgz>]`（干净 HOME/DSH_HOME；Chrome 必须） | `scripts/release/web-install-smoke.mjs` | 官方 web profile 安装、client boot、preset UI、运行中升级后重启/复验 / 真人走查 |
| 独立启动（无 `.git` 目录） | `pnpm standalone-smoke`（打包→解包→bootstrap→preflight→client boot→stop→restart） | `scripts/release/standalone-smoke.mjs` | 无 `.git` 启动、隔离 home、包内/符号链接 home 拒绝、tarball 安装带 yaml、client 真 boot、preset UI、重启 URL、搬移 home 重建 profile、损坏 profile manifest 重建 profile / 真人环境与会话内容 |
| 交接 / 数据 bundle / 诊断 / 擦除 / 手册再生 | `pnpm test:tooling` + `pnpm release-smoke`（含 installed status/check/dry-run/purge/refresh-manual/archive-proposals）+ `pnpm export-dist` | `tests/tooling/handoff-core.spec.mjs`、`assistant-data.spec.mjs`、`assistant-data-purge.spec.mjs`、`assistant-data-manual.spec.mjs`、`assistant-data-proposals.spec.mjs`、`assistant-data-rotate.spec.mjs`、`assistant-data-merge.spec.mjs`、`assistant-data-seal.spec.mjs`、`operating-receipts-route.spec.ts`、`scripts/release/handoff-*` | 扫描规则、真实 tarball、两目录往返、锁/符号链接/失败清理、`status`/`check`、`import --replace` 旁路与回滚、`--dry-run` 计划、`purge` 审计与拒绝、`refresh-manual` 备份/再生、`archive-proposals` 轮转、`rotate` dry-run/apply、`merge` 冲突报告/保守应用、`seal`/`unseal` 加密往返 / 真人数据迁移、账本历史擦除 |
| Web preset 选择 | `pnpm agent-preset-ui '<URL>'`（需运行中的干净实例） | `dev/probes/web/agent-preset-ui.mjs` | Settings → Agent 预设 → 章鱼管家 → default / 自动门禁（人工探针） |
| 仓库工具与门禁（`scripts/checks/verify.mjs` 及 checks 核、生成器） | 新检查的**红夹具**（prove-it-red）+ `pnpm verify` | `tests/tooling/<family>.spec.mjs`（门禁族 spec，与 `scripts/checks/gates/` 同名对齐） | 工具核接受/拒绝形状 / 门禁全量（verify 自身） |
| docs / notes | `pnpm verify`（断链四连/命令互证/notes 形状） | — | 结构与链接 / 语义正确（漂移审计管） |
| pin（`vendor/`） | `pnpm sync-dsh -- --tag <tag>`（自有全链，不手改） | `vendor/UPSTREAM.md` | pin 簿记与重校 / — |

## 插件证据五台阶（加 preset 行 / 工具 / client 面时逐级对表）

| 台阶 | 本仓样板 | 何时必须 |
|---|---|---|
| ① 导出形态（无 default + unwrapExports 往返 + name=行 id） | `tests/composition/export-shape.spec.mjs` | 每 patch 行（现读，自动覆盖） |
| ② 行为 spec（真依赖，只 stand-in 最外层包装） | 各 `tests/**/*.spec.{ts,mjs}`（分层表见「目录即被测 interface」） | 每个行为改动 |
| ③ 注册生命周期（dispose 即撤销 + 可重挂） | `tests/composition/registry-lifecycle.spec.ts` | 每个新注册面 |
| ④ 真实组合（真 Loader 读真 yml，hand-built 不算数） | `tests/composition/preset-composition.spec.ts`（入口：`pnpm test:composition`，先 build） | 每个新 preset 行；spec 从 shipped `preset-assistant` rows 取本包范围 |
| ⑤ 组装转录（录制会话 keyless 回放） | 未建——触发条件 owner：`snapshots/README.md` | 触发未到，不预建 |

## 政策条款（禁令，无例外）

- **mock 白名单 = LLM / 网络 / 时钟 / vendor 服务边界**；边界下游全真——手搭替身证明桥在动字节，证明不了产品行为。
- **vendor 服务边界允许声明式 stub**（白名单第四类，如 `rooms-row-wiring` 的 `sessionQuery`）：替身只出现在 vendor 边界上、边界下游全真；采用时必须在 spec 头注登记被替的边界与被测接缝。
- **hand-built `ctx.plugin(...)` 不算组装证据**；组装语义必须经真 Loader boot 真配置。
- **禁对 agent 自报的关键词探测**：断言落在会话日志、文件系统、注册表状态等外部事实。
- **单跑才绿 = spec 自身缺陷**，不是 runner 不稳；资源自己获取、afterEach 自己清。
- **禁掩盖修法**：加 sleep、加 retry、弱化断言、全文件串行都不是修法；等显式就绪状态，timeout 只界定等待。
- **新守卫必须 prove-it-red**：造回归、看红、还原，才许报绿（verify 检查的负例夹具：`tests/tooling/` 的门禁族 spec `<family>.spec.mjs`，与核的 `scripts/checks/gates/<family>.mjs` 同名）。
- **测试描述行为**：行为命题命名；client spec 文件头 docstring 逐条列验收点。
- **scoped 注册的断言必须带 scope key**（与 createScope 同一引用对象）；`assemble({ scope })` 可免 agent 栈。

## 命名法：后缀即层（"跑哪层 / 进没进 regression"的共同词汇）

| 文件形态 | 层 | 命令 | 进 regression 的方式 |
|---|---|---|---|
| `tests/**/*.spec.{ts,mjs}` | 单元 / 合同 / 守卫（含导出与生命周期守卫） | `pnpm test`（全量，每次收尾必绿） | 行为改动同 diff 更新对应 spec |
| `tests/**/*harness.{ts,mjs}` | 共享夹具——刻意不被任何 include 选中 | — | — |
| `snapshots/web-face/<场景>/` | web 渲染期望（场景目录 = snapshot.yml + 契约 README + expected.dom.json；脚本门，非 vitest） | `pnpm web-expected --scenario <场景>` | web 可见面改动：过目 diff 后 `--refresh` |
| `*.e2e.ts`（预留） | 真模型车道，无 key 自跳 | 未建 | 触发条件 owner：`snapshots/README.md` |
| `*.snapshot.ts`（预留） | session 回放驱动 | 未建 | 同上 |
| `*.bench.ts` / `*.perf.ts`（预留） | 性能门（独占）/ 手动诊断 | 未建 | 第一处性能回归实证后立案 |

期望文件一律叫 `expected`，不叫 `golden`（上游"命名即所有权"门的口径）；新增测试资产形态先入本表再落文件——由 `verify` 的 `test assets:` 门机械执行（负例夹具：`tests/tooling/` 的门禁族 spec，与核同名对齐）。

## 测试层：目录即被测 interface（双层寻址——后缀 = 车道，目录 = interface 家）

分层轴 = **被测 interface × 真实依赖半径**，不用 unit/integration/e2e 标签（同一标签下纯核与真 IO 的失败含义不同，标签回答不了"要什么前置"）。一个 spec 归最主要 interface，跨层依赖在文件头注明。渲染期望（snapshots 现有场景，真浏览器；清单以目录为准）与行为评测（eval，真模型判日志）是独立车道，不在本表。

| 目录 | 被测 interface | 依赖半径 | 能证明 | 不能证明 | 层命令 |
|---|---|---|---|---|---|
| `tests/domain/` | 领域规则与存储基础（词汇、生命周期、检索排序、摘要渲染、curate findings、布局、Room 适配器） | src 直读；临时目录文件 IO | 规则/解析/排序/预算/渲染的确定性 | 组合装载、模型可见面组装、浏览器渲染 | `pnpm test:domain` |
| `tests/host/` | 服务合同（四房间读写、curate、提案收件箱、房间落位、根文件、品牌注入） | 真 cordis Context + 临时 home | 写路径/生命周期/代理访问的服务级行为 | 段落组装（agent 层）、装载与注册（composition 层） | `pnpm test:host` |
| `tests/agent/` | agent 面合同（提示词段落、养护回合） | 真服务 + 临时 home | 段落就绪/段落预算/回合占位等模型可见合同 | Loader 组合、UI 读回；机制本体在 host 服务（文件头注明） | `pnpm test:agent` |
| `tests/composition/` | 配置装载、注册与范围合同（Loader 车道 + 直挂服务/scope 车道） | `preset-composition`/`client-entry-lifecycle`/`desk-projection-lifecycle` = 真 Loader + built `lib/`；`preset-skill-root` = shipped YAML + Loader evaluator；`export-shape` = source-plane 导出守卫；`ov-shield`/`registry-lifecycle` = 直挂真 cordis | 行身份、导出形态、注册撤销、scope 语义、本包组合 seam | vendor rows、完整产品 boot（release-smoke 的事） | `pnpm test:composition`（先 build） |
| `tests/client/` | 浏览器注册与交互状态合同 | classic-script 装置 + React shim，无浏览器 | 注册、组件树、回调、色彩契约 | 真实 web boot 与渲染（`pnpm web-expected` 现有场景，清单以目录为准） | `pnpm test:client` |
| `tests/tooling/` | 仓库工具核（verify 门禁、eval 判决、catalog 生成器、报告、DOM 比较核、包内 `ov-doctor`） | 脚本直读 + throwaway 夹具 | 工具核的接受/拒绝形状（含 prove-it-red 负例） | 真实会话/渲染/门禁全量（`pnpm verify` 的事） | `pnpm test:tooling` |
| `tests/support/` | 共享夹具（`*harness.{ts,mjs}`） | — | — | 刻意不被任何 include 选中（门禁豁免容器） | — |

失败报告先按本表分层归因再上浮：配置 / 构建物 / 领域规则 / 服务行为 / 模型回合 / UI 读回，不混称"测试挂了"。

**夹具两家**：`tests/support/`（`*harness` 共享夹具）是 **spec 的夹具家**——被 vitest spec import、按豁免容器进命名表；`tests/host/fixtures/` 是 **spec 的冻结字节夹具家**（如 `old-home-v19/`，被 spec 整树复制后读取，不 import）；`dev/fixtures/` 是**真实运行的夹具家**——探针 / 评测消费的种子账本、回放语料与固定下载资料，由一次性或隔离 home 装载，**不被 spec import**。各夹具目录自带 README（预期集合、能证 / 不能证、复跑命令）。

## 已定姿态与升级触发

- **coverage**：新文件 per-file 100%，存量祖父豁免；先纪律后机器门（触发：第一处"删了才对"的死代码实证）。
- **eval 节奏**：模型可见切片收尾 `--only` 聚焦跑，阶段收尾才全量。
- **模型可见面回归的适配声明**（DSH testing policy 对独立插件仓的适配义务）：段落合同由 agent spec 证明；`pnpm eval --only <task-id>` 证明该题的伤害地板、技能按名加载和回答正则，不证明段落已进入请求，也不证明领域质量；`repo-live-probe` 是**取证动作不是回归资产**（复现「模型没看见」时用）；session 回放维持触发条件制（触发未到不预建，owner `snapshots/README.md`）。
- **session 回放快照**：未建，触发条件 owner：`snapshots/README.md`（web 面期望已建，同树）。
- **子进程 loader-smoke 中间层 / CI 矩阵**：刻意不采纳。本仓没有 CI，也没有平台矩阵；出现它们能拦住的事故再议。
