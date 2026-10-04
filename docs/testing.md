# testing.md —— 测试面合同（当前 · 只写现在）

> 本文件拥有**测试面合同**：证据形态分层、插件证据五台阶、政策条款、已定姿态与升级触发条件。
> 命令 owner = 根 `AGENTS.md` 命令表；决策理由与输掉的方案 =
> `notes/implemented/2026-10-04-test-strategy-adoption.md`；机制分层表 = `discipline.md` 六层反馈（不复制）。
> 执行细则（改动面→最小证据的逐面表）= `.agents/skills/pre-push-evidence/`（本文不复制）。

## 证据形态分层（改什么 → 什么必须绿）

| 改动面 | 证据 | 家 |
|---|---|---|
| 纯核 / 存储词汇 / 检索排序 | 单元 spec | `packages/dsh-smart-assistant/tests/*.spec.ts` |
| 导出形态 / 组合行身份 | 台阶一守卫（现读 patch，新行自动被扫） | `tests/export-shape.spec.mjs` |
| 注册贡献的撤销 | 生命周期守卫（新注册面同 diff 加用例） | `tests/registry-lifecycle.spec.ts` |
| 组装后的组合（服务/段落/工具 scope） | 真实组合测试（真 Loader + built lib + 站立挂载；需 `pnpm build`） | `tests/preset-composition.spec.ts` |
| web 渲染面（首开/座位/文案） | 期望比对（隔离 home 真渲染，DOM 证据 diff） | `snapshots/web-face/` + `pnpm web-expected` |
| 行为地板 / 领域质量 | `pnpm eval`（判决读会话日志）/ `eval:domain`（人判） | `dev/eval/` |
| 发布物 / 依赖 / preset 包装 | `pnpm release-smoke`；真模型冒烟 `pnpm loop-probe`；keyless 回放 `dev/preset-runner-replay.patch.yml` | `scripts/release-smoke.mjs` |

## 插件证据五台阶（加 preset 行 / 工具 / client 面时逐级对表）

| 台阶 | 本仓样板 | 何时必须 |
|---|---|---|
| ① 导出形态（无 default + unwrapExports 往返 + name=行 id） | `tests/export-shape.spec.mjs` | 每 patch 行（现读，自动覆盖） |
| ② 行为 spec（真依赖，只 stand-in 最外层包装） | 各 `tests/*.spec.ts` | 每个行为改动 |
| ③ 注册生命周期（dispose 即撤销 + 可重挂） | `tests/registry-lifecycle.spec.ts` | 每个新注册面 |
| ④ 真实组合（真 Loader 读真 yml，hand-built 不算数） | `tests/preset-composition.spec.ts` | 每个新 preset 行（OWN_ROWS 增行） |
| ⑤ 组装转录（录制会话 keyless 回放） | 未建——触发条件 owner：`snapshots/README.md` | 触发未到，不预建 |

## 政策条款（禁令，无例外）

- **mock 白名单 = LLM / 网络 / 时钟**；边界下游全真——手搭替身证明桥在动字节，证明不了产品行为。
- **hand-built `ctx.plugin(...)` 不算组装证据**；组装语义必须经真 Loader boot 真配置。
- **禁对 agent 自报的关键词探测**：断言落在会话日志、文件系统、注册表状态等外部事实。
- **单跑才绿 = spec 自身缺陷**，不是 runner 不稳；资源自己获取、afterEach 自己清。
- **禁掩盖修法**：加 sleep、加 retry、弱化断言、全文件串行都不是修法；等显式就绪状态，timeout 只界定等待。
- **新守卫必须 prove-it-red**：造回归、看红、还原，才许报绿（verify 检查的负例夹具：`tests/verify-gates.spec.mjs`）。
- **测试描述行为**：行为命题命名；client spec 文件头 docstring 逐条列验收点。
- **scoped 注册的断言必须带 scope key**（与 createScope 同一引用对象）；`assemble({ scope })` 可免 agent 栈。

## 命名法：后缀即层（"跑哪层 / 进没进 regression"的共同词汇）

| 文件形态 | 层 | 命令 | 进 regression 的方式 |
|---|---|---|---|
| `tests/*.spec.{ts,mjs}` | 单元 / 合同 / 守卫（含导出与生命周期守卫） | `pnpm test`（全量，每次收尾必绿） | 行为改动同 diff 更新对应 spec |
| `tests/*harness.ts` | 共享夹具——刻意不被任何 include 选中 | — | — |
| `snapshots/web-face/<场景>/` | web 渲染期望（场景目录 = snapshot.yml + 契约 README + expected.dom.json；脚本门，非 vitest） | `pnpm web-expected` | web 可见面改动：过目 diff 后 `--refresh` |
| `*.e2e.ts`（预留） | 真模型车道，无 key 自跳 | 未建 | 触发条件 owner：`snapshots/README.md` |
| `*.snapshot.ts`（预留） | session 回放驱动 | 未建 | 同上 |
| `*.bench.ts` / `*.perf.ts`（预留） | 性能门（独占）/ 手动诊断 | 未建 | 第一处性能回归实证后立案 |

期望文件一律叫 `expected`，不叫 `golden`（上游"命名即所有权"门的口径）；新增测试资产形态先入本表再落文件。

## 已定姿态与升级触发

- **coverage**：新文件 per-file 100%，存量祖父豁免；先纪律后机器门（触发：第一处"删了才对"的死代码实证）。
- **eval 节奏**：模型可见切片收尾 `--only` 聚焦跑，阶段收尾才全量。
- **session 回放快照**：未建，触发条件 owner：`snapshots/README.md`（web 面期望已建，同树）。
- **子进程 loader-smoke 中间层 / CI 矩阵**：刻意不采纳；触发条件见 implemented note（2026-10-04）。
