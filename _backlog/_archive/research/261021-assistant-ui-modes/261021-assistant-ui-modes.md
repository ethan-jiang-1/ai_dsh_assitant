---
topic: 技术
intent: "同一套内部逻辑下，助手界面三档密度与随时切换，平台缝在哪、该选哪条路。"
---

# 助手界面三档呈现（简洁/标准/专家）的机制调研

> 为 [三档界面 issue](../../settled_issues/261021-assistant-ui-modes.md) 收集；2026-10-21。只调研，不实现。
> 用户原话：“界面应该是可以配置的……分为 3 类用户：简洁、中度、重度；界面元素可以随时动态变化最理想……内部逻辑一模一样，就是呈现面多样和灵活。”

## 1. 要回答的问题

- 当前助手把哪些“界面元素”注册在哪些 client 缝上？宿主数据/模型逻辑是否必须跟着变？
- 侧栏 tab、slot、设置项能否在**运行时**增删，而不是只在启动时决定？
- 三档偏好应存在哪里（host、浏览器、profile），怎样做到“随时切换”且下次打开还在？
- Viki(调试) 作为“专家面”的一个具体门，怎样只在重度模式出现？
- 哪些面**永远不能被简洁模式隐藏**（审批、错误、授权、风险提示）？

## 2. 现有呈现面与注册缝

| 面 | 现在的位置 | 是否可按模式变 |
|---|---|---|
| 首开条 / 桌面 / 输入 dock | `src/client/index.ts` 的 `conversation.input.dock`/`conversation.hero`；`chrome/first-mile.ts`、`chrome/dashboard.tsx` | 组件内条件渲染；或按模式注册/不注册 slot |
| 右侧栏房间 tab（知识/记忆/Viki/技能） | `src/client/rooms/room-tabs.ts` 的 `roomTabs`；`src/client/index.ts` 的 `sidebarRightTabs.register` 循环 | **可运行时增删**：`register` 返回幂等 disposer（`vendor/dsh/packages/client/ui-sidebar-right/src/client/tab-registry.ts:246-269`） |
| 房间 tab 的 body / title chip | `sidebar.right.pane.tab` / `sidebar.right.pane.tab.title` slot | slot register 返回 disposer；随 tab 一起增删 |
| Viki(调试) 搜索/诊断 | `rooms/viki-panel.ts`；host `?q=` / `?view=diagnostics` | body 内条件渲染；或整个 tab 在非专家模式不注册 |
| 审批 / 风险 / 错误 | `chrome/first-mile.ts` 的 approval banner、`rooms/receipt-view.ts` 等 | **不能隐藏**；模式只影响周围信息密度 |
| 回执 / 对比 / 转正 | `receipt-view.ts`、`viki-panel.ts`、`panels.tsx` | 可只在重度出现；写面与审计不变 |
| 命令 / 主题 / 设置入口 | `chrome/commands.ts`、`ui-settings` | 命令可按模式过滤；设置入口始终保留 |
| 桌面经营账本 / 投影 | `chrome/dashboard.tsx`、`projection/` | 简洁给摘要，重度给全量/下载 |

**关键事实：** 当前 `roomTabs` 在 `apply` 里一次性静态注册，没有持有每个 room 的 disposer；要动态切换，需要把这段循环改成 `mountRooms(mode)`，把 tab 类型、body、title 的 disposer 存起来，模式变化时先 dispose 再 register。`sidebarRightTabs.register` 明确返回幂等 disposer；slot 注册同样返回 disposer（`vendor/dsh/packages/client/ui-slots/src/index.ts:734/1155`）。所以“运行时切换”在平台上是**可行**的；代价是当前打开的 tab 可能被关闭，需要给用户一个“当前 tab 被收起了”的落点。

## 3. 偏好存在哪里

| 方案 | 优点 | 问题 |
|---|---|---|
| 浏览器 `localStorage` | 同步、启动即可用；实现最小 | 换浏览器/换设备丢；不适合“用户画像” |
| 现有 `local-state.ts` | 已有测试与容错形状 | 明确是 **per-tab** 便利状态，不是持久偏好；不能当唯一真相 |
| DSH settings 文档（profile/home） | 已有 `settings.section` / `settings.general.item` 缝；持久、按 home 隔离；可被设置页编辑 | 客户端 boot 时是异步的；需要本地缓存兜底，避免先闪一下默认档 |
| 助手 working folder 新文件 | 与用户数据同家 | 会新增一个持久化面；布局契约（`docs/home.md`）要扩；且 UI 偏好不是“助手记忆” |
| 独立 host 行 Config | 与 settings 页天然结合 | 需要新 host 行/配置 schema；改配置影响该 profile 的全部会话 |

**建议：** 目标态用 **DSH settings 文档**（新 host 行或扩展现有 assistant host 配置）作为真相；客户端用 `localStorage` 缓存最后一次模式做同步起步，启动后与 settings 对齐。这样既“随时切”，又不会每次打开先闪默认档；不把 UI 偏好混进 working folder 四房间。

## 4. 三个候选架构

### A. Host settings + client mode store + 动态注册（推荐）

