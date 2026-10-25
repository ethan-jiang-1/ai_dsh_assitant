日期：2026-10-25 · 状态：**proposed**（已授权实施；用户 2026-10-25 按推荐拍板，goal 推进）

# 交付合同：分发、数据边界与独立启动

## 问题（可观察行为）

本仓能打包、能手装、能在作者机器上跑，但“把这个插件交给另一个人”还不是一份合同：

- **分发**：兼容声明机器不认；装完还要手改 YAML；没有升级/备份/回滚；支持矩阵没有机器口径。
- **数据边界**：tarball 干净，但“目录独立启动”的交接单元是整个目录，里边有作者的凭据、会话、working folder、账本与现场产物；`gitignore` 不是拷贝边界。
- **独立启动**：`pnpm start` 假定 `.git`/vendor/持久 dev home/仓根 cwd；无 `.git` 的目录拷贝起不来，带数据拷贝会泄漏。
- **出厂身份**：preset 叫“章鱼管家”、带管理技能，但默认 `SOUL.md` 是通用身份；管理岗 SOUL/seeds 在 dev-only 路径，tarball 不带。

期望：一份可执行、可验收的交付合同——**agent 物可复制给任何人；用户数据属于某个 home；同一份 agent 能配不同数据根；目录能在隔离环境起一个自己的实例；出厂默认符合 P1。**

## 提案

用户 2026-10-25 已按推荐拍板四点：独立启动用“已安装 `dsh` + 隔离 profile 的引导脚本”；一人一 `DSH_HOME`；保留手工 tgz + Web UI 选择 preset；出厂管理岗默认 + seeds 显式装配。四张问题卡拥有各自的细节与验收：

- [分发合同](../../_backlog/issues/261025-distribution-contract.md)
- [agent/数据边界](../../_backlog/issues/261025-agent-data-boundary.md)
- [目录独立启动](../../_backlog/issues/261025-standalone-directory-start.md)
- [出厂身份与首跑](../../_backlog/issues/261025-factory-identity-first-run.md)
- 平台事实与第三方先例：[DSH 插件交付事实](../../_backlog/research/tech-exploration/261025-dsh-plugin-delivery-facts.md)

合同本体：

1. **agent 物**：代码、preset、策展技能、默认身份/种子内容。可复制给任何人，不含用户数据、密钥、作者路径、dev 夹具。
2. **用户数据**：`<home>/assistant` + `<home>/assistant-operating` 由插件拥有；sessions/credentials/settings/storages 由宿主拥有；`deliverables/` 属于用户数据。交接物不带数据；数据迁移走显式导出/导入。
3. **分发**：手工 tgz 是当前渠道；`engines.dsh` 机器声明兼容；Web 用官方 preset 选择面，headless 用 profile patch；升级/备份/回滚/卸载有文档与证据。不新增包内 app bin，不静默改用户默认。
4. **独立启动**：目录内 `bootstrap` 脚本 + 已安装的兼容 `dsh`；`--home` 隔离；无 `.git`；中性 cwd；不碰 `~/.dsh`；可停可收。没有 `dsh` 的环境不是本轮范围。
5. **出厂**：默认 `SOUL.md` 是管理岗；seeds 随包但只在显式装配时导入为 `draft`；安装不写用户数据；装配不覆盖主人已编辑的身份。

### 执行顺序（S0–S5）

每一片是一个可回退锚点：实现 + 验收 + 一次提交。片内先造红，再实现，再变绿；证据记在片末或收口卡，不靠口头。

| 片 | 目标产出 | 依赖 | 证据/门禁 | 停点 |
|---|---|---|---|---|
| **S0 基线与合同** | 四张问题卡 + 本卡；agent/数据边界、支持矩阵、干净环境基线与现有 artifact 清单；不改变行为 | — | `pnpm verify`、基线 `pnpm release-smoke`；清单与基线读数 | 无（零行为；本卡点头即完成） |
| **S1 分发合同** | `engines.dsh`/元数据；Web preset 选择路径实测；headless 附录；升级/备份/卸载；`release-smoke` 扩兼容拒绝与升级 | S0 | manifest/兼容纯核正反例；干净 home 装/选/升/卸；UI `pnpm shots --dom` 证据；手册重出 | 用户确认支持范围与 UI 路径 |
| **S2 出厂身份** | 管理岗默认 `SOUL`；seeds 随包；显式装配命令；安装零写入；identity/prompt/eval 同步 | S0；S1 的打包形状 | prompt 快照/会话日志；`pnpm eval`；装配幂等/不覆盖；pack 清单 | 用户确认管理岗话术/口味 |
| **S3 数据边界** | handoff 扫描；数据导出/导入 + manifest；备份/恢复；升级迁移；交付物落点 | S0；S2 的最终 artifact | 扫描负例（放假 key/假会话）；两 home 隔离；导出导入往返；升级 fixture | 用户确认备份单位（含不含 sessions/credentials） |
| **S4 独立启动** | `bootstrap` 脚本；无 `.git` clean-room；隔离 home；中性 cwd；离线 `yaml` 前提；停止判据 | S1、S3 | 拷贝到 `.tmp` 删 `.git` 起 URL；`preflight`；路径断言；进程收尾 | 用户/第二位真人走查 |
| **S5 收口** | 全矩阵复跑；第二机走查；文档/README/AGENTS 同步；`export-dist`；tag（若发版）；卡归档 | S1–S4 | `pnpm verify`/`test`/`release-smoke`/`export-dist`；走查记录；证据表 | 最终验收 |

