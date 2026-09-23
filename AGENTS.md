# AGENTS.md —— 本 repo 的常驻规则与入口链

> 给 coding agent 读的**几百词**：怎么跑、东西在哪、改动走哪条路。
> 详细契约在 `docs/`（只写**现在**）；决策与尸体在 `notes/`；身份名以 `docs/identity.md` 为唯一权威。

## 这是什么

一个 DSH 插件 repo：**一个领域专家式的助手**（`dsh-smart-assistant`）。
它给 agent 一个自己的**家**（working folder）：长期记忆 + 学到的技能 + 家的养护检查。
核心命题是 `Agent = Model + Harness` —— 本 repo 做的就是"那一圈"。

## 布局（改动前先认领 owner 面）

| 路径 | 是什么 | 谁能改 |
|---|---|---|
| `packages/dsh-smart-assistant/src/home/` | **家的布局契约**（路径、scaffold、地图、健康检查）—— 单一 owner | 改布局只动这里 |
| `.../src/memory/` | 记忆记录词汇、文件存储、检索、有界摘要 | 改记忆语义动这里 |
| `.../src/research/` | 探索线索（backlog）词汇与三档出口（promote/park/drop） | 改探索语义动这里 |
| `.../src/skills/` | `SKILL.md` 契约与校验写入 | 改技能文件契约动这里 |
| `.../src/tool-support/` | 三个工具共享的 presenter 管道（`presentationMeta` 投影与读回） | 改卡片行为动这里 |
| `.../src/tool-memory/`、`src/tool-research/`、`src/memory-digest/`、`src/learn/` | **agent 面**插件入口（工具 / 提示词段落 / 复盘） | 改模型可见面动这里 |
| `.../src/preset-runner/`、`dev/preset-runner.patch.yml` | **preset 挂载的 one-shot 驱动**（验证自动化：工具/摘要/persona 进 headless 会话） | 改验证驱动动这里 |
| `.../src/index.ts` + `cordis.patch.yml` | **host 面**：`assistantMemory` 服务 | 改服务/配置动这里 |
| `.../presets/assistant/` | preset（agent 面组合）+ 策展技能 | 改这个专家"会什么"动这里 |
| `tsconfig.base.json` / `tsconfig.tsx.json` | 两个解析门面（编译期手维护 / 运行期 `pnpm gen-paths` 生成） | 引入新 `@deepseek-ai/*` import 或换 pin 时动这里（契约：`docs/dev.md` §二「两个解析门面」） |
| `vendor/dsh/` | **钉住的 DSH 源码（submodule）** | **永不改**；升级走 `pnpm sync-dsh` |
| `docs/` | 当前合同（只写现在，无历史） | 门禁住了的事实进这里 |
| `notes/` | `intents.md` + `proposed/` + `implemented/` | 决策与输掉的方案进这里 |
| `dev/` | 开发 home 与 profile patch（运行残留 gitignore） | 环境问题动这里（启动/调试手册：`docs/dev.md`） |
| `scripts/` | 机械门禁（verify / release-smoke / sync-dsh） | 门禁问题动这里 |
| `snapshots/` | 行为回归的证据面（day 0 占位：先用测试 + 会话日志顶，见其 README） | 回归证据问题动这里 |

**语言分工**：人与本仓文档（docs/notes/AGENTS.md）用中文；进模型上下文的（persona、SKILL.md、工具 description）用英文；代码与脚本注释随所在文件现状，不整批改写。

## 命令表

```sh
pnpm install            # 并入 vendor/dsh 整树，首次较慢
pnpm gen-paths          # 从 vendor/dsh 重新生成运行期解析门面 tsconfig.tsx.json（换 pin 后必跑）
pnpm typecheck          # tsc -b：经编译期 paths 解析到 vendor/dsh 的 src（API 漂移在编译期暴露）
pnpm test               # vitest：只测纯核（home/memory/research/skills），不依赖 DSH 运行时
pnpm verify             # 机械门禁：结构/身份一致/两个解析门面/自包含/技能语法/断链/提交安全
pnpm build              # tsc 出 lib/（发布物与 dsh plugin add 需要）
pnpm release-smoke      # pnpm pack → 干净 home → dsh plugin add → 组合断言（真实安装形状）
pnpm sync-dsh -- --tag <dsh-tag>   # 换 submodule tag + SHA 簿记 + typecheck + 对照 docs/discipline.md 重校纪律表

bash dev/setup.sh       # 幂等：建 dev（web）+ dev-task（headless）两个 profile + link 装插件 + roster 指向 repo（两者为何不能合一：`docs/dev.md` §四）
pnpm dsh --profile dev-task "one task"  # one-shot = **host 面冒烟**（headless 不进 preset，vendor 明文契约）
pnpm dsh --profile dev --port 0 --no-open   # Web UI；preset 行为（三工具/persona/摘要）在这里的会话里验。交给人之前先 `pnpm preflight '<URL>'`（绿了再交，见 docs/dev.md §四）
pnpm dsh --profile dev-task --patch dev/preset-runner.patch.yml "<task>"   # **preset 挂载的 one-shot**（验证自动化驱动；不带 patch 仍是裸 agent 冒烟）
```

## 五条硬规则

1. **双 home**：`pnpm dsh` 经 `scripts/dsh.mjs` 启动，**永远强制** `DSH_HOME=<repo>/dev/harness-home`
   （覆盖任何继承来的值，包括日用的 `~/.dsh`；显式出口是 `ASSISTANT_DSH_HOME`）。
   绕过启动器直连 node 的调用（release-smoke、`dev/setup.sh`）自己负责设置 `DSH_HOME`；
   `dev/env.sh` 是它们与手工调用时的兜底。**任何情况下不碰日用的 `~/.dsh`。**
2. **探索路由**：要 DSH 机制结论，读 `vendor/dsh/docs/architecture.md` → `vendor/dsh/docs/capability-seams.md` → 对应包 README；
   要真实签名，读 `vendor/dsh/packages/**/src/`。**不猜 API，去读。**
3. **窄证据**：一次交付 = 一个垂直切片（代码 + 测试 + docs/README + note 同 diff）；
   只跑"会为这次回归而失败"的最小检查；**报告里只列真跑过的命令**。
4. **默认严格，偏离登记**：研发纪律的继承是**逐源枚举**过的，不是凭印象
   （全表：`docs/discipline.md`）；偏离或裁剪不是错——先在 note 里登记一行
   （约束 → 适配 → 证据），再动手。
5. **轮内任务面**：复杂任务开工用 plan 呈批、实施期用 todo 活清单（整表替换、完成即勾）、
   人可随时 steer —— 机制都在 base bundle 里，挂着不用等于白挂。

## 探索路由（DSH 侧最常用的四个入口）

- 组合层级（bundle → profile patch → home patch → `--patch`）：`vendor/dsh/docs/architecture.md`
- preset 语义（roster/roots/遮蔽/standing mount）：`vendor/dsh/packages/preset/agent-presets/README.md`
- 技能 provider 契约（本 repo 依赖它）：`vendor/dsh/docs/subsystems/skills.md`
- 工具与卡片（`defineTool` / presenter / 日志税）：`vendor/dsh/docs/cookbook/adding-a-tool.md`
