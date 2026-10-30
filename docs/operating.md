# 经营账本与桌面投影（契约 · 唯一权威 · 只写现在）

> 本插件运行**两个持久化面**：working folder（`<dshHome>/assistant`，四房间——契约唯一权威 = [`home.md`](home.md)）
> 与**权威经营账本**（独立 `<dshHome>/assistant-operating`，非四房间、无摘要与 curate 检查面——契约唯一权威 = 本文件）。
> 身份名（行 id、wire 名、服务键）以 [`identity.md`](identity.md) 为唯一权威；本文件写语义与边界，
> 改名代价与登记义务见彼处。

## 一、账本服务（host 行 `assistant-operating-ledger`）

- **服务键** `ctx.assistantOperatingLedger`（identity §一 第 3 行）。业务纯核 = `src/domain/operating/ledger.ts`
  （事项/操作/回执/待认领的词汇与归约，不 import DSH 运行时）；投影渲染纯核 = `src/domain/operating/projection.ts`。
- **存储形状**：`<dataDir>/ledger.json` 单状态文件，原子持久（temp → fsync → rename）；
  `<dataDir>/operations-archive.jsonl` 是只追加的完整操作历史。`ledger.json` 只留最近 256 条操作
  （`keepOperations` 可配）加 `operationCount`（累计操作数）；超过 2× 窗口时把最旧的操作移进归档，
  归档 fsync 成功后才写缩小的状态。缺文件 = 空账本；存在但读不出 v1 形状 = **fail loud**
  （拒绝当空账本——静默清零等于数据事故）。旧 ledger 没有 `operationCount` 时按当前操作数回填。
- **重试与读回跨归档**：`submitOperation` 先按 `operationId` 查状态、再查归档，命中相同内容复用原回执，
  不同内容拒绝为 `operation-content-mismatch`，不会把已归档的操作再应用一次；`readOperation` /
  `readOperationRecord` / `readMatterSnapshot` 合并状态与归档（状态副本优先）。
  归档里的坏行由解析器计数跳过，不让一次撕裂的 append 把全部历史回执变成不可读。归档按 `operationId` 建索引；整文件读取有 256 MiB 默认上限（`maxArchiveBytes` 可配），超限 fail loud，提示导出/轮转。
- **单 writer**：`<dataDir>/writer.lock` 记 `{hostname, pid, acquiredAt, cwd}`。认领是**惰性**的——boot 无副作用，
  第一次**变更操作**才抢锁，同 home 的 web 实例与 one-shot 任务因此可并存到有人写为止。
  活着的持锁者在场时拒绝第二 writer（本进程内与跨进程同判）；同机死进程的残锁原子接管，
  接管后回读确认锁里是自己，输给并发接管者就退让；锁带 POSIX 进程启动时间与 30s 心跳，心跳超过 15 分钟或启动时间不匹配按 PID 复用/死锁接管；dispose 只删除自己写下的锁（锁已被别人接管时不删）。
  跨机持锁与不可读锁一律 fail closed。状态写入用唯一 sibling temp，不共享固定 `.tmp` 名。
- **拒绝必须可处置**：锁在持锁实例活着的整段时间里有效（写一次之后闲置的实例也继续持有），所以拒绝
  报告要点名 host / pid / cwd / 取得时刻与锁文件路径，并给唯一安全恢复——确认该进程空闲后
  `kill -TERM <pid>`，死持锁者在**下一次写入**时被接管；**不要在持锁者可能仍会写时删锁文件**
  （两个写者并存会丢更新）。共用同一 home 的会写账本的实验/复跑要用隔离 home，否则先写的实例
  会把 live 实例的写挡到它退出为止。
- **读路径恒重读盘上状态**：任何进程写入之后，本实例的读取都看到最新持久事实。
- 每次状态变更是一个**操作**：调用方带身份与 `operationId`（幂等键——同键同内容重试=复用原回执，
  同键异内容=拒绝），返回**持久回执**；版本冲突回报告当前 revision，重读后以**新** operationId 表达新判断。

## 二、模型工具（`assistant_operating`，13 动作）