**顺序理由**：先立合同与基线（S0），再定“装得上”的机器口径（S1）；出厂身份会改最终 artifact，必须在数据扫描（S3）前落；数据边界定完，独立启动才知道数据根和收尾怎么写（S4）；最后才做全矩阵与第二机走查（S5）。S1 与 S2 不并行，是因为 S2 会换最终 artifact 的内容（默认身份/seeds），S1 的手册/清单要以最终内容为准；S2 与 S3 不并行，是为了让扫描对象是最终 artifact；S3 与 S4 不并行，是因为 bootstrap 消费数据根/收尾合同。

**每片的红/绿与回退**：

- S1：删掉 `engines.dsh` 或喂一个不满足的假版本，门禁必须红；干净 home 的 UI 路径先做探针，不出现就回退到 headless 式 patch 并记录缺口。回退 = revert 该片提交，包仍是旧形状。
- S2：默认 SOUL 改动先造 prompt 快照红，再改；eval 红则回退该片；不碰用户已有数据（安装零写入是独立断言）。回退 = revert 该片提交，旧默认身份回来。
- S3：扫描负例先红（在 `.tmp` 夹具里放假 key/假会话），再实现扫描；导出/导入在一次性 home 里往返，失败不写半份。回退 = 移除扫描/导出脚本，数据格式不破坏旧读取。
- S4：先在 `.tmp` 拷贝里删 `.git`，旧 `start.sh` 必须红，再落 bootstrap；起服务用 `--port 0`，收尾按进程组杀。回退 = 删除脚本，不影响 `pnpm start`。
- S5：只做复跑、文档与归档，不改行为；红了回上一片，不把红写成绿。

**本卡不承载实施台账**。用户 2026-10-25 已按推荐拍板并授权推进；[收口卡](../../_backlog/issues/261025-delivery-closure.md) 是唯一 work 台账（外部结果三要素、切片台账、仍未取）；四张问题卡在首次收口时按关闭条件归档（结论与去向 = 本 note + 收口卡），不在活跃区留四份并行清单；本卡只保留问题/提案/取舍/完成条件。

## 输掉的方案

- **包内 `bin` 直接起应用**：违反“只有 profile 启动应用”的 DSH 规则；独立启动用引导脚本，不用 app bin。
- **数据放代码目录，拷目录即交接**：升级/复制/交接全混，且会把作者凭据/会话带走。
- **安装时自动改默认 preset 或自动导入 seeds**：安装即写用户数据/抢用户默认；没有 post-install hook，也不可逆。
- **只保留 `dsh.compatibility` 表**：机器不读；OpenViking 0.5.8 被静默跳过的先例已经证明代价。
- **现在转 npm/registry**：release 流程、provenance、支持承诺都不成立；手工 tgz 已够，触发条件是真实外部用户/更新节奏。
- **把 DSH 一起打包做“无 dsh 也能跑”**：版本/体积/升级都变成另一个产品；本轮明确不做。
- **同一实例多租户**：DSH 的 home 级持久化模型没有租户面；跨到宿主 auth 是另一个立项。

## 验收

- **完成条件**：四张问题卡的 `## 验收标准` 全部满足；S0–S5 的切片证据在收口卡；`pnpm verify`、`pnpm test`、`pnpm release-smoke`、`pnpm export-dist` 通过；无 `.git` 拷贝起实例、不碰日用 home、升级保数据、交接物零数据四条有真证据。
- **人判断**：Web preset 选择的清楚程度；管理岗首答/话术是否像样；第二位真人按手册走查的卡点。
- **work 台账**：授权后 `_backlog/issues/261025-delivery-closure.md` 是唯一切片/证据台账；本卡的验收是完成条件 + 指针，不是第二份台账。
- **不做/延后**：npm/registry（触发：真实外部用户/更新节奏）；无 `dsh` 便携包（另立产品卡）；同实例多租户（宿主层问题）。这些在收口卡写触发条件，不留在活跃区当“以后再说”。
