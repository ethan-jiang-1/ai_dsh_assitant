# 架构（当前合同 · 只写现在）

> 本文是**现在**的合同：插件由哪些部件组成、各自属于哪个平面、模型能看见什么。
> 身份名以 `docs/identity.md` 为唯一权威；
> working folder 的布局与养护规则以 `docs/home.md` 为唯一权威。

## 一、设计判据

核心命题是 `Agent = Model + Harness`：模型决定上限，**那一圈**决定你能拿到多少。
本插件做的就是把"那一圈"给一个 agent 落地成**一个自己的 working folder**，并对齐五件事：

| 那一圈的五件事 | 本插件的落点 |
|---|---|
| ① 让它看到该看的东西（上下文） | **桌面 / 抽屉**：常驻四段——身份段（SOUL.md）+ 手册（AGENTS.md）+ 有界状态摘要（精选记忆 + 开放线索条数）+ 经营账本段；细节用工具取 |
| ② 让它懂你的业务（隐性知识显性化） | `memory/` 房间：事实、偏好、决定 —— 一条一个文件，可读可审 |
| ③ 让它有该有的本事（工具与边界） | 五个工具 + working folder 的写入边界（`src/domain/home/layout.ts` 是唯一 owner；经营账本另走独立 dataDir，契约 = [operating.md](operating.md)） |
| ④ 让它按对的步骤走（工作流） | 过程性知识进**技能**（抽屉），不占常驻上下文；两档出口固定了线索的收束方式 |
| ⑤ 让它经得起检查 | `curate`：**机器能跑的检查**（重复、悬空引用、预算、过期线索、缺理由的 drop、技能语法等——非穷举，完整面 = [`home.md`](home.md) §四） |

**反过度工程**：不建向量库、不建后台自动学习循环。浏览器面只消费 vendor 的**通用** slot/座位
（皮肤面，不进模型上下文）——不做**专属 Web 卡片**（触发条件见 §六）。
判据是那两句 —— **错了赔得起吗？错了多久能发现？** 每条延后项都在第六节写明触发条件。

## 二、两个平面（DSH 的组合纪律）

平面、bundle 和 patch 层的正文在 `vendor/dsh/docs/architecture.md` 与
`vendor/dsh/packages/preset/agent-preset/README.md`。下面是本包实际挂上的行，判据是这东西是不是跨会话共享；
**本包自有行凡挂必在此列名，此处列名的行必真实在组合里**——这两个方向由 `pnpm verify` 机械互证：

