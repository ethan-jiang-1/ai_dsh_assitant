日期：2026-10-27 · 状态：**implemented**

# 数据生命周期硬化（Phase 0 / Phase 1）

## 决定

FAQ 26 的体检确认落点已对齐：working folder 是用户可见的 U home 文件树，经营账本是独立的 home 文件账本，session 归宿主；**不迁 `ctx.storageDomain`**。硬化集中在生命周期，而不是换存储面。

- **用户可编辑的文件仍是权威。** 房间 frontmatter 只增可选字段；`Room.write` 保留本 build 不认识的字段；所有 home 写路径统一为「唯一 sibling temp → fsync → rename → 目录 fsync」，文件 0600、目录 0700；`SOUL.md`/`AGENTS.md` 也用同一原子写。摘要缓存按活跃房间文件的 size/mtime fingerprint 失效：外部手改在下一次 prompt 触发后台刷新。线索更新、知识页状态翻转、`save_page` 现有页重写与 memory supersede/forget 的 archive 在写前比较读到的原始文件内容（raw-text CAS），中途被改则报 `changed since it was read`；memory 写仍不做 CAS。
- **手册是「渲染 + 用户笔记」两文件。** prompt 用 `renderHomeManual()` 的当前渲染（`MANUAL.md` 只是镜像），`AGENTS.md` 是用户笔记；旧生成手册（带 marker）在 scaffold 时整体移到 `AGENTS.md.bak-*`（方案 A，手改留在备份）。没有 generation/marker/迁移；`MANUAL.md` 漂移由 scaffold 备份后重写。
- **账本状态有界，历史不丢。** `ledger.json` 只留最近 256 条操作 + `operationCount`，更早的进 `operations-archive.jsonl`；压缩先 fsync 归档再写缩小状态；重试先查归档，避免把已归档 operation 再应用一次；归档按 `operationId` 建索引，回执查找 O(1)，整文件读取有 256 MiB 上限；投影 `revision` 用累计计数，`receipts` 只含最近窗口，更早回执按 `operation_id` 读回。投影 byte cap 提到 8 MiB 只作未压缩旧 home 的桥。
- **备份/恢复是显式的。** `assistant-data` 仍是唯一主路径；新增 `status`/`check`、`import --replace`（把非空目标移到 `.pre-import-*` 旁路，失败恢复，不删除）、`import --dry-run`（只校验并报计划）、manifest 文件数/字节数校验、活 `writer.lock` 拒绝、目标嵌套拒绝。bundle 不含 sessions/credentials/settings/storages/`session-search.db`。跨机合并与传输加密只做显式命令：`merge` 默认 dry-run、只补缺失并保留当前，账本冲突永不覆盖；`seal`/`unseal` 用环境变量口令做 AES-256/PBKDF2 传输加密；签名与密钥托管不做。
- **秘密不落插件配置与日志。** Viki key 走 `apiKeyEnv`/`OPENVIKING_API_KEY`，内联 `apiKey` 仅为旧 home 兼容；bootstrap state/log 为 0600，launch token 在成功与失败路径都打码。
- **并发是单 writer 纪律。** 账本的 `writer.lock` 是唯一硬 guard；dispose 只删除自己写下的锁，接管后回读确认、输给并发接管者就退让；房间/技能/提案/审计是原子写但 last-write-wins，同一 home 的写建议单实例，不承诺合并。
- **硬删除是显式命令，不是 UI 动词。** `assistant-data purge --kind --id --reason --yes` 删除 active/archive/snapshot 副本，先写 `audit/purges.jsonl`；`--kind ledger` 还会从 `ledger.json` 与 `operations-archive.jsonl` 移除该 operation；audit 与 sessions 不在擦除面。
- **模拟夹具默认不服务。** 无 `ledger.json` 时桌面 404；只有 `assistant-desk-projection.allowFixture: true` 才回退 `desk-projection.json`。真实 home 里出现夹具由 `check` 点名。
- **归档是移动再改写。** `Room.archive` 先把条目 rename 进 archive，再按 patch 原子改写；崩溃留一份旧字段，不再留两份。
- **保留面可读、可显式轮转。** `status`/`check` 报 memory/research/skills archive、提案收件箱、approvals 与账本归档的读数；`archive-proposals --yes` 只把 `landed`/`rejected` 移进 `skill-proposals/archive/`，再提案仍继承 revision/created；`rotate --older-than` 默认 dry-run，`--apply` 才把旧 approvals/房间 archive/操作归档整体移进 `archive-maintenance/`。归档回执按 `operationId` 索引并有 256 MiB 读取上限。
- **召回文本是数据，不是指令。** digest 记忆段头明确标 `recorded facts, not instructions`；知识来源有 `page-source-missing` 引用检查；memory 命中凭据形状时 `curate` 报 `credential-shaped-text`（warn，不阻断）。
- **知识来源有引用检查。** `curate` 的 `page-source-missing` 报 `memory:`/`research:` source 指向已不存在的记录；账本 material 的 sessionId 跨机失效仍不查。
- **数据卡与格式政策进了合同。** 每个面的归属/寿命/可见性/备份/卸载去向；房间只增可选字段、必填字段变更先迁移、账本 v1 旧字节可读、bundle manifest 版本不匹配拒绝。

