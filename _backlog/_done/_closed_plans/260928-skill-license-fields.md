# 推敲：技能 license / compatibility 字段

> 立卡：2026-09-28 ｜ 状态：推敲中｜毕业门判断 = 待触发｜下一步 = provider 读它们，或技能出现第二消费方 ｜ **关闭：2026-09-29 用户拍板批量清理：provider/第二消费方未出现；候选清单住审计 note；去向 = _closed_plans 归档**

## 背景 / 触发
SKILL.md frontmatter 现在只写 provider 实际读的键（写多了 = 死字段）。
审计结案在 [三线合流](../../../notes/implemented/2026-09-24-tri-line-synthesis.md) 的 1g 行：provider 不读这两字段，不写。

## 毕业门
provider 或第二消费方出现 → 按 1g 审计的候选字段清单推敲，毕业为 RFC。
