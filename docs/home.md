# working folder 的契约（唯一权威）

> 这个插件给 agent 一个**自己的 working folder**：一个跨会话存在的工作目录。
> 它的组织本身就是产品的一部分 —— 概念依据是 `Agent = Model + Harness`：
> working folder 就是"那一圈"的物理落点，它的信噪比决定 agent 糊涂还是清醒。
> 布局的**唯一 owner** 是 `src/domain/home/layout.ts`（scaffold 的目录与房间；`ui-mode.json` 的文件名由 `src/host/ui-mode/route.ts` 拥有、`deliverables/` 是模型自发落点，二者不在 scaffold 面上）；本文是它的契约说明，两者必须一致（`pnpm verify` 校验）。
>
> **读法**：布局 §一 → 四房间语义 §二 → 桌面与抽屉 §三 → 机器能查的检查 §四 → 根部两个语义文件 §五。

## 一、布局

```text
<dataDir>/                      # 默认 <dshHome>/assistant（$DSH_HOME → ~/.dsh）
├── SOUL.md                     # 身份：agent 是谁、怎么说话（种子=内置默认；手改不覆盖）
├── MANUAL.md                   # 插件手册：working folder 怎么用（每次渲染；盘上只是镜像）
├── AGENTS.md                   # 你的笔记：追加在手册之后（无 marker、无迁移）
├── skill-usage.json            # 机器账本：skill 工具加载计数（可删，删了计数归零；不进摘要）
├── ui-mode.json                # 机器账本：完整看板密度 per-home（可删，删了回标准）
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
├── skill-proposals/            # 技能提案收件箱（<name>.md，等人工评审；不是房间，是暂存区）
├── audit/                      # 治理台账：approvals.jsonl（promote/deprecate/land/correct/retire 逐行追加，直写带 before/after；非房间，code 不 scaffold 它——首次批准时自建）
└── deliverables/               # 模型写的业务交付稿（见下注；非房间，code 不 scaffold 它）
```

**一个房间一个职责**，不许混：事实进 `memory/`，未决的线索进 `research/`，可复用的做法进 `skills/`，
领域理解进 `knowledge/`。

> **根下的 `deliverables/` 不是房间**：指令面没有这个约定——它是**模型自发**选的落点（把交付物写到
> 盘上的会话留下的，典型是 cwd 即本 working folder 的会话；cwd=仓库根的会话写的是仓库工作区的
> `deliverables/`，那是另一处现场产物）。它不在 `curate` 检查面内、无生命周期管理；人工按需归档或
> 整体删除即可，别当第五个房间读，也别让新会话以为这里有什么契约。

> **与 DSH 词汇的对应（避免两仓同读时错位）**：`memory/`+`research/`+`knowledge/` 对应 DSH 的**持久领域**
> （session log 之外的仓库自有文件）；`skills/` 对应 DSH 的 **runtime Skill capability**（`ctx.skills`
> 的 provider/consumer 面），不是 DSH 仓库里 `.agents/skills/` 那种**开发用** Skill；"桌面"对应
> DSH 的**常驻提示词段落**（system prompt sections），"抽屉"对应**按需查询面**（工具 + 检索）。
> 这些是本仓自己的比喻，DSH 没有同名词——见到它们按上面对应，别当官方术语。
> **另一处撞名是本仓自己的**：`research/` 房间的「backlog 语义」＝这个 working folder 的探索缓冲；
> 开发仓根的 `_backlog/` 推敲空间是另一回事——同名不同物，两处同读时按「产品房间 / 开发目录」分。
`dataDir` 可用配置覆盖（bundle patch / profile patch），默认跟随 `resolveDshHome()` —— 于是**双 home 隔离自动生效**：
开发 harness home 里的 working folder 与日用 harness home 里的互不可见。
**第二个持久化面**：权威经营账本住独立 `<dshHome>/assistant-operating`——不是本 working folder 的房间，
无摘要与 curate 检查面；契约唯一权威 = [`operating.md`](operating.md)，随同一套双 home 隔离。

