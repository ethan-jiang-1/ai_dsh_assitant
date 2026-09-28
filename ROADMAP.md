# 队列 · 条目制

> 性质：**根部队列，只写"接下来"**——队列 + 搁置池 + 维护规则；**完成即离队**（不打 ✅，
> 记录活在收尾 note + git）。历史与既成事实不进本文件：合同在 `docs/`，决策与档案在
> `notes/`，现在由 `git log` 说话。
> **队列 = 有序索引，不是全文**：条目 ≤3 行（主题 / 标记 / 链接或触发条件）；全文住
> `notes/proposed/` 的提案或条目开工时的 plan。`pnpm verify` 两道门禁管秩序：
> proposal-scheduled（提案必须在队列有归宿）、proposal-graduated（消化的提案必须离开
> `notes/proposed/`）。
> **每条目换全新对话**：交接靠入口链（AGENTS.md → 本文件 → 条目链接），不靠队列携带历史。
> 标记：▶ 可开工 ｜ ⏸ 等用户拍板 ｜ 🧹 卫生小修 ｜ ⏳ 触发型（不占轮，触发到了变 ▶）。

## 队列

- ⏳ **默认工作区复现（第一公里 P1-C 遗留）**（触发=真实安装出现"选择工作区"阻塞，或**第一次给外人用**时；"发行 profile"触发已退役，见维护规则「研发期不做正式发行」）：机制已查清（空注册表时平台建 `<Documents>/deepseek-harness/default-workspace`）、一次真机端到端见过，但按需复现失败——配方与第一步（CDP Network 域抓 `workspace/initializeDefault`）在[走查](notes/research/archive/2026-09-26-first-mile-walkthrough.md) §4b。第一公里 P0–P3 本体已交付离队，记录在[卡](notes/implemented/2026-09-26-first-mile-landing.md)与 git
- ▶ **CEO 助手的 Sidebar 培养面**（用户拍板的当前 Goal，进行中）：三面板+培养循环已上线并经**真人首测全链走通**；设计权威＝[培养面设计卡](notes/implemented/2026-09-26-cultivation-surface-design.md)（当前 rationale owner）；二轮整改（自主评审 R1–R13）已交付：见[二轮整改卡](notes/implemented/2026-09-27-cultivation-remediation-round2.md)；typert 后置——逐圈历史（冻结）：[编年卡](notes/archived/2026-09-25-ceo-sidebar-ux.md) · 接手历史：[handoff](notes/research/archive/2026-09-26-handoff-ceo-sidebar-cultivation.md)
- ⏳ **MCP 连接**（触发=需要真实系统数据（公司盘/CRM 等）接入会话时；v0 用文件替身）——依据：[专家组合件 v0](notes/implemented/2026-09-25-expert-pack-v0.md) §四
- ▶ **真实使用开跑**（**已开始**：2026-09-26 真人经面板走完整条培养循环，会话 `34e64c5d`；首个摩擦已落地为忙时冻结；首批数据与 ⏳ 对照见[打磨战役 §八](notes/implemented/2026-09-25-smart-assistant-polish-campaign.md)，摩擦即新卡）；**摩擦读法已就位**：`pnpm desk-loop` 从真实会话日志读"点了没反应 / 反复点 / 答了多次 / 技能没加载"，首次实跑即产出两个发现（→ [R12](notes/implemented/2026-09-27-cultivation-remediation-round2.md)：点名 desk-refresh 的 14 次面板动作里 13 次没加载契约技能，文件照写；并独立重发现"三答一问"）
- ⏳ **命令菜单里的技能行（首次给外人用时的噪声）**（触发=真实委托人反馈这个菜单太吵，或第一次给外人用时；"发行 profile"触发已退役）：`/` 与 `+` 菜单把每条技能渲染成行，描述是模型面英文（如 `campaign-evidence-recording | How to record live-verification evidence in this repo…`），开发期还会混进仓库/开发技能——正是知识室已按"委托人面上的噪声"排除掉的同类素材。客户端看不到别的插件的命令来源、没有隐藏它的公开面，所以这归**发行准入**（产品组合该带哪些技能）。证据：[自审卡](notes/implemented/2026-09-27-cultivation-remediation-round2.md) R10
- ⏳ 知识导入的转换与概念抽取（触发=①第一份真实 docx/pdf 文档集出现 ②评测集 v0 就位；依据：[导入纯核 note](notes/implemented/2026-09-25-knowledge-ingest-core.md) §四）
- ⏸ **阶段 0-3 · 评测集 v0**（30–50 条经营问题，含应拒答题与判分规则；**题目源 2026-09-27 变更**：本人替人做、无 CEO 经验——题目由 agent 模拟高科技 CEO/高管人设代拟、本人过目校准）——**首批 8 题已跑完（2026-09-28 凌晨，打分表 sheet-2026-09-27-15-23 本地留档）**：机器侧预判 7 良优 1 败（Q1 诊断优/Q2 裁决优/Q3 拒答边界案/Q4 拒答模范/Q5 分层诚实优/Q6 裁决优/Q7 拆解优/Q8 未交卷——**收尾缺陷已修复**：家手册 v9 新增「Your last message is the deliverable」节，Q8 原题回归通过——末条消息答案先行、记账居后、评分要点全中）；严格 G2 读法 87.5%（差一题到 90% 线）、拒答 2/3 达标；Q3 是**判例题**（「不许按行业均值编数」vs「显式标注外盘基准的诚实占位」——产品性格由本人这一打分定形）；扩题等本人过目校准后进行
- ⏸ **[harness 质量维持方案](notes/proposed/2026-09-28-harness-quality-upkeep.md)**（用户 2026-09-28 指示立卡）：轨 A 合同面自生成最小扩面＝**解冻请求**、轨 B 审计轮进维护规则（一行）、轨 C 产品面证据刷新（不涉冻结）——三轨成本与验收在卡；A/B 等拍板，C 可随批执行。依据：[十维自评](notes/research/2026-09-28-harness-ten-dim-self-assessment.md)
- ⏳ **[桌面] 标记泄漏进会话标题**（2026-09-27 面板 DOM 评审发现：会话列表兜底标题显示 `[桌面] 刷新我的桌面…` 原文——A10 标记只在标题 LLM 生成失败的兜底路径可见；修法要同步动三处标记正则（client A10 / usage-report / desk-loop），跨面改动换一行观感，触发=真实使用中本人反馈它碍事才做）
- ⏳ 家的内存段瘦身（合并/下沉记忆、压缩措辞）（触发=真实使用中确实感到摘要偏薄；降级已优雅故不紧急，依据：[责任圈卡](notes/implemented/2026-09-25-owner-mandate-and-real-use-baseline.md) §九）——**读数升级（2026-09-27 桌面刷新实测）：摘要 4,011/4,096 已触顶，切线以下的记忆内容不进摘要（模型只见到省略计数）**；产品自己已向本人请求裁决（退役/压缩一条或授权自选）——另一选项是调大 `digestMaxBytes`（每请求 token 成本随之涨）。触发仍以你的裁决为准，此数据备判（2026-09-28 估算仍贴顶、活跃记忆 5 条——口径与更新见[质量维持卡](notes/proposed/2026-09-28-harness-quality-upkeep.md)轨 C）
- ▶ **长期责任圈（职责，不完成）**：北极星＝中小企业 CEO/VP 的**数字分身**（管理岗基座＋跟本人学；首位真人＝用户本人）——总纲 [企业聪明助手总体思路](notes/research/archive/2026-09-25-grand-plan-enterprise-expert-assistant.md)，圈纪律与逐圈记录见[责任圈卡](notes/implemented/2026-09-25-owner-mandate-and-real-use-baseline.md)（当前权威）（职责无终点，不按"完成即离队"退场）
- ⏳ **培养面按会话分 store**（触发=多会话并行使用成为真实场景——主页与 tab 共用单 store、`sendSession` 全局单值的 A3 缺陷开始咬人时；依据：[整改卡](notes/implemented/2026-09-26-cultivation-remediation.md) S3）——**2026-09-27 窄范围复审给了真实咬人的证据**：store 被所有绑定 tab 共享、匹配只按裸 rowId，A 会话说一句会给 B 会话里同 id 的行盖上冻结与回执（见[二轮整改卡](notes/implemented/2026-09-27-cultivation-remediation-round2.md) R11 观察）
- ⏳ **desk 文件 schema 版本号**（触发=真实字段不匹配出现——模型发明面板不识的新字段时；依据：[整改卡](notes/implemented/2026-09-26-cultivation-remediation.md) S3 节的 A8 延后记录）
- ⏳ 负例控制存量补课（触发=下一次改动某条尚无红夹具的结构性门禁时，同 diff 补它的造红夹具；存量不追账，理由见[红证据档案](notes/research/archive/2026-09-25-old-gate-red-controls.md)）——**常设触发**：2026-09-27 那次已满足（`desk-loop --self-check` 与评测网 `file-shape` 各带红绿对照），条目留作下次的提醒
- ⏳ `implemented/` 冻结树 / class 子目录（触发=`implemented/` 篇数过百或浏览开始碍事；依据[吸收 note](notes/implemented/2026-09-24-agent-note-lifecycle-absorption.md)）
- ⏳ `/personality` 类会话 overlay（触发=真实需求出现；依据[soul-and-agents](notes/implemented/2026-09-24-soul-and-agents.md)）
- ⏳ 文档词数预算 manifest（触发=docs 腐化实证；判据在 [discipline](docs/discipline.md)）
- ⏳ change-scope 脚本（**触发已到过一次**：P1-B 漏跑整包——处置是教训进 [pre-push-evidence](.agents/skills/pre-push-evidence/SKILL.md)（改 `src/client/` 跑整包 + 证据要覆盖状态的补集），**脚本本身判定不做**：一次摩擦不足以证明值得加一层自动化。**触发重置=同类摩擦第二次出现**，届时再定形态——脚本本轮判定不做，卡里也没有现成草图，别去 §五找）
- 🔒 ⏳ dsh-obsidian 挂桥（用户判触发）（触发=用户想让助手直接操作某个外部 vault；设计参照已录 r5）
- 🔒 ⏳ 会话日志薄动词 b1/b2（用户判触发）（触发=真实使用中真去查历史会话且 rg 配方不够用；b2 后端可用性待细查）
- 🔒 ⏳ workflow-as-MD（用户判触发）（触发=真实使用出现多步编排需求；方向：程序性知识之上，编排是否也为 working folder 的 MD 文件——用户 2026-09-24 提出）
- ⏳ 语义检索 / embedding（触发=真实漏召回；依据 [三线合流 §六](notes/implemented/2026-09-24-tri-line-synthesis.md)、[R1 §5](notes/research/archive/2026-09-24-r1-memory-ecosystem-survey.md)、[R3 §7.2](notes/research/archive/2026-09-24-r3-knowledge-layer-survey.md)）
- ⏳ 全自动蒸馏（触发=用量统计显示收益>token+同意成本；采集工具已在场；依据：[R2 缺口清单 §9.3-5](notes/research/archive/2026-09-24-r2-skill-growth-survey.md)）
- ⏳ FTS/trigram 检索升级（触发=grep 真实漏召回；方法参照 [R3 实测表 §4.3/§7.2-3](notes/research/archive/2026-09-24-r3-knowledge-layer-survey.md)）
- ⏳ 跨 harness 共库（触发=第二消费方出现；[memsearch 形态](notes/research/archive/2026-09-24-r1-memory-ecosystem-survey.md)）
- ⏳ 技能 license/compatibility 字段（触发=provider 读它们或第二消费方；[1g 审计](notes/implemented/2026-09-24-spec-field-audit.md)）

