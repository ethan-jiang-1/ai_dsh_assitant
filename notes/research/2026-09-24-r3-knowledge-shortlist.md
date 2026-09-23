# R3 · 知识层/wiki 插件初筛（研究阶段，无定论）

日期：2026-09-24 · 状态：**初筛底稿——只过滤"值得深评"的候选，不做结论**
数据基线：`dsh-plugin-shop-catalog` v2026.923.1（2026-09-23 快照；wiki/知识类约 110 个）+ npm registry 直查（2026-09-24）
深评进行中：后台代理 → 落 `2026-09-24-r3-knowledge-layer-survey.md`

## 用户立场（本轮调研的定向输入）

用户偏向 **wiki 式知识结构**（互链、有机生长、人可编辑），并问 DSH 有无插件支持。
已查实 [affordance]：我们 pin 的 vendor/dsh（v0.1.5-rc.2）核心**无 wiki 插件**；但**插件市场
有 110 个 wiki/知识类**。另注：文件型 wiki（`[[互链]]` Markdown，Obsidian/Foam 路线）本质是
格式约定，无需插件也可用——插件的价值在工具面（读写/检索/校验）与 UI 面。

## 我们的现状对照

家没有"知识"房间：仓库知识靠人维护的 docs/notes + AGENTS.md 入口链；agent 的领域理解
散在记忆与技能里。R3 的核心问题：知识层要不要建、以什么形态（第四房间？research 房间
wiki 化？docs 惯例延伸？）。

## 过滤结果

### A. 值得深评（按与用户 wiki 偏好的契合度排）

| 候选 | 版本/更新 | 一句话 | 初筛判断 |
|---|---|---|---|
| `@dsh-enhanced/memory-wiki-bridge` | v0.1.40 / 09-23 | Memory↔Wiki 的 **provenance-stable promotion**（提案式、留溯源） | 与我们"三档出口"（promote/park/drop）设计思想撞车——是互补还是重复造轮，深评定；它把记忆与 wiki 当两个房间打通，正是我们 R1×R3 的交点 |
| `dsh-obsidian` | v0.2.5 / 09-12 | 接本地 Obsidian vault：search/read/write/move/trash 工具 | 纯文件 wiki（.md+互链）+ 成熟编辑器生态，最合用户偏好与"人可审"判据；深评它暴露的工具面与检索质量 |
| `@detpecca/dsh-llm-wiki` | 08-18 | LLM-Wiki 知识库：wiki_search/read/stats/**validate/fix**/errors 工具 | 有**校验/修复**动词——和我们 curate 的"机器养护"哲学同款；深评其 wiki 格式与断链检查 |
| `@deepseek-ai/dsh-client-ui-obsidian` | 08-31 [integration] | "Obsidian bridge plugin for DSH"（**挂在官方 scope 下**） | 官方 scope 出现社区仓库（gxpppp/dsh-obsidian）——真官方采纳还是 scope 借用？**深评第一问**（影响信任等级） |
| `dsh-palimpsest` | v0.1.2 / 09-13 | 从历史会话按需检索记忆 | 会话日志→知识的派生路线（也列在 R1）；知识层的"原料管道"候选 |

### B. 观察项（外围但有启发）

| 候选 | 备注 |
|---|---|
| `obsidian-dsh-acp` | 反方向：把 DSH 作为 agent 装进 Obsidian——若用户主要活在 Obsidian 里则是另一条产品路线，初判与"家"路线不同轴 |
| `@253071608/dsh-localnote` | "以后再说"的灵感定时孵化——是提醒工作流不是知识库，但"AI 替你想透"的机制对 knowledge 候选生成有启发 |

### C. 初筛淘汰（防重议）

- `@aiwayds/dsh-vault`——名字像知识 vault，**实为 dsh home 配置的加密备份/迁移**（GitHub 私仓通道），与知识层无关 [observed：目录摘要]
- 各类 notepad/notebook UI 插件——是随手记 UI 不是知识结构

## 未决问题（深评要回答的）

1. memory-wiki-bridge 的 wiki 半边是什么形态（文件？服务？）——决定与 dsh-obsidian 的关系（叠加/互斥）
2. dsh-obsidian 的 vault 检索靠什么（文件名？全文？互链图？）——agent 检索面质量
3. 官方 scope 的 `dsh-client-ui-obsidian` 成色（发布者/仓库/是否 DeepSeek 官方采纳）
4. `[[互链]]` 断链若做进我们 curate，谁提供链接解析（插件自带 or 我们自己 grep 就够）
5. 知识层的家形态：第四房间 vs research 房间 wiki 化——等三路调研齐后在提案里定
