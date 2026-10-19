---
topic: 自更新
intent: "把『助手怎么学到东西、学到的东西怎么被维护』拆成三条通道与六张账，指认面板缺的是数据通路而不是按钮，并给下一切片排序。"
---

# 261019 · 助手如何更新自己：三条通道、六张账、面板维护面的缺口

> 立档：2026-10-19 ｜ 用途：给 [自更新通道卡](../../issues/261019-self-update-lanes.md) 当依据——裁决、排序与验收住卡上，本档只收事实、判断与候选，不构成合同，也不构成实施授权。
> 用户本轮原话：「我们有知识/记忆（这里进入的靠对话？能在 Panel 里面维护吗？）……智能体还需要 SKILL，我们现在还有 Viki……整体如何提高这个助手，显性更新（来自 Panel），隐形更新（来自对话）……你可以统筹地思考一下吗？」
> 坐标：包内路径相对 `packages/dsh-smart-assistant/`，`文件:行` 以本档写作时的源码为准；标【事实】的是可指到代码/文档/实物的，标【判断】的是从证据出发的推论。

## 〇、先把词钉死：其实是三条通道，不是两条

用户说的是显性/隐性两条，机制上要拆成三条——**它们今天挂的门禁完全不同**：

| 通道 | 定义 | 人在哪 | 今天谁决定写 |
|---|---|---|---|
| **显性** | 人在面板上主动点按、纠错、批准 | 当场看着目标 | 人发起，模型执行（唯一例外：知识批准走宿主直调） |
| **隐性** | 人在对话里说了什么，模型自己判断记不记、记成什么 | 在场，但没有指定"这是记忆" | 模型 |
| **自动** | 没有人开口也会发生的写入：Viki 抽取、养护节拍器、curate | 不在场 | 机器 |

三条通道的风险与代价是**反着**的（§三 D1）：越没人看的通道，门越少；越有人看着的通道，路越长。

判据沿用本仓自己那两句：**错了赔得起吗？错了多久能发现？** 下面每张表都尽量把这两句填出来。

## 一、事实：写入面（六张账）

### 1.1 一张表看完

