---
status: 推敲中
opened: 2026-10-25
---

# 推敲：目录独立启动——无 `.git` 的目录在隔离环境里起一个自己的实例

> 立卡：2026-10-25 ｜ 状态：推敲中 ｜ 类型：Task ｜ 可关闭：否 ｜ 毕业：做现在

**问题与期望结果：** `pnpm start` 是作者本机的 dev 入口：它假定 `.git`、vendor 子模块、pnpm install、持久的 `dev/harness-home`，并把会话 cwd 钉在仓根（[start.sh](../../dev/env/start.sh#L26-L39)、[dsh.mjs](../../dev/env/dsh.mjs#L44-L68)、[dsh.mjs](../../dev/env/dsh.mjs#L151-L154)）。把目录拷贝到独立环境（没有 `.git`、没有作者的 home/密钥/历史）时，它起不来或会把作者数据一起带走。期望得到一条正式支持的独立启动路径：目录 + 已安装的 `dsh` + 显式数据根，起一个隔离 home 的 web 实例，用中性 workspace，不碰日用 `~/.dsh`，能干净收掉。

**当前情况：**

- DSH 的应用启动规则是“只有 profile 启动应用”，包内 `bin` 不能当应用启动器（[vendor/dsh/AGENTS.md](../../vendor/dsh/AGENTS.md#L13)）。官方干净环境路径就是 `DSH_HOME=<临时 home>` + `--from-default-profile` + `dsh plugin add` + `dsh --profile`（[release-smoke.mjs](../../scripts/release/release-smoke.mjs#L108-L167)）。
- 本仓已有隔离出口：`ASSISTANT_DSH_HOME`（启动器）与 `ASSISTANT_SESSION_CWD`（会话 cwd）；`dsh.mjs` 默认强制 `dev/harness-home`，不碰日用 `~/.dsh`。这是好基础。
- 但 `start.sh` 开头是 `git rev-parse --show-toplevel`，缺 vendor 时还会 `git submodule update --init`；默认 home 是持久的 dev home；默认 cwd 是仓根，会把本仓 `AGENTS.md` 注入给助手。没有 `--home`/`--fresh`/`--profile` 参数；没有无 `.git` 拷贝的 smoke；离线时唯一的 npm 依赖 `yaml` 没有预置方案。

**未决问题：**

1. 目标环境是否保证有兼容的 `dsh`？本卡按“有”设计；没有就把 DSH 一起打包，是另一个产品问题，不在本轮。
2. “独立环境”是否要求离线安装/启动？本卡按“启动可离线，但首次依赖需预置”设计；若完全离线，要把 `yaml` 预置或随包。
3. 数据根默认放哪？本卡按显式 `--home` 优先，缺省 `<dir>/data`；绝不放代码目录内部，也绝不默认 `~/.dsh`。
4. 接收者是开发者/运维还是最终用户？本卡按“能运行一条 bootstrap 命令的开发者/运维”设计；最终用户的向导是另一层，不在本轮。

**下一步：** 先在干净目录做无 `.git` 手跑，证明 profile/home/install/start 链能成立；再把步骤固化成 `bootstrap` 脚本与 smoke；最后补文档与离线前提。

## 已知与未决

- **已知**：官方 profile 路径可用；`ASSISTANT_DSH_HOME`/`ASSISTANT_SESSION_CWD` 已存在；`--port 0` 可避端口冲突；`preflight` 能证明装得上。
- **未决**：无 `.git` 拷贝的最小目录集；`yaml` 离线策略；首次模型凭据怎么给；profile 名与数据根的默认值。

## 方案与取舍

**选 A：目录内 `bootstrap` 脚本 + 已安装的 `dsh`，不新增应用入口。**

- 脚本从自身位置解析目录（不依赖 `.git`），要求 `dsh` 在 PATH 或 `DSH_BIN`。
- 参数：`--home <dir>`（默认 `<dir>/data`）、`--profile <name>`（默认 `assistant-standalone`）、`--port 0`、可选 `--tgz <path>`/本地包。
- 步骤：建 `DSH_HOME` → 从 `web` 模板建 profile（若不存在）→ `dsh plugin add` 本地包/tgz → 设中性 `ASSISTANT_SESSION_CWD`（如 `<home>/workspace`）→ 起 `dsh --profile` → 打印 URL/pid/停止命令。
- 不碰 `~/.dsh`；不在代码目录里写数据；不静默改用户全局默认 preset；停止后数据留在 `--home`。
- 离线：若目标离线，预置 `yaml`（pnpm store/缓存或随包打包）并在文档写清；不假装“零依赖”。

**落选的方案：**

- **只保留 `pnpm start`**：它服务作者本机的 dev 环，不适合目录交接；无 `.git` 直接断。
- **包内加 `bin` 起应用**：违反 DSH 应用启动规则；`ov-doctor` 是 doctor，不是 launcher。
- **把 `.git`/vendor/node_modules 一起拷**：体积大、平台相关、仍可能带作者数据；不是可移植方案。
- **默认写 `~/.dsh`**：会污染日用实例；隔离是这条路径的前提。
- **把 DSH 一起打包**：版本耦合、体积与升级都变成另一个产品；本轮明确不做。

## 验收标准

| 行为 | 类别 | 输入/状态 | 通过信号 | 负例/恢复 | 证据 owner | 人判断 |
|---|---|---|---|---|---|---|
| 无 `.git` 目录能起实例 | 编排 | 拷贝目录到 `.tmp/`，删除 `.git`，有兼容 `dsh` | `bootstrap --home <tmp>/data` 打出 URL；`preflight` 绿；新 home 有 profile | 缺 `dsh` = 明确报错并指路；缺 `yaml` = 指路，不半启动 | clean-room smoke + `preflight` + `--dump-config` | 运维能否照一条命令执行 |
| 数据根隔离且不碰日用 home | 确定性/编排 | `--home` 指定；日用 `~/.dsh` 存在 | 所有 profile/session/assistant/账本都在 `--home`；`~/.dsh` 无新写入 | 默认落到 `~/.dsh` = 红；`--home` 指向代码目录 = 拒绝或警告 | 路径断言 + 目录快照；启动器/脚本测试 | 无 |
| 会话 cwd 中性 | 编排 | 起实例后发一条消息 | session cwd 是 `<home>/workspace` 或显式值；不注入本仓 `AGENTS.md` | cwd=代码目录 = 红；`AGENTS.md` 抢 persona 可见 | 会话日志/`working_directory` 读回；探针 | 首屏是否像产品而不是仓库 |
| 首次模型凭据有路径 | 编排 | 新 home 无 credentials | 文档给出 `DEEPSEEK_API_KEY`/Settings 的配置步骤；无 key 时明确“未配置”而不是静默失败 | 无 key 仍假装可用 = 红 | 干净 home 走查；`--help`/文档 | 首次配置是否可照抄 |
| 离线/受限网络前提明确 | 编排 | 无 registry 访问 | 预置 `yaml` 后 `dsh plugin add` 成功；文档写明前提 | 未预置时失败信息指向 `yaml`，不指向无关错误 | 离线 smoke（或 registry 禁用实验）+ 文档 | 是否能接受“首次需联网/预置” |
| 收尾干净 | 编排 | 运行中实例 | 停止命令能收掉进程组；数据保留；端口释放 | 孤儿进程/端口占用 = 红；重复启动不撞 profile | 脚本/探针；`kill -TERM -- -<pid>` 判据 | 无 |

## 关闭条件

- `bootstrap` 脚本与无 `.git` clean-room smoke 落地；数据根/会话 cwd/日用 home 三条隔离有证据。
- 离线或预置 `yaml` 的前提写进文档；首次凭据路径可照抄；停止/收尾有判据。
- 结论与残留路由到 [交付合同 note](../../notes/proposed/2026-10-25-delivery-contract.md) 与授权后的收口卡；“无 dsh 环境”明确写为不做或另立卡。