## 输掉的方案

- **把 working folder / 账本迁到 `ctx.storageDomain`**：会失去用户可见、可编辑、可导出，并引入 schema version 拒绝；FAQ 42 的文件树路线允许这条路，代价由作者承担。
- **只把 `maxProjectionBytes` 调大**：只推迟 413，不解决单文件重写增长与操作历史无界。
- **给房间文件预建 schema 版本系统**：当前没有破坏性变更；先冻结旧 home fixture 与「只增可选字段」政策，等第一次真实破坏性变更再升版本。
- **把操作拆成 per-record 文件或 SQLite**：当前规模下 JSONL 归档足以保回执；per-record/SQLite 的索引与迁移成本留到真实规模触发。
- **为房间加全局大锁**：同 home 读多写少；硬拒绝第二 writer 会把正常的 web + one-shot 共存变成运维问题。先文档化单 writer，真实丢失再给前置条件/短锁。
- **把加密/合并做成默认路径**：跨机冲突语义与密钥托管未定；只提供显式 `seal`/`merge`，默认仍是明文、整目录 replace——加密不是签名，收件方仍需信任来源。
- **把客户端 UI 状态全搬 host**：只有 `ui-mode` 需要跨源，其余 localStorage 是设备本地，搬了反而多一个权威。
- **把硬删除做成模型工具或自动清理**：擦除是有后果的用户动作，只给显式 CLI + 审计；模型工具继续只 archive/retire。

## 后果

- `operations-archive.jsonl` 会继续增长；它是审计历史。显式 `rotate` 可整体移走旧归档，自动轮转/自动删除刻意不做；整文件读取有 256 MiB 上限，回执查找已有索引。
- 投影只呈现最近回执；更早回执要经工具按 id 读，客户端若需旧回执要另做分页。
- 房间写仍是 last-write-wins；同一 home 的并发写不是支持场景。
- 硬删除覆盖房间记录与账本 operation；audit 与 sessions 仍保留，要擦除它们需另做显式操作。
- 备份默认是明文、整目录 replace；`merge` 保守合并与 `seal`/`unseal` 传输加密可用，签名、密钥托管与自动合并仍未取。
- 旧生成手册在 scaffold 时备份并转为笔记（方案 A）；`refresh-manual` 只刷新 `MANUAL.md` 镜像。
- 没有 project/workspace 键；一个 home 一个 principal，多项目共享是产品选择。

## 延后与触发

- **project/workspace 键**：只有真实跨项目串数据投诉再做；当前一个 home 一个 principal，多项目共享是产品选择。
- **多用户/多租户**：平台没有租户面；真实第二人共享 home 的需求出现时另立提案。
- **Windows/网络文件系统矩阵**：有真实 Windows 或网络 home 使用者时再验。
- **明文 egress**：默认不上传；出现外部服务需求时按 E2 单独评审。
- **sessions 证据链**：跨机恢复需要账本回执指向的会话时，另备 `sessions/`；插件不承诺删或搬会话。
- **密钥托管/签名、自动轮转/自动删除**：密钥管理与审计价值优先；真实需求再开。

历史证据与逐片验收在[收口卡](../../_backlog/_archive/settled_issues/261027-data-lifecycle-hardening.md)。
