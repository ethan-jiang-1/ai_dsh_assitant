---
status: 已结
opened: 2026-10-21
---

# 推敲：助手界面三档呈现（简洁/标准/专家）与随时切换

> 立卡：2026-10-21 ｜ 结案：2026-10-23 ｜ 类型：Feature ｜ 结果：M1 + M2 已交付

## 结案记录（2026-10-23）

用户拍板 6 项默认（简洁/标准/专家；默认标准；简洁隐藏四个房间入口；`assistant-memory.uiMode` + localStorage 缓存；不刷新切换；全局 per home/profile；不自动升级），随后要求“全都做完”，批准 M1、持久化与 M2。

- **M0（真机，一次性探针）**：开 Viki tab → standard/simple/expert；tab 与正文（11 条记忆）存活，证明 guide 重注册不空壳。判定：走 guide-gating，不关 tab。
- **M1（已交付）**：mode store + `mount-rooms`（body/title 一次，tab type 按 mode 重注册）；`settings.general.item` 三档行（置顶）；三条命令 `mode-simple`/`mode-standard`/`mode-expert`；标准隐藏 Viki guide；默认标准。
- **持久化（已交付）**：stock bundle 的 `assistant-memory` 行嵌在 bundle 内，`settings.describe` 不列出（实测无此项），`configForms` 不可达。改为 `assistant-ui-mode` host 行：`GET/POST api/assistant/ui-mode` 读写 `assistant/ui-mode.json`；客户端 localStorage 首屏、route adopt/写回；per-home 持久，同 home 跨浏览器。不写 settings 文档，Host `Config.uiMode` 已撤（避免死配置）。
- **M2（已交付）**：简洁档桌面 = 捕获输入 + 单卡（待答问题 → 在办/首件 → 未归户片段）+「显示更多 · 切到标准」；隐藏流水 tab/proactive/建议/列表/筛选；命令面在简洁档只留 `mode-*`，room/desk 命令按 `available` 过滤；审批、错误、发送/停止不隐藏。回执在输入行保留；诊断/转正属房间面，随 guide 隐藏。
- **决定记录**：[implemented note](../../../notes/implemented/2026-10-23-ui-modes-and-panel-surface.md)。

---

**给评审者的最短路径：** 「问题与期望结果」→「已知」→「方案与取舍」→「需要用户拍板」→「验收标准」→「下一步」。

## 问题与期望结果

现在的助手界面主要是一套固定的呈现：桌面、首开条、右侧栏房间（知识/记忆/Viki/技能）、Viki(调试)、诊断、回执、命令等，对所有用户同时在场。Viki(调试) 被标成研发/高级用户的调试面之后，暴露出更大的问题：**同一个助手，对第一次用的人、日常用的人、研发/高级用户，应该呈现不同密度；而且用户应该能随时切换，而不是换一套产品。**

用户原话（2026-10-21）：

> “其实这个 Assistant 的界面应该是可以配置的——比如我们分为 3 类用户：简洁界面、中度……重度。如果界面元素可以随时动态变化就最理想了……对小白用户，开始应该简洁……使用熟练后多呈现，研发/高级可能需要更多呈现……内部逻辑一模一样，就是呈现面多样和灵活，而且用户可以随时切换。”

**期望结果：**

- 三档呈现：**简洁 / 标准 / 专家**；默认档、每档显示什么、怎样从简洁“长出来”到标准/专家。
- **随时切换**：不刷新、不换会话、不丢当前工作；切回简洁不会把审批/错误/进行中的 turn 丢掉。
- **同一套内部逻辑**：host 数据、房间读写、工具、记忆层、审批/审计都不变；只改客户端呈现面。
- **Viki(调试) 作为专家面**：简洁/标准不出现；专家出现；不把“隐藏”当权限控制。
- **渐进**：新用户先简洁；用熟了可以多给；研发/高级可以全给；不自动替用户做不可见的切换。

**完成条件（本卡）：** 研究结论、方案取舍、三档矩阵、需要用户拍板的点、未来切片与 Viki 触发条件写清；用户对关键选择给出方向；本卡不实施。

## 已知

### 现状

