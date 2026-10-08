# 需求对齐与验收 playbook：`_backlog/playbooks_plan_and_validate/` 项目方法实验场 + 留区语法门

日期：2026-10-08 · 状态：**implemented**

本轮外部结果：触发 = 用户引入 FAQ 10 并拍板"两头难：需求对齐与质量验收"，目录更名
`playbooks_plan_and_validate`，需求链/验证链分割思考，且方法区定位为本仓独立能力、
唯一外部依赖是 Matt Pocock 的 SKILL 本体、不设 promote；用户得到 = 需求三篇 + 验收三篇的
渐进披露方法区，plans 卡可前置验收判据（需求清楚、验收有方）；完成条件 = 验证链只消费已确认
需求、验收矩阵住同一张 plan、门禁随目录名解析、`verify`/`typecheck`/`test` 全绿。
方法尚未经过真实事项试用。

来源：用户指示"需要借鉴 `mattpocock-skills/_faq_on_digest/09_skills-for-requirements-engineering-of-agent-apps`
——我们的 `_backlog/` 下需要特别的 playbook 来帮助我们如何推敲出需求／寻找合理的结构等
产品经理／架构师的东西，最后内容进入 plans"；并在形态追问上拍板："**还是放在 `_backlog/playbooks_plan/`
这个子目录底下，有 README、有 SKILL 样子的 MD 等，这样好在这里调整**"；后续又明确该区应扩展为
`playbooks_plan_and_validate`，面向本项目长期打磨，不以通用技能 promote 为目标。

**第二轮修正（用户指出"要利用 matt pocock 的能力啊，你好像忘了?"）**：首版只读了那份 FAQ 的
**二手转述**就动笔，把方法当成"从文本里提炼"的任务；实际上游技能本体就在本机
（`/Users/bowhead/mattpocock-skills/skills/`，且 `grilling`/`domain-modeling`/`prototype`/`research`
/`codebase-design`/`writing-for-agents` 已在会话技能目录里可用），**正确做法是路由到真技能、
只写"哪种未知用哪个 + 产出落本仓哪里"**。用户这一问点出的不是漏读一个文件，而是**方法来源的
层级错了**：拿摘要当权威。首版据此重写，并把上游台账与"路由不复制"升为本区硬纪律。

## 问题（可观察行为）

`_backlog/` 有推敲**卡**（`plans/`）、有推敲**证据**（`reference/`）、有**制度**（章程 README），
但没有**方法**的家：同一套提问纪律（一轮问全 frontier、事实与决策分离、按未知类型派探针）
此前只在若干张卡里被临时手写一遍（`261007-input-boundary.md` 的「已知与未决／候选与取舍／
待答问题／喂给谁」就是现成例子），下一张卡从零再来。根 `AGENTS.md`「同一个多步流程第三次被重新
推演时，就把它立成一件开发技能」正对着这个缺口，但在方法被真实推敲校准之前直接进
`.agents/skills/` 会让 fresh agent 信任一份没被顶过回来的草稿。

## 提案（已交付）

