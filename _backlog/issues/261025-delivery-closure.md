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
| 面 | Web（UI 选择 preset）+ headless（profile patch） | Web UI 路径已由 S1 clean-home 探针证明；headless 由 `release-smoke` 覆盖 |
| OS | 跟随 DSH 支持面 | 本仓未单独做 Linux/Windows 矩阵，不声称额外支持 |

## 切片台账

| 片 | 状态 | 证据 |
|---|---|---|
| **S0 基线与合同** | 已交付 | 四张问题卡 + [交付合同 note](../../notes/proposed/2026-10-25-delivery-contract.md) + [DSH 事实](../research/tech-exploration/261025-dsh-plugin-delivery-facts.md)；`pnpm verify` 48 checks；基线 `pnpm release-smoke` passed（515 files，clean-home 装/组合/OV 缺席在场）；commit `15d2dfd`；支持矩阵见上 |
| **S1 分发合同** | 已交付（2026-10-25） | `engines.dsh`/`engines.node` + gate + 负例 smoke；手册 UI-first/headless/升级/备份；`agent-preset-ui` 探针；0.0.9→0.1.0 升级保留数据；commits `311994f`、`5afb7d9` |
| **S2 出厂身份** | 已交付（2026-10-25） | 管理岗默认 `SOUL` + legacy migration；`seeds` 随包（529 条目，seeds ×8）；`bin/expert-setup` 独立可跑；安装零写入断言；commit `c2839e7` |
| **S3 数据边界** | 已交付（2026-10-25） | `docs/delivery.md`；handoff scan（tarball clean，534 条目）；`assistant-data` 导出/导入（manifest v1、空目标、临时目录 rename）；installed bin 往返；commit `53180da` |
| **S4 独立启动** | 已交付（2026-10-25） | `bootstrap.mjs`；无 `.git` 提取包 clean-room：URL/隔离 home/workspace/agents-home/preflight/stop 全过；手册 §十；commit `8531210` |
| **S5 收口** | 待做 | 全矩阵、第二机走查、文档、`export-dist`、归档 |

### S1 证据（2026-10-25）

- **兼容**：`package.json` 加 `engines.dsh = >=0.2.1-rc.2 <0.3.0` 与 `engines.node = ^22.19.0 || >=24`；`vendor-release` 门禁要求两者非空，负例夹具造红；`release-smoke` 用改了 `engines.dsh = >=999.0.0` 的 tarball 证明安装被拒且报出兼容要求（真实 tarball 安装成功，证明当前范围覆盖 pin）。
- **Web UI**：干净 home（临时 `DSH_HOME`）装 tgz → `pnpm preflight` 绿 → [agent-preset-ui](../../dev/probes/web/agent-preset-ui.mjs) 探针打开 Settings → Agent 预设，看到自定义组 `章鱼管家`，点击“设为新任务默认”后 aria-label 变为“新任务默认: 章鱼管家”；随后新建会话的 session header 为 `agentPreset: "assistant"`。首版探针用 `includes` 匹配“新任务默认”子串，把“设为新任务默认”误判成已默认（假绿）；改成全等后从 standard 状态实点通过。
- **升级**：合成旧包 0.0.9（只改 tarball 内版本）→ `dsh plugin add` 装旧包 → 写 memory 与 ledger → 直接 `add` 0.1.0，版本更新、两处数据保留、`--dump-config` 仍有 `preset-assistant`。真实下一版的 0.1.0→新版 fixture 留到 S5。
- **手册/门禁**：手册改为 UI-first，headless patch 移到附录，补升级/备份/uninstall；Node 范围与 `engines.node` 对齐；`export-dist` 重出；`pnpm verify` 48 checks、`pnpm test:tooling` 293 tests、`pnpm release-smoke` passed。

### S2 证据（2026-10-25）

- **默认身份**：`DEFAULT_SOUL` 改为管理岗（P1）；旧通用种子只作 `LEGACY_GENERIC_SOUL` 的显式迁移对象，新 home 不再种它。组装层的 `assistant:soul` 断言、host 根文件测试与 composition 测试都改为管理岗短语。
- **seeds 随包**：`files` 加 `seeds`；`export-dist` 清单断言 `package/seeds/management/management-lens-ceo.md`、`lib/cli/expert-setup.js`、`bin/expert-setup.mjs`；当前 tarball 529 条目、seeds ×8。
- **显式装配**：`src/cli/expert-setup.ts` 是 repo CLI 与 shipped bin 的唯一实现；`bin/expert-setup.mjs` 只导入 `lib` 与 `yaml`，从已安装 profile 的 node_modules 直接跑通，不依赖 DSH peers。8 页以 `draft` 落 knowledge、`generated.by = process:expert-setup`、sources 带 `seeds/management/...` 与 seed 自带 provenance；重复运行幂等；已有 `stable/deprecated` 不回滚；编辑过的 SOUL 不覆盖；旧通用 SOUL 只精确迁移一次。
- **安装零写入**：`release-smoke` 在 `dsh plugin add` 后断言 `<home>/assistant` 不存在；种子只在显式 bin 的 `--data-dir` 下写入。
- **回归**：`pnpm --filter dsh-smart-assistant exec vitest run` 126 files / 1005 tests 通过；`pnpm eval` 11/11 通过（desk-daily-brief 1 个 web-only NOT EVALUATED）；`pnpm verify` 48 checks；`release-smoke` 过（含 installed expert-setup 的两个断言）。

