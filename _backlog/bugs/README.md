# bugs/ · 这次不修的缺陷

当场修掉的不建卡。建卡表示发现时决定这次不修。

提交只改这个目录：新建 `BUG-<NNN>-<slug>.md`，并在下面的表加一行。号在本文件取，不和 [`../issues/`](../issues/README.md) 的推敲卡混。

**下一个缺陷号**：已分配到 BUG-010，Next BUG ID = 11。本目录、[`../_archive/fixed_bugs/`](../_archive/fixed_bugs/README.md) 和 [`../_archive/suspended_bugs/`](../_archive/suspended_bugs/README.md) 一起算，取最大号加一。

修完就 `git mv` 到 [`../_archive/fixed_bugs/`](../_archive/fixed_bugs/README.md)，文件名不变，正文不改，frontmatter 的 `status` 改成 `已修`，状态行补修复，并把这一行挪到那边的表。

查明了、还没修的，进 [`../_archive/suspended_bugs/`](../_archive/suspended_bugs/README.md)。挂起不是修好。

## 活跃清单

| Bug | 标题 | 严重级 | 发现 |
|---|---|---|---|
| [BUG-009](BUG-009-probe-under-load.md) | 负载稍高时两个浏览器探针在会话挂载后判红——渲染主线程无响应 | P2 | 2026-10-11 |

## frontmatter

新卡照这个写。文件第一行是 `---`，字段顺序固定，第一项是 `status`。

```yaml
---
status: 活跃
severity: P1
opened: YYYY-MM-DD
---
```

| 字段 | 写什么 |
|---|---|
| `status` | 本目录只写 `活跃` |
| `severity` | `P0` 阻断，`P1` 重要，`P2` 次要 |
| `opened` | `YYYY-MM-DD`，与正文发现日相同 |

离开本目录时只改 `status`。修好了改成 `已修`，卡进 [`fixed_bugs/`](../_archive/fixed_bugs/README.md)。查明了、还没修，改成 `待修`，卡进 [`suspended_bugs/`](../_archive/suspended_bugs/README.md)。`severity` 和 `opened` 不动。正文里的状态句留着，不抄进 frontmatter。

## 模板

```markdown
---
status: 活跃
severity: P1
opened: YYYY-MM-DD
---

# BUG-<NNN>：<一句话标题>

> 严重级别：P0（阻断）/ P1（重要）/ P2（次要）｜发现：YYYY-MM-DD｜状态：活跃

## 症状

## 根因（假设）

## 复现

## 修复关联
```