- host 侧：新增 `UiMode`（`simple | standard | expert`）到 assistant 的 host 配置/settings schema；设置页用 `settings.section` 贡献一个“界面密度”控件；写入走现有 settings 文档。
- client 侧：一个 `ui-mode` snapshot store（`createSnapshotStore`/`defineStore`），`useUiMode` 被首开条、桌面、房间 tab、Viki、命令读取；初始值取 localStorage 缓存，随后 settings 对齐。
- 动态面：`mountRooms(mode)` 持有 tab/slot disposer；模式变化 dispose/register；静态组件按 `useUiMode` 条件渲染。**不改变 host route、数据、模型工具、审批**。
- 切换入口：设置页 + 一个命令面板命令（`界面：简洁/标准/专家`），首开条给“更多/切换”的轻入口；模式切换不要求刷新。
- 代价：settings 异步/首屏缓存；tab 被收起时的落点；动态注册的测试与生命周期。

### B. 纯客户端 localStorage + 模式 store（M0 原型）

- 同步、零 host 改动；适合先验证“三档是否真的有用”。
- 问题：换设备丢；设置页不持久；不是最终态。可作为 M0 原型，**不作为用户承诺的持久方案**。

### C. CSS 隐藏（不选）

- 元素还在 DOM/命令/深链/无障碍树里；“隐藏”不是“不在场”；命令仍可触发不可见面；测试会假绿。

### D. 拆成三套 profile / preset（不选）

- 同一内部逻辑要维护三套组合；用户不能“随时切”；还会把“界面密度”和“agent 行为/preset”混成一件事。用户明确说内部逻辑一样。

### E. 自动自适应（以后再说）

- 根据使用次数/会话复杂度自动建议或切换。作为**建议**可以，作为默认真相会让人意外；需要先有显式模式和可回退开关。

## 5. 建议的三档矩阵（草案）

| 面 | 简洁 | 标准 | 专家 |
|---|---|---|---|
| 对话/输入 | ✓ | ✓ | ✓ |
| 审批/授权/错误/风险 | ✓ | ✓ | ✓（永不隐藏） |
| 首开条/桌面 | 单卡+输入 | 完整桌面 | 完整 + 原始细节 |
| 经营账本细节 | 摘要 | 完整 | 完整 + 下载/投影 |
| 记忆/知识/技能房间 | 隐藏（留“更多”入口） | ✓ | ✓ |
| Viki(调试) | — | — | ✓ |
| 诊断/任务/日志 | — | — | ✓ |
| 回执/对比/转正 | — | 只读回执 | ✓ |
| 命令面板 | 最少 | 常用 | 全部 |
| 设置/切换入口 | ✓ | ✓ | ✓ |
| 主动建议 | 高价值少量 | 标准 | 全部 |

**简单模式的底线：** 不隐藏审批、错误、风险、发送/停止、设置/切换入口；不让用户“进了简洁模式就出不来”。**Viki(调试) 只在专家面**（用户 2026-10-21 明确）。

## 6. 落地前必须验证的机制

1. 运行时 dispose 一个已打开的 sidebar tab 会发生什么：tab 关闭、还是变成死 body？用 M0 原型实测；若会留下空壳，先关 tab 再 dispose，或退到“tab 常驻、body 条件渲染”。
2. `settings.section` 的贡献形状与 settings 写入路径：组件 owner props、`settings.describe`/`mutate`、revision；一个只读控件 + 写入是否足够。
3. 首屏：settings 异步返回前，用 localStorage 缓存；缓存非法/缺失时回默认；默认档在首次运行不能让人误以为“功能没了”。
4. 模式切换时正在进行的会话/审批/运行中的 turn 不受影响；客户端 state 不丢；tab 落点可见。
5. 现有 web-face 场景（3 个）和 Viki 的 live probe 怎么覆盖三档；至少 mode store/动态注册的单测 + 每个模式一张场景或 blocked 读法。

## 7. 未决的用户选择

1. 档名与默认：`简洁/标准/专家`；新用户默认简洁、老用户默认标准、dev 默认专家？还是首次启动让用户选？
2. 简洁是否隐藏三个房间 tab，还是只隐藏 Viki/诊断等“重度件”？
3. 偏好持久在 settings（跨设备/home）还是先 localStorage（本浏览器）？建议前者做目标、后者做 M0。
4. 切换要求“不刷新”还是 M1 允许刷新兜底？建议目标不刷新，M1 可回退刷新。
5. 模式是全局（按用户/profile）还是会话级覆盖？建议全局，会话级以后再说。
6. 要不要“用久了自动建议升级到标准/专家”？建议只建议、不自动切。

## 8. 证据与边界

- 侧栏 tab 动态增删：`vendor/dsh/packages/client/ui-sidebar-right/src/client/tab-registry.ts`（register 返回幂等 disposer）。
- slot 生命周期：`vendor/dsh/packages/client/ui-slots/src/index.ts`（注册返回 disposer）。
- 设置面：`vendor/dsh/packages/client/ui-settings/src/client/contract/slots.ts`（`settings.section`、`settings.general.item`）；`settings-mirror.ts`（`remote.settings.describe`）。
- 现有静态注册：`packages/dsh-smart-assistant/src/client/index.ts` 的 roomTabs 循环；`src/client/rooms/room-tabs.ts`。
- 现有持久化：`src/client/local-state.ts`（per-tab，非持久偏好）。
- **不是权限边界**：模式只改客户端呈现；host route、数据、模型工具、审批/审计不变；Viki 的只读 API 仍然在，不能拿“简洁模式”当安全控制。
- **不是 agent preset**：`profile-patch-expert` 是领域装配，不是界面密度；两者不混。