```text
HOST 面（cordis.patch.yml → dsh.bundle.patch）
└── assistant-memory        服务：working folder 的布局 + 四个房间的存储 + 摘要计算 + 养护检查
                            ctx.assistantMemory（唯一服务键）
                            + assistant-operating-ledger 行（权威经营账本：单 Host writer、独立
                              `assistant-operating` dataDir、`writer.lock` 惰性认领、`ledger.json`
                              原子持久——契约 = [operating.md](operating.md)）
                            + assistant-desk-projection 行（固定只读投影下载：GET
                              api/assistant/desk-projection，优先活渲染账本 v2 投影——契约 =
                              [operating.md](operating.md) §三）
                            + assistant-knowledge-approve 行（host 知识批准服务：draft→stable 的机械翻转
                              client Remote mount 因 codec 不兼容失败，UI 回退模型提示路径；无 config，随包分发）
                            + tool-skill 行（DSH 技能目录与加载器；host 实例使 one-shot 首请求可发现技能目录）
                            + session-query-sqlite 翻开行（`first-search` + 持久索引库，原始会话检索）
                            + time-context 行（当前时间/时区/经过时长随请求注入）
                            + schedule + ui-schedule 行（定时面：到期任务以原会话 follow-up 投递；
                              schedule_create/list/update/delete 定时四件只挂 root agents——Web 组合默认带，
                              headless 组合由 profile 层显式 disabled，它依赖 web-app 层的 sessionController；
                              不禁用时的形态 = 常驻 `pending (waiting for service: sessionController)`
                              warning，淹没真实激活失败——隔离 home 实测判据）
                            + ui-chat 行（首开预置 transcriptView: detailed——vendor 预构建 client lib 落后其 src，
                              全新 home 无存档时 mode=undefined 会使 conversation.view 槽崩溃；退役条件=上游发布物确认带兜底）
                            + locale 行（首开预置 preference: zh——无偏好时首开语言随浏览器协商落回 en；
                              Settings 可改，持久化到 home 层覆盖本行）
                            + Web 壳品牌注入（页标题/图标，经 assistant-memory 插件内的 webserver/index-inject
                              监听推送——**非独立组合行**；皮肤，不进模型上下文）

AGENT 面（`cordis.patch.yml` 的 `preset-assistant` 行 → agent preset）
├── assistant-home-preamble   提示词段落：身份（SOUL.md）与家手册（AGENTS.md）逐字
├── assistant-memory-digest   提示词段落：有界摘要（桌面）
├── assistant-memory-tool     工具 assistant_memory
├── assistant-research-tool   工具 assistant_research
├── assistant-operating-tool  工具 assistant_operating（经营账本动作，消费 host 行服务——契约 = [operating.md](operating.md) §二）
├── assistant-operating-brief 提示词段落：经营事项走账本（order 400，稳定指令带）
├── assistant-knowledge-tool  工具 assistant_knowledge（只读检索：search/get 附反链）
├── tool-session-query        工具 session_query 族（原始会话证据检索；与 knowledge 房分工见 docs/home.md）
├── assistant-learn           工具 assistant_reflect + 挂载"学到的技能"provider
├── assistant-ov-shield       治理遮蔽行（ov＝OpenViking 记忆插件：部署共装时拒其 mcp__openviking__* 工具前缀、按 server 名拒资源、遮蔽其同名技能——模型可见面保持本包五工具与策展技能目录；denyToolPrefix / denyServerResources / shadowSkills 三 config 键）
├── skill-filesystem          策展技能（包内 `presets/assistant/skills/`，按包名解析后指过去）
└── persona / agent-instructions / tool-fs / tool-fs-search / shell / ask-user /
    todo / goal（`tool-goal`+`command-goal`）/ plan-mode（isolate 组）/
    jobs / 委派组（`subagent`、`subagent_fork`、control 家族，isolate 组）/ web / present / compaction
```

**浏览器面**（package.json `dsh.client` → `./client` 出口；经既有 bundle 行被 client-modules
自动发现，无需额外接线），全部消费 **vendor 通用座位**（皮肤面，不进模型上下文）。
座位与命令的精确清单是生成物：[`package-catalog.md`](package-catalog.md)「客户端座位面」节
（生成器从 `src/client/` 模块树抽取，freshness 由 `pnpm verify` 守——散文清单在生成物面前
四轮漂移三轮同根，已退役为指针）。语义要点：官方品牌包只在 official 构建档案下注册，本地
构建里品牌 slot 空置；两室（右栏可加的两个面板：knowledge / memory）是「+」向导里可添加的右栏 tab；首里引导座位开聊即隐；全局经营
桌面的主区投影消费 `main` 座位（读回链 = [`operating.md`](operating.md) §三）——这些消费的
全是 vendor 通用座位，§六 延后的"专属 Web 卡片"指**跨出通用座位的自有卡面**（自有 slot 域名），
未立项。

**为什么服务在 host 面**：working folder 是**跨会话持久化**，与持久化/沙箱/模型路由同类；
client 的房间 tab 读的就是同一个实例；preset 里的服务行必须包在 isolate realm 里，
否则与别的 preset 撞名（`dsh-agent-presets` 挂载时直接拒绝）。
**为什么工具在 agent 面**：它们是一个会话贡献给注册表的东西（DSH 的 preset 语义）。

## 三、部件与 owner 面

**参与阶梯（改动的首选入口按半径分级，不是价值排序）**：

| 层 | 首选入口 | 典型变化 | 何时升级 |
|---|---|---|---|
| L0 组合 | profile / bundle / patch / preset 行 | 换 provider、改参数、开关某段落 | 配置表达不了新行为 |
| L1 扩展点 | 工具 / 提示词段落 / 事件监听 | 新增一个模型工具或常驻段落 | 需要可替换实现的完整能力 |
| L2 能力接缝 | Service Definition + Provider + Consumer | 新的持久化/技能/检索引擎 | 扩展点表达不了 |
| L3 宿主循环 | agent-loop（vendor，我们不拥有） | 改默认循环驱动 | 前三级都表达不了（本仓不修改 vendor） |

**横切义务**：任何新增**模型可见事实**（工具、段落、消息）必须同时进入会话日志并可从中重建——
`model-visible means logged`；否则它在 resume/fork 后会消失（本仓对应 `docs/identity.md` 的 model-visible 纪律）。

