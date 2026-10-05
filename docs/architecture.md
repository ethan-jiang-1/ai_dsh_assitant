# 架构（当前合同 · 只写现在）

> 本文是**现在**的合同：插件由哪些部件组成、各自属于哪个平面、模型能看见什么。
> 历史与被否决的方案在 `notes/`；身份名以 `docs/identity.md` 为唯一权威；
> working folder 的布局与养护规则以 `docs/home.md` 为唯一权威。

## 一、设计判据

核心命题是 `Agent = Model + Harness`：模型决定上限，**那一圈**决定你能拿到多少。
本插件做的就是把"那一圈"给一个 agent 落地成**一个自己的 working folder**，并对齐五件事：

| 那一圈的五件事 | 本插件的落点 |
|---|---|
| ① 让它看到该看的东西（上下文） | **桌面 / 抽屉**：常驻的是身份段（SOUL.md）+ 手册（AGENTS.md）+ 有界状态摘要（精选记忆 + 开放线索条数）；细节用工具取 |
| ② 让它懂你的业务（隐性知识显性化） | `memory/` 房间：事实、偏好、决定 —— 一条一个文件，可读可审 |
| ③ 让它有该有的本事（工具与边界） | 四个工具 + working folder 的写入边界（`src/domain/home/layout.ts` 是唯一 owner） |
| ④ 让它按对的步骤走（工作流） | 过程性知识进**技能**（抽屉），不占常驻上下文；三档出口固定了线索的收束方式 |
| ⑤ 让它经得起检查 | `curate`：**机器能跑的检查**（重复、悬空引用、预算、过期线索、缺理由的 drop、技能语法） |

**反过度工程**：不建向量库、不建后台自动学习循环。浏览器面只消费 vendor 的**通用** slot/座位
（皮肤面，不进模型上下文）——不做**专属 Web 卡片**（触发条件见 §六）。
判据是那两句 —— **错了赔得起吗？错了多久能发现？** 每条延后项都在第六节写明触发条件。

## 二、两个平面（DSH 的组合纪律）

DSH 的组合分两个平面，判据是"这东西是不是跨会话共享"：

```text
HOST 面（cordis.patch.yml → dsh.bundle.patch）
└── assistant-memory        服务：working folder 的布局 + 四个房间的存储 + 摘要计算 + 养护检查
                            ctx.assistantMemory（唯一服务键）
                            + assistant-knowledge-approve 行（host 知识批准服务：draft→stable 的机械翻转
                              client Remote mount 因 codec 不兼容失败，UI 回退模型提示路径；无 config，随包分发）
                            + tool-skill 行（DSH 技能目录与加载器；host 实例使 one-shot 首请求可发现技能目录）
                            + session-query-sqlite 翻开行（`first-search` + 持久索引库，原始会话检索）
                            + time-context 行（当前时间/时区/经过时长随请求注入）
                            + schedule + ui-schedule 行（定时面：到期任务以原会话 follow-up 投递；
                              schedule_create/list/update/delete 四工具只挂 root agents——Web 组合默认带，
                              headless 组合由 profile 层显式 disabled，它依赖 web-app 层的 sessionController）
                            + Web 壳品牌注入行（页标题/图标，webserver/index-inject；皮肤，不进模型上下文）

AGENT 面（`cordis.patch.yml` 的 `preset-assistant` 行 → agent preset）
├── assistant-home-preamble   提示词段落：身份（SOUL.md）与家手册（AGENTS.md）逐字
├── assistant-memory-digest   提示词段落：有界摘要（桌面）
├── assistant-memory-tool     工具 assistant_memory
├── assistant-research-tool   工具 assistant_research
├── assistant-knowledge-tool  工具 assistant_knowledge（只读检索：search/get 附反链）
├── tool-session-query        工具 session_query 族（原始会话证据检索；与 knowledge 房分工见 docs/home.md）
├── assistant-learn           工具 assistant_reflect + 挂载"学到的技能"provider
├── assistant-ov-shield       治理遮蔽行（ov＝OpenViking 记忆插件：部署共装时拒其 mcp__openviking__* 工具前缀、遮蔽其同名技能——模型可见面保持本包四工具与策展技能目录；denyToolPrefix / shadowSkills 两 config 键）
├── skill-filesystem          策展技能（包内 `presets/assistant/skills/`，按包名解析后指过去）
└── persona / agent-instructions / tool-fs / tool-fs-search / shell / ask-user /
    todo / goal（`tool-goal`+`command-goal`）/ plan-mode（isolate 组）/
    jobs / 委派组（`subagent`+`subagent_fork`+control 三件，isolate 组）/ web / present / compaction
```

