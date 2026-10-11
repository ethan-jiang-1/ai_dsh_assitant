# AGENTS.md —— 本 repo 的常驻规则与入口链

> 给 coding agent 读的开工说明：怎么跑、东西在哪、改动走哪条路。
> 详细契约在 `docs/`（只写**现在**）；开发提案、活跃决策与验证依据在 `notes/`；身份名以 `docs/identity.md` 为唯一权威。

## 这是什么

一个 DSH 插件 repo：**一个领域专家式的助手**（`dsh-smart-assistant`）。
它给 agent 一个自己的 **working folder**（跨会话的工作目录 = 本插件的 `dataDir`，**不是**进程 cwd/workspace）：长期记忆 + 领域知识 + 学到的技能 + 机器能跑的养护检查。
核心命题是 `Agent = Model + Harness` —— 本 repo 做的就是"那一圈"。
给谁、怎样算干成（P1–P3 / O1–O6 方向判据与装法的唯一家）= [`README.md`](README.md)。

## 新会话开工（先读这段）

**意图从哪来**（两通道，各管各的）：① **用户本轮请求**——唯一外部通道，本轮范围由它决定；
② **已立项的内部工作项**——`notes/proposed/` 的提案卡（**待用户拍板**：点名或点头即开工；卡片骨架与毕业门禁以 [`notes/README.md`](notes/README.md) §二之二 为准）
与 `_backlog/issues/` 的问题卡（只有用户点名才开工，流程与关闭条件见 [`_backlog/README.md`](_backlog/README.md)）。
缺陷当场修掉不建卡；这次不修的记 `_backlog/bugs/`（默认不修，唯一的自授权例外通道见其 README）。

**能不能不经呈批直接开工**（此表只做单一判断，范围细则在各 owner）：

| 本轮工作 | 直接开工？ |
|---|---|
| 用户本轮明确点名的具体任务 | 能——范围 = 本轮请求 |
| 已授权切片的轮内延续（授权记在 proposed 卡状态行） | 能——按卡上范围 |
| 翻到修复就绪的缺陷卡（P1/P2 且不触例外清单） | 能——翻转即授权，边界见 [`_backlog/bugs/README.md`](_backlog/bugs/README.md) 修复通道节 |
| 机械与局部编辑（口径 = note 义务豁免，[`notes/README.md`](notes/README.md) §〇） | 能 |
| 跨切片的新工作 / 流程面改动 / 模型可见面新能力 | 不能——先立 proposed 卡呈批，等点头或点名 |

**没有用户任务时不发明任务**——报告家况（`pnpm usage`），或按点名的卡推敲/实施；不要从 git log 或记忆发明任务。
重大未来工作先在 `_backlog/issues/` 推敲，成熟并进入跨会话实施前用 `notes/proposed/` 显式承载；不为小修立空壳卡或重复呈批。

**开工先定外部结果**：非机械任务动手前先落**外部结果三要素**——触发条件 / 用户看到或得到什么 / 完成条件（载体 = plan 呈批，或承载该切片的收口卡首节——收口卡是什么见 [`_backlog/issues/README.md`](_backlog/issues/README.md)）；实现选择不先于意图定义，交付记录按它收口；机械/局部编辑豁免（同上表）。
深评的原料住 `_backlog/research/`。收卷后还会被重提的事实写进决定 note，不另留调研目录——看不见的工作等于没在做。
代码里的 `TODO/FIXME` 不立项，只在代码内。
**Note 的义务、取代检查与生命周期以 [`notes/README.md`](notes/README.md) 为唯一权威**（何时写、输掉的方案、
rejected 政策、命名——本文件不复制）；改行为、契约或开发流程前，按任务链接或机制名查相关 notes。
交接即此链：AGENTS.md（本文件）→ 三个卡清单（`_backlog/issues/`、`_backlog/bugs/`、`notes/proposed/`——清单为空 = 无待续工作）→ 各卡。

