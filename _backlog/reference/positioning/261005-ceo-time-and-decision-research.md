# 一把手的时间与决策实证研究：为「一把手的总助」产品定位供弹药

> 服务对象：产品定位推敲（喂 [261005-open-value-deficit](../../plans/261005-open-value-deficit.md)）。
> 回答的问题：**一把手的时间/注意力/决策负荷到底长什么样、痛点在哪**——用可查证的数据说话，不靠印象。
> **查证日期：2026-10-05**（全部条目同日逐句核对）。
> 方法：web_fetch 工具本会话 DNS 故障（解析到非公网 IP），全程改用 **curl 直连**（多数学术/官方 PDF 可直连）、
> **r.jina.ai 文本代理**、**Web Archive（web.archive.org + CDX API）**；每条标注实际获取方式与性质（一手/二手）。
> 层级标注：**【公司级】**= 公司 CEO/一把手层；**【GM/BU级】**= 事业部总经理/业务单位/P&L 负责人层（父代理追加范围）；
> **【通用】**= 覆盖各层管理者。层级总评：公司级一手研究丰富，**BU 级公开一手研究少**（有 Kotter 的 15 人 GM 研究与 MIT SMR/Bridges 的跨层经理调查，但无 GM 层日历大数据研究）。

---

## 一、CEO 时间使用研究：一把手的时间长什么样

### 1.1 HBR《The Leader's Calendar》（Porter & Nohria，HBR 2018 年 7-8 月号）【公司级】

- 出处：Michael E. Porter & Nitin Nohria，《How CEOs Manage Time》（Spotlight: The Leader's Calendar），Harvard Business Review，2018-07/08。<https://hbr.org/2018/07/the-leaders-calendar>（获取方式：**curl 直连**，全文嵌入页面 HTML，逐句核对）
- 性质：一手（原文正文）

逐句核到的数字（原文引句）：
- **27 位 CEO、近 60,000 个 CEO 小时**的日程编码数据（"In all, we collected and coded data on nearly 60,000 CEO hours"）。注：任务简报里记忆的"2500 小时/年那篇"与原文不符——原文是**每位 CEO 全程跟踪约 3 个月**（折合约 2,200 小时/人，含睡眠），**全数据集合计 6 万小时**；"2,500 小时"未在原文出现（见文末清单）。
- 工作节奏：**工作日平均 9.7 小时**；**79% 的周末日在工作、平均 3.9 小时**；**70% 的假日在工作、平均 2.4 小时**；合计**每周 62.5 小时**（"the CEOs in our study worked an average of 62.5 hours a week"）。
- 时间形态：**61% 的工作时间是面对面**（"took up 61% of the work time of the CEOs we studied"）；**24% 花在电子通讯**（"The final 24% was spent on electronic communications"）。
- 独处：**28% 的工作时间独处**，个体差异巨大（最低 10%、最高 48%）。
- 自定议程：**平均只有 43% 的时间花在推进自己议程的活动上**（"the CEOs invested significant time—43%, on average—in activities that furthered their agendas"）——即**过半时间由别人的请求主导**。
- 客户：**只有 3% 的时间和客户在一起**（"Most of our CEOs were dismayed to discover how little time they spent with their customers—just 3%, on average"）。
- 会议：无单一总数，但 "CEOs attend an endless stream of meetings"；用于建立关系/人的会议另占总工时的约四分之一；**自发的临场互动占 25%**。
- 地点：47% 在总部；对外 30%（16% 业务伙伴、5% 董事会、9% 其他外部事务）。
- 自身议程构成：**职能/BU 复盘 25%、发展战略 21%、人与关系 25%**、组织与文化 16%、并购 4%——**一把手近半时间在做"复盘与对齐"**。
- 生理底线：平均睡 6.9 小时，锻炼约 45 分钟/天。
- 管理层认知错位（原文）：许多行政助理认为**"排满的日历等于我把工作做好了"**——一把手的日历被系统性地填满而非被保护。

**对产品的含义**：一把手最贵的资产是**自定议程权**——总助的日历类功能不能只是"记录/提醒"，而要主动做**议程守卫**：把"本周日历实际 vs 你的年度议程"的偏差摆到桌面上。

### 1.2 McKinsey CEO Excellence 数据底盘 + CEO 惯例调查【公司级】

- 出处一：McKinsey Center for CEO Excellence，《Everyday habits: How CEOs navigate their six core responsibilities》（Kumra, Sengupta, Sridhar），McKinsey，2025-02。<https://www.mckinsey.com/capabilities/strategy-and-corporate-finance/our-insights/everyday-habits-how-ceos-navigate-their-six-core-responsibilities>（获取方式：官方站直连 403，经 **Web Archive 抓官方 PDF** 逐句核对）
- 性质：一手（McKinsey 官方发布）
- 数字：其底书 *CEO Excellence*（Dewar, Keller, Malhotra, Scribner 2022）基于**20+ 年数据、7,800 位 CEO、3,500 家上市公司、70 国、24 个行业**；本文另调查了 **100+ 位在任 CEO**（约 80% 来自亚洲）的日常工作节律。六大职责框架里单列**"管理个人效能"（personal effectiveness）**为 CEO 的核心职责之一——即"管理自己的时间与精力"被 McKinsey 视为一把手的一等职责。

