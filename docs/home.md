# working folder 的契约（唯一权威）

> 这个插件给 agent 一个**自己的 working folder**：一个跨会话存在的工作目录。
> 它的组织本身就是产品的一部分 —— 概念依据是 `Agent = Model + Harness`：
> working folder 就是"那一圈"的物理落点，它的信噪比决定 agent 糊涂还是清醒。
> 布局的**唯一 owner** 是 `src/home/layout.ts`；本文是它的契约说明，两者必须一致（`pnpm verify` 校验）。

## 一、布局

```text
<dataDir>/                      # 默认 <dshHome>/assistant（$DSH_HOME → ~/.dsh）
├── SOUL.md                     # 身份：agent 是谁、怎么说话（种子=内置默认；手改不覆盖）
├── AGENTS.md                    # 手册：working folder 怎么用（AGENTS.md 惯例名；带 scaffold 版本标记）
├── skill-usage.json            # 机器账本：skill 工具加载计数（可删，删了计数归零；不进摘要）
├── memory/                     # 房间一：已确立的事实 / 偏好 / 决定
│   ├── <id>.md                 #   一条记录一个文件（frontmatter + 正文）
│   └── archive/<id>.md         #   被取代 / 退役的（不在摘要里，仍可读）
├── research/                   # 房间二：意图还不清晰的探索（backlog 语义）
│   ├── <id>.md                 #   开放线索：status = open | parked
│   └── archive/<id>.md         #   已结案：status = promoted | dropped
├── skills/                     # 房间三：学到的本事（DSH 技能格式，被 provider 监听）
│   ├── <name>/SKILL.md
│   ├── archive/<name>/SKILL.md #   退役的（移出 provider 扫描、不删、可恢复）
│   └── archive/snapshots/      #   覆盖写入前的旧版快照（每名留最新 3 份，手复制回去即恢复）
├── knowledge/                  # 房间四：领域知识（[[互链]] 页面，OKF 字段子集）
│   └── <id>.md                 #   deprecated 页留在原地——链接必须继续解析
└── skill-proposals/            # 技能提案收件箱（<name>.md，等人工评审；不是房间，是暂存区）
```

**一个房间一个职责**，不许混：事实进 `memory/`，未决的线索进 `research/`，可复用的做法进 `skills/`，
领域理解进 `knowledge/`。

> **与 DSH 词汇的对应（避免两仓同读时错位）**：`memory/`+`research/`+`knowledge/` 对应 DSH 的**持久领域**
> （session log 之外的仓库自有文件）；`skills/` 对应 DSH 的 **runtime Skill capability**（`ctx.skills`
> 的 provider/consumer 面），不是 DSH 仓库里 `.agents/skills/` 那种**开发用** Skill；"桌面"对应
> DSH 的**常驻提示词段落**（system prompt sections），"抽屉"对应**按需查询面**（工具 + 检索）。
> 这些是本仓自己的比喻，DSH 没有同名词——见到它们按上面对应，别当官方术语。
`dataDir` 可用配置覆盖（bundle patch / profile patch），默认跟随 `resolveDshHome()` —— 于是**双 home 隔离自动生效**：
开发 harness home 里的 working folder 与日用 harness home 里的互不可见。

**账本的覆盖窗口**：账本记 `since`（开始计数的时刻）；旧账本没有该字段时，按**最早一次加载**推导下界
（推导而非编造：覆盖不可能比它记下的第一笔更晚）。**`0 次`只表示"窗口内未加载"**，不得当作"从未使用"——
真实案例：一件技能账本报 0 而会话日志里有两次加载，都发生在账本开始之前。`curate` 的 skill usage 行
带窗口（`since YYYY-MM-DD` 或 `ledger window unknown`），退役判断必须连窗口一起读。

**根下的 `skill-usage.json` 不是房间**：它是机器自有的用量账本——每次 `skill` 工具成功加载一个技能，
learn 模块的 `tools/result` 订阅就给对应名字计数（用户 `/name` 斜杠注入不走工具管线，不计）。
`curate` 与 `assistant_reflect brief` 回显计数（最少用在前 / 最多用在前），作为退役决策与
延后判据（自动蒸馏的"真实使用数据"）的数据面。**被遮蔽的名字不回显计数**：计数是名下真值，
遮蔽时加载的是赢家的正文，不归学到的 bundle（遮蔽本身由 `skill-shadowed` finding 报）。
它是**建议性状态**：删掉即归零，不影响任何知识；
文件烂了 curate 会报 warn（静默读零会误导退役决策）。

## 二、四个房间的语义

