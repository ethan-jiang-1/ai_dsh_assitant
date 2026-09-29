# 自成长基座调研：外部「企业+CEO 助理基座」× DSH 生态刷新 × 自成长机制 v2

日期：2026-09-28 · 状态：**已收卷**（四路研究全部回收、承重主张已亲验；推敲与毕业判断住调研卡 [260928-self-growth-base-research](../../../_backlog/_done/_closed_plans/260928-self-growth-base-research.md)）

> **委托问题**（用户原话，2026-09-28）：原来认为有 supermemory 做记忆、OpenViking 做上下文，「推敲来推敲去最后啥都自己做，看到之后有点无感」；框架（DSH）值得留。要求调研：① DSH 社区里有什么值得借鉴的；② 外面有没有做「企业+CEO 助理」的可自我成长基座，回头想放进 DSH 作为插件。
>
> **与存量的边界**（不重做，只做增量）：[R1 记忆普查](2026-09-24-r1-memory-ecosystem-survey.md)（supermemory 已深评，当时判「维持自研」）、[R2 技能成长普查](2026-09-24-r2-skill-growth-survey.md)（自成长四轴词汇表+缺口清单）、[grand plan](2026-09-25-grand-plan-enterprise-expert-assistant.md)（领域已拍板=CEO 数字分身；生态基线 2026-09-12）、[R4](2026-09-27-r4-harness-borrowing-survey.md)（研发纪律语源，零立即借）。**本文四路增量**：OpenViking 首次深评（R1 仅标「部署形态未知」）、外部基座全景、DSH 生态刷新（09-12→09-28）、机制词汇 v2。
>
> **方法与证据分级**：四个后台研究代理分头普查（一手来源优先：官方 docs / GitHub repo / npm registry / arXiv），承重主张由本仓亲验复核（§7——AI 检索结果不作最终证据，见 [plans/README 形态规范](../../../_backlog/plans/README.md)）。[documented]=官方载明；[observed]=registry / GitHub API / 页面观察；[media]=媒体报道（未经官方核实）。查证日期统一 **2026-09-28**。

## 0. 结论速览

1. **OpenViking（= 用户口中的 "OpenViki"，未发现名为 OpenViki 的独立项目 [observed：web 检索]）是本轮唯一改变判断面的发现**：字节跳动/火山引擎开源的「自演化上下文数据库」（repo 自述 "Self-evolving Context Database for AI Agents. Unify Agent Memory, Knowledge RAG and Skills." [observed：GitHub API，§7 已亲验]），`viking://` 虚拟文件系统统一 **Resources / Memories / Skills**——与本仓「知识 / 记忆 / 技能三房间」**同构**；存储 = 人可读 Markdown + 每目录 L0/L1/L2 生成摘要（token 经济是显式设计目标）[documented：官方 docs]；skills 是一等上下文类型，带 Agent Evolution（experiences/cases/trajectories）与 `ov compile`（素材→wiki/知识图）整理管线。AGPL-3.0、38,844★、创建 2026-01（九个月）、约每周一版。
2. **它有官方 DSH 插件，且 peer 范围显式含我们钉的 `0.1.7-rc.2`**：`@openviking/dsh-memory-plugin` 0.5.8（2026-09-25，Apache-2.0，4 名维护者，GitHub OIDC trusted publishing + SLSA provenance）[observed：npm registry，§7 已亲验]；深度适配 DSH 扩展点（session-start 注入、pre-step 召回持久消息、turn/end 阈值提交、第二个 `ctx.skills` provider、stdio MCP proxy、`viking://` 路径拦截）[documented：包 README]。README 并点破一坑：`complete: true` persona 会吞掉 system prompt 注入，故走 pre-step——本仓 persona 为 prefix 形态 [affordance：`packages/dsh-smart-assistant/cordis.patch.yml`]，不踩此坑。
3. **supermemory 维持 R1 判定不变**：本地形态更成熟（单二进制、全 Memory API 本地可用、零遥测、MIT、可全离线 [documented]），但存储仍是黑箱（release notes 证实 pgvector 底座，非人可读文件），本地形态无 MCP；server 版本仍处 0.0.x，0.0.8（2026-08-17）刚修复一次升级丢向量的数据事故 [observed]。与「人可读文件可 git」判据的**路线冲突未变**（§2）。
4. **「成熟的、可自托管、能自我成长的企业助理基座」作为可整体引入物：不存在**。现状 = 一堆容器（记忆/技能存储）+ 胶水；四家商业平台（Glean/Moveworks/Writer/Dust）无一家提供可整体自托管的开源自成长基座；最接近的三家各有硬差距（§3.5）。
5. **DSH 生态 16 天 +23%**（awesome-dsh-plugin 3552→4377 条 [observed：count.json，§7 已亲验]；策展高度 bot 化）；「自成长」赛道拿到真实下载量的只有三家（skills-manager 134,865/月 [§7 已亲验]、auto-memory 10,318/月、assistant-evolution 4,718/月）；显式声明兼容 `0.1.7-rc.2` 的自成长类插件只有 skills-manager / memento / run2skill(alpha)（三家均 registry 亲验）；evolution-core 明确不兼容（peer 钉 0.1.5-rc.2，且下载回落 11%）。红海确认四条（§4.4）。
6. **自成长机制词汇 v2**（§5）：成长回路七段中**五段现有 seam 可承载**；三个「要新 seam」的候选指向**同一个缺口——把评测基线从 repo 级脚本搬进插件运行时**（写前 eval 门、影子/金丝雀晋升、corpus 全库重测三者共用）。arXiv:2609.24130（2026-09-21）给出「为什么必须门」的最硬数字：被门拒的 383 个自改提案中 **211 个（55%）修好触发案例却弄坏原本通过的案例** [documented（论文），§7 摘要已亲验]。
7. **「跟一个人学」的真空档**：外部全在做「记住用户的事实」（LongMemEval/LoCoMo 系基准）或「静态人格复刻」（Delphi/Personal.ai），**没有一家把「这个人怎么做事/怎么拆题」沉淀成受治理的可执行技能资产** [observed：检索范围内未见，属未核实空白而非存在证明]——本仓 draft→stable + propose→land 正落在这个空位上，grand plan 的数字分身定位获得外部验证（§6）。

