---
topic: Web 客户端的首屏归属——`main` 键控槽、`layout.selectPanel` 与本仓"dashboard 先选 + 门在 dashboard"的实测行为
intent: 用真机实验回答"谁能占首屏、按什么规则、我们的门为什么会被绕过"，为「首屏怎么处理最合理」提供判据
---

# 首屏机制与实验（2026-11-02）

## 〇、口径

- **平台侧（C）**：钉住的 `vendor/dsh`（`dsh-v0.2.1-rc.2`）。关键页：
  vendor/dsh 的 `client/ui-layout/README.md`（`main` 是 **root-scoped 键控槽**，`conversation` 是保留键，
  `ctx.layout.selectPanel(id)` 选中已注册面板，`null` = 回到会话且不改当前 Session）、
  vendor/dsh 的 `client/modules/src/index.ts`（客户端插件按**组合行**发现，不是按已装包扫描）。
- **本仓侧（C）**：`src/client/index.ts`（`main` 注册 + `selectDashboardByDefault`）、
  `src/client/chrome/default-panel-selection.ts`、`src/client/product/product-gate.ts`（"门在 dashboard 前面"）。
- **实验（T）**：隔离 home `.tmp/firstscreen/home`，`dsh --profile fs --port 0 --no-open`，CDP 驱动真页面
  （`dev/probes/web/cdp-driver.mjs`）。全程没碰日用 `~/.dsh`。

## 一、机制（先讲清楚，再看读数）

1. **`main` 不是"单占"槽，而是按键选中的槽**：多个插件可以各注册一个 `main`，每个带自己的 `key`；
   `layout.panelInfo.activePanelId` 决定现在显示谁；`null` 表示显示 `conversation`。
   谁想占首屏，就在启动时 `ctx.layout.selectPanel('<自己的 key>')`。
2. **选择不持久**：ui-layout 明确 "Layout state resets on reload"。所以每次加载都会重放"谁先选、谁后选"，
   没有"上次停在哪个面板"这回事。
3. **没有仲裁**：`selectPanel` 只校验 key 已注册，不校验"是不是第一个选的"。多个插件都在启动时自选 =
   **后写者赢**，结果取决于客户端条目加载顺序（`immediately`、依赖满足时机）。
4. **客户端插件要挂上，得先有一行**：`client-modules` 按 Loader 的 **entry 名**找包，再读该包 `dsh.client`。
   只把包 `dsh plugin add` 进 profile、patch 里没有指向它的行 → 客户端 bundle 根本不会被加载（E1 证实）。
5. **`inject` 写在插件对象上，不写在 manifest 里**：`dsh.client.inject` 只管加载面；`ctx.layout` /
   `ctx.slots` 这类属性访问要求插件对象自带 `inject`（本包 `clientFactory` 返回 `{ inject, apply }` 就是这个原因）。
   探针先漏了这条，报 `cannot get property "layout" without inject`（E2/E3 的失败轮）。

## 二、四个实验

| # | 做什么 | 读数 |
|---|---|---|
| E1 | 只 `dsh plugin add` 探针包（patch 为空），起真页面 | 探针 client **没加载**（只有本包的 `client.js`）；证明"发现按组合行" |
| E2 | 给探针加一行 `- id: probe-main / name: probe-main-panels` 后重启 | 探针加载了，但 `cannot get property "layout" without inject` |
| E3 | 把 `inject: ['slots','layout']` 挂到**插件对象**上 | `{registered: ["probe-a","probe-b"], selected: "probe-a"}` —— 两个额外 `main` 面板与本包 dashboard **共存**，没有"第二个把客户端条目弄死" |
| E4 | 首屏实测（同一实例，先卸掉探针） | 见下 |
| E5 | 进会话 → **刷新** → 再看 | 会话 id 保留（`dsh.sessions.current` = 同一个 `session-…`），**但屏幕回到门/桌面**：会话选择持久、面板选择不持久，而"自选 dashboard"每次加载都重放 |

