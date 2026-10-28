日期：2026-10-28 · 状态：**proposed**（待一个产品语义拍板；work 尚未开始）

# 手册所有权拆分：插件手册与用户笔记分家

## 问题（可观察行为）

模型可见的家手册现在是一个「随包规则 + owner 数据」的混合文件：`AGENTS.md` 由插件生成、按 generation 迁移、用户可手改。每改一次正文就要维护精确旧段迁移和 fixture；今天为补真值已经付了 v23、v24 两次迁移。真实旧 home 的代价也已实测：dev home 的 v16 备份跑当前迁移链是 **no-op**（before 16 → after 16，仍含 `Three things ride`），只能靠 prompt 的 stale 警告 + `assistant-data refresh-manual --yes` 逃生。这违背「定义随版本只读、数据归 owner」的切法。

## 迁移影响（真实 home，只读评估）

| home | 手册版本 | 字节 | 等于当前 v24 渲染 | 手写 |
|---|---|---|---|---|
| `dev/harness-home` | v24 | 11,895 | 是 | 否 |
| `dev/trial-home` | v9 | 6,834 | 否 | 否 |
| `dev/trial-home-30d` | v15 | 9,298 | 否 | 否 |
| `dev/trial-home-continuity` | v15 | 9,298 | 否 | 否 |

- 没有任何 home 是手写手册（无 marker）；四个都是生成手册。
- 旧 generation 与当前渲染的字节差主要来自版本差异，**无法仅凭字节判断其中是否有手改**（旧 generation 的完整渲染没有留档）。

## 提案

- **`MANUAL.md`（插件所有）**：当前家的操作手册。prompt 段**直接用 `renderHomeManual()` 的渲染**，不读文件——升级永远最新，没有 generation。盘上文件只是给人读的镜像，scaffold 缺失或过期时重写（覆盖前留 `.bak-*`）。
- **`AGENTS.md`（用户所有）**：这家的附加笔记，prompt 段把它追加在手冊之后；新 home 种一个短头（"The manual is MANUAL.md; notes here are appended"）。没有 marker、没有迁移、没有 stale 警告。
- **删掉**：`HOME_MANUAL_VERSION`/marker、全部 `RETIRED_*`/`CURRENT_*` 迁移常量、`migrateHomeManual`/`parseManualVersion`、`manual-stale-scaffold` finding。
- **`assistant-data refresh-manual`**：保留命令，语义改为"重写 `MANUAL.md` 镜像"（先备份），不再碰 `AGENTS.md`。
- **预算**：渲染版由不变量测试保证装进预算；`AGENTS.md` 是用户可变部分，超预算时截断并在 `curate` 报 `manual-over-budget`（消息改为 notes）。
- **一次性迁移**：生成手册（有 marker）→ 移到 `AGENTS.md.bak-<stamp>`；手写手册（无 marker）→ 原样留作 notes，prompt 变成"当前手册 + 你的笔记"。
- **prompt 组成**：`renderHomeManual()` + `\n\n` + `AGENTS.md`（若非空、在上限内）。四段顺序不变（身份 100 / 手册 300 / 经営账本 400 / 摘要 10150）。

## 必须拍板的一个选择

生成手册里可能有人手改过的段落。拆分后它们不能继续作为 prompt 的权威（否则又回到混合文件）。三选一：

- **A（推荐）· 只留备份**：任何带 marker 的 `AGENTS.md` 整个移到 `AGENTS.md.bak-<stamp>`；prompt = 当前手册 + 新 notes。手改内容仍在备份里可见，可手动搬进新 `AGENTS.md`，但不再自动生效。代价：一次行为变化；收益：一次断干净，generation 机器彻底删除。
- **B · legacy 模式**：带 marker 的 `AGENTS.md` 继续当整本手册（旧行为，不叠加新手册），直到用户删除或显式迁移。手改继续生效，但旧规则继续进 prompt、每个 home 各自留在旧世界，拆分只对新 home 生效。
- **C · 只搬当前代的差异**：仅当文件等于当前 v24 渲染（无手改）时直接迁移；旧代无法区分手改，仍要退回 A 或 B。实测没有手写 home，C 覆盖不到更多情况。

## 输掉的方案

- **只加 `MANUAL.md`、保留 generation 机器**：两个手册来源，模型读哪个都要解释，陈本更高。
- **把 `AGENTS.md` 改成插件所有、另起用户文件名**：AGENTS.md 是业界惯例，用户会继续往里写；语义反直觉。
- **拿历史渲染做 diff 只搬手改行**：旧 generation 的完整渲染没有留档，做不到可靠；不值得为一次性迁移建历史渲染库。
- **继续今天的修法（每改正文加一次精确迁移）**：v23/v24 已经证明陈本，v16 还够不到；不可持续。

## 验收

- 干净 home：`MANUAL.md` = 当前渲染；`AGENTS.md` = notes 头；prompt 段 = 手册 + notes；没有 marker/stale 警告。
- 生成手册 home（v9/v15/v24）：`AGENTS.md` 移到 `.bak-*`（A）或保留 legacy（B）；`MANUAL.md` 就位；prompt 里旧手册正文不再出现（A）。
- 手写手册 fixture：原样作为 notes，prompt = 当前手册 + 原文；无数据丢失。
- 迁移测试 + `pnpm test` + `pnpm verify` + `pnpm prompt-smoke`（手册尾段断言保留）。
- 移除的迁移常量/函数在代码与测试中没有残留引用；`refresh-manual` 只写 `MANUAL.md`。

## 待拍板

A（推荐）还是 B？定了之后按选定语义一次做完（代码 + 测试 + docs + 一次性迁移）。