1. **推敲方法演练场** [playbooks_plan_and_validate](../../_backlog/playbooks_plan_and_validate/README.md)：
   - README 是中文阶段路由、索引与留区契约；只在对应缺口出现时披露下一篇。
   - [requirements-elicitation](../../_backlog/playbooks_plan_and_validate/requirements-elicitation.md)：入口、
     confidence gate、动态技能加载、访谈/术语映射、大想法决策地图。
   - [requirements-probes](../../_backlog/playbooks_plan_and_validate/requirements-probes.md)：research / questionnaire /
     prototype 三探针与单独标明的 raw-request triage 入口，结果回消费卡。
   - [requirements-synthesis](../../_backlog/playbooks_plan_and_validate/requirements-synthesis.md)：编译、
     在授权规划范围内评估候选切片、四门判断、跨会话依据保留。
   - 现有三篇与新增验收设计篇均带 `name`/`description`/`whenToUse`，英文，输入/步骤/产物/完成或等待条件可识别。
     有源但未试用的用户点名适配可以留区；真实试用是校准证据，不是 promote 条件。本区长期保留项目适配，
     不默认搬入通用技能目录或复制第二份。
   - **第二轮查证记录（机制曾内联进长稿，现改由各篇读取本体；以下是历史查证，不是当前协议）**：
     `grilling` 的**设计树**与轮次格式（编号 + 每题附推荐答案 + 前置未定的问题归后轮）、
     **facts-are-yours 且运行中的事实探查本身就是未定前置——只阻塞其下游问题、不阻塞本轮**、
     **完成判据 = frontier 空**（非"用户不再反对"）；`wayfinder` 的 **destination 先行 / fog of war
     / Not yet specified / Out of scope（scope 而非 sharpness 决定归属）/ 只产决策不产交付 /
     交接不建造 / 按名引用不按 id**；`to-spec` 的**编译不重面试 / seam 检查 / user stories 极详尽 /
     Out of Scope 单列 / 承重计划不写文件路径与片段（原型片段除外）**；`to-tickets` 的**垂直切片 /
     blocking edges / 宽重构走 expand–contract / 向用户复核拆解**；`prototype` 的 **LOGIC 与 UI
     两分支、"一次性代码不等于一次性答案"——验完保留为 primary source**；`to-questionnaire` 的
     **面试「发出去」而非「主题」**；`domain-modeling` 的 **ADR 三条件**。
   - **第二轮能力快照（仅历史；第四轮已撤出方法正文）**：当时 catalog 可用 `grilling` /
     `domain-modeling` / `prototype` / `research` 等，未发现 `to-questionnaire`、`wayfinder`。
     把这写成“正文摘要是唯一降级”是错法；当前动态核查，缺失先报告排查，可读完整本体时
     显式采用读源适配，不能冒称注册调用。源码位置 `/Users/bowhead/mattpocock-skills/skills/`。
2. **留区语法门 `playbookFrontmatterProblems`**（新纯核，`verify` 链内并入既有
   `contract: skill files carry valid frontmatter` 一查）：两个在役 home 是 `<name>/SKILL.md` bundle
   形态，`skillFrontmatterProblems` 够不到扁平 `<name>.md` 的演练场——**这是本切片自查时发现的
   真实缺口**：门原来不覆盖留区，草稿可以带着坏 frontmatter 躺到毕业那天才炸。新核对
   `name` == 文件名 basename（保持未来技能名稳定；移动仍需重校链接与调用）、`description`/`whenToUse` 非空、
   YAML 可解析，`README.md` 豁免，目录缺失不算问题。
3. **接线**：`_backlog/README.md` 章程加目录树行 + 「推敲方法区（playbooks_plan/）」一节；
   区 README 建索引。

## 输掉的方案

1. **直接建 `.agents/skills/requirements-elicitation/`**（跳过演练场）：输给"在役技能会被 fresh
   agent 直接信任"——方法要在一到两轮真实推敲里被用过、被顶回来再改才配这份信任；而且用户指名
   要"好在这里调整"。
2. **只落一张 `_backlog/plans/` 推敲卡**：输给"卡片会被毕业，方法不会"——方法要在下一张卡上再用
   一遍，放卡里等于每张卡重写一遍（正是要消灭的现状）。
3. **把方法写进 `_backlog/README.md` 章程**：输给章程/账本二分——章程只随制度级决定动，方法会
   反复迭代；且章程是常驻入口链文本，塞方法论会污染开工阅读面。
4. **建 `_backlog/playbooks_plan/` 但沿用 `plans/` 的卡片契约（状态行 + 索引互查）**：输给语义
   不符——playbook 不是某件具体工作的判断材料，没有"毕业判断"，它是方法；故不设状态行，
   `backlog-liveness` 三查**不**扩到这里，语法由专门的 frontmatter 核覆盖。
