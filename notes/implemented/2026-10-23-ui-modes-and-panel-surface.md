日期：2026-10-23 · 状态：**implemented**（用户批准 P1 面板 surface + P2/P3 三档界面 M1；M2 未取）

# 面板 lane surface 与三档界面（M1）

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

- 词表在 `domain/home/ui-mode.ts`；Host `Config.uiMode` 与客户端 store 共用。Host 只存偏好，不读它。
- 模式 store：localStorage 首屏、per-materialization 重置；`configForms` 的 `assistant-memory` 表单 ready 时 adopt，用户切换时写回（不可写则保留本地）。
- rooms 的 body/title 一次注册；**tab type 按 mode 重注册**（`mount-rooms.ts`），guide 列表：简洁 = 无；标准 = 知识/记忆/技能（隐藏 Viki）；专家 = 全部。已开的 tab 不因 type 重注册而变空壳。
- `settings.general.item` 置顶行三档选择；三条命令 `mode-simple`/`mode-standard`/`mode-expert` 走同一 store。
- 简洁档：桌面保留看板，隐藏流水 tab、主动性与建议行；审批、错误、发送/停止不隐藏。标准档只隐藏 Viki guide；专家全开。默认标准。
- 不自动升级；模式只是呈现，不改 host 路由、工具、审批、记忆层或模型行为。

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

## 边界与未达

- **持久化现实**：stock bundle 的 `assistant-memory` 行嵌在 bundle 内，`settings.describe` 不列出它（实测 namespaces 无此项），`configForms.get` 返回 unavailable。因此当前三档持久化**回落 localStorage**（同浏览器重载保留；跨设备/换 home 不保证）。Host `Config.uiMode` 已声明，任一 composition 把该行暴露为顶层 settings namespace 时绑定自动生效。跨设备持久化是本轮**未达**的原目标，属平台/组合约束；要么把该行提升为可配置项，要么换持久化面，二者都需另一次决定。
- **M2 未取**：简洁单卡+输入、回执/诊断/转正 gating、命令过滤、「更多」入口。触发 = 真实简洁用户出现或本人要求；届时先解决上面的持久化面，再谈密度。
- 三档不是权限边界；隐藏不等于禁止。
- P1 的面板 surface 只改客户端接口，不改投影数据或 lane 行为。
