# 提案（草稿）：三线合流——治理环 · 第四房间 knowledge/ · 触发演进

日期：2026-09-24 · 状态：**proposed（方案已定）——同日用户 review 完成并拍板：D0/D1/D10 三题全 A，参数级 D2–D9 按推荐定值；阶段 1 切片待开工**

> 依据：三线研究（R1 记忆 / R2 技能成长 / R3 知识层）已入档并亲验。本文只做合流：
> 分阶段路线 + 决策点 + 尸体清单。判据对照、借用清单、淘汰理由全在报告内，本文只引用不复述。
> 素材入口：`notes/research/2026-09-24-r{1,2,3}-*.md`（survey ×3 + shortlist ×3）、
> `notes/intents.md`（意图与判据）、`notes/implemented/2026-09-23-repo-structure.md`（day-0 输赢表）。

## 一、为什么是现在（四个已知缺口）

1. **"半自动的入口、无门的出口"**（R2 §9.1 对现状的定位）：reflect/save_skill 模型可自主触发
   （入口能进），但无查重、无统计、无退役、无人审门（出口无门）——学错的技能可能永远躺着。
2. **遮蔽静默**：学到技能被策展同名遮蔽只报 logger warn，模型不可见——全生态无人做
   （R2 §5.4 普查 481 个条目逐一过目的结论），是可自研的小切口空白。
3. **curate 被动执行**（I14 首批数据点）：战役两 turn 零主动调用
   （`notes/implemented/2026-09-23-live-verification-campaign.md` 开跑补记）——家的养护靠人提醒。
4. **知识无房间**：领域理解只能塞 memory/（短事实容器装长资料，拉低摘要信噪比）、塞 skills/
   （程序容器装陈述性知识）或蒸发（R3 §7.1——与"不清晰的意图没地方放会污染记忆"同构）。

## 二、四个共振信号（路线的骨架，三线独立得出、互相印证）

1. **零安装现成包**：R1 无一候选同过三关（§5/§6）；R2 外部框架形态不合、DSH 内学习回路各缺
   一半（§9.2）；R3 现成 wiki 插件全部落后 pin 线（0.1.2-rc.1 / 0.1.2-alpha.2 vs 本仓 0.1.5-rc.2）
   或单点维护（§7.3）。推论：**借语义、借格式、借规范，不借运行时依赖**。
2. **押两个开放标准**：技能押 Agent Skills（agentskills.io——frontmatter 已字段级对齐，metadata
   是标准预留通道）；知识押 OKF v0.2（治理字段子集）。两者都是格式不是包，零依赖成本。
3. **治理环是共同缺口**：头部产品把治理做成主体工作量（Letta sleep-time、mem0 Dream），
   翻车案例全部指向缺门的全自动（R2 §6 四例：fold-in 冲突 / 记忆变脏 / ClawHavoc 投毒 / 阻塞门被绕）。
4. **纯 Markdown + git + 无向量索引被生态追认**：Letta MemFS（git-backed、默认无向量索引）、
   Karpathy LLM KB（~40 万词内自维护索引就够）、OKF（"If you can `cat` a file, you can read OKF"）
   ——day-0 判据（错了赔得起 + 人能审）被独立验证，本次普查即证据。

## 三、分阶段路线（顺序已拍板：治理→知识→触发，D1=A，2026-09-24）

### 阶段 1 · 治理环（加固现有三房间，全部小切片，不改结构）