**新行为该放哪**（先问四句，再动手；对应 DSH「新行为挂在已文档化的扩展点上」）：
① 只改 `cordis.patch.yml` 的一行 config 就够吗（换 provider / 换顺序）？② 只加一个工具或提示词段落
就够吗（agent 面）？③ 是不是跨会话共享的持久状态（→ 服务，host 面）？④ 是不是新增**模型可见事实**
（→ 走 `docs/identity.md` 的 model-visible 纪律，配快照与日志）？

**服务的三角色**：`assistantMemory` 是 Service Definition，**同一包同一文件**里给出唯一 Provider
（所以不存在独立的 provider 包可找）；Consumer 是各 agent 面入口（五个工具、摘要段落、经营账本、复盘）——按
`inject` 声明消费，不依赖具体实现。
**主干 service ≠ 竞聘 seam**：`assistantMemory` 是单 Provider、多 Consumer 的主干 service 形态；
seam 的成色读数是**第二个真实 Provider 出现而 Consumer 一行不改**——没有第二实现预期时，不为
"架构完整"把 service 抬成 seam（反味信号：只剩单一调用者的公开方法，该是私有闭包）。
参与阶梯的 L2 行是**落点判据**（扩展点表达不了才用），不是成熟度升级方向。

| 模块 | 职责 | 依赖方向 |
|---|---|---|
| `src/domain/home/layout.ts` | **working folder 布局的唯一 owner**：路径、scaffold、SOUL.md/AGENTS.md 生成 | 无（最底层） |
| `src/domain/home/frontmatter.ts` | YAML frontmatter 解析/生成（**不抛异常**：坏文件交给养护检查点名） | `yaml` |
| `src/domain/home/room.ts` | 房间存储：安全 id、原子写、归档、**列出失败文件** | frontmatter |
| `src/domain/memory/record.ts` | 记忆记录词汇与校验（一条记录一个断言） | room 类型 |
| `src/domain/memory/recall.ts` | 检索排序（确定性 + **给出命中理由**） | record |
| `src/domain/research/thread.ts` | 线索词汇与两档出口（drop 必填理由由校验强制） | record（slugify） |
| `src/domain/skills/skill-file.ts` | `SKILL.md` 契约：名校验、草稿校验、写入、**provenance 盖章** | frontmatter |
| `src/domain/knowledge/page.ts`、`search.ts`、`health.ts` | 知识页词汇（OKF 字段子集 + `[[互链]]` 解析/反链）、关键词检索排序、知识 findings —— 纯核 | frontmatter |
| `src/domain/skills/scan.ts` | 按 provider 的规则回读技能房间，报出会被静默忽略的文件 | frontmatter |
| `src/domain/home/digest.ts` | 有界摘要（桌面），按 UTF-8 字节裁剪 | record/thread 类型 |
| `src/domain/home/health.ts` | **纯函数**养护检查：输入是解析结果，输出是 findings | 类型 |
| `src/domain/operating/`（`ledger.ts`、`projection.ts`） | 经营账本**纯核**：事项/操作/回执/待认领词汇与归约、v2 投影渲染（契约 = [`operating.md`](operating.md)） | 无（最底层） |
| `src/index.ts` | 稳定包入口：`src/host/index.ts` 服务实现的薄导出（同 class 身份；`ctx.assistantMemory` 增广随实现加载） | 全部 |
| `src/host/index.ts` | 服务实现：把领域模块组装成 `ctx.assistantMemory` | 全部 |
| `src/agent/tool-support/presentation.ts` | agent 面工具共享的 presenter 管道：`presentationMeta` 投影摘要 → `presentResult` 从 `result.meta` 读回（完成卡读不到规范值，只能读持久化载荷） | dsh-tools 类型 |
| `src/host/web-branding.ts` | Web 壳品牌注入行：页标题 + 图标（纯函数；经 `webserver/index-inject` 事件进浏览器，皮肤面） | dsh-host-webserver（仅类型） |
| `src/host/operating-ledger/index.ts` | 服务实现：`ctx.assistantOperatingLedger` 单 writer 认领（`writer.lock` 惰性认领 + 死进程接管）、`ledger.json` 原子持久、读路径恒重读（契约 = [`operating.md`](operating.md) §一） | domain/operating + dsh-home-paths |
| `src/host/desk-projection/`（+ `desk-projection-download.ts`） | 固定只读投影下载行：GET route 优先活渲染账本、回退固定夹具、错误态分明（契约 = [`operating.md`](operating.md) §三） | domain/operating + dsh-client-connection（仅类型） |
| `src/client/`（多模块，`index.ts` 为主注册面） | 浏览器面：座位与命令注册（精确清单 = 生成物 [`package-catalog.md`](package-catalog.md)「客户端座位面」节；皮肤面，不进模型上下文）+ 经营桌面投影读回链（`projection-reader` / `operating-projection` / `projection-lifecycle` / `projection-panel`，契约 = [`operating.md`](operating.md) §三） | react + ui-renderer/ui-sidebar（仅类型） |
|  `src/dev/preset-runner/index.ts` | **preset 挂载的 one-shot 驱动**（dev 验证自动化：`agentPresets.resolve`→`mount` 进 agent setup，会话头记录 `agentPreset`；经 `dev/probes/session/preset-runner.patch.yml` 替换 headless-runner 行启用） | dsh-agent / dsh-agent-preset-registry / dsh-llm / dsh-session / dsh-brand |
| `src/agent/`（`tool-memory`、`tool-research`、`tool-operating`、`tool-knowledge`、`learn`、`memory-digest`、`home-preamble`、`operating-brief`、`ov-shield`） | agent 面入口：薄适配器（校验跨字段规则 → 调服务 → 返回规范值 + presenter）与常驻段落 | cordis/tools |

