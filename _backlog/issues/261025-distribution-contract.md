---
status: 推敲中
opened: 2026-10-25
---

# 推敲：分发合同——另一个人装得上、升得动、退得干净

> 立卡：2026-10-25 ｜ 状态：推敲中 ｜ 类型：Task ｜ 可关闭：否 ｜ 毕业：做现在

**问题与期望结果：** 本仓已有一条被机械验证的“手工分发”通道（tgz + 生成手册 + clean-home smoke），但它服务的是“作者把包递给另一个能自己配 DSH 的人”，还不是“不同人拿来就能用”。期望得到一份可执行的分发合同：支持矩阵明确；干净机器按文档装起并选到助手；不兼容 DSH 被明确拒绝；升级保留 working folder 与账本；卸载不删数据；手册与包元数据不漂。

**当前情况：** `export-dist` 出 tgz + 手册，`release-smoke` 覆盖干净 home 安装、web profile 安装后仍是 standard、再手写 profile patch 切到 assistant、组合断言（[export-dist.mjs](../../scripts/release/export-dist.mjs)、[release-smoke.mjs](../../scripts/release/release-smoke.mjs#L149-L167)）；tag 与 manifest 版本有门禁（[dev.md](../../docs/dev.md#L350-L363)）。但：

- 兼容性有两套口径：`dsh.compatibility.dshReleases` 是给人看的，DSH 实际读 `engines.dsh` 或 peer 范围；本包没有 `engines.dsh`（[package.json](../../packages/dsh-smart-assistant/package.json#L16-L22)、[研究档](../research/tech-exploration/261025-dsh-plugin-delivery-facts.md)）。
- 安装是两段式：装 bundle + 手改 profile YAML（[安装手册](../../_dist/安装手册.md#L29-L44)）；Web 其实有官方 preset 选择面，但手册没写。
- 生命周期只有安装/验证/卸载，没有升级、回滚、备份；包 README 指向 `../../docs/...`，tarball 里没有这些文件；没有 `engines.node`/支持矩阵的机器声明。

**未决问题：**

1. 到底声明支持哪些 DSH 版本？只声明当前 pin，还是保留 0.1.5/0.1.7/0.2.0？后者必须实测，不能靠“验证过”的历史表。
2. Web 的 UI 选择在干净 home 上是否真的出现 `章鱼管家`、能否设为默认？需要真机证据；若不出现，才退回“手册写 YAML + 记录缺口”。
3. `dsh plugin add <新 tgz>` 的升级语义是覆盖、重装，还是必须先 remove？要在干净 home 实验，不能只写“应该可以”。
4. “一条命令、不写 YAML”是否硬验收？本卡按“UI 选择 + headless 附录”验收；若必须一条命令，另立 setup helper 的卡。

**下一步：** 先做干净 home 的 Web preset 探针与升级实验；按结果定 `engines.dsh` 范围、改手册、扩 `release-smoke`；然后由交付合同 note 的 S1 切片接管实施（授权后台账在收口卡）。

## 已知与未决

- **已知**：`dsh plugin add` 装 tgz 可用；clean-home web profile 路径被 smoke 证明；Web preset 选择面与 `selectedDefault` 的合同存在；headless 没有 UI，必须 profile patch。
- **未决**：支持矩阵的版本边界；旧版本是否真的可用；升级命令语义；UI 路径的实测结果。

## 方案与取舍

**选 A：保留手工 tgz，补齐兼容与生命周期，不新增 CLI。**

- 包元数据：加 `engines.dsh`（只覆盖实测范围），对齐或删掉 `dsh.compatibility.dshReleases` 的旧表；补 `engines.node`、`repository`、`license` 文件（若决定保留 MIT）。
- 安装：Web 手册先写 Settings / 新会话的 preset 选择；headless 附录保留 `agent-preset-registry.default` 的 profile patch。
- 生命周期：补升级、回滚、备份、卸载；升级必须用干净 home 实验证明 working folder 与账本不丢。
- 门禁：`release-smoke` 增加“不兼容 DSH 被拒”的断言（用同一兼容性纯核喂假版本，而不是真装一个旧 DSH）；手册继续由 `export-dist` 生成，不手改。

**落选的方案：**

- **只保留 `dsh.compatibility` 表**：机器不读，等于没有兼容声明；OpenViking 0.5.8 被静默跳过的先例说明代价。
- **安装时替用户改默认 preset**：DSH 没有 post-install hook；`selectedDefault` 是用户设置，静默覆盖是抢方向盘。
- **包内加 `bin` 直接起应用**：违反“只有 profile 启动应用”的平台规则；独立启动用引导脚本，不用包内 app bin。
- **现在转 npm/registry**：需要 release 流程、provenance、支持承诺；本轮手工 tgz 已够，触发条件是出现真实外部用户/更新节奏。
- **现在加 setup CLI**：只在 UI 路径被实测证伪后再做；先把官方路径走通，避免多一层要维护的面。

## 验收标准

| 行为 | 类别 | 输入/状态 | 通过信号 | 负例/恢复 | 证据 owner | 人判断 |
|---|---|---|---|---|---|---|
| 干净机器装起并选到助手 | 编排 | 支持矩阵内的 DSH，空 `DSH_HOME`，装 tgz | `dsh plugin add` 成功；Web preset 组出现 `章鱼管家`；设为默认后新会话 header/preset 为 `assistant` | preset 不出现 = 记录缺口并回退到 headless 式 patch；不得静默当“已装好” | clean-home 脚本 + `pnpm preflight` + `pnpm shots --dom` 证据；`release-smoke` 断言组合 | 首屏/选择话术是否清楚 |
| 不兼容 DSH 被明确拒绝 | 确定性 | manifest 的 `engines.dsh` 与一个假的不满足版本 | 兼容纯核返回未满足项；CLI 拒绝信息含包名、版本、范围与下一步 | 假版本满足时不得误拒；空/非法范围必须判不兼容 | `evaluatePluginCompatibility` 纯核 spec（正反例）；manifest 断言 | 无 |
| Headless 路径可用 | 编排 | headless profile，无 UI | profile patch 后 `--dump-config` 见 `preset-assistant`；one-shot 进 assistant | patch 写错/漏写 = dump 不出现；必须报错或文档给出判据 | `release-smoke` 的 headless + preset-runner；`--dump-config` | 无 |
| 升级保留数据 | 确定性/编排 | 旧 tgz 装好并写入 memory/ledger，再装新 tgz | 升级后文件仍在、账本 revision 不丢；`curate` 不报结构性损坏 | 升级失败可回退旧包；数据不得被新包静默重写 | 干净 home 升级脚本；`tests/` 或 `scripts/release` 新断言 | 无 |
| 卸载不删数据 | 确定性 | 装好并写入数据后 `dsh plugin remove` | dump 不再提插件；`<home>/assistant` 与 `<home>/assistant-operating` 仍在 | remove 后数据被删 = 红线；备份说明必须存在 | clean-home 脚本；手册卸载节 | 无 |
| 手册覆盖完整生命周期 | 编排 | 重新 `pnpm export-dist` | 手册含安装、preset 选择、headless 附录、升级、备份、卸载；无本机绝对路径/真 key | 旧版本手册/旧 tgz 不匹配 = 门禁红 | `export-dist` 的 release 门禁；真人走查 | 走查者能否照抄 |

## 关闭条件

- `engines.dsh` 与支持矩阵落地；旧“已验证”表不再与机器口径冲突；不兼容拒绝有正反例证据。
- Web 选择路径与 headless 路径都被干净 home 证明；手册按 `export-dist` 重出；升级/备份/卸载有可执行证据。
- 结论与残留路由到 [交付合同 note](../../notes/proposed/2026-10-25-delivery-contract.md) 与授权后的收口卡；不能在本轮完成的，写清触发条件或明确砍掉。
