# CEO 助手的 Sidebar 培养面（用户拍板的当前 Goal）

日期：2026-09-25 · 状态：**proposed（进行中：三个面板已上线并接真实数据；当前在做"培养面"——
让用户能在看见助手判断的地方直接指出哪一条错了）**

## 〇、当前状态一览（先读这里）

**接手入口（新 Agent 从这里开始）**：[handoff：CEO 助手的 Sidebar 培养面](../research/2026-09-26-handoff-ceo-sidebar-cultivation.md)
——一分钟上手、已完成/待办、架构与机制、关键文件、命令、纪律、下一圈候选、环境快照。

| 项 | 状态 |
|---|---|
| 三个 sidebar 面板（我的桌面/知识室/记忆室） | ✅ 上线，数据真实 |
| 内容分工（一个事实一个家） | ✅ 桌面＝行动面；知识室＝懂什么；记忆室＝审计清单（全量记忆） |
| 桌面协议（助手写 .desk/state.json → 面板经 workspaceFiles 读） | ✅ 端到端真跑验证过 |
| 就地更正循环（每行"这条记错了/有问题"→内联输入→送回对话→助手改并刷新） | ✅ 已实现，待用户实测反馈 |
| 交互（刷新/点决定要选项/点线索问进展/计数跳转） | ✅ 已实现 |
| preflight 环境就绪关口（boot 图 + Remote 清单 + desk 文件内容段） | ✅ 已加（防"交一个啥都看不到的 URL"） |
| 面板形态 | ✅ 已落地（2026-09-26）：**右侧栏 tab**——三室 tab + 页头「桌面」开启点 + 会话绑定读取（§四·十六） |
| 底层实现（自有 Remote 命名空间 / typert 集成） | ⏸ 用户拍板后置："UX 体验出来了之后，咱们再把底下落实的东西给落实了" |

## 一、用户意图（2026-09-25 原话）

"我们都实验一下吧，你看看我们这个角色拿这些交互到底呈现什么东西，好好思考思考，
正好是一个挺好的练习，让我熟悉一下DSH底下交互怎么设计，借助什么东西好不好"

三个要求：
1. **实验**——不是只设计，要能打开看到、点到
2. **CEO 角色**——呈现的内容是 CEO 的助手该呈现的
3. **用户要学**——通过看我们怎么设计，熟悉 DSH 的交互机制

## 二、已确认的设计（三个 Tab，全部自建）

### Tab 1：「桌面」——助手此刻的状态

```
┌────────────────────────────────────┐
│  我的桌面                            │
│                                     │
│  ⏳ 等你决定（N）                     │
│    · [具体待决事项，点击展开]          │
│                                     │
│  📍 在跟的事（N）                     │
│    · [线索名] → 当前倾向：[一句话]    │
│                                     │
│  📊 状态                             │
│    记忆 8 · 知识 13 · 技能 8 · 线索 0 │
│                                     │
│  ⚡ 快捷操作                         │
│    [拆解一个问题] [回顾上周] [清理]   │
└────────────────────────────────────┘
```

数据来源：assistantMemory 服务的 digest + curate（已有服务端数据，只需暴露 Remote 读取面）。
交互：点击线索展开详情（当前倾向 + why it matters）；点击快捷操作插入 prompt。

### Tab 2：「知识」——助手懂什么

```
┌────────────────────────────────────┐
│  知识室                              │
│                                     │
│  按主题分组的知识页列表                │
│  每页显示：标题 / 状态 / 出处         │
│                                     │
│  ⚠️ draft 页面标黄等你审             │
│  ✅ stable 页面点开可看全文          │
└────────────────────────────────────┘
```

数据来源：knowledge room 的页面列表（listKnowledge 已有）。
交互：点击页面打开 documentpreview；draft 页面显示"等你审"标记。

### Tab 3：「记忆」——助手记住了你什么

```
┌────────────────────────────────────┐
│  记忆室                              │
│                                     │
│  最近记住的（按时间倒序）              │
│  每条显示：内容一句话 / 时间 / 来源    │
│                                     │
│  每条可：[编辑] [删除] [看来源]       │
└────────────────────────────────────┘
```

数据来源：memory room 的 active records（listMemories 已有）。
交互：点编辑 → 弹出编辑框（P3"管得住"的可视化）。

## 三、从高声誉插件借鉴的设计模式（只抄思路不装包）

| 来源 | 热度 | 借什么 |
|---|---|---|
| dsh-context (6.6K dl, 416★) | 高 | 仪表盘 + 浏览器双件套：上面状态数字，点开进详情 |
| DSH-better-sidebar (39K dl, 2216★) | 最高 | tab 注册机制：怎么在 DSH sidebar 里加新 tab |
| dsh-genui (omdsh-dev) | 高 | 回复内渲染交互 UI（远期方向，CEO 的行动计划可渲染为可勾选清单） |

## 四、技术路径（我们包的 client 面）

已有基础：`src/client/index.ts`（web-branding）已证明我们的包能贡献 DSH Web UI。
要做的事：
1. **Remote 面**：在 host 面暴露只读数据（digest counts / thread list / memory list / knowledge page list）
   → 经 DSH 的 Remote API 从浏览器侧读取
