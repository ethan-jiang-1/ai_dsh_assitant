# 启动与调试（dev 运行手册 · 只写现在）

> 这份手册回答：怎么在不碰日用 DSH 的前提下，从零跑起本插件的 dev 实例。
> working folder 的布局契约在 `docs/home.md`；插件架构在 `docs/architecture.md`。
>
> **读法**：日常起服务看「默认启动动作」；换 home §一；生成物/两个 tsconfig §二；
> 首次准备 §三；开发环 §四；排障先 §五；按意图选入口 §六；组合四层 §七；
> 入库边界 §八；发布与标签 §九。

## 默认启动动作

"启动一下"的默认语义 = 根 [`AGENTS.md`](../AGENTS.md) 的启动段（常设指令 owner）：一条 `pnpm start` 在本仓隔离 home 里起动 `dev` Web 实例——它自己按序补齐 submodule / 根依赖（缺才补）→ prepare → setup → 产物自证（`lib/` 与 `src/` 不一致就先 build）→ 起服务 → `pnpm preflight`，绿了才把 URL 打出来（实现 = [`dev/env/start.sh`](../dev/env/start.sh)）。本节拥有的是下面这张入口判别表——三个邻近但不同的入口，除非用户明确点名不走：

| 入口 | 实际起动什么 | 什么时候用 |
|---|---|---|
| `dev-task`（§四） | 无 Web 的 headless one-shot：只装 host 面，进程自己退 | 只冒烟插件装载 / 服务行 / scaffold |
| `--patch dev/probes/session/preset-runner.patch.yml`（§四） | 同上但挂 preset | 自动化 preset 探针 |
| `pnpm --dir vendor/dsh run dev:web` | vendor 的客户端 bundle watcher（重建 web 产物），不建 home、不选 profile、不起本插件会话 | 改浏览器面源码时配合已起的实例用 |

## 一、隔离模型（什么被隔离、什么没有被隔离）

一切持久化的根是 `DSH_HOME`（解析优先级：显式配置 > `$DSH_HOME` > `~/.dsh`）。
**dev 实例默认 = `DSH_HOME=<repo>/dev/harness-home`**，由 `dev/env/dsh.mjs`（`pnpm dsh` 的唯一入口）
无条件强制 —— 继承来的 `DSH_HOME=~/.dsh` 会被覆盖并在 stderr 打一行说明。
**唯一出口是 `ASSISTANT_DSH_HOME`**，且它对**启动器和两个 dev 脚本一致生效**
（`dev/env/env.sh` 是后者的收口处）：指向日用 `~/.dsh` 时不拦截但打显著警告（与启动器同语义——只让发生的事可见）。
**用隔离 home 跑实验必须建 profile 与起服务同 home**：profile 由 `dev/env/setup.sh` 建、由 `pnpm dsh` 读，
两边不同就会看到 `profile "dev" does not exist`——而它说的是实话，只是没说"你建在另一个 home 了"。

落到另一个 home 的完整命令串（对根 `AGENTS.md` 启动段的 ②③④⑤ **每一条**前置同一变量，
漏加到任意一条就会踩上面那句报错）：

```sh
export ASSISTANT_DSH_HOME="$PWD/.tmp/my-trial-home"
bash dev/env/prepare.sh && bash dev/env/setup.sh
ls "$ASSISTANT_DSH_HOME/profiles"          # 判据：应见 dev 与 dev-task
pnpm dsh --profile dev --port 0 --no-open  # 起服务与验证命令（preflight/shots/dump-config）同样带着这个变量
```

| 通道 | 是否随 DSH_HOME 隔离 | dev 的处理 |
|---|---|---|
| profiles / sessions / storages / attachments / settings / credentials / 技能用户根 / `.agent-presets` / assistant working folder 的 dataDir（默认值；显式 `dataDir` 覆盖例外，见 `docs/home.md`） | ✅ | 自动落在 dev home |
| skills 的共享 agent 根（默认 `~/.agents`） | ❌ 不隔离 | 启动器接管为 `$DSH_HOME/agents-home`（仅当未显式设置；`dev/env/env.sh` 则无条件强制） |
| telemetry | 身份按 home 独立；默认 FEEDBACK_ONLY | 启动器设 `DSH_TELEMETRY_DISABLED=1` |
| spill 与脚本临时文件 | ❌ 不经 DSH_HOME | **仓内唯一形式 = 仓根 `.tmp/<用途>/`**（硬规则 8，动机是仓外写会被沙箱挡成 approval）：dev 启动器把 `TMPDIR`/`TMP`/`TEMP` 收进 `.tmp/host/`，vendor 的 spill 随之入仓；脚本用 `dev/env/tmp.mjs` 的 `tmpDir`/`mkTmpDir`，测试进程由 `packages/dsh-smart-assistant/vitest.config.ts` 收进 `.tmp/vitest/`。日用（非 dev）实例不经本启动器，不受影响。清扫走 `pnpm sweep`（默认 dry-run，`--apply` 才真删；保护 = openviking / 新 mtime / 打开句柄 / `--keep` 白名单，判据见 `scripts/maintenance/sweep.mjs` 头注） |
| pnpm 全局 store | ❌ 内容寻址缓存 | 良性共享 |
| Web 端口 `127.0.0.1:3080` | ❌ | 与日用 web 撞车 = boot **fail loud**（不是劫持，实测 `EADDRINUSE`）；日用开着时用 `pnpm dsh --profile dev --port 0`（OS 分配端口 + token 鉴权，实测可跑） |
| LLM key | ❌ 网络面 | dev home 的 `.credentials.yaml` 自己配一份，与日用凭据互不可见 |

`.env` **不能**设置 `DSH_*`（bootstrap-only 前缀，DSH 直接抛错）—— home 只能来自继承环境或启动器。
工具子进程拿到的 `DSH_*` 会被 DSH 清洗后重注入本进程解析值，不会漏继承。

## 二、两个 tsconfig 解析入口（编译期 vs 运行期）

类型检查与"从钉住的源码启动"都要把 `@deepseek-ai/*` 解析到 vendor/dsh 的 **`src`**（而不是未构建的
`lib/` 产物）——typecheck 的报错落在真实源码，agent 也能顺着跳转读实现。本 repo 用**两个 tsconfig
门面**做这件事，职责不同，别混：

