---
topic: 定位
intent: "把近月 personal agent 的『主动性』拆到用户体验机制层（触发/送达/理由/开关/打扰预算/找人接缝），用逐字一手来源回答『用户到底看到什么』，并记录 OpenAI 把 Pulse 下线重做成 Scheduled tasks 这次公开复盘。"
---

# 261018 · 主动性的用户体验机制（proactive UX mechanics）

> 调研日期 2026-10-18。本档问的是**机制**不是新闻：主动性在每一家到底被做成了什么可指认的
> UI 对象、什么触发、什么送达、什么时候来找人。**不重复** 2026-10-12 两档已有的内容——
> 能力形态与生态时间线在 [261012-personal-agent-landscape.md](../../../research/261012-personal-agent-landscape/261012-personal-agent-landscape.md)，
> 机制级对照本仓与借鉴清单在 [261012-personal-agent-differentiation.md](../../../research/261012-personal-agent-landscape/261012-personal-agent-differentiation.md)。
> 本档只写它们没写的：**主动性作为用户可见对象的构造方式**，以及它们偏"能力形态与治理"、对"主动性 UX 怎么呈现"较薄的部分。
>
> 标注约定：〔一手〕＝官方帮助中心/官方文档/官方公告原文，本轮实际读到的；〔一手·存档〕＝官方页仅经存档读到；
> 〔二手〕＝媒体转述（注明转述对象）；〔未证实〕＝本轮未找到可核来源；〔标题级〕＝只读到标题/搜索结果摘要，正文未读。
> 【推断】＝从证据出发的判断，不是事实本身。
>
> **本轮取证环境限制（影响全档置信度）**：`web.archive.org` 与 `archive.ph` 在本环境**网络不可达**
> （curl 15s 超时，`web_fetch` 亦失败），因此 2026-10-12 两档赖以读 OpenAI 官方页的存档通道本轮**失效**；
> `openai.com` 与 `help.openai.com` 直连仍为 403（浏览器 UA 亦无效），`r.jina.ai` 超时；
> `support.google.com`、`github.com`、`4sysops.com` 本轮抓取超时/403。凡是只能靠二手结论的部分，逐条标出。

---

## 〇、本档相对 261012 两档的增量边界

| 维度 | 261012 已有（本档不重复，链接过去） | 本档增量 |
|---|---|---|
| dots 的主动权 | "空闲时段做 proactive research，工具被限制为只读"〔[差异化 §1.1](../../../research/261012-personal-agent-landscape/261012-personal-agent-differentiation.md)〕 | 只补"送达面/开关面"的欠账标记（本轮未取得新证据） |
| Muse 的可见清单 | Goals 页 / Ideas 页 / 审批卡 / banner blindness 论证〔[差异化 §1.2](../../../research/261012-personal-agent-landscape/261012-personal-agent-differentiation.md)〕 | Muse 的第五类 UI 对象（Activity / Artifacts）与"判断何时值得打扰"的设计师原话〔二手〕 |
| Claude 的二档 check-in | "默认行动前先问；可切换持续干、只在需要细看时来问"〔[差异化 §1.5](../../../research/261012-personal-agent-landscape/261012-personal-agent-differentiation.md)〕 | **三档模式的逐字命名、权限矩阵、每任务审批字段、Scheduled 页、降级规则、官方自认风险**（本轮最大增量） |
| 触发/送达/开关/预算/接缝六问 | 未系统回答 | 本档主体（§二）+ 速览表（§一） |
| 主动性的**下架**记录 | 未收录 | Pulse 于 2026-06-17 被下线、由 Scheduled tasks 取代，含 OpenAI 官方复盘原话（§2.1） |
| Lindy / Poke / Martin | 261012 只在"垂直总助 SaaS"一笔带过 | Lindy 的机制细节（本轮第二增量）；Poke/Martin 记为未证实 |

---

## 一、速览表（产品 × 触发 / 送达 / 开关对象 / 打扰预算 / 找人接缝）

> 空格 = 本轮**未找到**一手表述，不代表产品没有；逐格来源见 §二。

| 产品 | 触发模型 | 送达面（用户在哪看到） | 开关与一等 UI 对象 | 打扰预算 | 找人接缝 |
|---|---|---|---|---|---|
| **OpenAI ChatGPT：Pulse（2025 上线，**2026-06-17 下线**）** | 定时（每天早晨）＋ 兴趣/聊天史/反馈/已连应用 | 一叠卡片（"a series of easy-to-read cards"） | 未见独立开关清单（本轮仅二手） | 未见 | 未见 |
| **OpenAI ChatGPT：Scheduled tasks（2026-06 起取代 Pulse）** | 定时（具体时刻，或 morning / afternoon / evening 时段）＋"有重要事时通知你" | 专用 **Scheduled 页**（看下次何时运行）＋通知 | Scheduled 页 = 单一管理位；可 pause / resume / edit / delete | 未见配额（本轮仅二手） | 未见 |
| **Anthropic Claude（Cowork 并入 Claude）** | 定时：hourly / daily / weekly / on weekdays / **manually**（按需跑） | ①Chat 里的结果（"messages you the outcome… rather than showing you every step"）②**Scheduled 页**看 upcoming + past runs ③手机推送（完成 / 需要你点头时） | **每任务一个 "approval mode" 字段**；Scheduled 页可 pause / resume / delete / run on demand | 无打扰配额；两条可查的"预算"是**算力额度**（Auto 模式更耗用量）与**审批硬底线** | 三档审批模式 + 需授权时**降级为逐步问**；永久删除在任何模式都要问 |
| **Lindy** | 定时（daily/weekly/monthly，默认 **daily 9:00 AM**）＋**事件**（邮件收/发、Slack 消息、日历事件开始、会议结束…）＋ 人话 **Smart Filter** 收窄 | **default proactive channel**（默认）／Lindy chat／短信（手机已验证）／Slack DM；团队 routine 回 Slack 线程或指定频道；电话外呼 | **Routines 页**（Personal / Workspace / **Discover** 三 tab）；内置 routine **逐项开关**，按已连账号分别生效；Discover 模板一键添加 | 无消息级配额；有**呼叫时段**（对方当地时间 8:00–21:00）与 **credits 上限**（按成员/工作区，超限暂停计费动作） | 每连接器 **Guardrails**：`Always allow` / `Ask for approval`；Slack 线程里 **Approve / Deny** 按钮；一次性批准 ≠ 改规则（`Always allow` 才改规则） |
| **Meta Muse** | 目标驱动（Goals 承载）＋ 可主动联系用户 | 主聊天（Main Chat）＋ 审批卡 ＋ 活动摘要 | Goals 页（长期目标可追踪）＋ Activity（后台工作摘要与完整活动记录）〔二手〕 | 官方称"主动发消息的门槛设得很高"（转述，见 [差异化 §1.2](../../../research/261012-personal-agent-landscape/261012-personal-agent-differentiation.md)）；另有"判断什么时候值得打扰用户"的设计师表述〔二手〕 | 审批只设在**难以撤销**的动作上（banner blindness 论证，见 [差异化 §1.2](../../../research/261012-personal-agent-landscape/261012-personal-agent-differentiation.md)） |
| **OpenAI dots** | 空闲 proactive research（**只读**）＋ 定时持续指令〔[差异化 §1.1](../../../research/261012-personal-agent-landscape/261012-personal-agent-differentiation.md)〕 | 见 [差异化 §1.1](../../../research/261012-personal-agent-landscape/261012-personal-agent-differentiation.md)；本轮无新增 | 四档用户规则〔同上〕 | 未见 | 四档规则之一＝"动手前先问"〔同上〕 |
| **Google CC / Gemini** | 定时（每天早晨 "Your Day Ahead"）〔见 [landscape §四](../../../research/261012-personal-agent-landscape/261012-personal-agent-landscape.md)〕 | 家庭共享晨报〔同上〕 | 本轮未取得（support.google.com 超时） | 本轮未取得 | 信息不足会反问并更新群体记忆〔同上〕 |
| **Poke / Martin** | 本轮抓取失败（见 §六） | — | — | — | — |

