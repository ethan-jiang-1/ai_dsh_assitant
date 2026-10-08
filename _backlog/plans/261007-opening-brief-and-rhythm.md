# 推敲：它先开口——开屏播报、拍板感与周节律（行为层收口）

> 立卡：2026-10-07 ｜ 状态：推敲中｜毕业门判断 = **该做，四片全交付**（Slice 1 `7fe774a` / 2 `636a4a6` / 3 `532c19d`，implemented note = [notes/archived/2026-10-07-opening-brief-and-rhythm.md](../../notes/archived/2026-10-07-opening-brief-and-rhythm.md)）｜**机械面：6/7 行有证据、1 行现状阻断（#7 blank 夹具腐烂）；人面：0/3 已判**（#5 拍板语气 / #6 周坐口径 / R5 红线）｜**剩毕业门最后一环：用户终验**｜下一步 = 用户上手终验 → 过则卡毕业迁 `_done/_closed_plans/`
>
> **2026-10-08 状态语气校正**：原状态行把"完整弧线真机走查通过"与"四片全交付"并排，读起来是完成态；
> 而本卡 `## 验收矩阵` 自陈 #7 阻断、#5/#6 的真人判断未走、`/tmp` 走查证据不可复核（= blocked 不是 pass）。
> 「交付完成」是**实现事实**，「毕业门未过」是**验收事实**——两者并排必须都写出来，否则状态行比证据乐观
> （261006 校正注骂过的漂移，这里以软版本重演）。走查记录原文保留在毕业门节，不改写历史。

## 背景 / 触发

[261006 chief-of-staff-experience](261006-chief-of-staff-experience.md) 四 Goal 交付后，2026-10-07 干净 home + 真模型九轮 DOM 逐帧走查发现：**形态变革的载体是真的（主区面板/拍板闭环/桌面回流全通），但体验弧线断在第一屏**。用户追问方向性：UX（不是 UI）靠谱不靠谱、设计预想还有多少距离、好不好修。本卡 = 距离的定位与消化次序。

## 证据面（2026-10-07 实验一手，证据存 /tmp/ux-shots/）

**通的（不重做）**：
- 拍板闭环端到端：dashboard 点「涨 5%+锁两年」→ 消息进会话 → 模型 40s/137K tok → 写长期记忆 + 改 state.json(+55/-12) + 撤旧决策 + 挂新决策 + 建到期任务 → 切回 dashboard 新决策已在。
- 主区面板机制（sidebar.panellist + main）：图标 → 独立页 → 数据态渲染全对。
- intake 开场质量好（fresh 时三问短弧线）。

**断的（本卡标的）**：
1. **auto-send 无去重**：判 fresh 读 `deskSlice(sid)`（新会话恒无数据 → 恒判 fresh）→ **每次页面重载重发「你好」**：10 分钟造 6 个会话、每条 ~44.6K tok 真模型调用。Day-2 打开 = 产品假装初次见面，直接击穿「它记得我」。
2. **composer 死亡**：FirstMileDock 卸载后隐藏 vendor composer 的 style 残留（`fallbackDisplay:none` 实锤；机制推断 = hooks 前条件 return 违反 React 规则致 cleanup 丢失）→ intake 问完**用户无处打字**，主线死锁。
3. **「有问题？」死按钮**：`dsh-navigate-to-session` 事件全仓（含 vendor）零监听者——dashboard 回对话的入口是断的。
4. **「它先开口」内容物错位**：开屏 = 「你好」+ intake 反问——**即使桌面上已躺着决策/行动/缺口**。实验实锤模型会猜错：第 5 次重载时桌面有 seed 数据，模型仍说「刚开的台面，还没有任何记录」（7 秒、未查任何工具）→ **第一句话必须由客户端拿桌面数据确定性合成，不能靠模型自猜状态**。
5. view preference 写入不生效（当轮主区仍落对话）——D7 未解，非本卡范围。

## 设计判断（考古结论）

