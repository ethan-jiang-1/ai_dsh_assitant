# 架构（当前合同 · 只写现在）

> 本文是**现在**的合同：插件由哪些部件组成、各自属于哪个平面、模型能看见什么。
> 历史与被否决的方案在 `notes/`；身份名以 `docs/identity.md` 为唯一权威；
> 家的布局与养护规则以 `docs/home.md` 为唯一权威。

## 一、设计判据

核心命题是 `Agent = Model + Harness`：模型决定上限，**那一圈**决定你能拿到多少。
本插件做的就是把"那一圈"给一个 agent 落地成**一个自己的家**，并对齐五件事：

| 那一圈的五件事 | 本插件的落点 |
|---|---|
| ① 让它看到该看的东西（上下文） | **桌面 / 抽屉**：常驻的只有有界摘要（家地图 + 精选记忆 + 开放线索条数）；细节用工具取 |
| ② 让它懂你的业务（隐性知识显性化） | `memory/` 房间：事实、偏好、决定 —— 一条一个文件，可读可审 |
| ③ 让它有该有的本事（工具与边界） | 四个工具 + 家的写入边界（`src/home/layout.ts` 是唯一 owner） |
| ④ 让它按对的步骤走（工作流） | 过程性知识进**技能**（抽屉），不占常驻上下文；三档出口固定了线索的收束方式 |
| ⑤ 让它经得起检查 | `curate`：**机器能跑的检查**（重复、悬空引用、预算、过期线索、缺理由的 drop、技能语法） |

**反过度工程**：不建向量库、不建后台自动学习循环、不做 client。
判据是那两句 —— **错了赔得起吗？错了多久能发现？** 每条延后项都在第六节写明触发条件。

## 二、两个平面（DSH 的组合纪律）

DSH 的组合分两个平面，判据是"这东西是不是跨会话共享"：

```text
HOST 面（cordis.patch.yml → dsh.bundle.patch）
└── assistant-memory        服务：家的布局 + 四个房间的存储 + 摘要计算 + 养护检查
                            ctx.assistantMemory（唯一服务键）
                            + Web 壳品牌注入行（页标题/图标，webserver/index-inject；皮肤，不进模型上下文）

浏览器面（package.json `dsh.client` → `./client` 出口；经既有 bundle 行被 client-modules
自动发现，无需额外接线）：占用 `sidebar.brand.mark` / `sidebar.brand.name` 两个**通用**
品牌 slot（官方品牌包只在 official 构建档案下注册，本地构建里空置）——不是 §六 延后的
"专属 Web 卡片"（那是通用卡不够用时的 client 插件面，触发条件未到）。
                            为什么在 host：家是**跨会话持久化**，与持久化/沙箱/模型路由同类。
                            preset 里的服务行必须包在 isolate realm 里，否则与别的 preset 撞名。

AGENT 面（presets/assistant/agent.cordis.yml → agent preset）
├── assistant-memory-digest   提示词段落：有界摘要（桌面）
├── assistant-memory-tool     工具 assistant_memory
├── assistant-research-tool   工具 assistant_research
├── assistant-knowledge-tool  工具 assistant_knowledge（只读检索：search/get 附反链）
├── assistant-learn           工具 assistant_reflect + 挂载"学到的技能"provider
├── skill-filesystem          策展技能（preset 目录下的 skills/，经 baseUrl 指过去）
├── tool-skill                技能目录与加载器（DSH 原生）
└── persona / agent-instructions / tool-fs / tool-fs-search / shell / ask-user /
    todo / web / present / compaction
```

**为什么工具在 agent 面**：它们是一个会话贡献给注册表的东西（DSH 的 preset 语义）。
**为什么服务在 host 面**：将来做记忆面板时，client 读的是同一个实例。

## 三、部件与 owner 面

