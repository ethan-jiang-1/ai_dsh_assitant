---
status: 已结
opened: 2026-10-18
---

# 收口卡：桌面侧受理新事项（261018-desk-side-capture 五片推进台账）

> 立卡：2026-10-18 ｜ 状态：已结 ｜ 类型：Feature ｜ 可关闭：是 ｜ 结论：**五片全部落地（验收全绿）**——proposed 卡已毕业为 [implemented](../../../notes/implemented/2026-10-18-desk-side-capture.md)（正文改写为已交付事实）；收尾 `pnpm test` 721/721 + `pnpm verify` 42 绿；片 3 的 e2e 续段回滚发现（llm-replay 跨 turn 续段不支持）记入台账与 implemented 卡输掉的方案

**问题与期望结果：** 落地 [proposed 卡](../../../notes/implemented/2026-10-18-desk-side-capture.md) 的五片——桌面侧受理新事项的入口与状态显性化。期望：本人看着桌面想起一件事时，在桌面上就能收下它，且四态（未投递／在途／轮到我／待归户）各有其形、状态取自原生而非页面自存。

**当前情况：** 4 项判定已由本人逐条拍板并归档（[结项卡](../_archive/settled_issues/261018-desk-side-capture.md)）；片 0 的「弃置＝留档带一行原因」（与事项 `abandon` 同构）由本人 2026-10-18 照 agent 建议拍定。

**未决问题：** 见 proposed 卡各片；片 4 顺带要核"DSH 右侧栏能否就地承载会话"（若能，`＋` 可改成不夺主区）。

**下一步：** 按片推进，每片先答"怎么算对"（造红→实现→变绿）；片间证据记在本卡台账。

## 验收标准

承接 [proposed 卡](../../../notes/implemented/2026-10-18-desk-side-capture.md) 的「验收」节（每片：命令 / 断言对象 / 红的形态），不在此复述以免两处维护；本卡只记**逐片真证据**与停点。

## 台账