- 「它先开口」的台词应是**播报**不是客套：Clay（首屏内容来自自动整合的既有数据）、VandeHei（真实 CEO 长期在用：夜间扫描→清晨送达）、Huper（"tells you what needs your attention before you have to ask"）三方外证一致；五谷渔粉案例（群里 99+ 没人提炼）是内证。
- **中国 SME 调研红线**：一把手是直觉型经营者不是仪表盘动物——播报 = 三行**口语化语文题**+每行可点，不是计数分区/图表。永远不做仪表盘化。
- 拍板产品句（定位卡 18 轮）：「拍板那一下，永远是你」——拍板记录必须读起来是**本人拍的话**，当前是英文机器腔以用户名义入账，违背账面价值主张。
- 输入边界诚实化：不接外部数据源拍板下，「盯到闭环」的现阶段诚实版本 = 「盯你喂进来的每件事到闭环，不丢不漏」。「世界的变化回流」叙事不做超额承诺。

## 分步消化（四片，顺序执行，每片独立提交+验据）

### Slice 1：开屏弧线修复（三个 P0 同片收口）
- 1a FirstMileDock hooks 违规重构（hooks 无条件化）+ **A1 隐藏 CSS 退役**（实施期发现：该 CSS 是自藏的——本 dock 渲染在 vendor composerStack 内部，藏 vendor composer 必然藏掉自己；blank 相位回到诚实堆叠 = hero + 播报卡 + vendor composer）→ composer 复活（断点 2）。
- 1b **auto-send 退役**：has-desk 空白相位 → 客户端拿 walk view（useDesk 订阅——一次性 deskSlice 读不重渲染，真机抓到）确定性合成**三行播报卡**（要你拍的/到期在跟/挡路的缺数，每行可点进对应动作对话，复用面板代发拍板车道）；fresh → 保留 intake 卡。零 token、零等待、重载天然幂等（断点 1、4）。
- 1c 「有问题？」接通：`ctx.layout.selectPanel(null)`（vendor ui-layout 正脸——inject 声明加 `'layout'`），死按钮变真入口（断点 3）。

### Slice 2：拍板感
拍板句中文化（本人口吻：「拍：〈问题〉→〈选项〉」）+ 卡片即时状态（点击即「已拍，记账中」+ 按钮锁定）+ 回执仍由桌面刷新承载（已在）。

### Slice 3：每周一坐
morning-brief 周变体（对账口径：上周拍的/在跟状态/缺的数/本周要你拍的，坏消息先行）+ vendor schedule 周期承载（能力待实施期核实，B1 只有 at 型先例）+ 桌面节律文案一行。

### Slice 4：完整弧线终验
干净 home 真模型逐帧 DOM 全弧线走查（见毕业门）。

## 约束

- 插件边界内做——不改 vendor；D7（默认视图）继续等上游 #8961。
- 不接外部数据源；不做仪表盘化。
- 每片 test-first：开工先答「怎么算对」（可红命令/断言对象），红→绿收口。

## 输掉的方案

1. **auto-send 修去重后保留**——去重只治标；内容物（客套+反问）本身就不是设计要的「它先开口」。
2. **模型侧开屏**（让模型自己查桌面再开口）——实验证明它会 7 秒不查就猜错；第一句话必须确定性合成。
3. **消息版晨报做开屏**——每次打开烧一轮模型；确定性合成零 token 先行，真晨报留给 09:00 投递（B1 既有车道）。
4. **等 D7 再动开屏**——blank 相位是插件可占的（A1 已证明），把「第一眼」白等上游送掉不值。
5. **仪表盘化第一屏**——中国 SME 调研红线（直觉型经营者）。
6. **本卡内做输入边界**（坏消息通道/CSF/每周倒碎片）——真设计题，值得单独推敲卡，不搭车。
7. **修好 A1 的 composer 隐藏 CSS**（2026-10-07 实施期否决）——几何探针实锤它是自藏的：本 dock 挂在 vendor `ConversationContent.tsx` 的 composerStack（hero + input.dock + inputBar）内部，`[data-chain-overlay-fallback]` 一藏藏全家；A1 时代的「7/7 关键词命中」走的是 DOM 大纲匹配，隐藏元素也在大纲里——**可见性从未被证明**。退役优于修补。

## 验收矩阵（2026-10-08 补，用户点名敲打 plans 质量；方法 = [validation-design](../playbooks_plan_and_validate/validation-design.md)）

