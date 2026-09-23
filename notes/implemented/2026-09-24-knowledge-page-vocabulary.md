# 2026-09-24 · 知识页词汇与互链解析（阶段 2 切片 2b）（已实现）

依据：三线合流提案阶段 2；R3 §7.2 设计（每件标借用来源）+ D5 已定参数（OKF 六字段子集）。

## 决定（字段集 = D5=A）

`src/knowledge/page.ts`：一条一文件，frontmatter 字段——
- `type`（必填，自由串：concept/entity/source/how-it-works——**不中央注册**，消费者容忍未知，OKF §4.1）；
- `status: draft|stable|deprecated`（缺省 stable；**deprecated 页留在原地**——链接必须继续解析，OKF §5.4 + ADR superseded 语义）；
- `generated: {by, at}`（谁写的；actor 约定 `human:<id>`/`process:<id>`）与 `verified: [{by, at}]`（谁确认的——**写与确认分离**，OKF §5.2/5.3）；
- `staleAfter`（**绝对时刻**，过期=一次纯比较，OKF §5.5）；
- `sources[]`（resource/id/title——无 sources 的自动产出不进 stable，dsh-learn-wiki "无 sources 不 commit"）；
- `[[wikilink]]` 解析（Obsidian 兼容三形态：`[[x]]`/`[[x|alias]]`/`[[x#section]]`）；
- 解析顺序：**id 优先，title 兜底（大小写不敏感）**；title 多命中=歧义（**报告不猜**，LinkResolution 三态）；
- `backlinksOf`：全房间解析现算（无索引服务——R3 §5.3 一手先例）。

## 输掉的方案

| 输掉的 | 为什么输 |
|---|---|
| OKF 全字段（attestation 等） | D5 已否：对个人助手过重 |
| 三字段最小集 | D5 已否：staleness/确认档机器不可见 |
| 落盘 index.md | OKF "consumers MAY synthesize on the fly"——派生物不落盘就没有漂移（2c 的漂移 finding 因此不存在，登记） |
| link 解析用 remark-wiki-link | 维护停滞（R3 §5.3）；解析百行级自研更稳 |

## 证据

`tests/knowledge-page.spec.ts`（8 测试：三形态解析与顺序/trim、type 唯一必填与 status 缺省、
五种非法形状、全字段 roundtrip 与 links 提取、无效映射 undefined（含空 body）、id 优先
title 兜底/歧义三态/missing、反链去重无自环）。**118/118 全绿**；typecheck/verify 16/16。