| # | 切片 | 一句话 | 素材 |
|---|---|---|---|
| 1a | 用量统计 | 技能被加载次数/最近使用进 curate 与 brief——一切退役与延后判据的数据面 ✅ implemented（`notes/implemented/2026-09-24-skill-usage-stats.md`：家根 `skill-usage.json` 账本 + learn 模块 `tools/result` 订阅 + curate/brief 双面回显） | R2 §9.3-1 |
| 1b | 遮蔽可见性 | 同名遮蔽从 logger warn 升为模型可见（D3 已定：curate finding + brief 节）✅ implemented（`notes/implemented/2026-09-24-skill-shadow-visibility.md`：问注册表不复演规则——agent 面探 `ctx.skills.snapshot` join 房间扫描，`skill-shadowed` warn finding + brief `shadowed_skills` 节） | R2 §9.3-2、§5.4 |
| 1c | 阈值退役 | 30d 未用→stale、90d→archived（D4 已定，配置行可调；归档=移出 provider 扫描目录，不删，可恢复） | R2 §9.3-3 |
| 1d | 写后审计 | 引用完整性 + 凭据检查（写时校验已挡 frontmatter，审计增量在引用与凭据） | R2 §9.3-4 |
| 1e | I14 节拍器 | curate 从被动变主动——决策已在 `notes/proposed/2026-09-23-iteration-rhythm.md`（b 层 host 节拍器为主，a 层纪律垫底） | 该 note |
| 1f | skills/ 快照 | 最轻回滚兜底（时间戳快照或 git init，三样板任选） | R2 §9.3-7 |
| 1g | 格式对齐 spec 小步 | learned 技能补 `license`/`compatibility`（可空）——吃 Agent Skills 标准红利的小步 | R2 §9.3-6 |
| 1h | 预算强制（可选） | digest/索引预算从纪律升为 `ctx.tools.guard()` 写入原语层拒绝 | R1 §6-1 |

### 阶段 2 · 第四房间 knowledge/（家的最大结构变化）

设计整体引用 R3 §7.2（每件标了借用来源），落地切片按 R3 §7.4：

1. `src/home/layout.ts` 加房间 + scaffold + HOME.md 地图（布局唯一 owner 面改一处）；
2. frontmatter 词汇：OKF v0.2 子集（D5 已定：六字段）+ `[[wikilink]]` 解析自研（百行级，DSH 生态四处先例）；
3. curate 加 finding：断链三档 info/warn/error（D7 已定）、孤页、同名歧义、stale_after、index.md 漂移；
4. 检索面：digest 加目录树有界摘要（"file tree as signposts"）+ 最小只读工具 search/get 附 backlinks（D6 已定）；embedding 继续延后；
5. research 的 promote 出口新增目标类型 knowledge（promotedTo 指页 id，sources 指回线索）；
   memory↔knowledge 走 promote/pin 两条显式操作（D8 已定）；**自动产出走 staged draft**（status: draft 不参与召回，人审才 stable）；
6. docs/home.md 契约更新 + 本 note 状态翻 implemented，同 diff。

### 阶段 3 · 触发演进一格：手动 → 建议+人审（propose-only）

| # | 切片 | 一句话 | 素材 |
|---|---|---|---|
| 3a | 批量边界检测 | 会话空闲/有界批次边界时检测可复用经验——DSH 零件齐备（sessionQuery + llm.stream + timer） | R2 §9.3-5、§5.2 garvel |
| 3b | 草稿收件箱 | 候选不落房间、进待审区；不可变版本链；改稿=新版本，旧批准失效；批准才 save_skill | R2 §5.2 run2skill |
| 3c | 默认 propose-only | 生态最谨慎同款（dsh-enhanced growth-experiments 默认值）；全自动蒸馏维持延后 | R2 §6、§9.3-5 |

### 顺序论证（为什么 1→2→3）

- **治理先行**：① 三线共同缺口且全为小切片；② 1a 的用量数据正是阶段 3 延后判据（"真实使用
  数据"）的采集工具——没有它阶段 3 永远缺证据；③ 1e 让 curate 主动跑是 knowledge/ 的健康前提
  （wiki 式房间没有养护烂得最快：断链/孤页堆积，R3 §6）；④ 先加固已有房间再加房间，步步为营。
- **知识第二**：最大结构变化，依赖阶段 1 的 curate finding 框架与主动节拍先就位；用户偏好信号
  最强（wiki 式互链是用户自己的方向）。
- **触发最后**：风险面最高（写入面），生态翻车案例全部集中在这一格（R2 §6）；且需要阶段 1 的
  数据面与阶段 2 的 staged 模式先立。

## 四、决策点与已定参数

> 2026-09-24 用户拍板审阅方式：**方向级（D0/D1/D10）留用户、参数级（D2–D9）按调研推荐定值**——
> 方向级三题已于同日全部拍板（全 A）。
> 分诊依据是仓库判据"错了赔得起吗/多久能发现"：参数级全部是小切片、可逆、错了机器能发现的
> 形态选择，改值=改配置或重跑检查，不动路线；方向级决定建什么与顺序，回头成本高。
> 编号保持 D0–D10 不变（正文交叉引用依赖它们）。

### 4.1 决策点（方向级——已拍板，2026-09-24 三题全 A）

