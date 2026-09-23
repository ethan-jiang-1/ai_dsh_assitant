# 2026-09-24 · R2：Agent 自主能力增长（技能成长）——技能框架设计空间与现有方案普查

> 委托方问题：`dsh-smart-assistant` 已 live 验证了一套最小自研基线（家的 `skills/` 房间 + SKILL.md 契约 + `assistant_reflect`（brief→save_skill）+ 第二个 `dsh-skill-filesystem` provider（`assistant-learned`）+ 双源遮蔽 + 按需加载；触发目前仅模型/人主动）。生态里有什么现成方案？路线选全自研进化 / 借规范借组件 / 直接采用？
>
> 本文按 `notes/research/README.md` 规范：一手引证、证据分级（[affordance]=源码/接口/包内容可指认；[documented]=官方文档载明；[observed]=社区观察或 API 查询，注明出处）、版本基线、承重结论内联自足。检索与验证基线日期：**2026-09-24**。

## 0. 结论速览

1. **SKILL.md 已从 Claude Code 私有格式升格为开放标准**（Agent Skills，agentskills.io，2025-12-18 发布，Anthropic 发起，Apache-2.0/CC-BY-4.0，多客户端采纳）——委托方格式同源这条资产的兼容面在升值，不是在贬值。[documented]
2. **产品侧的自主度共识收敛在"半自动：建议 + 人审门"**。全自动无人审只出现在研究线（Voyager 用环境验证替代人审）和记忆层（mem0/Letta 整理的是记忆不是行为技能）；Claude Code auto memory 无人审但载体是低风险偏好笔记且随时人改。委托方"自动 session-end 蒸馏延后"的纪律与生态收敛方向一致。[documented/affordance]
3. **头部产品都承认并工程化了同一个翻车模式：增量积累的经验会变脏**。Letta 官方承认 MemGPT 记忆"messy and disorganized over time"所以拆出 sleep-time agent；mem0 专门做了 Dream（合并/取代/退役）；Claude Code `/verify` 早期自动 fold-in 导致频繁 merge conflict 后改为"只在跑错时改"。治理不是可选项，是这条线的主体工作量。[documented]
4. **DSH 插件市场里"能力增长"已是活跃赛道**：商店目录 `dsh-plugin-shop-catalog@2026.923.1` 共 11,885 个插件，技能/记忆/演化相关数百个；其中 `@michengai/dsh-skills-manager`（65,098 dl/月、64 星）、`@lmzhen/dsh-evolution-*` 家族（core 43,524 dl/月）、`@a9i5k4/dsh-auto-memory`（9,045 dl/月）、`@wumihaze/dsh-mind`（7,094 dl/月）有真实用量。[affordance，npm 下载量 API 2026-09-24 查询]
5. **委托方已知缺口"学到技能被策展同名静默遮蔽"在 DSH 生态内同样无人解决**——普查到的所有技能治理插件（audit/stats/manager/catalog/gate）都做用量、审计、安装、看板，没有一个做"遮蔽可见性"。这是值得自研的小切口空白。[affordance]
6. **建议路线：借规范借组件**——坚持 Agent Skills 格式吃标准红利，治理三件套（用量统计→阈值退役→写后审计）借生态成熟形态在 DSH 组合内自建，触发演进一格到"建议+人审"（run2skill 形态），全自动蒸馏维持延后。理由见 §9。

## 1. 委托方判据（本文对照口径）

- **J1 错了赔得起吗**：技能是人可读文件（可 git/diff/手改/删）；学错的技能谁发现。
- **J2 错了多久能发现**：有没有机器检查；遮蔽/冲突是否可见。
- **J3 形态**：能否进 DSH 组合（cordis 插件）或作为规范/格式被借用（SKILL.md 兼容面很值钱）。
- **J4 信噪比**：常驻上下文占用有界；技能膨胀后怎么办。
- **J5 自主度谱系**：全自动（session-end 蒸馏）↔ 半自动（建议+人审）↔ 全手动（现状）；真实案例与翻车案例。
- **J6 维护**：license、活跃度、真实用户。

## 2. 设计空间坐标系

把生态里所有方案放进四个正交维度，坐标系本身就是普查结论：

- **载体形态**：prompt 规则（LangMem procedural=改 prompt；Letta core memory blocks）↔ **文件技能（SKILL.md 目录，渐进披露）** ↔ 代码技能（Voyager 可执行程序、SkillWeaver 合成 API）↔ 数据库记忆（mem0 向量+SQL、dsh-enhanced SQLite 规则库）↔ 工作流捕获（dsh-enhanced assistant-skills 录制 tool trace 重放）。
- **触发**：会话内自主（Claude auto memory 随时记；LangMem hot path）→ 批量边界/空闲检测（run2skill）→ 后台周期（Letta sleep-time、mem0 Dream Synthesis、dsh-mind curator cycle）→ 会话末钩子（Claude Code `SessionEnd` hook 机制存在但官方未内置蒸馏）→ 人/模型主动（委托方现状、garvel/dsh-reflect v0）。
- **验证门**：环境验证（Voyager：执行反馈+自验证才入库）→ evals 基线对比（Claude Code `claude plugin eval`、agentskills.io with/without 法）→ 写时校验（委托方 `validateSkillDraft`；lmzhen evolution-plan-validator）→ 写后审计（caesarloo skill-audit）→ 复核队列人审（garvel pending、run2skill 草稿收件箱、dsh-enhanced 审批卡）→ 无门（研究线多数）。
- **治理**：只增不减（Voyager ever-growing）→ 用量统计+人决策（skill-stats、/skill-doctor）→ 阈值自动归档（dsh-mind 30d/90d、auto-memory 90d）→ 后台合并/取代/退役（mem0 Dream、Letta sleep-time 重写、lmzhen curator/consolidate）→ 版本化+快照+回滚（dsh-enhanced CAS、michengai backup/rollback、dsh-mind snapshots、garvel `.bak`）。

**总表**（细节见后文各节；版本与日期均为 2026-09-24 查证值）：