### S3 证据（2026-10-25）

- **边界合同**：[`docs/delivery.md`](../../docs/delivery.md) 拥有 agent 物 / 插件数据 / 宿主数据 / deliverables 四处归属；一人一 `DSH_HOME`；交接物只含 agent 物。
- **handoff 扫描**：[`scripts/release/handoff-scan.mjs`](../../scripts/release/handoff-scan.mjs) 接受目录或 tarball；核 = [`scripts/release/handoff-core.mjs`](../../scripts/release/handoff-core.mjs)。拒绝 `assistant/`、`assistant-operating/`、`sessions/`、`deliverables/`、`profiles/`、`storages/`、`logs/`、`dev/harness-home/`、`dev/trial-home*`、`.tmp/`、`.desk/`、`.pi/`、`_dist/`、`node_modules/`、`.git/`，任意深度的 `.env*`/credentials/`auth.json`/`*.key`/`*.pem`/SSH key，机器绝对路径与明显活密钥，以及符号链接。负例夹具覆盖数据/凭据/宿主路径/密钥；`export-dist` 与 `release-smoke` 对真实 tarball 调用，均 clean。
- **数据 bundle**：[`bin/assistant-data.mjs`](../../packages/dsh-smart-assistant/bin/assistant-data.mjs) + [`src/cli/assistant-data.ts`](../../packages/dsh-smart-assistant/src/cli/assistant-data.ts)。bundle = `assistant/` + `assistant-operating/` + `manifest.json`（`schemaVersion: 1`）；不含 sessions/credentials/settings/storages。导出目标必须空；导入目标必须空；未知 schema 拒绝；导入先写 sibling temp 再 rename；测试覆盖往返、非空拒绝、未知 schema、缺 working folder。`release-smoke` 从已安装 profile 跑通 export → import，并恢复 `SOUL.md`。
- **升级/迁移**：S1 的合成 0.0.9→0.1.0 探针已证明新 tgz 更新版本且 working folder/账本保留；真实下一版的 0.1.0→新版 fixture 留 S5。数据读取按文件格式向前兼容，安装不静默重写。
- **门禁**：`pnpm verify` 48 checks；full tests 128 files / 1011 tests；`pnpm release-smoke` 534 条目、handoff clean、installed `assistant-data` 往返通过。

### S4 证据（2026-10-25）

- **脚本**：[`bootstrap.mjs`](../../packages/dsh-smart-assistant/bootstrap.mjs) 是部署包装，不是应用入口；它用已安装的 `dsh` 建 `assistant-standalone` profile，装当前包，设部署默认，起 `--port 0`，打印 URL/停止命令。`DSH_HOME`、workspace、agents-home、tmp 都在 `--home` 下；拒绝日用 `~/.dsh` 与 shipped profile 名；支持 `--stop`、`--no-start`、`--offline`、`--dsh`。
- **clean-room**：[`scripts/release/standalone-smoke.mjs`](../../scripts/release/standalone-smoke.mjs) 打包 → 解到 `.tmp`（无 `.git`）→ 用 wrapper `dsh` 跑 bootstrap → 读 `bootstrap.json` → preflight 绿 → `--stop` → 进程消失、pid 文件移除。结果：profile/package/workspace/agents-home 都在隔离 home；preflight 绿；停止干净。
- **红绿**：首跑在 `verify composition` 红——profile 模板是“注释 + `[]`”，脚本把 block 追加在 `[]` 后面，成了两个 YAML 文档；改成替换 `[]` 行后从同一状态复跑绿。这不是文档补丁，是脚本真 bug。
- **前提与未取**：`dsh` 是硬前提；`--offline` 只设 pnpm offline 环境，未在冷 store 上真跑；“无 dsh 便携包”明确不做。手册 §十 与 [docs/delivery.md](../../docs/delivery.md) 已写。

## 仍未取

- 旧 DSH 版本（0.1.5/0.1.7/0.2.0）是否支持：当前按不支持处理；只有实测通过才写进矩阵。
- 真实下一版发布时的 0.1.0→新版升级 fixture（本次用合成 0.0.9 证明机制，不假装是真实历史版本）。
- 离线 `yaml` 的预置/随包方案；没有 `dsh` 的环境明确不做。
- 冷 pnpm store 下的 `--offline` 走查（S5；当前只实现并文档化，未在冷 store 真跑）。
- 第二机真人走查（S5；agent dry run 不替代）。
- 管理岗话术与 8 页种子的“像样/有用”人审口味（S5 走查一并看；eval 只证明不退化，不证明口味）。
- S1 的 Web UI 探针目前是人工调用的 `node dev/probes/web/agent-preset-ui.mjs <URL>`；S5 全矩阵可把它挂进一次性 home 走查，不冒充 `release-smoke` 自动步骤。

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
