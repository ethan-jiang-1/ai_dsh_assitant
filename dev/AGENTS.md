# AGENTS.md —— `dev/` 子树常设指令

> 根 [`AGENTS.md`](../AGENTS.md) 管全仓规则；本文件拥有**开发环境**的常设指令。
> 进了这个目录再读本文件——DSH 原生指令装载器按目录链加载。

## 双 home 是硬边界

- **任何情况下不碰日用的 `~/.dsh`**：一切持久化（profile、凭据、会话日志、插件安装、
  working folder 的 `dataDir`）都由 `DSH_HOME` 决定，本仓一律指向 `dev/harness-home`。
- `pnpm dsh` 经 [`scripts/dsh.mjs`](../scripts/dsh.mjs) 启动，**永远强制**该值（覆盖继承来的任何值）；
  显式出口只有 `ASSISTANT_DSH_HOME`。绕过启动器直连 node 的调用（`release-smoke`、`setup.sh`）
  自己负责设置 `DSH_HOME`；[`dev/env.sh`](env.sh) 是兜底。
- 本目录的运行残留（harness home、profile 装出来的东西）在 `.gitignore` 保护下；
  **不要把 dev home 里的状态当仓库内容提交**。

## 两个 profile，各自验什么

| profile | 形态 | 验什么 |
|---|---|---|
| `dev`（web） | Web UI 会话 | **preset 行为**：四工具、persona、三段提示词段落、摘要——真实会话在这里验 |
| `dev-task`（headless） | one-shot | **host 面冒烟**：插件装载、服务行、working folder scaffold |
| `dev-task` + [`preset-runner.patch.yml`](preset-runner.patch.yml) | one-shot + preset 挂载 | 自动化验证驱动：让 headless 会话也进 preset（不带 patch 仍是裸 agent——vendor 明文契约） |

**为什么不能合一**：headless 模板不组成 roster（没有 agent-presets 行），web 模板才有；
`dev/profile-patch.yml` 用整行替换语义、`dev/harness-home/profiles/dev-task/cordis.patch.yml` 用 insert 语义，
两者互换即失配（细节 owner：[`docs/dev.md`](../docs/dev.md) §四）。

## 交给人之前

起 Web UI 后必须 `pnpm preflight '<URL>'`（门禁绿了再交）；URL 与命令的 owner 是
根 [`AGENTS.md`](../AGENTS.md) 命令表与 [`docs/dev.md`](../docs/dev.md)。
