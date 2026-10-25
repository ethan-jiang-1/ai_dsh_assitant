---
status: 推敲中
opened: 2026-10-25
---

# 收口：交付合同 S0–S5（分发 / 数据边界 / 独立启动 / 出厂身份）

> 立卡：2026-10-25 ｜ 状态：推敲中 ｜ 类型：Task ｜ 可关闭：否 ｜ 毕业：做现在 ｜ 已授权实施（用户 2026-10-25 按推荐拍板，goal 自主推进）

## 外部结果三要素

**触发**：用户 2026-10-25 要求把插件收尾成“另一个人可用、agent 与数据分离、目录可在独立环境启动”的交付合同，并按推荐拍板、以 goal 静默自主推进。

**用户得到**：

- 一份可执行的分发合同：`engines.dsh` 机器兼容、Web/headless 安装路径、升级/备份/卸载与干净 home 证据。
- 一条机械可查的数据边界：agent 物不带数据/密钥/作者路径；插件两目录可备份/导出/导入；升级不破坏旧数据。
- 一条无 `.git` 的目录独立启动路径：用已安装的兼容 `dsh` + 隔离 home + 中性 cwd，不碰日用 `~/.dsh`，可停可收。
- 一个真正的出厂管理岗基座：默认管理岗 `SOUL`，seeds 只在显式装配时进 `draft`，安装零数据写入。
- 全链证据：每片红绿、可回退提交，最终 `pnpm verify` / `test` / `release-smoke` / `export-dist` 与 clean-room/第二机走查。

**完成条件**：四张问题卡的 `## 验收标准` 全部满足；S0–S5 切片台账有真证据；最终门禁与 clean-room 矩阵通过；未取项有触发条件或明确砍掉；问题卡与 proposed note 按生命周期归档/改写。

## 支持矩阵（S0）

| 项 | 声明 | 证据/限制 |
|---|---|---|
| DSH | `>=0.2.1-rc.2 <0.3.0`（机器范围，`engines.dsh`） | 只在 `dsh-v0.2.1-rc.2` 上验证；旧版本表只作历史验证记录，不作当前支持承诺 |
| Node | `^22.19.0 || >=24`（`engines.node`） | 与 pin 住的 DSH 一致；本机 Node 22 实测 |
| 面 | Web（UI 选择 preset）+ headless（profile patch） | Web UI 路径待 S1 clean-home 探针；headless 由 `release-smoke` 覆盖 |
| OS | 跟随 DSH 支持面 | 本仓未单独做 Linux/Windows 矩阵，不声称额外支持 |

## 切片台账

| 片 | 状态 | 证据 |
|---|---|---|
| **S0 基线与合同** | 已交付 | 四张问题卡 + [交付合同 note](../../notes/proposed/2026-10-25-delivery-contract.md) + [DSH 事实](../research/tech-exploration/261025-dsh-plugin-delivery-facts.md)；`pnpm verify` 48 checks；基线 `pnpm release-smoke` passed（515 files，clean-home 装/组合/OV 缺席在场）；commit `15d2dfd`；支持矩阵见上 |
| **S1 分发合同** | 进行中 | 待 `engines.dsh`/元数据、Web UI 探针、headless 附录、升级/备份/卸载、`release-smoke` 扩兼容拒绝 |
| **S2 出厂身份** | 待做 | 默认管理岗 SOUL、seeds 随包、显式装配、安装零写入、eval/prompt |
| **S3 数据边界** | 待做 | handoff 扫描、导出/导入、备份/恢复、升级迁移 |
| **S4 独立启动** | 待做 | `bootstrap`、无 `.git` clean-room、隔离 home、中性 cwd、离线 `yaml` |
| **S5 收口** | 待做 | 全矩阵、第二机走查、文档、`export-dist`、归档 |

## 仍未取

- Web UI 选择路径的 clean-home 真机证据（S1 第一动作；不出现则回退到 headless 式 patch 并记录缺口）。
- 旧 DSH 版本（0.1.5/0.1.7/0.2.0）是否支持：当前按不支持处理；只有实测通过才写进矩阵。
- 升级命令语义（覆盖/重装/先 remove）与 0.1.0 数据迁移 fixture。
- 离线 `yaml` 的预置/随包方案；没有 `dsh` 的环境明确不做。
- 第二机真人走查（S5；agent dry run 不替代）。

## 验收标准

- **I1 分发合同**：干净 home 装起并选到助手；不兼容 DSH 被明确拒绝；headless 路径可用；升级保数据；卸载留数据；手册覆盖生命周期。
- **I2 数据边界**：交接物扫描零数据/零密钥/零作者路径（含负例）；两 home 隔离；导出/导入往返；升级不破坏旧数据；模型可见内容无宿主绝对路径。
- **I3 独立启动**：无 `.git` 拷贝起 URL；数据根隔离且不碰日用 home；中性 cwd；首次凭据路径可照抄；离线/预置前提明确；收尾干净。
- **I4 出厂身份**：全新安装即管理岗；安装零写入；seeds 显式装配为 draft；不覆盖主人已编辑的 SOUL；发布物含装配内容；eval/prompt 有回归。
- **总门禁**：`pnpm verify`、`pnpm test`、`pnpm release-smoke`、`pnpm export-dist` 通过；clean-room 矩阵与第二机走查记录在案；未取项有触发/砍掉记录。

## 关闭条件

- S0–S5 的验收满足，证据写进本卡或提交说明；四张问题卡按关闭条件归档，proposed note 改写为 implemented 或按结论归档。
- 未完成的项写清触发条件或明确砍掉；不把红写成绿、不把 dry run 写成真人走查。
- 归档冻结：不修改 `_backlog/_archive/` 与 `notes/archived/` 的正文；旧决定只作历史引用。