2. **Tab 注册**：在 client 面注册右侧 sidebar tab（学 better-sidebar 的方式）
3. **React 组件**：三个 tab 的 UI（桌面/知识/记忆）
4. **样式**：与 DSH 原生 UI 一致（用 DSH 的 design tokens，不自带 CSS 框架）

## 四·二、Remote 命名空间：架构级发现（2026-09-25，实验二的结论）

**目标**：面板里的四个数字接真实数据。**结论：Remote 命名空间这条路对"仓外的插件"是关着的。**

### 证据链（全部实测）

1. 我们建了 `AssistantDeskRemote extends TypertRemoteService`（wire name `assistantDesk`）、
   `@Remote` 标记的 `snapshot()`、host 行 `assistant-desk-remote`——组合里确实有这一行（`--dump-config` 核过）。
   （这条路径后来整段删除了，理由见本节末的"死路回退"。）
2. 客户端按 documentpreview 的同款写法声明 `inject: [..., 'remote.assistantDesk']`。
3. 浏览器结果：`dsh-smart-assistant: pending (waiting for service: remote.assistantDesk)`。
4. 诊断探针（面板里枚举 remote 对象）：`namespaces=[]`——**这是正常的**，Remote 代理不是 own-property，
   由 loader 按 inject 声明物化（`Object.keys` 看不到）。
5. **决定性证据**：`@deepseek-ai/dsh-api-remotes/client.js`（545KB）里**内嵌了构建期生成的 Remote 清单**——
   形如 `{ id: "…dsh-api-settings-controller#credentials/describe", service: "credentialsController",
   namespace: "credentials", method: "describe", … }`，共 **27 个命名空间**
   （account/agentPresets/commands/credentials/directoryPicker/dynamicCordisRunner/fileReferences/
   fileUploads/goals/job/llm/messageFeedback/officeToPdf/permissionPresets/pluginInventory/pluginManager/
   pluginRegistryProbe/schedule/session/sessionFeedback/sessionReferenceResolver/settings/skills/subagents/
   terminal/workspace/workspaceFiles）。**`assistantDesk` 不可能出现在其中**。
6. 为什么不可能：清单由 **typert 生成器**从 **vendor 工作区**的 typert 产物生成
   （对照：`api/workspace-files/lib/` 有 `typert.host.js` + `typert.remote-client.js`；我们的包两者都没有）。
   生成器绑定单一 root（`vendor/dsh`），我们的包在仓根、不在该工作区内，也没有 `./typert` 导出
   → 产物无从生成 → 清单里没有我们 → 客户端永远等不到。

### 结论与下一步路径

- **仓外插件要开 Remote 命名空间 = 需要 typert 清单集成**（把我们的包纳入生成器的工作区、
   产出 `typert.host.js`/`typert.remote-client.js`、并让客户端清单包含它）。这是一次架构级集成，
   **不在本轮范围**，已记为本卡的已知阻塞。
- **下一步路径（可绕开）**：面板读**工作区里的一个 desk 文件**（助手用自己已有的文件工具维护它），
  经**已在清单里的** `workspaceFiles` 命名空间读取。零新增宿主代码、零清单改动、当天可做。
- **死路回退（2026-09-26）**：DeskRemote 服务（`TypertRemoteService` 子类 + `@Remote` 方法 + host 行 +
  包导出 + identity 登记）已**全部删除**。理由：desk 文件协议取代了它的用途，而它单独存在时既无消费者、
  又带着一个未同步 lockfile 的 peerDep（那个 peerDep 一度把 `pnpm build`/`test`/`dump-config` 全挡在依赖
  检查外——本仓约定是 vendor 包不声明为依赖，靠工作区 + tsconfig 路径解析）。**机制没有丢**：本节的证据链
  与三段注册方式（类型/内容/标题）留在卡里，将来真要做 typert 集成时按它重做，不必从零再查一遍。

### 过程修复：preflight 现在会自查这类问题（用户 2026-09-25 要求）

"免得每次我来给你贴这么严重的问题，这不就有点荒唐了"——已升级 `scripts/webui-preflight.mjs`：
1. 解析首页里的 `globalThis["__DSH_BOOT__"]` 图（entry / inject / rev）
2. **⑤a** 本仓 entry 的每个包 id 依赖必须在图里有提供者
3. **⑤b** 读 `@deepseek-ai/dsh-api-remotes` 的清单，取出命名空间集合；
   再从**本仓 entry 的专属 combo**里提取运行时 `const inject = [...]`，
   逐个校验 `remote.<ns>` 是否在清单里——不在就 FAIL 并直说原因

**自证有效**：在修复前的失败状态上跑，它精确报出
`our bundle injects remote.assistantDesk, but the Remote manifest has no such namespace …`。
（两处自身 bug 也在实现中修掉：误报 vendor 的打包模块、以及在大 combo 里正则匹配到别人家的 inject。）

## 四·三、实验二的部分交付：面板接上两份活数据（2026-09-25）

**绕开被阻塞的路径，用清单里已有的命名空间先让面板"活"起来。**