**E4 的两个读数（这是本仓当前行为的事实）**：

1. **全新 home、未绑工作区，首屏 = 本包 dashboard 上的产品门**：
   `章鱼管家 新会话 … 工作区 默认工作区 … 选一个项目目录 助手会在这个项目里工作：会话落在这个目录，
   交付包写到 deliverables/ … 选择项目目录 / 稍后`。
   即：`selectDashboardByDefault` 在 `activePanelId === null` 时选中 dashboard，门渲染在 dashboard 里面。
2. **点「新会话」→ 门消失**：主区变成空白会话（`探索未至之境` hero + 本包的 first-mile dock +
   composer），侧栏仍是「工作区 默认工作区」。**没有任何东西挡住"没绑项目就开始聊"**。

E4-2 不是猜测：`product-gate.ts` 的模块注释自己写着 "in front of the `main` dashboard"，
它的渲染位置就是 dashboard 面板内部。

## 三、结论

- **"门在 dashboard 里" = 门只在一条路径上**。用户的主 CTA（新会话）绕过它；绕过之后会话落在 DSH 的
  **默认工作区**，交付包也落那儿——正是产品要避免的"装了不亮"。
- **E5：刷新会把用户从对话里拽走**。会话被原生恢复（同一 `session-…`），但面板状态重置 → 我们自选 dashboard
  → 用户看到的是门/桌面而不是刚才那段对话。对一个"对话即产品"的助手，这比首屏选错更伤：它每次刷新都发生。
- **控制首屏的机制不止一条**（见下节），抢面板是其中最响、也最不稳的一条。
- **`main` 是共享的、后写者赢的、且不持久的选择**。任何再装一个"工作台型"插件（它也会在启动时
  `selectPanel`），首屏归属就变成加载顺序的副产物。产品不能把"首屏是 My Desk"当作稳定事实。
- **平台自己的首屏语言在会话里**：hero 席位、welcome-notice、`conversation.input.dock`、输入框建议——
  DSH 把"第一次来"讲在 conversation 里，而不是另开一个面板。本包已经占了其中三个席位
  （hero mark、dock、assistant-actions），这给"把门放进会话"提供了现成位置。
- **deckline 那套"工作台占首屏"成立的前提**是它同时改了外壳（`hideShellSidebar: true`）、
  把 Chat 收进右侧栏、并在启动时抢 `selectPanel`。那是**画布型产品**的自洽形态；
  本产品是"对话里的长驻助手"，同一套会丢掉原生 Chat 的主位。

## 三之二、DSH 给的首屏控制面（按"控制什么"分类）

| # | 机制 | 控制什么 | 会不会改变"首屏=会话" | 持久吗 | 适合谁 |
|---|---|---|---|---|---|
| 1 | `main` 键控面板 + 启动 `selectPanel` | 整块中间区 | **会**（盖掉会话） | 否（重载重放） | 画布型工作台（deckline） |
| 2 | 会话内席位（`conversation.hero.*`、`input.dock`、`chat.assistant-actions`、welcome-notice） | 会话里的位置 | 不会 | 随会话 | **第一次来/轻提示**（DSH 自己也这么放） |
| 3 | `conversation.view` 标签 | 会话内容区的一个页 | 不会 | 随会话 | 同一件事的另一种看法 |
| 4 | 侧栏席位（`sidebar.panellist`/`brand`/`footer.action`） | 导航与身份 | 不会 | 否 | 产品的"门"（桌面入口） |
| 5 | 右栏（`rightbar`/`sidebarRightTabs`） | 贴边第二工作区 | 不会（占宽度） | 否 | 参考面板、Chat 侧置 |
| 6 | 覆盖层（`shell.overlay`/modal） | 全屏挡一层 | **会**（但临时） | 否 | 必须完成的向导 |
| 7 | 程序化导航（`session.create` + `uiWorkspace.openSession`，host startup 行） | **哪个会话是当前** | 不会（它决定的是会话本身） | **是**（`dsh.sessions.current`） | 决定"回来看到什么"的真正钥匙 |
| 8 | 启动面（替换 `web-startup`/profile-as-mode/CLI） | 整条启动链 | 会 | 部署层 | 只支持 web 且要自定义 flag 的产品 |
| 9 | `ctx.conversation.blocks`（`ComposerBlockRegistry`） | **某一个会话的输入**（带 reason，渲染成禁用 textarea 的占位） | 不会（它停的是输入，不是面板） | 随 session（会话丢 store 即失效） | "这个会话现在不能干活"的状态门（模型未选/归档/本文的未绑定） |

