# 一把手的一手声音：CEO/GM 怎么用 AI、雇总助买什么、要什么、嫌弃什么

- **查证日期**：2026-10-05
- **用途**：「一把手的总助」定位推敲（定位句：你拍板，它盯到闭环）的证据面。服务对象 = 企业一把手（CEO/创始人/董事总经理）**及业务单位一把手**（事业部总经理 / BU head / P&L 负责人——后者由父代理 2026-10-05 补充指定纳入）。
- **一手/二手标注**：
  - **一手** = 本人发文、本人晒出的内部备忘录全文（公司官方页或本人 X/LinkedIn）、本人受访逐字记录、公司官方 JD。
  - **二手** = 媒体转述（即使逐字引用了本人的话，只要原文载体没被直接核验，就标二手）。
- **获取方法**：web_search 检索 → `curl` 直连抓原文（本会话 web_fetch 工具对部分域名报 "non-public IP" DNS 限制，故全程以 curl 为主）；反爬/限流兜底用 **Web Archive**（availability/CDX API + 快照）与 **r.jina.ai**（中途触发 429 限流后弃用）。每张卡注明获取方式。
- **诚实底线**：引号内为抓到的原文逐字；回译、转述、版本差异一律显式标注。取不到的列进文末「未证实/仅二手」清单，不硬凑。

---

## 一、公开的 CEO AI 使用方法论

### 卡 1｜Tobi Lütke（Shopify CEO）——AI 使用备忘录（2025）
**性质：一手**（内部邮件全文由 Shopify 官方招聘指南页完整公开；Tobi 本人 2025-04-07 在 X 自晒泄漏版）。
**出处**：
- 备忘录全文（官方页，"Reproduced here in full, this is an email that Tobi sent to all Shopifolk in March 2025"）：https://www.shopify.com/my/careers/candidate-guide/ai-usage （curl 直连取证）
- 自晒推文：https://x.com/tobi/status/1909231499448401946 （2025-04-07；未直接抓取 X，经 Shopify 官方博客与 Simon Willison 转录旁证）
- Shopify 官方博客引用备忘录原句："In April 2025, Tobi sent us a memo: 'reflexive AI usage is now a baseline expectation at Shopify.'" https://www.shopify.com/news/unserious-exploration
- Willison 逐字转录（对照自晒版措辞）：https://simonwillison.net/2025/Apr/7/tobias/
- ⚠️ 版本差异如实记：官方页说邮件发于 2025-03，官方博客说 2025-04（泄漏）；自晒推文确认为 2025-04-07。

**原话逐字**：
> "Reflexive AI usage is now a baseline expectation at Shopify. Maybe you are already there and find this memo puzzling. In that case you already use AI as a thought partner, deep researcher, critic, tutor, or pair programmer. I use it all the time, but even I feel I'm only scratching the surface."

> "Using AI effectively is now a fundamental expectation of everyone at Shopify. It's a tool of all trades today, and will only grow in importance. I don't think it's feasible to opt out of learning the skill of applying AI in your craft; you are welcome to try, but I want to be honest I cannot see this working out today, and definitely not tomorrow. Stagnation is almost certain, and stagnation is slow-motion failure. If you're not climbing, you're sliding."

> "We will add AI usage questions to our performance and peer review questionnaire. Learning to use AI well is an unobvious skill. My sense is that a lot of people give up after writing a prompt and not getting the ideal thing back immediately. Learning to prompt and load context is important, and getting peers to provide feedback on how this is going will be valuable."

> "Before asking for more Headcount and resources, teams must demonstrate why they cannot get what they want done using AI. What would this area look like if autonomous AI agents were already part of the team?"

> "Last summer I used agents to create my talk, and presented about that. … Everyone means everyone. This applies to all of us—including me and the executive team."

**对我们的含义**：一把手把 AI 当"思想伙伴/深度研究员/批评者/导师"，且认为"用得好"是一门要刻意练的技能——"写一个 prompt 拿不到理想结果就放弃"正是他点名的普遍失败模式；总助产品要扛住这种浅尝辄止。

### 卡 2｜Jim VandeHei（Axios CEO/联合创始人）——全司实测一年复盘 + 个人写作工作流（2026）
**性质：一手**（本人署名文章与 Axios 官方通讯；axios.com 反爬 403，经 Web Archive 快照取得全文）。
**出处**：
- 「Confessions of an AI lab rat」（Axios AM 广播版，2026-06-09/10；Wayback 快照 2026-06-10 取证）：https://www.axios.com/newsletters/axios-am-6d44c1b6-e593-4cfd-bb3b-33f1451a81b5.html （存档：https://web.archive.org/web/20260610012856/https://www.axios.com/newsletters/axios-am-6d44c1b6-e593-4cfd-bb3b-33f1451a81b5.html?chunk=1 ）
- 「Jim VandeHei: Writing with AI」（Axios，2026-06-18）：https://www.axios.com/2026/06/18/jim-vandehei-ai-writing-tips-claude-chatgpt （全文经 Yahoo 联合镜像取得：https://tech.yahoo.com/ai/chatgpt/articles/jim-vandehei-writing-ai-012505420.html ）
- Fortune 访谈（2026-09-20，与 Mike Allen/Roy Schwartz 谈新书 *Simplify: Do 50% More with 50% Less*）：https://fortune.com/2026/09/20/axios-founders-vandehei-allen-schwartz-simplify-book-interview/ （curl 直连取证）

