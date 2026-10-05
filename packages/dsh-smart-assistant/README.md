# dsh-smart-assistant

一个 DSH 插件：给 agent 一个**自己的 working folder**（跨会话的工作目录），并让它始终"有用的多、没用的少"。

- **四个房间**：`memory/`（已确立的事实/偏好/决定）、`research/`（未决线索，backlog 语义）、
  `skills/`（学到的本事）、`knowledge/`（领域知识页，`[[互链]]`）。
- **四个工具**：`assistant_memory`、`assistant_research`、`assistant_reflect`、`assistant_knowledge`。
- **一个机器能跑的养护检查**：`assistant_memory action=curate`。
- **一个 agent preset**：`assistant`（挂上它，这个会话就是"有 working folder 的助手"）。

## 它是什么形状

**当前声明了什么，以生成物为准**：[`docs/package-catalog.md`](../../docs/package-catalog.md)
（由 `scripts/generate/gen-catalog.mjs` 从 exports、组合行、工具源码与技能目录抽取；`pnpm verify` 守 freshness）。
这里只留一句形状概括，不再手维护清单——手维护的入口表在本仓漂移过两次：

- **9 个 plugin 子路径**：host 1（`assistantMemory` 服务）+ preset agent 6（四个工具入口、两个提示词段落、
  `learn`）+ dev 专用 agent 1（`preset-runner`）+ client 1（浏览器面）。

装法、身份名、working folder 的契约分别在仓库的 `README.md`、`docs/identity.md`、`docs/home.md`。

## 依赖姿态

`@deepseek-ai/*` 一律 **peerDependencies**：DSH 的公开 API 仍是 pre-stable，
精确钉死会让每次上游同步都变成一次发版。验证过的 release 记在 `dsh.compatibility.dshReleases`。
`yaml` 是唯一的运行时 dependency。

## 自包含

发布产物（`lib/`、`presets/`、`cordis.patch.yml`）不引用 repo 内任何其他目录，也不引用 `vendor/`；
`pnpm verify` 机械检查这一点。真实安装形状（`npm pack` → 干净 home → `dsh plugin add`）
由 `pnpm release-smoke` 验证。