| 模块 | 职责 | 依赖方向 |
|---|---|---|
| `src/home/layout.ts` | **家布局的唯一 owner**：路径、scaffold、HOME.md 生成 | 无（最底层） |
| `src/home/frontmatter.ts` | YAML frontmatter 解析/生成（**不抛异常**：坏文件交给养护检查点名） | `yaml` |
| `src/home/room.ts` | 房间存储：安全 id、原子写、归档、**列出失败文件** | frontmatter |
| `src/memory/record.ts` | 记忆记录词汇与校验（一条记录一个断言） | room 类型 |
| `src/memory/recall.ts` | 检索排序（确定性 + **给出命中理由**） | record |
| `src/research/thread.ts` | 线索词汇与三档出口（drop 必填理由由校验强制） | record（slugify） |
| `src/skills/skill-file.ts` | `SKILL.md` 契约：名校验、草稿校验、写入、**provenance 盖章** | frontmatter |
| `src/knowledge/page.ts`、`search.ts`、`health.ts` | 知识页词汇（OKF 字段子集 + `[[互链]]` 解析/反链）、关键词检索排序、知识 findings —— 纯核 | frontmatter |
| `src/skills/scan.ts` | 按 provider 的规则回读技能房间，报出会被静默忽略的文件 | frontmatter |
| `src/home/digest.ts` | 有界摘要（桌面），按 UTF-8 字节裁剪 | record/thread 类型 |
| `src/home/health.ts` | **纯函数**养护检查：输入是解析结果，输出是 findings | 类型 |
| `src/index.ts` | 服务：把上面这些组装成 `ctx.assistantMemory` | 全部 |
| `src/tool-support/presentation.ts` | 四个工具共享的 presenter 管道：`presentationMeta` 投影摘要 → `presentResult` 从 `result.meta` 读回（完成卡读不到规范值，只能读持久化载荷） | dsh-tools 类型 |
| `src/web-branding.ts` | Web 壳品牌注入行：页标题 + 图标（纯函数；经 `webserver/index-inject` 事件进浏览器，皮肤面） | dsh-host-webserver（仅类型） |
| `src/client/index.ts` | 浏览器面：占用 `sidebar.brand.*` 通用品牌 slot（侧栏图标 + 部署名；皮肤面，不进模型上下文） | react + ui-renderer/ui-sidebar（仅类型） |
| `src/preset-runner/index.ts` | **preset 挂载的 one-shot 驱动**（dev 验证自动化：`agentPresets.resolve`→`mount` 进 agent setup，会话头记录 `agentPreset`；经 `dev/preset-runner.patch.yml` 替换 headless-runner 行启用） | dsh-agent / dsh-agent-presets / dsh-llm / dsh-session / dsh-brand |
| `src/tool-memory/`、`src/tool-research/`、`src/tool-knowledge/`、`src/memory-digest/`、`src/learn/` | agent 面入口：薄适配器（校验跨字段规则 → 调服务 → 返回规范值 + presenter） | cordis/tools |

**依赖方向单向向下**，纯核（home/memory/research/skills）**不 import DSH 运行时** ——
所以它们能被 vitest 直接测，不需要挂 harness。

## 四、模型可见面（日志税）

**model-visible ⟺ logged**：任何进入模型请求的东西都必须能从会话日志重建。

| 模型可见输入 | 由什么覆盖 |
|---|---|
| 摘要段落（家地图 + 精选记忆 + 线索条数） | 系统提示词组装随请求记录；内容由家文件（外部状态）决定 |
| 四个工具的调用与结果 | `tool/call` / `tool/result` 逐字进日志 |
| 技能目录（学到的技能出现/消失） | 目录随请求组装记录；`skills/change` 是注册表失效事件 |
| 工具 description | 属于模型可见输入：改它是**行为变更**，不是改名 |

**刻意不新增 SessionEventMap 成员**（day 0）：上面四条已覆盖全部模型可见状态——
理由与触发条件的唯一家是第六节延后项表；身份面代价见 `docs/identity.md` §一 第 5 行。

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
| 快照回归 | 出现第一处"只有跑起来才看得出"的回归（见 `snapshots/README.md`） |
| 多专家复用（方案 D） | 第二个领域专家立项，且要复用骨架而不是各自重写 |