| 区块 | 数据来源 | 为什么选它 |
|---|---|---|
| **这个部署里的助手** | `remote.agentPresets.list()` | 零参数（manifest 记录 `parameters: []`）→ 调用最稳；返回 AgentPresetRoster |
| **我和助手的对话** | `remote.session.list({})` | 请求形状极简（`{cursor?}`）→ `{items: SessionSummary[]}`；显示总次数、运行中数量、最近 5 次（时间 + cwd） |

**这两个调用同时证明了 client → Remote → host 的完整路径在本面板可用**——剩下的是"工作文件夹计数"
（记忆/知识/技能/线索），它需要 host-data 通道，仍按 §四·二 的结论待做。

实现要点：
- `inject` 里逐个声明清单内的命名空间（`'remote.agentPresets'`、`'remote.session'`），
  apply 里捕获 `ctx.remote` 供面板闭包使用（与品牌标记同一套 slot/closure 机制）。
- 面板用 `useState`/`useEffect`，300ms 后调用，防御式解包（数组或 `{presets|entries}`/`{items}`）。
- 任何一环失败都把具体错误显示在面板上（不静默）。

## 四·四、桌面协议闭环：端到端验证（2026-09-25）

**做了**：给助手一件模型用技能 `desk-refresh`（写在会话工作区的 `.desk/state.json`：counts +
threads 的 why/lean + 最近五条记忆；数据必须来自本轮真跑的工具调用，绝不编数字）。

**端到端真跑**（从 `/tmp/desk` 起 one-shot，提示只有"刷新我的桌面。"）：

| 观察 | 结果 |
|---|---|
| 是否加载技能 | ✅ 全程按技能规则执行 |
| 是否调工具取数 | ✅ curate + research list + memory list |
| 是否写出文件 | ✅ `.desk/state.json`（2947 B，`JSON.parse` 验过） |
| 数据是否真实 | ✅ counts = 记忆 8 / 知识 10 / 技能 2 / 线索 1（知识 10 是它**工具口径**的权威值；我手数文件得 13，以它的为准）；线索带真实 why/lean |
| 额外判断 | 它自己把 `.desk/` 加进 `.gitignore`，理由是"本仓可能有并行会话，没有忽略规则时可能被 `git add -A` 扫进别人的提交"——判断正确，已收下提交 |

**发现一：desk 文件是"按工作区"的。** 那次 one-shot 的工作区是**本仓**，所以文件落在仓里；
而面板读的是它所在会话的工作区。真实部署里 CEO 的会话与面板共享同一工作区，不存在这个错位；
测试里因为用了另一个 profile 的会话才出现。**协议本身没问题，但值得记进技能/卡：写的人和读的人必须是同一个工作区。**

**发现二（产品级）：家的摘要在溢出。** 那次 curate 报 `摘要 4014/4096 已截断`——有记录被挤出
每个会话的视野，这正是"桌面"该管的事。已记入待办，等用户拍板处理方式（退最弱一条 / 压缩）。

## 四·五、表达改进与一个待定的形态问题（2026-09-25）

### 已做：表达

- **「等你决定」置顶**——CEO 的第一个问题是"什么需要我"，所以它排第一（decisions + 待审知识页计数）。
- **线索三层表达**：一句话标题（加粗）→ 当前倾向 → why（11px 灰字，脚注而非正文）。此前是 200 字
  整段铺开，对"一眼看"不友好。契约相应扩展 `threads[].title` 与 `decisions[]`。
- **跨面板跳转**：计数格子可点（记忆→记忆室、知识/技能→知识室），"N 页等你审批"也可点——
  用 `ctx.layout.selectPanel(panelId)`。从"N 是个数"变成"N 是个入口"。

### 待定：面板的**形态**（主区域整页 vs 右侧栏 tab）

现状：三个 sidebar 图标点开是在**主区域**（整页），这是 DSH 的 `sidebar.panellist` + `main`
机制（与 Settings 同款）。用户最初说的是"sidebar 那边应该有点什么"——右侧栏（紧挨对话那条）
才是字面意义上的 sidebar。

**右侧栏 tab 的机制（已查清，未实现）**：
1. 类型注册：`ctx.sidebarRightTabs.register({ id, kind, patterns: ['dsh-resource://<域>/…'], priority, canOpen, title })`（已注册 desk 类型）
2. 内容注册：`ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({ name: 'sidebar.right.pane.tab', key: <类型 id>, locale, store, children, inject: (sessionId, actions) => props }, Body))`
3. 标题注册：`sidebar.right.pane.tab.title`（同 key）
4. 打开：`ctx.sidebarRight.openTab(kind, { params })`——**作用于当前挂载的会话**（placement 里没有 sessionId）

**为什么值得考虑**：body 的 `inject` 直接拿到 `sessionId` → 天然解决"读哪个工作区的 desk 文件"
（现在要试最近 5 个会话）；且紧挨对话，符合"sidebar"的字面期待。
**代价**：需要弄清 navigator 如何由 kind+params 构造地址（以匹配 patterns/canOpen）、tab 生命周期、
以及 store/locale/children 的必填项。是一块独立的集成。

