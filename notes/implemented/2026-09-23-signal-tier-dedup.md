# 2026-09-23 · 信噪比与披露层级修正（第二轮结构审计切片）

日期：2026-09-23 · 状态：**implemented**（本切片）

## 背景

以两个判据做第二轮结构审计：**信噪比**（每行都活着、一个含义一个家）与**渐进式披露**
（入口层只放每个分支都需要的东西，窄分支细节推到指针后面）。第一轮（`2026-09-23-doc-consistency.md`）
修的是"读起来过期"；本轮修的是"写多了 / 写重了"。零运行时行为变更（唯一动到的代码是
`dev/env/dsh.mjs` 一行注释的指向）。

## 修正清单

| # | 问题 | 修正 |
|---|---|---|
| 1 | 开发命令**三重书写**（README 开发段 ↔ AGENTS.md 命令表 ↔ docs/dev.md §三），且已有一次漂移前科（第一轮 #1：README 停在单 profile 旧方案，照跑会踩错坑） | README 只留首次进入（submodule / install / typecheck+test+verify），开发环唯一家 = AGENTS.md 命令表 + `docs/dev.md`；README 指针过去并注明前科 |
| 2 | AGENTS.md 两段**窄分支参考**占常驻位（约 20 行）：「两个解析门面」只在换 pin / 排模块解析时需要，「dev/dev-task 双 profile 为什么」只在想合并 profile 时需要——且两者的"为什么"在 docs/dev.md 都已有 | 删除两段；路由收进既有表格：布局表新增 tsconfig 门面行（指 dev.md §二），setup.sh 行注释补"为何不能合一"指针；门面契约正文下沉为 dev.md 新 §二（含表格化：各管什么 / 谁维护）。AGENTS.md 82 → 68 行 |
| 3 | "刻意不做"**三重陈述**：identity.md §三 与 architecture.md §四/§六 近乎逐字重复同一批事实+触发条件（SessionEventMap / settings namespace / Web 卡片） | **唯一家 = architecture.md §六延后项表**（补"新增 SessionEventMap 事件"行；§四 留一句话指针）；identity.md §三 改为指针段（只管身份面路由），§一 第 5 行指针改指 §六 |
| 4 | docs/dev.md §三 注释"跑在 assistant preset 上"与 §四"one-shot 不进 preset"**内部矛盾**（§四 是后来发现的真相，§三 注释没跟着改——正是多写一份就会烂一份的实证） | §三 注释改为"one-shot 任务（headless）＝ host 面冒烟；不进 preset（§五）" |
| 5 | repo-structure note 决定 2 写"包内 4 个入口（1 host + 3 agent）"，与其自家决定 6 的 `./learn` 独立入口矛盾；现行合同（package.json exports / 包 README / AGENTS.md）是 5（1+4） | 就地改为 5（1+4，列出四个 agent 入口），时态节补记（沿用第一轮对本 note 的补记先例） |
| 6 | 合同/台账文档引**仓外绝对路径**（discipline.md 引 ai_dsh_company 原文路径；intents.md 引 talk 原文路径）——单机仓今天可用，对任何其他读者/克隆是不可路由的悬空指针 | discipline.md 改指 in-repo note 的输入节（仓外路径只住 note）；intents.md 改用 talk `agent-101` 简称（与 repo-structure note 既有引用法一致） |

## 连带修正

- dev.md 插入新 §二后全文重编号（旧二→三、三→四、四→五、五→六）：dev.md 内部"重跑第二节"
  改"第三节"；discipline.md 的"docs/dev.md §四"引用改 §五。
- AGENTS.md 布局表 dev/ 行补"启动/调试手册：docs/dev.md"指针（两段删除后入口链仍指向手册）。
- AGENTS.md 命令表 setup.sh 行"一次性"改"幂等"（与 dev.md 用词统一：setup 可重复跑）。
- `dev/env/dsh.mjs` 头注释的"见 AGENTS.md『两个解析门面』"改指 `docs/dev.md` §二（跟随门面契约搬家）。
- repo-structure note 决定 7 的"理由见 docs/identity.md 第三节"改指 architecture.md §六（跟随 #3 的唯一家搬家）。

## 刻意不做

- **AGENTS.md 硬规则 1（双 home）不瘦身**：安全关键且任何会话都可能触发，属于"每个分支都需要"
  的入口层内联；机制细节（隔离矩阵、出口语义）在 dev.md §一 —— 规则↔手册分层，不是重复书写。
- **architecture.md §一 的"反过度工程"摘要句不删**：§一 是判据式引用（leading word），§六 触发条件
  表是唯一细节家——同词复现、含义不重复，刻意保留。
- **verify 不加"README 不得复制开发环命令"类负向断言**：负向文本断言比它要防的漂移更脆；
  靠 note 前科登记 + 审计轮（第一、二轮均已实证此路径有效）。

## 验证（真跑过）

- `pnpm verify`：12/12 绿（含 gen-paths --check、身份名↔identity.md、home.md↔layout.ts、技能契约、提交安全）。
- `pnpm test` 与本切片无关：零运行时行为变更，纯核测试不会为本次回归而失败（窄证据，不跑）。
