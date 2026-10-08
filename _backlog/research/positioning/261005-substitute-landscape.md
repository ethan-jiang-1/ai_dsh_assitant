# 替代品格局调研：CEO 今天不经我们，能得到什么样的「懂我公司的 AI 军师」

> 服务对象：产品定位推敲（AI 管理助手：跨会话记忆 / 公司知识库 / 决策拆解 / 行动计划 / 主动简报）。
> **查证日期：2026-10-05**（全部条目同日查证）。
> 方法：web_search + 抓取一手页面（官方帮助中心 / 官方博客 / 官网 / 官方 PR 镜像）。
> 环境说明：本会话 web_fetch 工具 DNS 故障，改用 curl（含 r.jina.ai 文本代理与 Web Archive 快照）抓取，
> OpenAI 帮助中心经代理取到的是**当日线上内容**；未能抓到正文的条目在文末「未证实/仅二手」节声明。
> 结论按「记得住 / 盯得住 / 出得了活」三轴组织；覆盖度 = 单产品三轴能力对「CEO 军师」场景的满足度。

---

## 覆盖度总览（先看这张）

| 替代品 | 记得住（公司+人） | 盯得住（主动跟进） | 出得了活（可交付） | 对「CEO 军师」覆盖度 |
|---|---|---|---|---|
| ChatGPT（memory+Projects+Tasks） | ★★★ 个人+项目资料强，"公司"非一等实体 | ★★ 用户自配定时任务+事件触发；任务读不到项目文件 | ★★★ Canvas/Deep Research/文件 | 高（记忆与产出强，跟进是"闹钟"不是"盯着决定"） |
| Claude（memory+Projects+原 Cowork） | ★★★ 工作上下文定位最明确；项目记忆隔离 | ★★★ 定时代理任务已上线（runs unattended） | ★★★ 原位操作文件/工具，产出交付物 | 最高（2026 年补齐了主动轴） |
| Gemini（Personal context+Gems+Daily Brief） | ★★ 手动存档为主；自动记忆限个人账号 | ★★ Daily Brief（美区英文）；Scheduled actions | ★★ Canvas/Deep Research | 中（主动面最像"简报"，但地域/账号锁死） |
| NotebookLM（→ Gemini Notebook） | ☆ 不记人、不跨笔记本 | ✗ 无任何主动 | ★★ 强引用溯源的知识问答+音视频综述 | 低（只是知识库问答，缺其余两轴） |
| 独立产品（Dex/Clay/Motion/Lindy/Huper…） | 各管一域（关系/日程/邮件） | 分品类有（提醒/standup/晨报） | 分品类有 | 低-中（无一家同时占三轴；Huper 新入场直指此缺口） |

---

## 一、ChatGPT：memory + Projects + Scheduled tasks（查证日期 2026-10-05）

### 记忆能力现状（一手：[Memory in ChatGPT FAQ](https://help.openai.com/en/articles/8590148-memory-in-chatgpt)，页面标注更新于约 2026-09 底）
- 记忆来源（官方列举）：**past chats、saved memories、custom instructions、Library 里的文件、连接的应用（如 Gmail）**。Memory 开启时由 ChatGPT 决定取用哪些信息；官方明言"Memory does not retain every detail from every conversation"——即**选择性、非完备、模型自行取舍**。
- 两种机制并存：**Improved Memory**（持续更新的整体上下文摘要）与 **Legacy saved memories**（逐条清单）；设置里可切换。saved memories 既可显式"记住这个"，也可由 ChatGPT 自动存（"or that ChatGPT saves as useful context"）。
- 用户管理界面：Settings > Personalization > Memory 下有 **Memory summary**（高层摘要视图，可逐条改正、可"Don't mention this again"、可"Delete and turn off memory"）；回答下方会显示 **Sources**（标明本次个性化用了哪条过往对话/记忆/文件/邮件），可跳转、改正、删除。另有 **Reference chat history** 开关（关闭后派生信息 30 天内从系统删除；无独立存储上限）。
- 计划差异：功能与控制面"vary by plan, region, platform, and workspace settings"（官方原话，具体每档差异未逐一核验）。受监管工作区（Healthcare/Regulated Enterprise）默认关闭 improved memory，且该功能不在 BAA 覆盖内；支持"Project-only memory"把记忆限制在单个项目。