**为什么要补**：本卡原来只有一个端到端走查当毕业门，而它同时声称证明了**确定性**（重载幂等、会话不增殖）、
**编排**（composer 存活、面板接通）与**模型行为**（播报内容、拍板口吻）三类——`validation-design` §25
明说"不要用一个端到端 demo 证明全部三类"。下表把三类拆开、各归各的 owner，毕业门只引用本表。

| # | 行为（可观察结果 → 需求溯源） | 类 | 输入 / 状态 | 判 pass/fail 的信号 | 负例 / 互补状态 | 证据 owner（命令或路径）**能证明什么** | 真人判断 |
|---|---|---|---|---|---|---|---|
| 1 | 回来的一把手开屏见**三行业务播报**（要你拍的/在跟的/还缺一个数），非「你好」——它先开口（断点 4） | 确定性 | blank 会话 + walk view 有数据（decisions/actions/gaps 各一） | 文案含「一把手桌面」「要你拍的」「老客户续约要不要涨价」「在跟的」「还缺一个数」；三行各是 button 且带 onClick | **互补**：无数据 → 走 intake 卡（不是空播报、不是三行空壳）；fresh → 保留 intake | `packages/dsh-smart-assistant/tests/client/client-first-mile.spec.ts` »'a returning principal opens on the brief, not a greeting (261007 Slice 1b)' + »'renders nothing once the session has any content' + »'tells a first-time principal what to say and offers the desk' ——**证明**合成规则与分支；**不能证明**真实浏览器里它长得可读 | 播报话术是否符合"口语化语文题、不是仪表盘"红线（见下 R5） |
| 2 | 重载 **不增殖、不重发**（day-2 打开不假装初次见面） | 确定性 + 编排 | 同一 home 连续重载 ×3 | 会话数恒定、无 `[桌面] 你好`、播报常在 | **被取代的旧行为**：auto-send 版 10 分钟 6 个幽灵会话、每条 ~44.6K tok | **客户端 half（机械，在场）**：`client-first-mile.spec.ts` »'a returning principal opens on the brief, not a greeting (261007 Slice 1b)'——**只证明** blank+has-desk 时渲染的是决定性播报卡。**2026-10-08 校正**：原行声称"夹具须覆盖 blank 且 has-desk 时不调 sendPrompt"——**夹具并不覆盖**：该 spec 面 `sendPrompt` 零引用，"不重发"在机械层**无断言**。**行为 half**：走查记录（`/tmp/ux-shots/slice1-*`）的 ×3 重载——**证明**当时那次不增殖；**不能证明**长期多会话行为（归 eval/真用） | 无 |
| 3 | 缺 composer 的相位**能打字**（主线不死锁，断点 2） | 编排 | blank 相位（Day-0 intake）与 has-desk 相位（Day-2 拍板） | vendor contenteditable 在场、真打字有反应 | **互补**：A1 隐藏 CSS 时代"能打字"是假绿——曾用 DOM 大纲匹配（隐藏元素也在大纲里）判 pass；负例须证明**可见性**而非存在性 | **几何/可见性探针**（`/tmp/ux-shots/slice1-*`，一次性走查，无耐久 owner——见矩阵尾注）；渲染面的耐久 owner 是 `snapshots/web-face/`（`pnpm web-expected`）——**证明**真渲染下可见可交互；**不能证明**其他相位。⚠️ blank 场景当前夹具腐烂（同 #7） | 无 |
| 4 | dashboard 的「有问题？」**真回对话**（死按钮变真入口，断点 3） | 编排 | 点击 dashboard 的 onAsk | `ctx.layout.selectPanel(null)` 被调用、主区回会话面 | **负例/死路**：`dsh-navigate-to-session` 事件全仓（含 vendor）**零监听者**——旧实现是断的，夹具须钉住走 `ctx.layout` 而非该事件 | `packages/dsh-smart-assistant/tests/client/client-dashboard.spec.ts` »'onAsk returns to the Conversation through ctx.layout (261007 Slice 1c)' ——**证明**路由对；**不能证明** vendor 侧真切了面板（归走查） | 无 |
| 5 | 拍板记录**读起来是本人的话**（中文口吻，非英文机器腔） | 确定性 + 模型行为 | 点 dashboard 决策选项 | 入账语句形如「拍：〈问题〉→〈选项〉」、中文；卡片即时「已拍」锁定 | **互补**：英文机器腔版是**已修的病**（Slice 2 前）——夹具须覆盖"不出现英文机器腔"；回执退场后新决策上位 | `client-dashboard.spec.ts` »'option click proxies the decision in the principal-voice Chinese lane (261007 Slice 2)' ——**证明**车道与文案形态；**不能证明**模型侧是否真把这段话按本人语气记账（归 eval/真机） | **语气是否真像本人**（taste，机器不判）——终验项 |
| 6 | 周坐排程落盘：周一 09:00 Asia/Shanghai + at 型 due | 确定性（调度）+ 模型行为（技能守约） | 真模型跑 morning-brief 周变体一节 | schedule 两条落盘、时区正确、同一回合不堆叠（`schedule_list` 防堆叠） | **互补**：重复触发不产生第二组排程（防堆叠）；`weekly` 为 vendor 原生承载（B1 实施期待核实，当时只有 `at` 型先例） | **机械 half 缺耐久 owner**：排程落盘读的是会话日志（`session.v<n>.jsonl.zstd`，读法 owner = [`dev/reports/usage-report.mjs`](../../dev/reports/usage-report.mjs) `sessionLogs`/`readEvents`），但**未固化成一次性可复跑的命令**——本卡只有走查记录（`/tmp/ux-shots/slice3-*`）。**模型 half**：`pnpm eval --only <task-id>`（任务清单 `pnpm eval --list`；家 = `dev/eval/`，其 AGENTS 是 owner）——本卡未挂具体 task-id，**属未指定，不是已证明**。**证明**该回合落盘正确；**不能证明**跨周边界行为（归真用） | 周坐这四个对账口径是不是一把手真想要的（业务价值） |
| 7 | 桌面/面板**渲染期望不回归**（结构性外观） | 编排（渲染） | 隔离 home 真渲染，两场景 | `pnpm web-expected` 零 diff | **现状阻断**：blank 场景夹具前置腐烂，owner = [`snapshots/`](../../snapshots/AGENTS.md)（**2026-10-08 校正**：原行归 [261007-bigfile-split](../_done/_closed_plans/261007-bigfile-split.md)，而该卡归档时不吸收此观察、明写交回 snapshots——旧指针指给了一张拒收的卡）——**该行当前不可判，不得报绿** | `snapshots/web-face/` 两场景（`pnpm web-expected`）——**证明**渲染期望；**不能证明**交互逻辑（client spec 管） | 无 |

