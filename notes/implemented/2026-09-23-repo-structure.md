# repo 组织与"家"的设计

日期：2026-09-23 · 状态：**implemented**
依据：`_faq_on_digested/13_expert-plugin-repo-organization`（方案 A–D、五个决策、dev-loop、naming）、
notes/intents.md（I1–I9）、talk `agent-101` 的概念框架。
本文是 dev-loop 第 2 阶段的落点：**决定 / 输掉的方案及原因 / 需要验证什么**。

> 状态：**implemented**（2026-09-23 补记搬入 `implemented/`；搬家晚于交付 —— 破了"同 diff"
> 纪律，教训记在文末时态节）。

## 决定

1. **形态 = 方案 A**：独立 repo，DSH 以 git submodule 钉在 `vendor/dsh`，并入本 repo 的 pnpm workspace。
   钉 **`dsh-v0.1.5-rc.2`**（已逐条核实该 tag 含我们依赖的机制：`skill-filesystem.customSkillDirs`、
   preset 的 `baseUrl` 惯用法、`!!js ctx.<service>` 插值、`dsh.bundle.patch` 装载契约）。
2. **包粒度 = 单包**（`packages/dsh-smart-assistant`），**包内 5 个入口**（1 host + 4 agent：
   `memory-digest` / `tool-memory` / `tool-research` / `learn`）。
   行粒度给可插拔，包粒度不提前付税；三包形状（flows/tools/pack）是长出第二消费方后的机械升级。
3. **平面切分**：服务在 **host 面**（`cordis.patch.yml` → bundle），模型可见贡献在 **agent 面**（preset）。
4. **家的布局**（`docs/home.md` 是契约）：`<dataDir>/HOME.md` + `memory/`（+ `archive/`）+ `skills/`。
   `dataDir` 默认 `<dshHome>/assistant`（`resolveDshHome()`，双 home 隔离自动生效）。
5. **桌面 / 抽屉**：常驻上下文 = 有界摘要（记忆 + 家地图）；细节 = 工具取（`assistant_memory`）。
   过程性知识（怎么写记忆、怎么复盘、怎么养护家）= **技能**（抽屉），不做成常驻段落。
6. **学到的技能**由我们自己的 `./learn` 模块**挂载 DSH 的 `dsh-skill-filesystem` 实例**
   （`providerName: assistant-learned`、`includeDefaultRoots: false`、`customSkillDirs: [<learned>]`）
   —— 复用真 provider，路径从服务取（零漂移、零插值脆弱性），且"学到的"与"策展的"天然分源。
7. **第 0 天不新增事件、不注册 settings namespace、不做 client**（理由与触发条件：
   `docs/architecture.md` 第六节延后项表；身份面：`docs/identity.md`）。
8. **检查靠代码**（talk ⑤）：家的健康是**纯函数**，既是 `assistant_memory action=curate` 的返回值，
   也被 repo 门禁与测试消费 —— "能让代码查的，别让 AI 自己说"。
9. **家的三个房间 + 一条探索出口**：`memory/`（已确立的事实/偏好/决定）、`research/`（**意图还不清晰的探索**，
   backlog 语义）、`skills/`（学到的本事）。探索有三档出口：`promote`（成立 → 记忆或技能）、
   `park`（悬着但不占桌面）、`drop`（不成立 → `archive/` + **必须写理由**，留尸体）。
   三个房间共用一个 store 实现、一个健康检查器、一个摘要器 —— **语义分房，机制共用**。
10. **工具面 = 3 个**：`assistant_memory`（recall/save/forget/list/curate）、
    `assistant_research`（open/update/park/drop/promote/list）、`assistant_reflect`（brief/save_skill）。
    动词集不同，不硬塞进同一个工具。

## 输掉的方案及原因

| 输掉的 | 为什么输 |
|---|---|
| **方案 B（在 DSH monorepo 里长）** | 身份会变成"改 DSH"，第三方没法 `dsh plugin add` 一个 fork 里的包；且背上上游同步税。留给两件专用事：UI prototype、向上游提 seam。 |
| **方案 C（纯外部依赖，DSH 不进 repo）** | 用户明确要"repo 能看到 DSH 本身"；`paths` 不解析到 src，agent 的探索、跳转、grep 全断。只作过渡。 |
| **方案 D（一窝专家 marketplace monorepo）** | 单专家阶段是纯税：registry 与 `shared/` 在没有第二个专家时是猜测。触发条件客观（第二个专家且要复用骨架）时再升。 |
| **三包起步（flows/tools/pack）** | 三个包只是把发布边界画显眼；生态 90%+ 是单包；拆分只在角色独立演化时发生。**改为单包四入口**，升级是移动目录，不是重新设计。 |
| **记忆存 SQLite / 向量库** | 违反"错了赔得起 + 人能审"：记忆要可读、可 diff、可手改。检索用关键词+标签+时间足够；语义检索等真实痛点（那时用 `ctx.llm` 做 embedding，另开一缝）。 |
| **自动后台学习（会话结束就跑复盘）** | 成本与同意问题未解：每会话一次 LLM 复盘的 token 代价、以及"学错了谁发现"。day 0 只做**模型/人主动触发**的复盘；自动触发（`session/end` + `ctx.jobs`）留到有真实使用数据再定。 |
| **自己写技能 provider** | 重复 DSH 的发现/监听/解析逻辑，且会与上游漂移。改为挂载真 provider（决定 6）。 |
| **把学到的技能写进 `<dshHome>/skills`（默认 user root）** | 零配置很诱人，但会把"学到的"混进用户手写的技能库，家也不再自成一域；用户明确要求家是自己的 working folder。改为家内 `skills/` + 独立 provider。 |
| **记忆摘要做成常驻全文/无上限** | 直接违背"很好控制的上下文"与信噪比。摘要必须**有界**（`digestMaxBytes`），超出部分靠检索。 |
| **把探索塞进 `memory/` 当一种 kind** | 生命周期不同：记忆是"已确立的真相"（supersede/retire），探索是"未决的线索"（promote/drop）。混住会让摘要与养护判据含混（一条 open 线索不是"记忆"）。改为**分房、共用机制**。 |
| **探索做成看板/数据库服务** | 违反"人能审、可 git、可手改"；量级只有几十条，文件足够。反过度工程。 |
| **drop 不写理由** | 下次会重开同一个问题。用户明确要"留尸体"，所以**理由必填并由代码校验**。 |
| **把探索做成第四个工具 vs 塞进 memory** | 动词集不同（open/park/drop/promote 不属于记忆语义），塞进 `assistant_memory` 会得到一个含混的 action 并集；独立成 `assistant_research` 对模型更清楚。 |