| 房间 | 里面是什么 | 生命周期 | 谁写 |
|---|---|---|---|
| `memory/` | 跨会话仍然成立的事实、偏好、决定 | `active` → `superseded`（被新记录取代）/ `retired`（不再成立）→ `archive/` | `assistant_memory` |
| `research/` | 还没想清楚的线索：问题、为什么值得追、试过什么、现在倾向什么 | `open` / `parked` → **三档出口**：`promoted`（成立）/ `dropped`（不成立，**理由必填**）→ `archive/` | `assistant_research` |
| `skills/` | 学到的做法（可复用、可被模型加载） | 由 DSH 技能 provider 发现与监听；被取代就改文件；**退役**（90 天未用阈值由 curate 报，`retire_skill` 执行）→ `skills/archive/`（不删、可恢复） | `assistant_reflect` |
| `knowledge/` | 领域知识页：概念 / 实体 / 来源 / how-it-works，`[[互链]]` | `draft`（staged，不进搜索与摘要）→ **手改 status: stable 即人审** → `deprecated` 留在原地（链接必须继续解析，无 archive） | `assistant_reflect action=save_page`（写）+ `assistant_knowledge`（只读检索） |

**Obsidian 互通（[r5](../notes/archived/research/2026-09-24-r5-obsidian-interop-survey.md)）**：`[[互链]]` 语法双方同构，但**解析键不同**——我们 id→title，Obsidian 只认**文件名**（= 我们的 id）：`aliases` 只喂它的补全，裸别名与 `title` 属性都不是解析键（[1.12.7 实测](https://forum.obsidian.md/t/wikilink-resolution-does-not-honor-frontmatter-aliases-1-12-7/113902)）。所以页内链接统一写**两边都认的形态** `[[<id>|<title>]]`：`save_page` 写入时自动把可解析的裸名字链接规范成它，每页 `aliases` 镜像着自己的 title——人在 Obsidian 里打 `[[` + 名字，补全选中后写下的正是这一形态。窄用（单开 `knowledge/` 为 vault：graph/tags/draft→stable 手改即人审）三条纪律：**别手打裸名字链接、更别点它建页**（Obsidian 侧 unresolved，点了新建同名空页分叉图，回来被 curate 报 error）；目标页尚不存在的链接（curate 报"未写成的知识"）无法规范化、保持原样，也属此类；**嵌套 frontmatter 字段走 Source 模式编辑**。dsh-obsidian 外部 vault 桥仍 ⏳ 触发型（ROADMAP）。

**为什么探索要单独一间房**：不清晰的意图如果没地方放，只会被硬塞进正式流程（污染记忆与技能、拉低信噪比）
或者蒸发（下次从零重开同一个问题）。**分房是为了让"已确立的"保持干净。**

**为什么 drop 必须写理由**：尸体是给未来的自己看的。没有理由的丢弃 = 下次重开同一个问题。

**知识房间怎么进出**（write path 与桥，全部走既有动词）：
- **进**：`assistant_reflect action=save_page`（sources 必填——`memory:<id>` / `research:<id>` /
  URL / repo 路径）写 **draft**；draft 不进搜索与摘要。
- **draft→stable 的评审是本人的**，两条合法路径：① 本人直接改页面/文件的 `status`（那次编辑就是评审）；
  ② 本人在对话或桌面面板上明确批准后，助手用 `assistant_reflect action=promote_page` 执行那次翻转
  ——**批准是本人的，助手只做那次编辑**（工具描述逐字写着这条）。反向的 `deprecate_page` 同理：
  本人说某页错了/过时了，或 curate 报它过期且本人同意，助手才标；**永不凭自己的判断标**。
- **出（查询）**：`assistant_knowledge`（search / get 附反链，deprecated 可搜带状态）；
  digest 目录树只列 stable。
- **桥**（memory↔knowledge，不自动同步不双写）：pin = `assistant_memory save` 带
  `source: knowledge:<页id>`；promote = `save_page` 的 sources 引 `memory:<id>`——
  provenance 指针即链接，重复 pin 撞近似重复检查。
- **research 出口**：`promote` 的 `promoted_to` 可指知识页 id（先写页再 promote）。

**技能怎么提案（propose-only，触发演进的落点）**：
- **提案**：`assistant_reflect action=propose_skill` → `skill-proposals/<name>.md`
  （status: proposed；同名重提=改稿，revision 递增、正文替换——审批永远绑定批准时刻的
  文件内容）；**不碰技能房间**。
- **人审**：手改提案文件的 `status: approved / rejected`（与知识 draft 同构——编辑即评审）。
- **落地**：`assistant_reflect action=land_skill`——仅接受 approved 的提案，写进 skills/
  并盖 provenance `proposal:<name>#r<N>`；提案本体记 `landed` 留尸体。rejected/landed 后
  可重新提案（新一轮评审）。
- **触发**：goal 完成时自动排一个**提案槽**（plugin 源消息，propose-only 指令；
  `goalProposalTurns` 可关）。**全自动蒸馏维持延后**（判据不变：用量统计显示收益>成本）；
  brief 报待审提案，curate 报 approved-待落地与提案老化。

## 三、桌面与抽屉（信噪比）

- **桌面**（常驻上下文，三个段落讲一个顺序的故事：**你是谁 → working folder 怎么用 → 里面现在有什么**）：
  - 身份段（`assistant:soul`）：`SOUL.md` 逐字（缺/空回退内置默认身份——回退是替换不是叠加）；
  - 手册段（`assistant:home-manual`）：`AGENTS.md` 逐字（缺则现场渲染当前版，永不落后）；
  - 状态摘要（`assistant:memory-digest`，**有界** `digestMaxBytes`）：状态行 + 活跃记忆的精选 +
    **开放线索的条数与前几条标题**。
  身份与手册是**working folder 根部的数据文件**（人可改、可 git、scaffold 只在缺失时写）——身份是数据不是
  preset 代码；静态引导（跨请求稳定，cache 友好）与动态状态（摘要）分离。
  桌面只放"此刻最该在眼前的东西"。
- **抽屉**（要用再拿）：完整记录、归档、知识页、技能正文 —— 用 `assistant_memory` / `assistant_research` /
  `assistant_knowledge` / `skill` 工具取。

推论：**过程性知识不做成常驻段落**。怎么写记忆、怎么养护 working folder、怎么复盘 —— 都在 `skills/`（抽屉），
由技能目录按需加载。这条是"很好控制的上下文"的落点。

## 四、机器能查的检查（`curate`）

`assistant_memory action=curate` 返回一份**纯函数算出来的**养护简报（同一个函数也被测试与 repo 门禁消费）：

| 检查 | 报什么 | 为什么 |
|---|---|---|
| frontmatter 合法性 | 解析不了 / 缺必填字段的记录 | 烂文件会静默退出摘要，等于悄悄丢失 |
| id 唯一性 | 重复 id | 记录身份必须唯一 |
| 悬空引用 | `supersedes` / `promotedTo` 指向不存在的 id | 引用断掉会让历史读不出来 |
| 近似重复 | 高重合的活跃记忆（关键词/标签） | 三条模糊的记忆比一条准确的更糟 |
| 摘要预算 | 摘要被预算截短（`truncated`）——被截掉的记忆对每个会话不可见 | 桌面塞满 = 中间被漏掉；**且纯新增写入在截断态被服务层拒绝**（supersede/forget 开放——它们是减压动作） |
| 手册漂移 | `AGENTS.md` 的 scaffold 版本标记旧于当前（`manual-stale-scaffold`，info） | 持久化生成物会静默腐烂——**手改内容不报**（手改是拥有者的），版本落后才报；处置=删文件重新生成或忽略 |
| 过期线索 | 超过 `staleResearchDays` 未更新的 `open` 线索 | 悬着的线索会烂，机器先发现 |
| 缺理由的 drop | `status: dropped` 但 `reason` 为空 | 尸体没写死因 = 白丢 |
| 技能文件 | 名字不合 `SKILL_NAME` 文法 / 缺 `description` / 目录名与 name 不一致 | 技能会静默不被发现 |
| 同名遮蔽 | 学到技能的名字被注册表判给其他 provider（`skill-shadowed`，探自 curate 所在会话的技能注册表） | `save_skill` 说成功、文件也在 working folder，但**永不加载**——静默失联 |
| 技能过期（stale） | 超过 `staleSkillDays`（默认 30 天）未被加载（`skill-stale`，info） | 死技能是目录重；先报候选，去留归 agent |
| 技能可退役 | 超过 `retireSkillDays`（默认 90 天）未被加载（`skill-retirable`，warn） | 每个技能的 name+description 都在目录里占常驻上下文——死技能每请求都在付费；年龄锚点=账本 `lastUsedAt`，从未加载的用 `learnedAt` |
| 技能引用完整性 | SKILL.md 里的相对指针（markdown 链接 / `references/` 反引号路径）指向不存在的文件（`skill-broken-reference`，warn；**save_skill 写完即审**，结果里即时注入，不阻断） | 未来会话顺着指针走会撞墙 |
| 知识断链 · 未写成 | `[[链接]]` 目标不存在（`page-link-unwritten`，info） | OKF："may simply represent not-yet-written knowledge"——成长中的知识不算病 |
| 知识断链 · 引过期 | `[[链接]]` 指向 deprecated 页（`page-link-deprecated`，warn） | 过期知识仍被当作现行引用 |
| 知识断链 · 歧义 / 烂页 | 链接命中多个同名 title（`page-link-ambiguous`，error）；文件解析不了（`page-unreadable`，error） | 会让检索**静默**失效——error 级 |
| 知识孤页 | stable 页无入链无出链（`page-orphan`，info） | 房间图导航不到的孤岛 |
| 知识过期 | `staleAfter` 已过（`page-stale`，info）/ draft 超过 30 天未审（`page-draft-stale`，info） | 机器先发现，到期该复审 |
| 知识无源 | stable 页无 `sources`（`page-unproven`，warn） | 无源知识冒充已确立——"无 sources 不进 stable" |
| 提案待落地 | 提案 status=approved 但未 land（`proposal-awaiting-land`，info） | 决定已做未执行——跑 land_skill 收口 |
| 提案老化 | 提案超过 30 天无人处置（`proposal-stale`，info） | 决定悬着没人做——人改 status 挑出口 |
| 技能凭据泄漏 | 技能文本里有疑似活凭据（私钥块/AKIA/sk-/gh_/`api_key:` 式长赋值）（`skill-credential-leak`，warn） | 写入面即攻击面（ClawHavoc 教训）：技能是会到处走的纯文件 |
| 用量账本可读性 | `skill-usage.json` 存在但解析不了 | 静默读零会误导退役决策 |

简报同时附带两个**数据面**（不是 finding）：**技能用量**——每个学到技能的加载次数与最近使用
（最少用在前），这是治理环（退役、触发演进延后判据）的依据；**归档规模**——一行 `N retired
bundles, M snapshots`，退役与快照都不删除、技能归档只增不减，规模可观察才可治理（live 助手
对爬升数字的观察登记）。

**判据**：能让代码查的，别让 AI 自己说。

**预算吃紧时的降级顺序（永不静默）**：①先去掉知识树每页的描述提示——**每页仍然在树上有名有 id**；
②仍不够就停止列条目，并追加一行显式省略标记（`+N more … omitted — digest budget`）；
③**状态栏（地图）永远不被驱逐**——空间连标记都放不下时，丢标记而不是丢地图。
判据：desktop 可以变短，但不许**谎报完整**（意图：知道自己有什么、也知道自己没看到什么）。

**已知边界（工具描述同源）**：`curate` 是 working folder 的纯函数——**看不见 git 状态、未提交改动，
也看不见同一棵树里的并行会话**。所以"报 clean"只等于"房间干净"，不等于"现场干净"；在仓库里工作时
这两者的差别要如实说出来（同一条纪律也在家手册的协作边界节）。

**curate 不再只靠人记得**：host 侧节拍器（I14）每个 goal 的第 `maintenanceEveryRounds`
（默认 5，`0` 关闭）轮自动插入一条养护 turn（plugin 源 user message，让路栅栏保证它是轮间
安全空槽），指示跑 curate 并逐条处理发现项；非 goal 会话仍由 persona 纪律驱动。

## 五、working folder 根部的两个文件（`SOUL.md` 身份 + `AGENTS.md` 手册）

抄 Hermes 的形状（调研 `notes/archived/research/2026-09-24-r4-hermes-identity-survey.md`；决定
`notes/implemented/2026-09-24-soul-and-agents.md`，D1/D2/D3=a）：**身份与引导分文件**，
分工一句话——到处适用的进 `SOUL.md`，属于这个 working folder 的进 `AGENTS.md`。

- **`SOUL.md`（身份）**：agent 是谁、怎么说话。scaffold 缺则种（种子 = 内置默认身份，day 0
  行为零变化），**已有永不覆盖**；空文件不注入。身份段读它逐字进 system prompt（紧贴 persona
  stub，`assistant:soul`）；缺/空/坏 → **回退内置默认**（回退是替换不是叠加）。改人格 = 编辑
  这个文件，不用动插件源码。
- **`AGENTS.md`（手册）**：working folder 怎么用——四房间、三档出口、退役、curate、盘上布局，以及
  **桌面文件（`.desk/state.json`）的最小契约**（`generatedAt` + 各分区；面板的唯一数据源）。
  scaffold 缺则种（首行 `<!-- home-manual vN -->` 版本标记），永不覆盖；手册段
  （`assistant:home-manual`）逐字进 system prompt；缺则**现场渲染当前版**（缺文件永不落后）。
  版本标记旧于当前由 curate 报 info（见 §四「手册漂移」）。
- 两者都是**给人也给 agent 看**的文件；文件名走 AGENTS.md 业界惯例——DSH 原生装载器认项目根
  与 `$DSH_HOME` 根的同名文件，不探 working folder 根，**同名不同域，互不冲突**。
- persona 行缩为一句 stub（shadow 部署级 persona 的职能不动），身份正文由身份段拥有。

**旧 `HOME.md` 概念已清零**（2026-09-24，同 diff 扫掉代码/测试/文档/preset 全部引用）；
dev home 的旧文件已删，由新 scaffold 种出两个新文件。
