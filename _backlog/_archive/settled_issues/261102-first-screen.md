---
status: 已结
opened: 2026-11-02
---

# 推敲：首屏归谁——「门在 dashboard 里」只覆盖一条路径，另外两条要先定形态

> 立卡：2026-11-02 ｜ 状态：已结 ｜ 毕业：做现在 ｜ 去向：implemented ｜ 可关闭：是
> 定性：2026-11-03 用户选定 **B+** / **未绑定禁用输入** / **本轮点名落地**（授权来源 = 2026-11-03 对话，范围 = 本卡 S1–S5）。
> 结论：S1–S5 全交付——会话门（dock + composer block）、记住上次主视图、证据面（非产品场景 `onboarding:false` + 产品场景重录 + 真机探针）、合同与决定 note；去向 = [implemented note](../../../notes/implemented/2026-11-02-first-screen-ownership.md)。
> 审查：agent — 机械 `typecheck`/`build`/`test`/`verify` + `web-face-check`（product-onboarding 重录、product-workspace-gate、blank/desk/banner/viki 非产品面）+ `product-first-screen` 探针；语义自审跨 host/client/合同；用户验收 = D1/D2 拍板（2026-11-03）。

**问题与期望结果：** 产品打开时那一屏（还没开会话）现在由"本包 dashboard 先选"占住，工作区门渲染在
dashboard 里面。真机实验（[机制与实验](../research/261102-first-screen/261102-first-screen-mechanism.md)）证明：
**点「新会话」就绕过门**，会话落到 DSH 的默认工作区，交付包也落那儿——正是产品要避免的"装了不亮"。
期望的结果：首屏归属有明确规则，且"没绑项目就不能开始干活"这条不靠用户走对路径。

**当前情况（已实测）：**
1. `main` 是**键控槽**：多个插件可各注册一个 `main`，`layout.selectPanel(key)` 决定显示谁，`null` = 会话；
   选择**不持久**（重载重放），**没有仲裁**（多个插件启动自选 = 后写者赢）。
2. 本包 `selectDashboardByDefault` 只在 `activePanelId === null` 时选自己，但别的插件无条件自选就会赢。
3. 门（`product-gate.ts`）的渲染位置就是 dashboard 内部，注释自述 "in front of the `main` dashboard"。
4. 平台自己的"第一次来"语言在会话里：hero 席位、welcome-notice、`conversation.input.dock`；
   本包已占其中三个席位。
5. **刷新会把用户拽走**（E5）：会话 id 被原生恢复，但面板重置 + 我们自选 dashboard → 屏幕回到门/桌面，
   不是刚才那段对话。对一个对话型助手，这是每次刷新都发生的体验损伤，不只是首屏选择。
6. **平台原生的"没工作区就不给输入"在实际首启不触发**：`ConversationContent` 只对 `sessionId === undefined`
   或 hero 下没有工作区标题的会话把 composer 置 `inert`；但首启时 `ui-workspace` 的 `restoreSelection`
   会先 `initializeDefault()`（`<Documents>/deepseek-harness/default-workspace`）再 `connectWorkspace()`
   开一个空会话。2026-11-03 全新隔离 home 实测：侧栏出现 `工作区 / 默认工作区`，首屏是门；
   点「新会话」得到 `默认工作区` 的空会话、composer 可用（E4-2 在现 build 上复现，DOM 见调研 §六）。
7. **平台给了"停住某个会话输入"的正门**：`ctx.conversation.blocks`（`ComposerBlockRegistry`，按 session、
   带本地化 `reason`）。源码自述 "the one way another plugin stops a session's input"，同时自述它是
   affordance 不是 enforcement（Host 不会因为前端禁用而拒收）。这就是"门在会话里"的机制。
8. **Host 侧唯一的机械拒绝点**：`agent/pre-step` waterfall 可以 `{kind:'reject'}`（`ArchivedSessionGate`
   先例：回合以 blocked 结束、不发请求）。要"绕不过去"，只有这里；代价是它同样作用于 dev/probe 的
   未绑定会话（见方案 D3）。
9. **E5 的成因是"每次加载都自选"，不是"桌面优先"本身**：平台恢复会话走
   `replaceMain(..., 'preserve')`，不碰 `selectPanel`；只有 `activePanelId === null` 时会话才可见。
   所以"刷新被拽走"= 我们在 null 时的自选；反过来"记住上次视图"也能修 E5，不必交出桌面。
