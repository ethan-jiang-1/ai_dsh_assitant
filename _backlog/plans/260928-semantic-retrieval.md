# 推敲：语义检索 / embedding

> 立卡：2026-09-28 ｜ 状态：推敲中｜毕业门判断 = 待触发｜下一步 = 关键词/标签检索出现真实漏召回

## 背景 / 触发
现行检索 = 关键词 + 标签 + 反链现算（确定性、给命中理由）。embedding 届时经 `ctx.llm` 做，
另开一缝。依据：[三线合流 §六](../../notes/implemented/2026-09-24-tri-line-synthesis.md)、
[R1 §5](../../notes/archived/research/2026-09-24-r1-memory-ecosystem-survey.md)、
[R3 §7.2](../../notes/archived/research/2026-09-24-r3-knowledge-layer-survey.md)。

## 毕业门
真实漏召回案例到手 → 推敲 embedding 缝的形状（何时算、存哪、怎么混排），毕业为 RFC。