同一个多步流程第三次被重新推演时，就把它立成一件开发技能（放 `.agents/skills/`）——这是"重复即建"的常设规则，不占工作面。
**两类 Skill，别混**：`.agents/skills/` 是**开发用**（给改这个仓库的 agent：证据路由、探针、
审计、UI 贡献约束等——由 DSH 原生 `project-agents` 根发现，进目录即入技能目录）；`packages/dsh-smart-assistant/presets/assistant/skills/`
是**模型用**（**策展技能**，随 preset 走）；working folder 的 skills/ 房间里还有**学到的技能**（第三处，合同 = [`docs/home.md`](docs/home.md)）。
同名不同机制，不共享 registry。
**方法不是技能**：`_backlog/methods/` 的方法文件同为 agent 执行面（英文、SKILL 式 frontmatter），但它是推敲方法、住 backlog，不进任何技能发现根——见 [`_backlog/methods/README.md`](_backlog/methods/README.md)。

## 布局（改动前先认领 owner 面）

**一个事实一个家**（tier）：`AGENTS.md` 只拥有**常设指令与路由**（无状态、无日期、无进度）；
`docs/` 拥有**当前合同**（门禁住了的事实，只写现在）；`notes/` 拥有**决定理由与证据**（含输掉的
方案与历史）；代码的 README/JSDoc 拥有**模块级契约**（与代码同 diff 维护）。写在别处即第二份清单，
必然漂移——链接过去，不复制。

| 路径 | 是什么 | 谁能改 |
|---|---|---|
| `packages/dsh-smart-assistant/` | **插件包**（bundle）：入口×平面、自有工具×动词、组合行、pin 与依赖姿态见生成物 `docs/package-catalog.md`；包内 owner 面与纪律见其 `AGENTS.md` | 改模型可见面 / 服务 / 布局动这里 |
| `docs/` | **当前合同**（只写现在，无历史）—— 文档 tier 与"谁拥有什么"见其 `AGENTS.md` | 门禁住了的事实进这里 |
| `notes/` | **开发记忆与证据链**（分类 owner：`notes/README.md`）：`proposed/` 将来 → `implemented/` 当前权威 → `archived/` 冻结历史；`rejected/` 存负知识与一行原因 | 决策与输掉的方案进这里 |
| `_backlog/` | **推敲空间**（门牌 [`_backlog/AGENTS.md`](_backlog/AGENTS.md)：落进区域的 agent 先读）：还没定的事在 `issues/`（`YYMMDD-`），这次不修的缺陷在 `bugs/`（`BUG-`），调研在 `research/`，方法在 `methods/`，离开活跃区的在 `_archive/`。只装判断材料、**永不调度**；流程与关闭条件见其 `README.md`；`triggers.md` 只收工作里会撞上的观察（批量推进、真机走查、阶段收口时扫这张短表） | 收割/走查/对话中值得推敲但未到裁决的思考在此立卡 |
| `dev/` | 开发 home 与 profile patch —— 双 home 与两个 profile 的纪律见其 `AGENTS.md` | 环境问题动这里（手册 owner：`docs/dev.md`） |
| `scripts/` | 机械门禁与生成器 —— 门禁三条纪律与 freshness 约定见其 `AGENTS.md` | 门禁问题动这里 |
| `snapshots/` | 行为回归的证据面——只收边界与现状见其 `AGENTS.md` 与 `README.md` | 回归证据问题动这里 |
| `_dist/` | **分发导出（生成物）**：`pnpm export-dist` 的 tgz（不入库）与《安装手册》 | 分发问题动这里；生成器 `scripts/release/export-dist.mjs` |
| `.agents/` | **开发用 Skill 根**（证据路由、探针、审计、UI 贡献约束等——DSH 原生 `project-agents` 根发现） | 新开发技能动这里 |
| `deliverables/` · `.desk/` · `.tmp/` · `.pi/` | **会话运行现场（git 忽略或机器本地，不是仓库内容）**：cwd=仓根的会话留下的业务交付（未提交交接件）、My Desk 桌面状态、临时产物、DSH 会话任务持久化（`.pi/tasks/`） | 不提交、不当文档读；语义见 `.gitignore` 注释 |
| `vendor/dsh/` · `vendor/thirdparty/` | **钉住的外部源码**：DSH 源码（submodule）与钉存的第三方上游包（只读证据物，如 OpenViking，见其 README） | **永不改**；升级 DSH 走 `pnpm sync-dsh` |
| `tsconfig.base.json` / `tsconfig.tsx.json` / `tsconfig.json` / `pnpm-workspace.yaml` | 根配置：两个 tsconfig **解析入口**（编译期手维护 / 运行期 `pnpm gen-paths` 生成）+ IDE 整仓聚合（`tsconfig.json`，typecheck 不经它）+ pnpm 工作区面 | 引入新 `@deepseek-ai/*` import 或换 pin 时动解析入口（契约：`docs/dev.md` §二） |

