---
topic: 技术
intent: "核实一件经营事项跨会话接续、提醒联动与经验使用的当前可行性，给出最小接口职责和可证伪验证。"
---

# 持续经营闭环：静态可行性与最低验证

消费者：[261008 持续助理](../../issues/261008-ceo-operating-loop.md)。本报告服务于需求推敲，不授予产品实现。

基线：[当前 pin](../../../vendor/UPSTREAM.md#L12-L14) = `dsh-v0.2.0-rc.2`，SHA `639ed015397290b3745d163aafe02ffee4aa3f84`。来源为仓库当前源码、公开合同、测试资产及官方网络检索；未启动服务、运行命令/测试/浏览器/真模型、读取运行 home。以下“存在”只表示静态可核，测试文件存在不等于本轮执行通过。

## 1. 可行性判断

已有跨会话持久目录、带身份的记录、来源字段、知识治理与耐久调度，足够支撑一个有界候选；尚未接成“统一经营事项的可信更新”。主要缺口是事项认领、提议与权威状态分离、并发/幂等控制、事项—排程映射及可核对的更新回执，不是缺一个列表字段。

当前不能从 `DeskData.id?` 推出“没有身份”：技能示例携带 id、Room 校验 id，客户端也以 id 或文本作为行键。问题是这些身份没有经过验证的跨 Session 业务等价关系；标题/文本 fallback 不能证明改名后接续或同名不同事不混。

## 2. 当前代码与技能的事实

| 关键行为 | 已有机制与源依据 | 尚未成立的部分 |
|---|---|---|
| 跨会话持久承载 | [Host:147–165](../../../packages/dsh-smart-assistant/src/host/index.ts#L147-L165)把四房间放在共享 dataDir；[preset:15–52](../../../packages/dsh-smart-assistant/cordis.patch.yml#L15-L52)挂 Host 记忆及持久会话检索 | 四房间不是统一事项账本；共享目录不保证两个 Session 的更新不会互相覆盖 |
| 显式接续 | [research:152–165](../../../packages/dsh-smart-assistant/src/host/research-room.ts#L152-L165)按指定 id 读、改、写线程并追加 evidence；[Room:106–133](../../../packages/dsh-smart-assistant/src/domain/home/room.ts#L106-L133)支持指定 id | 没有同事项认领/错并裁决；read-modify-write 没有 expected revision；两个调用可能基于同一旧状态 |
| 原始来源 | [memory:23–38、89–116](../../../packages/dsh-smart-assistant/src/host/memory-room.ts#L23-L116)保存 source、supersedes；[knowledge:54–97](../../../packages/dsh-smart-assistant/src/host/knowledge-room.ts#L54-L97)要求非空 sources；[learn:399–409](../../../packages/dsh-smart-assistant/src/agent/learn/index.ts#L399-L409)自动给学到技能填 source Session | memory source 为调用者字符串，知识来源只校验非空，不验证原始事件定位/证据支持；现有字段并非一概不存在，但无法据此认定每次事项更新可追溯 |
| 源事件读取 | [SessionQuery:28–45、63–65](../../../vendor/dsh/packages/session-query/session-query/README.md#L28-L65)有 readSession/readEvent/readSurface/traceEvent，优先 live，可 cold read，区分缺失/损坏 | 持久 SessionId＋原始事件位置可作为候选来源定位；当前事项更新没有统一填充/校验流程。继承、替换后的事件关系不能仅靠标题或日志全文搜索推定 |
| 并发与原子写 | [atomic-write:20–34](../../../packages/dsh-smart-assistant/src/domain/home/atomic-write.ts#L20-L34)用 unique temp＋rename；[Room:128–149](../../../packages/dsh-smart-assistant/src/domain/home/room.ts#L128-L149)单文件替换、归档分步执行 | 只防半文件/共享临时名碰撞；没有经营更新 FIFO、版本检查、跨文件事务。写新记忆后归档旧记忆失败会留下两条，不应当成自动唯一权威状态 |
| 桌面读取 | [desk-refresh:9–35](../../../packages/dsh-smart-assistant/presets/assistant/skills/desk-refresh/SKILL.md#L9-L35)由模型写工作区快照；[loadDesk:42–139](../../../packages/dsh-smart-assistant/src/client/desk-io.ts#L42-L139)从最近五个 Session 选一份并记 sourceSession | 并非跨会话合并查询；不同工作区可能不同快照；同工作区两个 Session 也可能写同一文件 |
| 延期/完成/静默 | [morning-brief:14–23、53–73](../../../packages/dsh-smart-assistant/presets/assistant/skills/morning-brief/SKILL.md#L14-L73)规定 due 同回合排程、延期 update、完成 delete、静默留记忆、周坐先 list 防堆叠 | 是模型守约要求，没有与事项更新共同提交；“每工作目录一条周坐”不由当前 Session 的 schedule_list 证明 |
| 调度修改一致性 | [schedule:249–281、342–385、454–458](../../../vendor/dsh/packages/schedule/schedule/src/index.ts#L249-L458)create/delete/update 共用 Host FIFO，update 比较完整 expected record，成功持久化后通知 | 该 CAS 保护一个调度任务，不保护业务事项或两边的一致性；create 每次生成新 id，没有调用方业务幂等键 |
| 跨会话调度 | [tools:408–534](../../../vendor/dsh/packages/schedule/schedule/src/tools.ts#L408-L534)模型工具绑定 agent.session；[Host list/catalog:289–311](../../../vendor/dsh/packages/schedule/schedule/src/index.ts#L289-L311)可显式读原绑定或全 catalog；update/delete 接收 sessionId/id | Session B 的模型不能直接修改 A 的提醒；Host 可按原绑定调用现成操作，但事项→任务/原 Session 的映射及权限职责仍需设计。原 Session 与处理 Session 不能暗中视为相同 |
| 可靠投递与完成 | [schedule README:63–71、153–157](../../../vendor/dsh/packages/schedule/schedule/README.md#L63-L157)恢复原 Session、followup 入 inbox、flush 后保存 receipt；两次持久写不原子，崩溃可能重复 | receipt 是耐久入队，不是模型执行/CEO 看见/业务完成；无自动重试 timer，Host 要运行；delete 不撤回已排队消息，也删除 saved history |
| 更新成功读回 | [desk-core:64–79、308–320](../../../packages/dsh-smart-assistant/src/client/desk-core.ts#L64-L320)pending 在 generatedAt 晚于发送时间时结算 | [技能:206–210](../../../packages/dsh-smart-assistant/presets/assistant/skills/desk-refresh/SKILL.md#L206-L210)要求内容不变也重写时间戳；无关刷新也能结算，不能证明同事项同次操作成功 |
| 条件化经验 | [self-reflection:14–29、43–52](../../../packages/dsh-smart-assistant/presets/assistant/skills/self-reflection/SKILL.md#L14-L52)要求证据、提炼、路由；[knowledge:54–125](../../../packages/dsh-smart-assistant/src/host/knowledge-room.ts#L54-L125)支持来源、草稿/批准；[learn:313–397](../../../packages/dsh-smart-assistant/src/agent/learn/index.ts#L313-L397)brief 给 asks/工具计数/相关记录 | brief 不是完整经营结果摘要；条件、反例可写进正文，但没有保证条件适用/撤回正确的模型行为证据；技能 load 次数也不是经验正确迁移 |

[action-plan:30–46](../../../packages/dsh-smart-assistant/presets/assistant/skills/action-plan/SKILL.md#L30-L46)规定计划存 draft 并以相同标题重写；[Host writePage:69–91](../../../packages/dsh-smart-assistant/src/host/knowledge-room.ts#L69-L91)接受显式 id，但模型 [save_page:458–471](../../../packages/dsh-smart-assistant/src/agent/learn/index.ts#L458-L471)没有转发该 id，每次默认生成 id。因此“同标题＝更新同页”不能凭技能规范视为已保证。

[模型 memory item:154–164](../../../packages/dsh-smart-assistant/src/agent/tool-memory/index.ts#L154-L164)不把 record.source 投影到返回条目，render 也主要呈现 text/id/why；可存来源不等于后续模型靠 list/recall 已拿到完整来源。需在拟议链中明确原始证据读取入口。

## 3. 官方实践检索及获取限制

已用 web_search 定位以下官方资料，并对主域执行 web_fetch；均报 `resolves to a non-public IP address`，包括 Microsoft、AWS、OpenAI、SQLite 与官方 GitHub 源页。未绕过网络限制，未读取全文；检索命中只作后续阅读线索，不作为本报告已经核实的技术结论。

| 官方阅读线索 | 应回答的约束；当前获取状态 |
|---|---|
| [Azure Event Sourcing](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing) | 是否值得为追溯引入完整事件流；投影、并发、重放及模式演进成本。全文 blocked；不引用未读段落、不由模式名字决定架构 |
| [AWS Making retries safe with idempotent APIs](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-apis/) | 相同请求身份的重试与不同业务意图怎样区分；同键不同内容、晚到重试。全文 blocked |
| [AWS EventBridge Scheduler](https://docs.aws.amazon.com/scheduler/latest/UserGuide/what-is-scheduler.html) | at-least-once 投递约束及接收方去重。全文 blocked；本仓重复窗口已有 pin 源码/README 依据，不借云产品性质替代 DSH 事实 |
| [OpenAI evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices) | 场景数据、边界/负例、人判校准与持续回归。全文 blocked；最低验证先按本仓 testing 合同设计 |
| [SQLite transaction](https://www.sqlite.org/lang_transaction.html) | 单写事务与并发写限制，是否比手写多文件协议更小。全文 blocked，本轮不裁决增加数据库 |

以下候选由已经核实的本仓断点推导，属于设计建议；官方原文的获取限制不妨碍形成可检验候选，但不能称外部文档已验证它。

## 4. 最小候选与 Interface 职责（尚未实现）

| 候选 | 可回答什么 | 代价/失败边界与建议 |
|---|---|---|
| A：继续由模型直写计划/桌面，约定一个处理 Session | 很快演示单会话处理 | 对多 Session 输入、重复投递、原排程归属与并发无确定保证；只能作对照，不宜当已确认统一账本的交付方案 |
| B：一个 Host Module 拥有事项命令、状态、来源与排程协调，模型提交提议 | 确定身份/修订/幂等/回执，客户端和模型消费同一权威状态；复用现有 schedule Module | **推荐先做有界设计/原型**；不是新通用平台。物理存储仍比较单文件序列化与事务载体，先证明两个 Session 更新不会丢失 |
| C：全面 event sourcing/CQRS、可重放投影、通用经验引擎 | 更强历史重建与复杂多消费者 | 当前缺明确消费者/恢复要求支持其额外复杂度；先延后，不把追溯需求直接升级为全架构 |

B 的 external seam 放在 Host 经营事项 Module；工具/Remote 为 Consumers，直接文件编辑不能绕过同一提交校验。下面是行为职责，不是承诺已有方法名/新工具清单：

1. **读取**：返回事项身份、当前已确认状态/修订、证据出处与未解决冲突；读取错误不返回伪空集合。
2. **接收更新**：明确新事项/指定旧事项；持有稳定 operation identity、observed revision、原始来源定位与内容。重试沿用同 identity；同 identity 不同内容拒绝，不能静默复用旧回执。
3. **认领与冲突**：同名或相似只提供候选；模糊时要求明确认领，不自动 merge。指定事项但过期修订先返回 conflict，不由最后写入取胜；处理冲突后是新操作。
4. **提交**：一个 writer owner 在一次序列化操作内检查 revision/idempotency，保存更新及可查询结果；只在持久成功后发布状态。主卡选择的第一切片候选限定单 Host writer 独占账本；实现须建立独占前置检查，拒绝第二 writer，而不能只用进程 FIFO。具体锁/事务载体尚未选定。
5. **排程协调**：保存 matter→schedule id＋original Session 的关系，调用既有 Host create/update/delete；暴露 pending/failed/confirmed，而非先报告 desk/schedule 已一致。
6. **读回**：客户端按 matter/operation/revision 查询已提交结果；模型回合结束、业务提交、排程同步、UI 读回分别记录。展示新状态可以成立而排程待补，不能用全局 freshness 冒充全部成功。
7. **经验**：保留判断、条件、反例、结果、纠正及来源；先复用现有 memory/knowledge/skill 治理。一次事项成功不自动提炼永久规则，条件化使用仍由独立模型变式评估。

不要求第一切片把历史全量迁移、外部数据接入、任意事项自动合并或所有经验类型一并实现。

## 5. 时间语义与必须解释的提交窗口

**期限、预测与核对点分开。** contractDue 是约定期限，customer forecast 是客户/财务预计，nextCheck 是助手下一核对点，schedule target 是一次实际提醒时点。新会话只纠正预测，不自动改约定期限或核对点；明确重约承诺/改变核对点，或已确认的提醒选择规则发生变化后，才协调对应原 Session 的 schedule。当前 desk 的单个 due 不足以证明已经区分这些含义；最小事项 Interface 要保留各字段依据，不由模型把新日期直接覆盖旧 due。

**账本与 schedule 分开持久化。** 必须能重启读出“经营变更已提交、调度尚未同步”并继续协调；事务回滚整件经营事不能抹去本人已经确认的决定。可候选在同一账本提交里存 desired scheduling intent，再有界核对实际任务；这只是局部恢复记录，不预建通用事件总线。

**create 与映射保存分开。** schedule.create 自造随机 id，若创建后丢响应/映射保存失败，直接重试可能生成第二条。当前没有 exact-once create，不能靠 list-then-create 的提示规范遮盖窗口。仅以 title 认任务也可能错并。

父会话补充的有界候选（未实现/未实测）：单 Host writer 先在账本持久保存唯一提醒意图 token、事项、原 Session 与期望内容；create 调用前持久标成“已发起、结果待核”，只调用一次。token 放在保留的 prompt 关联段，恢复经 [catalog:303–311](../../../vendor/dsh/packages/schedule/schedule/src/index.ts#L303-L311)同时查 active/inactive，精确核对 token、原 Session 和期望任务。唯一匹配才保存绑定；零/多匹配、prompt 被外部修改或任务已删除时保持 uncertain，禁止自动再 create，向本人显示失去自动恢复的原因。“已发起”保存后但 create 调用前崩溃也可零匹配而停在 uncertain。明确重新规划须为新操作，保留旧意图和潜在旧任务风险，不把它说成原提醒已取消或新任务绝无重复。此候选牺牲不确定窗口的自动完成以避免静默重建，既不保证每次创建成功，也不保证未授权外部写者不复制 token；它仍需真实持久故障证据。

**删除和延后有已经排队的旧提醒。** 调度 delete 不撤回 inbox 消息。接收时应读取最新事项状态、核对 occurrence/当前 due，已完成、旧期限或已处理 occurrence 时静默；候选去重键要对应 schedule identity＋occurrence，不仅是新 messageId。否则重复投递会变成重复模型动作/催办。

## 6. 验证路线：已有 Owner 与缺失资产

路线 owner 是 [testing:16–29、42–49、70–86](../../../docs/testing.md#L16-L86)。下表命令是未来复跑建议，**本轮全部未执行**；环境前提、数据与判读先定清。

| 行为 | 已有资产 Owner／复跑前提与命令 | 能证明／最低新增证据与不能证明 |
|---|---|---|
| 明确 id 接续、同名/改名 | [Room spec](../../../packages/dsh-smart-assistant/tests/domain/room.spec.ts)、[thread spec](../../../packages/dsh-smart-assistant/tests/domain/thread.spec.ts)；已装依赖，`pnpm test:domain` | 现有存储/词汇行为；**缺**事项匹配/显式认领 fixture 与独立预期，不证明模型知道该接哪件事 |
| 两 Session 并发、旧 revision、重复 operation | [research update](../../../packages/dsh-smart-assistant/src/host/research-room.ts#L152-L165)与 [atomic writer](../../../packages/dsh-smart-assistant/src/domain/home/atomic-write.ts#L20-L34)为待验证对象；未来新 Host spec 归 `tests/host/`，`pnpm test:host` | **未建**经营 CAS/幂等 owner；用真实临时文件、可控交错检查同修订只一提交、冲突不覆盖、重试只一效果、同键异内容拒绝；不能用手搭替身宣布产品一致性 |
| 来源追溯及来源不可读 | [knowledge-write spec](../../../packages/dsh-smart-assistant/tests/host/knowledge-write.spec.ts)、[skill-file spec](../../../packages/dsh-smart-assistant/tests/domain/skill-file.spec.ts)；`pnpm test:host`／`pnpm test:domain` | 已有来源/存储合同；**缺**matter→Session/event 定位、归档/继承/损坏来源 fixture；源不可读须明示，不能补造证据 |
| 排程 CAS/FIFO、延期/完成 | pin 的 [update-service spec](../../../vendor/dsh/packages/schedule/schedule/tests/update-service.spec.ts)、[update-restart spec](../../../vendor/dsh/packages/schedule/schedule/tests/update-restart.spec.ts)、[serial-delivery spec](../../../vendor/dsh/packages/schedule/schedule/tests/serial-delivery.spec.ts) | 上游调度层资产已在；本仓 `pnpm test` 不等于执行它们。vendor 聚焦执行入口需接手时核实；**缺**本仓事项—schedule 组合/协调 spec，尤其跨 Session 与创建后保存失败 |
| 重启/重复提醒/完成后旧消息 | pin 的 [delivery spec](../../../vendor/dsh/packages/schedule/schedule/tests/delivery.spec.ts)、[recovery spec](../../../vendor/dsh/packages/schedule/schedule/tests/recovery.spec.ts)；本仓 side effect 读法 [usage-report](../../../dev/reports/usage-report.mjs) `sessionLogs/readEvents` | 静态有 delivery/recovery 测试；**缺**经营接收去重/当前状态复核资产、可复跑命令及留存位置；投递历史不能证明模型执行，删除后历史消失需另保经营回执 |
| 模型主动建议与静默 | [tasks:19–102](../../../dev/eval/tasks.mjs#L19-L102)已有行为任务、[判读核](../../../dev/eval/checks.mjs)；隔离 home/profile/workspace/preset、代码与构建基线明确，`pnpm build` → `pnpm test:composition` → `pnpm eval --only <新增 task-id>` | **task-id 未建**，不得填成已跑命令；固定截止时点，给有变化/无变化、未知进展/完成证据、矛盾日期；读取实际工具/文件/排程副作用，不判助手自报“我已记住” |
| 同事项成功读回 | [client-desk-core spec](../../../packages/dsh-smart-assistant/tests/client/client-desk-core.spec.ts)、[client-desk-io spec](../../../packages/dsh-smart-assistant/tests/client/client-desk-io.spec.ts)；`pnpm test`，UI 改动再跑两场景 `pnpm web-expected` | 已有 Session slice/读取/回调窄合同；**缺**operation/revision 读回 fixture、无关刷新与旧修订反例；React shim、DOM 结构不证明真导航或真输入，几何/交互耐久 owner 仍未建 |
| 条件化经验与撤回 | [knowledge-retrieval spec](../../../packages/dsh-smart-assistant/tests/host/knowledge-retrieval.spec.ts)、[skill-proposals spec](../../../packages/dsh-smart-assistant/tests/host/skill-proposals.spec.ts)；`pnpm test:host`；模型链同上 | 当前证明检索/治理，**缺**同条件复用、单条件改变、未见病例、纠正/撤回的模型任务；批准不等于正确应用，load count 不等于质量 |
| preset/Host seam 实际装载 | [preset-composition spec](../../../packages/dsh-smart-assistant/tests/composition/preset-composition.spec.ts)；`pnpm build` → `pnpm test:composition`；新行需注册/撤销资产 | 本包真 Loader 组合，不证明 vendor 完整 boot；新增 Host 接口与模型工具是否进入请求还须对应模型/转录证据，不用 hand-built ctx.plugin 代替装载 |
| 本人净收益 | 同材料同截止时点的现有版/候选，真实观察输入次数、重复重讲、误催与处理动作，并附技术未过项 | **没有当前体验结果 owner/资产**；由主卡指定记录位置并邀请本人判断。“有用”的模拟比较不证明真人采纳或长期经营收益 |

现有 [desk-refresh-loop](../../../dev/eval/tasks.mjs#L86-L100)只检查技能加载、文件写入及基本 shape，不核同事项更新、排程联动或经验迁移；[continuity-from-home](../../../dev/eval/tasks.mjs#L57-L64)只核房间使用与回答正则，不是经营跨会话验收。

## 7. 最低必要情景与判定

使用明确标注模拟材料：A＝一笔有约定回款日的承诺，B＝同客户相似名称但不同订单；先写独立预期，再走现有版与候选，不给候选更多信息。

1. Session 甲交代 A，乙明确引用 A 补进展；改名后仍接 A，只有标题相似时不合并 B；模糊输入保留待认领。
2. 两个 Session 从同一旧 revision 更新 A：一条提交，另一条冲突保留；同 operation 重投不多记一次，旧材料不把日期/状态倒回。
3. 乙只纠正 A 的预计回款日：保存新预测及来源，不自动修改 contractDue/nextCheck/原提醒；重约承诺与改变核对点分别处理，只对明确提醒意图协调正确 original Session。打断于“账本提交后”“已发起保存后但 create 前”“create 后”“update 后”：唯一关联可重绑，零/多匹配、关联段被改或任务消失须可见 uncertain，不自动再 create；静默重建/伪成功/吞不确定性才是失败。显式重规划保留旧意图与潜在任务风险。
4. 无新进展只说“尚未收到结果”；完成证据后取消未来提醒，旧 inbox 消息与重复 occurrence 不再催；入队成功但模型失败与真正处理完成分别记。
5. 同次操作正确读回；让 B 刷新、空刷新或旧 revision 到达，均不能替 A 宣告成功。写/读/排程失败要指明哪个环节，允许可解释重试。
6. 从 A 提炼一个带条件/来源的候选经验；相同条件、改变一个关键条件、明确纠正/撤回及未见病例分别测试。不要求强行学出一条经验。

以上至少需要独立预期、真实持久副作用、故障窗口与负例；确定性协议先证伪，模型任务再看守约，本人最后判断是否减负。没有新增资产前仅能说验证方案已形成，不能写 pass。

## 8. 仍未解的事实

- 权威经营事项最小对象及与现有 plan/thread 的映射尚未定，不能把 research thread 直接改称经营事项就宣布完成。
- 主卡第一切片候选限定单 Host writer 独占账本；尚无独占前置检查与第二 writer 拒绝证据，进程 FIFO 不够。具体事务/锁载体与恢复留存仍待比较。
- matter→schedule 创建关联怎样跨崩溃可靠保留、删除后经营回执如何留存、已归档来源与 original Session 投递如何处理，尚无本仓实现/证据。
- 原始来源 event 选择、继承事件认领、权限与材料纠正规则仍需形成业务判断；SessionId 本身不等于证据已核实。
- 何种变化必须提醒、何时静默、经验何时要本人确认，属于主卡范围/产品判断，不能由技术默认值替代。
- 官方全文获取受阻；上述 URL 为待补一手阅读，不宣称已经对照官方实践完成技术选型。

主卡可据此收窄第一切片并明确接口/验证申请；当前结论支持“继续有界设计与证据原型”，不支持“完整闭环已可交付”。本文件的消费者引用与 research 索引由父代理维护，本轮遵守仅写本文件的授权范围。
