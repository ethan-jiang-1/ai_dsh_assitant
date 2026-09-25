# AGENTS.md —— 本 repo 的常驻规则与入口链

> 给 coding agent 读的**几百词**：怎么跑、东西在哪、改动走哪条路。
> 详细契约在 `docs/`（只写**现在**）；开发提案、活跃决策与验证依据在 `notes/`；身份名以 `docs/identity.md` 为唯一权威。

## 这是什么

一个 DSH 插件 repo：**一个领域专家式的助手**（`dsh-smart-assistant`）。
它给 agent 一个自己的 **working folder**（跨会话的工作目录 = 本插件的 `dataDir`，**不是**进程 cwd/workspace）：长期记忆 + 领域知识 + 学到的技能 + 机器能跑的养护检查。
核心命题是 `Agent = Model + Harness` —— 本 repo 做的就是"那一圈"。

## 新会话开工（先读这段）

**现在在哪、接下来做什么的唯一权威 = `ROADMAP.md`（根部队列，只写接下来，完成即离队）**。
开工前先读它：队列条目 / 触发型 / 等用户拍板三类——不要从 git log 或记忆发明任务。
分工一句话：**本轮用户请求决定工作范围**；ROADMAP 只管未完成队列，`docs/` 管当前契约，`notes/` 管决定依据与验证。
队列是索引不是全文：条目链接指向 `notes/proposed/` 提案或相关决定。`notes/implemented/` 是随实现维护的活跃决策，保留理由、输掉的方案和验证依据。
写 note 的义务只覆盖**承载持久决定理由**的改动——代码、测试与现行文档说不清的 why 与放弃的备选；机械或局部编辑豁免。决定随当前变更已交付的，直接写 `implemented/`，不必从 `proposed/` 开始。
改行为、契约或开发流程前，按任务链接或机制名查相关 notes。**每新增一篇 note 触发取代检查**：搜活跃树找同决定/同机制的旧 note——完整取代则新 note 吸收其独有理由/备选/后果/验证后**同 diff 删除旧的**（历史归 git）；部分取代则双方保留互链、更新仍有效的事实。同一决定的事实变化更新原文，反转决定即完整取代。非平凡改动同 diff 新增或更新相关 note；提案落地须改写为实际决定与证据，不能只搬目录。
implemented note 必带「**输掉的方案**」节——没记击败了什么的决定会重新开讼；备选只能记录、不能编造（机械门禁，旧 note 按门禁生效日祖父豁免）。过时提案转 `rejected/` 并写一行拒绝原因，而非滞留 `proposed/`；`rejected/` 失去防错价值即删。
新 note 沿用 `YYYY-MM-DD-topic.md`（首次提出日期）。DSH 依据与生命周期见 `vendor/dsh/.agents/notes/README.md`；按需读取，不要求遍读全部 notes。交接即此链：AGENTS.md（本文件）→ `ROADMAP.md` → 条目链接。
`notes/proposed/` 不是停车场（proposal-scheduled / proposal-graduated 两道 verify 门禁管）。
**进行中的工作显式化（用户拍板）：开工即立卡 `notes/proposed/`**——状态词只有 `notes/README.md` 定义的那一套
（生命周期四态），**不再另造阶段词**；可执行性由 `ROADMAP.md` 顶部的标记图例承担（图例的 owner 在那里，
不在这里复制）。深评/调研证据链住 `notes/research/`，卡片链接之；ROADMAP 条目指卡。看不见的工作等于没在做。

同一个多步流程第三次被重新推演时，就把它立成一件开发技能（放 `.agents/skills/`）——这是"重复即建"的常设规则，不占队列。
**两类 Skill，别混**：`.agents/skills/` 是**开发用**（给改这个仓库的 agent：探针、归档判定、
证据路由——由 DSH 原生 `project-agents` 根发现，进目录即入技能目录）；`presets/assistant/skills/`
是**模型用**（产品运行时技能，随 preset 走）。同名不同机制，不共享 registry。

**意图从哪来**（三通道，各管各的）：① **用户轮内请求**——唯一外部通道，本轮范围由它决定；
② **`ROADMAP.md` 队列条目**——已立项的内部工作项（可执行性标记在这里）；③ **`notes/proposed/` 卡片**——
重大未决的未来工作（生命周期状态在卡片，正文与验收也在这里）。代码里的 `TODO/FIXME` 不进队列，
只在代码内；`notes/research/` 是证据面，不是工作项。

## 布局（改动前先认领 owner 面）

**一个事实一个家**（tier）：`AGENTS.md` 只拥有**常设指令与路由**（无状态、无日期、无进度）；
`docs/` 拥有**当前合同**（门禁住了的事实，只写现在）；`notes/` 拥有**决定理由与证据**（含输掉的
方案与历史）；代码的 README/JSDoc 拥有**模块级契约**（与代码同 diff 维护）。写在别处即第二份清单，
必然漂移——链接过去，不复制。

