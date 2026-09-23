# R1 · 记忆插件初筛（研究阶段，无定论）

日期：2026-09-24 · 状态：**初筛底稿——只过滤"值得深评"的候选，不做结论**
数据基线：`dsh-plugin-shop-catalog` v2026.923.1（2026-09-23 快照，11,885 插件；记忆类约 390 个）+ npm registry 直查（2026-09-24）
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
| `@alanzhao/dsh-memory-lite` | v0.2.8 / 09-20 | **Markdown 文件**记忆库 + L0 目录注入 + 5 个模型工具 | 与我们"文件优先"哲学最贴；零依赖。重点深评 |
| `@a9i5k4/dsh-auto-memory` | v3.1.5 / 09-22 | 主动联想记忆：zero-prompt recall 注入、三层自动巩固、技能固化 | 市场最热（stars 文件示 75）；**存储形态未明**（初筛未及）——深评第一问 |
| `dsh-mnemosyne` | 09-19 | 本地优先、SQLite 支持的跨会话记忆（remember/recall/forget/stats/sleep） | 本地优先 ✅ 但 SQLite 存储与人可审有张力；看有无文件视图/导出 |
| `dsh-palimpsest` | v0.1.2 / 09-13 | 新会话按需检索**同工作目录历史会话**的记忆 | 角度不同：从会话日志派生记忆（我们自己的"跨会话复盘"延后项的生态对位）；正交可叠加 |
| `@dsh-enhanced/memory-wiki-bridge` | v0.1.40 / 09-23 | Memory↔Wiki 的 provenance-stable promotion | 与我们"三档出口"设计同构；主战场在 R3（知识线），记忆线只看它的 memory 半边 |
| `@agentscope-ai/reme-dsh-plugin` | v0.1.0 / 09-14 | ReMe（agentscope 生态）记忆集成 | 大厂生态桥；评估 ReMe 本体形态与迁移成本 |

### B. 与既有决策冲突、但代表延后路径（记录不排除）

| 候选 | 冲突点 |
|---|---|
| `@achasoft/dsh-memory`（DuckDB 按项目记忆 + 管理 UI） | DuckDB 文件非人可读文本；但其"规则在每次模型请求上强制执行"的机制值得借鉴 |
| `dsh-context-milvus` / `@zilliz/dsh-milvus`（向量检索） | 向量库路线 = 我们"语义检索"延后项的现成实现；触发条件到了再回来 |

### C. 初筛淘汰（一句话理由）

- `@alanzhao/dsh-memory-lite` 之外各类 memory-lite 变体（`@chenhw7/dsh-memory` 等）——待深评代理横向比对后再定去留，初筛不展开
- `@agentframe/*` 套件（memory/compaction/scheduling 打包）——大杂烩形态，与家的单一职责结构冲突面大

## 未决问题（深评要回答的）

1. 各候选的**实际存储形态**（文件？SQLite？注入方式？）——目录摘要不载明
2. 与我们 `assistant_memory` 工具面/家布局的**替换 vs 并存**关系（换工具名=断我们已验证的 I2/I8/I9 证据链）
3. `@a9i5k4/dsh-auto-memory` 的"zero-prompt 注入"与我们"有界摘要常驻"的上下文预算冲突