| 方案 | 载体 | 触发 | 验证门 | 自主度 | 治理 | J6 真实用户 |
|---|---|---|---|---|---|---|
| Agent Skills 规范 + Claude Code | 文件 SKILL.md | 人写+agent 按需加载 | evals（官方工作流） | 记忆半自动（auto memory 无人审）、技能人写 | skillOverrides、/skill-doctor、compaction 预算 | 开放标准；多客户端 |
| LangMem（2025-02-18 发布） | prompt 规则 + store 条目 | hot path 工具 / background 整理 | 无内建 | 半自动 | namespaces | LangChain 官方，活跃 |
| Letta sleep-time（0.7.0，2025-04-21） | in-context memory blocks | 后台周期（频率可配） | 无内建 | 全自动（记忆层） | sleep-time agent 持续重写 | Letta 官方 |
| mem0 | 向量/SQL/图记忆 | add() 管线 + Dream 后台 | Memory Evaluation 页 | 半自动（整理自动，procedural 雏形） | ADD/UPDATE/DELETE/NOOP、Dream、Decay | 论文+平台，活跃 |
| Voyager（arXiv 2305.16291） | 可执行代码库 | 自动课程驱动 | **环境验证准入** | 全自动（研究） | 无退役（ever-growing） | 研究线 |
| ExpeL / Reflexion / AWM | 语言 insights / episodic buffer / workflow | 离线批量 / 试错内 / 在线即时 | 各异 | 研究线 | 弱 | 研究线 |
| dsh-run2skill 0.4.0 | 原生 SKILL.md | 批量边界+空闲+显式请求 | 查重+人审收件箱+改稿链 | **半自动（HITL）** | 不可变草稿版本链 | 1,603 dl/月 |
| @dsh-enhanced/assistant-evolution 0.1.42 | SQLite 规则库（guidance 以数据注入） | 评估账本投影 | 全链路审批+fail-closed | 半自动（owner 审批） | retire-then-adopt、基线业绩留任、CAS | 3,181 dl/月 |
| @lmzhen/dsh-evolution-* 0.8.0（25+ 包） | 演化管理的技能树 | 后台维护扫描 | plan-validator+threat 写时闸+approval 队列 | 半自动 | curator 生命周期、replay A/B、drift 信号 | core 43,524 dl/月 |
| @a9i5k4/dsh-auto-memory 3.1.7 | 记忆+技能（三档注入） | host 侧持续观察+定时整理 | 写闸+recall review 打分+Memory Hub 审批 | 半自动（结晶需人审） | 90 天未用自动归档、pin | 9,045 dl/月 |
| @wumihaze/dsh-mind 0.2.2 | MEMORY.md+经验库+技能目录 | 事件提醒+策展周期 | 无 | 半自动 | 用量追踪、30d/90d 自动归档、快照回滚 | 7,094 dl/月 |
| @garvel/dsh-reflect 0.0.1-spike.22 | markdown 记忆文件 | 模型主动（v0 不自动） | 凭据硬闸+pending 复核队列 | 全手动（自动蒸馏显式延后） | 整表重写前 .bak、溯源指针 | 89 dl/月（spike） |
| @caesarloo/dsh-skill-audit 0.2.3 | —（治理插件） | 技能文件变更即审计 | 写后审计引擎 | — | frontmatter/引用/凭据/危险命令检查 | 286 dl/月 |
| @michengai/dsh-skills-manager 1.1.0 | —（管理插件） | 人操作 | — | — | 安装/更新/备份/回滚/Trash、跨工具复用 | 65,098 dl/月、64 星 |

## 3. Anthropic / Claude Code：Agent Skills 体系（委托方格式的同源上游）

### 3.1 开放规范（agentskills.io）

- Agent Skills 于 2025-10-16 随 Anthropic 工程博客发布，**2025-12-18 更新为开放标准**（原文："We've published Agent Skills as an open standard for cross-platform portability"），规范仓库 `agentskills/agentskills`（代码 Apache-2.0、文档 CC-BY-4.0），"originally developed by Anthropic, released as an open standard, and has been adopted by a growing number of agent products"。[documented] https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills ；https://agentskills.io/home ；https://github.com/agentskills/agentskills
- **规范字段（specification 页，2026-09-24 查证）**：`name`（必填，≤64 字符，小写字母数字连字符）、`description`（必填，≤1024 字符）、`license`（可选）、`compatibility`（可选，≤500 字符）、`metadata`（可选，string→string 任意映射）、`allowed-tools`（可选，实验性）。可选目录 `scripts/ references/ assets/`。加载模型为**渐进披露三阶段**：Discovery（启动只装 name+description）→ Activation（任务匹配才读全文）→ Execution（按需执行捆绑代码/读引用文件）。规范还有 Validation 一节（字段校验）。[documented] https://agentskills.io/specification
- 兼容面的实证：Claude Code 文档自述"follow the Agent Skills open standard, which works across multiple AI tools"；Snyk（2026）称规范"adopted by Claude Code, Cursor, GitHub Copilot, and numerous other tools"；`agentskills.io/clients` 有官方 Client Showcase 页。[documented/observed] https://code.claude.com/docs/en/skills ；https://snyk.io/articles/skill-md-shell-access/
- **对委托方的含义**：基线的 frontmatter（name/description/whenToUse/metadata.origin/source/learnedAt）与规范六字段高度对齐——`metadata` 正是规范预留的自定义通道，provenance 盖章走的是标准路径而非私货；`whenToUse` 是 Claude Code 扩展字段（规范里并进 description），`license`/`compatibility` 未使用。吃标准红利只需小步（见 §9.3）。[affordance：`packages/dsh-smart-assistant/src/skills/skill-file.ts` 对照 spec]

### 3.2 Claude Code 实现（文档基线：v2.1.x 系列，2026-09-24 查证，文中引用版本至 v2.1.280）

- **层级与同名遮蔽**：enterprise → personal → project 三层，同名时"Enterprise over personal, and personal over project"，模型侧静默裁决但**人类侧有完整文档表**；nested 目录同名则两个都可用（目录限定名区分）；plugin 技能一律加命名空间（`/plugin-name:skill-name`）避免遮蔽。DSH 的对应机制是 rank+layer（project-dsh 100 > project-agents 200 > custom 300 > user-dsh 400 > user-agents 500 > bundled 600；最近 layer 赢，层内 rank→provider 注册序→local order）。[documented] https://code.claude.com/docs/en/skills ；[affordance] `vendor/dsh/docs/subsystems/skills.md`
- **渐进披露的常驻成本**：description+when_to_use 在技能列表中截断至 1,536 字符；SKILL.md 正文建议 ≤500 行；压缩（compaction）后重挂最近一次调用的技能，每技能保留前 5,000 token、合计 25,000 token 预算，从最近调用者优先填充。DSSH 对应：目录只含 name+description（`catalogDescriptionMaxLength` 默认 500），正文经 `skill` 工具加载。[documented] 同上；[affordance] `vendor/dsh/docs/subsystems/skills.md`
- **变更即热加载**（live change detection）：编辑/增删技能目录当前会话内生效，无需重启。DSH 原生 provider 同样有 chokidar watch + `skills/change` 失效事件，委托方基线挂载时显式 `watch: true`。[documented/affordance] 同上；`packages/dsh-smart-assistant/src/learn/index.ts`
- **技能可见性治理**：`skillOverrides` 设置四态（on / name-only / user-invocable-only / off）；frontmatter `disable-model-invocation` / `user-invocable` 双向控制谁能调用——DSH 的 `SkillInvocationPolicy` 读的就是同名的两个 kebab-case 键，字段级兼容。[documented/affordance] 同上

### 3.3 Claude Code 的两条已产品化学习回路

1. **运行配方记录（self-teaching `/run`/`/verify`）**：`/run-skill-generator` "captures what worked (the install commands, the env vars, the launch script), and commits it as a per-project skill at `.claude/skills/run-<name>/`"；`/verify` 失败时把有效步骤写进 `.claude/skills/verify/SKILL.md`（v2.1.200+），"so later runs and other agents follow the same steps"。**翻车案例（文档载明）**："Before v2.1.205, the bundled skill told Claude to fold in anything a run learned, which caused frequent merge conflicts"——修复为"Claude edits the recorded file only when it steered a run wrong"。这是全自动经验落盘在最受控场景（构建配方）里的一次真实回退。[documented] https://code.claude.com/docs/en/skills
2. **auto memory（agent 自写记忆）**：Claude 自己基于纠正与偏好写四类笔记（`user/feedback/project/reference`，frontmatter `type` 区分），每仓库一个 `~/.claude/projects/<project>/memory/` 目录，`MEMORY.md` 索引 + 主题文件；索引只加载前 200 行/25KB，超限则 Claude Code **报错要求重写索引**（"one line per entry, move detail into topic files, and merge or drop stale entries"——信噪比是硬预算而非建议）；主题文件按需读取；写入时自动盖 `modified` ISO 时间戳（v2.1.214+）；默认开启、可关；**去重规则内建**（"skips anything your CLAUDE.md files already say"、可从代码推导的不记）；不每会话必写（"Claude doesn't save something every session"）；文档未描述任何审批步骤——人审面是事后的 `/memory` 浏览与编辑（"Everything is plain markdown you can read, edit, or delete"）。子代理可有独立 auto memory。[documented] https://code.claude.com/docs/en/memory

