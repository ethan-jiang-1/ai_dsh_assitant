# issues/ · 还在推敲的事

> 一文件一张卡，文件名 `YYMMDD-<slug>.md`。缺陷不进这里，进 [`../bugs/`](../bugs/README.md)。
> 有结论就 `git mv` 到 [`../_archive/settled_issues/`](../_archive/settled_issues/README.md)，文件名不变，正文不改，frontmatter 的 `status` 改成 `已结`，状态行补去向。
> 被人叫停、还没有结论的，进 [`../_archive/suspended_issues/`](../_archive/suspended_issues/README.md)。
> 地图在 [`../README.md`](../README.md)。

## 活跃清单

| 卡 | 一句话 | 毕业倾向 |
|---|---|---|
| [261006-chief-of-staff-experience.md](261006-chief-of-staff-experience.md) | 一把手的总助——用户体验重设计：从「空白聊天框」到「打开即见简报+跟进+知识积累」 | 该做，四 Goal **意图**全达成（Step 1 换轨 / Step 2 未交付 / Goal 3 半交付 / Step 4 落 home 手册，2026-10-08 校正）；**待人**：与 261007 共用「用户终验」一环，记录家在 261007 |
| [261007-opening-brief-and-rhythm.md](261007-opening-brief-and-rhythm.md) | 它先开口——开屏播报（替换 auto-send）、拍板感、周节律：体验弧线行为层收口（2026-10-07 真机走查三 P0 断点 + 内容物错位的消化） | 四片全交付（实现事实）；**验收面 6/7 行有证据、1 行阻断（#7 blank 夹具腐烂）、3 项人判未判**；剩用户终验即毕业 |
| [261007-input-boundary.md](261007-input-boundary.md) | 输入边界——晨报与周坐的料从哪来（碎片收件箱/文件投递/CSF/纯仪式四候选；不接外部数据源红线下的喂入通道设计） | **等人拍板（两句话）**：① 30 天真用落在哪个 home（推荐专用试用 home）② 先真用 30 天再定形态（推荐先行，判读指标已定义）；点头则按推荐次序合成 proposed 卡 |

## 🔒 只有用户能判触发

状态行带 🔒 的卡，agent 只报告和建议，不得自行判触发、不得删卡、不得实现。
样本卡 [260929-reserved-anchor-discipline](../_archive/settled_issues/260929-reserved-anchor-discipline.md) 已由用户本人关闭。现在没有在役的 🔒 卡。新卡出现时，这条照旧。

## frontmatter

新卡照这个写。文件第一行是 `---`，字段顺序固定，第一项是 `status`。

```yaml
---
status: 推敲中
opened: YYYY-MM-DD
---
```

| 字段 | 写什么 |
|---|---|
| `status` | 本目录只写 `推敲中`，或卡在真人拍板时写 `等人拍板` |
| `opened` | `YYYY-MM-DD`，与正文立卡日相同 |

离开本目录时只改 `status`。四问有了结论，改成 `已结`，卡进 [`settled_issues/`](../_archive/settled_issues/README.md)。被人叫停、还没有结论，改成 `叫停`，卡进 [`suspended_issues/`](../_archive/suspended_issues/README.md)。正文里的状态句留着，不抄进 frontmatter。不写 id、标题、类型。

## 推敲卡模板

类型写在正文的状态行。还分不出 Feature 和 Task 就写未定。正文仍是推敲，不换成另一套表格。

```markdown
---
status: 推敲中
opened: YYYY-MM-DD
---

# 推敲：<标题>

> 立卡：YYYY-MM-DD ｜ 状态：推敲中｜类型：Feature｜毕业门判断 = 待定｜下一步 = <动作或触发>

## 背景 / 触发

## 已知与未决

## 候选与取舍

## 毕业门
```

`Feature`：可观察行为会变。`Task`：要交出代码、文档、配置或结论。需求确认之后，验收矩阵按 [验证设计](../methods/validation-design.md) 写在同一张卡的 `## 验收矩阵`，不另开一张卡。毕业门写成 `已过` / `已通过` / `已毕业` 之后，卡就要离开这个目录。