**原话逐字（一年实测复盘）**：
> "I've spent the past year using AI obsessively — inputting copious amounts of personal and business data, turning myself into a lab rat for Axios and our readers."

> "AI is way better, more accurate and mind-expanding than most think. (Sorry, it's true.) But it's colliding with hard human realities, making it confusing, clunky and chaotic for lots of people in its current form."

> "Over the past year, Axios aggressively tested AI (mainly OpenAI's Codex and Anthropic's Claude Code) across every layer of every department. … Most of my leadership team operates with chief-of-staff agents, and we're knee-deep in agent-to-agent prep."

> "I personally use ChatGPT or Claude for one to two hours daily, usually in the early mornings, and control an AI personal operating system via my phone. That's connected to an always-on computer that runs several agents, including one that scans daily for CEO-relevant data and trends."

> "AI is smarter than 95% of the people on 95% of topics, 95% of the time. … Its ability to think creatively and research deeply is extraordinary — if and only if you know how to use it."

> "It takes real work. You can't wing it. You need to work at it daily, so AI learns you — and you learn AI. … You have to feed it copious amounts of information and persistently tell it what works and what sucks. This feedback loop creates a new form of super-knowledge about you — and super-skills for you. Most people get unimpressive results and move on, assuming it's overhyped. Don't."

> "Business gains are overhyped, too — for now. As good as it is, AI hits internal walls when it comes to human use, security, connections to other systems and decisions about what data it can access inside companies. In most cases, it's simply not ready for deployment at scale. This problem is getting worse because agent-to-agent work is a mess."

> "But you must train it to challenge and expand your thinking — not replace it."

**原话逐字（个人写作工作流）**：
> "Lazy AI outsourcing means lazy thinking and writing. Used with persistence and skill, AI can enhance both your thoughts and expression."

> "I use both projects (mainly in Claude, but increasingly in ChatGPT) and agents (in ChatGPT's Codex). … I detail a fact-checking skill to double-check data points, then move outside the agent for another fact-check with a safety-net skill."

> "My laboratory is my Axios C-Suite newsletter, which I publish Saturdays for CEOs and other executives. I have a project inside of Claude that knows everything I've written for this audience, plus my thinking about business and leadership, and the high standards I have for ideas and data. I have a similar agent that operates autonomously, powered by Codex, that constantly scans high-quality publications, data projects and research for relevant information. It writes up ideas in my style and delivers them via email before I wake up. The items are good, smart starters or enhancers — but they're never camera-ready, at least by my standards."

> "I've been using Claude in voice mode to have long conversations about things I want to write. I have Claude keep detailed notes, pull out my best phrases and ideas, challenge my assumptions, help organize my thinking. Then we go back and forth by voice before producing a draft column."

**对我们的含义**：这是与「一把手的总助」定位最接近的一手样本——Axios 高管团队人手 **chief-of-staff agents**；一把手本人每天 1-2 小时、随身"AI 个人操作系统"、夜间 agent 扫描 CEO 相关数据趋势、早上Email送达"我的风格"的素材（但"从不免检可用"）；产品要同时做到：懂我（长期记忆）、敢顶嘴（challenge my assumptions）、免检可信（safety-net fact-check）、知道边界（能知道什么/共享什么/替我做什么）。

### 卡 3｜Satya Nadella（Microsoft CEO）——五个 GPT-5 Copilot 日常提示词（2025-08）
**性质：一手原推 + 二手转述**（本人发在 X，本轮未直接核验原帖；经 Hindustan Times 转述取证）。
**出处**：https://www.hindustantimes.com/technology/microsoft-ceo-shares-gpt-5-prompts-that-bosses-will-love-but-workers-may-hate-101756343249789.html （2025-08-28，curl 直连取证）

**原话逐字（HT 转引其 X 帖）**：
> "It's been a few weeks since we brought GPT-5 to Microsoft 365 Copilot, and it's quickly become part of my everyday workflow. … It's adding a new layer of intelligence spanning all my apps."

**他列出的五个日常提示词（HT 转述）**：① 扫描与某人过往全部互动，预测"下次见面对方最可能在想什么"；② 汇总邮件/聊天/会议纪要生成项目进展，并对照 KPI 目标总结风险、竞品动态、"他应该准备好回答的尖锐问题"；③ 追问某产品发布是否 on track，基于工程进度出状态报告（问责用）。

**对我们的含义**：CEO 级用法的三件套 = **会前准备（预判对方心思 + 尖锐问题清单）**、**决定/项目跟进（on track 吗）**、**信息综合**——与总助 JD 高度重合；员工侧感知则是"老板全知，借口无处遁形"。