`CLAUDE.md` 是 `AGENTS.md` 的 symlink（Claude 系工具的惯例名），同源无第二份。

**语言分工**：人与本仓文档（docs/notes/AGENTS.md）用中文；进模型上下文的（persona、SKILL.md、工具 description、backlog 方法文件）用英文；代码与脚本注释随所在文件现状，不整批改写。

## 命令表

**“启动一下这个 / 启动一下”** 在本仓库语境中默认指：在本仓隔离 home 里备好并起动 `dev` Web 实例（下表 ②③④），返回可访问 URL，交给人之前跑 `pnpm preflight '<URL>'`——不需要再追问“启动什么”。

只有用户明确点名才换入口：`dev-task` 是无 Web 的 host 装载冒烟；`--patch ...preset-runner...` 是自动化 preset 探针；`vendor/dsh` 的 `dev:web`（`pnpm --dir vendor/dsh run dev:web`）只重建客户端 bundle 产物，不是起动本插件实例——三个入口的判据见 [`docs/dev.md`](docs/dev.md) 首节「默认启动动作」。

**要起服务，这一串按序跑到底**（⓪②③ 都幂等，重跑安全）：

```sh
git submodule update --init   # ⓪ 首次：拉起 vendor/dsh（pin 的唯一出处：`vendor/UPSTREAM.md`；vendor 空时 ② 会死在无关报错）
pnpm install            # ① 并入 vendor/dsh 整树（首次较慢）
bash dev/env/prepare.sh     # ② **首次必须先跑**：补齐 boot 需要的 vendor/dsh 产物（deps/native/lib/web，已在位即跳过）
bash dev/env/setup.sh       # ③ **起服务的前置**：它才建 dev（web）+ dev-task（headless）两个 profile 并把 roster 指向本仓；
                        #    skip 它 = `profile "dev" does not exist`，而 DSH 那句报错会把你指向错的命令
pnpm dsh --profile dev --port 0 --no-open   # ④ Web UI：preset 行为（工具/persona/摘要段落）的人面交互只在这里的会话里验
                        #    （自动行为判决走 `pnpm eval`）；`--port 0` = OS 分配端口 + token 鉴权（不占 3080、避撞车）；交给人之前先 `pnpm preflight '<URL>'`（绿了再交）
pnpm dsh --profile dev-task "one task"   # ⑤ 只想冒烟 host 面（插件装载/scaffold/服务行）就跑它，进程自己退（不进 preset）
```

**要落到另一个 home（隔离实验/并行实例）**：给 ②③④⑤ **每一条都前置** `ASSISTANT_DSH_HOME=<dir>`
（漏加到任意一条 = profile 找不到的报错，机理见硬规则 1）；完整命令串与判据 =
[`docs/dev.md`](docs/dev.md) §一（隔离模型 owner）。

**开发环与舱内工具**（用①的 install 装好即可，与起服务无先后）：

先判据、别瞎跑：**装好了** = `node_modules/.modules.yaml` 在（或 `pnpm store` 里已有本次解析）；
**建好了** = `vendor/dsh/packages/boot/app-boot/lib/index.js`、`.../client/modules/lib/client.js`、
`vendor/dsh/apps/web/dist/index.html` 三个都在（`--dump-config`/`--help` 不加载 lib，**不能**当判据）。

