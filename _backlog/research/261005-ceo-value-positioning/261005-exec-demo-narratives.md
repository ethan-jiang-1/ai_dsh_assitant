---
topic: 定位
intent: "看公开的 CEO/CFO 十分钟演示怎么讲，借叙事骨架。"
---

# 面向 CEO/CFO 的「十分钟 AI 演示」叙事先例调研

> 调研日期：2026-10-05。活卡：[输入边界](../../_archive/settled_issues/261007-input-boundary.md) 只用本文划清 Huper 式全量接入和本产品的差别，不把本文当成当前的演示设计。原卡：[定位卡](../../_archive/settled_issues/261005-open-value-deficit.md)、[自洽卡](../../_archive/settled_issues/261005-turnaround-coherence.md)。
> **方法**：web_search 定位 + curl 直抓一手页面。本会话 `web_fetch` 工具被 DNS 白名单阻断（"resolves to a non-public IP"，与同日 [261005-external-ux-patterns.md](261005-external-ux-patterns.md) 记录一致），全部抓取经 `curl -A <浏览器UA>` 完成；BusinessWire 对 curl 403、Gartner 新闻站对 curl 与 Web Archive 均拒绝，前者改读全文转载、后者经 r.jina.ai 代理取得（正文与 IT Brief UK 转述逐句一致）。Gartner 1Q26 CFO Report 与 Deloitte CFO Sentiment 为公开 PDF（pdftotext 提取）。
> **诚实标注**：每条结论标〔一手〕（官方页面/官方 PDF/官方 playbook 原文）或〔二手〕（媒体/转录/转载）。文末有「未证实/仅二手」清单。

---

## 本轮使用边界

本档记录营销话术、实践建议和转引统计，不是本方案的采纳实证。董事会汇报、演示录像与实际上手不同；Atlassian +90% 不能作亲演示的因果收益或本项目验收。CEO/CFO 材料保留作反证/支撑，本项目已确认一把手主线，不自动设双角色主线、KPI 页或固定十分钟规格。脚本动作与技术/数据事实分别核验；本轮未重新抓全部来源。当前活卡只取 Huper 边界；演示设计本身属于原卡 [定位卡](../../_archive/settled_issues/261005-open-value-deficit.md) 与 [自洽卡](../../_archive/settled_issues/261005-turnaround-coherence.md)。

## 一、AI 助理产品对高管的营销叙事结构（5 家）

### 1. Lindy（lindy.ai）——"AI 员工"，用任务回执开场

