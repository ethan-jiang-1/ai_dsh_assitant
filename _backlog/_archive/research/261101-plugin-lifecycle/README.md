# DSH 插件生命周期对齐：0.1.13 发行物距离社区插件形态多远

> 问题：以 DSH 官方生命周期做法（打包 / 发布 / 安装 / 初始化 / 配置 / 启动 / 更新 / 卸载 / 文档）逐段对照本仓 `_dist/` 发行物，差距在哪、根因是打包还是插件形态、每处差距怎么补。
> 历史消费者：[插件生命周期对齐卡](../../settled_issues/261101-plugin-lifecycle-align.md)（已结：方案与验收标准引用本页证据）、[bundle-first 决定 note](../../../../notes/implemented/2026-11-02-bundle-first-lifecycle.md)
> 产出的卡：[插件生命周期对齐卡](../../settled_issues/261101-plugin-lifecycle-align.md)、[BUG-027](../../fixed_bugs/BUG-027-published-sourcemap-embeds-src.md)、[BUG-028](../../fixed_bugs/BUG-028-manual-profile-create-boots-and-replaces.md)
> 归档：2026-11-02（消费者全部结档：campaign 卡、两张缺陷卡、决定 note）

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [261101-lifecycle-gap-evidence.md](261101-lifecycle-gap-evidence.md) | 逐段对照表、隔离 home 实验记录（E1–E5、市场条目探针）、未测清单与证据强度 | 2026-11-01 |