---

## 二、逐产品机制细节

### 2.1 OpenAI：Pulse 下线 → Scheduled tasks——主动性被"重做"的一次公开复盘

这是本档最有信息量的一段：**一个把主动性做成"主动推送一叠卡片"的产品被官方撤掉，换成"用户自建的定时任务 + 一个专门看它们的地方"**，并且官方给了理由。

#### 2.1.1 Pulse 的机制（上线形态）

- 触发＝定时＋个性化输入：Pulse"每天早晨"给"个性化更新"；依据 = 用户的兴趣、聊天历史、**反馈**，
  以及可选连接的 Google Calendar / Gmail 等应用〔二手转述，[Digit 2026-06-18](https://www.digit.in/news/general/openai-is-retiring-chatgpt-pulse-and-replacing-it-with-scheduled-tasks-here-is-why.html)〕。
- 送达面＝卡片流：官方描述"自动收集信息并以**一叠易读卡片**呈现"，不需要用户先开口〔同上，二手〕。
- 内容类型＝提醒、学习建议、旅行建议、会议准备、长期关注话题的更新〔同上，二手〕。
- **本轮取不到 2025 年发布时的官方原文**：`openai.com/index/introducing-chatgpt-pulse/` 403，
  存档通道不可达。Pulse 的**精确上线日期**在本轮属〔未证实〕（Digit 只说 "launched by OpenAI last year"，即 2025 年）。

#### 2.1.2 下线：官方原话与替代品

- 官方账号原话（2026-06-17，经 Digit 逐字引用）："We're also sunsetting Pulse in the next 14 days,
  but you can keep getting daily updates—use scheduled tasks to get a daily briefing based on your interests,
  past chats, and connected apps."〔一手帖文经[二手转引](https://www.digit.in/news/general/openai-is-retiring-chatgpt-pulse-and-replacing-it-with-scheduled-tasks-here-is-why.html)〕
- 官方给的理由（Digit 引 OpenAI 说明）："Proactive work remains an important part of making ChatGPT more useful.
  With Pulse, we learned that **proactive experiences are most useful when they're personalised, action-oriented,
  and steerable by the user**. We also saw **strong engagement with tasks after introducing them into the Pulse
  surface, showing that people value having a dedicated place for proactive work**."〔同上〕
- 替代形态：**ChatGPT 里新增专用 Scheduled 页**——"a single place to manage all active tasks"，可看
  upcoming tasks / 下次运行时间，并 pause、resume、edit、delete；可定具体时刻，也可选
  **morning / afternoon / evening 这类粗时段**；"ChatGPT can even notify users when there is something important
  to know."〔同上，二手〕

**机制读数**【推断】：官方复盘把"主动性的价值"归到三条判据上——**个性化 / 面向行动 / 用户可操纵（steerable）**；
并明确说用户偏爱**一个专门放主动性产出的地方**（dedicated place）。这等于官方否掉了"主动性 = 每天早晨推一叠
通用卡片"，保留了"主动性 = 用户自定周期 + 一个管理页 + 有事才通知"。本仓做"窄场景、非 IM"的主动性时，
这三条判据可直接当验收面（而不是当卖点）。

#### 2.1.3 Scheduled tasks 的机制（本轮只能到二手）

- "ChatGPT 能提醒你任务、事件与更新"〔[标题级](https://www.techlusive.in/artificial-intelligence/chatgpt-can-now-remind-you-about-tasks-events-and-updates-automatically-1666453/)，正文未读〕。
- 一个"专用管理中枢"〔标题级：[4sysops](https://4sysops.com/archives/openai-introduces-dedicated-management-hub-for-chatgpt-scheduled-tasks/)，站点 403〕。
- 6 月 18 日另有国家级通讯社消息《OpenAI Launches Scheduled Tasks in ChatGPT》〔[qna.org.qa](https://qna.org.qa/en/news/news-details?id=openai-launches-scheduled-tasks-in-chatgpt&date=18/06/2026)，本轮 curl 超时未读〕。

#### 2.1.4 与 dots 的分工（本档的对照线索）【推断】

Pulse 下线（2026-06）早于 dots 发布（2026-09）。结合 [差异化 §1.1](../../../research/261012-personal-agent-landscape/261012-personal-agent-differentiation.md)
记的 dots"空闲 proactive research 限只读"，可以看出一条连续性：OpenAI 一侧的主动性在半年内从
**"每天早上给你看一叠（你没法改的）卡片"** 收敛为 **"你定周期、有管理页、动作按档授权"**。
即主动性从**内容产品**退回到**任务产品**。

---

### 2.2 Anthropic Claude（Cowork 并入 Claude）——本档机制密度最高的一家

来源全部为 Claude 帮助中心原文，本轮以 `.md` 形态读全文（该站文章 URL 加 `.md` 返回纯文本，
是本轮绕过渲染壳的有效通道）。五篇：Scheduled tasks、Get started、Use safely、Dispatch、Web/desktop/mobile。
注意该站页面只标 "Updated this week"，**没有版本日期**，故下文不标具体版本。

#### 2.2.1 触发与周期：只有"定时"与"按需"，没有空闲巡检

- "Scheduled tasks allow you to delegate work to Claude Cowork by creating tasks that **run automatically on a
  recurring basis, or on demand**. Instead of starting each task from scratch, you describe it once and Claude
  handles it on your schedule—delivering finished outputs like reports, briefings, and summaries every time."
  〔一手：[Schedule recurring tasks](https://support.claude.com/en/articles/13854387-schedule-recurring-tasks-in-claude-cowork)〕
- 粒度＝**hourly / daily / weekly / on weekdays / manually**（手建表单里是这五个选项之一）〔同上〕。
- 用户不必写 cron：可以直接说 "Every Monday at 9 AM, summarize last week's messages in my team's Slack
  channels."，然后"Answer any questions Claude asks about the schedule or the task"，再
  "Review the task name, schedule, and instructions Claude proposes, then click **Schedule**"〔同上〕。
- 运行位置与"关掉电脑还算不算数"：Scheduled tasks **run remotely**，"so they run on their cadence **even when
  your computer is asleep or the Claude Desktop app is closed**"；但"**If a scheduled task requires local files or
  apps, it will only run locally.**"〔同上〕
- 每次运行＝一个独立 Cowork session："Each scheduled task runs as its own Cowork session. You can review the
  results when they're ready, just like any other task."〔同上〕
- **没有**"空闲时自己去巡检"这一类触发：官方列出的五类用途（daily briefings / weekly reports / recurring
  research / file organization / team updates）全部挂在用户设定的 cadence 上〔同上〕。

#### 2.2.2 送达面：结果，而不是过程

- 官方原话（Dispatch 篇）："Claude **messages you the outcome** (a spreadsheet, a memo, a comparison table,
  a pull request) **rather than showing you every step of the process**. You'll get a **push notification on your
  phone when a task is done or when Claude needs your go-ahead**."〔一手：[Assign tasks from anywhere](https://support.claude.com/en/articles/13947068-assign-tasks-from-anywhere-in-claude-cowork)〕
- 结果的归宿是"一个待看的地方"：左栏 **Scheduled** 页可"Review upcoming and past runs"，逐项点进去改指令或
  改周期，并 pause / resume / delete / 按需跑〔一手：[Schedule recurring tasks](https://support.claude.com/en/articles/13854387-schedule-recurring-tasks-in-claude-cowork)〕。
- 会话可以在多个面之间接续："**Check in from anywhere**: Open the same session on another surface to monitor
  progress, **answer Claude's questions, or redirect the work**."〔一手：[Get started with Claude Cowork](https://support.claude.com/en/articles/13345190-get-started-with-claude-cowork)〕
- **没有"为什么现在告诉你"的理由行**：本轮读到的三篇送达相关文档里，正文全是结果与动作，未见
  why-now / what-changed 式的证据行〔本轮检索事实：文档中不存在该表述〕。

#### 2.2.3 开关与一等 UI 对象：审批模式是"每任务的一个字段"

手建表单的字段清单里，"**The approval mode**"与任务名、prompt、频率、模型、工作文件夹并列
〔一手：[Schedule recurring tasks](https://support.claude.com/en/articles/13854387-schedule-recurring-tasks-in-claude-cowork)〕。
即：**主动性档位不是全局设置，而是每个任务自己的属性**。全局侧另有管理员开关（Team/Enterprise 管理员控制
Cowork 访问与 Auto 模式是否可用，见 §2.2.4）〔一手：[Use safely](https://support.claude.com/en/articles/13364135-use-claude-cowork-safely)〕。

#### 2.2.4 三档审批模式（逐字＋权限矩阵）

模式名与旧名的沿革是官方的：`Manually approve (Manual)`，**formerly "Ask before acting."**；
`Automatically approve (Auto)`；`Skip all approvals (Skip)`，**formerly "Act without asking."**
可"change the mode at any time from the mode selector in the chat box"〔一手：[Get started](https://support.claude.com/en/articles/13345190-get-started-with-claude-cowork)〕。

官方权限矩阵（连接器工具权限 × 模式）〔同上〕：

| | Connector tool: "Always allow" | Connector tool: "Needs approval" | Connector tool: "Blocked" |
|---|---|---|---|
| **"Manual" mode** | Approved | Asks for permission | Denied |
| **"Auto" mode** | Read-only tools are approved；For write/delete tools, **Claude decides** | Claude decides | Denied |
| **"Skip" mode** | Approved | Approved | Denied |

- **Auto 的自审与降级规则（本档最有价值的单条机制）**："Claude reviews each action for safety (such as
  checking for data exfiltration or prompt injection) and automatically blocks anything it determines to be unsafe.
  When an action is blocked, Claude looks for a safer way to finish the task or pauses and asks you directly.
  **If Claude keeps running into blocks, it switches back to asking your permission for each step.**"〔同上〕
  ——即"少打扰"档位自带**失败后退回多打扰档**的规则，而不是一路静默到底。
- **Auto 的成本被明文写进文档**："Because Claude does this extra checking for you, **auto mode consumes more of
  your usage limit than the other modes**."〔同上〕——主动性档位与算力预算是耦合的。
- **硬底线（任何模式都不放）**："**Claude always asks before permanently deleting files, in any mode.**"；
  另有 "Deletion protection: Cowork requires your explicit permission before permanently deleting any files.
  You'll see a permission prompt and must select 'Allow'"〔一手：[Use safely](https://support.claude.com/en/articles/13364135-use-claude-cowork-safely)〕。
- **企业侧覆盖**：管理员可关掉 Auto（关掉后"the mode doesn't appear in your mode selector"），
  也可以"require per-task approval for write-capable connector tools, so 'Always allow' preferences may not apply"
  〔一手：[Get started](https://support.claude.com/en/articles/13345190-get-started-with-claude-cowork)〕。
- 官方对 Skip 的措辞是劝退式："Only use this when you completely trust every action, connector, file, app, etc."〔同上〕。

#### 2.2.5 打扰预算：官方没有"投递配额"，只有算力额度与安全底线

本轮读到的 Claude 文档里，出现"预算"字样的只有用量（auto 模式更耗额度、Usage 页）〔一手：[Get started](https://support.claude.com/en/articles/13345190-get-started-with-claude-cowork)〕；
**未见**任何"每天最多打扰 N 次 / 静默时段 / 合并投递"的表述。降噪靠的是**模式档位**与
**"没有 block 就别来找我"**：正常路径只有两个推送时点——**任务完成**或**需要你点头**
（"when a task is done or when Claude needs your go-ahead"）〔一手：[Dispatch](https://support.claude.com/en/articles/13947068-assign-tasks-from-anywhere-in-claude-cowork)〕。

#### 2.2.6 找人接缝：什么时候找人、哪些动作要批

- 找人＝**要授权**（安全自审 block → 直接问用户）与**要判断**（Claude 建成任务前的澄清提问、多选回答）
  〔一手：[Schedule recurring tasks](https://support.claude.com/en/articles/13854387-schedule-recurring-tasks-in-claude-cowork)；[Get started](https://support.claude.com/en/articles/13345190-get-started-with-claude-cowork)〕。
- 审批的对象是**具体动作/具体连接器工具**，不是"整个任务"：矩阵按 `Always allow / Needs approval / Blocked`
  三态的**每个连接器工具**判定〔同上〕。
- **计算机操作（computer use）是例外，且官方自己点名**："Be especially cautious with computer use—Claude clicks,
  types, and navigates your screen directly, **without the permission checks that gate other Cowork tools**"；
  但同文又写 "When Claude uses your computer, **it asks for your permission before accessing each application**"
  〔一手：[Use safely](https://support.claude.com/en/articles/13364135-use-claude-cowork-safely)〕——即**按应用**授权，
  不按动作授权。这是"审批粒度"的一个真实分界线：文件/代码有闸门，屏幕操作只有应用级闸门。
- 日志面：官方列明"Actions taken by scheduled tasks running on your behalf"属于会被记录/可审计的内容
  〔同上〕。

#### 2.2.7 官方自认的失败形态（这家的"承认清单"最整齐）

全部出自同一篇官方安全文档〔一手：[Use Claude Cowork safely](https://support.claude.com/en/articles/13364135-use-claude-cowork-safely)〕：

1. **无人看管本身就是风险**：Scheduled tasks 一节开篇即"Claude can work when you're away from your computer
   entirely **and not watching**. Because you **can't monitor these tasks in real time**, take extra care when
   setting them up"。
2. **官方给出的四条自律规则**（等于承认了四类实际故障面）：
   "**Start simple.** Begin with low-risk tasks like generating summaries…"；
   "**Avoid sensitive data and consequential actions.** Don't schedule tasks that access sensitive files,
   **send messages on your behalf, make purchases**, or take other actions that are difficult to undo."；
   "**Review outputs after each run.**"；
   "**Pause tasks you're not actively using.** If you no longer need a scheduled task, pause or delete it rather
   than leaving it running in the background."
   ——即厂商明确不鼓励把"对外发送/花钱"放进无人值守通道。
3. **自审不是保证**："*Of course, no defense is perfect and no mode replaces your judgment. For work with real
   consequences—money, messages sent as you, important files—stay close and review what Claude does…*"
4. **注入面承认**："if Claude reads malicious content mid-task (a prompt injection), it could act on those
   instructions before you notice"，且"In 'Skip all approvals,' **nothing checks its actions**"。
5. **监控指令是"看模式不要看单条命令"**："you shouldn't expect to validate every individual command—instead,
   watch for unexpected patterns: Is Claude accessing files or websites you didn't mention? Is the task scope
   creeping beyond what you asked for?"——官方把"逐条审批"明确判为不可行，转而教用户看**模式异常**。

> 与本仓相关的一条**能力收缩记录**（非主动性本体）：Dispatch（手机派活给桌面）"**isn't available to new users**.
> If you already use Dispatch, you can keep using it for now"〔一手：[Dispatch](https://support.claude.com/en/articles/13947068-assign-tasks-from-anywhere-in-claude-cowork)〕。

---

### 2.3 Lindy——本轮唯一把主动性做成"完整产品面"的样本

来源：Lindy 官方文档，经其站点自带的 [llms-full.txt](https://docs.lindy.ai/llms-full.txt)（约 15 万字符）全文读得，
引用页为 [Routines](https://docs.lindy.ai/teammate/routines) 与 [Best Practices](https://docs.lindy.ai/start-here/best-practices)。
下文逐字引语与截图 alt 文本同源。

#### 2.3.1 触发：定时 ＋ 人可读的事件过滤器（本档最干净的一条分工）

- 定义："Each routine is three parts: a **trigger** (when it runs), a **prompt** (what to do, in plain English),
  and a **destination** (where the result goes). It isn't a separate bot, it's **automation attached to your Lindy**,
  which is what makes Lindy proactive: briefing you, prepping you for meetings, and tracking follow-ups without
  being asked."〔一手〕
- 两类触发："Run a routine on a **schedule** (daily, weekly, or monthly, the most common), or on an **event**:
  an email received or sent, a Slack message, a calendar event about to start, a meeting ending, and more."
  〔一手〕
- **Smart Filter**＝用自然语言收窄事件触发："A **Smart Filter** narrows event triggers in plain English, like
  *'only emails that promise a follow-up,'* **so it doesn't fire on everything**."〔一手〕——事件触发天生会过量，
  官方把"收窄"做成了触发器的一个字段（而不是让用户去写条件表达式）。
- 默认值：新 routine "**daily at 9:00 AM** until you change it"〔一手〕——即"主动性默认开在一个固定晨间时点"。

#### 2.3.2 送达面：一个"默认主动通道"，加上按 routine 可选的出口

- "Personal routines deliver to your **default proactive channel**, Lindy chat, a text message (if your phone is
  verified), or a Slack DM. Workspace routines post to a Slack thread reply or a specific channel."〔一手〕
- **默认静默**是本档最值得抄的一条：电话外呼 routine 的规则是"You **hear about the call only if the routine
  asks to be told**"〔一手〕——即"做完不必汇报"是默认，汇报要显式要求。
- 批量合并也有现成形态：Meeting prep 可选 "**Daily digest**: receive all meeting prep at a set time each day
  (e.g., 5:00 AM)"〔一手〕——把多次投递压成一次。

#### 2.3.3 开关与一等 UI 对象：Routines 页 = 三 tab + 逐项开关 + 模板库

- "Open the **Routines** page from the left sidebar to **review what's running**, toggle routines on or off, and
  add your own with **New**."〔一手〕
- 三个 tab：**Personal**（只对你自己）／**Workspace**（经 Slack 的团队 Teammate，只有管理员能建，
  其他人看到的是 *"Needs admin"*）／**Discover**（"a library of ready-made templates you can add in one click"）〔一手〕。
- 内置 routine 是**逐项开关**的清单（"you can turn on or off with a toggle, **per connected account**"）：
  Daily briefs / Email drafting / Email labeling / Urgent email alerting / Follow-up bumps / Meeting Recording /
  Meeting prep / Meeting scheduling；"Turning one off **stops it without removing it**."〔一手〕
- Discover 的卡片状态把"首次运行"做成了三种可解释态："**Ready** — add it in one click. **Needs setup** — shows
  exactly what's missing (like Gmail, Google Calendar, Slack, or meetings) with a **Connect** action right there.
  **Needs admin** — a team template you can add once a workspace admin sets it up."
  且"Click any card to **preview its trigger, scope, and prompt** before you add it."〔一手〕
- 口语建档："The easiest path is to type it in the **Describe your routine** box… Lindy fills in the name, trigger,
  and schedule for you. Suggestion chips and a shuffle button are there if you want ideas"；也可以直接在聊天里说
  "Every Monday at 9, check my inbox for emails from investors and alert me."〔一手〕

**机制读数**【推断】：Lindy 把"主动性"拆成了**可命名、可预览、可开关、可预览触发条件**的对象，并且
**模板库承担了"首批怎么让人看懂"的活**——用户不是在空白页上想"我能让它干什么"，而是在一份带状态
（Ready / Needs setup）的清单里挑。这直接对应 Muse Ideas 页要解决的问题（"agent 能做的太多，人不知从哪开始"，
见 [差异化 §1.2](../../../research/261012-personal-agent-landscape/261012-personal-agent-differentiation.md)），但 Lindy 的解法是**模板＋缺口提示**，
不需要模型猜用户想要什么。

**一点反证/边界**：Discover 的模板列表本身默认是"推荐位"（分组含 "Recommended"）〔一手，同页〕，
推荐逻辑未在文档中说明〔未证实〕。

#### 2.3.4 噪音治理四件套（本档最完整的一套）

1. **Dry run（试跑）**："A dry run fires a routine end to end on your real data and shows you exactly what it
   would have done, **without doing it**. Real triggers, real reads, real judgment, and **nothing sent, posted,
   or written**. Use it before you trust a routine to run unattended."
   调用方式是聊天："*Dry-run my morning briefing.*" / "*Test my promise tracker before I turn it on.*"〔一手〕
2. **脚本化（把"没变化"变成不叫醒）**："A normal routine is an alarm that wakes Lindy up to think through your
   instructions again on every trigger. **Run this as a script** turns those instructions into Python that runs
   instead."；每次运行有三种收尾——"**Finish on its own** — the run ends without waking Lindy: faster, cheaper,
   predictable. / **Leave Lindy a note** — Lindy wakes up, reads the original instructions plus the note, and
   handles the part that needs AI or tools. / **Crash** — Lindy wakes up to repair and test the script"。
   官方给的**正例**就是变更检测："*Check this public status page every 5 minutes and alert me only when it
   changes.*" ——"The script checks the page and remembers the last value, so **most runs end quietly and Lindy
   only wakes when something changed**."；**反例**是"Summarize my unread Gmail."（脚本拿不到凭据，
   每次都会叫醒 Lindy）〔一手〕
3. **用对话抑制噪音**（Best Practices 的"Give Lots of Feedback"）——逐字 UI 文案（文档内嵌截图 alt 文本）：
   Lindy: "heads up, new invoice from deel" → 用户: "**no need to flag invoices — finance has those covered.**"
   → Lindy: "**got it, i won't flag those going forward**"〔一手〕。
   另有一条同源示例："Texting Lindy 'auto-archive all my uber emails' and getting back 'done. i'll file those
   automatically from now on. you can tweak any of this in settings too'"〔一手〕
   ——**用户可以用一句自然语言关掉一类通知**，且系统回答"从今以后不再提醒"。
4. **时段与额度**：语音外呼有**呼叫时段 8 AM – 9 PM（对方当地时间）**与线路限制〔一手〕；
   团队侧有 **credits 上限**："Once the limit is reached, Lindy **pauses further credit-using actions** for that
   person. A task already running can finish and take usage beyond the cap."〔一手〕

**缺口（事实）**：本轮在 Lindy 全部文档里**没有找到消息投递的静默时段、每日次数上限或免打扰设置**——
唯一的时间窗是语音呼叫时段。这是"主动性产品化"最成熟的一家留下的空白。

#### 2.3.5 找人接缝：权限按连接器分档，批准按钮带"一次性 vs 改规则"

- 每个集成的 guardrails 只有两档：`Always allow`（"Writes without asking"）与 `Require approval`
  （"Asks in Slack before writing"）；MCP 服务器同构：`Always allow` — "Calls the server's tools without
  asking" / `Ask for approval` — "Asks first"〔一手〕。
- 官方 FAQ 的一句话划出审批线（本档最干净的"读/写分界"表述）："**Will Lindy do anything without my
  approval?** No. Anything with **outside impact** waits for approval, such as sending an email, updating a ticket,
  posting to another channel, or publishing a doc. **Read-only lookups from approved sources don't require
  approval.**"〔一手〕
- Slack 里的批准面："When Lindy needs approval, it posts **Approve** and **Deny** buttons in the thread.
  The person who asked can approve their own request, and so can any workspace owner or admin. Anyone else gets a
  private note to ask one of them."〔一手〕
- **一次性 vs 长期规则**（值得单独抄的设计）："**Approve** allows that one action and **changes nothing else**.
  **Always allow** changes the rule going forward: workspace-wide if an owner or admin clicks it, or just for that
  person if a member does."〔一手〕
- 反面：拒绝路径的文档只写了 Deny 按钮，未见"拒绝后如何记忆/如何不再问"的说明〔未证实〕。

#### 2.3.6 首次运行与"它替我盯着什么"

- 电话/短信入口自带首次运行设计：验证手机号后"Lindy sends you your **first message, already personalized with
  context from your email and calendar**. Just text back."〔一手〕
- "它替我盯什么"的可见清单＝ Routines 页本身（含 built-in 逐项状态）〔一手〕；
  另有"把手上的事全丢出去"的表述："**Get Things Out of Your Head.** 'Remind me Friday.' 'Tell me when Sarah
  replies.' 'Follow up with Acme if they go quiet for a week.' **Hand it the loop, then forget it.**"〔一手〕
  ——"loop（盯梢对象）"是被点名的概念，但没有独立的 Watching/盯梢页（与 Muse 的 Goals 页不同）。
- 7:30 AM daily brief 的构成（截图 alt 逐字）："weather, three upcoming meetings, **42 emails triaged, four
  replies drafted**, and **a request for approval to send Acme a SOC 2 report**"〔一手〕
  ——即摘要里**带工作量计数**（做了多少），这是本轮唯一见到的"隐性理由行"：不解释"为什么现在说"，
  但告诉你"我干了这些"。

---

### 2.4 Meta Muse（只补 261012 没写的 UI 对象清单）

- 一份中文 UX 拆解把 Muse 的交互框架列为五类具名对象：**Main Chat**（长期主对话，可持续追加要求）／
  **Goals**（可追踪的长期目标，在合适时机调整计划）／**Activity**（后台任务工作摘要＋完整活动记录，
  "让用户知道它做了什么、接下来准备做什么"）／**Approval**（对不可逆操作用确定性批准/拒绝卡）／
  **Artifacts**（按任务类型换界面：行程用 itinerary、花销用 dashboard、计划用清单或卡片）
  〔二手设计拆解，[uisdc](https://www.uisdc.com/muse-ai-hype)，作者称基于官方设计文档，本档未核原文〕。
- 同源引述的设计目标里有两条直接是主动性话术：**"判断什么时候值得打扰用户"** 与
  **"让一条真正有用的消息，在你未发出指令的情况下发送"**〔同上，二手〕。
- 【推断】Muse 与 Lindy 的差别在**可见性的落点**：Muse 把可见性放在"目标/活动"（我为什么做这些），
  Lindy 放在"规则/触发"（我什么时候会做）；Claude 放在"审批档位"（你能做到哪一步）。
  三家各占主动性可见性的一面，没人三面齐备。对照 [差异化 §1.2](../../../research/261012-personal-agent-landscape/261012-personal-agent-differentiation.md)
  的 Goals/Ideas 页事实，本档只补 Activity/Artifacts 两个对象与"值得打扰"这句判据。
- **Ideas 页**的原始出处仍是 [差异化 §1.2](../../../research/261012-personal-agent-landscape/261012-personal-agent-differentiation.md)（PPC Land 转述官方设计文档），
  本轮未取到新证据。

---

### 2.5 本轮未能推进的几家（只记欠账，不重复 261012）

- **OpenAI dots**：主动性机制（空闲只读巡检）已在 [差异化 §1.1](../../../research/261012-personal-agent-landscape/261012-personal-agent-differentiation.md)；
  本轮关于它的**送达面/开关面**没有取到新的官方文本（openai.com 403、存档不可达），故不写。
- **Google CC / Gemini Scheduled Actions**：`support.google.com/gemini/answer/16316416` 两次超时
  （web_fetch 与 curl 均失败），`blog.google` 的 CC 家庭晨报事实仍在 [landscape §四](../../../research/261012-personal-agent-landscape/261012-personal-agent-landscape.md)。
  **Gemini 定时动作的开关粒度与送达方式本轮属未证实。**
- **Instinct**：形态见 [landscape §三](../../../research/261012-personal-agent-landscape/261012-personal-agent-landscape.md)；本轮未取到任何一手主动性机制文档。
- **Poke / Martin**：见 §六。

---

## 三、跨家共性模式（6 条）

> 只写**至少两家有一手证据**的模式；单家的当特例写在 §二。

**P1. 主动性被产品化为一个"具名管理页"，而不是一个开关或一种智能。**
Lindy = Routines 页（"review what's running"，三 tab、逐项 toggle）〔一手〕；Claude = 左栏 Scheduled 页
（upcoming + past runs，pause/resume/delete/按需跑）〔一手〕；ChatGPT = Scheduled 页（"a single place to manage
all active tasks"）〔二手转述官方〕；Muse = Goals 页〔见 [差异化 §1.2](../../../research/261012-personal-agent-landscape/261012-personal-agent-differentiation.md)〕。
**四家里的三家把这个页面当作主动性的主界面**。
【推断】这一步解决的是"我不知道它到底在替我干什么"——比任何"主动性开关"都更根本。

**P2. 触发只有两类被真正产品化：定时、以及人可读的事件过滤器。**
定时粒度：Claude = hourly/daily/weekly/weekdays/manually〔一手〕；Lindy = daily/weekly/monthly，默认 daily 9:00 AM
〔一手〕；ChatGPT = 具体时刻或 morning/afternoon/evening 粗时段〔二手〕。
事件侧：Lindy 的 trigger 清单（邮件收/发、Slack 消息、日历事件开始、会议结束）＋ **Smart Filter**
（"so it doesn't fire on everything"）〔一手〕。
**"空闲巡检"只在云端大厂 agent 里存在（dots，且限只读，见 [差异化 §1.1](../../../research/261012-personal-agent-landscape/261012-personal-agent-differentiation.md)）；
Claude 与 Lindy 这两家文档最完整的 product 里根本没有这一类触发**〔本轮检索事实〕。

**P3. 送达＝"放进一个待看的地方"＋仅在两个时点推一条通知（完成 / 需要你点头）。**
Claude 逐字："messages you the outcome… rather than showing you every step"，
"a push notification on your phone **when a task is done or when Claude needs your go-ahead**"〔一手〕。
Lindy 的默认静默更极端："You hear about the call **only if the routine asks to be told**"〔一手〕。
**没有任何一家做"持续推流"或"边干边播报"**——过程留在页面上，只有结果与求批过通知。

**P4. 审批是"逐对象 × 逐动作"的分档，不是全局开关；且都区分"这一次"与"以后都这样"。**
Claude：每任务一个 approval mode 字段 × 每连接器工具三态（Always allow / Needs approval / Blocked）〔一手〕；
Lindy：每连接器 guardrails 两档，Slack 里 `Approve`（只批这一次，"changes nothing else"）vs
`Always allow`（"changes the rule going forward"）〔一手〕。
共同的**硬底线**是"不可逆动作任何档位都要问"：Claude "always asks before permanently deleting files, **in any mode**"〔一手〕。
【推断】这与 Muse 的 banner blindness 论证同源（[差异化 §1.2](../../../research/261012-personal-agent-landscape/261012-personal-agent-differentiation.md)）：
**审批要少而硬，靠"把审批绑在不可逆动作上"实现，不靠"把审批变轻"**。

**P5. 没有人做"打扰预算"（interruption quota）。** 本轮四家的可查"预算"都是别的东西：
Claude = 算力额度（"auto mode consumes more of your usage limit"）〔一手〕；Lindy = credits 上限 + 语音呼叫时段〔一手〕；
ChatGPT = 用量额度（口径见 [landscape §二](../../../research/261012-personal-agent-landscape/261012-personal-agent-landscape.md)）。
**静默时段 / 每日投递次数上限 / 免打扰，四家文档里一条都没有**〔本轮检索事实，含 Lindy 全文 3381 行〕。
真正在用的降噪手段是机制性的：**去重与变更检测**（Lindy 脚本模式"most runs end quietly and Lindy only wakes
when something changed"〔一手〕）、**批量合并**（Lindy daily digest 把一天的 meeting prep 压成一次〔一手〕）、
**用一句话关掉一类通知**（Lindy "no need to flag invoices"→"i won't flag those going forward"〔一手〕）、
**事件过滤器**（Smart Filter〔一手〕）。

**P6. 官方把"无人看管"和"审批疲劳"都当成要在文档里明说的风险，而不是藏起来。**
Claude 整节 "Be cautious with scheduled tasks"（因为"you can't monitor these tasks in real time"），
并明确劝阻把"代你发消息/购买/难撤销的动作"放进定时任务〔一手〕；dot 与 Muse 侧的同向表述见
[差异化 §1.1/§1.2](../../../research/261012-personal-agent-landscape/261012-personal-agent-differentiation.md)。
**共同句式是"别把不可逆的事放进无人值守通道"**——这条在四家都能找到对应物，是本轮最稳的跨家结论。

---

## 四、已知失败形态清单

### 4.1 官方自认（一手）

| 失败形态 | 官方原话/要点 | 出处 |
|---|---|---|
| 无法实时监督 | "you can't monitor these tasks in real time"；Scheduled tasks 是"away…and not watching"的场景 | [Claude · Use safely](https://support.claude.com/en/articles/13364135-use-claude-cowork-safely) |
| 自审非保证 | "no defense is perfect and no mode replaces your judgment"；Skip 模式"nothing checks its actions" | 同上；[Get started](https://support.claude.com/en/articles/13345190-get-started-with-claude-cowork) |
| 提示注入可在无人时生效 | "it could act on those instructions before you notice" | [Claude · Use safely](https://support.claude.com/en/articles/13364135-use-claude-cowork-safely) |
| 逐条审批不可行（＝审批疲劳的官方版本） | "you shouldn't expect to validate every individual command—instead, watch for unexpected patterns" | 同上 |
| 屏幕操作缺闸门 | computer use 直接点击输入，"without the permission checks that gate other Cowork tools"，只有应用级授权 | 同上 |
| 主动性若不可操纵就会失去价值 | Pulse 复盘："most useful when they're personalised, action-oriented, and **steerable by the user**" | [Digit 引官方 2026-06-18](https://www.digit.in/news/general/openai-is-retiring-chatgpt-pulse-and-replacing-it-with-scheduled-tasks-here-is-why.html)（二手转引） |

### 4.2 主动性被下架/收缩的记录（反面材料）

1. **ChatGPT Pulse 被下线**（2026-06-17 宣布、14 天内移除），由 Scheduled tasks 取代——本轮最硬的"主动性
   被砍"证据。官方给的理由不是"用户不喜欢"，而是**形态不对**：要个性化、面向行动、用户可操纵，
   且用户偏爱好"一个专门放主动性的地方"〔[Digit 2026-06-18](https://www.digit.in/news/general/openai-is-retiring-chatgpt-pulse-and-replacing-it-with-scheduled-tasks-here-is-why.html)，二手转引官方帖与原话〕。
   【推断】值得警惕的读法：**同一个团队在九个月里把"主动性"从推送产品改成任务产品**，说明
   "每天给你看点什么"这种形态在留存/价值上站不住；本仓做主动性时，默认形态应是"用户定义的盯梢"，
   不是"助手每天生成内容"。
2. **Claude Dispatch 对新用户关闭**："Dispatch isn't available to new users. If you already use Dispatch,
   you can keep using it for now"〔一手：[Dispatch 帮助页](https://support.claude.com/en/articles/13947068-assign-tasks-from-anywhere-in-claude-cowork)〕
   ——收缩的是"从手机远程指挥桌面"这一接缝，不是主动性本身，但同一方向。
3. **Claude 把 Cowork 从本机搬进云端且不可回退**（2026-10-06）：Pro/Max 上"**Only on your computer**"选项被移除，
   "you can't switch back"，旧任务留在本机并显示 banner〔一手：[Use Cowork on web/desktop/mobile](https://support.claude.com/en/articles/15520349-use-claude-cowork-on-web-desktop-and-mobile)〕。
   ——对"严格本地"路线的含义见 §五。

### 4.3 一手用户报告（标题级，正文未读）

GitHub 上 `anthropics/claude-code` 存在两条与"审批档位/权限记忆"直接相关的 issue，标题本身即为机制摩擦：

- "[BUG] Cowork scheduled tasks **ignore 'Always allow' folder/tool permissions — prompts reappear every run** (macOS)"
  ——〔标题级，[issue #47180](https://github.com/anthropics/claude-code/issues/47180)，本轮 curl 超时未读正文〕
- "[BUG] Cowork: prompt change on a 'Require this computer' scheduled task fails under '**Skip all approvals**'
  (needs_device_approval, no card); 'Automatically approve' works"
  ——〔标题级，[issue #99848](https://github.com/anthropics/claude-code/issues/99848)，同上〕

【推断·低置信】若标题所述成立，则失败形态是：**"以后都允许"没被记住 → 每轮重现同一个审批**
（正是 Muse 警告的 banner blindness 的成因），以及**最高自主档位与"需要本机"的任务互斥**。
两条都需读正文才能确认，本档只登记不采信。

### 4.4 未能取得的反面读数

- **"用户根本没打开"类的读数**：本轮未找到任何带方法学的公开数据（Pulse 的日活/卡片打开率、
  Claude scheduled task 的完成率、Lindy routine 的留存）。官方复盘只给了一句定性的
  "we also saw **strong engagement with tasks** after introducing them into the Pulse surface"〔二手转引〕。
  **不存在可引用的"主动性打开率"**——这是本档最大的证据空洞（见 §六）。

---

## 五、增量刷新：2026-10-12 → 10-18 我实际查到了什么

> 口径：只报本轮**实际读到**的、日期在这附近的事实；查不到就写查不到。

1. **2026-10-06（离窗口最近的硬事实，两档 261012 均未收录）**：Anthropic 把 Pro/Max 的新 Cowork 任务
   全部改为**云端运行**，移除了 Settings 里的 "Only on your computer" 选项，"**you can't switch back**"；
   本机文件仍留在本机，云端按需取单文件副本；旧任务留在本机并显示 banner。
   一手：[Use Claude Cowork on web, desktop, and mobile](https://support.claude.com/en/articles/15520349-use-claude-cowork-on-web-desktop-and-mobile)
   （含 "What changed for Pro and Max plans on October 6" 节）。
   【推断】这条对本仓的意义是负面的对照物：**"关掉电脑它还在干"在 2026-10 的头部产品里已经是默认，
   且以"不可回退"的方式落地**——本地路线要回答的问题不是"能不能后台跑"，而是"为什么值得放弃云端常驻"。
2. **Anthropic 帮助中心相关内容在本周内更新**：Scheduled tasks 与 Use-safely 两页页头均标
   **"Updated this week"**，但站点不给版本号/日期，**无法精确判断改动点**〔一手页面事实 + 未证实〕。
   可确认的是文档里已出现 2026-10-06 的云端迁移与 "scheduled tasks you created before October 6" 的分界说明。
3. **本轮未发现 10-12 → 10-18 之间、与我调研范围（主动性 UX）相关的、可核日期的官方新事实**。
   多次针对窗口的检索返回的都是 6 月的 Pulse→Scheduled tasks 故事、Claude 帮助中心的常青页与
   9 月底的 dots/Muse 报道。**"刷新"这一项在本轮的实际产出是"补上 261012 两档漏掉的整块机制"（§2.1/§2.2/§2.3），
   而不是新的 10 月事实。**（诚实结论，不做填充。）

---

## 六、未能证实清单

| 事项 | 状态 |
|---|---|
| 存档通道 `web.archive.org` / `archive.ph` | **本轮网络不可达**（curl 15s 超时、web_fetch 失败）；2026-10-12 两档赖以读 OpenAI 官方页的手段本轮失效 |
| `openai.com` / `help.openai.com` 全部页面 | 直连 403（浏览器 UA、`Accept-Language` 均无效），`r.jina.ai` 超时；OpenAI 侧事实**全部为二手转引**。已试 en / pt-pt 两个语种 |
| ChatGPT Pulse 的发布官方原文与精确上线日期 | 未取得；仅二手 "launched by OpenAI last year"（2025）。卡片设计、开关与反馈机制的官方原文均未读到 |
| OpenAI Scheduled tasks 的官方文档 | 未取得原文（403 + 存档不可达）；现有一切来自 Digit（2026-06-18，转引官方帖与说明） |
| ChatGPT 网页/移动端 Scheduled 页的实际形态 | 未能本人实测（无账号环境）；所有 UI 描述为二手 |
| Google Gemini「排定动作」（support.google.com/gemini/answer/16316416）与 Daily brief | **两次抓取超时**（web_fetch 与 curl 均失败）；Gemini 侧定时动作的粒度、送达面、开关面全部未证实 |
| Google CC 的一手机制细节 | 依赖 [landscape §四](../../../research/261012-personal-agent-landscape/261012-personal-agent-landscape.md) 已有的 blog.google 摘录，本轮未新增 |
| **Poke**（poke.com）与 **Martin** 的主动性机制 | 本轮未取得任何官方文档；搜索仅返回官网与第三方评测标题。**不计入结论** |
| Meta Muse《How We Designed Muse》设计文档原文、Ideas 页原文 | 仍未取得；本轮只新增一篇中文二手设计拆解（uisdc）作为 UI 对象清单来源 |
| Meta「主动私信用户」的官方立场（"creepy" 类表述） | 只检索到 Business Insider 2025-07 的**标题级**线索（"Leaked docs show how Meta is training its chatbots to message you first"），正文未读、日期在窗口外，**不作为事实使用** |
| `anthropics/claude-code` issues #47180 / #99848 正文 | curl 超时未读；仅有标题，属〔标题级〕 |
| 主动性功能的任何使用率/打开率/留存读数 | **完全未取得**（官方只给"strong engagement with tasks"这一句定性表述）。§四.4 的证据空洞 |
| Claude 帮助中心各页的版本日期 | 站点只标 "Updated this week"，无版本号；无法判断哪些机制是本窗口内新增的 |
| 4sysops / techlusive / qna.org.qa 关于 ChatGPT Scheduled tasks 的报道正文 | 403 或超时，只读到标题/摘要 |

---

## 附：对"窄场景、简单交互、非 IM 本地助手"的机制取舍【推断，非事实】

> 只列与本仓方向相关的判断，实现级取舍属模型可见面变更，须走 proposed 呈批（根 [AGENTS.md](../../../../AGENTS.md) 硬规则 5）。

1. **该抄的**：①"**具名管理页**"（P1）——让"它替我盯着什么"成为可读清单，而不是摘要里的一句话；
   ②"**默认静默，只有完成/需要点头才出声**"（P3）；③"**先试跑再信任**"（Lindy dry run 的语义：
   真读真判断、不写不发）；④"**变更检测优先于定时汇报**"（P5 的降噪机制，对应本仓 `curate` 式养护 turn 的
   现状——现在是"每次都跑"，缺"没变化就不出声"）。
2. **该躲的**：①"每天生成内容给你看"（Pulse 的形态，被官方在九个月内撤掉）；
   ②"空闲时自己找事做"（只有云端大厂敢做，且限只读；本地+单主体的代价收益不成立）。
3. **官方判据可直接引用**：Pulse 复盘的三条（personalised / action-oriented / **steerable by the user**）
   与 Claude 的"别把不可逆动作放进无人值守通道"，是本仓未来任何主动性设计现成的验收语言，
   且都出自被调研方的官方文本，属于[差异化 §三](../../../research/261012-personal-agent-landscape/261012-personal-agent-differentiation.md) 借鉴清单的第 10、11 条候选。
