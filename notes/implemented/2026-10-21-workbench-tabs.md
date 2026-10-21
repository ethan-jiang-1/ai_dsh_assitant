日期：2026-10-21 · 状态：**implemented**（用户裁决 1：接受会话内四 tab，不要求应用级 tab strip）

# 工作台 tabs：桌面/自动化任务进入会话顶部

## 问题（可观察行为）

桌面和自动化任务原本是独立主面板，右栏只在会话里存在；用户想“像对话页一样”在这两个页面开合右栏。前两版原型（右缘小把手、应用级 overlay 右栏）都被否：不是对话右栏的待遇。

## 决定（裁决 1）

1. **会话内 tab**：`桌面`、`自动化任务` 注册为会话的 `conversation.view` 项，顶部与 `对话/轨迹` 并排。切换只换中间内容，右栏是会话原生那栏，不重置。
2. **两个 view，一份桌面**：tab body 与左栏主面板都渲染同一个 `ProjectionPanel`，读同一个 projection snapshot；各自用独立的 selection store（slot store 是独占的，不能共用同一个 handle）。不复制桌面数据，也不使用 fallback `DashboardMainPanel`。
3. **任务薄视图**：任务 tab 读现有 schedule catalog，列出开启中的任务；点一条用 `sidebarRight.openTab('scheduleTask', { params: { sessionId, id } })` 在原生右栏开详情，不复制 vendor 的整页。
4. **不做应用级 tab strip**：`conversation.view` 只在会话内存在；新会话首屏保持欢迎页，不为了“任何状态都有 tab”去造浮层或改 vendor 壳。用户已明确接受这一边界。
5. **不保留 per-page 右栏**：全局右栏/小把手原型已撤掉；只有会话原生右栏。
6. **左栏入口**：现有左栏「桌面 / 自动化任务」仍作为独立主面板快捷入口保留（vendor 的自动化任务入口无法在插件内移除）；用户裁决 1 接受它们与会话 tab 并存，不再为此改壳。

## 输掉的方案

- **应用级固定 tab strip + 新会话首屏也有 tab**：平台没有该扩展点；只能改 vendor 壳，用户裁决 1 放弃。
- **每个全局页自带一套右栏**（前两版原型）：切页像换应用，右栏重置；用户否。
- **右缘小把手 + 浮层**：不是对话右栏的待遇。
- **给全局页造 Session**：为了开栏多出会话，列表被污染。
- **复制 vendor TaskManagerPage**：没有公开导出；薄列表 + 原生任务详情已满足“详情进右栏”，不复制整页。
- **每个会话复制一份桌面数据**：桌面数据仍是全局投影，tab 只是入口；没有第二份存储。
- **tab body 用 fallback `DashboardMainPanel`**：它只读房间数据、不读投影，真机显示“读不到账本投影”，与左栏桌面内容分裂；撤。
- **两个 view 共用同一个 slot store handle**：slot store 是独占的，第二次注册会让 client entry 激活失败；必须各建一个 selection store，共享 projection snapshot。

## 边界

- 新会话首屏/无会话态没有四 tab；这是平台边界，不是漏做。
- 左栏「桌面/自动化任务」与 tab 并存；vendor 任务入口不受本插件控制。
- 工作区文件、终端仍按会话能力显示；没有会话时不伪造。
- 这是 UI 结构变更，不改变 OpenViking / Viki 的 host 路由与数据合同。
