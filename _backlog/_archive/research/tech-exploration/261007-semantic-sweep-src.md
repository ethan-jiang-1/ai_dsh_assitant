# 产品源码高风险语义扫描（sdlc 06 §4 清单 × src/ 全树，2026-10-07）

喂 [BUG-003](../../fixed_bugs/BUG-003-eval-floor-red.md)～[BUG-007](../../fixed_bugs/BUG-007-concurrency-lifecycle-minors.md)。
方法：对抗性子代理逐读 `packages/dsh-smart-assistant/src/` 全部 54 文件 + 42 个 spec 按盲区比对；关键疑点 node 数值验证与 vendor 源码核对；承重发现（F1）由委派方亲验。清单改编自 DSH code-review skill 的高风险维度（错误/取消、生命周期、竞态、消费者泄漏、model-visible means logged、拒绝真的拒绝、派生状态、字节预算）。

## 中高级发现（喂 BUG-003～006）

- **F1｜高｜拒绝路径**：`src/agent/learn/index.ts:433` promote_page/deprecate_page case 直调 promotePage/deprecatePage 无任何校验——同会话模型可把自己写的 draft 翻 stable；`src/host/knowledge-room.ts:95` 注释断言「the only way a draft leaves the staging area is a person saying so」与此矛盾（writePage 不自促只挡一条路）；「you cannot approve your own page」是纯 prose。人面路径写 approvals.jsonl，模型路径零审计。测试盲区：knowledge-write.spec:63 只 pin promotePage 能通。
- **F2｜中｜model-visible + 拒绝**：知识页批准的活路径是可伪造提示词——`src/client/index.ts:91` 注释自述当前 pin 下直调必然失败；`src/client/desk-io.ts:508` 回退=普通 prompt（`[桌面]` 前缀明文可伪造）；`src/host/knowledge-approve-remote/index.ts:41` 声明的 `session-not-live`/`audit-not-durable` 错误码从未抛出、sessionId 不校验、头 docstring（审计入会话日志）与实现（approvals.jsonl）矛盾。测试盲区：tests/ 全树 grep `approvePage|assistantKnowledge` 零命中。
- **F3｜中｜拒绝+泄漏**：技能提案「手改 status」由模型代写——`src/client/desk-io.ts:369` askApproveProposal 发 prompt 让模型改 status 再 land_skill；`src/host/skills-room.ts:96` landSkill 门是真的但钥匙由模型按 prompt 代写；提案批准无审计。
- **F4｜中｜错误路径**：retireSkill 对 bundle 形技能 rm -rf 整目录（`src/host/skills-room.ts:236-248`），references/ 等附属文件永久删除——违反自身 JSDoc 与 skill-retirement.spec 头注释承诺的「nothing is deleted」；audit.ts:102 自认多文件 bundle 合法。测试用单文件技能且断言源目录消失（把 rm -rf 钉成预期）。
- **F5｜中｜字节预算（数值验证）**：`src/host/curate-digest.ts:37-49` rootFileSnapshot 按 UTF-16 码元 slice——3000 汉字 SOUL.md（9000 字节）对 4096 cap 返回全部 9000 字节 + 谎报的 truncated 标记；emoji 劈代理对。SOUL_BYTE_CAP=4096、MANUAL_BYTE_CAP=8192 同病；ingest.ts:142 的字节精确实现恰证明团队知道这类坑。测试盲区：root-files.spec 无超限用例。
- **F6｜中｜派生状态**：直调批准成功后无 settlePending/reload/desk-refresh（`src/client/desk-io.ts:491-507`，对照 prompt 路径带 DESK_REFRESH_STEP）——面板继续显示已批页为待审，再点 → RemoteError → catch 回退让模型 promote 已 stable 页（误导）。

## 低级发现（喂 BUG-006/007）

- **F7｜低**：`src/domain/home/digest.ts:204-222` 遗漏标记按 reserved pass 计数，pop 循环再删行不重算——「+N omitted」可少报、memoryIds 可含未显示 id（自述「never lies by omission」轻微违反）。
- **F8｜低**：`src/host/research-room.ts:152` updateThread 读改写无锁（并发追加 evidence 静默丢失）；`memory-room.ts:79` 预算闸 TOCTOU（curate 自愈）；`domain/home/room.ts:115` 同 id 并发写共用固定 tmp 名。
- **F9｜低**：`src/client/index.ts:153-171` sessions 订阅 unsubscribe 未持有、4s 定时器无拆卸（HMR 重物化残留）；`src/host/self-turns.ts:54` fired Map 无界。**host 面 ctx 生命周期本身干净**（无绕过 ctx.effect 的自建资源）。
- **F10｜低**：`src/host/knowledge-room.ts:29-39` writePage 的 import 专用 `id` 参数 + 无条件写 `status:'draft'`——重导入落在已批准页上抹掉审批；当前无产品级调用方（埋雷）。
- **F11｜低**：`src/client/desk-core.ts:308` settlePending 用浏览器时钟对比服务端 generatedAt——远端访问时钟偏差 → DATA GATE 误冻 2.5 分钟（本机部署不可踩）。
- **F12｜低**：`src/domain/knowledge/ingest.ts:141-144` body 截断后 sections 仍从全文计算。

## 维度收口（未发现的面）

维度 2 host 面未发现（ctx.on/子插件均随 context 清理）；**ov-shield 未发现绕过**（已对照 vendor `mcp-resources/src/tools.ts` 核实 server 参数 required）；四工具动词集除 memory/research 共享 `list`（各管各房间，不违反「不合并」纪律）外无消费者泄漏；digest 主体（CJK 字节、包装后预算）干净；desk 的 DATA GATE/stalled/回承设计总体扎实。
