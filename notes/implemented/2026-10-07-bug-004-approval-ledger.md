# BUG-004 修复：审批台账统一——从「门只在 prose」到「翻转永不隐形」

日期：2026-10-07 · 状态：**implemented**

> 承接 [BUG-004 卡](../../_backlog/_done/_fixed_bugs/BUG-004-approval-trust-root.md)（对抗性语义扫描 F1 高 + F2/F3/F6 中）；证据底稿 =
> [语义扫描报告](../../_backlog/_done/_reference/tech-exploration/261007-semantic-sweep-src.md)。方法 = test-first 证据环（用户拍板）：先造红（3 件新 spec 钉「无审计写入」的现状）再修复。

## 决定

**审批台账统一**（`434e912`）：promote/deprecate/land 三个治理过渡经共享 `recordApproval`
（`src/host/approval-audit.ts`）落 `<dataDir>/audit/approvals.jsonl`，每行 `{at, kind, id, title?, sessionId?, source}`——
模型回合 `source=assistant_reflect`（sessionId 从工具执行器的 `exec.agent.session.id` 取）、面板直调
`source=panel-direct`。**此前模型路径零持久审计**（审计只在会话日志里）、**面板 lane 的台账文件永远空**
（写它的直调通道上游阻断从未跑通）——现在两 lane 同一本账，任何翻转都有可读、可对账的持久记录。

附带修复：`promotePage` 的假断言 docstring 改诚实版（`writePage` 不自促只挡一条路，调用者决定——F1 的
病灶正是那句「Nothing reaches this on the session's own judgement」）；remote 头 docstring 对齐 JSONL 实现、
清两个死错误码（`session-not-live`/`audit-not-durable`——被否决的会话日志方案残渣）、inject 收窄
（`sessionPersistence`/`sessions` 从未使用）；desk-io 直调成功分支补即时回执（诚实标注「下次桌面刷新移出
待审」——面板直读房间状态是 261004 卡未决②，不冒充）+ already-stable 错误不再误导回退；工具 description
精确化（批准是 principal 的行为，promote/deprecate/land 有台账）。

**边界（诚实）**：台账是**检测不是预防**——伪造 `[桌面]` 前缀提示词仍能让模型执行翻转（任何会话文本与面板
消息在机制上不可区分）；预防需要直调缝（strict codec / workspaceFiles 只读，261004 三层实锤上游阻断），
触发条件不变。F1 的「同会话自促」与 F3 的「模型代改 status」经台账后从不可见变为可对账（台账行 × 会话日志
交叉），完整预防留上游缝。

**交付收口**——外部结果：触发 = 巡检立卡（用户批准按序修）；用户看到 = 每次知识页/技能的治理动作在
`audit/approvals.jsonl` 有一行可读记录（谁在哪个 lane、哪个会话、何时）；完成条件 = 台账 spec 全绿 + 全链门绿。
**签收** = 新 spec 3 件先红后绿（prove-it-red）+ typecheck 0 + test 50spec 401tests + composition 6 + verify 35 +
`pnpm eval -- --only scope-honesty` PASS（description 为模型可见面，路由走全）。**未跑项**：web-expected 两场景
（改动面为直调分支交互回执，非两场景的首开静态面；blank 场景夹具腐烂为已知阻断项）；eval 全量（BUG-003 在修）。

## 输掉的方案

1. **动词面收窄**（promote/deprecate 移出模型可见工具面）——输给 README「draft→stable 双合法路径」承诺（对话内
   批准后助手执行翻转是设计内路径）与 261004「批准本体是机械操作」判断；面板 lane 死，移除后唯一通道是人手改
   文件，产品审批 UX 倒退为两步。
2. **机械门 approved-status**（promote 前置人手改 `status: approved`，镜像 skills lane 的 land 门）——输给面板无
   写通道（workspaceFiles 只读、直调 mount 失败，261004 实锤）：人点批准后还要手改文件才能让助手执行，「一秒
   完事」变成两步手改；且 skills lane 自己的 F3（模型按 prompt 代改 status）证明这把钥匙同样会被模型代写。
3. **provenance 拒绝同会话起草页**——输给「同会话起草→批准→发布」是设计内主流程（面板点击/对话说发布都发生在
   起草会话里）；拒绝会封死合法路径。
4. **会话日志审计**（SessionEventMap 扩 `knowledge/approve` 事件）——上游已否决（`session.append` 无法带
   `ignorable`，未知事件毒化日志读回，261004 实锤），维持独立 JSONL。

## 范围与后果

现在为真：三个治理过渡都有台账行（幂等 no-op 不记——spec 钉住）；`ApprovalAuditOptions` 是
`promotePage/deprecatePage/landSkill` 的第三参（服务方法透传）；remote 只做校验+委托（审计在 promotePage 内，
两 lane 必然同账）。上游缝移动时（261004 触发）：预防性门（approved 状态由直调通道写）与面板直读（未决②）
一并重开推敲；重提前先读该卡。