### 3.4 官方评测与治理工作流

- **技能要测"有没有用"，不只是"有没有触发"**：官方方法为 with/without 基线对比（fresh session 各跑一遍再比较）；`claude plugin eval` 对插件内技能跑隔离会话、grader 打分、低于阈值退出非零（可上 CI 门禁）；单技能迭代用 skill-creator 插件的 `evals/evals.json` 格式。开放标准侧同构：agentskills.io《Evaluating skill output quality》规定 `evals/evals.json` 放技能目录内（prompt + expected_output + files），工作区 `iteration-N/eval-*/with_skill|without_skill/` 结构、`grading.json/timing.json/benchmark.json`，且明确"Reviewing results with a human"是循环的一环。[documented] https://code.claude.com/docs/en/skills ；https://agentskills.io/skill-creation/evaluating-skills
- **技能膨胀的官方答案**：`/skill-doctor`（v2.1.252+）报告"what each of your skills costs and how often it gets used, so you can decide which ones to turn off"，列出从未被调用的技能并按上下文成本排序——用量统计驱动人做退役决策（注意：是报告不是自动退役）。[documented] https://code.claude.com/docs/en/skills

### 3.5 Anthropic 对"agent 自写技能"的立场

工程博客结尾原话："Looking further ahead, we hope to enable agents to create, edit, and evaluate Skills on their own, letting them codify their own patterns of behavior into reusable capabilities."——**愿景明确、未出货**。当前官方形态止于"iterate with Claude"（人主导、让 Claude 把成功做法收进技能）。[documented] https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills

### 3.6 安全面：技能生态的第一次供应链事故（反面教材）

Snyk 威胁建模文章（2026 年，Liran Tal）载明：2026-01-27~29，OpenClaw 社区技能市场 ClawHub 审计 2,857 个技能，发现 **341 个恶意技能（约 12%）**，主战役 ClawHavoc 投递 macOS 窃密木马 AMOS；攻击者**专门污染记忆文件 `SOUL.md`/`MEMORY.md`**，造成跨会话持久的"记忆投毒"后门；利用技能目录的三层遮蔽（workspace > managed > bundled）做**影子替换**；生态"无密码学签名"，官方指引只有"treat third-party skills as trusted code. Read them before enabling"；ClawHub 事后才上 3+ 举报自动隐藏。文中引 Simon Willison 的"lethal trifecta"（私密数据访问 + 不可信内容暴露 + 对外通信）说明 agent 场景的结构性风险。[observed（Snyk 载明，事实部分为安全审计转述）] https://snyk.io/articles/skill-md-shell-access/
**对委托方的含义**：学到技能目前是纯文本 body、不携带可执行面（无 allowed-tools/脚本/hooks），相对 ClawHavoc 攻击面是结构优势；但"技能会改行为、记忆会跨会话生效"意味着**写入面必须保持可审计**——这是 J1/J2 的安全版本。

## 4. 通用框架与研究线

### 4.1 LangChain / LangGraph：LangMem SDK

- 发布于 2025-02-18；三类记忆中**procedural memory 的实现形态是"把学到的程序写回 agent 的 prompt"**（原文："In LangMem, we focus on saving learned procedures as updated instructions in the agent's prompt"），工具为 `create_prompt_optimizer`（算法：metaprompt / gradient / prompt_memory），基于成功/失败轨迹反思后改写指令——是"改 prompt"流派，不是文件技能流派。[documented] https://www.langchain.com/blog/langmem-sdk-launch
- 触发面双轨制：**hot path**（会话中模型用 `create_manage_memory_tool`/`create_search_memory_tool` 自己记）与 **background**（"Background memory manager that automatically extracts, consolidates, and updates agent knowledge"，可延迟处理）；存储走 LangGraph BaseStore，namespace 隔离。[documented] https://langchain-ai.github.io/langmem/
- **与委托方形态不合**：产物是 prompt 片段与 store 条目，非 SKILL.md 文件；作为 cordis 组件不可移植（Python SDK）。判 J3：只能借思想（hot/warm 双轨、namespace）。LangChain 站点另有产品化"Agent Improvement: Engine — Improve agents autonomously"（LangSmith），属托管服务。[documented] https://www.langchain.com/langsmith-engine

### 4.2 Letta / MemGPT：sleep-time compute

- Letta 0.7.0（2025-04-21）引入 sleep-time-enabled agents：**双 agent 结构**——主 agent 能对话、调工具、查外部记忆，但**不给核心记忆（in-context memory blocks）的编辑工具**；sleep-time agent 独占记忆编辑权，管理双方记忆。动机原文（承认翻车模式）："Memory formation in MemGPT is incremental, so **memories may become messy and disorganized over time**. Sleep-time agents on the other hand can continuously improve their learned context to generate clean, concise, and detailed memories."运行可配频率（越高 token 越多）、主/睡双 agent 可用不同模型（睡侧可用更强模型，因为不受延迟约束）。论文 arXiv:2504.13171 主张 Pareto 改善（算力从交互时移到空闲时）。[documented] https://www.letta.com/blog/sleep-time-compute
- **治理启示**：把"记忆改写权"从对话 agent 手里拆出去给专职异步 agent，是对"增量记忆变脏"的架构级回答——但载体仍是记忆块，无技能层、无 evals。判 J3：不可移植（Letta 自有 stateful 运行时）；J4：memory blocks 常驻 in-context，靠 sleep-time 持续修剪。真实用户：Letta 官方产品线，活跃。

### 4.3 mem0

- 管线：`add()` 触发**提取阶段**（ADD-only 提取→去重嵌入→实体链接，写入 SQL+向量库），检索走 `search()`；平台版算法 v3（见迁移页 platform-v2-to-v3）。[documented] https://docs.mem0.ai/core-concepts/how-it-works
- **治理是其差异化卖点**：平台功能 **Dream**——"keeps a user's memory clean over time by distilling recurring patterns, retiring outdated facts, and merging duplicates in the background"，三动作：Synthesis（后台定时）、Supersede & Merge（随 add 触发）；另有 Memory Decay（衰减）。这去重/合并/退役三件事在 mem0 是产品级自动化的。[documented] https://docs.mem0.ai/platform/features/dream
- **技能层现状要如实**：`memory_type` 枚举有三种，**只有 `procedural_memory` 实现**（且仅 Python OSS、需 agent_id；Platform 客户端与 TS SDK 均无），semantic/episodic"defined in the enum but never read anywhere else in the codebase"，传入即校验报错——官方文档原话直说"so you don't build against a type that doesn't exist yet"。[documented] https://docs.mem0.ai/core-concepts/memory-types
- 论文（arXiv:2504.19413，2025-04-28）：LOCOMO 上比 OpenAI 记忆方案 +26%（LLM-as-Judge），p95 延迟 -91%、token 成本省 >90%。[documented] https://arxiv.org/abs/2504.19413
- 判 J3：OSS 是 Python 包+托管平台，进不了 cordis 组合；procedural 层与委托方需求对位但形态是 DB 记忆非文件。判 J5：蒸馏全自动、无人审门（治理是机器治理不是人审）。

