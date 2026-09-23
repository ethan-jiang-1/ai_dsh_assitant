# 2026-09-24 · 知识层调研（r3）：领域知识怎么获取、组织、更新——生态普查与建议

日期：2026-09-24 · 状态：survey 底稿（判据与决策不放这里；进文前的承重主张待委托方复核）

> 问题：委托方的家（working folder）目前三个房间——`memory/`（已确立的事实/偏好/决定）、
> `research/`（未决线索，三档出口）、`skills/`（SKILL.md 操作程序）。**领域知识（domain
> knowledge）不是一等公民**：仓库知识靠人维护的 `docs/`、`notes/` 和 AGENTS.md 入口链，
> agent 对领域的理解散在记忆与技能里。要不要、以及怎么做一层真正的"知识"？
> 用户新增偏好：**wiki 式知识结构**（互链、有机生长、人可编辑），并问 DSH 有没有 wiki 插件。
>
> day-0 约束（继承，不重议）：记忆存储否决 SQLite/向量库（人可读可 git 可手改优先）；
> 语义检索延后（触发条件 = 真实漏召回）。
>
> 评估判据（委托方五条）：①错了赔得起吗（人可读文件 vs 向量库/图谱库）②错了多久能发现
> （机器检查；过期可见）③形态（能否进 DSH 组合或作为惯例被借用；检索面是否必须 embedding）
> ④信噪比（常驻上下文有界）⑤维护（license、活跃度、真实用户）。
>
> 证据分级：[affordance] 源码/接口可指认 / [documented] 官方文档载明 / [observed] 社区观察（注明出处）。
> 版本基线：每个包/规范写明查证时版本或日期。全部 URL 为本次会话真实 fetch（失败处如实注明）。
> DSH 侧本地证据基于 pin `dsh-v0.1.5-rc.2`（vendor/dsh submodule）。

---

## 一、"知识 vs 记忆 vs 技能"的产品切分

### 1.1 mem0（mem0ai 2.1.0，PyPI，2026-09 查证）

- **切分**：[documented] `MemoryType` 枚举有 semantic / episodic / procedural 三值，但官方文档明说
  **"procedural memory is implemented, semantic and episodic are not"**。procedural = "step-by-step
  task knowledge (how an agent performs a workflow) rather than facts about a user"，需 `agent_id`。
  其实现 [affordance] 是对 agent 执行历史的持续摘要（`PROCEDURAL_MEMORY_SYSTEM_PROMPT`，
  mem0/configs/prompts.py，main 分支）。"技能"在 mem0 是独立机制：另发 SKILL.md 技能包
  （skills 标准），与 procedural memory 无代码关联。
- **更新管线**：[affordance] 旧管线 = LLM 四选一："You are a smart memory manager... four
  operations: (1) add, (2) update, (3) delete, and (4) no change"——矛盾事实直接 DELETE。
  [documented] 2026-04 新算法改为 "**Single-pass ADD-only extraction** — one LLM call, no
  UPDATE/DELETE. Memories accumulate; nothing is overwritten"。过期：`expiration_date`，
  "Expired memories are hidden from `search`... fetching by ID still returns them"（过期不删、默认隐藏）。
- **存储**：[documented] OSS 默认本地 Qdrant + SQLite history；平台版 SQL+向量库+entity store。
  **必须向量库，无文件存储选项**；人可读性差。
- 来源：docs.mem0.ai `/core-concepts/memory-types`、`/core-concepts/how-it-works`、
  `/core-concepts/memory-operations/add`；raw.githubusercontent.com/mem0ai/mem0/main/mem0/configs/prompts.py；
  pypi.org/pypi/mem0ai/json。

**对委托方**：mem0 的三分法（semantic/episodic/procedural）是把"知识"并进 semantic memory 的路线，
且 semantic 分支实际未实现——"知识独立成层"在 mem0 是**没有**做成的；procedural≈委托方 skills/ 的
生态对应物。存储形态全面违反判据①。

### 1.2 Letta / MemGPT（Letta Code 0.27.11，docs.letta.com changelog，2026-09 查证）

两代设计，方向本身就是结论：

- **Legacy memory blocks**（v1 SDK 文档，标 `status: legacy`）：[documented] memory blocks =
  "structured sections of the agent's context window that persist across all interactions. They are
  **always visible - no retrieval needed**"（确认常驻上下文）；`persona` / `human` / 自定义 block。
  分层表：**Memory Blocks**（in-context，agent 用 `memory_rethink`/`memory_replace`/`memory_insert`
  自编辑，建议 <50k 字符/块）｜**Files**（只读，`open/semantic_search/grep`）｜**Archival Memory**
  （"less important memories that do not always need to be recalled"，不进上下文）｜**External RAG**。
  官方选型例："user's name is Sarah"→Blocks；"公司文档数百页"→Files；"今天聊了开心事"→Archival。
  后台整理（sleep-time compute）现名 **Dreaming**。
- **现行 MemFS**（0.14.0 引入、0.14.1 默认开启）：[documented] "**a git-backed memory
  filesystem**"——记忆是 agent 自有的 git 仓库，投影为本机真实 checkout；每条记忆 =
  "Markdown with YAML frontmatter"；目录结构 `$MEMORY_DIR/ ├── system/（persona.md、human.md）
  ├── reference/ └── skills/my-skill/SKILL.md`。**"Files under `system/` are loaded into the
  agent's system prompt on every turn"**（放 identity、用户偏好、durable project facts、关键工作流规则）；
  system/ 外不进上下文，但 **"The file tree itself is always in the system prompt, so directory and
  file names act as signposts"**。`/doctor` 审计记忆放置/重复/token 占用；dreaming 与 memory doctor
  子代理用 **git worktrees** 并发改记忆；每次编辑 commit 进 git（版本史、冲突解决）。
  [documented] **"MemFS does not include a semantic or vector index by default. Agents find
  memory... with normal file-search and read tools"**——语义检索是可选 mod（`@letta-ai/memfs-search`）。
- 来源：docs.letta.com `/concepts/memfs`、`/configuration/memory`、`/v1-sdk/memory/memory-blocks.md`、
  `/v1-sdk/memory/context-hierarchy.md`、`/reference/changelog.md`（本人复核 `/concepts/memfs` 全文）。

**对委托方**：这是本调研**最强的收敛信号**——Letta 的最新形态与委托方的家几乎同构：
`system/`（常驻摘要，≈桌面）+ `reference/`（长资料，≈知识房间）+ `skills/`（SKILL.md，≈技能房间）
+ git 版本化 + `/doctor`（≈curate）+ **默认无向量索引**。Letta 作为记忆产品出身的团队，把
"长资料/领域知识"从记忆里分出来放 `reference/`，等于替委托方验证了"知识独立成层"的必要性。

### 1.3 Zep / Graphiti（graphiti-core v0.30.2，2026-09-08；论文 arXiv:2501.13956，2025-01-20）

- **切分**：[documented] 三层子图："an **episode subgraph**, a **semantic entity subgraph**, and a
  **community subgraph**"。episode = 原始输入（message/text/JSON），"Episodes serve as a
  **non-lossy data store** from which semantic entities and relations are extracted"；"The dual
  storage of both raw episodic data and derived semantic entity information **mirrors psychological
  models of human memory**"。没有"user facts vs domain facts"的两分——分层是图层级，主体维度靠
  graph namespacing（group_id）。
- **治理（本报告 §六的主力证据）**：bi-temporal 四时间戳 + edge invalidation + episode 溯源（见 §六）。
- **存储**：[documented] 图数据库（Neo4j 5.26 / FalkorDB 1.1.2 / Neptune）+ LLM + embedding。
  人可读性差——**违反判据①**，但治理语义（失效不删除、溯源到 episode）是所有方案里最成体系的。
- 来源：arxiv.org/html/2501.13956v1；pypi.org/project/graphiti-core/（PyPI Trusted Publishing
  官方 README："Facts have validity windows. When information changes, old facts are invalidated —
  not deleted."）；github.com/getzep/graphiti/releases/latest。

### 1.4 Anthropic memory tool（工具类型 `memory_20250818`，2025-08-18）

- [documented] **客户端工具**：Claude 只请求文件操作（view/create/str_replace/insert/delete/rename），
  限定 `/memories` 前缀，宿主自选后端。启用后 API 自动注入 MEMORY PROTOCOL："IMPORTANT: ALWAYS
  VIEW YOUR MEMORY DIRECTORY BEFORE DOING ANYTHING ELSE... **ASSUME INTERRUPTION**: Your context
  window might be reset at any moment"。
- **组织方式**：[documented] 官方示例按主题一文件（customer_service_guidelines.xml、
  refund_policies.xml）；多会话软件开发的官方模式：初始化会话先立**进度日志 + 功能清单**两类文件，
  新会话开头读取恢复状态，"一次只处理一个功能"，端到端验证后才标完成。
- **治理纪律**：[documented] "always try to keep its content up-to-date, coherent and organized. You
  can rename or delete files that are no longer relevant. **Do not create new files unless
  necessary**"；"Periodically delete memory files that haven't been accessed in a long time"。
- 来源：platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool.md（en 版重定向未取得，
  全文取自 zh-CN 版 .md 端点，内容同源）。

**对委托方**：Anthropic 把 memory 定义为**纯文件目录**（"记忆支持 just-in-time context retrieval"），
不同类型信息放不同文件/目录——与委托方"一条一文件 + 房间分区"同型。注意：此页**没有**"memory 存偏好、
CLAUDE.md 存指令"的表述；那组分工在 Claude Code 文档里（§2.2）。

### 1.5 其他（各一段）

- **LangMem**（langchain-ai.github.io/langmem，文档站未标版本）：[documented] 三分类表——
  **Semantic**（"Facts & Knowledge: user preferences; knowledge triplets"）/ **Episodic**（"Past
  Experiences"）/ **Procedural**（"System Behavior... **It starts with system prompts** that define
  core behavior, then evolves through feedback"→直接改写系统提示）。LangMem 干脆把 procedural
  定义为"系统指令进化"——≈委托方 skills/ 的另一种实现。无时间/过期/provenance 机制。
- **Cognee**（v1.6.0，2026-09-18）：[documented] "Turn documents, code, and conversations into a
  self-hosted knowledge graph"；两层知识观："Session distillation curates accepted lessons into
  permanent memory"——会话态→蒸馏→持久知识，**正对委托方 research/→memory/ 的 promote 语义**。
  存储为图库+向量库（Postgres 单库方案是 demo/商业授权），违反判据①。