10. **证据面已有欠账（11-01 门落地的回执）**：桌面类 web-face 基线的期望仍是 10-25～10-30 的"无门"读数。
    2026-11-03 真跑 `pnpm web-face-check --scenario blank-first-open`：红在 readiness token
    （`最近哪件事让你拿不准` 没出现）。这不是本卡引入的，是本卡落地要一并修的（修法见 S3）。

**结论（2026-11-03 拍板）：**

- **D1 = B+**：桌面仍是第一印象；会话内的门兜底覆盖；记住上次主视图（首次 = 桌面）。A'、C、D 落选。
- **D2 = 禁用输入**：未绑定/恢复态下任何会话都不可发送；「稍后」退役（它会把桌面输入车道放出来）。
- **D3 = 客户端 affordance（v1）**：不做 Host `agent/pre-step` 反绕过；延后触发 = 出现不经 composer 的
  prompt 车道真的把回合发到未绑定的默认工作区，或本人要"机械保证"。理由：它要同时给 dev/probe 的
  未绑定会话开 `onboarding: false` 口子（或按 cwd 白名单），回归面大于收益。

**外部结果三要素：**

- **触发**：产品打开时没有绑定项目；未绑定就点「新会话」；在对话里刷新页面。
- **用户看到/得到**：未绑定 → 桌面上是要选的项目门，任何会话的输入都被禁并给出原因；选好项目后
  会话落在该项目；刷新 → 回到上次看的那一面（会话或桌面），不再被拽走。
- **完成条件**：`## 验收标准` 全过；`docs/product.md` / `docs/architecture.md` / `docs/testing.md`
  与本变更同 diff；证据进 `## 切片台账`。

## 验收标准

（按 [`validation-design`](../../methods/validation-design.md)；行为 / 类别 / 输入状态 / 判据 / 负例 / 证据 owner / 人判）

| # | 行为 | 类别 | 输入状态 | 通过信号 | 负例/恢复 | 证据 owner |
|---|---|---|---|---|---|---|
| 1 | 未绑定时任何会话都不可发送 | 编排（client） | 隔离 home、无 `workspaceDir`、onboarding 开；点「新会话」 | composer 禁用且占位 = 门原因；dock 出现选择按钮 | `onboarding:false` / 404 / 传输失败 → 不挡（legacy） | `tests/client/product-*.spec`、`pnpm web-face-check --scenario product-session-gate`（新增或探针） |
| 2 | 绑定后落在项目 | 编排 + 确定性（宿主路由） | 未绑定 → picker 选目录 → POST | 返回 ready；新会话 `header.cwd` = 目录；dock/block 清除 | 取消 picker 不变；非法目录给错误文案、绑定不变 | 既有 `tests/host/product-*.spec`、`pnpm product-native-smoke`、探针 |
| 3 | 刷新回到上次那一面 | 编排（client） | 偏好=会话：进会话 → reload；偏好=桌面：桌面 → reload；无偏好 | 会话 → 仍在该会话；桌面 → 仍是桌面；无偏好 → 桌面 | 另一插件面板自选 → 偏好不被改写 | 纯核 spec + `tests/client/entry.spec`、真机探针 |
| 4 | 绑定状态 → 面（legacy/pending/ready/onboarding/recovery） | 确定性 | 五种 route 载荷 | 与既有 `productGateView` 一致；非产品态透明 | 未知版本/坏字段 → legacy | `tests/client/product-gate.spec.ts` |
| 5 | 非产品场景不被门/block 波及 | 编排（client） | 4 客户面 + 4 Viki 面（onboarding:false） | 8 个场景重跑保持/回到绿 | — | `pnpm web-face-check --scenario <名>` |
| 6 | 宿主绑定合同不变 | 确定性（host） | GET/POST、校验、持久化 | 既有 host spec 不改语义 | 缺失/非法/不可写各自错误码 | `pnpm test:host`、`pnpm product-native-smoke` |

人判：无（D1/D2 已拍板）；界面走查可选。

## 切片台账