**建议**：等用户对现有三面板的表达给过反馈后再决定——形态要服务于"看一眼就知道"，不是为形态而形态。

**拍板（2026-09-26，用户）：右侧栏 tab。**理由：body 的 inject 直接拿 sessionId（顺手解决"读哪个
工作区"）、紧挨对话符合"培养时随手指错"的姿势。开工前需按上文查清：navigator 如何由 kind+params
构造地址（匹配 patterns/canOpen）、tab 生命周期、store/locale/children 必填项。

**落地（2026-09-26）**：查清的结果比预想更省——`sidebar.right.pane.tab` 是 keyed、session 作用域的
seat，组件经 session 标准	props **直接拿到所在会话的 sessionId**，所以三室都做成 kind 型页
（无 patterns、按 kind 打开，照 ui-schedule 的两段注册形状）。恢复态 tab 只存布局记录、不带导航
参数——schedule 需要 binding 表找回任务，桌面不需要：它天然绑定所在会话，恢复后仍读对工作区。
开启点两处：会话页头「桌面」chip（`conversation.session.header.utilities`）与整页各室的
「在对话旁打开」按钮。

## 四·六、培养面：内容分工 + 就地更正（2026-09-25，用户拍板的方向）

用户原话："把东西做对……放在桌面上，你放什么，知识室里放什么，记忆室里放什么，然后有一个很好的
UX 体验，能让用户参与，因为毕竟是一个培养助手的过程嘛，助手有时候昏的话，至少能指出来你这玩意
在哪儿弄错了。要培养数字分身啊。"

### 内容分工（一个事实一个家）

| 面板 | 放什么 | 不放什么（及理由） |
|---|---|---|
| 我的桌面 | 等你决定（decisions + 待审计数）、在跟的事（线索：标题/倾向/why）、规模 | **不放记忆列表**——那是记忆室的家，两处渲染必然漂移 |
| 知识室 | 待审 draft（管理视角三页在这里）、已确认、技能 | 不放计数数字（桌面负责"规模"） |
| 记忆室 | **全量**活跃记忆（审计清单） | 不放"最近五条"——它是逐条审计与更正的清单，漏掉的那条就是用户改不了的那条 |

### 更正循环（养成的入口）

每一行都有就地动作：记忆＝"这条记错了"、知识页＝"有问题" → 展开内联输入 → 回车发送。
发送的内容形如：

> 请更正这条记忆。原记录：「…」。正确的是：**用户写的内容**。改完请刷新我的桌面。

助手收到后改记录、刷新桌面文件，面板 15 秒后自动重读——**用户刚指出的那条错就从眼前消失**。
技能里写死了这条规矩：**改了却不重渲染，读起来就像没听见用户**。

设计要点：**在看见它的地方指出来**，而不是让用户在对话里描述"第几条记忆错了"。
这是"助手昏的时候能指哪打哪"的最小可用形态。

### 契约（desk 文件，助手维护）

`counts` / `decisions[]` / `threads[]`（含 title/lean/why）/ `memories[]`（全量活跃）/ `knowledge[]`
（含 draft）/ `skills[]`。字段与填法写在模型用技能 `presets/assistant/skills/desk-refresh/SKILL.md`。

## 四·七、更正循环端到端验证 + 新鲜度跟随（2026-09-25）

### 更正循环：真跑验证（代理会话证据）

**怎么测**：挑一条真实记忆（会话日志代次那条），快照它的 md5/字节数与桌面文件的 `generatedAt`，
然后用**面板会发出的那条提示**跑 one-shot（"请更正这条记忆。原记录：「…」。正确的是：应补上文件位置…。
改完请刷新我的桌面。"）。

**结果（全部实测）**：

| 观察 | 结果 |
|---|---|
| 旧记录处理 | 进 `memory/archive/`（supersede，历史可查） |
| 新记录 | 建立，且**含补上的事实**（`sessions/--<归一化 cwd>--/session-<id>/`） |
| 桌面文件 | 刷新（`generatedAt` 前移），且助手**自己清掉了死字段 `recentMemories`**（它读了客户端源码，发现面板只消费 `memories`，留着必然漂移） |
| 规模 | 记忆 8（全量）/ 知识 10 稳定 + 3 草稿 / 技能 2 / 线索 1 |
| 等你决定 | 2 条：公司事实盘授权、常驻摘要 4000/4096 已截断 |

**结论：养成循环成立**——用户在看见判断的地方指一条，助手改记录并重渲染那一面。

### 新鲜度跟随（本轮新加）

差距：助手在对话里改了东西，面板不会自己跟上，用户得手动点刷新。
实现：①订阅客户端会话 store，**最新会话的 `updatedAt` 变化后延迟 4 秒重读**桌面文件
（助手在这一轮里做的刷新会自动落到面板上）②面板来源行显示 `generatedAt`（"更新于 …"），
让"这份桌面有多新"可见。

## 四·八、批准路径：从"只能手工改文件"到"面板可批准"（2026-09-25）

