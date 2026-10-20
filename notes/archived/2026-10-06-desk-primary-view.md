# 桌面主对象化（新 UX 第一刀）：桌面升为 Conversation View 主视图

日期：2026-10-06 · 状态：**implemented**
已归档：2026-10-20（会话内桌面视图已被唯一桌面反转；当前合同 = docs/architecture.md，本篇仅历史）
- **既有两场景复验 PASS（2026-10-06，新构建）**：blank-first-open 与 first-open-draft-banner 在隔离 home 全流程重跑均 PASS，
  期望文件**零差异**——桌面视图与三步卡重写不在两场景捕获面内，不回归成立（中间踩过的坑如实记：seed patch 必须 boot 前落、
  隔离 home 需带凭据否则 API Key 弹窗入镜——seed 无 creds 子命令是 P2 已记缺口）。
- **如实偏差**：桌面视图自身的持久场景未建——非空白会话的确定性种子设计（session 记录文件预置）是真设计题，记为后续切片；
  本片渲染证据 = shots --eval 交互态 DOM（点击链：开会话→点桌面→内容区渲染，/tmp/dsh-webui-shots/desk-view-final-*.dom.txt）。
- D7 已记入上游台账（默认视图不可插件化），递交与否用户拍板。（用户 2026-10-06 点头推进并要求显性化追踪；方向 owner=[定位卡](../../_backlog/_archive/settled_issues/261005-open-value-deficit.md)，毕业门 owner=[自洽卡](../../_backlog/_archive/settled_issues/261005-turnaround-coherence.md) 形态迁移行，判据承接自[首开卡边界收口](../../_backlog/_archive/settled_issues/261001-first-open-ux.md)）

- **当前取代检查**：本篇仍拥有已交付的会话内 view、偏好记忆、locale/审批与既有回归事实。[全局总助桌面提案](../implemented/2026-10-06-desk-operating-entry.md)部分反转本篇关于全局冷启动默认入口与 D7 依赖的取舍：默认入口子切片已通过真实构建物 Cordis/Loader/slots/layout 组合与两场景浏览器 DOM 复验，全局 main 默认入口不再依赖 D7。这里只取代入口选择；统一经营投影与事项处理读回尚未交付，不能把它们或本篇历史全链结论视为新提案通过。其他本篇决定继续有效。
- **2026-10-11 部分反转**：[唯一桌面](../implemented/2026-10-11-one-operating-desk.md) 下架本篇落地的会话内「桌面」视图、`DeskSummaryDock` 摘要条与视图偏好预写——真人走查证实两张桌面分不清、真模型把业务内容路由进 `.desk/state.json`；账本投影成为唯一「桌面」。本篇的缝探索事实与历史保留，被反转面的删除清单在 [清理卡](../../_backlog/_archive/settled_issues/261011-session-desk-cleanup.md)。

## 问题（可观察行为）

用户打开产品看到的是「空 composer + vendor hero」——**主对象是会话，桌面只是右栏一个 tab**。定位卡诊断：一把手的主对象应是「桌面」（要你拍的/缺什么/在跟的事），会话降为桌面上的一种动作（点决策卡进拍板会话）。当前桌面有全部数据载体（DeskData 契约）却只有侧栏位置。

## 缝探索承重事实（2026-10-06，vendor 源码可指认）

