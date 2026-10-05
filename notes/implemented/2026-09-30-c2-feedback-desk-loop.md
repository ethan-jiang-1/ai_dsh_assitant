# C2 片：消息赞踩信号进培养循环摩擦报告

日期：2026-09-30 · 状态：**implemented（desk-loop --self-check 绿含 §7 断言；verify 31 绿；真实报告 §7 渲染正常——dev home 尚无赞踩数据，0 是真实读数）**

采纳卡：[`notes/implemented/2026-09-30-stock-plugin-adoption.md`](../../notes/implemented/2026-09-30-stock-plugin-adoption.md)（C2 片）。

## 决定与证据

stock 两行**已由出厂层挂好**（`message-feedback` 随 web-app 层、`command-feedback` 随 base，dump-config 实证在场）——本片是**消费侧**改动：[`dev/reports/desk-loop-report.mjs`](../../dev/reports/desk-loop-report.mjs) 增 §7「消息赞踩」读数：
- `feedback/message-put` 计 👍/👎；`feedback/message-delete` 按 messageId 对消（撤回的退出正负，记一笔撤回）；
- 备注原样列出（踩的备注是摩擦的直接证词、赞的备注说明哪个行为该保持），无备注的只进计数；
- 自检新增三断言：撤回对消、备注表只收带备注的、计数与撤回分离——门禁红先于读数错。

## 输掉的方案

- **另写独立的 feedback 报告工具**：摩擦报告已持有"会话日志→结构判类→给人读"的全套纪律（speaker 判定、
  前言剥离、评测识别），新工具必然复刻一遍；§7 是同一读法的第 7 类，不是新产品。
- **把赞踩折进 §5（面板动作后的反应）**：§5 的口径是"面板动作 → 本人打字"的时间窗；赞踩是 UI 点击、
  不产生 user/message，混进去会破坏两边的口径。分开一节，各自的分母才诚实。
- **对消逻辑做复杂化（编辑历史/多次 put）**：`putSchema` 的 `updatedAt >= createdAt` 已保证最后一次 put
  是终态；Map 按 messageId 覆盖即终值语义，与"修正探针取终值"的既有判词一致。
