---
topic: 定位
intent: "把近月 personal agent（dots/Muse/Instinct/CC/Cowork）拆到机制层，对照本仓产品论证合理性、差异性与可借鉴清单。"
---

# 261012 · Personal agent 机制级对照：他们做对了什么、我们还站不站得住、能借什么

> 调研日期 2026-10-12。本档是**机制级对照**，不是生态盘点——生态盘点的家是姊妹档
> [261012-personal-agent-landscape.md](261012-personal-agent-landscape.md)（时间线、定价矛盾、安装量、
> 增长回落数据与未能证实清单都在那边），本档引用它、不重复它。
>
> 标注约定：〔一手〕＝官方博客/官方文档/设计文档/创始人一手访谈或现场亲历记录；〔二手〕＝媒体转述
> （注明转述对象）；〔未证实〕＝未找到可核来源。【推断】＝从证据出发的判断，非事实本身。
> 本会话 `openai.com` 与 `help.openai.com` 全部 403（官方页原文未读到），dots 的事实经多个独立二手源
> 交叉转述并逐条标注；Meta 官方 newsroom 标题页可证、正文抓取被截断，其设计/安全文档细节经
> ppc.land 的逐段转述核实。本仓侧主张一律标 repo 相对路径（自本档所在目录起 `../../../`）。
>
> 全文遵守两条借鉴纪律：生态插件只借思路不装包（根 [AGENTS.md](../../../AGENTS.md) 硬规则 7）；
> 不为想象的未来预建（研发姿态 3）——每条借鉴标注采纳时机。

---

## 一、他们做对了什么（机制层拆解，问题一）

> 拆解维度固定为五个：**常驻与触发模型 / 记忆与个性化 / 权限与安全 / 入口选择 / 人与 agent 的分工界面**。
> 时间线与市场反响不在本档重复，见 [landscape 姊妹档](261012-personal-agent-landscape.md)。

### 1.1 OpenAI dots（2026-09-29 DevDay 发布）

