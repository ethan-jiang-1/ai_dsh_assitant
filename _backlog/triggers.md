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
| hero 标题覆盖口 | 接受现状（本包不改 vendor 品牌语） | 读 vendor 时，上游发布带来 hero 标题槽位或 locale 覆盖口 | [首屏 hero 标题卡](_archive/settled_issues/261011-vendor-hero-headline.md) |
| 输入观察的每周快照 | 先观察 30 天（专用环境 + 见现有入口）；**窗口自首条真人会话起算**（2026-10-18 拍板，对齐 261011 原设计"第 0 天＝首条真人会话"；此前零读数不补摘） | 读数档出现**首条真人会话**后每周扫读数（>7 天规则只对有读数的档生效） | [读数档](research/usage/261011-input-observation.md)；[裁决出处](_archive/settled_issues/261018-proactive-direction.md) |
| Viki 转正面板 | 不做（内部走已有的 `assistant_memory save` + 审批） | 手工转正实际频率 **>5 次/月**，或客户明确要一个 Viki 入口 | [检索路径 note](../notes/implemented/2026-10-20-on-demand-recall-path.md) |
| OV 用户侧安装脚本 / wizard | 不预建（手册 + doctor + 干净 home 冒烟已覆盖） | 真人按《安装手册》走查出现**同类卡点 ≥2 次**，或第一次真实远程部署 | [安装面 note](../notes/implemented/2026-10-21-install-surface-first-class.md) |
| OV plugin 版本 | 未采用新版本（pin 0.5.26 / server 0.5.1.1） | 读 vendor 时上游**发布**带我们需要的修复或安全更新 | [RFC](../notes/implemented/2026-09-29-openviking-adoption-rfc.md) |
| notes 扁平结构的规模 | 维持扁平 | 一次笔记审计里 `implemented`/`archived` 的浏览明显受阻（找一篇要翻目录） | [notes/README](../notes/README.md) §四 |
