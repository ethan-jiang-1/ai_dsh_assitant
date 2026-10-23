日期：2026-10-23 · 状态：**implemented**（用户批准 P1 面板 surface + 三档 M1，随后要求持久化与 M2 也做完；全部已交付）

# 面板 lane surface 与三档界面（M1 + M2）

## 问题（可观察行为）

两件相邻的接口债：

1. `ProjectionPanel` 有 20 个顶层 props（4 个框架 hook、view store/actions、12 个回调），11 处测试各自手搭整个形状；加一条 lane 要改所有 fixture。
2. 界面只有一种固定密度：知识/记忆/Viki/技能房间、Viki(调试)、主动性与流水对所有用户同时在场；第一次用的人与研发用户看到同一套面。

## 决定

### P1：面板的 lane surface

- 渲染器只从**顶层** `hooks` 绑定 `useProjection`/`useSessionStatus`/`useCatalog`/`useProactiveUi`；`store`/`actions` 也必须在顶层。因此 **`DeskSurface` 只装 lanes，不装 hooks**。
- 新增 `client/projection/desk-surface.ts`：`createDeskSurface({ ctx, sessionId, reader, arms, handlers })` 把导航、房间/Intake/处理/认领/唤醒/建议动作收成 `DeskSurface.lanes`。`ProjectionPanelProps` 缩到 7 个字段：`surface`、4 个 hook、`actions`。
- `ProjectionViewBoundActions` 成为 view store 的具名绑定动作类型，panel 与测试共用。
- 测试收口到 `panelProps(value, view, lanes, options)` 一个构造器；入口的 inject 面返回 `{ surface, hooks }`（无 projection 的 fallback 另带 `onAsk`）。`desk-arms` 测试适配器把 lanes 摊平，不复制形状。

### P2/P3：三档界面（简洁 / 标准 / 专家，默认标准）

- 词表在 `domain/home/ui-mode.ts`；Host 文件 route 与客户端 store 共用。Host 只存偏好文件，不读它。
- 模式 store：localStorage 首屏、per-materialization 重置；Host `api/assistant/ui-mode` 的 GET 采用、用户切换 POST 写回；远端失败保留本地。
- rooms 的 body/title 一次注册；**tab type 按 mode 重注册**（`mount-rooms.ts`），guide 列表：简洁 = 无；标准 = 知识/记忆/技能（隐藏 Viki）；专家 = 全部。已开的 tab 不因 type 重注册而变空壳。
- `settings.general.item` 置顶行三档选择；三条命令 `mode-simple`/`mode-standard`/`mode-expert` 走同一 store。
- 简洁档：桌面 = 捕获输入 + 单卡 +「显示更多」；隐藏流水 tab、主动性与建议行、列表与筛选。标准档只隐藏 Viki guide；专家全开。默认标准。
- 不自动升级；模式只是呈现，不改 host 路由、工具、审批、记忆层或模型行为。

### M1.1：持久化（per-home host route）

stock bundle 的 `assistant-memory` 行嵌在 bundle 内，`settings.describe` 不列出它，`configForms` 不可达；不改 vendor、也不把偏好塞进 settings 文档。新增 `assistant-ui-mode` host 行：`GET/POST api/assistant/ui-mode` 读写 `assistant/ui-mode.json`；客户端 localStorage 首屏 + route adopt/写回；per-home durable，同一 home 跨浏览器。Host `Config.uiMode` 撤掉（避免死配置）。

### M2：简洁档

- 单卡优先级：待答问题 → 在办/首件 → 未归户片段 → 空态；主按钮对应去会话 / 处理（或唤醒）/ 认领。
- 捕获输入保留；回执行保留（诚实的投递事实），不显示列表、筛选、流水、proactive、建议；「显示更多 · 切到标准」是唯一桌面出口（设置行/命令亦可）。
- 命令面：room/desk 命令的 `available` 在 simple 返回 false，`mode-*` 始终在场；审批、错误、发送/停止不是命令，不隐藏。
- 诊断/转正属房间面，随 guide 隐藏；不新增权限门。

### M0 判定

真机开 Viki tab，依次 standard → simple → expert；tab 与正文（11 条记忆）始终存活。结论：**guide-gated 的 type 重注册安全，不关已开 tab**；不需要 body 级降级或 `sidebarRight.close`。

## 输掉的方案

- **把 hooks 也塞进 `DeskSurface`**：渲染器只从顶层 `hooks` 绑定，嵌套后 hook 不执行；必须保持顶层。
- **保留 20 字段 props 只做“可选兼容”**：测试面仍是旧形状，加 lane 仍要改 fixture；不达成 interface 收缩。
- **切换时关闭已开房间 tab**：跨会话 tab 无法由插件关闭；且用户会丢失正在看的内容。M0 已证明不需要。
- **body 级 gating（tab 留着、正文说“切到标准/专家”）**：比 type 重注册更吵，且开着的 tab 会变成提示壳。
- **CSS 隐藏**：DOM/命令/深链/无障碍仍在，“隐藏”不是“不在场”；不选。
- **拆三套 profile/preset**：内部逻辑一样，却维护三套组合，并把界面密度与 agent 行为混为一谈。
- **自动按使用程度升级**：不做默认自动切换；只保留显式模式与可回退开关。
- **把 mode 存进 per-tab `local-state`**：那是标签页便利状态，不是跨会话偏好；不选。
- **把 `uiMode` 留在 `assistant-memory` 的 Config/settings 表单**：stock bundle 的嵌套行不进 `settings.describe`，`configForms` 不可达；不为此改 vendor。host 文件 route 是可达的 per-home 面。
- **为持久化改 vendor 的 settings namespace 枚举**：插件边界外，且会让 bundle 依赖未公开的 profile 行遍历；不选。

## 边界

- **持久化边界**：偏好是 assistant home 的 `ui-mode.json`，不是 settings 文档；同一 home 跨浏览器，换 home 不带走（随 home 备份/迁移）。不写 vendor，不改 settings schema。
- **M2 边界**：简洁只做桌面单卡 + 命令过滤；房间正文、诊断、转正不在简洁露出（随 guide 隐藏），但审批、错误、发送/停止仍在。
- 三档不是权限边界；隐藏不等于禁止。
- P1 的面板 surface 只改客户端接口，不改投影数据或 lane 行为。
