# 开发纪律对照表（当前合同 · 只写现在）

> 本文是本 repo 对 DSH 研发纪律的**逐源枚举与声明** —— 不从记忆继承
> （"你无法继承你从没清点过的东西"）。每行 = DSH 做法 → 本仓落点 → 状态
> （✅ 照搬 / ⚠️ 带约束的适配 / ⏸ 刻意不做 + 触发条件 / ⏳ 部分 + 等待条件）。
> 来源：`ai_dsh_company` 五轮实践的对齐复盘（仓外原文的出处与章节映射登记在
> `notes/implemented/2026-09-23-discipline-alignment.md` 的输入节——合同文档不引仓外绝对路径）；
> 决策记录：同该 note。
> **默认严格按本表走；偏离或裁剪不是错，但必须先登记（一行 note：约束 → 适配 → 证据）再动手。**

## 表

| DSH 纪律（源头） | 本仓落点 | 状态 |
|---|---|---|
| 文档只写 now；一个事实一个出处；**入口文件只收常设指令与路由指针**——时变状态放进自动注入的文件，就是把最容易腐烂的东西放进最不被怀疑的地方（`vendor/dsh/AGENTS.md` / `vendor/dsh/docs/AGENTS.md` tier 表） | docs/ 只写现在，无历史叙事；历史与输掉的方案全在 notes/；AGENTS.md 全时不变（无状态节、无进度标记、无 pin 号） | ✅ 照搬 |
| 决策 Note same-PR；完成的条目离开队列、不许标 ✅ 留场（`.agents/notes/README.md`） | notes/proposed→implemented 与切片同 diff；intents 台账只记"接下来" | ✅ 照搬 |
| 上游 plan 状态不二次落盘（2026-07-22 note :54：轮内计划已由工具参数记录，log-only 持久层不再建 plan 目录——**针对轮内计划状态**，不禁 repo 级提案与队列，见 `.agents/notes/README.md` 的 proposed 格式） | 不建 plans/tasks 物种（轮内计划走 plan/todo 机制，见下行）；repo 级设计计划住 `notes/proposed/`（RFC）与 `_backlog/plans/`（推敲/触发卡） | ✅ 适配（来源适用范围收窄：轮内状态 ≠ repo 级提案） |
| 会话日志即真相（log-only 持久层；复盘用日志 seq 重建，不凭自述） | 排查/复盘读 `dev/harness-home/sessions/**/session.v*.jsonl.zstd` 逐事件还原（`docs/dev.md` §五） | ✅ 照搬 |
| 轮内任务面：plan 呈批（反馈门①）+ `todo_write` 活清单（反馈门②）+ steer，机制在 base bundle 零接线 | 本 repo 开发流程见 AGENTS.md 硬规则 5；本插件 preset 已挂 `tool-todo` 且**连必填 config 一起抄**（`allowParallelInProgress: true`——不抄 config 会在挂载时炸且 UI 吞错误） | ✅ 适配（本地选择：具体工具与模式以当前会话所有为准，不宣称普适强制） |
| 默认翻转 + 适配声明：默认严格，偏离/裁剪须登记（镜像 "Require evidence for public choices"） | AGENTS.md 硬规则 4；每条适配登记于本文"已声明的适配" | ✅ 照搬 |
| 窄证据 + 只报告实跑过的命令（根 AGENTS.md / `dsh-pre-push-checks` skill） | AGENTS.md 硬规则 3；**验证主张分级**——实证（命令/日志/盘上文件可指认）、推断（标注依据）、未验（如实标 ⏳），自述不作为证据 | ✅ 照搬 |
| 机械门禁带反证（每条先造红再证绿） | `pnpm verify`（结构 / 身份一致 / 双解析入口 / 自包含 / 技能语法 / 断链 / 队列纪律 / **文档命令与别名表互证** / 提交安全——检查清单以 `scripts/verify.mjs` 为准，条数随缺口演进） | ✅ 照搬 |
| 语义漂移探针：门禁抓不住"读起来过期"，用新上下文只读入口链答"现在"问题 | **已立成开发技能** [`.agents/skills/semantic-drift-audit/`](../.agents/skills/semantic-drift-audit/SKILL.md)（三轮共 13 处漂移：零 → 六 → 七，每一处都是机械门禁看不见的；技能里带"反复出现的类别"清单与"能机械化的就同轮加门禁"的收尾） | ✅ 适配（原触发"入口链长到值得单做"已由三轮实证满足） |。两轮实录：第一轮零过期；第二轮（2026-09-23 信噪比审计，`notes/implemented/2026-09-23-signal-tier-dedup.md`）抓出机械门禁未覆盖的漂移 6 处——探针职责面实证；脚本化已知坑：**问句的期望也会过期**（对方实证：期望锚到轮号，轮闭即红、同日重跑覆盖归档）——期望锚定方案立项时必须定 |
| 继承跟 pin 走：升 pin 重校纪律表（vendor 的套路在演进，一次性快照会再烂） | `sync-dsh` 收尾清单第 4 步 + `pnpm verify` 强制本文存在 | ✅ 照搬 |
| 测试纪律：本地窄证据 + 非平凡改动 same-PR 更新快照 | `pnpm test`（vitest：纯核 + 服务级合同）；快照 harness day 0 未建（触发条件在 `snapshots/README.md`） | ⏳ 部分照搬（等第一处 live-only 回归出现再建） |
| 文档词数预算 + slop 门禁（`doc-budgets` manifest + `verify-doc-budgets`） | 刻意不做 | ⏸ 触发条件：docs 腐化实证（与来源仓同款推迟理由）。第二轮审计（2026-09-23）证据：轻度腐化——多重书写 ×2、内部矛盾 ×1、过期数字 ×1，一轮修完；暂不立案，再犯即触发；建时带**降限防回填**（每次削减后主动降 ceiling，反证 = 临时设更低值即红） |
| Issue → PR 连续流 + Project 状态机（队列不积累历史） | 不适用：本地单人仓无协作面 | ⚠️ 适配：一次切片 = 一个 commit（note 同 diff）；工作流 = 用户轮内请求 + `notes/proposed/`（已批未做）+ `_backlog/plans/`（推敲/触发型；2026-09-28 起 ROADMAP 队列退役，决定档案 `notes/implemented/2026-09-28-roadmap-queue-retired.md`）+ `notes/intents.md` 意图台账；完成即离队、不积历史（等价物映射见"已声明的适配"2） |