**R5 产品红线（贯穿 #1、#5、#6 的真人判断）**：一把手是直觉型经营者不是仪表盘动物——播报是**三行口语化
语文题 + 每行可点**，永远不做计数分区/图表。这条是[中国 SME 调研](../reference/positioning/261005-chinese-sme-boss.md)
红线，机器只证明"有三行且可点"，**不得**把机械绿升级为红线通过。

**矩阵的诚实边界**：上表 #1-#7 的机械行全绿**仍不等于**毕业——#5、#6 的真人判断与"这回不一样了"的
总体体验终验是独立的第四条轴（见毕业门）。技术绿不被提升为产品验收（[validation-judgment](../playbooks_plan_and_validate/validation-judgment.md) §1）。

**⚠️ 证据耐久性缺口（2026-10-08 登记并定 owner；本卡不在轮内解决）**：上表 #3、#6 的走查证据住在
`/tmp/ux-shots/`（49 个文件，31 个 slice 证据）——**`/tmp` 重启即失**。`snapshots/` 按
[其契约](../../snapshots/AGENTS.md)只收 session 回放与 web 渲染期望两类，**走查截图不在任何已收编
owner 面**，故本卡不擅自把它们塞进 `snapshots/`（那是越界，也是
[validation-evidence](../playbooks_plan_and_validate/validation-evidence.md) 明禁的"把 snapshots 当通用证据桶"）。
两处 walkthrough 证据因此**只活在易失路径上**：

- 影响：#3、#6 的行在 `/tmp` 清空后**不可复核**——按
  [validation-judgment](../playbooks_plan_and_validate/validation-judgment.md) §1，证据不可复核 = **blocked，不是 pass**。