**缺口（真产品缺口）**：面板给 draft 页加了"批准"按钮后我核实发现——**系统里没有"已批准→翻 stable"
的路径**：`writePage` 硬编码 `status: 'draft'`（"会话写的东西不能自我晋升"），`assistant_reflect` 的动作集
里没有翻页动作，而助手的文件工具够不到 working folder（默认工作区沙箱）。手册那句"状态翻 stable 是手工的
编辑"因此是当时唯一的路——**用户能批准，但批了也没人执行**。

**切片（三处同 diff）**：
1. 服务：`promotePage(id)`——读页、校验存在与可解析、写回 `status: 'stable'`（幂等：已 stable 直接返回）
2. 工具：`assistant_reflect` 新增 `promote_page` 动作 + `page_id` 参数；描述写明"**只在委托人已批准时使用**——
   批准是他的，这只是那次编辑"
3. 措辞：`save_page` 的描述与回执从"等人手工翻"改为"等委托人批准——你不能批准自己的页"

**live 探针（真跑，两轮）**：
- 第一轮抓到真 bug：`promote_page` 文件真翻过去了（`status: stable`），但**回执自相矛盾**——`render` 里那段
  按 `page_path` 触发、写死了 save_page 的措辞，于是同一条回执既说"已翻 stable"又说"仍是 draft，等手工翻"。
  助手读盘核对后如实报告了这个矛盾（**探针的价值正在此**）。
- 修 `render` 按 `action` 分支后复验：回执两行一致（"Promoted … to stable"）。
- 探针页两次都已清理。

**一条诚实的设计限制（助手在探针里指出，我认同并记录）**：这道"批准门"是**纪律，不是机械门禁**——
宿主无法验证"委托人确实说过批准"，所以单次 `promote_page` 调用在机械上就能翻页。能做的只有：
工具描述写死前提 + 面板把批准做成一个明确的用户动作（点"批准"）+ 助手在回执里报出翻了哪一页供人核对。

## 四·九、第 19 圈：信任线、缺什么、面板测试（2026-09-26）

### ① 信任线：出处可见

**缺口**：面板显示 kind 与时间，但不显示**出处**——而用户判断"这条对不对"时最需要知道"你从哪儿得来的"。
切片：契约加 `memories[].source` / `knowledge[].sources[]`；面板渲染 11px 灰字"来源：…"（超 110 字截断，
hover 全文）；技能写死"**没有出处就不要编造引用**"（无 source 的记录不渲染那一行）。
真跑：助手产出 7/7 记忆带 source、13/13 知识页带 sources。**样本本身就是培养痕迹**——那条被更正的记忆
source = `用户 2026-09-26 更正（补文件位置）；原记录 20260925-…`，用户能看见"这条是因为我更正过才长这样"。

### ② 培养的另一半：「缺什么」（gaps）

**缺口**：面板只显示助手**知道**什么，不显示它**缺**什么——而培养是双向的（用户指错、助手要料）。
切片：契约加 `gaps[]`（`what` 一行 + `why` 一行）；桌面在「等你决定」之后渲染（灰色左边条，与决定的橙色区分）；
技能写清**决定 ≠ 缺口**：决定是"该他拍板的"，缺口是"我缺的东西"（没有出处的数字、没有的权限、
没人给我的文档、没有事实就框不出的问题），并写明这是"培养的索求"。
真跑：助手产出 2 条真缺口（本季度原始读数；公司盘缺的数字与 9 家客户的水位），各带 why；
同时 4 条决定全是真决定（形态/培养面是否继续/摘要取舍/公司盘授权）——**区分成立，无混淆**。

### ③ 面板渲染冒烟测试

**缺口**：UI 此前零覆盖，而它是产品门面且在长大。切片：`tests/client-panels.spec.ts`（4 测试）覆盖
三个面板的分段渲染、draft 在前的排序与"批准只在 draft 上"、出处行、空态可读性（含加载器原因到达每个面板）。
测试装置：装 `__ModuleLoader__` 门面 → 求值脚本 → 用带 hook shim 的 require 物化工厂；`textsOf` 会调用
函数组件（面板把行委托给 CorrectableRow）。工厂按既有"暴露给测试"约定额外暴露三面板与 deskStore。

## 四·十、第 20 圈：技能参与、可读时间、快捷操作（2026-09-26）

### ① 技能参与：第三条审计线

**缺口**：审计对象有三类——记忆（它记住的事实）、知识页（它懂的东西）、技能（它会做的流程）——
前两类都能在面板上处置，技能只能看。切片：`CorrectableRow` 的 `approve` 泛化为 `actions[]`（动作组）；
知识室技能段改用该行，每件技能带"这技能有问题"（就地提意见）与"没用了"
（`retireSkill` → `assistant_reflect retire_skill`，助手把技能移出加载集、可恢复）。
**三类都能在看见它的地方直接处置，培养面才完整。**

### ② 可读时间

**缺口**：时间戳是 ISO 原串（`fact · 2026-09-26T05:10:02.454Z`），对 CEO 不可读。
切片：`shortTime()` → `09-26 13:10`；不可解析的值原样透传（不变成 Invalid Date）；
记忆室/知识室（顺带补上知识页更新时间）/桌面新鲜度行都走它。
测试断言改为在测试里用同一逻辑算期望值——固定字符串会在一个时区通过、另一个时区失败。

