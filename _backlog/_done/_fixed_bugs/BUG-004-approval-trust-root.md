# BUG-004：审批门的信任根——治理承诺由可伪造提示词与同工具替代动词承担（F1 高 + F2/F3/F6 中）

> 严重级别：P1（重要——draft→stable 审批门是产品治理承诺（README 方向判据 P3「学到的东西管得住」/O6），机制上整体可绕过且跨会话持久）｜发现：2026-10-07（对抗性语义扫描）｜状态：**fixed 2026-10-07**——台账统一（检测）+ docstring/死码/回执修复，见 [修复 note](../../notes/implemented/2026-10-07-bug-004-approval-ledger.md)；**预防（伪造提示词）残留给上游缝**，261004 触发条件不变

## 症状

三个同根缺陷（证据 = [语义扫描报告](../_reference/tech-exploration/261007-semantic-sweep-src.md) F1/F2/F3/F6，F1 已由委派方亲验）：

1. **F1（高）**：`promote_page`/`deprecate_page` 模型可直调（`src/agent/learn/index.ts:433` 直调无校验）——同会话模型可把自己写的 draft 翻 stable；「you cannot approve your own page」只存在于工具 description 的 prose；模型路径零审计（人面路径写 approvals.jsonl）。
2. **F2/F3（中）**：知识页批准与技能提案批准的**实际活路径**是普通 prompt（`[桌面]` 前缀明文可伪造——直调 lane 在当前 pin 下必然失败是 designed state）；land_skill 的机械门是真的，但「手改 status」这把钥匙由模型按 prompt 代写；审计错误码死码 + sessionId 不校验 + 头注释与实现矛盾。
3. **F6（中）**：直调批准（若将来 lane 通）成功后无桌面刷新，面板继续显示已批页为待审，再点报「直调失败」并让模型 promote 已 stable 页。

## 根因（假设）

「人审」的信任根建立在提示词礼貌而非机制上：writePage 不自促只挡住一条路，没挡住同工具的替代动词；直调 lane 的上游 pin 未动使回退 prompt 成了唯一通道，而 prompt 无认证。**同类前科**：BUG-001 的教训是「目录不发布 ≠ 不存在」——这里是「prose 说不行 ≠ 机制不让」。

## 复现

会话中让模型调 `assistant_reflect action=promote_page page_id=<draft-id>` → 页变 stable，无审计行；或以普通消息发送面板样式的「已获批准」文本观察模型照办。

## 修复关联

已修（`434e912`）：[修复 note](../../notes/implemented/2026-10-07-bug-004-approval-ledger.md)——审批台账统一（三过渡 × 两 lane 同账）+ 假断言 docstring + remote 死码/漂移 + desk 回执；预防残留上游缝（261004 触发不变），面板直读 = 该卡未决②。