## 搁置池

> 判据：只有"缺上游 seam"或"缺明确需求"才进这里；被否决的方案不进（那归提案的输赢表）。
> 升 pin（`pnpm sync-dsh`）时顺手回看一遍。条目复活按性质回队列或立新提案。

（空）

## 维护规则

- 轮序调整或新增：直接改本表；**决定的理由与证据住 notes/ 或随卡，带日期的决策记录不进本表**——
  本表只写常设规则，历史由 git 说话。
- **保留项标记 `🔒`（用户判触发）**：出现在队列行上表示"条件可能已满足，但只有用户能判它成立"——
  会话可以报告与建议，**不得自行判触发、不得删除该行、不得实现该条目**（机械门禁 `reserved items` 管形态）。
- **冻结流程扩张（用户 2026-09-25 拍板，随《总体思路》§七）**：不新增门禁、不再重组 notes 结构，
  除非被**产品回归**驱动；证据阶梯＝领域评测 > 真实用户会话 > 代理会话 > 单元测试 > 机械门禁，
  上层缺席时下层绿不算前进；每周至少一个用户可感知的变化。
- **延后只能住本表**：note 里不得只写"延后/触发="而不给队列归宿——凡在 note 里写下触发条件的行，
  必须同时指明本文件（机械门禁 `deferral homes` 管）；明确**永不**做的（负知识）才留在 note 的输掉的方案里。