## 需要验证什么（第 0 天之后必须跑过的）

1. `pnpm install`（并入 DSH 整树）能装通；DSH 仓库脚本没被"我是根"的假设误触发（FAQ 方案 A 点名的风险）。
2. `pnpm typecheck` 经 `paths` 解析到 DSH **源码**（而不是未构建的 `lib/`），且 `tsc -b` 的引用闭包可接受。
3. **真实安装形状**：`npm pack` → 干净 profile → `dsh plugin add` → 会话挂 `assistant` preset 起得来
   （源码直跑会掩盖依赖声明错误）。
4. `peerDependencies` 里的 `workspace:^` 在打包后是否被改写成真实范围。
   **已定论：只有 `pnpm pack` 会改写，`npm pack` 不会**（会把 `workspace:^` 原样发出去）。
   所以 `scripts/release/release-smoke.mjs` 用 `pnpm pack`，并断言每个 peer 都是具体 semver 范围；
   **发布也一律走 pnpm，绝不用 npm publish**。
5. preset 的 roster 落法：dev 用 profile patch 给 `agent-presets` 加 `roots` 指向本 repo 的 `presets/`；
   发布形态则指向安装后的 `presets/`（两条都要验证）。
   **已验证发布形态**（smoke 里 roster 指向 profile 的 `node_modules/dsh-smart-assistant/presets`，
   `--dump-config` 显示默认 preset 生效）。dev 形态由 `dev/env/setup.sh` 落——✅ 已实跑绿
   （两 profile 建成、roster 双 patch、双 link 安装，见 `docs/dev.md`）。
6. **从源码启动 harness 需要一份全量解析门面**（新发现，已解决）：
   DSH 的包 `main` 指向 `lib/index.js`（tsdown 产物），而 `tsc -b` 只出 `lib/types/`，
   所以 `node --import tsx/esm vendor/dsh/apps/cli/src/bin.ts` 会 `ERR_MODULE_NOT_FOUND`。
   DSH 自己的解法是根 `tsconfig.json` 用 `extends` 携带 base 的 paths，让 **tsx 经 paths 加载 src**。
   本 repo 因此分离**两个门面**：`tsconfig.base.json`（编译期，只列直接 import 的包 + project reference）
   与 `tsconfig.tsx.json`（运行期，全量 280 条别名，由 `pnpm gen-paths` 从 vendor/dsh 生成，
   `pnpm verify` 检查其不过期）。
7. 挂载第二个 `skill-filesystem` 实例（`providerName: assistant-learned`）不冲突、学到的技能**立刻可见**。
   ✅ live 实证（战役步骤 D，2026-09-24）：save_skill 落盘后同会话即列出并可经 skill 工具加载，
   策展 4 + 学到 1 双源并存。
8. 同一 provider 内多 root 的重名遮蔽顺序（策展 vs 学到）是否如文档所设（早者胜）—— 用一个 fixture 试。
   ✅ live 实证（同上）：rank 并列（都走 `customSkillDirs`=300）时**注册序决定**——
   `skill-filesystem` 行在 `assistant-learn` 前，策展赢；落败方仅 logger warn（观察：save_skill
   返回成功但被遮蔽技能静默不生效，产品面待议——登记在战役 note 开跑补记）。
9. `assistant_memory`/`assistant_reflect` 在 PTC 模式下也可用（`defineTool` 应免费给到，需实测）。
   ✅ live 实证（2026-09-24）：`DSH_TOOLS_MODE=ptc` + preset-runner，模型经 run_code 嵌套调用
   `assistant_memory`/`assistant_research` 拿到真实计数（3 记忆/2 线索）。

## 时态（2026-09-23 补记）

已按纪律搬入 `implemented/`。搬家发生在交付（ae8bc24）**之后**的文档一致性切片里 ——
破了"同 diff"纪律：本应在交付的那个 diff 内搬。留此为记，后续切片回归同 diff。

- 入口数补记（同日信噪比审计切片）：决定 2 原写"包内 4 个入口（1 host + 3 agent）"，与决定 6
  的 `./learn` 独立入口自相矛盾；按现行合同（package.json exports / 包 README / AGENTS.md 布局表）
  改为 5（1+4）。