**对产品的含义**：参照 McKinsey 的六大职责框架来设计总助的默认议程分类（定方向/对董事会/对齐组织/动员干部/连利益相关者/个人效能），让产品词汇与一把手已被教育的框架对齐。

### 1.3 学术界最大样本：1,114 位 CEO 的时间日记（Bandiera, Hansen, Prat, Sadun）【公司级】

- 出处：Oriana Bandiera, Stephen Hansen, Andrea Prat, Raffaella Sadun，《CEO Behavior and Firm Performance》，*Journal of Political Economy* 128(4), 2020；核对版本为 NBER 会议版全文 PDF。<https://conference.nber.org/conf_papers/f88340.pdf>（获取方式：**curl 直连**）；期刊页 <https://www.journals.uchicago.edu/doi/10.1086/705331>
- 性质：一手（全文核对）
- 数字（原文核对）：
  - **1,114 位制造业 CEO**（巴西/法国/德国/印度/英国/美国六国）的**整周日记**：42,233 个事件、225,721 个 15 分钟块，**人均每周 50 小时**被完整记录。
  - **75% 的时间是提前安排好的**（P25-P75 区间 64%-91%）；**64% 的时间花在超过 1 小时的大块事件**上；62% 的事件有多人参与。
  - **30% 的 CEO 每周工作 6-7 天**（21% 六天、9% 全周）。
  - "协调型"CEO（长规划周期、多功能大会、更多与高管层互动）的行为指数每高 1 个标准差，**公司生产率高 0.12 个对数点**（约为 1σ 资本存量效应的 15%）——**一把手怎么分配时间是可测量的绩效变量**。

**对产品的含义**：时间分配与经营绩效强相关且有学界度量方式——总助可以安全地把"你的时间去哪了"做成**周报与复盘的默认首页**，而不是隐私雷区。

### 1.4 GM/事业部层的时间研究：Kotter《What Effective General Managers Really Do》【GM/BU级】

- 出处：John P. Kotter，HBR 1982 原文（基于其书 *The General Managers*, Free Press 1982）；本核对用 HBR Classic 1999 重印版全文 PDF（Aalto 大学课程托管）。<https://mycourses.aalto.fi/pluginfile.php/937570/mod_folder/content/0/Kotter%201999%20HBR.pdf?forcedownload=1>（获取方式：**curl 直连 PDF**）；正式书目 <https://store.hbr.org/product/what-effective-general-managers-really-do/99208>
- 性质：一手（作者本人论文式全文；非官方托管镜像，正文逐句核对）
- 数字（原文核对）：
  - 1976-1981 年研究**9 家公司的 15 位成功总经理**；每人访谈≥5 小时、观察日常工作约 35 小时，并访谈其关键同事。
  - **被研究的 GM 平均每周工作接近 60 小时**（"The average GM I have studied works just under 60 hours per week"）——与 CEO 层的 62.5h 几乎一致。
  - **单一议题的讨论很少超过 10 分钟**；"一个总经理在一次 5 分钟的交谈里覆盖十个不相关话题并不罕见"。
  - **一天里大量时间是计划外的**、对他人发起事项做反应；日程排满会议的人照样被不在议程上的话题占满。
  - 有效性来源 = **议程设置 + 人际网络建设**；"最有效的一批人会**积极索取信息（包括坏消息）**、善于提问、主动找能推进议程的项目"。
  - GM 的议程"通常不是书面计划"，是**松散连结的目标/优先级/问题/机会清单**——但与书面计划的财务数字存在系统差异。

**对产品的含义**：BU 一把手与 CEO 同样过载、更碎片。产品必须假设**输入是五分钟口头交代**而非成文文档——能从短对话/批注里自动抽"决定+负责人+期限"的功能，比"帮一把手写长文"更贴 GM 日常。

### 1.5 经典底色：Mintzberg 的经理工作研究（经二手核对）【通用】

- 出处：Henry Mintzberg，《The Manager's Job: Folklore and Fact》，HBR 1975-07/08（1973 书 *The Nature of Managerial Work*）；官方条目 <https://mintzberg.org/articles/managers-job-folklore-and-fact>（curl 直连，仅书目）。数字经 Roman Kalugin 的证据核查笔记核对：<https://romankalugin.com/managing-mintzberg-book-notes/>（curl 直连）
- 性质：二手（原文 1973/1975 未直接抓到全文；数字以带引注的二手核查稿为准）
- 数字：Mintzberg 对 5 位高管的整周观察——**一半活动短于 9 分钟，只有 10% 超过 1 小时**；该"碎片化"结论被 Kurke & Aldrich（*Management Science*, 1983，4 位高管结构化观察）与 Martinko & Gardner（*Journal of Management Studies*, 1990）复现支持；Tengblad（*JMS*, 2006，瑞典高管）部分修正——管理者工作量大但**没有想象中那么被打断**（Bandiera 等 2020 的 1,114 人样本同样发现：仅 4% 的时间在应对突发、计划完成率高——"碎片但有序"）。

**对产品的含义**："一把手的一天是一串短会"是真且被复现的；但**多数短块是一把手自己排的**——产品设计应尊重其既定节律（在其日程结构内给摘要），而不是另造一套"打断式提醒"。

---

## 二、高管决策过程研究/实践：非黑白决策怎么做