**依赖方向单向向下**，纯核（home/memory/research/skills）**不 import DSH 运行时** ——
所以它们能被 vitest 直接测，不需要挂 harness。

## 四、模型可见面（日志税）

平台规则在 `vendor/dsh/AGENTS.md`（model-visible ⟺ logged）：任何进入模型请求的东西都必须能从会话日志重建。下表是本包进入请求的四条。

| 模型可见输入 | 由什么覆盖 |
|---|---|
| 身份/手册/摘要/经营账本四段落（SOUL.md + AGENTS.md + 精选记忆与线索条数 + 经营事项走账本） | 系统提示词组装随请求记录；身份/手册/摘要内容由 working folder 的文件（外部状态）决定 |
| 五个工具的调用与结果 | `tool/call` / `tool/result` 逐字进日志 |
| 技能目录（学到的技能出现/消失） | 目录随请求组装记录；`skills/change` 是注册表失效事件 |
| 工具 description | 属于模型可见输入：改它是**行为变更**，不是改名 |

**刻意不新增 SessionEventMap 成员**（day 0）：上面四条已覆盖全部模型可见状态——
理由与触发条件的唯一出处是第六节延后项表；身份面代价见 `docs/identity.md` §一 第 5 行。

## 五、数据流

```text
assistant_memory save ─┐
assistant_research ────┼─→ ctx.assistantMemory ─→ Room（memory/ | research/ | knowledge/）
assistant_reflect ─────┘   （save_page 写 knowledge/ 的 staged draft，手改 stable 即人审）
                           └─→ skills/<name>/SKILL.md
assistant_knowledge ───→ ctx.assistantMemory.searchKnowledge / readKnowledgePage（只读检索，反链现算）
assistant_operating ───→ ctx.assistantOperatingLedger ─→ 经营账本（独立 assistant-operating dataDir：
                                                        ledger.json 原子持久，单 writer）
                                                        └─→ 桌面投影：GET api/assistant/desk-projection
                                                            活渲染 v2 → client 读回（契约 = operating.md）
                                                          │
                        ┌─────────────────────────────────┘
                        ↓（provider 监听目录，改动即刻可见）
                  ctx.skills 目录 → skill 工具按需加载

摘要：ctx.assistantMemory.digest() ─→ 缓存 ─→ assistant-memory-digest 段落（同步读取缓存）
      写操作 → touch() 失效缓存并在后台重算（段落组装是同步的，摘要是异步 fs）
检查：ctx.assistantMemory.curate() ─→ curateHome()（纯函数）→ findings
```

## 六、延后项与触发条件

