# 需求推敲 playbook：`_backlog/playbooks_plan/` 演练场 + `requirements-elicitation` 草稿 + 留区语法门

日期：2026-10-08 · 状态：**implemented**

来源：用户指示"需要借鉴 `mattpocock-skills/_faq_on_digest/09_skills-for-requirements-engineering-of-agent-apps`
——我们的 `_backlog/` 下需要特别的 playbook 来帮助我们如何推敲出需求／寻找合理的结构等
产品经理／架构师的东西，最后内容进入 plans"；并在形态追问上拍板："**还是放在 `_backlog/playbooks_plan/`
这个子目录底下，有 README、有 SKILL 样子的 MD 等，这样好在这里调整**"。

## 问题（可观察行为）

`_backlog/` 有推敲**卡**（`plans/`）、有推敲**证据**（`reference/`）、有**制度**（章程 README），
但没有**方法**的家：同一套提问纪律（一轮问全 frontier、事实与决策分离、按未知类型派探针）
此前只在若干张卡里被临时手写一遍（`261007-input-boundary.md` 的「已知与未决／候选与取舍／
待答问题／喂给谁」就是现成例子），下一张卡从零再来。根 `AGENTS.md`「同一个多步流程第三次被重新
推演时，就把它立成一件开发技能」正对着这个缺口，但在方法被真实推敲校准之前直接进
`.agents/skills/` 会让 fresh agent 信任一份没被顶过回来的草稿。

## 提案（已交付）

1. **新推敲区 `_backlog/playbooks_plan/`**——`_backlog/` 的第四个家，装**方法本身**：
   - `README.md`（账本 + 留区契约）：为什么有这个区（与 `plans/`/`reference/`/章程刻意不重叠的
     判据表）、文件形态、命名、无状态行、**毕业即搬走**（`git mv` → `.agents/skills/<name>/SKILL.md`）、
     与在役技能同名不许并存、**空想的方法不进**（须已在至少一轮真实推敲里被用过）。
   - `requirements-elicitation.md`——SKILL 形态草稿（frontmatter `name`/`description`/`whenToUse`，
     英文），正文：产出落哪（`plans/` → 毕业四门 → `notes/proposed/`，**永不跳过、永不排期**）、
     frontier 面试纪律（一轮问全 + 每题附推荐答案 + 不回问前置未定）、**fact/decision 分离表**
     （事实自己查、决策只问人；"模型能不能稳定做到 X"是事实不是偏好）、三类探针路由表
     （外部事实→一手调研 / 在别人脑子里的→问卷 / 只能跑起来才知道的→可丢弃原型，各带"它永远
     证明不了什么"列）、agent 应用专属提问类（**自主权边界**逐动作问 + **失败路径**：答错/不确定/
     拒绝/幻觉）、**毕业就绪六条 exit criteria**、硬细节（推荐答案不等于决策、不让人工智能冒充真人）。
2. **留区语法门 `playbookFrontmatterProblems`**（新纯核，`verify` 链内并入既有
   `contract: skill files carry valid frontmatter` 一查）：两个在役 home 是 `<name>/SKILL.md` bundle
   形态，`skillFrontmatterProblems` 够不到扁平 `<name>.md` 的演练场——**这是本切片自查时发现的
   真实缺口**：门原来不覆盖留区，草稿可以带着坏 frontmatter 躺到毕业那天才炸。新核对
   `name` == 文件名 basename（保证毕业是纯 `git mv`）、`description`/`whenToUse` 非空、
   YAML 可解析，`README.md` 豁免，目录缺失不算问题。
3. **接线**：`_backlog/README.md` 章程加目录树行 + 「推敲方法区（playbooks_plan/）」一节；
   区 README 建索引。

## 输掉的方案

1. **直接建 `.agents/skills/requirements-elicitation/`**（跳过演练场）：输给"在役技能会被 fresh
   agent 直接信任"——方法要在一到两轮真实推敲里被用过、被顶回来再改才配这份信任；而且用户指名
   要"好在这里调整"。
2. **只落一张 `_backlog/plans/` 推敲卡**：输给"卡片会被毕业，方法不会"——方法要在下一张卡上再用
   一遍，放卡里等于每张卡重写一遍（正是要消灭的现状）。
3. **把方法写进 `_backlog/README.md` 章程**：输给章程/账本二分——章程只随制度级决定动，方法会
   反复迭代；且章程是常驻入口链文本，塞方法论会污染开工阅读面。
