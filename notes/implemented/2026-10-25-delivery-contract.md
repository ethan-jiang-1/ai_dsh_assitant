日期：2026-10-25 · 状态：**implemented**

# 交付合同：分发、数据边界与独立启动

## 问题（可观察行为）

插件能打包、能手装、能在作者机器上跑，但“把它交给另一个人”缺三份合同：兼容声明机器不认；agent 与用户数据在目录拷贝时会混；独立启动依赖 `.git` 与作者 dev home。出厂身份也与 P1 不一致：preset 是管理岗，默认 `SOUL.md` 却是通用身份。

## 决定

1. **分发**：手工 tgz 是当前渠道；`package.json` 的 `engines.dsh`（`>=0.2.1-rc.2 <0.3.0`）与 `engines.node` 是机器口径；`dsh.compatibility.dshReleases` 只作历史 typecheck 台账。Web 用官方 preset 选择面，headless 用 profile patch；升级/备份/卸载写进生成的安装手册。不新增包内 app bin，不替用户改默认。
2. **数据边界**：agent 物 = 代码、preset、策展技能、种子、默认身份；用户数据 = `<dataDir>` + `<operatingDir>`（插件拥有）以及 sessions/credentials/settings/storages（宿主拥有）；deliverables 属用户数据。一人一 `DSH_HOME`。交接物用 [`handoff-scan.mjs`](../../scripts/release/handoff-scan.mjs) 扫；备份/恢复用 [`assistant-data`](../../packages/dsh-smart-assistant/src/cli/assistant-data.ts) 的两目录 bundle（manifest `schemaVersion: 1`，目标必须空，未知 schema 拒绝）。合同 = [`docs/delivery.md`](../../docs/delivery.md)。
3. **独立启动**：解开的包目录 + 已安装的兼容 `dsh` + 包内 [`bootstrap.mjs`](../../packages/dsh-smart-assistant/bootstrap.mjs)。它在 `--home` 下建隔离 `DSH_HOME`/workspace/agents-home/tmp，建 `assistant-standalone` profile，装当前包，起 `--port 0`；不碰日用 `~/.dsh`，可 `--stop`。没有 `dsh` 的环境不是这条路径。
4. **出厂身份**：`DEFAULT_SOUL` 是管理岗；旧通用种子只作精确迁移对象，新 home 不再种它。管理种子随包（`seeds/management`），只在显式 `expert-setup` 时导入为 `draft`；安装不写 working folder，`stable` 仍是人审。

## 交付物

- 机器兼容：`engines.dsh`/`engines.node`；`release-smoke` 的负例证明不兼容被拒；`export-dist` 与 `release-smoke` 对 tarball 跑 handoff scan。
- 安装/生命周期：Web UI 选择 + headless 附录；升级保数据；卸载留数据；手册由 `export-dist` 生成。
- 数据：`docs/delivery.md`、handoff 扫描、`assistant-data` 导出/导入、安装零写入、两目录契约。
- 独立启动：`bootstrap.mjs` + clean-room smoke（无 `.git` 提取包、隔离 home、preflight、stop）。
- 出厂：管理岗默认身份、种子随包、显式装配；组合/行为回归覆盖。

## 输掉的方案

- **包内 `bin` 直接起应用**：违反“只有 dsh profile 启动应用”；独立启动用部署包装，不新增应用入口。
- **数据放代码目录、拷目录即交接**：升级/复制/交接混在一起，且会把凭据/会话/交付物带走。
- **安装时自动改默认 preset 或自动导入 seeds**：安装即写用户数据/抢用户默认；没有 post-install hook，也不可逆。
- **只保留 `dsh.compatibility` 表**：机器不读；兼容失败会变成静默跳过。
- **现在转 npm/registry**：release 流程、provenance、支持承诺都不成立；手工 tgz 够用，触发条件是真实外部用户/更新节奏。
- **把 DSH 一起打包做“无 dsh 也能跑”**：版本/体积/升级变成另一个产品；本轮明确不做。
- **同一实例多租户**：DSH 的 home 级持久化模型没有租户面；跨到宿主 auth 是另一个立项。

## 后果

- 交接物、备份物、独立实例的数据根各有明确 owner；`gitignore` 不再被当成拷贝边界。
- 手工 tgz 与 Web UI 选择是当前用户路径；没有 `dsh`、npm 正式发行、多租户都留在范围外，触发条件写在归档的收口卡。
- 第二机真人走查与管理岗话术/种子口味仍是开放项（收口卡记录，触发 = 本人日常使用/第二台机器）；机械 clean-room 已过，不冒充真人走查。