### 4.4 研究线（方法谱系的源头）

- **Voyager**（arXiv:2305.16291，2023-05，v2 2023-10）：Minecraft 终身学习 agent；**技能=可执行代码**存 ever-growing skill library，检索走 embedding；新程序经"iterative prompting 机制"纳入**环境反馈、执行错误、自验证**迭代改进后才入库——**环境验证替代人审**是全自动流派的关键机制；技能可组合、可迁移到新世界。无去重/退役（ever-growing 是特性也是隐忧）。[documented] https://arxiv.org/abs/2305.16291
- **Reflexion**（arXiv:2303.11366，2023-03，v4 2023-10）：失败后语言自反思，反思文本进 **episodic memory buffer** 指导下轮试错（HumanEval 91%）——触发在"试错失败后"，载体是会话内缓冲，不跨任务沉淀。[documented] https://arxiv.org/abs/2303.11366
- **ExpeL**（arXiv:2308.10144，AAAI-24，v3 2024-12）：**离线阶段**从训练任务轨迹自主采集经验，提炼自然语言 insights + 保留成功 exemplar，推理时召回——最接近"session-end 批量蒸馏→规则"的研究原型；性能随经验单调提升。[documented] https://arxiv.org/abs/2308.10144
- **Agent Workflow Memory**（arXiv:2409.07429，2024-09）：从轨迹归纳可复用 workflow，**offline（训练样例）与 online（测试查询即时）双模式**；Mind2Web +24.6% / WebArena +51.1% 相对成功率。[documented] https://arxiv.org/abs/2409.07429
- **SkillWeaver**（arXiv:2504.07079，2025-04）：web agent 自主发现技能、练习执行、**蒸馏练习经验为 API**；强 agent 合成的 API 传给弱 agent 最高 +54.3%（WebArena）——技能作为可迁移资产的最新证据。[documented] https://arxiv.org/abs/2504.07079
- **Agentic Context Management**（2026-07 两篇）：arXiv:2607.23809 给 agent 配**上下文编辑工具**做无损管理（压缩决策自主化、弃置内容落外部存储、按需取回）+ 后训练管线；arXiv:2607.21503 把"上下文管理"立为生命周期学科（architecting/ingesting/scoping/anticipating/compacting 五原语），主张朴素累积 token 成本二次增长、粗摘要换线性成本但精度悬崖、只有"验证过的压缩"兼得。对技能库膨胀治理有直接理论参照。[documented] https://arxiv.org/abs/2607.23809 ；https://arxiv.org/abs/2607.21503

## 5. DSH 插件市场：能力增长生态（一手普查）

### 5.1 市场概况

商店目录包 `dsh-plugin-shop-catalog@2026.923.1`（2026-09-23 快照）收录 **11,885 个插件**，条目含 name/version/repository/license/peers/size/tier；星数在 `stars.*.json`（键为 npm 名或 GitHub owner/repo）。技能/记忆/演化/学习相关按名匹配即有 481 个。[affordance] https://registry.npmjs.org/dsh-plugin-shop-catalog/-/dsh-plugin-shop-catalog-2026.923.1.tgz（`package/v1/plugins.*.json`）

### 5.2 学习回路类（深评）

**dsh-run2skill 0.4.0**（MIT，repo qkycir-123/dsh-run2skill，2026-09-06 发布，1,603 dl/月，星数快照无记录）——与委托方基线**最直接对位**的方案：
- 定位原话："把你在 DSH 里明确教给 Agent 的纠正、约束和工作流，整理成可审核、可复用的原生 Skill"；"**你点头，它才落盘**"；keywords 自标 `human-in-the-loop`。
- 触发：每轮只做**低成本记录**（不每轮调模型复盘），到"有界批次边界、会话空闲、或你明确请求保存"才跑一次**批量检测**；检测到可复用经验才进入查重与草稿生成。**只学显式表达的东西**（纠正/长期约束/工作流/显式保存请求），"不会因为 Agent 偶尔成功一次，就自作主张地把所有操作写成永久规则"。
- 人审门：草稿进设置页**待审收件箱**（来源、过滤后的会话证据、保存范围、完整 SKILL.md）；可写 ≤2048 字节修改意见要求重生成——新草稿是**不可变新版本**（保留父子关系、旧批准失效）；确认后才写入 DSH 默认技能目录（PROJECT/USER 范围；改过存储目录则安全停止不猜测）。查重、审核、发布安全门不可绕过。
- 产物即普通原生 Skill，卸载插件后仍可用；本地优先（不存密钥、只送筛选/截断/脱敏后内容）；自动学习可关（关后显式"保存为 Skill"仍可用）。
- 兼容性：0.4.0 针对 DSH Web `0.1.2-rc.1`（旧 DSH 0.1.1-rc.2 用 0.3.1）——**未见对委托方所 pin 的 0.1.5-rc.2 的适配声明**，直接组合需验证。
[affordance] 包 README（registry tarball 2026-09-24 下载核读）
**判 J5**：这是"半自动（建议+人审）"在 DSH 内的完整实现，含查重与改稿链——委托方基线相对它缺的恰好是"入口查重 + 收件箱 + 不可变草稿版本链"。

**@dsh-enhanced/assistant-evolution 0.1.42**（MIT，repo 22-ai-00/dsh-enhanced，2026-09-23 发布，3,181 dl/月，星数快照无记录；依赖同家族 policy/evaluation 等十个包）——审批门控**行为规则**自演化：
- 载体不是 SKILL.md，是 SQLite 规则库：规则=guidance，**以数据形式注入为顾问性上下文**（"assistant-policy 从不读取规则表"、规则只改"怎么做"不改"允许做什么"）。
- 闭环：评估账本的可信客观结果 → 计算候选（样本不足保持沉默）→ 提案 → owner 批准 → 提交规则 → 注入。**结构性边界（README 称"有测试守护"）**：服务没有 `decideProposal`（不能自我批准）；行为改变强制 **retire-then-adopt 两步各自审批**（不允许原地改写，防旧批准悄悄覆盖新内容）；同一 scope+situation 至多一条 active 规则（唯一索引）；规则凭业绩留任（adopt 记录基线失败率，post-adoption 可信归因结果劣于基线才成 retire 候选）；自动回滚默认关闭且双重 opt-in + 证据门控（minSample/retireFailureRate），只能撤不能立；处处 fail-closed。
- 同家族相关包：`assistant-skills`（**验证过的 Goal 工作流捕获为版本化技能**：≤32 次成功调用/256KiB 参数、CAS 版本化、只 latest 可跑、retire 不复活旧版、save/run/retire 均需 policy 预算+当前真人请求）；`assistant-growth-experiments`（**默认 `promotionMode: 'propose-only'` 停在 approved-paused**；显式开 full 才走 重放→效果阻断影子→至多一次生产金丝雀→trusted+achieved 评估→CAS 提升，否则回滚）；`assistant-evaluation`（append-only 结果账本）。
[affordance] 各包 README（registry tarball 2026-09-24 下载核读）
**判 J5/J6**：这是全谱系里审批工程最重的一家（基本是"能力增长 = 治理优先"的极端形态）；下载量真实但社区验证薄（星数无记录）。载体与委托方不同（规则库 vs 文件技能），不可直接替换，但**"retire-then-adopt 不许原地改写"与"凭基线业绩留任"两个治理语义值得借**。