| 门面 | 管什么 | 谁维护 |
|---|---|---|
| `tsconfig.base.json` | **编译期**：只列我们直接 import 的 `@deepseek-ai/*` 包（paths → vendor `src`，条数随 import 面演进）+ 公共编译选项；`packages/dsh-smart-assistant/tsconfig.json` extends 它，并为每个包配 project reference —— `tsc -b` 按项目引用构建它们，API 漂移在编译期暴露，又不把 DSH 源码并进本程序（撞 `rootDir`） | 手维护：src 里新增 `@deepseek-ai/*` import 时加一行 paths（`pnpm verify` 机械检查） |
| `tsconfig.tsx.json` | **运行期**：全量别名（条数以生成物为准），`dev/env/dsh.mjs` 经 `TSX_TSCONFIG_PATH` 让 tsx 加载 DSH 的 `src` 启动 CLI | `pnpm gen-paths` 从 vendor/dsh 生成；`pnpm verify` 查不过期（换 pin 后必跑） |

`pnpm typecheck`（根命令委派包级脚本：`tsc -b` 按项目引用聚合到包工程、走编译期入口，再
`tsc -p tsconfig.test.json` 覆盖 tests——测试工程经 workspace 构建声明解析 vendor，需先有构建产物）走编译期入口；`pnpm dsh` 走运行期入口。

**生成物登记表**（生成物 / 生成器 / freshness 检查——新增生成物必须同 diff 补一行，否则第二个生成物必然漏检）：

| 生成物 | 生成器 | freshness 门禁 |
|---|---|---|
| `tsconfig.tsx.json` | `scripts/generate/gen-paths.mjs`（`pnpm gen-paths`，从 vendor/dsh 全量别名） | `pnpm verify`「resolution: the runtime tsconfig for the source launch is present and current」 |
| `docs/package-catalog.md` | `scripts/generate/gen-catalog.mjs`（`pnpm gen-catalog`） | `pnpm verify`（`gen-catalog --check`，与 `gen-paths` 同形） |
| `packages/dsh-smart-assistant/lib/` | `pnpm build`（`tsc -b` 出 d.ts 与各模块 js；`tsdown` 把 `src/client` 多模块打成 `lib/client/index.js` 单文件 classic script）。`tsc -b` 不删除已改名/删除文件的旧产物；改名后先 `pnpm clean` 再 build | `pnpm verify`「build: the artifact the presets load matches src/ (content, not mtime)」，核 = `scripts/checks/gates/build-freshness.mjs`：host 面问 `tsc -b --dry`（陈旧 = `would build project`；只动过 mtime = `would update timestamps`，不是漂移），客户端面把 bundle 重打进 `.tmp/verify-bundle/` 逐字节比。从未建过的包判绿（`prepare.sh` / `pnpm build` 的领地）；起服务时 `dev/env/ensure-build.mjs` 消费同一个核并自动补 build |
| `dev/harness-home/`（scaffold 出的 SOUL/MANUAL/AGENTS 等） | 插件运行时 `ensureHome`（`src/domain/home/layout.ts` 是唯一 owner） | `curate` 的 `notes-over-budget` / `soul-over-budget` finding |
| `_dist/安装手册.md`（同目录 tgz 走 `*.tgz` ignore，不入库） | `scripts/release/export-dist.mjs`（`pnpm export-dist`：pnpm pack → 清单边界断言 → 手册注入版本/日期；条目数只进 console 报告，不进手册） | `pnpm verify`「release: the exported install manual matches the package」（核 = `scripts/checks/gates/vendor-release.mjs` 的 `exportManualProblems`：钉**三行**——版本对 manifest.version、安装包名对由 name+version 推出的 tgz 名、验证基线对 `vendor/UPSTREAM.md` 的 tag；「打包日期」是生成时读数，不参与门禁（fresh clone 上 `verify` 也要能跑，所以不把生成时读数接进门禁）；要改手册就重跑 `pnpm export-dist`；无 `_dist/` 即无导出，门禁绿） |

## 三、一次性准备（每个 pin 一次）

```sh
pnpm install            # 仓根：并入 vendor/dsh 整树（首次较慢）
bash dev/env/prepare.sh     # 幂等：缺什么补什么（vendor 依赖 → native addon → host+client lib → web dist）
```

它包住的四条命令（产物已在位时本脚本原样跳过，所以重跑安全；手动逐条敲是同一个结果，但要自己记住约束）：

```sh
pnpm --dir vendor/dsh install
pnpm --dir vendor/dsh run build:native-system
pnpm --dir vendor/dsh run build:lib       # host + client 双 face 的 lib/
pnpm --dir vendor/dsh run build:web       # 只有跑 Web UI 才需要（前端 dist）
```

- **为什么包成脚本**：这四条是**起服务的前置**，漏一条的失败点是一句无关的报错（缺 boot lib 时
  `dev/env/setup.sh` 会 fail loud，但它不替你把构建跑一遍）。搬进脚本后，fresh clone 到能起服务只剩
  启动段那条链，每一步都能重跑。

- **known pitfall**：vendor 树的根 `postinstall`（lefthook）在 submodule 里会失败
  （`extensions.worktreeConfig` + `core.worktree` 冲突）。包已全部就位，可忽略；
  但它会卡住 pnpm 的 `verify-deps-before-run` 自动 install —— 用
  `pnpm --config.verify-deps-before-run=false run <script>` 绕过。
- 完整 boot 需要构建产物（40+ client bundle、native addon、各包 `lib/`）；
  `--dump-config` / `--help` 不加载它们，**不能**作为"能 boot"的证据。

## 四、开发环（日常）

命令清单的**唯一表主** = [`commands.md`](commands.md)（起服务五步仍住根 `AGENTS.md`；开发环、验证与评测命令都在 commands.md）。
本节拥有表上各命令的**深判据**（能证明什么/口径/坑），并收**表上没有的行**——清单一份、判据一层，两处各持一份清单必然漂移：

```sh
pnpm test:composition       # 先 pnpm build，再跑 tests/composition 整个目录（Loader 与直挂两条车道）
pnpm test:domain / pnpm test:host / pnpm test:agent / pnpm test:client / pnpm test:tooling   # 层入口：只跑对应 tests/<layer>（各层能/不能证明什么见 docs/testing.md 分层表）
```