- 右侧栏房间 tab 在 [`src/client/index.ts`](../../../packages/dsh-smart-assistant/src/client/index.ts) 的 `apply` 里**静态注册**：`roomTabs`（[`room-tabs.ts`](../../../packages/dsh-smart-assistant/src/client/rooms/room-tabs.ts)）+ `sidebarRightTabs.register` + `sidebar.right.pane.tab` / `.title` slot。当前没有保存每个 room 的 disposer。
- 首开条/桌面/输入 dock/审批/回执/命令是各自 slot 里的组件；`src/client/local-state.ts` 明确是 **per-tab** 便利状态，不是跨会话偏好。
- 平台支持**运行时增删**：`sidebarRightTabs.register` 返回幂等 disposer（[`tab-registry.ts`](../../../vendor/dsh/packages/client/ui-sidebar-right/src/client/tab-registry.ts)）；slot 注册也返回 disposer。因此“随时切”技术上可行，代价是当前打开的 tab 可能被收起。
- 设置面有 `settings.section` / `settings.general.item`（[`ui-settings` 的 slots](../../../vendor/dsh/packages/client/ui-settings/src/client/contract/slots.ts)）和 `settings.describe` 镜像；可以把模式做成设置页的一项，并持久到 DSH settings 文档（profile/home 级）。
- Viki(调试) 是现有房间 tab 的一个实例；它的搜索/诊断是只读 host route，不依赖模式。

### 研究结论

详见 [机制调研](../../research/261021-assistant-ui-modes/261021-assistant-ui-modes.md)。关键结论：

1. **可行**：侧栏 tab 与 slot 都有 disposer，动态注册/回收是平台能力；但需要把静态 `roomTabs` 循环改成 `mountRooms(mode)`，并处理已打开 tab 的收起落点。
2. **偏好应有持久家**：`local-state` 是 per-tab，不能当唯一真相；目标态用 DSH settings（profile/home），客户端 `localStorage` 只做启动缓存，避免首屏闪默认档。
3. **不需要动 host/模型**：模式只影响客户端渲染与注册；房间数据、工具、审批、记忆层不变。
4. **Viki(调试) 只是专家面的一个门**，不是这个功能的全部；先把它作为第一个可验证的“按模式出现/消失”的 tab。

## 方案与取舍

| 方案 | 取舍 |
|---|---|
| **A. Host settings + client mode store + 动态注册（推荐）** | 持久、可跨会话/换设备（同 home）；设置页 + 命令切换；需要处理 settings 异步首屏、tab 收起落点、动态注册生命周期。 |
| B. 纯客户端 `localStorage` + store（M0 原型） | 最小、同步、无 host；但换设备丢、设置页不持久；只适合先验证“三档是否有用”，不作为最终承诺。 |
| C. 只用 CSS 隐藏 | 不选：DOM/命令/深链/无障碍仍在，“隐藏”不是“不在场”。 |
| D. 拆成三套 profile / preset | 不选：内部逻辑一样却要维护三套组合；且会把“界面密度”与“agent 行为/preset”混为一谈。 |
| E. 自动自适应 | 以后再说：可以做“建议升级”，不做默认自动切换；先有显式模式和可回退开关。 |

**推荐路径：** 目标态 A；M0 用 B 做一次原型验证（模式 store + Viki tab 动态显隐 + 设置/命令入口），验证后再把偏好迁到 settings。这样不先造一个错误的持久化面。

### 建议的三档矩阵（草案）

| 面 | 简洁 | 标准 | 专家 |
|---|---|---|---|
| 对话/输入/停止 | ✓ | ✓ | ✓ |
| 审批/授权/错误/风险 | ✓ | ✓ | ✓（永不隐藏） |
| 首开条/桌面 | 单卡 + 输入 | 完整桌面 | 完整 + 原始细节 |
| 经营账本/投影 | 摘要 | 完整 | 完整 + 下载/投影 |
| 记忆/知识/技能房间 | 隐藏（留“更多”入口） | ✓ | ✓ |
| **Viki(调试)** | — | — | ✓ |
| 诊断/任务/日志 | — | — | ✓ |
| 回执/对比/转正 | — | 只读回执 | ✓ |
| 命令面板 | 最少 | 常用 | 全部 |
| 设置/切换入口 | ✓ | ✓ | ✓ |
| 主动建议 | 高价值少量 | 标准 | 全部 |

**底线：** 简洁模式不隐藏审批、错误、风险、发送/停止、设置/切换入口；用户永远能“出来”。**Viki(调试) 只在专家面。**

## 需要用户拍板（不阻塞 Viki 落地）

1. **档名与默认**：`简洁 / 标准 / 专家`；新用户默认简洁、老用户默认标准、dev 默认专家？还是首次启动让用户选？建议：新用户简洁，已有用户保持现状（标准），dev 可用专家；不强制。
2. **简洁隐藏哪些房间**：三个房间 tab 全隐藏，还是只隐藏 Viki/诊断等“重度件”？建议：简洁只留桌面/对话/审批 + “更多”；标准恢复三个房间；专家再加 Viki/诊断/回执。
3. **偏好持久化**：目标 settings（同 home/换设备）还是先 localStorage（本浏览器）？建议：settings 目标，localStorage 缓存；M0 可只 localStorage。
4. **切换是否必须不刷新**：目标是；M1 如遇 tab 收起问题可回退“刷新后生效”，但不能静默丢当前工作。
5. **模式粒度**：全局按用户/profile，还是会话级覆盖？建议全局；会话级以后再说。
6. **渐进方式**：只给“升级建议”，还是用久了自动切？建议只建议、不自动；每次切换必须可见、可回退。

