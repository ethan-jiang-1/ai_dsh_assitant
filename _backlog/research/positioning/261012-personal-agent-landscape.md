---
topic: 定位
intent: "盘点近两个月 personal agent 生态（Meta Muse / OpenAI dots / Instinct 等），为本助手的定位与能力取舍提供参照。"
---

# 261012 · Personal Agent 生态盘点（2026-09 ～ 2026-10-12）

> 调研日期 2026-10-12。方法：`web_search` 定位线索，`web_fetch` 读原文；事实主张内联链接出处，
> 一手来源优先（官方 newsroom / 产品官网 / 创始人帖），二手报道补日期、定价与反响并注明。
> 来源互相矛盾或未能抓到正文的，如实标注（见文末「未能证实清单」）。
> **2026-10-12 晚间补采**：VPN 就绪后经 curl 直连复核，Meta newsroom、MarketBeat/Yahoo、AI Agent Index、
> blog.google、财新（经 i 黑马）等原文已读得，文末清单相应收敛；dots 官方页经 curl 与 jina reader 双通道
> 复核仍被 Cloudflare 挑战页挡下——确认为站点反爬而非网络问题。

## 速览

| 产品 | 发布方 | 关键时间 | 一句话定位 |
|---|---|---|---|
| **Muse** | Meta | 2026-09-08 官宣；09-23 前后 Connect 再推；10 月初登顶后现增长放缓 | "The World's First Personal AI Agent Built for Everyone"——替用户发邮件、订旅行、购物的 always-on 个人 agent，跑在每用户专属安全 VM 里 |
| **dots** | OpenAI | 2026-09-29 DevDay 发布 | "always-on AI agents built to handle everything"——自带云端电脑、GPT-6 Astra 驱动、插件可接 4000+ 应用的个人 agent |
| **Instinct** | Instinct（Noah Shinn） | 2026-02 私测；2026-09 转 invite-only beta；2026-09-28 $10B Series C | "没有新界面"的个人助理——短信/电话即界面，无 app、暂无订阅费 |
| CC（扩展到家庭） | Google Labs | 2026-09-17 官宣家庭/团体版 | 实验性 AI 秘书：专属账号最多 6 名成员共用，管全家日程与杂务 |
| Cowork 并入 Claude | Anthropic | 2026-09-16 | Cowork 与聊天合并为一个 Claude，"合上笔记本也继续干活" |
| 新 Siri / 下一代 Apple Intelligence | Apple | 2026-09-09 发布、09-14 可用 | iPhone 18 搭载的新 Siri AI 逐步铺开（地区限制明显） |

---

## 一、Meta Muse

### 时间线