## 四、可选形态（供推敲卡裁决）

| 形态 | 首屏 | 门的覆盖 | 与平台惯例 | 代价 |
|---|---|---|---|---|
| **A. 会话优先 + 门进会话** | 空白会话（平台默认） | 门在会话里（dock/hero 席位，未绑定时挡输入） | 最贴：DSH 的"第一次来"就在会话里 | My Desk 降为要点的页；首屏身份从"桌面"变"一句话" |
| **B. 桌面优先（现状）+ 门只在桌面** | My Desk | **只覆盖桌面路径**（E4-2 绕过） | 偏离：自造了一个 landing | 未绑定也能聊、产物落默认工作区 |
| **C. 未绑定时桌面优先，绑定后会话优先** | 首跑=门，之后=会话 | 门在桌面，且首发必然经过 | 折中：首跑问清，之后像原生 | 两次首屏切换；用户心智要变一次 |
| **D. 工作台型（deckline）** | 自绘工作台 + 收起外壳侧栏 | 门在工作台里 | 平台允许，但属画布型 | 丢掉原生 Chat 主位；与"对话即产品"冲突 |
| **B+（2026-11-03 补入）桌面优先 + 门进会话 + 记住上次视图** | My Desk（首次）；之后回到上次的主视图 | 全路径（会话内 `blocks` 挡输入；桌面门管桌面输入车道） | 平台允许：自选面仍用它，但只在没有"上次视图"时决定首屏 | 需要一条产品级视图偏好；首屏仍依赖 `selectPanel`（无仲裁），有会话门兜底 |

**B+ 与 B 的差别**：B 的否掉理由（E4-2 绕过）是"门只在桌面"；B+ 把门搬进会话后，覆盖不再依赖首屏。
剩下的差别只是"首屏身份"，那是产品口味，不是机制必然。

## 五、还没测的

- 未绑定工作区时**真的发一条消息**会发生什么（要不要 API key；产物落点）——本轮只做结构判定，没发回合。
- 两个**真实**插件（本包 + 一个工作台型）同时自选时的加载顺序是否稳定——本轮用自造探针，只证明"后写者赢"。
- `layout.beginNavigation()` / `uiWorkspace.openSession` 与首屏选择的关系（切工作区时会不会顺带切面板）。

## 六、补测与平台机制补充（2026-11-03）

推敲卡收窄为"门的位置 / 首屏归属 / 刷新行为"三件事时补的一轮：
现 build 的两个真机读数 + 平台三个现成接缝 + 证据面欠账。口径同 §〇（隔离 home，不碰日用 `~/.dsh`）。

### 6.1 现 build 的两个读数（全新隔离 home）

起法：`ASSISTANT_DSH_HOME=.tmp/firstscreen-probe` → `dev/env/prepare.sh` → `dev/env/setup.sh` →
`node dev/env/dsh.mjs --profile dev --port 0 --no-open`，`webui-shots --dom` 取 DOM 证据。

1. **首屏 = 门**：可见文本 `章鱼管家 / 新会话 / 插件 / 今天 / 自动化任务 / 工作区 / 默认工作区 / … /
   选一个项目目录 / 助手会在这个项目里工作… / 选择项目目录 / 稍后`。**一页纸不在**。
   即：产品门把 dashboard 整块换掉；侧栏同时暴露 DSH 自动建的"默认工作区"。
