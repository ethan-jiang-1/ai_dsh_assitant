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

- ⏳ **默认工作区复现（第一公里 P1-C 遗留）**（触发=真实安装出现"选择工作区"阻塞，或**第一次给外人用**时；"发行 profile"触发已退役，见维护规则 2026-09-27）：机制已查清（空注册表时平台建 `<Documents>/deepseek-harness/default-workspace`）、一次真机端到端见过，但按需复现失败——配方与第一步（CDP Network 域抓 `workspace/initializeDefault`）在[走查](notes/research/archive/2026-09-26-first-mile-walkthrough.md) §4b。第一公里 P0–P3 本体已交付离队，记录在[卡](notes/implemented/2026-09-26-first-mile-landing.md)与 git
- ▶ **CEO 助手的 Sidebar 培养面**（用户拍板的当前 Goal，进行中）：三面板+培养循环已上线并经**真人首测全链走通**；设计权威＝[培养面设计卡](notes/implemented/2026-09-26-cultivation-surface-design.md)（当前 rationale owner）；二轮整改（自主评审 R1–R13）已交付：见[二轮整改卡](notes/implemented/2026-09-27-cultivation-remediation-round2.md)；typert 后置——逐圈历史（冻结）：[编年卡](notes/archived/2026-09-25-ceo-sidebar-ux.md) · 接手历史：[handoff](notes/research/archive/2026-09-26-handoff-ceo-sidebar-cultivation.md)
- ⏳ **MCP 连接**（触发=需要真实系统数据（公司盘/CRM 等）接入会话时；v0 用文件替身）——依据同上
- ▶ **真实使用开跑**（**已开始**：2026-09-26 真人经面板走完整条培养循环，会话 `34e64c5d`；首个摩擦已落地为忙时冻结；首批数据与 ⏳ 对照见[打磨战役 §八](notes/implemented/2026-09-25-smart-assistant-polish-campaign.md)，摩擦即新卡）；**摩擦读法已就位**：`pnpm desk-loop` 从真实会话日志读"点了没反应 / 反复点 / 答了多次 / 技能没加载"，首次实跑即产出两个发现（→ [R12](notes/implemented/2026-09-27-cultivation-remediation-round2.md)：点名 desk-refresh 的 14 次面板动作里 13 次没加载契约技能，文件照写；并独立重发现"三答一问"）
- ⏳ **命令菜单里的技能行（首次给外人用时的噪声）**（触发=真实委托人反馈这个菜单太吵，或第一次给外人用时；"发行 profile"触发已退役）：`/` 与 `+` 菜单把每条技能渲染成行，描述是模型面英文（如 `campaign-evidence-recording | How to record live-verification evidence in this repo…`），开发期还会混进仓库/开发技能——正是知识室已按"委托人面上的噪声"排除掉的同类素材。客户端看不到别的插件的命令来源、没有隐藏它的公开面，所以这归**发行准入**（产品组合该带哪些技能）。证据：[自审卡](notes/implemented/2026-09-27-cultivation-remediation-round2.md) R10
- ⏳ 知识导入的转换与概念抽取（触发=①第一份真实 docx/pdf 文档集出现 ②评测集 v0 就位；依据：[导入纯核 note](notes/implemented/2026-09-25-knowledge-ingest-core.md) §四）
- ⏸ **阶段 0-3 · 评测集 v0**（30–50 条真实经营问题，含应拒答题与判分规则；**题目由你本人出**——这是 G2 关口，agent 只整理格式）
- ⏳ 家的内存段瘦身（合并/下沉记忆、压缩措辞）（触发=真实使用中确实感到摘要偏薄；降级已优雅故不紧急，依据：[责任圈卡](notes/implemented/2026-09-25-owner-mandate-and-real-use-baseline.md) §九）
- ▶ **长期责任圈（职责，不完成）**：北极星＝中小企业 CEO/VP 的**数字分身**（管理岗基座＋跟本人学；首位真人＝用户本人）——总纲 [企业聪明助手总体思路](notes/research/archive/2026-09-25-grand-plan-enterprise-expert-assistant.md)，圈纪律与逐圈记录见[责任圈卡](notes/implemented/2026-09-25-owner-mandate-and-real-use-baseline.md)（当前权威）（职责无终点，不按"完成即离队"退场）
- ⏳ **培养面按会话分 store**（触发=多会话并行使用成为真实场景——主页与 tab 共用单 store、`sendSession` 全局单值的 A3 缺陷开始咬人时；依据：[整改卡](notes/implemented/2026-09-26-cultivation-remediation.md) S3）——**2026-09-27 窄范围复审给了真实咬人的证据**：store 被所有绑定 tab 共享、匹配只按裸 rowId，A 会话说一句会给 B 会话里同 id 的行盖上冻结与回执（见[二轮整改卡](notes/implemented/2026-09-27-cultivation-remediation-round2.md) R11 观察）
- ⏳ **desk 文件 schema 版本号**（触发=真实字段不匹配出现——模型发明面板不识的新字段时；依据同上）
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

