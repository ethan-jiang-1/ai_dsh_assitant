# dsh-smart-assistant

一个 DSH 插件：**一个领域专家式的助手，它拥有一个自己的 working folder（跨会话的工作目录）**。

核心命题借自 `Agent = Model + Harness` —— 模型决定上限，**那一圈**决定你能拿到多少。
本 repo 做的就是那一圈：给 agent 一个**跨会话存在的 working folder**，并让它始终"有用的多、没用的少"。

## working folder 有四个房间

| 房间 | 放什么 | 出口 |
|---|---|---|
| `memory/` | 已确立的事实 / 偏好 / 决定 | 被取代或退役 → `archive/` |
| `research/` | **意图还不清晰的探索**（backlog） | `promote`（成立 → 记忆/技能/知识页）/ `park` / `drop`（不成立 → 归档并**必写理由**） |
| `skills/` | 学到的本事（DSH 技能格式） | 按需加载；退役 → `archive/`（不删可恢复）；提案制：`propose_skill` → 人审 → `land_skill` |
| `knowledge/` | 领域知识页（概念/实体/来源，`[[互链]]`，OKF 字段子集） | `draft`（不进检索）→ 人审 `stable`；`deprecated` 留原地（链接不断） |

**桌面与抽屉**：常驻上下文的只有一份**有界摘要**（精选记忆 + 开放线索 + 知识目录树）；
完整记录、归档、技能正文都在抽屉里，用工具取。过程性知识（怎么写记忆、怎么养护、怎么复盘）
一律放技能，不占常驻上下文。

## 四个工具

| 工具 | 动词 |
|---|---|
| `assistant_memory` | `recall` `save` `forget` `list` `curate` |
| `assistant_research` | `open` `update` `park` `drop` `promote` `list` |
| `assistant_reflect` | `brief` `save_skill` `retire_skill` `save_page` `propose_skill` `land_skill` |
| `assistant_knowledge` | `search` `get`（只读检索，附反链） |

`curate` 是**机器能跑的养护检查**（重复、悬空引用、摘要预算、过期线索、技能遮蔽/退役/断链/
凭据、知识页断链/孤页/过期）—— 能让代码查的，别让 AI 自己说。

## 装法

```sh
dsh plugin --profile <p> add <npm-name>                            # 发布后
dsh plugin --profile <p> add file:./packages/dsh-smart-assistant   # 本地
```

装完做两件事：① preset roster 要能看到 `assistant`（把 `agent-presets` 的 `roots` 指向安装后的
`presets/` 目录，或把该目录拷进 `<dshHome>/.agent-presets/`）；② 会话挂上 `assistant`。

## 开发

```sh
git submodule update --init     # vendor/dsh submodule（pin 的唯一出处：`vendor/UPSTREAM.md`，`pnpm verify` 强制一致）
pnpm install
pnpm typecheck && pnpm test && pnpm verify
```

首次进入到此为止。日常开发环（dev / dev-task 两个 profile 各自验什么、one-shot 与 Web UI 的分工、
换 pin 的步骤）唯一出处是 `AGENTS.md` 命令表与 `docs/dev.md` —— 本段不复制它：这份重复已经烂过一次
（`notes/implemented/2026-09-23-doc-consistency.md` 第 1 条）。

契约在 `docs/`（`docs/home.md` 是 working folder 的契约，`docs/identity.md` 是身份名），
决策与被否决的方案在 `notes/`，agent 的入口链在 `AGENTS.md`。
