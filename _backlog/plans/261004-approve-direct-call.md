# 推敲：批准流直调架构——审批「一秒完事」要不要绕过模型回合

> 立卡：2026-10-04 ｜ 状态：推敲中｜毕业门判断 = 待触发（触发条件见 §触发）｜下一步 = 无（材料已备齐，触发前不动手）

## 背景 / 触发

首开 UX 第 13 轮摩擦 1（naive-CEO 读数）：「批准≠即时生效——审批变消息跑 AI 一轮 >1min，
中途还要求手动刷新桌面——老板批东西应一秒完事」。第 14 轮取证定案：警告机制零故障（34 拍
零误报零滞留），差距纯粹在**批准的执行架构**——现行 = 面板发指令 → 模型跑一轮（promote +
desk-refresh，60-90s）；候选 = 面板直调服务（`promotePage` 翻转 draft→stable + 触发桌面重读），
绕过模型回合。

**为什么不该现在做**（2026-10-04 裁定，用户拍板立卡排程）：批准频次极低（真用刚开始），
收益 = 每次 60-90s × 频次，当前趋近于零；直调改**审计语义**——现行批准走会话回合，日志完整
（谁、何时、批了什么、模型执行过程），直调后审计面移到服务层 + 面板事件，等价性要重新设计。

## 已知与未决

- 已核实：审批本体是机械操作（draft→stable 翻转），不需要模型智能；人审语义不变（点批准的
  就是人）。第 9/12 轮已验证 promote 流程的盘上翻转。
- 未决：①直调的审计等价物（面板事件 vs 会话日志，`feedback/message-put` 形状可否复用）；
  ②批准后的桌面重读由谁触发（直调后没有模型回合跑 desk-refresh——桌面刷新要另走面板直读
  或轻指令）；③多页批量批准的交互形态。

## 候选与取舍

- **面板直调服务**：快、省 token、消除「批准变消息」怪异感；代价 = 审计面重设计 + 新写面板-
  服务通道（现在 client 写操作全走会话回合，治理上「写入自研房间走人审路径」的形状要重述）。
- **维持模型回合**：审计免费（会话日志全量）、零新机制；代价 = 每次 60-90s + 一段奇怪的
  「批准变成了对话消息」体验。
- **折中（未展开）**：直调翻转 + 同步发一条系统消息进会话（审计留痕），桌面重读面板直读。

## 技术侦察（2026-10-04 深化：设计已到实施级）

- **审计可保留**：SessionEventMap 支持插件模块扩充（`tool-todo` 的 `'todo/write'` 先例，
  `declare module '@deepseek-ai/dsh-session/types'`）——我方定义 `knowledge/approve` 事件写入会话流，
  审计天然留在会话日志（第 12 轮"审计语义重设计"的顾虑化解）。
- **直调缝位存在**：vendor remote 体系 = 插件贡献 `/remote` 子路径模块聚合进 client remote 面
  （`@deepseek-ai/dsh-api-session-controller/remote` 先例）；我方 client 已消费 `remote.*` 注入。
- **剩余单点**：api/remotes 聚合文件是否可插件扩展（bundle patch 替换聚合 vs 上游提案）——
  实施前唯一待验项。
- 服务侧就绪：`promotePage` 是纯机械翻转（hand flip 即审批，src/index.ts:875）。

## 切片 1 实施账（2026-10-04，静默自主）

- **已落地**：host 伴生服务 `knowledge-approve-remote`（TypertRemoteService 子类，namespace
  `assistantKnowledge`，`@Remote approvePage` = promotePage + 独立审计文件
  `<dataDir>/audit/approvals.jsonl`）；patch 行 `assistant-knowledge-approve`（dump-config 在场）；
  exports 子路径；client 批准按钮直调接线（带 legacy prompt 降级路径）；组合测试挂载伴生行；
  export-shape 守卫重构为形态自洽（service default OR clean function）；vitest 子路径导出
  别名修复（`lib/types/<name>.js` ↔ `src/<name>.ts`）。
- **审计设计修订**：会话事件方案**否决**——运行时 `session.append` 无法携带 `ignorable` 标记
  （envelope 硬编码），未知必需事件会毒化会话日志读回；identity.md 第 5 行 day-0 决定保持完好。
  审计落独立 JSONL（gateway remote journal 双证）。
- **未决（诚实）**：client 直调**未生效**——live 验证中 `remote.assistantKnowledge` 未挂载成功
  （fallback 正常工作、零回归）；classic-script 插件能否 `$mount` 自有 remote 贡献 = vendor
  深水区未知数（voice-input 先例有 vendor 构建链支撑），需上游提案或 vendor 确认注入形状。
- 触发条件以本节为准：未知数解决（上游/确认）+ 本人拍板 → 实施 client 侧。

## 触发（毕业门）

**触发 = 本人拍板开工**（2026-10-04 修订：原"频次 ≥5/月 + 摩擦再现"废止——单次批准 90s 的
痛感不随频次摊薄，低频高痛每次都是坏体验；且设计已到实施级，频次门槛失去意义）。
实施形状 = 折中方案：面板直调 `promotePage` + `knowledge/approve` 事件进会话留痕 + 面板直读
刷新桌面（`reloadDesk` 已在）。