### Projects（一手：[Projects in ChatGPT](https://help.openai.com/en/articles/10169521-projects-in-chatgpt)，更新于约 2026-09 中）
- 项目持久保存：**聊天、上传文件（PDF/表格/文档/图片，数量随计划）、项目指令**（project instructions 只在项目内生效、覆盖全局 custom instructions）；可把 **Google Drive 文件/文件夹、Slack 频道**贴为项目来源；可把任意一次聊天回答"Save to project"变成项目来源。
- **Project memory**：官方一句——"Projects can use their chats and files as context for future responses"（项目内聊天与文件成为后续回答的上下文）。
- 共享项目：Free 到 Enterprise 全档可共享；官方示例直接点名我们的场景——"**Reporting: Store datasets and reports in one project, and return each week to generate updates without starting over**"。

### Custom GPT（一手：[GPTs in ChatGPT](https://help.openai.com/en/articles/8983148-does-memory-function-with-gpts)）
- **GPT 不用记忆**："GPTs do not use saved memory, custom instructions, or previous conversations. Each conversation starts fresh."
- **产品正在退役**：官方宣布 Custom GPTs 将退役、迁往 Plugins；Enterprise 工作区退役定在 **2026-12-11**，迁移流程目标 **2026-09-17** 推出；且"**New GPT creation and publishing are not available on personal ChatGPT accounts, including Free, Go, Plus, and Pro**"——个人付费用户已不能再新建公司知识 GPT。

### 主动跟进能力（一手：[Scheduled tasks in ChatGPT](https://help.openai.com/en/articles/10291617-scheduled-tasks-in-chatgpt)）
- 一次性/周期任务 + "monitor for changes" + **事件触发任务**（Gmail/Slack/GitHub webhook，Work 场景，Plus 及以上）；通知走 Push/Email。全部为**用户自己配置**，无自发的"它觉得你该看什么"。
- **关键硬伤（官方原文）**："If you create a task in a project, it cannot access uploaded files or files stored in that project." ——**定时任务读不到项目里的公司资料**：想每周自动出"基于公司文件的简报"，在一处官方文档下被直接堵死（在项目外建任务则拿不到项目上下文）。

### 产出物能力
- Canvas（文档/代码/版式）、Deep Research、agent mode（付费档）、图片、文件生成；项目内可用同一套工具（同上 Projects 页）。

### 对「CEO 军师」场景的覆盖度与硬伤
- 覆盖：公司资料持久化（Projects）+ 个人/工作记忆（memory）+ 定时推送（tasks）+ 成文产出（Canvas/DR）——三轴都有实体功能，是**替代品里完成度最高的一支**。
- 硬伤：①"公司"不是一等实体——没有组织/目标/决定的对象模型，全靠文件与聊天累积；②记忆黑盒取舍（官方自认非完备、Sources 也"may not show every factor"）；③盯跟进是"闹钟/监视器"，不存在"决定的 owner/期限/状态"；④tasks 与 project 文件割裂（上文官方原文）；⑤数据全在 OpenAI 云，敏感面的合规护栏（BAA 不覆盖 improved memory）明示了边界。

---

## 二、Claude：memory + Projects + 原 Cowork（查证日期 2026-10-05）