| 片 | 状态 | 真证据 |
|---|---|---|
| 0 未成出口（弃置终态） | 落地（**余真模型端到端走查**） | 域 4 案（`tests/domain/operating-projection.spec.ts`：离开通道 + 理由留史 + 原话仍在／未知片段与空理由拒绝／重复弃置拒绝／投影不再列出且回执可读）；服务 1 案（`tests/host/operating-ledger.spec.ts`：空理由在账本边界拒绝、决定留史、原 `note` 回执仍在）；工具边界 1 案（`tests/agent/tool-operating.spec.ts`：缺 reason 抛错、desk 栏清空）；客户端 8 案判据（`tests/client/client-desk-process.spec.ts`：他人 claim 不能结算本路径、无事项可选中、共享闸门）+ 1 案按钮（`tests/client/projection-panel.spec.ts`：「是噪音，不归户」回传 id）；真机 DOM 两出口并列（`.tmp/shots/s0-fragment-actions-clean-1500x1000.{png,dom.txt}`，`button h=32: 是噪音，不归户`）。全量：`pnpm test` 666 全绿、`pnpm verify` 42 条、`pnpm eval -- --only desk-evidence-recommendation` PASS。**未做**：真模型端到端（点弃置 → 会话 → 模型真调 discard → 栏消失 → 回桌面）——判据层与 DOM 层已证，端到端待补（形态照 `desk-process-e2e.mjs --scenario claim` 的 replay 场景） |
| 1 受理位与状态显性化 | **落地**（1a+1b） | **1a**：受理位（桌面头部下常驻一行，Enter/按钮提交，提交即清草稿）+ 投递（复用 intake 的会话选择判据但**不 openSession**，走 `[桌面] ` 独立来源标记的 queue 通道）+ 在途条（客户端投递回执驱动，随投影 revision 越过即消失；虚线形态不复用事项卡）+ 两门重量文案。**1b**：三态接**原生 `SessionStatus`**——纯核 `captureWait`（`pendingInteraction` 优先于 `running`，再 `completionUnread`，都不知则 idle；不自己记"轮到我"故刷新不丢）；入口把平台每会话状态镜像成快照 store 当钩子传入（`pendingInteraction` 的 `unknown` 形状在边界显式重收窄一次）；面板按状态显形「轮到我／等助手／它说完了／已交给助手」，轮到我或说完了时给「去会话」指针。证据：`tests/client/client-desk-arms.spec.ts` 3 案、`tests/client/projection-panel.spec.ts` 5 案（两门文案、提交回传并清草稿、在途条随 revision 止、四态标签与指针 + "还没进账"恒定断言）、`tests/client/client-desk-process.spec.ts` 3 案（等谁优先级）、`tests/client/projection-view.spec.ts` 2 案；`pnpm test` 677 全绿；真机：受理位在场（`.tmp/shots/s1a-capture-row-*.png`）且新钩子接线后桌面不崩（`.tmp/shots/s1b-status-hook-*`，`capture-row-present`）。**未做**：真模型端到端（真跑一轮看四态切换）——同片 0，形态照 replay 场景 |
| 2 助手侧默认与「要问就正经问」 | **落地** | 指令段落进 `operating-brief`（英文，desk capture lane：`[桌面] ` 标记＝轻门，默认 `note` 逐字落账＋同回合 ack，立项选择走 question 交互、**绝不自行 `entrust`**，重门（对话里明说的交代）路径保留）；合同测试 4 案（标记与逐字 note＋来源、同回合 ack、question 路由＋never-entrust、重门保留——删任一要素即红）；eval 新任务 `desk-capture-note` PASS（`pnpm eval` **9/9 全绿**无回归；note-vs-entrust 负例与 quote 读回由 live 探针判——checks.mjs 无 not-used 判据，记为口径）。**真车道判决**（`node dev/probes/web/desk-capture-live.mjs`，真模型全相位 PASS）：受理位投含糊话（"北边的仓库月底到期，租金可能涨"）→ `assistant_operating` note 逐字落账（unclaimed +1、**matters 2→2 未立项**）＋零 `entrust`＋ack 与立项选择折叠进 `ask_user_question`（"这条我先按原话记下了……要不要正式立成事项？"三选项）——桌面回读见新待认领片段在栏。**探针判据注**：以 ask 挂起的 turn 不写 turn/end（等本人答复），settled 判据＝turn/end 或 ask 族 tool call 的计数差分 |
| 3 intake 返回语义修订 | **落地（判据显性化 + 真车道证据；e2e 续段尝试后回滚，见内）** | 代码复核结论：`judgeIntakeReturn` 的创建信号本就只认 `committed`（1a/1b 的设计已按新形态实现）——片 3 的工作是把它**显性化为契约**：纯核新案「bound 会话收到 `[桌面]` 投递、模型 note（retained 回执）不充当创建信号」（55/55；既有负例——只追问不落账 / pendingInteraction 挂起 / 既有事项 update——全数在场）。**prove-it-red**：反转判据（retained 计入创建）→ 恰好新案独红（1/55），还原复绿。**真车道行为证据** = `desk-capture-live.mjs`（真实车道全相位 PASS：就地受理**不切主区**、在途条接管、结果落账 unclaimed+1/matters 不变、question 挂起）。**e2e 续段尝试与回滚（诚实记录）**：向 followup 夹具追加真实 capture turn（turn/start 回溯＋session id 改写＋turn 号顺延，格式校验通过）后，回放位在跨 turn 扩展时漂移（运行消费 12 位 vs 记录 11——拒绝相位被喂错位响应、turn 越过记录终点跑进 ask），已回滚夹具与相位；**发现**＝llm-replay 的按文件序位置绑定不支持跨 turn 追加续段，确定性 capture 相位需要回放基建升级（记上游候选族）。验收行 3 的意图（新形态断言在场、不沿用回桌面旧语义）由真车道探针＋纯核契约承载 |
| 4 验收资产 | **落地** | ①走查：`desk-capture-live.mjs` 加两帧走查产物（`.tmp/shots/desk-capture-inflight.png` 在途条在场、`desk-capture-takeover.png` 结果接管）并真实车道重跑全 PASS——桌面就地交代→停在桌面看到在途→看到结果落账（待认领在栏），**不需要切走**（验收红形态不触发）；人判话术与层级留本人。②web-face 基线：`blank-first-open` 已由 proactive-face 片 1 同 diff 重录（受理行＋主动行收进）并复验 PASS。③observe 仪器对齐（缺口记录）：B/C 口径以文本标记分类（`[面板] `＝机器、无标记＝本人）——capture 车道的话带 `[桌面] ` 标记，**本人亲打的话被排除出劳动口径**；替代读数＝把 `[桌面] ` 计为本人（话是本人逐字）；口径修订记观察仪器候选，本片不改仪器。④右侧栏核查（片 2 顺带问题的答案）：**能承载**——右侧栏是 per-Session 停靠面（`rightbar.session`），且有现成 `subagentchat` tab 型经共享 Conversation Factory 在栏内渲染会话（`dsh-resource://subagentchat/...`）→「＋」改造成不夺主区有现成挂点，记候选改造不在本片实施 |

## 关闭条件

- 五片验收全绿（proposed 卡的验收表逐行有真证据）→ 头部改 `可关闭：是`，与 proposed 卡毕业（正文改写为已交付事实）同一次改动归档。
- 或本人叫停：状态行记结论与去向，按入口流程归档。