| 面 | 权威存储 | 唯一写入口 | 写入前有门吗 | 怎么进下一次请求 | 错了多久能发现 |
|---|---|---|---|---|---|
| 记忆 | `memory/<id>.md` | `assistant_memory` 的 `save` / `forget`（五动作：`recall/save/forget/list/curate`，[tool-memory/index.ts:26](../../../packages/dsh-smart-assistant/src/agent/tool-memory/index.ts#L26)） | **没有**草稿态、没有人工门；`source`/`why` 只是留痕 | 有界摘要精选（`digestMaxBytes` 6144）+ `recall` 检索 | 下次读到它、或 curate 报重复；没有定时复审 |
| 线索 | `research/<id>.md` | `assistant_research`（`open/update/park/drop/promote`，[tool-research/index.ts:21](../../../packages/dsh-smart-assistant/src/agent/tool-research/index.ts#L21)） | `drop` 必填理由；`promote` 指向已存在的记忆/知识/技能 | 摘要里的条数 + 前几条标题 | curate 的过期线索检查（`staleResearchDays`） |
| 知识 | `knowledge/<id>.md` | `assistant_reflect` 的 `save_page` → `promote_page` | **有**：`save_page` 只写 draft，draft 不进检索与摘要；`sources` 必填；promote/deprecate 逐行入审批账 | stable 页进摘要签树（一行一页）+ `assistant_knowledge` 检索 | 草稿等人审时可见；**stable 的错误没有复审节拍**，只有 `staleAfter` |
| 学到的技能 | `skills/<name>/SKILL.md` | 两条：`save_skill` 直写；或 `propose_skill` → 人改 `status: approved` → `land_skill` | 提案道有门；**直写道没有**（写完只跑一次引用完整性） | 技能目录的 `name` + `description` 每个请求常驻（"死技能每请求都在付费"） | 加载时才发现不适用；curate 报 30/90 天未用 |
| 经营账本 | `assistant-operating/ledger.json` | `assistant_operating` 13 动作 | 权限三分（普通进展自动留存；确认性变化只走本人明确指示；推断变化只走提案） | 不进模型上下文；桌面读只读投影 | 提案通道 + 回执；本档不对它下判断（契约 = [operating.md](../../../docs/operating.md)） |
| **Viki**（OpenViking） | server 侧 workspace（`.tmp/openviking/workspace/...`） | **自动**：`session/event` 捕获 + 阈值 commit（我们的剖面 `commitTokenThreshold: 3000`） | **没有**；只有 `ov-shield` 挡住它的 MCP 工具面与两个同名技能 | 每轮注入：画像块（`profileTokenBudget` 3000）+ 召回块（`recallTokenBudget` 2000） | 用户只觉得"它记错了"；没有对账面 |

【事实】前五行的机制在 [docs/home.md](../../../docs/home.md) §一–§四；第六行的旋钮剖面与治理边界在 [层 1 落地 note](../../../notes/archived/2026-10-04-openviking-layer1-landing.md) 决定 2–3，捕获/注入的钩子在本机安装的插件里（`index.mjs` 的 `session/event` 订阅、`shared/config-schema.mjs` 的 `autoCapture` / `noAutoInject` / `profileTokenBudget`）。

### 1.2 三条通道各自的"入口长什么样"

- **显性**：只有面板（§二）。没有别的显性入口——`SOUL.md` / `AGENTS.md` / 房间文件都能手改，但那是文件系统，不是产品面。
- **隐性**：模型在会话里调上表工具。**它是否发生不由机制保证**：没有会话收尾复盘（[architecture.md](../../../docs/architecture.md) §六把它列在延后项），只有 goal 会话每 5 轮一次的养护节拍器（[home.md](../../../docs/home.md) §四末），其余靠 persona 与技能纪律。
- **自动**：Viki 的捕获是机制保证的（每个 `session/event` 都进捕获缓冲），养护节拍器与提案槽是机制保证的，curate 的**执行**不是。

### 1.3 规模读数（dev home，2026-10-19）

`dev/harness-home/assistant/` 是基座试车场，不是真人使用读数，但它是这套门禁的**实际吞吐**：

| 房间 | 读数 | 读法 |
|---|---|---|
| 记忆 | 14 条活跃 | 模型直接写，无人工门——积得住 |
| 知识 | 24 页：**9 draft / 5 stable / 10 deprecated** | 人工审批是吞吐瓶颈：待审 9 页压着，stable 只有 5 页 |
| 线索 | 11 条 | — |
| 学到的技能 | 2 件（另有 archive） | 直写道产物；账本只有 load 次数，**无逐技能 token 成本** |
| 提案 | 2 份，均 `landed` | — |

【判断】9 draft vs 5 stable 不是"人不想批"，更像"批一次太贵/看不见"：面板只给草稿 200 字片段（[panels.ts:77](../../../packages/dsh-smart-assistant/src/client/panels.ts#L77)），批准一个自己没读到正文的页，本来就不该爽快。10 页 deprecated 则说明**淘汰比确立容易**（过时只需一次点击，纠错要写一段话）。

## 二、事实：面板今天到底是什么

### 2.1 逐动作（代码即事实）

| 面板动作 | 实现 | 走的路 | 一次点击 = 一次模型回合？ | 点完在面板上看到结果要多久 |
|---|---|---|---|---|
| 记忆「这条记错了」 | `correctMemory`（[room-data-actions.ts:63](../../../packages/dsh-smart-assistant/src/client/room-data-actions.ts#L63)） | `[面板] ` 前缀 + queue 投递到会话 | **是** | 模型同回合重写房间数据文件后（客户端 10s × 15 轮询） |
| 知识「批准」 | `approveKnowledgePage`（同文件 :83） | 直调 `remote.assistantKnowledge.approvePage` → 宿主服务；挂载失败回退 prompt | **否**（唯一一条） | **仍要等下一次 `desk-refresh`**，因为面板读的是拷贝（注释自认） |
| 知识「过时了」 | `deprecateKnowledgePage`（:110） | prompt | 是 | 同回合刷新后 |
| 知识「有问题」 | `flagKnowledgePage`（:127） | prompt，带问题描述 | 是 | 同回合刷新后 |
| 技能提案「批准 / 拒绝」 | `askApproveProposal`（:44）/ `askRejectProposal`（:52） | prompt | 是 | 同回合刷新后 |
| 刷新房间数据 | `askRefresh`（:23） | prompt，**指名加载 `desk-refresh` 技能** | 是 | 轮询 |
| 开始第一件事 | `askStart`（:34） | prompt | 是 | — |
| 技能 | 无 | 一行计数 + "哪一件不想要了，在对话里说一声即可下掉"（[panels.ts:160](../../../packages/dsh-smart-assistant/src/client/panels.ts#L160)） | — | — |
| 新增记忆 / 知识 / 线索 | **无入口** | — | — | — |
| 读知识正文 | **无入口**（draft 只有 `excerpt`；stable 只有标题/类型/时间/来源） | — | — | — |
| 删除 | 只有知识的"过时"（deprecated 留原地）；记忆与技能都没有删除动作 | — | — | — |

### 2.2 三个结构性结论

**P-1｜面板是"对话的遥柄"，不是编辑器。** 除知识批准外，每个按钮都只是替人往会话里投一句话（`[面板] ` 标记，[room-data-io.ts:272](../../../packages/dsh-smart-assistant/src/client/room-data-io.ts#L272)），再由模型去读文件、改文件、重写快照。这解释了用户问题的第一半：**"这里进入的靠对话吗"——是的，而且到今天为止只有对话是写入口；面板只是把这句话代你说出去。**

**P-2｜面板读的是第三份拷贝，陈旧是结构性的，不是 bug。** 真值在房间文件（`memory/`、`knowledge/`）与账本；面板读 `.desk/state.json`——由 `desk-refresh` 技能在会话里**重写**的一份画像（[desk-refresh/SKILL.md](../../../packages/dsh-smart-assistant/presets/assistant/skills/desk-refresh/SKILL.md)）。于是任何"改真值"的动作都要再等一次模型回合，连直调成功的批准也是（`room-data-actions.ts` 的注释：*the desk file itself still lists the row as a draft until the next desk-refresh turn rewrites it*）。2026-10-18 桌面受理位已经因为"客户端不拥有权威"而拒绝过直写账本（[desk-side-capture note](../../../notes/implemented/2026-10-18-desk-side-capture.md) 输掉的方案第 1 条），同一个理由今天指向房间面板。

**P-3｜内容在场度决定"维护"的语义。** 记忆行渲染的是记录全文（一句话），所以纠错可操作；知识行只有标题、类型、时间、来源，草稿多 200 字片段——**正文不在场**，于是"维护"退化成"表态"（批准/说它过时/说它有问题），而"改什么"只能靠嘴描述。技能连表态的对象都没有，只有一个数字。

**P-4｜面板与会话绑定。** tab 的正文按 session 取切片，没有会话就读不到也动不了（[room-tabs.ts](../../../packages/dsh-smart-assistant/src/client/room-tabs.ts) 的 `tabBody`）；空文件夹时面板给的是"先开始第一件事"的按钮。对"维护"来说这是个便宜的约束（维护总得在一个工作区里），但它也说明面板不是独立的管理台。

## 三、诊断（八条，带证据）

**D1｜门禁挂错了通道（核心）。** 最需要审的通道（自动：Viki 抽取直接进每轮注入）没有门；最该快的通道（显性：人正读着那行字）要两次模型回合（改 + 重写快照）且结果滞后；隐性通道的门参差（知识有 draft、技能提案有审、记忆与 `save_skill` 直写）。判据的两句在这里都答不上：赔得起吗——Viki 的错误会被每轮复述；多久能发现——面板看不到 Viki 的任何东西。

**D2｜双记忆无对账。** 房间记忆（治理、可读、小、可数）与 Viki（自动、大、不可枚举、带画像）互不知道对方，没有 `source` 互通、没有冲突处理、没有"这条两边都有"的标记。层 2 治理桥（`source: openviking:<id>` 转正语法 + 摘要情景记忆计数行）在 [层 1 note](../../../notes/archived/2026-10-04-openviking-layer1-landing.md) 里写明"待层 1 跑一个真实使用周期"——**2026-10-19 的真机往返（抽取记录号 `20261019-2026-10-19-g6wx` + server 侧 embedding 用量审计）已经把那个条件满足了**（[pin 追平 note](../../../notes/implemented/2026-10-19-openviking-pin-catch-up.md)），所以现在不动的理由不再是"等周期"，而是没人决定。

**D3｜拷贝即第二份真相（且已经付过代价）。** 面板的每个状态都落后一次模型重写；`askRefresh` 之所以存在，是因为没有别的刷新路。同一类问题在隔壁面已经被裁决过两次：桌面主动行的第三行"只读平台排程、不在客户端造暂停副本"（[proactive-face note](../../../notes/implemented/2026-10-18-proactive-face.md) 输掉的方案第 4 条）、桌面受理位"客户端不拥有经营权威，写入必须走账本"（[desk-side-capture note](../../../notes/implemented/2026-10-18-desk-side-capture.md) 输掉的方案第 1 条）。**同一个判据在房间面板上还没被用过。**

**D4｜知识正文不在场，审批与纠错都在猜。** §1.3 的 9 draft / 5 stable 是吞吐证据；人对一个只看到 200 字的页说"批准"，等于让我们替他把关。这不是 UI 打磨问题：**没有读正文的路，就没有真正的维护**。

**D5｜技能是 P3 的最大欠账。** 产品判据 P3 要求"学到了什么，用户能看、能改、能删"（[README](../../../README.md)）。技能现状：三处来源（随包策展 / 学到 / Viki 的技能目录——后者被 shield 遮蔽）、面板只有一个计数、退役只能靠对话、用量账本（`skill-usage.json`）只有 curate 与 `reflect brief` 会读。**过程性知识恰恰是"越用越像本人"（O4）最值钱的一类**，它却是最看不见的一类。

**D6｜隐性更新不可见，也就无法验收。** 没有"这次会话改了什么"的收据；摘要本身是不可见段落；面板是滞后拷贝。P2 要求"能指出这条是哪次学来的"——**记录级 provenance 其实已经有了**（memory 的 `source`、knowledge 的 `sources`、skill 的 `metadata.origin`、审批账 `audit/approvals.jsonl`），缺的是把它们汇成"自上次以来"的一眼。这是最便宜的一刀：不需要新事件、不需要新存储。

**D7｜Viki 的治理停在层 1，内容面无读者无写者。** 层 1 挡的是它的工具面与技能面（模型看得见的接口），没挡它的**内容**：抽取物直接进画像/召回块。真实代价付过一次——[pin 追平 note](../../../notes/implemented/2026-10-19-openviking-pin-catch-up.md) 遗留节：助手在真机往返里主动指出长期记忆里压着**另一家公司的 14 条旧底子**，与新写入的事实并存。位置今天核过：**不在本机这份 dev 工作区**（见 §5.2，那里只剩 identity/soul 两条模板），在另一份工作区/宿主目录里；产品侧的缺口不变——我们能列出它、删掉它、回滚它（API 现成），但**没有任何面**，只有模型通过被挡的工具够得着。

**D8｜隐性的供给不确定，"该记的没记"与"不该记的记了"同时存在。** 会话收尾复盘被延后（触发条件未变：需要真实使用数据说明收益 > token 与同意成本），所以隐性通道的实际供给 = 模型想不想得起来；自动通道则相反，供过于求且无门。两条通道的失败模式相反，而它们写进的是不同的存储，谁也纠不了谁。

## 四、外部对照（一手为主，2026-10-19 取；旁证，不作依据）

口径：只收厂商一手文档/更新日志；标【未证实】的是找不到一手来源的。本仓已有的两档对照（[261012 机制对照](../positioning/261012-personal-agent-differentiation.md)、[261018 主动性 UX](../positioning/261018-proactive-ux-mechanics.md)）不重复采，此节只补"写入面/维护面"这一维。

| 产品 | 显性面形状 | 逐条能改吗 | 捕获前有门吗 | 写入回执 | 软删 / 版本 |
|---|---|---|---|---|---|
| **ChatGPT** | Settings > Personalization > Memory：列表 + 记忆摘要 + Sources（"Manage memories" 是 2024/2025 的旧标签，现已不是独立页） | 能，但"改"是对摘要/条目的**纠正指令**（输入框里写、或选中文本改），不是自由文本编辑 | **没有**；2026-06-04 更新日志明说改为自动更新，理由是减少陈旧/矛盾记忆 | "Memory updated" 提示（2024-09-05） | 单条删除 / "Don't mention this again"（只抑制、不删源）/ 删对话 ≠ 删记忆 / 2025-10-22 起可看并恢复历史版本 |
| **Claude** | Settings > Memory > Topics：选主题 → 改 / 删；"改动对之后所有对话生效" | 能，主题级 | **没有**；自动捕获默认开（团队/企业默认关） | **每次保存**在输入框上方出现提示，可当场拒绝 | 单条删除；组织管理员**看不到**成员个人记忆；组织级关 = 立刻全删 |
| **Claude Code** | `CLAUDE.md`（纯 markdown，人写、可 git）+ `/memory` 打开 `$EDITOR`；自动记忆是另一套（`MEMORY.md` + 主题文件，agent 写） | **文本级**；自动记忆"随时可改可删" | 手写文件有；自动记忆无（`autoMemoryEnabled` / `CLAUDE_CODE_DISABLE_AUTO_MEMORY` 是开关，不是门） | 被动一行"Saved 2 memories" | 文件即真相；v2.1.214 起在 frontmatter 记修改时间 |
| **Letta** | memory blocks（XML 化前置）+ MemFS（git 化的文件系统，每次编辑成一次提交） | 能（PATCH 覆盖 block / 直接改文件） | **没有**；"agent autonomously organize"；Dreaming 明说"不向你请求批准" | 无 | git 提交史 + 冲突解决；block 有 `read_only` 标记 |
| **Mem0** | dashboard 是**开发者**面 | 能（CRUD API；`infer=False` 可原样存） | 提取无门；dashboard 的 copilot 有"Review changes"（逐条批）vs "Auto-apply" | 无 | 提取**只增不改**：文档自认陈旧事实要应用自己 `update`/`delete` |

四条横向结论，其中第一条直接影响本档结论：

1. **没有一家给"自动捕获"设事先审批队列。** 审查一律**事后**（列表 + 删 + 关）；唯一的"事中"窗口是 Claude 那种**每次保存的一条可拒绝提示**。→ 这条质疑本档 S3 的"候选层"：**事先排队是本仓自创的门，不是业界形状**（见 §五 5.1 的修正）。
2. **显性面收敛到五件套**：列表、单条删、全局开关、"别再提这条"、回源（Sources / 依据）。本仓**数据上已有四件**（退役、取代链、`source`、摘要），缺的是第 1、2、4 件的**面**——这正好是 S1 + S2 + S5 拼起来的东西。
3. **"改"在分叉**：文件型产品给文本编辑 + 版本（Claude Code、Letta MemFS）；聊天型产品给"纠正指令"（ChatGPT、Claude）。本仓是文件型（P3 判据就是"人可读文件"），所以**文本级可见**是对的路——但不必给自由编辑器，受控字段 + 只读正文就够（S1 读、S2 受限写）。
4. **跨上下文串味是当前活跃的 bug 类**：Claude Code v2.1.268 修"公共同道互相回忆"、Claude 的项目隔离、ChatGPT 的项目级记忆——厂商在加**作用域**，不在加**审批**。本仓 Viki 那 14 条旧公司记忆属同一类；**解法是作用域与来源标记，不是排队**。

另两条可用于验收口径的：**"记忆写满"是真实产品状态**（ChatGPT 有容量态 + 自动优先级；"降级"= 软忘）——本仓已有摘要预算与 `omittedMemories` 拒绝，方向一致，不必再发明；**删除不即时/日志留 30 天**（OpenAI FAQ）说明"删了等于没了"是要写清楚的承诺，本仓房间是文件（删除即时），Viki 侧删除走 `fs DELETE`（§5.2 已实测），要写清的是"删了备份在哪、怎么回滚"。

**第二轮补采（同日，针对本档五个候选的取舍逐条找先例，全文与逐条引语在 [261019-file-memory-panel-precedents](../memory-panel/261019-file-memory-panel-precedents.md)）**——它把上表里"我们的方向"从"没人做过所以自创"改成"有人做过，形状可抄"：

| 我们的候选 | 先例 | 形状可以抄什么 | 抄不了什么 |
|---|---|---|---|
| 面板**新增**一条记忆（Q1） | 除 **Claude in Slack** 的管理员 Memory 页（CHANGELOG 2.1.296）与 **Cursor Rules 的 Add Rule**（建文件，非建条目），终端用户面**没有**新增表单 | 只借"新建 = 建一个文件、正文即真相" | **作者/来源字段没有先例**——人建的条目谁署名，是我们自创的语义（更支持"不新增，改由对话/消息级记下来产出"） |
| 面板**直写**（Q2） | GitHub Wiki history 记"谁改的 + 提交说明 + 时间"；Letta MemFS 每次编辑=一次 git 提交（版本史 + 冲突解决）；Obsidian File recovery 存整篇快照 + "Show changes" 差异 | **留痕用底层 VCS 的 author/message/时间**，不另造"人/机器"列 | 没有任何第一方产品把"人 vs agent"做成显式字段；我们的 `audit/approvals.jsonl` 是同一件事的自建形态，够用不必升级 |
| 退役**派生拷贝**（Q3） | Obsidian 明确保留 metadata cache（"可能失同步…可重建"）；Letta MemFS 反例：小目录不要索引 | 若要缓存，**必须是可重建、非模型作者**的那种 | "每次渲染直读"的失败模式无第一方文档（属推论）；我们几百个文件，先直读、以取数合同兜住 |
| 自动捕获**不设门**（Q4） | 同 §四 结论 1、4；**Claude Tag v2.1.268** 的修法是"每个频道各自记自己的、不再跨公开频道回忆"——**加作用域而非加审批** | 作用域（房间/工作区级）+ 事后逐条删 | 单主体产品没有多频道串味问题，抄的是"隔离优先"这条判断，不是频道机制 |
| 技能**可见 + 退役**（Q5） | **Claude Code `/skill-doctor`（≥v2.1.252）**：`/plugin` 的 **Stats** 页列每个技能的 **context 成本 + 调用次数**，并标出"从未被调用"的、给出关闭位置；Letta `skills list` / `skills delete` | **"成本 + 次数 + 关在哪"三件**正是我们要的列；退役=关掉/删掉，不是新生命周期 | 没有产品把"agent 自学的技能"与"作者写的技能"在 UI 里分开；这一格是我们自己的（P3 要求"能看能改能删"，而外部多为文件或 CLI） |

【判断】补采把 C 卡的形状钉得更死：技能面照 `/skill-doctor`（用量 + 成本 + 关闭位置），"记下来"不新增作者语义（走消息 → 记忆，`source` 天然可考）。

**来源**（2026-10-19 取，一手文档/更新日志；直连被代理持解析，经 `r.jina.ai` 取原文）：ChatGPT 记忆帮助页 `help.openai.com/en/articles/8590148` 与 2026-06-04 更新日志 `help.openai.com/en/articles/6825453`；2024-09-05 记忆与控件公告 `openai.com/index/memory-and-new-controls-for-chatgpt/`。Claude 记忆帮助页 `support.claude.com/en/articles/11817273`。Claude Code 记忆文档 `code.claude.com/docs/en/memory` 与 changelog v2.1.181 / v2.1.214 / v2.1.268 / v2.1.275。Letta memory blocks `docs.letta.com/guides/agents/memory-blocks`、MemFS `docs.letta.com/concepts/memfs`。Mem0 记忆类型 `docs.mem0.ai/core-concepts/memory-types`、copilot `docs.mem0.ai/platform/copilot`、DSH 插件 `docs.mem0.ai/integrations/deepseek-plugin`。
【未证实】ChatGPT 存在"记忆审批队列"：未找到任何一手来源；社区帖未采信。第二轮补采另留下五处未证实（Notion/Logseq 的逐编辑留痕、Ink & Switch 原文、任何"人 vs agent"作者字段、任何"先排队后取消"的 changelog、每次渲染直读磁盘的失败模式），清单在 [先例档](../memory-panel/261019-file-memory-panel-precedents.md) 末节。

## 五、候选：七个切片

排序判据：**先修数据通路，再修门，最后修节拍**——按钮接在拷贝上，怎么改都是错觉。

| # | 切片 | 做什么 | 动哪个面 | 代价 | 需本人点头？ |
|---|---|---|---|---|---|
| **S1** | 面板读权威 | 宿主加一条只读路由（照经营投影的形状），面板读房间真值；`.desk/state.json` 与 `desk-refresh` 技能降级/退役 | host + client + `docs/home.md` + 家手册 + `desk-refresh` 技能 | 中：一个新路由 + 客户端换源 + 合同与手册同 diff；收益是**消灭陈旧类 bug 与"刷新"这个动词** | 是（合同变更 + 技能退役） |
| **S2** | 面板直写 | 把 `approvePage` 那条直调车道扩到：记忆纠错/退役、知识批准/过时、技能退役（提案批准也可）；每次写入带 `source: panel-direct` 入审批账 | host 服务方法 + client 挂载 + 审计 | 中：每条动作一个方法 + 校验（id 存在、状态合法） | 是（新增写入口） |
| **S3** | 候选层 | 隐性/自动产物先落"候选"再转正：记忆加一个 `status: candidate`（不新增房间）；Viki 抽取物以 `source: openviking:<id>` 进候选（**或**按 §四 结论 1 降级为"先进房间 + 可见回执"），人批或高置信规则转正 | domain + 工具 + 面板 + Viki 层 2 桥 | **大**：改记忆生命周期（增设状态）、改摘要口径、改 Viki 内容面 | 是（产品语义 + 可能触记忆格式） |
| **S4** | 变更收据 | "自上次以来"一眼：本会话/本房间的 delta（+N 记忆、M 页待审、K 件技能退役候选），数据源 = 文件 mtime + `audit/approvals.jsonl`，不新增会话事件 | client + host 读路由（可与 S1 复用） | 小 | 否（可由 S1 顺带，但仍建议随 S1 呈批） |
| **S5** | 技能面最小可见 | 学到技能逐件列表：名字 + 用量 + 最近使用 + 出处 + 一个"退役"；正文以只读抽屉打开 | client + host（复用 S2 车道） | 小–中 | 是（P3 面的产品语义） |
| **S6** | "记下来" | 消息级动作：把这条（或选中片段）记成记忆（或记忆候选），人一次确认 | client（vendor 消息动作座）+ 工具 | 中：要确认 vendor 是否有消息级动作槽 | 是（新交互面） |
| **S7** | 会话收尾复盘 | `session/end` + 后台回合自动 reflect | host + 模型可见面 | 大（每次会话一次模型回合） | 维持延后，触发条件不变 |

### 5.1 几个已考虑的替代（为什么没进表）

- **把房间做成自由 Markdown 编辑器**：破坏 frontmatter/provenance/生命周期，等于把 schema 校验交给用户；"人可读文件"已经满足（P3 的字面），产品面要的是**受控字段的修改**，不是文本编辑。外部也印证：文件型产品（Claude Code、Letta）给文本编辑，聊天型产品只给纠正指令——本仓是文件型，但**只读正文 + 受控写**落在两者之间，代价最低。
- **每条自动写入都事先排队等人批（"待确认记忆"队列）**：**外部没有任何一家这么做**（§四 结论 1）；审查一律事后。事先排队会把"它记住了"变成"它等你点"，与"默认静默、有事开口"的既有裁决（261008）冲突。→ 保留为 S3 的可选形态，**默认不选**；默认走"先进房间 + 可见回执"（S4），再加软删与回源（S2/S5）。
- **面板直接调模型 API（绕过会话）**：造第二个 write path 与第二个审计面；直调宿主服务更窄。
- **统一成一个存储（把 Viki 当唯一记忆，或把房间灌进 Viki）**：前者放弃四房间的治理与可读性，后者的抽取质量不足以当权威（两条旧读数——14 条旧公司底子与本次会话标题把上下文误当事实——都是反证）。
- **把"刷新"做成自动轮询真值**：治标；只要还读拷贝，就还要重写拷贝，`askRefresh` 那个动词迟早回来。
- **给 Viki 侧做逐条删除面**：~~内容面不可枚举~~——**此判断当日被证伪**：`fs/ls` + `fs DELETE` + `snapshot/commit|diff|restore` 都是现成 API，抽取物是 `viking://user/default/memories/{profile.md,preferences,entities,events}` 下的**文件**，逐条可列可删。改由 **B 卡自立**（自带 `assistantViki` 宿主路由，不并进 S2 的 `approvePage` 车道）做进 [B 卡](../../issues/261019-viki-content-governance.md)。

### 5.2 Viki 内容面的存量事实（2026-10-19 在本机 dev server 上实测，推翻了本节早期的一处假设）

| 问题 | 读数 | 取证 |
|---|---|---|
| 抽取物存在哪 | `viking://user/default/memories/profile.md`（身份 + 时间线，超预算时**掐中间、留头和尾**）+ `preferences/<owner>/<topic>.md` + `entities/<owner>/<topic>.md` + `events/<Y>/<M>/<D>/<title>.md`（从 pin note 的质量抽评条与 `shared/profile-inject.mjs` 头注两处独立得到） | [260928 安装卡](../../_archive/settled_issues/260928-openviking-install-release.md) 第 5 步；vendor 插件源码 |
| 今天还剩什么 | `.tmp/openviking` 工作区是**新起的一份**：memories 下只有 `identity.md`、`soul.md`（模板态，`version 2`），**没有** `profile.md` / 三个分类目录；`stats/memories` 报 6 条全部是本次会话的 `events`（最后 0.1 天内）；profile 块今天为空 | `curl 127.0.0.1:1933/api/v1/stats/memories`、`fs/ls`、`sessions/*/context` |
| 那 14 条旧公司底子在哪 | **不在**这份工作区里；宿主目录里也不存在第二份工作区（全仓只有 `.tmp/openviking/workspace`）。推断是**另一份工作区/宿主目录**（试点或日用环境）留下的，pin note 记录的是那次真机往返读到的东西 | `find` 全仓 workspace；两条互斥读数并列登记 |
| 逐条可管吗 | **可**：`GET fs/ls?recursive=true` 列 `rel_path` + `abstract`，`GET content/read` 读正文，`DELETE /api/v1/fs?uri=` 逐条删，`snapshot/commit|diff|show|restore` 提供 git 式版本与回滚；`sessions/{id}` DELETE 清会话 | `openapi.json`（server 0.4.22）实测 |
| 昨天记的"删除今天没有出口" | **错**：出口是 API 级的、现成的；缺的是**我们这一侧的调用者与面**（插件只暴露工具面，被 shield 挡掉） | 同上 |

【判断】这条实测把 Viki 从"需要一个候选层来兜住不可控的东西"变成"**一个可枚举、可删、可版本化的文件树，只是没有读者和写者**"。做法因此变成：列表 + 读正文 + 逐条删 + 写入前备份（snapshot），与房间侧的"列表 + 读正文 + 受控写"**同一套形状**——两处的面可以复用同一个面板骨架。

### 5.3 冲突与退役的形状候选（本人 10-19 交给 agent 判，见 [B 卡](../../issues/261019-viki-content-governance.md)）

先分清三件事，早期的口径把它们混成了一个词"纠错"：

| 事 | 触发 | 谁判 | 载体 |
|---|---|---|---|
| **取代**（superseded） | 同一事实的新值进来，旧值**仍然真过**（生日 10-20 取代 10-19） | 机器可判：同一 `key`/同一页内同一行有新旧两条 | 记忆已有 `status: superseded` + `supersededBy` + `supersedes`；知识有 `deprecated` + 取代链 |
| **退役**（user-retired） | 人判定"这条不该再被用"（口径不对、那是别人的事、别家公司） | **只有人** | 记忆 `status: retired` + `why`（作者 = `panel`）；Viki 是**删 + 备份** |
| **冲突**（contradicts） | 两条都在、互相矛盾，且**没有权威谁新谁对**（两个口径、两种说法） | 机器只能**发现**并排出来，裁决仍在人 | 今天没有任何载体；这是缺口 |

【判断】"冲突时把旧的丢掉"只在**取代**这一格成立：旧值不是被删，是被标成 `superseded`（文件留着、审计链完整、坏账可回滚），这与记忆今天的行为一致、也是 Claude Code/Letta 的做法（文件即真相 + 版本）。在**冲突**这一格机器不代删——它会把它自己判成"旧"的那条删掉，等于用一个错换另一个错；正确形状是**并排摆出来 + 一句"以哪条为准"**，人点完变成取代，机器再执行丢弃。在**退役**这一格，删除是真的删除，但必须先备份（Viki snapshot / 房间的 `archive` 子目录），且证明"其它关系不指向它"（`supersedes`/`supersededBy`/知识 `sources`/线索指针）——备份加引用证明，才能让"删了等于没了"这句承诺成立。

## 六、推荐序列

**§五 的切片与三张卡的对应（先看这张表再读下文，别自己对号）：**

| 切片 | 去向 |
|---|---|
| S1 面板读权威 | **A1** |
| S2 面板直写 | **A2**（真机可达是它的先决，见下） |
| S4 变更收据 | **A3** |
| S3 候选层 | **不做**（外部无先例 + Viki 可枚举可删）；它的 Viki 半边**改由 B 卡**以"列表 + 冲突并排 + 带备份删除"取代 |
| S5 技能面 | **C1** |
| S6 "记下来" | **C2**（消息槽已确认存在） |
| S7 会话收尾复盘 | **不做本轮**（触发条件未变） |

**P0 = A 卡三片（读权威 S1 + 直写 S2 + 收据 S4，这是用户问题的直接答案）。** 面板要能"维护"，必要条件只有两个：**读的是真值**、**写的动作当场生效**；S4 补上第三条——**看得见最近变了什么**（外部产品的"Memory updated / Saved 2 memories"就是这一条）。三片合起来是一次架构改动（宿主读写同源 + 客户端换源 + 直写车道 + 收据），分开做会出现"能读不能写"或"能写但看不到"的中间态。
- **不是"模型面零变化"**：A1 退役 `desk-refresh`（模型可见策展技能，`docs/package-catalog.md` 有列）并改家手册的 Room data 节（`home-map.ts:66`，模型每轮读）与 `operating-brief` 一句。这是**减法 + 合同收口**，代价是必须跑 `pnpm gen-catalog`、`pnpm build`、`pnpm eval`；能先做的理由变成"风险集中在客户端与宿主服务，模型行为只有删减、没有新增能力"。
- **S2 的先决证据是"真机可达"，不是"代码已有"**：2026-10-19 重核 261004——client `$mount` 强制 strict codec（`vendor/dsh/packages/api/gateway/lib/types/client/index.js:597-611`），本包 classic-script 面拿不到 zod；挂载失败被 info 级日志吞掉，面板静默回退。所以 A2 第一步是探针（控制台 `assistantKnowledge remote mounted` + 宿主侧调用证据），红则按 A 卡写好的降级形态走。
- 会退役 `desk-refresh` 技能与 `.desk/state.json` 合同：这是**减法**，但属于合同变更，须本人点头（A 卡 Q3）。

**P1 = [B 卡](../../issues/261019-viki-content-governance.md)（Viki 内容面：可枚举 + 可读 + 逐条删 + 写前备份 + 冲突并排）。** D2/D7 的正解；§5.2 的实测把它的代价从"大"降到"中"（API 全现成，缺的是调用者与面）。
- **不做候选层**：§四 结论 1 + §5.2 两条一起否掉了事先排队；B 卡用"列表 + 并排冲突 + 逐条删（带备份）"这一套。
- **存量清理放进同一张卡的验收，但拆成两截**：判据 + 流程在本机 fixture 上证明；**真数据在那份到不了的工作区，由本人执行并回填回执**（B 卡验收第 6/7 行）。不拆就写出一条谁也执行不了的验收。

**P2 = [C 卡](../../issues/261019-learned-skills-surface.md)（技能逐件可见与退役）。** P3 的直接欠账；可复用 A 卡的直写车道，边际成本小。

**P3 = 同一张 C 卡的"记下来"。** 口味面；vendor 消息动作槽已确认存在（`conversation.chat.assistant-actions`），剩下的是"允许一条来源=消息 id 的新建"这个白名单开口。它提升的是隐性通道的**自愿性**（人说"这条留着"），比自动复盘便宜一个数量级。

**不做 = S7。** 触发条件未变，本轮不动。

## 七、反证与未决

1. **直写会不会绕过模型、把 schema 写坏？** 会，如果直写覆盖"新建页/新建技能/改正文"。**收窄**：直写只覆盖受限动作（翻状态、改一句记忆文本、退役），新建仍走模型；宿主侧对 id/状态做白名单校验，写后跑一次纯核（curate 的同一函数）。
2. **退役 `.desk/state.json` 会不会伤到模型面？** **会，但只是减法**，而且今天写错了位置：模型确实读这个合同——`desk-refresh` 技能正文、家手册的 Room data 节（`src/domain/home/home-map.ts:66`）、`operating-brief` 的一句 prompt（`src/agent/operating-brief/index.ts:39`）都在教它维护这个文件。这些必须同 diff 收口（另加 `action-plan/SKILL.md:46` 的交叉引用、`docs/home.md:201`、`docs/architecture.md:262/288`、`docs/dev.md:135`）；`_backlog/triggers.md` 里**没有**对应行，不要照抄。
3. **候选层是不是过度工程？** 两条证据把答案推向"是"：外部没有人做事先审批（§四 结论 1），而 Viki 的抽取物本来就是**可枚举、可删、可回滚**的文件（§5.2）——把可控的东西再套一层队列，是把不可控当成了事实。剩下的合理内核只有两条——**来源可考**与**事后可撤**，两条都不需要新状态。
4. **Viki 的内容面该不该关？** 关掉画像块会掉"它记得我"的体感（也是 P2 的卖点）；不关则污染持续注入。折中比"候选层"便宜：**先把来源标记与旧数据清理做完**，再看画像块里还剩多少无出处事实；B 卡里"冲突并排"那一节就是这件事的最小形态。
5. **面板读真值后，"刷新"这个动作消失，用户会不会失去"它在更新"的确定感？** 这正是 S4 要替它答的：用"变了什么"替代"点一下刷新"。刷新按钮今天有三处要一起收：`dom-utils.ts:257`（按钮）、`dom-utils.ts:193`（失败文案还会教用户点它）、`room-data-actions.ts:24`（`askRefresh`）。
6. **面板老化的另一种解释**（反证我自己的 D3）：也许 `.desk/state.json` 当初不是错误，而是**为了避开给客户端加远程通道**——261004 判定直调需上游缝。**2026-10-19 重核结论：这个解释站得住**——`requireStrictCodec` 仍在、`src-json` 只用于 uplink/result、本包贡献在真机会被拒；261004 卡至今是 rejected。所以 D3 的定性要改成"**在当时的约束下是正确的权宜，约束今天仍在**"，而不是纯技术债；A1 因此走宿主 HTTP 路由（`desk-projection` 的形状），A2 必须先证明挂载成功。

## 八、待裁的五问与建议（用户 10-19 当天把判定权交回 agent 处理的部分已并入建议，不再单列）

| # | 问 | 建议 | 依据 |
|---|---|---|---|
| Q1 | 面板允许"新增"一条记忆/知识页吗？ | **不新增**：面板只做纠错/批准/退役；"我想让它记住"由 C 卡的"记下来"承接（消息级、带来源、一次确认） | 来源是 provenance 的第一公民；建表就等于让人手填来源，填不对就是第二份假账 |
| Q2 | 直写的边界 | **翻状态 + 改一句记忆文本**；不新建、不改知识正文、不改技能正文 | 知识正文是"模型读过材料后写的"，人改正文等于绕过 `sources` 校验；记忆本来就是一句话 |
| Q3 | `.desk/state.json` 与 `desk-refresh` 技能退役 | **退役**，面板改读宿主 `rooms` 只读路由；不另建派生索引 | 几百个小文件的 live read 足够（A 卡验收里有阈值）；保留拷贝就是保留第二份真相 |
| Q4 | Viki 抽取物怎么管 + 那 14 条怎么处置 | **可枚举 + 可读 + 逐条删（写前备份）+ 冲突并排**；14 条按"越界"**整批清除**，不逐条挑 | §5.2 实测的 API；§5.3 的两格判据；逐条挑 = 逼人读别家经营数据 |
| Q5 | 技能面 | **上逐件列表**（名字/用量/最近/出处/退役）+ 正文只读抽屉 | P3 判据字面要求"能看能改能删"，今天只有一个计数 |

【我此前判错、现已改正的两处】"Viki 删除今天没有出口"（错，API 现成）与"14 条还在本机注入面"（错，它们是另一份工作区的数据）——两处都写进 §5.2 的实测表，不静默修改。
