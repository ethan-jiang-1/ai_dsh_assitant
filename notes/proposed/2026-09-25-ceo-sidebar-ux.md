# CEO 助手的 Sidebar UX：快捷工具面（研究 + 落地）

日期：2026-09-25 · 状态：**proposed（研究进行中：DSH 自有 client UI 面 → 生态候选 → CEO 工作流倒推）**

## 一、问题（用户 2026-09-25）

对话 + 上下文还太简陋。CEO 助手的 sidebar 里应该有**快捷工具**：一眼看上去就是靠谱的助手，
常用操作不需要打字。先做 CEO 这一个角色的，想清楚后其他角色复用模式。

## 二、研究路线（按序）

1. **DSH 自带的 client UI 面**：sidebar / sidebar-right 的 slot 机制、已出货的 tab（文件、终端、
   文档预览、浏览器）——哪些 CEO 用得上、哪些需要我们贡献新 tab。
2. **生态候选**：awesome-dsh-plugin 的 UI 类（592 个）里有没有现成的 sidebar 插件（看板、
   待办、数据面板、知识库浏览）——按准入表筛。
3. **CEO 工作流倒推**：CEO 每天看什么（销售数字、现金跑道、待办决定）、做什么（拆解、批阅、
   找人）——sidebar 里放哪几个入口。

## 三、约束

- DSH 原生 > 生态 > 适配 > 自建；自建须留证。
- 我们的 client 面已经能贡献 UI（web-branding 证明了路径）。
- ⏸ 并行会话的切片还在工作树——涉及 client 面的文件先确认归属再动。

## 四、研究发现

### DSH 自带的（零成本，已在组合里）

| Tab/面板 | 包 | 对 CEO 的用处 |
|---|---|---|
| 文件浏览 | ui-sidebar-files | 浏览 working folder（memory/、knowledge/、research/）——原始文件视图 |
| 文档预览 | ui-sidebar-documentpreview | 预览知识页／记忆／交付物 |
| 交付物 | ui-deliverables | 管理产出的文档／计划 |
| 技能 | ui-skill（/ 触发） | 浏览可用技能 |
| 目标 | ui-goal | 跟踪长任务 |

**已有但 CEO 用不上的**：终端（ui-sidebar-terminal）、浏览器（ui-sidebar-browser）——偏开发场景。

### 生态候选（awesome 列表 592 个 UI 类里筛出的）

| 候选 | 做什么 | 适配 CEO？ | 准入判断 |
|---|---|---|---|
| **dph-taskboard** | 侧边栏任务看板（待办/进行中/评审/完成四列，拖拽） | **是**——CEO 的日常管理面 | 待查（单人维护，npm 发布） |
| dsh-mindmap | 对话式思维脑图 | 可选——拆解的可视化 | 待查 |
| dsh-hud | HUD 状态面板（Git/MCP/技能/token） | 否——开发向 | — |
| dock + dock-files | VSCode 风格工作台 | 否——太重，CEO 不要 IDE | — |
| dsh-enhance-tool | 一站式 UI 增强（提示词库/润色/折叠） | 部分——但解决的是聊天 UX 不是管理面 | — |

### 生态里没有、必须自建的（也是我们的差异化）

- **"My Desk" 面板**：把 assistant 的 digest／线索／记忆／知识摘要渲染成**视觉面板**——CEO 打开 sidebar
  一眼看到"助手此刻在跟什么、知道什么、有什么待办"，而不是读一段文字摘要。
- **知识室浏览器**：比文件树更语义化的知识页浏览（生命周期状态、互链、出处），O1/P3 的可视化面。

## 五、方案（三步走，第一步本周可落地）

### 第一步：My Desk 面板（自建，最高价值）

在**右侧 sidebar** 加一个 "My Desk" tab，内容四块：
1. **此刻状态**——digest 的视觉化（记忆 N 条 / 线索 M 条 / 知识 K 页 / 技能 S 件）
2. **Open threads**——未决线索列表（问题 + 当前倾向），点击展开
3. **Recent memories**——最近 5 条记忆（一句话 + 时间）
4. **Knowledge summary**——stable 页面数 / draft 待审数

技术路径：我们包的 client 面（src/client/）已有 branding 入口，同一机制加一个 sidebar tab；
数据经 Remote API 从 assistantMemory 服务取（digest/curate 已有服务端数据）。

### 第二步：生态 taskboard 试用

`dsh plugin add dph-taskboard`（先过准入表：源码审查、网络出口、数据边界），
看 CEO 是否用它管理日常待办。**不通过准入就不装**，自建轻量替代。

### 第三步：知识室浏览器（等 CEO 用过第一步后再定形状）

## 六、输掉的方案

- **dock（VSCode 工作台）**：CEO 不需要 IDE；太重、改变整个布局。
- **dsh-engram 的记忆宫殿面板**：它是完整的记忆系统（SQLite/向量），与我们 Markdown 房间语义冲突；
  面板设计可借鉴。
- **先做终端/浏览器 tab**：CEO 场景用不上，是开发向的。
- **不做面板只做聊天**：用户已明确说"只靠对话简陋"。

## 七、产出（原目标，保留供参考）

一份可拍板的方案：sidebar 放什么（2–4 个 tab）、每个 tab 的来源（DSH 自带 / 生态 / 自建）、
第一个落地切片。
