# triggers.md · 活触发器索引

> 性质：**账本**（随行更新，非章程）。借鉴 `ai_dsh_deep_research/_backlog/_postponed_plans`
> 的两个核心件——**索引行**与**扫一眼的义务**，不借其池。理由见
> [决定 note](../notes/implemented/2026-10-08-postponed-trigger-index.md)。
>
> 延后不自动加行。触发的句子写在拥有该决定的 note 或关闭的卡上。这里只收一件事：
> 不在这张表上，后来的人会把已经否掉的做法再做一遍，而且那条条件是**工作里自己会撞上的一次观察**
> （一次跑、一份文件、一次 vendor 发布、一次审计）。一行一个观察，并写明它出现的地方。
> 「以后」「有空」「用户点名」「第一次给外人用」不收。常设指令已经在盯的，不收第二份。
>
> **扫描义务**：收割、走查、阶段收口时扫一眼；立新卡前的取代检查也扫。扫的是这几行，不是关闭卡全集。
> **写行**：同一次改动里，四错真的会发生、观察也只有一个。
> **删行**：触发到场，按写回规则以新卡重进后删行。裁决被推翻，改指向或删行。
> 下次扫的时候，如果必须先想起这张表才知道要看什么，这行就不是触发——删行，句子留在 owner 或关闭的卡上。

| 对象 | 裁决 | 触发条件（一次观察，出现在哪） | 家 |
|---|---|---|---|
| 检查地板张力 | 地板保留不裁 | 跑全量时单项 **>30s** | [冻结卡处置表](_archive/settled_issues/261007-process-budget-audit.md) |
| 文档词数预算 | 刻意不做 | 文档审计里**同一类腐化再出现** | [discipline.md ⏸ 行](../docs/discipline.md) |
| 技能许可字段 | 不写 | 读 vendor 时 provider **开始读** `license` / `compatibility`，或技能出现第二个消费方 | [冻结卡](_archive/settled_issues/260928-skill-license-fields.md) |
| desk 文件字段 | 不预建版本 | 桌面文件里出现**面板不认识的字段** | [冻结卡](_archive/settled_issues/260928-desk-file-schema-version.md) |
| 会话内桌面默认 view / blank 贡献 | 该路径插件边界内不做，不涵盖全局 `main` 默认入口 | 上游**发布**默认视图可配置，或空白相位主区可插件贡献 | [原决定](../notes/implemented/2026-10-06-desk-primary-view.md)；[全局入口的当前分流](issues/261006-chief-of-staff-experience.md#方案与可行性) |
