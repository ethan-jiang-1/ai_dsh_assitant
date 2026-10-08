# 预算强制（治理环切片 1h）

日期：2026-09-24 · 状态：**implemented**
依据：三线合流提案 `notes/archived/2026-09-24-tri-line-synthesis.md` 阶段 1 切片 1h；
R1 §6-1（借用 1：engramory 的"确定性预算强制"——"用 DSH 的 `ctx.tools.guard()` 单调否决
把摘要/索引预算从纪律升级为写入原语层的拒绝（拒绝而非请求）"）。

## 问题（含一只亲验揪出的潜伏死代码）

预算压力此前只是**报告**：curate 的 `digest-over-budget` finding 本该在超预算时报——但
亲验发现它是**死代码**：`DigestResult.bytes` 数的是**截断后**文本（`renderDigest` 的
push 循环保证 used ≤ maxBytes，digest.ts:77-86），恒不超预算，所以
`digestBytes > digestMaxBytes` 永假。真实压力信号是 `truncated: boolean`（预算把摘要
截短了——被截掉的记忆对每个会话不可见）。**判决写在错误的判据上，门就从来没关上过。**

## 决定

1. **判据修正**：`CurationInput` 增 `digestTruncated`；finding 改按它触发，消息点名
   "records below the cut are invisible in every session"（被截=不可见，比"超了 N 字节"
   更接近要害）。`counts.digestBytes/digestMaxBytes` 保留（数字行仍有信息量）。
2. **写入原语层拒绝**（engramory 语义）：`saveMemory` 在**纯新增**（无 `supersedes`）且
   当前 digest 已被截短时**拒绝写入**，错误消息给出出路（forget 退役 / supersedes 替换
   / curate 看压力）。supersede 与 forget 保持开放——它们是减压动作。
3. **落点在服务而非 `ctx.tools.guard()`（登记偏离）**：guard 是工具执行层的策略原语
   （monotonic、逐 tool call 评估）；我们的单写者纪律说**写入语义归服务**——服务层拒绝
   对所有调用方生效（工具、未来 UI、测试），同效且少一层。约束（拒绝而非请求）→
   适配（服务层 throw）→ 证据（单测 + 既有战役证明服务 throw 会以工具错误面浮给模型，
   如无理由 drop 被拒）。

## 输掉的方案

| 输掉的 | 为什么输 |
|---|---|
| `ctx.tools.guard()` 注册拒绝 | 工具层评估挡不住非工具调用方；单写者纪律下写入语义归服务（见决定 3） |
| 超预算时静默截断 + 只报 finding（原状） | 死代码证明这条路连报都没报对；且"请求式"预算在压力下会被继续写穿 |
| 拒绝一切写入 | supersede/forget 是减压动作，拒绝它们会死锁（只能加不能减） |

## 证据

- `tests/agent/digest-budget.spec.ts`（2 测试：小预算灌满到截断 → 纯新增被拒（消息含出路）、
  supersede 仍开放、压力在场时 curate 报 finding、forget 后 finding 消；
  常规预算下自由写零误伤）。`tests/domain/health.spec.ts` 的判据改 `digestTruncated`。
  **110/110 全绿**（`pnpm test`）。
- 机械门禁：`pnpm typecheck` && `pnpm build` && `pnpm verify` 16/16。
- live：拒绝路径的错误面浮出依赖"服务 throw → 工具错误"的既有机制（战役 C 的无理由
  drop 拒绝已实证该通路）；本切片纯服务行为由单测覆盖，不单独付费跑 live。