| # | 决策 | 选项与代价 |
|---|---|---|
| D0 | 知识层建不建 | ✅A（已拍板）第四房间（R3 §7.1：不建则领域理解塞错容器或蒸发）；B 维持现状（零成本，短事实容器装长资料持续拉低摘要信噪比）；C 只做 docs 惯例延伸（项目知识留 repo，但跨项目领域理解仍无家） |
| D1 | 阶段顺序 | ✅A（已拍板）治理→知识→触发（论证见下）；B 知识→治理→触发（偏好先行，但 wiki 房间缺养护环会先烂）；C 治理与知识切片交错（可并行，review 面变宽） |
| D10 | 触发演进档位与形态 | ✅A（已拍板）run2skill 形态（批量边界+收件箱+不可变版本链，propose-only 默认）；B garvel pending 队列形态（更轻，无版本链）；C 维持全手动（零成本，入口无查重缺口留着）；D 直接全自动（翻车案例集中区，否） |

### 4.2 已定参数（形态级，按 ★ 定值；落选方案留档防重议）

| # | 参数 | 定值（依据） | 落选与代价 |
|---|---|---|---|
| D2 | 阶段 1 范围 | 1a–1g 全做 + 1h 可选（完整闭环） | 最小两片先（1a+1b：最轻启动，但 1c/1d 自然缺数据后置）；不含 1e（I14 继续悬） |
| D3 | 遮蔽可见性形态 | curate finding + brief 节（零新工具面） | save_skill 返回即警告（实时，但改工具返回形状）；仅日志行（模型不可见等于没修） |
| D4 | 退役阈值 | 30d stale / 90d archived，配置行可调（dsh-mind 样板） | 只报不退役（/skill-doctor 式最保守，出口仍无门）；自定义双阈值配置（多一个配置面） |
| D5 | knowledge frontmatter 字段集 | 六字段 type/generated/verified/status/stale_after/sources（OKF 子集：过期与确认档机器可见） | 三字段（最轻，staleness 机器不可发现）；全 OKF（attestation 对个人助手过量） |
| D6 | knowledge 检索面 | 最小只读工具 search/get 附 backlinks（R3 §7.2-3） | 扩 assistant_memory 词汇（零新面，动词集混淆）；含写的全工具（与 staged draft 矛盾） |
| D7 | 断链 finding 分档 | 三档：info（未写成的知识）/ warn（deprecated 页仍被引）/ error（frontmatter 烂、同名歧义）（OKF 语义） | 全 warn（简单，淹没信号） |
| D8 | memory↔knowledge 桥 | 两条显式操作 promote/pin（不自动同步、不双写、幂等键含源 id+版本） | 初期不桥（手动搬运，后续再补） |
| D9 | R1 八项设计借用怎么进 | 只排期预算强制（1h），其余七项在相关切片里顺手借（R1 §6） | 全部显式排期（阶段 1 过肥）；零借用（浪费普查结论） |

## 五、尸体清单（明确不做什么，防重议；一行一具）

**day-0 已否决（输赢表：`notes/implemented/2026-09-23-repo-structure.md`，不重议）**

| 不做 | 为什么 |
|---|---|
| SQLite/向量库作核心存储 | 错了赔不起：记忆要可读、可 diff、可手改 |
| 自动后台复盘（session/end 自动跑） | token 代价与"学错了谁发现"未解，触发条件未到 |
| 自写技能 provider | 重复 DSH 发现/监听/解析逻辑，会与上游漂移 |
| 学到技能写进 dshHome 默认技能根 | 混进用户手写库，家不再自成一域 |
| 摘要常驻全文/无上限 | 直接违背"很好控制的上下文" |
| 探索塞进 memory/ 当一种 kind | 生命周期不同（已确立 vs 未决），混住判据含混 |
| 探索做看板/数据库服务 | 量级几十条，文件足够；人能审优先 |
| drop 不写理由 | 下次会重开同一个问题（用户明确要留尸体） |

**R1 记忆线（2026-09-24 普查后新增）**

| 不做 | 为什么 |
|---|---|
| 换记忆包（含 supermemory） | smart memory 不存在（5 同名物全单人 SQLite/云）；supermemory 黑箱存储+控制权倒置=路线之争非工程缺口；头部 DSH 替代各缺一块 |
| 每 prompt 自动注入召回 / 每轮自动写回 | 召回代理权在插件不在模型，控制权与"有界摘要+模型主动调取"倒置 |
| 语义检索/embedding/向量 | 继续延后：触发条件 = 真实漏召回（与 R3 共用判据） |