1. **`conversation.view` 槽可承载完整视图**：注册项 `{id, label}` + 组件 → 会话区视图标签 + 正文按 viewId 渲染（`ui-conversation/apply.ts:182-230`：viewTabs() 迭代槽项、`renderSlot('conversation.view', …, {only: viewId})` 渲染注册组件；槽声明 `{kind:'list', scope:'session'}` apply.ts:357）。生态先例：dsh-morning-paper 报纸式视图同款路径。
2. **默认视图 vendor 硬编码**：`view-selection.ts:5-7` `DEFAULT_VIEW_ID = 'chat'`，resolveActiveView 只回退到 chat——**插件不能设默认视图**；偏好按会话记忆（新会话总落 chat）。
3. **空白相位（未说话）视图区渲染 null**（`DefaultConversationViews.tsx:49` `session.blank && phase==='blank' → null`）：EmptyHero + composer 为 vendor 自持；插件可用缝 = `conversation.hero.brand.mark/workspace/agentPreset`（single 槽）+ `conversation.composer.dock`（list 槽，我方首开条已占用）。
4. 视图正文拿会话上下文的方式待实现期确认（槽 scope:session 的渲染传参链；右栏 tab 体有 sessionId 平面 prop 先例）。

## 提案（插件边界内的诚实形态——不硬造 vendor 没有的东西）

**切片 1：桌面视图**——向 `conversation.view` 注册「桌面」视图（id `dsh-smart-assistant-desk-view`），正文复用既有 DeskPanel 组件树（lead 卡/一键选项/缺数/行动表/诚实空态，全部已在 client/index.ts），读当前会话的桌面片（R11 per-session store 既有机制）。桌面从右栏 tab 升为**主区 first-class 视图**，与 chat 并列；用户在该会话点过即记忆偏好。

**空白相位不动 vendor hero**（事实 3 限制）：我方首开条（composer dock）继续承担「打开第一眼」的引导，与 A' intake 衔接——首会话它先问；离开空白相位后桌面视图即可用。

**当时的会话内默认桌面路径**被事实 2/3 挡在 vendor 边界，D7 于 2026-10-06 递交为 discussions/8961，历史见[上游台账](../../_backlog/_archive/research/upstream/261001-upstream-candidates.md)。当前全局默认入口由独立 main 承载，不再等待会话内默认 view；Conversation view 的公开限制仍成立。

**空态三步卡重写**（首开卡交接项）：新形态语境（桌面=视图、会话=动作）下重写三步文案，与 A' 的「它先问」一致（第一步不再是「你在对话里说句话」，而是它的开场问题）。

## 能力环闭环（B1-B3，2026-10-06 落地战役续篇——用户铁律「goal 结束前零交互，错了回头改」）

- **B1 晨报 v1**（`37d3073`）：`morning-brief` 策展技能 + manual v13 指针——承诺即排程（desk action 带 due → 同回合 schedule_create[09:00 默认/IANA]），到期投递 = 简报时刻（到期/要拍板/阻塞缺口三块一段话），延期→update 同步、静默→delete 记忆防复建、预算=每 due 一次投递；vendor schedule 家族原生承载（零自建机制）。
- **B2 审批内联**（`c606567`）：技能提案入 KnowledgePanel——CorrectableRow 一键批准/拒绝（拒绝可填理由），面板代发 prompt 通道（此 pin 下直调 codec 拒绝的诚实回退），与知识草稿批准同形——全部审批面一过性。
- **B3 全链终验**：真模型五轮 naive 走查——英文叙述 **0 条**；桌面：1 决策（4 选项）+ 4 真缺口 + **2 动作**（due 10-07 + 10-20）；schedule：**2 条排程**均 `at` 型、目标 `01:00Z` = 北京 09:00 ✓、prompt 含 `[due follow-up]` + morning-brief 指令 ✓、desk/schedule 日期一一对应 ✓。
- **能力环判定**：打开→说一句话→它先问（三问带弧线框架）→答→拍板选项呈上→到期它推→内联确认——全程天真身份自测走通且每步知道「我在做什么、下一步是什么」。

## Phase A 形态迁移（2026-10-06 插件边界内步步为营——vendor 三重阻挡下的最大化可见度）

三重阻挡（vendor 硬编码）：①DEFAULT_VIEW_ID='chat'（view-selection.ts:5-7）②空白相位视图区渲染 null（DefaultConversationViews.tsx:49）③composer 开发者语言（vendor locales）。Phase A = 在插件边界内让新形态尽可能可见。

