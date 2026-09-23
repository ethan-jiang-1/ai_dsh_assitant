# 记忆插件生态普查与 "smart memory" 查证（r1）

日期：2026-09-24 · 状态：research 底稿（判据与决策记录不入此文件；按本 repo research 面规范，进文前的承重主张由委托方复核）

**委托问题**：用户听说有个叫 "smart memory" 的插件，如果好用就直接用它、不用自己写（对照 `dsh-smart-assistant` 自研的记忆系统）。用户后续拍板两事：**① 硬约束：纯本地使用，不用云**——一切候选只有"可完整自托管/离线"才成立；**② supermemory（supermemoryai/supermemory）为重点候选**，需深评。

## 0. 方法与证据分级

- 检索面：npm registry（精确包名 + 关键词搜索 API）、DSH 插件商店目录（`dsh-plugin-shop-catalog@2026.923.1`，builtAt 2026-09-23，收录 11,885 个插件、拒收 14,541 [affordance：目录 tarball 亲自下载解包计算]）、GitHub API（仓库元数据 + 源码克隆）、Claude Code 生态清单（jvidal86/awesome-claude-code-memory）、MCP 生态（npm + 官方 servers）、DSH 官方文档（本仓 `vendor/dsh` pin `0.1.5-rc.2` @ fb2c4b9，2026-09-10）。
- 分级口径：**[affordance]** = npm registry / GitHub API / 源码克隆可指认的事实；**[documented]** = 官方文档或包作者 README 明文；**[observed]** = 目录/清单等衍生数据或社区转述（注明出处）。
- 星数基线：商店目录 `stars` 映射（GitHub 仓库星数，快照 2026-09-23）；个别经 GitHub API 独立复核。
- 「本地」标注口径：**本地可行** = 完整自托管/离线可跑（存储、嵌入、LLM 均可不出本机）；**需云** = 依赖云端服务或账号；**未知** = 本轮证据不足。凡"本地可行（附带条件）"均注明条件。

## 1. 结论速览

1. **"smart memory" 在 DSH 生态不存在**：全目录 11,885 个插件中，名字或描述含 "smart memory / smart-memory" 的为 **0**；含 "smart" 的 17 个全是智能标题/智能路由类，无一与记忆相关 [affordance：目录解包计算]。npm 精确名 `smart-memory` 存在但是无关物（§2.2）。
2. **四个生态共找到 5 个叫 "smart memory" 的东西**（外加 1 个已消亡的 GitHub org），全部单人小项目：SQLite 存储、无 DSH 插件形态、无养护检查、月下载 ≤39 或停更数月——**没有一个值得采用** [affordance]。
3. **supermemory（用户点名）**：本地形态真实且完整（单二进制 + 本地嵌入 + Ollama 可全离线，MIT，30,843★）——**硬约束「本地」通过**；但其本地存储是**黑箱目录**（引擎二进制分发、开源仓不含 server 实现、格式无文档、跨版本 schema 不保证可读），与委托方"人可读文件可 git"判据**正面冲突**；DSH 桥 `dsh-supermemory` 可经环境变量指向本地 server，但桥的默认哲学（每 prompt 插件代搜注入 + 每轮自动写回）与委托方"有界摘要 + 模型主动调取"**控制权倒置**（§4）。基准 #1 主张为官方自报，未找到独立复现 [documented/observed]。
4. DSH 记忆插件生态极大（目录内名字/描述涉记忆约 436 个），且**已收敛出与委托方相同的设计共识**：markdown 文件为真源、有界常驻注入、写入门禁、本地优先。最接近委托方「家」概念的同类是 `@a9i5k4/dsh-auto-memory` 与 `@wumihaze/dsh-mind`，但都不具备三房间结构、supersede/retire 生命周期与 per-record frontmatter [affordance/documented，见 §3.2]。
5. **建议：维持自研**，附设计级借用清单（§6）。

## 2. "smart memory" 查证

### 2.1 DSH 插件商店：精确零匹配

- 商店目录 `dsh-plugin-shop-catalog@2026.923.1`：schemaVersion 5，builtAt 2026-09-23T07:06Z，count 11,885、rejected 14,541 [affordance]。
- 名字或 `catalog.summary.en` 含 "smart memory" / "smart-memory"（大小写不敏感）：**0 条** [affordance：本人解包遍历计算，与委托方独立核查一致]。
- 名字含 "smart" 的 17 条全是别的品类：`dsh-smart-title`（会话标题）、`dsh-smart-router` / `dsh-smart-model-router` / `dsh-smart-scenario-router`（模型路由）、`dsh-smarter-edit`（编辑）、`dsh-smart-approval`、`dsh-smart-input`（语音输入）、`dsh-yeelight-smart-home`（智能家居）等 [affordance]。
- `dsh-smart-memory` 在 npm 上 404 [affordance]。
- 注意：目录并非全量索引——`@wumihaze/dsh-mind`、`dsh-pamyat-core` 均在 npm 活跃但不在目录中 [affordance]；因此零匹配结论辅以下述各生态的独立检索。

### 2.2 五个同名物（逐一核查；「本地」为硬约束判定）

