日期：2026-10-28 · 状态：**implemented**

# 手册所有权拆分：插件手册与用户笔记分家

## 问题（可观察行为）

模型可见的家手册曾是一个「随包规则 + owner 数据」的混合文件：`AGENTS.md` 由插件生成、按 generation 迁移、用户可手改。每改一次正文就要维护精确旧段迁移和 fixture；真实旧 home 的代价也实测过：dev home 的 v16 备份跑迁移链是 **no-op**（before 16 → after 16，仍含 `Three things ride`），只能靠 prompt 的 stale 警告 + `refresh-manual` 逃生。这违背「定义随版本只读、数据归 owner」的切法。

## 决定

- **`MANUAL.md` 是插件所有的手册镜像**：prompt 段直接使用 `renderHomeManual()` 的当前渲染，不读盘上文件——升级永远最新，没有 generation/marker/迁移；scaffold 发现镜像漂移时先备份再重写。
- **`AGENTS.md` 是用户所有 notes**：追加在手册之后，超预算时截断并报 `notes-over-budget`；新 home 种 `NOTES_HEADER`（指向 `MANUAL.md`）。
- **旧生成手册按方案 A 迁移**：带 `<!-- home-manual vN -->` marker 的文件在 scaffold 时整体移到 `AGENTS.md.bak-*`；新 `AGENTS.md` 只保留 notes 头。手改在备份里可见、可手动搬回，但不再自动进 prompt。无 marker 的手写文件原样保留为笔记。
- **generation 机器整体删除**：`HOME_MANUAL_MARKER`、全部 RETIRED/CURRENT 迁移常量、`migrateHomeManual`/`parseManualVersion` 不再存在；`manual-stale-scaffold` finding 删除；`refresh-manual` 只刷新 `MANUAL.md` 镜像，不碰 notes。
- **预算告警对称**：手册渲染由不变量测试保证装进预算；笔记超预算 `notes-over-budget`，身份超预算 `soul-over-budget`。
- **prewarm 与 ensureHome 串行**：构造函数 prewarm 直接 `scaffoldHome`，`ensureHome` 先等 prewarm 完成——修掉默认 soul 的延迟写覆盖手写文件的 flake。

## 交付物

- 手册/笔记模型：`packages/dsh-smart-assistant/src/domain/home/home-map.ts`；scaffold 与迁移：`src/domain/home/layout.ts`；prompt 组装：`src/host/curate-digest.ts`；预算 finding：`src/domain/home/health.ts`。
- CLI：`refresh-manual` 与 `status` 改到 `MANUAL.md`（`src/cli/assistant-data-*.ts`、`bin/assistant-data.mjs`）。
- 测试：`tests/host/root-files.spec.ts`（seed/notes/迁移/镜像/预算）、`tests/host/old-home-compat.spec.ts`（v19 fixture 拆分）、`tests/domain/layout.spec.ts`、`tests/tooling/assistant-data.spec.mjs`、`assistant-data-manual.spec.mjs`、`expert-setup.spec.mjs`。
- 文档：`docs/home.md` §一/§三/§四/§五、`docs/delivery.md` 数据卡与格式政策、`docs/architecture.md`、`docs/dev.md`、`docs/release.md`、`docs/identity.md`、`docs/testing.md`、包 README。
- 证据与逐片验收住提交说明与归档台账；本 note 只持决定与后果。

## 输掉的方案

- **B · legacy 模式**：带 marker 的 `AGENTS.md` 继续当整本手册，手改继续生效，但旧规则继续进 prompt、每个 home 各自留在旧世界；拆分只对新 home 生效。A 的备份已保住手改，故不取。
- **C · 只搬当前代差异**：仅当文件等于当前渲染（无手改）时直接迁移；旧代无法可靠区分手改，覆盖不到更多情况。
- **只加 `MANUAL.md`、保留 generation 机器**：两个手册来源，模型读哪个都要解释，成本更高。
- **把 `AGENTS.md` 改成插件所有、另起用户文件名**：AGENTS.md 是业界惯例，用户会继续往里写；语义反直觉。
- **继续每改正文加一次精确迁移**：v23/v24 已证明成本，v16 还够不到；不可持续。

## 后果

- 手册正文的增长不再触发迁移/版本戳；改 render 即改所有 home 的下一次请求（旧的仅存于备份）。
- 旧的生成手册在升级后第一次 scaffold 时变成 `AGENTS.md.bak-*`，prompt 不再包含其中任何旧规则或手改；用户要保留的段落需手动搬进 `AGENTS.md`。
- `MANUAL.md` 是可读镜像而非权威；编辑它不会改变 prompt（scaffold 会备份后重写）。
- `AGENTS.md` notes 超预算见 `notes-over-budget`；身份超预算见 `soul-over-budget`。
- **退役模型可见面时，同 diff 清掉手册与交叉引用**：只删技能/条目、留下手册旧路径，模型会继续去找它（A1b 的教训，[归档篇](../archived/2026-10-19-retire-room-data-copy.md)）。