- 已做的缓解：本表把每行的**断言对象与判读要点**写全（不依赖图片本身也能理解判了什么），
  并把 commit 锚点（`7fe774a`/`636a4a6`/`532c19d`）写进状态行。
- **owner 判定（2026-10-08 补，原缺口无出口）**：产图不是记录。本表 #3、#6 的**可复核承重件**已降级为
  三样耐久物——(a) 本表的断言对象与判读要点，(b) commit 锚点，(c) **读法 owner**：排程落盘读会话日志，
  读法住在 [`dev/reports/usage-report.mjs`](../../dev/reports/usage-report.mjs)（`sessionLogs`/`readEvents`，
  与 `pnpm usage` / `pnpm desk-loop` 同源）。截图只是当年的过目材料，**不是任何行的 owner**。
- **触发条件**：同类"只有跑起来才看得出"的 model-visible/渲染证据**第二次**靠 `/tmp` 手工留存时，
  按 `snapshots/` 的升级触发精神立卡讨论第三类 admitted shape（或把走查协议固化进 probe 脚本），
  不提前预建。

## 毕业门

**四门判据**（引用本卡上方 `## 验收矩阵` 节，不在此复述行）：

1. **该不该** = 该做（已裁决，四片交付）。
2. **实现证据**：矩阵 #1-#7 逐行按各自 owner 取数；**#7 现状阻断**（blank 场景夹具腐烂，owner =
   [`snapshots/AGENTS.md`](../../snapshots/AGENTS.md)）——按 [`scripts/AGENTS.md`](../../scripts/AGENTS.md)
   纪律**不得写成绿色**。
3. **真人判断（唯一未走完的一环）**：用户终验。矩阵 #5（拍板语气像不像本人）、#6（周坐对账口径
   是不是一把手真要的）与 R5 红线（不做仪表盘化）三条是**机器不判**的品味/业务判断。
4. **归档后去向**：过则与 [261006](261006-chief-of-staff-experience.md) 一并迁 `_done/_closed_plans/`；
   不过则按具体不过的矩阵行回流为缺陷卡（不重开本卡）。

**终验锚点**（与 261006 共用一份可判清单，记录家在本卡）：终验 = 本人拿干净 home 走一遍，
逐条对 [261006 毕业门](261006-chief-of-staff-experience.md)的五项判据（第一眼是内容不是空框 /
说完话主区仍在桌面 / 拍板读起来是本人的话 / 它记得我 / 与旧版对照"不是同一个产品"）打勾或打叉。
**不是**抽象地问"好不好"——原句「这回不一样了」无锚点，不同人读出不同结论，等于不可判。

**弧线走查记录（2026-10-07，证据 `/tmp/ux-shots/slice1-*…slice4-*`，**证据耐久性缺口见矩阵尾注**）：**
- 重载幂等：×3 重载会话数恒 2、无 `[桌面] 你好`、播报常在（对照修复前：10 分钟 6 条幽灵会话）✔
- 播报卡：三行业务话术可见可点（y=408 实渲染），行点击进中文拍板对话 ✔
- composer：全相位存活（vendor contenteditable），Day-2 拍板与 Day-0 intake 两轮真打字 ✔
- 拍板：中文句入账（`桌面面板代本人拍板`）、卡片即时「已拍」锁定、回执退场、新决策上位 ✔
- 有问题：dashboard 点击 → `selectPanel(null)` → 主区回会话面 ✔
- 周坐：真模型同回合双排程落盘（`weekly` 周一 09:00 Asia/Shanghai + `at` 10-10 due，prompt 逐字守约）✔
- Day-0：Day-0 卡 → 「开始第一件事」→ intake 提问 → 打字回答 → 桌面长出首份决策 → 重载播报接班 ✔
- web-expected 两场景重录 PASS；test 45 件 386 + verify 34 全绿 ✔（历史门数；当前 = verify 36 / test 50 件 416）
  ——**「两场景重录 PASS」是 2026-10-07 当时的事实**；2026-10-08 起 blank 场景夹具前置腐烂，
  `web-expected` 对 blank **不可判**（矩阵 #7）。此行不改写历史，但**不得被引作当前证据**。
- **未勾：用户终验「这回不一样了」（毕业门最后一环，等本人上手）**
