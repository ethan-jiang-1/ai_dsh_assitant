日期：2026-10-27 · 状态：**implemented**

# 数据生命周期硬化（Phase 0 / Phase 1）

## 决定

FAQ 26 的体检确认落点已对齐：working folder 是用户可见的 U home 文件树，经营账本是独立的 home 文件账本，session 归宿主；**不迁 `ctx.storageDomain`**。硬化集中在生命周期，而不是换存储面。

- **用户可编辑的文件仍是权威。** 房间 frontmatter 只增可选字段；`Room.write` 保留本 build 不认识的字段；所有 home 写路径统一为「唯一 sibling temp → fsync → rename → 目录 fsync」，文件 0600、目录 0700；`SOUL.md`/`AGENTS.md` 也用同一原子写。
- **手册是「随包规则 + owner 数据」的混合体。** 已知 generation 用精确旧文替换并盖**实际达到的**版本戳（v15 只到 v20 就标 v20，不冒充 v21）；v21 加「交付写 session cwd + `present`，working folder 是笔记本」；匹配不到的旧手册不重写，prompt 段末尾标 stale，需要时用 `assistant-data refresh-manual --yes` 先备份再再生。`SOUL.md` 保持 owner 数据，默认身份只到新 home。冻结 v19 home 作为旧字节回归，不用合成包冒充历史。
- **账本状态有界，历史不丢。** `ledger.json` 只留最近 256 条操作 + `operationCount`，更早的进 `operations-archive.jsonl`；压缩先 fsync 归档再写缩小状态；重试先查归档，避免把已归档 operation 再应用一次；投影 `revision` 用累计计数，`receipts` 只含最近窗口，更早回执按 `operation_id` 读回。投影 byte cap 提到 8 MiB 只作未压缩旧 home 的桥。
- **备份/恢复是显式的。** `assistant-data` 仍是唯一主路径；新增 `status`/`check`、`import --replace`（把非空目标移到 `.pre-import-*` 旁路，失败恢复，不删除）、manifest 文件数/字节数校验、活 `writer.lock` 拒绝、目标嵌套拒绝。bundle 不含 sessions/credentials/settings/storages/`session-search.db`。
- **秘密不落插件配置与日志。** Viki key 走 `apiKeyEnv`/`OPENVIKING_API_KEY`，内联 `apiKey` 仅为旧 home 兼容；bootstrap state/log 为 0600，launch token 在成功与失败路径都打码。
- **并发是单 writer 纪律。** 账本的 `writer.lock` 是唯一硬 guard；房间/技能/提案/审计是原子写但 last-write-wins，同一 home 的写建议单实例，不承诺合并。
- **数据卡与格式政策进了合同。** 每个面的归属/寿命/可见性/备份/卸载去向；房间只增可选字段、必填字段变更先迁移、账本 v1 旧字节可读、bundle manifest 版本不匹配拒绝。

## 输掉的方案

- **把 working folder / 账本迁到 `ctx.storageDomain`**：会失去用户可见、可编辑、可导出，并引入 schema version 拒绝；FAQ 42 的文件树路线允许这条路，代价由作者承担。
- **只把 `maxProjectionBytes` 调大**：只推迟 413，不解决单文件重写增长与操作历史无界。
- **给房间文件预建 schema 版本系统**：当前没有破坏性变更；先冻结旧 home fixture 与「只增可选字段」政策，等第一次真实破坏性变更再升版本。
- **把操作拆成 per-record 文件或 SQLite**：当前规模下 JSONL 归档足以保回执；per-record/SQLite 的索引与迁移成本留到真实规模触发。
- **为房间加全局大锁**：同 home 读多写少；硬拒绝第二 writer 会把正常的 web + one-shot 共存变成运维问题。先文档化单 writer，真实丢失再给前置条件/短锁。
- **把 `assistant-data` 做成加密/合并工具**：跨机冲突语义与密钥管理是独立提案；当前 bundle 明确是明文、整目录 replace。
- **本轮加硬删除**：`forget`/`deprecate`/`retire`/`discard` 仍保留 archive 或原位；擦除需要显式审计与用户确认，不与发布硬化混做。

## 后果

- `operations-archive.jsonl` 会继续增长；它是审计历史，retention/轮转与 per-record 索引尚未取。
- 投影只呈现最近回执；更早回执要经工具按 id 读，客户端若需旧回执要另做分页。
- 房间写仍是 last-write-wins；同一 home 的并发写不是支持场景。
- 没有硬删除；敏感记忆的擦除只能手动删文件/记录，且不会自动清 audit/归档。
- 备份是明文、整目录 replace；没有合并、加密、dry-run。
- 手册只迁移已知旧文；更老 generation 标 stale，`refresh-manual` 是显式逃生门（先备份，手改可恢复）。
- 没有 project/workspace 键；一个 home 一个 principal，多项目共享是产品选择。

未取的项与触发条件在[收口卡](../../_backlog/issues/261027-data-lifecycle-hardening.md)，本 note 不复制台账。
