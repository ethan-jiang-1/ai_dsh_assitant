# 桌面主对象化（新 UX 第一刀）：桌面升为 Conversation View 主视图

日期：2026-10-06 · 状态：**proposed**（用户 2026-10-06 点头推进并要求显性化追踪；方向 owner=[定位卡](../../_backlog/plans/261005-open-value-deficit.md)，毕业门 owner=[自洽卡](../../_backlog/plans/261005-turnaround-coherence.md) 形态迁移行，判据承接自[首开卡边界收口](../../_backlog/plans/261001-first-open-ux.md)）

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

**会话降为动作的完整形态**（桌面为打开即见的默认落地）被事实 2/3 挡在 vendor 边界——**新增上游候选 D7**（默认视图可配置或插件可贡献落地视图/空白相位主区），记入[上游台账](../../_backlog/reference/upstream/261001-upstream-candidates.md)随下次递交；不阻塞本切片。

**空态三步卡重写**（首开卡交接项）：新形态语境（桌面=视图、会话=动作）下重写三步文案，与 A' 的「它先问」一致（第一步不再是「你在对话里说句话」，而是它的开场问题）。

## 验收

- client spec：视图注册（id/label/组件经 classic-script 装置物化）、正文组件树、既有 desk 断言不回归；
- build + `pnpm preflight`（组合解析/boot 图）+ web-expected：新增「桌面视图」场景期望（非空白会话点开桌面视图的 DOM 证据），既有两场景不回归；
- 真机演示：干净 home 起服务，判据 = **「本人判定打开不困惑」**（首开卡转移判据，挂在新形态：空白相位引导 + 首会话 intake + 桌面视图的合成体验）；
- 自洽卡四件门逐件闭合记录：入口证据=本卡事实 1-4；旧会话回路=视图是 UI 层叠加、会话数据与既有 right-tab 面板不动（回归由既有 client spec 守）；示例/真实边界=沿用 desk 数据标注纪律；审批/撤销=沿用面板既有动作路径（remote.session.prompt 车道，不新增直调）。
- DeskData 契约不动；四工具/persona/组合行零变化（非模型可见面）。

## 输掉的方案

1. **桌面为默认落地视图（打开即见桌面）**：被 vendor 硬编码（事实 2）与空白相位自持（事实 3）挡住——硬造需要 vendor 改动，走上游 D7；插件边界内输给「视图并列 + 偏好记忆」。
2. **替换/遮盖 vendor hero**：无主区槽可占（事实 3 只有 chrome 级座位）——输给保留 hero + 我方首开条引导。
3. **桌面视图重写组件树**：DeskPanel 已被 43 件 spec 覆盖（色彩契约/空态/回执）——复用胜过重写。
4. **等上游 D7 落地再做本切片**：桌面 first-class 视图与默认落地是两步——本切片不依赖上游，先拿主区位置。
