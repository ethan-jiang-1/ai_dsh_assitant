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
| 技能目录 | `baseUrl` = preset 文件目录 | `baseUrl` = **patch 文件目录**（包根）→ `presets/assistant/skills/` |

删除并吸收：`presets/assistant/agent.cordis.yml`（行搬进 `cordis.patch.yml` 的 `preset-assistant.config.plugins`）、
`presets/assistant/preset.yml`（name/description/order 进同一行的 config）。同 diff 更新四份合同文档
（`docs/architecture.md`、`docs/dev.md`、`docs/identity.md`、`docs/AGENTS.md`）与生成物 `docs/package-catalog.md`。

## 三、过程中抓到的三个真问题（本迁移真正的产出）

1. **`scripts/sync-dsh.mjs` 自己跑不通**：`git fetch` 拼参数时没给默认 remote，git 把 refspec 的 `tag` 当仓库名
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
