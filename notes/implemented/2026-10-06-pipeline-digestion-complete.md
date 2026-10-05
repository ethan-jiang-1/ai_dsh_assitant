# 管线消化终记：_backlog/plans/ 活跃区清空 + Phase A 形态迁移收口 + D7 递交

日期：2026-10-06 · 状态：**implemented**

## 决定

**管线消化**（`29de6b8`）：三张活跃卡全部按正规生命周期毕业——

| 卡 | 毕业判断 | 去向 |
|---|---|---|
| first-open-ux | 已消化（18 轮全落地+上游 6/6 递交 #8939-#8944+判据转移） | 结论并入各 implemented note |
| open-value-deficit | 方向已确认（一把手总助，19 轮定案）+切片已落地（Day-0 intake / 桌面主视图 / 晨报 v1 / 审批内联各有 note） | deferred-with-trigger 归 owner note |
| turnaround-coherence | 阶段 0-3 全链交付（方向→卫生→UX→垂直落地）；阶段 4-5 为持续实践散入触发 | 常设贡献固化（证据阶梯/数据同源/DSH 原生优先） |

`_backlog/plans/` 活跃区**清空**——所有推敲卡已按管线消化，不再持有活跃未决。

**Phase A 形态迁移**（`678b106`+`69b7bf5`+`d8011b8`+`5501077`）：
- A1 富桌面落地卡（空白相位，替换细带——弧线说明+简报承诺+开始按钮 / has-desk 紧凑摘要+打开桌面）
- A2' 常驻桌面摘要条（每条非空白会话 composer 上方——要拍 N/在跟 M/缺 K 三 chip +「桌面→」一键切视图）
- A3 自测走查全通（三帧逐拍 DOM：空白 7/7 · 非空白 4/4 · 桌面视图 6/6；preflight 绿）
- web-expected 两场景重录复验 PASS（新文案入镜）

**D7 上游递交**（`8b03b67`）：默认视图/空白主区不可插件化的三重阻挡 → deepseek-harness Discussions [#8961](https://github.com/deepseek-ai/deepseek-harness/discussions/8961)，请求 defaultView 配置或 blank-phase 主区槽或 landingView 概念——三选一即可解锁 dashboard-first 类产品。

## Deferred-with-trigger 全清单（管线消化后的剩余项及其家）

| 未落地候选 | 触发条件 | owner note |
|---|---|---|
| C 分身（30 天个性化承诺） | 真用 30 天后验证 | desk-primary-view |
| OKF/VK 仪器与实验 | 第一次需要证明「越用越好」 | 定位卡（已归档） |
| 督办完整契约（稳定 id/owner/状态转换） | 真用出现状态歧义 | desk-primary-view |
| 访谈到能力积累运行时链路 | 真用积累数据后验证学习效果 | desk-primary-view |
| 一句话定位 A/B/C 排序 | 用户真用后自然选择 | 定位卡（已归档） |
| Phase B：上游 D7 被接受并发布 | vendor 侧改 | 上游台账 #8961 |
| Phase C：真桌面优先（打开=桌面） | D7 落地后一步切完 | desk-primary-view |

## 输掉的方案

1. **一步翻越 vendor 边界**：三重阻挡（DEFAULT_VIEW_ID 硬编码/空白相位 null/composer 开发者语言）不可能在插件边界内全部解决——输给步步为营（Phase A 最大化可见度 + Phase B 上游 + Phase C 等 vendor）。
2. **把 deferred-with-trigger 留在 plan 卡里**：管线消化后触发条件必须写进 owner note，否则成为第二个队列——输给「触发条件的家=owner note」。
3. **为毕业而毕业**：三张卡各自的毕业判断都基于如实盘点（已交付/未交付/去向），不是因为「该清空了」就硬毕业。

## 范围与后果

管线消化完成：backlog → proposed → implemented 全链走通，plans/ 清空，deferred-with-trigger 各有家。Phase A 形态迁移交付：插件边界内新 UX 可见度最大化（富落地卡+常驻摘要条+桌面视图 tab）。D7 递交后 vendor 侧的响应是 Phase C 的唯一依赖。落地服务可随时起干净 home 复现。