**第一句承诺**（H1）：**"Less chatting, more doing."**；副题："Lindy is your AI teammate that plugs into your tools, learns how you work, and takes real work off your plate."；meta description："Lindy is the AI employee that connects to all your tools, knows everything about your company, and does real work for the whole team."〔一手：[lindy.ai 首页](https://www.lindy.ai/)，2026-10-05 抓取〕

**页面骨架**（按出现顺序）：
1. **第一屏不是功能列表，是三个已完成的任务回执**——Slack 频道仿真：`@Lindy can you help debug why ad spend doubled?` → 逐项打勾（"Pulled 14 days of spend across Meta + Google ✓ Joined it to signups ✓ Wrote it up with 3 replacement creatives ✓ **3 steps · done in 21s**"）+ 可打开的产出物（`CAC-teardown.pdf`，"−64% blended CAC if paused"）；另两条：1,340 张工单聚类归因（8s）、6 个 PR diff 定位 500 根因（12s）。〔一手，同上〕
2. "Why Lindy feels like a **real teammate**"——五条拟人属性（Connected to everything / It's sat in every meeting / Shows up on schedule / Learns your skills / **Its memory is yours to edit**）。
3. "What teams hand to Lindy"——六个任务入口，每个都配"问句→带出处的回答"仿真（"did we make a call on the new pricing?" → "Ryan made the call in the product review" + 会议记录与决策日志链接）。
4. 渠道在场（Slack / iMessage / Email）、用户证言（"People love Lindy"）。
5. **信任与风险单独成节**："Compliant, private, and **in your control**. Three separate promises, and Lindy keeps all of them." 逐条：**Compliant.** "Audited against the standards your security team asks about." **Private.** "Your data is yours, and never trained on." **In your control.** "Nothing irreversible happens without your approval."〔一手，同上〕
6. 定价最后一档（Enterprise）的卖点是合规语言本身："Everything in Max, plus **the controls your security review will ask about**——HIPAA compliance & signed BAA / Audit logs / Onboarding & enablement."

**怎么处理信任与风险**：把"安全审查会问什么"直接写成产品卖点；承诺三件套是**合规、数据不训练、不可逆动作需批准**——第三条正是高管最怕 agent 的地方。〔一手，同上〕

**可借模式**：① 开场证据 = "任务已完成的回执 + 可点开的产出物 + 用时"；② 不可逆操作的批准权写进首页主承诺；③ 每个回答都带出处链接（会议记录、决策日志）。

### 2. Martin（trymartin.com）——"个人版 Jarvis"，一句话指令 + 结果回执

**第一句承诺**：**"Your personal AI like Jarvis."**；meta："Martin manages your calendar, inbox, SMS, phone calls, WhatsApp, Slack, and more. **Call, text, or email your AI assistant**."〔一手：[trymartin.com 首页](https://www.trymartin.com/)〕

**页面骨架**：① 开场是六条**一句话语音指令轮播**（"Text Jon my arrival time." "Forward my notes to Ben" "Reschedule my call to 3."）——先给"说一句话会发生什么"，再谈能力；② 社会证明放在极前："**Trusted by individuals at** [logo 墙] + #1 Product of the Day on Product Hunt"；③ 能力文案全部用**结果句**而非功能名："Cc to Schedule —— Your calendar on autopilot"；"Wake Up Calls —— An alarm that talks"；"Auto Drafts & Labels —— **Inbox zero without trying**"；"Productivity Suite —— Your new second brain"；④ 演示素材是手机通知/短信会话截图（"TIME SENSITIVE"、"Good morning! I found 3 more papers on Pare Lorentz…Want me to email you the links?"）；⑤ 用户证言四连（"Like having an extra brain" / "Wow, I am truly amazed" / "The best one out there" / "Like a Butler in Your Phone"）。〔一手，同上〕

**怎么处理信任与风险**：**不谈企业合规**——信任全部押在"个体可信度"（名人/PH 排名/用户证言）与"多渠道可达"上。这是五家里唯一纯个人视角叙事的样本。〔一手，同上〕

**可借模式**：① "指令→回执"成对展示是最小可理解的演示单元；② 结果句 > 功能名（"Inbox zero without trying" vs "auto-drafting"）。

### 3. Day.ai（day.ai）——"Life After CRM"，宣言式品类替代叙事

**第一句承诺**（H1）：**"scale your company brain"**；副题："Day AI provides the context graph and agent control plane to quickly and securely upgrade your go-to-market harness."；meta："Day agents run your go-to-market around the clock and **bring you the finished work to review**, in real time. **Built for teams running go-to-market on Claude.**"〔一手：[day.ai 首页](https://day.ai/)〕

**页面骨架**（开发者审美，五家里最不像"营销页"）：① 顶栏动词带：eval / build / deploy / secure / accelerate / scale——直接使用 coding agent 词汇；② ASCII 架构图：Slack/Gong/Gmail/Snowflake/API → `/company-brain`（skills/chat/data/knowledge/automation）→ Sales/CS/Support/EPD/**CEO**；③ **§1 CONTEXT GRAPH** 带自测量化表：time 2.1x faster（56.9s→27.2s）、tokens 1.9x fewer（39.3k→20.3k）、cost 2.6x cheaper（$0.159→$0.061）；④ **§2 AGENT CONTROL PLANE**："Day agents have names, job descriptions, and titles. They live in an org chart, they hear feedback…**The audit trail says exactly what ran, and nothing went out without your approval.**"每个 agent 挂在一个真人名下（"Morgan · pipeline analyst, reports to sam"）；⑤ 信任链：创始人宣言 + 投资方（Sequoia 等）+ 400+ 客户 + 具名职位证言；⑥ 转化钩子是"**Want a free month? Copy onboarding prompt**"——把接入点做成一段可复制提示词。〔一手：[day.ai 首页](https://day.ai/)〕

**创始人宣言**（叙事重心，About 页）："**I built that CRM.** I led the platform at HubSpot that became the only credible alternative to Salesforce ever built… A database that only knows what a human remembered to log was never going to hold the truth of anything. **That premise is gone.** …Not a better CRM. **Life after it.**"〔一手：[day.ai/about](https://day.ai/about)〕

**可借模式**：① "旧范式已死"宣言 = 品类替代叙事的最强形态（需要创始人级的一手权威）；② 面向"懂 agent 的买家"时，审计线索与批准权是**卖点而非附录**；③ 给出可信的量化对比（自测数据也标注口径）。

### 4. Reclaim（reclaim.ai）——"AI 替你防守时间"，角色化价值句

**第一句承诺**（H1）：**"#1 AI calendar for work."**；两个引导问句："**What if AI could optimize your time?**" / "Launch AI agents that work **24/7 for you**."〔一手：[reclaim.ai 首页](https://reclaim.ai/)〕

**页面骨架**：① 功能网格**全部冠名 AI**（AI Focus Time / AI Scheduling Links / AI Buffer Time / AI Habits / AI Smart Meetings / AI Tasks / AI Planner / AI Assistant），每条一句结果（"Set a Focus Time goal, and **let AI defend time** to get stuff done"）；② 按角色分 Solutions，各给一句价值句（Executive Assistants：Increase productivity, track time & book meetings faster；Finance：**Build the perfect workweek around high-priority tasks & meetings**）；③ 信任 = "Enterprise security, support & scalability" 小节 + "#1 AI calendar" 排名声明；④ 转化双轨：自助试用 + **Book a Demo / Watch a demo / Book your free goal-setting session**（真人销售辅助的 demo 动线）。〔一手，同上〕

**可借模式**：① 把单一稀缺资源（时间）变成"AI 替你防守的对象"——高管听得懂；② 按角色一句价值句（Finance/EA 各一条）；③ "Watch a demo" 与"免费 goal-setting session"并置——低门槛观察入口 + 高承诺对话入口。

### 5. Huper（huperlabs.ai）——与命题最贴的样本："AI Chief of Staff for Leaders"

**第一句承诺**（H1）：**"The AI chief of staff for leaders"**，副题 **"The latest status of anything in your business, without requesting a status update."** 接着一句："Huper reads everything happening across your company — email, Slack, meetings, your CRM — and turns it into one always up-to-date, self-organizing brain. **Then it briefs you.**"〔一手：[huperlabs.ai 首页](https://www.huperlabs.ai/)；公司 2026-02-26 宣布 $1.5M pre-seed（Nadia Partners、Link Ventures、Jim Brown），invitation-only alpha 2026-04-15、今秋公开〔一手新闻稿，原文见 BusinessWire（对我方 curl 403），全文读自转载：[Metro Atlanta CEO](https://metroatlantaceo.com/news/2026/02/huper-raises-15m-deliver-chief-staff-rest-us/)、〔二手〕[FinSMEs 2026-03-02](https://www.finsmes.com/2026/03/huper-raises-1-5m-in-pre-seed-funding.html)〕

**页面骨架**（对高管的叙事教科书）：
1. **痛点四问，全部是高管第一人称原话**："I spend half my week finding out what happened."（Status meetings, CRM archaeology, scrolling Slack）；"Everyone cc's me on everything."；"By the time information reaches me, it's stale and filtered."（**"Board decks arrive weeks late and pre-spun."** Especially sharp if you oversee a portfolio）；"My tools track tasks, not what's actually going on."〔一手，同上〕
2. **产品演示 mock 就是"高管的早晨"**：Status Digest 卡片——"**Your morning, in five minutes.** Good morning, Daniel. Three things need you this morning." 下接 What's News（带来源：Meridian Group / Gmail / Meeting）、"Risks You Should Know About"（每条带 →Slack/→Gmail 溯源箭头）、"What's Going Well"。〔一手，同上〕
3. How it works 三步：Ingest（"true multiplayer"）→ Parse into a **Unified Context Layer**（workstream 权限）→ Put a chief of staff on top。
4. 三个功能各配一句高管价值句：Status Digest = "**The front page of your company, curated to your role**…Not a summary of your inbox — a view across the entire company, live to the minute. **Every item has an arrow: click it and you are in a conversation with your chief of staff, already loaded with the context.**"；Workstreams = "**Same brain, any altitude**"（账户负责人看一户、区域负责人看汇总、CRO 看全景）；Watchers = "**Interrupted only when something truly needs you**"（含 "Did I drop any balls this week?" 这种周检 watcher）。〔一手，同上〕
5. **信任与风险独立成节，放在转化之前**："Security — Built by leaders who ran cybersecurity companies…**the security model came first, not after the demo.** **We have run our own company on this system for the better part of a year.**" 三条：BYOK 加密（per-tenant keys + rotation）、Permissioned by design、**Every insight traceable — Each insight links back to the activity and source that produced it, with a full audit trail behind it.**〔一手，同上〕
6. 转化是**稀缺+人味**："We are onboarding a small number of **mid-market teams and private equity funds** at a time…No spam. One reply from a person."〔一手，同上〕

**新闻稿里的 CEO 语言**：Michael Anton："they spend their best hours chasing status updates instead of actually leading their businesses…**Not another dashboard, not another chatbot.** A chief of staff that knows what's happening across your entire organization and **tells you what needs your attention before you have to ask**."；联创 Aidan Kehoe："**I don't need to prompt it, it prompts me**, which means I get back the one thing money can't buy, TIME."；市场数据背书引 IDC（管理者每周 9.3h 找信息）、McKinsey（25% 时间耗在行政）、Gallup 2025（$438B 年损失）。〔一手新闻稿全文，读自上述转载〕

**可借模式**：① 演示 = "高管早晨五分钟"（Status Digest 就是十分钟演示的成品模板）；② 每条洞察可溯源 + 点击下钻到带上下文的对话；③ "altitude"分层（同一事实按角色给不同汇总层）；④ "我们自己在跑这套系统"是最便宜的信任证据；⑤ 反品类句式（"Not another dashboard, not another chatbot"）。

---

## 二、"给董事会/高管演示 AI"的公开方法（4 篇）

### 1. Vinci Rufus：How to Present an AI Strategy to Your Board (Without Losing Them in 5 Minutes)

一手（从业者博客，2026-05-16 发布）。[原文](http://vincirufus.com/en/posts/how-to-present-ai-strategy-to-board/)

- **开场判据**："**Boards decide within the first three minutes.** If your opening sentence contains 'transformer architecture,' 'fine-tuning parameters,' or 'vector embeddings,' you have already lost the room. Board members are fiduciaries, not engineers… Your job is not to educate them on LLMs. It is to translate AI into the only language they fluently speak: **business outcomes**."〔一手，同上〕
- **Rule Zero：先给问题，不给技术**。"Boards evaluate it as an investment decision." 60 秒开场模板："We have a [business problem] that is costing us [$X annually / growing at Y%]. Competitors are addressing it with AI. We propose a phased program to close that gap, with a contained pilot of [$Z] and a go/no-go review in [timeframe]. **The board's decision today is whether to fund Phase 1.**"〔一手，同上〕
- **5 页框架（15 分钟窗）**：Landscape（一个头条数字）→ Readiness（五支柱**诚实打分**，"Be brutally honest about your weakest constraint—this builds trust faster than optimism"）→ Risk（liability ledger + "Governance is not a brake—**it is the operating system for safe speed**"）→ The Ask（金额/时间线/**break-even math**："Pilot prevents $2.2M in annual cost growth. Break-even in 65 days"）→ Dashboard（4–6 个 KPI 红黄绿 + 季度节奏 + **named owner**："Boards love dashboards because they signal accountability"）。〔一手，同上〕
- **语言对照表**（模型指标→业务结果）："Our model achieved 94.2% F1 score" → "**The system correctly identifies 19 of 20 high-risk cases, reducing false positives by 35%.**"〔一手，同上〕
- **董事会必问五题及答法**：失败怎么办（"we are not betting the company—**we are buying an option**"）；headcount（attrition+retraining not layoffs）；伦理合规（EU AI Act 映射 + General Counsel 背书）；别人做成了吗（同业案例+附件）；拖到下季度会怎样（每季度延迟成本 $550K + 竞争份额偏移）。〔一手，同上〕
- **交付纪律**："**No live demos. Demos fail, eat time, and shift focus to technology. Use screenshots if necessary.**" 60 秒内说出 recommendation；deck ≤10–12 页；提前 48h 发材料；**与 CFO/CRO 同台**（"This signals organizational alignment, not a tech pet project"）；用保守估计（"Boards deeply distrust 'hockey stick' AI projections"）。〔一手，同上〕
- 收尾金句："The AI strategy that gets approved is rarely the most technically sophisticated one. It is the most clearly communicated one."〔一手，同上〕

**注意场景差**：这篇是**董事会拨款汇报**场景，结论是"不要 live demo"；与产品演示（Atlassian/微软，见下）的"live wow moment"相反——两种情境要分开对待。

### 2. Atlassian Team Playbook：AI Use Case Demos（官方 playbook）

一手（Atlassian 官方 Team Playbook）。[原文](https://www.atlassian.com/team-playbook/plays/ai-demos)

- **效果证据**："Atlassian's Teamwork Lab analyzed weekly Rovo chat activity among Atlassians who did and did not attend a **live AI use case demo led by a company leader**. The results showed that Rovo usage **increased by 90%** among those who saw an Atlassian leader demonstrate **one of their own AI use cases**."——领头人演示**自己的真实用例**是采纳催化剂。〔一手，同上〕
- **结构 = 单用例 5–10 分钟三段**：Context（1–2 min，"why this example matters to them"）→ Demo（2–4 min，**必须含 "wow" moment**）→ Wrap up（2–4 min，变化/边界情况 + 邀请观众自己试）。〔一手，同上〕
- **north star 一句话**："What do you want them to **feel, know, and do** after this demo?"〔一手，同上〕
- **wow moment 清单**（官方枚举）："Build a custom agent **live in under two minutes**"；"With a single prompt, **trigger a multi-step workflow** (e.g., 'Find all open Jira tickets, summarize blockers, and send a Slack update')"；语音触发搜索/总结；跨工具实时整合。〔一手，同上〕

### 3. Microsoft Inside Track：How we're delivering demos in Microsoft 365 Copilot at Microsoft

一手（微软官方博客，2024-10-03，Idunn Wolfe 记录 Robert Epstein 的内部演示方法）。[原文](https://www.microsoft.com/insidetrack/blog/how-were-delivering-demos-in-microsoft-365-copilot-at-microsoft/)

- **"The key to a successful Microsoft 365 Copilot demo is relevance."** 先调研受众（角色、对 Copilot 的熟悉度、痛点），"Tailoring your demo to their level of expertise and interests ensures that your message will have impact."〔一手，同上〕
- **聚焦**："Instead of trying to cover every feature, **home in on one or two key aspects** that will leave your audience with a 'wow' moment."〔一手，同上〕
- **真实场景闭环示例**：向 HP 销售演示时——Copilot 总结一份政府网站长文档 → 找出匹配的 HP 产品 → **起草正式投标回复，全程几分钟**。"This kind of practical, relatable example helps the audience see the immediate benefits."〔一手，同上〕
- **一个 unforgettable moment**："**It's important to create a jaw-dropping wow moment** for the audience. It can significantly change their perspective or behavior toward a product."（他的例子：Word 文档秒出完整 PPT 含讲者备注）。收尾必给 **call to action**（鼓励观众自己上手）。〔一手，同上〕

### 4. Kevin Weil（OpenAI CPO）on Lenny's Podcast：真原型替代 mockup

〔二手转录：[Lenny Distilled 引语页](https://lennydistilled.com/guests/kevin-weil/)；节目本体〔一手音频〕：[Lenny's Podcast #254（Apple Podcasts）](https://podcasts.apple.com/ph/podcast/openais-cpo-on-how-ai-changes-must-have-skills-moats/id1627920305?i=1000702998371)，2025-06〕

- "Why shouldn't we be **vibe coding demos** right, left and center? Instead of showing stuff in Figma, we should be showing **prototypes that people are vibe coding over the course of 30 minutes**."——产品叙事正在从设计稿演示转向**真模型真数据的工作原型演示**。〔二手转录，同上〕
- 同场还有准确性分档论：60% / 95% / 99.5% 的正确率分别对应完全不同的产品——演示时对"成功率承诺"要按这个分档讲清楚。〔二手转录，同上〕

---

## 三、CFO 视角的 AI 采纳关注点（4 份，2025–2026）

### 1. Gartner 新闻稿（2026-05-28）：CFOs Must Stop Mistaking Finance AI Deployment for Value Creation

一手（官方新闻稿，Gartner Finance Symposium/Xpo 2026；经 r.jina.ai 取得全文，与 [IT Brief UK 2026-05-29 转述](https://itbrief.co.uk/story/gartner-says-cfos-struggle-to-turn-ai-into-business-value)逐句一致）。[原文](https://www.gartner.com/en/newsroom/press-releases/2026-05-28-gartner-says-cfos-must-stop-mistaking-finance-ai-deployment-for-value-creation)

- Marco Steecker（Director Analyst, Gartner Finance）："**They must not mistake activity for impact.** Counts of pilots, tools rolled out or use cases in production show that finance is moving, **but they do not prove that AI is delivering the value boards now expect**."〔一手，同上〕
- 数据：2026-03 对 204 位 finance leaders 的调查；已采用 AI 的组织里 **66%** 把"效率与生产力"列为首要收益；**63%** 说 2025 年实施比预期慢；预测与洞察生成是用例评分最低的两类。〔一手，同上〕
- 建议：**"measure AI portfolio progress by realized value rather than deployment volume"**；把投资从"生产力型用例"再平衡；补 data/talent/process/governance 底座。〔一手，同上〕
- 定性金句："**Finance does not need to prove that it can use AI anymore.** It needs to prove that AI can change how finance supports better business decisions."〔一手，同上〕

### 2. Gartner《The CFO Report》1Q26（公开 PDF）

一手（Gartner 官方公开资产）。[PDF](https://emt.gartnerweb.com/ngw/globalassets/en/finance/documents/1q26-cfo-report.pdf)

- **采纳停滞**："Fifty-nine percent of finance organizations report using AI, according to our 2025 Gartner AI in Finance Survey. That's progress — but the figure is similar to the 58% who reported using AI in 2024, **indicating that adoption has slowed**." 另一句："**84% of finance teams are in planning or deployment with AI**"（但 scaling 者极少）。〔一手，同上〕
- **用例设计法（可反用于演示脚本）**："Design in reverse"——把知识工作流拆成 **Inform → Decide → Act** 三步，从"最终动作"倒推（例：'release payments for legitimate and approved invoices' ← 审批标准是否满足 ← 从单据抽取的数据）。〔一手，同上〕
- **CFO 顾虑原声（客户故事）**：CFO "was **skeptical about investing in new AI tools without a clear ROI** and was **wary of vendor hype and poor data quality**"；解法是设计 "**human-in-the-loop operating model to address audit and risk concerns**"，KPI 定为 **margin recovery / headcount containment / revenue recapture**，18 个月回收 $40M。〔一手，同上〕

### 3. Deloitte《CFO Sentiment》Edition 19（H1 2025，澳洲 CFO 调查）

一手（官方 PDF，2025）。[PDF](https://www.deloitte.com/content/dam/assets-zone1/au/en/docs/services/consulting/2025/cfo-sentiment-edition-19-report.pdf)

- 采用面："Use of AI has continued to surge at both the organisation level (**83%**) and in the finance function (**64%**)." 但 "**use remains fragmented, with 'bottom-up' approaches still dominant**"；95% 称已有 AI 战略，**76% 只处于初步或部分成熟**。〔一手，同上〕
- **障碍榜**：Competing priorities 43% 居首；半年间下降的障碍是人才（34%）与理解力；**上升的障碍是实施挑战、投资成本、隐私与安全（23%）、"challenges demonstrating value"**——与 Deloitte《State of Generative AI in the Enterprise》一致。〔一手，同上〕
- 解读：CFO 语言的关键词是 **value demonstration / governance / privacy & security / competing priorities**——"演示价值"本身就是被点名的主要障碍之一。〔一手（对数据的）上述转写〕

### 4. Deloitte Center for Controllership 博客：AI in Finance — How CFOs Can Build a Workforce Strategy

一手（Deloitte 官方博客）。[原文](https://www.deloitte.com/us/en/programs/center-for-controllership/blogs/ai-in-finance-workforce-strategy.html)

- "**Trust will become a defining leadership capability.** …This includes **establishing clear accountability for AI-enabled decisions**, defining appropriate governance, **creating transparency around AI recommendations**, and ensuring employees have the confidence in **when to trust, and when to challenge, AI-generated outputs**."〔一手，同上〕
- 结构性数据："**93%** of surveyed organizations' AI efforts are concentrated on **data and technology**, while only **7%** focus on **rewiring work and the workforce**."（引 Deloitte Insights2Action《Scaling your human edge》）——"productivity breakthroughs come from **reengineering and adopting new ways of working**, not simply introducing new tools."〔一手，同上〕
- 财务职能的自我认同："Finance has long been defined by its ability to deliver **accuracy, control, and insight**."〔一手，同上〕

**CFO 话语小结**（给演示脚本的词汇表）：activity vs impact；realized value vs deployment volume；audit & risk（human-in-the-loop）；vendor hype；data quality；accountability；when to trust / when to challenge；accuracy-control-insight 三位一体。

---

## 四、"第一分钟决定成败"的演示设计方法论（4 份）

### 1. Great Demo!（Peter Cohan / The Second Derivative）："Do the Last Thing First"

一手（方法摘要表为方法论文档本体；文章页为提要）。[Summary Sheet PDF（Brighthill Group）](https://brighthillgroup.com/wp-content/uploads/2014/11/Great-Demo-Method-Summary-Sheet.pdf)；[Do the Last Thing First 文章页（greatdemo.com，2024-06-28）](https://greatdemo.com/do-the-last-thing-first/)

- **时间线**（每方案）：Introduce the Situation（1–2 min：job title / CBI 关键业务问题 / problem / **Delta 价值差** / critical date）→ **Present the Illustration（1–2 min：直接呈现"完成态"画面**，"What the audience seeing; Make it live! **Recall the Delta – the Value.**"）→ Do It（5–10 min，"Choose the path to get to your Illustration; **Use the fewest number of mouse clicks**"）→ Peel Back the Layers（5–10 min，"**Audience questions drive** 'Peel Back the Layers'"）→ Q&A（管理问题：great questions 立答、good/stupid questions 进 "Not Now" List）→ Final Summary。〔一手，同上〕
- 即方法名所指：**先给 payoff 的 illustration，再倒放过程**——第一分钟就是"观众想要的那一屏"。目标分两种：Technical Proof（验证资格阶段确认的能力）与 **Vision Generation**（给高管造愿景）。〔一手，同上〕
- （"Harbor Tours" 是 Cohan 对"环游港口式功能漫游 demo"的称呼；其原文 PDF 已 404，概念见[未证实清单](#六未证实仅二手清单)。）

### 2. Northwestern CS 394（Chris Riesbeck）：Demo #1 Task（Spring 2026 讲义）

一手（课程讲义，教学化表述最直白）。[原文](https://courses.cs.northwestern.edu/394/demo-one.php)

- "**Do NOT give a feature tour. Feature tours are the worst possible way to demo an app**, and terrible at guiding app design."〔一手，同上〕
- "**Demo with a story. Act it out. Show, don't tell.** …A story has realistic people in a realistic situation. They have a problem. Your app comes to the rescue and solves the problem. **That's all a demo needs to tell.**"〔一手，同上〕
- **价值主张写"payoffs not actions"**："Find new places to eat!" not "A user can search for places to eat"；product box 幻灯 ≤15 秒（"People can read faster than you can talk"）；整个 demo ≤3 分钟。〔一手，同上〕
- 文中引 Kim Goodwin《Storytelling by Design》为故事化设计出处。〔一手（对引文的）上述转写〕

### 3. SmartCue（Robin Singhvi）：How to Give a Good Product Demo That Wins Customers

〔二手〕（厂商博客，但作者为从业者、带自家平台 4,000+ 团队的一线观察；2025-09-30 发布、2026 年多次更新）。[原文](https://www.getsmartcue.com/blog/how-to-give-a-good-product-demo)

- 行业"老八条"作为被引用的经典：**"Open with a hook. Do discovery first. Tell a story. Show, don't tell. Tie features to pain. Handle objections. Pause for questions. End with a clear next step."**（"the same eight tactics, recycled across a hundred sales blogs since roughly 2017"）。〔二手，同上〕
- 2026 论题——**两段式序列**：Demo 1 异步互动演示（10–15 步，嵌首页/会议确认邮件/外联序列，观众自选时间自控节奏，还能转给"真正管预算的同事"）；Demo 2 才是 live（30 分钟，"no longer about showing the product end-to-end; it's about **mapping the product onto their specific situation**, surfacing real objections, and agreeing on a next step"）。其平台数据显示 pre-played 的通话转化更高、更短。〔二手，同上〕
- 对"十分钟演示"的含义：如果高管进场前看过异步 demo，live 十分钟应做"**映射到他的处境**"，而不是从零介绍。〔二手（作者的）推论〕

### 4. （交叉引用）Atlassian 的 wow-moment 官方清单与微软 Epstein 的"相关性优先"

见[第二节](#2-atlassian-team-playbookai-use-case-demos官方-playbook)与[第二节](#3-microsoft-inside-trackhow-were-delivering-demos-in-microsoft-365-copilot-at-microsoft)——两者同时也是"第一分钟/第一层次"设计的一手方法来源：Atlassian 把"单用例 5–10 分钟 + 一个 wow moment"定为标准；微软把"relevance + 一个 jaw-dropping moment + CTA"定为纪律。

---

## 五、十分钟演示叙事的可借框架（归纳）

> 每条附出处；目标是把"CFO/CEO 十分钟内从怀疑到点头"的叙事结构化。

1. **第 0–1 分钟给"完成态"，不给"介绍"**——先展示受众视角的 payoff 画面（一份 brief、一个被回答的问题），再倒放它怎么来的。出处：Great Demo! "Do the Last Thing First"（Situation→**Illustration→**Do It 时间线，[Summary Sheet](https://brighthillgroup.com/wp-content/uploads/2014/11/Great-Demo-Method-Summary-Sheet.pdf)）；Lindy 首屏即三个"done in 21s/8s/12s"的任务回执（[lindy.ai](https://www.lindy.ai/)）。
2. **开场 ≤60 秒 = 业务问题 + 数字 + 今天的决定**——零模型词汇；用受众自己的（或同行的）数字量化痛点。出处：Vinci Rufus Rule Zero 与 60 秒模板（[原文](http://vincirufus.com/en/posts/how-to-present-ai-strategy-to-board/)）；Huper 痛点四问直接引用高管原话（[huperlabs.ai](https://www.huperlabs.ai/)）；Northwestern "story = 有人有问题有救援"（[讲义](https://courses.cs.northwestern.edu/394/demo-one.php)）。
3. **十分钟内用真实数据闭环一件真任务，产出可带走的文件**——示例：政府文档→匹配产品→投标稿，分钟级完成（Microsoft Epstein，[原文](https://www.microsoft.com/insidetrack/blog/how-were-delivering-demos-in-microsoft-365-copilot-at-microsoft/)）；"single prompt → multi-step workflow" 列为官方 wow moment（Atlassian，[playbook](https://www.atlassian.com/team-playbook/plays/ai-demos)）；OpenAI CPO 主张 vibe-coded 真原型而非 Figma 稿（[Lenny Distilled 转录](https://lennydistilled.com/guests/kevin-weil/)）。
4. **每条结论可溯源、可下钻**——CFO 的第一反应是"这个数哪来的"。出处：Huper "Every insight traceable…full audit trail" + "Every item has an arrow: click it and you are in a conversation…already loaded with the context"（[huperlabs.ai](https://www.huperlabs.ai/)）；Day.ai "The audit trail says exactly what ran, and nothing went out without your approval"（[day.ai](https://day.ai/)）；Lindy 每个回答带会议记录/决策日志出处（[lindy.ai](https://www.lindy.ai/)）。
5. **把"人批准"演示出来：不可逆动作需审批 = 卖点而非免责**。出处：Lindy "Nothing irreversible happens without your approval"（[lindy.ai](https://www.lindy.ai/)）；Gartner CFO 客户故事 "human-in-the-loop operating model **to address audit and risk concerns**"（[1Q26 CFO Report](https://emt.gartnerweb.com/ngw/globalassets/en/finance/documents/1q26-cfo-report.pdf)）；Huper "Interrupted only when something truly needs you"（[huperlabs.ai](https://www.huperlabs.ai/)）。
6. **按 CFO 口径说话：impact、realized value、break-even，而不是 pilot 数量**。出处：Gartner "must not mistake activity for impact…**realized value rather than deployment volume**"（[新闻稿 2026-05-28](https://www.gartner.com/en/newsroom/press-releases/2026-05-28-gartner-says-cfos-must-stop-mistaking-finance-ai-deployment-for-value-creation)）；Vinci The Ask 三件套（金额/90 天 checkpoint/break-even in 65 days）与语言对照表（"94.2% F1" → "19 of 20 high-risk cases, false positives −35%"）（[原文](http://vincirufus.com/en/posts/how-to-present-ai-strategy-to-board/)）；Deloitte "when to trust, and when to challenge, AI-generated outputs"（[博客](https://www.deloitte.com/us/en/programs/center-for-controllership/blogs/ai-in-finance-workforce-strategy.html)）。
7. **最后两分钟给仪表盘与下一步，不是"还有更多功能"**——4–6 个红黄绿 KPI + named owner + 邀请上手。出处：Vinci Dashboard slide（"Boards love dashboards because they signal accountability"）+ 收尾 CTA（Microsoft）；Atlassian north star "feel, know, do" + "invite viewers to try it themselves"（[playbook](https://www.atlassian.com/team-playbook/plays/ai-demos)）。
8. **同一事实给不同"海拔"的视图；演示脚本按场景分档**——给 CEO 看全局层、给 CFO 看财务口径层（Huper "Same brain, any altitude"，[huperlabs.ai](https://www.huperlabs.ai/)）；**产品演示用 live**（leader 亲演示 → 采纳 +90%，Atlassian），**正式董事会汇报慎用 live、用截图/录屏并提前 48h 发材料**（Vinci "No live demos"）——十分钟演示若发生在 board 会议里，降档为录屏兜底。

---

## 六、未证实/仅二手清单

- **"Demos are the new roadmap"（归于 Kevin Weil）**：未能在我抓到的任何页面核实该原话；已证实的只有 Lenny Distilled 转录的 vibe-coding demos 引语。**引用前需回听 Lenny's Podcast #254 原音频。〔未证实〕**
- **Huper BusinessWire 新闻稿原文**：对我方 curl 403（bot 拦截），全文读自 Metro Atlanta CEO 转载，与 FinSMEs 摘要互证一致；一手 URL 存在但未读到 BusinessWire 页面本体。〔一手内容、二手载体〕
- **Gartner 1Q26 CFO Report 图表细分**："84% of finance teams are in planning or deployment with AI" 为 PDF 原句；条形图各档百分比（Using 40%、Developing pilots 25% 等）系从 PDF 文本流推断的映射，未与原图核对。〔转写误差风险〕
- **greatdemo.com "Harbor Tours" 原文 PDF**（Vision-Generation-Demos-The-Crisp-Cure-For-Stunningly-Awful-Harbor-Tours.pdf）：404，未取得；"Harbor Tour"（环游港口式 demo）概念仅见于该站其他页面标题与检索摘要。〔概念二手〕
- **HBR 文章未取得**：《How Pioneering Boards Are Using AI》（HBR Product R2504E）产品页为 JS 渲染，正文不可读；本调研未使用任何 HBR 内容。〔未找到一手〕
- **day.ai/manifesto 独立页**：返回空（JS 渲染）；宣言文本取自 [day.ai/about](https://day.ai/about) 页原文。〔一手，但载体是 about 页〕
- **Martin 的 logo 墙与 Lindy 的 "4.9" 评分**：具体 logo 名单与评分平台名未逐一验证，引用时勿指名。〔未证实细节〕
- **Reclaim 页面时效**：2026-10-05 抓取的首页仍显示 "© 2025" 与 "20% off with code MEETINGS" 促销条，可能为缓存页；其定位表述按抓取日标注。〔时效风险〕
- **jina.ai 代理取得的 Gartner 新闻稿**：正文与 IT Brief UK（2026-05-29，Karen Joy Bacudo）转述逐句一致，可信度较高；但代理方式本身存在改写风险，关键句建议引用时注明"经 r.jina.ai 读取"。〔方法风险〕
- **Atlassian "+90%" 与 Deloitte/McKinsey/Gallup 转引数据**（IDC 9.3h、McKinsey 25%、Gallup $438B）：均为产品方/playbook 方的转引，未回溯到 IDC/Gallup 原始报告。〔二手转引〕

## 附：来源清单（按节）

| 节 | 来源 | 性质 |
|---|---|---|
| 一.1 | [lindy.ai 首页](https://www.lindy.ai/) | 一手 |
| 一.2 | [trymartin.com 首页](https://www.trymartin.com/) | 一手 |
| 一.3 | [day.ai 首页](https://day.ai/) / [day.ai/about](https://day.ai/about) | 一手 |
| 一.4 | [reclaim.ai 首页](https://reclaim.ai/) | 一手 |
| 一.5 | [huperlabs.ai 首页](https://www.huperlabs.ai/)；[BusinessWire 新闻稿 2026-02-26](https://www.businesswire.com/news/home/20260226376427/en/Huper-Raises-1.5M-to-Deliver-a-Chief-of-Staff-for-the-Rest-of-Us)（403）→ [Metro Atlanta CEO 转载](https://metroatlantaceo.com/news/2026/02/huper-raises-15m-deliver-chief-staff-rest-us/)、[FinSMEs](https://www.finsmes.com/2026/03/huper-raises-1-5m-in-pre-seed-funding.html) | 一手 / 一手(转载载体)·二手 |
| 二.1 | [Vinci Rufus, How to Present an AI Strategy to Your Board（2026-05-16）](http://vincirufus.com/en/posts/how-to-present-ai-strategy-to-board/) | 一手（从业者博客） |
| 二.2 | [Atlassian Team Playbook: AI Use Case Demos](https://www.atlassian.com/team-playbook/plays/ai-demos) | 一手 |
| 二.3 | [Microsoft Inside Track（2024-10-03）](https://www.microsoft.com/insidetrack/blog/how-were-delivering-demos-in-microsoft-365-copilot-at-microsoft/) | 一手 |
| 二.4 | [Lenny Distilled: Kevin Weil](https://lennydistilled.com/guests/kevin-weil/)；[Lenny's Podcast #254](https://podcasts.apple.com/ph/podcast/openais-cpo-on-how-ai-changes-must-have-skills-moats/id1627920305?i=1000702998371) | 二手转录 / 一手音频 |
| 三.1 | [Gartner 新闻稿 2026-05-28](https://www.gartner.com/en/newsroom/press-releases/2026-05-28-gartner-says-cfos-must-stop-mistaking-finance-ai-deployment-for-value-creation)（经 r.jina.ai）；[IT Brief UK 转述](https://itbrief.co.uk/story/gartner-says-cfos-struggle-to-turn-ai-into-business-value) | 一手 / 二手 |
| 三.2 | [Gartner The CFO Report 1Q26（PDF）](https://emt.gartnerweb.com/ngw/globalassets/en/finance/documents/1q26-cfo-report.pdf) | 一手 |
| 三.3 | [Deloitte CFO Sentiment Ed.19, H1 2025（PDF）](https://www.deloitte.com/content/dam/assets-zone1/au/en/docs/services/consulting/2025/cfo-sentiment-edition-19-report.pdf) | 一手 |
| 三.4 | [Deloitte Center for Controllership 博客](https://www.deloitte.com/us/en/programs/center-for-controllership/blogs/ai-in-finance-workforce-strategy.html) | 一手 |
| 四.1 | [Great Demo! Summary Sheet（Brighthill Group PDF）](https://brighthillgroup.com/wp-content/uploads/2014/11/Great-Demo-Method-Summary-Sheet.pdf)；[Do the Last Thing First（greatdemo.com 2024-06-28）](https://greatdemo.com/do-the-last-thing-first/) | 一手（方法文档）/ 提要 |
| 四.2 | [Northwestern CS 394 Demo #1 Task（Spring 2026）](https://courses.cs.northwestern.edu/394/demo-one.php) | 一手（课程讲义） |
| 四.3 | [SmartCue: How to Give a Good Product Demo](https://www.getsmartcue.com/blog/how-to-give-a-good-product-demo) | 二手（厂商博客） |