```sh
pnpm gen-paths          # 从 vendor/dsh 重新生成运行期解析入口 tsconfig.tsx.json（换 pin 后必跑）
pnpm gen-catalog        # 重新生成 docs/package-catalog.md（改组合行/exports/工具动词后必跑；freshness 门禁守）
pnpm build              # tsc 出 lib/：改 src 后必跑——preset 行加载的是构建物，不是源码
pnpm preflight '<URL>'  # 开屏前门禁：证明装得上（auth/boot 图/每个 combo 可解析）；不证明渲染出来
pnpm shots '<URL>' --dom --size 1600x1000 --name <名字>   # 渲染证据：headless Chrome 经 CDP 出 PNG + DOM 证据（默认落仓内 .tmp/shots/）；`--eval` 拿交互态
pnpm web-expected '<URL>'   # web 面期望比对：真拍一张与已提交期望比对（漂移 exit 1）；`--refresh` 重录期望（场景契约与判据：snapshots/web-face/<场景>/README.md）
pnpm loop-probe '<URL>' --ask '<问句>'   # 首用闭环探针：**首屏=桌面页**（你的桌面/中文文案/无黑话/工作区就绪）→ 走「＋ 交代新事项」进会话 → 真发问真等回复，JSON 判决（借自 ai_dsh_loop_advisor；`--ask` 会真建会话，指向一次性 home）
pnpm desk-walk '<URL>' [--home <dir>]   # 处理流真机走查（真模型）：首屏桌面→处理一件事→一句进展→返回不变量→交代新事；产出屏幕文本+截图供人判话术/层级（`--home` 才能核账本身份与「回来⇒无待确认」）
pnpm dsh --profile dev --dump-config   # boot-free 查组合树：行 id、disabled、realm 一目了然（什么情况用 = 下「探索路由」同名条目）
pnpm dsh --profile dev-task --patch dev/probes/session/preset-runner.patch.yml "<task>"   # preset 挂载的 one-shot（验证自动化驱动）
pnpm dsh --profile dev-task --patch dev/probes/session/preset-runner-replay.patch.yml "<task>"   # 同上但 keyless：llm-replay 回放替掉真实 adapter，无 key 出真实会话日志（形状与坑见 patch 头注）
pnpm typecheck          # 委派包级：tsc -b（编译期 paths 解析到 vendor/dsh 的 src，API 漂移编译期暴露）+ 测试工程
pnpm test               # vitest 全量：分层 spec（纯核+服务合同+agent/client/composition/tooling；层命令与各层能证明什么见 docs/testing.md 分层表）
pnpm verify             # 机械门禁链：生成物 freshness + 自检 + 结构/身份/解析入口/自包含/技能语法/断链/文档命令互证/notes 形状等（清单以 scripts/checks/verify.mjs 为准）
pnpm release-smoke      # pnpm pack → 干净 home → dsh plugin add → 组合断言（**改动发布物/依赖/preset 包装/工具面必跑**）
pnpm export-dist        # 手动分发导出：pnpm pack → _dist/ 的 tgz + 清单边界断言 + 自动生成《安装手册》
pnpm sync-dsh -- --tag <dsh-tag>   # 换 submodule tag + SHA 簿记 + typecheck + 对照 docs/discipline.md 重校纪律表
pnpm usage              # 意图级仪表：会话/工具混合/自用率/摩擦/家的现状（读 dev home；dev 工具不得继承 DSH_HOME）
pnpm desk-loop          # 培养循环摩擦报告：从真实会话日志读「点了没反应 / 反复点 / 答了多次 / 技能没加载」（读 dev home）
pnpm observe [--home <dir>]   # 输入边界 30 天观察的读数：A 自发投递 / B 时长 / C 入口后的操作（口径、剔除规则与每周快照落 `_backlog/research/usage/`）
pnpm eval               # 行为评测：真实请求经 preset 会话跑一遍，判定读会话日志（串行；任务集 dev/eval/tasks.mjs）
pnpm eval:domain        # 领域评测集 v0（G2＝领域质量的人判终关）：本人出的真实经营问题逐题跑 → 给人打分的报告（题面格式 dev/eval/domain/TEMPLATE.md）
```

## 八条硬规则

1. **双 home**：`pnpm dsh` 经 `dev/env/dsh.mjs` 启动，**永远强制** `DSH_HOME=<repo>/dev/harness-home`
   （覆盖任何继承来的值，包括日用的 `~/.dsh`；显式出口是 `ASSISTANT_DSH_HOME`）。
   绕过启动器直连 node 的调用（release-smoke、`dev/env/setup.sh`）自己负责设置 `DSH_HOME`；
   `dev/env/env.sh` 是它们与手工调用时的兜底，**同样认 `ASSISTANT_DSH_HOME`**
   （用隔离 home 跑实验的人，脚本与启动器必须落在**同一个** home，否则 profile 建在一个 home、启动器去另一个找）。
   **任何情况下不碰日用的 `~/.dsh`。**