### 2.1 Pre-mortem（事前验尸）：方法与实证【通用】

- 出处一（方法原文）：Gary Klein，《Performing a Project Premortem》，Harvard Business Review，2007-09。<https://hbr.org/2007/09/performing-a-project-premortem>（获取方式：**curl 直连**，全文核对）
- 性质：一手（原文正文）
- 原文核到的实证锚点：Klein 在文中引用 Mitchell（Wharton）、Russo（Cornell）、Pennington（Colorado）的发现——**"前瞻性回顾（想象事件已经发生）能把正确识别未来结果原因的能力提高 30%"**（"prospective hindsight—imagining that an event has already occurred—increases the ability to correctly identify reasons for future outcomes by 30%"）。原始文献：Mitchell, Russo & Pennington, "Back to the future: Temporal perspective in the explanation of events," *Journal of Behavioral Decision Making* 2(1), 1989，DOI 页 <https://onlinelibrary.wiley.com/doi/abs/10.1002/bdm.3960020103>（获取方式：web_search 命中 DOI 页）。
- 出处二（高管语境背书）：McKinsey Quarterly《Strategic decisions: When can you trust your gut?》（Sibony & Lovallo 访谈 Kahneman 与 Klein），2010-03。官方 PDF 经 **Web Archive** 抓取全文：<https://www.mckinsey.com/capabilities/strategy-and-corporate-finance/our-insights/strategic-decisions-when-can-you-trust-your-gut>（获取方式：官方直连 403，archive 快照核对）
- 性质：一手（访谈全文）
- 原文核到的原话：Klein——premortem 是"**让众人做唱反调思维而不遇阻力的偷懒办法**：我们现在看着水晶球，项目已经失败了，每人花两分钟写下失败原因"；Kahneman——"**The premortem is a great idea**……不会推翻计划，但会被改善得人人都看得见收益。**低成本、高回报（low-cost, high-payoff）**"；并记录"某大公司董事长说光为这个就值了那趟达沃斯"。两人共识：直觉只有在**规律、有即时反馈的环境**里可信（"kind"环境），战略决策通常不是。

**产品推论（非效果实证）**：Kahneman 的“低成本高回报”是访谈评价；+30% 经 Klein 转引，测的是 prospective hindsight 的原因解释能力，本档未核原始实验方法/样本，不能说 AI premortem 模板使决策质量/识别失败原因固定提高30%。可将唱反调提问和保留当时假设作为候选；要用数字先补原实验，不用数字则无需再扩研究。

### 2.2 给战略决策"去偏"的结构化流程：MAP（Kahneman/Lovallo/Sibony）【通用】

- 出处：Daniel Kahneman, Dan Lovallo, Olivier Sibony，《A Structured Approach to Strategic Decisions》（Mediating Assessments Protocol），MIT Sloan Management Review（本核对用 MIT SMR 官方特刊 PDF《Top 10 Lessons on Strategy》，版面标注 Spring 2019）。<http://s3.amazonaws.com/marketing.mitsmr.com/PDF/MITSMR-Top-10-Strategy-Fall-2020.pdf>（获取方式：**curl 直连官方 S3**）
- 性质：一手（官方特刊全文）
- 要点（原文核对）：战略决策是"评估性判断"（boil down 复杂信息到打分或 yes-no）；错误来自已知偏差+**噪声**；MAP 要求在整体判断前**先对各中间评估项独立打分**（借鉴招聘面试研究：结构化、分项、先分后合）。同特刊还有 Sull 系列与 Schoemaker 的情景规划（见第三节）。

**对产品的含义**：总助可以内置"决策拆解"模板——把大决定拆成可独立评估的中间判断项（市场/团队/时机/财务），强制先分项后结论，直接产品化 MAP。

### 2.3 决策日志（decision journal）：实践主张强、实证弱【通用】

- 出处：Shane Parrish，《How a Decision Journal Changed the Way I Make Decisions》，Farnam Street，2014-02-20（2025-02-13 更新）。<https://fs.blog/decision-journal/>（获取方式：**curl 直连**，正文核对）
- 性质：二手（实践主张，非实证研究）
- 要点（原文核对）：人脑会**系统性改写当时的想法**（"你其实不知道你当时在想什么"）；组织不教人决策、只挑"看起来会决策的人"——所以**决策日志是个人唯一能给自己建反馈回路的地方**；模板含可测预期与当时情绪（溯源到 Kahneman 与 Mauboussin 的推荐）。
- 书目佐证（未抓原文）：J. Edward Russo & Paul Schoemaker 早在《Decision Traps》(1989) 即提出决策日志实践。
- **诚实结论：未找到"决策日志→决策质量提升"的受控实证**；相关近邻证据是校准训练与判断反馈文献（Hogarth 的 kind/wicked 学习环境论），本次未系统检索（见文末清单）。

**对产品的含义**：决策日志的产品化价值不在"证据上它能提升质量"（尚无实证），而在**它是对话可自动生成的副产品**——总助替人写日志（决定/理由/预期/可证伪信号四件套），把罕有的自律变成默认动作；价值主张应诚实表述为"留住你当时的判断"，不夸大为"提效 x%"。

### 2.4 组织决策质量的量化：Bain / McKinsey【公司级】

