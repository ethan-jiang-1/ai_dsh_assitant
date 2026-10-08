# 启动与调试（dev 运行手册 · 只写现在）

> 这份手册回答：怎么在不碰日用 DSH 的前提下，从零跑起本插件的 dev 实例。
> working folder 的布局契约在 `docs/home.md`；插件架构在 `docs/architecture.md`。

## 一、隔离模型（什么被隔离、什么没有被隔离）

一切持久化的根是 `DSH_HOME`（解析优先级：显式配置 > `$DSH_HOME` > `~/.dsh`）。
**dev 实例默认 = `DSH_HOME=<repo>/dev/harness-home`**，由 `dev/env/dsh.mjs`（`pnpm dsh` 的唯一入口）
无条件强制 —— 继承来的 `DSH_HOME=~/.dsh` 会被覆盖并在 stderr 打一行说明。
**唯一出口是 `ASSISTANT_DSH_HOME`**，且它对**启动器和两个 dev 脚本一致生效**
（`dev/env/env.sh` 是后者的收口处）：指向日用 `~/.dsh` 时不拦截但打显著警告（与启动器同语义——只让发生的事可见）。
**用隔离 home 跑实验必须建 profile 与起服务同 home**：profile 由 `dev/env/setup.sh` 建、由 `pnpm dsh` 读，
两边不同就会看到 `profile "dev" does not exist`——而它说的是实话，只是没说"你建在另一个 home 了"。

落到另一个 home 的完整命令串（对根 `AGENTS.md` 命令表的 ②③④⑤ **每一条**前置同一变量，
漏加到任意一条就会踩上面那句报错）：

```sh
export ASSISTANT_DSH_HOME=/tmp/my-trial-home
bash dev/env/prepare.sh && bash dev/env/setup.sh
ls "$ASSISTANT_DSH_HOME/profiles"          # 判据：应见 dev 与 dev-task
pnpm dsh --profile dev --port 0 --no-open  # 起服务与验证命令（preflight/shots/dump-config）同样带着这个变量
```

| 通道 | 是否随 DSH_HOME 隔离 | dev 的处理 |
|---|---|---|
| profiles / sessions / storages / attachments / settings / credentials / 技能用户根 / `.agent-presets` / assistant working folder 的 dataDir（默认值；显式 `dataDir` 覆盖例外，见 `docs/home.md`） | ✅ | 自动落在 dev home |
| skills 的共享 agent 根（默认 `~/.agents`） | ❌ 不隔离 | 启动器接管为 `$DSH_HOME/agents-home`（仅当未显式设置；`dev/env/env.sh` 则无条件强制） |
| telemetry | 身份按 home 独立；默认 FEEDBACK_ONLY | 启动器设 `DSH_TELEMETRY_DISABLED=1` |
| spill 临时文件 | ❌ 用 OS tmpdir（`dsh-spill-*`），启动清扫会清过期文件 | 低危：dev 启动可能清掉日用实例**已过期 30 天**的临时输出 |
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
| `tsconfig.tsx.json` | `scripts/generate/gen-paths.mjs`（`pnpm gen-paths`，从 vendor/dsh 全量别名） | `pnpm verify`「facade: the runtime tsconfig for the source launch is present and current」 |
| `docs/package-catalog.md` | `scripts/generate/gen-catalog.mjs`（`pnpm gen-catalog`） | `pnpm verify`（`gen-catalog --check`，与 `gen-paths` 同形） |
| `packages/dsh-smart-assistant/lib/` | `pnpm build`（`tsc -b` 出 d.ts 与各模块 js；`tsdown` 把 `src/client` 多模块打成 `lib/client/index.js` 单文件 classic script） | 无独立 freshness 门禁：组合测试与 `release-smoke` 消费它，过期即红 |
| `dev/harness-home/`（scaffold 出的 SOUL/AGENTS 等） | 插件运行时 `ensureHome`（`src/domain/home/layout.ts` 是唯一 owner） | `curate` 的 `manual-stale-scaffold` finding |
| `_dist/安装手册.md`（同目录 tgz 走 `*.tgz` ignore，不入库） | `scripts/release/export-dist.mjs`（`pnpm export-dist`：pnpm pack → 清单边界断言 → 手册注入版本/日期/条目数） | `pnpm verify`「release: the exported install manual matches the package」（手册版本行对包 manifest 防漂；无 `_dist/` 即无导出，门禁绿） |

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
  命令表那条链，每一步都能重跑。

