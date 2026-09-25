# AGENTS.md —— `packages/dsh-smart-assistant/` 子树常设指令

> 根 [`AGENTS.md`](../../AGENTS.md) 管全仓规则与本子树的入口；本文件只拥有**包内**的常设指令
> （一个事实一个家：包的形状与边界在这里，运行手册在 [`docs/`](../../docs/)）。
> 进了这个目录再读本文件——DSH 原生指令装载器按目录链加载，你所在目录的 owner 文件自动在场。

## 这是什么包

一个 **bundle**（不是 profile）：`package.json` 只声明 `dsh.bundle.patch = ./cordis.patch.yml`；
它贡献 1 个 host 行（服务）+ 7 个 agent 行（preset 的 agent 面），共 **8 个 plugin 子路径导出**。
它给 agent 一个 **working folder**（`dataDir`，默认 `<dshHome>/assistant`）——不是进程 cwd/workspace。

## 8 个入口，两个平面

| 入口（exports 子路径） | 平面 | 贡献什么 |
|---|---|---|
| `.` | HOST | `assistantMemory` 服务（= Service Definition，**同包同文件给出唯一 Provider**；Consumer = 下列各 agent 面入口） |
| `./tool-memory` | AGENT | 工具 `assistant_memory`（`recall` `save` `forget` `list` `curate`） |
| `./tool-research` | AGENT | 工具 `assistant_research`（`open` `update` `park` `drop` `promote` `list`） |
| `./tool-knowledge` | AGENT | 工具 `assistant_knowledge`（`search` `get`，**只读**；写入走 reflect/promote） |
| `./memory-digest` | AGENT | 提示词段落：有界摘要（`digestMaxBytes`） |
| `./home-preamble` | AGENT | 提示词段落：身份（`SOUL.md`）+ 手册（`AGENTS.md`） |
| `./learn` | AGENT | 工具 `assistant_reflect` + 挂载"学到的技能"provider（`assistant-learned`） |
| `./preset-runner` | AGENT | preset 挂载的 one-shot 验证驱动（`dev/preset-runner.patch.yml` 用） |

**四个工具不合并**：动词集互不重叠，合并只会让模型在错误的房间找东西。
**改模型可见面**（工具 description、提示词段落、persona 文本）必须同 diff 做三件事：
① 语言用英文（`AGENTS.md` 语言分工）；② `model-visible means logged`——必须能从会话日志重建；
③ 在 [`docs/identity.md`](../../docs/identity.md) 登记面与名，并配快照或真实组合断言。

## 包内 owner 面

| 模块 | 拥有什么 |
|---|---|
| `src/home/layout.ts` | **working folder 布局的唯一 owner**：路径、scaffold、种子文件、健康检查 |
| `src/home/` 其余 | frontmatter、Room 存储抽象、摘要渲染、手册渲染、节拍器、curate findings |
| `src/memory/` `src/research/` `src/skills/` `src/knowledge/` | 四个房间的**词汇与纯核**（校验、生命周期、检索排序、findings） |
| `src/tool-support/` | 四个工具共享的 presenter 管道（`presentationMeta` 投影与读回） |
| `src/tool-*/` `src/memory-digest/` `src/home-preamble/` `src/learn/` `src/preset-runner/` | 各 agent 面入口 |
| `src/index.ts` | 服务实现（host 面）：四个房间的读写、curate、digest、提案收件箱 |
| `presets/assistant/` | preset 组合（`agent.cordis.yml`）+ 策展技能（`skills/`，**模型用**） |
| `tests/` | 纯核 + 服务级合同 + 真实组合装载（服务级用真 cordis 构造，不依赖 DSH 运行时） |

## 本子树的纪律

1. **不在这里改** [`vendor/dsh/`](../../vendor/dsh/)：DSH 源码永不改，升级只走 `pnpm sync-dsh`。
2. **不在包内跑裸 node 起 harness**：一律经仓根 `pnpm dsh`（它强制 dev home，永不碰日用 `~/.dsh`）。
3. **改动分两层验**：纯核改 `tests/*.spec.ts`；模型可见面改必跑仓根真实组合测试
   （`presets/assistant/agent.cordis.yml` + Standing mount + 代理消费）与 `pnpm build`
   （组合测试与 `release-smoke` 消费 `lib/` 产物，不 build 会拿到旧行为）。
4. **包 README 与 `docs/` 的分工**：README 写"这个包是什么形状"；`docs/` 写"它现在的合同"
   （布局契约在 [`docs/home.md`](../../docs/home.md)）。两者都不写决策理由——那进 `notes/`。
