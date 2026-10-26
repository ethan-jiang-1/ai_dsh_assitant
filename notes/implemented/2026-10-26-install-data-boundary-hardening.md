# 安装/分发/数据边界的硬化（bootstrap、备份、pnpm 前置）

日期：2026-10-26 · 状态：**implemented**

## 决定

**bootstrap 的 profile 名是目录名，不是路径。** 只接受
`^[A-Za-z0-9][A-Za-z0-9._-]*$`，拒绝 `.`/`..`/分隔符，保留名增加 `desktop`；`profileDir` 再做一次
`<home>/profiles` containment 校验。profile 修复里的 `rmSync(profileDir, { recursive: true })`
只能作用于该目录；home 也不能是 OS home 或文件系统根。`--home` 指向包内的拒绝保留。

**pnpm 是安装合同的一部分。** `engines.pnpm` 写 `>=10.6.0`：10.4 及更低以
`ERR_PNPM_ADDING_TO_ROOT` 拒绝安装，10.5 能装但忽略 profile `pnpm-workspace.yaml` 的
`nodeLinker`/`autoInstallPeers`。`bootstrap` 在创建 home 之前检查 pnpm 版本和 npm，失败时给出
人话而不是让 pnpm 在 profile 里报一个无关错误。`engines.pnpm` 缺失由 `verify` 的发布门抓。

**备份是普通数据，不是运行态。** `assistant-data` 的 export/import 排除
`writer.lock`、`*.tmp`、`*.takeover`；带这些文件的旧 bundle 在 import 时也会被剔除。符号链接在
export 和 import 两端都拒绝（备份必须只含普通文件/目录）。export 先写 sibling temp 再 rename，
复制失败不留下会阻塞下一次导出的半成品；`--out` 落在源目录内部时先拒绝。import 仍要求实例已停止、
目标为空。

**新数据按用户私有创建。** working folder 的新目录 0700、新文件 0600；`atomicWriteFile` 默认
0600（rename 会把旧 0644 inode 收窄）；账本、writer.lock、审计、ui-mode 同样 0600。既有目录/文件
不主动 chmod——升级不应改用户既有 inode，也不假设共享 home 的意图。

**跨 profile 的数据共享是事实。** 同一 `DSH_HOME` 下的 profile 共用 `assistant` 与
`assistant-operating`；手册不再把“换个 profile 名”说成隔离试用。真正隔离用独立 `DSH_HOME`，或
同时覆盖 memory/ledger/projection 的 `dataDir`。

**并发口径以代码为准。** DSH 0.2.1 的 `dsh plugin` 在 profile `package.json` 上取 120s 跨进程
文件锁；文档改为“仍建议串行，锁只保证最终状态”，并用两个并发 add 的探针钉住最终依赖/组合。

**Windows 是未验证矩阵。** 只做代码级加固：`.cmd` shim 走 shell + 参数引用、`taskkill /T` 收进程树、
`bootstrap` 的 stop 等待退出；不在真 Windows 上宣称通过。

## 输掉的方案

- **把 `yaml` bundle 进 tarball 换离线安装**：与“只发布 bundle、单一手工渠道”的发布宪章冲突，也会把
  依赖更新耦合进每次发版。保留真实 dependency，改为写清首次联网前提、预热 store/内网镜像，并用
  `engines.pnpm` 把最小 pnpm 变成可检查的合同。
- **只拒绝“解析后落在 bundle 外”的符号链接**：实现更复杂，而且备份语义仍会随链接目标变化；统一拒绝
  才能让“备份是普通文件”成为可机械解释的合同。
- **import 时跟随符号链接并 dereference 复制**：会把宿主任意文件读进恢复后的 home，且房间读路径会
  继续跟随；拒绝比复制安全。
- **对既有目录批量 chmod 0700**：会改用户已有 inode、可能破坏共享 home 的意图；只保护新数据，旧文件
  在下一次原子重写时自然收窄。
- **继续把 `cp -R` 当推荐备份**：没有 schema manifest、不会排除 `writer.lock`、不保证目标为空。
  它仍可作为手动等价路径，但必须显式删协调文件，主路径改为 `assistant-data`。
- **继续写“DSH 没有跨进程 profile 锁”**：与 0.2.1 的 `withFileLock` 实现不符；保留“建议串行”是保守
  操作口径，不是对锁能力的否认。

## 后果

- 旧版本导出的、带 `writer.lock` 的 bundle 仍可 import；带符号链接的旧 bundle 会被拒绝，需要先展开链接。
- 新装数据的默认权限比旧数据窄；旧 home 的既有文件保持原 mode，直到被插件原子重写。
- `desktop` profile 不能再由 `bootstrap` 接管；Desktop 的安装路径只在文档中标注，未在真机验证。
- pnpm 10.5 仍可能“装成功”，但不受支持；`engines.pnpm` 与手册都指向 10.6。 