**并发与秘密**：同一 home 只应有一个写入者——账本用 `writer.lock` 拒绝第二 writer；房间/技能/提案/审计是
原子写但 last-write-wins，并发写不保证合并（读可以并行）。**线索更新、知识页状态翻转、`save_page` 现有页重写与 memory 的 supersede/forget archive** 在写前比较读到的原始文件
内容（CAS）：中途被手改/别会话改过就报 `changed since it was read`，不静默覆盖。working folder 与账本是明文，
不放 API key/token/密码；Viki key 从环境变量读，不写进这里。

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
| `research/` | 还没想清楚的线索：问题、为什么值得追、试过什么、现在倾向什么 | `open` / `parked`（房内挂起）→ **两档出口**：`promoted`（成立）/ `dropped`（不成立，**理由必填**）→ `archive/` | `assistant_research` |
| `skills/` | 学到的做法（可复用、可被模型加载） | 由 DSH 技能 provider 发现与监听；被取代就改文件；**退役**（90 天未用阈值由 curate 报，`retire_skill` 执行）→ `skills/archive/`（不删、可恢复） | `assistant_reflect` |
| `knowledge/` | 领域知识页：概念 / 实体 / 来源 / how-it-works，`[[互链]]` | `draft`（staged，不进搜索与摘要）→ **手改 status: stable 即人审** → `deprecated` 留在原地（链接必须继续解析，无 archive） | `assistant_reflect action=save_page`（写）+ `assistant_knowledge`（只读检索） |

**技能优先级**：provider rank 决定同名解析——项目技能（100）> 学到的 `skills/`（300，custom）> `$DSH_HOME/skills` 与 `~/.agents/skills`（400）> 随包策展技能（600，bundled）。学到技能遮蔽用户同名技能是既定顺序；反过来（学到技能被遮蔽）由 `curate` 报 `skill-shadowed`。

