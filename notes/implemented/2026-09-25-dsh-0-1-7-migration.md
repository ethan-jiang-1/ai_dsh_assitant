# DSH pin 迁到 `dsh-v0.1.7-rc.2`：preset 从"目录 + roster"变成普通行

日期：2026-09-25 · 状态：**implemented（typecheck 绿、verified 已记账；test/verify/release-smoke 见 §五 验收）**

## 一、决定与依据

用户 2026-09-25 直接要求：**"dsh 上有更新，我们用最新的 rc；记得同步 dsh 后，主线要用最新的 rc 版本"**，
并把《企业聪明助手总体思路》并入长期责任圈（该文 §3.3 也把升 pin 列为阶段 0 的前置）。
最新 RC = **`dsh-v0.1.7-rc.2`**（`git -C vendor/dsh ls-remote --tags` 实测：`0.1.5-rc.2/rc.3`、`0.1.7-rc.1/rc.2` 中最高）。
`vendor/UPSTREAM.md` 记 tag + SHA `477b4f42…`（2026-09-24），`package.json` 的
`dsh.compatibility.dshReleases["0.1.7-rc.2"] = verified` 由 `pnpm sync-dsh` 在 typecheck **通过后**写入。

## 二、迁移的形状（0.1.5 → 0.1.7）

| 面 | 0.1.5-rc.2 | 0.1.7-rc.2（现在） |
|---|---|---|
| preset 定义 | 目录 + `roster` 扫 `presets/assistant/agent.cordis.yml` | **普通插件行**：`agent-preset` 行（`config.id` + `config.plugins`） |
| 默认 preset | roster 行 `config.default` + `roots` | `agent-preset-registry` 行 `config.default`（**不扫目录、不接受路径**） |
| 定义随谁分发 | repo 目录（profile 指路径） | **随包**：`dsh.bundle.patch`（`cordis.patch.yml`）里的 `preset-assistant` 行 —— "换领域 = 换包"的机制前提 |
| 我们改的三个包名 | `@deepseek-ai/dsh-agent-presets` | `@deepseek-ai/dsh-agent-preset`（定义行，随包发 `lib/` + `skills/`）、`@deepseek-ai/dsh-agent-preset-registry`（服务） |
| 消息来源 | `source: { kind: 'plugin', plugin }` | `MessageSourceMap` 可合并扩展 —— 本包**自声明** `'assistant-plugin'` kind（`src/index.ts`） |
| 技能目录 | `baseUrl` = preset 文件目录 | `baseUrl` = **profile 目录**（`<home>/profiles/<name>/`，**不是包根**）→ 包内文件须**按包名解析**；本节原写"patch 文件目录（包根）"是错的，见 §十二 |

删除并吸收：`presets/assistant/agent.cordis.yml`（行搬进 `cordis.patch.yml` 的 `preset-assistant.config.plugins`）、
`presets/assistant/preset.yml`（name/description/order 进同一行的 config）。同 diff 更新四份合同文档
（`docs/architecture.md`、`docs/dev.md`、`docs/identity.md`、`docs/AGENTS.md`）与生成物 `docs/package-catalog.md`。

## 三、过程中抓到的三个真问题（本迁移真正的产出）

1. **`scripts/maintenance/sync-dsh.mjs` 自己跑不通**：`git fetch` 拼参数时没给默认 remote，git 把 refspec 的 `tag` 当仓库名
   → `fatal: 'tag' does not appear to be a git repository`。即 **AGENTS.md 里写的那条标准命令从来跑不了**
   （此前的升级想必是带 `--remote` 手动传的）。修：纯函数 `fetchArguments(tag, remote = 'origin')` + 夹具；
   同时给脚本加 main 守卫（否则测试 import 它会直接执行整个同步）。
2. **`vendor/` 的 `lib/` 是 gitignore 的构建产物，换 pin 后是旧的**：`tsconfig.tsx.json` 让**运行时**走 vendor `src`，
   所以 dev 起步看不出问题；但凡是经 `node_modules` 解析 vendor 的路径（**vitest**、`dsh plugin add` 装出来的 profile）
   都在**静默跑上一个 pin 的代码**（实测：`z.string().volatile()` 不存在）。`sync-dsh` 的 Next 清单漏了这一步，
   已补为**第 0 步**：`pnpm --dir vendor/dsh install && … build:native-system && … build:lib`（`dev/setup.sh` 早就在查这条）。
