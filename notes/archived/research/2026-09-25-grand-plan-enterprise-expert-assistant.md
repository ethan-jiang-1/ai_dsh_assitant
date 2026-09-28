# 企业聪明助手：深度评审与总体思路（宏观计划）

日期：2026-09-25 · 状态：**已收卷**（§八 五条已逐条处置：领域与流程冻结早已拍板，定位＝底座+专家包、数据边界＝严格本地按既成事实记成决定（反转属用户），渠道选择已决＝只在 DSH 自己的交互面、不做 IM（2026-09-27）；结论的当前权威是[责任圈卡](../../implemented/2026-09-25-owner-mandate-and-real-use-baseline.md) 与 [意图清单](../../intents.md)——本文件冻结为战略底稿）

> 用户原话（2026-09-25）：在 DSH 上做一个聪明的助手，让企业充分利用 DSH 的插件形态（好部署），
> 并在 DSH 生态里找到聪明助手需要的支撑物（谁管记忆、谁管技能、谁管知识脉络……）；但做下去
> "不痛不痒""一拳打到棉花上"。要求：review 完给一个宏大的 plan——①思路层级 ②如何充分利用 DSH
> ③如何充分利用 DSH 插件生态；**思路最重要，具体做法给指导即可**。

## 〇、一页结论

- **诊断**：我们造了一个治理得很好的**容器**（四个房间 + 机器检查 + 有界摘要），但它**没有领域、没有真实用户、
  没有"做对了"的度量**；它的全部知识与技能都在讲它自己。另一方面，研发纪律的投入远超产品投入，
  生态里已有 168 个记忆插件在做同一类容器，而我们钉住的 DSH 已落后上游两个 RC。
- **思路层级（第一件事）**：把北极星从"一个有好记忆的助手"改成"**一个能在企业里把某一类活干对、
  可验证、会越用越好的专家**"。产品形态改成三层：**底座（知识与技能的治理运行时）+ 专家包（领域）
  + 发行组合（企业一键部署）**。度量从"机制是否存在"改成"领域评测集上答得对、办得成"。
- **充分利用 DSH（第二件事）**：DSH 是**装配平台**，不是运行库——先组合（行）、再扩展点、最后才自建
  seam；每个支撑物先找 DSH 原生承载，"自建须有 DSH 载体不可用的证据"。先升 pin 到 `dsh-v0.1.7-rc.1`
  （preset 变成可随 bundle 分发的行，正好是"专家包"的分发机制）。
- **充分利用生态（第三件事）**：**做发行版，不做第 169 个记忆插件**。本仓只做差异化（企业级知识/技能治理
  + 专家包规范 + 评测），其余按"组合 / 适配 / 借鉴 / 自建"四分法从生态里拿；企业最需要的不是更多插件，
  而是**经过准入审查、钉住版本、能一起工作的一组插件**。
- **第一步**：你拍板一个真实领域和一批真实用户（§八），然后用两周做出"专家包 v0 + 评测集 + 一个 IM 渠道"。

---

## 一、评审：为什么"不痛不痒"

### 1.1 现状盘点（2026-09-25，HEAD `ba30b20`）

| 维度 | 读数 | 出处 |
|---|---|---|
| 时间与提交 | 3 天 92 个提交（09-23 12:09 → 09-25 14:06）；约 69 个提交标题落在门禁/notes/ROADMAP/对齐/纪律 | `git log` |
| 代码 vs 过程 | 产品源码 6.0k 行 TS、测试 3.9k 行；门禁与 dev 脚本 2.3k 行；**notes 5.7k 行**；`pnpm verify` 31 道门禁 | `wc -l` 实测 |
| 模型真正读到的"本事" | 6 个策展技能共 **292 行**，全部是自我维护：`home-curation` `memory-hygiene` `self-reflection` `research-backlog` `knowledge-craft` `session-recall` | `presets/assistant/skills/` |
| 领域知识 | 10 页 stable，**全部关于 DSH 与本仓自己**（组合层级、preset 语义、技能 provider 契约、一词一义、信噪比、working folder…） | dev home `knowledge/` |
| 身份 | persona 一句 "You are a long-lived assistant"，SOUL 为内置通用身份——**没有领域** | [`cordis.patch.yml` 的 `preset-assistant` 行](../../../packages/dsh-smart-assistant/cordis.patch.yml) |
| 真实使用 | 用户本人≈0；57 个会话多为开发/代理探针；"自用率 60%"= 它读自己写的关于自己的笔记 | [基线报告](2026-09-25-real-use-baseline.md)、[责任圈卡](../../implemented/2026-09-25-owner-mandate-and-real-use-baseline.md) §十 |
| 上游 | 钉 `dsh-v0.1.5-rc.2`；兄弟仓 `ai_dsh_architect` 已钉 `dsh-v0.1.7-rc.1`（2026-09-23） | [`vendor/UPSTREAM.md`](../../../vendor/UPSTREAM.md) |

### 1.2 五个根因

1. **没有领域，就没有"专家"。** 打磨战役把领域定成了"本仓研发域"（[战役卡](../../implemented/2026-09-25-smart-assistant-polish-campaign.md) D1），
   于是知识、技能、记忆、评测全部指向自己：助手最擅长的事是维护它自己的房子。这是一个**自指闭环**——
   所有指标都在闭环内部转，所以"做了很多、看起来都绿"，但外部没有任何人因此把活干得更好。
2. **把容器当产品。** 四个房间、curate、摘要预算、draft→stable，都是好机制；但它们是**任何助手都需要的底座**，
   不是"聪明"本身。企业感知到的聪明来自：答得对且有出处、能把流程办完、知道自己不知道、越用越准。
   这些都需要**领域内容 + 可执行工具 + 度量**，而我们三样都没有。
