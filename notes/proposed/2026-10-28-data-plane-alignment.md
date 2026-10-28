日期：2026-10-28 · 状态：**proposed**（已授权实施；work 台账 = [`261028-data-plane-alignment`](../../_backlog/issues/261028-data-plane-alignment.md)）

# 数据面校准：会话取数、所有权分类与两个不变量

## 问题（可观察行为）

FAQ 24 的判据（所有权先于存储、可见性硬约束、定义≠数据、平台不兜底）对照本包后，三处不满足：

1. **同一份 prompt 有两条相反的会话召回指令。** 组合已启用 FTS5 索引（`session-query-sqlite`）与 `tool-session-query`（一段常驻 guidance + 五个工具），家手册却写 “Nothing indexes them” 并把模型指向 `session-recall` 技能的 `rg --pre` + `zstd` 配方。技能还依赖会话日志的私有布局（`session-<id>` 与 vendor 现文档的 `<encoded-id>` 不一致、`v<n>` 代际）、外部 `zstd` CLI，并假设 “harness home = working folder 的父目录”——该假设在 `dataDir` 被配置到别处时不成立，失败形态是“找不到日志”而不是报错。技能同时鼓励搜兄弟项目目录，而平台工具只授权同 `cwd` 的会话：跨项目读取是插件替平台做的边界决定，却没有作为数据边界声明。
2. **一棵树混着三种所有权。** `<dataDir>` 同时住用户内容（SOUL、手册、四房间、提案）、插件账本（`skill-usage.json`、`ui-mode.json`、`audit/*.jsonl`、`archive-maintenance/`、`*.bak-*`）。数据卡把两类一起标成 P2/U，于是备份/清理/git/诊断用同一套口径；账本（`ledger.json`）标成 P3/H，容易被读成 `ctx.storageDomain` 的 host KV。`tool-session-query` 是 `vendor/dsh/packages/experimental/`（N2），却与 N1 的索引同列，没有回退登记。
3. **两个不变量缺守卫。** `dataDir` 可配到包目录内而服务不拒绝（R1：包目录不是数据目录）；随包只读策展技能以 `customSkillDirs`（rank 300）注册，压过用户技能（rank 400），只读定义抢了更具体所有者的优先级。

## 提案

**片 1 · 会话取数（模型可见面）**
- 手册 bump 到 v22 并加已知旧段迁移：把 “Nothing indexes them” 段改成两层策略——native `session_search` / `session_event_search` / `session_event_read` 优先（同项目、已索引、平台授权）；原始日志只在跨项目、精确子串或索引不可用时显式回退，做之前说明这是跨项目读取。
- `session-recall` 技能重写为同一策略；路径不再假设父目录，改由运行时提供（见下）。
- 手册段落的运行时附加行给**真实** harness home 与 working folder 绝对路径（现渲染，不烘进可迁移的 `AGENTS.md`，备份跨机不会过期）。

**片 2 · 所有权分类（合同）**
- `docs/delivery.md` 数据卡拆两张表（用户内容 / 插件账本），加“损坏策略”与“是否随备份”列；账本改称“插件自有文件账本（用户可见、模型经工具读）”；补齐 `archive-maintenance/`、`audit/maintenance.jsonl`、`AGENTS.md.bak-*`、`.pre-import-*`；`tool-session-query` 登记为 N2 + 回退；`README.md` 同步。

**片 3 · 两个不变量（代码）**
- 服务初始化时 `dataDir` 落在包目录内 → fail loud（对齐 `bootstrap.mjs` 的既有拒绝）。
- 策展技能行由 `customSkillDirs` 改为 `bundledSkillDir`（rank 600），让项目/用户同名技能覆盖随包技能（冲突仍有 `skill-shadowed` 报告）。

## 输掉的方案

- **账本迁 `ctx.storageDomain`**：KV 无删除 API、版本不匹配拒绝打开、模型不可见、`per-record` 键受限、无跨进程串行化；我们要可读、可导出、可审计、单 writer 的文件账本。既有决定见 [`2026-10-27-data-lifecycle-hardening`](../implemented/2026-10-27-data-lifecycle-hardening.md)。
- **digest 改 `PromptContext`**：现 10150 尾段 + fingerprint 失效已把变化代价限制在系统提示尾段；改 user-role snapshot 会降权并给日志加噪声。
- **删掉原始日志配方、只靠 `session_search`**：工具只授权同 `cwd`，会失去跨项目回忆这一真实能力。
- **把 harness home 绝对路径烘进 `AGENTS.md`**：文件会随备份跨机，路径立即过期。
- **现在拆 `MANUAL.md` + `AGENTS.local.md`**：能删掉 generation/迁移机器，但改变用户可见文件语义；先记触发（下一次改正文又匹配不到旧段落，或 stale 警告第二次困扰用户）。

## 验收

逐片验收与证据 = [收口卡](../../_backlog/issues/261028-data-plane-alignment.md)；本卡只持决定与输掉的方案。