- 轮序调整或新增：直接改本表，并在 notes/ 记一行原因。
- **保留项标记 `🔒`（用户判触发）**：出现在队列行上表示"条件可能已满足，但只有用户能判它成立"——
  会话可以报告与建议，**不得自行判触发、不得删除该行、不得实现该条目**（机械门禁 `reserved items` 管形态）。
- **冻结流程扩张（用户 2026-09-25 拍板，随《总体思路》§七）**：不新增门禁、不再重组 notes 结构，
  除非被**产品回归**驱动；证据阶梯＝领域评测 > 真实用户会话 > 代理会话 > 单元测试 > 机械门禁，
  上层缺席时下层绿不算前进；每周至少一个用户可感知的变化。
- **延后只能住本表**：note 里不得只写"延后/触发="而不给队列归宿——凡在 note 里写下触发条件的行，
  必须同时指明本文件（机械门禁 `deferral homes` 管）；明确**永不**做的（负知识）才留在 note 的输掉的方案里。
- 写条目自检（作者视角，借 DSH 散文标准）：**只拿到 HEAD、没有会话 transcript 的读者，能否解析
  每个引用并核验每个 claim？** 裸简称（R1/r5 §末之类）一律写成可点链接；条目 ≤3 行，正文搬卡。
- 2026-09-24：**立条目制**（借鉴 `ai_dsh_company` ROADMAP D23/D24 之形、按本仓哲学适配：
  只写接下来 / 完成即离队 / 队列=索引 / 两道机械门禁进 verify）。三线提案的 §六延后项
  表移交本队列（⏳ 各行），原表加移交注记；两份提案（tri-line、iteration-rhythm）毕业至
  `notes/implemented/`，全仓引用同步。档案：`notes/implemented/2026-09-24-roadmap-queue.md`。
- 2026-09-26：**培养面整改包立卡**（用户要求"更新到 notes/proposed、盘算好如何推进"）——两份评审已核实
  的缺陷 + 用户拍板（分歧以 UX 专家版为准）转为有序切片 S1–S5；P0（右栏开启器丢 receiver）已先行修复。
- 2026-09-26：**培养面设计思路显性化**（用户要求：先停一下、系统思考清楚）——新增
  [设计 owner 卡](notes/implemented/2026-09-26-cultivation-surface-design.md)（判据/11 条设计原则/架构/
  现状/输掉的方案/判据怎么验）；活动卡保留编年记录与逐圈证据。
- 2026-09-26：**专家部署组合件 v0 毕业**——v0 四件全部落地并 live 验证（卡迁 `notes/implemented/`）；
  v0 之外的触发项入队：IM 渠道（⏸ 等你选渠道）、MCP 连接（⏳）；概念页抽取并入既有 ⏳ 知识导入条目。
- 2026-09-26：**会话日志代次配方毕业**——主体与四条验收早已全绿（卡 §四），条目离队；卡迁
  `notes/implemented/`（本次 notes/proposed 审计的第一项，用户要求系统清理）。
- 2026-09-25：**`session-recall` 0 加载的条目离队**——问题是"罕见情况的招牌还是描述没接上场景"，
  答案是**两者都不是**：它的 frontmatter parse 失败，加载器静默 skip（`action-plan` 同病）。
  修法与证据：[策展技能被静默跳过](notes/implemented/2026-09-25-curated-skill-frontmatter-silent-skip.md)；
  "真实使用里技能是否真被加载"这一观察由 ▶ 真实使用开跑 条目承担。
