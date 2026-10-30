---
topic: 定位
intent: "将首用价值与跨会话连续性的产品讨论对照通用 Projects 替代，并核实本仓现有 DSH 机制、模型可见差量和缺失能力，避免把已有底座误报为产品效果。"
---

# 首用价值与连续性：通用 Projects 对照及 DSH 可行性

> 核对日期：2026-10-29。用途：供 [首用价值问题卡](../../issues/261029-first-value-journey.md) REVIEW 前推敲；本篇是证据，不是方案决定或实施授权。外部资料只采第一方产品文档。仓内事实以当前源码、组合和文档为准；未运行新的用户实验，不从文档、营销文案或存在的工具推出实际收益。

## 结论摘要

1. **不能把“跨会话不重讲”当作本产品独占价值。** Claude 当前 Projects 已有项目知识、项目聊天、项目指令；其帮助文档还说明项目内历史搜索与项目记忆，账户 memory 可查看/编辑并开关。[Claude Projects](https://support.claude.com/en/articles/9517075-what-are-projects)；[Claude chat search and memory](https://support.claude.com/en/articles/11817273-use-claude-s-chat-search-and-memory-to-build-on-previous-context)。新版 Projects 正分阶段 beta，描述为一个项目对话里派生并行云端线程、共享文件/指令/记忆的工作区。[Claude Projects beta](https://support.claude.com/en/articles/9517075-what-are-projects)。这些是产品功能描述，不证明召回准确、持续使用或业务成效。OpenAI Projects 官方帮助页本轮返回 403，故不据此判断其功能或与 Claude 的差异：[Projects in ChatGPT](https://help.openai.com/en/articles/10169521-projects-in-chatgpt)。
2. **本仓潜在差异不是“有记忆/有项目空间”，而是经营事项的结构化状态与受控变更。** 当前有独立权威账本、四种业务时间、提案与显式确认、操作回执和来源；这比普通文件/聊天容器多出哪些可观察用户价值，仍须用真实任务对照验证。来源定位并非都能精确回指：工具真实盖 `sessionId`；`quote` 是模型提交的参数，工具只检查非空，不验证它是否确为逐字原文；`eventId` 在来源类型中可选，但当前写入 helper 不提供。因此不能宣称每条记录都有经验证的逐字引文和精确原消息定位。[tool source helper](../../../packages/dsh-smart-assistant/src/agent/tool-operating/index.ts#L215-L229)；[LedgerSource](../../../packages/dsh-smart-assistant/src/domain/operating/types.ts#L9-L14)。
3. **基础机制已多，机制集合不等于完整产品能力。** assistant preset 有常驻摘要、记忆/账本工具、历史会话检索、文件工具及技能；这些通过各自 preset child plugin 挂载，不会自动把任意 workspace 文件导入上下文。[assistant 组合](../../../packages/dsh-smart-assistant/cordis.patch.yml#L167-L452)；[preset 声明语义](../../../vendor/dsh/packages/preset/agent-preset/README.md#L25-L48)。定时方面，本包 Host patch 挂有 schedule 服务；Web 上层另挂 `ui-schedule`，standard/cordis/ptc 内建 preset 各自挂 `@deepseek-ai/dsh-tool-schedule`。[Host 服务](../../../packages/dsh-smart-assistant/cordis.patch.yml#L100-L113)；[Web Host service](../../../vendor/dsh/packages/bundle/web-app/cordis.patch.yml#L135-L140)；[Web UI 行](../../../vendor/dsh/packages/bundle/web-app/cordis.patch.yml#L398-L399)；[Web preset 工具行](../../../vendor/dsh/packages/bundle/web-app/presets/cordis.patch.yml#L30-L40)；[内建 preset 范围](../../../vendor/dsh/packages/schedule/tool-schedule/README.md#L28-L32)。本包自定义 assistant preset 有自己的 child list，其中未列 schedule tool，而 `operating-brief` 指示 watch 动作时创建 schedule。[assistant child list](../../../packages/dsh-smart-assistant/cordis.patch.yml#L167-L307)；[watch 指令](../../../packages/dsh-smart-assistant/src/agent/operating-brief/index.ts#L60-L65)。这是声明层的差异，不足以断言运行实例中模型确实看不到工具：profile/plugin overlay 或用户保存的 preset override 可能改变有效 child list；需查有效组合或该 Agent 的实际工具表。若修订 assistant preset，还须注意 preset override 是整份 child list 替换，不自动合并内建 child。[preset override 语义](../../../vendor/dsh/packages/preset/agent-preset-registry/README.md#L46-L48)。上游 transient approval UI 支持 pending 请求的 allow-once/reject；本包配置未声明它，且无论是否由部署另行加载，它都不同于 ledger 持久 proposal/confirm/reject。[ui-approval package](../../../vendor/dsh/packages/client/ui-approval/README.md#L9-L36)；[经营工具](../../../packages/dsh-smart-assistant/src/agent/tool-operating/index.ts#L35-L65)。
4. **下一步应做能力实测，而不是先加一个 “Project” 领域或第二套记忆。** 一次性通用聊天若能给出有用答复，只证明当场产出；它不证明下次无需重讲。反过来，资料可保存/搜索也不证明首个回答有用。先确认目标任务、上下文在哪个数据面、第二会话如何找回、哪些状态变化必须本人确认；分别测“单次分析”和“之后继续处理”。若只是讲清首次结果，用静态、明确标注模拟的样例不会改模型行为；若要让模型检索历史、写账、提醒或执行审批，则必须验证对应工具在实际 preset 中可见，并覆盖来源、权限与读回。

## 官方产品参照：Claude Projects

| 官方文档可确认的机制 | 对本问题的意义 | 尚不能推出什么 |
|---|---|---|
| 一个 Project 有自己的 chat histories 和 knowledge base；可上传文件并给项目 instructions，之后在项目中开始聚焦聊天。 | 通用聊天产品已有“放材料、保留项目聊天、复用指令”的直接替代路径。只做相似容器不足以说明为何换产品。 | 文档不展示 CEO/CFO 的实际决策样例，也没有独立基准比较普通聊天与 Project 的判断质量。 |
| Claude 文档说明 paid 项目知识可在接近上下文限制时启用 RAG，扩展容量；产品另有项目内外的历史聊天检索。 | 必须把“资料/历史可查”视为强竞品能力。连续性实验要记录模型实际检索了什么，而不能仅验证资料已上传。 | 文档所称维持 response quality 是供应商描述，不是本任务的外部效果证据；不等于每轮自动找对来源。 |
| Claude memory 按主题保存聊天上下文，项目有独立记忆；用户可查看、编辑、删除，按账户/单轮开关；历史聊天搜索会显示为工具调用和引用。 | 可控、可见、可停用的记忆是普通 AI 助手替代的一部分；本仓的房间、账本与回执应通过具体维护行为对照，不应只用“我们有持久记忆”定位。 | 不能证明用户会启用记忆，或 Claude 与本仓跨会话召回在指定管理任务上的优劣。 |
| 新版 Projects beta 文档描述一个主对话派生云端并行线程，线程共享项目 files/repos/instructions/memory，Library 收集加入及生成的文件。该版本只对部分 Pro/Max/Claude Code 用户分阶段开放。 | Project 已不只是静态文件夹的概念。与其做术语对照，应实测真实 continuation、任务状态和人等待/介入点。 | beta 描述不是所有账号都已获得的现状，也未证明适合个人管理者的经营事项管理。 |

一手来源：[What are projects?](https://support.claude.com/en/articles/9517075-what-are-projects)；[How can I create and manage projects?](https://support.claude.com/en/articles/9519177-how-can-i-create-and-manage-projects)；[Use Claude’s chat search and memory to build on previous context](https://support.claude.com/en/articles/11817273-use-claude-s-chat-search-and-memory-to-build-on-previous-context)。这些是官方帮助中心的功能和操作说明，不是用户研究或效果评估。

## DSH 整合现状与差量

| 问题 / 数据面 | 当前可核实能力 | 现有边界 | 哪些建议会改变模型可见行为 |
|---|---|---|---|
| 首次任务与个人上下文 | assistant preset 给 prompt 注入 SOUL、MANUAL、AGENTS 笔记和有界 memory digest；`first-conversation` 处理空记忆下的裸 hello；具体业务题可用 management-breakdown 产出结论、事实/假设、判据、动作，并要求把事项摘要/决策 memo 落到 ledger/knowledge。[preset](../../../packages/dsh-smart-assistant/cordis.patch.yml#L190-L205)；[digest](../../../packages/dsh-smart-assistant/src/agent/memory-digest/index.ts#L1-L37)；[first conversation](../../../packages/dsh-smart-assistant/presets/assistant/skills/first-conversation/SKILL.md#L19-L43)；[management breakdown](../../../packages/dsh-smart-assistant/presets/assistant/skills/management-breakdown/SKILL.md#L7-L29) | 空 hello 的“发现首事项”与带题的经营分析是两条不同路径。摘要有界，完整正文须按需读取。已有技能与 prompt 不证明模型在每个任务上都会选对流程。 | 改入门说明的 client 静态文案可不改模型面；改 `first-conversation`、management-breakdown、manual、prompt 或工具描述会改变请求内容/决策路径，必须做 model-visible 快照/行为证据。 |
| 跨会话经营连续性 | `assistant_operating` 有 `desk/read/entrust/report/revise/propose/confirm/...`；独立 ledger 保留当前事项、材料、四种时间、提案、来源及持久 operation receipt。重要推断只能 propose，显式确认后应用；回执幂等。见 [operating contract](../../../docs/operating.md#二模型工具assistant_operating13-动作) 与 [tool source helper](../../../packages/dsh-smart-assistant/src/agent/tool-operating/index.ts#L215-L229)。 | ledger 是本插件拥有的经营事实面，不是所有聊天的通用记忆。工具盖 `sessionId`，但 `quote` 是模型传入且仅检查非空，不验证逐字真实性；来源类型允许 `eventId`，当前写入 helper 不提供它。精确事件引用需由权威请求/事件身份提供，不可让模型编造。 | UI 解释文案不变模型面。若要强化引文真伪或事件级出处，须改变权威输入/工具/持久化 schema 和展示；若要求跨会话先读状态、推断只建待确认提案，则改 prompt/工具行为，均需覆盖读回与旧记录兼容。 |
| 记忆、知识、原始会话 | working folder 有 memory/research/skills/knowledge，digest 有界显示当前路标；`assistant_memory` 可按需召回。当前组合挂 `tool-session-query`，SQLite 持久派生索引首次搜索时打开；模型工具只读且跨会话要求 cwd 精确相同。[房间与会话检索分工](../../../docs/home.md#二四个房间的语义)；[digest](../../../packages/dsh-smart-assistant/src/agent/memory-digest/index.ts#L1-L37)；[preset](../../../packages/dsh-smart-assistant/cordis.patch.yml#L245-L257)；[session tool authority](../../../vendor/dsh/packages/experimental/tool-session-query/README.md#L43-L53)；[SQLite index](../../../vendor/dsh/packages/session-query/session-query-sqlite/README.md#L10-L12)。 | 这是多种不同性质的材料：偏好/已确立事实、待研究问题、稳定领域知识和逐字会话证据不能混作同一“记忆”。会话 query 是模型可调用能力，不是隐式保证；Session 日志存在不等于每个新请求都会自动带入完整历史。 | 加载/移除该工具，或新增“每个新会话必须先搜什么”的 system guidance，会改变工具列表/请求提示；只添加独立评测用例不改用户模型面。实测需看 query、命中来源及错误/无命中，而不只看数据库索引存在。 |
| 文件与 workspace | assistant preset 有 `tool-fs` 与 `tool-fs-search`；模型可按 Session cwd 读/写/编辑及 glob/grep。[preset](../../../packages/dsh-smart-assistant/cordis.patch.yml#L294-L303)；[fs tools](../../../vendor/dsh/packages/fs/tool-fs/README.md#L25-L51)；[search tools](../../../vendor/dsh/packages/fs/tool-fs-search/README.md#L25-L53)。Client workspace-files API 是独立、只读预览面。[workspace-files](../../../vendor/dsh/packages/api/workspace-files/README.md#L10-L12) | 插件 `dataDir`/working folder 与 Session cwd/workspace 是分开的数据面。[working-folder layout](../../../docs/home.md#一布局)。只有当模型被告知具体路径并显式调用工具，文件才进入该轮上下文。把文件写进目录不自动形成有索引、有权威性或跨项目权限隔离的 Project knowledge。 | 加载/卸载工具、prompt 指示默认扫描/引用某目录、或新增自动索引会改变模型可见 schema/上下文及读取范围；纯文件预览 UI 不会。路径策略和隐私范围必须先定。 |
| 定时跟进 | 本包 Host composition 有 `@deepseek-ai/dsh-schedule`；其 Host 服务可持久化提醒并在原 Session 投递 follow-up。[schedule service](../../../vendor/dsh/packages/schedule/schedule/README.md#use-this-package)。standard/cordis/ptc 内建 preset 有 `@deepseek-ai/dsh-tool-schedule`。[cordis preset 行](../../../vendor/dsh/packages/bundle/web-app/presets/cordis.patch.yml#L30-L40)。 | assistant 自定义 preset child list 没有该 tool 行，但这只是定义层观察；profiles 或用户 preset override 可更改有效组合，不能据此断言当前运行 Agent 的工具表。`operating-brief` 有 watch 时调用 schedule 的指示，因此应对照实际组合和模型工具表确认这一动作能否兑现。创建成功/到期投递也不代表模型完成工作或事实已核验；schedule 不等于后台 Chief of Staff。 | 更改 preset、profile/plugin overlay 或选择的 preset 可能改变模型可见工具；需检查完整有效 composition 和 Agent 工具表。Host service/UI 自身不授予模型工具。若补入 schedule tool，需检查工具权限、提示、工具回执和复合回合/重启场景。 |
| 人工批准与提案 | assistant ledger 有持久 proposal/confirm/reject 与回执，桌面呈现待处理事项。[operating contract](../../../docs/operating.md#二模型工具assistant_operating13-动作)。DSH `ui-approval` 对 pending 请求提供 allow-once/reject；UI package 本身没有模型可见行为。[ui-approval](../../../vendor/dsh/packages/client/ui-approval/README.md#L9-L36) | transient tool approval 不是账本里的持续经营决定，也不等于通用审批政策。 | 只改 UI 解释不动模型；若变更 model action 权限、提案触发规则或让工具调用等待 UI approval，则 prompt/执行/持久状态均会改变，需分别验证模型策略与服务强制。 |

## 面向 REVIEW 的实验建议（非定案）

不要先比较术语或截图。取两类同一素材的业务任务：

- **一次性判断**：例如报价是否接、回款风险如何处理。比较通用 Project/chat 与本仓助手在缺数标注、出处、建议和下一步上的实际返回；关闭“示例已写好的”假象，保留原 prompt/文件/模型/人工提示。
- **需要继续跟进的事项**：先创建承诺、期限、预测和一个可疑重大变更，隔一段时间在新 Session 问“进展如何”或提供一条变更。观察 agent 是否先读同一事项、能否区分承诺与预测、是否保留来源、是否将推断变更留为待确认，用户是否能从 UI 复核。分别测试账本 continuation 与历史对话检索，勿把结果合并成笼统的“记住了”。

每种路径应记录原始输入、可用数据面、模型实际工具调用、写入/回执、第二会话读回结果、刷新状态、失败与人工介入。模拟样例只测试呈现，必须持续标明模拟；真实模型单次成功只证明那次执行，不能证明质量、采纳或长期记忆。 A（成果预览）和 C（耐久首件读回）可留作候选来分别测可见价值与兑现证据，不预设须同时选或足以解决 H1/H2/H3。

## 未知与限制

- 本轮没有真实用户对“通用项目记忆”与“账本状态/回执”进行盲评；也没有多轮、跨时间的 recall 正确率或继续使用证据。
- Claude 官方说明证明 Projects 与 memory/history retrieval 是强可用替代，不证明其在经营事项的承诺/预测/人审语义上与本仓等价；也不证明本仓更好。
- OpenAI Projects 官方页请求返回 HTTP 403（本轮记录的 URL 如上），不推断其产品细节，也不再扩展搜索。
- 本笔记以仓内 shipped composition 与源码为据，不代表任意 profile overlay 的最终工具注册快照。若要证明当前运行实例，还需查看其有效配置/实际 agent 工具表。
- schedule 工具未在本包 assistant preset 文件中出现，但 Host 服务、Client UI 和包外 profile overlay 独立可组合；不能据单份 patch 断言运行时绝无工具。