## 验收标准

### 本卡（研究/裁决）

| 行为 | 类 | 通过信号 | 证据 owner | 人判 |
|---|---|---|---|---|
| 机制可行 | 编排 | `sidebarRightTabs.register`/slot disposer 已有源码证据；M0 原型能运行时收起 Viki tab | 机制调研 + M0 原型（未来） | 无 |
| 三档矩阵明确 | 产品 | 每个面在简洁/标准/专家的显隐有表；审批/错误永不隐藏；Viki 仅专家 | 本卡矩阵 | 用户确认 |
| 持久化/切换取舍 | 产品/编排 | settings vs localState 的理由、首屏缓存、tab 收起落点写清 | 本卡 | 用户拍板 |
| Viki 触发 | 流程 | 本卡不启动实现；Viki S5/S6 收口后再开 proposed/子卡 | [Viki 收口](261021-openviking-viki-closure.md) | 用户 |

### 未来实现（另立 proposed 卡，不在本卡执行）

- 三档可切换；**不刷新**（或明确回退）；当前工作/审批/运行中 turn 不丢。
- Viki(调试) 只在专家出现；简洁/标准不可见；Viki host route 不变。
- 审批/错误/风险/设置/切换入口永不隐藏；模式不是权限边界。
- 偏好持久（settings 或明确的 localStorage 范围）；启动缓存不闪；非法值回默认。
- 不改变 host 数据/工具/模型可见面；现有 web-face 场景不漂移；三档各有客户端测试；至少一个模式场景或 blocked 读法。
- 证据 owner：`tests/client`（store/注册/条件渲染）、`snapshots/web-face`（三档或 blocked）、`pnpm web-expected`、`pnpm verify`、真机 `pnpm shots` 三档。
- 人判：三档是否真的“简洁/标准/专家”，Viki/诊断的出现时机，默认档的体验。

## 未来切片（Viki 收口后）

- **M0 原型（不进发布物）**：客户端 `UiModeStore` + Viki tab 运行时显隐 + 一个命令/设置入口；验证 tab 收起、slot 生命周期、首屏缓存。产出：可行性结论 + 需要改的缝。
- **M1 三档最小面**：简洁/标准/专家的房间 tab + Viki + 首开条/桌面摘要；偏好持久；切换不刷新（或回退）；测试。
- **M2 密度与渐进**：命令/回执/诊断/投影的每档细化；“用久了建议升级”；三档场景/真机截图；a11y。
- 这三步在 M0 结论后再拆子卡；不在本卡直接实施。

## 下一步

- **现在（本卡）**：研究/方案已写；请用户对上面 6 个点给方向（可以现在答，也可以等 Viki 收口后答）。
- **不启动实现**：Viki 落地（[收口卡](261021-openviking-viki-closure.md) S5/S6）优先；本卡 `毕业：以后做`。
- **触发**：Viki 收口 + 用户点头后，开 proposed 卡/M0 原型；M0 结论回来再拆 M1/M2。
- **若用户不感兴趣**：本卡记录“不做”的理由，归档；不预建子卡。

## 范围与邻居

| 本卡拥有 | 只检查/引用 | 不拥有 |
|---|---|---|
| 三档呈现的**产品模型**、矩阵、切换/持久化取舍、未来切片 | 现有 client slot/tab/settings 机制；Viki(调试) 作为专家面实例 | Viki 落地本身（[收口卡](261021-openviking-viki-closure.md)）；agent preset/领域装配（[方向卡](261020-openviking-direction-review.md)）；权限/审批语义 |

**明确不是：** 不是权限边界（隐藏 ≠ 禁止；host route/工具/审批不变）；不是 agent preset（不改模型行为）；不是换三套产品；不是 Viki 的一部分。

## 关闭条件

- 用户对 6 个关键点给出方向（或明确“以后再说”）；本卡可把结论写成“以后做”并归档，未来实现另立 proposed 卡。
- 或用户明确“不做”；记录理由并归档。
- 在 Viki 收口前，本卡保持活跃但不实施；不阻塞 Viki 的任何验收。

## 关联

- [机制调研（平台缝/矩阵/证据）](../../research/261021-assistant-ui-modes/261021-assistant-ui-modes.md)
- [Viki 收口卡](261021-openviking-viki-closure.md)
- [Viki(调试) 的定位与检索卡](261020-openviking-retrieval-viki.md)
