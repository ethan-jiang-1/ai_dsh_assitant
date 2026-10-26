# 交接、备份与数据边界（当前合同）

> 本文件拥有：**agent 物 / 用户数据**的边界、交接扫描、插件数据的导出/导入、备份恢复与升级的数据承诺。
> 发布形态/渠道/版本/兼容宪章 = [`release.md`](release.md)；working folder 布局 = [`home.md`](home.md)；经营账本 = [`operating.md`](operating.md)；安装与分发 = 生成的 `_dist/安装手册.md`。
> 一个事实一个家：这里只写边界与操作合同，不复制四房间语义。

## 一、两个物

| 物 | 内容 | 归属 |
|---|---|---|
| **agent 物** | `lib/`、`bin/`、`presets/`、`seeds/`、`cordis.patch.yml`、`package.json`、`README`、默认身份与回退 | 包；可复制给任何人，不含用户数据 |
| **用户数据（插件拥有）** | `<dataDir>`（默认 `<dshHome>/assistant`）与 `<operatingDir>`（默认 `<dshHome>/assistant-operating`） | 某一个人的 home |
| **用户数据（宿主拥有）** | `sessions/`、credentials、`settings`、`storages`、`session-search.db` 等 | 同一个 home；不进插件备份/交接物 |
| **交付物** | working folder 根或会话 cwd 下的 `deliverables/`（模型自发落点，见 [`home.md`](home.md) §一注） | 用户数据；不进 agent 物 |

**一个人 = 一个 `DSH_HOME`。** profile 是组合，不是租户；不同人用不同 home（不同机器、不同 OS 用户或显式隔离 home），不共享插件数据目录。

### 数据平面映射（DSH 6+2）

本包按 DSH 的所有权/可见性/生命周期切分如下；这是本包的映射，不是把 DSH 平面改名。

| DSH 平面 | 本包 | 所有者 / 可见性 / 生命周期 |
|---|---|---|
| **D 定义** | `cordis.patch.yml`、preset 行、包内只读技能、Config 默认 | 包；只读；随包/版本 |
| **C 代码** | `lib/`、`bin/`、`bootstrap.mjs` | 包；只读；升级整体替换 |
| **W workspace** | 不拥有；只有用户自己的 `deliverables/` | 项目/用户；随项目；插件不写 |
| **U home** | `<dshHome>/assistant`（身份、记忆、线索、学到的技能、知识） | 插件拥有、用户可读可改；跨项目；升级/卸载保留 |
| **S session** | 宿主拥有；四个 prompt 段落随请求进日志；不新增 event 类型 | 会话；只追加；插件不写日志 |
| **H host state** | 不使用 `ctx.storageDomain`；`<dshHome>/assistant-operating` 是文件账本 | 插件拥有、用户可读；单 writer；可导出 |
| **K cache** | 只有内存摘要缓存，可重建；无磁盘 cache 真源 | 运行时；可丢弃 |
| **X credentials** | 宿主拥有；插件不读不写 | 用户/宿主；不进包、不进日志、不导出 |

刻意偏离：working folder 是**用户可见的 U 平面自定义根**，不是 `ctx.storageDomain` 的 host KV，也不是随项目走的 W；账本是**可导出的文件账本**，不是 H KV。理由与证据 = [`discipline.md`](discipline.md) 适配 13、[`release.md`](release.md) 与 `handoff-core`/`assistant-data`/`two-homes` 测试。

## 二、交接

交接物是 **agent 物**：`pnpm export-dist` 的 tarball，或一份只含 agent 文件的目录。不要把整个开发仓目录直接递人——
`dev/harness-home/`、`.env.local`、`sessions/`、`deliverables/`、`.tmp/` 等都是运行现场。

机械检查：

```sh
node scripts/release/handoff-scan.mjs <目录或 tarball>
```

- 路径面拒绝：`assistant/`、`assistant-operating/`、`data/`、`sessions/`、`deliverables/`、`profiles/`、`storages/`、
  `logs/`、`dev/harness-home/`、`dev/trial-home*`、`.tmp/`、`.desk/`、`.pi/`、`_dist/`、`node_modules/`、`.git/`；
  以及任意深度的 `.env`、`.env.local`、`.credentials.yaml`、`auth.json`、`*.key`、`*.pem`、`id_rsa`、`id_ed25519`。