（keyless 回放与 web-expected 在 [`commands.md`](commands.md) 上有行；replay 的形状与坑在该 patch 头注。）

**OpenViking 记忆层的 server 由 `setup.sh` 顺带拉起**（实现 = [`dev/env/openviking-up.sh`](../dev/env/openviking-up.sh)，幂等）。
这件事必须自动化，因为它的失败是**安静**的：插件（Node 侧 bundle）拉不起 server——0.5.26 产物里没有任何
spawn/child_process——连不上时按 `catch { /* best effort */ }` 降级，对话照常、记忆不抽取、界面无任何提示。
少了这一步，记忆层在不在全靠人记着敲。

三条纪律钉在脚本里：**幂等**（1933 已健康就复用，不起第二个）；**失败不阻断**（记忆层是可选增强，
server 缺席/未装/起不来一律 warn 后 `exit 0`，`pnpm start` 照常交实例）；**状态落 DSH home**——server 默认写
`~/.openviking/workspace`，那在仓外、会被文件沙箱挡下（实测 `PermissionError: .openviking.lock`），
故从上游 `ov.conf` 派生 `$DSH_HOME/openviking/ov.conf`，把 storage 指到
`$DSH_HOME/openviking/workspace`（持久、gitignored；升级与回滚的备份顺序由 `dev/env/openviking-up.sh` 与 vendor 版本钉守）。server 优先用
`$DSH_HOME/openviking/server/bin/openviking-server`（0.5.1.1 的隔离 venv），缺失时才回退 PATH。

v3 旋钮在 [`dev/profiles/profile-patch-ov.yml`](../dev/profiles/profile-patch-ov.yml)；`setup.sh` 只在该
profile 的 `package.json` 真有 OV 插件时，把这份块追加到 `$DSH_HOME/profiles/<name>/cordis.patch.yml`
（同 id 整行覆盖；`captureToolResults: false`、预算/召回/`commitTokenThreshold` 都在这里）。fresh dev home
没有 OV 插件，不会被追加一条 inactive row。

端点 `127.0.0.1:1933` 是插件 `shared/credentials.mjs` 的缺省值，与 `ov-install.sh` 健康门同一个数；
**改它必须连插件配置一起改**，否则插件连一个没人听的端口，而那正好又是一次静默降级。

**调试面（2026-10-23）**：正常启动不注册。开屏 URL 末尾加 `#debug=1`（token 交换后 fragment 仍在），
或在该 home 的浏览器 localStorage 写 `dsh-assistant-debug=1` 后刷新；任一会话的视图栏出现「开发调试」tab，
显示投影状态 / revision / ledgerId / 事项数 / 选中项 / session id / 会话状态 + 只读投影 JSON + 复制诊断。
它只在会话视图栏，不在主区；不是产品面，客户默认看不到，也不进模型上下文。

**`pnpm eval:domain` 证明什么**：`pnpm eval` 守的是机械地板（技能有没有按名加载、文件有没有真写、该不该动保留项），
它判不了"这个答案对公司对不对"。领域评测集补这一层：**题目由本人出**（真实经营问题），工具逐题跑一次真实 preset
会话，把答案原文 + 机器观测（查了哪些房间、加载了哪些技能、耗时、会话 id）落成一份打分表；质量按
[TEMPLATE.md](../dev/eval/domain/TEMPLATE.md) 里预先定死的四维规则由人打分，机器预评判例的判据也先定死。填题副本默认落在 `dev/eval/domain/` 下的 `questions.local.md`（**已被 .gitignore 排除**——真实经营问题不进 Git）。解析器自带 `--self-check`
并进 `pnpm verify`。

**`pnpm desk-loop` 证明什么**：它把"这东西用起来到底别扭在哪"从**会话日志**里读出来（分类读日志的
**结构**：`source.kind === "user"` 且 `rpcId` 形如 `desk-…` 是面板消息；其它 kind 是注入前言——不猜文本）：
面板动作之后同一行有没有被反复动、同一个决定有没有被答多次；§5 把面板动作之后十分钟内**本人说的话**
原样摆出来供人读，§6 数"真人用面板的那一轮，助手有没有问过自己的房间"（四房间工具一个都没用＝"没查"的
机械信号，口径限定在有面板动作的会话——dev home 里同时住着探针与评测会话）。**不证明**质量，也不做语义分类：那一段留给人（报告里写明限制）。"写了文件"的判定与
评测器共用同一个谓词（[`wrotePath`](../dev/eval/checks.mjs)），所以两处说的是同一个事实。
"面板消息点名技能、桌面文件有没有被重写"不作为指标——面板动作直接走 `assistant-rooms` 写路径，不经过模型重写。
读数工具自己也会读错，所以分析部分与 IO 分离：`pnpm desk-loop --self-check` 拿**合成会话**跑已知答案
（覆盖六类真实误读：注入前言切断窗口、纯文本注入被当成本人的话、协作边界前言冒充本人的话、混合重复被漏、§6 把探针会话算进来、评测题面与面板文案撞车），
并进 `pnpm verify`（与评测器的 `--self-check` 同一约定）：改坏读数逻辑，门禁先红。评测会话剔除判据
（题面命中且单消息非面板，`isEvalOneShot`）的唯一家在 [`dev/lib/eval-sessions.mjs`](../dev/lib/eval-sessions.mjs)，
usage/observe 同源共用。

**preflight 的姊妹：`pnpm shots`（渲染证据）**。preflight 证明"装得上"，不证明"看得见"；
`pnpm shots` 用 headless Chrome **经 CDP** 打开页面（headless 的 `--screenshot` 在 SSE 长连接下
等不到 load，故不用它），带 `--dom` 时每个视口产出两件：`<name>-<WxH>.png`（给人看：审阅、前后对比）与
`<name>-<WxH>.dom.txt`（给读文本的模型与脚本看：可见文本、带像素高度的文本大纲、交互件清单、
boot 诊断、console 错误、失败请求；带 `capturedAt` 供与会话日志对时，比对时忽略）。`visibleText`
是页面文本快照（上限 20000 字符），`textOutline`/`controls` 是结构化的补充面；`--eval` 在截图前执行页面 JS
（开菜单、点 tab 拿交互态证据），**抛错即硬失败**，不会被当成成功继续拍；
`--plain` 是主线程被占死时的兜底（只出图）。它**收 URL、不自起 web**：启动归 `dev/env/dsh.mjs`
的双 home 守卫，截图器不重复实现它。