**浏览器面**（package.json `dsh.client` → `./client` 出口；经既有 bundle 行被 client-modules
自动发现，无需额外接线），全部消费 **vendor 通用座位**（皮肤面，不进模型上下文）。
座位与命令的精确清单是生成物：[`package-catalog.md`](package-catalog.md)「客户端座位面」节
（生成器从 `src/client/index.ts` 抽取，freshness 由 `pnpm verify` 守——散文清单在生成物面前
四轮漂移三轮同根，已退役为指针）。语义要点：官方品牌包只在 official 构建档案下注册，本地
构建里品牌 slot 空置；三室是「+」向导里可添加的右栏 tab；首里引导座位开聊即隐——不是 §六 延后的
"专属 Web 卡片"（那是通用卡不够用时的 client 插件面，触发条件未到）。

**为什么服务在 host 面**：working folder 是**跨会话持久化**，与持久化/沙箱/模型路由同类；
client 的三室 tab 读的就是同一个实例；preset 里的服务行必须包在 isolate realm 里，
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
（所以不存在独立的 provider 包可找）；Consumer 是各 agent 面入口（四个工具、摘要段落、复盘）——按
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
| `src/domain/research/thread.ts` | 线索词汇与三档出口（drop 必填理由由校验强制） | record（slugify） |
| `src/domain/skills/skill-file.ts` | `SKILL.md` 契约：名校验、草稿校验、写入、**provenance 盖章** | frontmatter |
| `src/domain/knowledge/page.ts`、`search.ts`、`health.ts` | 知识页词汇（OKF 字段子集 + `[[互链]]` 解析/反链）、关键词检索排序、知识 findings —— 纯核 | frontmatter |
| `src/domain/skills/scan.ts` | 按 provider 的规则回读技能房间，报出会被静默忽略的文件 | frontmatter |
| `src/domain/home/digest.ts` | 有界摘要（桌面），按 UTF-8 字节裁剪 | record/thread 类型 |
| `src/domain/home/health.ts` | **纯函数**养护检查：输入是解析结果，输出是 findings | 类型 |
| `src/index.ts` | 稳定包入口：`src/host/index.ts` 服务实现的薄导出（同 class 身份；`ctx.assistantMemory` 增广随实现加载） | 全部 |
| `src/host/index.ts` | 服务实现：把领域模块组装成 `ctx.assistantMemory` | 全部 |
| `src/agent/tool-support/presentation.ts` | 四个工具共享的 presenter 管道：`presentationMeta` 投影摘要 → `presentResult` 从 `result.meta` 读回（完成卡读不到规范值，只能读持久化载荷） | dsh-tools 类型 |
| `src/host/web-branding.ts` | Web 壳品牌注入行：页标题 + 图标（纯函数；经 `webserver/index-inject` 事件进浏览器，皮肤面） | dsh-host-webserver（仅类型） |
| `src/client/index.ts` | 浏览器面：座位与命令注册（精确清单 = 生成物 [`package-catalog.md`](package-catalog.md)「客户端座位面」节；皮肤面，不进模型上下文） | react + ui-renderer/ui-sidebar（仅类型） |
|  `src/dev/preset-runner/index.ts` | **preset 挂载的 one-shot 驱动**（dev 验证自动化：`agentPresets.resolve`→`mount` 进 agent setup，会话头记录 `agentPreset`；经 `dev/probes/session/preset-runner.patch.yml` 替换 headless-runner 行启用） | dsh-agent / dsh-agent-preset-registry / dsh-llm / dsh-session / dsh-brand |
| `src/agent/tool-memory/`、`src/agent/tool-research/`、`src/agent/tool-knowledge/`、`src/agent/memory-digest/`、`src/learn/` | agent 面入口：薄适配器（校验跨字段规则 → 调服务 → 返回规范值 + presenter） | cordis/tools |

**依赖方向单向向下**，纯核（home/memory/research/skills）**不 import DSH 运行时** ——
所以它们能被 vitest 直接测，不需要挂 harness。

## 四、模型可见面（日志税）

**model-visible ⟺ logged**：任何进入模型请求的东西都必须能从会话日志重建。