- **Basic Memory**（v0.23 pre-release，AGPL-3.0，basicmachines-co）：[documented] 每文件一个
  Entity："Entities have **Observations** (facts about them) and **Relations** (links to other
  entities). That's the whole grammar"；Relations 即 wikilink。存储 = "**Just files plus a local
  SQLite index. No servers required**"；"the **source of truth is always your files**"，索引可重建
  （reindex），doctor 做文件↔DB 一致性检查。检索核心 = `build_context` 沿 wikilink 逐链遍历
  + 全文检索；**语义向量检索可选且默认关闭**。AGPL-3.0 对判据⑤是个注意点（传染性）。
  来源：raw.githubusercontent.com/basicmachines-co/basic-memory/main/README.md。

### 1.6 切分的公共轴（横向结论）

三条轴在所有方案里反复出现 [observed，基于上述各家官方文档交叉]：

1. **常驻 vs 按需**：常驻上下文层（Letta `system/`、memory blocks、LangMem Profile）vs 按需检索层
   （archival、Files、collection、episode）——即委托方的桌面/抽屉哲学，生态一致。
2. **易变会话态 vs 蒸馏后的持久知识**：Cognee session distillation、dsh-enhanced 的
   memory↔wiki 晋升（§4.3）最明确——即委托方 research/ 的三档出口。
3. **陈述性（事实/偏好/知识）vs 程序性（怎么做）**：procedural memory 普遍单独处理（mem0 摘要式、
   LangMem 系统提示进化式、Letta skills/ 目录式、Anthropic skills 标准）——委托方 skills/ 房间
   与主流一致。
4. **知识 vs 记忆的边界**（本次新增的第四轴，委托方问题的核心）：把"长资料/领域理解"从"短事实"
   里分出来，生态里有三家做成了显式产品规则：Letta（`reference/` vs `system/`）、dsh-enhanced
   （personal-wiki vs personal-memory，见 §4.3 原文）、Anthropic memory tool（目录分域 +
   "不必要不建文件"）。**mem0/Zep 反例**：knowledge 并进 semantic memory / 实体图，没有独立层。

---

## 二、仓库/领域知识的惯例形态（repo instruction files 生态）

### 2.1 AGENTS.md（规范无版本号；治理归 Linux Foundation 旗下 Agentic AI Foundation）

- [documented] 定位："A simple, open format for guiding coding agents"；自称 "**README for
  agents**"——README 给人，AGENTS.md 收 agent 需要的额外上下文（build/tests/conventions）；
  60k+ 开源项目在用。起源："emerged from collaborative efforts... including OpenAI Codex, Amp,
  Jules from Google, Cursor, and Factory"；monorepo 嵌套（"the closest one takes precedence"，
  OpenAI 主仓 88 个）。FAQ："Treat AGENTS.md as living documentation"；冲突规则："The closest
  AGENTS.md to the edited file wins; explicit user chat prompts override everything"。
- [observed] 采用者名单（官网，2026-09-23 fetch）：Codex、Jules、Gemini CLI、Factory、Aider、goose、
  opencode、Zed、Warp、VS Code、Devin、Junie、Amp、Cursor、RooCode、GitHub Copilot coding agent、
  Windsurf、Augment 等 20+。仓库已从 openai/agents.md 迁至 github.com/agentsmd/agents.md。
- **与 CLAUDE.md 共存**：现行官网 FAQ 已删 CLAUDE.md 条目 [observed]；共存语义移到消费方——
  Claude Code 默认 `claude-md-or-agents-md`（无 CLAUDE.md 时才读 AGENTS.md，v2.1.277+），可设
  双读或 `@AGENTS.md` import 共享 [documented]。Cursor 把 AGENTS.md 列为 "Simple alternative to
  .cursor/rules" [documented]。
- **按需加载**：规范本身无（纯 Markdown、整文件常驻）；仅嵌套按目录就近 [affordance]。
- 来源：https://agents.md/（本人复核全文）；code.claude.com/docs/en/memory；cursor.com/docs/rules。

**对委托方**：AGENTS.md 已成为**跨工具交换格式**（LF 治理、20+ 工具兼容）——委托方 repo 已有
AGENTS.md（本仓 AGENTS.md 即是），这一层的定位无需自建。

### 2.2 CLAUDE.md / Claude Code memory（docs 锚定 v2.1.198–v2.1.280）

- **分工**（官方对照表）：[documented] CLAUDE.md = 你写的 "Instructions and rules"；**Auto
  memory** = Claude 写的 "Learnings and patterns"；两者每会话加载。Auto memory 位于
  `~/.claude/projects/<project>/memory/`：MEMORY.md 索引（**首 200 行/25KB 进上下文**）+ 主题文件
  按需读；frontmatter `type: user/feedback/project/reference` + `modified` 时间戳（v2.1.214+，
  "The timestamp shows how current the fact is"）。
- **防污染规则**：[documented] "Claude skips anything it can derive from the codebase... skips
  anything your CLAUDE.md files already say"——写入克制 + 与指令分仓。
- **@import**：`@path/to/import`，递归 ≤4 hop；import 的文件仍在启动时全量进上下文 [documented]。
- **/init**：生成/改进 CLAUDE.md；吸收其他工具 instruction files（.cursor/rules、.cursorrules、
  copilot、AGENTS.md、.windsurf/rules、.clinerules）[documented]——**"大文档→agent 可用蒸馏"的
  官方实例**（蒸馏产物 = 人可读 Markdown）。
- **过期/审查**：[documented] "Review your CLAUDE.md files... periodically to remove outdated or
  conflicting instructions"；每文件建议 **<200 行**（长了降 adherence）；`/doctor`（v2.1.206+）
  裁掉可从代码推导的内容，并把常驻指引 "migrates... into skills and nested CLAUDE.md files that
  load on demand"——**官方提供"常驻→按需"的迁移门径**。
- **与 skills 分工**：[documented] "when a section of CLAUDE.md has grown into a procedure rather
  than a fact"→挪去 skill；"a skill's body loads only when it's used, so long reference material
  costs almost nothing until you need it"。
- 来源：code.claude.com/docs/en/memory.md、/skills.md、/commands.md。

### 2.3 Cursor rules（cursor.com/docs/rules，docs.cursor.com 已全域并入 cursor.com）

- **演化**：`.cursorrules` → `.cursor/rules/*.mdc`。官方 help 原文："The `.cursorrules` file in
  your project root is legacy and will be deprecated" [documented]。
- **四种触发模式**（现行命名）：Always Apply / **Apply Intelligently**（旧名 Agent Requested）/
  Apply to Specific Files（glob）/ Apply Manually。关键机制 [documented]：
  `alwaysApply:false + description + 无 globs` ⇒ "**Agent reads the description and pulls the rule
  in when relevant**"——**只有 description 常驻，模型自选拉取正文**。这是"知识按需加载"在 rules
  生态里的标准形态，与 skills 的 progressive disclosure 同构。
- 最佳实践 [documented]："Reference files instead of copying their contents—this keeps rules short
  and prevents them from becoming stale"；<500 行。
- Cursor 无 agent 自动记忆机制 [documented absence]。
- 来源：cursor.com/docs/rules.md、cursor.com/help/customization/rules.md。

### 2.4 Windsurf（docs.windsurf.com 已重定向至 docs.devin.ai，Cognition）

[documented] 分工原文："`Memories` is the system for sharing and persisting context across
conversations. There are two mechanisms...: Memories, which can be automatically generated by
Cascade, and rules, which are manually defined by the user"。Memories 自动生成、workspace 绑定、
"Cascade will retrieve them when it believes that they are relevant"。演化：`.windsurfrules` →
`.windsurf/rules/`（现行页已不提旧名 [observed]）。Rules 支持 glob 或 natural language
description 双触发。来源：docs.devin.ai/windsurf/plugins/cascade/memories.md。

### 2.5 Gemini CLI（geminicli.com；官方横幅：2026-06-18 起被 Antigravity CLI 取代）

[documented] GEMINI.md 三层：Global → workspace 及父目录 → **JIT context files**："When a tool
accesses a file or directory, the CLI automatically scans for GEMINI.md files in that directory and
its ancestors... **only when they are needed**"——**按需加载到目录粒度**（AGENTS.md 嵌套的即时版）。
Auto Memory（experimental）：挖历史会话 → ".patch 与 SKILL.md 草稿进 inbox 人工审批"，"cannot
directly edit... project GEMINI.md files"——**程序性知识直接沉淀为 skills、人审后入库**，与委托方
research/→skills/ 的晋升同构。文件名可配 `context.fileName: ["AGENTS.md","CONTEXT.md","GEMINI.md"]`。
来源：geminicli.com/docs/cli/gemini-md/；google-gemini/gemini-cli 仓库 docs（auto-memory.md 等）。

### 2.6 Anthropic 对 docs/knowledge 的处理

- **无 /docs 命令**：Claude Code 命令全表逐行核验（/a–/z）没有 /docs [observed]。官方"文档检索"
  形态 = **参考文档打包成按需 skill**：内置 `/claude-api` skill——"Load Claude API and Managed
  Agents reference material for your project's language. Also activates automatically when your
  code imports anthropic" [documented]。
- **progressive disclosure 三层**（工程博客 2025-10-16）：[documented] metadata 是 "**the first
  level** of progressive disclosure... just enough information for Claude to know when each skill
  should be used"；SKILL.md 正文是 "**the second level**"；bundled files 是 "**the third level**
  (and beyond)... effectively unbounded"。级别表（platform 文档）：Level 1 ~100 tokens/skill
  常驻；Level 2 触发时 <5k；Level 3+ "None until accessed"。2025-12-18 起为开放标准
  agentskills.io。
