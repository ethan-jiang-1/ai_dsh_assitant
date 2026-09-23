# dsh-smart-assistant

一个 DSH 插件：给 agent 一个**自己的家**（working folder），并让这个家始终"有用的多、没用的少"。

- **三个房间**：`memory/`（已确立的事实/偏好/决定）、`research/`（未决线索，backlog 语义）、
  `skills/`（学到的本事）。
- **三个工具**：`assistant_memory`、`assistant_research`、`assistant_reflect`。
- **一个机器能跑的养护检查**：`assistant_memory action=curate`。
- **一个 agent preset**：`assistant`（挂上它，这个会话就是"有家的助手"）。

## 它是什么形状

包里有 5 个入口（1 个 host 面 + 4 个 agent 面）：

| 入口 | 平面 | 内容 |
|---|---|---|
| `.` | HOST | `assistantMemory` 服务（家布局 + 三个房间的存储 + 摘要 + 养护检查） |
| `./memory-digest` | AGENT | 有界摘要提示词段落（桌面） |
| `./tool-memory` | AGENT | `assistant_memory` |
| `./tool-research` | AGENT | `assistant_research` |
| `./learn` | AGENT | `assistant_reflect` + 挂载"学到的技能"provider |

装法、身份名、家的契约分别在仓库的 `README.md`、`docs/identity.md`、`docs/home.md`。

## 依赖姿态

`@deepseek-ai/*` 一律 **peerDependencies**：DSH 的公开 API 仍是 pre-stable，
精确钉死会让每次上游同步都变成一次发版。验证过的 release 记在 `dsh.compatibility.dshReleases`。
`yaml` 是唯一的运行时 dependency。

## 自包含

发布产物（`lib/`、`presets/`、`cordis.patch.yml`）不引用 repo 内任何其他目录，也不引用 `vendor/`；
`pnpm verify` 机械检查这一点。真实安装形状（`npm pack` → 干净 home → `dsh plugin add`）
由 `pnpm release-smoke` 验证。