2. **探索路由**：DSH 平台事实读钉住的 `vendor/dsh`。机制从 `vendor/dsh/docs/architecture.md` 到
   `vendor/dsh/docs/capability-seams.md` 再到包 README；真实签名读 `vendor/dsh/packages/**/src/`。
   文档 tier、主仓 note 制度、主仓开发技能的页在下面「探索路由」。本仓只写差量：适配一行进
   [`docs/discipline.md`](docs/discipline.md)，本仓才能执行的步骤进仓根 `.agents/skills/`，本仓取舍进
   [`notes/`](notes/README.md)。平台段落留在 vendor 那一页。
3. **窄证据**：一次交付 = 一个垂直切片（代码 + 测试 + 这次改动的合同同 diff）。note 只有 [`notes/README.md`](notes/README.md) §〇 要求留下时才进同一 diff；
   只跑"会为这次回归而失败"的最小检查（改动面 → 最小可信证据的判断细则 = [`.agents/skills/pre-push-evidence/SKILL.md`](.agents/skills/pre-push-evidence/SKILL.md)）；**报告里只列真跑过的命令**；
   **提交只 add 本次改动涉及的路径**（同仓可能有并行会话，`git add -A` 会把别人的未提交改动扫进你的提交）。
4. **默认严格，偏离登记**：研发纪律的继承是**逐源枚举**过的，不是凭印象
   （全表：`docs/discipline.md`）。偏离或裁剪先在该文件「已声明的适配」登记一行
   （约束 → 适配 → 证据），再动手。另写 note 的条件只看 [`notes/README.md`](notes/README.md) §〇。
5. **轮内任务面**：复杂任务开工用 plan 呈批、实施期用 todo 活清单（整表替换、完成即勾）、
   人可随时 steer —— 机制都在 base bundle 里，挂着不用等于白挂。
6. **步步为营，死路回退**（用户拍板；带日期的原始记录在 [0.1.7 迁移 note](notes/archived/2026-09-25-dsh-0-1-7-migration.md)）：每个阶段评估达成了目的就**立刻提交**——
   一次探索一个可回退的锚点，不攒大提交；往前探索怎么都过不去时，**用 git 回退**到上一个锚点，
   把死路与原因记进 note，而不是把半成品留在工作树里。环境修复也要固化成可重跑的脚本提交
   （范式：`pnpm repair-vendor`），修复只存在于手上＝没修复。
7. **生态插件只借思路，不装包**（用户拍板）：引入第三方插件有真实代价（维护断供、安全、组合兼容、
   升级漂移）；除非它有**已验证的声誉**（多人维护、活跃提交、社区口碑），否则**读它的源码、抄它的设计**，
   不引入依赖。先看 popularity 与内部思路再决定；装之前必须过[准入表](notes/implemented/2026-09-29-openviking-adoption-rfc.md)。
8. **临时文件只落仓内 `.tmp/`**（用户拍板）：这个 repo 产生的一切临时/中间产物——脚本默认落点、测试夹具、
   探针与评测产物、插件运行时的 spill、**进模型上下文的指令里的路径**——只准落在**仓根 `.tmp/<用途>/`** 下，
   这是仓内**唯一**的临时文件形式（一个用途一个子目录，清扫即回收全部）。**为什么不是洁癖**：文件沙箱只放行
   会话工作目录，仓外写（系统临时根、`os.tmpdir`、`$HOME`）会被挡下并转成一次人工 approval——每写一次临时文件
   就要人点一次同意，流程就废了。机制：仓内脚本用 `dev/env/tmp.mjs` 的 `tmpDir`/`mkTmpDir`（哪个环节收进哪个
   子目录 = [`docs/dev.md`](docs/dev.md) §一 spill 行）；`pnpm verify` 有门禁守这条。
   模型可见指令（SKILL.md 那一类）在别人机器上跑，口径是"写会话工作目录下的 `.tmp/`"，不是本仓绝对路径。

## 研发姿态（用户拍板，常设）

1. **流程随 DSH**：研发流程、门禁、证据阶梯与文档形态尽量沿用 DSH 的既有做法，不另造一套
   （继承与偏离的登记在 `docs/discipline.md`）。
