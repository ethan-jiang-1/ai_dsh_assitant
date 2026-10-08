# bugs/ · 这次不修的缺陷

当场修掉的不建卡。建卡表示发现时决定这次不修。

提交只改这个目录：新建 `BUG-<NNN>-<slug>.md`，并在下面的表加一行。号在本文件取，不和 [`../issues/`](../issues/README.md) 的推敲卡混。

**下一个缺陷号**：已分配到 BUG-007，Next BUG ID = 8。本目录和 [`../_archive/bugs/`](../_archive/bugs/README.md) 一起算，取最大号加一。

修完就 `git mv` 到 [`../_archive/bugs/`](../_archive/bugs/README.md)，文件名不变，正文不改，状态行补修复，并把这一行挪到那边的表。

还没结论、被明确搁置的，进 [`../_archive/suspended/`](../_archive/suspended/README.md)。挂起不是修完。

## 活跃清单

| Bug | 标题 | 严重级 | 发现 |
|---|---|---|---|

## 模板

```markdown
# BUG-<NNN>：<一句话标题>

> 严重级别：P0（阻断）/ P1（重要）/ P2（次要）｜发现：YYYY-MM-DD｜状态：活跃

## 症状

## 根因（假设）

## 复现

## 修复关联
```

首部 12 行内必须有 `状态：`。
