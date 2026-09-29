# 推敲：培养面按会话分 store

> 立卡：2026-09-28 ｜ 状态：推敲中｜毕业门判断 = 待触发｜下一步 = 多会话并行使用成为真实场景、A3 缺陷开始咬人 ｜ **关闭：2026-09-29 毕业为该做（用户拍板：多会话并行已是真实场景）→ RFC 同日落地为 [notes/implemented/2026-09-29-per-session-desk-store.md](../../../notes/implemented/2026-09-29-per-session-desk-store.md)**

## 背景 / 触发
主页与 tab 共用单 store、`sendSession` 全局单值（[整改卡 S3](../../../notes/implemented/2026-09-26-cultivation-remediation.md)）。
2026-09-27 窄范围复审给了真实咬人的证据：store 被所有绑定 tab 共享、匹配只按裸 rowId，
A 会话说一句会给 B 会话里同 id 的行盖上冻结与回执（[二轮整改卡 R11](../../../notes/implemented/2026-09-27-cultivation-remediation-round2.md)）。

## 毕业门
并行使用成真 → 按会话拆 store 的切片（R11 观察是现成的问题陈述）。