- **known pitfall**：vendor 树的根 `postinstall`（lefthook）在 submodule 里会失败
  （`extensions.worktreeConfig` + `core.worktree` 冲突）。包已全部就位，可忽略；
  但它会卡住 pnpm 的 `verify-deps-before-run` 自动 install —— 用
  `pnpm --config.verify-deps-before-run=false run <script>` 绕过。
- 完整 boot 需要构建产物（40+ client bundle、native addon、各包 `lib/`）；
  `--dump-config` / `--help` 不加载它们，**不能**作为"能 boot"的证据。

## 四、开发环（日常）

```sh
bash dev/env/setup.sh          # 幂等：建 dev（web）+ dev-task（headless）两个 profile + link 装插件
pnpm dsh --profile dev-task "one task"   # one-shot 任务（headless）＝ host 面冒烟；不进 preset（§五）
pnpm dsh --profile dev-task --patch dev/probes/session/preset-runner.patch.yml "<task>"   # preset 挂载的 one-shot（验证自动化；行替换形状见该 patch 头注）
pnpm dsh --profile dev-task --patch dev/probes/session/preset-runner-replay.patch.yml "<task>"   # 同上但 keyless：现货 `llm-replay` 整脚本回放替掉真实 DeepSeek adapter，无 API key 也能产出真实会话日志（请求侧 system/tools 进日志＝live 探针的被测面）；形状与坑见该 patch 头注
pnpm dsh --profile dev --port 0 --no-open   # Web UI：**不自动开浏览器**
pnpm preflight '<server 打印的 URL>'    # 开屏前检查；绿了才把 URL 交给浏览器
pnpm shots '<server 打印的 URL>' --dom --size 1600x1000 --name <名字>   # 渲染证据：PNG + DOM 证据（默认落 /tmp/dsh-webui-shots）
pnpm web-expected '<server 打印的 URL>'   # web 面期望比对：真拍一张与已提交期望比对（漂移 exit 1）；`--refresh` 重录期望（场景契约与判据：snapshots/web-face/blank-first-open/README.md）
pnpm loop-probe '<server 打印的 URL>' --ask '<问句>'   # 首用闭环探针：无头 Chrome 真点真发问真等回复，JSON 判决（首屏断言 + 全产品环；驱动借自 ai_dsh_loop_advisor，`--ask` 会真建会话——指向一次性 home）
pnpm desk-loop              # 培养循环摩擦报告：从真实会话日志读「点了没反应 / 反复点 / 答了多次 / 技能没加载」
pnpm eval:domain            # 领域评测集 v0（G2）：把本人出的真实经营问题逐题跑一遍，产出**给人打分**的报告（题目格式见 dev/eval/domain/TEMPLATE.md）
pnpm ov-trial-rt            # OpenViking 试点第 5/6 步驱动：server 级记忆往返 + 抽取质量抽评（建会话→塞哨兵语料→commit→等抽取→找回→读抽取物；前提 server 在 127.0.0.1:1933）
pnpm test:composition       # 先 pnpm build，再跑真实 shipped preset 组合 spec
pnpm test:domain / pnpm test:host / pnpm test:agent / pnpm test:client / pnpm test:tooling   # 层入口：只跑对应 tests/<layer>（各层能/不能证明什么见 docs/testing.md 分层表）
pnpm typecheck && pnpm test && pnpm verify
```

**`pnpm eval:domain` 证明什么**：`pnpm eval` 守的是机械地板（技能有没有按名加载、文件有没有真写、该不该动保留项），
它判不了"这个答案对公司对不对"。领域评测集补这一层：**题目由本人出**（真实经营问题），工具逐题跑一次真实 preset
会话，把答案原文 + 机器观测（查了哪些房间、加载了哪些技能、耗时、会话 id）落成一份打分表；质量按
[TEMPLATE.md](../dev/eval/domain/TEMPLATE.md) 里预先定死的四维规则由人打分，G2 判据也先定死。填题副本默认落在 `dev/eval/domain/` 下的 `questions.local.md`（**已被 .gitignore 排除**——真实经营问题不进 Git）。解析器自带 `--self-check`
并进 `pnpm verify`。