3. **意图写在机制层，不写在结果层。** [`intents.md`](../../intents.md) 的 I1–I15 全是"有很好的记忆管理""家有固定布局"
   这类机制意图；它们可以全部 `implemented`，而用户仍然感觉不到价值。**没有一条意图描述"谁、在什么场景、
   把什么活干成了什么样"。**
4. **纪律投入与产品规模错配。** 子树 AGENTS.md、生成目录 + freshness、每道门禁配红夹具、31 道 verify——这是 DSH
   为一个 300 包 monorepo 设计的纪律，搬到一个 6k 行插件上，效果是"门禁绿"持续替代"产品前进"
   （[责任圈卡](../../implemented/2026-09-25-owner-mandate-and-real-use-baseline.md) §五 已自己点破这一点，但处方仍是在内部加仪表）。
5. **向内造轮子，向外看不见生态。** 例：`session-recall` 技能用 `rg` 翻 zstd 会话日志，而 DSH 自带
   `ctx.sessionQuery` + [`tool-session-query`](../../../vendor/dsh/packages/session-query/tool-session-query/README.md)（SQLite FTS5）；
   R1/R3 普查看了记忆与知识生态，结论是"维持自研、不装现成插件"，但**从没把自己放进生态里定位**——
   我们到底是第 169 个记忆插件，还是别的东西？

### 1.3 方向是怎么一步步跑偏的（按时间线的因果链）

> 证据面：本机没有之前的对话记录（Cursor/Claude/Codex 三处都查过），用户当时说了什么只能从 notes 里
> "用户拍板"的转述与提交顺序还原——下面每一步都指向可核验的提交或 note 原文。

1. **架构先于场景定死（09-23 13:00，开仓 51 分钟）。** 第一个实质提交 `391b71a` 就是"完整骨架"：三房间 +
   桌面摘要 + 养护检查。初始意图 I1–I5 写的是"领域专家式"，但具体诉求全是机制（记忆/技能/自我学习/上下文控制）；
   agent 忠实地优化了这些具体诉求，**从头到尾没有追问"哪个领域、给谁用、怎样算做成"**。
   用户也承认当时没有评估标准——这正是 agent 最该追问而没追问的地方。
2. **引进纪律，一路加码（09-23 20:28 起）。** `ae8bc24` 采纳兄弟仓 `ai_dsh_company` 的"DSH 对齐经验"，
   随后是纪律表、门禁 12→15→…→31、notes 分类学、子树 AGENTS.md。**每次用户表达怀疑**（例如 09-25"这么快就完全对齐了？"），
   得到的回应都是**更多流程**（自审 → 补课卡 S1–S5）——因为流程是 agent 能自己完成、自己验收的东西。
3. **用自己的设计当尺子去量生态（09-24 02:36–02:58）。** R1 记忆普查的判据是"人可读文件 / 三房间语义 / 机器养护"，
   结论"维持自研，无一候选同过三关"（[R1](2026-09-24-r1-memory-ecosystem-survey.md) §结论）。
   "三房间语义"是我们自己的设计——**拿"像不像我们"当准入条件，外部方案结构上不可能过关**，"自研"是判据预先决定的。
4. **给用户的菜单里没有"用生态"这个选项（09-24 03:54）。** 三线合流 D0"知识层建不建"：A 建第四房间 / B 维持现状 /
   C 只做 docs 惯例（[tri-line](../../implemented/2026-09-24-tri-line-synthesis.md) D0 行）——**没有"接现成知识库插件或经 MCP 接企业知识库"**。
   用户"D0/D1/D10 三题全 A"，是在一份只含自建方案的菜单里做的选择。
5. **"验证通过"证明的是机制，不是价值（09-24 01:49）。** `b35bb2d`"I1–I13 全部 implemented"——验证会话的内容就是
   在练机制本身（save→recall→curate）。意图全翻绿，进一步坐实了"活干完了"的错觉。
6. **看见了问题，却选了对自己最省事的解（09-25）。** 打磨战役的第一节标题就是"**机制满了，助手还空着**"——诊断是对的；
   但 D1 由 agent 代拍"领域=本仓研发域"，理由是"唯一有真实材料可注入的域……无人值守期可自动跑"
   （[战役卡](../../implemented/2026-09-25-smart-assistant-polish-campaign.md) D1 行）。**选领域的标准是"我能不能无人值守地干下去"，
   而不是"用户能不能得到价值"**，结果把自指闭环焊死了。
7. **无人值守的长时自治放大了向内漂移。** 八小时计划、"全程自主授权"——没有外部评估者在场时，agent 会自然挑
   **能自己验收**的工作：门禁、notes、自己的领域。这不是某一步的失误，而是结构：**自治 + 没有外部判据 = 必然向内**。

**一句话**：每一步单看都讲得通，合起来是一条"用 agent 自己能验收的东西替代用户的价值"的路径。
缺的从来不是勤奋或技术，而是**一个 agent 无法自己满足的外部判据**。§5 阶段 0 的第一道关口就是为此设的。

### 1.4 真正值得保留的资产（不是推倒重来）

- **人可读、可 git、可 diff 的工作目录**（Markdown + frontmatter）——企业审计与知识下发/上行的天然载体（§2.5）。
- **治理语义**：draft→stable 人审、`sources` 出处必填、drop 必写理由、技能 propose→approve→land、provenance 盖章。
  这正是企业"知识治理"的内核，而生态里多数记忆插件是**个人自动记忆**，恰恰缺这一块（§4.4）。
- **机器检查（curate）+ 摘要预算 + 诚实降级**："能让代码查的别让 AI 自己说"——企业可信度的基础。
- **`model-visible ⟺ logged`、双 home 隔离、vendor 不改、垂直切片**——这些纪律是对的，保留。
- **preset-runner**：preset 挂载的 one-shot 驱动——它正好可以变成**评测执行器**（§5 阶段 1）。