- 出处一：Bain & Company，《The five steps to better decisions》（Blenko, Mankins, Rogers，Decision Insights brief），2013。<https://media.bain.com/Images/BAIN_BRIEF_Decision_Insights_The_five_steps_to_better_decisions.pdf>（获取方式：**curl 直连**）
- 性质：一手（Bain 官方 brief）
- 数字（原文核对）：**"10 年研究项目、覆盖 1,000+ 公司，显示决策有效性与经营业绩之间存在显著相关（至少 95% 置信水平）"**；配套调查 Bain decision and org effectiveness survey（2013-01，n=1,001；另一份 2012-01 brief n=1,065）。
- 出处二：Bain《Decision Insights 2.0: Decision diseases》（Rogers & Davis-Peccoud）。<https://www.bain.cn/pdfs/2013032905.pdf>（获取方式：**curl 直连**）
- 性质：一手
- 要点：把"决策做得慢/错/落不了地"列为最常见的组织主诉（"too many key decisions turn out wrong, take too long or somehow never get translated into action"），并给出 10 种"决策病"。
- 出处三：McKinsey Global Survey《Decision making in the age of urgency》，2019-04-30（调查 2018-02-13~23 实施，1,259 人、其中 1,228 人熟悉所在组织决策）。<https://www.mckinsey.com/capabilities/people-and-organizational-performance/our-insights/decision-making-in-the-age-of-urgency>（获取方式：官方直连 403，**Web Archive 快照逐句核对**）
- 性质：一手（调查报告）
- 数字（原文核对）：**68% 的中层经理说自己的决策时间大多被低效使用；C 级高管这一比例 57%**；快速且高质量的决策与经营跑赢大盘正相关。

**对产品的含义**：Bain/McKinsey 都把"决策有效性"做成可测量变量——总助可以借用其维度（速度×质量×执行×精力）做一把手自己的"决策季度复盘"记分卡。

### 2.5 Red team 与 RPD：可用但本次未核一手【通用】

- Red team：企业引入路径以 Bryce Hoffman《Red Team: How to Succeed by Thinking Like the Enemy》(Bantam, 2016) 与美军红队教程（University of Foreign Military and Cultural Studies）为代表——**本次未抓到一手文本**，见文末清单。
- RPD（recognition-primed decision）：Gary Klein《Sources of Power: How People Make Decisions》(MIT Press, 1998)——消防指挥官等高压力专家的"识别-心理模拟-评估"模型，自然决策学派（NDM）核心；本次经 2.1 的 McKinsey 访谈一手确认其高管语境的可用性（"executives trust their guts only in kind environments"）。

**对产品的含义**：RPD 提醒总助**别假装一把手都在"理性选择"**——真实决策多为"识别-模拟"式；产品的决策记录应允许记录"直觉+一句话依据"，复盘时再补结构，而不是强制完整论证。

---

## 三、跟进/执行力缺口："决定了但没落地"的实证

### 3.1 Kaplan & Norton：战略执行的四道断裂【公司级】

- 出处：Robert Kaplan & David Norton，《The Office of Strategy Management》，Harvard Business Review 2005-10（HBR store 书目 <https://store.hbr.org/product/office-of-strategy-management/r0510d>）；核对版本为 HBS 工作论文 05-071 全文 <https://www.hbs.edu/ris/Publication%20Files/05-071.pdf>（获取方式：**curl 直连**）
- 性质：一手（工作论文全文逐句核对；与 HBR 正式版同源）
- 数字（原文核对，均出自"战略管理职能缺位"一节）：
  - **60% 的组织不把财务预算与战略优先级挂钩**；
  - **70% 的中层经理、90% 以上的一线员工没有与"战略落地成功"挂钩的激励**；
  - **85% 的高管团队自报每月花在讨论本单位战略上的时间不足 1 小时；50% 为零**；
  - **95% 的员工自报不知道或不理解公司战略**。
- 注：广泛流传的"9/10 组织无法执行其战略"一句未在本工作论文中核得原句（见文末清单），但其底下的四道断裂都有原句支撑，且更能直接驱动产品设计。

**对产品的含义**："每月谈战略<1 小时"是一把手跟进缺口的**最硬一枪**——总助的立项卖点应是**自动保障"战略讨论节律"**（每月固定产出战略复盘包），把 Kaplan-Norton 指出的断裂逐条变浅。

### 3.2 Sull 三部曲（HBR 2015 + MIT SMR 2017/2018）：跨层经理的调查数字【通用，覆盖 BU/GM 层经理】

- 出处一：Donald Sull, Rebecca Homkes, Charles Sull，《Why Strategy Execution Unravels—and What to Do About It》，HBR 2015-03。规范 URL <https://hbr.org/2015/03/why-strategy-execution-unravels-and-what-to-do-about-it>（本会话直连被拒；URL 经 **Web Archive CDX** 确认有快照）。全文核对用托管 PDF：<https://www.leadership-acceleration.com/uploads/3/1/1/4/31144043/why-strategy-execution-unravelsand-what.pdf>（获取方式：**curl 直连**）
- 性质：一手（全文核对）
- 数字（原文核对）：
  - 引 Conference Board 式调查：**400+ 全球 CEO 把"卓越执行"列为 80 项议题中的第一大挑战**；
  - "已有研究发现 **2/3 到 3/4 的大型组织难以落实其战略**"（作者转引）；
  - 作者自己的研究：**262 家公司 7,600 名经理、30 个行业 + 40 个现场实验**；
  - **40% 的经理说最大执行挑战是"对不齐"、30% 说是"跨单元协调失败"**；
  - 经理们**因其他单元支援不足而误承诺的概率是自己团队掉链子的 3 倍**；
  - **80%+ 的公司有跨部门承诺管理机制（委员会/SLA/PMO），但只有 20% 的经理认为它们多数时候好用**；
  - **只有 11% 的经理相信公司所有战略优先级都配齐了资源**——"十个经理里九个在预期公司的重大举措会因缺资源而失败"。