5. **照搬上游 skill 名与模板**（`/grill-with-docs`、`/to-spec`、`/to-tickets`、`/wayfinder` 等）：
   输给本仓既有管道——上游那套硬依赖 GitHub issue tracker 与 `GLOSSARY.md`/ADR 布局，本仓的
   裁决点在 `notes/proposed/` + 用户点头、术语家是家手册与各 owner 文档。借的是**纪律**（frontier、
   fact/decision 分离、探针按未知类型路由、垂直切片、Out of Scope 单列），不是模板与名字——
   上游自己的嵌入指南也是这个立场。
6. **同时做模型可见面技能**（`presets/assistant/skills/`）：轮内明确不做；那是模型可见面变更，
   需另立 proposed 卡呈批并配 `repo-live-probe` 证据。
7. **⚠️ 首版的真实错法——拿 FAQ 摘要当权威，把方法"重新描述"一遍**（第二轮已推翻并重写）：
   首版只读 `_faq_on_digest/09_.../` 的四份二手文本就动笔，产出的是**我自己措辞的近似协议**。
   读到技能本体后确认至少漏掉/写错：设计树与轮次格式、**运行中的事实探查是未定前置（只阻塞
   下游、不阻塞本轮）**、完成判据 = frontier 空、wayfinder 的 fog of war / Not yet specified /
   Out of scope 区分、expand–contract 宽重构例外、`to-spec` 的 seam 检查与"不写路径与片段"、
   prototype 的 LOGIC/UI 两分支与"保留为 primary source"（首版写成"可丢弃"，方向错）、
   questionnaire 的"面试发送方而非主题"。**教训不是"多读一个文件"，而是方法来源的层级**：
   有技能本体时，摘要只配当索引，不配当权威——这正是重写后升为区 README 硬纪律的那条
   "**路由不复制**"。此条留档防复犯：本仓今后写任何"适配某方法论"的 playbook，进门条件里
   必须包含"**读过本体并留引证台账**"。
8. **机器本地路径门禁只修正文、不扩语料**（第三轮）：输给"同一条纪律在两个活区两套口径"——
   `_backlog/` 的**相对链接**早就被断链门覆盖，唯独**绝对路径**不覆盖，属同一类"给读者指路"
   的文本；且缺口已被真实触发过一次（本区自己写出来的）。故扩语料而非只改文案。
9. **把机器本地路径门禁的语料扩到整个 `_backlog/`（含 `_done/`）**：输给与既有口径一致——
   冻结区的历史正文按断链门同样惯例不动（`_done/` 留着当时的写法），只扫四个活区 + 区 README。
10. **沿用内联逻辑、不给该查补夹具**：输给"内联闭包无法被驱动"——正因如此它此前零夹具；
    抽成 `machineLocalPathProblems(corpus)` 后语料与判据分离，才谈得上走真 runner 的接线夹具。
11. **一篇逐条汇编上游协议并再次复制 do/don't**：输给实际操作不可见且上下文负担大；
    用户要求逻辑拆文。入口/探针/收口按分支披露，各篇有独立输入与完成线，详细协议回本体。
12. **需求不确定时用技术自主权拍板、缺技能时用摘要继续**：输给用户明确的 confidence gate
    与上游发现前置；查证归 agent，不确定判断归真人，缺能力的事实必须公开，不能冒称已调用。
13. **所有结果进入 proposed、所有候选必须多方案、空 frontier 即完成**：输给本仓四门与真实
    证据；拒绝/延后/消化各有家，备选不能编造，待查事实阻断时无可答问题不等于完成。
14. **按长度平均切文**：输给用户要求的逻辑切割；按工作阶段/证据缺口切，README 指明何时读，
    三篇共享入口的 confidence/loading 规则而不在每篇各抄一套。
15. **把需求收口与验收设计绑在一段里（或反过来让验收改需求）**：输给"需求和验证是两种思考
    方式"——验证只消费已确认的 plan，判据暴露意图歧义只能回需求链，不能在验收端补产品判断。
    （第六轮细化：validation-design 先于 synthesis 的切片/毕业判断且条件性需要——仅 doing-now/
    proposal 出口要矩阵；把验证链呈现为需求链之后的独立顺序阶段是错位。）
