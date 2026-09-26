# CEO 助手的 Sidebar 交互实验（用户拍板：DSH 交互设计练习）

日期：2026-09-25 · 状态：**proposed（用户拍板的当前 Goal：实验 DSH 底下的交互怎么设计，借助什么；
产出让 CEO（用户本人）熟悉 DSH 交互设计的一套可看可玩的实验）**

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
- 我们的 DeskRemote 服务代码保留在 `src/desk-remote.ts`（未接线到 client），作为将来做 typert 集成时的现成起点。

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

## 九、运行与验证（操作信息，原 handoff 文档的内容折入此处）

```sh
# 起 Web UI（必须从干净目录起，避免会话读到开发仓的 AGENTS.md）
cd /tmp/desk && node /Users/bowhead/ai_dsh_assitant/scripts/dsh.mjs --profile dev --port 0 --no-open
# 交付前必须过 preflight（现在它含 boot 图 + Remote 清单检查）
cd /Users/bowhead/ai_dsh_assitant && node scripts/webui-preflight.mjs '<URL>'
# 组合里有没有这一行（绕过 pnpm 的 deps check，直接用 node）
node scripts/dsh.mjs --profile dev --dump-config | grep -A3 '<row id>'
```

关键文件：
- `packages/dsh-smart-assistant/src/client/index.ts` —— client 面（品牌标记 + My Desk 面板）
- `packages/dsh-smart-assistant/src/desk-remote.ts` —— DeskRemote 服务（保留为将来 typert 集成的起点）
- `vendor/dsh/packages/client/ui-schedule/src/client/index.ts` —— panellist 注册的参照物
- `vendor/dsh/packages/client/ui-sidebar/src/client/index.ts` —— panellist 的消费端
- `scripts/webui-preflight.mjs` —— 交付前关口（含 boot 图检查）

不可推翻的架构事实（实验中学到的）：
1. **client 是 SCRIPT 不是 ESM**——web shell 把 client bundle 拼成 classic-script combo，不能有 import/export；
   类型用结构镜像，依赖用 `require()`。
2. **UI 一切走 slot 系统**——`inject` 占位 + `register` 提供组件；品牌标记、panellist 面板、右侧 tab 同一机制。
3. **tab 类型注册 ≠ tab 可见**——类型是"我能处理这种资源"的被动声明。
4. **Remote 代理不是 own-property**——由 loader 按 inject 声明物化；`Object.keys(remote)` 为空是正常的。
5. **仓外插件的 Remote 命名空间需要 typert 清单集成**（§四·二 的证据链）。