**`pnpm desk-loop` 证明什么**：它把"这东西用起来到底别扭在哪"从**会话日志**里读出来（分类读日志的
**结构**：`source.kind === "user"` 且 `rpcId` 形如 `desk-…` 是面板消息；其它 kind 是注入前言——不猜文本）：
面板动作之后桌面文件有没有真的被重写、同一行有没有被反复动、同一个决定有没有被答多次、面板点名了
`desk-refresh` 的那一轮有没有真的加载它——§1/§4 的**分子分母都只算"点名了技能"的那些动作**（没点名的点击
本来就没承诺重写桌面），表头同时印出两个分母，免得口径混用；§5 把面板动作之后十分钟内**本人说的话**
原样摆出来供人读，§6 数"真人用面板的那一轮，助手有没有问过自己的房间"（四房间工具一个都没用＝"没查"的
机械信号，口径限定在有面板动作的会话——dev home 里同时住着探针与评测会话）。**不证明**质量，也不做语义分类：那一段留给人（报告里写明限制）。"写了文件"的判定与
评测器共用同一个谓词（[`wrotePath`](../dev/eval/checks.mjs)），所以两处说的是同一个事实。
读数工具自己也会读错，所以分析部分与 IO 分离：`pnpm desk-loop --self-check` 拿**合成会话**跑已知答案
（覆盖六类真实误读：注入前言切断窗口、纯文本注入被当成本人的话、协作边界前言冒充本人的话、混合重复被漏、§6 把探针会话算进来、评测题面与面板文案撞车），
并进 `pnpm verify`（与评测器的 `--self-check` 同一约定）：改坏读数逻辑，门禁先红。

**preflight 的姊妹：`pnpm shots`（渲染证据）**。preflight 证明"装得上"，不证明"看得见"；
`pnpm shots` 用 headless Chrome **经 CDP** 打开页面（headless 的 `--screenshot` 在 SSE 长连接下
等不到 load，故不用它），每个视口产出两件：`<name>-<WxH>.png`（给人看：审阅、前后对比）与
`<name>-<WxH>.dom.txt`（给读文本的模型与脚本看：可见文本、带像素高度的文本大纲、交互件清单、
boot 诊断、console 错误、失败请求）。`--eval` 在截图前执行页面 JS（开菜单、点 tab 拿交互态证据），
`--plain` 是主线程被占死时的兜底（只出图）。它**收 URL、不自起 web**：启动归 `dev/env/dsh.mjs`
的双 home 守卫，截图器不重复实现它。

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
| **one-shot 不进 preset** | headless runner 建**裸 agent**，roster 只在"创建会话的一方"被消费（web 会话创建 / 子 agent 继承父 composition）—— vendor 源码注释明文："A deployment that DOES configure one has to join it here first" | preset 行为（四工具/persona/摘要段落）用 **dev profile 的 Web UI 会话**验证；dev-task 只冒烟 host 面（插件装载、working folder scaffold、服务行） |
| API 抖动 | `TRANSPORT` 错误（"DeepSeek API request failed"）会触发 attempt 重试循环，模型可能开始即兴行为 | 重试即可；会话日志（`sessions/<proj>/<id>/session.v*.jsonl.zstd`）能逐事件还原 |
| vendor install 失败 | 根 postinstall（lefthook）在 submodule 里必然失败 | 包已就位；build 用 `--config.verify-deps-before-run=false` 绕过 |
| 命令表象不可信 | `--dump-config`/`--help` 不加载 loader entries | "能不能跑"的最低证据 = 真 boot 一次 |
| preset 遮蔽 | 同名 preset 行后到者覆盖（registry 不再扫目录，没有 roots 先后） | 组合顺序决定；dev 的 registry 只改 `default` |
| Web 开屏 `resume failed` | 残留的旧 dev web 进程仍持有空白 seed 会话的跨进程写锁（`session.lock` 是 flock 目标，进程死即释放）；web 客户端开屏按 workspace 最新会话自动恢复空白会话，新实例撞锁 | 起新例前 `lsof -iTCP -sTCP:LISTEN -P` 找本仓 cwd 的残留 node 并 kill；锁随进程死亡自动释放，勿手删 |
| build 半途失败留下混合 vendor lib | `tsc -b` 会先重建 references 里的 vendor 引用项目；若本包类型错让 build 中断，vendor lib 停在混合态（症状举例：组合测试全行 `never started`、裸 node 加载 vendor llm 报 `Cannot find module '../package.json'`——llm attribution 经 tsc outDir 后 manifest 不可达） | 修复 = `pnpm repair-vendor`（内建 llm attribution fixup）；build 报错先修错、再重跑 build 至绿，不留半途态 |
| `web_fetch` 全拒 `non-public IP` | 本机 TUN 代理的 **fake-ip DNS** 把所有域名解析到 198.18.0.0/15 保留段；`web-fetch-http` 的 SSRF 防护只对**直连** hop 做本机解析检查（走代理的 hop 由代理远端解析、**跳过检查**，`web-fetch-http/src/network.ts` 明文）；DSH 只认 env / home `.env` 的 `HTTP(S)_PROXY`——**系统代理（scutil）它不读**，无 env 时一切直连 ⇒ 全灭 | **不用手配**：启动器 `dev/env/dsh.mjs` 条件注入——探测本地代理口（`ASSISTANT_PROXY_URL` 显式指定＞scutil 系统代理口＞默认混合口 7897），活着才注入 `HTTP(S)_PROXY`、死了直连（**有没有 VPN 都能跑**；显式导出过的 env 不被覆盖，`ASSISTANT_PROXY_URL=""` 可禁用）。 |