### ③ 快捷操作（用户最初设计里的一栏）

桌面此前只有刷新按钮。切片：两个一键提示——**回顾一下**（最近决定了什么、还有什么在跟、
你新学到了什么）与**体检**（跑一次 curate，报告家的现状与需要我处理的事），
走与其它动作同一条 `sendPrompt` 通路。桌面是 CEO 的行动面：除了"看状态"还要"一键让它干活"。

## 四·十一、第 21 圈：它最近做了什么 + 知识页生命周期闭环（2026-09-26）

### ① 桌面新增「它最近做了什么」（recentActivity）

**缺口**：面板只显示**状态**（知道什么/缺什么/在跟什么），不显示助手**最近做了什么**——
而对一个长期助手，"你最近在忙什么"是信任的核心问题。切片：契约加 `recentActivity[]`（at + what）；
桌面在「在跟的事」之后渲染（紧凑时间 + 一行说明）；技能要求从**工作文件夹的真实变动**推导
（文件时间 + 自己的工具结果），并写死"陈旧或编造的清单比没有更糟，没有变动就留短"。
真跑产出 5 条真实变动（退役记忆腾摘要空间、按更正重写记录、落盘公司事实、修正失效指针、记住 baseUrl 真相）。

### ② 知识页生命周期闭环：draft → stable → deprecated

