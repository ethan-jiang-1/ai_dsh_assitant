日期：2026-10-28 · 状态：**implemented**

# 数据面校准：会话取数、所有权分类与两个不变量

## 问题（可观察行为）

FAQ 24 的判据（所有权先于存储、可见性硬约束、定义≠数据、平台不兜底）对照本包后，三处不满足：

1. **同一份 prompt 有两条相反的会话召回指令。** 组合已启用 FTS5 索引与 `tool-session-query`（一段常驻 guidance + 五个工具），家手册却写 “Nothing indexes them” 并把模型指向 `session-recall` 技能的 `rg --pre` + `zstd` 配方。技能还依赖会话日志的私有布局（`session-<id>` 与 vendor 现文档的 `<encoded-id>` 不一致、`v<n>` 代际）、外部 `zstd` CLI，并假设 “harness home = working folder 的父目录”——该假设在 `dataDir` 被配置到别处时不成立，失败形态是“找不到日志”而不是报错。技能同时鼓励搜兄弟项目目录，而平台工具只授权同 `cwd` 的会话：跨项目读取是插件替平台做的边界决定，却没有作为数据边界声明。
2. **一棵树混着三种所有权。** `<dataDir>` 同时住用户内容与插件账本（`skill-usage.json`、`ui-mode.json`、`audit/*.jsonl`、`archive-maintenance/`、`*.bak-*`）。数据卡把两类一起标成 P2/U，于是备份/清理/git/诊断用同一套口径；账本（`ledger.json`）标成 P3/H，容易被读成 `ctx.storageDomain` 的 host KV。`tool-session-query` 是 `vendor/dsh/packages/experimental/`（N2），却与 N1 的索引同列，没有回退登记。
3. **两个不变量缺守卫。** `dataDir` 可配到包目录内而服务不拒绝（R1：包目录不是数据目录）；随包只读策展技能以 `customSkillDirs`（rank 300）注册，压过用户技能（rank 400），只读定义抢了更具体所有者的优先级。另有一处更隐蔽的预算失效：生成的 manual 已达 11,033 bytes，而 prompt 预算只有 8,192，截断落在 `## Past conversations` 中间——模型从未看到协作边界与盘上布局。

## 决定

1. **会话召回两层**：native `session_search` / `session_event_search` / `session_event_read` 优先（同项目、已索引、平台授权）；原始日志只在跨项目、精确子串或索引缺席时显式回退，且“读别的项目”是主动动作、做之前说明。手册的会话召回段与 `session-recall` 技能同源（同一渲染源）；harness home 从环境解析（`$DSH_HOME`，否则 `~/.dsh`），不再假设父目录。
2. **手册与笔记各有预算**：`MANUAL_BYTE_CAP` 提到 14,336；手册渲染必须装进预算，由 `tests/host/root-files.spec.ts` 钉住；用户 notes（`AGENTS.md`）超预算时 `curate` 报 `notes-over-budget`，不再静默截断。
3. **所有权分三类写清**：`docs/delivery.md` 数据卡拆成用户内容 / 插件账本 / 宿主面，账本改称“插件自有文件账本”，`tool-session-query` 以 N2 登记并写明 raw-log 回退；包 README 同步。
4. **两个不变量进代码**：`assertDataDirOutsidePackage` 在 memory 与 ledger 初始化时拒绝包内 `dataDir`；随包只读技能改用 `bundledSkillDir`（rank 600），项目/用户同名技能可以遮蔽它。

## 交付物

- 实现、合同更新与逐项证据住 [归档台账](../../_backlog/_archive/settled_issues/261028-data-plane-alignment.md)；本 note 只持决定与后果。

## 输掉的方案

- **账本迁 `ctx.storageDomain`**：KV 无删除 API、版本不匹配拒绝打开、模型不可见、`per-record` 键受限、无跨进程串行化；我们要可读、可导出、可审计、单 writer 的文件账本。既有决定见 [`2026-10-27-data-lifecycle-hardening`](2026-10-27-data-lifecycle-hardening.md)。
- **digest 改 `PromptContext`**：现 10150 尾段 + fingerprint 失效已把变化代价限制在系统提示尾段；改 user-role snapshot 会降权并给日志加噪声。
- **删掉原始日志配方、只靠 `session_search`**：工具只授权同 `cwd`，会失去跨项目回忆这一真实能力。
- **把 harness home 绝对路径烘进 `AGENTS.md`**：文件会随备份跨机，路径立即过期；既有测试也禁止 prompt 携带 dataDir 路径。
- **现在拆 `MANUAL.md` + `AGENTS.local.md`**：当时判断会改变用户可见文件语义而延后；同一天即以 [手册所有权拆分](2026-10-28-manual-ownership-split.md) 落地（`MANUAL.md` 归插件、`AGENTS.md` 仍是用户笔记；「`AGENTS.md` 归插件、另起用户文件名」的变体被那篇拒绝）。
- **把机器账本也迁 KV、或从备份剔除**：它们是 advisory，容忍损坏比 fail loud 合适；同人备份要治理连续性，交接物本来就不含数据。
- **为 replay 把 digest/manual 改成 sourced 注入**：系统提示本身以 `system/message` 落日志，replay 用已记录请求；resume 时重新组装是设计。既有疑虑按非缺陷结掉。

## 后果

- 手册正文的增长现在有硬预算：改长必须同时改预算，否则测试红；用户写超预算会在 curate 里被点名。
- 会话召回的模型可见指令只有一个来源（手册 + 技能同源）；`tool-session-query` 的实验面身份与回退写在合同里，升级 pin 时按 `docs/discipline.md` 适配 14 复核。
- 随包只读技能的优先级低于项目与用户技能；同名冲突仍由 `skill-shadowed` 报告。
- `dataDir` 的误配从“升级时静默丢数据”变成“激活时 fail loud”。