## 1. OpenViking（volcengine/OpenViking）——容器 + 半个基座

### 1.1 身份与基本盘

- GitHub `volcengine/OpenViking`：**38,844★**、3,029 forks、687 open issues、**AGPL-3.0**、Python（含 Rust crates 与原生 C++ 向量引擎）、创建 **2026-01-05**、最后 push **2026-09-28 当天**；topics 自带 `dsh-plugin`、`self-evolving`、`context-database`、`agent-memory` [observed：GitHub API，§7 已亲验]。
- PyPI `openviking` **0.4.22**（2026-09-28 发布，Trusted Publishing，作者署名 ByteDance，4 名维护者，Python ≥3.10）[observed：PyPI]；发布节奏约每周一版（0.4.19→0.4.22 跨 09-08→09-28），单版带迁移指南与兼容清单；v0.4.18→0.4.20 区间 95 PRs、34 位 PR 作者 [observed：Releases API]。
- 商业形态：开源 server **AGPLv3 无需激活码**；商业版 = 火山引擎托管 SaaS + Self-Managed BYOC/离线（license key）[documented：PyPI README]。学术背书：VikingMem（VLDB 2026）、目录感知向量检索（ICDE）、VikingRAG [documented：PyPI README Research 节]。

### 1.2 架构与存储（与本仓三房间同构）

