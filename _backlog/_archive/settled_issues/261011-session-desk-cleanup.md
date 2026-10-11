---
status: 已结
opened: 2026-10-11
---

# 推敲：会话桌面子系统清理——退役后的组件、spec 与场景收尾

> 立卡：2026-10-11 ｜ 状态：已结（2026-10-11 关闭）｜ 结论：五条清单全部闭合——退役组件与 specs 已删、`client` 口径已收窄到「房间数据」、web-face 两场景复绿（真红原因是投影读回的 canceled 请求，见第 3 条）、家手册那节模型可见文案改对并 bump v15。两处**新发现**的残差（`[桌面]` 机器标记、walk view 旧内容仍被 dashboard/first-mile 消费）不在本卡范围，移交 [261011-post-retirement-residue](261011-post-retirement-residue.md)。

**问题与期望结果：** [唯一桌面 note](../../../notes/implemented/2026-10-11-one-operating-desk.md) 已把会话侧桌面的全部用户入口下架（房间 tab、视图 tab、chip、摘要条、命令、视图预写），但组件与其 spec 暂留未删（当轮只拆注册、避免赶工回归）。本卡收尾删除，让「旧概念已废」在代码里也成立，而不是只在一篇 note 里。

**清理清单：**

1. ~~删 `src/client/panels.ts` 的 `DeskPanel`/`DeskIcon`…~~ **已闭合（2026-10-11）**：`DeskPanel`/`DeskIcon` 连同只服务于它的 `rowIdOf`/`splitDeskDecisions`/`deskRowAnswered` 一起删除（`panels.ts` 644 → 235 行，只剩两个房间面板）；`client-panels.spec.ts` 的 23 个 DeskPanel 断言块删除（28 → 5 个测试，留下知识/记忆两面板）；`client-desk-core.spec.ts` **改挂仍存活的消费者**——staleness 断言从 `DeskPanel` 改到 `MemoryPanel`（`refreshRow` 是活着的读出口），R11 收据规则本就直测 store。
   ↳ 连带：[261010-desk-lead-rule](261010-desk-lead-rule.md)（2026-10-10 毕业）提出的两个具名规则 `splitDeskDecisions`/`deskRowAnswered` 随面板一起删除——它们的唯一消费者就是这块面板，退役即失效（历史卡保留当时的讨论，不改）。
2. ~~删 `room-tabs.ts` 的 `DeskTabBody`/`DeskViewBody`/`AssistantDeskChip`…~~ **已闭合（2026-10-11）**：三个面删除，`client-room-tabs.spec.ts` 重写为两间房的 tab 契约（6 → 3 个测试）；`client-desk-io.spec.ts` 保住 R11 切片机制、把断言改挂 `KnowledgeTabBody`；`desk-io` 里只被退役面板调用的五个动作（`finishAction`/`fillGap`/`dropAction`/`parkThread`/`closeThread`）+ `first-mile.ts` 的 `DeskSummaryDock` 一并删除。**口径收窄**（活着的面仍用旧词）：面板口播从「桌面面板代本人…」改「面板代本人…」；`refreshRow`/`staleWarning`/`expirePending`/房间 tab 的读写失败与空态文案改「房间数据」；`askRefresh` 的模型可见提示改「刷新房间数据：加载 desk-refresh 技能，严格按它把房间数据文件（.desk/state.json）重写一遍」。
3. ~~web-face 两场景重录~~ **已闭合（2026-10-11）：立论错了，重录的是另一件事。** 实测两场景都没有「会话视图条上的『桌面』tab 消失」这回事——banner 场景的 DOM 文本与控件与已提交期望逐字节一致（复跑 3/3 PASS，**无需重录**），blank 场景只有一处有意变化（唯一桌面切片新加的「＋ 交代新事项」按钮，已重录并过目 PNG）。两场景当时真红的是 `networkFailures` 里多出的一条 `net::ERR_ABORTED (canceled)`：投影读回（`GET /api/assistant/desk-projection`）在 404 分支弃读响应体（空账本的 home 就是 404），请求在浏览器网络账上永不结束，任何后续 refresh 的 abort 都把它变成一条 canceled 请求——而「networkFailures 必须空」是场景契约。修法（同片）：投影读取器不再 abort 被取代的读（正确性由 `current()` 持有；abort 还会在渲染进程繁忙时变成竞态），错误响应体用 `arrayBuffer()` 排空（手写 reader + `releaseLock()` 自身就报 `ERR_ABORTED`，2026-10-11 页面实测对照）。回归钉在 `tests/client/projection-reader.spec.ts` 与 `projection-lifecycle.spec.ts`。载体：[唯一桌面 note](../../../notes/implemented/2026-10-11-one-operating-desk.md)。
4. ~~`docs/home.md` §五与 architecture.md 客户端行核对~~ **已闭合（2026-10-11）**：`docs/home.md` §五改「房间数据文件（`.desk/state.json`）的最小契约」并把字段级契约指到 `desk-refresh` 技能；`architecture.md` §七链路改写为「房间数据刷新」（会话车道：房间 tab 刷新 → `sendPrompt` → 模型按技能重写房间数据文件 → 轮询越过 `pending.at`）、§八路由行改名「房间数据刷新（记忆/知识两间）」并把最小验证换成 `client-room-tabs.spec.ts`+`client-desk-io.spec.ts`；`docs/operating.md` §三「与三室面板的分工（两份桌面文件）」改「与记忆/知识两间的分工（两个数据面）」；`docs/identity.md` §三「三室 tab」改「记忆/知识两间的房间 tab」。模型可见的那一半（家手册 v14「The desk file…」）见第 5 条。
5. ~~模型可见面：家手册那节~~ **已闭合（2026-10-11）**：`renderHomeManual` 的 `### The desk file (.desk/state.json)`（v14，且写着「你主人的侧栏面板渲染这个文件」「shape 不对就渲染成空桌面」）与同轮改写的 `desk-refresh` 技能（业务事项绝不写进这个文件）互相矛盾，正是用户报的那个病；改为 `### Room data (.desk/state.json)`（记忆/知识两间的数据文件 + 业务事项指账本），bump `HOME_MANUAL_VERSION` 14→15，组合与 host 两处断言钉住。干净 home 上 `pnpm eval` 8/9（唯一红 = [BUG-008](../../bugs/BUG-008-schedule-tools-missing.md)，与本片无关且有基线对照）。

**仍开放的两处残差**（本轮判为不修）移交 [261011-post-retirement-residue](261011-post-retirement-residue.md)：`sendPrompt` 的 `[桌面] ` 机器标记；walk view 旧内容仍被 `dashboard.ts`/`first-mile.ts` 消费。

**红线（长期有效）：** 不得复活任何「桌面」命名的会话侧入口（出处 = 唯一桌面 note 的约束节）。
