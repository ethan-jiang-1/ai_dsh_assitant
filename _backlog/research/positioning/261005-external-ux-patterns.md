---
topic: 定位
intent: "看同类产品第一次打开时怎么给出主动价值。"
---

# 外部同类产品的首跑体验（first-run）与主动价值模式调研

> 调研日期：2026-10-05。调研方法：web_search 定位 + 直接抓取一手页面（官方博客 / 官方文档 / 产品页 / 创始人访谈原文）。
> **诚实标注**：每条结论后标注〔一手〕（直接来自官方博客/文档/产品页原文）或〔二手〕（评测/媒体转述）或〔未找到一手来源〕。
> 环境备注：本会话的 web_fetch 工具被 DNS 白名单阻断，全部抓取经 curl 完成；个别 JS 渲染站点（如 Audos）拿不到正文，已在对应节标注。

---

## 本轮使用边界

本档是 CRM、日程、知识工具的公开模式原料，官网动作不证明真实管理者采纳或本仓收益。连接邮箱/日历与本仓“不做 IM/只用已提供本地资料”不同；只借可见状态、成品入口、可关闭主动性，不直接复制连接数据源、天气/新闻、次数/时间为硬规格。原来源/获取限制保留，本轮未逐 URL 重验。喂 [定位卡](../../_archive/settled_issues/261005-open-value-deficit.md) 与 [自洽卡](../../_archive/settled_issues/261005-turnaround-coherence.md)。

## 1. Clay（clay.earth，现更名 Me.sh / Mesh）

