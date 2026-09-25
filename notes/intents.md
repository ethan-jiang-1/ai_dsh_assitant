# 意图清单（用户原始意图，一股脑收在这里，不许丢）

> 这是 dev-loop 第 1 阶段的落点：**一行动机 + 一行外部可观察行为**。
> 用户一开始把意图一股脑给了，后续又补了一条重要的。两条都记在这，作为所有设计的判据。
> 状态：`proposed` = 已进设计、未实现；`implemented` = 有证据。
> 状态挡板（2026-09-23）：代码与文档切片已交付并提交（见 `notes/implemented/`），但各行意图的
> **外部可观察行为**要在真实会话里验证过才翻 `implemented` —— 全表停在 `proposed`
> 反映的是这个挡板，不是未开工。
> 挡板更新（2026-09-24，战役步骤 1–7 全部跑完后）：**验证载体从"Web UI 真人会话"扩展为"任何真实
> preset 会话"**（含 preset-runner one-shot）——证据标准不变：真实 LLM turn、逐字会话日志、
> 组合可指认（`agentPreset` 头）；载体扩展的依据在战役 note 开跑补记。**I1–I13 全部翻
> implemented**（证据指针在各行）；仅 I14 留 proposed（持续观察——首批数据点：助手会按 persona
> 加载技能、会自主 supersede 过时记忆，但 curate 仍是被动执行）。

## 〇、产品初衷（2026-09-25 用户复述；统领下面所有机制意图）

> 这一节补的是**一开始就有、却从未落字**的初衷。I1–I15 都是机制（记忆/技能/知识/家），
> 它们回答"助手靠什么"，没回答"助手替谁、干什么活"；领域缺席后，助手只能学它自己
> （丢失过程见 [总体思路 §1.3](research/2026-09-25-grand-plan-enterprise-expert-assistant.md)）。
> 从此 I1–I15 是本节的手段，判断一个机制值不值得做，先问它推进了 P1–P3 中的哪一条。

**动机**：中小企业的管理者（CEO / VP 一级）经验多，想培养自己的**数字分身**。先有一个
**管理岗基座**——管理、销售、财务等基础技能都有一点，擅长把复杂问题拆开；然后拿这个基座
**跟人配合做几件事，就把东西学进去**，变成这个人的助手。

**用户拍板（2026-09-25）**：

- **立场 = 辅助本人**：帮他想、帮他做；对外发出的东西由他过目，不代表他出面。
- **第一个真人 = 用户本人**（学习效果由他判，不由 agent 自判）。
- **与 `ai_dsh_company` 的关系 = 本仓做基座 + 学习**：它已有的 CEO / VP-Sales / CFO / COO 角色
  技能作为基座内容的来源搬过来（那边有角色、没有"从真人身上学"；本仓有学习机制、没有角色）。
- **第一批一起做的事 = 复杂经营问题的拆解与行动计划**。

| # | 意图 | 外部可观察行为 | 状态 |
|---|---|---|---|
| P1 | **出厂可用的管理岗基座** | 未学过任何人时，给一个中小企业典型难题（如"下季度销售掉了 20%"），能从管理 / 销售 / 财务视角拆解并给出可执行的行动计划；由用户判"像样" | proposed |
| P2 | **跟人做几件事就学得进去** | 与用户一起完成 3 件同类拆解后，第 4 件不必再交代，就按他的判断标准、口径与模板来做，并能指出"这一条是哪次跟你学来的" | proposed |
| P3 | **学到的东西管得住** | 分身学到了什么，用户能看、能改、能删；学错了能被发现（沿用 I4 / I8 / I9 的人可读文件与机器检查） | proposed |

## 一、初始意图（2026-09-23）

**动机**：想要一个 DSH 插件，是一个**领域专家式的聪明助手**，它自己拥有并安排上下文/工具/提示词，
核心诉求是**让这个专家有一个很好控制的上下文**。

**预期外部可观察行为**（逐条可验）：

| # | 意图 | 外部可观察行为 | 状态 |
|---|---|---|---|
| I1 | 聪明的助手 | 挂上 `assistant` preset 的会话有它自己的 persona、工具集与技能；其他会话不受影响 | implemented：preset 会话（web `e65ef210`、runner `b04a36b5`）日志实证 persona/摘要/三工具真调用；裸 agent 对照（`7c75c86c`、patch 诊断跑）工具表无 assistant 工具 |
| I2 | **很好的记忆管理** | 会话能记住跨会话的事实/偏好/决定；重启后仍在；记忆以**有界摘要**进上下文（不爆上下文），需要时用 `assistant_memory` 深入检索 | implemented：B 段 save→list→recall→curate 四连（含命中理由）；**新进程** recall 命中同一 id `20260923-dev-web-ui-preset-runner-live-kfcf`；digest 821/4096 字节有界 |
| I3 | **很好的技能管理** | 技能按需加载（目录 + 渐进披露）；技能目录可被 agent 自己扩充并**立刻可见**（无需重启） | implemented：save_skill 落 `skills/campaign-evidence-recording/SKILL.md` 后**同会话**即可列出并经 skill 工具加载（会话 D 日志）；策展 4 + 学到 1 双源可见 |
| I4 | **很好的自我学习能力** | 一次会话能被复盘（`assistant_reflect`）成：新的记忆记录 + 新的技能草稿；两者都落成**人能读、能改、能删的文件** | implemented：reflect brief + save_skill 真跑通；SKILL.md 带 provenance（learnedAt 盖章），人可读可删 |
| I5 | 很好控制的上下文 | 上下文由 preset 组装；记忆只以有界摘要常驻；过程性知识放技能（抽屉），不常驻桌面 | implemented：摘要段进每个 preset 会话的请求日志；memory-hygiene 技能按需加载（B 段日志：save 前先 `skill` 调用），过程性知识不常驻 |

