# 261005 · 管理层为何对 coding agent 却步——我们的差异化论证基础

> 调研问题：Codex / Claude Code（以及 Cursor 一类）coding agent 对执行层（工程师）体验极好，
> 但管理层（CEO/CFO/高管）看着却步——把「却步点」做成逐条、可对照的清单，作为
> 「面向企业管理层的 AI 助手」定位推敲的证据半边。喂 [261005-open-value-deficit](../../_done/_closed_plans/261005-open-value-deficit.md)。

## 本轮判读边界

官网可证明公开叙事，不能证明所有功能/真实使用者，更不能证明“高管都却步”。本档三轴是解释假设；官方能力、个人实践、社区观察与二手调查分别保留等级，不能拼成统一需求发生率。已有竞品来源/审计/review 是反证。新增实际验证问题归 [自洽卡](../../_done/_closed_plans/261005-turnaround-coherence.md)，本轮未逐 URL 重验。

## 0 · 方法与查证说明

- **查证日期**：2026-10-05。
- **通道**：本会话 `web_fetch` 受 DNS 白名单限制（`openai.com` / `claude.com` / `r.jina.ai` / `web.archive.org`
  均解析被拒），按任务预案改用 **bash curl 直连 + Wayback Machine（web.archive.org）快照抓取**：
  - 直连可用的站点（`code.claude.com` 文档、`developers.openai.com` 文档、`raw.githubusercontent.com`、
    HN Algolia API、腾讯云社区、 chinaz）为直接抓取；
  - 被 Cloudflare challenge 挡的（openai.com / claude.com / gartner.com / bcg.com / venturebeat.com /
    fastcompany.com）经 Wayback 快照取回**原文内容**，快照抓取时间均为 2026-10-05；
  - Tobi Lütke 推文经 Wayback 的 X syndication API JSON 取得原文。
- **一手/二手标注**：「一手」= 官方页面、官方新闻稿、本人自述原文（含经 Wayback 存档的原文快照）；
  「二手」= 媒体/社区对原报告的转述（转述失败或未及取回原文的，进 §7 诚实清单）。

---

## 1 · Codex（OpenAI）