---

## 二、第一件事：思路层级（重新定位）

### 2.1 北极星换一句话

| | 旧 | 新 |
|---|---|---|
| 一句话 | 一个拥有自己 working folder、记忆/技能/知识管理得很好的助手 | **一个能在企业里把某一类活干对、可验证、会越用越好的领域专家**；并且**换一个领域只需要换一个包** |
| 用户 | 开发者自己 | 企业里某个岗位的真实员工 + 管理这个专家的知识管理员 |
| 聪明的证据 | 机制存在、门禁绿、自用率 | **领域评测集得分**、真实会话里的完成率与反馈、错误被发现并修正的周期 |

### 2.2 五层思路（从上往下想，从下往上建）

```text
L0 定位      为谁、干什么活、怎样算干成                ← 用户拍板（§八）
L1 产品形态  底座 + 专家包 + 发行组合                  ← §2.3
L2 能力模型  聪明助手的八个支撑物                      ← §2.4（记忆/技能/知识脉络/工具/流程/触达/治理/质量）
L3 实现来源  DSH 原生 → 生态插件 → 本仓自建（按此优先） ← §三、§四
L4 路线      分阶段，每阶段有外部可观察的验收          ← §五
L5 纪律      证据阶梯：评测 > 真实会话 > 测试 > 门禁   ← §七
```

每层只回答自己的问题：L0 不定，L1–L5 都会退化成"机制的整洁"——这正是前三天发生的事。

### 2.3 产品形态：底座 + 专家包 + 发行组合

