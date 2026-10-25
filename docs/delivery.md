# 交接、备份与数据边界（当前合同）

> 本文件拥有：**agent 物 / 用户数据**的边界、交接扫描、插件数据的导出/导入、备份恢复与升级的数据承诺。
> working folder 布局 = [`home.md`](home.md)；经营账本 = [`operating.md`](operating.md)；安装与分发 = 生成的 `_dist/安装手册.md`。
> 一个事实一个家：这里只写边界与操作合同，不复制四房间语义。

## 一、两个物

| 物 | 内容 | 归属 |
|---|---|---|
| **agent 物** | `lib/`、`bin/`、`presets/`、`seeds/`、`cordis.patch.yml`、`package.json`、`README`、默认身份与回退 | 包；可复制给任何人，不含用户数据 |
| **用户数据（插件拥有）** | `<dataDir>`（默认 `<dshHome>/assistant`）与 `<operatingDir>`（默认 `<dshHome>/assistant-operating`） | 某一个人的 home |
| **用户数据（宿主拥有）** | `sessions/`、credentials、`settings`、`storages`、`session-search.db` 等 | 同一个 home；不进插件备份/交接物 |
| **交付物** | working folder 根或会话 cwd 下的 `deliverables/`（模型自发落点，见 [`home.md`](home.md) §一注） | 用户数据；不进 agent 物 |

**一个人 = 一个 `DSH_HOME`。** profile 是组合，不是租户；不同人用不同 home（不同机器、不同 OS 用户或显式隔离 home），不共享插件数据目录。

## 二、交接

交接物是 **agent 物**：`pnpm export-dist` 的 tarball，或一份只含 agent 文件的目录。不要把整个开发仓目录直接递人——
`dev/harness-home/`、`.env.local`、`sessions/`、`deliverables/`、`.tmp/` 等都是运行现场。

机械检查：

```sh
node scripts/release/handoff-scan.mjs <目录或 tarball>
```

- 路径面拒绝：`assistant/`、`assistant-operating/`、`sessions/`、`deliverables/`、`profiles/`、`storages/`、
  `logs/`、`dev/harness-home/`、`dev/trial-home*`、`.tmp/`、`.desk/`、`.pi/`、`_dist/`、`node_modules/`、`.git/`；
  以及任意深度的 `.env`、`.env.local`、`.credentials.yaml`、`auth.json`、`*.key`、`*.pem`、`id_rsa`、`id_ed25519`。
- 文本面拒绝：机器家目录的绝对路径前缀（具体规则 = `scripts/release/handoff-core.mjs`）与明显的活密钥形状。
- 符号链接拒绝：交接物必须是普通文件，不能指向 home 外。
- `export-dist` 与 `release-smoke` 对 tarball 跑同一条扫描；扫描失败即发布物不可信。

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

**升级**：装新 tarball 不动用户数据；`--dump-config` 仍应有 `preset-assistant`，新会话验证一次。数据读取按文件格式向前兼容；
跨版本迁移是显式的，不在安装时静默重写。真实下一版的 0.1.0→新版 fixture 由发布走查补，不用合成版本冒充历史。

## 四、机械证据

| 面 | 证据 |
|---|---|
| 交接扫描规则 | [`tests/tooling/handoff-scan.spec.mjs`](../packages/dsh-smart-assistant/tests/tooling/handoff-scan.spec.mjs)（干净通过 + 数据/凭据/宿主路径/密钥负例；核 = [`scripts/release/handoff-core.mjs`](../scripts/release/handoff-core.mjs)） |
| 导出/导入 | [`tests/tooling/assistant-data.spec.mjs`](../packages/dsh-smart-assistant/tests/tooling/assistant-data.spec.mjs)（往返、manifest、非空拒绝、未知 schema 拒绝、缺 working folder 拒绝） |
| 发布物 | `pnpm export-dist` 的 tarball inventory + handoff scan；`pnpm release-smoke` 的 installed `assistant-data` 往返 |
| 安装零写入 | `release-smoke` 在 `dsh plugin add` 后断言 `<home>/assistant` 不存在 |