**@lmzhen/dsh-evolution-\* 家族 0.8.0**（npm 25+ 包：core/io/host/approval/state/policy/activity/replay/review/commands/feedback/threat/curator/maintenance/plan-validator/skill-catalog/learning-graph/all 等，"Hermes-style self-evolution (community build)"；core 43,524 dl/月、all 8,474 dl/月；**未见于 2026.923.1 商店快照**，npm 直装）：
- 分包即设计：`evolution-curator`=确定性技能生命周期与恢复；`evolution-threat`=**写时威胁闸**；`evolution-plan-validator`=**对模型产出的演化计划做确定性校验**；`evolution-approval`=pending 审批服务；`evolution-review`=后台评审编排；`evolution-replay`=重放/A-B 评估原语；`evolution-maintenance`=维护扫描（技能库快照组装、**drift 漂移信号**、机械事实复核）；`evolution-skill-catalog`=把演化管理的技能树挂成**原生 ctx.skills provider**（与委托方"第二个 provider"同一 seam）；人用命令 `/evolution pending|curator|maintain|doctor`。
- core 是纯库（SkillLibrary/MemoryStore + prompts + threat/quality/drift 信号 + IO 原语），技能文件**读-改-写整链串行化**（进程内 serial queue + 跨进程 transact 锁），archive/consolidate 为 rename 两阶段带尽力回滚；并发残留窗口**在 README 里如实登记**而非掩盖。[affordance] https://registry.npmjs.org/-/v1/search?text=dsh-evolution ；evolution-core 包 README
**判 J3/J6**：这是"能力增长的全套治理组件库"——若走借组件路线，threat/plan-validator/curator 是生态里唯一成体系的可拆件；但 25+ 包的碎片化与 0.8.0 的社区构建成熟度需要评估，文档密度高、星数无记录。

**@a9i5k4/dsh-auto-memory 3.1.7**（BSD-3-Clause，repo Aik358/dsh-auto-memory，2026-09-23 发布，9,045 dl/月，README 677 行、宣传密度高，机制以 README/文档为准）：
- 记忆主轴：host 侧联想中间件——**不依赖模型"记得去查"**，持续观察上下文与运行事件，在模型开口前把相关记忆注入下一轮；注入在固定边界做以**不破前缀缓存**（"tokens never pay twice for a memory"）；写闸（乱码/口吃/JSON 注入阻断）+ 脏 token 扫描 + 凭据不进 prompt；recall review 页**对每次激活打分**（把检索质量变成可审计数据）。
- 技能固化（与 R2 直接相关）："after watching your corrections a few times, or repeating similar work, a workflow **crystallizes into a skill**"；注入三档（全文步骤/摘录/提示），高风险场景自动降级为提示；**技能按跨会话证据渐进晋升，在 Memory Hub 页人审批准**；**90 天未用自动归档**，重要可 pin，常用保温。
- 其他：≤8 次/天、30 分钟冷却的自动整理；30 天以上日志 AI 蒸馏进项目笔记（原文归档兜底，"not a single character lost"）；每日 reflection 层；外部记忆继承（Claude Code/Codex 等）。[affordance] 包 README
**判 J5**：又一个"半自动"样本——结晶晋升要人审、退役用阈值自动化；对 J4 的三档注入降级是生态里对"技能信噪比"最细的工程。

**@wumihaze/dsh-mind 0.2.2**（2026-09-12 发布，7,094 dl/月，未见于商店快照）：
- 三层记忆划分（AGENTS.md 常驻指令 / MEMORY.md 便签 2200 字符预算 + pin 每轮注入 / 经验库主题文档按需检索）——与 Claude Code 的 CLAUDE.md/auto memory/主题文件三层同构。
- 技能治理面：`skill_manage` 工具（create/patch/delete on `~/.dsh/skills/`）、**用量追踪**、**自动策展：30 天未用→stale、90 天→archived**、快照+回滚、`dsh-mind run` 启发式策展周期、curator console GUI；可选语义检索（bge-m3+Qdrant，默认关，只出向量不出文本）。[affordance] 包 README
**判 J2/J4**：对委托方缺口"退役机制"的最轻量实现样本（阈值归档+快照回滚），形态可直接借。

**@garvel/dsh-reflect 0.0.1-spike.22**（MIT，repo RGarvel/dsh_evo，2026-09-03 发布，89 dl/月，自标 spike）：
- 与委托方基线**哲学最近**：文件级外部记忆四工具——`reflect_record`（归一化文本去重；**先过凭据筛查硬闸**，命中即拒且不回显）、`reflect_consolidate`（模型驱动整表重写，重写前自动 `.bak` 时间戳备份）、`reflect_pending`（**复核队列：候选不参与任何 prompt 组装，批准才落 memory.md**，每条带 `@src:session-<id>@<seq>` 溯源指针）、`/reflect-review` 人用命令（不经模型）。
- **v0 边界与委托方纪律同构**："不自动触发：沉淀/整理由模型按注入规约主动调用"；"复核队列已经就位但**没有生产者**——自动蒸馏是下一步"；"不读会话历史"，但零件清单已点名：`sessionQuery`（listSessions/filterEvents/searchEvents）+ `llm.stream` 单发提炼 + `ctx.timer` 去抖——**"缺的是策略与安全门"**。109 项测试断言 + 如实登记的实机翻车记录（render 签名错位、`.d.ts` 误判）。[affordance] 包 README
**判 J5**：DSH 内"session-end 自动蒸馏延后、先把审批队列和安全闸立好"的先行样本；其自动蒸馏设计文档（garvel 包内 docs/auto-distill-design.md）对委托方的延后项是直接参照。

### 5.3 治理与管理类（J2/J4 的生态答案）