| 延后 | 触发条件 |
|---|---|
| 新增 SessionEventMap 事件（"记忆变更流"） | 出现要消费它的 UI/审计方：届时以 `assistant-memory/` 前缀声明（并决定 `ignorable`）——§四 的既有通道已覆盖全部模型可见状态，新增事件会拖进 `SESSION_FORMAT_VERSION` 迁移纪律（格式权威：`vendor/dsh/docs/session-format-status.md`） |
| 语义检索（embedding） | 关键词/标签检索出现真实漏召回；那时经 `ctx.llm` 做 embedding，另开一缝 |
| 自动后台复盘（`session/end` + `ctx.jobs`） | 有真实使用数据说明"每会话复盘"的收益大于 token 代价与同意成本 |
| settings namespace `assistant` | 出现"用户要在设置页改"的真实需求（现在配置走 bundle/profile 的 Config） |
| 专属 Web 卡片（跨出通用座位的自有卡面 / 自有 slot 域名） | 通用座位与其 inject 缝表达不了：`tool.call.toolview` 槽与 `dsh.client.inject`（品牌、房间 tab、经营桌面投影已消费这两级——见 `package-catalog.md`「客户端座位面」）之后的下一级，自有域名届时按 `identity.md` §一 第 8 行命名 |
| session 回放快照（web 渲染期望已建，同树） | 提示词组装面出现"只有跑起来才看得出"的回归，或同一 model-visible 面第三次靠手工探针钉回归（见 `snapshots/README.md`） |
| 多专家复用（方案 D） | 第二个领域专家立项，且要复用骨架而不是各自重写 |

## 七、三条真实链路（谁调用谁）

本节回答「一个命令 / 一条消息 / 一次点击进来，经谁、到哪里、哪里可观察」。三条链都只走本仓与 vendor 的现存接缝；agent loop 本体在 vendor（§三 L3——本仓不拥有 loop，只拥有接入它的组合行与服务）。

### 启动链：命令 → 可用的会话面

```text
pnpm dsh …（package.json scripts → dev/env/dsh.mjs，唯一启动器：
  强制 DSH_HOME=<repo>/dev/harness-home（唯一出口 ASSISTANT_DSH_HOME）、子进程 cwd 钉在仓根、
  TSX_TSCONFIG_PATH=tsconfig.tsx.json 让运行期解析 vendor src、出网代理条件注入）
  └ vendor/dsh/apps/cli/src/bin.ts（钉住的 CLI 源码，非构建物）
      └ profile 解析（DSH_HOME/profiles/ 里的 dev / dev-task，由 dev/env/setup.sh 建立）
          └ boot graph 按四层装载组合（bundle → profile patch → home patch → --patch，
            细节 owner = docs/dev.md §七）：本包经 package.json 的 dsh.bundle.patch
            → cordis.patch.yml 进入 bundle 层；profile 层是 setup.sh 拷贝的
            dev/profiles/profile-patch.yml（dev）/ dev/profiles/profile-patch-headless.yml（dev-task）
          └ 行实例化：host 服务行与 preset 行读 built lib/（pnpm build 产物——
            改 src 不 build = 行 never started 或旧行为）；client 面经
            package.json 的 dsh.client → ./client 出口被 client-modules 自动发现
```

| 主要失败模式 | 症状 | 最小证据 |
|---|---|---|
| vendor 未 checkout / 构建产物缺 | 启动器显式报错；boot 报缺 | `bash dev/env/prepare.sh` 后复跑 |
| profile 不存在 | `profile "dev" does not exist`（DSH 的提示语会指错命令） | `bash dev/env/setup.sh` |
| lib 缺或旧 | 组合行 never started / 旧行为 | `pnpm build` 后 `pnpm dsh --profile dev-task "one task"` |
| patch 行落空 / 重复 id | 组合里没有这行 / duplicate id | `pnpm dsh --profile dev --dump-config`（boot-free：行 id、disabled、realm 一目了然） |

### 模型请求链：一条消息 → 模型回合 → 状态落盘

```text
一条消息（Web composer / 桌面面板 / one-shot argv）
  └ vendor session controller（本仓不拥有）
      └ agent setup：agent-preset-registry 行按 default=assistant 解析
        → preset-assistant 行（cordis.patch.yml）挂载 §二 AGENT 面的 plugins
      └ 系统提示词组装（vendor system-prompt）：persona
        + assistant-home-preamble（SOUL.md / 家手册逐字）
        + assistant-memory-digest（有界摘要＝桌面，缓存时序见 §五）
        + 技能目录（随请求扫描）
      └ model turn（vendor agent-loop）
          └ tool call → 本包工具行（§二）→ ctx.assistantMemory
            （packages/dsh-smart-assistant/src/host/index.ts，host 服务（根 `src/index.ts` 为薄导出稳定入口））
            → Room 存储（working folder 四房间，布局 owner = docs/home.md）
          └ tool result → 下一轮或最终答复
全程模型可见输入逐字进会话日志（§四 model-visible ⟺ logged）
```

