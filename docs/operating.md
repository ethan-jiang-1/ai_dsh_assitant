# 经营账本与桌面投影（契约 · 唯一权威 · 只写现在）

> 本插件运行**两个持久化面**：working folder（`<dshHome>/assistant`，四房间——契约唯一权威 = [`home.md`](home.md)）
> 与**权威经营账本**（独立 `<dshHome>/assistant-operating`，非四房间、无摘要与 curate 检查面——契约唯一权威 = 本文件）。
> 身份名（行 id、wire 名、服务键）以 [`identity.md`](identity.md) 为唯一权威；本文件写语义与边界，
> 改名代价与登记义务见彼处。

## 一、账本服务（host 行 `assistant-operating-ledger`）

- **服务键** `ctx.assistantOperatingLedger`（identity §一 第 3 行）。业务纯核 = `src/domain/operating/ledger.ts`
  （事项/操作/回执/待认领的词汇与归约，不 import DSH 运行时）；投影渲染纯核 = `src/domain/operating/projection.ts`。
- **存储形状**：`<dataDir>/ledger.json` 单状态文件，原子持久（temp → fsync → rename）。
  缺文件 = 空账本；存在但读不出 v1 形状 = **fail loud**（拒绝当空账本——静默清零等于数据事故）。
- **单 writer**：`<dataDir>/writer.lock` 记 `{hostname, pid, acquiredAt}`。认领是**惰性**的——boot 无副作用，
  第一次**变更操作**才抢锁，同 home 的 web 实例与 one-shot 任务因此可并存到有人写为止。
  活着的持锁者在场时拒绝第二 writer（本进程内与跨进程同判）；同机死进程的残锁原子接管；
  跨机持锁与不可读锁一律 fail closed。dispose 释放本进程认领。
- **读路径恒重读盘上状态**：任何进程写入之后，本实例的读取都看到最新持久事实。
- 每次状态变更是一个**操作**：调用方带身份与 `operationId`（幂等键——同键同内容重试=复用原回执，
  同键异内容=拒绝），返回**持久回执**；版本冲突回报告当前 revision，重读后以**新** operationId 表达新判断。

## 二、模型工具（`assistant_operating`，11 动作）

| 动作 | 语义 | 权限档 |
|---|---|---|
| `desk` | 列全部事项与待认领片段 | 读 |
| `read` | 按 `matter_id` 读一个事项全文，或按 `operation_id` 读一张回执 | 读 |
| `entrust` | 本人委托新事项（逐字引用原话） | 明确指令 |
| `report` | 已知事项的普通进展（材料/预测），**不动**承诺期限与核对点 | 常规（自动留存） |
| `revise` | 确认后的变更（标题/摘要/负责人/承诺期限/核对点），需 observed revision | 明确指令 |
| `propose` | 自己推断出的重大变化（改期/核对点/完成/放弃）挂提案，**不直接生效** | 提案通道 |
| `confirm` | 应用一张 pending 提案，仅限本人明确确认后 | 明确指令 |
| `note` | 留存没点名事项的片段（**归属永不按标题猜**） | 常规（进待认领） |
| `claim` | 把待认领片段挂到事项，需明确依据 | 明确指令 |
| `complete` | 完成一个事项——必须附**逐字到达证据**（"应该已经付了"不算证据） | 明确指令 |
| `reopen` | 纠正错误关联的完成，需理由 | 明确指令 |

- **权限三分**（与工具描述同源）：普通进展自动留存；确认性变化只走本人明确指示；推断的重大变化只走提案。
- **溯源**：session id 由工具盖（模型不可伪造）；无逐字依据的完成在工具边界拒绝。
- 提示词段 `assistant:operating-brief`（order 400，紧跟家手册的稳定指令带）把这条通道介绍进模型可见面：
  没人介绍的决策通道会被对话散文替代。段的正文 = `src/agent/operating-brief/index.ts`。

## 三、桌面投影（host 行 `assistant-desk-projection` + client 读回链）

