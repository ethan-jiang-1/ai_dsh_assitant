# Day-0 intake「它先问」：首会话由助手主导开场（UX 首切片 A'）

日期：2026-10-05 · 状态：**implemented**（当日立卡当日交付：真模型 eval PASS——eval 层抓到首跑的桌面残留假阴性，触发条件据实改钉 memory 房间为空，复跑 PASS 11s；证据见下。用户 2026-10-05 授权静默自主推进 UX 调对）
已归档：2026-10-08（决定已经在合同或代码里；下次改决定不用打开本篇。冻结，不再跟踪。）

## 问题（可观察行为）

首开「无从下手」（定位卡第三次出现同感）：桌面空态的三步引导说「在旁边的对话里跟助手说句话」——**被动等待用户凭空生成第一件事**。定位卡的机制诊断（第 20 轮）：任务应从三处来，第一处就是「它先开口」。Day-0 概念稿（用户已过目的具象层）设计过访谈式 onboarding：15 分钟、它问、你答、结束时交付公司卡草稿 + 第一份处理单 + 回访约定。当前实现里这个行为不存在：模型侧没有任何首会话开场指令（manual v10 无此节，技能目录无此配方）。

## 提案

按仓库自身模式落位（home.md §三「过程性知识不做常驻段落」——配方进技能抽屉，常驻面只留条件指针）。完整配方草案与取舍见 [UX 路径档 §5](../../_backlog/reference/positioning/261005-ux-path-annotated-simulation.md)。

1. **manual v10→v11 加一节**（`src/domain/home/home-map.ts` `renderHomeManual`，英文，随每次请求注入）：首会话条件（无 desk 文件 + memory 空）下不等待被问，主动按 `first-conversation` 技能开场；对方想主导就跟随。
2. **新策展技能 `first-conversation`**（`presets/assistant/skills/first-conversation/SKILL.md`，英文）：
   - 触发：fresh working folder（无 desk 文件且 memory 房间为空）；
   - 开场白：说明目的、可跳过、不问机密（访谈框架原话）；
   - 三问序列（每次只问一个）：① 最近一次需要亲自拍板、后来还要跟进的事；② 当时什么变化逼你决定、最迟何时要定、不做有什么后果；③ 当时确实知道什么、还有什么不确定；
   - 每答即落（不等问完）：事实/偏好→memory save（带原话日期）；未决→research open thread；缺口→desk gaps；
     第三问后交付第一份处理单：decisions（options 含成本与 irreversibility）+ gaps + actions（含一条回访 due）；
   - 停止线：连续两次不接话→退回被动模式；不问卷轰炸；
   - 边界：不替本人拍板；财务数字只在自然流出时记。
3. **eval 新任务 `first-open-intake`**（dev/eval/tasks.mjs）：fresh home + 一句「你好」→ 断言开场是问句且只问一个、无 desk 文件时首答后 desk 出现首写（decisions/gaps/actions 形状）、不编数字。

**稳定面不变**：不动 client（三步引导/lead 卡/一键选项已建成）、不动 DeskData 契约、不动四工具动词、不动审批车道。改变的只有模型可见内容（manual + 技能目录）。

## 验收

- 技能语法门禁 + gen-catalog 重生成（技能清单 +1）+ verify 34 全绿；
- `pnpm build` + `test:composition`（manual 段落同步、技能目录装载）；
- manual 版本测试同步（v11：`root-files`/`layout` spec 的版本锚点若有钉）；
- keyless replay 查请求侧：manual v11 节在场（组装证据）；
- eval `first-open-intake`：**任务入列 + self-check 过**；真模型回合需要 API key——环境无 key 时如实标注未跑（行为验证延后到 key 可用，不做无凭据的绿声明）；keyless 侧以 replay 组装证据 + 内容审查收口本片。

## 交付证据（真跑过的命令）

- `pnpm build`（干净构建）→ `typecheck` → `test`（43 件 374 断言）→ `verify` 34 全绿；`gen-catalog` 重生成（技能清单 +1）。
- keyless replay：manual v11「The first conversation」节与技能名均达请求侧（组装证据）。
- **eval 真模型回合**（一次性 home + 真实 key，跑完即清、副本归零）：
  - 首跑 FAIL——**eval 层抓到真缺陷**：会话工作区残留旧 `.desk/state.json`（此前任务的投影），模型按「有桌面文件」判非首开，答了桌面家况而不是开场问句；
  - 修复：触发条件改钉**memory 房间为空**（桌面文件是可陈旧/可外来的投影，不是新鲜度的权威信号——技能 whenToUse、正文、manual v11 措辞同步；manual 措辞同时改为命令式「load the skill and follow it」）；
  - 复跑 **PASS（11s）**：`skill-loaded: first-conversation` ✓、`no-write-tools` ✓、问句 ✓、指向要拍板跟进的事 ✓。
- 实施教训（如实）：manual 是模板字符串，正文里的技能名必须转义反引号（首版裸反引号截断模板，43→21 件 suite 级红，esbuild 当场抓回）；`pnpm verify | tail` 会吞退出码——第三次踩同坑，收尾一律先落 log 再判 exit。

## 输掉的方案

1. **十问全发**：问卷轰炸违背访谈框架（每次一问、只追会改变选择的缺口）——输给三问序列。
2. **配方全写进 manual 常驻段落**：每个后续请求永久付上下文税——输给「一行指针 + 技能抽屉」（仓库既有模式）。
3. **client 侧做「让它问你」按钮**：皮面上再加机关，而缺的是模型侧行为——输给直接改模型可见内容。
4. **等真人回访验证再实施**：用户已授权静默自主；行为面 eval 真模型 PASS 已收口，真人读数后补。
5. **触发条件钉桌面文件存在性**（首版设计）：桌面文件是投影，工作区残留/迁移都会造成假阴性——输给钉 memory 房间为空（真新鲜度信号；eval 首跑实证）。