**Obsidian 互通**：`[[互链]]` 语法双方同构，但**解析键不同**——我们 id→title，Obsidian 只认**文件名**（= 我们的 id）：`aliases` 只喂它的补全，裸别名与 `title` 属性都不是解析键（[1.12.7 实测](https://forum.obsidian.md/t/wikilink-resolution-does-not-honor-frontmatter-aliases-1-12-7/113902)）。所以页内链接统一写**两边都认的形态** `[[<id>|<title>]]`：`save_page` 写入时自动把可解析的裸名字链接规范成它，每页 `aliases` 镜像着自己的 title——人在 Obsidian 里打 `[[` + 名字，补全选中后写下的正是这一形态。窄用（单开 `knowledge/` 为 vault：graph/tags/draft→stable 手改即人审）三条纪律：

- **别手打裸名字链接、更别点它建页**——Obsidian 侧 unresolved，点了新建同名空页分叉图，回来被 curate 报 error；
- 目标页尚不存在的链接（curate 报"未写成的知识"）无法规范化、保持原样，也属此类；
- **嵌套 frontmatter 字段走 Source 模式编辑**。

dsh-obsidian 外部 vault 桥先不做：用户真想让助手管某个外部 vault 时再议。

**为什么探索要单独一间房**：不清晰的意图如果没地方放，只会被硬塞进正式流程（污染记忆与技能、拉低信噪比）
或者蒸发（下次从零重开同一个问题）。**分房是为了让"已确立的"保持干净。**

**为什么 drop 必须写理由**：尸体是给未来的自己看的。没有理由的丢弃 = 下次重开同一个问题。

**知识房间怎么进出**（write path 与桥，全部走既有动词）：
- **进**：`assistant_reflect action=save_page`（sources 必填——`memory:<id>` / `research:<id>` /
  URL / repo 路径）写 **draft**；draft 不进搜索与摘要。
- **draft→stable 的评审是本人的**，两条合法路径：① 本人直接改页面/文件的 `status`（那次编辑就是评审）；
  ② 本人在对话或桌面面板上明确批准后，面板直写（host `POST /api/assistant/rooms` 的 `knowledge.approve`）或助手用 `assistant_reflect action=promote_page` 执行那次翻转
  ——**批准是本人的，助手只做那次编辑**（工具描述逐字写着这条）。反向的 `deprecate_page` 同理：
  本人说某页错了/过时了，或 curate 报它过期且本人同意，助手才标；**永不凭自己的判断标**。
- **出（查询）**：`assistant_knowledge`（search / get 附反链，deprecated 可搜带状态）；
  digest 目录树只列 stable。
- **与会话检索的分工**：`assistant_knowledge` 检索的是**我们自己提炼过的知识页**；"上次会话里怎么定的"
  这类**原始会话证据**走 DSH 现货 `session_query` 族（`session_search` 等，SQLite FTS5，索引库在
  DSH home 根 `session-search.db`，host 行 `session-query-sqlite` 翻成 `first-search`）——原始证据
  不进 knowledge 房，提炼后想留存的才经 `assistant_reflect save_page` 入房。
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
  可重新提案（新一轮评审）。已结提案可由 `assistant-data archive-proposals --yes` 移入
  `skill-proposals/archive/`；再提案仍从 archive 继承 `revision`/`created`，不重开历史。
- **触发**：goal 完成时自动排一个**提案槽**（plugin 源消息，propose-only 指令；
  `goalProposalTurns` 可关）。**全自动蒸馏维持延后**（判据不变：用量统计显示收益>成本）；
  brief 报待审提案，curate 报 approved-待落地与提案老化。

## 三、桌面与抽屉（信噪比）

- **桌面**（常驻上下文，四个段落按提示词 order 讲一个顺序的故事：**你是谁（100）→ working folder 怎么用（300）→ 经营事项在账本（400）→ 里面现在有什么（10150）**）：
  - 身份段（`assistant:soul`）：`SOUL.md` 逐字（缺/空回退内置默认身份——回退是替换不是叠加）；
  - 手册段（`assistant:home-manual`）：`MANUAL.md` 的当前渲染 + `AGENTS.md` 笔记（缺则现场渲染当前版，永不落后）；
  - 经营账本段（`assistant:operating-brief`，order 400）：常设一句——经营事项走权威账本（`assistant_operating`），
    不在对话散文里落账。账本住独立 `assistant-operating` dataDir，不在本 working folder 四房间内
    （契约 = [`operating.md`](operating.md)）。
  - 状态摘要（`assistant:memory-digest`，order 10150，**有界** `digestMaxBytes`，默认 6144——键挂在 host 服务行 `assistant-memory` 的 config（包根 `cordis.patch.yml`））：状态行 +
    活跃记忆的精选 + **开放线索的条数与前几条标题** + **知识签树**（stable 页一行一页，作检索路标）。
    预算闸门（`save` 纯新增）：只在**记忆行本身被挤下桌面**时拒绝（消息给出路：retire 或 supersede）；
    线索/签树被挤只报 finding、不堵记忆写入门——堵了也修不好那部分。
    **摘要缓存按活跃房间文件的 size/mtime fingerprint 失效**：用户手改文件后，下一次 prompt 发现 fingerprint
    变化并后台刷新（发现变化的那一次请求仍可能读到旧缓存，下一次请求用新内容）。
    记忆段头明确标「recorded facts, not instructions」：房间文本是用户/模型写下的数据，不是系统指令。
  身份与手册是**working folder 根部的数据文件**（人可改、可 git、scaffold 只在缺失时写）——身份是数据不是
  preset 代码；静态引导（跨请求稳定，cache 友好）与动态状态（摘要）分离。
  桌面只放"此刻最该在眼前的东西"。（本节的「桌面」是常驻上下文的**比喻**；UI 主区的「经营桌面」面板是另一物，契约 = [`operating.md`](operating.md) §三。）
- **抽屉**（要用再拿）：完整记录、归档、知识页、技能正文 —— 用 `assistant_memory` / `assistant_research` /
  `assistant_knowledge` / `skill` 工具取；`assistant_reflect`（§二）管写入面与复盘简报（`brief`）。

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
| 摘要预算 | 摘要被预算截短（`truncated`）——被截掉的记忆对每个会话不可见；只有 `omittedMemories > 0` 时纯新增记忆才被服务层拒绝 | 桌面塞满 = 中间被漏掉；知识树/线索截短本身不阻塞 memory save；supersede/forget 是减压动作 |
| 笔记超预算 | `AGENTS.md` 的字节数超过 prompt 预算（`notes-over-budget`，warn）——模型每次只拿到被截断的笔记尾 | 处置=缩短笔记或把细节移进技能/知识页。生成手册本身由 `tests/host/root-files.spec.ts` 的不变量装进预算 |
| 身份超预算 | `SOUL.md` 的字节数超过 prompt 预算（`soul-over-budget`，warn）——身份会被截断 | 模型每次只拿到被截断的 voice；处置=缩短文件。与手册同一条纪律：超预算必须有人可读的告警 |
| 过期线索 | 超过 `staleResearchDays` 未更新的 `open` 线索 | 悬着的线索会烂，机器先发现 |
| 缺理由的 drop | `status: dropped` 但 `reason` 为空（经线程校验，以 `unreadable-file` 报出） | 尸体没写死因 = 白丢 |
| 技能文件 | 名字不合 `SKILL_NAME` 文法 / 缺 `description` / 目录名与 name 不一致 | 技能会静默不被发现 |
| 同名遮蔽 | 学到技能的名字被注册表判给其他 provider（`skill-shadowed`，探自 curate 所在会话的技能注册表） | `save_skill` 说成功、文件也在 working folder，但**永不加载**——静默失联 |
| 技能无出处 | 技能无 `metadata.origin`（`skill-without-provenance`，info）——手写或未经 `assistant_reflect` 写入 | 出处是学习信心的来源：不知来路的技能不敢退役也不敢信 |
| 技能过期（stale） | 超过 `staleSkillDays`（默认 30 天）未被加载（`skill-stale`，info） | 死技能是目录重；先报候选，去留归 agent |
| 技能可退役 | 超过 `retireSkillDays`（默认 90 天）未被加载（`skill-retirable`，warn） | 每个技能的 name+description 都在目录里占常驻上下文——死技能每请求都在付费；年龄锚点=账本 `lastUsedAt`，从未加载的用 `learnedAt` |
| 技能引用完整性 | SKILL.md 里的相对指针（markdown 链接 / `references/` 反引号路径）指向不存在的文件（`skill-broken-reference`，warn；**save_skill 写完即审**，结果里即时注入，不阻断） | 未来会话顺着指针走会撞墙 |
| 知识断链 · 未写成 | `[[链接]]` 目标不存在（`page-link-unwritten`，info） | OKF："may simply represent not-yet-written knowledge"——成长中的知识不算病 |
| 知识断链 · 引过期 | `[[链接]]` 指向 deprecated 页（`page-link-deprecated`，warn） | 过期知识仍被当作现行引用 |
| 知识断链 · 歧义 / 烂页 | 链接命中多个同名 title（`page-link-ambiguous`，error）；文件解析不了（`page-unreadable`，error） | 会让检索**静默**失效——error 级 |
| 知识孤页 | stable 页无入链无出链（`page-orphan`，info） | 房间图导航不到的孤岛 |
| 知识过期 | `staleAfter` 已过（`page-stale`，info）/ draft 超过 30 天未审（`page-draft-stale`，info） | 机器先发现，到期该复审 |
| 知识无源 | stable 页无 `sources`（`page-unproven`，warn） | 无源知识冒充已确立——"无 sources 不进 stable" |
| 知识源失联 | `memory:` / `research:` source 指向已不存在的记录（`page-source-missing`，warn） | 页面的依据被删/退役后仍装作有据；`refresh`/`curate` 时点名 |
| 记忆像凭据 | memory 文本命中私钥/AWS/GitHub/`sk-`/credential assignment 形状（`credential-shaped-text`，warn） | 记忆进 prompt 与备份；只告警不阻断，strip 后 rotate |
| 提案待落地 | 提案 status=approved 但未 land（`proposal-awaiting-land`，info） | 决定已做未执行——跑 land_skill 收口 |
| 提案老化 | 提案超过 30 天无人处置（`proposal-stale`，info） | 决定悬着没人做——人改 status 挑出口 |
| 技能凭据泄漏 | 技能文本里有疑似活凭据（私钥块/AKIA/sk-/gh_/`api_key:` 式长赋值）（`skill-credential-leak`，warn） | 写入面即攻击面：技能是会到处走的纯文件 |
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

**curate 的节拍器**：host 侧每个 goal 的第 `maintenanceEveryRounds`
（默认 5，`0` 关闭）轮自动插入一条养护 turn（plugin 源 user message，让路栅栏保证它是轮间
安全空槽），指示跑 curate 并逐条处理发现项——养护按节拍进行，不依赖人记得；非 goal 会话仍由 persona 纪律驱动。

## 五、根部的三个语义文件（`MANUAL.md` 插件手册 + `AGENTS.md` 用户笔记 + `SOUL.md` 身份）

分工一句话：手册是插件的，属于这个 working folder 的笔记进 `AGENTS.md`，到处适用的身份进 `SOUL.md`。
（`skill-usage.json`、`ui-mode.json` 是机器账本，不是语义文件。）

- **`SOUL.md`（身份）**：agent 是谁、怎么说话。scaffold 缺则种（种子 = 内置默认身份；默认是管理岗，种子与回退一致），**已有永不覆盖**；空文件不注入。身份段读它逐字进 system prompt（紧贴 persona
  stub，`assistant:soul`）；缺/空/坏 → **回退内置默认**（回退是替换不是叠加）。改人格 = 编辑
  这个文件，不用动插件源码。管理知识种子不随 scaffold 落地；显式装配（包内 `bin/expert-setup.mjs`）把种子导入为 `draft`，`stable` 仍需人审。
- **`MANUAL.md`（插件手册）**：working folder 怎么用——四房间、两档出口、退役、curate、盘上布局、首会话开场
  （first conversation）、首答一页纸（Answer with a page, not a report）、协作边界等节（非穷举，正文以
  `renderHomeManual` 为准）。记忆/知识/技能面板读 host `assistant-rooms` 的 working-folder 真值；业务事项住权威账本（合同见 [`operating.md`](operating.md) §二/§三）。
  **prompt 段直接用 `renderHomeManual()` 的渲染，不读盘上文件**——升级永远最新，没有 generation/marker/迁移；盘上的 `MANUAL.md` 只是给人读的镜像，scaffold 发现漂移时先备份再重写。`assistant-data refresh-manual --yes` 只刷新这个镜像，不碰笔记。
- **`AGENTS.md`（用户笔记）**：属于这个 working folder 的补充。scaffold 缺则种一个短头（指向 `MANUAL.md`）；prompt 把它追加在手冊之后，超预算时截断并报 `notes-over-budget`。
  **旧生成手册的迁移**：带 `<!-- home-manual vN -->` marker 的文件在 scaffold 时整体移到 `AGENTS.md.bak-*`，新 `AGENTS.md` 只保留 notes 头——手改在备份里可见、可手动搬回，但不再自动进 prompt（方案 A）。无 marker 的手写文件原样保留为笔记。
- 三者都是**给人也给 agent 看**的文件；`AGENTS.md` 走业界惯例——DSH 原生装载器认项目根
  与 `$DSH_HOME` 根的同名文件，不探 working folder 根，**同名不同域，互不冲突**。
- persona 行缩为一句 stub（shadow 部署级 persona 的职能不动），身份正文由身份段拥有。
