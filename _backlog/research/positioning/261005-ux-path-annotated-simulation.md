# UX 路径 v0：打开→给片段→看选项/缺数→拍板→看跟进（标注模拟走查）

> 喂 [自洽卡](../../_archive/closed/261005-turnaround-coherence.md) 阶段2 与 [定位卡](../../_archive/closed/261005-open-value-deficit.md)。
> 性质：纸面/可丢弃交互原型，不是实施授权；示例内容用 [标注模拟](261005-prototype-cases-and-interview-method.md)
> 的 `reversible-cost-v0` 变式（明确标注 simulated，不冒充本人经营事实）。状态载体以现行
> `.desk/state.json` 契约（`DeskData`，src/client/index.ts:242）为准——本路径不发明新状态机，只编排入口与边界。

## 0. 结论先行

目标路径的**状态词汇已经全部有载体**：`decisions[]`（question/context/options 一键答案/kind=business 区分/
至多一条 lead）、`gaps[]`（what/why）、`actions[]`（what/owner/due/metric/stop/status/note）、`threads[]`、
`counts`。缺口在**入口编排**：①首屏空态（无 desk 文件时面板无内容可显）；②「打开后第一件事做什么」的引导；
③缺数催收与回访的节奏（dsh-proactive 先例存在但未接入）。第一个 UX 切片的候选因此收敛为**入口/空态/引导**，
不是桌面面板本身。

## 1. 示例场景（simulated，全程标注）

用 `reversible-cost-v0` 的前两个变式作走查内容：

- **S1 可逆小试**：内部草稿，可撤回、低成本、反馈快 → 期望：直接备好「小试验」选项，注明范围/owner/停止信号。
- **S2 缓冲不足**：同一小试验，但资金缓冲不足，撤回也承受不起损失 → 期望：建议随约束改变，不能因为「可逆」沿用「先试」；
  **缺数面板出现一条 gap**（缓冲下限的真实数字），并把它挂到 S1 的决定上。

两条决定在桌面上并存，用于检验「同输入不同约束 → 不同建议 + 缺数诚实」。

## 2. 六步路径 × 状态载体 × 诚实标注

每步给：用户动作 → 系统做什么 → 状态落在哪个字段 → 现状标注（✅ 已有形态 / 🎯 目标路径未验证 / ⚠️ 边界必须如实说）。

### 步骤 1 · 打开（首屏）

- 用户动作：打开 Web UI。
- 系统：侧栏面板读 `.desk/state.json`（`generatedAt` 为准）；空态 = 无 desk 文件 → 面板显示空房间与"还没有可跟的决定"。
- 载体：`DeskData.counts` + 面板空态分支。
- 标注（2026-10-05 二读 client 源码后修正）：✅ **首开引导已有且成熟**——无 desk 文件时显示三步开场卡
  （"第一次来这里？①在对话里说句话 ②它把桌面建起来 ③之后一直显示等你拍板的事"）、lead 卡逻辑
  （business 优先、options-bearing 回退、rank 排序、至多一条 lead）、一键选项、composer 例句
  （"直接说一句你手头的经营问题"）。🎯 **真正缺的是 Day-0 访谈式 intake**（定位卡概念稿：它先问
  公司做什么/多大/客单价、最头疼的一件事、关键数 → 交付公司卡草稿 + 第一份处理单 + 回访约定）——
  这是模型编排的行为改变（persona/技能内容 + 既有写路径落桌），不是 client 面 UI 缺口。
- 失败态：desk 文件存在但烂 → 按"解析得了但不是 desk"命名（R12 已有），不显示空桌冒充。

### 步骤 2 · 给片段（丢一件事）

- 用户动作：把一件事丢进对话（如"我在想要不要先做个内部草稿试水"）。
- 系统：模型回合拆解 → 落 `threads[]`（open 线索）与/或 `decisions[]`（带 question/context）→ 重写 desk 文件。
- 载体：`threads[].why/lean`、`decisions[].question/context`。
- 标注：✅ 全链已有（桌面刷新链：sendPrompt → 模型回合 → desk 重写 → 轮询越过 pending.at）；
  🎯 访谈问题自然嵌入点：主问 1（选事）就是用户这句话，主问 2/3（触发/当时所知）由助手在拆解时**追问会改变选择的
  1–2 个缺口**（框架规定不一次十问）。