| 主要失败模式 | 症状 | 最小证据 |
|---|---|---|
| 行没实例化（lib 缺/旧） | never started | 同启动链 lib 行 |
| 段落缺席或过期 | 提示词缺身份/桌面 | `pnpm dsh --profile dev-task --patch dev/probes/session/preset-runner-replay.patch.yml "probe"`（keyless 回放，看 system/tools/session log 的组装） |
| 模型可见但没进日志 | resume/fork 后消失 | §四 纪律对照会话日志 |
| 模型自主行为回归 | 行为地板跌 | `pnpm eval`（判决读会话日志） |

### 浏览器动作链：一次点击 → 可见的桌面变化

客户端在 `main` 声明可用并完成桌面注册后，每个 Client 根上下文只尝试一次默认选择：当前 `activePanelId` 为 null 时选全局桌面，否则保留已选面板。显式回到 Conversation、归档引发的回退、slot/布局重挂及客户端 HMR 不重选；完整页面重载的新根上下文重新尝试。默认机会只在页面内记录，不保存导航偏好或业务数据。插件首次激活前的显式 null 与启动 null 无法由当前公开快照区分；全局桌面读取独立 Host 固定投影，会话侧旧视图仍读取工作区快照；默认入口本身不创建业务 Session。

独立 Host 行 `assistant-desk-projection` 提供固定只读投影下载：经营 dataDir 里有 `ledger.json` 时**活渲染账本 v2 投影**，无账本才回退固定 `desk-projection.json` 模拟输入；端点边界、认证、错误态与 byte cap 的完整契约 = [`operating.md`](operating.md) §三（唯一权威，本文不复述）。物理 HTTP 验证使用 [只读探针](../dev/probes/web/desk-projection-download.mjs)，以明确标注模拟的 [固定资料](../dev/fixtures/desk-projection/desk-projection.json) 为独立字节预期。

客户端读回链（下载对象的代际/陈旧语义、经营 v1/v2 解析器、`hooks.projection` 生命周期绑定、面板形态与 `ready` 语义）的合同同在 [`operating.md`](operating.md) §三；可执行合同 = [读取测试](../packages/dsh-smart-assistant/tests/client/projection-reader.spec.ts)与其同族 spec。

Client 的 [下载对象](../packages/dsh-smart-assistant/src/client/projection-reader.ts)通过 Connection generation/state 观察就绪与丢失；断连保留、迟到发布防护、解析器契约与生命周期绑定的现况由 [`operating.md`](operating.md) §三 拥有，此处不再复制第二份。

```text
浏览器点击（房间面板 / 首开审批横幅 / composer）
  └ client classic script（packages/dsh-smart-assistant：src/client 多模块源，
    tsdown 打成 lib/client/index.js 单文件 classic script = ./client；经 bundle 行
    被 client-modules 自动发现，注册进 vendor 通用座位——皮肤面，不进模型上下文）
      ├ 会话车道（多数动作）：sendPrompt → remote.session.prompt（mode:queue、
      │ [桌面] 标记）→ 走模型请求链 → 助手经工具写工作区 .desk/state.json
      └ 直调车道（仅知识批准，「两条合法批准路径」见 [home.md](home.md) §二）：approveKnowledgePage →
        remote.assistantKnowledge.approvePage → host promotePage（draft→stable
        机械翻转 + 写该会话审计）；本 pin 确定性拒绝该挂载（strict codec vs
        classic-script 贡献——回退不是缺陷而是设计状态）→ 回退会话车道，面板内告知
  └ 读回：client 轮询 .desk/state.json 的生成时间越过 pending.at 才算完成
    （队列接受 ≠ 完成；DATA GATE 冻结该行直到文件真的动了）
```

| 主要失败模式 | 症状 | 最小证据 |
|---|---|---|
| remote 未成形 | 面板 note 直接提示 | `pnpm --filter dsh-smart-assistant exec vitest run tests/client/client-panels.spec.ts tests/client/client-commands.spec.ts`（无浏览器） |
| 直调挂载被拒 | console.info 诊断 + 回退提示（设计状态） | 同上 + `pnpm web-expected` 两场景的 console 契约 |
| 模型做了但 UI 没显示 | desk 文件没动或没读回 | 对照会话日志与工作区 `.desk/state.json` 生成时间 |

