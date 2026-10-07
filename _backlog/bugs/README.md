# bugs/ · 活跃缺陷卡

> 一文件一张卡：`BUG-<NNN>-<slug>.md`。修完 `git mv` 到
> [`../_done/_fixed_bugs/`](../_done/_fixed_bugs/)，文件名不变、内容不重写。
> **编号权威在归档侧**：新号 = [_done README](../_done/README.md) 的 Next BUG ID
> （已分配最大号 + 1，活跃 ∪ 归档一起算）。规矩手册 = [`../README.md`](../README.md)。
> 活跃卡受 `backlog-liveness` 门禁看守（状态行户口 + 本表索引互查，2026-10-02 借鉴）。

## 活跃列表

| Bug | 标题 | 严重级 | 发现 |
|---|---|---|---|
| [BUG-005-destructive-contract-violations.md](BUG-005-destructive-contract-violations.md) | 破坏性契约违背——retireSkill rm 附属文件（nothing-is-deleted 假承诺）+ 重导入抹审批 | P1 | 2026-10-07 |
| [BUG-007-concurrency-lifecycle-minors.md](BUG-007-concurrency-lifecycle-minors.md) | 并发与生命周期轻缺陷群——房间读改写无锁 / client 订阅定时器无拆卸 / settlePending 跨时钟冻结 | P2 | 2026-10-07 |

## 卡片模板

```markdown
# BUG-<NNN>：<一句话标题>

> 严重级别：P0（阻断）/ P1（重要）/ P2（次要）｜发现：YYYY-MM-DD｜状态：活跃

## 症状
观察到什么错误行为（现场、报错、复现路径）。

## 根因（假设）
机制层原因——越到契约/结构层越好，避免只描述表象；未定位就写假设与验证途径。

## 复现
最小复现步骤 / 命令 / 输入。

## 修复关联
落地方式（修复 commit / 搁置池行 / 症状签名入档的 note），修完归档时补。
```

**边界**：当场修掉的缺陷不建档（轮内收尾记录照旧）；建档 = 发现时决定不当场修。
已有归宿的旧缺陷不迁移。