16. **把方法区叙述成"FAQ 的引擎/容器适配"**：输给用户拍板的独立能力观——playbook 是本仓
    自己的能力，唯一外部依赖是所点名的 SKILL 本体；FAQ 只当定位与查缺的索引，不进能力叙述。
17. **默认毕业/promote 到通用技能目录**：输给项目性质——适配各种项目的通用技能难度太高；
    本区长期在本仓打磨，SKILL 形态只是消费格式，不是发行承诺。
18. **为验收另建卡片或队列**：输给"一个事实一个家"——验收矩阵住在同一张 plan 的专设
    `## 验收矩阵` 小节，证据路由回本仓 owners（testing.md/snapshots/notes）；收货结论按消费记录
    落位（未毕业卡回卡，已毕业卡回 proposal→implemented 记录），与既有生命周期一致。
19. **把验收矩阵塞进毕业门小节**：输给粒度混淆——毕业门装四门判据（该不该毕业、缺什么判据），
    矩阵装行为级验收（每行怎么算过）；专设小节、毕业门引用，两处写法不再漂移。
20. **把验收结果写回已毕业的归档卡**：输给冻结铁律（归档后历史解释冻结，状态行只记去向）——
    实施发生在毕业之后，结果必须落消费记录而非冻结件。
21. **把 plan 预写的证据命令当成最终选道**：输给硬规则 3（只跑会为这次回归而失败的最小检查）与
    `pre-push-evidence` 的 push 时判断权——plan 时只指定 owner 与"能证明/不能证明"；
    预写命令过时按当前地图跑并记录偏差。
22. **依赖表点名正文没有的技能**：输给"点名就要真依赖"——retro 行要么删要么真有步骤；
    选择在 judgment 收尾补"漏检沉淀"一步（机械漏检→既有检查候选、判断漏检→标准条文，
    走既有 owner），不建第二 retro 机制。

## 刻意不借（负知识，登记进区 README 留区契约）

- **第二个 tracker/队列**：上游 FAQ 自己点名反对，与本仓 `_backlog/README.md`「明确不借」同款
  （D23 失败模式，本仓 ROADMAP 队列 2026-09-28 已退役）——playbook 只产判断材料，不排期。
- **上游的 spec/ticket 模板与目录布局**：借纪律不借模板（见输掉的方案 5）。
- **空想的方法**：无实证来源的 playbook 会用一套自洽话术伪造权威——故"须已被用过一轮"是进门条件。

## 第三轮：上游更新后的重校（2026-10-08 同日）

用户提示"_faq_on_digest/09_... 更新了一下，你看看，你再想办法解决"。核查结果：

- **上游新增 `max-leverage.md`**（commit `fad9000`「add max-leverage guide and a full skill
  inventory」，基线 `7b2ad8f` → `fad9000`）：讲**"每环怎么把技能用满"**——三个通用杠杆
  （查证外包给 agent / 推荐答案当默认值 / 让产物流动）+ 逐技能「这样用 / 别这样用」表 + 两个
  纠正器（`/wait-what`、`/ask-matt`）。另四条页面同时小改：补 HITL/AFK 标注、`spike` 与
  `blocking edges` 术语就地解释、`/setup-matt-pocock-skills` 链接化、`/teach` 与
  `/writing-for-agents` 归位清点（全套 27 个技能）。
- **本区据本体重校并扩写**：新增「Driving each skill to full capacity」一节（三杠杆 + 逐技能
  do/don't 表），并把上游那条**硬排序规则**写进去——**访谈到拆票期间不 clear、不压缩**。
  该规则取自 `ask-matt` 本体第 36 行，**本体还带 FAQ 摘要没有的例外**：窗口逼近 smart zone
  （约 150k tokens）时不许硬撑退化，应在**阶段边界** `/compact` 后继续。又一次印证"承重规则
  回本体核对、摘要只当索引"的纪律。