**Web preset 选择探针**：`pnpm agent-preset-ui '<URL>'` 在运行中的干净实例上打开 Settings → Agent 预设，
点击“设为新任务默认: 章鱼管家”，再断言“新任务默认: 章鱼管家”；它不自动起实例，也不在
`verify`/`test` 里，属于人工走查资产（命令与输出见脚本头注）。

**为什么 preflight（2026-09-24 两轮实锤）**：客户端 bundle 若不能被经典脚本组合解析，
一条语句就让整条 combo 全灭、其后所有注册丢失，浏览器只报一句莫名的 "loaded without
registering"——而第一个打开页面的人就成了 crash-test dummy。`pnpm preflight` 用浏览器
同款姿势（token → cookie → 文档）逐个取回 plugin 组合脚本并用 `new Function` 做**经典脚本
编译检查**（只编译不执行）。它证明：服务器在、认证通、boot 图组装了、每个 combo 可解析、
本仓客户端 bundle 在列且注册在案；**不证明**客户端树真的渲染——那仍是真会话的事。

**两个 profile 是刻意的**：web-app 与 headless 两个 bundle 都 `insert` 了 `id: code-runtime`，
混装进同一个 profile 必撞 `duplicate loader entry id`（DSH 已把该组合列为退役元组）。
- `dev` = `[dsh-base, dsh-web-app, dsh-smart-assistant]`，registry 默认值用 dev/profiles/profile-patch.yml（替换语义）替换 `agent-preset-registry` 行的 config。
- `dev-task` = `[dsh-base, dsh-headless, dsh-smart-assistant]`，registry 用 dev/profiles/profile-patch-headless.yml
  （insert 语义 —— headless 模板里没有 `agent-preset-registry` 行可替换）。两个 patch 文件不可互换。

**一个 profile 装出来是什么**：`dev`（web 模板）与 `dev-task`（headless 模板）两个 profile 住在
`$DSH_HOME/profiles/`；两者都装本插件（`dsh plugin add` 指向 repo 的裸路径 = link 语义），
并分别载入 `dev/profiles/profile-patch.yml`（整行替换）与 `dev/profiles/profile-patch-headless.yml`（insert），
把 roster 的默认 preset 指到本仓的 `assistant`。

**跳过 setup.sh 直接起服务（fresh clone 的第一次就会撞）**：

```sh
$ pnpm dsh --profile dev --port 0 --no-open
Error: dsh: profile "dev" does not exist; create it with 'dsh plugin --profile dev add <package>'
```

DSH 这句提示指向 profile 级的 `dsh plugin add` —— 照它做只能得到一个官方模板 profile：
本插件的 bundle 与 roster 指向都不在里面，起得来但不是本 repo 的 dev 实例。
**正解是 `bash dev/env/setup.sh`**（它建两个 profile、装插件、指 roster）。
判据：`ls "$DSH_HOME/profiles"` 里同时有 `dev` 与 `dev-task`；只缺一个时重跑脚本即可（幂等）。

**三条纪律（为什么"改了不生效"）：**

1. preset 行加载的是**构建物**（package.json exports → `lib/`）——改 `src/` 后必须 `pnpm build`。
   setup.sh 用**裸路径 link**（pnpm 的 symlink 语义）装插件，所以不用重新 `plugin add`；
   `file:` 是复制语义，开发环禁用（改码必须重装）。
2. preset 代际看**组合文件**（`cordis.patch.yml`）的 mtime+size —— 改 `presets/assistant/skills/*` 后
   要 `touch` 该文件，新会话才拿得到新代。
3. 换 vendor/dsh pin 后：`pnpm gen-paths` → 重跑第三节的 vendor 构建 → `pnpm typecheck`。

## 五、踩坑清单（每条都真踩过或有源码证据）