- 出处二：Donald Sull, Stefano Turconi, Charles Sull, James Yoder，《Turning Strategy Into Results》，MIT Sloan Management Review，2017（Reprint 59209）。本核对用 MIT SMR 官方特刊 PDF <http://s3.amazonaws.com/marketing.mitsmr.com/PDF/MITSMR-Top-10-Strategy-Fall-2020.pdf>（curl 直连官方 S3）
- 性质：一手
- 数字（原文核对）：调查**10,000+ 经理、400+ 组织**——**近 1/3 说高管团队各干各的或存在明显派系**；**典型公司里只有勉强一半高管说得出同一套公司级优先事项**；**只有 27% 的公司做到 2/3 以上高管对战略优先级同频**。
- 出处三：Donald Sull & Charles Sull，《With Goals, FAST Beats SMART》，MIT Sloan Management Review，2018（同特刊 PDF，curl 直连）
- 性质：一手
- 数字（原文核对）：同一 400+ 组织调查中——**只有 1/4 的经理说自己的目标被其他部门/业务单元的对口同事所理解**。

**对产品的含义**：执行缺口不是"意愿"问题而是**协调与对账的机械问题**（40%/30%、20%、11%、27% 这一串）——总助的跟进模块应优先做**跨单元承诺台账**（谁向谁承诺了什么、何时到期），而不是泛泛的 OKR 看板。

### 3.3 复盘节律的直接证据：Bridges 20 年调查【通用（其样本以各级"implementation leader"为主）】

- 出处：Bridges Business Consultancy Int（Robin Speculand），《20-Year Results From Surveying Strategy Implementation》。<https://bridgesconsultancy.com/wp-content/uploads/2016/10/20-Years-of-Strategy-Implementation-Research-2.pdf>（获取方式：**curl 直连**）
- 性质：一手（咨询机构官方报告——证据强度低于学术，引用时注明）
- 数字（原文核对）：20 年、每四年一轮的调查一致性结论——**"领导者从不充分复盘战略实施"**；**只有 1/5 的领导者每月至少复盘一次实施进展**；2004 年调查要点"**领导者每月只花一天讨论其战略的实施**"；实施失败的主因常年是**沟通不畅、该做的动作没发生、领导力缺位**；2020 年首次过半（52%）公司报告实施成功。

**对产品的含义**："复盘频率"就是可改进变量——总助把复盘从"每月一天/一年几次"提升为**每周自动对账**，是这条证据线上最直接的差异化功能。

### 3.4 转型/变革失败率的可用数字与出处强度【公司级】

- McKinsey：《Changing change management》（De Smet, Schaninger, Smith），McKinsey Quarterly 2015-07。<https://www.mckinsey.com/capabilities/people-and-organizational-performance/our-insights/changing-change-management>（获取方式：官方直连 403，**Web Archive 快照逐句核对**）——原文自述："**70% 的变革项目达不到目标，主因是员工抵制与管理支持不足**"。注：该 70% 在管理学界流传极广但属"McKinsey 自己也反复引用"的数字，**原始一手出处不可考**（见文末清单）。
- BCG：《Flipping the Odds of Digital Transformation Success》，2020-10。<https://www.bcg.com/publications/2020/increasing-odds-of-success-in-digital-transformation>（获取方式：官方直连 403，**Web Archive 快照逐句核对**）——原文："**只有 30% 的变革达到目标**；做对六个因素可将成功几率从 30% 翻到 80%"。

**对产品的含义**：对外叙事可用"30% 的变革成功率 / 70% 的变革项目未达目标"开场，但**内文引用时务必用 3.1-3.3 的可核数字**，避免落在"以讹传讹数字"的把柄上。

### 3.5 "决定做出后信息回流"的痛点证据（汇总）

以上各条拼出的回流断点链条（全部原文核对）：**决定后**——预算与战略脱钩（60%）、跨单元支援承诺没有牙齿（仅 20% 的经理认为机制有效）、**复盘不足月频（只有 1/5 领导者）**、目标在部门间互不可见（仅 1/4 被理解）、**信息沿层级上传时被软化**（见第四节 MUM effect）。一把手对"决定之后世界变了没有"的认知，长期依赖**别人愿意开口**。

**对产品的含义**：产品叙事可以精确到这句话——"你的决定发出之后，总助负责让世界的变化回流到你这里，而不依赖汇报人的勇气。"

---

## 四、高管信息环境：过滤、坏消息与简报设计

### 4.1 坏消息不上传的第一块实证：MUM effect【通用】

