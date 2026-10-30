---
topic: 技术
intent: "从源码核对测试层级和验证车道，没跑过的不写成绿。"
---

# Repo test-asset audit：可导航的测试层级、运行时与验证车道

> 基线：`36f1f00d834ba931d10f0d728b7cabeca6beee9e`（2026-10-05）。本文件只记录源码可核验的能力、路径假设与建议；没有在本轮启动全量 Vitest、live model、Web 服务或 `pnpm eval`。
>
> 证据词义：**源码支持**表示文件/配置明确提供了某能力；**执行观察**只表示该命令确实被本轮父 agent 执行并报告结果。未执行不写成绿证据。

## 结论摘要

- 测试入口只有插件包内的 [`packages/dsh-smart-assistant/tests/`](../../../../packages/dsh-smart-assistant/tests/)，仓库根没有 `tests/`。包脚本只有 `vitest run`，默认由 [`vitest.config.ts`](../../../../packages/dsh-smart-assistant/vitest.config.ts#L103-L113) 装载 Vitest；类型门是单独的 [`tsconfig.test.json`](../../../../packages/dsh-smart-assistant/tsconfig.test.json#L1-L23)。因此导航应以“包测试树 + owning scripts + snapshots 场景”描述，不能把文档中省略包前缀的 `tests/foo` 误读为根目录路径。
- 当前 43 个 `*.spec.*` 测试文件加一个共享夹具 [`client-harness.ts`](../../../../packages/dsh-smart-assistant/tests/client-harness.ts)，不是 43 个同质单元：它们覆盖纯核、临时目录上的服务合同、注册生命周期、组合身份/Loader、经典脚本 client 面，以及脚本门禁的纯核夹具。把目录按层重排可以提高可导航性，但不能改变后缀车道或默认 Vitest 发现语义。
- 真实组合测试读取包根 shipped `cordis.patch.yml` 的 `preset-assistant` 行，筛出本包 agent rows，再以真 Loader、built `lib/` 和 standing mount 组装；它明确证明本包组合 seam，不声称覆盖 vendor rows 或完整产品 boot。缺 `lib/index.js` 会直接失败，并提示先运行 `pnpm build`。`test:composition` 将 build 固定在组合入口前。
- `pnpm verify` 的 test-asset 检查递归扫描包测试树；`fixtures/` 与 `support/` 容器内容豁免。`verify-gates.spec.mjs` 含嵌套非法资产的红例，以及嵌套 fixture harness 的正例；旧的一层扫描在该红例上实际失败。
- Web 期望比较默认只指向 `blank-first-open`，场景契约的 `snapshot.yml` 是给人/脚本的声明，不会自动遍历所有场景：runner 默认场景在 [`webui-expected.mjs`](../../../../scripts/webui-expected.mjs#L43-L55)，第二场景必须显式 `--scenario` 并使用其 readiness token [`first-open-draft-banner/snapshot.yml`](../../../../snapshots/web-face/first-open-draft-banner/snapshot.yml#L3-L8)。
- `pnpm eval` 是串行真实 preset 会话、从 session log 判决的行为地板；它支持 `--only` 精确选题，并且无新 session log 会失败 [`dev/eval/run.mjs`](../../../../dev/eval/run.mjs#L66-L109) [`dev/eval/run.mjs`](../../../../dev/eval/run.mjs#L215-L246)。`eval:domain` 是真人打分材料，不是自动质量门；它支持 `--only`/`--limit`，默认逐题隔离 `deliverables/`，并保留重试原因 [`dev/eval/domain-run.mjs`](../../../../dev/eval/domain-run.mjs#L14-L20) [`dev/eval/domain-run.mjs`](../../../../dev/eval/domain-run.mjs#L348-L375)。
- keyless replay 目前是 dev patch 驱动的真实组合/日志探针，不是 session snapshot runner：[`preset-runner-replay.patch.yml`](../../../../dev/preset-runner-replay.patch.yml#L1-L32) 明确要求禁用真实 adapter、使用 `overrideFile` 裸 `ReplayEntry[]`，并记录把裸脚本塞进 `file` 会静默不激活、真实模型仍可能回答的失败模式 [`preset-runner-replay.patch.yml`](../../../../dev/preset-runner-replay.patch.yml#L16-L30)。这应保持为调试/组合探针，直到 snapshots 的 session replay 触发条件真正满足。

## 1. 当前测试资产全量分组（无测试消失）

以下 43 个 spec 文件恰好覆盖当前 `packages/dsh-smart-assistant/tests/` 的 `*.spec.ts`/`*.spec.mjs`；同目录另有共享夹具 [`client-harness.ts`](../../../../packages/dsh-smart-assistant/tests/client-harness.ts)，按约定不被 include 选中。

### 1.1 domain vocabulary / rules（可快速按 feature 运行，部分带 IO）

- frontmatter：[`frontmatter.spec.ts`](../../../../packages/dsh-smart-assistant/tests/frontmatter.spec.ts)、memory record：[`record.spec.ts`](../../../../packages/dsh-smart-assistant/tests/record.spec.ts)、research thread：[`thread.spec.ts`](../../../../packages/dsh-smart-assistant/tests/thread.spec.ts)。
- recall/ranking：[`recall.spec.ts`](../../../../packages/dsh-smart-assistant/tests/recall.spec.ts)、knowledge page/link vocabulary：[`knowledge-page.spec.ts`](../../../../packages/dsh-smart-assistant/tests/knowledge-page.spec.ts)、bulk-ingest planning：[`knowledge-ingest.spec.ts`](../../../../packages/dsh-smart-assistant/tests/knowledge-ingest.spec.ts)。
- digest rendering：[`digest.spec.ts`](../../../../packages/dsh-smart-assistant/tests/digest.spec.ts)、home curation core：[`health.spec.ts`](../../../../packages/dsh-smart-assistant/tests/health.spec.ts)、skill-file grammar/rendering：[`skill-file.spec.ts`](../../../../packages/dsh-smart-assistant/tests/skill-file.spec.ts)、web branding value generation：[`web-branding.spec.ts`](../../../../packages/dsh-smart-assistant/tests/web-branding.spec.ts)。

这些文件主要直接 import `src/**`，并以确定性对象断言排序、词汇、解析、预算与形状；它们不证明 Loader 组合或浏览器渲染。其中 [`skill-file.spec.ts`](../../../../packages/dsh-smart-assistant/tests/skill-file.spec.ts#L74-L108) 还以临时目录检验写入/扫描，属于 domain 合同而非纯函数测试。各文件在本清单按主要 interface 唯一归组，文件内部可能跨依赖层；目录标签不抹掉真实 IO。

### 1.2 storage / service contracts（真 Cordis + 临时 home）

- home substrate：[`room.spec.ts`](../../../../packages/dsh-smart-assistant/tests/room.spec.ts)、[`layout.spec.ts`](../../../../packages/dsh-smart-assistant/tests/layout.spec.ts)、[`root-files.spec.ts`](../../../../packages/dsh-smart-assistant/tests/root-files.spec.ts)。
- knowledge lifecycle：[`knowledge-curation.spec.ts`](../../../../packages/dsh-smart-assistant/tests/knowledge-curation.spec.ts)、[`knowledge-retrieval.spec.ts`](../../../../packages/dsh-smart-assistant/tests/knowledge-retrieval.spec.ts)、[`knowledge-write.spec.ts`](../../../../packages/dsh-smart-assistant/tests/knowledge-write.spec.ts)、[`knowledge-import-write.spec.ts`](../../../../packages/dsh-smart-assistant/tests/knowledge-import-write.spec.ts)。
- skills lifecycle/health：[`skill-usage.spec.ts`](../../../../packages/dsh-smart-assistant/tests/skill-usage.spec.ts)、[`skill-shadow.spec.ts`](../../../../packages/dsh-smart-assistant/tests/skill-shadow.spec.ts)、[`skill-audit.spec.ts`](../../../../packages/dsh-smart-assistant/tests/skill-audit.spec.ts)、[`skill-snapshot.spec.ts`](../../../../packages/dsh-smart-assistant/tests/skill-snapshot.spec.ts)、[`skill-proposals.spec.ts`](../../../../packages/dsh-smart-assistant/tests/skill-proposals.spec.ts)、[`skill-retirement.spec.ts`](../../../../packages/dsh-smart-assistant/tests/skill-retirement.spec.ts)。
- service/prompt behavior：[`service-shadow-access.spec.ts`](../../../../packages/dsh-smart-assistant/tests/service-shadow-access.spec.ts)、[`digest-prewarm.spec.ts`](../../../../packages/dsh-smart-assistant/tests/digest-prewarm.spec.ts)、[`digest-budget.spec.ts`](../../../../packages/dsh-smart-assistant/tests/digest-budget.spec.ts)、[`park-contract.spec.ts`](../../../../packages/dsh-smart-assistant/tests/park-contract.spec.ts)、[`maintenance-metronome.spec.ts`](../../../../packages/dsh-smart-assistant/tests/maintenance-metronome.spec.ts)。

共同假设是测试自己创建 `mkdtemp` home 并在 afterEach 清理；例如 [`knowledge-write.spec.ts`](../../../../packages/dsh-smart-assistant/tests/knowledge-write.spec.ts#L16-L29) 用真 `AssistantMemory`/`Context`，而 [`room.spec.ts`](../../../../packages/dsh-smart-assistant/tests/room.spec.ts#L15-L23) 直接测 Room 文件适配器。这里适合按 feature 选择，但跨 feature 的 `src/index.ts` service 变更仍应跑完整包 suite。

### 1.3 runtime / composition / registration

- bundle export 与 row identity：[`export-shape.spec.mjs`](../../../../packages/dsh-smart-assistant/tests/export-shape.spec.mjs)。它复用 [`gen-catalog.mjs`](../../../../scripts/gen-catalog.mjs) 的 `parseRows`，对 function plugin 要求无 default、`unwrapExports` 往返、`name=id`，host 行则要求 Service default [`export-shape.spec.mjs`](../../../../packages/dsh-smart-assistant/tests/export-shape.spec.mjs#L14-L29) [`export-shape.spec.mjs`](../../../../packages/dsh-smart-assistant/tests/export-shape.spec.mjs#L64-L115)。
- registration disposal/re-mount：[`registry-lifecycle.spec.ts`](../../../../packages/dsh-smart-assistant/tests/registry-lifecycle.spec.ts)、OpenViking shield：[`ov-shield.spec.ts`](../../../../packages/dsh-smart-assistant/tests/ov-shield.spec.ts)。前者用真 registry、scope key 与 `scope.dispose()`，后者以 parent registry + child scope 证明 deny/shadow 状态。
- preset skill root path: [`preset-skill-root.spec.ts`](../../../../packages/dsh-smart-assistant/tests/preset-skill-root.spec.ts)，真实 Loader + standing mount + joined agent：[`preset-composition.spec.ts`](../../../../packages/dsh-smart-assistant/tests/preset-composition.spec.ts)。两者都从包根 `cordis.patch.yml` 的 shipped 配置取值；组合 spec 只筛本包 agent rows，避免把 vendor host 依赖冒充本包覆盖。

### 1.4 client / interaction (classic-script browser face)

- loader registration/brand/slot contract：[`client-brand.spec.ts`](../../../../packages/dsh-smart-assistant/tests/client-brand.spec.ts)。
- first-mile hero/dock/approval seats：[`client-first-mile.spec.ts`](../../../../packages/dsh-smart-assistant/tests/client-first-mile.spec.ts)。
- panel rendering and state transitions without a browser DOM：[`client-panels.spec.ts`](../../../../packages/dsh-smart-assistant/tests/client-panels.spec.ts)。
- slash/plus room commands：[`client-commands.spec.ts`](../../../../packages/dsh-smart-assistant/tests/client-commands.spec.ts)。
- shared facade/materialization harness：[`client-harness.ts`](../../../../packages/dsh-smart-assistant/tests/client-harness.ts#L20-L57)。

这些 client specs 把 `__ModuleLoader__` facade 先装好，再把 classic-script registration factory 用 React shim materialize；因此它们能证明注册、组件树、回调与依赖声明，但不等于真实 web boot。源码的 classic-script 约束与 emitted `lib/client/index.js` 解析检查由 [`verify.mjs`](../../../../scripts/verify.mjs#L193-L233) 另行持有。

### 1.5 tooling / guard / evaluator cores

- verify gate fixtures：[`verify-gates.spec.mjs`](../../../../packages/dsh-smart-assistant/tests/verify-gates.spec.mjs)。它将 gate core 置于 throwaway directories/repos，要求新 gate 同 diff 做 red control；scripts 规则明确此责任 [`scripts/AGENTS.md`](../../../../scripts/AGENTS.md#L6-L13)。
- eval verdict core：[`eval-checks.spec.mjs`](../../../../packages/dsh-smart-assistant/tests/eval-checks.spec.mjs)。它证明 lying/no-tool、missing skill、desk write/shape 等判决会红，但不启动模型。
- intent usage parser：[`usage-report.spec.mjs`](../../../../packages/dsh-smart-assistant/tests/usage-report.spec.mjs)。
- pin bookkeeping and sync argument core：[`sync-bookkeeping.spec.mjs`](../../../../packages/dsh-smart-assistant/tests/sync-bookkeeping.spec.mjs)。
- catalog parser/extractor: [`catalog.spec.mjs`](../../../../packages/dsh-smart-assistant/tests/catalog.spec.mjs)。
- DOM evidence compare core：[`webui-expected-core.spec.mjs`](../../../../packages/dsh-smart-assistant/tests/webui-expected-core.spec.mjs)，而真 Chrome/CDP capture 属于脚本车道，不是 Vitest。

## 2. Discovery、配置与路径假设

### 2.1 Vitest 与 TypeScript 是两条不同发现链

- [`packages/dsh-smart-assistant/package.json`](../../../../packages/dsh-smart-assistant/package.json#L78-L82) 的 `test` 仅是 `vitest run`；根 [`package.json`](../../../../package.json#L21-L24) 通过 pnpm filter 委派。未声明 include/exclude 的 Vitest 默认发现规则因此是当前 source affordance；本仓自定义 config 主要做 alias。
- [`vitest.config.ts`](../../../../packages/dsh-smart-assistant/vitest.config.ts#L1-L23) 从根 `tsconfig.tsx.json` 解析 DSH source aliases，且注释记录 vendor `lib/` 可能 stale，所以普通 spec 走 vendor source，不应把这一点和 composition 的 built package 混为一谈。
- [`tsconfig.test.json`](../../../../packages/dsh-smart-assistant/tsconfig.test.json#L1-L23) include `src` 与 `tests`，但 `paths:{}` 强制 `@deepseek-ai/*` 从 workspace node_modules 的 built declarations 解析；根 `typecheck` 的项目引用负责 vendor source API 漂移。搬动测试时必须保留相对 src import、`tsconfig.test.json` include 覆盖与 Vitest include 覆盖三者一致。
- `*.spec.{ts,mjs}` 与 `*harness.{ts,mjs}` 是合同形态；其它形态必须先写入 [`docs/testing.md`](../../../../docs/testing.md#L41-L52)，再改 gate。共享夹具不得 import spec [`packages/dsh-smart-assistant/tests/AGENTS.md`](../../../../packages/dsh-smart-assistant/tests/AGENTS.md#L6-L22)。

### 2.2 测试/脚本/快照的消费者不是同一根目录

- tests 里的脚本 spec 用 `../../../scripts` 或 `../../../dev`，例：[`eval-checks.spec.mjs`](../../../../packages/dsh-smart-assistant/tests/eval-checks.spec.mjs#L6-L12)；如果把 tests 挪到更深层级，所有这些相对路径都必须同步改，且 `import.meta.dirname` 的 throwaway runner fixture 也要复核 [`verify-gates.spec.mjs`](../../../../packages/dsh-smart-assistant/tests/verify-gates.spec.mjs#L125-L170)。
- `export-shape.spec.mjs` 用 `packageRoot = tests/..` 读取包 patch、dev patch 并从 row name 推导 `src/<sub>/index.ts` [`export-shape.spec.mjs`](../../../../packages/dsh-smart-assistant/tests/export-shape.spec.mjs#L42-L56)。`preset-skill-root.spec.ts` 和 composition spec 也从 `tests/..` 推包根；移动必须集中修 path helper，不能只改 runner include。
- [`scripts/verify.mjs`](../../../../scripts/verify.mjs#L496-L497) 调 `testAssetNamingProblems(repoRoot)`；core 递归检查 `packages/dsh-smart-assistant/tests`，并对 `fixtures/`、`support/` 子树豁免。web-face 仍遍历场景目录并要求 `snapshot.yml` + `README.md` [`verify-checks.mjs`](../../../../scripts/verify-checks.mjs#L818-L833)。
- [`scripts/gen-catalog.mjs`](../../../../scripts/gen-catalog.mjs#L238-L253) freshness 只比较 generated catalog；它不会证明 test files 被发现。`pnpm verify` 本身先跑 gen-paths/gen-catalog、eval self-check、desk-loop self-check、domain self-check，再跑 verify gate [`package.json`](../../../../package.json#L21-L25)，所以“verify 绿”不等于“Vitest suite 绿”。

## 3. False-green / false-confidence 账本

### 3.1 built lib stale 或缺失

普通 tests 通过 Vite aliases 读 vendor source，但真实组合显式 import 本包 `lib/index.js` / `lib/knowledge-approve-remote/index.js` 并 symlink 安装形状 [`preset-composition.spec.ts`](../../../../packages/dsh-smart-assistant/tests/preset-composition.spec.ts#L74-L125)。包 owner 也明写：改模型可见面须 build，composition/release-smoke 消费 `lib/`，不 build 会拿旧行为 [`packages/dsh-smart-assistant/AGENTS.md`](../../../../packages/dsh-smart-assistant/AGENTS.md#L41-L48)。因此：

1. 任何涉及 exports、preset row、工具面、model-visible 或发布物的选择器先 `pnpm build`；
2. 再跑 composition / release smoke；
3. 报告必须列出 build 是否执行，不能只列 `vitest`。

组合 spec 对缺 `lib/index.js` 直接抛出失败，并给出 `pnpm build` 前置提示；vendor boot 同样要求 prepare 产物，因为 `--dump-config`/`--help` 不加载 lib [`dev/prepare.sh`](../../../../dev/prepare.sh#L10-L15)。

### 3.2 subset composition 与 hand-built rows

组合 spec 只安装从 shipped `preset-assistant` 行筛出的本包 agent rows；host、companion、vendor rows 由各自组合/发布车道负责。因此它是本包组合 seam 的深测试，不是完整产品 boot；完整 patch 的行身份由 catalog、export-shape 和 release-smoke 分担。

### 3.3 skip、subset、domain 人判与 regex

- composition 缺 built lib 会自 skip；运行器如果只看 exit code，可能遗漏 skipped test。
- `eval --only` 明确只跑指定 task；无匹配返回 exit 2 [`run.mjs`](../../../../dev/eval/run.mjs#L224-L229)。选择性运行适合窄验证，但不能替代阶段全量。
- `eval:domain` 生成给人打分的 sheet；机器只填观测，质量由人判 [`domain-run.mjs`](../../../../dev/eval/domain-run.mjs#L133-L180)。它不是自动 pass/fail 质量门。
- eval 的 `answer-matches` 是 regex，源码承认可能 lucky phrase；`no-write-tools`/`no-git-commit` 是伤害地板，不判推理质量 [`checks.mjs`](../../../../dev/eval/checks.mjs#L1-L13)。
- replay 的正确性不能以回复文字或 `replayState` 自报判断；应读 session log 请求侧 system/tools。patch 头注明确错误 `file` 形状会让行不 activate、真实 adapter 仍接住请求 [`preset-runner-replay.patch.yml`](../../../../dev/preset-runner-replay.patch.yml#L16-L30)。

### 3.4 Web preflight、DOM expected、interaction probe 各自证明什么

- `preflight` 证明 auth/boot graph/Remote manifest 与 desk readiness；Remote namespace 不在 manifest 会 pending，且 desk 检查必须指向服务实际 home [`webui-preflight.mjs`](../../../../scripts/webui-preflight.mjs#L185-L225)。它不证明 DOM 渲染。
- `shots`/`web-expected` 才拍 DOM；expected runner 只检查一个显式场景，缺 expectation 先失败，capture 失败或 DOM 不可读也失败 [`webui-expected.mjs`](../../../../scripts/webui-expected.mjs#L55-L104)。PNG 是人工审阅副页，DOM JSON 是机器 diff。
- `loop-probe --ask` 真建 session、可能真调模型，且目标应是一次性 home；它证明首屏 + 真发送/回复闭环，不适合作为每次纯核回归 [`webui-loop-probe.mjs`](../../../../scripts/webui-loop-probe.mjs#L20-L35)。
- 当前两个 web scenes 是 `blank-first-open` 与 `first-open-draft-banner`；后者的 seed 必须分 boot 前 patch 和 boot 后 desk 文件两步，且 `--wait-text` 是就绪条件，不是固定 sleep [`first-open-draft-banner/README.md`](../../../../snapshots/web-face/first-open-draft-banner/README.md#L22-L49)。

### 3.5 Replay fixture 与发布冒烟的能力范围

现有 dev replay 资产是三份裸 `ReplayEntry[]`：[`llm-replay-fixture.json`](../../../../dev/llm-replay-fixture.json) 只给固定文本，适合读取请求组装；[`llm-replay-fixture-session-search.json`](../../../../dev/llm-replay-fixture-session-search.json#L1-L34) 固定调用 `session_search(query=pin)`，随后返回文本；[`llm-replay-fixture-schedule-create.json`](../../../../dev/llm-replay-fixture-schedule-create.json#L1-L18) 固定调用 `schedule_create(after_seconds=3600)`，会在目标 home 创建状态。后二者证明真实工具接线/持久化时，须检查 tool result 与对应状态，不能把固定 reply 当模型自主选工具的证据。默认脚本与替换环境变量由 [`preset-runner-replay.patch.yml`](../../../../dev/preset-runner-replay.patch.yml#L31-L56) 消费，搬动 fixture 必须同步默认 `process.cwd()` 拼接路径和文档。

[`release-smoke.mjs`](../../../../scripts/release-smoke.mjs#L77-L123) 现场 pack、检查 tarball 必需入口/peer ranges、在 throwaway home 安装并读取真实组合；默认 harness 是 vendor source + tsx。它的 keyless 分支证明安装及配置形状，真实模型回合在缺 `DEEPSEEK_API_KEY` 时自跳过 [`release-smoke.mjs`](../../../../scripts/release-smoke.mjs#L164-L169)。因此 smoke exit 0 并不证明 preset 的实际运行回合；发布物迁移至少还需要干净 build、tarball 的所有公开 exports 可解析，以及 keyless 真 preset probe 的日志证据。

## 4. 保守的可导航层级与选择策略（不新增框架/门）

### 4.1 先保留车道，后做目录

建议的导航树（仅作为 backlog 计划的目标形状，**本轮不搬文件**）：

```text
packages/dsh-smart-assistant/tests/
  pure/          # 可选：domain vocabulary / deterministic render / ranking
  storage/       # Room + temp-home + AssistantMemory service contracts
  runtime/       # Loader, export identity, registry lifecycle, standing-mount composition
  client/        # classic-script facade, panels, commands, interaction contracts
  tooling/       # verify/eval/catalog/sync/DOM compare cores
  client-harness.ts  # shared adapter, remain a harness shape
```

但不应一次性引入新 Vitest projects、coverage gate、e2e/snapshot suffix 或第二个 runner：当前合同明确 `*.spec.*` 是同一 Vitest lane、web scenes 是脚本 lane、`e2e`/`snapshot`/`bench` 仍未建 [`docs/testing.md`](../../../../docs/testing.md#L41-L59)。最小搬迁步骤应是：

1. 先让 `testAssetNamingProblems` 递归检查已允许的子目录，并在 [`verify-gates.spec.mjs`](../../../../packages/dsh-smart-assistant/tests/verify-gates.spec.mjs) 造“嵌套违规文件”红夹具；
2. 更新 tests tree 的 owner 规则与 source links；
3. 移动一个 feature slice，修所有 `../src`、`../../../scripts`、`import.meta.dirname`、`packageRoot` 假设；
4. 用默认 `vitest run` 验证新旧发现集合相等，再按 feature/layer 选择；
5. 最后才移动剩余文件，保留同一包脚本与同一 `tsconfig.test.json`。

### 4.2 选择矩阵：feature 先窄，layer 再补全

| 改动/问题 | 首选窄集 | 必要补强 | 不应误称为已证明 |
|---|---|---|---|
| frontmatter / memory / research / recall / knowledge pure | 对应 pure spec（如 `frontmatter`、`record`、`thread`、`recall`、`knowledge-page`） | `pnpm typecheck`；若经 service 写盘，再补对应 storage spec | 不证明 Loader/preset |
| home layout / room / file persistence | `layout` + `room` + 目标 service spec | `health`/`root-files`（若 digest/curate 受影响） | 不证明 web DOM |
| skill lifecycle / proposals / audit / retirement | 对应 skill specs | `health`；若 prompt/tool visible，补 runtime + eval `--only` | 不证明真人领域质量 |
| digest / prompt text / persona / tool descriptions | target pure/service specs | `pnpm build` + `preset-composition` + relevant `pnpm eval -- --only <id>`；需要请求侧时 replay/live probe | 普通 Vitest 不证明 built lib 或真实请求 |
| patch row / export / dependency / package wrapper | `export-shape` + `catalog` | `pnpm gen-catalog`、`pnpm build`、`pnpm release-smoke` | `preset-composition` 覆盖本包筛选的 shipped agent rows；四个 dev runner patch 由 `export-shape` 递归解析 |
| registration / scope / tool or prompt contribution | `registry-lifecycle` + relevant runtime spec | full package suite when shared registration changes | global registry view 不等于 scoped view；必须用同一 scope key |
| client classic script / slots / panels / commands | `client-brand` + `client-first-mile` + `client-panels` + `client-commands`（整个 client 面） | two `web-expected` scenes in isolated home; `preflight` before handoff | client shim 不等于 real web boot |
| verify/generator/eval parser | target tooling spec + its red fixture | `pnpm verify` | self-check alone 不证明 real session |
| session assembly “只有跑起来才看得出” | keyless replay patch + request-side log inspection | only when trigger says to build session snapshots; no speculative new lane | fixed reply text/replay metadata 不证明 adapter takeover |

### 4.3 收尾证据仍按现有契约

当前合同把纯核/存储/检索交给 package specs，把组合交给 built-lib real composition，把 web 渲染交给 isolated-home DOM expected，把行为地板交给 eval，把发布物交给 release-smoke [`docs/testing.md`](../../../../docs/testing.md#L8-L18)。因此 backlog plan 应把 `typecheck && test && verify` 作为通用底线，把 build/release/web/eval 作为改动面触发，不把“全量跑一切”写成默认门。

## 5. 窄命令与实际执行边界

**源码支持的窄命令**：

```sh
pnpm --filter dsh-smart-assistant exec vitest run tests/knowledge-write.spec.ts tests/recall.spec.ts
```

**执行观察（父 agent 本轮执行，非本审计子代理亲跑）**：该命令在基线返回 `2 files 15 tests pass`、约 `930ms`、exit `0`。父 agent 另执行 `pnpm --filter dsh-smart-assistant exec vitest list --filesOnly`，成功列出 43 个 spec、未收共享 harness，与本清单 43 个唯一条目一致。这证明当前发现集合与窄选择可用。父 agent 收尾另跑 `pnpm typecheck && pnpm test`，exit 0，43 文件/366 断言全部通过、无 skipped；typecheck 内含 tsc build，此次组合 spec 在产物在位下通过。它仍不证明完整 shipped YAML、全部安装出口、web expected 或 eval。

其它可选入口均有不同前提：`pnpm test` 运行包 Vitest 全量；`pnpm typecheck` 还会检查 tests 工程；`pnpm verify` 包含 evaluator/domain/desk self-check 与机械 gate；`pnpm eval -- --only <id>` 会启动真实 preset session，不应在本审计中运行；`pnpm web-expected`/`loop-probe` 需要已启动 URL，后者 `--ask` 可能触发真实模型。命令所有者与启动顺序见根 [`AGENTS.md`](../../../../AGENTS.md#L79-L102) 和 [`docs/dev.md`](../../../../docs/dev.md#L80-L102)。

## 6. 给 backlog/plans 的落点

1. **先做导航，不做新测试框架**：以 feature/layer 目录作为人类入口，保持 Vitest 单项目与现有 suffix；目录名是导航，不改变 regression 语义。
2. **把“discovery equivalence”列为第一验收**：移动前后记录 spec 集合；默认 `pnpm test` 与指定窄命令都能发现新路径；禁止以一个偶然通过的 subset 代替集合相等。
3. **递归门禁先行**：扩大 `testAssetNamingProblems` 的检查对象前，给 nested pass/fail fixture；否则搬目录后新文件不在命名 gate 视野里。
4. **把 built-lib 前提显式化**：composition 的自 skip 要么在计划中承认“构建前置、skip 非绿”，要么在未来单独设计 fail-loud gate；本审计不添加 speculative gate。
5. **区分四种验证语义**：pure/domain（逻辑）、storage/service（真实临时 home）、runtime/composition（Loader + scope + built lib）、interaction（classic client + real web scenes），再把 tooling/eval/replay 作为诊断和地板，不把它们混成“E2E”。
6. **session replay 暂不预建**：当前 `snapshots/README.md` 的触发条件是 prompt assembly 出现“只有跑起来才看得出”的回归，或同一 model-visible 面第三次靠手工 probe 钉回归；已有 replay patch 只作为过渡调试资产 [`snapshots/README.md`](../../../../snapshots/README.md#L22-L30)。

### 证据边界

本审计子代理没有执行全量或 live 命令；父 agent 本轮的窄 Vitest、发现列表及收尾全套结果已明确标为执行观察。源码中记录的历史“实测/成本/事故”仍是仓库作者的 rationale，不被本次审计重新宣称为本轮执行；例如 web 场景 README 的 prove-it-red 与成本台账应视为已有记录，而不是本轮新证据 [`blank-first-open/README.md`](../../../../snapshots/web-face/blank-first-open/README.md#L37-L57)。
