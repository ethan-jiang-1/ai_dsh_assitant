# 知识批量导入：先立纯核（分段 / 稳定 id / 出处），并记下"为什么自建"

日期：2026-09-25 · 状态：**implemented（纯核已落地；转换与概念抽取待触发，见 §四）**

## 一、决定

为 O1（拆得对且说得清出处）建**薄导入管线**，第一批只做**机械部分**：
`packages/dsh-smart-assistant/src/knowledge/ingest.ts` —— markdown 分段（代码围栏不透明）、
按 `ref` 的**确定性页 id**（同 ref 重复导入 = 更新而非重复）、出处 `sources: [ref]`、
首行摘要、超限**显式截断标记**。模型侧只保留"概念页抽取"这类必须由模型做的部分，走既有
`save_page`（它强制 `sources`）。

## 二、为什么自建（"不发明"规则的取证，先看 DSH 原生与生态）

- **DSH 原生没有持久知识入库**：`attachment` / `attachment-local` 与会话/附件绑定；
  `context/file-reference`（+`-local`）把文件引用进上下文，不是持久知识；`document/office-to-pdf`
  只做格式转换。原生里没有任何"知识库/批量入库/RAG"包（`vendor/dsh/packages/` 全表核对）。
- **生态有两类候选，按准入表未过审，故不装**：`omdsh-dev/dsh-kb-sieve`（从 md/docx/pdf 建可审计知识包）、
  `htcqp802/dsh-knowledge-base`（批量导入 + FTS5）。二者都是第三方单人维护，且与我们已有的
  **治理语义**（draft→stable 人审、`sources` 必填、provenance）重叠——企业差异化恰好在这块。
  处置：记入"借鉴/后续适配"（若将来做企业知识库后端，走 provider 适配而非替换底座），不直接安装。
- 结论：**自建薄管线有据**（原生无载体；生态未过审；我们的治理语义是差异化）。

## 三、形状与验证

- 纯核 `ingest.ts`：`slugify` / `sourcePageId` / `segmentDocument` / `planSourcePage`（+`BODY_LIMIT_BYTES`）；
- 夹具 `tests/knowledge-ingest.spec.ts`（7 例）：slug 边界（CJK 标题折叠为 `doc`）、id 确定性、
  围栏内 `#` 不是标题、空输入、摘要取首行、截断标记、`plan` 幂等。
- **本切片不含**：写盘与 CLI/工具接线（下一步）；因此它现在还不能被"用起来"——诚实记录。

## 四、未做（各带触发）

1. **docx/pdf 转换**：触发＝第一份真实的 docx/pdf 文档集出现（在 ROADMAP）（届时评估 DSH 原生 `office-to-pdf`
   与其他转换路径，仍按"不发明"留证）。
2. **概念页抽取**：触发＝评测集 v0 就位（在 ROADMAP）（由模型在会话里从 `sections` 抽概念页，人审转 stable）。
3. **CLI / 工具接线**：下一步（队列里的 ▶ 条目（`pnpm import-knowledge <dir>` 或一个 `assistant_reflect` 动作；
   后者是模型可见面变更，须同 diff 更 docs/identity 与夹具）。

## 五、输掉的方案

- **把整篇文档交给 `save_page`**：一次一页、由模型逐页写，撑不住企业文档量，且把机械工作压给模型。
- **直接装生态知识库插件**：未过准入，且与治理语义重叠（见 §二）。
- **先上 RAG/embedding**：触发未到（评测集还没有"漏召回"证据）；先做会让"检索"替代"治理"。
- **把原文切碎塞进 memory**：记忆是**有界摘要**的面，原文属知识页；塞进去会先撑爆摘要预算。