**证据**：[openai.com/codex](https://openai.com/codex/) 首页（一手，经 Wayback 快照 2026-10-05 抓取，
页面自含 2026 年产品动态）；[developers.openai.com/codex](https://developers.openai.com/codex/) 文档
（一手，curl 直连）。

### 1.1 形态

官方文档「Available on」清单：**ChatGPT 桌面端（Remote）、ChatGPT 网页版、Codex CLI、Codex IDE 扩展、Codex Cloud**（云端环境）。
首页的表述是「The same agent everywhere you code —— ChatGPT、编辑器与终端，同一账号打通」，并列四个入口卡：
Codex in ChatGPT / Codex cloud（Try on web）/ Codex IDE extension / Codex CLI。另有移动端云任务视图
（"keeps going when you close your laptop"）与 GitHub PR 自动评审。定价：Plus CA$25 / Pro CA$136 / Business CA$27 每席。

### 1.2 首屏（官网第一屏给谁看什么）

- 主标题 **"Build anything with Codex"**，副题 "Move faster, go further, and bring your biggest ideas to life."，紧接
  **"Trusted by top teams"** 客户 logo 与 **价目表**（三档订阅）。
- 第二屏起全是**工程工种语言**："hard-to-find bugs to complex refactors"、"changed-files review panel"、
  "multi-agent workflows"、"code review"——配图 alt 文本直接是「engineering task with progress details and a
  changed-files review panel」「CLI prompt to implement dark mode」。
- 首页价值证据全部是**工程师证言**：Wonderful 首席架构师、Harvey 移动端负责人、Sierra 软件工程师、
  Ramp 的 AI Dev X Team Lead、Duolingo 高级软件工程师、Cisco Meraki 技术负责人——**6/6 无一位是 CEO/CFO/总经理**。

### 1.3 对管理层（非技术）的叙事

**没有**。整页没有出现面向非技术决策者的入口、案例或语言；唯一接近「管理层」的元素是 Business 档位的一句
"Secure, shared workspace with **admin controls** and flexible pricing"——即把管理层角色化约为**付预算的 IT 采购者**，
而非使用者。文档站（developers.openai.com）同样纯开发者向（权限/沙箱/Codex Security 插件/SDK）。

### 1.4 却步点证据（从官方材料反推）

- 首屏价目表 + "top teams" logo 墙：对非技术者的第一印象是「这是给工程团队买的东西」。
- 核心动名词全是开发动作（bug / refactor / PR review），无一对应经营动作（预算 / 排期 / 风险 / 复盘）。
- 多智能体并行、云端环境、token 消耗等概念对管理层是**不透明黑箱**：页面给工程师看"能干成什么"，
  没给管理层看"花了多少、风险在哪、怎么验收"。

---

## 2 · Claude Code（Anthropic）

**证据**：[claude.com/product/claude-code](https://claude.com/product/claude-code)（一手，Wayback 快照）；
[code.claude.com/docs/en/overview](https://code.claude.com/docs/en/overview)（一手，curl 直连）；
[claude.com/product/claude-code/enterprise](https://claude.com/product/claude-code/enterprise)（一手，Wayback 快照）；
[claude.com/enterprise](https://claude.com/enterprise)（一手，Wayback 快照）；
[claude.com/solutions/financial-services](https://claude.com/solutions/financial-services)（一手，Wayback 快照）。

### 2.1 形态

**桌面应用（macOS 下载置顶）+ Terminal/CLI + Web（浏览器，含云端长任务/并行任务）+ iOS/Android + GitHub +
VS Code + JetBrains + Slack**；文档另列：云端托管会话、Projects（多会话群组监督）、Routines（定时任务）、
Remote Control、Chrome 扩展、computer use（preview）、code review & CI/CD、Claude Tag。
文档第一句定义：*"Claude Code is an agentic coding tool that reads your codebase, edits files, runs commands,
and integrates with your development tools."* 面向企业的部署选项：Anthropic SaaS / AWS Bedrock / Vertex AI /
Microsoft Foundry（VPC 隔离、自带密钥）。2026 年动态：Projects（9-17）、Auto mode 默认化（8-7）、
自托管环境公测（8-6）、Artifacts 预览（6-18）。

### 2.2 首屏

- 主文案：**"Hand Claude a bug fix, test, or multi-day migration. Steer and review from your terminal, IDE, Slack, or web."**
- 首屏演示直接是**代码会话**：复现 double-charge bug → 定位 `createCharge()` 幂等键 → 编辑 `charges.ts +9 -3` →
  `ThemeProvider.tsx` diff——**没有一行是给非技术者的**。
- 证言区块标题就叫 **"What developers are saying"**（Ramp Staff SWE、Intercom VP of AI、Notion 联合创始人
  ——讲的全是团队工程流程）。

### 2.3 Anthropic 自己怎么向企业高管推销（重点对照）

三层的卖法结构清晰可见——**但高管不是 coding agent 的目标用户，Anthropic 用别的产品接住高管**：

1. **[Claude Enterprise 总览页](https://claude.com/enterprise)**（一手）：给管理层的四支柱是
   "Built on the best models / **No model training by default** / Flexible by design / **Made to pass security review**"，
   随后一整排治理词：SSO/SAML、SOC 2·ISO 27001·GDPR·CCPA、usage analytics、SCIM、**spend controls**、
   数据保留、Compliance API、HIPAA-ready、**audit logs 与 OpenTelemetry 监控**、RBAC。
   员工产品四件套是 **Claude Code（工程师）/ Claude Cowork（"Delegate tasks… you focus on the work that needs your judgment"）/ Chat / Claude Security**——即：高管被许诺的是「全公司每人一个安全的 Claude」，而不是「你来用 coding agent」。
   效果数字：Spotify 复杂迁移耗时 -90%。
2. **[Claude Code for Enterprise](https://claude.com/product/claude-code/enterprise)**（一手）：开头即定位
   **"Approved by enterprise engineering leaders"**——是卖给**工程leader**的企业版：贡献指标仪表盘
   （PR/提交代码中 Claude 参与度）、服务端集中管控（工具权限/文件访问/MCP 配置）、OTEL 观测（会话/token/成本）、
   RBAC+SSO+SCIM、SOC 2 Type II、BYOK。配套内容《2026 Agentic Coding Trends Report》也明说是给
   "engineering leaders"。**全页没有一个 C-suite 证言**；数字全部是工程指标
   （乐天 time-to-market 24 天→5 天（-79%）、Zapier 89% 员工采用、Ramp 30 天 100 万行 AI 代码、2x 交付提速、99.9% 改动准确率）。
3. **[Financial Services 行业页](https://claude.com/solutions/financial-services)**（一手）——**这才是「对高管话术」的成熟范本**：
   - 25 条轮播证言里大量 **C-suite**：FIS CEO、BNY CIO、Carlyle 首席数字官、瑞穗 MD 兼银行业 COO、
     Travelers EVP 兼 CTO&COO、Mercer Advisors 总裁、洛克菲勒 COO、嘉信理财负责人、贝莱德美国财富业务负责人。
   - 卖点语言全是**信任与问责**："judgment and accountability stay with the advisor"、
     "**Every number can be traced back to its source**, on infrastructure your risk and compliance teams trust"、
     "every output is **source-attributed** so teams can verify work before they act"、SOC 2 **与 FedRAMP**。
   - 「Claude for financial advisors」：连接托管/组合/规划/CRM 全栈，ready-to-run 工作流
     **"with review steps and an audit trail built in"**，"a guided path to get every advisor on it"。
   - 产物全是**金融原生工件**：pitch book、comps 表、credit memo、IC memo、actuarial review——
     且话术是「Claude 组装分析与格式化，**你**掌握叙事与估值判断」。
   - 注意：Claude Code 在这页的位置只是「工程/遗留系统现代化」工具，"without sacrificing transparency or control"。

**小结**：Anthropic 给高管看的是 Claude（Chat/Cowork/Excel/PowerPoint）+ 治理与审计 + 同行 C-suite 背书；
Claude Code 本身对高管只以「被治理的工程资产」面目出现。

### 2.4 却步点证据

- 官方 FAQ 第一条安全问答 "Is Claude Code secure? Yes…" 与「runs locally, asks for permission」的反复强调，
  说明市场最高频疑虑就是安全/控制权。
- 企业版治理面（指标/审计/成本 OTEL）全部以 **IT/工程leader 为操作者**——高管看得见报告，摸不到产品。

---

## 3 · ChatGPT Enterprise / Business（OpenAI）

**证据**：[openai.com/chatgpt/enterprise/](https://openai.com/chatgpt/enterprise/)（一手，Wayback 快照）。
Business 页未能抓取（见 §7）。

### 3.1 叙事结构（逐段对照——「给管理层讲 AI」的最成熟范本）

1. **主标题**："Frontier AI **built for enterprise**" —— 副题 "help **every team** turn ambitious goals into
   **finished work**"：卖的是**完成态结果**，不是工具能力。
2. **规模背书**："Over 5 million business users across industries"。
3. **价值三段**：ChatGPT Work（"plan, take action across your apps and files, and create **finished materials**
   like spreadsheets, slides, docs, and web apps"）/ Codex（"Help **developers** move faster… with enterprise
   controls"——注意：**在高管页里，coding agent 只是 developer 的一个段落**）/ Connect to your business context。
4. **"Trusted by leaders and their teams"**：一位 Head of AI Products & Platforms 的证言 +
   **一排采纳/效率指标**（100% active users、10x faster insights、6x AI fluency、83% 周活跃、98% 员工偏好）——
   给 CFO 看的是**可汇报的数字**。
5. **"Enterprise-grade security built in"** 三段：不训练你的数据 / 管理员控制谁能用 agent 与工具 /
   合规与可审计（含 **Compliance API visibility for conversations and agent activity**）。
6. **按职能六段**：Engineering / Marketing / **Operations**（"Enter every weekly review with current risks,
   owners, and next steps"）/ **Finance**（"Run **monthly close BvA** and **re-forecasting**… assesses the quality
   of the beat… models **risk-weighted scenarios**, builds a **live dashboard**"）/ Data Analytics / Sales。
   ——**这是纯 CFO/COO 语言**：BvA（预算 vs 实际）、重预测、风险加权情景、仪表盘。
7. **"Partner with us on your AI strategy"**：deployment guidance、AI advisors、24/7 支持与 SLA——
   把「采纳失败风险」转嫁给服务商。

### 3.2 结论

OpenAI 给 CEO/CFO 的页面里**根本没有「让你用 coding agent」这一项**：Codex 被压缩成给 developer 的一个子段；
高管吃到的是结果物（finished work）、采纳率、治理、职能场景、陪跑服务。**「给管理层讲 AI」的话术语法已被
ChatGPT Enterprise 专利级地占住，而 coding agent 的官网完全没有这一层**——这正是我们要填的空位。

---

## 4 · 非技术高管对 coding agent 的公开声音

1. **Jim VandeHei（Axios 联合创始人/CEO，非技术出身）**，"Confessions of an AI lab rat"，
   [Axios 2026-06-08](https://www.axios.com/2026/06/08/ai-ceo-usage-corporate-benefits-limitations)
   （一手自述，全文经 Wayback 抓取）。全公司（含每个部门）铺开测试 Codex 与 Claude Code 一年后的自述：
   - 价值与门槛并存："AI is smarter than 95% of the people I know on 95% of topics. **But only if you know how
     to use it.**"
   - **不能甩手**："You can't wing it or outsource it, **even at the CEO level**… You have to feed it copious
     information and tell it what works and what sucks."
   - **CEO 必须下场**："You can't delegate this. Your team copies what you do, not what you mandate."
   - **最后一公里糟糕（管不住）**："The last mile sucks… **security, connecting to other systems and deciding
     what data it can access**… it's simply not ready for scaled deployment. This problem is getting WORSE."
   - **Agent 间协作混乱**："Agent-to-agent work is a mess… Until then, **efficiency gains are overhyped**."
   - 总姿态："**don't believe the demos, don't dismiss the trajectory.**"
2. **Tobi Lütke（Shopify CEO）**，[X 帖 2026-08-25](https://twitter.com/tobi/status/2092259436538495186)
   （一手，Wayback syndication JSON 存原文）："I'm thinking about **banning Claude Code at Shopify** until they
   change their mind and read **AGENTS.md and .agents/skills**… Insisting on only reading CLAUDE.md sometimes
   leads to **split brain problems** when different team members use different tools."——
   连最亲 AI 的 CEO 也在对 agent 的**行为规范不受组织控制**（跨工具口径分裂）发出禁用威胁。
3. **Philip Meyers（前 AIM 上市 SaaS 公司 CEO，22 年商业/运营背景，自称非工程师）**，
   "I Shipped 1.5 Million Lines of Production Code in Six Months. I'm Not an Engineer."，
   [MentorCruise 博客 2026-06-01](https://mentorcruise.com/blog/i-shipped-15-million-lines-of-production-code-in-six-months-im-not-an-engineer-50799/)
   （一手自述；注意作者在该平台卖高管陪跑，存在动机偏差）。**在什么条件下愿意用**：
   - "I **never ship anything I can't explain to a customer**… That single fact forces my continual understanding."
   - "I **make the AI show its working**… I ask why this approach over that one."
   - "I build the same way I'd run a team: small, reviewable pieces, clear ownership. Then test it before it goes
     ANYWHERE near a customer. This isn't software practice. **It's just good management applied to a codebase.**"
   - "The tool isn't the issue, **the absence of discipline is the issue**."
4. **「Heading OS – Run a company (as the CEO) from Claude Code, with data kept private」**，
   [Show HN（news.ycombinator.com/item?id=48747269）](https://news.ycombinator.com/item?id=48747269)（2026）——
   一位 CEO 把公司运营搬进 Claude Code（数据不出私域）的自建工具；README 已 404，细节未验（§7），
   但标题本身即「高管愿意用的形态」的一手样本：**把 coding agent 改造成公司操作系统**。
5. **（反向气候样本）** HN 用户 dingnuts 对某「CEO 用长跑 agent」项目的嘲讽——"what on God's green Earth
   could the CEO of a no name b2b saas have a use for long running agents? … **cosplaying coding**"
   （[news.ycombinator.com/item?id=45549410](https://news.ycombinator.com/item?id=45549410)）。
   说明高管下场写代码在工程师社区默认被当 cosplay——高管进入该场域有真实社交成本。

---

## 5 · 权威调研：高管层 AI 采纳的阻力（2024-10 → 2026-02）

按「阻力数字」排列（均标注一手/二手与链接）：

1. **MIT Media Lab / Project NAND《The GenAI Divide: State of AI in Business 2025》**（2025-08，经
   [Fortune 2025-08-18 报道](https://fortune.com/2025/08/18/mit-report-95-percent-generative-ai-pilots-at-companies-failing-cfo/)转述，二手）：
   **约 95% 的企业 GenAI 试点未产生可计量的 P&L 影响**，仅约 5% 实现快速收入加速；样本 = 150 位 leader 访谈 +
   350 名员工问卷 + 300 个公开部署。归因是**组织与工具的 "learning gap"**（企业集成缺陷），而非模型质量；
   高管倾向归咎监管与模型，"executives often blame regulation or model performance"；自建工具表现反而不如采购工具。
2. **BCG《AI Adoption in 2024: 74% of Companies Struggle to Achieve and Scale Value》**（新闻稿 2024-10-24，
   [bcg.com/press](https://www.bcg.com/press/24october2024-ai-adoption-in-2024-74-of-companies-struggle-to-achieve-and-scale-value)，一手，Wayback 抓取）：
   对 **1,000 位 CxO/高管**（59 国）调查：**74% 的公司挣扎于实现与规模化 AI 价值；仅 26% 具备超越 PoC、
   产生有形价值的能力组合**。开篇即 "CEOs are now seeking tangible returns"。
3. **BCG《AI Leaders Outpace Laggards…》（The Widening AI Value Gap）**（新闻稿 2025-09-30，
   [bcg.com/press](https://www.bcg.com/press/30september2025-ai-leaders-outpace-laggards-revenue-growth-cost-savings)，一手，Wayback 抓取）：
   全球分层 **5% "future-built" / 35% "scalers" / 60% "laggards"**——60% 的组织收入与成本收益微小、
   缺乏规模化能力；leader 与 laggard 的差距在拉开（leader 营收增速 1.7x、三年 TSR 3.6x、EBIT 利润率 1.6x；
   2025 年 agents 占 AI 总价值的 17%，2028 年预计 29%）。
4. **Gartner：2027 年底前超过 40% 的 agentic AI 项目将被取消**（新闻稿 2025-06-25 原文被 Cloudflare 挡、
   Wayback 无可用快照；数字经 [Gartner CN 新闻稿标题](https://www.gartner.com/cn/newsroom/press-releases/2025-ai-project-failure)
   与[腾讯云开发者社区详解](https://cloud.tencent.cn/developer/article/2639392)交叉印证，二手）：
   取消三因 = **成本失控、业务价值不清、风险管控不足**；另提出 **"agent washing"**（把 RPA/chatbot/规则引擎
   包装成 agent）——加剧高管对供应商叙事的不信任。Gartner 在 2026-03 Orlando D&A Summit 上重申并把
   「语义层/可追溯性」定位为 AI 信任基础设施。
5. **Alteryx × Coleman Parkes 高管调研**（2026-02，n=1,400 位企业高管，5 行业 3 区域；经上述腾讯云文章转述，二手）：
   **89% 的企业加大了 AI 投入，但只有 28% 信任 AI 的决策支持能力、23% 把试点推到生产**；
   **49% 的高管把「高质量、可访问、治理良好的数据」列为 AI 发挥全部潜力的首要条件**。
6. **McKinsey《The state of AI in 2025: Agents, innovation, and transformation》**（2025-11-05 发布，
   [mckinsey.com/.../the-state-of-ai](https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai)，一手，Wayback 抓取；
   调研窗 2025-06-25→07-29，n=1,993、105 国）：
   - 88% 组织在至少一个职能常规使用 AI（上年 78%），但**近 2/3 仍未开始企业级规模化**。
   - Agent 热度 vs 现实：62% 至少在实验，23% 在某处规模化，**任一职能内规模化者 ≤10%**。
   - **只有 39% 报告 AI 带来企业级 EBIT 影响，且其中多数 <5% EBIT**；「AI 高绩效者」仅约 **6%**。
   - **51% 的组织已遭遇至少一次 AI 负面后果，近 1/3 源于 inaccuracy**；explainability 是第二常被「经历」的风险
     却不在最常被缓解之列。
   - 高绩效者的分水岭之一是**高管层 ownership**（比他人 3x 更强认同 senior leaders 亲自投入）与
     工作流重设计；32% 预期未来一年总员工数下降 ≥3%（13% 预期上升）。
7. **Deloitte《State of Generative AI in the Enterprise》**（2025 Q1 波次；原文页未抓取，数字经
   [chinaz 转述](https://www.chinaz.com/ainews/14915.shtml)（转 VentureBeat）二手）：
   **74% 受访企业称其最先进 initiative 已达标或超出 ROI 预期**——但实现时点普遍**晚于预期**，
   采纳节奏被「先验证用例与 ROI 潜力」卡住；52% 正探索 agentic AI、45% 研究多 agent 系统；
   数据治理与平台现代化是普遍欠账。

---

## 6 · 管理层却步点归纳（三轴）

### 6.1 看不懂（语言、首屏、心智模型）

- **首屏即工程师主场**：Codex 首屏 = "Build anything" + 价目表 + "Trusted by top teams" logo 墙，第二屏起全是
  bug/refactor/PR 审查语言，6 条证言 6 个工程角色（§1.2，一手）；Claude Code 首屏 = "Hand Claude a bug fix,
  test, or multi-day migration" + TS 代码 diff 演示，证言区就叫 "What developers are saying"（§2.2，一手）。
- **文档第一句预设开发者心智**："reads your codebase, edits files, runs commands"（§2.1，一手）——
  「codebase/terminal/CLI」对管理层是外语。
- **形态负担假设**：公开叙事的核心形态是终端/IDE（Claude Code 虽有 web/移动端，叙事重心仍是"你在哪写代码"）；
  Codex 的移动端只做云端任务查看（§1.1）。
- **上手即成本**：VandeHei——"only if you know how to use it"、"You can't wing it… even at the CEO level"；
  CEO 必须每日亲自投喂上下文（§4.1，一手）。
- **社交成本**：工程师社区把高管写代码默认嘲讽为 "cosplaying coding"（§4.5）——高管缺少「非 coding 的正当入口」。

### 6.2 管不住（权限、安全、审计、行为不受控）

- **官方自家 FAQ 与治理墙即证据**：Claude Code FAQ 第一条就是安全问答；企业版治理面（contribution metrics、
  OTEL 成本/会话观测、SSO/SCIM/RBAC、SOC 2、BYOK/VPC）是给 IT 的管理面板而非给 CEO 的问责视图
  （§2.2/2.3，一手）。
- **数据接入与权限是「最后一公里」**：VandeHei——"The last mile sucks… security, connecting to other systems
  and deciding what data it can access… not ready for scaled deployment… getting WORSE"；agent 协作需要
  "nail down permissions so this doesn't backfire"（§4.1，一手）。
- **连最亲 AI 的 CEO 都想禁用**：Lütke 威胁禁用 Claude Code 直到它服从组织的 AGENTS.md/技能约定——
  agent 行为不受组织规范约束、跨工具口径分裂（split brain）（§4.2，一手）。
- **项目级失控被权威量化**：Gartner——>40% agentic 项目 2027 年底前被取消，三因即「成本失控、价值不清、
  风控不足」（§5.4，二手）；McKinsey——51% 组织已遭遇 AI 负面后果、约 1/3 是 inaccuracy，且
  explainability「常经历、少缓解」（§5.6，一手）。
- **信任缺口在数据治理**：Alteryx——89% 加投 vs 28% 信任、23% 试点进生产，49% 高管把数据治理列为第一条件
  （§5.5，二手）。
- **供应商叙事不可信**：Gartner "agent washing"——高管无法分辨真 agent 与 PPT 工程（§5.4，二手）。

### 6.3 说不清价值（ROI 证据链、问责、汇报语言）

- **coding agent 页面给的价值证据全是工程效率**（迭代提速 30–50%、PR 抓 bug、迁移 24 天→5 天），
  没有货币化语言（§1.2/2.3，一手）——CFO 无法把它接进 BvA/重预测叙事。
- **企业级价值证据本身薄弱**：McKinsey——39% 有 EBIT 影响、多数 <5% EBIT、高绩效者仅 6%（§5.6，一手）；
  BCG——74% 挣扎于价值实现、仅 26% 能力达标、60% 是 laggards（§5.2/5.3，一手）；MIT——95% 试点无 P&L 影响
  （§5.1，二手）。
- **采纳门槛被 ROI 验证卡住**：Deloitte——ROI 达标但普遍晚于预期，「先验证用例再规模化」（§5.7，二手）。
- **高管的自我修正**：VandeHei——"efficiency gains are overhyped"，真正的机会是「以前不可能的新业务线」，
  且必须"don't believe the demos"（§4.1，一手）——**这位 CEO 的经验支持避免夸大效率、要求可验证结果；不能泛化所有高管只要新收入而不关心成本。**
- **对照范本**：ChatGPT Enterprise 证明了管理层叙事的成熟语法——结果物（finished work）+ 采纳率指标 +
  治理三段 + 按职能场景（Finance 段直接用 monthly close BvA/re-forecast/risk-weighted scenarios 的 CFO 语言）+
  陪跑服务（§3.1，一手）；Anthropic 金融页证明高管话术的关键词是 **traceable / source-attributed /
  audit trail / review steps / judgment stays with you**（§2.3，一手）。**所查 coding-agent 首页强调工程工作，不能从首页未强调推出产品没有来源/审计或管理层使用能力。**

**定位假设（有限检索范围）**：所查 coding-agent 官网页面偏工程场景，不能证明管理者被排除或真实用户为何却步。面向一把手的经营判断入口可能是细分差异，但不是“头部同时留空/我们独占”：本档已记录 Enterprise、Anthropic 金融页与 Cowork 的来源、review、audit、非 coding 委派能力。需要同经营任务的真实试用对照，而不是竞品官网 vs 本产品成品。

---

## 7 · 未证实 / 仅二手（诚实清单）

| # | 事项 | 状态 | 处理 |
|---|---|---|---|
| 1 | **ChatGPT Business 官页**（openai.com/chatgpt/business） | 直连 Cloudflare 403；Wayback 无快照（CDX 0 行），两次尝试均得空壳 | **未核实**。正文对 Business 的描述仅来自 Codex 首页 Business 档位文案（"Secure, shared workspace with admin controls… CA$27/user"）与导航结构，已注明 |
| 2 | **Gartner 2025-06-25 新闻稿原文** | gartner.com 中英文站均 Cloudflare challenge；Wayback 该 URL 无 200 快照（CDX 全 301/404） | 40% 数字经 Gartner CN 标题 + 腾讯云文章 + 多家中外媒体交叉印证，**标二手** |
| 3 | **MIT《The GenAI Divide》报告 PDF 原文** | PDF 未抓取/未解析（仅媒体转述） | 95%/5% 数字标二手（Fortune 转述，多源一致）；一手 PDF 公知位置为 MIT Media Lab / Project NAND（mlq.ai 托管），未直接验证 |
| 4 | **Deloitte State of GenAI 原文** | deloitte.com / venturebeat.com 均被挡 | 74%/52%/45% 标二手（chinaz 转述 VentureBeat）；报告名与波次（Q1 2025）按转述方标注 |
| 5 | **Alteryx × Coleman Parkes 原报告** | 仅见腾讯云文章转述 | 89%/28%/23%/49% 标二手 |
| 6 | **Fast Company CEO 自述**（"I'm a CEO overwhelmed by AI projects"） | 直连 + Wayback 均 JS 墙，正文未取得 | 仅存候选线索，未引用正文；链接：fastcompany.com/91587261 |
| 7 | **Heading OS（Show HN）** | HN 帖存在；GitHub README 已 404，内容未验证 | 只引用标题作为形态样本，未引用其自述细节 |
| 8 | **McKinsey 2025 报告规范 URL** | 报告标题为 "The state of AI in 2025: Agents, innovation, and transformation"，但该 slug 全部 404；实际挂在复用 slug `/the-state-of-ai` 下 | 以抓到的页面自述标题与日期（2025-11-05）为准，属一手快照 |
| 9 | **Cursor 及其余 coding agent** | 任务未要求逐项调研 | 未取数；§6 三轴归纳未依赖它 |
| 10 | **X/Twitter 原推网页** | 以 Wayback syndication JSON 取得推文原文（tobi/2092259436538495186），原推页面本身未渲染 | 引文为 JSON 原文，属一手存档 |

> 存档说明：全部 Wayback 快照取回于 2026-10-05；页面内文日期以页面自述为准（如 Claude Code 页产品动态
> 最新 2026-09-17、Axios 文 2026-06-08、Lütke 推文 2026-08-25、McKinsey 报告 2025-11-05）。