- 出处：Sidney Rosen & Abraham Tesser，"On Reluctance to Communicate Undesirable Information: The MUM Effect," *Sociometry* 33(3), 1970, pp. 253-263。（一手原文在 JSTOR，爬虫被挡；书目经多处二手核对；机制表述用下条 Sutton 的通俗转述）
- 性质：一手文献/二手转述混合（见文末清单标注）
- 机制（转述核对）：Bob Sutton（Stanford），《Some Bosses Live in Fool's Paradise: The Mum Effect》，2010-06-04。<https://www.bobsutton.org/2010/06/some-bosses-live-in-fools-paradise-the-mum-effect-1/>（curl 直连）——"**报信者即使毫无责任也倾向于被归罪**……结果是 MUM effect：有求生本能的下属把坏消息修饰得好听一点，或者干脆不往上送。"

**对产品的含义**：总助的简报必须有一条**绕开"人肉传声筒"的坏消息通道**：从系统事实（数据/进度/日历）取数而非等人汇报，且默认呈现"上周没完成的事"，让坏消息以"事实通知"而不是"举报"的形态到达一把手。

### 4.2 权力改变换位思考：一手心理学证据【通用】

- 出处：Adam Galinsky 等，《Power and Perspectives Not Taken》，*Psychological Science* 17(12): 1068-1074, 2006，DOI 10.1111/j.1467-9280.2006.01824.x。<https://pubmed.ncbi.nlm.nih.gov/17201789/>（获取方式：web_search 命中 PubMed 记录页；本次未另行抓取正文）
- 性质：一手（期刊论文；书目与摘要页核对）
- 结论：**被启动"高权力"状态的被试更少主动换位思考**（三个实验，含 Ebbinghaus 图形与锚定任务）——权力让人"从自己的视角看世界"的倾向增强。这条解释了为什么越往上，信息越失真：不是下属单方面撒谎，是**一把手的空间被结构性填满了顺着他视角的信息**。

**对产品的含义**：对一把手的输入设计要**主动打破视角回音壁**：每条关键进展附"异议/风险"字段，简报固定给出"与你判断相反的证据"栏。

### 4.3 管理经典里的信息偏好与信号扭曲【GM/BU级 + 公司级】

- Kotter（见 1.4，一手）：GM 的信息主要来自**自己织的人际网络**与短促交谈，且"最有效的一批人积极索取信息（**包括坏消息**）"——一手信息偏好 + 索取坏消息是高手的标志。【GM/BU级】
- Mintzberg（经 1.5 二手核对）：管理者偏爱口头/传闻媒介，正式报告在其信息摄入中占比低。
- Porter, Lorsch & Nohria，《Seven Surprises for New CEOs》，HBR 2004-10。<https://hbr.org/2004/10/seven-surprises-for-new-ceos>（curl 直连，摘要与要点可见；全文付费墙）——新 CEO 的第一课：**"你永远在发信号"**（"You are always sending a message"）与"**对一切负全责、却控制不了决定结果的大多数事**"。一手（摘要级核对）。
- Nathan Furr 等的 "CEO information vacuum" 表述：本次未检索到一手文献（见文末清单）——概念可用，出处别挂空。

**对产品的含义**：总助是**唯一不需要"讨好"一把手的信息源**——它的可信度建设点：每个数字可点开溯源、每个结论区分"事实/推断/传闻"三态（呼应用 4.2）。

### 4.4 一把手该看什么：Rockart 的 CSF（1979 的经典答案）【公司级】

- 出处：John F. Rockart，《Chief Executives Define Their Own Data Needs》，Harvard Business Review，1979-03/04。原文页 <https://hbr.org/1979/03/chief-executives-define-their-own-data-needs>（curl 直连 200，正文付费墙）；书目确认 <https://www.semanticscholar.org/paper/Chief-executives-define-their-own-data-needs.-Rockart/5f20cf06bf5143e79051707ba7a7341661e0d52f>
- 性质：一手文献（原文正文本次仅核到标题页；论点经书目与摘要转述）
- 论点（转述）：一把手不应接收"系统里现成的全部报表"，而应先定义**关键成功因素（CSF）**——少数"做对了就赢"的变量——再围绕它定制数据与简报。这是后来所有"高管看板/驾驶舱"思想的源头。

**对产品的含义**：总助的简报配置流程应**先问一把手"今年 5-8 个 CSF 是什么"**，一切指标与跟进围绕它组织，其余默认折叠——这正是 Rockart 1979 的原始主张，产品可以直接致敬。

### 4.5 简报形态的两个高可信参照：Amazon 六页备忘录与军方 BLUF【通用】

- Amazon（一手）：Jeff Bezos，2017 年致股东信（2018-04 发布）。<https://www.aboutamazon.com/news/company-news/2017-letter-to-shareholders>（curl 直连全文）——原文："**We don't do PowerPoint (or any other slide-oriented) presentations at Amazon. Instead, we write narratively structured six-page memos.**"（且明确：一篇高标准的六页备忘录可能要写一周以上）。
- 美军条令（一手）：USAICoE Writing Program 写作教材（US Army Intelligence Center of Excellence）。<https://intellibrary.libguides.com/ld.php?content_id=53826333>（curl 直连 PDF）——专章 "Putting the Bottom Line Up Front"："**A BLUF states the purpose of the entire paper**"，先结论后论证，是军方的强制写作规范。
- 看板反面教材（未核一手，仅存目）：Stephen Few《Information Dashboard Design》的显示原则与 Goodhart's Law 对指标设计的警示——本次未抓文本（见文末清单）。

