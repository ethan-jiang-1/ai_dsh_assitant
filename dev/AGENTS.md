# AGENTS.md —— `dev/` 子树常设指令

> 根 [`AGENTS.md`](../AGENTS.md) 管全仓规则；本文件拥有**开发环境**的常设指令。
> 进了这个目录再读本文件——DSH 原生指令装载器按目录链加载。

## 双 home 是硬边界

- **任何情况下不碰日用的 `~/.dsh`**：一切持久化（profile、凭据、会话日志、插件安装、
  working folder 的 `dataDir`）都由 `DSH_HOME` 决定，本仓一律指向 `dev/harness-home`。
- `pnpm dsh` 经 [`dev/env/dsh.mjs`](../dev/env/dsh.mjs) 启动，**永远强制**该值（覆盖继承来的任何值）；
  显式出口只有 `ASSISTANT_DSH_HOME`。绕过启动器直连 node 的调用（`release-smoke`、`setup.sh`）
  自己负责设置 `DSH_HOME`；[`dev/env/env.sh`](env.sh) 是兜底。
- 本目录的运行残留（harness home、profile 装出来的东西）在 `.gitignore` 保护下；
  **不要把 dev home 里的状态当仓库内容提交**。

## 两个 profile，各自验什么

| profile | 形态 | 验什么 |
|---|---|---|
| `dev`（web） | Web UI 会话 | **preset 行为**：四工具、persona、三段提示词段落、摘要——真实会话在这里验 |
| `dev-task`（headless） | one-shot | **host 面冒烟**：插件装载、服务行、working folder scaffold |
| `dev-task` + [`preset-runner.patch.yml`](probes/session/preset-runner.patch.yml) | one-shot + preset 挂载 | 自动化验证驱动：让 headless 会话也进 preset（不带 patch 仍是裸 agent——vendor 明文契约） |

**为什么不能合一**：headless 模板不组成 roster（没有 agent-presets 行），web 模板才有；
`dev/profiles/profile-patch.yml` 用整行替换语义、[`profile-patch-headless.yml`](profiles/profile-patch-headless.yml) 用 insert 语义，
两者互换即失配（细节 owner：[`docs/dev.md`](../docs/dev.md) §四）。
（两者由 `env/setup.sh` 拷成各自 home 的 `cordis.patch.yml`；那是运行拷贝，不是源头。）

## 布局（工具按职责分家；运行数据原地不动）

| 目录 | 装什么 |
|---|---|
| `env/` | 启动器（`dsh.mjs`）、env 兜底、prepare/setup——起服务的那串全在这 |
| `profiles/` | 基础 profile patch（setup 拷贝进 home 的源） |
| `probes/session/` | one-shot 探针 patch（preset-runner / expert / recall / replay） |
| `probes/web/` | 浏览器探针（preflight / shots / web-expected / loop-probe + CDP 驱动 + 比对纯核） |
| `fixtures/` | keyless 回放夹具（llm-replay） |
| `eval/` | 行为/领域评测（不与单元测试合并） |
| `reports/` | usage / desk-loop 报告 |
| `deploy/` | 知识导入与专家装配 CLI（仓库用，非发行命令） |
| `experiments/openviking/` | 外部服务试验工具（只归位不执行） |
| `harness-home/` · `trial-home/` | **忽略的运行数据**，原地保留（源码归位 ≠ 数据迁移） |

命令与判据 owner = 根 [`AGENTS.md`](../AGENTS.md) 命令表与 [`docs/dev.md`](../docs/dev.md)——本表只回答「东西在 dev/ 的哪个抽屉」。

## 交给人之前

起 Web UI 后必须 `pnpm preflight '<URL>'`（门禁绿了再交）；URL 与命令的 owner 是
根 [`AGENTS.md`](../AGENTS.md) 命令表与 [`docs/dev.md`](../docs/dev.md)。
