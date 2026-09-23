# dsh-smart-assistant

一个 DSH 插件：**一个领域专家式的助手，它拥有一个自己的家（working folder）**。

核心命题借自 `Agent = Model + Harness` —— 模型决定上限，**那一圈**决定你能拿到多少。
本 repo 做的就是那一圈：给 agent 一个**跨会话存在的家**，并让这个家始终"有用的多、没用的少"。

## 家有三个房间

| 房间 | 放什么 | 出口 |
|---|---|---|
| `memory/` | 已确立的事实 / 偏好 / 决定 | 被取代或退役 → `archive/` |
| `research/` | **意图还不清晰的探索**（backlog） | `promote`（成立 → 记忆或技能）/ `park` / `drop`（不成立 → 归档并**必写理由**） |
| `skills/` | 学到的本事（DSH 技能格式） | 被取代就改文件；模型按需加载 |

**桌面与抽屉**：常驻上下文的只有一份**有界摘要**（家地图 + 精选记忆 + 开放线索条数）；
完整记录、归档、技能正文都在抽屉里，用工具取。过程性知识（怎么写记忆、怎么养护、怎么复盘）
一律放技能，不占常驻上下文。

## 三个工具

| 工具 | 动词 |
|---|---|
| `assistant_memory` | `recall` `save` `forget` `list` `curate` |
| `assistant_research` | `open` `update` `park` `drop` `promote` `list` |
| `assistant_reflect` | `brief` `save_skill` |

`curate` 是**机器能跑的养护检查**（重复、悬空引用、摘要超预算、过期线索、缺理由的 drop、
技能 frontmatter 不合法）—— 能让代码查的，别让 AI 自己说。

## 装法

```sh
dsh plugin --profile <p> add <npm-name>                            # 发布后
dsh plugin --profile <p> add file:./packages/dsh-smart-assistant   # 本地
```

装完做两件事：① preset roster 要能看到 `assistant`（把 `agent-presets` 的 `roots` 指向安装后的
`presets/` 目录，或把该目录拷进 `<dshHome>/.agent-presets/`）；② 会话挂上 `assistant`。

## 开发

```sh
git submodule update --init     # vendor/dsh（钉在 dsh-v0.1.5-rc.2）
pnpm install
pnpm typecheck && pnpm test && pnpm verify
bash dev/setup.sh               # 幂等：dev（web 模板）+ dev-task（headless）两 profile + link 装插件
pnpm dsh --profile dev-task "one task"   # one-shot = host 面冒烟（one-shot 不进 preset，这是 DSH 契约）
pnpm dsh --profile dev --port 0          # Web UI；preset 行为（三工具/persona/摘要）在这里的会话里验
```

契约在 `docs/`（`docs/home.md` 是家的契约，`docs/identity.md` 是身份名），
决策与被否决的方案在 `notes/`，agent 的入口链在 `AGENTS.md`。
