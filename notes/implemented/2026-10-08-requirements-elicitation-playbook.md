# 需求推敲 playbook：`_backlog/playbooks_plan/` 演练场 + `requirements-elicitation` 草稿 + 留区语法门

日期：2026-10-08 · 状态：**implemented**

来源：用户指示"需要借鉴 `mattpocock-skills/_faq_on_digest/09_skills-for-requirements-engineering-of-agent-apps`
——我们的 `_backlog/` 下需要特别的 playbook 来帮助我们如何推敲出需求／寻找合理的结构等
产品经理／架构师的东西，最后内容进入 plans"；并在形态追问上拍板："**还是放在 `_backlog/playbooks_plan/`
这个子目录底下，有 README、有 SKILL 样子的 MD 等，这样好在这里调整**"。

**第二轮修正（用户指出"要利用 matt pocock 的能力啊，你好像忘了?"）**：首版只读了那份 FAQ 的
**二手转述**就动笔，把方法当成"从文本里提炼"的任务；实际上游技能本体就在本机
（`/Users/bowhead/mattpocock-skills/skills/`，且 `grilling`/`domain-modeling`/`prototype`/`research`
/`codebase-design`/`writing-for-agents` 已在会话技能目录里可用），**正确做法是路由到真技能、
只写"哪种未知用哪个 + 产出落本仓哪里"**。用户这一问点出的不是漏读一个文件，而是**方法来源的
层级错了**：拿摘要当权威。首版据此重写，并把上游台账与"路由不复制"升为本区硬纪律。

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
     英文）。**形态 = 路由器**：主体是一张「哪种未知 → 哪个真技能」表（`grilling` / `domain-modeling`
     / `prototype` / `research` / `to-questionnaire` / `codebase-design`），并显式声明
     "**路由不复制、协议读技能本体**"；本仓自己的半边是产出落点（`plans/` → 毕业四门 →
     `notes/proposed/`，**永不跳过、永不排期**）与 agent 应用专属提问类（**自主权边界**逐动作问 +
     **失败路径**：答错/不确定/拒绝/幻觉）。
   - **第二轮重写补进的承重机制**（首版全缺——它们只在技能源文件里，不在 FAQ 摘要里）：
     `grilling` 的**设计树**与轮次格式（编号 + 每题附推荐答案 + 前置未定的问题归后轮）、
     **facts-are-yours 且运行中的事实探查本身就是未定前置——只阻塞其下游问题、不阻塞本轮**、
     **完成判据 = frontier 空**（非"用户不再反对"）；`wayfinder` 的 **destination 先行 / fog of war
     / Not yet specified / Out of scope（scope 而非 sharpness 决定归属）/ 只产决策不产交付 /
     交接不建造 / 按名引用不按 id**；`to-spec` 的**编译不重面试 / seam 检查 / user stories 极详尽 /
     Out of Scope 单列 / 承重计划不写文件路径与片段（原型片段除外）**；`to-tickets` 的**垂直切片 /
     blocking edges / 宽重构走 expand–contract / 向用户复核拆解**；`prototype` 的 **LOGIC 与 UI
     两分支、"一次性代码不等于一次性答案"——验完保留为 primary source**；`to-questionnaire` 的
     **面试「发出去」而非「主题」**；`domain-modeling` 的 **ADR 三条件**。
   - **能力可得性如实标注**：本会话技能目录里可用的是 `grilling`/`domain-modeling`/`prototype`/
     `research`/`codebase-design`/`writing-for-agents`；**`to-questionnaire` 与 `wayfinder` 不在**，
     故这两项正文只承载本页摘要、并明说"不得暗示已运行它们"；全量源文件在
     `/Users/bowhead/mattpocock-skills/skills/`，能读文件但不能调技能的会话可退到那里。
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
7. **⚠️ 首版的真实错法——拿 FAQ 摘要当权威，把方法"重新描述"一遍**（第二轮已推翻并重写）：
   首版只读 `_faq_on_digest/09_.../` 的四份二手文本就动笔，产出的是**我自己措辞的近似协议**。
   读到技能本体后确认至少漏掉/写错：设计树与轮次格式、**运行中的事实探查是未定前置（只阻塞
   下游、不阻塞本轮）**、完成判据 = frontier 空、wayfinder 的 fog of war / Not yet specified /
   Out of scope 区分、expand–contract 宽重构例外、`to-spec` 的 seam 检查与"不写路径与片段"、
   prototype 的 LOGIC/UI 两分支与"保留为 primary source"（首版写成"可丢弃"，方向错）、
   questionnaire 的"面试发送方而非主题"。**教训不是"多读一个文件"，而是方法来源的层级**：
   有技能本体时，摘要只配当索引，不配当权威——这正是重写后升为区 README 硬纪律的那条
   "**路由不复制**"。此条留档防复犯：本仓今后写任何"适配某方法论"的 playbook，进门条件里
   必须包含"**读过本体并留引证台账**"。