| 模型可见输入 | 由什么覆盖 |
|---|---|
| 身份/手册/摘要三段落（SOUL.md + AGENTS.md + 精选记忆与线索条数） | 系统提示词组装随请求记录；内容由 working folder 的文件（外部状态）决定 |
| 四个工具的调用与结果 | `tool/call` / `tool/result` 逐字进日志 |
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
| 新增 SessionEventMap 事件（"记忆变更流"） | 出现要消费它的 UI/审计方：届时以 `assistant-memory/` 前缀声明（并决定 `ignorable`）——§四 的既有通道已覆盖全部模型可见状态，新增事件会拖进 `SESSION_FORMAT_VERSION` 迁移纪律 |
| 语义检索（embedding） | 关键词/标签检索出现真实漏召回；那时经 `ctx.llm` 做 embedding，另开一缝 |
| 自动后台复盘（`session/end` + `ctx.jobs`） | 有真实使用数据说明"每会话复盘"的收益大于 token 代价与同意成本 |
| settings namespace `assistant` | 出现"用户要在设置页改"的真实需求（现在配置走 bundle/profile 的 Config） |
| 专属 Web 卡片 | 通用卡不够用：先走 `tool.call.toolview` 槽，再走 `dsh.client.inject` |
| 跨会话复盘（读历史会话） | 需要 `ctx.sessionQuery` + `tool-session-query` 行；现在只复盘当前会话 |
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

```text
浏览器点击（三室面板 / 首开审批横幅 / composer）
  └ client classic script（packages/dsh-smart-assistant/src/client/index.ts，单入口
    ./client；经 bundle 行被 client-modules 自动发现，注册进 vendor 通用座位——
    皮肤面，不进模型上下文）
      ├ 会话车道（多数动作）：sendPrompt → remote.session.prompt（mode:queue、
      │ [桌面] 标记）→ 走模型请求链 → 助手经工具写工作区 .desk/state.json
      └ 直调车道（仅知识批准）：approveKnowledgePage →
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

## 八、五条功能路由

拿功能找入口的速查表：每条给主链、实现入口、最低 keyless 验证、失败先看、live 边界。四房间规则与状态的 owner = [`home.md`](home.md)；证据阶梯与政策的 owner = [`testing.md`](testing.md)——本表只做路由，不复制规则。

| 功能 | 走哪条链 | 实现入口 | 最低验证（keyless） | 失败先看 | 哪步才要模型/浏览器 |
|---|---|---|---|---|---|
| 记忆保存/检索 | 模型请求链 | `assistant_memory`（`src/agent/tool-memory/`）→ `ctx.assistantMemory` → memory/ 房间；词汇 `src/domain/memory/record.ts`、排序 `src/domain/memory/recall.ts` | `pnpm --filter dsh-smart-assistant exec vitest run tests/domain/record.spec.ts tests/domain/recall.spec.ts` | 房间文件 frontmatter；digest 缓存 touch 失效（§五） | 规则与排序确定性无模型；真实措辞与召回选择才在模型回合 |
| 知识草稿/批准/检索 | 模型 + 浏览器链 | 草稿 = `assistant_reflect` 的 save_page（staged）；批准 = 浏览器两车道 → host `promotePage`（`src/host/index.ts`）；检索 = `assistant_knowledge`（`src/agent/tool-knowledge/`） | `pnpm --filter dsh-smart-assistant exec vitest run tests/host/knowledge-write.spec.ts`（草稿/批准/检索/摘要全链） | draft→stable 翻转与会话审计；直调挂载回退提示 | 批准按钮与回退车道要浏览器；草稿内容生成在模型回合 |
| 提示词摘要 | 模型请求链 | `assistant-memory-digest` 段落（`src/agent/memory-digest/`）← `ctx.assistantMemory.digest()` 缓存 + 写操作 touch 失效（§五） | `pnpm --filter dsh-smart-assistant exec vitest run tests/domain/digest.spec.ts tests/agent/digest-prewarm.spec.ts` | 缓存失效时序与段落同步 `text` 契约 | 摘要计算无模型；真实会话的段落组装用 keyless 回放看 |
| 桌面刷新 | 浏览器 → 模型 → 读回 | `sendPrompt`（`src/client/index.ts`）→ 模型回合 → `.desk/state.json` → 轮询越过 pending.at | `pnpm --filter dsh-smart-assistant exec vitest run tests/client/client-panels.spec.ts tests/client/client-commands.spec.ts` | `.desk/state.json` 生成时间 vs pending.at；会话日志 | 全链要真会话与渲染：`pnpm web-expected` 两场景；真问真答 `pnpm loop-probe` |
| 插件装载 | 启动链 | `cordis.patch.yml` 行 → built `lib/` → profile（`dev/env/setup.sh` 装包 + profile patch 设 default） | `pnpm test:composition`（先 build）+ `pnpm --filter dsh-smart-assistant exec vitest run tests/composition/export-shape.spec.mjs` | lib freshness（never started）；行 id/patch 落空（dump-config） | Web UI 行为要 `pnpm preflight` + 两场景 |