**HTTP 面**（`src/host/desk-projection/` + `desk-projection-download.ts`）：

- `GET api/assistant/desk-projection`，固定只读，`requestBody: buffered`：
  **有 `ledger.json` 时优先读真账本并即时渲染 v2 投影**（永不持久第二份可写真相；夹具文件压不过权威账本）；
  无账本时回退固定 `desk-projection.json` 模拟输入（K1/K2 场景）。两者都缺 = 404。
- 不创建目录/文件、不读 agent working folder、不接受 query（带 query = 400）与 path 参数、不提供写入；
  业务 schema 的校验在客户端解析器，不在下载器。
- 认证与 Host/Origin 检查由 Connection 物理 carrier 承接；响应 `no-store` + `nosniff`；
  完整文件 byte cap 默认 1 MiB（`maxProjectionBytes`）。超限 413；无效 UTF-8/JSON 422；
  结构错（非 v1 账本）422 且**绝不静默回退**；其他 I/O 500。

**客户端读回**（`src/client/projection-reader.ts` / `operating-projection.ts` / `projection-lifecycle.ts` / `projection-panel.ts`）：

- URL 用 document-relative `api/assistant/desk-projection`；同源 cookie、不复制 launch token、
  不接受跨源 base 或重定向。
- 代际与请求身份阻止刷新替换、断连或 dispose 后的迟到结果发布；dispose 撤销订阅并取消请求。
  最后成功 JSON 在断连/失败时保留并**标陈旧**；HTTP 缺失/认证/拒绝/损坏/超限分别进入状态，错误体不当数据。
- 解析器收 **v1/v2 双信封**（`schemaVersion: 1|2`）：共同约束非空 `ledgerId`、非负安全整数 `revision`、
  唯一事项 `id`、标题、`active/completed` 状态、summary 与 evidence 集合——每条证据须有唯一 id、
  Session/event 定位和 quote；空证据表达未知，不推断来源存在；`fixture` 若提供必须为 boolean；
  额外 envelope 字段不进入返回值；不兼容版本或畸形身份/证据抛错，**不覆盖**最后有效内容。
  v2 的 reminders 通道是**恒空占位**（V4/V5 提醒协调落地前的诚实空态）。
- 生命周期绑定经主区 inject 的 `hooks.projection` 暴露为 `useProjection`：组件零网络/零订阅；
  fiber 卸载取消请求/撤销订阅，Slot 重挂复用该源。宽主区列表/详情双栏，窄容器单 pane；
  选择只保存在 Slot view store。`ready` = 下载已通过解析，**不**表示持久业务操作成功。

**与三室面板的分工（两份"桌面"文件，别混）**：全局经营桌面读**独立 Host 固定投影**（本节）；
会话侧三室面板读 working folder 根的 `.desk/state.json`（[`home.md`](home.md) §五）。

## 四、验证入口（keyless 最低证据）

| 面 | 命令 |
|---|---|
| 账本服务（单 writer/幂等/权限通道） | `pnpm --filter dsh-smart-assistant exec vitest run tests/host/operating-ledger.spec.ts` |
| 投影下载（字节/错误/认证/生命周期） | `pnpm build` → `pnpm test:host`（`tests/host/desk-projection-download.spec.ts`）+ `pnpm --filter dsh-smart-assistant exec vitest run tests/composition/desk-projection-lifecycle.spec.mjs` |
| 客户端读回/解析/面板 | `pnpm --filter dsh-smart-assistant exec vitest run tests/client/projection-reader.spec.ts tests/client/operating-projection.spec.ts tests/client/projection-lifecycle.spec.ts tests/client/projection-panel.spec.ts` |
| 真实 HTTP 探针（认证/cookie/拒绝形态） | `node dev/probes/web/desk-projection-download.mjs '<url>' dev/fixtures/desk-projection/desk-projection.json` |

分层与各层能证明什么 = [`testing.md`](testing.md)；本包内路径均为包内相对（= `packages/dsh-smart-assistant/tests/…`）。