- **<500 行 + references/**（规范 best practices 原文）：[documented] "The specification recommends
  keeping SKILL.md under 500 lines and 5,000 tokens — just the core instructions... move detailed
  reference material to separate files in `references/` or similar directories. **The key is
  telling the agent when to load each file.** 'Read `references/api-errors.md` if the API returns
  a non-200 status code' is more useful than a generic 'see references/ for details.'"
- **context engineering 博客**（2025-09-29）：[documented] "find the smallest possible set of
  high-signal tokens"；CLAUDE.md 定位："CLAUDE.md files are naively dropped into context up front,
  while primitives like glob and grep allow it to navigate its environment and retrieve files
  just-in-time, **effectively bypassing the issues of stale indexing** and complex syntax trees"。
- 来源：anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills；
  anthropic.com/engineering/effective-context-engineering-for-ai-agents；agentskills.io/skill-creation/best-practices.md；
  platform.claude.com/docs/en/agents-and-tools/agent-skills/overview.md。

### 2.7 惯例形态的收敛

[observed，基于 2.1–2.6 交叉] 三层收敛：**常驻指令层**（AGENTS.md/CLAUDE.md/GEMINI.md——AGENTS.md
成跨工具交换格式）、**自动记忆层**（auto memory / Cascade Memories——agent 写、相关性召回）、
**按需知识层**（description 自选加载、skills 三层披露、references/ 按需读、JIT context files）。
分工轴一致：**"谁写"（人/agent）×"何时进上下文"（常驻/触发/按需）**。委托方 memory/ + skills/
双房间与此同构；缺的正是第三件——**按需知识层**。

---

## 三、文档消化管线（doc digestion）

### 3.1 RAG 的务实评估（Anthropic 官方）

- **何时不用 RAG**：[documented] 知识库 <200k token（约 500 页）时官方建议全量进 prompt：
  "If your knowledge base is smaller than 200,000 tokens ... you can just include the entire
  knowledge base in the prompt ... with no need for RAG"（配 prompt caching）。
- **chunk 破坏语义**：[documented] "traditional RAG solutions remove context when encoding
  information"；Contextual Embeddings + Contextual BM25 把 top-20 检索失败率降 49%（加 reranker
  67%），一次性上下文化成本 $1.02/M document tokens（工程博客 2024-09-19）。
- **索引陈旧**（命中委托方关切）：[documented] Claude Code 用 glob/grep 按需取文件，
  "effectively bypassing the issues of **stale indexing**"——官方把"预计算索引会陈旧"列为要绕开的
  既知问题。
- **取舍总纲**：[documented] 官方趋势 = 预计算 embedding 检索 + "just in time" 策略叠加；agent 持
  轻量标识符（文件路径/链接），运行时用工具拉取；混合模式（CLAUDE.md 前置 + glob/grep 按需）；
  结论 "do the simplest thing that works"。
- **走向量与否**：经典 RAG 检索面必须 embedding；Anthropic 的 JIT/工具检索路线不需要。
- 来源：anthropic.com/engineering/contextual-retrieval；anthropic.com/engineering/effective-context-engineering-for-ai-agents。

### 3.2 GraphRAG（微软，v3.1.2，2026-08-21）

[documented] 机制：LLM 抽实体/关系/claim → Leiden 聚类 → 社区摘要 → Global/Local/DRIFT/Basic
四查询。**成本现实**："GraphRAG indexing can be an expensive operation ... start small"；
"**graph extraction to constitute roughly 75% of indexing cost**"。**维护状态**："This project is
largely in **maintenance mode**, and won't be accepting new PRs"；"not an officially supported
Microsoft offering"。**非免向量**：索引管线含 embedding→向量库。对"非结构化→结构化"的增益声明
（"Baseline RAG struggles to connect the dots"）成立，但按判据①⑤（人可读、维护）全面不利。
来源：microsoft.github.io/graphrag/（overview/methods/cli）；raw.githubusercontent.com/microsoft/graphrag/main/README.md。

### 3.3 不走向量的替代（委托方重点）

共同形态 [observed]：**"小索引文件 + 按需 fetch 的详情文件"**，Anthropic 明说该形态
"bypassing the issues of stale indexing"。四个官方级实例 + 两个工具面：

1. **llms.txt**（llmstxt.org，v2，2024-09-03 发布、2026-08-10 修改，开放社区提案）：
   [documented] "We propose adding an /llms.txt markdown file to websites to provide LLM-friendly
   content"；格式：H1 站名 → 摘要 → H2 节的 file list（`[name](url): 备注`）；核心："**The file
   itself stays small enough to fit in context. The detail lives behind the links, and is fetched
   only when needed.**" [affordance] 无 embedding，纯文件+链接+agent 跟链；改文件即生效。
2. **Skills references/**（见 §2.6）：<500 行索引 + references/ 按需读，"No context penalty for
   large files: Reference files... don't consume context tokens until actually read" [documented]。
3. **CLAUDE.md/MEMORY.md 蒸馏**（见 §2.2）：/init 蒸馏 + MEMORY.md 前 200 行 + 主题文件按需读。
4. **OKF index.md**（见 §4.4）：目录清单支持 progressive disclosure；"Producers MAY generate
   `index.md` automatically; **consumers MAY synthesize one on the fly when none is present**"
   [documented]——索引是派生物，不是真源。
5. **Cursor 索引（"走向量"对照）**：[documented] 官方工程博客（2026-01-27）："**Creating
   embeddings is the expensive step**, which is why Cursor does it asynchronously in the
   background"；保持新鲜需要 Merkle 树哈希差分 + chunk 内容缓存 + 跨用户索引复用整套机器——
   走向量的维护成本官方剖面。
6. **Basic Memory**（见 §1.5）：wikilink 图遍历 + 全文检索 + 可重建 SQLite 索引，语义检索默认关。
7. 工具面：**Repomix**（npm v1.18.1，MIT）——仓库打包成单文件投喂，无 embedding 无检索，一次性
   产物；**Context7**（context7.com，Upstash 托管服务）——"up-to-date, version-specific
   documentation" 注入，把 freshness 外包给服务方 [affordance]（内部检索实现官方页面未描述）。

---

## 四、DSH 生态普查：wiki/知识类插件（委托方点名问题）

### 4.1 官方侧：没有任何 wiki 插件 [affordance]

当前 pin 的 `vendor/dsh`（dsh-v0.1.5-rc.2）packages 全树（50 个包）无 wiki 相关包名；
docs/capability-seams.md 与 docs/architecture.md 无 wiki 提及（rg 全树唯一命中是 i18n 翻译规范
里引用 Vue.js GitHub wiki 的链接）；bundle 只有 base/headless/web-app/acp-app/sdk-app/sdk-minimal。
（委托方已查实，本次独立复核一致。）

### 4.2 第三方侧：存在，而且不小

**商店目录**（`dsh-plugin-shop-catalog` v2026.923.1，11,885 个插件）按
`wiki|knowledge|obsidian|vault|note|zettel|moc|llm-wiki` 正则筛出 **195 个**命中。npm 直查另有
`llm-wiki` 生态（llm-wiki 0.1.3、@equationalapplications/core-llm-wiki 7.7.4 "OKF v0.2
conformance"、@zosmaai/pi-llm-wiki 0.12.2 "Karpathy-pattern"、superbee 0.2.1、@okf-kb/* 0.1.4、
@kriswill/okflight 0.4.0、graphocode 8.2.0、@thisismydesign/okf-lint 0.1.0 等——OKF 工具面
已成小生态）。按路线分六类（各选代表，版本/日期为 npm registry 2026-09-24 查证）：

| 路线 | 代表（版本基线） | 一句话 |
|---|---|---|
| A. OKF/llm-wiki 系 | @sidleo3/dsh-wiki 0.6.3（MIT，2026-09-07 首发，24 版，~2102 dl/月）；dsh-okf-knowledge 0.1.2；@pananfly/dsh-llm-wiki 0.1.0 | OKF v0.2 Markdown bundle + 工具面（14–17 工具：search/get/create/update/validate/lint/ingest/deprecate） |
| B. claude-obsidian/Karpathy 系 | dsh-plugin-wiki-tools 0.14.2（Lion-1209，1192 dl/月）+ dsh-plugin-wiki-skills 0.2.2；@qiqiangvae/dsh-obsidian 0.1.2；dsh-simple-wiki-memory 0.1.3；@vesna-strivozha-2026/dsh-llm-wiki 1.0.6 | "LLM Wiki pattern (Andrej Karpathy)" 的 DSH 移植：skills（提示层）+ tools（机械层）分离，hot.md+index.md 读序 |
| C. Obsidian 桥系 | dsh-obsidian 0.2.5（mingzeng21）；@deepseek-ai/dsh-client-ui-obsidian 0.4.0（**gxpppp 冒名，见 4.3**）；dsh-plugin-vault-memory 0.3.1；obsidian-dsh-acp 0.2.3（反向） | 接**已存在的** Obsidian vault：fs 直读写 + wikilink/反链解析工具 |
| D. 治理型全家桶 | @dsh-enhanced/personal-wiki / personal-memory / memory-wiki-bridge 0.1.42（22-ai-00，家族 ~3334 dl/月） | proposal-only、审批制、policy 门控的 wiki+memory+晋升桥 |
| E. 存储/检索型 | dsh-tiddlywiki 0.26.5（11192 dl/月）；dsh-knowledge-sqlite 0.1.9；dsh-living-memory 0.2.9；dsh-memory-eternal 0.7.0/0.9.3（14830 dl/月） | TW 子进程 / SQLite FTS5 / 夜巡+衰减 / 知识卡沉淀 |
| F. 学习闭环型 | dsh-learn-wiki 0.3.1（2026-09-17）；dsh-geometry-knowledge 0.4.0 | CRAG 纠错回路（staged+两段 commit）；Markdown 真源+派生索引重建+一致性审计 |

注意三个**点名候选的澄清**：`@aiwayds/dsh-vault` 0.5.0 是**配置加密备份**插件（私有 GitHub repo
迁移），不是知识库；`@beihaizb/dsh-notebook` 0.2.4 是 Jupyter 工作空间；`dshwiki-plugin` 0.1.0
是 dshwiki.com 插件市场情报面板（撞名，无关）。`@detpecca/dsh-llm-wiki`、`@253071608/dsh-localnote`、
`@chenchen4396/dsh-notepad`、`dsh-obsidian-export`、`dsh-wikilink`、`llm-wiki-sidebar`、
`@mnemon-dev/dsh-mnemon`、`@frog755/dsh-hybrid-memory`、`dsh-codevault` 均为 **GitHub-only**
（目录版本=commit SHA，npm 404）——判据⑤上比 npm 发布者更弱一层。

### 4.3 重点深评（逐判据）

#### ① @dsh-enhanced 家族（22-ai-00/dsh-enhanced，MIT，v0.1.42，2026-08-27 首发、2026-09-23 仍在发版）

与委托方设计**最同构**的一族，三个插件把"知识 vs 记忆"做成了显式产品规则：

- **personal-wiki**："面向个人助理的 Markdown 知识库。**页面是人可读、可备份的唯一真源**；进程内
  目录、段落检索索引、反链与 lint 报告**都可从页面重建**。它保存研究、项目、人物、概念、来源与
  决策等长资料；**每轮都可能有用的短事实和偏好应交给 personal-memory**"——分工原文即委托方
  memory/ vs knowledge/ 的边界。vault 页面在 `$DSH_HOME/personal-wiki/vault/wiki/`（纯 Markdown），
  提案状态机在 state.sqlite。
- **personal-memory**："保存简短且稳定的事实、偏好、约定和经验...**研究资料、文档和项目知识
  不属于这里，应交给 personal-wiki**"——双向防污染规则。
- **memory-wiki-bridge**："**只提供两条显式、可审阅的知识晋升**：`knowledge_promote`（Memory
  ids+versions → derived Wiki proposal）与 `knowledge_pin`（Wiki id+revision + bounded summary →
  Memory proposal）。本包**没有数据库、文件、timer、网络或 LLM 调用**...目标端仍执行自己的
  Agent identity、Policy、proposal、diff、审批与 CAS，Bridge 无法 commit"。幂等键由方向+源
  ids+versions+规范化内容计算，"调用者不能用一个遗漏 provenance 的自选 key 覆盖它"；Memory→Wiki
  生成 `memory://<id>?version=<n>` source + content SHA-256；**不自动同步、不双写、不级联删除、
  不自动批准、不保存第三份正文**。与委托方 research/ 三档出口直接同构（promote 带 provenance）。
- **wiki_lint**（personal-wiki 工具）："只读报告坏 frontmatter、重复 id/标题/别名、大小写路径
  碰撞、**死链**、**孤页**、来源哈希、派生 provenance 和进程索引漂移；不会修复或重建"——
  **委托方 curate 的同款哲学**（纯函数报告，不擅改），且死链/孤页就在 finding 清单里。
- **判据**：①存储=Markdown 真源+SQLite 状态（部分违反）；②wiki_lint 强；③DSH 组合原生
  （ctx service + 工具）；④systemPrompt 关键词召回有界；⑤MIT、27 版高频迭代、~3334 dl/月，
  但**体量是全家桶**（依赖 assistant-policy/assistant-delivery/飞书审批闭环），且 README 自述
  "以 DSH 0.1.2-rc.1 验证"——**落后委托方 pin 两个 minor 线**（0.1.2-rc.1 vs 0.1.5-rc.2）。

#### ② dsh-okf-knowledge（jianghuife，MIT，v0.1.2，2026-08-18，~150 dl/月）

"知识是带 YAML frontmatter 的纯 Markdown——**不是不可见的向量库**——用户可以直接查看、审核和
修改每一条知识原文"。按项目组织：`<项目根>/.dsh/knowledge/` + **共享知识**
`<dsh home>/knowledge/shared`（跨项目的工程规范/手册）——**恰好是委托方"项目知识在 repo、跨项目
知识在家"分层的现成实现**。工具 `okf_search` / `okf_read` / `okf_validate`（校验提示如缺来源）；
Web 面板（保存前 OKF 校验、内容哈希乐观锁）；内置 `okf-authoring` Skill（怎么拆条目、填
frontmatter、**保留来源**、建链接、维护 index.md 与 log.md）。判据：①纯文件强；②validate 强；
③原生组合；④默认只作用于当前项目+共享（范围有界）；⑤MIT 但 2026-08-18 后未再发版、下载量小。
README 明示与 RAG 路线的 dsh-knowledge（分块/向量/SQLite）互不冲突、可共存。

#### ③ @sidleo3/dsh-wiki（MIT，v0.6.3，~2102 dl/月，npm 无 repo 链接）

"llm-wiki 知识库插件：**OKF v0.2-conformant markdown bundle + progressive disclosure**"。14 工具
（wiki_list/search/**get 附 backlinks**/create/update/validate/lint/ingest/**deprecate**/rules/help/dirs/use/sync）。
注入分两层：恒定层（工具用法 + "第一步先 wiki_list"，模块级常量、**逐字节相同以保前缀缓存**）+
会话层（bundle 名+目录清单+各目录 APPEND_SYSTEM_PROMPT.md 规则，走 runtime context 快照，
"放进 system prompt 的代价是一字节变化就得重发整份 prompt"）。Git 远端/飞书云盘双同步后端；
写入前读目标目录 AGENTS.md 规则做门控。判据：①OKF 纯文件强；②validate/lint/deprecate 齐全；
③DSH 组合原生且注意前缀缓存（判据④的技术细节）；⑤**npm 包无 repository 字段**（源码不可指认，
[observed] 只能以 README 为证）、两周 24 版迭代极快（个人维护单点）。