**R2 技能线**

| 不做 | 为什么 |
|---|---|
| 直接采用外部框架（mem0/Letta/LangMem） | Python/托管运行时进不了 cordis；procedural 层各家半成品 |
| 整体换 DSH 学习回路插件（run2skill/dsh-enhanced/lmzhen） | 版本未对齐 0.1.5-rc.2 / 载体是规则库非 SKILL.md / 25+ 包碎片化；换=放弃家布局与同源格式优势 |
| 全自动蒸馏（无人审直写） | 生态翻车案例集中区（fold-in 冲突、ClawHavoc 投毒）；延后判据不变 |
| 阻塞式技能门 | bryan-cmf gate 被自己废弃的教训：高交互成本的门会被绕过 |

**R3 知识线**

| 不做 | 为什么 |
|---|---|
| 装现成 wiki 插件进发布组合 | 全部落后 pin 线/单点维护/有冒名 scope（@deepseek-ai/dsh-client-ui-obsidian 实为 gxpppp）；借语义不借运行时 |
| 服务器型 wiki（wiki.js/MediaWiki/DokuWiki） | 前两者必须数据库，DokuWiki 是 PHP+.txt 非 Markdown；与家的形态不匹配 |
| GraphRAG / 向量索引 | 抽取占 ~75% 索引成本、官方维护模式、人可读性差 |
| 反链索引服务 | 现算 grep 即成（Foam/OKF/DSH 生态先例）；索引是派生物 |
| 把渲染器写进契约 | Obsidian 仅作查看器（格式是开放 Markdown）；工具死了数据还在（Dendron/Neuron 尸体为证） |
| OKF attestation/Attested Computation | 对个人助手过重，v0.2 子集够用 |
| Khoj | AGPL-3.0 + 默认必须 embedding，与前提相反 |

**过程硬约束（用户拍板，不重议）**

| 不做 | 为什么 |
|---|---|
| 任何需云/托管的方案 | 纯本地硬约束（2026-09-24 拍板）；cogmemai-sdk 等直接出局 |
| 自动开浏览器 / 碰日用 ~/.dsh | 既有五条硬规则（AGENTS.md） |

## 六、明确延后项（不是"不做"，是"还没到"——有触发条件）

| 延后项 | 触发条件 | 依据 |
|---|---|---|
| 语义检索 / embedding | 真实漏召回出现 | R1 §5、R3 §7.2-3 |
| 全自动 session-end 蒸馏 | 用量统计显示收益 > token + 同意成本 | R2 §9.3-5（阶段 1a 正是采集工具） |
| 自动后台复盘（session/end + ctx.jobs） | 真实使用数据 | docs/architecture.md 第六节 |
| FTS/trigram CJK 检索升级 | grep 真实漏召回（先测再上；dsh-knowledge-sqlite 实测表为方法参照） | R3 §7.2-3 |
| 跨 harness 共库（memsearch 形态） | 第二消费方出现 | R1 §6-7 |
| R1 其余七项设计借用（画像二分、注入常量、晋升回执等） | 相关切片落地时顺手借 | R1 §6 |

## 七、批准后的事（现在不做，防抢跑）

- intents.md 补 I15（知识房间意图：一行动机 + 一行外部可观察行为）——批准后第一片；
- R3 线索在家 research/ 房间开 thread（handoff 残留待办，落地时顺手补）；
- AGENTS.md 布局表/命令表若受影响 → 按 `writing-for-agents` 技能改；
- 实施期纪律：每片 = 一个垂直切片（代码 + 测试 + docs + note 同 diff），tdd / code-review
  进实施期再用；本文档已于 2026-09-24 按用户拍板转正 proposed，随各阶段切片逐项翻 implemented。

## 八、与 handoff 残留待办的对账

| 残留项（handoff §六） | 去向 |
|---|---|
| I14 措辞强化切片 | 阶段 1e（节拍器落地时一并做，iteration-rhythm note 已含 a 层纪律方案） |
| 被遮蔽技能静默不生效 | 阶段 1b（本提案主体） |
| PTC 模式 counts=null 显示瑕疵 | 维持"登记不立案"，不进本路线 |
| R3 在家 research/ 无 thread | 批准后顺手补（§七） |