**自动化会话的协作边界**（常量 `COLLABORATION_BOUNDARY` 在 `src/dev/preset-runner/` 里逐会话前置 + 家手册协作边界同一节；**不写在 patch 的 `!!js` 表达式里**——配置层模板字面量会被 overlay 的 YAML 标签求解器拒绝，2026-09-25 真踩过，故新增 `structure: every composition file we own parses as YAML` 门禁）：会话**可以改工作树，
但不得 `git commit`**（提交权属于人或开发会话）；卡上标 🔒 的保留项（`_backlog/issues/`）**不得自行判触发、不得删卡、不得实现**，
只能报告并建议（机械门禁 `reserved items` 查标记形态）；单发会话无人可问时按推荐值拍板、标注可推翻、继续做完。

**行为评测**：`pnpm eval` 把一组**真实请求**经 preset 会话跑一遍，判定读的是会话日志（不是 stdout）——
任务在 `dev/eval/tasks.mjs`，判定核在 `dev/eval/checks.mjs`（每条任务至少一个正向检查，避免"什么都不做"也通过）；
首条是真实事故回归：会话把标为保留（🔒）的卡判为触发、实现、并删卡。三条诚实边界写在判定核头部：
`answer-matches` 是正则（会误判措辞）、检查断言的是"没有造成伤害"、任务可能"通过但没用"。
**串行跑**（同仓同 home，并发会互相污染）。`pnpm eval -- --self-check` 是**live 红控**：把真实事故形态喂给判定核、
要求它判红，并同时要求合规回答判绿——它不跑会话（毫秒级），已接进 `pnpm verify` 链，作为"守卫的守卫"。

**意图级仪表**：`pnpm usage` 读 dev home 的会话日志与 working folder，报会话数、工具混合、自用率、
摩擦（非完成轮/重试）、家的条目数与职责圈事件数；`pnpm usage -- --types` 打印事件类型直方图（形状变了先看它）。
两条硬规则：**dev 工具不得继承 `DSH_HOME`**——会话环境里它可能是日用的 `~/.dsh`，一律用
`ASSISTANT_DSH_HOME` 或仓内 dev home（机械门禁 `structure: dev tooling never inherits DSH_HOME` 管）；
**只报测得到的**——日志没有的字段（如 preset）不报，数字全来自事件计数。

**并行会话（同一仓库）**：一棵工作树 + 一个 dev home 同时跑多个会话会互相污染——真实发生过一次：
一个会话的提交把另一个会话未提交的 `page.ts` 改动扫了进去。两种正当做法：**串行**（一个窗口一个会话），
或**各用 worktree**（各自的工作树 + 各自 `DSH_HOME`）；无论哪种，提交只 add 自己改的路径（根 `AGENTS.md` 硬规则 3）。

## 六、入口路由（先判断你要证明什么）

| 意图 | 命令 | 观察对象 | 不要从它推出 |
|---|---|---|---|
| 看配置组合 | `pnpm dsh --profile dev --dump-config` | bundle/profile/临时 patch 的行、id、disabled、realm | 运行时注册、DOM 或模型请求 |
| 验 host 面 | `pnpm dsh --profile dev-task "one task"` | 插件装载、host 服务、working folder scaffold | preset 工具与提示词 |
| 验 assistant preset | `pnpm dsh --profile dev-task --patch dev/probes/session/preset-runner.patch.yml "one task"` | one-shot 挂载 preset 后的会话驱动 | 浏览器渲染 |
| 验 Web 面 | `pnpm dsh --profile dev --port 0 --no-open` + `pnpm preflight '<URL>'` | Web boot、Remote、desk readiness | DOM 期望；再跑 `pnpm web-expected` |
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
                                          #   dev-task 用 dev/profiles/profile-patch-headless.yml（insert 语义，两文件不可互换）
  → $DSH_HOME/cordis.patch.yml           # home 级（作用于该 home 全部 profile）—— dev 不用它
  → --patch                              # 临时覆盖
```

诊断组合用 `pnpm dsh --profile dev --dump-config`（boot-free，输出整棵组合树）。