- **顺带发现并修掉一个真实门禁缺口**：本区 README 与 playbook 曾把上游 checkout 的
  **机器本地绝对路径**写进共享正文，而门禁 `links: contract docs cite no machine-local absolute
  paths` **没覆盖 `_backlog/`**（`markdownCorpus` 只含 `AGENTS.md`/`README.md`/`docs`/`notes`/
  `snapshots`）——绝对路径静默过关。修法两步：① 正文改为"上游 checkout（rev 见台账）"，
  绝对路径与重校原始记录只留本 note（本仓纪律：机器本地路径的 provenance 归 `notes/`）；
  ② 该查**抽成可测纯核** `machineLocalPathProblems(corpus)`（`verify-checks.mjs`，语料与判据
  分离），`verify.mjs` 的语料**扩到 `_backlog/` 四个活区**（`plans`/`bugs`/`reference`/
  `playbooks_plan_and_validate` + 区 README），并显式排除 `notes/`；冻结的 `_done/` 与未归属文件不扫
  （与断链门的既有口径一致）。该查此前**没有任何夹具**——正因逻辑内联在 `verify.mjs` 里无法被
  驱动；现补上走真 runner 的语料接线夹具。

  **上游 checkout 的绝对位置**（本仓纪律：只留 `notes/`）：
  `/Users/bowhead/mattpocock-skills`，技能源在 `skills/{engineering,productivity}/`。

## 第四轮：从协议汇编改为本仓接力与渐进披露

用户授权复核后调整，并补充“需求阶段，如果没有信心，还是依赖人”，随后要求把长篇按逻辑
拆分、README 做渐进披露。本轮不安装技能、不加门禁、不改产品运行时。

**约束 → 适配 → 依据**：

- FAQ 嵌入指南的“引擎/容器、功能补短板、逐个验证” → README 按入口/探针/收口披露，
  各篇只写本仓执行步骤与覆盖默认落点，不再两遍复述上游协议；完整本体和资源仍须读取。
- 需求判断不确定 → 先查证能查事实，仍缺信心时明确疑点、影响、证据与要人确认的问题；
  确认前不定案，独立工作可继续。技术自主权不绕 gate，假设被确认不等于事实被证实。
  特别覆盖 prototype 本体的“人不在时按上下文猜”fallback，本仓需求阶段不按它猜。
- 上游全局可发现前置 → 动态核 catalog，缺失作为发现故障只读排查；完整本体可读时
  如实声明“读源适配、未调用注册技能”，不可读时阻断该分支。无会话名单缓存、无摘要模仿。
- glossary/ADR/issue tracker/ready 标签 → 本仓卡、reference、现有 home/identity/architecture/
  模块 owners 与 note 生命周期；候选不提前写当前合同，原型不默认并产品，ready 不等于授权。
- 上游 no-paths 与连续上下文 → 禁易腐烂实施配方，但保留本仓证据链接与验收命令；
  保持同份对齐依据、跨会话读卡与证据，不宣称能禁止 harness 自动压缩或固定 token 阈值。
- frontier 空 → 无 pending 且 shared understanding 确认才算访谈完成；pending lookup/人答
  使当前无可答问题只算等待。拒绝/决定延后不逼出完整建造 spec；四门及既有授权豁免仍在。
- 留区需试用与“现有草稿尚未试用”的矛盾 → 有源用户点名适配可留草稿，真实试用才毕业；
  毕业跨目录须修链接/披露路由，撤回“纯 git mv 即零改动”。章程与区契约同步。

核查本体：`grill-with-docs` 的组合调用、`grilling` 的 shared-understanding 确认、
`domain-modeling` 的文件默认、`research` 的来源与 repo convention、`to-questionnaire` 的 send、
`prototype` 的分支资源/猜测 fallback/保留 primary source、`triage` 的五状态及否决记录、
`wayfinder` 的决策图、`to-spec`/`to-tickets` 的编译/切片/publication、`ask-matt` 的上下文规则。
基线仍 `fad9000`；这些是本体读取核查，不是声明上游技能都已注册或实际运行。

## 第五轮：验收支线、目录改名与"独立能力"定位（2026-10-08 同日）