## 二、补充意图（2026-09-23 用户追加，同样是一等公民）

**动机**：插件自己拥有一个 **working folder**（它的"家"）。这个家就是它的 harness 那一圈；
**把里头的content整理对、清理干净、让 agent 很熟悉很清晰**，本身就是一件重要的事。

概念依据：talk `agent-101`
（`Agent = Model + Harness`；五件事 = 看到什么/懂什么/会什么/怎么做/怎么验；主线是信噪比；
"能让代码查的，别让 AI 自己说"；桌面 / 抽屉）。

**预期外部可观察行为**：

| # | 意图 | 外部可观察行为 | 状态 |
|---|---|---|---|
| I6 | 家有**固定、可读的布局** | 一个目录一眼看懂：`HOME.md` 是地图；`memory/` 是长期记忆；`skills/` 是学到的本事；各有各的职责，不混 | implemented：会话 A/B 的助手正确报出三房间与状态（`e65ef210` 读 HOME.md；B 段盘上核验 `memory/` 单文件、`archive/` 空） |
| I7 | agent 对家**很熟悉** | 家的地图与记忆摘要常驻上下文（桌面）；细节用工具取（抽屉）。agent 不需要猜"我这儿有什么" | implemented：digest blurb 逐字进 system prompt（全部 preset 会话日志）；会话 A 首轮"你好"即报出家况而未开文件。2026-09-25 战役补强：**首请求即保证**——冷启动竞态两轮修复（cordis `Service.init` 装载等待，[note](implemented/2026-09-25-digest-cold-start-prewarm.md)），live 前后对照：前 271B blurb 自报"没有"，后 4004B 全量逐字报出（6 记忆+2 线索+10 页树，不调工具） |
| I8 | 家要**整理与清理** | 一个**机器能跑的检查**（不是 AI 自己说）报出：重复/矛盾/过期记录、摘要是否超预算、孤儿文件；agent 据此合并/退役 | implemented：curate 机器检查真实运行（B 段：清洁返回 + counts 行 `2/2 active memories, … digest 821/4096 bytes`）；2026-09-24 起 counts 附带技能归档规模行 `N retired bundles, M snapshots`（只增不减的面可观察才可治理，`notes/implemented/2026-09-24-curate-archive-scale.md`）；2026-09-25 战役实证：知识房从 0→10 页生长全程 curate 维持零发现、预算门三次真实咬合（3880→3110→4004/4096 均按设计内动作收敛，[战役卡 §八](implemented/2026-09-25-smart-assistant-polish-campaign.md)） |
| I9 | 家要**清晰可审** | 学到的东西全是人可读的文件（Markdown + frontmatter），可 git、可 diff、可手改、可删；来源可追（哪次会话学来的） | implemented：`memory/*.md` 人可读带 frontmatter（id/kind/tags/importance/created）；`source` 字段经工具面修复后写入读回成立（`20260923-note-ko0j.md`；缺口发现与修复见 `notes/implemented/2026-09-24-tool-source-and-counts.md`） |

## 三、补充意图（2026-09-23 用户追加 · 探索与 backlog）

**动机**：我们**有时候会做研究推敲** —— 意图还不清晰、还不该进入工作流程的那种。
需要有个地方放它们：研究打磨之后，**成立的留着，不成立的丢弃**。像一个 backlog。

**为什么这是流程的入口而不是例外**：不清晰的意图如果没有落脚点，只有两个下场 ——
要么被硬塞进正式流程（污染记忆与技能，信噪比下降），要么蒸发（下次从零重开同一个问题）。
**输掉的方案要留下尸体**，这样同一个问题不会被反复重新讨论。

**预期外部可观察行为**：

