# fixed_bugs/ · 修好了

从 [`../../bugs/`](../../bugs/README.md) 用 `git mv` 进来。文件名不变。进来时把 frontmatter 的 `status` 改成 `已修`，`severity` 和 `opened` 不动。下一个号仍在活跃目录的 README 取。

| 卡 | 标题 | 修复 | 日期 |
|---|---|---|---|
| [BUG-008](BUG-008-schedule-tools-missing.md) | 评测断言了它自己托管不了的能力——`desk-daily-brief` 出生即不可能 PASS，note 记了不可复现的 PASS | 任务声明 `requires: 'web'` + runner 新增 `partitionTasks()` 报 **NOT EVALUATED**（不算通过＝假绿、不算失败＝替组合面背锅）+ `--self-check` 红绿对照进 `pnpm verify`；更正晨报提案卡的假 PASS 与验收表、`docs/dev.md` §四补「能力边界」。web-session 驱动列为升级路径（触发：第二条 web-only 任务或本人要求 web 面出分） | 2026-10-11 |
| [BUG-007](BUG-007-concurrency-lifecycle-minors.md) | 并发与生命周期轻缺陷群（房间无锁/拆卸缺失/跨时钟） | 部分：F8 tmp 唯一化（红→绿）；锁/拆卸/跨时钟三项 deferred-with-trigger 住修复 note | 2026-10-07 |
| [BUG-005](BUG-005-destructive-contract-violations.md) | 破坏性契约违背——retireSkill rm 附属文件 + 重导入抹审批 | 整目录原子归档（rename）+ 存在页保留治理 status；旧 spec 钉错预期同 diff 修正 | 2026-10-07 |
| [BUG-006](BUG-006-budget-cjk-counting.md) | 字节与预算 CJK/计数缺陷（快照码元截断+digest 少报+ingest 全文算段） | 三处各自字节精确/重算/按携带文本分段，三红三绿 | 2026-10-07 |
| [BUG-003](BUG-003-eval-floor-red.md) | eval 地板 2/5 红（复发+新红叠环境假象） | 三个环境病灶（repo-cwd 泄漏/套内排序/判卷基点）+ 技能停止条件显式化；两独立 home 连续两轮 5/5 | 2026-10-07 |
| [BUG-004](BUG-004-approval-trust-root.md) | 审批门的信任根——门只在 prose + 批准活路径可伪造 + 审计死码 | 审批台账统一（三过渡 × 两 lane 同账，检测不预防——预防残留上游缝 261004） | 2026-10-07 |
| [BUG-001](BUG-001-eval-behavior-tasks-red.md) | 行为评测两任务既有红 | 技能目录移 host 行 + wrote-path 认 python 写法（5/5 两轮） | 2026-10-02 |
| [BUG-002](BUG-002-desk-loop-session-classification.md) | 以面板刷新文案开场的真人会话被误判成评测 | evalRun 加第三条件（消息不走面板；self-check 双向钉） | 2026-10-05 |