8. **机器本地路径门禁只修正文、不扩语料**（第三轮）：输给"同一条纪律在两个活区两套口径"——
   `_backlog/` 的**相对链接**早就被断链门覆盖，唯独**绝对路径**不覆盖，属同一类"给读者指路"
   的文本；且缺口已被真实触发过一次（本区自己写出来的）。故扩语料而非只改文案。
9. **把机器本地路径门禁的语料扩到整个 `_backlog/`（含 `_done/`）**：输给与既有口径一致——
   冻结区的历史正文按断链门同样惯例不动（`_done/` 留着当时的写法），只扫四个活区 + 区 README。
10. **沿用内联逻辑、不给该查补夹具**：输给"内联闭包无法被驱动"——正因如此它此前零夹具；
    抽成 `machineLocalPathProblems(corpus)` 后语料与判据分离，才谈得上走真 runner 的接线夹具。

## 刻意不借（负知识，登记进区 README 留区契约）

- **第二个 tracker/队列**：上游 FAQ 自己点名反对，与本仓 `_backlog/README.md`「明确不借」同款
  （D23 失败模式，本仓 ROADMAP 队列 2026-09-28 已退役）——playbook 只产判断材料，不排期。
- **上游的 spec/ticket 模板与目录布局**：借纪律不借模板（见输掉的方案 5）。
- **空想的方法**：无实证来源的 playbook 会用一套自洽话术伪造权威——故"须已被用过一轮"是进门条件。

## 第三轮：上游更新后的重校（2026-10-08 同日）

用户提示"_faq_on_digest/09_... 更新了一下，你看看，你再想办法解决"。核查结果：

- **上游新增 `max-leverage.md`**（commit `fad9000`「add max-leverage guide and a full skill
  inventory」，基线 `7b2ad8f` → `fad9000`）：讲**"每环怎么把技能用满"**——三个通用杠杆
  （查证外包给 agent / 推荐答案当默认值 / 让产物流动）+ 逐技能「这样用 / 别这样用」表 + 两个
  纠正器（`/wait-what`、`/ask-matt`）。另四条页面同时小改：补 HITL/AFK 标注、`spike` 与
  `blocking edges` 术语就地解释、`/setup-matt-pocock-skills` 链接化、`/teach` 与
  `/writing-for-agents` 归位清点（全套 27 个技能）。
- **本区据本体重校并扩写**：新增「Driving each skill to full capacity」一节（三杠杆 + 逐技能
  do/don't 表），并把上游那条**硬排序规则**写进去——**访谈到拆票期间不 clear、不压缩**。
  该规则取自 `ask-matt` 本体第 36 行，**本体还带 FAQ 摘要没有的例外**：窗口逼近 smart zone
  （约 150k tokens）时不许硬撑退化，应在**阶段边界** `/compact` 后继续。又一次印证"承重规则
  回本体核对、摘要只当索引"的纪律。