- 2026-09-27：**按研发姿态重新分诊 ⏸ 项**（用户当日拍板：技术/设计自决、阶段才 REVIEW——判据在
  [意图清单](notes/intents.md) §〇·三，常设指令在根 `AGENTS.md`「研发姿态」）。本次动作：
  "等外部 UX 评审者" → ▶ **自主评审**（自己做，外部真人降为可选）；第一公里 P1-C → 搁置、
  P2 层级 → 已自主判定落地（理由在卡内判定记录）；同日 **O5 渠道也拍板（只做 DSH 交互面，IM 不做、条目离队）**，
  于是**仍留 ⏸ 的只剩真人输入里的评测集 v0 题目**（G2 关口）。
- 2026-09-27：**存量消化一轮**（用户要求"盘算没加工的内容"）：整改包与编年卡毕业/归档、
  四篇结论已消化的调研收卷（对抗评审 · UX 反馈 · 第一公里走查 · sidebar handoff）、
  《总体思路》§八 逐条给处置（定位＝B 底座+专家包、数据边界＝严格本地，两条按既成事实记决定，
  反转属用户；渠道仍 ⏸）、`change-scope` 触发已到（P1-B 漏跑整包）→ 见下条。同日自主两轴评审
  （对抗设计 + 可用性走查）产出 10 条发现 → 新卡 **培养面二轮整改**（R1–R10）。
- 2026-09-27：**研发期不做正式发行**（用户 2026-09-27：还在研发，别人能从 Git 看到并容易跑起来就行）——
  标准从"发布"改成**外人 clone 后的上手路径**：`git submodule update --init` → `pnpm install && pnpm build`
  → `dsh plugin --profile <p> add file:./packages/dsh-smart-assistant` → registry `default: assistant`。
  本轮**实测过这条路**：`file:` 装进干净 home（3.1s）、`--dump-config` 里能看到 `preset-assistant` 与四个工具行；
  打包形状（`pnpm pack` → `add <tarball>`）由 `pnpm release-smoke` 继续机械验证。据此**退役两条 ⏳ 里的
  "下次做发行 profile"触发**（它们仍保留真实反馈/首次给外人用这两个真触发），并把根 README 的装法段按实测重排
  （去掉不存在的 npm 发布路径、补上必需的 `pnpm build`——包入口是 `lib/`，而 `lib/` 不入库）。
- 2026-09-27：**O5 触达渠道已拍板＝只在 DSH 自己的交互面（Web/Desktop）**（用户 2026-09-27：只考虑 DSH
  的交互，不去考虑其他的 IM）——IM 渠道接入（飞书/企微/钉钉）**不做**，条目离队；O5 的判据随之收窄为
  「一条命令装好、管理员不写 YAML」（IM 不在 v0 范围）。同口径已同步：[意图清单](notes/intents.md) 的 O5
  判据与「只能由用户给」清单、[专家组合件 v0](notes/implemented/2026-09-25-expert-pack-v0.md) §四、
  已收卷总纲的状态行。
- 2026-09-27：**17 条 ⏳ 的触发复核（带实测数字，未触发者不动）**——方法可重跑：家的现状看
  `dev/harness-home/assistant/`，真人使用面看 `pnpm desk-loop` 的报告。结论：
  ① 面板检索/过滤（触发=知识页上百）＝**15 页**，未到；② 知识导入的转换（触发=第一份 docx/pdf）＝
  素材 **0** 个（只有 md），未到；③ 家的内存段瘦身（触发=确实感到摘要偏薄）＝**40 条记忆 / 160K**，
  无主观实证，未到；④ MCP 连接（触发=需要真实系统数据）＝家与仓里**没有任何 CRM/公司盘接入的痕迹**，未到；
  ⑤ 语义检索与漏召回类（触发=真实漏召回）＝§6 读数 **0/3**（真用面板的会话里，本人每说一句助手都问过
  自己的房间），**没有漏召回证据**，未到；⑥ 培养面按会话分 store＝多会话并行**仍未成为真实场景**，未到
  （但撞车的证据已收在该条目里）；⑦ 命令菜单技能行＝**无真实反馈、未做发行 profile**，未到；
  ⑧ 默认工作区复现＝**无真实安装阻塞**，未到；⑨ change-scope 脚本＝触发重置后未再出现第二次摩擦，未到；
  ⑩ 负例控制存量补课＝**本轮实质触发并已做掉**（`pnpm desk-loop --self-check` 进 `verify`、
  评测网的 `file-shape` 自带红绿对照）。其余条目的触发条件都依赖尚未发生的现实（真实素材/真实规模），
  保持原样——**做在触发之前等于替本人想象需求**。