| 坑 | 事实 | 正确做法 |
|---|---|---|
| `pnpm dsh web --profile dev` | `dsh web` 别名**硬编码 profile 'web'**，会在 dev home 里自动创建一个 shipped `web` profile | 用 `pnpm dsh --profile dev`（dev profile 自带 web-app bundle） |
| one-shot 无反应 | one-shot runner 行与位置参数解析都在 `@deepseek-ai/dsh-headless` bundle 的 headless-startup 里；web 模板没有它们 | 用 `dev-task` profile（headless 模板自带 runner 行）；**不要**往 `dev` 追加 headless bundle（§四：混装必撞 duplicate id，setup.sh 反而会把它摘掉） |
| 无 key 的行为 | boot 不失败；首个 live turn 抛 `MISSING_CREDENTIAL`。"self-skip" 是**测试机制**不是产品行为 | 在 `$DSH_HOME/.credentials.yaml` 配 `DEEPSEEK_API_KEY`（或 `$DSH_HOME/.env`） |
| **one-shot 不进 preset** | headless runner 建**裸 agent**，roster 只在"创建会话的一方"被消费（web 会话创建 / 子 agent 继承父 composition）—— vendor 源码注释明文："A deployment that DOES configure one has to join it here first" | preset 行为（工具/persona/摘要段落）用 **dev profile 的 Web UI 会话**验证；dev-task 只冒烟 host 面（插件装载、working folder scaffold、服务行） |
| API 抖动 | `TRANSPORT` 错误（"DeepSeek API request failed"）会触发 attempt 重试循环，模型可能开始即兴行为 | 重试即可；会话日志（`sessions/<proj>/<id>/session.v*.jsonl.zstd`）能逐事件还原 |
| vendor install 失败 | 根 postinstall（lefthook）在 submodule 里必然失败 | 包已就位；build 用 `--config.verify-deps-before-run=false` 绕过 |
| 命令表象不可信 | `--dump-config`/`--help` 不加载 loader entries | "能不能跑"的最低证据 = 真 boot 一次 |
| preset 遮蔽 | 同名 preset 行后到者覆盖（registry 不扫目录，没有 roots 先后） | 组合顺序决定；dev 的 registry 只改 `default` |
| Web 开屏 `resume failed` | 残留的旧 dev web 进程仍持有空白 seed 会话的跨进程写锁（`session.lock` 是 flock 目标，进程死即释放）；web 客户端开屏按 workspace 最新会话自动恢复空白会话，新实例撞锁 | 起新例前 `lsof -iTCP -sTCP:LISTEN -P` 找本仓 cwd 的残留 node 并 kill；锁随进程死亡自动释放，勿手删 |
| build 半途失败留下混合 vendor lib | `tsc -b` 会先重建 references 里的 vendor 引用项目；若本包类型错让 build 中断，vendor lib 停在混合态（症状举例：组合测试全行 `never started`、裸 node 加载 vendor llm 报 `Cannot find module '../package.json'`——llm attribution 经 tsc outDir 后 manifest 不可达） | 修复 = `pnpm repair-vendor`（内建 llm attribution fixup）；build 报错先修错、再重跑 build 至绿，不留半途态 |
| `web_fetch` 全拒 `non-public IP` | 两件事叠加：① 本机 TUN 代理的 **fake-ip DNS** 把所有域名解析到 198.18.0.0/15 保留段；② `web-fetch-http` 的 SSRF 防护只对**直连** hop 做本机解析检查（走代理的 hop 由代理远端解析、**跳过检查**，`web-fetch-http/src/network.ts` 明文）。DSH 只认 env / home `.env` 的 `HTTP(S)_PROXY`（**系统代理 scutil 它不读**），无 env 时一切直连 ⇒ 全灭 | **不用手配**：启动器 `dev/env/dsh.mjs` 条件注入——探测本地代理口（`ASSISTANT_PROXY_URL` 显式指定＞scutil 系统代理口＞默认混合口 7897），活着才注入 `HTTP(S)_PROXY`、死了直连（**有没有 VPN 都能跑**；显式导出过的 env 不被覆盖，`ASSISTANT_PROXY_URL=""` 可禁用）。 |
| **`pnpm typecheck` 之后必须重跑 `pnpm build`** | `typecheck` 委派的是 `tsc -b`，它把 ESM 写进 `lib/`——而 preset 行加载的 classic bundle（`lib/client/index.js`，tsdown 产物）是另一个形状，被这次重建覆盖掉 | 改过 src 的完整链是 `pnpm build` → 跑测试 →（如需）`pnpm typecheck` → **再 `pnpm build`**；漏掉收尾那步由 `pnpm verify` 的 `build:` 门禁抓（ESM 覆盖 classic bundle = 字节不同即红），起服务时 `dev/env/ensure-build.mjs` 也会先自证并补上 |
| 链式命令吞退出码 | `pnpm build \| tail` 这类管道让 tsdown 的失败不体现在 `$?` 上（取到的是 `tail` 的），失败后 `tsc` 的 ESM 覆盖留在 `lib/client`、classic bundle 消失：`&&` 照跑、浏览器探针全灭，而源码级测试仍绿（它们不走 `lib/`） | 链命令**裸跑看 exit**，或用 `${PIPESTATUS[0]}`；「测试绿」不等于「加载物对」——而"加载物不对"这一半由上面的 `build:` 门禁兜住 |
| **verify 的语料 = 已跟踪文件** | markdown 语料取自 `git ls-files`（`markdownCorpusFromTracked`），所以新建的 note/卡**在 `git add` 之前对门禁不存在**：里面的裸指针、断链、状态行问题一律**假绿**，一提交才红（2026-10-18：`build-freshness` note 里一条裸 note 指针就是这样过了一轮 verify） | 收尾三连**在 `git add` 之后跑**（或新文件先 `git add -N`）；报"verify 绿"时说明当时文件是否已入库 |
| 批量 `chmod` 打到 submodule 的 gitlink | `git ls-files` 里 `vendor/dsh` 是一个 `160000` 条目，对文件系统却是目录——`git ls-files -z \| xargs -0 chmod 644` 会摘掉它的**遍历位**（`ls vendor/dsh` 直接 permission denied；submodule 内容与 index 里的 SHA 都没动） | 批量改权限先滤掉 gitlink：`git ls-files -s \| awk '$1 != "160000" {print $4}'`；已经打到了就 `chmod 755 vendor/dsh`，再用 `ls -ld vendor/dsh` 与 `git submodule status` 复核 |
| 经启动器 SIGTERM 只杀启动器 | `pnpm dsh` 是包装层（`dev/env/dsh.mjs` 再 spawn 真 CLI），杀它把真服务留成孤儿——孤儿继续持有账本的 `writer.lock`，下一轮 report/propose 全被「owned by another writer」拒 | 需要编排服务生命周期的探针**直连 vendor CLI bin**（先例：`dev/probes/web/desk-process-e2e.mjs`、release-smoke），自己拿 pid；别用启动器起、再用 pid 杀。人面的一键启动走 `dev/env/start.sh`：preflight 绿即**交接**——打出 URL 与 pid 后本脚本退出、服务独立存活（收掉用 `kill -TERM -- -<pid>`，负 pid 连进程组一起收）；红了不交 URL 并收掉服务 |
| CLI 旗标顺序 | 启动器解析到第一个不认识的 token 为止：`--port` 这类 app 旗标之后的 `--patch` **不会**被透传 | `--patch`（及一切 launcher 不认识的旗标）放在 `--port`/`--no-open` **之前** |
| cordis 属性代理对未声明 inject **直接抛** | 访问没进 `inject` 清单的服务不是返回 `undefined` 而是抛错——整个 async 体静默死掉，而 spec 里用普通对象 mock 的测试**全绿** | 用到哪个服务就进 `inject` 清单（含 `ctx.uiWorkspace` 这类客户端服务）；浏览器专属路径用真浏览器探针取证，别只信 mock |
| 探针的完成信号与被测动作赛跑 | 自动返回/自动切换本身会把会话视图换走，等「终答文本可见」的探针与它赛跑必输（标记永远等不到） | 完成信号取**蕴含整链的后置状态**（如「桌面重新挂载」），不要取被被测动作撤掉的那个中间态 |
| llm-replay 不吃 title 条目 | 会话标题生成的 LLM 调用不走回放脚本条目（走真实 adapter 或直接失败），不影响主回合对齐 | 回放探针只断言主回合的请求侧（system/tools）与会话日志，别把 title 调用算进脚本条目 |
| web-face 重录的 home 必须与场景契约一致 | 在 eval home 上给 blank 场景 `--refresh` 会把真实业务数据录进期望（曾发生，靠契约检查抓回） | 按场景 README 起**该场景自己的隔离 home** 再重录；重录只提交 DOM JSON，PNG 留临时目录人工过目 |
| 浏览器探针在会话挂载相位红 | 该相位含「会话首屏挂载 + 回放 burst」，机器被压满时（实测 load 20–50 / 10 核，来自**别的仓库**的 Playwright/Chrome）任何实现都会假红；探针自己还起过一个回合，回合中 composer 是停止态（没有发送键、粘贴被丢） | `desk-process-e2e.mjs` 的判决带 `host { ncpu, loadavg, evalTimeoutMs }` 与失败 `hostHint`——**红之前先看它**，再决定是否当回归查；预算不够给 `--eval-timeout <ms>`（默认 60s）；粘贴前的 idle 等待是相位 `conversation-idle`，别绕过它 |
| 推送 GitHub 的传输面 | 本机 DNS 走 fake-IP（`github.com` → 198.18.0.0/15 保留段），22 端口被代理接管时会断（症状 `Connection closed by … port 22`）；HTTPS 经 credential helper，非交互可用 | `origin` 的 fetch 与 push URL 都是 HTTPS（`git remote -v` 两行同址），`git fetch`/`git push` 免额外配置；临时走 SSH 用 `git push git@github.com:<owner>/<repo>.git <branch>`，先 `ssh -T git@github.com` 确认 22 可达（它时通时断，别当默认） |