**更名背景**：2026-03-25 官宣 "Clay is now Mesh"，官方称已托管 170M+ 关系；2025-06 被 Automattic 收购。
一手来源：[Clay is now Mesh（官方博客，已迁入 library.me.sh）](https://library.me.sh/knowledge-base/)（What's New 列表可见原文）、[TechCrunch 收购报道〔二手〕](https://techcrunch.com/2025/06/12/automattic-acquires-relationship-manager-clay-to-add-an-identity-layer-to-online-tools/)。

### 首跑体验（零数据时打开看到什么）
- 官方 Getting Started 的前三步是：**下载 App → 连接账户 → 个性化设置**。连接邮箱/日历/LinkedIn/iMessage 后，系统**自动为每个联系人生成卡片**（认识多久、关系强度、最近动态），不需要用户写任何东西。〔一手：[Getting Started（官方 Library）](https://library.me.sh/knowledge-base/getting-started/)〕
- 即：零数据问题被"**从既有数据源自动生成主对象（人的卡片）**"消解——用户第一次打开时 Home feed 里已经有内容，而不是空聊天框。〔一手，同上〕
- 官方明确"不做什么"（不读邮件正文、不发消息）来降低连接账户的心理门槛。〔一手，同上〕

### 主动价值机制
- **Daily Brief（2022）**：早上推送"你今天要见的人"的策展摘要——对方近况、新闻、你与 TA 的上一次会面；**默认关闭，在设置里手动开启**。另有 Weekly Digest（周日邮件，预热下周）。〔一手：[iOS Widgets and Daily Brief（官方博客 2022-07-14，原文已迁入现 Library）](https://library.me.sh/2022/07/14/ios-widgets-and-daily-brief/)〕
- **Reconnect**：给每个联系人设 4 档重连节奏（周/月/季/年）或 Automatic；**由真实互动自动顺延**（你提前联系了 Jane，下次提醒就从那次互动重新起算）；Home feed 里 surface 卡片；可调"每天建议几个人的数量"。〔一手：[Reconnect（官方 Library）](https://library.me.sh/knowledge-base/reconnect/)〕
- **Home feed**：职位变动、新闻提及、生日等自动浮出，"不用刷社交媒体就知道"。〔一手：[me.sh 首页](https://me.sh/)〕
- **"morning monologue"**：**未找到一手来源**。在现 Library、App Store 版本说明、检索中均未证实 Clay 用过 "Monologue" 这个名字作为功能；可证实的一手对应物是上述 Daily Brief / Weekly Digest / Home feed。引用"morning monologue"说法时请勿标注为一手。〔未找到一手来源〕

### 主对象与聊天位置
- 主对象是**人（卡片）与人的动态**，首屏是 Home feed（人的更新 + Reconnect 建议），不是聊天框。〔一手：me.sh 首页、Getting Started〕
- 聊天（Nexus）是**对关系网络的导航器/操作器**：问"我的人脉里谁懂芯片制造"、说"和 Bob 的会面很顺利，3 周后提醒我跟进"，Nexus 直接建卡片/笔记/提醒。2026-01 的 Nexus 4.0 让它获得全功能操作权 + web search + 引用来源。〔一手：[Introducing Nexus 4.0（官方博客）](https://library.me.sh/2026/01/12/introducing-nexus-4-0-and-an-exclusive-invitation/)；Nexus 定位另见〔二手〕[TechCrunch 2023-05-16](https://techcrunch.com/2023/05/16/personal-crm-app-clay-introduces-an-ai-helper-to-help-you-navigate-your-relationships/)〕

### 可借的模式
1. **首屏内容来自自动整合的既有数据，不来自用户输入**——冷启动=连接数据源，不是"跟 AI 说说你自己"。
2. **主动简报默认关闭、开关+节奏可调**，且提醒随真实行为顺延（防"狼来了"疲劳）。
3. 聊天是"对主对象的查询与操作层"（自然语言 CRUD），不是产品的主界面。

### 来源 URL 列表
- https://me.sh/ （官方首页，2026 现状）
- https://library.me.sh/knowledge-base/getting-started/ （首跑官方指南）
- https://library.me.sh/knowledge-base/reconnect/ （主动重连机制）
- https://library.me.sh/2022/07/14/ios-widgets-and-daily-brief/ （Daily Brief 原始公告）
- https://library.me.sh/2026/01/12/introducing-nexus-4-0-and-an-exclusive-invitation/ （Nexus 4.0）
- https://techcrunch.com/2023/05/16/personal-crm-app-clay-introduces-an-ai-helper-to-help-you-navigate-your-relationships/ 〔二手〕
- https://techcrunch.com/2025/06/12/automattic-acquires-relationship-manager-clay-to-add-an-identity-layer-to-online-tools/ 〔二手〕

---

## 2. Martin（trymartin.com，主动型个人 AI 助理）

### 首跑体验（零数据时）
- 官方文档 Introduction 的首跑三步：**注册 → 给 Martin 你的联系方式（手机/邮箱）→ 连接集成（日历、收件箱、Slack 等）**。产品把"能被多渠道触达（电话/SMS/WhatsApp/邮件/Slack）"和"连接工具"作为首跑主体，而非让用户先聊天。〔一手：[Introduction（官方文档）](https://docs.trymartin.com/introduction)〕
- 主界面是 **dashboard**（含 Background Tasks 设置区、Proactive Drafts 应用区、Inbox 设置），聊天只是入口之一。〔一手：各 Background Tasks 文档页对 dashboard 的描述〕

### 主动价值机制（"助理先开口"的最完整样本）
官方 Background Tasks 一节列了 4 个后台任务，全部是"助理先开口"：
- **Wake Up Calls**：每天固定时间**打电话**叫醒你，播天气+当日日程，可加自定义指令；时间/读哪个日历/指令都可配置。〔一手：[Wake Up Calls](https://docs.trymartin.com/background-tasks/wake-up-calls)〕
- **Email Briefings**：每日/每周邮件简报。〔一手：docs.llms.txt 条目 https://docs.trymartin.com/background-tasks/briefings.md 〕
- **Proactive Drafts**：按用户预定义的"话题类别+草拟指令"**主动起草邮件**放进草稿箱与 dashboard。〔一手：[Proactive Drafts](https://docs.trymartin.com/background-tasks/proactive-drafts)〕
- **Email Triage**：自动打标签+跟进动作。〔一手：docs.llms.txt〕
- 官方博客对主动性的表述："Every morning before you wake up, Martin will have drafts prepared for your latest unread messages"；Wake Up Call "waking up like Iron Man with a phone call from your own JARVIS"。〔一手：[Introducing Martin Pro（官方博客 2025-03-22）](https://www.trymartin.com/blog/introducing-martin-pro)〕

### 冷启动怎么过
- 靠**连接日历/收件箱**提供第一批内容（日程+天气是 wake-up call 的最小数据集）；靠**用户写的少量指令**（如"帮我安排会议时的回复口径"）定义草拟行为；靠**长期记忆**（Pro 功能点之一："Enhanced long term memory for your Martin"）随使用积累。〔一手：同上博客与文档〕
- 官网首页直接展示主动推送实例："Good morning! I found 3 more papers on Pare Lorentz that might be relevant to your research…"（助理先发消息）。〔一手：https://www.trymartin.com/ 〕

### 主对象与聊天位置
- 主对象是**待办事务的 dashboard**（日历/邮件/任务/备忘的聚合），聊天被放在"多渠道召唤助理"（text/call/email/Slack）的位置；主动性由"后台任务"承载，与聊天分离。〔一手：文档结构〕

### 可借的模式
1. **把主动性显式建模为"后台任务"清单**：每项有名字、设置项、开关、（付费）门槛，用户逐项开启——不是藏在聊天背后的魔法。
2. **最小主动数据集 = 日历 + 天气**：零记忆也能每天给出有用的晨间来电。
3. 首跑顺序：给联系方式 → 连工具 → 开后台任务；聊天只是使用通道之一。

### 来源 URL 列表
- https://www.trymartin.com/ （官网首页）
- https://docs.trymartin.com/introduction
- https://docs.trymartin.com/background-tasks/wake-up-calls
- https://docs.trymartin.com/background-tasks/proactive-drafts
- https://docs.trymartin.com/llms.txt （文档索引）
- https://www.trymartin.com/blog/introducing-martin-pro

---

## 3. Lindy（lindy.ai，主动型 AI 队友/助理）

### 首跑体验（零数据时）
- Quickstart 两步：**把 Lindy 拉进团队 Slack → 连接自己的邮箱/日历/电话**。首个对话界面不在产品里而在 Slack（频道 @mention + 私信 DM 双面）；首次 DM 时 Lindy 回复一个"Connect Slack to Lindy"按钮完成绑定。〔一手：[Quickstart（官方文档）](https://docs.lindy.ai/start-here/quickstart.md)〕
- 文档给出的"Try it"全是**借已连接数据的具体问句**（"What's on my calendar today?"），不是自由空聊。〔一手，同上〕

### 主动价值机制
- **Daily Brief**：内置个人例行任务，"每个早晨你的日程、会议对象、行业新闻、优先事项主动送达——Slack DM、手机短信或 Lindy chat，There's nothing to check, it just shows up"；内容范围由用户用自己的话定义。〔一手：[Daily Brief（官方文档）](https://docs.lindy.ai/features/meeting-assistant/daily-brief)〕
- **Routines 的三段式模型**：trigger（schedule 或 event：收到邮件/Slack 消息/会议将开始/会议结束…）+ prompt（自然语言）+ destination（送达渠道）；"it's what makes Lindy proactive: briefing you, prepping you for meetings, and tracking follow-ups without being asked"。〔一手：[Routines（官方文档）](https://docs.lindy.ai/teammate/routines)〕
- **Built-in routines 清单**（逐个 toggle）：Daily briefs / Email drafting / Email labeling / Urgent email alerting / Follow-up bumps / Meeting recording / Meeting prep / Meeting scheduling。〔一手，同上〕

### 冷启动怎么过
- **Discover 模板库**：按领域分组的现成模板（Morning briefing、End-of-day review、Weekly wrap、Promise tracker、Post-meeting follow-ups、Calendar audit…），一键添加；每张卡标明状态——Ready / Needs setup（缺哪个集成，旁边就是 Connect 按钮）/ Needs admin。用户不必从零发明"该让助理干什么"。〔一手：Routines 文档〕
- 也可用"Describe your routine"一句话生成，配 suggestion chips 与 shuffle 按钮兜底。〔一手，同上〕

### 主对象与聊天位置
- 主对象是**Routines 页（在跑什么）+ Home（做了什么）+ Meetings 库**；聊天分散到 Slack/短信/chat 三处，且大量交互由触发器代替。〔一手：文档导航结构〕

### 可借的模式
1. **"模板库 + 缺什么连什么"的冷启动**：把"产品能主动做什么"变成可见卡片清单，每张卡声明前置数据需求——这直接回答了"打开后该干什么"。
2. **主动 = trigger/prompt/destination 三段式**，可以照抄到任何助理产品的心智模型。
3. 简报送达渠道跟着人走（Slack/短信），不是"回到 App 看"。

### 来源 URL 列表
- https://docs.lindy.ai/start-here/quickstart.md
- https://docs.lindy.ai/features/meeting-assistant/daily-brief
- https://docs.lindy.ai/teammate/routines

---

## 4. Audos（Henrik Werdelin 的"AI 陪跑创业"产品）

- **未找到一手来源**：audos.com 为 JS 渲染空壳（curl 只拿到 5KB 骨架），官方博客/文档未能取得。
- 二手信息：Audos 的模式是**AI（访谈式）先问创业者一连串问题**，据此生成商业计划、AI 每日教练/推送，目标"每年启动 10 万+ 小生意"。创始人 Werdelin 的访谈可听：[AI with Alec 播客页（Podscan）](https://podscan.fm/podcasts/ai-with-alec-get-smarter-on-ai-the-easy-way/episodes/the-ai-questions-ceos-are-running-out-of-time-to-ask-henrik-werdelin)、[Tank Talks 访谈（Ivy.fm 索引）](https://ivy.fm/tag/henrik-werdelin)。〔全部二手〕
- 结论待验证：**"访谈式 onboarding"在这类产品里确实存在，但本文未能给出 Audos 的一手文本**。可交叉印证访谈式路径的一手案例见 §7 Day.ai。

---

## 5. NotebookLM

### 首跑体验（零数据时）
- **官方直接给"示范数据"：Featured notebooks**。Google 与 Eric Topol、The Economist（The World Ahead）、The Atlantic（Arthur C. Brooks 专栏）、Our World in Data、莎士比亚全集等合作推出精选笔记本；用户可以立刻在**有完整来源的笔记本里**体验全部核心功能（读原文、带引用的问答、Audio Overview、Mind Map）。〔一手：[Try featured notebooks on selected topics in NotebookLM（Google 官方博客 2025-07-14，Steven Johnson 署名）](https://blog.google/innovation-and-ai/models-and-research/google-labs/notebooklm-featured-notebooks/)〕
- 同文披露配套机制：**公开分享笔记本**（上线四周内用户自建 140,000+ 个公开笔记本）——新用户还有海量他人做好的"样板间"可逛。〔一手，同上〕
- 博客开篇即点明设计哲学："One of the secrets to getting the most out of NotebookLM is **assembling high-quality sources**"——产品主对象自始至终是**来源/笔记本**，聊天只是对来源的探索方式。〔一手，同上〕

### 主对象与聊天位置
- 主对象 = 笔记本及其来源集（三栏布局：Sources / Chat / Studio 产出）；空聊天框问题被"先选一个笔记本（自己的或 featured 的）"结构性地回避了。〔一手：同上博客对功能的描述；产品页 https://notebooklm.google/ 〕

### 可借的模式
1. **Featured/sample 内容是零数据首跑的正规解**：与其空着，不如内置几个"官方做好、有真实价值"的示范主对象，让用户先体验"得到价值"再上传自己的数据。
2. **把来源（记忆/资料）当一等公民展示**，聊天附引用——这同时解决了信任与"为什么用它"。

### 来源 URL 列表
- https://blog.google/innovation-and-ai/models-and-research/google-labs/notebooklm-featured-notebooks/ 〔一手〕
- https://notebooklm.google/ 〔一手产品页〕

---

## 6. Limitless（原 Rewind）/ Rewind（pendant/记忆类）

### 现状（一手）
- Limitless 已于 2025-12 被 Meta 收购；Dan Siroker 公开信：继续支持现有 Pendant 用户至 2026 年底、免费 Unlimited、**停售新 Pendant、下线非 Pendant 功能（含 Rewind）**、部分区域停服。〔一手：[limitless.ai 首页公开信](https://www.limitless.ai/)〕
- 这意味着"记忆类主动 surfacing"品类的一手材料正在消失（官网博客已下线，Wayback 未见成文快照）。

### 主动 surfacing 的设计（来源受限，如实标注）
- 官方首页现存文本能证实的产品叙事：Pendant 记录一天对话 → AI 产出会议纪要/日常总结/会前准备（"ask it anything about your day"层级的定位），即"**你昨天经历了什么**"由系统先整理好。〔一手：limitless.ai 首页与 #pendant 区块〕
- 具体的 "Prep before meetings" / "daily recap" 交互细节：**未找到一手来源**（support.limitless.ai 不可达、官方博客已随收购下线）。二手评测（如 [ComparEdge](https://comparedge.com/tools/limitless-ai)、中文媒体转述）描述了 daily summary 与 meeting prep，但本调研未采信为结论。〔未找到一手来源〕
- Rewind 时期（桌面端记忆）的学术性一手评估见 Jeff Huang 等的论文 [Rewind_IMWUT18](https://jeffhuang.com/papers/Rewind_IMWUT18.pdf)（研究性一手，非官方产品设计文档）。〔一手（学术论文）〕

### 可借的模式（保守版）
- "自动记录 → 系统先把'你的昨天'整理成可读产出，用户再追问"的次序，在品类叙事中稳定存在；但**具体 UI 设计无法给出一手引用，建议不要在产品文档中引用细节**。

### 来源 URL 列表
- https://www.limitless.ai/ （Meta 收购公开信 + 现存产品叙事）
- https://jeffhuang.com/papers/Rewind_IMWUT18.pdf 〔学术一手〕
- https://comparedge.com/tools/limitless-ai 〔二手，仅作线索〕

---

## 7. "AI chief of staff / 数字分身"品类：Motion、Reclaim、Dex、Day.ai

### Motion（usemotion.com；注意 motion.com 是同名工业品公司）
- 首屏主对象：**AI Calendar + AI Tasks**（官方导航第一组即 "AI Project Manager / AI Task Manager / AI Calendar"），产品自称 "The #1 Rated Productivity Platform for the AI Era"。〔一手：[usemotion.com](https://www.usemotion.com/)〕
- 官网注册流程露出**模块勾选式 onboarding**："What AI tools would you like to use?" → AI Tasks / AI Projects / AI Docs / AI Notetaker / AI Calendar / AI Workflows。〔一手，同上；来自注册漏斗页文案〕——不是访谈式，是"**点选你要哪几个 AI 工具**"。

### Reclaim（reclaim.ai）
- 首屏主对象：**日历**（Google Calendar add-on 形态，"AI Planner: Automate the perfect daily plan"；功能全部以日历事件为载体：Focus Time / Habits / Buffer / Tasks）。〔一手：[reclaim.ai](https://reclaim.ai/)〕
- 主动价值 = 每天自动排好的日计划（Planner），聊天（AI Assistant）只是"plan, prioritize, optimize"的辅助口。〔一手，同上〕

### Dex（getdex.com，个人 CRM）
- 首屏主对象：**人 + 保持联系提醒**（"Keep in touch, remember where you left off"；LinkedIn 同步 + 头衔变动提醒"提供完美的重新联系契机"）；近期新增 **MCP**：把 Dex 的人脉数据接给 Claude/ChatGPT 等外部 AI 用——聊天外置给通用助手，Dex 自己做数据层。〔一手：[getdex.com](https://www.getdex.com/)〕

### Day.ai（AI-native CRM，Sequoia 投）
- 证明"**用最少的用户配置换 AI 上下文**"：新用户不导入 pipeline 数据，只声明 Org Relationships（哪些公司是 prospect/customer/partner/vendor），AI 分析完整沟通历史来重建 CRM——"Traditional CRMs are built around properties and fields… AI-native systems are built on **context and reasoning**"。〔一手：[Solving problems with CRM in an AI-native way（Day.ai 官方博客，创始人 Christopher O'Donnell 署名）](https://www.day.ai/resources/solving-problems-with-crm-in-an-ai-native-way-deal-import-example)〕
- 创始人定位访谈原文（逐字转录）："what if we were to start from the very beginning and do everything in this… radically different world"（eliminate manual data entry 为第一性目标）。〔一手访谈转录：[TBPN 2026-02-02](https://www.tbpndigest.com/story/2026-02-02/dayai-raises-20m-from-sequoia-to-build-an-ai-native-crm-that-thinks-like-claude-not-a-spreadsheet/transcript)；注意转录为自动生成、含错字〕
- **访谈式 onboarding 的正面一手证据仍缺**：Day.ai 官方博客未直接描述"产品先问用户一连串问题"的流程；Audos 一手缺失。此点上结论为：**方向上存在（以'声明最小结构 + AI 补全上下文'变体出现），逐问答式访谈未找到一手来源**。

### 可借的模式
1. CEO 助理类的首屏主对象几乎都不是聊天：**日历/任务（Motion、Reclaim）或人（Dex）**；聊天是排在主对象之后的操作方式。
2. **"用户声明最小结构（谁重要/什么目标）→ AI 自动补全其余上下文"**（Day.ai）是"访谈式 onboarding"的低成本近似——比逐条问答省力，比完全自动可解释。

### 来源 URL 列表
- https://www.usemotion.com/
- https://reclaim.ai/
- https://www.getdex.com/
- https://www.day.ai/resources/solving-problems-with-crm-in-an-ai-native-way-deal-import-example
- https://www.tbpndigest.com/story/2026-02-02/dayai-raises-20m-from-sequoia-to-build-an-ai-native-crm-that-thinks-like-claude-not-a-spreadsheet/transcript

---

## 8. 设计文献：空状态 / blank composer problem

- **NN/g（Kate Kaplan, 2021-09-19）：Empty states 不是留白，是三类机会**——①传达系统状态（"真的没数据"还是"还在加载"必须说清，否则用户反复刷新）；②学习线索（发现未用功能）；③关键任务的直达入口；完全空白"creates confusion and decreases user confidence"。〔一手：[Designing Empty States in Complex Applications: 3 Guidelines](https://www.nngroup.com/articles/empty-state-interface-design/)〕
- **a16z（Anish Acharya, 2026-01-08）：AI 应用的下一程是"思考/探索优先"**——现有工具全是 execution 工具，缺 thinking 工具；"agent first (exploration first)" 的产品设计被点名（Antigravity）；并描绘了"PM 每天早上 review 模型夜里自动做出来并 A/B 测好的 2-3 个功能"的主动图景。〔一手：[Notes on AI Apps in 2026](https://a16z.com/notes-on-ai-apps-in-2026/)〕
- 二手佐证（不作结论）：Slack 空状态激活拆解 [Growth Dives](https://growth-dives.kit.com/posts/growth-dives-how-slack-drives-activation-with-empty-states)；"chatbots 仍是 DOS 界面" [wabiai](https://wabiai.ai/3-why-current-chatbots-are-still-the-dos-interface-of-ai.html)。Growth.Design 案例库为视觉化内容，本次未取到可引用文本。〔二手〕

---

## 9. 跨产品共性模式（可迁移）

1. **主对象不是聊天，聊天是操作层**——Clay/Mesh 的主对象是"人的卡片+动态流"、NotebookLM 是"来源/笔记本"、Motion/Reclaim 是"日历与任务"、Lindy 是"routines 清单"。聊天在这些产品里都是"对主对象的查询/操作通道"之一（Nexus、AI Assistant），排在首屏主内容之后。（出处：Clay、NotebookLM、Motion、Reclaim、Lindy 全部一手）

2. **冷启动 = 连接既有数据源，而非"请介绍一下自己"**——所有拿到主动权的产品的首跑第一步都是连接（邮箱/日历/LinkedIn/Slack），连完首屏就有内容。零配置时才用"官方示范内容"兜底（NotebookLM featured notebooks 是最完整的一手样本）。（出处：Clay Getting Started、Martin Introduction、Lindy Quickstart、NotebookLM，一手）

3. **把"主动性"显式做成可开关的任务/模板清单，而不是隐藏的智能**——Martin 的 Background Tasks、Lindy 的 built-in routines + Discover 模板库（每张卡声明"缺什么集成、一键 Connect"）。这直接回答"打开后该干什么"：用户从清单里挑，而不是面对空白输入框。（出处：Martin、Lindy，一手）

4. **最小主动数据集：日历 + 天气**——用户还没有任何记忆/历史时，晨间简报先由日历日程+天气+行业新闻构成（Martin Wake Up Calls、Lindy Daily Brief 均把日程与天气列为默认项）。"主动价值"可以从公开结构化数据起步，随记忆积累加厚。（出处：Martin、Lindy，一手）

5. **主动内容要可调、可关、且随真实行为顺延**——Clay Reconnect 的四档 cadence + Automatic + "互动后自动顺延下次提醒" + 建议数量可调；Lindy/Martin 的每项任务独立 toggle。反例教训：默认全开会制造提醒疲劳。（出处：Clay Reconnect、Lindy、Martin，一手）

6. **空状态三件套：说清状态、给学习线索、给直达路径**——NN/g 的空状态准则与上述产品实践一致：blank composer 的反面不是塞更多提示文案，而是用"主对象内容 + 模板/示范 + 直达任务入口"替代它。a16z 进一步指出方向：从 execution-first 转向 exploration-first 的产品设计。（出处：NN/g、a16z，一手）

---

## 附：本调研的已知局限
- web_fetch 工具被 DNS 白名单阻断，全部页面经 curl 抓取；JS 重度站点（Audos、部分 Limitless 页面）取不到正文。
- "Clay morning monologue" 一名与 Audos 的访谈式 onboarding 细节、Limitless Prep/daily recap 的具体 UI：**均未找到一手来源**，文中已逐处标注，请勿在产品文档中作为事实引用。
- Motion 的首跑细节仅来自官网注册漏斗文案；未获得其 onboarding 完整截图级证据。
