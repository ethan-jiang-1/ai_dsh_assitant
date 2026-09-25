# 旧门禁的红证据（负例控制补课）

日期：2026-09-25 · 状态：已收卷 · 方法：手工造红 → 观察 FAIL → 还原 → 复绿（借 DSH 的
docs/testing.md：「introduce the regression, watch red, revert」）

## 为什么做

自审发现 27 条 `verify` 检查里只有 11 组夹具（多覆盖 2026-09-25 当天新增的检查），
而结构、身份、自包含、文档合同这些**承载结构性断言**的旧门禁从未被观察过失败——
"存在一条检查"与"这条检查会拦错"之间没有证据链。本轮为其中四条价值最高的补上观察记录。

## 观察记录（真跑过的命令与原文）

| # | 检查 | 造红手法 | 观察到的 FAIL（原文） |
|---|---|---|---|
| 1 | `structure: required paths exist` | `git mv docs/discipline.md docs/discipline.probe.md` | `missing docs/discipline.md`（并连带 `links: backticked repo paths in markdown exist` 红） |
| 2 | `identity: every declared identity name appears in docs/identity.md` | 把 `cordis.patch.yml` 的 host 行 id 改成 `assistant-memory-typo` | `row id assistant-memory-typo is not in docs/identity.md` |
| 3 | `self-containment: published files never reach outside the package` | 在 `presets/assistant/preset.yml` 追加 `# probe: from '../../../docs/home.md'` | `packages/dsh-smart-assistant/presets/assistant/preset.yml imports ../../../docs/home.md, which escapes the package` |
| 4 | `contract: docs/home.md lists the rooms and archives the layout creates` | 把 `docs/home.md` 里所有 `knowledge` 改成 `knowledg` | `docs/home.md never mentions knowledge` |

四次造红后均 `git checkout` / `git mv` 还原，终态 `pnpm verify` 27/27 绿、工作树干净。

## 过程副产物（两条，都值得留）

1. **第二次造红时探针本身错了一次**：先写 `../../docs/home.md`（从 `presets/assistant/` 上去两级
   **正好是包根**，没有逃出包）→ 门禁正确地保持绿。**门禁没瞎，是探针算错了**；
   改成 `../../../` 即红。教训与自审档案同款：一次不红的负例，先怀疑探针再怀疑门禁。
2. **契约检查有真缺口（已修）**：`contract: docs/home.md ...` 的工具清单只列了
   `assistant_memory / assistant_research / assistant_reflect`——**第四个房间的工具 `assistant_knowledge`
   不在清单里**，即合同可以悄悄丢掉它而不报。本次同 diff 补齐并加注释说明来源。
   这正是负例控制的收益：不是为了证明门禁聪明，而是为了在它不聪明的地方发现它。

## 覆盖现状（诚实口径）

- **有自动化红夹具**：pin、notes 命名/状态/顶层/稳定性、implemented 输掉的方案、相对链接、
  语言分工、文本卫生、依赖姿态、技能 frontmatter（`tests/verify-gates.spec.mjs`）；
  生成物 freshness（`gen-paths --check` / `gen-catalog --check`，diff 非空即红，自带反例语义）。
- **有观察记录（本文件）**：上表四条。
- **仍无红证据**：其余结构性/门禁内联检查。**不追账**（`07:38` 的"较小项目不必复制全部机器检查"，
  且维护成本要与真实需求匹配）；规矩是**新检查必带夹具**，存量按价值渐进补。
