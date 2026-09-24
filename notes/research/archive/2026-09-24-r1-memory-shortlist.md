# R1 · 记忆插件初筛（研究阶段，无定论）

日期：2026-09-24 · 状态：**已收卷（2026-09-24）——深评与结论在 [r1 survey §4-6](2026-09-24-r1-memory-ecosystem-survey.md)：supermemory 线三问已答、全候选池判据对照完毕，结论=维持自研（无候选构成换轨理由），被 tri-line 合流消化（D0）。本表 A 类候选的逐一深评不再单独立项：换轨结论已下，等真实使用触发再回看（⏳ 语义检索/FTS/共库已在 ROADMAP）**
数据基线：`dsh-plugin-shop-catalog` v2026.923.1（2026-09-23 快照，11,885 插件；记忆类约 390 个）+ npm registry 直查（2026-09-24）
**硬约束（用户拍板，2026-09-24）：纯本地使用，不用云**——一切依赖托管服务的方案只在"可完整自托管/离线"时才成立。
深评进行中：后台代理逐个拉仓库/README 按判据评估 → 落 `2026-09-24-r1-memory-ecosystem-survey.md`

## 用户问题回顾

用户点名找一个叫 "smart memory" 的插件。**已查实：全目录精确搜 "smart memory" 零匹配**
[observed：商店目录全量检索]；名字含 smart 的 17 个均为 smart-title/router/reminder 等
无关物。近似名存在于其他生态（OpenClaw 平台的 `@mrc2204/agent-smart-memo`、
`cogmemai-sdk` 自称 "smart memory layer"）[documented：npm registry]——大概率是名字记岔。

## 初筛判据（第一遍，按仓库既有决策）

文件优先（人可读/可 git/可手改，day-0 已否决 SQLite/向量库作自家核心）、DSH 原生形态、
与"家"三房间结构不冲突、近两周仍活跃。

## 过滤结果

### A. 值得深评（按契合度排）

| 候选 | 版本/更新 | 一句话 | 初筛判断 |
|---|---|---|---|
| **supermemory**（用户点名） | 本体 30,843★ MIT / 09-23 活跃 [observed：GitHub API] | 记忆与上下文引擎：事实抽取/矛盾处理/自动遗忘/用户画像/混合检索；**官方本地形态**（单二进制、零配置、数据全在 `./.supermemory`、可配 Ollama 完全离线）[documented：官方 README] | 三大记忆基准（LongMemEval/LoCoMo/ConvoMem）第一 [documented]；**本地形态满足硬约束**。张力：本地引擎是"embedded graph engine"——**存储非人可读文本**，与人可审判据有冲突；且市场现有 DSH 桥（下条）是云向的。深评三问：①桥能否指本地 baseURL ②`./.supermemory` 里是什么格式 ③license 覆盖面 |
| `dsh-supermemory`（现成 DSH 桥） | v0.1.2 / 09-06，MIT | "Persistent memory across DSH sessions using Supermemory. A native port of the Claude Code supermemory plugin"——会话启动注入画像、每轮注入召回、turn 结束自动固化、只读工具免审批 | 唯一依赖仅 schemastery [observed：registry]；**README 明写挂托管 MCP（云端）**——本地化可行性未载明，深评第一问；与 Claude Code 版"同容器同凭据同 wire 格式"意味着生态互通 |
| `@alanzhao/dsh-memory-lite` | v0.2.8 / 09-20 | **Markdown 文件**记忆库 + L0 目录注入 + 5 个模型工具 | 与我们"文件优先"哲学最贴；零依赖。重点深评 |
| `@a9i5k4/dsh-auto-memory` | v3.1.5 / 09-22 | 主动联想记忆：zero-prompt recall 注入、三层自动巩固、技能固化 | 市场最热（stars 文件示 75）；**存储形态未明**（初筛未及）——深评第一问 |
| `dsh-mnemosyne` | 09-19 | 本地优先、SQLite 支持的跨会话记忆（remember/recall/forget/stats/sleep） | 本地优先 ✅ 但 SQLite 存储与人可审有张力；看有无文件视图/导出 |
| `dsh-palimpsest` | v0.1.2 / 09-13 | 新会话按需检索**同工作目录历史会话**的记忆 | 角度不同：从会话日志派生记忆（我们自己的"跨会话复盘"延后项的生态对位）；正交可叠加 |
| `@dsh-enhanced/memory-wiki-bridge` | v0.1.40 / 09-23 | Memory↔Wiki 的 provenance-stable promotion | 与我们"三档出口"设计同构；主战场在 R3（知识线），记忆线只看它的 memory 半边 |
| `@agentscope-ai/reme-dsh-plugin` | v0.1.0 / 09-14 | ReMe（agentscope 生态）记忆集成 | 大厂生态桥；**ReMe 是否可自托管待查**（本地约束下先存疑） |

### B. 与既有决策冲突、但代表延后路径（记录不排除）

| 候选 | 冲突点 |
|---|---|
| `@achasoft/dsh-memory`（DuckDB 按项目记忆 + 管理 UI） | DuckDB 文件非人可读文本；但其"规则在每次模型请求上强制执行"的机制值得借鉴 |
| `dsh-context-milvus` / `@zilliz/dsh-milvus`（向量检索） | 向量库路线 = 我们"语义检索"延后项的现成实现；触发条件到了再回来 |

### C. 初筛淘汰（一句话理由）

- `@alanzhao/dsh-memory-lite` 之外各类 memory-lite 变体（`@chenhw7/dsh-memory` 等）——待深评代理横向比对后再定去留，初筛不展开
- `@agentframe/*` 套件（memory/compaction/scheduling 打包）——大杂烩形态，与家的单一职责结构冲突面大

## 未决问题（深评要回答的）

1. **supermemory 线（用户点名的重点）**：①`dsh-supermemory` 桥能否把 baseURL 指向本地
   `supermemory-server`（官方 SDK 支持 baseURL 覆盖，桥是否暴露此口）；②本地模式 `./.supermemory`
   目录的实际存储格式（graph engine ≠ 人可读文本——判据冲突的严重度）；③本地二进制的实际
   资源占用与依赖（embedding 默认 Xenova/bge 本地模型）。
2. 各候选的**实际存储形态**（文件？SQLite？注入方式？）——目录摘要不载明
3. 与我们 `assistant_memory` 工具面/家布局的**替换 vs 并存**关系（换工具名=断我们已验证的 I2/I8/I9 证据链）
4. `@a9i5k4/dsh-auto-memory` 的"zero-prompt 注入"与我们"有界摘要常驻"的上下文预算冲突