**自动化会话的协作边界**（常量 `COLLABORATION_BOUNDARY` 在 `src/dev/preset-runner/` 里逐会话前置 + 家手册协作边界同一节；**不写在 patch 的 `!!js` 表达式里**——配置层模板字面量会被 overlay 的 YAML 标签求解器拒绝，2026-09-25 真踩过，故新增 `structure: every composition file we own parses as YAML` 门禁）：会话**可以改工作树，
但不得 `git commit`**（提交权属于人或开发会话）；卡上标 🔒 的保留项（`_backlog/issues/`）**不得自行判触发、不得删卡、不得实现**，
只能报告并建议；单发会话无人可问时按推荐值拍板、标注可推翻、继续做完。

**行为评测**：`pnpm eval` 把一组**真实请求**经 preset 会话跑一遍，判定读的是会话日志（不是 stdout）——
任务在 `dev/eval/tasks.mjs`，判定核在 `dev/eval/checks.mjs`（每条任务至少一个正向检查，避免"什么都不做"也通过）；
首条是 `first-open-intake`（fresh home 的开场问句与技能按名加载）；每条任务的判据以 `dev/eval/tasks.mjs` 为准。三条诚实边界写在判定核头部：
`answer-matches` 是正则（会误判措辞）、检查断言的是"没有造成伤害"、任务可能"通过但没用"。
**串行跑**（同仓同 home，并发会互相污染）。headless `dev-task` 没有 credentials service，`runPreset` 优先用环境里的 `DEEPSEEK_API_KEY`，否则从 `dev/harness-home/.credentials.yaml` 的 refs 镜像（不打印）；缺 key 时子进程的 `assistant/attempt` 是 `MISSING_CREDENTIAL`，不能把空答案当成行为红；runner 对无会话日志报 **BLOCKED（exit 2）**，不并入 PASS/FAIL（[BUG-024](../_backlog/_archive/fixed_bugs/BUG-024-eval-baseline-red.md)）。`pnpm eval -- --self-check` 是**live 红控**：把真实事故形态喂给判定核、
要求它判红，并同时要求合规回答判绿——它不跑会话（毫秒级），已接进 `pnpm verify` 链，作为"守卫的守卫"。
**能力边界**：runner 驱动 headless one-shot（`--profile dev-task`），web 绑定插件的能力在那套组合里不注册
（例：`schedule` 要 `sessionController` → `fileUploads` → 浏览器 `connection`，四个 `schedule_*` 工具只在 web 组合出现）；
任务用 `requires: 'web'` 声明这种依赖，runner 对它报 **NOT EVALUATED** 并从 pass/fail 计数里剔除——既不算通过（假绿）
也不算失败（替组合面背锅）。见 `pnpm eval --list` 的标注与 [BUG-008](../_backlog/_archive/fixed_bugs/BUG-008-schedule-tools-missing.md) 的升级路径（web-session 驱动）。

**接续行为地板**：`pnpm eval:continuity` 是隔离 fixture 的聚焦评测——共享 dev home 的任务集判不了"首回合主动交包"这种依赖**已知账本**的行为。它自带一次性 home（仓内 `.tmp/` 起 profiles+插件链接、拷 dev home 凭据、种子账本 `dev/fixtures/eval-continuity/seed-ledger.json` 前置断言先跑）、跑一个真模型续接回合，判据全读会话日志：read 对事项 → 工具结果带委托原话标记（读成功，错误的读回造不了假）→ 先读后答（seq 序）→ 期限/原话/待确认在场 → 无授权写入（无 mutating 调用且账本字节前后不变）。无 key/缺 fixture 记 **BLOCKED** 退出非零，不合并绿项。`--self-check` 把四类负例（无读调用的完整答案、错事项、读失败仍作答、账本被写）喂给判定核要求全红，已接进 `pnpm verify` 链；`--keep` 保留一次性 home 供检查。

**意图级仪表**：`pnpm usage` 读 dev home 的会话日志与 working folder，报会话数、工具混合、自用率、
摩擦（非完成轮/重试）、家的条目数与职责圈事件数（评测会话先剔除——判据与 desk-loop 同源，
`dev/lib/eval-sessions.mjs` 唯一家，剔除数单列一行）；`pnpm usage -- --types` 打印事件类型直方图（形状变了先看它）。
两条硬规则：**dev 工具不得继承 `DSH_HOME`**——会话环境里它可能是日用的 `~/.dsh`，一律用
`ASSISTANT_DSH_HOME` 或仓内 dev home（机械门禁 `structure: dev tooling never inherits DSH_HOME` 管）；
**只报测得到的**——日志没有的字段（如 preset）不报，数字全来自事件计数。