| # | 意图 | 外部可观察行为 | 状态 |
|---|---|---|---|
| I10 | 探索有**自己的房间** | 家的 `research/` 放开放线索：一条线索一个文件，带状态（`open`/`parked`）与"为什么值得追" | implemented：R1/R2 真实线索入住（一条一文件带 why/lean/source，`list` 可见；会话 C/D 日志 + 盘上文件） |
| I11 | 探索有**三档出口** | `promote` → 变成记忆记录或技能（成立就留着）；`drop` → 进 `archive/` 并**必须写理由**（不成立就丢弃，留尸体）；`park` → 留在 `research/` 但不占桌面 | implemented：三档全绿——无理由 drop 被拒（日志）；带理由 drop 归档留尸体；promote 指向真实记忆并带 promotedTo；park 留房不占摘要（合同级 bug 红绿修复后复验，`notes/implemented/2026-09-24-park-stays-in-room.md`） |
| I12 | agent **知道自己悬着什么** | 常驻摘要里有"开放线索 N 条 + 前几条标题"，不需要翻文件 | implemented：digest 段落含 `Open threads (N open, M parked)` 与线索标题行（R1/R2 入住后 2/2 同步显示；多会话日志） |
| I13 | 悬着的线索**会烂，机器能发现** | `curate` 报出长期未更新的开放线索（建议 park 或 drop）与缺理由的 drop | implemented：手工造 54 天旧的 stale 夹具，curate 准确报出"open for more than 30 days: pick an exit"（info 级）；处置后 findings 清零（counts 前后对照在案） |

## 四、补充意图（2026-09-23 用户追加 · 迭代节奏）

**动机**：加工是**迭代的、步步为营**的 —— 干一段时间，就要**留一个空槽给"打扫卫生"**
（跑养护检查、处理发现项），不要一路加工到底。是否要自动触发、由什么触发，取决于
DSH 原生对迭代/队列的规划（已另立专项调研），但节奏本身是意图，先收进来。

| # | 意图 | 外部可观察行为 | 状态 |
|---|---|---|---|
| I14 | 迭代有节奏：加工 → **空槽** → 打扫 | 连续加工若干步后，流程里出现一个**明确的养护槽**：`curate` 被执行、发现项逐条处理或显式搁置（park/drop 留理由）；槽由加工节奏触发且**可配置**；打扫的产物（改动/搁置）与加工产物一样是人可读文件 | implemented：host 节拍器每个 goal 的第 `maintenanceEveryRounds` 轮（默认 5，0 关闭）插入 plugin 源养护 turn，让路栅栏保证轮间安全空槽，指示跑 curate 并逐条处理（`notes/implemented/2026-09-24-maintenance-metronome.md`；live 实证 `session-a1127685`：6 轮 goal 第 5 轮触发、养护轮跑 curate、goal 正常恢复完成）；非 goal 会话由 persona 纪律覆盖（iteration-rhythm note 的 a 层） |

## 五、补充意图（2026-09-24 用户追加 · 知识房间）

**动机**：家的三个房间各管一类东西，但**领域知识不是一等公民**——agent 对领域的理解只能
散在记忆（短事实容器）、技能（程序容器）或蒸发。用户偏向 **wiki 式知识结构**（互链、有机
生长、人可编辑）。三线研究（R3 知识层普查）与三线合流提案（2026-09-24 拍板 D0=A）确认：
建**第四房间 `knowledge/`**，押 OKF v0.2 治理字段子集，纯 Markdown、无向量、不装现成插件。

| # | 意图 | 外部可观察行为 | 状态 |
|---|---|---|---|
| I15 | 家有**知识房间** | `knowledge/` 房间：概念/实体/来源页一条一文件，frontmatter 带 OKF 字段子集（type/generated/verified/status/stale_after/sources）+ `[[wikilink]]` 互链；`research` 的 `promote` 可指向知识页（sources 指回线索）；`curate` 报断链（三档）/孤页/stale_after finding；检索走关键词 + 反链现算（无索引服务）；agent 蒸馏的产出走 staged draft，人审才 stable | implemented（阶段 2 全切片：`notes/implemented/2026-09-24-knowledge-*.md` 四篇；live E2E `session-d417555d`：save_page staged→搜索不可见→手改 stable→检索/摘要命中→curate 报 unwritten 链→promote 线索→pin 记忆带 provenance→get 反链，七步逐字在案）。2026-09-25 战役补强：**真实生长**——本仓研发域 10 页 stable 经真实写路径长出（互链成网、search 命中带理由）；预算压力真实触发并按设计治理；wikilink 解析器修复（code span 内字面不再生幻影链）；学到技能 repo-to-knowledge 从三次真实蒸馏经验提炼（[战役卡](implemented/2026-09-25-smart-assistant-polish-campaign.md)） |

## 六、判据（借 talk 的两句，用于决定"搭多厚"）

- **错了赔得起吗？** —— 记忆写错：赔得起（可改可删，人可审）→ 所以记忆走"文件 + 可审"而非数据库。
- **错了多久能发现？** —— 记错了要尽快能发现 → 所以要有**机器能跑的检查**（I8）与**摘要可见**（I7）。
- 反过度工程：不建向量库、不建索引服务、不建后台自动学习循环 —— 等真实痛点到再上（见 proposed note）。