### 卡 4｜Andy Jassy（Amazon CEO）——全员工备忘录（2025-06）
**性质：一手**（官方全文公开）。
**出处**：https://www.aboutamazon.com/news/company-news/amazon-ceo-andy-jassy-on-generative-ai （curl 直连取证）

**原话逐字**：
> "There will be billions of these agents, across every company and in every imaginable field."

> "Agents will allow us to start almost everything from a more advanced starting point. We'll be able to focus less on rote work and more on thinking strategically about how to improve customer experiences and invent new ones."

> "As we roll out more Generative AI and agents, it should change the way our work is done. We will need fewer people doing some of the jobs that are being done today, and more people doing other types of jobs. … we expect that this will reduce our total corporate workforce as we get efficiency gains from using AI extensively across the company."

> "As we go through this transformation together, be curious about AI, educate yourself, attend workshops and take trainings, use and experiment with AI whenever you can, participate in your team's brainstorms to figure out how to invent for our customers more quickly and expansively, and how to get more done with scrappier teams."

**对我们的含义**：一把手对 AI 的期待锚在"把人力从 rote work 拔高到 strategy"——总助的价值主张要落在"替我消化例行事，把我留给判断"。

### 卡 5｜Luis von Ahn（Duolingo CEO）——AI-first 全员信（2025-04）
**性质：一手**（全员大会备忘录，本人共享至 LinkedIn；经 Simon Willison 逐字转录取证）。
**出处**：https://simonwillison.net/2025/Apr/28/luis-von-ahn/ （原始载体为本人 LinkedIn 帖，本轮未直接核验；转录为 Willison 逐字引用）

**原话逐字**：
> "AI isn't just a productivity boost. It helps us get closer to our mission. … One of the best decisions we made recently was replacing a slow, manual content creation process with one powered by AI. Without AI, it would take us decades to scale our content to more learners. We owe it to our learners to get them this content ASAP."

> "We'll gradually stop using contractors to do work that AI can handle / AI use will be part of what we look for in hiring / AI use will be part of what we evaluate in performance reviews"

**对我们的含义**：AI-first 的一把手会把"能不能被 AI 做"写进用人与考核——总助若只做问答而非"顶到闭环"，同样会被这一标准审视。

### 卡 6｜Jensen Huang（NVIDIA CEO）——"用 AI 当导师，折磨它到教会我"（2024-11）
**性质：一手访谈 + 二手报道**（香港科技大学协调的访谈；本轮取到 Business Insider España 报道，英文原句为中文/西语回译，标注诚实）。
**出处**：https://www.businessinsider.es/tecnologia/metodo-ceo-nvidia-torturar-ia-ensene-cosas-nuevas-1425801 （2024-11-27，curl 直连取证；西语原文引句逐字）

**原话逐字（西语报道转引）**："Yo uso mi inteligencia artificial … Y torturo a mi IA para que me enseñe."（回译：*"I use my AI … and I torture my AI to teach me."*）
**方法（报道转述）**：问一个问题后连追五个问题——为什么这么答；把推理逐步拆解；换种方式再讲一遍；把同一推理迁移到另一件事；……他鼓励大家 "utilizar una IA como profesor"（把 AI 当教授）。

**对我们的含义**：一把手要的不是答案机，而是**可追问、可被拆穿、能把推理迁移**的对话对象——"追问五连"是天然的总助交互范式。

### 卡 7｜Judson Althoff（Microsoft 销售体系负责人 MCAPS）——业务单位一把手的 AI 化备忘录（2025-07）【BU 层】
**性质：内部备忘录 + 二手转述**（BI 称 "internal memo viewed by Business Insider"）。
**出处**：https://www.businessinsider.com/internal-microsoft-memo-lays-out-new-strategy-for-selling-ai-2025-7 （2025-07-02，curl 直连取证）

**原话逐字（BI 引备忘录/本人）**：
> Althoff's memo called for "continued agility" and "reinventing Microsoft and MCAPS" to become "the Frontier AI Firm"

> "We have spent a lot of time playing defense over the last year, and it is now time to compete more aggressively," Althoff said

**备忘录五优先级（BI 逐字列出）**："Establish a Copilot on every device and across every role / Strengthen our M365 and D365 execution and penetration across all segments / Create meaningful AI design wins / Grow our cloud platform business by migrating and modernizing workloads to Azure / Build a cybersecurity foundation to enable secure AI Transformation"

**对我们的含义**：BU/P&L 一把手的 AI 备忘录同样存在，且更贴执行面（每设备每角色覆盖、design wins）；他们就是"总助"角色在业务端的天然用户——其 AI 议程需要一个替他盯执行闭环的角色。

### 卡 8｜Fidji Simo（Instacart CEO → OpenAI Applications CEO）——入职备忘录（2025-07）【BU→公司层】
**性质：内部备忘录 + 二手转述**（WIRED 称 "according to a copy of the memo viewed by WIRED"）。
**出处**：https://www.wired.com/story/openai-fidji-simo-note-employees/ （2025-07-21，Web Archive 快照取证）

