日期：2026-10-26 · 状态：**implemented**
已归档：2026-10-30（演练记录；结论已由 10-25/10-26 的决定、安装手册与 docs/release.md 持有）

# Trigger simulations: second machine, cold store, next version

## 问题（可观察行为）

收口卡把三件事留成触发项：第二台机器走查、冷 pnpm store 离线、真实下一版迁移。没有触发不等于
形态安全；用一次性 home 做可复现的模拟，能把“会不会坏”与“真不真”分开。

## 决定与结果

1. **第二台机器（模拟）**：用假 HOME、独立 `DSH_HOME`/`DSH_AGENTS_HOME`/TMPDIR/neutral workspace，
   已发布 DSH CLI + 真实 tarball 走标准 `web` profile。模拟咬出并修掉三个只在标准安装出现的
   问题：client store 动态 require、品牌槽同优先级、以及 `bootstrap` 把解包目录当 link 导致
   profile 没有 `yaml`。修复后 Web 首屏正常、preset 选择探针通过、解包目录在仓外也能装配；
   bootstrap 保留打包 tarball，profile 的 `file:` 依赖指向该保留件而不是已删临时目录；
   整个 home 搬移后重跑 bootstrap 会检测失效依赖、重建 profile，数据目录保留；损坏/半写的 profile manifest 同样重建；home 的符号链接也会解析后检查，包内目标拒绝。
   **仍不是真人走查**：同一台机器、同一 OS 用户、自动化点击，口味与真实第二机留给本人。
2. **冷 store 离线（模拟）**：空 store + `--offline` 在 `yaml` 解析处明确失败
   （`ERR_PNPM_NO_OFFLINE_META`）；同 store 在线预热后 remove → offline add 成功，数据目录不受影响。
   **边界**：Corepack 首次下载 pnpm 仍需要网络；真正断网且机器没有 pnpm 时更早失败。安装手册已写。
3. **真实下一版迁移（模拟）**：用实际 0.1.4 tarball 写入数据（SOUL 手改、一页 stable、memory/ledger），
   再用带新 seed 的 0.1.5 模拟包覆盖安装；版本变 0.1.5，SOUL/memory/ledger 原样，stable 页保留
   status，重跑 expert-setup 后新 seed 以 draft 进入、旧 stable 不回落。**模拟包不是发布版**：
   它只证明文件级迁移形状，不替代下一次真实发版的包；后续真实 0.1.5 发布是另一个产物。

## 探索性补充（2026-10-26）

- 并发 `dsh plugin add` + `remove` 同一 profile：两个命令都可能 exit 0，最终状态由后写者覆盖（DSH CLI 无跨进程 profile 锁）。这是 DSH 侧限制，不在插件内修复；发布手册要求串行执行并用 `--dump-config` 复核。

## 测试资产卫生（2026-10-26）

- 标准 Web smoke 用假 HOME 时，Corepack 会去 registry 找 pnpm；网络一断就产生与产品无关的红。脚本现在把 `COREPACK_HOME` 指向调用者的工具缓存，并在首次安装失败时立即中止，不再继续启动/探测。
- `web-install-smoke` 可选 `--upgrade-tarball`：安装旧包 → 运行中升级 → 重启 → 再跑 client/UI；这是标准 web profile 的升级路径，不是 headless `upgrade-smoke` 的替代。

## 输掉的方案

- **把自动化点击写成“真人走查”**：环境、口味与真实机器都没有覆盖。
- **把冷 store 失败写成“离线不支持”**：预热后可用；失败点是 pnpm 元数据/首装，不是插件数据。
- **把合成的 0.1.5 当发布版**：它没有版本号/产物/tag 的发布承诺，只用于数据迁移模拟。
- **继续让第二机构建只靠 preflight**：preflight 绿但 client entry failed 的这次事故证明它不够。

## 后果

- 标准安装的 client boot 由 `standalone-smoke` 的浏览器检查兜底（无 Chrome 时明确 skip）。
- 离线部署的已知前提写进安装手册：pnpm/Corepack 已在机器上、yaml 已预热；冷缓存会明确失败。
- 三个触发项仍是“未取”：模拟只降低未知，不替代真人、真实断网与真实下一版。