## 八、六条功能路由

拿功能找入口的速查表：每条给主链、实现入口、最低 keyless 验证、失败先看、live 边界。四房间规则与状态的 owner = [`home.md`](home.md)；证据阶梯与政策的 owner = [`testing.md`](testing.md)——本表只做路由，不复制规则。

| 功能 | 走哪条链 | 实现入口 | 最低验证（keyless） | 失败先看 | 哪步才要模型/浏览器 |
|---|---|---|---|---|---|
| 记忆保存/检索 | 模型请求链 | `assistant_memory`（`src/agent/tool-memory/`）→ `ctx.assistantMemory` → memory/ 房间；词汇 `src/domain/memory/record.ts`、排序 `src/domain/memory/recall.ts` | `pnpm --filter dsh-smart-assistant exec vitest run tests/domain/record.spec.ts tests/domain/recall.spec.ts` | 房间文件 frontmatter；digest 缓存 touch 失效（§五） | 规则与排序确定性无模型；真实措辞与召回选择才在模型回合 |
| 知识草稿/批准/检索 | 模型 + 浏览器链 | 草稿 = `assistant_reflect` 的 save_page（staged）；批准 = 浏览器两车道 → host `promotePage`（`src/host/index.ts`）；检索 = `assistant_knowledge`（`src/agent/tool-knowledge/`；host 面 `searchKnowledge`/`readKnowledgePage`，§五） | `pnpm --filter dsh-smart-assistant exec vitest run tests/host/knowledge-write.spec.ts`（草稿/批准/检索/摘要全链） | draft→stable 翻转与会话审计；直调挂载回退提示 | 批准按钮与回退车道要浏览器；草稿内容生成在模型回合 |
| 提示词摘要 | 模型请求链 | `assistant-memory-digest` 段落（`src/agent/memory-digest/`）← `ctx.assistantMemory.digest()` 缓存 + 写操作 touch 失效（§五）；预算旋钮（`digestMaxBytes`/`recallLimit`）= host 行 `assistant-memory` 的 config（`cordis.patch.yml` 头部） | `pnpm --filter dsh-smart-assistant exec vitest run tests/domain/digest.spec.ts tests/agent/digest-prewarm.spec.ts` | 缓存失效时序与段落同步 `text` 契约 | 摘要计算无模型；真实会话的段落组装用 keyless 回放看 |
| 经营事项（账本/投影/读回） | 模型请求链 + 浏览器动作链 | `assistant_operating`（`src/agent/tool-operating/`）→ `ctx.assistantOperatingLedger`（`src/host/operating-ledger/`）→ `ledger.json`；投影 = `src/host/desk-projection/` → client `projection-*`（契约 owner = [`operating.md`](operating.md)） | `pnpm --filter dsh-smart-assistant exec vitest run tests/host/operating-ledger.spec.ts tests/client/projection-reader.spec.ts`（组合面：`pnpm build` → `pnpm test:composition`） | 权限三分与幂等回执；投影 `ready` ≠ 业务成功；客户端 v1/v2 解析 | 工具动作语义无模型；真实交代→读回在模型回合与浏览器（eval `desk-*` 任务集） |
| 桌面刷新 | 浏览器 → 模型 → 读回 | `sendPrompt`（`src/client/desk-io.ts`）→ 模型回合 → `.desk/state.json` → 轮询越过 pending.at | `pnpm --filter dsh-smart-assistant exec vitest run tests/client/client-panels.spec.ts tests/client/client-commands.spec.ts` | `.desk/state.json` 生成时间 vs pending.at；会话日志 | 全链要真会话与渲染：`pnpm web-expected` 两场景；真问真答 `pnpm loop-probe` |
| 插件装载 | 启动链 | `cordis.patch.yml` 行 → built `lib/` → profile（`dev/env/setup.sh` 装包 + profile patch 设 default） | `pnpm test:composition`（先 build）+ `pnpm --filter dsh-smart-assistant exec vitest run tests/composition/export-shape.spec.mjs` | lib freshness（never started）；行 id/patch 落空（dump-config） | Web UI 行为要 `pnpm preflight` + 两场景 |