**原话逐字（WIRED 转引备忘录）**：
> "My business coach Katia has been transformative to my career, and I've joked with her over the years that everyone needs a 'Katia in their pocket,'" Simo wrote. "Personalized coaching has obviously been a privilege reserved for a few, but now with ChatGPT, it can be available to many."

> "AI can compress thousands of hours of learning into personalized insights delivered in plain language, at the pace that suits us, responsive to our specific level of understanding. … It doesn't just answer questions—it teaches us to ask better ones."

**对我们的含义**：最高管亲口说出产品隐喻——**"口袋里的大公司教练"（Katia in their pocket）**；一把手想要的是曾只属于一把手的"专属教练/参谋"，被 AI 平民化。"教我问更好的问题"是加分项而非"替我回答"。

---

## 二、总助 / Chief of Staff 的职业方法论

> 职业文献佐证"这个角色给一把手到底干什么"。注意 CoS 常服务的正是 BU 级一把手（见卡 11 Roche GM）与 VandeHei 团队的 "chief-of-staff agents"（卡 2）。

### 卡 9｜GitLab 官方 CoS JD（公司层，长期公开）
**性质：一手（公司官方 JD）**。
**出处**：https://handbook.gitlab.com/job-description-library/chief-executive-officer/chief-of-staff/ （curl 直连取证）

**职责逐字（节选）**：
> "Ensure upcoming E-Group Weekly meetings are relevant, well structured, and that the preparation is complete and correct."

> "Ensure action points coming out of meetings (i.e. executive, OKR, key, or incident meetings) are implemented."

> "Serve as a proxy for the CEO by attending meetings in place of the CEO and making decisions on the CEO's behalf."

> "Act as a sounding board to the CEO for new ideas and initiatives."

> "Prepare ahead of formal and informal Board meetings. Ensure CEO has up to date information from every function in advance of questions from the board."

> "Participate in every E-Group meeting. The person will **not** be an executive or part of the E-Group"（即：进每一场会、但不是决策者）

### 卡 10｜Coast（fintech）CoS JD——"Office of the CEO"（公司层，2026 在招）
**性质：一手（公司官方 JD）**。
**出处**：https://jobs.insightpartners.com/companies/coast/jobs/87527460-chief-of-staff-office-of-the-ceo （curl 直连取证）

**职责逐字（节选）**：
> "The Chief of Staff is the CEO's most trusted operating partner. You will extend his reach across the company: representing him in rooms he cannot be in, carrying his priorities into the executive team, and making sure the decisions that matter get made, communicated, and executed. This is not a coordination or scheduling role."

> "Act as a proxy for the CEO … exercising judgment about what to resolve directly and what to bring back to him."

> "Serve as a trusted sounding board and thought partner, giving the CEO candid, well-reasoned counsel, including when your view differs from his."

> "Own the leadership team's operating cadence … ensuring each produces decisions and follow-through rather than discussion."

> "Track decisions and commitments across the executive team and project-manage them through to resolution so nothing falls through the cracks."

> "Drive meeting preparation so the CEO walks in with the right context, agendas, and materials"

### 卡 11｜Roche Algeria「CoS to the General Manager」JD——服务 BU 一把手的总助（2026-08 在招）【BU 层】
**性质：一手（公司官方 JD，招聘聚合页转载）**。注意：该页正文丢失标点，下引为原页连排文字。
**出处**：https://www.drjobpro.com/algeria/jobs/chief-of-staff-to-the-general-manager-roche-algeria-algiers-roche-MSZH4TKU0DS9529 （Posted 19 August 2026；curl 直连取证）

**职责逐字（节选）**：
> "The ideal candidate acts as a force multiplier for the General Manager bridging vision with execution"

> "Design manage and optimize the executive governance framework … ensuring clear accountability decision tracking and execution momentum"

> "Decision Support & Briefings: Synthesize complex data financial metrics healthcare market updates and regulatory developments to prepare high-level briefs decision frameworks and strategic scenarios for the GM"

> "Time & Focus Optimization: Audit and optimize executive capacity ensuring GM and ET time investments align strictly with high-impact strategic priorities"

### 卡 12｜职业文献：Tyler Parris《Chief of Staff》
**性质：文献（书籍元数据）**。本轮未取得书中逐字定义（Kobo/Perlego 页为 JS 渲染）——诚实标注，仅作书目锚点。
**出处**：Kobo https://www.kobo.com/ww/en/ebook/chief-of-staff-5 ；Perlego 条目名：*Chief of Staff: The Strategic Partner Who Will Revolutionize Your Organization*（2014，第 2 版扩写）。