3. **两个新 preset 包在钉住的 checkout 里只有声明、没有 JS**（release 才打包）：测试裸名解析失败。修：
   `packages/dsh-smart-assistant/vitest.config.ts` 加**精确匹配**别名指向 vendor `src`——让测试与运行时解析同一份源码，
   而不是各自跑不同版本。

## 四、输掉的方案

- **保留 `presets/` 目录 + 自定义 provider 扫描**：0.1.7 的 registry 明文"不扫目录、不接受 preset 路径"，
  逆着它走就是把"专家包随包分发"这条产品机制扔掉。
- **把 preset 定义放进 profile patch**：profile 是部署方的，专家包就不能自带了——与"换领域=换包"直接冲突。
- **继续用 `{ kind: 'plugin' }` 消息源**：0.1.7 已移除该 kind；自声明 kind 才是官方扩展方式（其它包都这么做）。
- **把 `agent-preset` 的 JS 打进 vendor 或改 vendor**：触红线；且 gitignore 的构建产物本就不该提交。
- **在测试里绕开这两个包**（不测真实组合）：会失去唯一验证"preset 行真能挂载"的那层证据，等于用测试的绿换掉产品的真。

## 五、验收

- `pnpm sync-dsh -- --tag dsh-v0.1.7-rc.2`：typecheck 通过、`verified` 记账、UPSTREAM.md 更新 ✅
- `pnpm gen-paths`：325 条运行期别名重生成 ✅
- `pnpm typecheck`：exit 0 ✅
- `pnpm test` / `pnpm build` / `pnpm release-smoke`：**被 vendor 重建阻断**，详见下节。

## 六、阻断：vendor `lib/` 重建（2026-09-25 未解决，交接给下一圈）

`vendor/dsh/**/lib/` 是 **gitignore 的构建产物**。换 pin 后它整体失效（旧 pin 的代码），而本轮为排除"旧产物污染"
把它清掉（318 个 `lib/` + 280 个 `*.tsbuildinfo`，**源码与 pin 指针未动**）——这使 `pnpm test`（vitest 按裸名
经 node_modules 解析 vendor → 需要 lib JS）与 `release-smoke`/plugin-add 出来的 profile 目前不可用。
dev 运行时不受影响（`tsconfig.tsx.json` 让 `pnpm dsh` 走 vendor `src`）。

尝试过并记录结果的四步（都不成立，别再重来）：
1. `pnpm --dir vendor/dsh install`：依赖解析通过；**postinstall（lefthook 装 git hook）失败**——与 submodule 的
   `core.worktree` 配置冲突；改用 `--ignore-scripts` 通过。
2. 直接 `build:lib:host`：`MISSING_EXPORT "SettingsProvider"`——rolldown 读到**旧 pin 的** `lib/types/index.js`。
3. 清 `lib/` + `*.tsbuildinfo` 后重跑：`[@deepseek-ai/dsh-root] Cannot find entry: ["lib/types/{index,invariant,startup}.js"]`。
   已补建构建期依赖 `@deepseek-ai/dsh-typert-generator`（`tsc -b packages/typert/generator/tsconfig.json`，
   它的 `tsdown-plugin.js` 被 `vendor/dsh/tsdown.config.ts` import），错误不变。
4. 按官方顺序先 `build:native-system`（成功：darwin-arm64/bin/system.node）再 `build:lib:host`：错误不变。

**结论**：vendor 的 `tsdown.config.ts` 把 root 包入口写成 `lib/types/{index,invariant,startup}.js`，而该文件在
**干净树上不存在**——它由 typert 的 workspace 生成通道产出，而那条通道本身又不在 `build`/`build:lib` 脚本里；
vendor 的构建脚本假设**已经引导过的树**（其 `lib/` 在场）。因此从零重建需要 vendor 自己的引导顺序，
本轮未找到其文档化入口（`vendor/dsh/README.md`、`docs/`、根 `vendor/dsh/scripts/build.ts` 都未写"首次构建"）。