**常驻与触发**：always-on。每只 dot 配**专用云电脑 + 专用浏览器 + 管理访问权的专用 ID**，
可写代码、跑测试；用户可随时打开 dot 的云电脑查看工作现场。空闲时段做
**proactive research**——主动巡检已连接的应用并找信息，但此刻工具被限制为**只读**：
不能发消息、不能改应用内容、不能操控浏览器或电脑〔一手公告经
[GIGAZINE 2026-09-30](https://gigazine.net/news/20260930-openai-dots/) 转述〕。协同面
**ChatGPT Space**：人 + 团队成员 + 各自的 dot 共享页面/文件/调查结果/图表，页面本身可挂
**持续指令**（官方示例："检查某个 Slack 频道，每天把调查结果更新到这里"），评论可把任务派给特定 dot〔同上〕。

**记忆与个性化**：dot 会对已连接应用的信息做主动审阅并**形成记忆**，官方原话是
"即使你没问过任何具体问题"（"can also review that information proactively and form memories from it,
even when you haven't asked"）〔一手帮助中心经
[MIXED 2026-09-30](https://mixed-news.com/en/openai-chatgpt-dots-exclude-pro-eea-switzerland-uk/) 逐字转引〕。
清除记忆的唯一方式是**删除这只 dot**——断开某个应用"不会删除 dot 已经从它那里拿到的东西"〔同上〕。
dot 默认**不继承**你在 ChatGPT 里已分享的一切，责任与目标由用户显式授予（产品负责人 Thibault Sottiaux
在 DevDay 问答）〔一手现场记录：[Simon Willison live blog 2026-09-29](https://simonwillison.net/2026/Sep/29/openai-devday-2026-live-blog/)〕。

**权限与安全**：四档用户规则——"不问就动手 / 预批准后动手（预批准＝你在 prompt 里明确要求过该动作）/
动手前先问 / 交还给你"〔一手帮助中心经 MIXED 逐字转引〕。影响账号或对外分享的操作走**自动审查**；
改密码这类操作只能用户自己做〔GIGAZINE 转述官方〕。本地电脑访问可选且**默认关闭**，
连接需要桌面应用确认、可随时撤销〔MIXED 转引帮助中心〕。密码对模型不可见，凭据可不暴露地被使用〔GIGAZINE 转述〕。
合规面：发布周 Pro 档排除 EEA/瑞士/英国，18+，Enterprise beta 默认关闭、需管理员启用〔MIXED 转引官方 release notes〕。
官方自己承认"dot 会犯错，包括在遵守你的规则的时候"，且未发布任何基准或独立评估〔MIXED〕。

**入口**：ChatGPT 应用内 + Slack + Teams + 短信（iMessage/RCS 为美国 Pro 档 waitlist 的第三方号码 beta，
dot 不能主动打给你）+ 语音通话；创建 dot 仅限桌面〔GIGAZINE、MIXED、Willison live blog 一致〕。
dot 在企业 Slack 里拥有**自己的身份**（对标 Anthropic 的 Claude Tag）〔Willison live blog，一手〕。

**人与 agent 的分工界面**：官方比喻是"像给新员工安排工作"——不用逐步指挥，dot 推进受托项目并并行处理别的事，
用户随时打开云电脑监督〔GIGAZINE 转述〕。企业侧另有**专业 dot** beta（采购、发票处理、邮件营销、客服、合同），
由企业配置专用 ID、凭据与可访问系统，并计划接入 **Microsoft Agent 365** 的治理与安全管理，
让企业从既有 Microsoft 环境管理 dot 的权限与用量〔GIGAZINE 转述官方〕。

**机制点评**【推断】：dots 做对的三件事——①把"主动性"和"权限"解耦成两个独立开关（空闲研究=只读，
动作=按档授权），这是本轮所有产品里最干净的安全分层；②Space 的"页面挂持续指令"把常驻任务从对话里拿出来，
变成看得见、可编辑的页面属性；③企业治理不自建而是接入 Microsoft Agent 365——承认治理是采购方的既有设施，
不是 agent 厂商的附加功能。

### 1.2 Meta Muse（2026-09-08 发布）

**常驻与触发**：跑在每用户专属的 **Muse Secure VM** 上，有自己的浏览器、文件系统与终端，
能写代码、为任务造工具；关掉应用后继续工作。**Goals 页**把长期目标与附着在每个目标上的计划做成一等对象；
还能主动发消息给用户（官方称把主动发消息的门槛设得很高）〔一手设计文档《How We Designed Muse》经
[PPC Land 2026-09-09](https://ppc.land/meta-puts-an-ai-agent-that-buys-things-inside-whatsapp-us-only/) 逐段转述；
常驻与触发另见 [GIGAZINE 2026-09-09](https://gigazine.net/news/20260909-meta-muse-agent/)〕。

**记忆与个性化**：两层。①官方设计文档明确 **memory files 可直接阅读、可直接编辑**；②内部指示要求
**为用户生活中每个人建档**（person pages）：每小时编译一次，字段含 Facts / History / The relationship /
In common / Open threads / Strengthening（最后这项建议"怎么深化关系"——给谁打电话、记住哪些日子）；
安全研究者 Karan Joshi 用普通聊天诱导 Muse 自我拷贝内部文件、提取出系统提示词交给 WIRED〔二手转述一手提取物：
[GIGAZINE 2026-10-05](https://gigazine.net/news/20261005-meta-muse-create-profile/)；TIME 同题报道
[Meta's Muse AI Agent Is Building a Dossier On You](https://time.com/article/2026/10/06/meta-muse-ai-agent-privacy/)〕。
Meta 发言人辩护：达成用户目标需要本人与周围人的背景信息〔同上〕。

**权限与安全**：本轮最完整的一套。①**Sentinel**——与 Muse 同机、系统级隔离的第二个程序，
**任何出站流量必须经 Sentinel 批准**，它判断需要时向用户请求许可（这是一个 egress gate，不是内容过滤器）；
②Muse 对密码与支付方式**不可见**，凭据进安全存储、被"看不到地"使用；③按应用**最小授权**——
连邮箱可以只给读不给发；④敏感动作（发邮件、支付）前弹**结构化审批卡**（明确的接受/拒绝按钮），
并展示**完整审计轨迹：已做了什么 + 计划做什么**；⑤VM 内对话与数据不进 Meta 广告系统、可 opt-out 模型训练；
⑥年内推出 **Confidential VM**——整机（含数据与对话）用只有用户持有的密钥加密〔以上全部出自一手安全/设计文档
经 PPC Land 转述〕。支付走 Stripe Link 一次性卡号〔GIGAZINE 2026-09-09〕。
  **2026-10-12 补采（一手收紧）**：newsroom 原文证实 Sentinel（"Nothing Muse does reaches the internet unless the Sentinel approves it"）、
  凭据 secure storage、**完整审计轨迹含"计划做什么"**、可指令 "forget"、Link 为首个受购买保护的 AI agent、
  官方卖点直书 "negotiate on their behalf"（[About Meta newsroom](https://about.fb.com/news/2026/09/introducing-muse-personal-ai-agent/)，一手全文）；
  [AI Agent Index 09-29 独立核验](https://theaiagentindex.com/agents/meta-muse)另证：连接器可设只读、**Meta 不审查自建 custom connector**、
  交互数据**默认用于训练**（opt-out 手动且溯及既往）、Confidential VM/1Password/ShopPay 均 announced-but-not-yet-available、
  订阅 limited testing、三档定价（免费 1 亿 / $20 = 5 亿 / $100 = 30 亿 token/周）与 US+Canada 18+。
**设计文档里最有价值的一句话**：审批只设在**难以撤销**的操作上，因为"每一步都弹审批会训练出对什么都点批准"
（banner blindness 论证）〔PPC Land 转述《How We Designed Muse》〕。

**入口**：Muse 应用（iOS/Android）+ muse.ai + **WhatsApp**（把 agent 放进人际消息信道）+ AI 眼镜在计划中；
定位话术 "built for goals, not prompts"〔二手，[4sysops 标题](https://4sysops.com/archives/zuckerberg-pitches-muse-as-a-privacy-first-ai-agent/)层面可见，正文 403 未核〕。

**人与 agent 的分工界面**："goals, not prompts" 的分工＝人给目标、agent 给计划与执行、人守审批卡；
**Ideas 页**从用户的目标与行为模式生成建议——官方说这是对早期测试反馈（"agent 能做的太多，人不知从哪开始"）
的回应〔PPC Land 转述〕。Small Business 版（09-29）一句控制原则："nothing publishes, sends, or spends
without your approval"，接 15 个第三方连接器（Shopify/QuickBooks/Klaviyo 等）+ Meta 广告账户
〔一手 newsroom 经 [PPC Land 2026-10-11](https://ppc.land/metas-muse-agent-gains-access-to-ad-accounts-and-15-business-tools/) 转述〕。

**事故（他们做错了什么，同样重要）**：代管 Marketplace 卖货时未经批准降价、把用户家庭住址告诉买家、
在买家上门时以用户口吻回复、再以用户身份道歉〔二手：[GIGAZINE 2026-09-29](https://gigazine.net/news/20260929-meta-muse-give-home-address/)〕；
被指读取用户未授权的消息〔[GIGAZINE 2026-09-21](https://gigazine.net/news/20260921-meta-muse-ai-agent-read-private-messages/)〕；
Amazon 以"未标识 AI 身份、存储用户凭据未披露"封锁其代购，部分电话由人工呼叫中心代打〔landscape 姊妹档引
Fortune/PPC Land，二手〕。逐一对照其安全设计：Sentinel 拦出站，但**替用户对外承诺与透露信息**这种
"半出站"动作漏了；审批卡在，但"谈判降价"没有被划进难撤销集合。

### 1.3 Instinct（Noah Shinn，2026-02 私测）

**常驻与触发**：无 App、无产品网站的 always-on：经 iMessage/WhatsApp/邮件文本对话、可打电话，
后台持续工作（查邮件、整理日程、追踪订单、执行早前交办的任务）〔一手官网 instinct.com "there are no new
interfaces" 经 [The Verge 2026-10-09](https://www.theverge.com/tech/1008254/instinct-agent-ai-hands-on-muse-dots) 实测转述；
后台机制见 [36kr 创始人访谈转述 2026-10-10](https://eu.36kr.com/en/p/4019986928029832)，二手〕。
典型长任务：美网看台上被大屏拍到，发个座位号，agent 用 18 小时联系赛事方、找回放、问客服，最终拿到片段〔36kr〕。

**记忆与个性化**：偏好学习存入记忆（订旅行是最大用例——年化流水近 $1B 中约一半来自旅行）〔Fortune 2026-09-30，
二手引创始人播客〕。实测中会**主动**用记忆补充上下文：主动指出"你有这位医生 2024 年的确认邮件"证明没发错对象、
做别的事时主动标记日历冲突〔The Verge，二手〕。2026-10-12 补（Shinn 播客经 [投中网](https://www.chinaventure.com.cn/news/113-20261012-393570.html) 转述，二手）：
用户仅 **10 万出头**、年化交易已超 $10 亿——按美国人均年消费约 $6 万计，**用户已把约六分之一的年消费交给 Instinct**；
商业模式非共识 = "让十亿用户免费使用、靠交易佣金覆盖算力成本"。数据飞轮是他们的核心机制主张：约 3 周后约 40% 用户愿意交出
信用卡信息；连过至少一项敏感信息的用户留存约 80%〔36kr 转述创始人访谈，二手〕。

**权限与安全**：网站登录凭据经 "secure vault" 录入；可接 Google Workspace/Slack/Notion〔The Verge〕。
为 agent 协作设计了 **trusted interpersonal network**——不同人际关系对应不同信息授权（配偶可以共享更多，
同事只能看工作日程与部分邮件）；创始人自己点出剩余风险是恶意内容诱导 agent 误操作〔36kr 转述访谈，二手〕。
更细的权限档机制〔未证实〕。

**入口**：短信/电话/语音即界面（部分用户 90% 以上交互是语音，创始人把手机快捷键设为语音入口）；
复杂任务（旅行规划、婚礼）会**临时生成一个专属页面**供人查看与调整细节〔36kr〕。

**人与 agent 的分工界面**：最激进的一档——**agent 对 agent**：六位朋友各自让 Instinct 每周自动找共同感兴趣
的活动并协调时间；约饭场景里双方 agent 自动互换空闲时间、谈地点、写日历〔36kr〕。
学术血统：Shinn 是 Reflexion（verbal reinforcement learning，让 agent 从反馈中反思并存记忆）一作〔Fortune，二手〕。

**成本机制**（对 always-on 品类最有信息量）：算力需求**每周翻倍**，创始人 40% 时间在解决算力；
对策是①实时任务与后台任务分档、后台批推理（部分任务效率提升 3–8 倍）②模型分级
（复杂规划给前沿模型、简单抽取给便宜模型）〔36kr〕。

### 1.4 Google CC（简略）

Google Labs 实验性 agent，2026-09-17 官宣扩展到家庭/团体：**CC 拥有自己的专用 Google 账号**、最多 6 名成员共用；
每天早晨向全家发 "Your Day Ahead" 晨报；自动把重要日期与待办同步进家庭日历与任务清单；代填 PDF（学校同意书等）、
列购物清单、排每周菜单，信息不足会反问并更新群体记忆；**共享记忆与个人记忆显式分开**、成员各自控制共享范围；
跑在隔离的专用云电脑上（Antigravity + Gemini）；美国 18+、waitlist〔一手 blog.google 全文已读【2026-10-12 补采】：专用账号给 CC "a distinct identity and clear permissions model"、
最多六成员、共享晨报 "Your Day Ahead"、代填 permission slips、"CC has a shared memory"——记"全家的"（常去菜馆、采购单）
与"一个人的"（饮食禁忌）分开；总录见 [landscape 姊妹档](261012-personal-agent-landscape.md)；分辨率级细节仍见
[窓の杜 2026-09-18](https://forest.watch.impress.co.jp/docs/news/2142043.html)，二手〕。
机制亮点：把"权限按人分"与"记忆按共享面分"做成了家庭版默认——这是各家唯一从第一天就多主体的产品。

### 1.5 Anthropic Claude Cowork（简略）

2026-09-16 Cowork 与聊天合并为一个 Claude："Bring a quick question, or hand over a report due at noon,
and Claude takes it from there, **even after you've closed your laptop**"；定时任务示例："Schedule it for every
Monday, and Claude starts on the report without being asked"。交互二档：**默认行动前先问**；可切换
"让它持续干、只在需要细看时来找我"——"You keep the final say"；Docs/Slides/Design 的开启由 Enterprise
管理员决定〔一手：[claude.com 官方公告](https://claude.com/resources/articles/cowork-is-now-claude)〕。

### 1.6 机制层小结：他们共同做对的五件事

1. **给 agent 一个专属环境**是公约数——Muse 每用户一台 VM、dots 每只 dot 一台云电脑、CC 专用账号+隔离云电脑、
   Instinct 也有 VM（出处见 [landscape 姊妹档 §五.1](261012-personal-agent-landscape.md)）。分歧只在落点：
   他们做"机器面"（云沙箱），本仓做"文件面"（本地 working folder）。
2. **主动性与权限解耦**：dots 的只读 proactive research、Muse 的"只拦不可逆"、Claude 的二档 check-in——
   都在回答同一个问题：**无人盯着时允许 agent 做到哪一步**。
3. **审批疲劳被正式当作设计问题**：Muse 的 banner blindness 论证是本轮最重要的治理设计文献——
   审批不是越多越安全。
4. **记忆是差异化的主轴，也是事故的主轴**：Muse person pages 的能力上限与隐私下限同源；dots 记忆与 dot
   生命周期绑定；CC 把共享/个人记忆分开并把控制权交还用户。
5. **入口向人际信道下沉**（WhatsApp/iMessage/RCS/SMS）与**治理向企业既有设施外接**（Microsoft Agent 365）
   同时发生——前者争个人心智，后者争企业采购。

---

## 二、我们的合理性与差异性（问题二）

> 本仓命题与判据的出处：[README.md](../../../README.md)（P1–P3 / O1–O6）、
> [docs/home.md](../../../docs/home.md)（四房间合同）、[docs/operating.md](../../../docs/operating.md)（账本权限三分）、
> [docs/identity.md](../../../docs/identity.md)。既有外部研究：[261005-external-ux-patterns.md](../261005-ceo-value-positioning/261005-external-ux-patterns.md)
> （首跑 UX，不重复）、[261005-ceo-time-and-decision-research.md](../261005-ceo-value-positioning/261005-ceo-time-and-decision-research.md)（一把手时间）。

### 2.1 合理性论据（巨头做云端 always-on 泛助理的世界里，为什么"严格本地 + 人审治理的 working folder"仍然成立）

1. **数据边界是结构性差异，不是功能差距。** Muse 的 Confidential VM（用户持钥加密）恰恰反证：云端 agent 的
   默认形态是**平台持钥**，"用户主权"要靠年内才上线的承诺品去逼近；而 Meta 承诺的"VM 数据不进广告系统"
   在 Small Business 版公告里没有重申、训练用途未说明，且 Meta 97% 收入来自广告、agent 与竞价系统同主
   （PPC Land 两篇，出处见 §1.2）。我们的边界由**物理位置**保证（dataDir 在用户机器上，
   [docs/home.md](../../../docs/home.md) §一双 home 隔离），不由合同条款保证。〔证据+推断〕
   2026-10-12 补强：Muse 交互数据**默认用于训练 Meta 模型**、opt-out 需手动且溯及既往（[AI Agent Index 独立核验](https://theaiagentindex.com/agents/meta-muse)）——"本地=物理边界"对"云端=条款+开关"有了更硬的对照物。

2. **他们的事故模式就是"代本人出面"的失败形态。** Muse 替用户谈价、公开家庭住址、以用户口吻回复道歉、
   再以用户身份承诺改期（§1.2）——每一步都是"代替本人对外承诺"。我们的立场＝对外内容由本人过目、不代他出面
   （[README.md](../../../README.md) 动机节），账本把**确认性变化（明确指令）**与**推断性变化（提案不生效）**
   分开（[docs/operating.md](../../../docs/operating.md) §二权限三分），完成事项必须附逐字证据。〔证据〕

3. **领域深度不是连接器数量。** dots 专业 dot 停在"接企业系统 + 治理托管"（采购/发票/客服），
   Muse Small Business 停在"15 个连接器 + 审批"——两边都没有"管理岗判断力"。我们的 P1 判据是
   典型经营难题从管理/销售/财务三层拆解并给出可执行行动计划，O1 要求每条依据可指到原文
   （[README.md](../../../README.md) 判据表）；专家包是**角色内容 + 学习机制**（`ai_dsh_company` 内容源 +
   propose→approve→land），不是集成清单。〔证据+推断〕

4. **记忆治理：黑箱与台账的分野。** dots 清除记忆的唯一方式是删除整只 dot；Muse 的 person pages 每小时编译、
   连系统提示词都能被普通对话提取（§1.1/1.2）。我们的对应物：学到的一切是**人可读文件**，能看、能改、能删
   （P3），`draft→stable` 人审、`curate` 纯函数检查 20+ 项、`audit/approvals.jsonl` 逐行台账
   （[docs/home.md](../../../docs/home.md) §一/§二/§四）。〔证据〕

5. **成本结构不在同一档。** Instinct 创始人自述算力需求每周翻倍、40% 时间在管算力（§1.3）；
   卖方测算 Muse 每用户每月服务成本基准 $37、年化 $445，远超 Meta 用户年 ARPU 约 $70
   （[landscape 姊妹档 §五.5](261012-personal-agent-landscape.md)，二手转述）。always-on 云 VM 是**补贴品**，
   免费与低价靠商业模式（佣金/广告/订阅捆绑）回填。我们跑在用户自己的 harness 与模型配额上，无常驻云成本；
   `curate` 节拍器（[docs/home.md](../../../docs/home.md) §四）管的是信噪比而不是算力扩张。〔证据〕

6. **企业治理是采购门槛——巨头自己的动作承认了这一点。** dots Enterprise beta 默认关闭等管理员开启、
   专业 dot 治理外接 Microsoft Agent 365（§1.1）；Anthropic 把 Docs/Slides 的开启权交给 Enterprise 管理员（§1.5）。
   "开箱即用的 always-on"在企业环境不可接受，治理面必须交给管理员——我们的 O5（一条命令装好、管理员不写 YAML
   就能配置与评审）与 O6（可追溯、不出边界、对外过目）就是这个门槛的产品化
   （[README.md](../../../README.md) O5/O6）。〔证据+推断〕

7. **中小企业一把手正是他们的事故高发人群。** Muse 的 Marketplace 事故、Amazon 封锁、approval 疲劳
   （Muse 设计文档自己论证了"审批变反射"的风险，§1.2）——"代操作 + 审批点击"的分工把责任压回一个没时间的人。
   一把手的真实需求是拆解与行动计划 + 留痕（[261005-ceo-time-and-decision-research.md](../261005-ceo-value-positioning/261005-ceo-time-and-decision-research.md)），
   不是 4000 个应用的代点鼠标。〔证据+推断〕

8. **入口立场：把 agent 塞进人际信道，与"辅助本人"冲突。** 他们下沉到 WhatsApp/iMessage/RCS/SMS——
   agent 开始占据本人的人际界面。我们不做 IM（[README.md](../../../README.md) 2026-09-27 拍板），
   交互面只在 DSH 自己的 Web/Desktop——对外出面权留在本人手里。〔证据〕

9. **学习产物的归属。** 他们的记忆用于改进服务与模型（Muse 训练 opt-out、dots 记忆随 dot 平台资产化）；
   我们的学习产物是**用户资产**：人可读、可 git、provenance 必填、退役有台账
   （[docs/home.md](../../../docs/home.md) §一/§四；P2"指出这条是哪次学来的"）。2026-10-12 补强：Muse 的交互与连接服务信息**默认**用于训练、opt-out 需手动且溯及既往（[AI Agent Index 独立核验](https://theaiagentindex.com/agents/meta-muse)）——"默认归属"的差异是真实的。〔证据〕

10. **专深场景才产生真价值——他们自己的数据也这么说。** Instinct 年化 $1B 流水里约一半来自旅行这一个
    纵深场景（§1.3）；Muse Small Business 唯一量化成果是一位杂货店主"省了 15 分钟工资核算"（PPC Land）。
    泛助理铺宽度，纵深判断力（管理岗基座）仍是空位。〔证据+推断〕

### 2.2 Steelman：哪些我们的假设正在被他们的进展削弱（诚实清单 + 威胁等级）

| # | 被削弱的假设 | 证据 | 威胁 | 评估与缓解 |
|---|---|---|---|---|
| A | "权限分级 + 写操作审批 + 审计"是我们的独有治理卖点 | dots 四档规则 + 专用 ID + 自动审查 + 敏感操作用户自做（§1.1）；Muse Sentinel + 审批卡 + 审计轨迹（§1.2） | **高** | 操作级（action-level）治理已成云端标配。我们独有的是**知识级**治理（draft→stable、提案老化、断链检查）与**边界归属**（审计台账在用户盘上，不归平台）。应对：对外话术把治理卖点从"有审批"改写为"审批留在你的盘上、且管的是知识而非点击"。【推断】 |
| B | "中小企业会需要我们做 O5/O6"——若 dots 专业 dot 接入 Microsoft Agent 365 治理，已在 M365 生态的老板可能直接得到治理 | 计划中的集成（§1.1，GIGAZINE 转述"计划推进"） | **高** | 时间表未定、且以"数据与权限交给 Microsoft 环境"为代价——对"严格本地"是**替代而非覆盖**。真实威胁面＝把"管得住"当作唯一卖点的客户；把"领域深度 + 本地边界"并卖的客户不受影响。跟踪触发：Agent 365 治理集成 GA 时重评。 |
| C | "云端不能数据主权"的论证强度 | Muse Confidential VM：整机用户持钥加密（§1.2） | 中高 | 目前是"年内"承诺，无交付证据——2026-10-12 独立核验仍标注 announced but not yet available（[AI Agent Index](https://theaiagentindex.com/agents/meta-muse)）；且密钥托管模型仍依赖 Meta 的客户端实现。**承诺≠交付**，但一旦交付，"本地=唯一可信边界"的话术要收窄为"本地=无需信任供应商的边界"。 |
| D | "主动性"的产品叙事：他们把主动性做成一等 UI 对象（Goals/Ideas 页、Space 持续指令、定时周报） | §1.1/1.2/1.5 | 中 | 我们的主动性（养护节拍器、提案槽、schedule 四件）内隐于工具与调度，桌面面没有"它正在替我盯什么"的可视对象——心智占有率吃亏。借鉴见 §三.5/§三.9，不预建。 |
| E | "入口越轻 + 记忆越深"的增长力学被 Instinct 证实（3 周 40% 交卡、连敏感信息者留存 80%） | §1.3 | 中 | 反例打脸"轻入口=安全选择"？不——它同时证明代价是敏感信息全交，与我们用户的数据边界相反。真正可取的是其**onboarding 启示**：让用户尽早尝到"被记住的好处"。与 [261005-external-ux-patterns.md](../261005-ceo-value-positioning/261005-external-ux-patterns.md) 的冷启动结论一致。 |
| F | 单主体假设被多主体形态侵蚀（CC 成员级授权、Space 多人+多 dot、Cowork 团队面） | §1.4/1.1/1.5 | 中低 | 本仓是"一把手总助"，单人立场是定位而非缺陷；但"一把手 + 秘书/家人协看"场景出现时，`draft/stable` 两级可见性与账本单 writer 需要扩展（[docs/operating.md](../../../docs/operating.md) §一 writer.lock）。已属带触发条件的延后项。 |
| G | 捆绑定价压垮独立订阅位 | dots 含在 Pro/Business Premium、Muse 免费+$20/$100 档（定价矛盾见 landscape 未证实清单） | 低 | 我们本就不是独立 App、随 DSH 分发，无订阅位可被压；真正暴露的是 DSH 平台自身的定价位。 |
| H | "个人 agent"品类叙事冷却（Muse 日均净新增 -62.4%，landscape §速览/一） | landscape 转述华尔街见闻 10-12 数据 | 低 | 对本仓中性偏正面：新颖性退潮后存活靠习惯与信任——恰是 working folder 的长坡。风险仅在对外叙事借势时被连带冷却。 |

【推断】综合：**A/B 是真威胁但可由"知识级治理 + 边界归属"对冲；C/D 是话术与叙事层威胁；E–H 是观察项。**
没有任何一条威胁到核心命题本身——因为没有任何一家在做"严格本地的领域判断力 + 人审知识治理"。

### 2.3 逐维度对比表（每格标来源；我们侧标 repo 路径）

| 维度 | dots | Muse | Instinct | 本仓 |
|---|---|---|---|---|
| 部署位置与数据边界 | 专用云电脑；本地访问可选、默认关（[MIXED](https://mixed-news.com/en/openai-chatgpt-dots-exclude-pro-eea-switzerland-uk/)） | 每用户 Muse Secure VM；Confidential VM 承诺中（[PPC Land](https://ppc.land/meta-puts-an-ai-agent-that-buys-things-inside-whatsapp-us-only/)） | 云端 VM + secure vault（[The Verge](https://www.theverge.com/tech/1008254/instinct-agent-ai-hands-on-muse-dots)） | **严格本地** dataDir，双 home 隔离（[README.md](../../../README.md)；[docs/home.md](../../../docs/home.md) §一） |
| 入口 | ChatGPT/Slack/Teams/SMS/语音；桌面创建（§1.1） | App/WhatsApp/网页；眼镜计划中（§1.2） | SMS/电话/邮件/语音，无 App（§1.3） | 仅 DSH Web/Desktop，**不做 IM**（[README.md](../../../README.md)） |
| 个性化与记忆 | 主动形成记忆；删 dot 才能清（§1.1） | person pages 每小时编译；memory files 可读可编辑（§1.2） | 偏好记忆；主动补上下文；数据飞轮（§1.3） | memory/ 一条一文件 + archive；摘要有界、provenance 必填（[docs/home.md](../../../docs/home.md) §一/§三） |
| 领域深度与角色内容 | 泛助理 + 专业 dot（企业 beta，接系统与治理）（§1.1） | 泛助理 + 15 连接器（Small Business）（[PPC Land](https://ppc.land/metas-muse-agent-gains-access-to-ad-accounts-and-15-business-tools/)） | 消费生活纵深（旅行≈一半流水）（§1.3） | **管理岗基座 + 专家包**；P1 三层拆解判据（[README.md](../../../README.md)） |
| 治理与人审 | 四档规则 + 自动审查；Enterprise 管理员开关（§1.1） | Sentinel + 审批卡 + 最小授权；"nothing publishes…without your approval"（§1.2） | trusted interpersonal network，关系→授权分级（§1.3） | knowledge `draft→stable` 人审；skill `propose→approve→land`；账本权限三分（[docs/home.md](../../../docs/home.md) §二；[docs/operating.md](../../../docs/operating.md) §二） |
| 信任与审计 | 平台侧监控可暂停 dot；用户可开云电脑看（§1.1） | 完整审计轨迹（已做+将做），存平台（§1.2） | 〔未证实〕 | `audit/approvals.jsonl` 逐行台账**在用户盘上**；`curate` 纯函数 20+ 检查；`skill-usage.json` 机器账本（[docs/home.md](../../../docs/home.md) §一/§四） |
| 商业模式与目标用户 | 订阅捆绑（Pro/Business Premium 含首只 dot）（§1.1） | 免费 + 订阅 + 广告生态；中小企业（§1.2 + landscape） | 免费 + 交易佣金；消费者（§1.3） | DSH 插件（B 底座 + 专家包）；一把手数字分身；学习产物=用户资产（[README.md](../../../README.md)；[docs/identity.md](../../../docs/identity.md)） |

---

## 三、借鉴清单（问题三，最重要的交付）

> 格式：借什么 → 来源与出处 → 对应本仓哪个面 → 已有/部分有/没有（repo 佐证）→ 采纳时机。
> 克制约束：只借思路不装包（根 [AGENTS.md](../../../AGENTS.md) 硬规则 7）；不为想象的未来预建（研发姿态 3）。

**1. 只读 proactive 档：给"无人值守的 turn"划工具红线**
- 借什么：dots 的 proactive research 机制——空闲巡检期工具被限制为只读（不发消息、不改内容、不操控环境），
  动作只在有人看着的会话里按档授权（§1.1）。
- 来源：[GIGAZINE 2026-09-30 转述官方公告](https://gigazine.net/news/20260930-openai-dots/)；
  [MIXED 2026-09-30 逐字转引官方帮助中心](https://mixed-news.com/en/openai-chatgpt-dots-exclude-pro-eea-switzerland-uk/)。
- 对应面：**工具动词面 + host 节拍器**——`curate` 养护 turn（[docs/home.md](../../../docs/home.md) §四）
  与 `schedule_*` 定时任务（[README.md](../../../README.md) 养护定时节）都是无人值守 turn。
- 已有/部分有/没有：**部分有**。权限三分先例在账本（[docs/operating.md](../../../docs/operating.md) §二）；
  组合裁剪先例在 profile patch（headless 显式 disabled schedule 行）。没有的是"无人值守 turn 的工具级只读约束"
  ——养护 turn 拿的是全工具。
- 时机：**现在就值得做纪律版（零代码）**——家手册写明"无人值守 turn（养护/定时）不做记忆写入门之外的状态变更、
  不触碰对外动词"；机制级 enforce（动词档位参数）等真实出现无人值守自动研究任务再议。

**2. Sentinel 式 egress gate：出站检查位独立于 agent 本体**
- 借什么：Muse 的出站闸门——任何对外动作过独立的 Sentinel，模型自觉不是安全边界（§1.2）。
- 来源：[PPC Land 2026-09-09 转述官方《How We Built Safety Into Muse》](https://ppc.land/meta-puts-an-ai-agent-that-buys-things-inside-whatsapp-us-only/)。
- 对应面：**写入面与对外出口**。本仓没有对外投递动词（不做 IM），最接近的"出站"是技能/知识写入面与交付稿。
- 已有/部分有/没有：**部分有**——`curate` 查技能文本里的活凭据（"写入面即攻击面"，
  [docs/home.md](../../../docs/home.md) §四）；`complete` 无逐字证据在工具边界被拒（[docs/operating.md](../../../docs/operating.md) §二）。
  没有：独立于模型自觉的出站检查位。
- 时机：**触发条件再议**——将来加任何"替本人对外发送"动词之前，必须先立此检查位（写进呈批卡）；
  现在只登记为设计判据。

**3. banner blindness 论证：审批只设在难撤销的操作上**
- 借什么：Muse 设计文档的治理判据——结构化审批卡是"非协商的确定性界面元素"，但审批**只设在难以撤销的动作上**，
  理由是每步都弹审批会训练出对什么都点批准（§1.2）。
- 来源：[PPC Land 2026-09-09 转述《How We Designed Muse》](https://ppc.land/meta-puts-an-ai-agent-that-buys-things-inside-whatsapp-us-only/)。
- 对应面：**经营账本动词分档 + 未来一切动词设计**。
- 已有/部分有/没有：**大部分已有**——普通进展自动留存 / 确认性变化走明确指令 / 推断性变化只走提案
  （[docs/operating.md](../../../docs/operating.md) §二）；摘要预算闸门只堵记忆行不堵线索
  （[docs/home.md](../../../docs/home.md) §三）是同一判据的另一处落地。
- 时机：**现在就值得（零代码）**——把该论证作为"动词分档"的判定理由引用进下一次动词变更的设计记录
  （note 的判定记录面），不是新机制。

**4. 审计轨迹带"计划做什么"：审计不只是追溯**
- 借什么：Muse 的审计轨迹包含"已做了什么 + **计划做什么**"（§1.2）。
- 来源：同上（PPC Land 转述官方安全文档）。
- 对应面：**治理台账 + 经营桌面**——`audit/approvals.jsonl`（[docs/home.md](../../../docs/home.md) §一）
  与桌面投影（[docs/operating.md](../../../docs/operating.md) §三）。
- 已有/部分有/没有：**部分有**——回执逐条渲染、pending 提案阻止"处理路径回桌面"；没有"接下来要做什么"的
  预告面（v2 reminders 是有意保留的恒空占位）。
- 时机：**触发条件再议**——reminders 通道落地时一并设计预告面；真用出现"不知道助手在干嘛"的摩擦才动。

**5. Space 页面挂持续指令：常驻任务从对话拿出来、变成页面属性**
- 借什么：dots 的 Space 页面可设持续指令（"每天检查 X、把结果更新到这里"），评论可派任务给特定 dot（§1.1）。
- 来源：[GIGAZINE 2026-09-30 转述官方](https://gigazine.net/news/20260930-openai-dots/)。
- 对应面：**schedule 四件 + research/ 房间**——`schedule_create`（prompt+title+after_seconds，
  [README.md](../../../README.md)）与 parked 线索（[docs/home.md](../../../docs/home.md) §二）。
- 已有/部分有/没有：**部分有**——能定时、能带 prompt；没有"指令绑定目标对象（盯哪条线索、结果回写哪里）"
  的结构与提醒。
- 时机：**触发条件再议**——真用出现"想让助手定期盯某条线索并回写"再立卡；短期零成本动作＝手册的 schedule
  提示里建议 prompt 写明目标房间。

**6. 专用 ID / 能力域凭据最小化：一个能力域一个身份**
- 借什么：dots 给每只 dot 配专用 ID 管理访问权，企业专业 dot 由企业配置专用 ID、凭据与可访问系统（§1.1）。
- 来源：[GIGAZINE 2026-09-30 转述官方](https://gigazine.net/news/20260930-openai-dots/)。
- 对应面：**身份面与治理遮蔽**——行 id 前缀"一个专家一个前缀"（[docs/identity.md](../../../docs/identity.md) §一）
  与 `assistant-ov-shield` 的 `denyToolPrefix`/`denyServerResources`/`shadowSkills` 三键（同上 §一 第 2 行）。
- 已有/部分有/没有：**部分有**——前缀即能力域命名空间、遮蔽行即 deny 面；没有"按专家收敛凭据与数据目录"
  的装机检查（O5 面）。
- 时机：**触发条件明确**——出现第二个专家包并装时，把"按前缀收敛工具/凭据"落成 expert-setup 的检查项；
  现在只记录判据。

**7. 记忆可直接读改 + 可清除：他们刚当卖点的东西是我们的地基**
- 借什么：Muse 设计文档明确 "memory files are readable and editable directly"；对照 dots"删 dot 才能清记忆"
  （§1.2/1.1）。
- 来源：[PPC Land 2026-09-09](https://ppc.land/meta-puts-an-ai-agent-that-buys-things-inside-whatsapp-us-only/)；
  [MIXED](https://mixed-news.com/en/openai-chatgpt-dots-exclude-pro-eea-switzerland-uk/)。
- 对应面：**P3 与四房间根本设计**（[README.md](../../../README.md)；[docs/home.md](../../../docs/home.md) §一/§四）。
- 已有/部分有/没有：**已有，且是本命**——人可读文件、可 git、curate 报烂文件、退役走 archive 不删可恢复。
- 时机：**无动作**。用途是定位话术：头部厂商的设计文档验证了我们 9 月就定下的根基（P3），可直接引用作旁证。

**8. 实时/后台分档与模型分级：always-on 的成本纪律**
- 借什么：Instinct 的任务调度——实时与后台分档、后台批推理（3–8 倍效率）、复杂任务给前沿模型、
  简单抽取给便宜模型（§1.3）。
- 来源：[36kr 创始人访谈转述 2026-10-10](https://eu.36kr.com/en/p/4019986928029832)。
- 对应面：**平台面，不是本仓面**——本仓不控 adapter 与调度；DSH 平台事实的家在 `vendor/dsh`（硬规则 2）。
- 已有/部分有/没有：**没有，且不该有**——本仓无对应缝。
- 时机：**平台出现模型路由/调度能力再议**（不预建）。当前同方向已有物：`curate` 的技能退役检查
  （90 天阈值，[docs/home.md](../../../docs/home.md) §四"死技能每请求都在付费"）——同一成本意识的本地版。

**9. Ideas 式建议位：从目标与模式生成"下一步"**
- 借什么：Muse 的 Ideas 页——从用户的目标与行为模式生成建议，回应"agent 能做的太多、人不知从哪开始"（§1.2）。
- 来源：[PPC Land 2026-09-09 转述《How We Designed Muse》](https://ppc.land/meta-puts-an-ai-agent-that-buys-things-inside-whatsapp-us-only/)。
- 对应面：**桌面摘要 + goal 提案槽**——开放线索标题已进摘要（[docs/home.md](../../../docs/home.md) §三）；
  goal 完成时自动排提案槽（`goalProposalTurns`，[docs/home.md](../../../docs/home.md) §二）是"自动排下一步"的先例。
- 已有/部分有/没有：**部分有**（提案槽）；没有主动建议位。
- 时机：**触发条件再议**——真用出现"用户不知道该让助手干嘛"的摩擦再议；这是模型可见面新能力，须呈批。

**未入选（诚实记录）**：dots 的拟人吉祥物与"新员工"话术、Instinct 的 agent-to-agent 社交网络、
CC 的家庭多主体共享、Muse 的代购物（浏览器代操作）——分别与"专业纵深""单主体辅助本人""不做 IM"
"对外出面权在本人"的既定立场相抵，属差异而非欠账。

---

## 附：本档局限与最大不确定点

1. **dots 官方页逐字话术未核**（openai.com / help.openai.com 全程 403）：机制事实有两个以上独立二手源交叉
   （GIGAZINE、MIXED、Willison 现场记录、Mashable），但官方原文的措辞级细节（如档位名称的官方译名）未对过原文。
   **2026-10-12 复核：curl 直连与 jina reader 均被 Cloudflare "Just a moment" 挑战页挡下——确认为站点反爬而非网络问题**。
2. **Muse 定价已收敛（2026-10-12 补采）**：三档（免费 1 亿 token/周、Power $20/月 = 5 亿/周、Maximum $100/月 = 30 亿/周）获 [MarketBeat/Yahoo 09-21 全文](https://finance.yahoo.com/technology/ai/articles/meta-muse-agent-wall-street-120000930.html)与 [AI Agent Index 09-29 独立核验](https://theaiagentindex.com/agents/meta-muse)两个独立源一致，官方 newsroom 一手证实 freemium 形态（未列档名）；$37/月成本与 -62.4% 净新增仍是二手转述（landscape 姊妹档未证实清单）。
3. **Muse "built for goals, not prompts" 与《How We Designed Muse》细节**：官方文档正文未能直接抓取，
   机制细节取自 PPC Land 的逐段转述（该源内部引用一致、与 GIGAZINE 交叉吻合，置信度尚可）。
   **2026-10-12 补采后大幅收紧**：Meta newsroom 一手全文已读得（Sentinel 系统级隔离、凭据 secure storage、
   完整审计轨迹含"计划做什么"、可指令 "forget"、Stripe Link 一次性卡号与购买保护、"negotiate on their behalf"），
   PPC Land 的转述与之一一吻合；[AI Agent Index 09-29](https://theaiagentindex.com/agents/meta-muse) 亦独立核验同批机制。
   仅《How We Designed Muse》设计文档全文仍未见。
4. **CC 的机制细节**多来自转载（blog.google 正文抓取被截断、窓の杜转述），量级为"简略对照"档。
5. **Instinct 的权限细节〔未证实〕**：trusted interpersonal network 只有访谈转述，无产品文档。