- **顺带发现并修掉一个真实门禁缺口**：本区 README 与 playbook 曾把上游 checkout 的
  **机器本地绝对路径**写进共享正文，而门禁 `links: contract docs cite no machine-local absolute
  paths` **没覆盖 `_backlog/`**（`markdownCorpus` 只含 `AGENTS.md`/`README.md`/`docs`/`notes`/
  `snapshots`）——绝对路径静默过关。修法两步：① 正文改为"上游 checkout（rev 见台账）"，
  绝对路径与重校原始记录只留本 note（本仓纪律：机器本地路径的 provenance 归 `notes/`）；
  ② 该查**抽成可测纯核** `machineLocalPathProblems(corpus)`（`verify-checks.mjs`，语料与判据
  分离），`verify.mjs` 的语料**扩到 `_backlog/` 四个活区**（`plans`/`bugs`/`reference`/
  `playbooks_plan` + 区 README），并显式排除 `notes/`；冻结的 `_done/` 与未归属文件不扫
  （与断链门的既有口径一致）。该查此前**没有任何夹具**——正因逻辑内联在 `verify.mjs` 里无法被
  驱动；现补上走真 runner 的语料接线夹具。

  **上游 checkout 的绝对位置**（本仓纪律：只留 `notes/`）：
  `/Users/bowhead/mattpocock-skills`，技能源在 `skills/{engineering,productivity}/`。

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
- **上游台账逐路径核验**（第二轮）：对 README 台账点名的 9 个上游技能文件逐个 `[ -f ]` 检查 →
  9/9 存在；`git rev-parse --short HEAD` → `7b2ad8f`（与台账记的基线一致）。台账非转述，可复核。
- **上游重校**（2026-10-08，第三轮）：checkout HEAD 前进到 `fad9000`（上一基线 `7b2ad8f`）。
  FAQ 目录新增 `max-leverage.md`（本轮正文「Driving each skill to full capacity」一节的触发来源），
  其余四份（`answer.md`/`skill-mapping.md`/`embed-into-existing-system.md`/`question.md`）仍在位。
  承重规则回本体核对：`ask-matt/SKILL.md` L36「one unbroken context window（don't compact or clear
  until after `/to-tickets`）」与 L38 smart-zone 退化例外（临近窗口时 `/compact` 在最近阶段边界、
  不硬撑降智）逐字确认，两处均为正文与台账 `ask-matt` 行的依据；FAQ 摘要未载该例外，故正文
  采本体而非二手。checkout 绝对路径与各次重校原始记录住本节（共享正文不写死机器本地路径）。
- **机器本地路径门禁扩面 + 抽核 + 新夹具**（第三轮）：
  ① **造红**：向 `_backlog/playbooks_plan/requirements-elicitation.md` 追加一行
  `/Users/bowhead/somewhere/SKILL.md` → `node scripts/checks/verify.mjs` 输出
  `FAIL links: contract docs cite no machine-local absolute paths` /
  `_backlog/playbooks_plan/requirements-elicitation.md cites a machine-local absolute path` /
  `verify: 1 of 35 checks failed` → 还原（区内 `/Users/` 计数归 0）→ 35 passed。
  ② **新夹具造红证绿**：`npx vitest run .../verify-gates.spec.mjs -t "machine-local"` → 1 passed；
  再**故意从 `verify.mjs` 语料里删掉 `playbooks_plan` 那行**重跑 → 该夹具**失败**
  （`AssertionError: expected ... to contain '_backlog/playbooks_plan/README.md cit…'`）→ 还原 → 1 passed。
  即夹具真的守着语料接线，不是陪跑。
- `pnpm test` → **50 files / 411 tests passed**（较上轮 410 增 1 = 新语料接线夹具）。
- **能力可得性核验**：以本会话技能目录为准逐个对照——`grilling`/`domain-modeling`/`prototype`/
  `research`/`codebase-design`/`writing-for-agents` **在**；`to-questionnaire`/`wayfinder` **不在**
  （正文据实标注，不暗示已运行）。
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