**日志读方前置**：`pnpm usage` / `desk-loop` / `observe` / `eval` 读 `session.v*.jsonl.zstd`，要求 PATH 上有 `zstd`；缺失时 `session-logs` 报含二进制名与日志路径的错误，不把空读数当健康。

**四个真机探针与输入观察（[`commands.md`](commands.md) 上的深判据在这里）**：
`pnpm loop-probe '<URL>' --ask '<问句>'`（首用闭环：**首屏=一页纸**——「今天」/「它记下的」/空态一问或当前页；`--ask` 走首页输入、点「交给它」、等 `[data-one-page]` 出现，JSON 判决带 `homeFirstScreen`/`homeInput`/`pageSeconds`/`pageText` 与 `sessionId`（会话目录快照差集取，不猜；`--home` 旗标解析同其它 dev 工具）；`--follow-up`/`--walk` 仍走桌面/会话路径，首页路径返回 unsupported；`--ask` 会真建会话——先把目标实例起在一次性 home）、
`pnpm desk-walk '<URL>' [--home <dir>]`（处理流真机走查：首屏一页纸→「全部」→「完整看板」→处理一件事→一句进展→返回不变量→交代新事，
产出屏幕文本+截图供人判话术/层级，**进会话相位各记 sessionId**；`--home` 才能核账本身份与「回来⇒无待确认」）、
`pnpm projection-live [--home <dir>]`（live 补证：从一页纸进完整看板后，断连/重连、3 次页面重载会话不增殖、420×900 窄视口
选择保留与无横向溢出、滚动位置保留；自编排共享 probe home（首次先 `prepare.sh` + `setup.sh`），无模型回合）、
`pnpm projection-selection '<URL>'`（交互证据门：一页纸点「看依据」并核对 quote 与 source Session/event 读回；
实例须带 `dev/fixtures/desk-projection/eight-matters.json` 夹具；无模型、无截图）、
`pnpm observe [--home <dir>]`（输入边界 30 天观察读数：A 自发投递 / B 时长 / C 入口后的操作；
口径、剔除规则与每周快照落 `_backlog/research/261011-input-observation/`）。

**并行会话（同一仓库）**：一棵工作树 + 一个 dev home 同时跑多个会话会互相污染——真实发生过一次：
一个会话的提交把另一个会话未提交的 `page.ts` 改动扫了进去。两种正当做法：**串行**（一个窗口一个会话），
或**各用 worktree**（各自的工作树 + 各自 `DSH_HOME`）；无论哪种，提交只 add 自己改的路径（根 `AGENTS.md` 硬规则 3）。
共用 dev home 时账本写锁按实例持有：实验/复跑只要写一次账本，就会把 live 实例的写挡到它退出为止
（拒绝信息给 pid/cwd 与处置命令，见 [`docs/operating.md`](operating.md) §一）——**会写账本的实验用隔离 home**，
模型行为复跑优先复制账本到一次性 home。

## 六、入口路由（先判断你要证明什么）

| 意图 | 命令 | 观察对象 | 不要从它推出 |
|---|---|---|---|
| 看配置组合 | `pnpm dsh --profile dev --dump-config` | bundle/profile/临时 patch 的行、id、disabled、realm | 运行时注册、DOM 或模型请求 |
| 验 host 面 | `pnpm dsh --profile dev-task "one task"` | 插件装载、host 服务、working folder scaffold | preset 工具与提示词 |
| 验 assistant preset | `pnpm dsh --profile dev-task --patch dev/probes/session/preset-runner.patch.yml "one task"` | one-shot 挂载 preset 后的会话驱动 | 浏览器渲染 |
| 验 Web 面 | `pnpm dsh --profile dev --port 0 --no-open` + `pnpm preflight '<URL>'` | Web boot、Remote、rooms route 可达 | DOM 期望；再跑 `pnpm web-expected '<URL>' --scenario <场景>`（场景必填） |
| 验请求侧组装 | `pnpm dsh --profile dev-task --patch dev/probes/session/preset-runner-replay.patch.yml "probe"` | keyless replay 的 system/tools/session log | 固定回复代表模型自主选择 |
| 逐事件复盘某次会话 | `zstd -dc "$DSH_HOME/sessions/<proj>/<id>/session.v*.jsonl.zstd"`（代数在文件名里：先列目录再选；过滤样例：`.agents/skills/repo-live-probe/`） | 请求侧 system/tools 与 tool/result 逐字日志 | 不证明模型自主选择（回放车道回复是录制的） |

当前 assistant preset 的定义来源是安装包的 `dsh.bundle.patch`，实际文件为 `packages/dsh-smart-assistant/cordis.patch.yml` 中的 `preset-assistant` 行；headless profile 本身没有 roster，必须使用 `preset-runner.patch.yml` 才会挂载 assistant preset。

## 七、组合的四个层（dev 里谁改谁生效）

层的机制在 `vendor/dsh/docs/architecture.md`：bundle，然后 profile 的 `cordis.patch.yml`，然后 home 级 patch，然后 `--patch`；patch 按 id 整行替换 config，或插入新行。下面是本仓两个 profile 实际叠的链。id 没命中只 warn。

```text
bundle 层（两个 profile 各自的链，刻意的——§四，web-app 与 headless 不可混进同一 profile）：
  dev      = @deepseek-ai/dsh-base → dsh-web-app  → dsh-smart-assistant
  dev-task = @deepseek-ai/dsh-base → dsh-headless → dsh-smart-assistant
  → profiles/<name>/cordis.patch.yml     # setup.sh 拷贝：dev 用 dev/profiles/profile-patch.yml（替换语义），
                                          #   dev-task 用 dev/profiles/profile-patch-headless.yml（insert 语义，两文件不可互换）；
                                          #   OV 插件在场时追加 dev/profiles/profile-patch-ov.yml（v3 旋钮）
  → $DSH_HOME/cordis.patch.yml           # home 级（作用于该 home 全部 profile）—— dev 不用它
  → --patch                              # 临时覆盖
```