**对产品的含义**：给一把手的任何输出采用**BLUF 结构（第一行就是结论+所需决定）+ 叙事化长文按需展开**；"六页备忘录"证明深度材料用叙事、快照材料用 BLUF 的双轨制已被两类最苛刻的组织（Amazon、军队）验证。

---

## 五、对总助产品设计的十点推论

1. **卖"议程守卫"，不卖"日程管理"**。一把手过半时间不在自定议程上（HBR：43%），而助手的职业本能是把日历填满（原文）。总助的周报第一页应是"你的日历 vs 你的议程"偏差表。
2. **把输入假设为五分钟口头交代**。GM 层单议题交谈罕见超过 10 分钟（Kotter），CEO 层 61% 时间面对面（HBR）。决定台账、待办、风险必须能从短对话与批注中自动抽取，不能指望用户写文档。
3. **跟进才是主战场，不是备忘**。85% 的高管团队每月谈战略不足 1 小时、50% 为零（Kaplan & Norton）；只有 1/5 的领导者月度复盘实施（Bridges）。"决定→进度→偏差"的自动对账是产品的心脏功能。
4. **跨单元承诺台账优先于 OKR 看板**。执行挑战第二位是跨单元协调失败（30%），而 80% 公司的既有机制只有 20% 的经理认为有效（Sull 2015）；"谁向谁承诺了什么、何时到期"是一把手真正要盯的东西。
5. **立项即 pre-mortem**。前瞻性回顾有 30% 的机制性增益（Klein 引 Mitchell et al.），且被 Kahneman 定价"低成本高回报"——每个决定自动生成"假设已失败"的问题清单并沉底，失败时回看。
6. **决策日志做成副产品而非负担**。决策日志无 RCT 实证，但"留住当时的判断"价值独立成立（记忆会自我美化，fs.blog）；总助替用户写：决定、理由、预期、可证伪信号四件套，复盘时自动逐条对答案。
7. **简报必须自带坏消息通道**。MUM effect + 权力降低换位思考（Galinsky）决定了一把手的信息环境会系统性软化——简报从系统事实取数、固定呈现"未完成/异议/与你判断相反的证据"，不依赖汇报人的勇气。
8. **输出结构双轨制：BLUF + 六页叙事**。军队条令强制先结论（BLUF），Amazon 强制叙事化六页备忘录——即时问答用 BLUF（第一行结论+所需决定），深度材料用叙事长文，别做中间形态（信息密集的幻灯片）。
9. **先定义 CSF 再谈看板**。Rockart 1979 的原始主张仍是正解：让一把手维护 5-8 个关键成功因素，所有指标、跟进、简报围绕它组织，其余折叠；"公司一把手"与"BU 一把手"各有一套 CSF，产品支持多套配置。
10. **用快而可核的数字讲故事**。对外可用 30%/70% 开场（BCG/McKinsey 自述），证据链引用务必落在可核条目上（62.5h、43%、85%、11%、27%、1/5、3 倍、30% pre-mortem 增益）——本文件每条都给了原文引句，演示叙事里可直引；这也是"总助"产品自己的品格证明：**它说的话有出处**。

**BU/GM 层的空白（父代理要求单独说明）**：公司级 CEO 有一手日历大数据（HBR 60,000 小时；Bandiera 1,114 人）；**BU 一把手没有同等规模的公开时间研究**——最接近的是 Kotter 的 15 人定性研究（1982，GM 层行为一手）与 MIT SMR/Bridges/Sull 调查中的跨层经理样本（含 BU 层经理）。Bandiera 样本（六国制造业 CEO）里大量是中小企业主，其行为模式更接近 BU/P&L owner，可作替代证据引用。产品按"GM 层数据更稀缺→更依赖迁移假设"来表述，不要在材料里把 CEO 研究冒充 GM 研究。

---

## 六、未证实/仅二手——诚实清单

