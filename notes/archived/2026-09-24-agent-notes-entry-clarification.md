# 明确 coding agent 入口中的 notes 职责

日期：2026-09-24 · 状态：**implemented**
已归档：2026-09-25（历史记录，非当前权威；冻结不再编辑）
## 问题

用户要求先改善开发基础，以小步迭代让 agent 不容易理解错、做错后及时知道，并明确 notes 是 DSH 开发流程的核心数据。现有 AGENTS 已有 notes 目录与 same-diff 规则，但把 implemented 概括为历史，未说明修改前何时读取、完成后如何维护。

## 决定

只在 `AGENTS.md` 的引言与现有开工段补清：notes 承载提案、活跃决定与验证依据；改行为、契约或流程前按任务/机制查相关决定；同一决定更新事实，反转另建并互链；非平凡改动同 diff 留证据；毕业需改写正文；新 note 沿用首次提出日期开头的文件名。

保留原章节、布局、命令表和其他规则，不新建流程文档、分类目录或门禁。这是对 [原组织决定](../archived/2026-09-23-repo-structure.md) 的 notes 职责补充，沿用 不引入大册开发指南 的选择，不改变 队列决定 的条目结构。

依据是钉住 DSH 的 [notes 定义、命名与生命周期](../../vendor/dsh/.agents/notes/README.md)、[implemented 事实维护规则](../../vendor/dsh/.agents/notes/implemented/AGENTS.md) 和 [文档分层](../../vendor/dsh/docs/AGENTS.md)。上游 class 子目录、双语 sidecar 与所有格式门禁不在本次采纳范围。

## 考虑过的替代项

- 保持只写“历史”的入口：不足以让新 agent 在修改前读取仍有效的决定与验证要求。
- 新建完整 notes 手册并改写 AGENTS：现有结构已有职责分层，用户要求小步，几个明确触发条件即可补缺；整体重组的成本和误改风险不值得。

## 影响与验证

入口只增加与当前任务有关的读取和维护条件，不要求遍读全部 notes。旧 notes 的事实漂移、规则冲突和门禁缺口仍按各自问题逐步审阅，不能据此声称已经修复。

基线实跑：`pnpm verify` 18 项通过，根 `pnpm typecheck` 通过；包级 `pnpm --filter dsh-smart-assistant run typecheck` 失败，指出 knowledge-write.spec.ts 的未使用 writeFileSync 和 skill-audit.spec.ts 的未使用 BODY_OK。根入口只执行源码构建，未覆盖包脚本的测试类型检查；本步保留该问题，未修改命令或测试。

独立只读审阅覆盖入口导航与 DSH/notes 适配；上游适配审阅支持保留现有结构，逐项纠正活跃决定维护、旧规则替代和验证范围。修改后实跑 `pnpm verify && git diff --check`，18 项检查通过，无空白错误；回读 AGENTS 确认改动面 = 引言、开工段，外加用户随后指定的布局表 `notes/` 行（开发记忆与证据链表述——本行记录按实际 diff 校准）。没有安装依赖、启动服务或验证产品 live 行为。
