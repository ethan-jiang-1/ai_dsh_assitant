# 提案：培养面按会话分 store（per-session desk store）

日期：2026-09-29 · 状态：**proposed**（毕业自 plans 卡 [260928-per-session-desk-store](../../_backlog/_done/_closed_plans/260928-per-session-desk-store.md)；用户 2026-09-29 拍板升级：多会话并行已是真实使用场景）

## 问题（可观察行为）

培养面（客户端）的主页与 tab 共用一个 desk store，`sendSession` 是全局单值
（[整改卡 S3 的 A3 记录](../implemented/2026-09-26-cultivation-remediation.md)）。2026-09-27 的
窄范围复审拿到真实咬人证据：store 被所有绑定 tab 共享、行匹配只按裸 rowId——A 会话说一句，
会给 B 会话里同 id 的行盖上冻结与回执
（[二轮整改卡 R11](../implemented/2026-09-27-cultivation-remediation-round2.md)）。
2026-09-29 用户确认多会话并行使用已是日常形态：缺陷从「待触发」变为「正在咬」。

## 提案

按会话拆 store：desk store 与 `sendSession` 从全局单值改为按 session 键控；行匹配从裸
rowId 改为 (session, rowId)。改动面在 `packages/dsh-smart-assistant/src/client/`（培养面板
消费端）；`.desk-state.json` 文件协议本身不动——它已是文件级，问题是消费端把不同会话的行
当成同一池。具体缝（store 实例化位置、匹配函数形状）在开工切片的 plan 里定，证据入口 =
S3 A3 与 R11。

## 输掉的方案

- **只把 rowId 改成全局唯一**：挡得住同 id 串扰，挡不住 `sendSession` 单值把「当前会话」
  语义泄漏给所有绑定 tab——R11 的两个症状只修一半。
- **换共享状态管理库**：无证据表明现结构不胜任，拆键即修；引库 = 第二事实家 + 新依赖。
- （plans 卡阶段未推敲过备选；以上两条是本提案默认排除的方向，开工时可推翻。）

## 验收

- 复现 R11 场景（两条并行会话、同 id 行）：A 会话的冻结/回执不再命中 B 会话的行——
  真机取证或夹具复现；
- 单会话行为零回归（client specs 全绿，色彩契约不受影响）。