- **@caesarloo/dsh-skill-audit 0.2.3**（MIT，286 dl/月）：**技能文件一变就审计**（host 层 tools/post-execute）：frontmatter 契约（name/description/whenToUse/version）、脚本可用性（UTF-8 BOM + PowerShell 5.1 可解析——Windows 倾向）、SKILL.md 引用完整性、凭据泄漏、机器特定路径、危险命令模式；fail/warn 才注入上下文、**从不阻断**（"文件已写，把问题呈给模型才是对的"）、clean 静默只记日志（留 40 份）；按调用形状识别批量 restore/backup 触发全量审计；**显式处理 DSH 层级遮蔽**——运行时注册技能会遮蔽用户层同名技能（DSH rank：project > runtime > user），所以它只在用户技能根没有完整 skill-audit 技能时才注册。[affordance] 包 README
- **@dsh-external/dsh-skill-stats**（git 分发 chen-zz20/dsh-skill-stats，社区镜像 omdsh-dev，星数 0）：**技能调用统计**——历史回放（扫 `session.jsonl`/`.zstd` 解析 tool/call）+ 实时订阅双通道；累计调用数、使用会话数、首末调用时间、逐次明细、趋势图、1/3/7/30 天筛选；已删除技能标记"已删除"；增量缓存重启只重放变化日志；**只读、不改任何日志或技能文件**——"帮助判断哪些技能值得保留"。这就是 DSH 版 `/skill-doctor`。[affordance] https://github.com/chen-zz20/dsh-skill-stats README
- **@bryan-cmf/dsh-skill-gate / dsh-skill-trail**（MIT，均已归档，README 自注 **superseded by `@bryan-cmf/dsh-skill-ledger`**）：gate=技能触发/选择闸（`tools/execute` waterfall 拦截，弹原生选择 UI 让用户选技能，10 秒不选回退系统默认）——**阻塞式门被废弃**，后继 ledger 改为**非阻塞的替代技能提示行**（多选 chips→prompt 草稿→人按回车）；trail=每条回复下如实标注触发/成功使用了什么技能与工具——徽章**由 session log 折叠产出，零模型自报**（"Structural — the platform records, nobody self-reports"）。[affordance] 两仓库 README（raw.githubusercontent.com 2026-09-24）
- **@michengai/dsh-skills-manager 1.1.0**（Apache-2.0，64 星，65,098 dl/月——本赛道用量之最）：技能管理 GUI——浏览/搜索/启停；**复用 Codex、Claude Code、Copilot 的现有技能库而不改其源文件**（SKILL.md 生态互操作的实证）；从 GitHub 技能仓库安装（不覆盖本地）、更新预览、备份/回滚、**Trash 优先删除**（误删可恢复）；本地编辑保护；明确测试过 DSH `0.1.0-rc.8`…`0.1.7-alpha.1`（**含委托方 pin 的 0.1.5-rc.2**）。[affordance] 包 README
- **@ctl456/dsh-skills-manager 0.2.0**（MIT，523 dl/月）：经单一 `ctx.skills` provider 管理技能（与原生 filesystem provider 同 seam），增删改启停**免重启**，GitHub/ZIP 导入可选装；要求 DSH `0.1.5-rc.2` 或兼容。[affordance] 包 README
- **@dachengge/dsh-skill-catalog 0.1.1**（Apache-2.0，290 dl/月）：技能目录看板（Settings 面板 + `/skills` 全页）：用途/触发词/边界（when-not-to-use）/正文骨架（2600 字符截断）/关联模型/**验证级别 V0–V3 及记录证据**/长度指标与目录注入超限提示。[affordance] 包 README
- 其他目录条目（未深评，仅登记存在）：`dsh-evolution-lab` 0.3.1（"Proof-carrying Skill self-evolution"）、`@cocofhu/skillhub`（SkillHub 技能市场搜索/安装，6 星）、`@cnzgray/dsh-claude-auto-memory`（把 Claude Code 的 `MEMORY.md` 桥接进 DSH——跨工具记忆互操作样本）、`@deepseek-ai/dsh-plugin-memory`（5 层持久记忆，4 星）、`@dennisrongo/dsh-skills`（技能库整个作为 npm 依赖分发）。[affordance] 商店目录条目

### 5.4 生态空白：遮蔽可见性

普查结论：**没有任何一个 DSH 插件做"学到技能被策展同名遮蔽且静默"的可见性**。治理插件全在做用量（stats）、审计（audit）、安装管理（michengai/ctl456）、看板（dachengge）、触发选择（gate/ledger）；caesarloo 甚至在防止"自己遮蔽用户的技能"（运行时注册 vs 用户层），但**被遮蔽方的报告无人做**。外部参照也只有 Claude Code 的"人类侧文档表 + skillOverrides 开关"，模型侧同样静默。委托方已知限制在生态内是**公认但无人填的缺口**。[affordance：商店目录 481 个名字匹配条目逐一过目 + 上述深评]

## 6. 自动复盘/蒸馏管线对照（J5 的核心证据）

| 方案 | 触发时机 | 验证方式 | 人审门 | 备注 |
|---|---|---|---|---|
| Claude Code auto memory | 会话中随时（模型自判"值不值得记"） | 无机器验证；跳过可推导/CLAUDE.md 已有内容（去重规则） | **无**（事后 /memory 浏览编辑） | 载体低风险（偏好笔记），200 行/25KB 硬预算 [documented] |
| Claude Code `/run`/`/verify` 配方 | 构建失败/显式请求 | 实际跑通即证据（环境验证） | 无（落 repo，人 git 审） | 早期自动 fold-in 翻车→改为只在跑错时改 [documented] |
| Claude Code SessionEnd hook | 机制存在（hook 事件表载明），官方未内置蒸馏 | — | — | 第三方可挂；技能可带 `hooks` frontmatter [documented] https://code.claude.com/docs/en/hooks |
| mem0 | add() 调用时提取；Dream Synthesis 后台定时 | Memory Evaluation（官方评测页） | 无（机器治理：Supersede/Merge） | [documented] docs.mem0.ai |
| Letta sleep-time | 空闲周期（频率可配） | 无 evals | 无（sleep-time agent 自主重写） | 承认 MemGPT 增量记忆变脏 [documented] |
| LangMem | hot path（模型自记）/ background 延迟整理 | 无内建 | 无 | [documented] |
| ExpeL | 离线批量（训练任务集） | 消融实验（研究） | 无 | [documented] arXiv |
| AWM | offline 训练样例 / online 测试即时 | 基准成功率 | 无 | [documented] arXiv |
| Voyager | 自动课程驱动（agent 自主探索） | **环境反馈+执行错误+自验证** | 无（环境验证替代人审） | [documented] arXiv |
| dsh-run2skill | 批量边界+空闲+显式请求（每轮只低成本记录） | 入口查重 + 证据过滤 | **有**（草稿收件箱+改稿链+确认） | [affordance] |
| @dsh-enhanced | 评估账本投影（owner 验证过的任务反馈） | 独立验证账本+基线业绩 | **有**（owner 审批卡，fail-closed） | propose-only 默认 [affordance] |
| @a9i5k4 auto-memory | 持续观察+定时整理（限速 8 次/天） | 写闸+recall review 打分 | **有**（技能晋升 Memory Hub 人审） | 90 天未用自动归档 [affordance] |
| @garvel dsh-reflect | 模型主动（v0 不自动） | 凭据硬闸+去重 | **有**（pending 队列，不批不注入） | 自动蒸馏显式延后，设计文档已备 [affordance] |
| 委托方基线 | 模型/人主动触发 `assistant_reflect` | 写时契约校验（validateSkillDraft） | **无**（模型自判后直接落盘） | session-end 自动化显式延后 [affordance] |

**翻车案例汇总**（J5 的"真实案例"）：① Claude Code `/verify` 自动 fold-in → 频繁 merge conflict（官方文档载明的回退）；② MemGPT 增量记忆变脏（Letta 官方承认）；③ ClawHavoc 记忆投毒（`SOUL.md`/`MEMORY.md` 被恶意改写形成跨会话持久后门）——无人审的写入面即攻击面；④ bryan-cmf 阻塞式技能闸被废弃改非阻塞——交互成本高的门会被绕过。**共同教训：全自动落盘缺验证门时，最先坏掉的不是能力是可信度；治理门要轻（非阻塞、低交互），但要在。**