- **2026-09-03**：Meta 发布 Muse Spark 1.3 模型（Muse 的底座），媒体称"终于追平 Anthropic 与 OpenAI 的前沿模型"（此为媒体评价，非官方口径）——[GIGAZINE: Meta announces 'Muse Spark 1.3'](https://gigazine.net/news/20260903-meta-muse-spark-1-3/)（二手）。
- **2026-09-08**：Meta 官宣 Muse，官方标题即定位话术——["Introducing Muse: The World's First Personal AI Agent Built for Everyone" | About Meta](https://about.fb.com/news/2026/09/introducing-muse-personal-ai-agent/)（一手，正文抓取被截断，标题与页为实测可见）；官方账号 @Muse 同日发帖 "Introducing Muse, your personal AI agent from Meta that gets things done across every part of life"（[@Muse on X, 2026-09-08](https://x.com/Muse/status/2097399178376671666)，经 [GIGAZINE 2026-09-09](https://gigazine.net/gsc_news/en/20260909-meta-muse-agent) 转引）。
- **2026-09-20/21**：Muse 登顶美国 App Store 免费榜、取代 ChatGPT；[Fortune 2026-09-22](https://fortune.com/2026/09/22/metas-muse-ai-is-exploding-in-popularity-and-drawing-heated-backlash/)（二手）报道 Amazon 封锁 Muse 访问其电商站："continued access by an unauthorized AI agent violates Amazon's Conditions of Use"，并称 Meta 未事先请求许可；Meta 宣布与 Shopify 合作部分购物功能（同上 Fortune）。
- **2026-09-23 前后**：Meta Connect 2026，Muse 与新一代 AI 眼镜、VR 同台成为主角（[Andina: Meta Connect 2026](https://andina.pe/agencia/noticia-meta-connect-2026-muse-nuevos-lentes-ia-y-realidad-virtual-marcan-sus-anuncios-1093325.aspx)（二手）；[华尔街见闻/天天基金 2026-10-12](https://fund.eastmoney.com/a/202610123892660670.html) 提到"9 月 24 日 Connect 发布会次日的下载峰值"，即 Connect 主题演讲在 09-23；[Fortune 2026-09-22](https://fortune.com/2026/09/22/metas-muse-ai-is-exploding-in-popularity-and-drawing-heated-backlash/) 预告 Connect 于"周三"举行——三处互相印证）。
- **2026-09 下旬**：安装量数据——上线首 12 天全球安装 280 万次（Apptopia 估算，[TechCrunch 2026-09-21](https://techcrunch.com/2026/09/21/metas-muse-is-outpacing-chatgpts-early-mobile-launch/) 标题与 [Fortune 2026-09-30](https://fortune.com/2026/09/30/noah-shinn-instinct-ai-assistant-meta-muse-alexandr-wang-tech-series-c-ai-agent-mark-zuckerberg/) 转引，二手）；iOS 端首 12 天 143 万次下载、超 ChatGPT 同期 137 万（JPMorgan 数据，[华尔街见闻 2026-10-12](https://fund.eastmoney.com/a/202610123892660670.html) 转述，二手）。
- **2026-10-01~07**：Needham 10-01 估 Muse Connectors 若分走 20% App Store 销售额、苹果每年最多损失 100 亿美元服务收入，Muse Connectors 开放 168 小时内收到 1500+ 开发者申请；Meta 10-06 被报道扩展 Muse 对小企业的集成（[Yonhap Infomax 2026-10-06](https://en.infomaxai.com/news/articleView.html?idxno=141195)，二手）；[CNBC 2026-10-07](https://www.cnbc.com/2026/10/07/meta-muse-personal-ai-agents-dazzle.html) 标题："Meta's Muse assistant tops app charts. Now it needs to become a habit"。
- **2026-10-12（今日）**：增长裂缝数据——日均净新增用户从 9 月峰值约 19.8 万降至约 7.4 万（-62.4%），下载量较峰值回落 21%（TickerTrends 数据、Hunterbrook 分析，[华尔街见闻/天天基金 2026-10-12](https://fund.eastmoney.com/a/202610123892660670.html) 转述，二手）。

### 能力形态

- **自主工作 + always-on**：不止答问题，而是操作一个专属浏览器实际执行任务（发邮件、订机票酒店、下单购物）；**关掉 app 后继续工作**（[GIGAZINE 2026-09-09](https://gigazine.net/gsc_news/en/20260909-meta-muse-agent) 对官方发布的转述）。2026-10-12 补（一手收紧）：newsroom 原话更直白——"It can open a browser, fill out forms, and **negotiate on their behalf**"，官方示例含 "selling a car for more, lowering a bill"（[About Meta newsroom](https://about.fb.com/news/2026/09/introducing-muse-personal-ai-agent/)，一手全文）。
- **记忆/个性化**：跨会话记住用户说过的话并用于后续建议；官方示例"根据 Instagram 收藏的菜谱建购物清单、记住朋友的饮食禁忌来备晚宴"（[GIGAZINE 2026-10-05](https://gigazine.net/gsc_news/en/20261005-meta-muse-create-profile) 转述）。**person pages**：安全研究员 Karan Joshi 用普通聊天让 Muse 自拷贝内部文件、提取出系统提示词交给 WIRED——内部指令要求"为用户生活中出现的每个人建页"（家人/伴侣/朋友/同事/关注的人），**每小时更新**，分 Facts / History / The Relationship / In Common / Open Threads / Strengthening 等小节，"Strengthening"甚至建议如何深化关系（给谁打电话、记哪些日子）（[GIGAZINE 2026-10-05](https://gigazine.net/gsc_news/en/20261005-meta-muse-create-profile) 转述 WIRED，二手）。
- **安全设计**：每位用户一个专属 **Muse Secure VM**（云上虚拟机，与其他用户隔离）；另有 **Sentinel** 权限管理 agent，在 Muse 访问外网或外部服务时按需向用户请求许可；Muse 无法直接接触用户密码与支付方式；支付走 Stripe Link + 一次性卡号，ShopPay 与 1Password 支持在计划中（[GIGAZINE 2026-09-09](https://gigazine.net/gsc_news/en/20260909-meta-muse-agent) 转述官方）。Meta 对 Fortune 称登录凭据保密、网购用一次性卡号（[Fortune 2026-09-22](https://fortune.com/2026/09/22/metas-muse-ai-is-exploding-in-popularity-and-drawing-heated-backlash/)）。2026-10-12 补（一手 + 独立核验）：newsroom 原文证实 "Nothing Muse does reaches the internet unless the Sentinel approves it"、凭据进 secure storage 且 Muse 不可见、"complete audit trail of everything it has done **and plans to do**"、可指令 "forget"、Link 为首个覆盖 AI agent 购买保护的方案（[About Meta newsroom](https://about.fb.com/news/2026/09/introducing-muse-personal-ai-agent/)，一手）；第三方独立核验另确认：连接器可设只读、**Meta 不审查 Muse 自建的 custom connector**、交互数据**默认用于训练模型**（Data controls 手动 opt-out 且溯及既往）、Muse bug bounty 最高 $30 万、Confidential VM 与 1Password/ShopPay 均 "announced but not yet available"、订阅 limited testing（[AI Agent Index 2026-09-29 独立核验](https://theaiagentindex.com/agents/meta-muse)，二手但声明逐项对照 vendor 数据）。
- **底座模型**：Muse Spark（1.3，见上）。据华尔街见闻转述摩根士丹利报告，架构上还面向企业开放 Muse Connectors（开发者申请接入）、Muse for Small Business、Muse Coding 与模型 API（[华尔街见闻 2026-10-12](https://fund.eastmoney.com/a/202610123892660670.html)，二手转述）。
- **一个值得注意的自认**：Meta 承认 Muse 的工作区文件结构遵循了开源个人 agent **OpenClaw** 的设计蓝图，但称代码从头编写（[华尔街见闻 2026-10-12](https://fund.eastmoney.com/a/202610123892660670.html) 转述，二手）。

### 可用面

- 美国：iOS、Android、网页版 muse.ai，并可经 WhatsApp 使用；AI 眼镜支持在计划中；日本上线时间未定（[GIGAZINE 2026-09-09](https://gigazine.net/gsc_news/en/20260909-meta-muse-agent)，二手转述官方）；另有 Mac 原生客户端（[华尔街见闻 2026-10-12](https://fund.eastmoney.com/a/202610123892660670.html)，二手）。
- 价格（2026-10-12 补采后收敛）：官方 newsroom 一手口径 = "It's free for most of what people need, with subscription plans for people who want to do more"（未列档名，[About Meta](https://about.fb.com/news/2026/09/introducing-muse-personal-ai-agent/)）；三档结构获**两个独立二手源一致**——免费档 1 亿 token/周、Power $20/月 = 5 亿 token/周、Maximum $100/月 = 30 亿 token/周（[MarketBeat 经 Yahoo Finance 2026-09-21 全文](https://finance.yahoo.com/technology/ai/articles/meta-muse-agent-wall-street-120000930.html)；[AI Agent Index 2026-09-29 独立核验](https://theaiagentindex.com/agents/meta-muse)，后者并称订阅 limited testing）；开售面 = 美国+加拿大 18+（同上）。muse.ai 站本体仍未直读（JS 壳，curl 400）。

### 反响与批评

- **市场热度**：取代 ChatGPT 登顶美国 App Store 免费榜（[Fortune 2026-09-22](https://fortune.com/2026/09/22/metas-muse-ai-is-exploding-in-popularity-and-drawing-heated-backlash/)）；Meta 股价 12 个交易日涨 27%、峰值 $777.59，远期 PE 从 8 月底 14 倍升至 21 倍（[华尔街见闻 2026-10-12](https://fund.eastmoney.com/a/202610123892660670.html) 转述，二手）。
- **生态封锁**：Amazon 09-20 前后封锁（理由：未标识 AI 身份、未经适当披露存储用户凭证；[Fortune 2026-09-22](https://fortune.com/2026/09/22/metas-muse-ai-is-exploding-in-popularity-and-drawing-heated-backlash/) + [华尔街见闻 2026-10-12](https://fund.eastmoney.com/a/202610123892660670.html)）；Costco、Netflix 亦出现类似限制的用户报告（TickerTrends 追踪，[华尔街见闻 2026-10-12](https://fund.eastmoney.com/a/202610123892660670.html)，二手转述、未独立核实）；电信运营商把 Muse 发起的 AI 客服电话转离人工坐席（同上，二手）。
- **隐私/安全争议**：被指读取用户未授权的消息（[GIGAZINE 2026-09-21](https://gigazine.net/news/20260921-meta-muse-ai-agent-read-private-messages/)，二手）；代管 Facebook Marketplace 卖货时自动降价并向买家泄露用户家庭地址、致买家上门（[GIGAZINE 2026-09-29](https://gigazine.net/news/20260929-meta-muse-give-home-address/)，二手）；person pages 逐人建档 + 每小时更新引发批评（[GIGAZINE 2026-10-05](https://gigazine.net/gsc_news/en/20261005-meta-muse-create-profile) 转述 WIRED）；一个可致本地应用劫持用户 Muse 账户的零日漏洞被紧急修复（[华尔街见闻 2026-10-12](https://fund.eastmoney.com/a/202610123892660670.html)，二手）。
- **"Wall Street divided"（2026-10-12 补采后已读原文）**：同题文章《Meta's Muse Agent Has Wall Street Divided on Its AI Potential》经 [Yahoo Finance 转载全文](https://finance.yahoo.com/technology/ai/articles/meta-muse-agent-wall-street-120000930.html)读得（MarketBeat，Leo Miller，2026-09-21）：发布日 META 涨超 6%、Muse 快速升至美区 App Store 总榜**第二**（登顶第一见 [Fortune 2026-09-22](https://fortune.com/2026/09/22/metas-muse-ai-is-exploding-in-popularity-and-drawing-heated-backlash/)，两日先后）；**J.P. Morgan 与 Mizuho 看多**长期潜力，**Oppenheimer 因用户对交出密码的不信任看空采用**；共同担忧 = 免费档限制近期变现、用户增长与 token 消耗是关键观察指标；Bain 测算美国 agentic e-commerce 2030 年达 $3000–5000 亿（占美国电商 15–25%），Meta 变现路径 = 订阅 + 可能的 token 定价 + 佣金。摩根士丹利（Brian Nowak）测算每用户月服务成本 $3–130（基准 $37、年化 $445，超 Meta 全球 ARPU 约 $70）、变现最早 2027 底–2028（"agent 广告竞价市场"）；美银认为实质性收入不太可能早于 2028；高盛把隐私与安全列为最大单一风险——这三条仍出自 [华尔街见闻/天天基金 2026-10-12](https://fund.eastmoney.com/a/202610123892660670.html) 的二手转述，卖方原报告未直接取得。

---

## 二、OpenAI dots

### 时间线

- **2026-09-29**：OpenAI DevDay 2026（旧金山 Fort Mason）keynote 发布 dots——Sam Altman 称之为"whole new way of working with AI"；现场发布顺序、演示与引语见 [Simon Willison: OpenAI DevDay 2026 live blog](https://simonwillison.net/2026/Sep/29/openai-devday-2026-live-blog/)（一手现场记录）。官方发布页为 [openai.com/index/introducing-dots/](https://openai.com/index/introducing-dots/)（**直接抓取 403，未能读到原文**；其存在与内容经 Simon Willison 与 Mashable 双重确认）。
- 同日配套发布：GPT-6.1 Sol（约 Astra 五分之一价格）、Ultrafast 加速档、Pro 500 订阅、$200/月档重新开售、Decisions API、Codex Security Cloud、OpenAI Marketplace、Sign in with ChatGPT、Plugin extensions（[Simon Willison live blog](https://simonwillison.net/2026/Sep/29/openai-devday-2026-live-blog/)，一手）。
- **2026-10-01**：Semafor newsletter 提到"Like Muse, dots also features cutesy mascots that users can name"，把 dots 放进 Muse 对照框架（[Semafor 2026-10-01](https://www.semafor.com/article/10/01/2026/democrats-hopes-rise-in-texas)，搜索摘要可见该句，**正文两次抓取失败**）。用户提供的 Semafor 引语"a new competitor to Meta's popular Muse system"**未能逐字核实**。

### 能力形态

- **官方话术**（Mashable 转引官方博客原文）："Dots are frontier intelligence that have your back… Powered by GPT-6 Astra, they have their own cloud computer, learn from feedback over time, and can work towards your goals **24/7**. Through our ecosystem of plugins, they can readily connect to **over 4,000 apps**"（[Mashable 2026-09-29](https://me.mashable.com/tech/76660/openai-introduces-dots-a-new-always-on-ai-agent-at-dev-day-2026)，二手转引一手）。用户记忆的"remarkably capable, always-on agents designed for all tasks"**未能对照 openai.com 原文证实**（页面 403），Mashable 记录的近似表述是 "always-on AI agents 'built to handle everything'"。
- **自带云端电脑**：每个 dot 跑在私有、安全的云计算机上（与 Muse 同构），有自己的浏览器，可连用户自己的设备（如笔记本）；"你可以随时打开 dot 的电脑检查它的工作"（[Mashable 2026-09-29](https://me.mashable.com/tech/76660/openai-introduces-dots-a-new-always-on-ai-agent-at-dev-day-2026) 转引官方；[heise 标题](https://www.heise.de/en/news/OpenAI-Launches-Dots-Permanently-Active-AI-Agents-with-Their-Own-Cloud-Computer-11470571.html)亦同——正文抓取失败，仅标题）。
- **拟人化界面**：给 dot 起名、卡通 blob 形象（Simon 的 Muse 形象是一只鹈鹕）；大量语音交互（GPT-Live 技术栈）（[Simon Willison live blog](https://simonwillison.net/2026/Sep/29/openai-devday-2026-live-blog/)，一手）。默认模型 Astra 被 Sam 称为"our most aligned model"，话术是"让你能按自己舒适的限度把责任交给 dot"（同上，一手）。
- **权限与监督**：dot **默认不继承**你在 ChatGPT 已分享的一切，责任与目标由用户显式给（产品负责人 Thibault Sottiaux 在 Q&A，[Simon Willison live blog](https://simonwillison.net/2026/Sep/29/openai-devday-2026-live-blog/)，一手）；敏感操作（如改密码）前由 **auto-review** 系统向用户确认；OpenAI 有监控系统可暂停 dot 的工作（[Mashable 2026-09-29](https://me.mashable.com/tech/76660/openai-introduces-dots-a-new-always-on-ai-agent-at-dev-day-2026)，二手转引官方）。
- **协作面**：**ChatGPT Space**（多人 + 各自的 dot 共享协作面，Notion 式 slash 菜单）；dot 在企业 Slack 里拥有自己的身份（对标 Anthropic 的 Claude Tag）；"specialist dots"（法律、财务等）与企业共建；与 Microsoft 365 合作（[Simon Willison live blog](https://simonwillison.net/2026/Sep/29/openai-devday-2026-live-blog/)，一手）。
- **来源**：Sottiaux 称 dots 的可行性来自 Codex harness 变可靠、能扛更长的任务（[Simon Willison live blog](https://simonwillison.net/2026/Sep/29/openai-devday-2026-live-blog/)，一手）。

### 可用面

- 上线首日面向 **ChatGPT 付费档**：Simon 现场听到的是 "Pro and Enterprise customers get access today"；Mashable 写作 "$100/month Pro plan and Business Premium users"——**两处表述略有出入，未能以一手 FAQ 裁决**（FAQ 页 [help.openai.com](https://help.openai.com/en/articles/20001530-getting-started-with-your-dot) 抓取 403）。
- 首只 dot 不额外收费；与 dot 的对话暂不计入 ChatGPT 用量上限，但官方 FAQ 注明该优惠**仅"未来一个月"**（[Mashable 2026-09-29](https://me.mashable.com/tech/76660/openai-introduces-dots-a-new-always-on-ai-agent-at-dev-day-2026)，二手转引 FAQ）。
- **地区限制**：不向 EEA、瑞士、英国提供（[Mashable 2026-09-29](https://me.mashable.com/tech/76660/openai-introduces-dots-a-new-always-on-ai-agent-at-dev-day-2026)，二手转引官方）。
- 桌面优先：移动端打开创建链接会被要求"到电脑上创建"（[Simon Willison live blog](https://simonwillison.net/2026/Sep/29/openai-devday-2026-live-blog/)，一手实测）。

### 反响

- 媒体普遍以 Muse 为参照系报道（[Mashable 2026-09-29](https://me.mashable.com/tech/76660/openai-introduces-dots-a-new-always-on-ai-agent-at-dev-day-2026)："Forget Muse, there's a new AI agent on the scene"）；发布节奏被解读为对 Muse 登顶的直接回应。
- 现场演示翻车：live demo 中 "Dottie is having a slow morning"，出现"still checking"与冷场（[Simon Willison live blog](https://simonwillison.net/2026/Sep/29/openai-devday-2026-live-blog/)，一手）。
- 风险面：发布前一周，多家大型银行警告把设备与财务信息交给 AI agent（dots、OpenClaw、Muse 等）会放大 AI 诈骗与欺诈风险（[Mashable 2026-09-29](https://me.mashable.com/tech/76660/openai-introduces-dots-a-new-always-on-ai-agent-at-dev-day-2026) 转述，二手）。

---

## 三、Instinct

### 时间线

- **前史**：创始人 Noah Shinn，23 岁，2023 年从 Northeastern 辍学；本科期间与 then-MIT 教授 Ashwin Gopinath 合著 **Reflexion: Language Agents With Verbal Reinforcement Learning**（NeurIPS 2023）——"让 agent 从反馈里反思并存入记忆"的方法论起点；后为 Sierra（Bret Taylor 的企业 agent 公司）早期员工（[Fortune 2026-09-30](https://fortune.com/2026/09/30/noah-shinn-instinct-ai-assistant-meta-muse-alexandr-wang-tech-series-c-ai-agent-mark-zuckerberg/)，二手；个人主页 [noahshinn.com](https://noahshinn.com/) 为其背景的一手出处，未直接抓取）。
- **2026-02**：私测上线（WSJ 报道，[Fortune 2026-09-30](https://fortune.com/2026/09/30/noah-shinn-instinct-ai-assistant-meta-muse-alexandr-wang-tech-series-c-ai-agent-mark-zuckerberg/) 转引，二手）。
- **2026-08**：以 $2.5B 估值融资 $250M（累计 $350M）（[Fortune 2026-09-30](https://fortune.com/2026/09/30/noah-shinn-instinct-ai-assistant-meta-muse-alexandr-wang-tech-series-c-ai-agent-mark-zuckerberg/)，二手）。
- **2026-09**：开放 invite-only beta，每名用户 5 个邀请；Muse 发布后热度不降反升（[Fortune 2026-09-30](https://fortune.com/2026/09/30/noah-shinn-instinct-ai-assistant-meta-muse-alexandr-wang-tech-series-c-ai-agent-mark-zuckerberg/)，二手；Shinn 本人 X 帖称 invite-only 是因"正在积极扩 compute"（[x.com/noahrshinn](https://x.com/noahrshinn/status/2092691344456351744)，经 Fortune 转引））。
- **2026-09-28**：Series C **$1B @ $10B 估值**，Sequoia / Benchmark / Coatue 领投（官方通稿 [Business Wire 2026-09-28](https://www.businesswire.com/news/home/20260928153437/en/Instinct-Raises-%241-Billion-in-Series-C-Funding-from-Sequoia-Benchmark-and-Coatue-at-%2410-Billion-Valuation)（抓取失败，标题与日期经 Fortune 链接确认）；[Fortune 2026-09-30](https://fortune.com/2026/09/30/noah-shinn-instinct-ai-assistant-meta-muse-alexandr-wang-tech-series-c-ai-agent-mark-zuckerberg/)；[TechFundingNews](https://techfundingnews.com/ai-agent-instinct-jumps-to-10b-valuation-with-1b-led-by-sequoia-benchmark-and-coatue/)，二手）。
- **2026-10-09**：The Verge 实测对比文《Instinct was the buzziest AI agent around — can it survive Muse?》（[The Verge](https://www.theverge.com/tech/1008254/instinct-agent-ai-hands-on-muse-dots)，全文经 [Tech News Vision 镜像](https://technewsvision.co.uk/instinct-was-the-buzziest-ai-agent-around-can-it-survive-muse/) 读到；原作者 Allison Johnson，二手评测）。

### 能力形态

- **官网一手话术**："Instinct is a personal assistant that understands what you're working on and what's important to you. The interface is simple: **there are no new interfaces**. You can text or call it. It can use a phone and computer in the same way that humans do."（[instinct.com](https://instinct.com/)，一手）。官方例子：申诉不当账单、送生日礼物、订菜、约医生、计划周末出行（同上）。
- **界面 = 短信/邮件/电话**：经 iMessage、WhatsApp 或 email 文本对话，也可打电话；没有 app、没有拟人吉祥物、"没有假装它坐在笔记本前打字"；因此"凡能收发短信的地方都在"——CarPlay、手表（[The Verge 2026-10-09](https://www.theverge.com/tech/1008254/instinct-agent-ai-hands-on-muse-dots)，二手实测）。
- **数据接入**：可接 Google Workspace、Slack、Notion；网站登录凭据经"secure vault"链接录入；同样有 VM 可用（[The Verge 2026-10-09](https://www.theverge.com/tech/1008254/instinct-agent-ai-hands-on-muse-dots)，二手实测）。
- **记忆/个性化**：按用户偏好学习并存入记忆（订旅行是最大用例，Shinn 称年交易额近 $1B、其中一半是旅行）；实测中会**主动**补充上下文：主动指出"你有这位医生 2024 年的确认邮件"以证没发错对象、在做别的事时主动标记日历冲突（[Fortune 2026-09-30](https://fortune.com/2026/09/30/noah-shinn-instinct-ai-assistant-meta-muse-alexandr-wang-tech-series-c-ai-agent-mark-zuckerberg/)；[The Verge 2026-10-09](https://www.theverge.com/tech/1008254/instinct-agent-ai-hands-on-muse-dots)）。
- **实测局限**：能干 autofill 级别的活，但会漏掉藏在弹窗里的关键信息（如游泳课的先修要求）；"互联网是人做的，数据很烂"（[The Verge 2026-10-09](https://www.theverge.com/tech/1008254/instinct-agent-ai-hands-on-muse-dots)，二手）。

### 可用面与商业模式

- 免费、invite-only（老用户邀请或候补审批，Verge 作者数小时获批）；**暂无订阅费**；Shinn："Instinct is free for invite-only users. Our intent is to keep it as affordable as possible."（[The Verge 2026-10-09](https://www.theverge.com/tech/1008254/instinct-agent-ai-hands-on-muse-dots)）；入口 [app.instinct.com](https://app.instinct.com/login)。
- 邀请码已被炒至约 $300（中文媒体标题所示，[经济观察报/eeo](https://jg-static.eeo.com.cn/article/info?id=2092e505b940f8c8c541ce72cd292d4e)，二手、细节未核实）；Fortune 证实 eBay 上存在邀请转卖（[Fortune 2026-09-30](https://fortune.com/2026/09/30/noah-shinn-instinct-ai-assistant-meta-muse-alexandr-wang-tech-series-c-ai-agent-mark-zuckerberg/)）。
- 营销投入 $0，纯口碑增长（Shinn 语，[Fortune 2026-09-30](https://fortune.com/2026/09/30/noah-shinn-instinct-ai-assistant-meta-muse-alexandr-wang-tech-series-c-ai-agent-mark-zuckerberg/)）。
- 规模与单位经济（Shinn 首次播客长访谈，经 [投中网 2026-10-12](https://www.chinaventure.com.cn/news/113-20261012-393570.html) 中文转述，二手）：用户**仅 10 万出头**、年化交易规模已超 $10 亿——按美国人均年消费约 $6 万估算，**用户已把约六分之一的年消费交给 Instinct**；商业模式非共识 = "让十亿用户免费使用，靠交易佣金覆盖算力成本"；部分用户 90%+ 交互经语音完成；复杂任务（旅行规划、婚礼安排）临时生成专属页面供人查看调整；可代办取消订阅；穿搭建议附生成式上身效果图。

### 反响

- The Verge 实测结论：面对 Muse 与 dots 两家大厂同类产品，Instinct"守住了阵地"，在线任务完成度与两者相当；其无界面、纯短信形态被认为"要么理想要么吓人"（[The Verge 2026-10-09](https://www.theverge.com/tech/1008254/instinct-agent-ai-hands-on-muse-dots)，二手）。
- Meta 首席 AI 官 Alexandr Wang 自 Muse 发布以来多条 X 帖嘲讽 Instinct（"Muse would beat Instinct in an MMA match"、"Muse absolutely crushes Insect"），Shinn 以笑脸回应——大佬互怼反而给 Instinct 带来数十万曝光（[Fortune 2026-09-30](https://fortune.com/2026/09/30/noah-shinn-instinct-ai-assistant-meta-muse-alexandr-wang-tech-series-c-ai-agent-mark-zuckerberg/)，二手）。
- 分析师提醒免费模式终局：要么向用户收费、要么交易抽成/广告——"If you're not paying for it directly, then you're paying for it indirectly"（Techsponential 分析师 Avi Greengart、IDC Greg Ireland，[The Verge 2026-10-09](https://www.theverge.com/tech/1008254/instinct-agent-ai-hands-on-muse-dots)，二手；Instinct 已试推过"recommended products"）。

---

## 四、其他值得注意的（近两月）

- **Anthropic：Cowork 并入 Claude（2026-09-16，官方）**。Claude Cowork 与聊天合并为一个 Claude："Bring a quick question, or hand over a report due at noon, and Claude takes it from there, **even after you've closed your laptop**"；同日发布 Claude Docs 与 Claude Slides、Claude Design 进对话；Pro/Max 先行；默认"行动前先确认"，可切换为"持续干活、只在需要细看时来问"（[claude.com: Claude Cowork and chat are now one Claude](https://claude.com/resources/articles/cowork-is-now-claude)，一手；帮助中心同题文 [support.claude.com](https://support.claude.com/en/articles/16761823-claude-cowork-and-chat-are-one-claude)）。2026-10-08 追加：Claude Dashboards / Motion 进 beta，Docs/Slides/Design 转正并覆盖含 Free 的所有计划（[claude.com: Build live dashboards…](https://claude.com/resources/articles/dashboards-and-motion)，一手）。第三方把它称作"Anthropic 对 dots/Muse 的回答"（[skillnav.dev](https://skillnav.dev/articles/anthropic-s-answer-to-dots-and-muse-is-already-inside-claude)，二手观点）。
- **Google：CC 扩展到家庭/团体（2026-09-17，官方）**。Google Labs 的实验性个人 agent CC（2025 年末上线）获得家庭形态：**CC 拥有自己的专用 Google 账号，最多 6 名成员共用**；每天早上发群体共享的"Your Day Ahead"晨报；自动把重要日期/待办同步进家庭日历与任务清单；代填 PDF（学校同意书、兴趣班报名表）、列购物清单、排每周菜单，信息不足会反问并更新群体记忆；**共享记忆与个人记忆分开**、成员各自控制共享范围（[blog.google: CC is an AI agent for families and groups](https://blog.google/innovation-and-ai/models-and-research/google-labs/cc-expanding-to-groups/)，一手全文已读【2026-10-12 补采】：专用 Google 账号给 CC "a distinct identity and clear permissions model"、最多六名成员、每天共享晨报 "Your Day Ahead"、代填 permission slips/registration PDFs、"CC has a shared memory"——记"全家的"（常去菜馆、采购单）与"一个人的"（饮食禁忌）分开；补充分辨率细节见 [窓の杜 2026-09-18](https://forest.watch.impress.co.jp/docs/news/2142043.html)，二手）。CC 跑在隔离的专用云电脑上，基于 Antigravity + Gemini；目前美国 18+ 个人账号、英语、web+移动端、waitlist（窓の杜转述，二手）。
- **Apple：新 Siri / 下一代 Apple Intelligence（2026-09-09 发布、09-14 可用）**。Apple Event 2026 上 iPhone 18 搭载新 Siri AI（[infobae 2026-09-09](https://www.infobae.com/tecno/2026/09/09/iphone-18-debuta-con-siri-ia-pero-habra-que-esperar-a-octubre-de-2026-para-tenerla-en-espanol/)，二手）；Apple 官方 newsroom："The next generation of Apple Intelligence is available today"（[apple.com/la/newsroom 2026-09-14 更新](https://www.apple.com/la/newsroom/2026/09/the-next-generation-of-apple-intelligence-is-available-today/)，一手标题）；日语支持 10 月起（[mynavi 2026-09-10](https://news.mynavi.jp/article/20260910-4945370/)，二手）；类似 dots，Siri AI 在欧盟等地区迟到（[Mashable 2026-09-29](https://me.mashable.com/tech/76660/openai-introduces-dots-a-new-always-on-ai-agent-at-dev-day-2026) 顺带提及，二手）。
- **OpenClaw（前史与影子）**：2026 年走红的开源个人 agent（原名 Clawdbot→Moltbot→OpenClaw，已有 iOS/Android 版），是"个人 agent 年"的民间前史；Muse 的工作区结构被 Meta 承认遵循其蓝图（[Mashable 2026-09-29](https://me.mashable.com/tech/76660/openai-introduces-dots-a-new-always-on-ai-agent-at-dev-day-2026)（二手）；[华尔街见闻 2026-10-12](https://fund.eastmoney.com/a/202610123892660670.html)（二手转述））。The Verge 把 Instinct/Muse/dots 归为"开发者 agent（Codex、OpenClaw 等）的消费级化"（[The Verge 2026-10-09](https://www.theverge.com/tech/1008254/instinct-agent-ai-hands-on-muse-dots)，二手）。
- **Perplexity**：检索中出现"Perplexity expands the local version of its Computer agent platform"的线索（[gfxspeak](https://gfxspeak.com/featured/perplexity-expands-the-local-version-of-its-computer-agent-platform/)），**日期与详情未能核实，标注：未证实**。仅有的确定背景：2025 年 Amazon 曾起诉 Perplexity Comet（[Fortune 2026-09-22](https://fortune.com/2026/09/22/metas-muse-ai-is-exploding-in-popularity-and-drawing-heated-backlash/) 回顾，二手）。
- **中国反应（2026-10-12 补采后证实）**：据财新 2026-10-11（经 [i 黑马转述](http://www.iheima.com/article-402842.html)，二手）：**字节跳动**个人智能体项目代号 "Spell"，2026 年 4 月启动，延续 2025 豆包手机助手的个人智能体方向，Muse/Instinct 走红后加快了 personal agent 能力的对外发布节奏；**腾讯**轻量云团队 9 月底上线 **LightVela**（定位"云端个人助理"，经微信接入、全天在线处理日常诉求，开发者体验阶段），另有代号 "Handy Bot" 的个人 Agent 内测、拟做独立 App。Muse 上线两周登顶美加 iOS 免费榜、累计下载超 340 万次；Connect 大会宣布沃尔玛、百思买等零售合作伙伴。卖方分析认为腾讯的封闭生态 + 微信小程序 + 微信支付构成"反 Muse"结构性优势（伯恩斯坦/BofA 分析师 Winnie Wu 观点，[华尔街见闻 2026-10-12](https://fund.eastmoney.com/a/202610123892660670.html)，二手转述）。

---

## 五、对本仓的观察

> 本仓（[README.md](../../../README.md)）做的是"给 agent 一个自己的 working folder 的领域专家式助手"：
> 跨会话工作目录 = 插件 dataDir，长期记忆 + 领域知识 + 学到的技能 + 养护检查，四房间见 [docs/home.md](../../../docs/home.md)。
> 以下只做**有来源支撑的对照**，不发明结论。

1. **"给 agent 一个专属环境"已是行业公约数，但落点分层。** Muse 给每用户一个 Muse Secure VM（[GIGAZINE 2026-09-09](https://gigazine.net/gsc_news/en/20260909-meta-muse-agent)）、dots 给每只 dot 一台云端电脑（[Mashable 2026-09-29](https://me.mashable.com/tech/76660/openai-introduces-dots-a-new-always-on-ai-agent-at-dev-day-2026)）、CC 跑在隔离专用云电脑上（[窓の杜 2026-09-18](https://forest.watch.impress.co.jp/docs/news/2142043.html)）、Instinct 也有 VM（[The Verge 2026-10-09](https://www.theverge.com/tech/1008254/instinct-agent-ai-hands-on-muse-dots)）。对照：本仓的对应物是**本地文件系统上的 working folder**（跨会话目录而非云沙箱）——同一命题的"文件面"而非"机器面"实现。
2. **记忆/个性化是共同的差异化轴，也是共同的争议轴。** Muse 的 person pages（逐人建档、每小时更新、"Strengthening"建议如何深化关系）是这波里最激进的记忆设计，同时招致 WIRED 级别的批评（[GIGAZINE 2026-10-05](https://gigazine.net/gsc_news/en/20261005-meta-muse-create-profile)）；Instinct 用"记住偏好→下次更顺"做温和版（[Fortune 2026-09-30](https://fortune.com/2026/09/30/noah-shinn-instinct-ai-assistant-meta-muse-alexandr-wang-tech-series-c-ai-agent-mark-zuckerberg/)）；CC 把**共享记忆与个人记忆显式分开**并交还控制权（[窓の杜 2026-09-18](https://forest.watch.impress.co.jp/docs/news/2142043.html)）。对照：本仓的 working folder 房间结构（[docs/home.md](../../../docs/home.md)）与 CC 的方向同属"用户可见、可控制的记忆面"，与 Muse 的隐藏式逐人建档处于光谱两端。
3. **权限分级/敏感操作确认是各家标配。** Muse 的 Sentinel + 一次性卡号（[GIGAZINE 2026-09-09](https://gigazine.net/gsc_news/en/20260909-meta-muse-agent)）、dots 的 auto-review + 默认不继承 ChatGPT 上下文（[Mashable 2026-09-29](https://me.mashable.com/tech/76660/openai-introduces-dots-a-new-always-on-ai-agent-at-dev-day-2026)；[Simon Willison live blog](https://simonwillison.net/2026/Sep/29/openai-devday-2026-live-blog/)）、Claude 默认行动前确认（[claude.com 2026-09-16](https://claude.com/resources/articles/cowork-is-now-claude)）、Instinct 的 secure vault（[The Verge 2026-10-09](https://www.theverge.com/tech/1008254/instinct-agent-ai-hands-on-muse-dots)）。对照：本仓的"机器能跑的养护检查"属于这一谱系里面向 agent 自身健康的一支，与"代表用户对外行动"的确认闸门是不同问题。
4. **界面话术两端：Meta/OpenAI 卖拟人吉祥物，Instinct 卖"没有新界面"。** Muse 的熊形吉祥物、dots 的 blob（[Simon Willison live blog](https://simonwillison.net/2026/Sep/29/openai-devday-2026-live-blog/)；[The Verge 2026-10-09](https://www.theverge.com/tech/1008254/instinct-agent-ai-hands-on-muse-dots)）vs instinct.com 的 "there are no new interfaces"（一手）。对照：本仓的定位（领域专家式助手，[README.md](../../../README.md)）话术上更接近"专业纵深"而非"全生活接管"，与三家均不同轴。
5. **always-on + 专属沙箱的成本重量已被量化点名。** 摩根士丹利测算 Muse 每用户每月服务成本基准 $37（年 $445），远超 Meta 用户年 ARPU 约 $70（[华尔街见闻 2026-10-12](https://fund.eastmoney.com/a/202610123892660670.html)，二手转述）。对照：本仓跑在用户自己的 harness 与模型配额上、无常驻云 VM，成本结构不在同一档——这是差异事实，不是优劣结论。
6. **消费级 agent 的失败模式集中在"数据脏 + 越权"。** Muse 泄露家庭地址、读未授权消息（[GIGAZINE 2026-09-29](https://gigazine.net/news/20260929-meta-muse-give-home-address)、[GIGAZINE 2026-09-21](https://gigazine.net/news/20260921-meta-muse-ai-agent-read-private-messages/)）；Instinct 漏掉藏在弹窗里的先修信息（[The Verge 2026-10-09](https://www.theverge.com/tech/1008254/instinct-agent-ai-hands-on-muse-dots)）。对照：本仓已有的走查/探针/评测机制（[docs/dev.md](../../../docs/dev.md) §四）是针对这类"真机行为"的证据面。

---

## 六、未能证实清单（如实记录）

| 事项 | 状态 |
|---|---|
| OpenAI dots 官方页原文（"remarkably capable, always-on agents designed for all tasks"等逐字话术） | openai.com 与 help.openai.com 均 403，未能读到原文；现有话术经 [Mashable](https://me.mashable.com/tech/76660/openai-introduces-dots-a-new-always-on-ai-agent-at-dev-day-2026) 与 [Simon Willison](https://simonwillison.net/2026/Sep/29/openai-devday-2026-live-blog/) 转引/亲历。**2026-10-12 复核：curl 直连与 jina reader 均被 Cloudflare "Just a moment" 挑战页挡下——确认为站点反爬而非网络问题** |
| dots 可用档位（Pro/Enterprise vs Pro/Business Premium） | 两处二手表述不一致，FAQ 页 403 未能裁决（2026-10-12 复核仍被 Cloudflare 挡下） |
| Semafor 引语 "a new competitor to Meta's popular Muse system" | Semafor 正文两次抓取失败；仅其 2026-10-01 newsletter 摘要中"Like Muse, dots also features cutesy mascots…"可证其做过对照报道 |
| Muse 定价（免费 vs $20/$100 三档） | **已收敛（2026-10-12 补采）**：官方一手仅证实 freemium——"free for most of what people need, with subscription plans"（[About Meta newsroom](https://about.fb.com/news/2026/09/introducing-muse-personal-ai-agent/)，未列档名）；三档（免费 1 亿 token/周、Power $20/月 = 5 亿/周、Maximum $100/月 = 30 亿/周）获 [MarketBeat/Yahoo 09-21 全文](https://finance.yahoo.com/technology/ai/articles/meta-muse-agent-wall-street-120000930.html)与 [AI Agent Index 09-29 独立核验](https://theaiagentindex.com/agents/meta-muse)两个独立源一致（后者并称订阅 limited testing）；muse.ai 站本体仍未直读（JS 壳，curl 400） |
| 《Meta's Muse Agent Has Wall Street Divided on Its AI Potential》正文 | **已解决（2026-10-12 补采）**：全文经 [Yahoo Finance 转载](https://finance.yahoo.com/technology/ai/articles/meta-muse-agent-wall-street-120000930.html)读得（MarketBeat, Leo Miller, 09-21）——J.P. Morgan/Mizuho 看多、Oppenheimer 看空、Bain 市场测算已入 §一；摩根士丹利 $37/月成本等仍为华尔街见闻二手转述（原报告未取得） |
| Instinct Series C 官方通稿正文 | Business Wire 抓取失败（2026-10-12 curl 复核仅得 597 字节 JS 壳）；事实以 [Fortune](https://fortune.com/2026/09/30/noah-shinn-instinct-ai-assistant-meta-muse-alexandr-wang-tech-series-c-ai-agent-mark-zuckerberg/) 与 [TechFundingNews](https://techfundingnews.com/ai-agent-instinct-jumps-to-10b-valuation-with-1b-led-by-sequoia-benchmark-and-coatue/) 为准 |
| Instinct 邀请码 $300 | 仅中文媒体标题所示（[eeo](https://jg-static.eeo.com.cn/article/info?id=2092e505b940f8c8c541ce72cd292d4e)），细节未核实 |
| Meta Connect 2026 完整清单 | Hindustan Times 汇总页 403；Connect 日期（09-23）由 Fortune 预告与华尔街见闻"次日峰值"间接印证 |
| Perplexity Computer agent 本地版扩展 | 日期与详情未核实（[gfxspeak](https://gfxspeak.com/featured/perplexity-expands-the-local-version-of-its-computer-agent-platform/) 仅线索） |
| 字节/腾讯具体动作 | **已解决（2026-10-12 补采）**：财新 10-11 经 [i 黑马](http://www.iheima.com/article-402842.html)转述——字节 "Spell"（4 月启动）、腾讯 LightVela（9 月底上线微信端）与 "Handy Bot"（内测），见 §四 |
| Noah Shinn 的 X 帖原文 | X 不可抓取，均经 Fortune/The Verge 转引 |
