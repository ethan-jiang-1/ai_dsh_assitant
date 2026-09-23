# 2026-09-24 · 阶段 2 收尾：知识房间合同与 live E2E（切片 2f）（已实现）

依据：三线合流提案阶段 2 第 6 项（docs 契约 + I15 翻牌 + note 同 diff）。

## 阶段 2 六切片全部 implemented

| 切片 | note | 要点 |
|---|---|---|
| 2a 布局 | （并入本 note） | knowledge/ 进 layout+scaffold+map；**无 archive**（deprecated 留原地）；verify 门禁房间清单扩展 |
| 2b 词汇 | `2026-09-24-knowledge-page-vocabulary.md` | OKF 六字段 + wikilink 三形态解析 + 解析三态（歧义报告不猜） |
| 2c curate | `2026-09-24-knowledge-curation.md` | 断链三档/孤页/stale/draft 老化/无源 stable；severity 扩三档 |
| 2d 检索 | `2026-09-24-knowledge-retrieval.md` | assistant_knowledge 只读工具 + digest signpost 树 |
| 2e 写入与桥 | `2026-09-24-knowledge-write-path.md` | save_page staged draft；promote→knowledge；桥=provenance 惯例 |
| 2f 收尾 | 本 note | docs/home.md 四房间合同 + I15 翻 implemented + live E2E |

## live E2E（阶段 2 全链路，会话 `session-d417555d-7a05-409d-b3d2-bf2fd6ad1bf3`）

七步逐字在案（"staged, awaiting review" 3 处在日志）：
1. 开研究线索 → 2. save_page 蒸馏（sources 引线索）→ staged 消息逐字（含"手改即人审"说明行）；
3. **draft 对搜索不可见**（"No retrievable page matched"）→ 4. fs 手改 status: stable →
   搜索命中 `[stable] Deploy pipeline (…) — title mentions "deploy"`；curate 逐字报
   `links to [[staging-gate]], which is not written yet`（D7 info 档的真场景）；digest 树
   "knowledge: 1 page"；
5. promote 线索→页（digest 开放线索 3→2）→ 6. pin（save 带 source knowledge:<id>，
   provenance 闭环）→ 7. get 无反链——live 助手正确解释（无人链入该页，唯一 wikilink
   是出链）。
**结论**：四房间全链路（research→knowledge→memory 桥）在真实 preset 会话里逐字走通；
唯一"缺口"是任务故意留的未写链接，被 curate 按设计报出。

## 附记

- intents.md **I15 翻 implemented**（证据指针指向本阶段四篇 note + live 会话）。
- 阶段 2 与提案参数级的对账：D5（六字段）、D6（只读工具）、D7（三档）、D8（两操作，
  落成惯例并登记解释）全部按定值落地，无越界。