**第八圈追加（同一天）**：补齐了构建期依赖——`tsc -b` 重建 typert 家族（generator/loader/protocol/registry）
与嵌套 vendor（`vendor/dsh/vendor/` 的 cordis/cosmokit/schemastery 与 6 个 cordis-plugin-*），它们只出
`lib/types/*.js`；而各包 `main` 指向的 `lib/index.js` 是 **tsdown 打包产物**，所以这些重建不足以恢复按裸名解析。
随后尝试"让 vitest 全域走 vendor src"（读生成物 `tsconfig.tsx.json` 的 325 条别名 + 嵌套 vendor 的
`package.json.name → src`）：过程中发现两个真陷阱——①别名目标在生成物里是**仓根相对**，必须按仓根解析
（我一度按配置文件目录解析，全部指错）②别名要给**入口文件**（`src/index.ts`）而不是目录。该尝试未完成
（未能让 33 个套件通过），已回退到最小双别名配置，两个陷阱写进配置注释以免重犯。

**当前测试状态（诚实）**：清理 vendor `lib/` 后，**17 个套件因按裸名解析 vendor 缺 `lib/index.js` 而无法启动**
（143 tests 中 142 过、1 失败；套件层面 16 pass / 17 fail）——比我清理前（31 pass / 1 fail）**更差**。
`pnpm dsh` 的 dev 运行时走 `tsconfig.tsx.json` 的 src 别名，不受影响；受影响的是 vitest、
`pnpm build`/`release-smoke` 与按 `dsh plugin add` 装出的 profile。

**下一圈的两条路（按优先级）**：
1. 在 vendor 里找引导/CI 证据：`.github/workflows/`、`docs/**/contributing*`、或生成 root 入口的那条
   typert 命令；照它跑。
2. 若引导不可得：**完成"vitest 全域走 vendor src"**——两个陷阱已定位（仓根相对基准 + 入口文件映射），
   剩下的工作是把 33 个套件跑绿（`entryOf` 之外还要处理没有 `src/index.ts` 的包），收益是彻底消灭
   "stale lib 静默跑旧代码"（§三.2）并让测试与运行时解析同一份源码。
3. 兜底：`pnpm --dir vendor/dsh install`（**不加** `--ignore-scripts`，先解决 lefthook 与 submodule
   `core.worktree` 的冲突）后按 CI 的 `pnpm run build` 全量走一遍——CI 明文只做 install + build，
   说明干净树上本应可行；我们这棵树的差异需要与 CI 逐条对齐。

## 七、pin 迁移留下的孤儿包目录（用户报告的 lint 警告）

用户 lint 时看到：`File '…/vendor/dsh/packages/code-runtime/code-runtime' not found.`

查证：该目录**只剩一个 `node_modules`**（无 `package.json`/`src`/`tsconfig.json`），而
`@deepseek-ai/dsh-code-runtime` 在 0.1.7-rc.2 已从 workspace 与 lockfile 中消失（现役的是兄弟包
`code-runtime-worker-thread`）。也就是说这是**换 pin 后遗留的空壳**：任何按目录当包加载的工具
（编辑器 tsserver、lint）都会去找它的 `tsconfig.json`，于是报"文件不存在"。

处置：删除该孤儿目录（gitignore 内的安装残留，**非 vendor 源码**——`git -C vendor/dsh status` 干净）。
复核：`node scripts/checks/verify.mjs` 31/31 exit 0、`pnpm typecheck` exit 0。

**可复用的结论**：换 pin 后除了重建产物，还要清**上一个 pin 留下的孤儿包目录**（判据：目录里只有
`node_modules`，且包名已不在 lockfile/workspace 里）。

## 八、第九圈：测试回到 32/33（全域 src 别名）+ 组合测试的剩余红

**做成的**：`packages/dsh-smart-assistant/vitest.config.ts` 改为**全域解析 vendor 源码**——复用生成物
`tsconfig.tsx.json` 的别名表，再补上嵌套 `vendor/dsh/vendor/*`（按各自 `package.json` 的 name，因为目录名≠包名），
并处理三个陷阱：①别名目标是**仓根相对**，须按仓根解析 ②要给**入口文件**（`src/index.ts`）而不是目录
③跳过不存在的目标。效果：**32/33 套件通过、213/215 tests**（改动前是 16/33；上上圈清理 vendor `lib/` 导致）。
这条同时消灭了"stale lib 静默跑旧 pin 代码"（§三.2）——测试与运行时现在解析**同一份源码**。