### 提炼：「一把手雇总助是买什么」（由卡 2/9/10/11 归纳）
1. **延伸手臂/代理**：替我出席我到不了的房间、代表我推动（Coast "representing him in rooms he cannot be in"；GitLab "Serve as a proxy…making decisions on the CEO's behalf"）——但**代理范围内要自己判断什么直接办、什么带回来**（Coast "exercising judgment about what to resolve directly and what to bring back to him"）。
2. **决定跟踪到闭环**：跨高管团队跟踪决定与承诺、盯到落地（Coast "Track decisions and commitments … through to resolution"；GitLab "Ensure action points … are implemented"；Roche "decision tracking and execution momentum"）。
3. **会前准备与简报**：让一把手带着正确的上下文/议程/材料进会（Coast "Drive meeting preparation…"；GitLab "the preparation is complete and correct"；Roche "high-level briefs decision frameworks and strategic scenarios"）。
4. **信息过滤与前瞻**：把复杂数据/市场/监管信息合成简报与情景（Roche；VandeHei 团队的扫描 agent 是其 agent 版）。
5. **经营节奏的所有权**：例会/规划/复盘的 cadence，保证产出的是"决定与跟进"而不是"讨论"（Coast）。
6. **唱反调的思想伙伴**：与我意见不同也要给坦率、有理有据的建议（Coast "candid, well-reasoned counsel, including when your view differs from his"；GitLab "sounding board"）。
7. **注意力守门**：审计并优化一把手的时间投向（Roche "Time & Focus Optimization"）。
8. **绝不代理的**：最终拍板与一把手本人的判断责任（GitLab：CoS "will not be an executive or part of the E-Group"——在场但不拍板；Coast：代理也要"带回给他"；Bezos 2016 信："If you're the boss, you should do this too"——拍板方式（disagree and commit）是一把手亲体力行的动作；Tobi："Everyone means everyone… including me and the executive team"——用 AI 这件事一把手本人不可豁免）。

---

## 三、高管决策支持的真实诉求

### 卡 13｜Warren Buffett（Berkshire Hathaway CEO）——"我需要一个会说我蠢的伙伴"（2010）
**性质：一手（本人受访逐字记录）**。
**出处**：CNBC "Ask Warren" 访谈逐字稿，2010-03-01：https://www.cnbc.com/2010/03/01/is-charlie-munger-too-pessimistic-ask-warren-transcript-part-8.html （curl 直连取证）

**原话逐字**：
> 问：What do you do when you and Charlie disagree fundamentally on a point? How do you make that decision?
> BUFFETT: "Well, what Charlie always says to me is he's--when we disagree--he says, 'Well, Warren,' he says, 'you'll see it my way because you're smart and I'm right.' That's his technique. But pretty much in--if we really disagree on something, we're not going to do it. But if I like something, he just grumbles and mumbles and, you know, says, 'That's kind of a dumb idea,' where I go ahead and do it."

> "Charlie's more pessimistic than I am."

**对我们的含义**：一把手对"异议"的真实用法很朴素——需要一个**持续唱反调的在场者**；真分歧就按下不表，小分歧记录在案照样推进。总助产品的"红队"人格价值就在这里。

### 卡 14｜Jeff Bezos（Amazon）——70% 信息拍板 + disagree and commit（2016 股东信）
**性质：一手（本人署名公开信）**。
**出处**：https://www.aboutamazon.com/news/company-news/2016-letter-to-shareholders （curl 直连取证）

**原话逐字**：
> "Most decisions should probably be made with somewhere around 70% of the information you wish you had. If you wait for 90%, in most cases, you're probably being slow. Plus, either way, you need to be good at quickly recognizing and correcting bad decisions. If you're good at course correcting, being wrong may be less costly than you think, whereas being slow is going to be expensive for sure."

> "Third, use the phrase 'disagree and commit.' This phrase will save a lot of time. … This isn't one way. If you're the boss, you should do this too. I disagree and commit all the time."

**对我们的含义**：高不确定性决策的常态是"信息不满就拍板 + 快速纠错"——总助的正确 KPI 不是"给足信息"，而是**让 70% 信息时刻更快到来 + 把纠错盯到闭环**。

### 卡 15｜Jeff Bezos——六页备忘录与"无声学习室"（2012 讲述）
**性质：一手（本人对 Fortune 自述；BI 转载）**。
**出处**：Business Insider 转载 Fortune 访谈：https://www.businessinsider.com/jeff-bezos-amazon-fortune-interview-2012-11 （curl 直连取证）

**原话逐字**：
> "They're just not accustomed to sitting silently in a room and doing study hall with a bunch of executives."

> "Full sentences are harder to write. They have verbs. The paragraphs have topic sentences. There is no way to write a six-page, narratively structured memo and not have clear thinking."

**对我们的含义**：会前准备的 Amazon 极端形态——**先共同默读 30 分钟再讨论**；总助产出的"简报"要经得起这种用法：完整句子、叙事结构、逼出清晰思考，而非要点轰炸。

### 卡 16｜Alfred P. Sloan（通用汽车总裁，经典）——"等下一次会议，先发展分歧"
**性质：二手转述（Sloan 原话经 Economist/WikiQuote 流传，常被溯源至 Drucker《Adventures of a Bystander》，本轮未核原书）**。
**出处**：WikiQuote 条目（标注原始出处为 The Economist, "Alfred Sloan, Guru," 2009-01-30）：https://en.wikiquote.org/wiki/Alfred_P._Sloan （curl 直连取证）