- 写条目自检（作者视角，借 DSH 散文标准）：**只拿到 HEAD、没有会话 transcript 的读者，能否解析
  每个引用并核验每个 claim？** 裸简称（R1/r5 §末之类）一律写成可点链接；条目 ≤3 行，正文搬卡。
- **触发未到的条目不动手**——做在触发之前等于替本人想象需求。触发复核方法可重跑：家的现状看
  `dev/harness-home/assistant/`，真人使用面看 `pnpm desk-loop` 的报告。
- **战役/阶段收尾必跑一轮语义漂移审计**（2026-09-28 起，质量维持卡轨 B）：新上下文只读探针
  走入口链（技能：[semantic-drift-audit](.agents/skills/semantic-drift-audit/SKILL.md)），
  发现即各自成切片——机械门禁对散文合同面的盲区由它补（实证：四轮 0/6/7/6，全在门禁绿时发生）。
- **研发期不做正式发行**（用户 2026-09-27）：外人上手标准＝clone 后按 [README](README.md) 走通
  （`git submodule update --init` → `pnpm install && pnpm build` → `dsh plugin add file:./packages/dsh-smart-assistant`
  → registry `default: assistant`）；打包形状由 `pnpm release-smoke` 机械验证；队列条目不挂"下次做发行 profile"类触发。