**剩下的 2 个（同一个套件）**：`tests/preset-composition.spec.ts` 的两条都失败于
`RemoteError: assistant-memory-tool (dsh-smart-assistant/tool-memory): never started`（research/knowledge/learn 同），
抛出点 `vendor/dsh/packages/preset/agent-preset-registry/src/index.ts:219`（registry 的 retain 在收集"没起来的行"）。
**不是解析失败**（否则报 not found）：四条行都被登记进了树，但没进入 started 态。

**首要假设与下一步**：测试是用 `ctx.plugin(AgentPreset, { id, plugins })` **直接注册定义**，
而生产是经 **Loader + `cordis.patch.yml` 的 `preset-assistant` 行**组合（`!!js` 在子插件加载时求值、
context/baseUrl 由 patch 文件确定）。下一步应把测试夹具改成"**经 Loader 加载一份 patch**"的真实形状，
再复现：若仍然 never started，就往 registry 的挂载/隔离（`mountPreset` 的 scope 与 host 服务可见性）查，
而不是继续改别名。这也是本仓一贯的判据：**测真实组合形状，不测等价想象**。

## 九、第十圈：顺序假设被证伪，错误语义查清（负结果，交接）

- 夹具已按生产顺序调整：**host 行先于 preset 定义行**（`cordis.patch.yml` 就是这么排的）。**结果不变**——
  四条工具行仍 `never started`。顺序不是原因（该改动保留，因为它更贴近生产形状）。
- 查 `vendor/dsh/packages/preset/agent-preset-registry/src/mount.ts:180-200` 的 `auditRows`：
  `never started` 的判据是 **`entry.fiber === undefined`**，即**这四行从未被实例化**——不是 import 失败、
  也不是启动后抛错（那两类会走 `mountDetail(error)` 分支并带出原因），也不是"等不到服务"（那是 `pending` 分支）。
  所以问题是**注册进树的行没有被实例化**，而不是别名/服务可见性。
- **下一步（更锐）**：①把夹具改成**经 Loader 加载一份真实 patch**（`preset-assistant` 行 + registry 行），
  完全复刻生产组合路径，看这四行是否仍不实例化；②若仍红，读 `ctx.agentPresets.diagnostic`（registry 在每次读取时
  重新审计）区分 `failed` 与 `pending`，并对照官方 `bundle/web-app/presets/standard.patch.yml` 的行形状
  逐字段比对（我们这四行与 home-preamble/memory-digest 的差别，是定位入口）。

### 九之补：差异收敛到一个变量（下一圈从这里开始）

六行的 `inject` 列表对照（本次实跑 `grep`）：

| 行 | inject | 组合测试里的状态 |
|---|---|---|
| `tool-memory` | `assistantMemory`, `skills`, **`tools`** | ❌ never started |
| `tool-research` | `assistantMemory`, **`tools`** | ❌ never started |
| `tool-knowledge` | `assistantMemory`, **`tools`** | ❌ never started |
| `learn` | `assistantMemory`, `skills`, **`tools`** | ❌ never started |
| `home-preamble` | `assistantMemory`, `systemPrompt` | ✅ 起来 |
| `memory-digest` | `assistantMemory`, `systemPrompt` | ✅ 起来 |

**唯一差别 = inject 里有没有 `tools`**（`super(ctx, 'tools')` 在 0.1.7 未改名，已核）。
所以下一步不是再猜顺序或别名，而是：①在夹具里断言 `ctx.get('tools')` 在 preset 挂载作用域**可见**；
②对照官方 `bundle/web-app/presets/standard.patch.yml` 看工具行需要什么前置行/配置才能被实例化
（那一份里有 `tool-*` 行且能在 CI 里跑通，是最好的对照组）；③若确实是 `tools` 可见性问题，
看是夹具缺行还是我们的行在新 pin 下需要改成"读时取服务"（vendor 自己的注释里就有这种写法：
PTC runtime 刻意不走静态 `inject`，避免把 `ctx.tools` 及其后的工具插件当人质）。

### 九之补二：`tools` 变量的进一步排查（本轮实跑，仍未解）

- **服务并不缺**：在夹具的预设挂载点打印，`tools=true skills=true assistantMemory=true systemPrompt=true` 四者都在根作用域。
- **失败与 `agents.create` 无关**：直接在夹具里调 `ctx.agentPresets.mount(ctx, 'assistant')` 复现同一条
  `RemoteError: … never started`，说明问题在**定义/行本身**，不在 agent setup 路径。