- 失败态：回合失败/超时 → pending 状态不越过，面板保持旧桌 + 新鲜度告警（已有陈旧告警测试）。

### 步骤 3 · 看选项/缺数

- 用户动作：打开桌面「要你拍的」。
- 系统：lead 决策（至多一条 business）显示 question/context/options（label/cost/irreversible）；S2 场景同屏显示
  `gaps[]`（缺的数字 + 为什么缺它改变选择）。
- 载体：`decisions[].options[]`、`gaps[].what/why`。
- 标注：✅ options 一键答案渲染、gap 面板已有；⚠️ 选项由模型生成 = 示例/建议，**不冒充已核事实**；
  irreversible 标记如实传递（S2 的"声誉难撤回"变式专测这条）。

### 步骤 4 · 拍板

- 用户动作：点一个 option。
- 系统：面板经 `remote.session.prompt` 把选定写成下一句话 → 模型回合记录决定（memory save + desk 回执）→
  该行显示 `reply`（助手的最新一句话记录）。
- 载体：`decisions[].reply`。
- 标注：✅ 一键答案→会话路径已有（client-commands/panels 测试）；⚠️ **直调审批车道现状**：approve 类按钮走
  提示路径回退（codec 拒绝直调挂载，技术审计已钉）——演示时如实说"按钮→下一句话确认"，不称"当场 RPC 直调"。
- 失败态：remote 未成形 → 面板 note 直接提示（已有）。

### 步骤 5 · 看跟进

- 用户动作：打开「在跟的」。
- 系统：`actions[]` 显示 what/owner/due/status/metric/stop；助手自己的养护动作标 kind 非 business，不让 lead。
- 载体：`actions[]` 全字段 + `note`（结果盖章，真文件已带）。
- 标注：✅ 已有；🎯 **到期驱动的主动性**（晨报/到期提醒）是目标路径（dsh-proactive 先例，未接入）——
  现状如实说"它不催你，你打开看"；不演示"它今早提醒过我"。

### 步骤 6 · 补充/纠正

- 用户动作：说"数字到了：缓冲下限是 X"或"第二条选 C 不选 B"。
- 系统：gap 关闭/决定改选 → 记录变更（不静默覆盖旧答案）；S1→S2 对照正检验"条件变化应改变建议"。
- 载体：`gaps` 减少、`decisions.reply` 更新、memory 房间留痕。
- 标注：✅ 可再答/回执范围按会话隔离（R11 已有）；⚠️ 纠正学习链（一次错误反馈→诊断→改技能）是候选，
  不当已验证能力演示。

## 3. 走查判据（模拟可自主检查）

1. S1/S2 同屏：两条决定、S2 带 gap；lead 位只给一条 business 决定。
2. 拍 S1 的"先试"后，S2 的建议**不因可逆性沿用**（缓冲约束改变建议）——这是 `reversible-cost-v0` 的核心断言。
3. 缺数不编：gap 显示 unknown/待补，不出现编造数字。
4. 每步失败态可见（烂 desk 文件命名、回合失败保持旧桌+告警、remote 未成形提示）。
5. 示例/真实边界：桌面任何截图标注 simulated 来源；不出现"两周真实账面"类话术。

## 4. 给毕业判断的输入（2026-10-05 二读 client 源码后修正）

首开入口/空态/三步引导/lead 卡/一键选项**已建成**（261001 卡十八轮的产物），首切候选据此修正：

- **候选切片 A'（Day-0 访谈式 intake，"它先问"）**：模型编排的行为改变——首会话开场由助手主导三问
  （公司卡三要素/最头疼的一件事/关键数），交付公司卡草稿（memory）+ 第一份处理单（desk decisions/actions/gaps）
  + 回访约定（actions.due）。承载：persona/技能内容（模型可见面，英文，走全门禁）+ 既有写路径。
  这是定位卡 Day-0 概念稿的落地，直接回应「无从下手」的第三诊（任务从三处来，不靠用户凭空生成）。