- **「一个文件系统装下 agent 全部上下文」**：`viking://` 虚拟文件系统统一 **Resources（知识）/ Memories（记忆）/ Skills（技能）** 三类上下文，agent 用 `ls/tree/read/write/grep/find/search` 导航 [documented：官方 docs concepts/01-architecture]。
- **每目录带生成摘要，三层渐进加载**：L0 = `.abstract.md`（一句话）、L1 = `.overview.md`(结构概览)、L2 = 全文——先读摘要再决定读不读全文 [documented：concepts/01-architecture]。这与本仓「有界摘要常驻 + 细节按需取」同构，但做成了存储层原语。
- **双层存储**：AGFS（内容层，已重写为 Rust **RAGFS**）+ Vector Index（只存 URI/向量/元数据）；单一数据源原则；AGFS 后端 `localfs`/`s3fs`/`memory`；**目录结构即 Markdown 文件——人可读是一等存储形态** [documented：concepts/05-storage]。会话归档 = `messages.jsonl` + 摘要 + `memory_diff.json`（变更审计）[documented：concepts/08-session]。
- 向量索引：本地原生 C++/cuVS 默认；远程可选 VikingDB、openGauss DataVec；`flat_hybrid` + cosine + int8 量化 [documented：concepts/05-storage + release notes]。
- 部署：`pip install openviking` → `openviking-server init`（provider 支持 Volcengine/OpenAI/Kimi/GLM/**本地 Ollama**）→ `doctor` → 启动；默认端口 **1933**，**纯本地模式免认证**；依赖 Python 3.10+ 与「一个 embedding 模型 + 一个 VLM」（云或本地）[documented：PyPI README]。

### 1.3 自成长机制

- **会话提交两阶段**：commit 同步归档 → 后台生成结构化摘要 + 记忆抽取 + `memory_diff.json` 审计 [documented：concepts/08-session]。
- **抽取与去重**：LLM 抽取 → 向量预筛相似 → LLM 去重决策（候选级 skip/create；既有记忆级 merge/delete）；抽取协议为**受限 Python DSL**（已设默认，v0.4.19 起）[documented：concepts/08-session + v0.4.19 release notes]。
- **记忆类型**：`profile/preferences/entities/events/identity/soul/cases/trajectories/experiences`（+自定义）；`experiences` 开启**完整 Agent Evolution 管线**并自动激活 cases/trajectories [documented：concepts/08-session]。
- **Skills 是一等上下文类型**：`viking://~/skills`、整包参与索引、MCP `add_skill`（从 SKILL.md 文本整体建技能）、`skills/find`、会话开始注入 `<available-skills>` 目录（自有优先 + 账号共享）[documented：v0.4.22 release notes + DSH 集成页]。
- **整理**：`ov compile` 把素材组织成 wiki/知识图/报告 [documented：PyPI README]；L0/L1 bottom-up 异步生成 [documented：concepts/01-architecture]。
- **遗忘**：MCP `forget`（**永久删除**，工具说明要求仅按用户明示指令）；去重 delete 删冲突记忆。**无文档化的时间衰减/自动淡忘**（对照：supermemory 有 Episodes 衰减）[documented：dsh-memory-plugin README]。
- 基准（官方自评，0.3.22 版）：LoCoMo 80–83%（对照 OpenClaw 24.20% / Hermes 33.38% / Claude Code 57.21%），tau2-bench +6.87/+11.87pp，token 降 34.3–91.0%——**官方基准用云端 Doubao 模型；本地（Ollama+local-embed）质量未核证** [documented：PyPI README "Proof it works"]。

### 1.4 集成面与官方 DSH 插件

- HTTP `/api/v1/*`；Python/Go/TS SDK；**server 自带 MCP**（`/mcp`）+ 各集成共用的 stdio proxy；工具面 `mcp__openviking__*`（search/read/list/tree/grep/glob/remember/write/edit/forget/add_resource/add_skill…），随 server 升级自动同步 [documented：dsh-memory-plugin README]。
- 集成矩阵官方列明：Claude Code、Codex、Cursor、TRAE、OpenClaw、Hermes、OpenCode、DeerFlow、**DSH**、LangChain、Agent Plugins 1.0 等 [documented：PyPI README]。
- **官方 DSH 集成 = `@openviking/dsh-memory-plugin`**（npm latest 0.5.8，2026-09-25，Apache-2.0，4 维护者，08-20 首发、五周 17 版，旧版标 deprecated）[observed：npm registry，§7 已亲验]。要点（documented：包 README + 官方 DSH 集成页）：
  - 进程内 Cordis 插件：`agent/session-start` 注入 profile + 记忆索引 + 技能目录；`agent/pre-step` 用当前输入检索并以**持久 plugin 消息**追加（刻意不走 system prompt——`complete: true` persona 的 preset 会静默吞掉其他 system 贡献）；`session/event` 捕获消息；`turn/end` 按阈值（默认 20000 token）提交；失败写入进 pending 队列，后台 drainer 每 60s 重放。
  - 会话映射 `dsh-<session-id>`；peer 按 **git origin 派生**（同仓跨 clone/worktree/子目录共享 peer；仓外落 `viking://user/<you>/memories`）。
  - 工具面经**自研 stdio proxy**（每 profile 一进程）——**直连 server `/mcp` 不工作**（stateless_http 下 GET /mcp 的 idle SSE 流卡死 SDK 客户端 POST 响应）。
  - 技能经**第二个 `ctx.skills` provider**（`includeDefaultRoots: false` + `bundledSkillDir`），不与项目/用户技能目录争 catalog。
  - `tools/pre-execute` 拦截路径为 `viking://` 的 DSH 文件工具并指路 MCP 工具；`tools/post-execute` 对带 `viking://` 的 bash 附加提示。
  - **peer 依赖范围：`>=0.1.0-rc.6 <0.2.0 || ^0.1.5-rc.1 || ^0.1.7-rc.2`**——含本仓 pin [observed：npm registry，§7 已亲验]；zero 运行时依赖。

### 1.5 容器 vs 基座判断与风险

- **判断：容器 + 半个基座**。容器面（存储/检索/隔离/审计）之外，Skills 一等类型 + Agent Evolution + compile 正是「助理级成长回路」的原材料；但「跟人学」的策略层（何时抽取什么、人格如何演变）仍由宿主 agent 驱动——它不是人格引擎。
- **风险**：① **AGPL-3.0**——本机私有使用无义务；修改 server 或对外提供网络服务须开源改动；官方 DSH bundle 本身 Apache-2.0，以独立进程 + HTTP/MCP 交互接入不构成 AGPL 链接，**fork server 代码进本仓才触发** [documented：license 结构 + npm bundle license]；② 版本钉扎必须做（周更、breaking change 多、bundle 五周 17 版）；③ 与本仓助手 preset **功能重叠**（双记忆系统会双写同会话）——试点必须在隔离 profile 或关闭其写入面（`syncTurns: false` 为官方开关）[documented：包 README]。

## 2. supermemory（supermemoryai/supermemory）——强记忆容器，路线冲突不变

- 基本盘：30,965★、MIT、TypeScript、pushed 2026-09-25 [observed：GitHub API]；组织化运营、创始人 Dhravya Shah 贡献居首（854 次）[observed：Contributors API]；融资 $2.6M/$3M 为媒体报道 [media]，未官方核实。**版本仍处 0.0.x**：最新 server-v0.0.8（2026-08-17）是紧急修复版——从 0.0.7-rc 升级时迁移**误删 pgvector embedding 列导致搜索静默失效**，0.0.8 启动自动检测重嵌入 [observed：Releases API]。
- 本地/自托管形态（documented：官方 self-hosting docs）：单二进制零配置（`npx supermemory local`），监听 localhost:6767，数据目录 `./.supermemory/` = graph engine 数据 + auth secret + embedding 模型缓存；LLM 走任意 OpenAI 兼容端点（Ollama 全离线），embedding 默认本地 `Xenova/bge-base-en-v1.5`；**"The self-hosted binary sends no analytics"**；二进制 270–312 MB、摄取内存上限默认 1 GB。本地**无** Connectors、**无 MCP**、无云端专有抽取模型。
- **R1 三问的 2026-09 答案**（更新 R1 §4.2）：① `dsh-supermemory@0.1.2` 桥可经 `SUPERMEMORY_API_URL` 指向本地 server（官方 SDK 同一开关），其探针 `POST /v4/profile` 本地兼容；但桥默认挂的**托管 MCP 在本地形态不可用**（本地无 MCP 端点）——本地形态下桥只有 REST recall/capture/profile 注入 [documented：npm 包 README + 官方 overview]。② `./.supermemory` 格式：**非人可读确认**（pgvector 底座，官方从不描述为文件）[observed：release notes]。③ 资源占用：二进制 270–312 MB + 摄取内存 ≤1 GB 默认 [documented：configuration]。
- **自成长机制**（documented：graph-memory 概念页）：Documents vs Memories；关系边 **updates**（isLatest 保当前留历史）/extends/derives；**Dreaming** 后台持续建图；记忆类型 Facts/Preferences/Episodes（衰减）；自动遗忘 + 产品级 forget/agentic mass-forget/memory review；用户画像 static+dynamic 自动维护。官方声明 Memory API 全量对本地 server 一致可用；抽取质量是官方明示的本地/云端分界。
- **判定**：记忆容器（强）——成长对象是「关于人/实体的事实」；无技能沉淀概念、无领域文档整理管线。与 R1 判定一致：**不构成换轨理由**，黑箱存储与人可读判据的冲突是路线性的。

## 3. 外部基座全景：容器满地，基座无人

### 3.1 记忆 OS / 上下文层梯队（2026-09-28 现状）

| 项目 | License | 自托管 | 成熟度 | 自成长故事 | 集成面 | 定位 |
|---|---|---|---|---|---|---|
| mem0 | Apache-2.0 | OSS 可自部署；高级整理在平台侧 | 66,162★，pushed 09-25，Python | Dream 整理（平台侧）；**v2.2.0（09-23）新增 User Profiles**——JSON Schema 定形的画像卡 + LLM 异步填充 + 幂等 job [documented] | Node SDK；OpenMemory MCP（本地） | 容器 |
| MemOS 2.0 | Apache-2.0 | docker compose | 11,616★，2.0 起 TypeScript，pushed 09-23 | 官方叙事即 self-evolving（MemCube、技能结晶、L1 traces/L2 policies/L3 world models）[documented] | **官方 DSH 插件（cloud+local，local=SQLite）**——repo description 与 topics 自带 DeepSeek Harness/dsh-plugin [observed：GitHub API，§7 已亲验]；MCP 模块 | 记忆 OS（自成长叙事最强；唯一替 DSH 写过记忆插件的记忆 OS） |
| Letta | Apache-2.0 | 自托管 server | 24,934★，pushed 09-10 | sleep-time compute；09-23 新增**主 agent 把顺手记忆委托给后台 memory worker**（checkout lease 防并发写）[documented：PR #4627] | TS SDK；MemFS v2 = git-backed 记忆仓库（MEMORY.md + persona.md/human.md） | agent 运行时基座（Python/运行时绑定，进不了 cordis 组合） |
| Zep / Graphiti | Graphiti Apache-2.0；Zep 主产品=托管云 | Graphiti 可自部署 | Graphiti 31,242★，pushed 09-27 | temporal KG、edge invalidation | repo 内 MCP server | 容器 |
| Hindsight | MIT | **一条 docker 命令全栈**（内嵌 PostgreSQL+pgvector，可接 Ollama） | 38,828★（2025-10 建库 8 个月），pushed 09-26 | retain/recall/reflect + **mental models（随记忆自动更新的活文档）**[documented]；论文 arXiv:2512.12818 | **原生 HTTP MCP endpoint**（multi-bank）；TS SDK | 容器（MCP 接入最顺） |
| cognee | Apache-2.0 | docker | 31,103★，pushed 09-27 | ECL 管线+KG | cognee-mcp | 容器 |
| Memobase | Apache-2.0 | docker | 2,920★，**pushed 2026-01-11（约 8.5 个月停滞）** | 弱 | TS SDK（JSR） | 容器（维护风险高，出局） |
| **TencentDB Agent Memory** | README badge MIT，GitHub API=NOASSERTION（**不一致，需读 LICENSE 文件**） | **自托管三服务**（memory-core+hub+proxy 一键脚本，面板 localhost:8125） | 27,386★（2026-04 建库），TypeScript，pushed 09-25，855 open issues | **L0 会话→L1 Atom→L2 Scenario→L3 Persona 蒸馏**；四类资产 Chat Memory/Skill/Wiki/CodeGraph；Hub 治理（owner/version/status/visibility/ACL+使用计数）[documented] | **不走 MCP：协议代理（改 base URL 即接入），官方支持列表含 DeepSeek Harness** [documented] | **团队级记忆资产枢纽**——最不像「容器」的容器 |

各家自报 benchmark（MemOS：LoCoMo 88.83 / LongMemEval 89.20 等）互相矛盾，只当方向信号 [observed]。MemTensor 融资（2026-07 亿元轮、2026-09 Pre-A+）为转述 [media]。

### 3.2 企业助理平台

| 平台 | 开源/自托管 | 成长回路公开描述 | 证据级别 |
|---|---|---|---|
| Dust | **MIT**（GitHub API，非坊间流传的 AGPL）；托管是主产品，self-host 非官方主线 | agent+数据源+工具平台最完整；成长回路公开机制少；社区仅 1,474★ | 混合 |
| Glean | 闭源 SaaS | Enterprise Graph + 第三代 Assistant + agents，官方宣称 | 宣称层 |
| Moveworks | 闭源；并入 ServiceNow | Creator Studio 低代码；营销级描述 | 宣称层 |
| Writer | 闭源；企业私有云（客户 VPC） | 「对可验证事实负责」、graph RAG 官方宣称 | 宣称层+转述 |

四家共同点：平台+连接器+治理；**无一家提供可整体自托管的开源自成长基座**。

### 3.3 开源个人助理基座

- **OpenClaw**：390,686★ / 82k forks、TypeScript、pushed 09-28（极活跃）；license=Other/NOASSERTION（**确切条款未核实**）[observed]。OpenClaw Foundation 运营；2.0（2026-08-30）：933 贡献者、16k+ PRs，memory/skills/automations/security 全部重做 [documented]。文档面：Memory（architecture、**provenance & deletion**、user model、Dreaming、compaction）、**Skill Workshop（proposal→collection review→审批，self-learning 设置）**、ClawHub（moderation、security audits）、MITRE ATLAS 威胁模型 [documented：官方 docs]。
  - **ClawHavoc 事故定性修正**（对 R2 §3.6 的修正）：不是「记忆投毒」而是 **Skill 供应链投毒**——PolySwarm 通报（2026-02-27）：向 ClawHub 投放 900+ 恶意 Skill，载荷 AMOS 窃密木马/reverse shell，窃取 `~/.clawdbot/.env` AI 令牌；SKILL.md 伪造前置步骤社工 [documented：安全厂商一手]。事故后治理（moderation/security audit/provenance/policy-as-code）是事后补的 [documented]。
  - 判断：**唯一达到「个人助理基座」量级的开源物**（自成长全回路真实存在），但 license 未核实 + 事故史 + 消费级取向 + 6.8GB 代码库 ⇒ 按硬规则 7 只借机制不装包。
- **Khoj**：AGPL-3.0、37,526★、pushed 2026-08-02（8 周未推送，放缓）[observed]；无记忆资产治理与成长回路 ⇒ 容器/框架，不是基座。

### 3.4 数字分身 / 跟一个具体的人学

- **Delphi（delphi.ai）**：$16M Series A（Sequoia 领投）[media]；官方叙事：时间索引自适应时序知识图谱 + 分布式 agent 网络，复刻「知识体系+思维模式+表达风格」；定位=**对外服务的专家分身**。机制无独立验证。
- **Personal.ai**：Memory Stack = persona 专属记忆块（消息/文档/邮箱），「越喂越聪明」为官方宣称；SaaS 无自托管 [documented]。
- **学术面**：综述 [arXiv:2602.22680](https://arxiv.org/abs/2602.22680)（个性化 agent 按 profile modeling/memory/planning/action execution 四能力组织 + 评测范式专章）；**PrefEval**（[arXiv:2502.09597](https://arxiv.org/abs/2502.09597)，ICLR 2025 oral）：零样本下多数模型偏好遵从准确率在 ~10 turns（≈3k tokens）跌破 10%——「跟人学」难度的量化锚点；**RPEval**（[arXiv:2601.16621](https://arxiv.org/abs/2601.16621)）：命名「**irrational personalization**」——不相关的个性化记忆反干扰意图理解；**EPIC**（[arXiv:2605.18271](https://arxiv.org/abs/2605.18271)，ICML 2026）：把**用户偏好本身当作紧凑稳定的个人上下文**，偏好遵从 +18.79pp、索引内存 ↓2404×、**偏好漂移下流式更新**；**CAPTURE**（[arXiv:2609.02265](https://arxiv.org/abs/2609.02265)，under review，单人组，按初步对待）：形式化「真偏好漂移 vs 记忆投毒/临时情境」——仅 recency+provenance 不足，需信念追踪+多时间尺度账本+不确定性触发澄清；毒化成功率 11.5%→24.7%（自适应攻击者），真更新接受率 83.5%。

### 3.5 底线判断：三家最接近者与差距

1. **TencentDB Agent Memory**——本仓产品形态的开源镜像（TS、自托管、团队记忆资产+治理面板+agent loadout+DSH 官方支持）。差距：只是记忆面不是 harness（无会话循环/工具面）；「全自动记忆路由仍在迭代」（README 自述）；license 字段不一致；2026-04 建库、855 open issues，成熟度未证。**借：Hub 治理模型与 L0→L3 蒸馏管线。**
2. **OpenClaw 2.0**——唯一跑通「助理自成长全回路」的开源基座。差距：license 未核实、事故史（治理事后补）、消费级取向、无企业权限/合规面。**借：Skill Workshop 的提案→评审→审批闭环（对 draft→stable + propose→land 的外部验证）、memory provenance & deletion、事故后供应链治理设计。**
3. **MemOS 2.0（memos-local-plugin）**——官方 DSH out-of-tree bundle 形态的记忆适配器（本地 SQLite、技能结晶、分层）。差距：记忆容器本质。**借：适配器形状；它证明该缝是通的。**

**总判**：外部世界验证了本仓路线（working folder=资产、治理=成长回路、审查=安全边界），**没有人替我们做「基座」**。ClawHavoc 另证明「自成长资产的供应链审查」本身是产品级需求——本仓 propose→land 门禁即答案。

## 4. DSH 生态刷新（2026-09-12 → 09-28）

### 4.1 大盘

- awesome-dsh-plugin（org 仓）：**17,101★**、pushed 09-27；条目 **3552 → 4377 = +825/16 天（+23.2%，≈51.6 条/天）** [observed：GitHub API + count.json，§7 已亲验]；策展高度 bot 化（每 PR 合入后 actions 自动 regenerate README）。
- `dsh-plugin-shop-catalog`：2026.928.0（catalogBuiltAt 2026-09-28T06:44Z，日更未断）；月下载 13,762；插件总数本轮未核实（未下载 tgz）[observed]。

### 4.2 关键选手现状（自成长赛道；全部 2026-09-28 查证）

| 包 | 最新版 | 发布 | dl/月（08-28→09-26） | 兼容 0.1.7-rc.2？ |
|---|---|---|---|---|
| @michengai/dsh-skills-manager | 1.1.4 | 09-25 | **134,865**（基线 65k，×2；§7 已亲验） | **显式是**（peerDeps 枚举至 0.1.7-rc.2；OIDC + SLSA；test:compat 套件；§7 已亲验） |
| @lmzhen/dsh-evolution-core | 0.14.0 | 09-28 | 38,619（基线 43.5k，-11%） | **否**（peer 钉 dsh-scope ^0.1.5-rc.2；§7 已亲验） |
| @a9i5k4/dsh-auto-memory | 3.2.1 | 09-27 | 10,318（+15%） | 未声明；unpacked 193MB（optionalDep HF transformers） |
| @dsh-enhanced/assistant-evolution | 0.1.48 | 09-26 | 4,718（+47%） | 范围含 `>=0.1.2-rc.1 <0.2.0`（optional） |
| dsh-memento | 0.5.18 | 09-24 | 4,632 | **显式是**（engines.dsh + dshWorkshop.compatibility 列出 0.1.7-rc.2；§7 已亲验）；GitHub 123★（记忆赛道最高）、pushed 09-25 |
| dsh-run2skill | 0.5.0-alpha.2 | 09-25 | 1,512 | **显式是**（peer/devDeps 全套钉 0.1.7-rc.2），但 pre-release + 单人 |
| @wumihaze/dsh-mind | 0.2.2 | 09-12 | 876（塌落） | 通配 `*` |
| @garvel/dsh-reflect | 0.0.1-spike.22 | 09-03 | 105 | spike 停滞 |
| dsh-native-memory | 0.2.0 | 08-15 | 836 | 否；repo 已死 |

GitHub 仓：weibaohui/hermes-loop 4★/pushed 09-27 活跃；VanadisGithub/dsh-skill-evolution 2★/09-07 趋停；01men/ybkk-AIOS 8★/09-23（企业 suite：IAM/OIDC/Skill 市场/审计/FinOps）；highland0971/dsh-native-memory 死（08-16）[observed]。

### 4.3 09-12 以来新物种

- **agent-body**（1420079678-ctrl/agent-body，MIT，不入 awesome 前未上 npm）：「organ-based agent plugin platform」——插件自declare 器官、神经脉冲路由命令、**零模型调用的 reflex arcs**、idle/sleep-time memory consolidation、按需 tool-schema gating（自称省 82% prompt tokens）[observed：GitHub 页]；真实量未核实（API 限流）。
- **dsh-recipe**（863683348/dsh-recipe）：插件界的 dotfiles——场景化插件组合（有序安装序列）[observed]。
- **ybkk-AIOS**：企业级平台套件（项目制交付，8★）[observed]。
- **第二份清单** Dominic789654/awesome-deepseek-harness 出现 [observed]。
- **dsh-morning-paper**：从 durable session log 折叠「晨报」（明确 "folded from the durable session log rather than written by a model"）[observed]。
- 「助手自我成长」拿到真实量的只有三家：skills-manager（134.9k/月，严格说是技能货架治理）、auto-memory（10.3k）、assistant-evolution（4.7k）。

### 4.4 三分清单（对「自成长的 CEO 助理基座」）

- **借思路（不装包）**：dsh-memento 的 `ctx.memory` seam 四件套 + 审批门控写入 + cited provenance 词汇，及 **`dshWorkshop` manifest 字段设计**（permissions / capability.invocation / install.transactional + generation-rollback / evidence 指向评审文档）——可直接抄成插件准入评审表字段；dsh-run2skill 的评测资产冻结入库组织（frozen-evaluation/crash-matrix 全部可重跑）；agent-body 三思路（零模型 reflex arcs＝确定性养护、tool-schema gating 的上下文经济学、sleep-time consolidation）；@dsh-enhanced 的「自成长治理化拆分」（六正交插件 + task-acceptance-contract）；dsh-morning-paper 的「报告从 durable log 折叠而非模型生成」。
- **过准入评审后才可议引入**：@michengai/dsh-skills-manager（生态唯一过硬规则 7 声誉线者，但它是第二套技能面，与 skills provider 契约的冲突须评审）；dsh-memento（引入=让渡记忆主权给 SQLite provider，与 dataDir 三房间重叠）；dsh-run2skill（命题最贴但 alpha+单人，先读源码）。
- **红海（确认拥挤，不再进）**：通用记忆插件（awesome 168 条+本轮 6+ 仓）；技能货架/管理 UI（skills-manager 头部已定）；run→skill 自成长管线（6+ 家同题，差异化只在已有的 draft→stable+提案门禁）；插件市场/目录（awesome+shop 双寡头已固化）；策展清单（两份并存，第三份无位置）。

## 5. 自成长机制词汇表 v2（成长回路七段 × DSH seam 判断）

> 对 R2 四轴词汇（载体/触发/验证门/治理）的更新：按回路七段重排，补 09-24→09-28 的新形态与失败模式。

| 段 | 当前已知最佳实现 | 已知失败模式 | DSH 现有 seam 判断 |
|---|---|---|---|
| ① 触发 | 会话内价值判断（Claude Code「有用才记」）；后台周期（mem0 异步 profile job、Letta sleep-time）；**会话内不阻塞委托**（Letta memory worker，09-23 新形态） | 委托策略模型依赖；触发过密→上下文税（mem0 09-23 集体撤回「每答必搜」检索措辞——过度触发后回撤的活案例） | **能**：ctx.jobs/schedule 覆盖批量边界与周期 |
| ② 捕获 | 修正/确认事件入账（Claude Code auto memory 四型 note：user/feedback/project/reference）；多时间尺度账本（CAPTURE） | 临时情境当长期偏好（仅 recency+provenance 不足）；记忆投毒（ClawHavoc；自适应攻击 24.7%） | **能**：ctx.messageFeedback + ctx.sessionQuery；缺「修正事件」结构化标注（增强项非新 seam） |
| ③ 抽象 | **schema 定形画像卡**（mem0 User Profiles：JSON Schema+LLM 异步填充+幂等）；类型化 note；schema 约束图改写 | attribute 幻觉（Graphiti `cap_string_attributes` 兜底案例）；非理性个性化（RPEval） | **能**：Markdown 房间+frontmatter schema 约定走 draft 人审，无需新 seam |
| ④ 存储 | git-backed 记忆仓库+根索引（Letta MemFS v2：MEMORY.md+persona.md/human.md；checkout lease 防并发写）；索引/明细分层（Claude Code 200 行/25KB） | 索引超限静默截断；布局迁移欠账（Letta v1→v2 手工迁移）；并发写冲突 | **能**（Markdown 三房间同构）；版本化快照/回滚与并发写锁要约定（若 dataDir git 化则降级为约定） |
| ⑤ 取回 | 根索引常驻+明细按需读；预算化证据补全+溯源重排（arXiv:2609.25913：Full Support@2048 +19.07）；取回后两段式组装（arXiv:2606.01435：22 个已报系统 multi-hop 全 ≤7%，组装后 27–41%） | 证据碎片化；检索过度触发（mem0 回撤）；个性化记忆不合时宜（RPEval） | **能**（FTS5 词法+索引够 v1）；语义/图召回要新 seam |
| ⑥ 验证门 | 写时结构门（Claude Code 长度门；Graphiti cap_string_attributes）；写后审计+人审退役（**Claude Code 2.1.283（09-25）`/doctor prompt-audit`**：审计 CLAUDE.md/skills/agents 里 stale 模式与矛盾指令，报告+建议改、人确认才动文件 [documented：changelog]）；**回放/受保护集回归门**（arXiv:2609.24130：触发案例改善 **且** 受保护集回归 ≤ margin 才晋升持久权；replay > forward trial；另有 corpus-level guard 全库重测） | 无门假成功（mem0 add() 修复前：向量库拒绝仍报成功）；**55% 提案「修好局部弄坏全局」**；阻塞式门被绕过（已知） | **能**：写时校验+draft→stable 人审已有；**写前自动 eval 门要新 seam**（pnpm eval 是 repo 级离线脚本，不在插件运行时） |
| ⑦ 晋升/退役 | 临时权限→持久权（provisional→persistent）；金丝雀+身份哈希不变量（arXiv:2605.28097 ICAN-Deploy）；审计驱动退役提案（prompt-audit，人确认）；corpus 重测 | 只增不减；自动 fold-in 回退（Claude Code /verify 史）；身份漂移使认证失效 | **能**：propose→land+人审退役已覆盖；影子/金丝雀自动晋升要新 seam（依赖⑥就位） |

**结构性结论**：五段现有 seam 可直接承载；三个「要新 seam」的候选（写前 eval 门、影子晋升、corpus 重测）指向**同一个缺口——把评测基线从 repo 级脚本搬进插件运行时**；外加一个可选的语义索引 seam。所有新证据（mem0 schema 画像、Letta 委托 worker、55% 回归数字、prompt-audit 人审退役）继续支持 R2 的收敛点：**半自动 + 人审门**。

## 6. 跟一个具体的人学：机制面与真空档

- 产品级机制现状：Claude Code auto memory 的四型 note（user/feedback/project/reference）是公开文档里最完整的「跟人学」最小实现（写时结构门 + 拉式人审 `/memory`）；mem0 User Profiles 把画像卡升级为**受 schema 约束、可整体重生成**的对象；Letta 用根 `persona.md`/`human.md` + git 仓库。ChatGPT memory 与 custom instructions 是两套机制（官方帮助中心标题级证据，全文 403 未核实）。
- **真空档**：LongMemEval/LoCoMo 测「记住用户的事实」，不测「学会像用户一样做事」；Delphi/Personal.ai 捕获静态人格+内容检索（对外回答）；**没有产品把「这个人怎么做事/怎么拆题」沉淀成受治理的可执行技能资产**（最接近：auto memory 的 feedback note、AWM/SkillWeaver 的 workflow 抽象）。本仓 draft→stable + propose→land 落在这个空位——数字分身定位的外部验证。
- 个性化维度的指标清单（供未来评测集参考）：偏好推断/记忆/遵从准确率；**主动**遵从（无人提示）；非理性个性化率；漂移适配（流式）；鲁棒性（投毒成功率 vs 真更新接受率）；设备端预算/延迟。

## 7. 亲验记录（委托方复核，2026-09-28）

承重主张逐条经本仓独立复核（web_fetch 一手 API），与代理报告一致：

| # | 主张 | 亲验途径 | 结果 |
|---|---|---|---|
| 1 | OpenViking 38,844★ / AGPL-3.0 / pushed 09-28 / topics 含 dsh-plugin | GitHub API repos/volcengine/OpenViking | ✅ 一致 |
| 2 | `@openviking/dsh-memory-plugin` 0.5.8 / Apache-2.0 / 4 维护者 / peer 含 `^0.1.7-rc.2` / dsh.bundle.patch | npm registry 包元数据 + 全文 README | ✅ 一致 |
| 3 | 本仓 persona 为 prefix 形态（不踩 `complete: true` 坑） | grep `packages/dsh-smart-assistant/cordis.patch.yml` | ✅ `prefix:`，无 complete 键 |
| 4 | awesome-dsh-plugin 条目 4377 | awesome-dsh-plugin.com/count.json | ✅ 一致 |
| 5 | skills-manager 134,865 dl/月 + peer 枚举 0.1.7-rc.2 + Apache-2.0 + OIDC | api.npmjs.org + registry /latest | ✅ 一致 |
| 6 | memento 0.5.18 显式列 0.1.7-rc.2 + dshWorkshop manifest 字段 | registry /latest | ✅ 一致 |
| 7 | evolution-core peer 钉 ^0.1.5-rc.2（不兼容 0.1.7） | registry /latest | ✅ 一致 |
| 8 | arXiv:2609.24130 存在且摘要含 211/383=55% 数字 | arxiv.org/abs/2609.24130 | ✅ 一致（2026-09-21 提交） |
| 9 | 腾讯 Agent Memory 27,386★ / TypeScript / pushed 09-25 / 855 open issues / license NOASSERTION / 四类资产自述 | GitHub API | ✅ 一致（默认分支 feat/server_team） |
| 10 | MemOS 官方 DSH 支持（description "DeepSeek Harness support" + topics dsh-plugin/deepseek-harness）+ 11,616★ / Apache-2.0 | GitHub API | ✅ 一致 |

## 8. 未核实项与局限（明示）

1. supermemory 融资额（仅媒体报道）；SMFS 对自托管 server 的支持；memory-review 等 v4 细分操作在本地 server 的逐项可用性；`./.supermemory` 确切文件格式（官方不描述，仅能由 release notes 推断为 pgvector 数据库）。
2. OpenViking：静态加密默认开关；**本地（Ollama+local-embed）模式下的实测抽取/检索质量**（官方基准全用云端 Doubao）——这是试点实验要回答的第一问。
3. 腾讯 Agent Memory 的 LICENSE 文件内容（README badge MIT 与 GitHub API NOASSERTION 不一致）；其「官方支持 DSH」的具体集成深度（协议代理的 DSH 侧文档未读）。
4. OpenClaw license 具体条款（GitHub API=Other/NOASSERTION）。
5. agent-body / dsh-recipe / awesome-deepseek-harness 的星数（GitHub API 对代理出口 IP 限流 403）。
6. awesome 全量新增清单未取全（commits 响应截断，仅 24 条样本）；shop-catalog 插件总数未核实（未下载 tgz）。
7. 「决策模式/拆题方式沉淀为可检索资产」的空白是**检索范围内未见**，不是存在性证明。
8. OpenAI/Anthropic 消费端记忆页全文被 403 阻断，相关细节未核实。

## 附：版本基线与来源清单（查证时点 2026-09-28）

| 包/仓 | 版本/读数 | 日期 | license |
|---|---|---|---|
| volcengine/OpenViking | 38,844★ | pushed 09-28 | AGPL-3.0 |
| openviking（PyPI） | 0.4.22 | 09-28 | AGPL-3.0（examples/CLI Apache-2.0） |
| @openviking/dsh-memory-plugin | 0.5.8 | 09-25 | Apache-2.0 |
| supermemoryai/supermemory | 30,965★ / server-v0.0.8 | push 09-25 / release 08-17 | MIT |
| dsh-supermemory | 0.1.2 | 09-06 | MIT |
| MemTensor/MemOS | 11,616★ | pushed 09-23 | Apache-2.0 |
| TencentCloud/TencentDB-Agent-Memory | 27,386★ | pushed 09-25 | NOASSERTION（待读 LICENSE） |
| mem0ai/mem0 | 66,162★ / v2.2.0 | pushed 09-25 / 09-23 | Apache-2.0 |
| letta-ai/letta | 24,934★ | pushed 09-10 | Apache-2.0 |
| getzep/graphiti | 31,242★ | pushed 09-27 | Apache-2.0 |
| vectorize-io/hindsight | 38,828★ | pushed 09-26 | MIT |
| openclaw/openclaw | 390,686★ | pushed 09-28 | Other/NOASSERTION |
| awesome-dsh-plugin/awesome-dsh-plugin | 17,101★ / 4377 条 | pushed 09-27 | — |
| dsh-plugin-shop-catalog | 2026.928.0 | builtAt 09-28 | — |
| @michengai/dsh-skills-manager | 1.1.4 / 134,865 dl | 09-25 | Apache-2.0 |
| dsh-memento | 0.5.18 / 123★ | 09-24 | Apache-2.0 |
| dsh-run2skill | 0.5.0-alpha.2 | 09-25 | — |
| @lmzhen/dsh-evolution-core | 0.14.0 | 09-28 | MIT |

主要一手来源：GitHub API（repos/releases/contributors）、npm registry 与 api.npmjs.org、awesome-dsh-plugin.com/count.json、PyPI、supermemory.ai/docs（self-hosting 系列、graph-memory、llms.txt）、docs.openviking.ai（concepts/01-architecture、05-storage、08-session、agent-integrations/17-dsh）、code.claude.com/docs（changelog、memory、skills）、arXiv（2609.24130、2602.22680、2502.09597、2601.16621、2605.18271、2609.02265、2609.25913、2606.01435、2605.28097、2512.12818）、blog.polyswarm.io（ClawHavoc）、hindsight.vectorize.io、dsh-memory-plugin npm README 全文。研究代理的完整原始交付物已并入本文相应小节；代理未落盘任何文件（research 技能的落盘步骤由本文件承担）。
