日期：2026-10-27 · 状态：**proposed**（用户已授权实施；work 台账在[收口卡](../../_backlog/issues/261027-data-lifecycle-hardening.md)）

# 数据生命周期硬化（Phase 0 / Phase 1）

## 问题（可观察行为）

FAQ 26 的体检结论是：落点已对齐，缺口在生命周期。可观察的问题：升级 home 的手册停在旧版本；`assistant-data import` 在首次启动后被非空拒绝；`ledger.json` 单文件随操作数增长、约 600 次操作后撞 1 MiB 投影上限；`session-search.db` 卸载后留在盘上且不在数据卡；Viki key 与 bootstrap URL token 落明文；学到的 SKILL.md 覆盖不是原子写；旧 home 兼容只有合成包 smoke，没有真实 fixture。

## 提案

按 [收口卡](../../_backlog/issues/261027-data-lifecycle-hardening.md) 的切片推进：Phase 0 先做不改变模型可见面的部署安全项（技能原子写、秘密、数据卡 + `assistant-data status`、`import --replace`、账本大小告警）；Phase 1 做模型可见/格式项（手册迁移表与 stale 可见、旧 home fixture + 格式政策、账本状态/历史拆分、并发口径、`assistant-data check`）。每片代码 + 测试 + 合同同 diff，红绿后提交。

## 输掉的方案

- **把 working folder / 账本迁到 `ctx.storageDomain`**：会失去用户可见/可编辑/可导出，并引入 version-mismatch 拒绝；FAQ 42 的文件树路线允许这条路，代价由作者承担。
- **只把 `maxProjectionBytes` 调到 4 MiB**：只推迟 413，不解决单文件重写增长与操作历史无界。
- **给房间文件预建 schema 版本系统**：当前没有破坏性变更；先冻结旧 home fixture 与"只增可选字段"政策，等第一次真实破坏性变更再升版本。
- **为并发加全局大锁**：同 home 的读多写少；先文档化单 writer，真实出现丢更新再给前置条件/短锁。

## 验收

完成条件与命令见[收口卡](../../_backlog/issues/261027-data-lifecycle-hardening.md) 的「验收标准」与「外部结果三要素」；本卡只承载取舍，不复制台账。