| 动作 | 语义 | 权限档 |
|---|---|---|
| `desk` | 列全部事项（含每件事的 **pending 提案**：id、所属事项、将改成什么、何时提出）与待认领片段 | 读 |
| `read` | 按 `matter_id` 读事项当前字段、委托来源、材料、完整提案与按时间排序的操作回执/来源；或按 `operation_id` 读一张回执 | 读 |
| `entrust` | 本人委托新事项（逐字引用原话） | 明确指令 |
| `report` | 已知事项的普通进展（材料/预测），**不动**承诺期限与核对点 | 常规（自动留存） |
| `revise` | 确认后的变更（标题/摘要/负责人/承诺期限/核对点），需 observed revision | 明确指令 |
| `propose` | 自己推断出的重大变化（改期/核对点/完成/放弃）挂提案，**不直接生效** | 提案通道 |
| `confirm` | 应用一张 pending 提案，仅限本人明确确认后 | 明确指令 |
| `reject` | 本人明确拒绝后关闭一张 pending 提案；**不改**已确认期限、核对点或事项 revision，留下持久 `proposal-rejected` 回执 | 明确指令 |
| `note` | 留存没点名事项的片段（**归属永不按标题猜**） | 常规（进待认领） |
| `claim` | 把待认领片段挂到事项，需明确依据 | 明确指令 |
| `discard` | 本人判为噪音的片段**离开待认领通道**，理由留在账本（**终态，不是删除**——片段自己的原话仍留在当初 `note` 的引用里；空理由在域层拒绝：没理由就不移除） | 明确指令 |
| `complete` | 完成一个事项——必须附**逐字到达证据**（"应该已经付了"不算证据）；同回合盖下**完成时刻**（第四种业务时间，账本自己盖，模型不可自报） | 明确指令 |
| `reopen` | 纠正错误关联的完成，需理由；**撤销完成时刻**（同一次纠正，详情不会同时说「在做」和「完成于 …」） | 明确指令 |

- **权限三分**（与工具描述同源）：普通进展自动留存；确认性变化只走本人明确指示；推断的重大变化只走提案。
- **溯源**：session id 由工具盖（模型不可伪造）；无逐字依据的完成在工具边界拒绝。`read matter_id` 从同一次 ledger 状态读取中返回摘要、负责人、状态、修订、四种时间及预测来源；初始委托引用、材料、完整提案变更与来源、事项关联操作及其回执按提交时间排列。操作历史严格限定到该事项。没有独立记录的决定依据不补造；没有初始委托 operation 时 `entrust` 字段省略。
- **四种业务时间**（`MatterTimes`，各自独立、互不移动）：承诺期限 `promisedDeadline`、客户预测 `forecastAt`（带来源）、下一核对点 `nextCheckpoint`、完成时刻 `completedAt`（完成时写入、reopen 时清掉）。投影把四者都带给客户端，详情逐条渲染。
- 提示词段 `assistant:operating-brief`（order 400，紧跟家手册的稳定指令带）把这条通道介绍进模型可见面：
  没人介绍的决策通道会被对话散文替代。段的正文 = `src/agent/operating-brief/index.ts`。

## 三、桌面投影（host 行 `assistant-desk-projection` + client 读回链）

**HTTP 面**（`src/host/desk-projection/`，入口 `index.ts` + 路由核 `download.ts`）：

- `GET api/assistant/desk-projection`，固定只读，`requestBody: buffered`：
  **有 `ledger.json` 时优先读真账本并即时渲染 v2 投影**（永不持久第二份可写真相；夹具文件压不过权威账本）；
  无账本时默认 404；只有 `allowFixture: true` 才回退固定 `desk-projection.json` 模拟输入（评估/夹具场景）。
  夹具在真实 home 里不是权威，`assistant-data check` 会点名。
- 不创建目录/文件、不读 agent working folder、不接受 query（带 query = 400）与 path 参数、不提供写入；
  业务 schema 的校验在客户端解析器，不在下载器。
- v2 回执逐条带**操作语义**：`kind`（域层操作类型）与 `quote`（提交者当时的原话，可省）——桌面详情的
  「动作」段与流水视角据此渲染人类标签与依据行。二者是 additive 字段，不 bump envelope；Client 允许它们缺席，字段存在时保留原值。
- 认证与 Host/Origin 检查由 Connection 物理 carrier 承接；响应 `no-store` + `nosniff`；
  完整文件 byte cap 默认 8 MiB（`maxProjectionBytes`）。超限 413；无效 UTF-8/JSON 422；
  结构错（非 v1 账本）422 且**绝不静默回退**；其他 I/O 500。
- 投影 `revision` 取 `operationCount`（累计操作数，含已归档），因此压缩不会让版本回退；
  `receipts` 只含 `ledger.json` 的最近窗口，更早回执按 `operation_id` 走 `assistant_operating read` 读回。
  8 MiB 是给未压缩旧 home 的桥；正常 home 的 `ledger.json` 由压缩保持有界。

**客户端读回**（`src/client/projection/projection-reader.ts` / `projection/operating-projection.ts` / `projection/projection-lifecycle.ts` / `projection/projection-panel.ts`）：

- URL 用 document-relative `api/assistant/desk-projection`；同源 cookie、不复制 launch token、
  不接受跨源 base 或重定向。