用户引入 FAQ 10（`_faq_on_digest/10_skills-for-accepting-and-evaluating-ai-built-software/`）并拍板：
"软件开发两头难，需求对齐和最后的质量验收"；目录更名 `playbooks_plan_and_validate`，目标是
**借助方法区让 `_backlog/plans/` 产出高质量 plan：需求清楚、验收有方**。

- **需求链与验证链分离（用户："需求和验证最好分割思考……比较思考方式不一样"）**：
  需求链（elicitation/probes/synthesis）回答要解决什么、对谁有价值、做什么/不做什么；
  验证链（validation-design/evidence/judgment）只消费已确认的 plan，回答怎么算对、用什么证据、
  实施后是否相符。验证不能反向替需求做决定；判据暴露意图歧义只能回需求链，不得在验收端补产品判断。
- **验收判据前置进同一张 plan**：validation-design 产出行为分类（确定性逻辑/模型行为/编排接线）、
  验收矩阵（含负例/互补状态、证据 owner、真人判断点），住在 plan 的毕业门/链接段落，
  不另建验收卡；validation-evidence 只路由本仓既有证据 owner（testing.md 为表主）；
  validation-judgment 做 pass/fail/blocked/human-pending 的逐行收货与归因。
  不把 repo-live-probe 一次通过、eval 分数或"命令跑完"当成通过条件；真人终验边界保留。
- **不设毕业/promote 线（用户："'成熟后毕业为 .agents/skills/' 是不需要，我们会在这儿一直
  反复打磨的，而且没有必要 promote 全 skill"）**：本区是本项目的长期实验场，不为"适配各种项目"
  设计；SKILL 形态只是 agent 消费格式，不是发行承诺。
- **能力叙述改写（用户："'技能是引擎，本仓流程是容器'这个说法意义不大……这些是要独立成为
  这里的能力，依赖只要 Matt Pocock 的 SKILL 就行"）**：README 改为「能力与依赖」——
  每篇 playbook 是本仓自己的能力，唯一外部依赖 = 所点名的 SKILL 本体（可调用则调用，
  不可调用且本体可读则读源并如实声明）；FAQ 09/10 降级为"定位技能与发现缺口的索引"，
  不再作为能力依据写进叙述。"Load engines" 措辞同步改为 skill loading。
- **门禁随目录改名**：`playbookStagingDir` 改为发现式解析（多候选报错、缺失回退），
  `playbookFrontmatterProblems` 的 label 取实际目录名；机器本地路径语料与夹具同步指向新目录。
  前述"毕业即纯 git mv"的门禁注释口径一并撤换（本区不再以毕业为目标）。

## 第六轮：全量审计后的修订（2026-10-08 同日）

用户要求以 Matt Pocock 全量 SKILL 本体（checkout 内 37 个：engineering/productivity/in-progress/misc）
为参照系，整体审计本区的系统性/结构性/一致性。核对结果：依赖表 16 条上游路径全部真实存在；
各篇声称借用的纪律与本体一致（tdd 红灯/独立预期值/垂直切片、code-review 双轴、to-spec 路径禁令
与 ready 发布、to-tickets expand–contract、prototype 猜测 fallback、to-questionnaire 的 send、
ask-matt 阶段边界、triage 五状态、wayfinder fog/HITL-AFK、grilling frontier）。发现并修订：

- **时序理顺（P0）**：README 验证链写明 validation-design 先于 synthesis 的切片评估与毕业判断，
  且**条件性需要**——仅当判断指向 doing-now/proposal（需要可执行验收）才要矩阵，deferred/
  rejection/digestion 不需要；synthesis §1 Done、validation-design whenToUse 同步改口径，
  三处不再互相矛盾。
- **结果落点（P0）**：validation-judgment 的结果写回消费记录——未毕业卡写回卡，已毕业卡写回
  proposal→implemented 记录（notes 契约），永不写入冻结归档；结果标签 implemented→accepted，
  避免与 notes/implemented 生命周期撞名。