## 7. 技能治理对照（J1/J2/J4）

- **去重**：mem0 提取管线内建（两阶段 ADD/UPDATE/DELETE/NOOP）[documented]；run2skill 入口查重 [affordance]；garvel 归一化精确匹配去重（语义判重交给 consolidate）[affordance]；Claude auto memory 靠"跳过已说过的"启发式 [documented]。
- **合并/取代/退役**：mem0 Dream（Supersede/Merge 随写、Synthesis 定时）是产品级答案 [documented]；dsh-mind 阈值归档（30d/90d）+ 快照回滚 [affordance]；auto-memory 90 天未用归档+pin [affordance]；Letta sleep-time 持续重写清理 [documented]；lmzhen curator/consolidate 两阶段归档/合并 [affordance]；Claude Code `/skill-doctor` 只报告不自动退役 [documented]；**Voyager 无退役**（研究线通病）。
- **版本化**：run2skill 不可变草稿版本链（父子关系、旧批准失效）[affordance]；dsh-enhanced CAS + retire-then-adopt（禁止原地改写）+ 不可变 rule ID/generation [affordance]；michengai 备份/更新预览/回滚 + Trash [affordance]；garvel 整表重写前 `.bak` [affordance]；Claude claude.ai 同步技能**单向下发**（本地改动会被覆盖——版本权威在云端，本地文件不是权威副本）[documented]。委托方现状：learnedAt/source provenance 有，**无快照/版本**。
- **测试/回归**：生态里"技能回归验证"的成熟形态是 **with/without 基线对比 + evals.json 入技能目录**（Claude Code skill-creator、agentskills.io 官方工作流、`claude plugin eval` 可上 CI）[documented]；DSH 内 dachengge 的"验证级别 V0–V3+记录证据"是展示层尝试 [affordance]；**没有一家做"学到技能的自动回归"**——evals 目录是给人写的技能准备的，学到技能的验证仍靠人读。
- **防腐化（信噪比）**：常驻成本的官方答案一致——目录只装 name+description 且截断（Claude 1536 字符 / DSH 500 默认）；膨胀治理三流派：统计报告（/skill-doctor、skill-stats）、阈值归档（dsh-mind、auto-memory）、后台合成（Dream、sleep-time）。委托方已有 500 字符 description 上限与 32KB body 上限（`MAX_DESCRIPTION_LENGTH`/`MAX_BODY_BYTES`）[affordance]，**缺的是使用数据与退役动作**。

## 8. 判据逐条对照（生态 → 委托方）

**J1 错了赔得起吗**：文件技能是全生态共识（Anthropic 把官方技能放 git 仓库 `anthropics/skills`；Claude auto memory"plain markdown you can read, edit, or delete"；ClawHavoc 反面证明无版本化市场=攻击面）。委托方满足文件可审；**缺口在"学错的技能谁发现"**——现状只有写时校验，无人读、无统计，错了可能永远躺着。生态答案：用量统计（谁被用过）+ 写后审计（写坏了立刻报）。
**J2 错了多久能发现**：现状=写时语法校验即刻、行为错误无限期。生态给了三档机器检查可借：写后审计（caesarloo 形态，分钟级）、用量统计（skill-stats 形态，会话级）、evals 基线（agentskills.io 形态，迭代级）。**遮蔽可见性：生态空白，须自研**（见 §5.4）——而且 DSH 侧连"人类可见的遮蔽文档表"（Claude Code 那张表）都没有。
**J3 形态**：SKILL.md 兼容面已升值——开放标准 + Cursor/Copilot 采纳 + `@michengai/dsh-skills-manager` 直接复用 Claude/Codex 技能库 + `@cnzgray` 桥接 Claude 记忆。委托方 `metadata` provenance 盖章走标准通道、`disable-model-invocation`/`user-invocable` 字段级对齐。外部框架（mem0/Letta/LangMem）形态不合：Python 运行时进不了 cordis 组合，且 procedural 层形态各异（改 prompt / 记忆块 / DB 记忆）而非文件技能。DSH 组合内可借的组件：lmzhen 治理家族（threat/plan-validator/curator/skill-catalog）、skill-audit、skill-stats——全部是同 seam 的 cordis 插件。
**J4 信噪比**：常驻=目录行（name+description，500 cap）——有界且与生态一致。膨胀治理委托方为零，生态三流派可按成本递进：统计报告（最便宜）→ 阈值归档（dsh-mind 30/90 样板）→ 后台合成（Dream/sleep-time，最贵）。auto-memory 的三档注入降级（全文/摘录/提示，高风险降提示）是对"单技能信噪比"最细的工程，可作远期参照。
**J5 自主度谱系**：见 §6 表。委托方现状=全手动档里最自主的一格（模型可主动触发但**无人审门、无查重**）；比 run2skill 少收件箱，比 garvel 少复核队列，比 auto-memory 少晋升审批。**方向应向"半自动+门"演进一格，而不是向全自动**——生态产品全部收敛于此，翻车案例全部指向缺门的全自动。
**J6 维护**：外部——agentskills.io（Apache-2.0/CC-BY-4.0，Anthropic 发起，GitHub/Discord 开放治理）；anthropics/skills（多数 Apache-2.0，docx/pdf/pptx/xlsx 源码可得非开源）；LangMem/Letta/mem0 均活跃但如上形态不合。DSH 内——按月下载量与工程成熟度排序：michengai（65k，Apache-2.0，多 DSH 版本验证含 0.1.5-rc.2，64 星）> lmzhen 家族（core 43k，社区构建，文档密）> auto-memory（9k，BSD-3，宣传重但机制全）> dsh-mind（7k）> dsh-enhanced（3.2k，审批工程最深）> run2skill（1.6k，设计最对位）> 其余（<600，个人项目）。**版本对齐注意**：委托方 pin DSH 0.1.5-rc.2（`packages/dsh-smart-assistant/package.json` compatibility 声明）；michengai/ctl456 明确支持该版本，run2skill 0.4.0 只声明到 0.1.2-rc.1、dsh-enhanced 针对 0.1.2-rc.1 验证——**直接组合前必须逐个验证**。

## 9. 建议

### 9.1 委托方基线在谱系里的位置

**形态**：文件技能流派（SKILL.md + 渐进披露 + 原生 provider 即刻挂载 + provenance 盖章 + 写时契约校验）——与 Anthropic 官方体系同构，比 Claude Code 更激进的一步是"学到的技能即刻成为一等公民技能"（Anthropic 的 agent 自写技能仍是愿景）。**自主度**：全手动档（模型/人主动触发，无自动触发、无人审门、无查重）——生态对照后这格的准确描述是"半自动的入口、无门的出口"。**治理**：写时校验有，入库后的一切（审计/统计/退役/遮蔽）无。**同位者**：dsh-run2skill（多了查重+收件箱+改稿链）、@garvel/dsh-reflect（多了复核队列+凭据闸+备份）、@a9i5k4/auto-memory 的结晶子系统（多了晋升人审+90 天归档）。委托方独有资产：家的一致布局、双 provider 区分策展/学到、以及"生成即挂载"的原生集成。

### 9.2 路线选择：**借规范借组件**（对照三选项）