### 记忆能力现状
- 起点与官方定位（一手：[Bringing memory to Claude，2025-09-11](https://claude.com/blog/memory)）："Memory is now rolling out to Pro and Max plan users"（同文注明 Team/Enterprise 同步铺开、Enterprise 管理员可关）。定位原话："**Memory built for work**……It remembers your team's processes, client needs, project details, and priorities"，并直接点名高管场景："**executives track initiatives without constantly rebuilding context**"。记忆**全可选（fully optional）**，带细粒度控制；Incognito 聊天不留存。
- 机制（一手：[Use Claude's chat search and memory](https://support.claude.com/en/articles/11817273-use-claude-s-chat-search-and-memory-to-build-on-previous-context)）：两层——
  1) **搜索过往聊天**（RAG，对话中显式 tool call，带原文引用，可从引用删源对话；"Search and reference chats"可关，另有 incognito 聊天不入搜索）；
  2) **记忆**：随聊自动按**主题（topics）**存（"Mention that a deadline moved, and your next conversation already knows"），也可"remember this"直接存；Settings > Memory 里逐条可见、可编辑、可删（"Fix something in one topic and the change applies to every conversation"）。
- **项目记忆隔离**："Each project has its own separate memory space and dedicated project summary"（项目各有独立记忆与项目摘要）；2025-09 博文亦明言 per-project memory 是为"confidential discussions remain separate"。
- 敏感面默认排除：健康/种族/信仰等默认不写入记忆，需用户显式开启（官方列表）；开启后又关闭会清掉已存的敏感条目。
- 2026-08 更新（一手：[Claude's memory works everywhere, and you decide what's in it，2026-08-25](https://claude.com/blog/claudes-memory-works-everywhere-and-you-decide-whats-in-it)）：**同一份记忆贯通 chat 与原 Cowork**；"You can see everything Claude remembers, topic by topic, and edit or delete any of it"；并推出**记忆导入/导出**（实验性，[Importing and exporting your memory from Claude](https://support.claude.com/en/articles/12123587-importing-and-exporting-your-memory-from-claude)，含从其他 AI 助手导入记忆）。
- 团队控制：Team/Enterprise 的 owner 控制 memory 可用性，且对成员**默认关、成员自开**（同一帮助文档"Controls for Team and Enterprise plan owners"节）。

### Projects 与知识持久化
- 项目知识经 RAG 检索（官方帮助中心设专文：[Retrieval augmented generation (RAG) for projects](https://support.claude.com/en/articles/11473015-retrieval-augmented-generation-rag-for-projects)——本次仅核到该文存在与标题，具体上限数字未抓取，见文末声明）；项目持久保存知识文件与自定义指令，配独立项目记忆（上述 2025-09 博文）。

### 主动跟进能力（本次调研最重要的单条发现）
- **Claude Cowork 已并入 Claude 本体**（一手：[Claude Cowork 产品页](https://claude.com/product/cowork) 顶部公告"Claude Cowork is now just Claude"，见 [What changed](https://claude.com/blog/cowork-is-now-claude/)；Pro/Max 先行）。
- Cowork 产品页原文："**Close your laptop, it keeps going. Schedule a task for any cadence, and it runs unattended. You come back to your deck, spreadsheet, or research.**"——**任意周期的无人值守代理任务**已是一等能力：任务在你选定的文件夹/工具里真操作（打开浏览器、接管屏幕需明示），步骤全程可视、可中途纠偏、删除需批准、重大动作可设审批。
- 插件（Plugins）："Plugins bundle your tools, knowledge, and workflows into a single install so **Claude shows up as a specialist from day one**"——预置"领域专家"形态平台自己在做。

### 产出物能力
- 无人值守任务直接产出"deck, spreadsheet, or research"类交付物（同上产品页原文）；Artifacts/文件产出为既有能力；产出回到"待你审阅"的状态（"You come back to polished work for your review"）。

### 对「CEO 军师」场景的覆盖度与硬伤
- 覆盖：三轴全占，且是**唯一官方把记忆定位到"高管追踪 initiative"的替代品**；记忆可导入导出（跨平台迁移成本被官方主动降低——对我们的护城河逻辑是直接威胁）。
- 硬伤：①同 ChatGPT——"决定/行动项"仍无对象模型， initiative 的"追踪"靠记忆与文件，不是状态机；②定时代理任务面向"完成任务"而非"盯人/盯组织"（没有 owner、超期、待决这些语义）；③企业记忆控制集中在贵价 plan；④数据在 Anthropic 云，无本地/自托管选项。

---

## 三、Gemini：Saved Info（Personal context）/ Gems / Daily Brief / Scheduled actions（查证日期 2026-10-05）

### 记忆能力现状
- **Saved Info = "Personal context"**（一手：[Save info and reference past chats in Gemini Apps](https://support.google.com/gemini/answer/16413516)）：以**手动为主**——去 gemini.google.com/saved-info 点 Add 逐条录入，或聊天中说"记住"；设置里可逐条查看/编辑/删除、整体开关；命中时回答底部标注"Your saved info"。官方明示有类型限制（检出疑似违反 ToS 的信息不存）。
- **过往对话记忆**（一手：[Get personalization with memory of your past Gemini chats](https://support.google.com/gemini/answer/16598469)）：自动从聊天中学习（"Gemini can learn from your chats to understand more about you and your world"），会主动建议"你项目的 next steps"。**硬性边界**：仅限 18+、**仅限个人 Google 账号（工作/学校账号明确不可用）**、需开 Keep Activity；Gems 与 Live 内不生效——即**企业账号被排除在自动记忆之外**。
- 对 Gemini Live/工作账号的差异与推送 gradual rollout（同上两文原文）。

### Gems 与知识持久化
- （一手：[Use Gems in Gemini Apps](https://support.google.com/gemini/answer/15146780)）：Gems = 自定义指令 + **Knowledge 文件**（本地上传或从 Drive 添加，文件类型/上限见官方 supported file types and limits——具体数字未核）；Gems **不使用过往聊天记忆**（上条帮助文档明示 memory 在 Gems 内不可用）。
- **Gems 也在退役**：官方原文——"**Starting in November 2026, Gems will go away on personal Google accounts and automatically transition to skills**"（Gems → skills 过渡）。

### Workspace 联动
- 个人 Gemini Apps 可连接 Google Workspace（Gmail/Calendar 等）做个性化与简报来源（Daily Brief 前提之一，见下）；前提页亦明示"Connect your Google apps to personalize your Gemini experience"（帮助中心同系列第 4/5 篇标题，本次未逐一抓正文）。

### 主动跟进能力
- **Daily Brief**（一手：[Get started with your daily brief in Gemini Apps](https://support.google.com/gemini/answer/17077455)）："**You can get proactive, personalized updates in your daily brief**"——汇总 Gmail/Calendar/聊天，固定两栏"Top of mind / Looking ahead"，官方示例直接点名创业者（"For entrepreneurs: Surface actionable client emails and update task reminders"）。**但**：仅美区、仅英文、仅个人账号、需连 Workspace+开 Memory、gradual rollout。
- **Scheduled actions**（一手：[Plan ahead with scheduled actions in the Gemini app，2025-06-06](https://blog.google/products-and-platforms/products/gemini/scheduled-actions-gemini-app/)）：聊天中把任意 prompt 转成定时/周期动作，设置页统一管理；上线时限 Google AI Pro/Ultra 及合资格 Workspace 商业/教育计划。示例"wake up with a summary of your calendar and unread emails"。

### 产出物能力
- Canvas、Deep Research、导出 Docs（帮助中心/官方博客多次出现；本次未逐一抓正文，标注为官方存在但细节未核）。

### 对「CEO 军师」场景的覆盖度与硬伤
- 覆盖：**主动简报形态做得最像"军师晨报"**（Top of mind/Looking ahead 的固定简报结构），且天然背靠 Gmail/Calendar——对谷歌全家桶的 CEO 是最低摩擦替代。
- 硬伤：①记忆以手动录入为主，自动记忆**把工作/学校账号排除在外**——恰恰是"公司场景"最需要的账号类型；②Daily Brief 地域/语言锁死（美区+英文），中文中小企业不在服务范围；③Gems（唯一的公司知识持久化容器）一年内退役迁 skills，路线动荡；④简报内容是"信息汇总"，无决定/行动项的状态语义。

---

## 四、NotebookLM（2026-07 起 → Gemini Notebook）（查证日期 2026-10-05）

### 产品形态与来源限制
- **已改名**："NotebookLM is now Gemini Notebook. It's the same standalone product, now doing more across the Google ecosystem and updated with a secure cloud computer."（一手：[官方博客，2026-07-16](https://blog.google/innovation-and-ai/products/gemini-notebook/notebooklm-gemini-notebook/)）
- 来源机制（一手：[Add or discover new sources](https://support.google.com/notebooklm/answer/16215270)）："A source is a copy or auto-synced version of the source document you import or upload"；来源类型含 Docs/Slides/Sheets、PDF、Word、音视频、网页、YouTube、ePub、**Gemini 聊天也可作为来源**；单来源上限 **50 万词 / 200MB**；**Free 档每笔记本 50 个来源**（付费档数字见官方 usage limits 页，本次未抓到，标注）。

### 强项（作为"公司知识库+问答"）
- 回答锚定在你上传的来源（"the model uses the sources you upload to answer your questions"——同上帮助页），是五类替代品里**引用溯源设计最裸露**的一个；2026-03 Workspace Updates 持续加交互能力（[New ways to customize and interact with your content in NotebookLM](https://workspaceupdates.googleblog.com/2026/03/new-ways-to-customize-and-interact-with-your-content-in-NotebookLM.html)——标题见于搜索结果，正文未抓）；Audio/Video Overviews 与 featured notebooks 为其出圈功能（[featured notebooks 官方页](https://blog.google/innovation-and-ai/models-and-research/google-labs/notebooklm-featured-notebooks/)——标题核到，正文未抓）。

### 硬伤：记不住人、盯不住跟进、不主动
- **不记人**：帮助中心全站无"记住用户/跨笔记本记忆/个人上下文"类条目；个人化记忆属于 Gemini 主应用的 Personal context（见上一节），笔记本产品不含。个人化能力不在本产品（结构性事实，非单页引文）。
- **盯不住**：无任务/行动项/跟进类功能（帮助中心目录以来源/笔记/分享为轴）。
- **不主动**：无通知、无定时、无简报——它是"你问它答"的静态知识容器。
- 副产品定位：官方称"same standalone product"，并入 Gemini 生态（"doing more across the Google ecosystem"），产品命运与 Gemini 主线绑定（改名即信号）。

### 数据与隐私
- 来源是"copy or auto-synced"到 Google 云（同上帮助页）；企业治理走 Workspace 管理开关（[Turn NotebookLM on or off for users](https://support.google.com/a/answer/15239506)——标题核到，正文未抓）。

### 对「CEO 军师」场景
- 只覆盖一轴（知识问答+强溯源），出活限于综述/音频类文档，**完全不覆盖记忆人/盯跟进/主动简报**——适合当"我们知识库层的对照物"，不构成整体替代。

---

## 五、独立产品：关系 CRM / 日程任务 / 自称"AI chief of staff"（查证日期 2026-10-05）

### 关系 CRM 类
- **Dex**（一手：[getdex.com](https://getdex.com/)）："Personal CRM for your relationships — bring together LinkedIn, email, and all your daily tools. Keep in touch, remember where you left off"；核心是**人际关系**的提醒与笔记，不碰经营决定。官网自述 30,000+ 用户。
- **Clay → Mesh**（一手：[clay.earth](https://www.clay.earth/)）：当前首页已以 **"Mesh"** 为题——"brings together everyone you've ever met. Automatically organized, intelligently searchable, always up to date. For you and your team."——仍是**关系网络**管理（自动整理、可搜、团队共享），不是公司经营知识。

### 日程/任务类
- **Motion**（一手：[usemotion.com](https://www.usemotion.com/)；注意 motion.com 是同名工业品公司）："The AI Powered SuperApp for Work——AI Projects, AI Tasks, AI Calendar, AI Meetings, AI Docs, AI Notes, AI Reports, AI Workflows"——**日程与任务自动化**为核心，无公司记忆实体。
- **Reclaim.ai**：已被 **Dropbox 收购**（一手：[官方公告 Reclaim is now a part of Dropbox](https://updates.reclaim.ai/announcements/reclaim-is-now-a-part-of-dropbox)、[收购 FAQ](https://help.reclaim.ai/en/articles/9757093-dropbox-reclaim-ai-acquisition-faq)）——独立日程 AI 以并入平台收场，是"单点工具难独立"的样本。

### 自称"AI chief of staff"的产品
- **Lindy**（一手：[lindy.ai](https://lindy.ai/)）："Not an AI tool. A coworker."——接 1000+ 工具（支持 MCP）、进会议、**"Shows up on schedule. Whatever you do on repeat, hand it to Lindy on a schedule. A morning brief, a Monday report…"**——形态是**可编排的通用代理**，晨报/周期报告是其营销场景之一；记忆为"learns how you work"级，无公司决定对象模型。
- **Xembly**（"AI chief of staff"定位，二手：[Crunchbase 描述](https://www.crunchbase.com/organization/xembly) "Xembly is an AI chief of staff, an all-in-one assistant"）：**产品已消亡**——直接证据：xembly.com 域名现已是博彩垃圾站（本调研当日直接访问核实，2026-10-05）；关停/转型细节未找到一手公告（见文末）。
- **Huper**（一手 PR 镜像：[Huper Raises $1.5M to Deliver a "Chief of Staff for the Rest of Us"，2026-02-26](https://metroatlantaceo.com/news/2026/02/huper-raises-15m-deliver-chief-staff-rest-us/)，原稿 BusinessWire）：$1.5M pre-seed，定位"**security-first AI Chief of Staff**"——"securely gathers and synthesizes information across emails, messaging platforms, CRM tools…to generate real-time status updates, **track execution, and surface decisions that require leadership**"；卖点直指"**BYOK 加密 + 角色权限 + 数据治理**"；2026-04-15 邀请制 alpha、"publicly available this fall"。**这是与我们定位最贴身的直接竞品信号：赛道被验证的同时，安全治理被当成了头号差异点。**

### 其他被发现的相关产品（未逐一深查，见文末声明）
- **Fyxer**：AI 邮件+会议助手（[官方帮助：Meet Fyxer](https://support.fyxer.com/en/articles/10968437-meet-fyxer-your-ai-email-and-meeting-assistant)）——邮箱/日历单点。
- **Geekbot**：Slack/Teams 的 standup/调查机器人（[官方 PDF](https://geekbot.com/wp-content/uploads/2025/07/Convince-your-manager_v2.0.pdf)）——团队例会自动化，不管经营决定。
- **Limitless**：可穿戴记录设备路线（[limitless.ai](https://www.limitless.ai/)）——"记住你听到的话"，不是公司知识。
- （中文生态：飞书/钉钉 AI 助理官方页未及逐页核验，本节不对其下结论。）

### 本类小结
- 所查公开页面的主对象不同：关系 CRM、日程任务、编排与 CoS 叙事各有侧重。Huper 是本轮找到直接强调决定/执行跟踪的样本，但本研究未穷尽产品/插件/企业方案；未找到经营状态机描述不等于它不存在，不能宣布市场整体空白。

---

## 六、定位假设与竞争反证（不是排他事实）

以下五项按所查公开页面提出候选比较维度，不证明市场缺功能、客户愿付费或本仓已实现优势。企业产品与可组合 agent 都可能覆盖同样任务；本轮未重新抓取全部动态页面，版本/计划变化须在对外引用前重验。已记录的 Claude 三轴能力、企业治理/金融来源链是重要反证。

**假设 1：显式公司/决定对象可能比通用记忆更贴合目标工作。** 所查记忆页偏用户/工作上下文，未完成竞品对象模型/插件组合穷举；以下“没有对象模型”只代表本轮公开描述未指认，不是实现不存在的事实。
三家大模型的记忆定位全是"你这个人/你的工作上下文"：ChatGPT memory sources 列表（[FAQ](https://help.openai.com/en/articles/8590148-memory-in-chatgpt)）、Claude"Memory built for work…remembers your team's processes"（[2025-09 博客](https://claude.com/blog/memory)）、Gemini"Personal context"（[帮助页](https://support.google.com/gemini/answer/16413516)）。这些页面未具体指认组织、目标、决定、行动项的对象模型；是否可通过项目、工具或企业组合承载，仍需实际任务核验。

**假设 2：决定跟进可能比通用定时推送更贴近本目标。** 所查平台公开材料展示定时任务/简报；本轮未穷举所有决定跟踪能力。Huper 是直接强调 track execution 的样本，不构成唯一性。
ChatGPT scheduled tasks（用户自配+事件触发；官方明文任务读不到项目文件，[help](https://help.openai.com/en/articles/10291617-scheduled-tasks-in-chatgpt)）、Gemini Daily Brief/Scheduled actions（[blog](https://blog.google/products-and-platforms/products/gemini/scheduled-actions-gemini-app/)、[help](https://support.google.com/gemini/answer/17077455)）、Claude 的任意周期无人值守任务（[产品页](https://claude.com/product/cowork)）——"会主动"已不是增量；"主动盯的是**未决决定、超期行动项、该问谁**"才是。本轮直接找到 Huper 把"track execution, surface decisions"写进卖点（[PR](https://metroatlantaceo.com/news/2026/02/huper-raises-15m-deliver-chief-staff-rest-us/)）。

**假设 3：可审计的决定/行动链可能是目标对象，而不只是一次文档。** 各产品的公开 Sources/Canvas/Brief 页面不能单独证明没有台账；本仓是否能稳定重建“谁、何时、凭什么、后来怎样”仍待真实路径与状态契约。
所查 Canvas/Artifacts/Deep Research/Daily Brief 与 Sources 页面强调文档/信息流/引用（[ChatGPT FAQ](https://help.openai.com/en/articles/8590148-memory-in-chatgpt)、[Claude 帮助](https://support.claude.com/en/articles/11817273-use-claude-s-chat-search-and-memory-to-build-on-previous-context)）；本次查到的引用面本身不足以重建完整决定链，但未审所有企业工作流。Huper 的 BYOK/治理营销表明供应商关注此问题，不证明普遍市场需求。

**假设 4：数据边界/账号限制会影响部分机密场景的选择。** 以下限制针对所查计划/页面，不能推出三家所有企业方案“集体失格”、目标用户普遍买不起企业档或市场不服务其价格带。本仓本地存储也不保证推理留域，见 [数据流审计](../tech-exploration/261005-turnaround-evidence-audit.md)。
Gemini 自动记忆与 Daily Brief **排除工作/学校账号**（[帮助页](https://support.google.com/gemini/answer/16598469)、[17077455](https://support.google.com/gemini/answer/17077455)）；ChatGPT improved memory 不在 BAA 内、受监管工作区默认关（[FAQ](https://help.openai.com/en/articles/8590148-memory-in-chatgpt)）；三家均为美国云 SaaS、无本地/自托管。企业护栏要到贵价 plan（Claude Team/Enterprise 管理面）才出现。**数据不能随意出域、企业档价格可能是部分目标场景的约束；目标用户的预算和合规条件尚未访谈，不能声称三家都不服务。**

**假设 5：平台产品收敛会提高“只做有记忆聊天”的替代压力。** 页面/计划的迁移或退役是时间敏感事实；本轮只把它作为定位风险，不据此预测行业方向或客户锁定。
Custom GPTs 官宣退役（企业 2026-12-11、个人账号已禁新建，[help](https://help.openai.com/en/articles/8983148-does-memory-function-with-gpts)）；Gems 官宣 2026-11 起个人账号迁往 skills（[help](https://support.google.com/gemini/answer/15146780)）；NotebookLM 并入 Gemini 生态改名（[blog](https://blog.google/innovation-and-ai/products/gemini-notebook/notebooklm-gemini-notebook/)）；Claude Cowork 并回 Claude 本体（[产品页](https://claude.com/product/cowork)）。同时 a16z 合伙人 Olivia Moore 公开把**记忆列为 AI 产品下一个核心优势/留存杠杆**（[Top 100 报告访谈中文转述，2026-03](http://www.woshipm.com/share/6352891.html)；原报告 The Top 100 Gen AI Consumer Apps——二手转述，见文末）。**解读：平台记忆越强，"通用助手"锁定越深——一个只做"有记忆的聊天+简报"的产品会被吸进去；我们的位置必须落在平台记忆结构装不下的东西上。**

### 候选增量（综合推论，待实现与真实对照）

下列“增量”是比较维度，不是已测差异；“全品类仅 Huper”“平台只有摘要”“数据主权已满足”等措辞均按上述适用边界收窄。只有同任务/同输入的结果与数据流证据才能形成优势结论，具体问题归 [自洽卡](../../_archive/settled_issues/261005-turnaround-coherence.md)。
1. **显式工作对象**：组织/目标/决定/行动项的对象模型与状态 owner 是否让任务更可靠？当前本仓还不能只凭页/表存在宣布完备状态机。
2. **盯决定的主动性**：待决/超期/该跟谁是否比普通定时摘要更有用？Huper 是同向竞争证据，不是市场唯一对手。
3. **可审计产物**：来源、本人选择、执行与后续状态能否关联重建？引用齐全不等于判断正确，审批路径仍有未闭契约。
4. **可控数据边界**：本地/可控存储与实际推理端点是否满足目标允许范围？预算、权限与导出边界需真实场景，不宣称普遍数据主权优势。
5. **竞争反证**：Claude 的记忆/无人值守/插件组合贴近同类工作；应拿它作任务对照，不能把它已有三轴能力从差异化论证里删掉。

---

## 未证实 / 仅二手（诚实清单）

- **GPT 记忆/项目文件的具体档位数字**（ChatGPT 各 plan 的 project 文件数、saved memory 上限）：官方页声明"依计划而异"，具体表格未抓取。**未证实。**
- **Claude 项目知识的具体上限**（RAG-for-projects 帮助文仅核到存在与标题，正文未抓）。**未证实。**
- **Gemini Gems Knowledge 文件上限数字**、Canvas/Deep Research 导出细节：官方页存在、数字未抓。**未证实。**
- **Gemini Notebook 付费档来源数**（仅核到 Free=50）：usage limits 页未抓到。**未证实。**
- **Xembly 关停的官方公告**：未找到一手；产品消亡依据 = Crunchbase 历史描述（二手）+ 域名现为博彩垃圾站（当日直接核实）。细节**未证实**。
- **Fyxer / Geekbot / Limitless**：仅核官网/帮助页标题与定位，未深查功能边界与经营状况。**浅查。**
- **a16z Top 100 报告与 Olivia Moore 记忆留存论**：经中文转述（人人都是产品经理，2026-03-13）引用，a16z 原文页未直接抓取。**二手。**
- **Audio/Video Overviews、featured notebooks、Workspace Updates 2026-03 文**：标题/存在性核到，正文未抓。**浅查。**
- **中文生态（飞书/钉钉 AI 助理等）**：本调研未系统覆盖。**缺口。**
- 反爬与方法说明：OpenAI 帮助中心对直连返回 403，以上其帮助页内容经当日线上快照（代理）取得，与官方页面一致（标题/更新时间在文内）。