- 代际与请求身份阻止刷新替换、断连或 dispose 后的迟到结果发布；dispose 撤销订阅并取消请求。
  最后成功 JSON 在断连/失败时保留并**标陈旧**；HTTP 缺失/认证/拒绝/损坏/超限分别进入状态，错误体不当数据。
- 解析器收 v1/v2 双信封；共同要求非空 `ledgerId`、非负安全整数 `revision`、唯一事项 `id`，并在出现时要求 `fixture` 为 boolean。
  v1 固定资料要求事项标题、`active/completed` 状态、summary 与 evidence；每条证据有唯一 id、Session/event 定位和 quote。
  v2 要求事项负责人、正整数事项 revision、四种可选业务时间、唯一 evidence/proposal id 与合法提案状态；evidence 以
  `id/sessionId/note` 为必填，event、quote、receivedAt 可选。空 evidence 表示没有已知依据，不推断来源存在。
  v2 的 `proposedAt/source` 与回执 `kind/quote` 可省略，以兼容较早信封；存在时按字段校验。`reminders` 必须是空数组，
  `generatedAt` 若出现必须为非空文本。v1 被提升为固定的 Client 事项视图（`responsible: ''`、`revision: 1`、
  `note = quote`、空时间/提案/回执/待认领）；v2 的 envelope-only 字段不进入解析结果。
  其它不兼容版本或畸形身份/证据抛错，**不覆盖**最后有效内容。
- 生命周期绑定经主区 inject 的 `hooks.projection` 暴露为 `useProjection`：组件零网络/零订阅；
  fiber 卸载取消请求/撤销订阅，Slot 重挂复用该源。attention、事项、流水三种 mode 读取同一投影；事项详情只列当前 Matter 的来源材料、提案和已载入回执，流水回执可按 `submittedAt` 继续分页归档。宽容器事项面为列表/详情双栏，窄容器为单 pane；各 mode 的列表偏移、事项 filter、选择与 pane 保存在 Slot view store，详情滚动不回写列表偏移。`ready` = 下载已通过解析，**不**表示持久业务操作成功。
- **处理路径回桌面**（`src/domain/desk/desk-process.ts`）：本人仍在绑定路径、绑定会话已停跑且轮次结束、
  无待处理交互、事项仍存在，且投影为**新鲜的 `ready`** 才可返回；必须读回绑定会话在绑定后提交、
  revision 不低于绑定时 observed revision 的 `committed` 回执，或与已拒绝提案匹配的 `proposal-rejected` 回执。
  绑定会话在绑定后为该事项创建的任一 pending 提案都**阻止返回**；已解决提案必须读回同会话、同事项、
  同 proposal id、匹配 `resolutionOperationId` 且状态一致的确认/拒绝回执。对话答复或普通 `proposed` 回执不算解决；
  提醒未同步只显示提示，不阻止返回。

**与记忆/知识/技能面板的分工（两个数据面，别混）**：全局经营桌面（唯一「桌面」）读**独立 Host 固定投影**（本节）；
记忆/知识/技能面板读独立 Host 行 `assistant-rooms` 的房间投影（working folder 四房间真值）——业务事项不进它
（[`home.md`](home.md) §五、[`architecture.md`](architecture.md) §七）。

## 四、验证入口（keyless 最低证据）

| 面 | 命令 |
|---|---|
| 账本服务（单 writer/幂等/权限通道） | `pnpm --filter dsh-smart-assistant exec vitest run tests/host/operating-ledger.spec.ts` |
| 投影下载（字节/错误/认证/生命周期） | `pnpm build` → `pnpm test:host`（`tests/host/desk-projection-download.spec.ts`）+ `pnpm --filter dsh-smart-assistant exec vitest run tests/composition/desk-projection-lifecycle.spec.mjs` |
| 客户端读回/解析/面板 | `pnpm --filter dsh-smart-assistant exec vitest run tests/client/projection-reader.spec.ts tests/client/operating-projection.spec.ts tests/client/projection-lifecycle.spec.ts tests/client/projection-panel.spec.ts` |
| 真实 HTTP 探针（认证/cookie/拒绝形态） | `node dev/probes/web/desk-projection-download.mjs '<url>' dev/fixtures/desk-projection/desk-projection.json` |

分层与各层能证明什么 = [`testing.md`](testing.md)；本包内路径均为包内相对（= `packages/dsh-smart-assistant/tests/…`）。


## 旧回执分页

投影只带最近窗口；更早回执由只读 `GET /api/assistant/operating-receipts?before=<ISO>&limit=<n>[&matterId=<id>]` 从 `ledger.json` 与 `operations-archive.jsonl` 分页，按 `submittedAt` 倒序，不新增业务状态。`matterId` 把一页限定在该事项的页内；返回的每条与投影里的回执同形（`sessionId`/`status`/`kind`/`quote` 齐全）。