- **矩阵专设 `## 验收矩阵` 小节**：毕业门只放四门判据并引用矩阵；plans 模板说明同步，
  两处口径不再漂移。
- **证据指定 vs 最终选道**：validation-evidence 声明 plan 时只指定 owner 与"能证明/不能证明"；
  push 时最终最小证据选道仍归本仓 `pre-push-evidence` 与 testing 地图，预写命令过时按当前地图跑
  并记录偏差。
- **表文一致**：README 依赖表 retro 行与 judgment 正文对齐（收尾补"漏检沉淀"一步）；
  probes 表头 Engine→Skill；README 补"未列 = 刻意不借"一行与"两链共用 confidence gate"的措辞。

**第六轮验证**：`pnpm verify` → 35 checks passed；`pnpm typecheck` → exit 0；
`pnpm test` → 50 files / 411 tests passed（docs-only 改动，无源码/测试资产变更）。

## 验证（真跑过的命令）

**第五轮（文档 + 门禁注释，未改产品运行时）**：`pnpm gen-notes-index`（note 标题变更后重生成）；
`pnpm verify` → **35 checks passed**（含改名后发现式 playbook 区解析、frontmatter 门与
机器本地路径语料）；`pnpm typecheck` → exit 0。
`pnpm test` 三轮：首轮红 = `verify-gates` 夹具仍断言旧文案 `pure move`（本切片改了核的
提示词）→ 夹具改断言行为词 `declares name`，不再绑具体措辞；第二轮红 = host
`skill-usage` 的 afterEach 临时目录 `ENOTEMPTY` 竞态一次（与本切片无关、代码未动）；
复跑全量 → **50 files / 411 tests passed**。该竞态按证据纪律如实留档：单次偶发、复跑即绿，
若再犯需按"三记录"立案，不当作已解决。

**第四轮（仅文档，未改门禁/产品）**：`pnpm verify` → 35 checks passed，生成物 freshness 也绿；
`pnpm typecheck` → exit 0；`pnpm test` → 50 files / 411 tests passed。
独立只读复核已读三篇与 README，并按六场景逐项核对：低信心技术建议、缺技能但本体可读、
外部 raw request、无 pending 的拒绝、pending lookup 导致 frontier 空、大想法跨会话。
复核提出的独立 Input 和 gate/load 前置已补齐；引用路径另由门禁核对。
这些只证明文档形状、路由与纸面边界，不替代真人真实事项试用。

**此前轮次的原始证据**：

- `node scripts/checks/verify.mjs` → **35 checks passed**（改动前 35、改动后 35：新核并入既有
  一查，不增检查条数）。
- **造红证绿（新门的真证据）**：
  ① 把 `_backlog/playbooks_plan_and_validate/requirements-elicitation.md` 的 `name:` 改成
  `deliberately-wrong-name` → `node scripts/checks/verify.mjs` 输出
  `FAIL contract: skill files carry valid frontmatter and match their directory` /
  `verify: 1 of 35 checks failed` → 还原 → 35 passed。
  ② **改动前的反证**：同样改坏 `name` 后 verify 仍 `ok`（门确实够不到留区）——这是本切片发现
  缺口的原始观测。
- `npx vitest run packages/dsh-smart-assistant/tests/tooling/verify-gates.spec.mjs -t "playbookFrontmatterProblems"`
  → 3 passed（负例夹具落 `tooling/verify-gates.spec.mjs`，含：name/basename 不符、缺 description、
  缺 whenToUse、无 frontmatter、README 豁免、YAML 内层 `: ` 解析失败、目录缺失）。
- `pnpm typecheck` → 绿（`tsc -b` + `tsc -p tsconfig.test.json`）。
- `pnpm test` → **50 files / 410 tests passed**。
- **上游台账逐路径核验**（第二轮）：对 README 台账点名的 9 个上游技能文件逐个 `[ -f ]` 检查 →
  9/9 存在；`git rev-parse --short HEAD` → `7b2ad8f`（与台账记的基线一致）。台账非转述，可复核。