| # | 是什么 | 版本/日期 | 存储 | 形态 | 本地 | 维护 |
|---|---|---|---|---|---|---|
| 1 | npm **`smart-memory`**（lightla，命令 `smem`）：个人研究仓 lightla/ai-research 的 "Smart Memory CLI core MVP" | v0.1.2，2026-08-17；仓 0★、最后 push 2026-08-24；月下载 39 [affordance] | **SQLite**（node:sqlite），家在 `~/.smart-memory`，语义模式可选 embedding | 全局 CLI；README 明言 "not an MCP server" [documented] | 本地可行（分类器可配 ollama） | 单人；npm 声明 MIT 但 **GitHub 仓无 LICENSE 文件** [affordance] |
| 2 | npm **`mcp-smart-memory`**（NexTool）：MCP server，TF-IDF 余弦相似检索 | v1.0.0 **唯一一版**，2026-02-10 [affordance] | 本地 JSON 文件（`knowledge.json` + `index.json`），自称 "human-readable and portable" [documented] | MCP server（npx） | 本地可行 | 单人单版，7 个月无更新；4 文件 22KB [affordance] |
| 3 | npm **`smart-memory-mcp`**（Becorpai）：MCP server，可选 OpenAI 摘要 | v1.0.11，**11 个版本全部发布于 2025-06-16 同一天**，此后 15 个月无更新 [affordance] | **SQLite**（better-sqlite3）；MCP SDK 停在 ^0.4.0 [affordance] | MCP server | 本地可行（SQLite 本地；OpenAI 摘要可选） | 单人；法语 README；自称 "Inspiré par supermemory" [documented] |
| 4 | GitHub **xpm-cmd/SmartMemory**："Persistent semantic memory for Claude Code" | 创建 2026-02-28，push 2026-03-26（停更约 6 个月）；**1★、无 LICENSE** [affordance] | SQLite FTS5 + 向量混合 [documented：repo 描述] | Claude Code 插件 | 本地可行 | 单人，基本死亡 |
| 5 | LobeHub 技能市场条目 **xthakila/auto-claude-smart-memory**（名为 "smart-memory" 的 Claude 技能） | 页面存在 [observed：lobehub.com/skills/xthakila-auto-claude-smart-memory] | 未查证到正文（页面截断；同名 GitHub 仓 404 [affordance]） | Claude 技能 | 未知 | 不可考 |

已消亡：GitHub org `smart-memory/smart-memory-mcp`（web 检索结果 URL）现已 404 [affordance]。

### 2.3 用户听到的更可能是什么

- **supermemory**：名字最接近的知名产品——已升级为重点候选，见 §4。
- **mem0 / claude-mem / Letta** 混称：Claude Code 记忆生态清单（jvidal86/awesome-claude-code-memory，CC0）收录 mem0（清单记 49.3k★）、claude-mem（清单记 33.9k★，本人 API 复核实为 94,544★ [affordance]）等，均无 "smart memory" 名字 [observed]。
- npm 近似名（均非 DSH）：`@mrc2204/agent-smart-memo` v5.1.19（2026-03-20，"Smart Memory Plugin for **OpenClaw**"，槽位记忆 + **Qdrant 向量**——OpenClaw 平台插件 [affordance/documented]，本地需自起 Qdrant）；`cogmemai-sdk` v1.0.1（2026-08-31，自称 "the smart memory layer"，是 hifriendbot **云记忆服务的 SDK** [affordance/documented]——**需云**，硬约束直接排除）；`n8n-nodes-smart-memory` v1.1.83（n8n 工作流节点 [affordance]）。

**§2 结论**：不存在一个值得认真评估的 "smart memory"。五个同名物全部：单人维护、微小或停更、SQLite/云服务存储（违反判据一）、无 DSH 插件形态、无机器养护检查。唯一文件式的 `mcp-smart-memory` 是单 JSON 库而非 per-record 文件，且单版孤立 [affordance]。

## 3. 生态普查

### 3.1 DSH 官方位（本仓 vendor/dsh @ 0.1.5-rc.2, fb2c4b9, 2026-09-10）

- **官方不装任何记忆插件**：`vendor/dsh/packages/` 全树无 memory 包组（有 session-query 组，无 memory 组）[affordance]。社区包 `dsh-memory` 的 README 亦载明 "The harness ships no memory plugin. Its `extension-cookbook` names the mechanism — a prompt section plus tools — but nothing implements it" [documented]。
- **官方已有的接缝**：`session-query-sqlite`（SQLite FTS5 全文索引，base bundle 已接线、web profile 默认关闭）[documented：dsh-palimpsest/dsh-session-recall README 转述官方配置；bundle/base package.json 可指认]；`mcp-client` 包（把外部 MCP server 的工具桥接为原生工具，**只桥接 Tools 能力**）[documented：vendor/dsh/packages/mcp/README.md]。
- **官方文档给了第三方记忆 MCP 接入指南** `vendor/dsh/docs/user/guide/mcp-memory.md`：三个 tested pin（Memorix@1.3.0、`@modelcontextprotocol/server-memory@2026.7.4`、Engram v1.20.0），明言 "No memory server is present in the shipped composition"、"interoperability examples only… does not imply endorsement"，DSH 不管下载/建库/embedding/迁移 [documented]。对 MCP Reference Memory 的评价原话："Search is case-insensitive substring matching… does not add embeddings, automatic summarization, conflict resolution, or a forgetting policy" [documented]。
- 商店目录里 `@deepseek-ai/dsh-plugin-memory` / `@deepseek-ai/dsh-tool-memory` / `@deepseek-ai/dsh-mind-garden` 三个条目 **source 均为 github**（社区仓自命名的包名），不是官方包 [affordance：目录条目字段]。

### 3.2 DSH 生态记忆插件（目录内名字/描述涉记忆约 436 个 [affordance：本人按 name/summary 正则统计；口径不同数字略异——委托方按更窄口径得 390]）

**按星数排序的头部**（星数为目录 stars 快照 2026-09-23 [observed]；「本地」列按硬约束判定）：