4. **建 `_backlog/playbooks_plan/` 但沿用 `plans/` 的卡片契约（状态行 + 索引互查）**：输给语义
   不符——playbook 不是某件具体工作的判断材料，没有"毕业判断"，它是方法；故不设状态行，
   `backlog-liveness` 三查**不**扩到这里，语法由专门的 frontmatter 核覆盖。
5. **照搬上游 skill 名与模板**（`/grill-with-docs`、`/to-spec`、`/to-tickets`、`/wayfinder` 等）：
   输给本仓既有管道——上游那套硬依赖 GitHub issue tracker 与 `GLOSSARY.md`/ADR 布局，本仓的
   裁决点在 `notes/proposed/` + 用户点头、术语家是家手册与各 owner 文档。借的是**纪律**（frontier、
   fact/decision 分离、探针按未知类型路由、垂直切片、Out of Scope 单列），不是模板与名字——
   上游自己的嵌入指南也是这个立场。
6. **同时做模型可见面技能**（`presets/assistant/skills/`）：轮内明确不做；那是模型可见面变更，
   需另立 proposed 卡呈批并配 `repo-live-probe` 证据。

## 刻意不借（负知识，登记进区 README 留区契约）

- **第二个 tracker/队列**：上游 FAQ 自己点名反对，与本仓 `_backlog/README.md`「明确不借」同款
  （D23 失败模式，本仓 ROADMAP 队列 2026-09-28 已退役）——playbook 只产判断材料，不排期。
- **上游的 spec/ticket 模板与目录布局**：借纪律不借模板（见输掉的方案 5）。
- **空想的方法**：无实证来源的 playbook 会用一套自洽话术伪造权威——故"须已被用过一轮"是进门条件。

## 验证（真跑过的命令）

- `node scripts/checks/verify.mjs` → **35 checks passed**（改动前 35、改动后 35：新核并入既有
  一查，不增检查条数）。
- **造红证绿（新门的真证据）**：
  ① 把 `_backlog/playbooks_plan/requirements-elicitation.md` 的 `name:` 改成
  `deliberately-wrong-name` → `node scripts/checks/verify.mjs` 输出
  `FAIL contract: skill files carry valid frontmatter and match their directory` /
  `verify: 1 of 35 checks failed` → 还原 → 35 passed。
  ② **改动前的反证**：同样改坏 `name` 后 verify 仍 `ok`（门确实够不到留区）——这是本切片发现
  缺口的原始观测。
- `npx vitest run packages/dsh-smart-assistant/tests/tooling/verify-gates.spec.mjs -t "playbookFrontmatterProblems"`
  → 3 passed（负例夹具落 `tooling/verify-gates.spec.mjs`，含：name/basename 不符、缺 description、
  缺 whenToUse、无 frontmatter、README 豁免、YAML 内层 `: ` 解析失败、目录缺失）。
- `pnpm typecheck` → 绿（`tsc -b` + `tsc -p tsconfig.test.json`）。
- `pnpm test` → **50 files / 410 tests passed**。
- 未跑：`pnpm build` / `pnpm release-smoke` / `pnpm eval`——本品未动发布物、依赖、preset 包装与
  模型可见面（无源码改动，只动 `scripts/checks/` 与 `_backlog/`、测试夹具），按
  [pre-push-evidence](../../.agents/skills/pre-push-evidence/SKILL.md) 不属必跑面。

## 行为对齐

- **外部结果三要素**：触发 = 需要把模糊意图磨成能呈批的提案时（或一张 `plans/` 卡要从对话里写出来时）；
  用户得到 = `_backlog/playbooks_plan/` 下一份可调整的 SKILL 形态 playbook（README 契约 + 
  `requirements-elicitation.md` 草稿），以及留区草稿不再能带坏 frontmatter 的语法门；
  完成条件 = 方法成文、留区契约成文、语法门造红证绿、章程接线、`typecheck`+`test`+`verify` 全绿。
- **签收方式**：待用户过目（本切片产出即"可调整"的草稿，调整本身就是它的用途）。
- **未跑项如实列出**：`pnpm build` / `release-smoke` / `eval`（理由见上）；playbook 尚未在真实推敲
  里被用过一轮——**这是它仍留草稿区、未毕业为技能的原因**，毕业触发 = 一到两轮真实推敲的校准。
- **复发追问**：本切片暴露的"新家建了但门没跟上"（门只扫两个在役 home、够不到新留区）是一类
  可复发的缺口——处置是**每次新建被门覆盖的语料家时，同轮问"门跟上了吗"并造红证绿**，
  而非只在本案补一行。