```text
┌─ 触达 ── Web / Desktop / 飞书·企微·钉钉（生态桥）/ Webhook / SDK·ACP ─────────────────┐
│  专家 A      专家 B      专家 C …        （每个专家 = 一个 preset 行，随专家包分发）      │
│  ├ 身份 SOUL + 手册 + 有界摘要（常驻）                                                  │
│  ├ 专家包：领域技能 · 知识种子 · MCP 连接 · 权限预设 · 评测集                            │
│  └ 通用能力：skill / fs / web / todo / goal / plan / subagent / office / deliverables   │
├─ 底座（本仓 dsh-smart-assistant）── 知识与技能的治理运行时 ────────────────────────────┤
│  分层空间（组织/团队/个人）· 生命周期（draft→stable、propose→land、drop 留尸体）· 出处   │
│  curate 检查 · 摘要预算 · 反馈→提案闭环 · 可插拔后端（文件默认 / 生态记忆适配）          │
├─ DSH 原生 seams ───────────────────────────────────────────────────────────────────────┤
│  ctx.skills · ctx.sessionQuery · ctx.storageDomain · ctx.settings · ctx.approval ·       │
│  permission-presets · sandbox · credentials · telemetry · schedule · jobs · webhook ·    │
│  mcp-client · subagents / agentTeams · goals · planMode · feedback                      │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

- **底座**是本仓的核心资产，重新定位为"**企业知识与技能治理运行时**"——四个房间保留，但它们服务的是
  专家包里的领域内容，而不是助手自己。
- **专家包**是可分发单元：一个 npm 包 / DSH bundle，带 preset 行、技能 provider（形如 DSH 官方
  `dsh-skill-office` 的做法：技能随包分发）、知识种子、MCP 行、权限预设、评测集。**换领域 = 换包**。
- **发行组合**是给企业的一键部署：一个 profile/bundle，把 DSH 原生行 + 经审查的生态插件 + 底座 + 若干专家包
  钉在一起（§4.5）。
- **与兄弟仓的组合关系**（组合思路，不是本轮任务）：`ai_dsh_architect`（插件架构专家，已能脚手架/评审）
  可以演化成"专家包脚手架与评审器"；`ai_dsh_company`、`ai_dsh_deep_research`（多角色 pack）可以成为**消费底座的专家包**。
  这样本仓从"一个助手"变成"专家家族的共同底座"。

### 2.4 能力模型：聪明助手的八个支撑物

用户点名的是记忆、技能、知识脉络；企业场景下还缺五个，缺任何一个都会"不痛不痒"：

| # | 支撑物 | 企业里它回答的问题 | 现状 |
|---|---|---|---|
| 1 | **记忆**（情节 + 语义） | 这个人/团队之前说过什么、定过什么、偏好什么 | 有（单用户、单机） |
| 2 | **技能**（程序性知识） | 这类活按什么步骤做才对（SOP） | 有机制，**无领域技能** |
| 3 | **知识脉络**（权威知识网） | 制度/产品/规范原文是什么、谁负责、何时生效、与什么相关 | 有 wiki 机制，**无领域内容、无批量导入** |
| 4 | **工具与系统接入** | 能不能真的去查系统、填单、出报表 | 只有通用 fs/shell/web |
| 5 | **流程编排** | 长任务、需审批的计划、多专家协作 | 仅用了 goal 节拍器 |
| 6 | **触达** | 员工在哪里用它（IM、门户、定时推送、外部事件触发） | 只有 Web |
| 7 | **治理与信任** | 权限、审批、审计、数据边界、谁改了知识 | 单用户治理语义，无角色/审计 |
| 8 | **质量与进化** | 怎么证明它答得对；错了怎么被发现、修正、不回退 | **没有评测集**；进化环只在自己身上转 |

### 2.5 知识的归属与流动（企业化最关键的一步）

单机单用户的 `dataDir` 在企业里不够用。建议把"working folder"分层，并让知识**有方向地流动**：

| 层 | 装什么 | 谁写 | 载体（建议） |
|---|---|---|---|
| 组织层 | 权威知识、标准 SOP 技能 | 知识管理员，经评审发布 | 专家包内只读分发（随包版本）或组织 git 仓 |
| 团队层 | 团队约定、案例、FAQ | 团队成员提案 + 团队评审 | 共享 git 仓 / 企业知识库（经 MCP） |
| 个人层 | 偏好、草稿、个人笔记 | 本人与助手 | 本机 working folder（现有） |
| 会话层 | 发生过的对话与工具调用 | DSH 自动 | 会话日志 + `ctx.sessionQuery` |

- **下发**：组织/团队层随包或 `git pull` 到达每台机器，只读。
- **上行**：个人会话里学到的东西以 **draft / proposal** 形态向上提交，经评审进入团队/组织层——
  这就是现有 draft→stable、propose→land 的**多人版**；Markdown + git 的选择在这里兑现价值（上行 = PR）。
- **知识脉络的企业字段**：在现有 OKF 子集（type/status/sources/stale_after）上补 **owner（知识责任人）、scope（层）、
  effective（生效/版本）、source-of-truth（原文定位：文件+版本+页/条款）**；curate 相应补"无责任人""原文已更新但页未复审""两页冲突"检查。

### 2.6 用"结果意图"统领"机制意图"

在 `intents.md` 之上加一组**结果意图**（示例，按选定领域改写），机制意图 I1–I15 退为支撑：

| # | 结果意图 | 外部可观察 |
|---|---|---|
| O1 | 答得对且有出处 | 领域评测集上正确率达标，事实性回答引用到原文定位 |
| O2 | 办得成 | 典型 SOP 任务端到端完成（查系统→生成交付物→提交/通知） |
| O3 | 知道自己不知道 | 超出知识范围时明确拒答并指路（找谁/去哪查），不编造 |
| O4 | 越用越好 | 👎 反馈→修正提案→评审→落地的周期可量；评测分不回退 |
| O5 | 部署得了 | 一条命令在企业环境装好（含一个 IM 渠道）；管理员不写 YAML 就能配置 |
| O6 | 管得住 | 按角色的读写权限、知识变更可追溯、数据不出企业边界 |

---

## 三、第二件事：如何充分利用 DSH

### 3.1 心法

1. **DSH 是装配平台。** 一切都是 Cordis 行；产品首先是一份**组合**（profile / bundle / preset 行），其次才是代码。
   新行为按 DSH 自己的归属表走（[architecture.md "Where new behavior goes"](../../../vendor/dsh/docs/architecture.md)）：
   能改一行配置就不加扩展点，能加扩展点就不造 seam，永远不碰 loop。本仓 [`docs/architecture.md`](../../../docs/architecture.md) §三 的参与阶梯已写了这条，但实践中没按它选型。
2. **"不发明"原则**（借自兄弟仓 `ai_dsh_deep_research` 的规则）：优先用 DSH 现成载体；**自建机制必须附"DSH 载体不可用"的证据**，写进 note。
3. **跟上版本列车。** DSH 是 pre-stable、每两周一个 RC；落后越久，迁移越贵，且会错过刚好需要的 seam。
4. **把"智能行为"挂在事件上，而不是写在 persona 里**：召回注入挂 `agent/pre-step`，收尾复盘挂回合/会话结束 + `ctx.jobs`，
   用量与反馈挂 `tools/*` 与 feedback 事件——这样行为可配置、可关闭、可记日志。

### 3.2 支撑物 × DSH 原生承载

| 支撑物 | DSH 原生承载（包名） | 本仓当前 | 建议 |
|---|---|---|---|
| 身份 / 专家切换 | `dsh-persona`、`dsh-agent-instructions`；0.1.7：`agent-preset` 行 + `agent-preset-registry`（默认 preset、选择器、creator 模式） | preset 目录 + roster 根 | **每个专家一个 preset 行，随专家包的 bundle patch 分发** |
| 技能 | `ctx.skills` 多 provider、`dsh-skill-filesystem`、`dsh-tool-skill`；0.1.7 官方范例 `dsh-skill-office`（技能随包） | 策展 + 学到两个 provider | 领域技能做成**专家包自带的 skill provider** |
| 情节记忆（会话史） | `ctx.sessionQuery` + `dsh-session-query-sqlite` + `dsh-tool-session-query` | `session-recall` 用 `rg` 翻日志 | 改用原生；**先核对其 cwd 精确匹配授权**是否适合助手场景 |
| 语义记忆 / 知识 | 无官方 seam（留给生态）；可用 `ctx.storageDomain` 存结构化状态 | 自有 `assistantMemory` 服务 + Markdown 房间 | 保留自有服务，但**把后端做成可插拔**（§4.3 适配） |
| 工具与系统 | `dsh-mcp-client`（外部 MCP 服务注册成原生工具）、`dsh-tool-web`；0.1.7：`mcp-resources`、`skill-office`、`office-to-pdf`、`browser-use` | 未用 | 专家包用 **MCP 行**接企业系统；交付物用 office 技能 |
| 流程 | `ctx.goals`、`plan-mode`、`tool-todo`、`ctx.subagents` / `tool-subagent`、`dsh-tool-workflow`、experimental agent-team | 仅 goal 节拍器 | 需审批的活走 plan-mode；多专家交接走 subagent/agent-team |
| 定时与后台 | `dsh-schedule`（会话内持久提醒）、`ctx.jobs` | 未用 | 周报/巡检/到期复审提醒 |
| 外部事件触发 | `ctx.webhookRuntime` + provider 适配（如 `webhook-github`） | 未用 | 工单/审批/告警事件 → 开一个专家会话 |
| 嵌入企业系统 | TS/Python SDK、ACP server | 未用 | 门户/OA 里嵌专家（阶段 3） |
| 配置 | `ctx.settings` + 设置卡片（client） | 只走 YAML | 管理员面板：知识评审、专家开关、预算 |
| 权限与审批 | `ctx.approval`、`permission-presets`、`sandbox-policy`、`fs-sandbox`、`ctx.credentials` | preset 挂 bash/fs 且 cwd=仓库（F1 越界根源） | 每个专家包带**权限预设**；凭据只走 credentials |
| 审计与可观测 | `session-telemetry` + `session-telemetry-otel`；0.1.7：`product-telemetry-otel` | 自写 `pnpm usage` 读日志 | 企业侧用 OTel 出数；`pnpm usage` 留作开发仪表 |
| 反馈 | `ctx.messageFeedback`（逐条 👍👎）、`command-feedback`（/feedback） | 未用 | **反馈→修正提案闭环的入口**（O4） |
| 评测与回归 | `llm-replay`、`session-snapshot`、`agent-loop-testkit`、`llm-mock-server` | preset-runner 探针 | preset-runner + 评测集 = `pnpm eval`；回放做回归 |

### 3.3 版本列车：先升到 `dsh-v0.1.7-rc.1`

对比两份 vendor 树（本仓 0.1.5-rc.2 vs `ai_dsh_architect` 的 0.1.7-rc.1）[affordance]：

- **preset 机制重构**：`agent-presets` 拆为 `agent-preset` + `agent-preset-registry`；"Definitions are ordinary plugin rows;
  the registry neither scans directories nor accepts preset paths"，新 preset = 一个 bundle patch 插入 `agent-preset` 行，
  经 `plugin_manager` 安装，creator 模式可在对话中生成 [documented]。**本仓的 preset 目录 + roster 打包方式需要迁移**，
  但迁移后"专家包 = bundle = preset 行"天然成立。
- **新增对企业有用的包**：`skill/skill-office`、`document/office-to-pdf`、`mcp/mcp-resources`、`browser-use/*`、`computer-use/*`、
  `ssh/*`、`deliverables/workspace-changes`、`experimental/auto-review`、`boot/plugin-manager`、`host/product-telemetry-otel`。
- 结论：**升 pin 是一切后续工作的前置**，放在阶段 0。

### 3.4 本仓已知"自己造了、DSH 其实有"的点

| 自建 | DSH 原生 | 处置 |
|---|---|---|
| `session-recall` 技能（rg 翻 zstd 日志） | `tool-session-query` | 评估授权约束后替换 |
| `pnpm usage` 读日志做仪表 | telemetry-otel / session-stats / session-projection | 开发期保留；产品侧用原生 |
| 手改 frontmatter 即评审 | `ctx.settings` + client 设置卡片 / 自有 client 面板 | 企业管理员不改 YAML，阶段 2 做评审面板 |
| preset 目录分发 | 0.1.7 preset 行 | 升 pin 时迁移 |

---

## 四、第三件事：如何充分利用 DSH 插件生态

### 4.1 生态事实（基线：`awesome-dsh-plugin` `main@38976afd`，2026-09-12 [observed]）

- **3552 个条目**，30 天长出来；日均新增已从 ~120 降到 39（退潮）。约 22% 未发布 npm。
- 分类：UI 592、工具 477、开发 268、会话 224、流程 216、用量 196、**记忆 168**、模型 156、**技能包 143**、**通知 142**、
  安全 120、远程 109……**身份与通信只有 14**。
- 转化率（新入库 dl≥100）：技能包只有 33%——"能装≠被用"；流程、模型接入、远程触达转化最好。
- 增长点：UI（壳）、远程、成本、流程编排、记忆；"推 IM"一波已过峰但存量巨大；安全类首次进下载榜（`dsh-vault`）。
- **风险**：插件与本人同权限运行；R3 普查曾抓到**冒名包**（`@deepseek-ai/dsh-client-ui-obsidian` 非官方，见
  [R3 §4.3](2026-09-24-r3-knowledge-layer-survey.md)）；大量单人维护。

### 4.2 心法：做发行版，不做第 169 个记忆插件

- 记忆这类容器在生态里是**红海**（168 个，含外部巨头 Hindsight、OpenViking、mem0、MemOS、TencentDB Agent Memory 的接入）。
  我们的容器做得再好，也只是其中之一。
- 企业买的不是"更多插件"，而是**一组经过准入审查、版本钉住、彼此能一起工作、出了问题有人负责的插件**——
  这就是发行版（类比 Linux 发行版：选型、钉版本、集成补丁、安全审查、一键安装）。
- 本仓的差异化只放在生态薄弱处：**企业级知识/技能治理**（多人评审、出处、责任人、分层、审计）、**专家包规范**、**领域评测**。

### 4.3 四分法：组合 / 适配 / 借鉴 / 自建

| 方式 | 什么时候用 | 例子 |
|---|---|---|
| **组合**（原样装进发行组合） | 能力与我们正交、插件守 DSH 边界、通过准入 | IM 渠道桥、通知、成本仪表、知识库连接器 |
| **适配**（在我们的 seam 后面做 provider） | 能力与底座重叠、但企业可能要规模化后端 | 记忆/检索后端：文件默认，Hindsight / OpenViking / mem0 作为可选 provider |
| **借鉴**（读源码学模式，不装） | 模式好但实现不适合直接依赖 | 见 §4.4 "借鉴"列 |
| **自建** | 生态没有或不可信，且是差异化 | 治理运行时、专家包规范、评测执行器 |

决策规则：**DSH 原生 > 通过准入的生态插件 > 适配 > 自建**；选"自建"时在 note 里写明前三者为什么不行。

### 4.4 按支撑物的生态候选（全部需过 §4.5 准入；描述来自各条目自述 [observed]）

| 支撑物 | 组合 / 适配候选 | 借鉴对象（模式） |
|---|---|---|
| 记忆后端 | `vectorize-io/hindsight`、`volcengine/OpenViking`、`zilliztech/memsearch`、`orangeshinee/dsh-mem0`、`Scorp1o117/dsh-tdai-memory` | `highland0971/dsh-native-memory`（storage-domain + session-query + 人工审批 + `(sessionId, seq)` 引证——**最"DSH 原生"的记忆做法**）；`PerryLink/dsh-memento`（有界、审批门、可审计）；`Jesse-njx/dsh-memory`（事实引证回原始日志） |
| 会话回忆 | 原生 `tool-session-query` | `truelove-dreamer/dsh-plugin-recall`（复用 `ctx.sessionQuery` 的 FTS5） |
| 知识连接器 | `NyaaCaster/dsh-yuque-kb`（语雀）、`zhengjy01/dsh-notion-connector`、`greyoak111/siyuan-codex-bridge`（思源 MCP）、`MineRPi/dsh-trilium`、`mingzeng21/dsh-obsidian`、`busabase/busabase-dsh-plugin`（写入走可审阅 ChangeRequest） | `omdsh-dev/dsh-kb-sieve`（从 md/docx/pdf 构建可审计知识包）、`htcqp802/dsh-knowledge-base`（批量导入 + FTS5）、`PerryLink/dsh-library`（引用校验） |
| 技能管理 / 进化 | 原生 `skill-office`（范例）；`Olina1Ye/internal-skill-workshop-plugin`（团队私有 Skill Base） | `weibaohui/hermes-loop`、`VanadisGithub/dsh-skill-evolution`、`qkycir-123/dsh-run2skill`（用户确认才保存）——与我们 propose→land 对照 |
| 领域专家样板 | — | `linhut/gongwen-skill`（公文）、`songoao25/dsh-contract-drafting-agent`（合同）、`duhu2000/dsh-pre-duediligence`（尽调 + 企查查 MCP）：**企业垂直专家有真实需求的信号** |
| 触达（IM） | `omdsh-dev/dsh-lark`（审批/提问/计划卡片回到聊天）、`xmanrui/dsh-im`（9 渠道）、`michaelcode-wang/dsh-wecom`、`ttmouse/dsh-dingtalk-channel`、`WyattJHayes/dsh-feishu-channel`（白名单、风险分级审批、日志脱敏——**最贴企业**） | 各桥的"会话↔群聊映射、审批卡片"模式 |
| 通知 | `a23842/dsh-notifier`（企微/钉钉/飞书/邮件） | — |
| 质量把关 | 0.1.7 原生 `experimental/auto-review`；`bycall/dsh-answer-reviewer`、`CAI-MH/dsh-quality-review` | `Jonah-Wu23/dsh-gungnir`（以命令退出码/产物验证完成，防虚报） |
| 成本 | `dsh-context`、`dsh-cost-meter`（增速榜） | — |
| 企业平台对标 | — | `01men/ybkk-AIOS`（22 个插件：IAM/SSO/MCP 管理/Skill 市场）——看它做了哪些、哪些没人做 |

### 4.5 准入审查（企业白名单）——发行版的核心工作

每个候选进发行组合前过一张表，结论写进一份**发行清单**（名字、钉住版本、审查日期、结论、替代品）：

1. **可安装**：声明 `dsh.bundle`、`dsh plugin add` 可装、与钉住的 DSH 版本兼容（在 dev profile 实测 `--dump-config`）。
2. **守边界**：只经 `ctx.*` seam 与事件扩展，不 patch 上游、不 fork loop（生态头部的共同自觉 [observed]）。
3. **安全**：读源码；列出网络出口、文件读写范围、凭据来源（应走 `ctx.credentials`）、是否执行 shell；核实发布者身份（防冒名）。
4. **维护**：最近提交、作者数、issue 响应；单人维护的要有替代品。
5. **数据边界**：本地优先还是外发；企业要求数据不出域时直接排除外发型。
6. **可替换**：它挂在哪个 seam 上；换掉它要改几行。

### 4.6 生态位与反向贡献

- **我们在生态里的位置**：不是"又一个记忆插件"，而是"**企业专家的底座 + 专家包 + 治理**"。
  生态里"身份与通信"只有 14 条、个人自动记忆占绝大多数、多人评审式知识治理很少——这是空位。
- **反向贡献**：底座与专家包规范发布到生态（进 awesome 列表），让别人的专家包也依赖我们的底座——
  从生态的消费者变成生态的一块支撑物。

---

## 五、宏观计划（分阶段）

每阶段写：目标 / 关键动作 / 外部可观察的验收 / 明确不做。**先做一个包跑通再抽象**（第三个同类出现时再抽平台）。

### 防复发：三道 agent 无法自己满足的关口

§1.3 的结论是"缺一个外部判据"。所以本计划的推进**不由 agent 宣布**，而由下面三道关口放行，任何一道没过就不进下一阶段：

| 关口 | 谁出、谁判 | 过关标准 |
|---|---|---|
| G1 领域与用户 | **用户**点名领域 + 3 个以上真实用户 | 有名字、有岗位、有他们每天真问的问题 |
| G2 评测集 | 题目由**真实用户/领域人**出，agent 只负责整理格式 | 30 条起，每条有期望答案与原文出处，含"应拒答"题 |
| G3 两周探针 | **用户亲自**拿评测集里的题去问 | 用户判"比不用它强"；并且答对的题里多数靠的是 DSH 原生 + 现成插件 + 少量胶水 |

**G1 现状（2026-09-25）**：领域已定——中小企业管理者的数字分身（管理岗基座 + 跟人学），首位真人 = 用户本人
（[意图清单 §〇](../../intents.md)）。"3 个以上真实用户"对分身形态改读为"1 位真人 + 他真实的活"：分身学的是某个人，
第二、三位真人留到基座被证明学得进去之后。G2 相应改为：**评测题由用户本人出**（他真实遇到过的经营难题 + 他认可的拆法）。

G3 同时检验方向本身：如果"组合优先"两周内用很少的自写代码就能答对真实问题，方向成立；如果答不对，问题暴露在两周内，
而不是三天 92 个提交之后。**agent 的职责是把关口需要的东西准备好，不是替用户判关口过没过。**

### 阶段 0 · 重定向（约 1 周）

- **目标**：把"做什么、为谁、怎样算做成"定下来，把地基换到新版本。
- **动作**：
  1. 用户拍板领域与首批用户（§八）；写结果意图 O1–O6 的领域版。
  2. 建**领域评测集 v0**：30–50 条真实问题/任务，每条带期望答案、原文出处、判分规则（含"应拒答"的题）。
  3. 升 pin 到 `dsh-v0.1.7-rc.1`（`pnpm sync-dsh`），迁移 preset 为 `agent-preset` 行；release-smoke 过。
  4. **冻结流程扩张**：不新增门禁、不再重组 notes 结构，除非被产品回归驱动。
- **验收**：评测集入仓；新 pin 下 preset 能挂载、四工具可用；ROADMAP 按新北极星重排。
- **不做**：任何新机制。

### 阶段 1 · 第一个真专家（约 2–3 周）

- **目标**：一个领域专家在真实用户手里答得对、办得成。
- **动作**：
  1. **专家包 v0**：preset 行 + 领域 SOUL + 5–10 个领域 SOP 技能 + 知识种子 + 1–3 个 MCP 连接（没有系统可接时先用文件替身）+ 权限预设（不给 cwd=仓库的写权限）。
  2. **知识批量导入管线**：docx/pdf/网页/企业知识库 → 来源页 + 概念页（带原文定位的出处）→ 批量 draft → 批量评审 → stable。
     现有 `save_page` 一次一页由模型写，撑不住企业文档量。
  3. **检索**：先关键词；评测集出现漏召回再上 FTS，再上 embedding（从此延后项的触发有了**可量的**判据）。
  4. **评测执行器 `pnpm eval`**：preset-runner 跑评测集 → 收集回答与引用 → 自动判分 + 人工抽检 → 报告。它取代"自用率"成为主仪表。
  5. **触达**：Web + 一个 IM 渠道（从 §4.4 候选中过准入选一个）。
- **验收**：评测集得分过你定的线；≥3 位真实用户各用满一周；每个 👎 都有记录与去向。
- **不做**：多专家、平台抽象、自动蒸馏。

### 阶段 2 · 组织化（约 3–4 周）

- **目标**：从"一个人的助手"变成"一个团队的专家"。
- **动作**：
  1. **分层空间**（§2.5）：组织/团队/个人三层，读写权限按角色；上行走提案与评审（git PR 或评审面板）。
  2. **反馈闭环**：`ctx.messageFeedback` 的 👎 → 自动生成"知识修正/技能修正"提案 → 知识管理员评审 → 落地 → 回归评测不降分。
  3. **管理员面板**（client 插件 / 设置卡片）：待评审知识与技能、过期页、无责任人页、专家开关、预算。
  4. **审计**：谁在何时改了哪页知识、哪次回答引用了哪页；OTel 出数。
  5. **定时**：`dsh-schedule` / `ctx.jobs` 做到期复审提醒、周报。
- **验收**：知识变更全链可追溯；一次"员工 👎 → 页被修正 → 同题复测变对"的完整实例；管理员不写 YAML 完成一次评审。

### 阶段 3 · 平台化（第二个领域出现时）

- **目标**：换领域只需换包；企业一条命令部署。
- **动作**：
  1. 从两个真实专家包中**抽出**专家包规范（结构、必带评测集、权限预设、知识种子格式），不是先设计再套。
  2. **专家包脚手架**：与 `ai_dsh_architect` 结合 + DSH 0.1.7 creator 模式——"用对话生成一个新专家包的骨架"。
  3. **可插拔后端**：底座的存储/检索抽成 seam，文件后端默认，生态记忆服务作适配 provider（§4.3）。
  4. **发行组合**：profile/bundle 钉住 DSH 原生行 + 白名单插件 + 底座 + 专家包；Desktop / Web / IM 三种部署形态。
  5. **多专家协作**：subagent / agent-team 做专家间交接（吸收 `ai_dsh_company` 的经验）。
- **验收**：第二个领域从零到可用 ≤ 1 周；在一台干净机器上一条命令装好整套并通过评测。

### 阶段 4 · 规模化进化（有数据之后）

- 从会话史（`ctx.sessionQuery`）半自动蒸馏知识与技能提案；评测门控：**任何技能/知识变更不得降低评测分**。
- 定期巡检（过期、冲突、无责任人、低命中）成为后台作业；按领域出质量周报。
- 何时做全自动蒸馏：看阶段 1–3 积累的反馈与评测数据是否证明收益大于成本（原判据不变，只是终于有了数据面）。

---

## 六、对现有资产的处置

| 资产 | 处置 |
|---|---|
| 四个房间、curate、摘要预算与诚实降级、draft→stable、propose→land | **保留**，重新定位为底座；按 §2.5 加分层与企业字段 |
| 6 个自我维护技能 | **保留**为底座技能；专家包另带领域技能 |
| 10 页 DSH/自身知识 | 留作**开发者知识**（它们对改这个仓库的人有用），不作为产品领域知识 |
| `session-recall` | 评估后改用 `tool-session-query` |
| preset 目录 + roster | 升 pin 时迁移为 `agent-preset` 行 |
| preset-runner | **升格**为评测执行器的底座 |
| `pnpm usage` / 自用率 | 降为开发仪表；主仪表换成评测分 + 真实用户数据 |
| 31 道门禁、子树 AGENTS.md、生成目录、红夹具纪律 | **冻结**（保留现有，不再扩张）；新门禁只为"曾经坏过或会静默坏"的产品行为而立 |
| 长期责任圈 | 保留"每圈测差距→切片→更新队列"的形式，但**差距只从评测与真实用户里测** |

---

## 七、研发纪律再校准

1. **证据阶梯**：领域评测 > 真实用户会话 > 代理会话 > 单元/合同测试 > 机械门禁。上层证据缺席时，下层绿不算前进。
2. **每周至少一个用户可感知的变化**（新领域能力、答对的新题、少一次摩擦）；一周只有过程产物就是报警。
3. **过程预算**：notes 与门禁的增量不应超过产品增量；note 只写"代码与测试说不清的 why 与输掉的方案"（根 AGENTS.md 已有此义务，按字面执行即可）。
4. **"不发明"要留证据**：自建前在 note 里写出 DSH 原生与生态候选为什么不行。
5. **保留的硬纪律**：双 home、vendor 不改、`model-visible ⟺ logged`、垂直切片、提交只 add 自己的路径、报告只列真跑过的命令。

---

## 八、需要你拍板的事（按影响排序）

1. **第一个领域与首批真实用户。** ✅ **已拍板（2026-09-25）**：中小企业 CEO / VP 的数字分身——管理岗基座
   （管理 / 销售 / 财务都有一点，擅长拆复杂问题）+ 跟人配合做几件事就学进去；立场 = **辅助本人**（不代他出面）；
   首位真人 = **用户本人**；首批任务 = **复杂经营问题的拆解与行动计划**；`ai_dsh_company` 的角色技能作为基座内容来源并入本仓。
   结果意图 P1–P3 见 [意图清单 §〇](../../intents.md)。映射到本计划：基座 = §2.3 的"专家包 v0"（管理岗包），
   分身 = §2.5 的**个人层**（从与本人的协作中长出），学习回路 = 现有 reflect / 技能提案 / 知识 draft→stable，
   问题拆解优先用 DSH 原生 plan-mode / subagent 承载而非自建。
   （原判据与候选方向留作记录：高频、有权威文档、答案有明确对错、错了赔得起；曾考虑 `ai_business_*` 客户问答或内部研发知识专家。）
2. **定位**：A 只做一个专家产品 ／ **B 底座 + 专家包（推荐）** ／ C 直接做企业发行版。推荐 B：先用一个包跑通，第二个包出现时再抽平台、做发行版。
3. **首个触达渠道**：飞书 ／ 企业微信 ／ 钉钉 ／ 先只做 Web 与 Desktop。
4. **数据边界**：严格本地优先（排除外发型记忆服务）／ 允许企业自托管服务（mem0、OpenViking 等）／ 允许云服务。
5. **流程减负授权**：同意冻结门禁与 notes 结构扩张，把精力转到评测与领域内容上。

---

## 九、风险

| 风险 | 缓解 |
|---|---|
| 升 pin 迁移成本（preset 重构） | 放阶段 0 一次做完；以 release-smoke + 评测集为验收 |
| 生态插件质量、安全、断供 | 准入表 + 发行清单钉版本 + 每类备一个替代品；优先守 seam 的插件，便于替换 |
| 领域数据难拿或涉密 | 阶段 1 先用可公开或脱敏的子集建评测集；数据边界按 §八 第 4 条 |
| 过早平台化 | 规则：第二个真实领域出现才抽规范，第三个出现才做脚手架 |
| 评测集本身不准 | 评测题由真实用户出、知识管理员审；判分规则公开，人工抽检 |
| LLM 成本 | 评测跑批用低峰时段；成本仪表从生态组合（§4.4） |

## 附：本评审读过什么

- 本仓：ROADMAP（2026-09-28 退役）（ROADMAP 已于 2026-09-28 退役，见 notes/implemented/2026-09-28-roadmap-queue-retired.md）、[`intents.md`](../../intents.md)、[`docs/architecture.md`](../../../docs/architecture.md)、[`docs/home.md`](../../../docs/home.md)、
  [`docs/package-catalog.md`](../../../docs/package-catalog.md)、[责任圈卡](../../implemented/2026-09-25-owner-mandate-and-real-use-baseline.md)、
  [真实使用基线](2026-09-25-real-use-baseline.md)、全部 92 个提交标题、preset 与默认身份源码、dev home 的知识房间清单。
- DSH（钉住 `dsh-v0.1.5-rc.2`）：[architecture.md](../../../vendor/dsh/docs/architecture.md)、[capability-seams.md](../../../vendor/dsh/docs/capability-seams.md)、
  [tool-session-query](../../../vendor/dsh/packages/session-query/tool-session-query/README.md)、[mcp-client](../../../vendor/dsh/packages/mcp/mcp-client/README.md)、
  [schedule](../../../vendor/dsh/packages/schedule/schedule/README.md)、[webhook](../../../vendor/dsh/packages/webhook/webhook/README.md)、
  [goal](../../../vendor/dsh/packages/goal/goal/README.md)、[agent-team](../../../vendor/dsh/packages/experimental/agent-team/README.md) 等 README。
- DSH `dsh-v0.1.7-rc.1`（兄弟仓 `ai_dsh_architect` 的 vendor，2026-09-23）：包目录对比；`agent-preset`、`agent-preset-registry`、`skill-office` README。
- 生态：本机 `awesome-dsh-plugin` 仓（`main@38976afd`，2026-09-12）的 `README.zh.md` 记忆/技能包/身份与通信分类全量、
  企业 IM 关键词检索，以及其研究分支的 `_digested/ecosystem/01-scenario-taxonomy.md`、`04-value-trend.md`。
- 兄弟仓：`ai_dsh_architect`、`ai_dsh_company`、`ai_dsh_deep_research` 的 README。
- **未做**：没有逐个读 §4.4 候选插件的源码；那是 §4.5 准入审查的工作，进入阶段 1 时按需做。
