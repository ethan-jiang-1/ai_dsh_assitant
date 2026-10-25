---
status: 推敲中
opened: 2026-10-25
---

# 推敲：agent 与用户数据的边界——交接物不带数据，数据可备份可迁移

> 立卡：2026-10-25 ｜ 状态：推敲中 ｜ 类型：Task ｜ 可关闭：否 ｜ 毕业：做现在

**问题与期望结果：** 运行时已经分成“插件代码”和“working folder/账本”，tarball 也不含 `src/tests/seeds`；但“目录独立启动”的交接单元是整个目录，而目录里有作者的 `.env.local`、`dev/harness-home/`（credentials、sessions、assistant、assistant-operating、OpenViking 配置、会话索引）和现场产物。`gitignore` 只保护 git，不保护 `cp -R`/zip。期望得到一条机械可查的边界：**agent 物**（可复制给任何人）与**用户数据**（属于某个人/某个 home）分开；交接物零数据/零密钥/零作者路径；同一份 agent 可服务不同数据根；备份/恢复/升级有合同。

**当前情况：**

- 运行时设计是对的：working folder 默认 `<dshHome>/assistant`，经营账本独立 `<dshHome>/assistant-operating`（[home.md](../../docs/home.md#L47-L50)、[operating.md](../../docs/operating.md#L3-L4)）；`layout.ts` 是路径唯一 owner；host 拥有 sessions/credentials/settings。
- 发布物是干净的：`files` 只含 `lib/bin/presets/cordis.patch.yml/README`（[package.json](../../packages/dsh-smart-assistant/package.json#L108-L114)）；`export-dist` 对 tarball 做禁入清单断言；手册用符号根。
- 交付面不干净：仓根有 `.env.local`；`dev/harness-home/` 下有 `.credentials.yaml`、`sessions/`、`assistant/`（含 `deliverables/`、记忆、知识、技能）、`assistant-operating/`、`openviking/ov.conf`、`session-search.db`；根 `deliverables/` 也是会话现场产物。这些都被 gitignore，但会被目录拷贝带走。
- 没有 handoff 导出/扫描脚本；没有数据导出/导入；数据版本只有局部的 `AGENTS.md` 迁移与账本 v1/v2 投影，没有整体的“数据格式版本 + 迁移”；`deliverables/` 有两处（working folder 根与会话 cwd），没有边界说明。

**2026-10-25 实测：** 边界合同落 [docs/delivery.md](../../docs/delivery.md)；`handoff-scan` 拒绝数据/凭据/宿主路径/活密钥/符号链接，真实 tarball clean；`assistant-data` 只带 `assistant` + `assistant-operating` + `manifest.json`（schemaVersion 1），导出/导入目标必须空、未知 schema 拒绝、导入先 temp 后 rename；installed bin 往返通过。测试 = `handoff-scan.spec.mjs` + `assistant-data.spec.mjs`；release-smoke 534 条目、handoff clean、installed roundtrip 通过。

**未决问题：** 只剩真实下一版发布时的 0.1.0→新版数据 fixture（S5；当前用合成 0.0.9 证明机制）。“整 home 备份”是宿主数据操作，文档说明但不另造插件命令。

**下一步：** S3 已交付；S4 的 bootstrap 消费同一份数据根合同；S5 跑真实下一版。

## 已知与未决

- **已知**：agent 物/插件数据/宿主数据/deliverables 四处归属已写进合同；交接扫描与两目录 bundle 有正反例；安装零写入；升级保留数据。
- **未决**：真实下一版 0.1.0→新版 fixture（S5）；整 home 备份是否要做成独立命令（当前不做，必要时另立卡）。

## 方案与取舍

**选 A：一人一 home；agent 物与用户数据彻底分开；插件只拥有两个目录。**

- **agent 物**：`lib/`、`bin/`、`presets/`、`cordis.patch.yml`、`README`、默认身份/种子内容；可复制给任何人，不含任何用户数据。
- **用户数据**：`<home>/assistant` + `<home>/assistant-operating` 由插件拥有；`sessions/`、`credentials`、`settings`、`storages` 由宿主拥有；`deliverables/` 属于用户数据（可能在 working folder 或会话 cwd）。
- **交接**：给别人的是 agent 物（tgz 或目录拷贝）；数据不随 agent 走。需要迁移一个人的数据时，用显式导出/导入，不用 `cp -R` 整个 repo。
- **备份**：插件备份覆盖两个目录；完整备份覆盖 home；`sessions/credentials` 不进插件导出，除非用户显式选择。
- **升级**：数据格式带版本；迁移是显式、幂等、可回退的；读不出就 fail loud，不静默清零。

**落选的方案：**

- **把数据放进代码目录，拷目录即带走**：方便，但升级/复制/交接都混；与“完全分离”冲突。
- **只靠 `.gitignore`**：它不保护未跟踪文件的物理拷贝；这次目录交接就是反例。
- **把 sessions/credentials 默认打进插件导出**：密钥和会话是最敏感的数据，默认导出会制造泄漏面；需要显式选择。
- **同一 home 按 profile 分租户**：profile 是组合，不是租户；sessions/settings 仍共享，解决不了“不同人”。
- **自动迁移/自动重写旧数据**：跨版本不可逆；先保证可读与 fail loud，迁移按版本显式执行。

## 验收标准

| 行为 | 类别 | 输入/状态 | 通过信号 | 负例/恢复 | 证据 owner | 人判断 |
|---|---|---|---|---|---|---|
| 交接物零数据/零密钥/零作者路径 | 确定性 | tarball + 一份“agent 目录”拷贝 | 扫描不命中凭据/会话/working folder/账本/deliverables/作者绝对路径/dev 夹具 | 在目录里放一个假 key/假会话文件，扫描必须红；不能靠文件名白名单漏掉 | 新 handoff 扫描脚本 + 负例 fixture；`verify` 接线 | 哪些路径算“数据”的最终清单 |
| 同一 agent 两个数据根互不串 | 编排 | 同一包，两个不同 `DSH_HOME` | A 写入的记忆/账本不出现在 B；B 的会话/凭据独立 | 共享目录/符号链接导致串读 = 红；删除 A 不影响 B | 集成测试/干净 home 脚本 | 无 |
| 数据导出/导入往返 | 确定性 | 两个插件目录 + manifest | 导入新 home 后内容、账本 revision、frontmatter 保持；manifest 记录版本/包含项 | 缺文件、坏 JSON、版本不支持 = 明确失败，不半导入 | 导出/导入纯核 + 测试；真实目录往返 | 是否需要把 settings 一起导出 |
| 备份/恢复可照抄 | 编排 | 文档 + 脚本 | 备份两目录/整 home 的命令可执行；恢复后 `curate`/`--dump-config` 正常 | 只备份一半、恢复顺序错 = 有判据可发现 | 文档 + 脚本；真人按文档走查 | 用户能接受“插件备份不含会话”吗 |
| 升级不破坏旧数据 | 确定性/编排 | 0.1.0 数据 + 新包 | 旧 working folder/账本可读；迁移有版本标记；不可读 fail loud | 新包把旧数据静默当空 = 红线；回退旧包可读 | 升级 fixture + 测试；干净 home 实验 | 无 |
| 模型可见内容不含宿主绝对路径 | 确定性 | persona、SKILL、手册、摘要 | 扫描不命中作者 home/仓根/临时根 | 符号根（`~/.dsh`/`$DSH_HOME`）是允许形态 | 既有 content-boundary/相对链接门禁 + 新扫描 | 无 |

## 关闭条件

- agent/数据边界写进合同（agent 物、插件数据、宿主数据、deliverables 四处各有 owner）；交接物扫描有正反例并被 `verify` 或发布脚本调用。
- 导出/导入、备份/恢复、升级迁移各有一条可执行路径与测试；两数据根隔离有证据；`deliverables/` 的落点说清楚。
- 结论与残留路由到 [交付合同 note](../../notes/proposed/2026-10-25-delivery-contract.md) 与授权后的收口卡；未取的（例如“是否导出 sessions”）写清触发条件。