- **不是"注入 `tools` 就是环"**：官方插件同样静态 inject —— `tool-skill` 是 `['agents','tools','skills']`、
  `tool-workspace-dependencies` 是 `['tools']`、`tool-bash-persistent` 是 `['tools','terminals']`，
  且它们都在官方 `presets/*.patch.yml` 的 preset 行里、能在 CI 跑通。所以"preset 行里 inject tools"本身合法。
- 因此剩下的差异只可能在**组合方式**：我用 `ctx.plugin(AgentPreset, { id, plugins: OWN_ROWS })` 直接注册
  **普通对象行**，而生产是把 `preset-assistant` 行放进 patch、由 **Loader** 解析（`prepareProfileEntries`
  在那一刻求值 `!!js`、解析名字、建 EntryOptions）。**下一步就做这一件事**：夹具改成"写一份 patch +
  经 Loader 加载"，与官方 `bundle/web-app/presets/*.patch.yml` 的行形状逐字段对齐再复现。

## 十、第十二圈：最后一次尝试（Loader + patch）与阻断降级

按上一圈的承诺，给这条组合测试**最后一次机会**：夹具改成生产形状——写一份 patch（registry 行 + `preset-assistant` 行，
plugins 为六条 id/name）并经 `ctx.loader.create({ id: 'include', name: 'cordis:include', config: { path: fileURL } })`
装载（用法取自 `vendor/dsh/packages/boot/app-boot/src/index.ts:576-579`）。

**结果：失败换位，原问题未被验证**——经 Loader 装载后 `ctx.agentPresets` 在测试上下文里是 `undefined`
（服务由 registry 行提供，而 include 树未就绪；`loader.create` 返回后官方代码只 `resolve` 不 await），
于是报 `TypeError: Cannot read properties of undefined (reading 'mount')`，而不是那条 `never started`。
夹具已 `git checkout` 回滚到已提交状态（失败模式回到可记录的 `RemoteError`），本轮不留下新错误形态。

**处置（按用户既定规矩：同一阻断连续三圈即停）→ 2026-09-27 已解决**：
- 当时降级并附**已排除假设**（顺序、别名解析、服务缺失、`agents.create` 路径、"inject tools 即环"）与复现路标。**根因不在其中**：四条工具行的模块在装载器的真实 import（`loader.internal.import`，纯 Node 解析 + realpath 进 vendor `lib/`）里断在 **vendor dsh-llm 的构建产物**——上游布局 bug：`src/attribution.ts` 的 `createRequire(import.meta.url)('../package.json')` 按 src 布局书写，而包 tsconfig `outDir: lib/types` 把产物下移一层，tsc 不改写字符串参数；tsdown bundle 内联清单掩盖了它，只有经子路径产物走纯 Node 解析的消费方（= 本组合测试）踩到。loader 的 `_init()` 对 import 抛错只 `logger.error` 后返回，`fiber` 保持 undefined → 审计报 "never started"——**该语义＝名字解析/import 阶段失败，不是"注册后未实例化"（第九圈的判据解读据此修正）**。tsx（dev 运行时）与 vitest（别名表）都解析到 vendor **src**，所以只有这条真实装载路径暴露。
- **修法**：`scripts/maintenance/repair-vendor-artifacts.mjs` 新增 `LOADER_PEER_PACKAGES`（dsh-llm / dsh-tools / dsh-skill-filesystem 的 tsc 构建 + shim）与 attribution fixup（改写**构建产物**里的 require 路径；vendor 源码永不动）——此前这些 lib 是 boot-smoke 时代手工建的、从未进修复脚本（修复只存在于手上＝没修复）。破坏性对照：删三包 lib → `pnpm repair-vendor` 从零重建 → 组合套件 2/2 绿。
- **验收**：整包 vitest **281/281 全绿**（迁移以来首次零红零降级）· typecheck 0 · verify 32/32。
- 本职责转向阶段 0 的**下一项：结果意图 O1–O6 的领域版**（中小企业 CEO/VP 数字分身）。

**已有事实不变**：`verify` 32/32、`pnpm test` 整包 281/281 全绿（preset-composition 两条已修复——见上文处置）、`pnpm typecheck`/`pnpm build` exit 0；
vendor 侧代码与 pin 指针未被修改（只删过一个孤儿安装残留目录）。

## 十一、第十一圈之后：boot 修复三步 + 专家权限模型的 live 验证