- **候选切片 B（缺数→拍板的连线）**：gap 与 decision 的挂接展示（S2 形态）。字段已有，渲染编排小改，纯 client 面。
- **候选切片 C（回访/主动性）**：依赖 dsh-proactive 式机制接入，是「督办楔子」的完整版——**依赖最重，不首切**。
- 首切建议（**as-built 修正，2026-10-05 实施时改序**）：**A' 先行**——细察 gaps 面板后发现它已就地闭环
  （CorrectableRow「补上」→ 回话落账），B 的增量比本档初估薄；A' 直答「无从下手」机制诊断（任务从三处来的
  第一处=它先开口），且三件套材料先成熟。A' 已交付
  （[note](../../../notes/archived/2026-10-05-day0-intake-first-conversation.md)，
  真模型 eval PASS）；B 降为可选打磨（待模拟走查发现真实缺口再议）；C 留给督办原型毕业。

## 5. A'（Day-0 intake「它先问」）方案草案——毕业提案的直接输入

按仓库自身模式落位（home.md §三「过程性知识不做常驻段落」——配方进技能抽屉，常驻面只留条件指针）：

1. **manual（v10→v11）加一节一行**（`renderHomeManual`，英文，随每次请求注入）：「The first conversation —
   when the desk file does not exist and there are no memories yet, do not wait to be asked:
   open by asking the principal, one question at a time, following the `first-conversation` skill.
   If they would rather drive, follow their lead.」版本号同步 `HOME_MANUAL_VERSION` 与手册漂移测试。
2. **新策展技能 `first-conversation`**（`presets/assistant/skills/first-conversation/SKILL.md`，英文，
   格式仿 desk-refresh：name/description/whenToUse frontmatter + 正文配方）：
   - 触发条件：无 desk 文件 + memory 房间为空（fresh working folder）；
   - 开场白一句（说明目的、可跳过、不问机密——访谈框架原话）；
   - 三问序列（每次只问一个，答完再问下一个；不便/记不清就跳过）：
     ① 最近一次需要你亲自拍板、后来还要跟进的事是什么？（不要求成功案例；以前公开/可脱敏的一件也行）
     ② 当时什么变化让你必须做决定？最迟什么时候要定、不做有什么后果？
     ③ 你当时确实知道什么、还有什么不确定？有没有哪份资料影响最大？
   - 每答即落（不等十问问完）：事实/偏好 → `assistant_memory save`（带原话与日期）；未决 → research open thread；
     缺口 → desk `gaps`；第三问后交付**第一份处理单**：`decisions[]`（question/context/options，
     options 含成本与 irreversibility 标注）+ `gaps[]` + `actions[]`（含一条回访约定 due）；
   - 停止线：对方连续两次不接话 → 退回被动模式，只留已落记录；不十问连发、不问卷式轰炸；
   - 边界：不替本人拍板（options 只是准备好的选择）；公司卡（客单价/规模等）只在自然流出时记，
     不单独追问财务数字。
3. **验收**（模型可见面全门禁）：
   - eval 新任务 `first-open-intake`（dev/eval/tasks.mjs）：fresh home + 一句开场（"你好"）→ 断言
     开场是问句且只问一个问题、无 desk 文件时首答后 desk 出现首写（decisions/gaps/actions 形状）、
     回复不含编造数字；
   - `pnpm build` + `test:composition`（manual 段落与技能目录装载）；技能语法门禁（verify）+
     gen-catalog 重生成（技能清单变化）；identity.md 无需新增（技能名进 catalog 生成物）；
   - 模拟走查判据（本档 §3）在 A' 落地后用真实 preset 会话重跑 S1/S2。
4. **诚实边界**：intake 改变的是首会话行为，不承诺「15 分钟建公司卡」的完成度（公司卡三要素只在自然流出时
   记）；回访约定是一条 due action，不等于主动性机制（那是切片 C）。