诊断组合用 `pnpm dsh --profile dev --dump-config`（boot-free，输出整棵组合树）。

## 八、入库边界（什么进 git、什么不进）

开源之后，检出的机器不是本机：用户名、home、OS、时区、locale、端口、凭据、工具版本都不一样。仓库内容必须
**在别人的机器上同样成立**，否则第一次 clone 就欠一次打扫。判据是三问，有一问答不上就不入库：

1. **换一台机器，它是否逐字节相同？**（绝对路径、用户名、home、OS 分支结果、时区、locale、端口、凭据都会让它不同）
2. **入库之后谁保证它还是真的？**（`pnpm verify` 门禁 / 同 diff 人审的基线 / 生成器 + freshness 检查；三者皆无 = 不入库）
3. **它机器相关但还是必须留？**（录制证据）→ 必须声明"不参与任何判定"，且消费方按声明办事。

| 类别 | 例 | 入库 | 机制（重建 / 守卫） |
|---|---|---|---|
| 源与合同 | `src/`、`tests/`、`docs/`、`notes/`、`_backlog/`、`.agents/skills/` | ✅ | 门禁按面守（链接、语言、文本、组合） |
| 有 freshness 门禁的生成物 | `docs/package-catalog.md`、`tsconfig.tsx.json`、安装手册 | ✅ | 重建 = `pnpm gen-catalog` / `pnpm gen-paths` / `pnpm export-dist`；§二登记表 |
| 无门禁的构建产物 | `lib/`、`dist/`、bundle、`*.tsbuildinfo`、`coverage/` | ❌ | `.gitignore`；重建 = `pnpm build` / `pnpm test` |
| 证据基线 | web 渲染期望、`dev/fixtures/` 的夹具与录制语料 | ✅ | 录一次、重放比对、`--refresh` 或重录后人工审 diff |
| 运行态 / 机器态 | `dev/harness-home/`、`dev/trial-home*`、`.desk/`、`.pi/`、`.tmp/`、`node_modules/`、`.pnpm-store/` | ❌ | `.gitignore`；重建 = `setup.sh` / 起服务 / `pnpm sweep` |
| 秘密与本机环境 | `.env`、`.credentials.yaml` | ❌ | `.gitignore`；装法写文档 |
| 钉存的上游二进制 | `vendor/thirdparty/openviking/` 的 tgz | ✅（显式例外） | `.gitignore` 的白名单 + 旁边 README 的准入/回退记录 |
| 锁文件 | `pnpm-lock.yaml` | ✅ | 可复现性；安装与 CI 都靠它 |
| 分发产物 | `_dist/` 下的 tgz | ❌ | 重建 = `pnpm export-dist` |

**开源多环境条款**（入库内容不得编码本机）：

- 数据/配置文件（`*.json` `*.jsonl` `*.yml` `*.yaml`）里禁止宿主绝对路径（macOS 的用户目录、Linux 的 home
  目录、盘符路径）。录制语料是唯一例外，且必须像
  [`dev/fixtures/desk-process/README.md`](../dev/fixtures/desk-process/README.md) 那样写明"不参与判定"。
- 期望值对时区/locale 稳定：时间断言注入固定时区或固定时钟，不拿本地化输出当基线。
- 路径一律相对仓根、相对 home 或相对 session workspace；不写 `$HOME` 拼出来的字面量。
- 工具版本只由 pin 文件表达（`pnpm-lock.yaml`、`vendor/UPSTREAM.md`、`.gitmodules`）；文档不写"我这台是 X 版本"。
- 文本 UTF-8 + LF + 单个结尾换行（`text:` 门禁）；文件模式只信 git 的 exec 位，脚本要么 755 要么用 `bash`/`node` 调用。
- 端口不写死（`--port 0` 让 OS 分配）；凭据从 home/环境来，不进任何 tracked 文件。

**机制（谁在守）**：

| 面 | 收口点 |
|---|---|
| 规则本体 | 本节 + 根 `AGENTS.md` 硬规则 9（常设指令面只留指针） |
| ignore 面 | `.gitignore`（含"必须入库"的反向清单注释）；`pnpm verify`「commit safety: residue and credentials are ignored」 |
| 已跟踪内容 | `pnpm verify`「commit safety: tracked files are content, not residue」（构建/运行残留 + 1 MiB 体积上限）与「commit safety: tracked data files carry no host-absolute paths」；纯核 `trackedContentProblems`/`trackedDataPaths`，负例夹具 = `tests/tooling/commit-safety.spec.mjs` |
| 文档面 | `pnpm verify`「links: contract docs cite no machine-local absolute paths」 |
| 新类别 | 加文件/加目录前先过本节表；新增一类"合法例外"要同 diff 写理由（README 或本表），不靠口头约定 |

**快捷版**：`git status --ignored` 里出现的东西默认不入库；要破例的那一个，必须能回答"谁在守它还是真的"和
"它在别人机器上是否同样成立"——两问答不上，它就该是 ignore + 一条重建命令。

## 九、发布与标签（标签名 = 该提交里的包版本）

**规则与禁则 = [`release.md`](release.md)**；本节只写操作顺序，不重复宪章。

版本只有两个动作：**bump manifest** 和 **export**。标签是这次发布的名字，所以它必须等于它在的那个提交里的
`packages/dsh-smart-assistant/package.json` 版本——`0.1.0` 打在 manifest 还写 `0.0.0` 的提交上，等于给一个
不存在的产物命名。步骤固定：

1. bump 两处 `version`（根 private 工作区 + 插件包），两处同值；
2. `pnpm export-dist` —— tgz 与安装手册一起重出（手册的版本行、安装包行由 `release:` 门禁对 manifest 守）；
3. `pnpm verify && pnpm release-smoke`；
4. 提交，然后把 `git tag -a <版本>` 打在**这个**提交上，`git push origin master <版本>`。

门禁：`release: every tag names the package version at its commit`（纯核 `tagVersionProblems`，负例夹具 =
`tests/tooling/vendor-release.spec.mjs`）。它同时兜住两种错法：tag 打了但 manifest 忘 bump，bump 了但 tag 用旧名。
标签一律 annotated（`git tag -a`）、不带 `v` 前缀——名字要逐字等于版本，才比得出来。