| 路径 | 是什么 | 谁能改 |
|---|---|---|
| `ROADMAP.md` | **根部队列：只写接下来**（队列/搁置池/维护规则；条目 ≤3 行，完成即离队） | 队列调整直接改 + 维护规则记一行 |
| `packages/dsh-smart-assistant/` | **插件包**（bundle）：入口×平面、四工具×动词、组合行、pin 与依赖姿态见生成物 `docs/package-catalog.md`；包内 owner 面与纪律见其 `AGENTS.md` | 改模型可见面 / 服务 / 布局动这里 |
| `docs/` | **当前合同**（只写现在，无历史）—— 文档 tier 与"谁拥有什么"见其 `AGENTS.md` | 门禁住了的事实进这里 |
| `notes/` | **开发记忆与证据链**（分类 owner：`notes/README.md`）：`proposed/` 将来 → `implemented/` 当前权威 → `archived/` 冻结历史；`rejected/` 存负知识与一行原因；`research/` 进行中 → `research/archive/` 已收卷 | 决策与输掉的方案进这里 |
| `dev/` | 开发 home 与 profile patch —— 双 home 与两个 profile 的纪律见其 `AGENTS.md` | 环境问题动这里（手册 owner：`docs/dev.md`） |
| `scripts/` | 机械门禁与生成器 —— 门禁三条纪律与 freshness 约定见其 `AGENTS.md` | 门禁问题动这里 |
| `snapshots/` | 行为回归的证据面（day 0 占位）—— 只收边界见其 `AGENTS.md` 与 `README.md` | 回归证据问题动这里 |
| `vendor/dsh/` | **钉住的 DSH 源码（submodule）** | **永不改**；升级走 `pnpm sync-dsh` |
| `tsconfig.base.json` / `tsconfig.tsx.json` | 两个 tsconfig 解析入口（编译期手维护 / 运行期 `pnpm gen-paths` 生成） | 引入新 `@deepseek-ai/*` import 或换 pin 时动这里（契约：`docs/dev.md` §二） |

**语言分工**：人与本仓文档（docs/notes/AGENTS.md）用中文；进模型上下文的（persona、SKILL.md、工具 description）用英文；代码与脚本注释随所在文件现状，不整批改写。

## 命令表

```sh
pnpm install            # 并入 vendor/dsh 整树，首次较慢
pnpm gen-paths          # 从 vendor/dsh 重新生成运行期解析入口 tsconfig.tsx.json（换 pin 后必跑）
pnpm typecheck          # 委派包级：tsc -b（编译期 paths 解析到 vendor/dsh 的 src，API 漂移编译期暴露）+ tsc -p tsconfig.test.json（覆盖 tests）
pnpm test               # vitest：纯核（home/memory/research/skills/knowledge）+ 服务级合同（真 cordis 构造，不依赖 DSH 运行时）
pnpm verify             # 机械门禁：结构/身份一致/两个 tsconfig 解析入口/自包含/技能语法/断链与相对链接/队列与 notes 形状/提交安全（清单以 scripts/verify.mjs 为准）
pnpm build              # tsc 出 lib/（发布物与 dsh plugin add 需要）
pnpm release-smoke      # pnpm pack → 干净 home → dsh plugin add → 组合断言（真实安装形状；**改动发布物/依赖/preset 包装必跑**，否则它只是"存在一个脚本"）
pnpm sync-dsh -- --tag <dsh-tag>   # 换 submodule tag + SHA 簿记 + typecheck + 对照 docs/discipline.md 重校纪律表

bash dev/setup.sh       # 幂等：建 dev（web）+ dev-task（headless）两个 profile + link 装插件 + roster 指向 repo（两者为何不能合一：`docs/dev.md` §四）
pnpm dsh --profile dev-task "one task"  # one-shot = **host 面冒烟**（headless 不进 preset，vendor 明文契约）
pnpm dsh --profile dev --port 0 --no-open   # Web UI；preset 行为（四工具/persona/摘要）在这里的会话里验。交给人之前先 `pnpm preflight '<URL>'`（绿了再交，见 docs/dev.md §四）
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
   只跑"会为这次回归而失败"的最小检查；**报告里只列真跑过的命令**；
   **提交只 add 本次改动涉及的路径**（同仓可能有并行会话，`git add -A` 会把别人的未提交改动扫进你的提交）。
4. **默认严格，偏离登记**：研发纪律的继承是**逐源枚举**过的，不是凭印象
   （全表：`docs/discipline.md`）；偏离或裁剪不是错——先在 note 里登记一行
   （约束 → 适配 → 证据），再动手。
5. **轮内任务面**：复杂任务开工用 plan 呈批、实施期用 todo 活清单（整表替换、完成即勾）、
   人可随时 steer —— 机制都在 base bundle 里，挂着不用等于白挂。

## 探索路由（DSH 侧常用入口）

- 组合层级（bundle → profile patch → home patch → `--patch`）：`vendor/dsh/docs/architecture.md`
- preset 语义（roster/roots/遮蔽/standing mount）：`vendor/dsh/packages/preset/agent-presets/README.md`
- 技能 provider 契约（本 repo 依赖它）：`vendor/dsh/docs/subsystems/skills.md`
- 工具与卡片（`defineTool` / presenter / 日志税）：`vendor/dsh/docs/cookbook/adding-a-tool.md`
- **"组合里到底有没有这一行"**（读源码答不了这个问题）：`pnpm dsh --profile dev --dump-config`（boot-free；
  行 id、disabled、realm 一目了然——排查 patch 落空/重复 id 的第一命令）
- **"活进程里注册了什么"**：切到 shipped `cordis` preset 用它的只读 inspect 工具（我们的 `assistant`
  preset 刻意不挂这两个工具——那是模型可见面变更，为开发期需求不划算）
