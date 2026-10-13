# AGENTS.md —— `dev/` 子树常设指令

> 根 [`AGENTS.md`](../AGENTS.md) 管全仓规则；本文件拥有**开发环境**的常设指令。
> 进了这个目录再读本文件——DSH 原生指令装载器按目录链加载。

## 双 home 是硬边界

硬规则的**唯一全文** = 根 [`AGENTS.md`](../AGENTS.md) 硬规则 1（永远强制 dev home、唯一出口 `ASSISTANT_DSH_HOME`、**任何情况下不碰日用的 `~/.dsh`**）；隔离机理与判据 owner = [`docs/dev.md`](../docs/dev.md) §一。本目录只补 dev 树的落地：

- 本目录的运行残留（harness home、profile 装出来的东西）在 `.gitignore` 保护下；
  **不要把 dev home 里的状态当仓库内容提交**。

## 两个 profile，各自验什么

| profile | 形态 | 验什么 |
|---|---|---|
| `dev`（web） | Web UI 会话 | **preset 行为**：自有工具、persona、常驻段落与摘要（清单以生成物 [`docs/package-catalog.md`](../docs/package-catalog.md) 为准）——真实会话在这里验 |
| `dev-task`（headless） | one-shot | **host 面冒烟**：插件装载、服务行、working folder scaffold |
| `dev-task` + [`preset-runner.patch.yml`](probes/session/preset-runner.patch.yml) | one-shot + preset 挂载 | 自动化验证驱动：让 headless 会话也进 preset（不带 patch 仍是裸 agent——vendor 明文契约） |

**为什么不能合一**：机理与细节 owner = [`docs/dev.md`](../docs/dev.md) §四（headless 模板没有
roster 行可替换、两个 profile patch 语义不可互换），此处不复制机理。
（两者由 `env/setup.sh` 拷成各自 home 的 `cordis.patch.yml`；那是运行拷贝，不是源头。）

## 布局（工具按职责分家；运行数据原地不动）

| 目录 | 装什么 |
|---|---|
| `env/` | 启动器（`dsh.mjs`：home 强制 + 临时根收口）、env 兜底、prepare/setup、仓内临时根 helper（`tmp.mjs`）——起服务的那串全在这 |
| `profiles/` | 基础 profile patch（setup 拷贝进 home 的源；`profile-patch-expert.yml` 是 expert-setup 的装配件，非 setup 源） |
| `probes/session/` | one-shot 探针 patch（preset-runner / expert / recall / replay） |
| `probes/web/` | 浏览器探针（preflight / shots / web-expected / loop-probe / desk 走查·e2e·投影下载 / projection 系 + CDP 驱动 + 比对纯核 + replay 适配 + 共享库三件：`dialogue`（对话习语）/ `probe-service`（自编排服务）/ `probe-utils`（参数与 sleep）） |
| `fixtures/` | keyless 回放夹具（llm-replay）与投影/处理流夹具（desk-projection、desk-process） |
| `eval/` | 行为/领域评测（不与单元测试合并） |
| `reports/` | usage / desk-loop / 输入观察报告 |
| `deploy/` | 知识导入与专家装配 CLI（仓库用，非发行命令） |
| `experiments/openviking/` | 外部服务试验工具（只归位不执行） |
| `harness-home/` · `trial-home*/` | **忽略的运行数据**（含 30 天观察专用 home），原地保留（源码归位 ≠ 数据迁移） |

命令清单 owner = 根 [`AGENTS.md`](../AGENTS.md) 命令表（展开细节 = [`docs/dev.md`](../docs/dev.md) §四）——本表只回答「东西在 dev/ 的哪个抽屉」。

## 交给人之前

起 Web UI 后必须 `pnpm preflight '<URL>'`（门禁绿了再交）；命令清单 owner = 根 [`AGENTS.md`](../AGENTS.md) 命令表。