#### ④ dsh-plugin-wiki-tools + wiki-skills（Lion-1209，MIT，1192+510 dl/月）

血统最清楚的一对：skills 包 README 自述 "The five skills are adapted from
**claude-obsidian**（AgriciDaniel，MIT）... The vault design itself follows the **LLM Wiki
pattern** described by Andrej Karpathy"。tools 包实现"机械核心"："path routing, frontmatter
completion, index/log bookkeeping, source delta tracking, and health checks — so the model
spends its turns on synthesis instead of filesystem chores"；`wiki_query` 快速模式 "returns
`hot.md` + `index.md` verbatim (**the skill's read order**)"，标准模式全文检索 + "inbound/outbound
link graph"。**skills（提示层）与 tools（机械层）分离**——与 DSH 官方 skill provider +
defineTool 两个接缝的天然映射。@qiqiangvae/dsh-obsidian 0.1.2 是两者合并 fork（理由：DSH cordis
API 常破坏、两插件对个人用户不友好），血统与 ATTRIBUTION 清晰。

#### ⑤ dsh-obsidian（mingzeng21，MIT，v0.2.5）与 @deepseek-ai/dsh-client-ui-obsidian 0.4.0（gxpppp，冒名）

- dsh-obsidian："把 DSH 连接到本地 Obsidian vault。因为 **一个 Obsidian vault 本质上就是磁盘上的
  一堆 Markdown 文件**...**不需要 MCP server，也不需要 OAuth**"。12 个 obsidian_* 工具覆盖
  "搜索、读取、写入、追加、移动、删除和**反链查询**"；FsAccess = "node:fs + **自研
  frontmatter/wikilink 解析**"；删除只进 `.trash/`、路径不可越出 vault 根、不碰 `.obsidian/`。
  [observed] **反链=纯文件系统扫描计算**，无索引服务——委托方"反链不建索引"的直接先例。
- @deepseek-ai/dsh-client-ui-obsidian：**不是官方包**。商店目录条目 source=github、tier=community、
  repo=gxpppp/dsh-obsidian、tarball 从该 repo 的 release 下载（本人下载解剖：25 个 obsidian_*
  工具 + 需装 Obsidian 侧 IPC companion 才有编辑器/命令类工具；SHA-256 修订、乐观锁、realpath
  围栏，工程质量不低）。**但它钉在 DSH dsh-v0.1.2-alpha.2**（README 明示 "targets DSH 0.1.2-alpha.2
  exactly"）——落后委托方 pin；且冠名 @deepseek-ai scope（npm 上 404，仅 tarball 分发）属于
  判据⑤的红旗：**名字与来源不可信**，装前必须以 repo 为准。

#### ⑥ 治理设计最值得抄的三个小件

- **dsh-learn-wiki**（Dayi-Z，MIT，v0.3.1）："L1 Markdown wiki（强命中直接注入）+ L2 Hindsight
  （情景记忆）+ L3 网络（限流补料）"；三条铁律："**staged/ 永不参与召回**（自动产出必须经
  commit 才升入 L1，投毒面被限制在暂存区）"；"**无 sources 不 commit**（每条知识必须可溯源到
  URL/文件，`commitReadiness()` 强制这条）"；触发器是"**挣扎**，不是检索未命中（那个信号太
  廉价——任何新话题都会未命中）"。**这是全部普查里最好的知识入库治理设计。**
- **dsh-obsidian-inbox**（Leo3-7，MIT，v0.2.2）：SKILL.md 七步入库流程 + `obsidian_validate_vault`
  模型工具："检索优先于归档（写库前先按文件名/aliases/链接/frontmatter/MOC 检索，已存在就合并）；
  合并优先于新建；**两级确定性校验**（公式 + 结构与 Wiki 链接：`[[Link]]` 目标、**同名歧义**），
  **校验不通过不宣布'已入库'**"。
- **dsh-plugin-vault-memory**（zhaoxuejie，MIT，v0.3.1）：每日 03:00 巡检"孤儿（没人引用的笔记）、
  **断链**（指向不存在的链接）、缺总览（目录攒够了没目录页）"——**只建议不擅改**，逐条批准才写盘、
  写前自动备份、忽略后 30 天不再打扰。断链/孤页作为巡检 finding 的完整先例。

#### ⑦ 其他（一句话存档）

- dsh-tiddlywiki 0.26.5（11192 dl/月，88 版）：TiddlyWiki 5 子进程内嵌 + 15 工具 + git 同步，
  "**首先不是一个 AI 记忆工具**...文档和人、文档和 Agent 之间的协作"——人机共笔方向最热的包，
  但 TW 子进程违反判据①的轻量面。
- dsh-knowledge-sqlite 0.1.9：`ctx.knowledge` 服务接缝提案（V1.11，11 轮社区评审）+ SQLite FTS5
  **trigram**（CJK 子串）+ L1 查询扩展；实测表（unicode61 0%→trigram 7%→L1 21–64%→人工集
  65%）。**无向量的 CJK 检索质量是可以测的**——委托方未来评估检索面的参照方法。
- dsh-living-memory 0.2.9：夜巡（dedupe/merge/**矛盾时双方都标记待审而不静默覆盖**/衰减）+ 七信号
  RRF 混合召回 + 可选 embedding 默认关。SQLite 存储（违反判据①），但"矛盾不覆盖、标记待审"
  是防污染的好语义。
- dsh-unified-agent-memory 0.5.2：Obsidian vault 规范 + SQLite FTS5 索引，多 agent（dsh/Codex/
  Claude/Hermes）共享，生命周期"摄取→**晋升**→冲突裁决→衰减遗忘"。
- dsh-memory-eternal 0.7.0（npm，14830 dl/月；另有同产品目录包 memory-eternal 0.9.3，普查内下载最高）：
  对话结束自动沉淀知识卡到本地 Markdown vault（"自研去重、自研 CJK 检索、**可 git 管理**"）+ 审核中心 UI。
- dsh-wiki（skillre，v0.1.2）："DSH + Obsidian 个人知识库体系（源自 Karpathy LLM Knowledge
  Bases）：LLM 负责编译与维护，人类负责选材、审核与提问；单一事实源 = Markdown vault（git 版本化），
  **不引入数据库**"——**无 license 字段**（判据⑤红旗）；workflow"丢→审→过（promote 到 notes/
  挂 MOC + git commit）→查→养（巡检）"。
- @deepwatch/dsh-wiki 0.1.4（oxbshw/watch-skill monorepo）："**Deterministic workspace wiki
  projections over the memory ledger**...a wiki page is **a view and never a second copy of the
  truth**"——wiki 作为记忆账本的确定性投影（派生视图），哲学上与"真源唯一"一致。

### 4.4 OKF v0.2 规范本体（Google Cloud，GoogleCloudPlatform/open-knowledge-format）

DSH 插件生态大量引用的格式规范，本身是"知识层作为**惯例/格式**"的最强候选。[documented] 本人
fetch 全文（v0.2，两处镜像同字节：GoogleCloudPlatform/open-knowledge-format 与
GoogleCloudPlatform/knowledge-catalog/okf/SPEC.md）：

- **定位**："an open, human- and agent-friendly format for representing *knowledge*"；
  "**a directory of markdown files with YAML frontmatter. There is no schema registry, no central
  authority, and no required tooling. If you can `cat` a file, you can read OKF; if you can `git
  clone` a repo, you can ship it.**"
- **动机**（正对委托方治理问题）："When most concepts are machine-generated, a consumer needs
  answers that a plain markdown-plus-frontmatter convention does not make first-class: 1. What was
  this created from, and how was it verified? (**provenance**) 2. How much should I trust it?
  (**trust**) 3. Is it still true? (**freshness**) 4. Is it the current version? (**lifecycle**)"
- **bundle 结构**：目录树 + 两个保留文件名——`index.md`（目录清单，progressive disclosure，
  "Producers MAY generate automatically; consumers MAY synthesize on the fly"）与 `log.md`
  （按日期分组的变更史，newest first）。
- **frontmatter**：`type`（唯一必填）+ title/description/resource/tags；**治理字段子集**：
  `sources[]`（resource/id/title/author/usage_count/last_modified——**可信度从信号推断而不存分数**，
  "a score is subjective, unportable... and goes stale"；逐主张归因用 footnote label =
  `sources[].id` 作 join key，"a positional index misattributes silently the moment the list is
  reordered"）；`generated: {by, at}`（**谁写的**）与 `verified: [{by, at}]`（**谁确认的**，
  "who *wrote* a concept need not be who *confirmed* it"）分离；信任档：无 verified=unverified /
  仅非 human=machine-confirmed / 有 `human:<id>`=human-reviewed；`status: draft|stable|deprecated`
  （缺省 stable）；`stale_after`（**绝对时刻而非相对 TTL**——"keeps the staleness decision a
  plain comparison"）。actor 约定：`<producer>/<version>` / `human:<id>` / `process:<id>`。
- **互链语义**：标准 markdown 链接（bundle 绝对路径推荐）；**"Consumers MUST tolerate broken
  links: a link whose target does not exist in the bundle is not malformed; it may simply
  represent not-yet-written knowledge."**——断链≠错误=未写成的知识（对"断链算不算 finding"的直接
  规范回答）；`references/` 子目录惯例放外部材料/代码。
- **克制**：v0.2 只标准化"让 corpus 自描述的最小结构约定"，其余留给生产者；消费者必须容忍未知
  字段与未知 type。

---

## 五、wiki 式知识结构（用户新增方向）

> 总判（六线交叉）：在整个活跃生态里，**[[wikilink]] 的解析与反链计算都不需要索引服务/数据库**
> ——纯文件 + 启动期/构建期/调用期扫描即成。纯文件双链里活的是 Obsidian / Foam / Logseq / Quartz，
> 死的是 Dendron 与 Neuron。Karpathy "LLM Knowledge Bases" 一手出处已取得（X 帖 2026-04-02）。

### 5.1 纯文件双链生态（生死簿）

- **Obsidian**（专有软件，Dynalist Inc.，"licensed and not sold" [documented terms，
  obsidian.md/terms]）：vault = 本地文件系统一个文件夹，笔记为 **Markdown 纯文本** + 根下
  `.obsidian` 配置目录 [documented，obsidianmd/obsidian-help]。**反链由应用运行时的 metadata
  cache 计算**（存 IndexedDB、可在设置中重建），**不写进笔记文件** [documented]——"应用算的，
  不是文件里存的"。语法：`[[Note]]`、`[[Note#Heading]]`、`[[Note|别名]]`、嵌入 `![[Note]]`、
  `![[doc.pdf#page=3]]`；`#^block` 为 Obsidian 专有。**商业**：2025-02-20 起对所有用途（含商用）
  免费，付费仅 Sync $4/月、Publish $8/月与可选赞助 [documented，obsidian.md/license、/pricing]。
  **git**：官方文档明列 Git 为同步方式并建议 gitignore `.obsidian/workspace.json` [documented]
  ——git 插件非必需（社区 obsidian-git MIT v2.40.0 只做自动化）。**agent 面（官方）**：Obsidian
  Headless（open beta CLI，明列用例 "give agentic tools access to a vault"）与 Obsidian CLI（含
  `unresolved` 断链命令）[documented]。
- **Foam**（MIT，活跃：扩展 v0.44.6，仓库 2026-09-23 仍在提交 [observed]）：基于 VS Code + GitHub
  的 PKM；存储 = 纯 .md 文件夹 + `.vscode/` + `.foam/templates|queries/` [documented]。**与
  Obsidian 逐行兼容**（identifier/path/歧义判定全一致，"An Obsidian vault is usually already a
  Foam workspace"）[documented]。backlink 面板 = "loads the workspace once at startup and watches
  the filesystem"（启动全量扫描建内存图 + watcher 增量）[documented，官方 mcp 文档]。**新增
  foam-cli v0.46.2**（无需 VS Code：`grep`——官方明说"搜索每篇笔记全文而非索引元数据"、
  `links --incoming`（反链）、`lint`（发现问题 exit 2，可入 CI）、`search`）与 **@foam/mcp v0.1.0**
  （把工作区知识图谱暴露给 AI agent，默认只读、`--allow-writes` 显式开写；工具含 get_connections
  正/反链、get_placeholders、traverse_graph）[documented]。
- **Logseq**（AGPL-3.0，极活跃 2026-09-23 [observed]）：隐私优先 KM 平台，文件格式 Markdown/
  Org-mode [documented]；**注意"DB 版" beta 改用 SQLite 图**（非纯文件），Electron 已内置 MCP
  端点 [documented/observed]。
- **Quartz v5**（jackyzha0/quartz，MIT，v5.0.0，2026-09-20 提交 [observed]）："helps you publish
  your digital garden and notes as a website"；wikilink 由 CrawlLinks 插件**构建期解析**（大小写
  不敏感以对齐 Obsidian，兼容全部链接变体）[documented]——**静态站本身即证明 [[link]] 解析不需要
  服务**；构建还输出 slug 冲突 Warning（同名歧义检测）[observed 源码]。
- **Dendron**（Apache-2.0）：README 顶部 "currently in maintenance only, active development has
  ceased"，最后提交 2025-06-01 [documented/observed]——**实质尸体**。
- **Neuron**（AGPL-3.0）：官方明示 "superseded by Emanote"，2022-10 起休眠 [documented/observed]
  ——尸体。

**生死簿的启示**：纯文件双链这个形态活了（四活二死），死掉的是**工具**不是**格式**——vault 是
普通文件夹，工具死了数据还在。这正对判据①（错了赔得起）。

### 5.2 服务器型 wiki 对照（"文件可 git"判据）

- **wiki.js**（AGPL-3.0，活跃）：自述 "built on NodeJS, Git and Markdown" [documented]，但
  **必需数据库引擎**（仓库依赖 knex+pg/mysql2/mssql/sqlite3 [observed package.json]）——内容
  不落纯文件，违反判据①。
- **DokuWiki**（GPL-2.0，活跃 2026-09-16 [observed]）：官方自述 "doesn't require a database"
  [documented，composer.json]；页面 = `data/pages/*.txt`、历史 = `data/attic` [observed 仓库]——
  **三者中唯一内容为纯文本文件、可直接 git** 的服务器型 wiki。
- **MediaWiki**（当前稳定 1.46.0）：安装必须先建数据库（推荐 MariaDB/MySQL，PostgreSQL/SQLite
  仅 "limited compatibility"）[documented，mediawiki.org]。

**对照结论**：服务器型 wiki 整体与"家的房间"形态不匹配（服务、部署、人可手改面都差）；即使最
接近文件的 DokuWiki 也是 PHP 服务 + .txt 非 Markdown。**不取服务器型。**

### 5.3 [[wikilink]] 解析与 backlinks 的无索引计算

**算法层一手证据**（互链与反链都不需要索引服务/数据库）：

- **Foam**：启动全量扫描 + watcher [documented]；官方 CLI 直接提供 `foam grep`（"搜索每篇笔记
  全文而非索引元数据"）与 `foam links --incoming`（反链）[documented]——**"grep 一遍"有官方工具
  背书**。
- **Quartz**：反链组件 = 对构建期爬取的 allFiles 按 links 过滤 [observed 源码]；构建期报 slug
  冲突（同名歧义）[observed]。
- **Obsidian**：metadata cache 是应用内**可重建缓存**，非外部服务 [documented]；断链点击建页 +
  官方 CLI `unresolved` 命令 [documented]。
- **OKF §8** [documented]："consumers MAY synthesize one on the fly when none is present"（索引
  是派生物，可现场合成）。
- **DSH 生态**：dsh-obsidian 反链 = node:fs + 自研 frontmatter/wikilink 解析（§4.3⑤）；
  dsh-plugin-wiki-tools `wiki_query` 返回 "the inbound/outbound link graph"（工具现算）；
  @pananfly 变动时自动触发元数据重建；@dsh-enhanced "反链与 lint 报告都可从页面重建"；
  dsh-wikilink（GitHub-only）在 web GUI 做 [[wikilink]] fuzzy-search + 附内容进 prompt [observed，
  目录描述]。

**解析库工具面**（JS/TS）：

- **remark-wiki-link**（MIT，Mark Hudnall/landakram）：micromark/unified 系解析器；v2.0.1，
  2023-10-10 后无新提交——**维护停滞但仍是事实标准**，周下载 ~18.7k [observed registry]。
- **markdown-it-wikilinks**（MIT）：markdown-it 系，v1.4.0（~2023-08），周下载 ~78 [observed]。
- 专做 Obsidian Flavored Markdown 的 @morizrs/micromark-extension-ofm-wikilink（2024-11）等新
  一代扩展正在出现 [observed registry]。
- **断链检查现成工具**：Foam 占位符面板 + 歧义 wikilink 诊断 + `foam lint`（exit 2 可入 CI）+ MCP
  `get_placeholders`（列出未解析 wikilink 及其引用者）[documented]；Quartz `disableBrokenWikilinks`
  给解析失败链接加 broken 类 + NotFoundPage 插件 [documented]。

### 5.4 agent 产品把 wiki 当知识层（生态证据）

- **Karpathy "LLM Knowledge Bases"——原始一手出处已取得**：[documented] X 帖 2026-04-02
  （x.com/karpathy/status/2039805659525644595，21.9M 浏览）。要点：原始资料入 `raw/` → LLM
  增量"编译"出一个 .md wiki（含 backlinks、概念分类、文章与互链）；Obsidian 只作查看前端；
  "**LLM 写并维护全部 wiki，我几乎不直接碰**"；规模 ~100 篇 / ~40 万词时"以为要上 fancy RAG，
  结果 **LLM 自动维护索引文件和摘要就够用**"；产出回填 wiki；**跑 LLM health check 做一致性与
  补全（linting）**；自写小搜索引擎 CLI 交给 LLM 当工具。community.tmpdir.org 帖（2026-04-09）
  为社区转述+实践讨论 [observed]。多个 DSH 插件 README 自述血统 "follows the **LLM Wiki
  pattern** described by Andrej Karpathy"（dsh-plugin-wiki-skills、@qiqiangvae/dsh-obsidian）。
- **claude-obsidian**（AgriciDaniel，MIT）：该模式在 Claude 生态的载体（五个技能 wiki /
  wiki-ingest / wiki-query / wiki-lint / save），DSH 侧被移植为 dsh-plugin-wiki-skills/tools
  （§4.3④）。
- **@vesna-strivozha-2026/dsh-llm-wiki** [documented，README]："普通的检索问答（RAG）是每次提问
  时临时去翻原始文档、临时拼答案，用完就丢，**什么也不沉淀**。LLM Wiki 不一样：AI 持续维护一本
  会累积、会交叉引用、会自我检查的维基"——对 RAG 的差异化定位原文。目录结构：`raw/`（原始来源，
  **只读，AI 不改**）+ `wiki/`（AI 生成的 entities/concepts/sources 页）+ `index.md`（自动重建）+
  `log.md`（只追加）+ `schema.md`（约定）；孤儿页自检；回答附页面路径。
- **Khoj**（khoj-ai/khoj，AGPL-3.0）：自称 "Your AI second brain"；Obsidian 插件周期性把 vault
  同步到 Khoj 服务器；检索管线 = bi-encoder embedding + cross-encoder 重排，**默认即 embedding、
  无免 embedding 模式** [documented，docs.khoj.dev]——**与委托方"否决向量库"前提相反的反例**；
  2026-08 后提交放缓、云服务疑似弃用 [observed]。
- **MCP 生态**：Foam 官方 `foam mcp`（默认只读、`--allow-writes` 显式开写；get_connections 正反链 /
  get_placeholders / traverse_graph）[documented]；社区 MarkusPfundstein/mcp-obsidian（经
  obsidian-local-rest-api 读写 vault）[documented]；npm 已出现 wikimoth-mcp（"[[wikilink]]
  markdown vault 上的确定性 agent 记忆"）、@crewhaus/wiki-store（版本化 markdown 文章 + 一跳
  wikilink 扩展检索）等 [observed registry]；Logseq Electron 内置 MCP [observed]；**Obsidian
  官方走 Headless 而非 MCP** [documented]。
- **MOC（Map of Content）约定**：[observed] Obsidian 官方 help **没有** MOC 页面（help 仓库全文
  grep 零命中）——是社区约定。一手出处：官方论坛 Nick Milo 的 Ideaverse/LYT Kit 帖（MOC 三态：
  孵化器/工作台/成熟地图；术语源自 Lion Kimbro ~2003）[documented forum] 及 obsidian-moc-explorer
  仓库 [documented]。**evergreen notes** 一手出处 = Andy Matuschak 的工作笔记（原子化、概念导向、
  密集互链、偏好联想本体而非层级分类）[documented，notes.andymatuschak.org/Evergreen_notes]。

### 5.5 wiki 式结构的判据速评

- **①错了赔得起**：vault = 普通文件夹 + Markdown；**死的是工具不是格式**（Dendron/Neuron 死了，
  数据还在）——纯文件双链是这批技术里最"赔得起"的。
- **②错了多久发现**：断链/歧义/stale 的检查在 Foam（lint/占位符面板/CLI unresolved）、Quartz
  （构建期 slug 冲突 Warning + broken 类）、OKF（stale_after/status）、DSH 生态（wiki_lint/
  巡检）都有先例——**全部可做成纯函数 finding**。
- **③形态**：wikilink 解析百行级（DSH 生态四处自研先例 + remark-wiki-link 事实标准但维护停滞）；
  检索面不需要 embedding（Foam grep/links、Karpathy "LLM 自维护索引就够用"、OKF "synthesize
  on the fly"）；服务器型 wiki 全线违反判据（不取）。
- **④信噪比**：Karpathy 规模数据（~40 万词内不需要 RAG）+ Letta "file tree as signposts" +
  llms.txt "stays small enough to fit in context"——目录树+一行摘要的常驻面足够。
- **⑤维护**：Obsidian 专有但免费（含商用，2025-02-20 起）且**只当查看器用**（格式是开放的
  Markdown）；Foam MIT 活跃；remark-wiki-link 停滞（自研解析更稳）；Khoj AGPL+embedding 前提
  冲突，不取。

---

## 六、知识的治理

### 6.1 过期怎么发现

| 方案 | 机制 | 证据 |
|---|---|---|
| Zep/Graphiti | **bi-temporal 四时间戳 + edge invalidation**："t′created and t′expired ∈ T′ monitor when facts are created or invalidated in the system, while tvalid and tinvalid ∈ T track the temporal range during which facts held true"；矛盾时 "invalidates the affected edges by setting their **tinvalid to the tvalid of the invalidating edge**"——**失效不删除、检索仍带有效期返回** | [documented] arxiv.org/html/2501.13956v1；pypi.org/project/graphiti-core/（"Facts have validity windows. When information changes, old facts are **invalidated — not deleted**."） |
| mem0 | `expiration_date`（过期默认隐藏、按 ID 可取回）；Memory Decay = "a soft ranking bias, never a filter"（0.3×–1.5×，按最近 20 次访问） | [documented] docs.mem0.ai `/core-concepts/memory-operations/add`、`/platform/features/memory-decay.md` |
| OKF v0.2 | `status: draft/stable/deprecated`（**deprecated 保留供链接与历史**，"no longer current"）+ `stale_after` 绝对时刻（过期=一次纯比较）；`generated.at` 区分"最近编辑 vs 陈旧事实" | [documented] SPEC §5.4/5.5/5.2 |
| ADR（Nygard 2011-11-15） | Status 字段演变链："proposed → accepted；later ADR 改变决定时标 **deprecated or superseded with a reference to its replacement**"；"we will keep the old one around, but mark it as superseded"；编号单调不复用 | [documented] cognitect.com/blog/2011/11/15/documenting-architecture-decisions.html；adr.github.io |
| Claude Code auto memory | `modified` frontmatter 时间戳（v2.1.214+）显示事实新旧；索引临近上限时提醒 "merge or drop stale entries" | [documented] code.claude.com/docs/en/memory.md |

**横向**：Graphiti 的"打失效标不删"与 ADR 的"superseded 保留"是同一原则的两种实现（图边 vs 人读
文件）；委托方 memory/ 已有 `superseded/retired → archive/` 生命周期，**知识层照搬即可**，加
`stale_after`/`status` 使"过期"机器可见。

### 6.2 知识与记忆互相污染怎么防

- **产品级分工规则**（最强证据，@dsh-enhanced 双向原文，见 §4.3①）：wiki 收长资料/研究/项目知识，
  memory 收短事实/偏好；"研究资料、文档和项目知识不属于这里（memory），应交给 personal-wiki"。
- **写入克制**：Claude Code "skips anything it can derive from the codebase... skips anything your
  CLAUDE.md files already say" [documented]；Anthropic memory tool "**Do not create new files
  unless necessary**" + "Only write down information relevant to \<topic\>" + 敏感信息拒写 [documented]。
- **分区隔离**：Letta block label + description（"the `description` is the main information used
  by the agent to determine how to read and write to that block"）+ read_only 块 [documented]；
  MemFS 以**路径**为分区（label=path，"Choosing a label is choosing where the memory lives and
  whether it stays in context"）[documented]。
- **抽取侧防污染**：mem0 prompts [observed]："No Detail Contamination from Context"（例：'I had a
  great meal' 不得合并成 'User had a great meal at Olive Garden'）；"No Echo Extraction"；
  custom instructions 双轨（"what is worth remembering about an agent is rarely what is worth
  remembering about a user"，agent 版明示 "Exclude: user preferences, personal details."）[documented]。
- **矛盾处理**：dsh-living-memory "when a new memory contradicts an old one, **both are flagged
  for review instead of silently overwriting history**" [documented，README]。

### 6.3 provenance（出处）

- **生态普遍空缺**：SKILL.md frontmatter 无出处/版本字段（官方校验脚本 ALLOWED_PROPERTIES 仅
  name/description/license/allowed-tools/metadata/compatibility；`metadata` 是自由字段逃生门）
  [observed，anthropics/skills quick_validate.py]；CLAUDE.md 无 frontmatter 约定；Cursor rules
  仅 description/globs/alwaysApply；.claude/rules "paths is the only field Claude Code reads"
  [documented]。
- **成体系的两个**：Graphiti（"Every entity and relationship traces back to the **episodes**
  (raw data) that produced it. Full lineage from derived fact to source."，边↔episode 双向索引）
  [documented]；**OKF sources/generated/verified 字段族**（§4.4——"谁写的"与"谁确认的"分离、
  逐主张 footnote 归因、actor 约定）[documented]。
- **DSH 生态先例**：dsh-learn-wiki "**无 sources 不 commit**"（`commitReadiness()` 强制）；
  dsh-okf-knowledge okf-authoring skill 要求"保留来源"，okf_search 结果携带"可引用的知识条目 id
  与校验提示（如缺少来源）"；dsh-enhanced bridge 幂等键含 source ids+versions/revision（防
  provenance 丢失）；@vesna raw/（原始来源只读区）+ 回答附页面路径。
- **ADR**：superseded 指向替代 ADR——人读文件上的决策溯源链 [documented]。

### 6.4 机器检查知识质量（curate 对照）

- **markdownlint**（v0.41.1）：MD042/MD051/MD052 链接类规则 + custom rules；front matter 默认忽略
  [affordance]。
- **anthropics/skills quick_validate.py**：纯函数逐字段校验（存在性、YAML 合法、必填、name 文法
  ≤64、description ≤1024 禁尖括号、未知字段拒绝）[observed]；Claude Code `/skill-doctor`
  （v2.1.252+）报告 skill 成本/频次并 "flags skills... that have never been invoked" [documented]。
- **Basic Memory**：`doctor`（文件↔DB 一致性）+ schema_infer/schema_validate/schema_diff [affordance]。
- **DSH 生态**（与委托方 curate 最同型）：@dsh-enhanced wiki_lint（坏 frontmatter/重复 id/死链/
  孤页/来源哈希/索引漂移，**只报告不修复**）；dsh-obsidian-inbox 两级确定性校验（"校验不通过不
  宣布已入库"）；dsh-plugin-vault-memory 断链/孤页/缺 MOC 巡检（只建议、批准才写、写前备份）；
  dsh-geometry-knowledge（"Markdown 是唯一内容真源，增删改后由本地程序**自动原子重建派生索引**
  ...并运行**一致性审计**"）。
- **生态空缺 = 差异化空间**：Cursor/Windsurf/Claude Code 对 rules/CLAUDE.md **无 linter、无过期
  提醒**（官方对策只有人工周期复查）；AGENTS.md "just standard Markdown. No required fields"
  [documented absence，cursor.com/docs/rules、code.claude.com/docs/en/memory.md、agents.md]。
  委托方的 curate（纯函数养护简报）在这一生态里**领先于所有 repo-instruction 工具**。

---

## 七、建议（对照判据逐条）

### 7.1 总判断

**建：把"知识"立为家的第四房间 `knowledge/`，wiki 式（[[wikilink]] 互链）纯 Markdown+frontmatter，
不建服务、不上向量、不装现成插件——治理借 OKF v0.2 字段子集，检索借"索引是派生物"原则。**

三个候选路线的取舍：

- **维持现状（只做记忆+技能）——不取**。领域理解现在只能硬塞 memory/（短事实容器装长资料，
  拉低摘要信噪比——恰是委托方自己"不清晰的意图没地方放会污染记忆"论证的同构）或 skills/
  （程序容器装陈述性知识）或蒸发。生态三家（Letta reference/、dsh-enhanced personal-wiki、
  Anthropic memory tool 多文件分域）都把"长资料"独立成层，Letta 甚至把它做进默认目录结构。
  且用户偏好（wiki 式、互链、有机生长、人可编辑）本身就是需求信号。
- **作为 docs/ 惯例的延伸——作为配套取，不作为主形态**。docs/ 是 repo 面：人维护、项目绑定、
  不跨项目跟随家；无治理字段、无检索工具面。**项目知识留 repo**（AGENTS.md 嵌套就近 + docs/），
  **跨项目/跨会话的领域理解进家的 knowledge/**——这个分层在 dsh-okf-knowledge 里是现成的
  （`<项目>/.dsh/knowledge/` vs `<dsh home>/knowledge/shared`），在 AGENTS.md 生态里是
  "closest one takes precedence" 的就近原则。知识房间可以存"repo 文档的蒸馏视图"（带 sources
  指回 repo 路径），但真源仍在 repo。
- **第四房间——取**。理由：与三房间同构（一条一文件 + 房间一个职责 + curate 养护）、与生态收敛
  方向一致（Letta MemFS/claude-obsidian/OKF）、与用户偏好一致（互链有机生长人可编辑）、与 day-0
  约束一致（纯文件可 git 可手改）。方法论的一手出处（Karpathy 2026-04-02：raw/ 只读区 + LLM
  编译维护 + 人几乎不碰 + health check lint；~40 万词内"不必 fancy RAG"）与"第四房间 + curate"
  完整同构——这个模式已被 DSH 生态十几个插件独立再实现，不是孤立想法。

### 7.2 具体设计（每一件都标借用来源）

1. **房间边界**（防污染，借 §6.2 证据）：`knowledge/` 收"长资料与领域理解"——概念页、实体页、
   来源摘要页、how-things-work；**每轮都可能用的短事实/偏好/决定仍归 memory/**（dsh-enhanced
   分工原文）；操作程序仍归 skills/；未决线索仍归 research/。写进 HOME.md 地图与 memory 写入
   纪律（借 Claude Code "skips anything your CLAUDE.md already say" 的克制规则 + Anthropic
   "Do not create new files unless necessary"）。
2. **形态**：一条一文件（与 memory/ 同构，id/frontmatter/正文）+ **`[[wikilink]]` 互链**（用户
   偏好；Obsidian 兼容语法使同一目录可直接被 Obsidian/Foam 打开渲染——人机共用一份文件）+
   `index.md`（目录清单，progressive disclosure；**派生物，可重建**——OKF §8 "consumers MAY
   synthesize on the fly"）+ 可选 `log.md`。frontmatter 治理字段子集（借 OKF v0.2，**不引入**
   attestation/Attested Computation——对个人助手过重）：
   - `type`（概念/实体/来源/how-it-works……不中央注册，消费者容忍未知——OKF §4.1）
   - `generated: {by, at}`（谁写的：`human:<id>` / `agent:<model>` / `process:<id>`——OKF §7 actor）
   - `verified: [{by, at}]`（谁确认的；human-reviewed 档——OKF §5.2/5.3）
   - `status: draft|stable|deprecated` + `stale_after`（绝对时刻；deprecated 不删、保留供链接——
     OKF §5.4/5.5 + ADR superseded 语义，与 memory/ 的 superseded→archive 生命周期对齐）
   - `sources[]`（指向 URL/repo 路径/research 条目 id；**无 sources 的自动产出不进 stable**——
     dsh-learn-wiki "无 sources 不 commit" + dsh-okf-knowledge "校验提示：缺少来源"）
3. **检索面**（embedding 继续延后，触发条件不变）：
   - 常驻（桌面）：knowledge/ 的**目录树+各页一行摘要**进 digest（有界；借 Letta "file tree
     itself is always in the system prompt... names act as signposts" + llms.txt "stays small
     enough to fit in context"）。
   - 抽屉（按需）：关键词/标签检索（现有词汇直接扩展）+ **wikilink 遍历**（读一页后沿出链/入链
     扩展上下文——Basic Memory `build_context` 同款）+ **backlinks 现算**（全库 grep `[[name]]`，
     无索引服务——§5.3 一手先例；Foam 官方 CLI `foam grep`（"搜索每篇笔记全文而非索引元数据"）与
     `foam links --incoming` 给了"grep 一遍"的官方背书；@sidleo3 wiki_get 附 backlinks 是工具面
     先例）。规模参照：Karpathy ~100 篇 / ~40 万词内"LLM 自动维护索引文件和摘要就够用，不必 fancy
     RAG" [documented，X 2026-04-02]。
   - dsh-knowledge-sqlite 的 trigram 实测表是未来评估 CJK 检索质量的方法参照（先测真实漏召回，
     再决定是否上 FTS/查询扩展，embedding 仍最后）。
4. **curate 扩展**（纯函数新增 finding，借 §6.4 先例）：
   - **断链**：`[[target]]` 指向不存在的页——**报告为 info 级而非 error 级**（OKF："may simply
     represent **not-yet-written knowledge**"；dsh-plugin-vault-memory 巡检同款"只建议"）；但对
     `status: deprecated/superseded` 页的入链报 warn（过期知识仍被引用）。
   - **孤页**（无入链无出链的 stable 页——@dsh-enhanced wiki_lint/巡查先例）。
   - **同名歧义**（两个文件解析到同一 `[[target]]`——dsh-obsidian-inbox 校验项）。
   - **stale_after 到期**（机器先发现，同 research/ 的 staleResearchDays 先例）。
   - **frontmatter 合法性 / index.md 与实际文件漂移**（烂文件静默退出=悄悄丢失——委托方 curate
     现有理由的直接延伸）。
   - 以上全部可做成纯函数 finding（Foam `foam lint` 以 exit 2 进 CI、Quartz 构建期 slug 冲突
     Warning 是"检查进门禁"的先例）。
5. **晋升与 provenance**（与三房间缝合，借 @dsh-enhanced bridge 语义，不装其包）：
   - research/ 的 promote 出口新增目标类型 knowledge（线索成立 → 蒸馏成知识页，promotedTo 指向
     页 id，sources 指回 research 条目）。
   - memory ↔ knowledge **不自动同步、不双写**（bridge 的"没有第三份正文"原则）：需要时提供两条
     显式可审阅操作——memory 条目升格为知识页（knowledge_promote 语义）、知识页钉出短摘要进
     memory（knowledge_pin 语义），幂等键含源 id+版本（provenance-stable）。
   - 自动产出走 staged：agent 蒸馏的候选先进暂存态（status: draft），人审或复核后才 stable
     （dsh-learn-wiki "staged/ 永不参与召回" + Gemini Auto Memory ".patch 进 inbox 人工审批"）。
6. **互链图的定位**（答委托方设计问题）：**backlinks 是 agent 检索面的一部分**（wiki_get/检索
   附反链，检索原语之一）；**图视图是给人看的渲染**（Obsidian/Foam 打开同一目录即得，零额外
   建设成本）——一份文件、两个消费者，不建独立的图服务。渲染器的可替换性有生死簿背书：Obsidian
   专有但 2025-02-20 起全用途免费（只当查看器，格式是开放 Markdown）；Foam MIT 活跃且 Obsidian
   兼容；**工具死了数据还在**（Dendron/Neuron 已死、vault 文件无损）——不把任何渲染器写进契约。
7. **[[link]] 断链算不算 curate finding**（答委托方设计问题）：**算**——机器可查（确定性 grep
   解析）、有生态先例（wiki_lint 死链 / vault-memory 断链巡检 / obsidian-inbox 链接校验），但按
   OKF 语义分档：info（未写成的知识）/ warn（过期页仍被引用）/ error（frontmatter 烂、同名歧义
   这种会让检索静默失效的）。

### 7.3 为什么不直接装现成插件（判据对照）

| 判据 | 结论 |
|---|---|
| ①错了赔得起 | 家内 knowledge/ = 纯 Markdown，可 git/diff/手改/删——与 memory/ 同级。现成插件里 @sidleo3（OKF 文件）与 dsh-okf-knowledge 合格；dsh-enhanced 有 state.sqlite；E 类（tiddlywiki/knowledge-sqlite/living-memory）SQLite/TW 子进程不取 |
| ②错了多久发现 | 自建 = curate 扩展（断链/孤页/stale_after/漂移，纯函数）。现成里 @dsh-enhanced wiki_lint 与 dsh-okf-knowledge validate 最强；**repo-instruction 生态整体无机器检查——这是委托方的差异化长板，装包不会带来它** |
| ③形态 | 自建进 DSH 组合零摩擦（家布局 + 三工具共享 presenter 管道都是自己的）；现成包全部落后 pin 线（dsh-enhanced 钉 0.1.2-rc.1、gxpppp 钉 0.1.2-alpha.2、DSWM 已适配 0.1.5-rc.2 是少数例外），DSH RC 期 cordis API 常破坏（@qiqiangvae fork 的动机原文）——**借语义与格式（OKF/读序/治理），不借运行时依赖** |
| ④信噪比 | 自建 = 目录树+一行摘要进 digest（有界，digestMaxBytes 管着）；@sidleo3 的"恒定层逐字节相同保前缀缓存"是注入面的技术参照 |
| ⑤维护 | 自建零外部依赖。现成：全部 2026-08 后起、单人为维护单点、下载量 63–14830/月不等、GitHub-only 更弱；dsh-wiki（skillre）无 license；@sidleo3 npm 无 repo；@deepseek-ai/dsh-client-ui-obsidian 冒名 scope——**生态年轻且流动性大，锁死任何一个都是风险**；反之它们是"语义参考库"，随取随用 |

**仍值得装来试的**（评估用，非依赖）：dsh-okf-knowledge（OKF 工具面参考实现，纯文件、MIT）；
dsh-plugin-wiki-tools + wiki-skills（claude-obsidian 读序与机械核心的参考实现，Obsidian vault
可作为人侧渲染器）。试装走 dev home（双 home 隔离自动生效），不进发布组合。

**非 DSH 的 vault 方案对照**：Khoj（AGPL-3.0、默认必须 embedding、vault 同步到服务器）与委托方
前提相反，不取；Foam 官方 CLI/MCP（`foam grep`/`links --incoming`/`lint`/get_connections）是
检索面与工具形状的最佳参照——但它是 VS Code 扩展生态，不是 DSH 组合件，只借形状。

### 7.4 落地切片（窄证据，一个垂直切片）

1. `src/home/layout.ts` 加 `knowledge/` 房间（布局唯一 owner 面改一处）+ scaffold + HOME.md 地图；
2. frontmatter 词表扩展（memory 词汇不动，新增 knowledge 词汇：type/generated/verified/status/
   stale_after/sources + wikilink 解析——自研，mingzeng21/DSH 生态已证这是百行级工作量）；
3. curate 加三档 finding（断链 info/warn、孤页、stale_after）；
4. 检索：先不加新工具——`assistant_memory` 的关键词/标签词汇扩到 knowledge/ 或最小 `knowledge`
   只读工具（search/get 附 backlinks）；digest 加目录树有界摘要；
5. docs/home.md + note 同 diff 登记偏离（research→knowledge 的 promote 出口扩展）。

---

## 附 A：版本基线总表（查证时点 2026-09-23/24）

| 包/规范 | 版本/日期 | license | 备注 |
|---|---|---|---|
| mem0 (mem0ai) | 2.1.0（PyPI）；新算法 2026-04 | Apache-2.0 | semantic/episodic 未实现 |
| Letta | Letta Code 0.27.11（changelog）；MemFS 0.14.0 引入 | — | 文档站查证 |
| graphiti-core | 0.30.2（2026-09-08）；论文 arXiv:2501.13956（2025-01-20） | MIT | bi-temporal |
| Anthropic memory tool | memory_20250818 | — | 客户端工具 |
| Cognee | 1.6.0（2026-09-18） | MIT | session distillation |
| Basic Memory | 0.23（pre-release） | **AGPL-3.0** | 注意传染性 |
| LangMem | 版本未取得（文档站无标） | — | |
| AGENTS.md | 无版本号；LF/AAIF 治理；60k+ 项目 | 开放格式 | agents.md |
| Claude Code 文档 | 锚定 v2.1.198–v2.1.280 | — | code.claude.com |
| Anthropic skills 标准 | 工程博客 2025-10-16；开放标准 2025-12-18 | — | agentskills.io |
| Anthropic 工程博客 | contextual-retrieval 2024-09-19；context-engineering 2025-09-29 | — | |
| GraphRAG | 3.1.2（2026-08-21） | MIT | **维护模式** |
| llms.txt | v2（2024-09-03 / 2026-08-10 修改） | 提案 | |
| OKF | **v0.2**（GoogleCloudPlatform；发布日期未载明，规范正文示例日期 2026-05） | 开放格式 | 两镜像同字节 |
| Repomix | 1.18.1（npm） | MIT | |
| markdownlint | 0.41.1（README 自引） | MIT | |
| ADR | Nygard 2011-11-15；adr.github.io（2026-07-07 更新） | — | |
| **DSH（本仓 pin）** | **dsh-v0.1.5-rc.2** | — | vendor/dsh |
| dsh-plugin-shop-catalog | 2026.923.1（11,885 插件；wiki/知识命中 195） | — | 商店目录 |
| @dsh-enhanced/* | 0.1.42（2026-08-27 首发，27 版） | MIT | 钉 0.1.2-rc.1 |
| @sidleo3/dsh-wiki | 0.6.3（2026-09-07 首发，24 版，~2102 dl/月） | MIT | npm 无 repo |
| dsh-okf-knowledge | 0.1.2（2026-08-18） | MIT | |
| dsh-plugin-wiki-tools / -skills | 0.14.2 / 0.2.2 | MIT | claude-obsidian 血统 |
| dsh-obsidian | 0.2.5（2026-09-12） | MIT | |
| @deepseek-ai/dsh-client-ui-obsidian | 0.4.0（tarball-only） | MIT（自称） | **gxpppp 冒名，钉 0.1.2-alpha.2** |
| dsh-learn-wiki | 0.3.1（2026-09-17） | MIT | 治理设计最佳 |
| dsh-simple-wiki-memory | 0.1.3（适配 0.1.5-rc.2） | MIT | |
| dsh-obsidian-inbox | 0.2.2 | MIT | 确定性校验 |
| dsh-tiddlywiki | 0.26.5（88 版，11192 dl/月） | MIT | |
| dsh-knowledge-sqlite | 0.1.9 | MIT | trigram 实测 |
| dsh-living-memory | 0.2.9 | MIT | 矛盾标记待审 |
| dsh-memory-eternal / memory-eternal | 0.7.0（npm，14830 dl/月）/ 0.9.3（目录） | MIT | 同产品两包名 |
| dsh-unified-agent-memory | 0.5.2 | MIT | 晋升/裁决/衰减 |
| dsh-plugin-vault-memory | 0.3.1 | MIT | 断链巡检 |
| @vesna-strivozha-2026/dsh-llm-wiki | 1.0.6（+client-ui 1.0.6） | MIT | raw/wiki 分区 |
| dsh-wiki（skillre） | 0.1.2（2026-08-16） | **无 license 字段** | |
| @deepwatch/dsh-wiki | 0.1.4 | MIT | 投影视图 |
| @qiqiangvae/dsh-obsidian | 0.1.2 | MIT | 合并 fork |
| obsidian-dsh-acp | 0.2.3 | MIT | 反向接入 |
| llm-wiki 生态（npm） | core-llm-wiki 7.7.4 / pi-llm-wiki 0.12.2 / superbee 0.2.1 / okf-kb 0.1.4 / okflight 0.4.0 / okf-lint 0.1.0 等 | 各异 | OKF 工具面 |
| Obsidian | 专有软件；2025-02-20 起全用途免费（含商用） | — | vault=纯 Markdown 文件夹；仅作查看器用 |
| Foam | 扩展 v0.44.6 / foam-cli v0.46.2 / @foam/mcp v0.1.0；2026-09-23 活跃 | MIT | Obsidian 兼容；CLI grep/links/lint/mcp |
| Logseq | 活跃（2026-09-23）；"DB 版"beta 用 SQLite | AGPL-3.0 | 文件版 Markdown/Org |
| Quartz | v5.0.0；2026-09-20 活跃 | MIT | 构建期 wikilink 解析 |
| Dendron | "maintenance only"，最后提交 2025-06-01 | Apache-2.0 | **尸体** |
| Neuron | "superseded by Emanote"，2022-10 休眠 | AGPL-3.0 | **尸体** |
| wiki.js / DokuWiki / MediaWiki | 活跃 / 活跃（2026-09-16）/ 1.46.0 | AGPL-3.0 / GPL-2.0 / — | 仅 DokuWiki 纯文本无 DB |
| remark-wiki-link | v2.0.1（2023-10 后停滞；周下载 ~18.7k） | MIT | 事实标准 |
| markdown-it-wikilinks | v1.4.0（~2023-08；周下载 ~78） | MIT | |
| Khoj | 2.0.0-beta.28；2026-08 后放缓 | AGPL-3.0 | **必须 embedding，与前提冲突** |
| obsidian-git | v2.40.0（活跃） | MIT | 自动化 commit/push |

## 附 B：fetch 失败/缺口记录（如实）

- OpenAI ChatGPT memory 官方帮助页（help.openai.com 多篇）HTTP 403，未取得——"reference saved
  memory vs conversation history" 分工以转述为限，不入承重。
- platform.claude.com memory-tool **en** 版重定向未取得（全文取自 zh-CN .md 端点，同源）。
- Claude Code memory 文档 platform 路径 404（有效路径 code.claude.com/docs/en/memory）。
- Cursor @Docs 旧文档页（docs.cursor.com/context/@-symbols/@-docs）重定向后原文不可得；现行
  @ mentions 列表已无 @Docs。
- docs.windsurf.com 全站重定向 docs.devin.ai；.windsurfrules 官方弃用声明原文未找到。
- GraphRAG "substantial improvement" 的量化在论文/arXiv，未 fetch 论文本体。
- Karpathy "LLM Knowledge Bases" 一手出处**已取得**（X 帖 2026-04-02，
  x.com/karpathy/status/2039805659525644595）；community.tmpdir.org 帖（2026-04-09）为社区转述。
- Context7 GitHub raw README 两次 fetch 失败（改用官方文档站）；LangMem 版本号未取得。
- GitHub API 匿名限流（api.github.com 403，wiki 线一度受限后恢复），stars 类未取得；github.com
  页面版多次被导航外壳淹没，改用 raw README 成功。
- graphiti_core/edges.py 源码 fetch 失败，bi-temporal 字段名以论文为准。
- wiki 生态侧：help.obsidian.md / obsidian.md/help 为 JS 渲染只得标题（改用官方 obsidian-help
  仓库源码）；dokuwiki.org 两次人机校验拦截 HTTP 402（改用官方 GitHub 仓库）；docs.requarks.io
  与 beta.js.wiki 未取得正文（wiki.js 数据库要求以仓库依赖为证）；Logseq outliner 语义、
  markdown-it-wikilinks 精确发布日（registry 发布戳推断 ~2023-08）未从一手完全确认。