**原话逐字**：
> "Gentlemen, I take it we are all in complete agreement on the decision here. Then, I propose we postpone further discussion of this matter until the next meeting to give ourselves time to develop disagreement, and perhaps gain some understanding of what the decision is all about."

**对我们的含义**：一把手最怕的信号是"全票通过"——总助的会前职责应包括**主动制造并结构化分歧**，而不是帮老板快速收获一致。

### 卡 17｜Ben Horowitz（Opsware/Loudcloud 创始人、a16z 联合创始人）——一把手的孤独与"别独扛"
**性质：一手（本人署名博客，现行 a16z 版）**。
**出处**：https://a16z.com/the-struggle/ （原始博文约 2012；bhorowitz.com 旧链已跳转。curl 直连取证）

**原话逐字**：
> "The Struggle is when you are surrounded by people and you are all alone."

> "Don't put it all on your shoulders … You won't be able to share every burden, but share every burden that you can. Get the maximum number of brains on the problems even if the problems represent existential threats."

**对我们的含义**：一把手渴望的"支持"有一半是情绪与承载——**可托付、可分担、24 小时在场**；总助要能接住"不能对团队说的话"。

### 卡 18｜VandeHei 的"chief-of-staff agents"与"必须教它顶嘴"（2026）——诉求的 AI 版
**性质：一手**（出处同卡 2）。
**原话逐字**：
> "Most of my leadership team operates with chief-of-staff agents, and we're knee-deep in agent-to-agent prep."

> "I fed AI every medical record I have — MRIs, blood work, heart rate — and told it to be clinical and brutally honest."

> "But you must train it to challenge and expand your thinking — not replace it."

**对我们的含义**：一把手对 AI 总助的三条硬诉求 = **扫每日 CEO 相关数据趋势**、**"clinically & brutally honest"的坦率**、**可训练成挑战者而非应声虫**。

---

## 四、AI 助手在高管处的失败模式（公开记录）

### 卡 19｜"部署不了、协作一团糟"——VandeHei 自述一年实验的硬限制（2026）【一手】
> "AI hits internal walls when it comes to human use, security, connections to other systems and decisions about what data it can access inside companies. In most cases, it's simply not ready for deployment at scale. This problem is getting worse because agent-to-agent work is a mess. … My exec team has chief-of-staff agents, but we hit constant walls in determining what they can know, share and act on once the agents collaborate."

出处：卡 2（Axios AM 存档）。**含义**：CoS-agent 的三难（能知道什么/能共享什么/能替我做什么）是被一手证实的产品核心难题。

### 卡 20｜"免检不可用"——VandeHei 对产出的默认态度（2026）【一手】
> "The items are good, smart starters or enhancers — but they're never camera-ready, at least by my standards."；"I detail a fact-checking skill to double-check data points, then move outside the agent for another fact-check with a safety-net skill."

出处：卡 2（Writing with AI）。**含义**：不解决"可信到免检"，一把手永远要花时间复核——这正是要花时间"管 AI"的微观机制。

### 卡 21｜95% 试点失败与"学习缺口"——MIT NANDA《The GenAI Divide: State of AI in Business 2025》（2025-08）【报告 + 媒体转述】
> "The 95% failure rate for enterprise AI solutions represents the clearest manifestation of the GenAI Divide," the report states.（Fortune 转引报告原文）
> "Generic tools like ChatGPT excel for individuals because of their flexibility, but they stall in enterprise use since they don't learn from or adapt to workflows"（报告主笔 Aditya Challapally 对 Fortune 语）

出处：Fortune, 2025-08-18：https://fortune.com/2025/08/18/mit-report-95-percent-generative-ai-pilots-at-companies-failing-cfo/ （Web Archive 快照取证）。**含义**：企业级失败主因不是模型差，而是**工具不学工作流、不进组织**——"懂我这个一把手"恰是差异化所在。

### 卡 22｜幻觉进了高管信息流——Apple Intelligence 新闻摘要被暂停（2025-01）【一手（苹果声明）+ 二手报道】
> "Apple has suspended a new artificial intelligence (AI) feature that drew criticism and complaints for making repeated mistakes in its summaries of news headlines."；苹果发言人："We are working on improvements and will make them available in a future software update."
> 事实：BBC 投诉后曝光其 AI 摘要曾错误生成 "Luigi Mangione shoots himself"（被告开枪自杀）等假标题。

出处：BBC, 2025-01-17：https://www.bbc.co.uk/news/articles/cq5ggew08eyo （r.jina.ai 取证）。**含义**：给"最忙的人"做摘要，错一条就砸信任——总助的摘要功能必须带可核验出处。

### 卡 23｜保密红线——Samsung 全员禁用 ChatGPT（2023-05）【二手报道】
> "Samsung warned its staff that source code had been leaked to ChatGPT, and banned employees from using generative AI tools on its devices and networks"

出处：The Hindu, 2023-05-02：https://www.thehindu.com/sci-tech/technology/samsung-workers-banned-using-chatgpt-after-engineers-leak-source-code-chatbot/article66802957.ece （curl 直连取证）。**含义**：保密顾虑会一夜归零 AI 使用——总助的私有部署/数据边界是一把手敢用的前提。