| 插件 | 星 | 版本（日期） | 存储 | 一句话机制 | 本地 | 活跃度 |
|---|---:|---|---|---|---|---|
| `@openviking/dsh-memory-plugin` | 38,497 | 0.5.2（2026-09-23） | OpenViking 服务端 | 火山引擎 OpenViking 记忆平台的 DSH 客户端：auto-recall、会话捕获、`viking://~/memories`/`skills` 上下文空间，**需自起 OpenViking server** [documented] | **未知**（需 OpenViking server，部署形态未查证） | 火山引擎团队，活跃 |
| `@agentscope-ai/reme-dsh-plugin` | 3,503 | 0.1.0（2026-09-14） | ReMe 服务端 | 阿里 AgentScope 团队 ReMe 记忆服务接入：注入使用指引 + 只读 `reme_search`；轮后 auto_memory、每日 auto_dream 巩固 [documented] | 本地可行（ReMe 为可本地启动的开源 HTTP 服务 `reme start`；其存储细节未查证） | 11 位维护者，1 版 |
| `@zilliz/memsearch-dsh` | 2,641 | 0.1.5（2026-09-12） | **markdown 真源 + Milvus 派生索引** | Zilliz：`.memsearch/memory/YYYY-MM-DD.md` 跨 agent 共享（Claude Code/Codex/OpenClaw/OpenCode/DSH 同库），捕获→摘要→md，pre-step 注入，技能候选评审面板 [documented] | 本地可行（markdown 本地；需自起 Milvus + 本地 ONNX 嵌入） | Zilliz 团队，活跃 |
| `dsh-deja` | 925 | 0.21.0 | — | "deja-vu memory：33 种 coding agent 的会话史" [observed：目录摘要] | 未深查 | 未深查 |
| `@mnemon-dev/dsh-mnemon` | 590 | [gh] | — | mnemon 系的 LLM 监督持久记忆（图式召回）[observed] | 未深查 | 未深查 |
| **`dsh-mnemon`** | 397 | 0.5.13（2026-09-22） | SQLite（keywords） | 三层记忆控制面：常驻 runtime context + 可检索项目文档 + **可插拔长期记忆 provider**（supermemory/mem0/honcho 等为 keywords），WebUI + headless 工具 [documented：npm 描述 + repo] | 本地可行（本体 SQLite 本地；provider 视端点而定） | omdsh-dev，GitHub API 复核 400★/32 fork，持续推送 |
| `misakanet` | 501 | 2.34.0 | — | 失败记忆技能（证据评级的失败教训库）[observed] | 未深查 | 未深查 |
| `dsh-memory-evolve` | 327 | [gh] | — | 跨会话长期记忆 + 待办 + **技能管理** + 画板 + COI 调度的多能力集合 [documented：repo README] | 本地可行 | 中文社区，活跃 |
| **`@furongjun1999/dsh-memory`（灵枢）** | 238 | 0.5.0（2026-09-23，25 版） | **md_cg markdown 认知图** + Rust 检索 | "完整大脑"：对话沉淀进 md 认知图、重要性评分/预算装包/分层注入、多 harness 接入；**刻意不用向量嵌入**（"纯词面可复现"）[documented] | 本地可行（纯本地，零云设计） | 单人但极重投入，Python+Rust 平台 |
| **`dsh-engramory`** | 191 | 0.2.3（2026-08-20） | **纯 markdown 笔记** | 策展式文件记忆：MEMORY.md 索引 + 人可读笔记，跨宿主共享一个库；**索引上限 200 行/25KB 由 `ctx.tools.guard()` 单调否决强制执行**（拒绝而非请求）[documented] | 本地可行 | tinqiao-oss，6 版 |
| **`dsh-git-memory`** | 181 | 0.8.1（2026-08-24） | **本地 git 仓** | Git-backed 记忆：summary.md/handbook//rollouts//archive/，事务性同步、审计日志（仅元数据）、**frontmatter 结构化记录**、恢复点 [documented] | 本地可行 | 2 版 |
| `dsh-memento` | 111 | 0.5.16 | SQLite | "Bounded, layered, approval-gated, auditable"：`ctx.memory` 能力缝 + SQLite provider + 冻结快照注入，审批门控；0.5.11 起附 MCP server bin [documented] | 本地可行 | PerryLink，8–9 月高频发版 |
| `@a9i5k4/dsh-auto-memory` | 75 | 3.1.7（2026-09-23，**6 周 75 版**） | **MEMORY.md + 每日 md + 锚点** | "无问自忆"：轮末子代理判定要不要记、每日写入预算 ≤8 次；Tier-0 目录（≤800 token 常驻）→ Tier-1 摘要（8×140 字符）→ Tier-2 原文；**技能固化**（跨会话证据渐进成 checklist，三档注入 + 审批）；写入侧门禁 fail-closed；外部记忆只存路径指针 [documented] | 本地可行（本地文件 + 本地 int8 语义引擎 ~130MB 自动下载） | 单人，迭代极快（波动大） |
| `@wumihaze/dsh-mind` | 目录未收录 | 0.2.2（2026-09-12，40 版） | **MEMORY.md + md + json** | 便签 MEMORY.md（2200 字符预算）+ 钉住每轮注入（pinned.json）+ 用户策展经验库（`~/.dsh/memory/*.md`）+ **技能治理**（30 天→stale、90 天→archived，带快照回滚）[documented] | 本地可行（文件+关键词；语义检索需 SiliconFlow+**Qdrant Cloud**，**默认关**——开着才需云） | 单人，活跃 |

**委托方点名的其余候选**：