- **上游重校**（2026-10-08，第三轮）：checkout HEAD 前进到 `fad9000`（上一基线 `7b2ad8f`）。
  FAQ 目录新增 `max-leverage.md`（本轮正文「Driving each skill to full capacity」一节的触发来源），
  其余四份（`answer.md`/`skill-mapping.md`/`embed-into-existing-system.md`/`question.md`）仍在位。
  承重规则回本体核对：`ask-matt/SKILL.md` L36「one unbroken context window（don't compact or clear
  until after `/to-tickets`）」与 L38 smart-zone 退化例外（临近窗口时 `/compact` 在最近阶段边界、
  不硬撑降智）逐字确认，两处均为正文与台账 `ask-matt` 行的依据；FAQ 摘要未载该例外，故正文
  采本体而非二手。checkout 绝对路径与各次重校原始记录住本节（共享正文不写死机器本地路径）。
- **机器本地路径门禁扩面 + 抽核 + 新夹具**（第三轮）：
  ① **造红**：向 `_backlog/playbooks_plan_and_validate/requirements-elicitation.md` 追加一行
  `/Users/bowhead/somewhere/SKILL.md` → `node scripts/checks/verify.mjs` 输出
  `FAIL links: contract docs cite no machine-local absolute paths` /
  `_backlog/playbooks_plan_and_validate/requirements-elicitation.md cites a machine-local absolute path` /
  `verify: 1 of 35 checks failed` → 还原（区内 `/Users/` 计数归 0）→ 35 passed。
  ② **新夹具造红证绿**：`npx vitest run .../verify-gates.spec.mjs -t "machine-local"` → 1 passed；
  再**故意从 `verify.mjs` 语料里删掉 playbook 区那行**重跑 → 该夹具**失败**
  （`AssertionError: expected ... to contain '_backlog/playbooks_plan_and_validate/README.md cit…'`）→ 还原 → 1 passed。
  即夹具真的守着语料接线，不是陪跑。
- `pnpm test` → **50 files / 411 tests passed**（较上轮 410 增 1 = 新语料接线夹具）。
- **能力可得性核验**：以本会话技能目录为准逐个对照——`grilling`/`domain-modeling`/`prototype`/
  `research`/`codebase-design`/`writing-for-agents` **在**；`to-questionnaire`/`wayfinder` **不在**
  （正文据实标注，不暗示已运行）。
- 未跑：`pnpm build` / `pnpm release-smoke` / `pnpm eval`——本品未动发布物、依赖、preset 包装与
  模型可见面（无源码改动，只动 `scripts/checks/` 与 `_backlog/`、测试夹具），按
  [pre-push-evidence](../../.agents/skills/pre-push-evidence/SKILL.md) 不属必跑面。

## 行为对齐

- **外部结果三要素**：触发 = 需要把模糊意图磨成能呈批的提案时（或一张 `plans/` 卡要从对话里写出来时）；
  用户得到 = `_backlog/playbooks_plan_and_validate/` 下一份可调整的 SKILL 形态 playbook（README 契约 + 
  `requirements-elicitation.md` 草稿），以及留区草稿不再能带坏 frontmatter 的语法门；
  完成条件 = 方法成文、留区契约成文、语法门造红证绿、章程接线、`typecheck`+`test`+`verify` 全绿。
- **本轮签收证据**：新上下文只读复核已完成，六个边界场景均有明确路由；机器证据见第四轮记录。
  用户得到的仍是可调整草稿，真实事项试用未完成，不把文本审查说成需求效果已验证。
- **未跑项如实列出**：`pnpm build` / `release-smoke` / `eval`（理由见上）；playbook 尚未在真实推敲
  里被用过一轮——**这是它仍留草稿区、未毕业为技能的原因**，毕业触发 = 一到两轮真实推敲的校准。
- **复发追问**：本切片暴露的"新家建了但门没跟上"（门只扫两个在役 home、够不到新留区）是一类
  可复发的缺口——处置是**每次新建被门覆盖的语料家时，同轮问"门跟上了吗"并造红证绿**，
  而非只在本案补一行。