### 卡 24｜"Clippy 2.0"——Benioff 连续两年公开嫌 Copilot 不好用（2024-2026）【一手（本人 X）】
> Benioff 原帖（2026-02-03）："Tired of Microsoft Copilot as Clippy 2.0? Meet the all-new Slackbot for Salesforce—built on @Anthropic's Claude: Your new #1 AI CRM sidekick & every sales leader's BFF!"
> 背景（CX Today 整理）：两年间他反复称 Copilot "inaccurate"、"a 'disappointment'"、最出名的是 "Clippy 2.0"；2025-10 称其 "just doesn't work" 且 "spilling data everywhere"；2025-08 对分析师称 "so many customers" 失望。

出处：CX Today, 2026-02-04：https://www.cxtoday.com/ai-automation-in-cx/benioff-copilot-slackbot-customer-context/ （r.jina.ai 取证；原推 https://twitter.com/Benioff/status/2018539238237798595 ）。**含义**：竞争对手嘴里的话有立场，但"不准 + 漏数据 + 平庸"三连正是高管弃用的高频理由；注意 Benioff 有产品利益相关。

### 卡 25｜"成本优先组织 AI = 更低质量"——Klarna 公开回摆（2025-05）【一手（CEO 对 Bloomberg 语，经 Fortune 逐字转引）】
> "[I]t's so critical that you are clear to your customer that there will be always a human if you want," he said.
> "As cost unfortunately seems to have been a too predominant evaluation factor when organizing this, what you end up having is lower quality," he told Bloomberg. "Really investing in the quality of the human support is the way of the future for us."

出处：Fortune, 2025-05-09：https://fortune.com/2025/05/09/klarna-ai-humans-return-on-investment/ （curl 直连取证；CEO 原话载体为 Bloomberg 访谈，本轮未直接核验 Bloomberg 原文）。**含义**：把"省成本"当一把手指标去组织 AI，质量反噬会逼公开回摆——总助的价值叙事要立"质量与判断"，不是"省了一个助理"。

### 卡 26｜编造引用进了正式文书——Mata v. Avianca（2023-06）【一手（法院处分，经 Reuters 报道）】
> "A U.S. judge on Thursday imposed sanctions on two New York lawyers who submitted a legal brief that included six fictitious case citations generated by an artificial intelligence chatbot, ChatGPT. … The judge found the lawyers acted in bad faith and made 'acts of conscious avoidance and false and misleading statements to the court.'"

出处：Reuters, 2023-06-22：https://www.reuters.com/legal/new-york-lawyers-sanctioned-using-fake-chatgpt-cases-legal-brief-2023-06-22/ （Web Archive 2023-06-23 快照取证）。**含义**：高风险判断场合（法务/合规/对外承诺）里 AI 的"自信错误"有真实代价——总助在这些场合要默认降级为"给线索+要求人工核验"。

### 卡 27｜"浅尝辄弃"的微失败——Tobi 点名的用法问题（2025）【一手】
> "Learning to use AI well is an unobvious skill. My sense is that a lot of people give up after writing a prompt and not getting the ideal thing back immediately."

出处：卡 1。**含义**：第一次给不出好结果就流失——总助的"第一次会面"必须交付超预期价值。

---

## 五、一把手诉求归纳（12 条，带出处）

1. **要一个敢唱反调的伙伴**："giving the CEO candid, well-reasoned counsel, including when your view differs from his"（Coast JD，卡 10）；Buffett-Munger 的相处模式（卡 13）；Sloan"先发展分歧"（卡 16，二手转述）。
2. **要会前被准备好**："Drive meeting preparation so the CEO walks in with the right context, agendas, and materials"（Coast JD）；Nadella 的见面预判 prompt 与"应准备的尖锐问题"（卡 3）；Bezos 六页 memo 静读（卡 15）。
3. **要决定盯到闭环**："Track decisions and commitments … through to resolution so nothing falls through the cracks"（Coast JD）；"Ensure action points coming out of meetings … are implemented"（GitLab JD，卡 9）；"decision tracking and execution momentum"（Roche GM CoS JD，卡 11）。
4. **要信息过滤与每日趋势扫描**：VandeHei 的 agent "scans daily for CEO-relevant data and trends"、早晨把"我的风格"的材料送到醒来（卡 2）；Roche "Synthesize complex data … to prepare high-level briefs decision frameworks and strategic scenarios for the GM"（卡 11）。
5. **要随身的教练/思想伙伴**：Fidji Simo "everyone needs a 'Katia in their pocket'"（卡 8）；Tobi 的用法清单 "thought partner, deep researcher, critic, tutor, or pair programmer"（卡 1）；Jensen "用 AI 当教授"（卡 6）。
6. **要在到不了的房间里被代表**：Coast "representing him in rooms he cannot be in"；GitLab proxy 条款（卡 9/10）——但代理同时要"判断什么直接办、什么带回来"。
7. **要被"残忍地诚实"对待**：VandeHei "told it to be clinical and brutally honest"（卡 2/18）；Tobi 把 "critic" 列进 AI 用法清单（卡 1）。
8. **要它懂我、越用越准**：VandeHei "This feedback loop creates a new form of super-knowledge about you"（卡 2）；MIT 报告指企业工具的病根恰是 "they don't learn from or adapt to workflows"（卡 21）。
9. **要 70% 信息就敢拍板的加速与纠错闭环**：Bezos 2016 信（卡 14）——支持系统的 KPI 是"让拍板时刻更早到来 + 把纠错盯住"，不是"追求 90% 信息"。
10. **要守住注意力与边界**：Roche "Time & Focus Optimization"（卡 11）；VandeHei 点名的三难边界 "what they can know, share and act on"（卡 19）；Samsung 保密禁令（卡 23）。
11. **要"免检可信"而非样样复核**：VandeHei "never camera-ready, at least by my standards" + 双层 fact-check（卡 20）；Apple 摘要事故（卡 22）与 Avianca 判例（卡 26）从反面定价。
12. **用 AI 是一把手本人的义务，不可外包**：Tobi "Everyone means everyone … including me and the executive team"（卡 1）；Bezos "If you're the boss, you should do this too"（卡 14）——总助放大一把手，不替代其拍板。

