# 推敲：技能 license / compatibility 字段

> 立卡：2026-09-28 ｜ 状态：推敲中｜毕业门判断 = 待触发｜下一步 = provider 读它们，或技能出现第二消费方

## 背景 / 触发
SKILL.md frontmatter 现在只写 provider 实际读的键（写多了 = 死字段）。
审计依据：[spec-field-audit](../../notes/implemented/2026-09-24-spec-field-audit.md)。

## 毕业门
provider 或第二消费方出现 → 按 1g 审计的候选字段清单推敲，毕业为 RFC。