| 片 | 状态 | 证据 |
|---|---|---|
| S1 会话门（binding store + dock + blocks + 删「稍后」+ 首开卡让位） | 完成 | `pnpm test:client`：`product-binding` / `product-face` / `product-gate` / `product-dock` / `first-mile` / `entry` spec；真机探针 `newSessionBlocked`/`dockExplains` |
| S2 首屏规则（上次主视图偏好替换 `selectDashboardByDefault`） | 完成 | `main-view.spec` + `entry.spec`；探针 `reloadStaysInConversation` + `mainView=chat` |
| S3 证据面 | 完成 | `web-face-check`：`blank-first-open`、`desk-eight-matters-first-open`（两条基线）、`first-open-draft-banner`、4 个 Viki 面、`product-workspace-gate` 绿；`product-onboarding` 重录（去「稍后」）；非产品场景 `onboarding:false` 与 seed 的 `[]` 占位修复；`node dev/probes/web/product-first-screen.mjs '<URL>'` 全绿 |
| S4 合同 | 完成 | `docs/product.md` §四、`docs/architecture.md` §七 + 模块表、`docs/testing.md` 证据行（同 diff） |
| S5 收口 | 完成 | 本卡归档 + 调研题 `已定性` 归档 + implemented note + 两个清单 |

**仍未取**：Host `agent/pre-step` 反绕过（D3 延后，触发见上）；`selectPanel` 仲裁（残留风险，
触发 = roster 出现第二个自选 `main` 的工作台型插件）。


## 已知与未决

已知（见调研材料 §一–§六）：机制四条、E1–E5 读数、平台三个接缝（`conversation.blocks` / 原生 inert /
`agent/pre-step`）、deckline 那套成立的前提（改外壳 + 抢 main + 收 Chat）。

未决已收口（2026-11-03）：D1=B+、D2=禁用、D3=客户端 affordance，见卡首结论。原三项的去向：
形态并入 A'/B+/C；"门放 dock 还是整块会话区"由"门在会话内 + 输入禁用"收敛（dock 引导，不另画 landing）；
"dashboard 是否保留"三种形态都保留（B+ 保留为第一屏，A' 保留为侧栏「今天」页）。

## 方案与取舍

| 形态 | 首屏 | 门覆盖 | 结论倾向 |
|---|---|---|---|
| **A. 会话优先 + 门进会话** | 空白会话（平台默认） | 全路径（dock/hero 挡输入） | 最贴平台惯例，**代价最小**；My Desk 降为要点的一页 |
| **B. 现状：桌面优先、门只在桌面** | My Desk | 仅桌面路径 | **否**：E4-2 已证绕过，未绑定也能聊 |
| **C. 未绑定→桌面；绑定后→会话** | 首跑问清，之后原生 | 首跑必经 | 可接受；两次首屏切换、心智变一次 |
| **D. 工作台型（deckline）** | 自绘工作台 + 收外壳侧栏 | 工作台内 | **否**：画布型形态，与"对话即产品"冲突 |

**建议：A**（若想保住"桌面即产品"的第一印象，则 A' = A + 侧栏首项仍叫「今天/桌面」，点开就是 dashboard）。
理由：门必须挡在**唯一必经路径**上；平台把"第一次来"讲在会话里，我们已经有 hero/dock 三个席位；
而"桌面优先"依赖一个既不持久、也无仲裁的面板选择，装第二个工作台型插件就会翻车。

**无论选哪个，都要补的一条**：未绑定时不许静默开聊（或明确允许并写清产物落点）。这条不是形态选择，
是产品承诺——`docs/product.md` 现在承诺"会话落在你的项目里"。

> **2026-11-03 补审：建议改为 B+（下列新节），上文 A/A' 的推理保留为历史。** 关键修正：A' 不保留
> "桌面即产品"的第一印象，只保留侧栏入口；门覆盖与首屏归属是正交的两件事。
> **同日拍板：B+（见卡首结论）。**

### 去耦：门覆盖、首屏归属、刷新行为是三件事（2026-11-03）

| 事 | 机制事实 | 结论 |
|---|---|---|
| 门覆盖每条路径 | 新会话/侧栏/命令最后都进会话；会话是唯一必经面 | 门的主体在会话：`conversation.input.dock` 引导 + `ctx.conversation.blocks` 禁输入；桌面那份门继续管桌面自己的输入车道（它是**第二条**车道，绕得过 composer） |
| 刷新回到哪 | `selectPanel` 只在 `activePanelId === null` 时决定可见面；平台恢复用 `preserve`、不抢面板 | 记住"上次的主视图"（首次=桌面）：会话被恢复时不选面板 → E5 修掉，桌面第一印象保住 |
| 未绑定能不能聊 | 两条输入车道 + 产品承诺 | 不能；"稍后"退役（它会把桌面输入车道放出来） |

**B+（本轮新增，不是卡里的 B）**：桌面优先 + 会话内的门 + 记住上次视图 + 未绑定禁输入。
卡里否掉 B 的理由是"门只在桌面"；B+ 把门搬进会话后这条理由不成立，剩下的差别只是首屏身份。