**boot 修复（三步，全部在 gitignore 产物层，vendor 源码未动）**：
1. **typert 工件可独立再生**：tsdown 插件里的 `WorkspaceTypertGenerator` 不依赖 tsdown——
   照抄 `emitWorkspace` 的逻辑直接调用（`generator.discover(['host'])` → 过滤声明 `./typert` 的包 →
   `generate` → 写 `lib/typert.{host.js,d.ts}`）。实测 **24 个包**再生成功。这就是 §六 里"root 入口"
   之谜的实体：装载器读的 `lib/typert.host.js` 是生成物，不是源码。
2. **两个子路径垫片**：`@deepseek-ai/dsh-headless/startup` 与 `@deepseek-ai/dsh-subprocess/control`
   经 exports map 落到 `lib/*.js`（tsdown 打包产物）；tsc 只出 `lib/types/*.js`。垫片＝
   `export * from './types/<name>.js'`（命名导出，无 default——第一版写了 default 行被 ESM 拒绝，
   已记）。写在 gitignore 产物层。
3. **裸冒烟通过**：`pnpm dsh --profile dev-task "reply ready"` → `ready`，exit 0。
   （pin 迁移后从未裸验过 boot——这是当时漏掉的一步，教训：迁移验收里"能起"必须包含裸 boot。）

**修复已固化（用户"步步为营"规矩的落实）**：上述三步不再只存在于手上——`pnpm repair-vendor`
（`scripts/maintenance/repair-vendor-artifacts.mjs`）可从干净 vendor 树重跑全部产物（typert 再生 + 两包 tsc + 垫片）。
端到端验证：删 2 垫片 + 2 typert 工件 → `pnpm repair-vendor` → 全部回来 → 裸冒烟 `ready`。
（脚本第一版被自己的 JSDoc 咬了：注释里写 `vendor/dsh/**/lib/`，其中的 `*/` 把块注释提前闭合，
后面的反引号全成模板字面量——`node --check` 抓出，改用 `…`。）

**专家权限模型的 live 验证**（`dev/profiles/profile-patch-expert.yml` + `dev/probes/session/expert-probe.patch.yml` 可复跑）：
基座 bundle 自带 `read-only`/`workspace-write`/`danger-full-access` 三档（行 id `permission`）；
专家部署形状＝把 `defaultPreset` 改为 `read-only`。探针（真实会话）读数：
- **写家成功**：`assistant_memory save` 落盘（fact `20260925-…-7555`）——治理工具面不经沙箱，照常工作；
- **写仓库 fail-closed**：`write` → `sandbox: file access denied under read-only mode`；
  按提示升权 `workspace-write` → `escalation requires approval, but no approval channel is available`
  （无审批人即关）；bash 只读命令亦被拦（本机 sandbox-exec 不可用）→ shell 面整体不可用；
- **会话自己不绕过**：被拒后不再试 bash 重定向/subagent 代写，理由"探针要测的就是这条边界本身，
  绕过会让读数失真"，并标注可逆——这正是协作边界 + 权限模型想要的专家行为。

## 十二、修正 §二 的一条错事实：bundle patch 行的 `baseUrl` 是 **profile 目录**，不是包根

**症状（真实会话，不是门禁红）**：迁移后 preset 会话里**8 件策展技能全部缺席**——`skill management-breakdown`
答 "unknown"，而 `--dump-config` 里 `skill-filesystem` 行确实在 preset 的 plugins 里；工作目录里学到的技能与
`.agents/skills/` 的开发技能照常在，所以不是技能面整体坏掉。

**根因**：§二 原表写"`baseUrl` = patch 文件目录（包根）"——**错的**。在这行 `customSkillDirs` 的 `!!js` 里挂探针
（`process.stderr.write`）实测：`baseUrl` = `file:///…/dev/harness-home/profiles/dev-task/`，即**该行落进的那一层
自己的目录**（profile 目录；bundle patch 的行被并进 profile 的这一层）。于是 `new URL('presets/assistant/skills/', baseUrl)`
指到 `<profile>/presets/assistant/skills/` —— **包外**：provider 扫一个不存在的根，不报错、不告警，目录里一件
策展技能都没有。迁移前这条路径成立是因为 preset 当时是**独立文件**，其目录恰好就是包内 `presets/assistant/`。