- 文本面拒绝：机器家目录的绝对路径前缀（具体规则 = `scripts/release/handoff-core.mjs`）与明显的活密钥形状。
  文本面只检查不超过 512 KiB 的可读文本；二进制/压缩件不做内容检查，tarball 的清单边界另由 `export-dist` 守。
- 符号链接拒绝：交接物必须是普通文件，不能指向 home 外。
- `export-dist` 与 `release-smoke` 对 tarball 跑同一条扫描；扫描失败即发布物不可信。

交接后的独立启动用包内 [`bootstrap.mjs`](../packages/dsh-smart-assistant/bootstrap.mjs)：它用已安装的兼容 `dsh` 在 `--home` 下建一个专用 profile，先用 Node 的 `npm pack` 把当前目录打成 tarball 再装进 profile（这样 profile 拥有 `yaml` 依赖），然后起 `--port 0`；`DSH_HOME`、workspace、agents-home、temp 都在该 home 下，不碰日用 `~/.dsh`。home 默认在包目录**旁边**的 `assistant-data/`；指向包内会被拒绝。没有 `dsh` 的环境不是这条路径的范围。

允许的符号根：`~/.dsh`、`$DSH_HOME`、包内相对路径、`seeds/...`。手册和模型可见文案用符号根，不写宿主绝对路径。

## 三、备份、恢复与迁移

插件数据 = 两个目录；备份/恢复用包内 `assistant-data`（[`bin/assistant-data.mjs`](../packages/dsh-smart-assistant/bin/assistant-data.mjs)，
实现 = [`src/cli/assistant-data.ts`](../packages/dsh-smart-assistant/src/cli/assistant-data.ts)）：

```sh
node <DSH_HOME>/profiles/web/node_modules/dsh-smart-assistant/bin/assistant-data.mjs export \
  --assistant <DSH_HOME>/assistant --operating <DSH_HOME>/assistant-operating --out <备份目录>

node <DSH_HOME>/profiles/web/node_modules/dsh-smart-assistant/bin/assistant-data.mjs import \
  --in <备份目录> --assistant <DSH_HOME>/assistant --operating <DSH_HOME>/assistant-operating
```

- bundle = `assistant/` + `assistant-operating/` + `manifest.json`；manifest 的 `schemaVersion` 当前为 `1`。
- **不含** sessions/credentials/settings/storages；这些要另备整 home。
- `import` 要求两个目标目录不存在或为空；非空拒绝，不覆盖。导入先写 sibling temp，再 rename 就位。
- 未知 `schemaVersion` 拒绝导入；不猜、不半导入。
- 原始 `cp -R` 等价可用；它不校验 manifest，也不保证目标为空——需要“可验证的恢复”时用 `assistant-data`。

**升级/卸载**：装新 tarball 不动用户数据；`--dump-config` 仍应有 `preset-assistant`，新会话验证一次。数据读取按文件格式向前兼容；
跨版本迁移是显式的，不在安装时静默重写。`pnpm upgrade-smoke` 用合成旧包证明「旧→新→remove」的两目录边界；
真实下一版的 0.1.0→新版 fixture 由那次发布补，不用合成版本冒充历史。

## 四、证据 owner

回归资产与命令按 [testing.md](testing.md) 的**一页证据地图**；本文件不维护第二张表。直接入口：
交接扫描 = [`handoff-core.spec.mjs`](../packages/dsh-smart-assistant/tests/tooling/handoff-core.spec.mjs) + `release-smoke`/`export-dist` 对真实 tarball；导出/导入 = [`assistant-data.spec.mjs`](../packages/dsh-smart-assistant/tests/tooling/assistant-data.spec.mjs) + `release-smoke` 的 installed roundtrip；升级/卸载 = `pnpm upgrade-smoke`；独立启动 = `pnpm standalone-smoke`；Web 选择 = `pnpm agent-preset-ui '<URL>'`（需运行中的干净实例）。