2. **自主解决优先**：遇问题先探索，先找成熟生态的既有解法——**尤其下载量/影响力足够的插件**：
   读它的源码与设计、抄思路（不装包，见硬规则 7）。技术/设计选择由 agent 判定并**记下理由**；
   理由的家是 note 的「输掉的方案」与判定记录，**不是真人的待办清单**。
3. **长期利益优先于短期便利**：选择以**可驾驭性、可回退、知识沉淀、门禁化纪律**为准，
   不以"这次先跑通"为准——宁慢一步留锚点，不走省掉证据与记录的捷径；同时不过度为想象的未来预建
   （"长期"是保住演进能力，不是提前做——延后项与触发条件的既有机制就是这条的平衡面）。
4. **阶段才 REVIEW**：自己能做的审查自己做（代码审查、回归证据、设计自审、真机取证、对抗性自评）；
   只在**阶段收尾且确有真人不可替代的输入**时才请人 review。真人输入＝真实业务内容、合规/法务文本、
   产品口味反转；除此之外一律不停。**"等用户拍板"不是默认状态**：先把能自己定的定下来，
   真的只剩真人输入时才挂起等拍板。

## 探索路由（本仓侧与 DSH 侧常用入口）

- **本仓侧**：产品合同（working folder 四房间 = [`docs/home.md`](docs/home.md)，经营账本与桌面投影 = [`docs/operating.md`](docs/operating.md)）；证据路由（改什么 → 跑什么 → 回归资产在哪）= [`docs/testing.md`](docs/testing.md) §一页证据地图（唯一表主）；功能路由与运行链路的速查 = [`docs/architecture.md`](docs/architecture.md) §八/§七；出了问题先查 [`docs/dev.md`](docs/dev.md) §五踩坑清单（每条真踩过）
- **平台事实的家**（读 vendor，本仓不复写正文）：文档 tier = `vendor/dsh/docs/AGENTS.md`；主仓 note 合同 = `vendor/dsh/.agents/notes/README.md`（本仓合同是 [`notes/README.md`](notes/README.md)，只写差量）；主仓开发技能 = `vendor/dsh/.agents/skills/`（技能发现根 = 所在工作树的 `.git` 所在仓，各仓只发现自己的 `.agents/skills/`——所以主仓技能留在主仓跑，不进本仓技能目录）
- 组合层级（bundle → profile patch → home patch → `--patch`）：`vendor/dsh/docs/architecture.md`
- preset 语义（roster/roots/遮蔽/standing mount）：`vendor/dsh/packages/preset/agent-preset/README.md`
- 技能 provider 契约（本 repo 依赖它）：`vendor/dsh/docs/subsystems/skills.md`
- 从本包贡献 Web UI：机制读 `vendor/dsh/docs/subsystems/slots.md`、`vendor/dsh/docs/subsystems/web-client.md`、`vendor/dsh/docs/subsystems/sidebar-right.md`；本包的路径和验证在 [`.agents/skills/client-ui-contribution/SKILL.md`](.agents/skills/client-ui-contribution/SKILL.md)
- Cordis 插件怎么挂：`vendor/dsh/docs/cordis-primer.md`。生命周期、并发、子进程：`vendor/dsh/docs/defensive-patterns.md`
- 主仓测试政策：`vendor/dsh/docs/testing.md`。本仓证据地图是 [`docs/testing.md`](docs/testing.md)，不抄主仓的 coverage、snapshot、CI 台阶
- 客户端样式：`vendor/dsh/docs/web-styling.md`。本包色值落点在 [`packages/dsh-smart-assistant/AGENTS.md`](packages/dsh-smart-assistant/AGENTS.md)
- 工具与卡片（`defineTool` / presenter / 日志税）：`vendor/dsh/docs/cookbook/adding-a-tool.md`
- **"组合里到底有没有这一行"**（读源码答不了这个问题）：`pnpm dsh --profile dev --dump-config`（boot-free；
  行 id、disabled、realm 一目了然——排查 patch 落空/重复 id 的第一命令）
- **"活进程里注册了什么"**：shipped `cordis` preset 自带只读 inspect 工具（`SessionInspect` 一族，见 `vendor/dsh/docs/subsystems/session.md`）；要用它就起一个不挂本仓 roster patch 的 profile——本仓 `assistant`
  preset 刻意不挂它们（那是模型可见面变更，为开发期需求不划算）