**缺口**：面板能批准草稿、能提意见，但稳定页过时了没法处置——生命周期缺最后一环。
切片：服务 `deprecatePage(id)`（页留在原处以便链接解析、不再计入当前知识；幂等）+ 工具动作
`deprecate_page` + `render` 的第三分支 + 面板给稳定页"过时了"动作 + 技能说明三种生命周期动作都会
以普通消息到达。顺带修一个分组 bug（测试抓到）：`status !== 'draft'` 把 deprecated 页算进了"已确认"
——已分成三组（待审/已确认/**已退役**），因为"留在原处"不等于"已确认"。

### ③ 探针带来的三条诚实观察（助手指出，我认同并记录）

1. **两道闸门都是纪律，不是机械门禁**：手册写"你不能自己批自己的页"、工具这么提示，但
   `promote_page`/`deprecate_page` **没有拦截**——agent 单次调用就能翻页/退役。可审计的证据只有
   frontmatter 里的 `status` 与回执留痕。能做的仍是：工具描述写死前提 + 面板把动作做成明确的用户点击
   + 回执报出改了哪一页。
2. **`sources` 校验是判定式而非机械式**：`sources: ["probe"]` 不是 `memory:`/`research:`/URL/仓内路径，
   仍被写成 `resource: probe` 通过。这是既有设计（来源是逐字存储的字符串，服务不校验目标存在），
   记录在案而不是偷偷改掉。
3. **契约细节**：deprecated 页**仍在 search 里返回**（带 `[deprecated]` 标注），只是不计入"当前知识"
   ——与工具描述一致。

## 四·十二、第 22 圈：决定可就地回答 + 线索可就地处置（2026-09-26）

### ① 决定可就地回答（与更正循环对称）

**缺口**：更正行有内联输入，决定行没有——助手在面板上问"要不要授权读公司盘"，用户只能在对话里回答。
切片：决定行改用 `CorrectableRow`（内联"回答" + 动作"看选项"），新增 `answerDecision`
（"关于这个待决事项：「…」——我的决定是：…。请记住它、据此更新你的判断，然后刷新我的桌面。"）。
技能里把"更正会从这个文件回来"扩成"**他们的动作都会从这个文件回来**"，逐条列出四类
（更正/决定答复/批准/退役）各自该做什么、都以"同一轮刷新桌面"收尾。

### ② 线索可就地处置：第四类审计对象

**缺口**：四类审计对象里，记忆/知识页/技能都能在面板上处置，**线索只能问进展**——而研究室的出口是
promote / park / drop。切片：线索行改用 `CorrectableRow`（内联"问进展" + 两个动作："先放放"=park、
"收了"=让助手判断 promote 还是 drop 并说明归到哪里）。顺带删掉因此失效的 `askAboutThread`。

**至此四类对象都在看见它的地方可处置**：记忆（更正）、知识页（批准/提意见/退役）、技能（提意见/退役）、
线索（问进展/放放/收了）。培养面在"用户能参与"这一维上闭环。

## 四·十三、第 23 圈：新鲜度的诚实性 + 技能全貌（2026-09-26）

### ① 陈旧告警：不许把过期快照当现状

**缺口**：面板显示 `generatedAt`，但不告诉你**它比对话旧**——助手若在对话里改了东西却没刷新桌面，
用户看到的是一份过期快照且毫无提示。切片：`deskStore` 记录最新会话的 `updatedAt`（loadDesk 时算）；
`staleWarning(store)` 在文件落后对话超过一分钟时显示"⚠ 对话比这份桌面新（对话 HH:MM，桌面 HH:MM）
——点「刷新桌面」让它跟上"（一分钟余量吸收刷新本身耗时）。测试两侧都覆盖。
**设计理由：这是信任面，把过期快照当现状呈现比不显示更糟——宁可明说"我旧了"。**

### ② 技能全貌：随包 vs 学来的

**缺口**：知识室的"技能"只列了**学来的**（工作文件夹里的 2 件），**随包的策展技能全都没显示**——
而"这个助手会做什么"正是这一栏要回答的问题，只列一半会低估它。切片：契约 `skills[].kind`
（curated | learned）；面板分两组渲染（随包/学来的）；**退役动作只给学来的**——策展技能随包分发，
从这里"退役"会谎报可加载性。技能里写清两个来源与为什么必须都列。
真跑：助手列出全部 **11 件**（9 件随包含 desk-refresh 自己 + 2 件学来的）。

## 四·十四、第 24 圈：行动计划有了家（desk 的 actions 栏 + plan 页）（2026-09-26）

### 缺口（本轮最有价值的一个）

助手用 `action-plan` 技能产出的**行动计划全都消失在对话里**——CEO 最需要的恰恰是"哪些事在办、
谁欠谁、什么时候到期"。桌面没有这一栏，而且新会话看不见上一次的计划。

### 切片（三处同 diff）

1. **契约 + 面板**：`actions[]`（what/owner/due/metric/stop/status）；桌面新增「在办的事」
   （排在「等你决定」之后），每条显示负责人 · 时点 · 度量 · 停止条件，动作：
   "改这条"（内联）、"办完了"、"不办了"。
2. **计划必须落地**（`action-plan` 技能）：定下形状后 `assistant_reflect save_page` 成
   **`type: plan` 的知识页**——计划因此存活、可被 CEO 在知识室批准（draft→stable）、
   改版时同名重写并说明改了什么。
3. **桌面从计划页提取**（`desk-refresh` 技能）：`actions` 不再靠回忆，而是读知识室里
   `type: plan` 的页。

### 真跑验证（两段，全链）

- 第一段：提示"我们这个季度销售掉了 20%，帮我拆解并给出可执行的行动计划。计划定下来后请按技能要求存档。"
  → 助手产出拆解 + 计划，并**落成一页 type: plan 的知识页**（知识页 13→14）。
- 第二段："刷新我的桌面。" → 桌面 **actions: 6 条**，全部来自那页计划，每条四要素齐全，例如：
  - 「定死「20%」的口径与范围…」owner: CFO（口径）+ COO/PM，due: 2026-10-02 前，
    度量: 闭合到 ±2pp，停止: 绝对数拿不到或口径不唯一 ⇒ 停 A3–A5、不许先降价
  - 「建折扣报价台账 + 续约台账」owner: VP-Sales，due: 2026-10-10 前，
    停止: 台账未建前不对外给任何新折扣承诺
  - 「季末 4 天零新增破价承诺」owner: 你，度量: 破价承诺数 = 0

**这是培养面第一次接上真实工作产出**：计划不再消失在对话里，而是变成可跟踪、可批准、
可处置的条目，且四要素（责任人/时点/度量/停止条件）在面板上一眼可见。

## 四·十五、第 25 圈：记忆室按"关于什么"分组（2026-09-26）

**回到用户的核心要求"把东西做对"**——审视三室内容分工，发现记忆室缺一层分组：对数字分身来说，
"**它知道我怎么做事**"（偏好 / 我的决定）与"**它知道世界**"（事实）是两类东西，混在一列里看不出
重点，而每行一个 kind 标签不足以按类扫读。

切片：记忆室分四组渲染——**你的偏好 / 你的决定 / 事实 / 其它**（顺序即优先级：分身的核心是先懂人）。
行内不再重复 kind（已由组标题承载），保留时间与出处与"这条记错了"。测试覆盖四组、偏好排在事实之前。

## 四·十六、第 26 圈：形态落地——三室开进对话旁的右侧栏（2026-09-26）

用户拍板右侧栏 tab 后的第一个切片（§四·五 的拍板与机制记录在此收口）。

**切片（四处同 diff）**：
1. **三室三 kind**：`desk` / `knowledgeRoom` / `memoryRoom`，kind 型页（无 patterns、按 kind 打开），
   两段注册照 ui-schedule（definition 进 `sidebarRightTabs`、body 挂 keyed `sidebar.right.pane.tab`
   座位、chip 标题用 definition 捕获的常量）。
2. **会话绑定读取**：session 作用域的 seat 组件直接拿到 `sessionId`（`ScopeStandardProps`）——
   新增 `loadDeskFor(sessionId)` 只读本 tab 所在会话的工作区，"读哪个工作区"从"最近五个会话挨个试"
   变成机制层保证；miss 记账（`deskMisses`）让 tab 明说"这个会话还没有桌面文件"而不是空转；
   跨会话数据用 `sourceSession` 守卫——不属于本会话的快照显示"正在读这个会话的桌面…"，不冒充现状。
3. **两个开启点**：会话页头「桌面」chip（`conversation.session.header.utilities`，照 ui-schedule 的
   order 形状）+ 各整页室头的「在对话旁打开」按钮（`openBeside(kind)`）。
4. **恢复态语义（查清后定的取舍）**：恢复的 tab 只存布局记录、不带导航参数——schedule 用 binding 表
   找回任务，桌面不需要：它天然绑定所在会话，恢复后仍读对工作区。

**验收（显式退出码）**：tsc 0 error、本包 vitest 36 通过 / 1 失败文件（=已知降级两条，与本切片不相交）、
verify 31/31、build exit 0、干净目录起 web + preflight 绿（boot 图 65 项，含新依赖 `sidebarRight`
的提供者 `dsh-client-ui-sidebar-right`；Remote 清单 27 命名空间；desk 文件九段在列）。
**待真人**：右栏窄幅下的表达（行宽、截断、逐条动作的密度）没经真人眼——等实测反馈再调，不提前打磨。

## 五、实验计划（按序，每步可看可玩）

### 实验一：最小桌面 tab ✅（2026-09-25，两轮修正后成功）
- **实验一a（右侧 sidebar tab 类型注册）**：代码通过但浏览器不可见——**教训：tab 类型是"我能处理这种资源"的被动声明，不产生可见入口**
- **实验一b（左侧 sidebar panellist 注册）**：✅ **成功**——CEO 看到了 My Desk 图标并打开了面板
  - 修正过程：第一版用 `contribute` 方法（猜的，不存在）→ 第二版读 `ui-schedule` 源码发现正确形状是 `inject + register`（跟品牌标记同机制，declaration 带 `id`/`order`/`label`）
  - 面板显示四个静态数字（Memories 8 / Knowledge 13 / Skills 8 / Threads 0）
  - **学到的 DSH 交互机制**：panellist 是 list 型 slot，消费端用 `entriesOfSlot` 读取；注册端用 `inject(name, () => register(declaration, component))`；每个 inject 贡献一个条目
- 目的达成：验证 client → sidebar 面板的路径端到端可行

### 实验二：桌面 tab 补全（等你决定 + 在跟的事 + 快捷操作）
- 补全桌面 tab 的三块内容
- 目的：让桌面 tab 真正有用
- 判据：CEO 打开 sidebar 3 秒内知道"助手在跟什么、等我什么"

### 实验三：知识 tab
- 按主题分组的知识页列表 + draft 待审标记
- 目的：CEO 能验证"助手懂不懂我的生意"
- 判据：CEO 点开 CFO 视角页，3 秒内判断"是懂了还是装的"

### 实验四：记忆 tab
- 最近记忆列表 + 编辑/删除
- 目的：P3"管得住"的可视化
- 判据：CEO 能看到助手记了什么、能改能删

### 实验五（远期）：genui 式回复内渲染
- 行动计划渲染为可勾选清单
- 目的：交互式交付物
- 判据：CEO 在聊天里看到可交互的计划而不是纯文字

## 六、用户学习目标

通过看这些实验，用户（CEO 本人）将熟悉：
1. DSH 的 sidebar tab 机制（怎么加、怎么摆）
2. DSH 的 Remote API（浏览器怎么读服务端数据）
3. DSH 的 client 插件架构（我们包怎么贡献 UI）
4. 交互设计的取舍（什么信息放面板、什么放聊天）

## 七、输掉的方案

- **装第三方 sidebar 包**（用户已否决——只借思路不装包）
- **做全功能仪表盘**（CEO 不要 BI 工具，要的是"助手状态一览"）
- **先做 genui 式渲染**（依赖最重、链路最长，放最后）
- **只做设计不做实验**（用户明确说"都实验一下"）

## 八、登记

- ROADMAP：▶ 条目指向本卡
- 前置研究（生态全量扫描、五个高声誉插件分析）：归档在 git 历史（`759c27d` 与 `ec52cf0`）

## 九、运行与验证（链接，不复述）

命令的唯一权威：根 [`AGENTS.md`](../../AGENTS.md) 命令表 + [`docs/dev.md`](../../docs/dev.md) §四；
交付关口是 `scripts/webui-preflight.mjs`。本卡只记两条本战役特有：

- 起 Web UI 必须从**干净目录**起（如 `/tmp/desk`），否则会话会读到开发仓的 AGENTS.md；
- 查组合里有没有这一行（boot-free）：`node scripts/dsh.mjs --profile dev --dump-config | grep -A3 '<row id>'`。

（本节旧版复述的完整命令块与 pnpm 绕过法已删——绕过法在 peerDep 回退当天就过期；审计与拆法见
[清理卡](../implemented/2026-09-26-signal-noise-sweep.md)。）

关键文件：
- `packages/dsh-smart-assistant/src/client/index.ts` —— client 面（品牌标记 + My Desk 面板）
- `vendor/dsh/packages/client/ui-schedule/src/client/index.ts` —— panellist 注册的参照物
- `vendor/dsh/packages/client/ui-sidebar/src/client/index.ts` —— panellist 的消费端
- `scripts/webui-preflight.mjs` —— 交付前关口（含 boot 图检查）

不可推翻的架构事实（实验所得）的权威 = 开发技能
[`client-ui-contribution`](../../.agents/skills/client-ui-contribution/SKILL.md)（四事实 + 验证循环）；
typert 阻塞的证据链与死路回退保留在本卡 §四·二（rationale 家，不复述 how-to）。
