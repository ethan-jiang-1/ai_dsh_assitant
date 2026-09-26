# 运行中页面独立体验反馈与分歧

日期：2026-09-26 · 状态：**进行中**

## 1. 范围与证据边界

这是对本会话运行中的 dev profile 页面、当前会话工作区的独立体验反馈，不是截图视觉评审，也不代表真实 CEO 部署的普遍内容。浏览器观察只限本次会话的当前 build：`127.0.0.1:63944` 页面可读左侧三面板；首开桌面先为空、稍后填充；在旧会话点页头「桌面」和主面板「在对话旁打开」均抛 `TypeError: Cannot read properties of undefined (reading 'require')`，右栏没有出现。该错误的可复核代码原因是：`openBeside` 先把 `deskSidebarRight.openTab` 摘成裸函数再调用，丢失 receiver，[client 源码](../../packages/dsh-smart-assistant/src/client/index.ts#L571-L579)；vendor 的 `openTab` 立即调用 `this.require()`，[DSH 实现](../../vendor/dsh/packages/client/ui-sidebar-right/src/client/service.ts#L323-L330)。这解释当前 build 的本次错误，不声称其它部署均复现，也不构成右栏视觉判断。最小修复建议是保持对象 receiver 调用 `deskSidebarRight.openTab(kind)`，本轮不改代码；不记录访问 token。

本次页面可读的短原文：首条「培养面接着做深，还是先停一停？」；知识室主要列 DSH 机制与项目知识；记忆室有大量仓库开发纪律。这些是 dev profile / 当前会话工作区的瞬时观察，不应推广为真实 CEO 部署的普遍内容。已有同日数据核实也记录了首条文本与开发素材分布，见[对抗评审 §0](2026-09-26-adversarial-design-review.md#L14-L25)和[§2](2026-09-26-adversarial-design-review.md#L33-L52)；当前运行时 `.desk/state.json` 未纳入版本控制，不以它的路径链接充当持久证据。此观察暴露的是缺少“哪些内容有资格进入委托人面”的准入规则。

代码推断：三室的数据入口是同一个 `DeskData`，面板分别渲染桌面、知识页/技能、记忆；对应[client 源码](../../packages/dsh-smart-assistant/src/client/index.ts#L114-L129)、[桌面](../../packages/dsh-smart-assistant/src/client/index.ts#L754-L940)、[知识室](../../packages/dsh-smart-assistant/src/client/index.ts#L969-L1023)、[记忆室](../../packages/dsh-smart-assistant/src/client/index.ts#L1026-L1076)。初开空态后再填充与异步走最近会话工作区文件的实现相符，但本次观察不等于性能测量，见[读取逻辑](../../packages/dsh-smart-assistant/src/client/index.ts#L159-L213)。

## 2. 独有体验反馈

### 2.1 首屏先回答“为什么来这里”

本次页面首条“先办”是「培养面接着做深，还是先停一停？」；它是产品/助手自身的 upkeep 问题，不是 CEO 经营动作。此文本的同日数据核实见[对抗评审 §0](2026-09-26-adversarial-design-review.md#L18-L20)；代码把 `decisions[0]` 直接升格为 lead，[client 源码](../../packages/dsh-smart-assistant/src/client/index.ts#L763-L794)。因此当前首屏把“助手家务”放大成主入口，不能证明“先办”策略有效；它只证明内容准入先于视觉层级。

建议（待用户拍板）：保留“先办”这个交互位置，但只有会改变外部经营动作、确实需要本人判断的事项才可进入；若没有这类事项，应明确显示“目前没有需要你拍板的经营事项”，并把助手家务降为次级入口。与此重叠的排序字段、业务/upkeep 规则和折叠代价不在本文件重写，直接见[对抗评审 §3](2026-09-26-adversarial-design-review.md#L54-L68)。

### 2.2 三室的分歧：可保留，但改成三个用户问题

我的建议不是按对抗评审 §2 直接重切成 Inbox / 审计 / 忙什么。建议暂保留三室作为稳定的方向记忆，但把它们解释为三个用户问题，而不是三个内部数据容器：

| 现有入口 | 建议回答的问题 | 内容边界（建议） |
|---|---|---|
| 我的桌面 | **现在要采取什么行动？** | 要我拍板、要我推进、卡在哪里；首屏经营优先 |
| 知识室 | **你凭什么这样判断？** | 可核验依据、来源、适用范围、待确认草稿；不是技能维护间 |
| 记忆室 | **你把我理解成什么？** | 关于本人偏好/决定/事实的可纠错画像；不是仓库纪律回收站 |

这是信息架构建议，不是结论：它保留用户已熟悉的三入口，同时把“行动 / 依据 / 对本人理解”置于导航语义。是否接受，需用户在“保留三室”与[对抗评审 §2 的直接重切方案](2026-09-26-adversarial-design-review.md#L33-L52)之间拍板。当前页面只能证明内部素材会进入这些入口，不能证明哪种 IA 对 CEO 最好。

### 2.3 从决定到证据、纠错、回执要成为一条可核对的链

代码推断当前链路是：按钮发普通 session prompt，模型改工作目录，面板随后读取文件；`sendPrompt` 在 prompt 被受理后即清掉 `busy`，[client 源码](../../packages/dsh-smart-assistant/src/client/index.ts#L237-L273)；多数动作再用固定延时重读，[动作重读](../../packages/dsh-smart-assistant/src/client/index.ts#L284-L406)。技能契约要求同轮重写文件，但“动作都会从文件回来”仍依赖模型遵守，[desk-refresh 技能](../../packages/dsh-smart-assistant/presets/assistant/skills/desk-refresh/SKILL.md#L140-L156)。

建议（待用户拍板）：用户应能沿同一行看到“我点了什么 → 依据/选项 → 当前处理中 → 助手回了什么 → 文件如何改变 → 是否需要纠错”。这不是要求用户相信自动刷新；它是“决定到证据核验与纠错回执”的闭环验收。协议字段和忙时闸门的具体方案已在[对抗评审 §4、§6](2026-09-26-adversarial-design-review.md#L70-L90)与[§6](2026-09-26-adversarial-design-review.md#L114-L131)记录，本反馈不重写。

### 2.4 明确“已提交”不等于“已完成”

当前实现把 prompt 返回成功作为 settled，并立即解除忙态；这只能说明消息已被受理，不能说明模型已写完 `.desk/state.json`。[client 源码](../../packages/dsh-smart-assistant/src/client/index.ts#L244-L273)同时把“回复在对话里、桌面稍后跟上”放在状态文案中，[刷新行](../../packages/dsh-smart-assistant/src/client/index.ts#L688-L714)。本会话首开空态后填充也提示了这一异步边界，但不提供耗时或成功率结论。

建议（待用户拍板）：至少分成“已提交 / 助手处理中 / 已写回可核验 / 失败或需重试”；完成条件应是读到新鲜文件或明确失败，而不是 prompt promise resolved。具体 pending、回执、数据闸门已有重叠评审，见[对抗评审 §0、§4](2026-09-26-adversarial-design-review.md#L14-L25)；此处只保留体验上的状态语义。

### 2.5 压缩不相关开发内部素材

当前技能区会把随包与学来的技能逐条渲染，契约还要求技能描述写入面板；见[client 源码](../../packages/dsh-smart-assistant/src/client/index.ts#L942-L1023)与[desk-refresh 技能](../../packages/dsh-smart-assistant/presets/assistant/skills/desk-refresh/SKILL.md#L131-L138)。本次页面中出现 DSH 机制、仓库、评测和开发纪律，属于 dev profile 的真实内容，不应直接推广为 CEO 内容，但它暴露出缺少“哪些内容有资格进入委托人面”的政策。

建议（待用户拍板）：先按受托人价值过滤，再谈折叠/搜索；默认不把开发技能描述、仓库维护纪律、评测过程放在 CEO 首屏。对抗评审已提出知识室技能与清单裁剪的重叠判断，直接见[§2](2026-09-26-adversarial-design-review.md#L39-L52)和[§6](2026-09-26-adversarial-design-review.md#L121-L131)，本文件不重复其砍单方案。

## 3. 三项优先级与验收问题

以下是建议优先级，不代用户决定：

1. **内容准入与首屏经营优先**：真实 CEO 场景若无经营待决，首屏是否诚实地显示“暂无需你拍板”，而不是放大助手家务？三秒内能否说出“我来这里要做什么”？
2. **可核验的异步闭环**：从一条决定进入依据查看、回答/纠错，到回执和文件更新，用户能否区分已提交、处理中、完成、失败？完成后是否能确认哪一行被改了？
3. **三室语义与密度边界**：用户是否把三室理解为“行动 / 依据 / 对本人理解”，而非内部房间？在真实窄栏截图或录屏出现前，不对字号、对比度、折行、视觉层级下结论；只验内容是否有资格出现、每行是否有明确下一步。

## 4. 与已有对抗评审的关系

对抗评审已核实排序、异步协议、密度、裁剪与代码级 A1–A10，详见[对抗评审 §0、§2–§7](2026-09-26-adversarial-design-review.md#L14-L146)；本文件不复制缺陷清单或修复包。

本文件的独有增量是：本次运行页面实际可读文本、当前 build 中右栏开启报错与源码对应、首开异步空态，以及由 dev 内容外溢提出的“委托人内容准入”问题；右栏不可作视觉判断。是否保留三室、如何命名和是否按三项优先级开工，留给用户拍板。
