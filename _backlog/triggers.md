# triggers.md · 活触发器索引

> 性质：**账本**（随行更新，非章程）。借鉴 `ai_dsh_deep_research/_backlog/_postponed_plans`
> （2026-10-08 用户拍板）：只借它的两个核心件——**索引行**（裁决 + 触发条件一行一条）与
> **周期扫一眼的义务**，**不借其池**（卡不搬家，理由见
> [决定 note](../notes/implemented/2026-10-08-postponed-trigger-index.md)）。
> 触发条件的事实家不变——决定 note / 冻结卡状态行 / `discipline.md` ⏸ 行——本索引只做**可见面**，
> 解决「触发沉在冻结件里、无人定期扫」的缺口（取代检查只在有人重提同一主题时才起作用，
> 而「慢门禁出现」这类触发不是重提案）。
>
> **扫描义务**：收割、走查、阶段收口时扫一眼本表；立新卡前的取代检查也扫。
> **写行**：卡片/条目落地时带可判定触发条件的，在此加一行（毕业四门第二、三门与
> deferred-with-trigger 修复的收口行同 diff）。
> **删行**：触发到场 → 按写回规则以新卡/RFC 重进（写回规则，不是复活），本行删除；
> 裁决被推翻 → 改行指向新家。
> **收行门槛**：只收「条件可判定且未满足」的行；「用户点名 / 需要时重立」这类非触发不收
> （那是敞开的门，不是触发器）。

| 对象 | 裁决 | 触发条件（可判定） | 家 |
|---|---|---|---|
| workflow-as-MD | 不做（第二调度器风险，无真实痛点） | 某流程**第三次被现场重推演**（「重复即建」自然触发再立卡） | [冻结卡](_done/_closed_plans/260928-workflow-as-md.md) |
| 审批面板直调 | rejected（直调需上游缝） | 上游缝未知数解决（client strict codec / 确认回合）+ **本人拍板开工**（卡 §触发为准，原「频次 ≥5/月」已废止） | [冻结卡 §触发](_done/_closed_plans/261004-approve-direct-call.md) |
| 检查地板张力（流程审计 #2） | 记（地板保留不裁） | 全量单项 **>30s 实证**（慢测试/慢门禁出现） | [冻结卡处置表](_done/_closed_plans/261007-process-budget-audit.md) |
| 文档词数预算 | 刻意不做（⏸） | **docs 腐化实证再犯**（再犯即立案，建时带降限防回填） | [discipline.md ⏸ 行](../docs/discipline.md)（+ [审计卡 #5](_done/_closed_plans/261007-process-budget-audit.md)） |
| 语义评审技能 | 未立（重复即建进度 1/3） | **第三次同型对抗性语义扫描**（届时按 dsh-code-review 骨架立薄技能） | [recurrence-tracking note](../notes/implemented/2026-10-08-recurrence-tracking.md) §决定 3 |
| turnaround 阶段 4-5 | 持续实践（deferred） | 信息积累与能力验证 / 检查与继续取舍——各自 owner note 所记条件 | [冻结卡毕业门表](_done/_closed_plans/261005-turnaround-coherence.md) |
| open-value-deficit 四候选 | deferred-with-trigger | ①C 分身真用 30 天 ②首次需证明「越用越好」③真用出现状态歧义 ④用户真用后自然选择 | [冻结卡状态行](_done/_closed_plans/261005-open-value-deficit.md)（→ 各 implemented note） |
| BUG-007 三延后项 | deferred（F8 锁/预算闸、F9 client 拆卸、F11 跨时钟） | 修复 note deferred 行所记条件（重提前先读该 note） | [修复 note](../notes/implemented/2026-10-07-bug-007-concurrency-lifecycle-minors.md) |
| MCP 真实数据接入 | 批量清理关闭（边界已定） | 真实系统数据（公司盘/CRM 等）接入会话的需求出现 | [冻结卡](_done/_closed_plans/260928-mcp-connection.md) |
| 首用端到端验证 | 批量清理关闭（要件已住判据） | **第一次给外人用**前，按 README 方向判据端到端验证一次 | [冻结卡](_done/_closed_plans/260928-self-upkeep-baseline.md) |
| 默认工作区复现 | 批量清理关闭（配方已住走查 note） | 真实安装出现「选择工作区」阻塞，或第一次给外人用 | [冻结卡](_done/_closed_plans/260928-default-workspace-repro.md) |
| implemented 冻结树 | 批量清理关闭（方法住技能） | implemented/ 篇数**过百**或浏览开始碍事 | [冻结卡](_done/_closed_plans/260928-implemented-freeze-tree.md) |
| 自动复盘蒸馏 | 批量清理关闭（收益未证） | 用量统计显示收益 > token + 同意成本（usage 仪表在场可随时答） | [冻结卡](_done/_closed_plans/260928-full-auto-distill.md) |
| 技能许可字段 | 批量清理关闭（消费方未出现） | provider 读它们，或技能出现第二消费方 | [冻结卡](_done/_closed_plans/260928-skill-license-fields.md) |
| desk 文件 schema 版本 | 批量清理关闭（从未发生） | 模型发明面板不识的新字段（字段不匹配真实出现） | [冻结卡](_done/_closed_plans/260928-desk-file-schema-version.md) |
| 命令菜单噪音 | 批量清理关闭（准入家已定） | 真实委托人反馈菜单吵，或第一次给外人用（发行准入家 = 安装卡 S2 准入表） | [冻结卡](_done/_closed_plans/260928-command-menu-skill-noise.md) |