## 已声明的适配（约束 → 适配 → 证据）

1. **无 GitHub 协作面**（约束：本地单人仓）→ 无 Issues/PR 流；等价物 = 切片 diff + note 三段流
   （证据：本表与 notes 流自 day 0 的实际运转）。
2. **工作队列落一个文件**（约束演变：上游"second durable home"否决的是**轮内计划状态**的二次
   持久化；"队列不积累历史"仍成立）→ 2026-09-28 修订：队列退役，工作流 = 轮内请求 + proposed 卡 + `_backlog/plans/` 卡（roadmap-queue-retired note）；原表述——根部队列（只写接下来、
   完成即离队、条目 ≤3 行索引；决定档案：`notes/implemented/2026-09-28-roadmap-queue-retired.md`，
   **部分替代本条原表述**"工作队列不落文件"）。`notes/intents.md` 仍是意图台账（非工作队列），
   交接文档仍只放 /tmp。
3. **切片可以全新会话**（约束：上下文经济）→ 交接靠入口链（AGENTS.md → docs → notes）本身，
   不靠长活上下文。
4. **门禁不做 hook/CI 机械接线**（约束：本地单人仓、无 CI runner；用户 2026-09-27 拍板不加
   pre-push hook，不让流程再长一层）→ 纪律靠 [pre-push-evidence](../.agents/skills/pre-push-evidence/SKILL.md)
   （报告只列真跑过的命令、证据要覆盖改动面）与「被阻断的检查不得写成绿色证据」条承担；
   备选（hook、CI）在此记录为输掉方案 → 证据：P1-B 漏跑整包的教训进技能后，同类摩擦未再现
   （change-scope 触发重置后无第二次；「触发未到不动手」纪律在 AGENTS.md）。

## 复查环（防"一次性快照再烂"）

- `pnpm sync-dsh` 升 pin 时：对照本文逐行重校（vendor 的套路在演进，继承必须跟着 pin 走）。
- 语义漂移（读起来过期、自相矛盾）：机械门禁抓不住，靠新上下文探针与审计切片。
- 审计切片的处置优先序：**删 > 并 > 修 > 记**——先问能不能删（净减少），再问能不能并（一处
  事实一个出处），然后才是修与登记；判据 = 每处改动能指向它修复的具体误导或漏检，**不是**
  "文件数与总行数少了多少"。文档预算（若触发立案）同上游规则：**上限是护栏，不是减量目标**
  （`vendor/dsh/docs/AGENTS.md`「Wordcount budgets」）。
- **新门禁必带反例**（负例控制；借 DSH「A guard only guards if the regression fails it」）：
  新增一条 `verify` 检查 = 同 diff 在 `tests/verify-gates.spec.mjs` 配一个"造红再证绿"夹具；
  只对新检查生效，不追旧账。
- **被阻断的检查不得写成绿色证据**：跑不了或没跑完的检查，在报告与 note 里如实标
  "阻断 + 原因"，不得并入"通过"。
- **历史只证明它自己**：note 与旧提交只证明其自身内容；门禁规则带生效日、不追溯重判旧物。

## 六层反馈各自证明什么（借 DSH `repo-harness/05`）

| 层 | 我们的机制 | 能证明 | 不能单独证明 |
|---|---|---|---|
| 编译期 | `tsc -b`（paths 解析到 vendor 源码）+ 严格 tsconfig | 类型关系与穷举分支成立 | 运行时组合正确 |
| Load / 解析 | cordis 组合加载（patch 行 id 唯一、inject 可解析、`--dump-config` 无 warn） | 组合在最早可解析点合法 | 行为满足意图 |
| 局部行为 | 纯核 vitest（home/memory/research/skills/knowledge） | 所属模块的正例、错误与边界 | 组装后的产品输出 |
| 组装行为 | 服务级合同 + 真实组合测试（Loader + preset 站立挂载 + 属性代理消费） | 真实入口按预期组装（如三段落顺序、工具 scope） | 设计选择合理 |
| 真实安装 | `release-smoke`（pack → 干净 home → plugin add）、preset-runner 探针 | 真实安装形状与真实 LLM turn 的外部结果 | 长期质量 |
| 语义判断 | 审计轮 / 新上下文探针 / 用户验收 | 意图、架构、风险与证据是否对齐 | 每个机械细节都已执行 |

每层只拥有自己可观察的性质：单测绿不等于产品工作，探针绿不等于设计合理，review 也不重复机械门禁已拒绝的格式问题。

## 三道门禁各管什么（互不冒充）

| 门禁 | 能建立什么 | 不能建立什么 |
|---|---|---|
| 机械门禁（`pnpm verify` / `test` / `typecheck`） | 结构、身份、链接、命名、状态与目录一致、依赖姿态 | 意图是否合理、替代方案是否真实、散文与 shipped 事实是否一致 |
| 语义审计轮（新上下文探针 / 审计切片） | 散文与已交付事实一致、真实使用面的摩擦 | 替代方案实跑、用户意图优先级 |
| 用户拍板 | 授权范围、方向级取舍、品味 | 代码正确性、机制是否存在 |