- **A1 富桌面落地卡**（`678b106`）：空白相位 `conversation.input.dock`（vendor 无高度限制）替换细带为实质卡片——fresh folder 模式（弧线说明+决策简报承诺+开始按钮[面板代发]）/ has-desk 模式（要拍 N+在跟 M+缺 K+打开桌面全景）。
- **A2' 常驻桌面摘要条**（`69b7bf5`）：`conversation.input.dock`（scope=session）在每条非空白会话 composer 上方注册 DeskSummaryDock——三 chip（要拍/在跟/缺）+「桌面→」一键切桌面 tab；空桌面 return null 不占位。
- **A3 自测走查全通**（真模型 + 无头浏览器逐帧 DOM 证据）：帧 1 空白相位富落地卡 7/7 关键词命中 ✓；帧 2 种桌面文件后非空白会话摘要条 4/4 命中（`要拍 1·在跟 1·缺 2·桌面→`）✓；帧 3 桌面视图 tab 点击后主区 6/6 命中（节律句/首个决策/选项/due）✓；preflight 绿 ✓。
- **Phase B**（上游 D7——默认视图可配置 / 空白相位主区可插件贡献）：已入上游台账，vendor 改后触发。
- **Phase C 的入口依赖已被部分取代**：独立全局 main 可默认桌面，不以 D7 为触发。事项绑定会话与持久读回属于[全局总助桌面提案](../implemented/2026-10-06-desk-operating-entry.md)，尚未由默认入口证据覆盖。

## 发行预置拍板（2026-10-06 定案：用户读数确认形态操作面，维持现状即证据支持的形状）

**定案**：`locale.preference: zh` **随发行维持**（已在 bundle patch 内，261001 用户投诉+目标用户证据）；`workspace-controller.documentsDirectory` **不随发行维持**（全限定路径不可移植；vendor 默认即首用设计路径；本仓失败为 headless 进程特例——留 dev/trial profile 层）。`ui-chat` 行维持 standing 退役条件。**原拍板材料：**

| 行 | 证据 | 建议 |
|---|---|---|
| `workspace-controller.documentsDirectory`（P1-C） | vendor README：**全限定 Host 目录覆盖，无便携形式**；vendor 默认=系统 Documents 目录（首用设计路径，TCC 正常弹窗授权）。本仓 P1-C 失败是**本机 headless/sandbox 进程上下文**的特例，非装机普遍态；随 bundle 预置会把所有安装钉死到一条机器路径 | **不随发行预置**——留在 dev/trial profile 层作环境特定配置；真装机首开走 vendor 设计路径（Documents + 授权弹窗），失败兜底=文件夹选择器（vendor 既有） |
| `locale.preference: zh`（261001） | 无偏好时首开语言随浏览器协商（英文浏览器落 en——用户本人 2026-10-01 的直接投诉）；目标用户=中文管理者；Settings 可改且持久化到 home 层覆盖 | **建议随发行预置 zh**（产品声音决策，用户可一并确认） |
| `ui-chat.transcriptView: detailed` | vendor 预构建 lib 落后其 src 的兜底缺口（首开崩溃实测）；退役条件=上游发布物确认带兜底 | 维持现状（standing 条件，非新决定） |

## 输掉的方案

1. **桌面为默认落地视图（打开即见桌面）**：被 vendor 硬编码（事实 2）与空白相位自持（事实 3）挡住——硬造需要 vendor 改动，走上游 D7；插件边界内输给「视图并列 + 偏好记忆」。
2. **替换/遮盖 vendor hero**：无主区槽可占（事实 3 只有 chrome 级座位）——输给保留 hero + 我方首开条引导。
3. **桌面视图重写组件树**：DeskPanel 已被 43 件 spec 覆盖（色彩契约/空态/回执）——复用胜过重写。
4. **等上游 D7 落地再做本切片**：桌面 first-class 视图与默认落地是两步——本切片不依赖上游，先拿主区位置。