1. **"2,500 小时/CEO"**：任务简报里的记忆数字。原文实为 27 位 CEO × 约 3 个月全程跟踪（≈2,200 小时/人）+ 合计 60,000 CEO 小时；"2,500"未在原文出现。
2. **Bridges 的 "48% 组织达不到一半战略目标 / 仅 2% 领导者有信心实现 80-100%"**：广泛流传；本次在其官网《20 Years of Strategy Implementation Research》PDF 中**未核得这两个数字**，一手出处不可得——不引用。
3. **Kaplan & Norton "9/10 组织无法执行战略"**：原句未在 HBS WP 05-071 中核得（文中可核的是 60%/70%/85%/95% 四道断裂）——改用可核数字。
4. **McKinsey "70% 变革失败"**：McKinsey 2015 原文自述可核，但该数字的**最初一手出处不可考**（学界公认是流传数字）——引用时必须挂"McKinsey 自述"限定。
5. **Bain "决策有效的公司 TSR 高 5.3 个百分点"**：仅见于二手转引；本次抓到的 Bain 一手 brief 只核得"1,000+ 公司、≥95% 置信度相关"——5.3% 不引用。
6. **MUM effect 原文全文**（Sociometry 1970）：JSTOR 挡爬虫未抓到；书目经多处二手核对，机制表述以 Sutton 一手博客转述为准。
7. **决策日志提升决策质量的实证**：未找到受控研究；fs.blog 与 Russo/Schoemaker 均为实践主张——产品价值主张不得写成"实证提效 x%"。
8. **Red team**（Hoffman 2016、美军红队教程）：书目成立但本次未核一手文本；企业案例未验证——条目存目不引用细节。
9. **RPD 细节**（Klein《Sources of Power》1998）：以 McKinsey 访谈（一手）交叉确认其高管语境，书本体未核。
10. **Bandiera 的"4% 时间应对突发 / 70% 时间在互动"**：经 Kalugin 核查稿（二手）转述；其"75% 计划内/64% 大块事件/0.12 对数点"为本会话一手核对——引用时区分。
11. **Mintzberg 的 9 分钟数字**：1973/1975 原文未直接抓到；数字与复现链条（Kurke & Aldrich 1983、Martinko & Gardner 1990、Tengblad 2006）经二手核查稿核对——标注二手。
12. **Rockart 1979 正文**：仅核到标题页（付费墙），论点经书目转述。
13. **"CEO information vacuum" 的文献源头**：未检索到一手文献——概念表述不挂出处，或挂本次可核的 4.1-4.3 组合证据。
14. **Seven Surprises 全文**：付费墙，仅核到摘要与两条要点——只引用摘要级内容。
15. **Galinsky 2006 正文**：PubMed 书目/摘要级核对，未读全文。
16. **环境限制**：web_fetch DNS 故障（hbr.org 等解析到非公网 IP）；McKinsey/BCG 官网对 curl 直接 403——这两家的原文经 **Web Archive 快照**逐句核对（快照与线上可能有差异，已在各条注明）。

---

## 附：本次核到原文的关键 URL 汇总（按出现顺序）

- <https://hbr.org/2018/07/the-leaders-calendar>（curl 直连全文）
- <https://www.mckinsey.com/capabilities/strategy-and-corporate-finance/our-insights/everyday-habits-how-ceos-navigate-their-six-core-responsibilities>（Web Archive 取官方 PDF）
- <https://conference.nber.org/conf_papers/f88340.pdf> + <https://www.journals.uchicago.edu/doi/10.1086/705331>（curl 直连 / 书目页）
- <https://mycourses.aalto.fi/pluginfile.php/937570/mod_folder/content/0/Kotter%201999%20HBR.pdf?forcedownload=1> + <https://store.hbr.org/product/what-effective-general-managers-really-do/99208>（托管 PDF 直连 / 书目）
- <https://mintzberg.org/articles/managers-job-folklore-and-fact> + <https://romankalugin.com/managing-mintzberg-book-notes/>（书目 / 二手核查稿）
- <https://hbr.org/2007/09/performing-a-project-premortem>（curl 直连全文）
- <https://www.mckinsey.com/capabilities/strategy-and-corporate-finance/our-insights/strategic-decisions-when-can-you-trust-your-gut>（Web Archive 取访谈 PDF）
- <https://onlinelibrary.wiley.com/doi/abs/10.1002/bdm.3960020103>（书目）
- <http://s3.amazonaws.com/marketing.mitsmr.com/PDF/MITSMR-Top-10-Strategy-Fall-2020.pdf>（curl 直连官方特刊：含 MAP、Turning Strategy Into Results、FAST）
- <https://fs.blog/decision-journal/>（curl 直连全文）
- <https://media.bain.com/Images/BAIN_BRIEF_Decision_Insights_The_five_steps_to_better_decisions.pdf> + <https://www.bain.cn/pdfs/2013032905.pdf>（curl 直连）
- <https://www.mckinsey.com/capabilities/people-and-organizational-performance/our-insights/decision-making-in-the-age-of-urgency>（Web Archive 逐句核对）
- <https://www.hbs.edu/ris/Publication%20Files/05-071.pdf>（curl 直连全文）
- <https://hbr.org/2015/03/why-strategy-execution-unravels-and-what-to-do-about-it>（CDX 确认快照）+ <https://www.leadership-acceleration.com/uploads/3/1/1/4/31144043/why-strategy-execution-unravelsand-what.pdf>（托管全文直连）
- <https://bridgesconsultancy.com/wp-content/uploads/2016/10/20-Years-of-Strategy-Implementation-Research-2.pdf>（curl 直连）
- <https://www.mckinsey.com/capabilities/people-and-organizational-performance/our-insights/changing-change-management> + <https://www.bcg.com/publications/2020/increasing-odds-of-success-in-digital-transformation>（均 Web Archive 逐句核对）
- <https://www.bobsutton.org/2010/06/some-bosses-live-in-fools-paradise-the-mum-effect-1/>（curl 直连全文）
- <https://pubmed.ncbi.nlm.nih.gov/17201789/>（书目）
- <https://hbr.org/2004/10/seven-surprises-for-new-ceos>（curl 直连摘要）
- <https://hbr.org/1979/03/chief-executives-define-their-own-data-needs> + <https://www.semanticscholar.org/paper/Chief-executives-define-their-own-data-needs.-Rockart/5f20cf06bf5143e79051707ba7a7341661e0d52f>（标题页 / 书目）
- <https://www.aboutamazon.com/news/company-news/2017-letter-to-shareholders>（curl 直连全文）
- <https://intellibrary.libguides.com/ld.php?content_id=53826333>（美军写作教材 PDF 直连）