- 2026-09-27：**`notes/research/` 清空**（用户："research 里面还有东西，要么继续做，要么归档"）——
  按目录 README 早写好的规则（"结论消化完毕即整文件移入 `archive/`"）执行三件：
  ① [《总体思路》](notes/research/archive/2026-09-25-grand-plan-enterprise-expert-assistant.md) §八 已逐条处置 → 收卷，
  当前权威是[责任圈卡](notes/implemented/2026-09-25-owner-mandate-and-real-use-baseline.md)与[意图清单](notes/intents.md)；
  ② [外部 UX 评审简报](notes/research/archive/2026-09-26-ux-review-brief.md) → 收卷（评审改由 agent 自审执行并已交付，
  外部真人评审降为可选；将来要请可从该文件重建简报）；③ 第一公里截图证据目录随其走查一并入 `archive/`（证据面与结论同住）。
  由此 `research/` 只剩 README + `archive/`——**进行中的调研为零**，与 `proposed/` 同理：将来时只住队列。
- 2026-09-27：**`notes/proposed/` 清空**（用户："不论如何，proposed 里面的要都解决了"）——最后两张
  （[责任圈卡](notes/implemented/2026-09-25-owner-mandate-and-real-use-baseline.md) 与
  [培养面设计卡](notes/implemented/2026-09-26-cultivation-surface-design.md)）毕业：它们**不是未来工作提案**
  而是**当前权威**（北极星与方法已拍板且持续执行；判据/原则/架构是已交付面的设计 owner），按分类学
  （`proposed/` = 未完成的未来工作；`implemented/` = 当前 rationale owner，随实现保持 current）迁入
  `implemented/`，状态行改写为现行权威。**队列不受影响**：待办一直住本表，卡片只是它的依据。
  由此本仓的"将来时"只剩队列本身——没有悬空的提案。
- 2026-09-27：**`vendor lib/` 重建条目离队**——存量审计时按触发复核：它在队列里等的是"需要
  boot/release-smoke/plugin-add 出的 profile"，而 `vendor/dsh/packages/boot/app-boot/lib/index.js` 与
  `vendor/dsh/packages/client/modules/lib/client.js` 都在（2026-09-26 建好），本轮 `pnpm release-smoke` 也 **passed**；
  条目挂着的理由（测试已改解析 src、不再依赖它）加这两项证据＝不需要它了。迁移记录 §六 保留为历史。
- 2026-09-27：**培养面二轮整改（自主评审 R1–R10）全部交付、卡毕业至 `implemented/`**，条目离队：
  R1 冻结过期+逃生门 · R2 看选项不再吃掉决定 · R3 办完了一击即发 · R4 带选项的决定上首办卡 ·
  R5 缺口可就地补 · R6 读失败不再永久"正在读" · R7 密度（钳制/Markdown/出处展开/计数带时间）·
  R8 尺寸与对比度到 AA · R9 撤下有痕+状态诚实+能点得动 · R10 引导条不再通往开发者菜单。
  每片带夹具与造红证明（R7/R8 另有前后截图）；R1 还做了真机端到端（冻结→等 175s→解冻）。
- 2026-09-27：**第一公里 P0–P3 交付、卡毕业至 `implemented/`**（本体离队，不打 ✅）；仅 **P1-C 遗留**
  转 ⏳ 条目（触发=真实安装出现"选择工作区"阻塞，或下次做发行 profile）。同日自主跑的两轴评审
  （Standards / Spec）抓到四件并已修：P1-B 提交时漏跑整包（夹具两提交后才补）、`webui-shots` 无入口
  （已加 `pnpm shots` + 命令表 + `docs/dev.md`）、**引导条并非只在空会话渲染**（真 bug：已修 +
  反证截图 + 三态守卫）、P3 两处交叉引用过期。教训补进
  [pre-push-evidence](.agents/skills/pre-push-evidence/SKILL.md)（整包套件 + 覆盖状态的补集）。