---

## 六、未证实 / 仅二手（诚实清单）

1. **Jensen Huang 英文原句为回译**：一手访谈（HKUST）的英文逐字稿未取得；现有英文表述（"I torture my AI"）由 Business Insider España 西语报道回译，非其英文原词。
2. **Satya Nadella 的 X 原帖未直接核验**：五个 prompt 的内容经 Hindustan Times 转述；原帖（2025-08 前后）未能打开。
3. **Fidji Simo 备忘录原文未取得**：引语全部经 WIRED 转引（WIRED 称见过 memo 副本）；Instacart 时期的 AI 备忘录本轮未取证。
4. **Althoff MCAPS 备忘录原文未取得**：经 Business Insider 转述（BI 称 viewed by）。
5. **Tyler Parris《Chief of Staff》书中逐字定义未取得**：仅书目与副题元数据（Kobo/Perlego 页 JS 渲染，抓不到正文）。
6. **The CEO Magazine《The Rise of The CEO's Chief of Staff》被 Cloudflare 拦截**：未取得正文，未引用。
7. **CEO 孤独感学术/评论文献未取得正文**：INSEAD《The Cure for the Loneliness of Command》、HEC Paris 所载 HBR 文《CEOs Often Feel Lonely…》本轮反爬未过，未引用任何逐字内容；卡 17 改用可全文取证的 Ben Horowitz。
8. **Sloan 引语属二手转述**：Sloan 原话的最近可核载体为 The Economist（2009）与 WikiQuote；常被溯源至 Drucker《Adventures of a Bystander》，本轮未核 Drucker 原书页码。
9. **Axios 官方页均经 Wayback/镜像取得**：axios.com 反爬（403），"Confessions of an AI lab rat" 取自 Axios AM 广播版（Wayback 2026-06-10 快照）；其 Axio S C-Suite 会员原发版与「AI+You」专题 hub 页未直接打开。
10. **Benioff 2025-08/2025-10 的引语仅经 CX Today 转述**：未核分析师会与当时的原始场域；其 2026-02-03 X 帖文本经 CX Today 逐字引用，X 原帖未直接抓取。
11. **Klarna CEO 引语的原发载体（Bloomberg 访谈）未直接核验**：逐字句经 Fortune 转引。
12. **Samsung 禁令的公司原始声明未取得**：事实以 The Hindu 报道为准（2023-05-02）。
13. **BU/GM 级一手声音公开存量少（如实交底）**：找到的最近似样本是 Althoff（Microsoft 销售体系 MCAPS 负责人备忘录，二手转述）与 Roche 国别 GM 的 CoS JD（一手）；"事业部 GM 亲笔长文讲自己怎么用 AI 做经营决策"的一手文本**未找到**——该层级公开发声以播客/闭门会为主，公开文本稀薄，此为本次调研的真实盲区而非遗漏。
14. **VandeHei 领导层"chief-of-staff agents"的具体供应商/构建方式未披露**：仅知 "mainly OpenAI's Codex and Anthropic's Claude Code" 为全司测试主平台。

---

### 附：本页每张卡的取证方式速查
- curl 直连成功：aboutamazon（×2）、shopify.com（×2）、fortune.com（×3）、cnbc.com、businessinsider.com（×2）、businessinsider.es、thehindu.com、hindustantimes.com、handbook.gitlab.com、jobs.insightpartners.com、drjobpro.com、en.wikiquote.org、a16z.com、simonwillison.net
- Web Archive 兜底：axios.com（AM 通讯）、wired.com、reuters.com
- r.jina.ai 兜底：bbc.co.uk、cxtoday.com（后触发 429 限流，其余改走以上两路）
- 抓取失败（诚实弃用）：theceomagazine.com（Cloudflare）、guardian.com（404）、npr.org（404）、americanbar.org（404）、news18.com（反爬）、telegraphindia.com（反爬）、windowsforum.com（403）