2. **点「新会话」= 绕门**：主区变 `探索未至之境 / 预览版 / 默认工作区 / 章鱼管家 /
   第一次来？回到今天，说一句就行… / 回到今天 / 描述你想要构建的内容…`，composer 可用
   （发送键只被"未选模型/未登录"禁掉）。E4-2 在 2026-11-03 的 build 上复现。

### 6.2 平台三个现成接缝

1. **`ctx.conversation.blocks`**（`packages/client/ui-conversation/src/client/input/blocks.ts`）：
   按 session 的 composer block，带本地化 `reason`。源码注释两句都重要：
   "the one way another plugin stops a session's input"，以及
   "This is an affordance, not enforcement: the Host refuses a prompt it cannot route regardless of
   what any client disables."——即：**前端禁用是 affordance，不是机械保证**。
2. **原生 inert 在实际首启不触发**：`ConversationContent` 的
   `inert = sessionId === undefined || (hero && chipTitle === undefined)` 确实会在"没有工作区"时
   把 composer 置灰并给 "Choose workspace"；但首启时 `ui-workspace` 的 `restoreSelection`
   在"零工作区、零会话"下先 `initializeDefault()`（`<Documents>/deepseek-harness/default-workspace`，
   `DEFAULT_WORKSPACE_DIRECTORY`），再 `connectWorkspace()` 开空会话——chip 有标题，inert 不成立。
   所以"平台已经挡了"只对"用户删光工作区"成立，对全新安装不成立。
3. **Host 侧唯一的机械拒绝点**：`agent/pre-step` waterfall 返回 `{kind:'reject'}` 即关闭本轮
   （`session-controller/src/archived-session-gate.ts` 先例：回合以 `blocked` 结束、不发请求）。
   它不看 cwd、不看面板，只看事件；因此**要"未绑定就干不了活"的机械保证只能用这里**，
   代价是它同样作用于 dev/probe 的未绑定会话（要么给它们 `onboarding: false`，要么按 cwd 白名单）。

### 6.3 E5 的机理修正

平台恢复会话走 `replaceMain(..., 'preserve')`，**不调 `selectPanel`**；用户导航
（`openSession` / `openWorkspace` / `startSession`）走 `'reveal'`，才 `selectPanel(null)`。
`activePanelId === null` 会话才可见，而启动时它本来就是 null。
所以"刷新被拽走"**只**来自我们每次加载在 null 时的自选——不是"桌面优先"的必然。
推论：**记住上次主视图**即可修 E5（偏好=会话就不选面板，平台自己恢复会话）；
不需要为此把首屏交给会话，也不需要平台改持久化。

### 6.4 证据面欠账（11-01 门落地的回执）

门包在 `main` 之后，桌面类 web-face 基线的期望仍是 10-25～10-30 的"无门"读数。
2026-11-03 真跑 `pnpm web-face-check --scenario blank-first-open`：

```text
..   eval → timeout: 最近哪件事让你拿不准
FAIL … webui-expected-…/expected-1600x1000.png: --require-eval: the last eval never reported
     "ready: 最近哪件事让你拿不准"
FAIL blank-first-open (exit 1)
```

隔离 home 的 DOM（§6.1 第 1 条）解释了原因：首屏是门，桌面文案不在。受影响的至少还有
`desk-eight-matters-first-open`、`desk-eight-matters-brief-list`（同样等桌面 token）；
而 `first-open-draft-banner` 与四个 Viki 场景等的是 composer 占位
`描述你想要构建的内容`——会话门一旦落地，它们也会红（composer 的占位被 block 的 reason 替掉）。
这些场景都不是产品部署，落地时应显式声明 `assistant-product.onboarding: false`
（或改用已绑定 fixture），并逐个重跑。
