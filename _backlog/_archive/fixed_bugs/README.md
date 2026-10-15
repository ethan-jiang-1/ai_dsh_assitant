# fixed_bugs/ · 修好了

从 [`../../bugs/`](../../bugs/README.md) 用 `git mv` 进来。文件名不变。进来时把 frontmatter 的 `status` 改成 `已修`，`severity` 和 `opened` 不动。下一个号仍在活跃目录的 README 取。

| 卡 | 标题 | 修复 | 日期 |
|---|---|---|---|
| [BUG-012](BUG-012-eval-session-reads-outside-workspace.md) | `pnpm eval` 会话能读到隔离工作区之外的真实数据，行为判据被污染（默认落 dev home，真实经营事项/记忆/交付物全在模型可读范围） | 跑器默认每次 run 供给一次性 home（`provisionRunHome()`：`dev/env/setup.sh` 建 profile + 凭据 0600 复制），显式 `ASSISTANT_DSH_HOME` 留作出口；验收中抓到第二处缺口一并堵上——启动 env 不传 home 时 launcher 静默回落 dev home，现 `runPreset` 钉死 `ASSISTANT_DSH_HOME`。证据：修复后 `breakdown-uses-skill` 在供给 home 上 PASS 101s（技能按名加载、`harness-home/assistant` 外部路径读取零）；修复前同任务 FAIL 900s（`ubFDs9` 读真实账本未交答案）——红→绿闭环 | 2026-10-15 |
| [BUG-011](BUG-011-morning-brief-stale-desk-vocabulary.md) | `morning-brief` 技能仍按退役的 `actions[]`/decisions/gaps 写触发与对账口径（模型可见面） | 把触发与读法换成**账本**口径（事项+承诺日/核对点/预测+待确认提案+回执；`revise`/`complete` 对应提醒增删）；**扫描另抓到同类第二处**：`action-plan` 教「refresh the desk 让动作出现」与 `desk-refresh`「业务事项永不写进桌面文件」直接矛盾——改为动作经 `assistant_operating entrust` 进账本、带日期的同回合排提醒。证据：全域 grep 零命中；build 0；composition 6/6；`pnpm eval --only desk-single-matter` PASS 29s；真机 web 会话读数＝`SKILL: morning-brief`→`entrust`→`SCHEDULE_LIST`→`SCHEDULE_CREATE{2026-11-20 09:00 Asia/Shanghai}`+`[due follow-up]`→同回合建周坐 | 2026-10-11 |
| [BUG-009](BUG-009-probe-under-load.md) | 会话挂载相位的判据面随负载变红（evaluate 超时不可配、失败不自解释，底下压着两处真竞态） | ①判据面：`cdp-driver` 加 `evaluateTimeoutMs`、探针加 `--eval-timeout`（默认 60s）+ 饱和警告 + 判决带 `host{loadavg}` + 失败 `hostHint`（机制红绿：1ms 必超时 / 30s 得值）；②粘贴前新增 `conversation-idle` 相位（回合中 composer 是停止态、粘贴会被丢）；③回放脚本第一格服务「种子回合」（它排在主轮之前，不加就整体错位一格——探针自 `1abaa93` 起一直红而无人重跑）。绿证据：全套相位 exit 0（含交代臂三轮） | 2026-10-11 |
| [BUG-010](BUG-010-loop-probe-stale-first-screen.md) | 首用闭环探针的首屏断言停在「打开即对话」时代（唯一桌面之后首屏是桌面页） | 场景契约改成两步：首屏判**桌面页**（`deskFirstScreen`/`deskCopyZh`/无黑话/工作区就绪），要跑回合时走桌面自己的门「＋ 交代新事项」进会话再判 composer 与引导条；surface-only 运行不建会话。同一改动**当场抓到并修掉**一个真缺陷（`startIntake` 要求投影 ready ⇒ 全新 home 上「＋ 交代新事项」是死按钮；`missing` 视为「没有事项」、真未知不绑路径但门照开，`5a7c00a` + client-entry 守卫）。证据：全新一次性 home 上由红转绿，`--ask` 真回合 17s、exit 0 | 2026-10-11 |
| [BUG-008](BUG-008-schedule-tools-missing.md) | 评测断言了它自己托管不了的能力——`desk-daily-brief` 出生即不可能 PASS，note 记了不可复现的 PASS | 任务声明 `requires: 'web'` + runner 新增 `partitionTasks()` 报 **NOT EVALUATED**（不算通过＝假绿、不算失败＝替组合面背锅）+ `--self-check` 红绿对照进 `pnpm verify`；更正晨报提案卡的假 PASS 与验收表、`docs/dev.md` §四补「能力边界」。web-session 驱动列为升级路径（触发：第二条 web-only 任务或本人要求 web 面出分） | 2026-10-11 |
| [BUG-007](BUG-007-concurrency-lifecycle-minors.md) | 并发与生命周期轻缺陷群（房间无锁/拆卸缺失/跨时钟） | 部分：F8 tmp 唯一化（红→绿）；锁/拆卸/跨时钟三项 deferred-with-trigger 住修复 note | 2026-10-07 |
| [BUG-005](BUG-005-destructive-contract-violations.md) | 破坏性契约违背——retireSkill rm 附属文件 + 重导入抹审批 | 整目录原子归档（rename）+ 存在页保留治理 status；旧 spec 钉错预期同 diff 修正 | 2026-10-07 |
| [BUG-006](BUG-006-budget-cjk-counting.md) | 字节与预算 CJK/计数缺陷（快照码元截断+digest 少报+ingest 全文算段） | 三处各自字节精确/重算/按携带文本分段，三红三绿 | 2026-10-07 |
| [BUG-003](BUG-003-eval-floor-red.md) | eval 地板 2/5 红（复发+新红叠环境假象） | 三个环境病灶（repo-cwd 泄漏/套内排序/判卷基点）+ 技能停止条件显式化；两独立 home 连续两轮 5/5 | 2026-10-07 |
| [BUG-004](BUG-004-approval-trust-root.md) | 审批门的信任根——门只在 prose + 批准活路径可伪造 + 审计死码 | 审批台账统一（三过渡 × 两 lane 同账，检测不预防——预防残留上游缝 261004） | 2026-10-07 |
| [BUG-001](BUG-001-eval-behavior-tasks-red.md) | 行为评测两任务既有红 | 技能目录移 host 行 + wrote-path 认 python 写法（5/5 两轮） | 2026-10-02 |
| [BUG-002](BUG-002-desk-loop-session-classification.md) | 以面板刷新文案开场的真人会话被误判成评测 | evalRun 加第三条件（消息不走面板；self-check 双向钉） | 2026-10-05 |