- **直接采用现成（否）**：外部框架（mem0/Letta/LangMem）形态不合（J3：Python/托管运行时进不了 cordis；procedural 层非文件技能且各家半成品——mem0 procedural 仅 Python OSS 雏形）。DSH 内现成学习回路（run2skill/dsh-enhanced/lmzhen）各有一半吻合：run2skill 最对位但缺 provenance/家布局且 DSH 版本未对齐 0.1.5-rc.2；dsh-enhanced 载体是规则库非 SKILL.md；lmzhen 家族组件化好但碎片化重。**整体替换等于放弃已有的家布局与同源格式优势，换回一个别人语义的库。**
- **全自研进化（否）**：治理件（统计/审计/归档/快照）在生态里已有成熟形态，逐个自研是重复劳动；且全自动自研进化（无人审门直写）恰是生态翻车案例集中区（§6）。
- **借规范借组件（是）**：规范=Agent Skills 开放标准（格式不动、补字段即可吃多客户端红利）；组件=治理件按"统计→退役→审计"顺序借生态形态自建（轻、贴家布局、不动核心），触发演进借 run2skill 形态（批量边界检测+收件箱+查重），蒸馏安全闸借 garvel 设计文档（sessionQuery+llm.stream+timer 已是现成零件，缺策略与门）。

### 9.3 缺口清单（优先级序，全部在 DSH 组合内可实现）

1. **用量统计**（J2/J4 第一优先）：借 `@dsh-external/dsh-skill-stats` 形态（session log 回放+实时订阅，只读）或自建——`learnedAt` 已有，补"被加载次数/最近使用"，`brief` 里回显，作为一切退役决策的数据面。Claude `/skill-doctor` 证明这是官方认可的最小治理件。
2. **遮蔽可见性**（J2 生态空白，自研小切口）：在家的健康检查或 `brief` 里报告"学到技能与策展同名"清单（DSH registry 内 rank 并列时 provider 注册序决定、策展赢、学到版静默——[affordance] `vendor/dsh/docs/subsystems/skills.md` + 委托方已知限制）；最低成本版本甚至只是日志一行+brief 一节。
3. **阈值退役**（J4）：借 dsh-mind 样板（30 天 stale→90 天 archived，归档=移出 provider 扫描目录而非删除，留恢复）；有用量统计后此件自然长出。
4. **写后审计**（J2）：借 caesarloo 形态（frontmatter 契约/引用完整性/凭据泄漏检查，fail/warn 注入不阻断）——注意委托方写时校验已挡住大部分 frontmatter 问题，审计增量在**引用完整性与凭据**；该插件 Windows/PowerShell 倾向，跨平台引擎宜自建或改写。
5. **触发演进一格**（J5）：手动 → "建议+人审"。形态：session 事件驱动的批量边界检测（garvel 已点名 DSH 零件齐备）→ 生成**草稿**（不落 skills/ 房间，进待审区）→ 收件箱确认/改稿（run2skill 的不可变版本链语义）→ 批准才 `save_skill`。第一版显式 **propose-only**（dsh-enhanced growth-experiments 的默认值是生态里最谨慎的同款）。全自动 session-end 蒸馏维持延后判据不变："有真实使用数据说明收益大于 token 代价与同意成本"——统计件（第 1 项）正是收集这份证据的工具。
6. **格式小步向 spec 对齐**（J3）：可选补 `license`/`compatibility` 字段（learned 技能可空）；考虑 `when_to_use` 的定位（Claude Code 扩展字段，规范语义并进 description——保持现状也兼容，因为规范允许 metadata 承载扩展）。
7. **家的 skills/ 快照**（J1）：最轻形态是时间戳快照或 git init（dsh-mind snapshots / garvel `.bak` / michengai backup-rollback 三种样板）；学错技能的兜底=可回滚。

## 10. 来源清单（一手）

**Anthropic / Claude Code**
- https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills （2025-10-16，更新 2025-12-18）
- https://agentskills.io/home ；https://agentskills.io/specification ；https://agentskills.io/clients ；https://agentskills.io/skill-creation/evaluating-skills （2026-09-24 查证）
- https://github.com/agentskills/agentskills （main，Apache-2.0/CC-BY-4.0）
- https://github.com/anthropics/skills （main；多数 Apache-2.0，doc 技能源码可得）
- https://code.claude.com/docs/en/skills ；https://code.claude.com/docs/en/memory ；https://code.claude.com/docs/en/hooks （v2.1.x 文档，2026-09-24 查证）

**通用框架**
- https://www.langchain.com/blog/langmem-sdk-launch （2025-02-18）；https://langchain-ai.github.io/langmem/
- https://www.letta.com/blog/sleep-time-compute （2025-04-21，Letta 0.7.0）；论文 https://arxiv.org/abs/2504.13171
- https://docs.mem0.ai/core-concepts/memory-types ；https://docs.mem0.ai/core-concepts/how-it-works ；https://docs.mem0.ai/platform/features/dream ；论文 https://arxiv.org/abs/2504.19413

**研究线**
- Voyager https://arxiv.org/abs/2305.16291 ；Reflexion https://arxiv.org/abs/2303.11366 ；ExpeL https://arxiv.org/abs/2308.10144 ；AWM https://arxiv.org/abs/2409.07429 ；SkillWeaver https://arxiv.org/abs/2504.07079 ；ACM https://arxiv.org/abs/2607.23809 、https://arxiv.org/abs/2607.21503

**安全**
- https://snyk.io/articles/skill-md-shell-access/ （ClawHavoc 战役，2026-01）

**DSH 生态（包内容 2026-09-24 经 registry tarball 下载核读）**
- 商店目录：`dsh-plugin-shop-catalog@2026.923.1`（npm tgz，`package/v1/plugins.*.json`、`stars.*.json`）
- `dsh-run2skill@0.4.0`（repo github.com/qkycir-123/dsh-run2skill）
- `@dsh-enhanced/assistant-evolution@0.1.42`、`assistant-skills@0.1.42`、`assistant-growth-experiments@0.1.42`（repo github.com/22-ai-00/dsh-enhanced）
- `@lmzhen/dsh-evolution-core@0.8.0` 及家族（npm search "dsh-evolution"）
- `@a9i5k4/dsh-auto-memory@3.1.7`（repo github.com/Aik358/dsh-auto-memory）
- `@wumihaze/dsh-mind@0.2.2`；`@garvel/dsh-reflect@0.0.1-spike.22`（repo github.com/RGarvel/dsh_evo）
- `@caesarloo/dsh-skill-audit@0.2.3`；`@michengai/dsh-skills-manager@1.1.0`；`@ctl456/dsh-skills-manager@0.2.0`；`@dachengge/dsh-skill-catalog@0.1.1`
- git 分发：github.com/Bryan-cmf/dsh-skill-gate 、dsh-skill-trail（均归档，后继 dsh-skill-ledger）；github.com/chen-zz20/dsh-skill-stats
- 月下载量：api.npmjs.org/downloads/point/last-month/&lt;pkg&gt;（2026-09-24 查询）

**本地源码（[affordance] 依据）**
- `packages/dsh-smart-assistant/src/skills/skill-file.ts`、`src/learn/index.ts`、`packages/dsh-smart-assistant/package.json`（v0.0.0，MIT，DSH 0.1.5-rc.2 verified）
- `vendor/dsh/docs/subsystems/skills.md`（DSH 技能子系统契约，随 pin）