**修法**（`packages/dsh-smart-assistant/cordis.patch.yml`）：不写相对 `baseUrl` 的包内路径，改为 shipped `cordis`
preset 的同款惯用法——`createRequire(baseUrl).resolve('dsh-smart-assistant/package.json')` → `dirname` → 拼包内
`presets/assistant/skills`。从 baseUrl 出发走 node_modules 找本包：dev（profile 的 node_modules link 到本仓包）与
`dsh plugin add` 装出来的 home（release-smoke 断言的 `profiles/<p>/node_modules/dsh-smart-assistant/cordis.patch.yml`）
是同一种形状。文件头与技能段的注释同步改写，避免下一个人再按"baseUrl = 本文件目录"写路径。

**验证（真跑过的）**：
- 新增红夹具 `packages/dsh-smart-assistant/tests/preset-skill-root.spec.ts`：读真实 `cordis.patch.yml`，用 loader 的
  `interpolate`（运行时同一个求值器）在"profile 形状 + node_modules link"的 baseUrl 下求值那一行。
  修复前红：解析结果 `/var/folders/…/assistant-preset-base-…/presets/assistant/skills/`（包外）；修复后绿（= 包内目录）。
- live：`pnpm dsh --profile dev-task --patch dev/probes/session/preset-runner.patch.yml "用 skill 工具按名加载 management-breakdown…"`
  → 模型报加载成功，列出全部 8 件策展技能，base 目录 = `packages/dsh-smart-assistant/presets/assistant/skills/…`
  （会话 `session-12be0619`：日志里 `presets/assistant/skills` 与那 8 个名字都在）。
- 账本：`dev/harness-home/assistant/skill-usage.json` 出现迁移后**第一次**策展技能加载（`management-breakdown` count 1，
  `2026-09-25T14:31:04Z`）；此前的 28 次全是迁移前的。

**输掉的方案**：
- **保留相对 `baseUrl` 的 `presets/assistant/skills/`**：迁移前成立、现在是包外路径；且失效是静默的（provider 扫不存在
  的根＝空目录，不报错）——所以只能按机制改，不能指望"下次注意"。
- **改写成 `../../..` 之类更长的相对路径**：把 profile 目录到包根的距离写死，装出来的 home 立刻失效（profile 深度不同）。
- **把这一行搬进代码**（像 `learn` 那样在模块里挂 provider，用 `import.meta.url` 定位）：路径更好测，但要同 diff 动
  行 id/name、`docs/package-catalog.md` 生成物与 preset 层的注册顺序，修复半径大于这次的问题本身，本次不取。

## 十三、迁移带出的第二处失效：README「装法」的旧步骤（同日收口）

**症状**：README 的装法段要求"① preset roster 要能看到 `assistant`（把 `agent-presets` 的 `roots` 指向安装后的
`presets/` 目录，或把该目录拷进 `<dshHome>/.agent-presets/`）"——照做的安装者会去改一个 0.1.7 里不存在的机制
（行名与 `roots` 字段都是 0.1.5 的形状）。这是 entry 文档上的错事实，装的人是照它做的。

**依据**：vendor 自述"the registry neither scans directories nor accepts preset paths"
（`vendor/dsh/packages/preset/agent-preset-registry/README.md:46`）；本仓 `--dump-config` 里该行的 config 只有
`default`（`AgentPresetRegistry.Config`，`vendor/dsh/packages/preset/agent-preset-registry/src/index.ts:53-56`）。
定义随包走 `dsh.bundle.patch`（§二 表已记），所以装完只需把该 profile 的 registry 行 `default` 设成 `assistant`。

**修法**：README 装法段改写成上面这一句，并指向本 note；同段补一行专家部署装配命令 `pnpm expert-setup -- --data-dir <目录>`
（`package.json` 接上 tsx 入口，与 `import-knowledge` 同形）。实跑证据：全新目录→`soul replaced` + 3 条种子草稿；
复跑→`soul SKIPPED`、种子 id 不变且目录仍 3 个文件（幂等）。

**输掉的方案**：
- **保留旧步骤、加一句"0.1.7 起不用了"**：装法段是给"第一次装"的人读的，留一条不存在的操作等于留一个坑；
  历史归本 note 与 git。
- **把装法搬进 `docs/`**：与根 `AGENTS.md` 的"一个事实一个家"冲突——安装形状已在 README 与 §二 表里，
  再开一处就是第二份清单。
