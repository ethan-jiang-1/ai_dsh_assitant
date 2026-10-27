日期：2026-10-27 · 状态：**proposed（P0 done；P1 部分）**（来源 = [已归档的 261027 收口卡](../../_backlog/_archive/settled_issues/261027-data-lifecycle-hardening.md)）

# 数据生命周期 REVIEW 后的证据与下一步

## 问题（可观察行为）

落地与初心一致：working folder 仍是用户可见的 home 文件树，账本是独立可导出的文件账本，没有迁 `ctx.storageDomain`；升级/恢复/卸载/秘密/账本增长都有代码与测试。REVIEW 发现的不是“方向错了”，而是**证据层级和剩余边界**：

- 新增的 `assistant-data purge` / `refresh-manual` / `archive-proposals` / `import --dry-run` 只有 source 级 spec；真实 tarball 的安装 smoke 仍只跑 export/import，没证明 shipped bin 的参数分派与 `lib` 产物。
- manual v21 的交付指引只在文件/段落合同层被断言；prompt-smoke 只证明段落存在，没断言新规则文本进请求；`pnpm eval` 因无 key 未跑，模型是否照做未知。
- CAS 只有 `Room.write` 的 primitive spec；thread/knowledge 的调用点是否真的把 `entry.text` 传下去没有宿主级断言。
- `page-source-missing` 只有纯核 spec；`curate` 把 knownSourceIds 接进去的 wiring 没测。
- `check` 的提案积压/备份总量阈值、`import --replace` 的失败回滚、`purge` 的删除失败审计都没有红例。
- 仍开放的设计项：硬删除只覆盖房间记录（账本 material/quote、sessions、attachments 不删）；备份是明文、整目录 replace、无合并/加密；`save_page`/memory supersede 仍无 CAS；客户端 localStorage 键无版本/卸载清理；memory/knowledge 的召回内容没有“不可信数据”标记，memory/ledger 没有凭据扫描。

## 进展

P0 已落：installed-tarball 维护命令 smoke、fresh-home prompt-smoke 交付规则、host CAS/source wiring、check 阈值、replace 回滚、purge 失败审计、数据卡 N0/N1 与迁移/删除列。P1 已落：`save_page` 现有页与 memory supersede/forget archive 的 CAS、`rotate` dry-run/apply、digest 记忆段“data not instructions”、memory 凭据扫描、客户端键清理口径。P1 剩余：硬删除扩展设计。

## 提案

**P0 · 证据补齐（不动模型可见面）**

1. 新增 installed-tarball 维护 smoke：干净 home 安装后跑 `assistant-data status`/`check`/`import --dry-run`/`purge`/`refresh-manual`/`archive-proposals`，用临时目录断言审计行、备份、轮转与拒绝形态；不碰真实数据。
2. Host 级 wiring spec：用 spy 断言 `updateThread`/`promotePage` 把 `entry.text` 传给 `Room.write`；用真 `curate` 断言 `page-source-missing` 出现在 brief；用 201 个提案文件断言 `check` 阈值。
3. `import --replace` 失败回滚（POSIX 权限夹具）与 `purge` 的失败审计红例。
4. prompt-smoke 增加“交付写 session cwd + `present`”文本断言；有 key 时跑 `pnpm eval --only <相关任务>`，无 key 记 BLOCKED，不拿 prompt-smoke 冒充行为评测。
5. 数据卡补 N0/N1 依赖层级、迁移/删除列；把新 spec 写进证据地图。

**P1 · 下一片数据能力**

6. 把 raw-text CAS 扩到 `save_page` 的现有页与 memory supersede；宿主级测试。
7. 显式 retention 命令：`--dry-run` 默认、`--apply` 才移动/删除，覆盖 operations archive / approvals / 房间 archive / proposals；不做自动清理。
8. 召回安全：digest/manual 的 memory/knowledge 文本标为数据而非指令；memory/ledger 写前做凭据形状扫描（warn，不阻断）。
9. 客户端键版本化与清理说明；不新增服务。
10. 硬删除扩展（账本 operation/material、sessions、attachments）先出数据卡与确认/审计设计，再动代码。设计边界：sessions 没有 delete API，插件**不能**承诺删 session；账本 material/quote 可做显式 `--include-ledger` + 审计；attachments 不在本插件数据面。没有这三项的产品确认前不实现。

**P2 · 需要产品取舍**

11. G14/G15：跨机合并语义（同 id 冲突三选一/最后一次写赢/项目分支）与备份加密（口令/密钥托管）另立提案。
12. project/workspace 键：只有真实跨项目串数据投诉再做。
13. digest/manual 的 replay 稳定性：决定是否把动态段落做成 sourced 注入；没有 replay 失败证据前不动。
14. Windows/网络文件系统矩阵、多用户/多租户边界。

## 输掉的方案

- **把所有剩余项一次做完**：硬删除扩展、合并/加密、召回安全各自需要不同的失败语义，混一片无法回退。
- **自动轮转/自动删归档**：审计历史的价值高于磁盘；只做 dry-run + 显式 apply。
- **用默认口令做备份加密**：密钥管理没设计前，加密只是把风险换个位置。
- **把动态 digest/manual 全塞进 session event**：第三方事件限制与上下文噪声都不划算；先证明 replay 真的坏。
- **把客户端 UI 状态全搬 host**：只有 `ui-mode` 需要跨源，其余 localStorage 是设备本地，搬了反而多一个权威。

## 验收

- P0：`pnpm test` 全绿 + 新 installed-tarball smoke PASS + prompt-smoke 含交付规则文本；eval 有 key 时 PASS/无 key 记 BLOCKED；`pnpm verify` 全绿。
- P1：CAS/召回/凭据扫描各有红绿 spec；retention 命令 dry-run 不改盘、apply 可回退；证据地图同步。
- P2：每项先有 proposed 卡与代价/触发，不直接实现。