**补审建议：B+**（改自卡里的 A）：

1. 门覆盖与首屏正交——"门必须挡在唯一必经路径上"由会话门满足，不需要交出桌面。用一个首屏身份反转
   去修一个覆盖缺陷，代价和收益不成比例。
2. A 反转的是两份已记录的决定（[首开体验：一页纸](../../../notes/implemented/2026-10-23-first-run-one-page.md)、
   [三层界面重排](../../../notes/implemented/2026-10-24-interface-layer-rearrangement.md)：主面板默认一页纸、
   会话是编辑层）。B+ 只补一条"记住上次视图"的规则，不推翻产品模型。
3. E5 的真因是"每次加载自选"；B+ 用一个约 30 行的偏好把"回到你上次看的那一面"变成显式规则。
   A' 则让桌面用户每次刷新都被拽回对话（对称的损伤）。
4. 残余风险：桌面首屏仍依赖 `selectPanel`（共享、无仲裁）。门在会话里兜底后，风险退化为"首屏可能不是桌"，
   不再是"未绑定能聊"。再评估触发：roster 里出现第二个自选 `main` 的工作台型插件。
5. A' 仍是可选项：要"平台原生、少养一套偏好状态"就选 A'；此时会话门原样保留，只删自选与偏好，
   并写一篇反转 note 互链那两份旧决定。

**A' 的真实代价（修正卡里"代价最小"）**：代码更少，但首屏从"一页纸"变成"空白会话 + 门/输入框"，
账本与投影投入在第一眼不可见；对"对 AI 不熟的高层"这是产品模型变化，不是 UI 修饰。

### 落地切片（定性后展开；S1 与 D1 无关，S2 取决于 D1）

| 片 | 内容 | 最小可信证据 |
|---|---|---|
| S1 会话门 | 绑定 store（GET 一次、POST 后更新）；`conversation.input.dock` 引导条；未绑定时对**每个** session `ctx.conversation.blocks.set`、绑定后清除；未绑定时首开指针卡让位；删"稍后" | `pnpm test:client`（新 spec：状态映射 + block 决策 + 让位）；真机：未绑定点「新会话」→ composer 禁用 + 门条在 |
| S2 首屏规则（B+） | 用"上次主视图"偏好替换 `selectDashboardByDefault`：订阅 `layout.panelInfo` 写偏好；启动时偏好=desk 才在 `activePanelId === null` 时选桌面 | 纯核 spec（偏好读写/默认值）+ entry spec（不抢面板）；真机：进会话 → 刷新 → 仍在该会话；桌面 → 刷新 → 桌面 |
| S3 证据面 | 非产品场景（4 客户面 + 4 Viki）seed 显式 `assistant-product.onboarding: false`；重录 `product-onboarding`（去"稍后"）与 `product-workspace-gate`；E4-2/E5 用探针断言 | `pnpm web-face-check --scenario …` 逐个绿；探针 JSON 判决 |
| S4 合同 | `docs/product.md` §四（门在会话、未绑定不可聊、"稍后"退役、首屏规则）；`docs/architecture.md` §七（浏览器动作链/首屏门）；`docs/testing.md` 证据行 | `pnpm verify`（链接/命令互证） |
| S5 收口 | 决定 note（含 A' 与"桌面优先 + 只挡桌面"两个输掉方案）；卡归档；调研题 `已定性` 并归档；清单同步 | 卡与 note 同变更；`pnpm verify` |

每片机械地板：`pnpm typecheck && pnpm test && pnpm build && pnpm verify`（web 探针消费 `lib/`，先 build）。

### 流程（怎么落地）

1. **现在**：推敲（本节 + 调研 §六）→ 2026-11-03 拍板并翻 `待落地`（守卫 = 本人明确答复；
   授权来源已记在状态行）。
2. **落地**：S1–S4 逐片红→绿（状态仍是 `待落地`），证据进本卡 `## 切片台账`。
3. **审查**：机械不跳（`typecheck/test/build/verify` + 受影响 web-face + 探针）；语义自审必做
   （跨 host/client/合同文档）；用户验收 = D1/D2 已拍板，界面走查可选。
4. **归档**：`去向 = implemented`，决定 note 与卡同变更；调研题 `已定性` 后随目录归档；两个清单同步。

## 关闭条件

首屏形态与"门的位置/未绑定时能不能聊"两项有明确结论，去向记进 `notes/` 的决定 note（或直接落实施卡）；
本卡归档。