- **`dsh-mnemosyne`** v0.7.0（2026-09-13，MIT）：把 [Mnemosyne](https://github.com/mnemosyne-oss/mnemosyne)（BEAM 架构：Working/Episodic/TripleStore，sqlite-vec + FTS5 混合检索 + 时间知识图谱）接入 DSH 的壳插件——**记忆逻辑全在 Python CLI（`pip install mnemosyne-memory`）里，插件每次操作 shell out 到 CLI**；工具 remember/recall/forget/stats/sleep/bind；浏览器可批量改 trust/expiry/importance/lifecycle [documented]。**本地可行**（zero-cloud SQLite）。单人。
- **`@achasoft/dsh-memory`** v0.3.0（2026-09-16）：每项目一个 **DuckDB** 文件；BM25F + 可选向量；规则作为 system prompt 段落每次请求重读；Memory tab UI + 审计轨迹 [documented]。**本地可行**（DuckDB 本地；向量需 embeddings 端点可选）。
- **`dsh-pamyat-core`** v0.1.0-alpha.40（2026-09-05）：俄语项目，"agent 工作记忆：本地存储 + 决策日志 + 按类别的写策略，零依赖"；仍在 alpha，npm README 为空 [affordance]。本地可行。**未知**成分多（无文档）。
- **`@dsh-enhanced/memory-wiki-bridge`** v0.1.42（2026-09-23，27 版）：**只做两条显式晋升**——`knowledge_promote`（Memory ids+versions → Wiki proposal）与 `knowledge_pin`（Wiki revision + bounded summary → Memory proposal）；无数据库/文件/网络/LLM，只调 `ctx.personalMemory`/`ctx.personalWiki` 公开服务；provenance 用 `memory://<id>?version=<n>` + 内容 SHA-256 + data-not-instructions 证据区；**目标端保留自己的身份/策略/proposal/diff/审批/CAS，bridge 无法 commit** [documented]。本地可行。对照 DSH 0.1.2-rc.1 验证。
- **向量路线**：`@zilliz/dsh-milvus`（zilliztech/dsh-milvus）与 `dsh-context-milvus`（bobjia）均 GitHub 源、各 3★ [observed：目录条目]——本地可行但需自起 Milvus；Zilliz 系正面代表是 memsearch（markdown 真源 + Milvus 派生索引）。
- **会话史检索层**（与写入侧记忆互补，非竞品）：`dsh-palimpsest` v0.1.2（2026-09-13）——**不落盘**（不建索引、不留第二份明文副本），只读 DSH 自己的会话日志，硬限当前工作目录，**零注入**（记忆只以工具结果身份出现）[documented]；`dsh-session-recall` v0.7.3（2026-09-22）——确定性跨会话全文检索（持久 FTS5、cwd 默认、脱敏可选），自称 `dsh-recall`（0.3.0，2026-08-21 后停更）的后继 [documented]。两者均**本地可行**。
- **一次性/小众**：`dsh-memory` v0.1.0（2026-08-13 单版）：SQLite FTS5 + `memory:recall` prompt section（pinned 优先、`promptMaxChars` 2000 预算）——有界常驻注入的干净小样本，本地可行 [documented]；另 `@alanzhao/dsh-memory-lite`（"Markdown-file memory store, L0 catalog"）、`@aiwayds/dsh-topics-memory`（"a topic keeps the starting question, conclusion…"）、`@chenhw7/dsh-memory`（Cairn）、`@plur-ai/dsh`（engram 直注 prompt、无工具）、`@agentsoul/dsh-agentsoul`（SOUL/IDENTITY/USER/STATE 人格记忆层）等，均本地形态 [observed：目录摘要]。

### 3.3 通用框架与 Claude Code 生态（「本地」按硬约束判定）

| 方案 | 版本/活跃基线 | 机制一句话 | 存储 | 本地 | 插件化 | 维护 |
|---|---|---|---|---|---|---|
| **mem0**（mem0ai/mem0） | 65,896★，Apache-2.0，pushed 2026-09-23 [affordance] | LLM 提取管线把对话变成记忆条目，向量检索召回 | 向量库为主（清单记 Qdrant+Ollama 本地方案 OpenMemory MCP [observed]） | **双形态**：OSS 本地可行（自配向量库）；云 API 需云 | Python/TS SDK；非 DSH 插件 | 极活跃，生态最大 |
| **Letta/MemGPT**（letta-ai/letta） | 24,859★，Apache-2.0，pushed 2026-09-10 [affordance] | OS 式记忆分页：上下文内 core memory 块 + archival/recall 存储经工具换页 | 自有服务端 | 本地可行（self-host server） | 独立平台 + letta-code（Claude Code 侧集成 [observed]） | 活跃 |
| **Zep/Graphiti**（getzep/graphiti） | 31,105★，Apache-2.0，pushed 2026-09-23 [affordance] | 为 agent 构建实时知识图谱（实体/关系/事件） | 图数据库（官方配置节：Neo4j / FalkorDB / AWS Neptune [documented]） | 本地可行（自托管 + 自起图库）；Zep 云需云 | Python SDK；Zep 商业平台 | 活跃 |
| **MCP Reference Memory**（`@modelcontextprotocol/server-memory`） | 2026.8.31（2026-08-31）；DSH 官方指南 pin 2026.7.4 [affordance] | 实体/关系/观察三件套知识图谱 | **单个 JSONL 文件**（`MEMORY_FILE_PATH`）[documented] | 本地可行 | MCP server（DSH 可经 `dsh-mcp-client` 桥接，仅 Tools 能力 [documented]） | MCP/LF Projects + Anthropic 维护者，持续发版 |
| **claude-mem**（thedotmack/claude-mem） | 94,544★，Apache-2.0，pushed 2026-09-22 [affordance] | hook 驱动全量捕获 → AI 压缩 → 未来会话注入相关上下文 | SQLite + Chroma（清单与 repo topics [observed]） | 本地可行 | Claude Code 插件（兼容 8+ agent） | Claude Code 记忆生态旗舰 |
| **supermemory**（supermemoryai/supermemory） | 30,843★，MIT，pushed 2026-09-23 [affordance] | 事实抽取 + 时间更新/矛盾处理 + 自动遗忘 + 用户画像（static/dynamic）+ 混合检索（RAG+Memory）[documented] | **黑箱**：本地为单目录 `./.supermemory`（embedded graph engine 二进制管理，格式无文档，详见 §4②） | **本地可行**（本地嵌入默认 + Ollama 全离线路径明确 [documented]） | SaaS/API + 本地二进制 + 各家 agent 插件（含 DSH 桥，§4） | 活跃 |

### 3.4 生态共识模式（跨生态重复出现的设计决策）

[observed：jvidal86/awesome-claude-code-memory 的 Key Patterns 节 + §3.2 各 README 交叉印证]

1. **写入门禁**（"这会改变未来行为吗？"再决定记不记）——total-recall、claude-diary、vestige 的 prediction error gating、DSH 侧 auto-memory 的轮末判定、dsh-memory 的 write description 引导。
2. **Markdown 为真源、数据库为派生索引**——memsearch（markdown + Milvus 派生）、claude-diary、git-notes-memory、灵枢（纯词面）、engramory、dsh-mind、auto-memory、git-memory。
3. **常驻注入有界**——engramory（25KB 硬顶）、dsh-mind（2200 字符）、auto-memory（Tier-0 800 token）、dsh-memory（promptMaxChars 2000）、memento（bounded layers）、supermemory 桥（5×300 字符）。DSH 生态已把"有界常驻摘要"做成标配。
4. **压缩/遗忘是生命周期的一部分**——mnemosyne 的 trust/expiry/lifecycle 批量编辑、achasoft 的 Active/Archived/Expired、dsh-mind 技能 30d/90d 归档、stratagate 的"旧的褪成摘要"。
5. **本地优先**——趋势是从 API 依赖转向全离线（本地嵌入、本地库）；委托方的纯本地硬约束与生态大方向一致。

## 4. supermemory 线深评（用户点名候选）

### 4.1 基本盘

- supermemoryai/supermemory：30,843★，MIT，TypeScript，pushed 2026-09-23 [affordance]；定位 "State-of-the-art memory and context engine for AI"，机制：事实抽取、时间更新与矛盾处理、自动遗忘、用户画像（static/dynamic）、混合检索（RAG+Memory）、connectors（Google Drive/Gmail/Notion/GitHub 等）[documented：主 README]。
- **官方本地形态** [documented：主 README + apps/docs/self-hosting/*.mdx]：`npx supermemory local` 或安装脚本 → 单二进制 `supermemory-server`（GitHub Releases `server-v*` 标签分发）；首启自动建 embedded graph engine + 本地嵌入（默认 `Xenova/bge-base-en-v1.5` 768 维，无需 API key）+ 打印 API key；完整 Memory API（`/v3/documents`、`/v4/search`、`/v4/profile`、spaces）跑在 `http://localhost:6767`；LLM 自带钥匙（OpenAI/Anthropic/Gemini/Groq/任意 OpenAI 兼容端点），**或 Ollama 全离线**；数据在 `SUPERMEMORY_DATA_DIR`（默认 `./.supermemory`）一个目录；SDK 侧"prototype locally, ship on the hosted platform by changing baseURL"。
- **硬约束判定：本地可行**（存储、嵌入、LLM 三者均可不出本机；MIT license）[documented]。

### 4.2 三个要害问题

**① dsh-supermemory 桥能否指向本地 server？——能，经环境变量/项目配置；MCP 部分存疑。** [affordance：nmindz/dsh-supermemory v0.1.2 源码克隆指认]

- 桥的每个 API 调用都吃 `baseUrl` 参数；`getBaseUrl()` 解析顺序：环境变量 `SUPERMEMORY_API_URL` → 项目配置（git 根下 `.claude/.supermemory-claude/config.json` 的 `baseUrl` 字段）→ 默认 `https://api.supermemory.ai`。指向 `http://localhost:6767` 是官方 SDK 支持的同一开关。
- 鉴权：桥强制要 API key（`SUPERMEMORY_CC_API_KEY` → 项目配置 `apiKey` → `~/.supermemory-claude/credentials.json` 浏览器登录，无 key 则抛 `NO_API_KEY`）；本地 server 首启打印的 key 可经环境变量注入，绕开浏览器登录（`browserLogin` 亦可配置关闭）。
- **MCP 代理**：桥自带 stdio proxy 挂"**hosted** MCP server"，默认 `https://mcp.supermemory.ai/mcp`，可经 `SUPERMEMORY_MCP_URL` 覆盖——但**本地 server 是否提供 MCP 端点未在任何读到的文档载明（未知）**。本地部署的稳妥做法：经 PluginConfig 把 `mcp` 行为关掉，或验证本地 MCP 后再开。
- 桥的四个行为 `injectProfile` / `recall` / `capture` / `autoApprove`（+ `mcp`）**默认全开，均可单独配置关闭**——一个部署可以退化成"纯工具 + 无注入"，但那样剩下的只是 MCP 工具面 + 远端存储。

**② 本地 `./.supermemory` 的实际存储格式？——黑箱；判据一冲突严重。** [affordance + documented]

- 自托管 server 是**二进制分发**（安装脚本按 OS/架构下载二进制；Releases 打 `server-v*` 标签）；**supermemoryai/supermemory 开源仓不含 server 实现**——apps/ 只有 docs 与 mcp，packages/ 是各家 SDK 加 `@supermemory/memory-graph` v0.2.4（那只是 React + d3-force 的**图可视化组件**，不是引擎）[affordance：仓库树遍历]。
- 文档对 `./.supermemory` 的全部记载："the graph engine's data, auth secret, and model cache"住在这一目录、"easy to back up or move"——**内部格式（数据库？文件？何种 schema？）无任何文档载明** [documented：self-hosting/configuration.mdx]。
- 升级警告原话："an older server **may not understand data or schema changes** made by a newer release"——数据 schema 版本化且跨版本不保证可读 [documented：self-hosting/quickstart.mdx]。
- 对照判据一（人可读、可 git/diff、可手改、可删）：**全不满足**。单目录可整体备份 ≠ 单条记录可审校；无 per-record 文件、无 frontmatter、无 diff 语义；且引擎闭源二进制意味着"错了赔得起吗"的答案取决于对厂商二进制的信任而非对文件的信任。

**③ 桥的"每轮注入召回/自动固化"与委托方哲学的冲突？——控制权倒置，但边界做得比预期细。** [affordance：recall.ts / capture.ts 源码 + documented：README]

- 设计意图写在 README 里："Recalls on every prompt… **instead of waiting for the model to spend a tool call**"——**召回代理权在插件不在模型**；recall.ts 顶部注释同样明言。每条 ≥12 字符、非 `/` `!` `#` 开头的实质性 prompt 都触发一次对记忆服务的检索。
- 有界性（源码常量）：每次注入 ≤5 条 × 300 字符、相似度 ≥0.55、查询 ≤500 字符、4s 超时、会话级去重（≤500 条哈希）、空库时会话内一次性发现提示；profile 注入 ≤5 条；失败一律"这次没有记忆"，绝不阻塞会话。**预算纪律其实与委托方同水位**——分歧不在预算在控制权。
- 写回：`agent/turn-stopping` **串行**钩子每轮把对话增量 POST `/v3/documents`（metadata `sm_capture_mode: 'automatic'`），写入门禁委托给服务端的 `entityContext` 提取提示（"记队友会记住的事，跳过瞬态仓库状态"），**非客户端重要性判定**；signal 关键词模式可选、默认关。
- 与委托方「有界摘要常驻 + 模型主动工具调取 + 写入有门禁」对照：前两者控制权相反，第三项门禁位置相反（服务端 vs 客户端 curate）。可配置降级（recall/capture/injectProfile 全关）但降级后只剩"MCP 工具 + 黑箱存储"。

### 4.3 基准主张的核证状态

- "#1 on LongMemEval / LoCoMo / ConvoMem，95% Recall@15，99.4% 上下文缩减"为**官方自报**；评测框架 MemoryBench 也是其自建开源框架（supermemoryai/memorybench）[documented：主 README + repo]。
- 本轮**未找到独立复现**。一份第三方对照（MeMesh 的 LongMemEval-S 结果文件）把 supermemory 列为 ~82% R@5，并注明 "Vendor estimate — **Not independently verified**" [observed：PCIRCLE-AI/memesh-llm-memory v4.1.1 `benchmarks/longmemeval/RESULTS.md`]。注意指标口径不同（Recall@15 vs R@5），不直接可比。
- 采纳其性能主张前应自行跑 MemoryBench 或委托方自己的评测集。

### 4.4 DSH 侧的两条 supermemory 接法

1. **专桥 `dsh-supermemory` v0.1.2**（MIT，nmindz，唯一运行时依赖 `@deepseek-ai/schemastery`）：Claude Code supermemory 插件 v0.1.8 的原生移植——同一凭据文件、同一 wire 格式，Claude Code 与 DSH 共享同一容器记忆 [documented]。行为见 4.2③。
2. **`dsh-mnemon-provider-supermemory` v0.5.4**（2026-09-06，MIT，omdsh-dev/grivn）：dsh-mnemon 的 **Memory Spaces Source 子 provider**——"adapter for Supermemory ingestion, extracted memories and container-scoped retrieval. Requires an endpoint, credentials and container scope"；经 `dsh-mnemon-source-memory-spaces` 的 `config.providers` 挂载，凭据留在 Host [documented]。即 dsh-mnemon 把 supermemory 当**可插拔后端**之一（端点可配 → 理论上可指向本地 server，与本地 server 的鉴权兼容性未验证，**未知**）。

### 4.5 supermemory 线判据小结

| 判据 | 判定 | 依据 |
|---|---|---|
| 〇 本地硬约束 | **✓ 过** | 单二进制 + 本地嵌入 + Ollama 全离线 [documented] |
| 一 赔得起（人可读文件） | **✗ 严重冲突** | 黑箱目录、格式无文档、引擎二进制闭源、跨版本 schema 风险（§4.2②） |
| 二 发现得及时 | △ | 有自动遗忘/矛盾处理（引擎内），但无委托方可跑的 curate，存储不可审 [documented 机制存在 + 不可审] |
| 三 形态 | ✓ | 真 DSH 插件桥（`dsh plugin add dsh-supermemory`）[documented] |
| 四 语义契合 | **✗** | 无三房间、无可见 supersede 链、无委托方 provenance 词汇；记忆结构是 supermemory 自己的画像/记忆本体 [documented] |
| 五 信噪比 | △ | 注入有硬界（5×300/去重/超时），但每 prompt 插件代搜 + 每轮自动写回，控制权与委托方倒置（§4.2③） |
| 六 维护 | ✓/△ | 30.8k★ MIT 活跃；但引擎二进制分发（源不在开源仓）、桥单人 v0.1.2 [affordance] |
| 七 迁移成本 | ✗ | 委托方 Markdown+frontmatter → 黑箱服务 = 格式+语义双迁移且不可逆审 |

**结论**：supermemory 本地形态真实、工程质量高，是"黑箱高性能记忆服务"路线的代表；委托方是"白箱文件记忆"路线。判据一与判据四是委托方明文立场（否决数据库/向量库为核心存储；三房间结构），supermemory 在这两条上不满足而非接近。**不构成换轨理由**；其有界注入常量与遗忘/矛盾处理机制进入借用清单（§6）。

## 5. 判据对照（委托方判据 × 全候选池）

**判据〇（新硬约束）：纯本地。** 直接排除/降级：`cogmemai-sdk`（云 SDK）[affordance]；`@openviking/dsh-memory-plugin`（需 OpenViking server，部署形态未证实本地，**未知**）[documented]；`@wumihaze/dsh-mind` 的语义检索（SiliconFlow+Qdrant Cloud，默认关，关着不影响本体）[documented]；`@mrc2204/agent-smart-memo`（OpenClaw + Qdrant，需自起向量库）[documented]。其余头部候选均本地可行（§3.2/§3.3 各表"本地"列）。

**判据一：错了赔得起吗（人可读文件，可 git/diff/手改/删）**

- 五个 "smart memory" 同名物：四个 SQLite / 一个单 JSON 库，**全部不过** [affordance]。
- supermemory：黑箱目录，**不过**（§4.2②）。
- DSH 生态通过者：engramory、git-memory、dsh-mind、auto-memory、memsearch（markdown 真源）、灵枢。不过者：dsh-memory/memento/mnemosyne/meow-memory（SQLite）、achasoft（DuckDB）、milvus 系（向量）、reme/openviking（服务端）。
- 委托方现有 per-record Markdown+frontmatter 比生态通行做法**更严**（多数是单 MEMORY.md 多记录混装；auto-memory 用锚点 `<!-- memory:mem_<hex> -->` 实现"身份寻址"来弥补混装定位问题 [documented]）。

**判据二：错了多久能发现（机器可跑养护 + 摘要可见有界）**

- 同名物：无可比物（`mcp-smart-memory` 只有 memory_stats；`smart-memory` CLI 有 candidates/promote/reject 的影子，但建在 SQLite 上 [affordance]）。
- supermemory：引擎内有自动遗忘/矛盾处理，但委托方无 curate 入口、存储不可审 [documented/affordance]。
- 生态最强样本：**engramory 的 `ctx.tools.guard()` 单调否决**（索引超限直接拒绝写入）[documented]——DSH 平台接缝上可指认的 affordance；其次 auto-memory 的写入门禁 + 每日预算 + 唤起审计 [documented]。
- 委托方 curate（重复/悬空引用/预算/过期线索）在生态里没有对等物——最接近的是 dsh-mind 技能治理（过期归档+回滚）与 mnemosyne 生命周期批量编辑，都只覆盖单一维度。

**判据三：形态（DSH 插件 / 可引用库）**

- 同名物：**零个 DSH 插件**。`mcp-smart-memory`/`smart-memory-mcp` 理论上可经 `@deepseek-ai/dsh-mcp-client` 桥进 DSH（官方指南明载此通路，仅 Tools 能力 [documented]），但桥接后无常驻摘要缝、存储仍是它们自己的格式；`smart-memory` CLI 是进程外全局工具，家在 `~/.smart-memory`，与"家在工作目录、可 git"的模型相反 [documented]。
- supermemory：真 DSH 插件桥（§4.4），可指向本地（§4.2①）。
- DSH 生态候选全部真插件（`dsh plugin add` 安装、cordis bundle patch 自注册）[affordance]。

**判据四：语义契合（三房间 + 三档出口 + supersede/retire + provenance）**

- **没有任何外部方案具备三房间结构**。最接近的碎片：
  - 三档出口：`@dsh-enhanced/memory-wiki-bridge` 的 proposal-only 双向晋升（provenance URI + SHA-256 + 目标端审批/CAS）与委托方 research→memory 的 promote 概念同构，但它是 Memory↔Wiki 两房间，没有 backlog 的 park/drop [documented]。
  - supersede/retire：mnemosyne 有 lifecycle 批量编辑；achasoft 有 Active/Archived/Expired + 审计轨迹 [documented]；supermemory 有"时间更新/矛盾处理/自动遗忘"但发生在引擎内部、不可审 [documented]。
  - provenance：wiki-bridge（URI+SHA-256）、auto-memory（五来源 user/project/log/whiteboard/reflection + 锚点身份寻址）、achasoft（审计轨迹）各有覆盖，无人全有。
  - 技能房间：auto-memory 的技能固化（证据渐进 + 审批 + 三档注入）与 dsh-mind 的技能治理（30d/90d + 回滚）是生态里仅有的两处认真做技能生命周期的 [documented]。
- 委托方词汇（fact/preference/decision × active/superseded/retired × source/supersedes，一记录一文件 [affordance：`packages/dsh-smart-assistant/src/memory/record.ts`]）在任何候选里都无处安放。

**判据五：信噪比（常驻上下文有界）**

- 生态共识已与委托方对齐（§3.4 第 3 条）。需警惕的反面：auto-memory 的 "zero-prompt recall 注入"、dsh-recall v0.3.0 的自动回忆层、supermemory 桥的每 prompt 代搜注入是**主动注入派**（有预算但召回代理权在插件）[documented]；委托方的"摘要有界 + 细节走工具"属于模型主动派，与 palimpsest 的"零注入"哲学同侧。

**判据六：维护（license、近期提交、真实用户）**

- 同名物：单人、0–1★、单版或停更 6–15 个月，两个连 LICENSE 文件都没有 [affordance]。
- supermemory：30.8k★ MIT 活跃，但引擎二进制闭源分发、DSH 桥单人 v0.1.2 [affordance]。
- DSH 头部：openviking（火山引擎）、reme（阿里 11 维护者）、memsearch（Zilliz）有组织背书；auto-memory/dsh-mind/engramory/git-memory 单人但活跃。风险点：auto-memory 6 周 75 版（接口极速漂移）；dsh-mind 不在商店目录索引（分发面存疑 [observed]）。

**判据七：迁移成本**

- 委托方格式是自家 Markdown+frontmatter。换任何外部方案 = 格式 + 语义双迁移：三房间结构（尤其 research backlog 三档出口）没有等价目标位；supersede 链要重造；curate 检查要对别人的存储重写；per-record 文件 → MEMORY.md 混装或 SQLite/黑箱是**信息有损降级**（丢失可 git/diff 性）。反向（外部 → 委托方）无此问题，因为委托方尚未锁定大量数据。

## 6. 建议

### 结论：**维持自研（自持）**

**"smart memory" 不存在**（DSH 目录精确零匹配；四生态的五个同名物全部单人、微小或停更、SQLite/云存储、无 DSH 形态、无养护 [affordance]）——"直接用它"这个选项在事实上没有对象。

**supermemory（点名候选）不构成换轨理由**：硬约束「本地」通过，但判据一（黑箱目录、引擎二进制、schema 跨版本风险）与判据四（无三房间/supersede/provenance 可见性）是路线性冲突而非工程缺口；桥的三问（§4.2）显示本地接法可行但哲学倒置。它是"黑箱高性能记忆服务"，委托方做的是"白箱文件记忆"——两条路线在委托方判据下不兼容。

**头部 DSH 替代也不构成换轨理由**，逐判据：

- 过判据一的文件派候选（engramory / git-memory / dsh-mind / auto-memory / memsearch / 灵枢）各缺一块：engramory 无生命周期与检索深度；git-memory 2 版单人；dsh-mind 单 MEMORY.md 混装 + 技能治理只覆盖技能；auto-memory 概念上与委托方最重叠（记忆+技能+反思+交接）但 6 周 75 版单人极速漂移、主动注入派与委托方哲学相反；memsearch 需 Python 工具链 + Milvus；灵枢是 Python+Rust 平台级侵入。
- 换轨 = 格式+语义双迁移 + 三房间/supersede/provenance 重建（判据四、七），而自研已同时满足全部七条 + 本地硬约束（判据一、二、五是委托方强项；判据三自研本就是 cordis 插件；判据〇文件方案天然全离线）。
- 唯一值得"换"的场景不存在：没有任何候选提供委托方缺失且自建昂贵的能力。

### 附：设计级借用清单（借机制与思路，不引代码、不换存储）

1. **确定性预算强制**（engramory）：用 DSH 的 `ctx.tools.guard()` 单调否决把摘要/索引预算从"纪律"升级为"写入原语层的拒绝" [affordance：DSH 接缝可指认 + engramory 实证]。委托方 digest 字节预算与 curate 的预算检查可借此机械化。
2. **技能生命周期**（dsh-mind）：30 天→stale、90 天→archived、快照+回滚——给委托方 skills 房间补一条老化策略 [documented]。
3. **晋升回执**（@dsh-enhanced/memory-wiki-bridge）：`memory://<id>?version=<n>` + 内容 SHA-256 + data-not-instructions 证据区 + 目标端保留审批/CAS——为 research→memory 的 promote 出口设计同构回执 [documented]。
4. **写入门禁与审计**（auto-memory）：轮末"要不要记"判定、每日写入预算、唤起决策可回看打分——curate 报告可加"写入侧"与"使用侧"两类审计信号 [documented]。
5. **有界注入常量**（supermemory 桥）：5 条 × 300 字符、相似度下限 0.55、查询 500 字符、会话级去重、超时即弃——委托方 recall 工具的返回形状与预算可参照这套已被实跑检验的常量 [affordance：recall.ts]。
6. **画像二分与引擎内养护语义**（supermemory）：static/dynamic 用户画像二分、"时间更新/矛盾处理/自动遗忘"——作为 curate 检查项（过期线索、矛盾对）的思路来源，落地在委托方自己的文件与检查上 [documented]。
7. **跨 agent 共库模式**（memsearch）：同一 markdown 库被多家 agent 插件读写——若委托方未来要跨 harness 共享家，这是生态已验证的互操作形态 [documented]。
8. **生态共识背书**（§3.4）：markdown 真源 + 有界常驻 + 写入门禁 + 本地优先正是委托方现有设计——本次普查可视为对该路线的独立验证。

### 持续观察名单（不采用，定期看）

`@a9i5k4/dsh-auto-memory`（概念重叠度最高的同类，盯 Tier-0/1/2 注入与技能固化演进）；`@wumihaze/dsh-mind`（技能治理）；`dsh-engramory`（guard 强制预算）；`@zilliz/memsearch-dsh`（跨 agent 共库）；supermemory 本地线（若未来开源 server 源码或文档化存储格式，值得重评判据一）；`dsh-palimpsest`（若未来想补"原始会话史回溯"这一家不覆盖的正交能力，可评估作为**附加插件**共存，而非核心替换——它零注入、不落盘、只读，与家不冲突 [documented]）。

## 附：版本基线汇总（查证时点 2026-09-23/24）

| 包/仓 | 版本 | 发布/推送日期 | license | 本地 |
|---|---|---|---|---|
| smart-memory (npm) | 0.1.2 | 2026-08-17 | MIT（声明）；repo 无 LICENSE 文件 | 可行 |
| mcp-smart-memory | 1.0.0 | 2026-02-10 | MIT | 可行 |
| smart-memory-mcp | 1.0.11 | 2025-06-16（全部版本同日） | MIT | 可行 |
| xpm-cmd/SmartMemory | —（repo） | push 2026-03-26 | 无 | 可行 |
| supermemoryai/supermemory | —（repo） | push 2026-09-23 | MIT | **可行**（本地二进制） |
| @supermemory/memory-graph | 0.2.4 | —（repo 内） | MIT | （可视化组件） |
| dsh-supermemory | 0.1.2 | —（repo 克隆） | MIT | 可行（需本地 server） |
| dsh-mnemon-provider-supermemory | 0.5.4 | 2026-09-06 | MIT | 未知（端点可配，兼容性未验证） |
| dsh-plugin-shop-catalog | 2026.923.1 | builtAt 2026-09-23 | 目录数据 | — |
| @a9i5k4/dsh-auto-memory | 3.1.7 | 2026-09-23 | BSD-3-Clause | 可行 |
| dsh-mnemosyne | 0.7.0 | 2026-09-13 | MIT | 可行 |
| @wumihaze/dsh-mind | 0.2.2 | 2026-09-12 | MIT | 可行（语义默认关） |
| @achasoft/dsh-memory | 0.3.0 | 2026-09-16 | MIT | 可行 |
| dsh-pamyat-core | 0.1.0-alpha.40 | 2026-09-05 | MIT | 可行（alpha） |
| @agentscope-ai/reme-dsh-plugin | 0.1.0 | 2026-09-14 | Apache-2.0 | 可行（自起 ReMe） |
| @openviking/dsh-memory-plugin | 0.5.2 | 2026-09-23 | Apache-2.0 | **未知**（需 server） |
| @zilliz/memsearch-dsh | 0.1.5 | 2026-09-12 | MIT | 可行（需自起 Milvus） |
| dsh-engramory | 0.2.3 | 2026-08-20 | MIT | 可行 |
| dsh-git-memory | 0.8.1 | 2026-08-24 | MIT | 可行 |
| @dsh-enhanced/memory-wiki-bridge | 0.1.42 | 2026-09-23 | MIT | 可行 |
| dsh-mnemon | 0.5.13 | 2026-09-22 | MIT | 可行 |
| dsh-memento | 0.5.16 | 2026-09（近期） | Apache-2.0 | 可行 |
| dsh-palimpsest | 0.1.2 | 2026-09-13 | MIT | 可行 |
| dsh-session-recall | 0.7.3 | 2026-09-22 | MIT | 可行 |
| dsh-memory | 0.1.0 | 2026-08-13（单版） | MIT | 可行 |
| @modelcontextprotocol/server-memory | 2026.8.31 | 2026-08-31 | MIT | 可行 |
| mem0ai/mem0（repo） | — | push 2026-09-23 | Apache-2.0 | 双形态 |
| letta-ai/letta（repo） | — | push 2026-09-10 | Apache-2.0 | 可行 |
| getzep/graphiti（repo） | — | push 2026-09-23 | Apache-2.0 | 可行 |
| thedotmack/claude-mem（repo） | — | push 2026-09-22 | Apache-2.0 | 可行 |
| vendor/dsh（本仓 pin） | 0.1.5-rc.2 | fb2c4b9, 2026-09-10 | — | — |
| @mrc2204/agent-smart-memo | 5.1.19 | 2026-03-20 | MIT | 可行（需 Qdrant） |
| cogmemai-sdk | 1.0.1 | 2026-08-31 | MIT | **需云** |

星数基线：目录 stars 快照 2026-09-23（openviking 38,497 / reme 3,503 / memsearch 2,641 / mnemon 397[目录]≈400[API 复核] / 灵枢 238 / engramory 191 / git-memory 181 / memento 111 / auto-memory 75）；GitHub API 复核：claude-mem 94,544 / mem0 65,896 / graphiti 31,105 / supermemory 30,843 / letta 24,859。
