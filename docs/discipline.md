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
| 文档只写 now；一个事实一个家；**入口文件只收常设指令与路由指针**——时变状态放进自动注入的文件，就是把最容易腐烂的东西放进最不被怀疑的地方（`vendor/dsh/AGENTS.md` / `vendor/dsh/docs/AGENTS.md` tier 表） | docs/ 只写现在，无历史叙事；历史与输掉的方案全在 notes/；AGENTS.md 全时不变（无状态节、无进度标记、无 pin 号） | ✅ 照搬 |
| 决策 Note same-PR；完成的条目离开队列、不许标 ✅ 留场（`.agents/notes/README.md`） | notes/proposed→implemented 与切片同 diff；intents 台账只记"接下来" | ✅ 照搬 |
| 上游 plan 状态不二次落盘（2026-07-22 note :54：轮内计划已由工具参数记录，log-only 持久层不再建 plan 目录——**针对轮内计划状态**，不禁 repo 级提案与队列，见 `.agents/notes/README.md` 的 proposed 格式） | 不建 plans/tasks 物种（轮内计划走 plan/todo 机制，见下行）；repo 级设计计划住 `notes/proposed/`，队列住 `ROADMAP.md` | ✅ 适配（来源适用范围收窄：轮内状态 ≠ repo 级提案） |
| 会话日志即真相（log-only 持久层；复盘用日志 seq 重建，不凭自述） | 排查/复盘读 `dev/harness-home/sessions/**/session.v3.jsonl.zstd` 逐事件还原（`docs/dev.md` §五） | ✅ 照搬 |
| 轮内任务面：plan 呈批（反馈门①）+ `todo_write` 活清单（反馈门②）+ steer，机制在 base bundle 零接线 | 本 repo 开发流程见 AGENTS.md 硬规则 5；本插件 preset 已挂 `tool-todo` 且**连必填 config 一起抄**（`allowParallelInProgress: true`——不抄 config 会在挂载时炸且 UI 吞错误） | ✅ 适配（本地选择：具体工具与模式以当前会话所有为准，不宣称普适强制） |
| 默认翻转 + 适配声明：默认严格，偏离/裁剪须登记（镜像 "Require evidence for public choices"） | AGENTS.md 硬规则 4；每条适配登记于本文"已声明的适配" | ✅ 照搬 |
| 窄证据 + 只报告实跑过的命令（根 AGENTS.md / `dsh-pre-push-checks` skill） | AGENTS.md 硬规则 3；**验证主张分级**——实证（命令/日志/盘上文件可指认）、推断（标注依据）、未验（如实标 ⏳），自述不作为证据 | ✅ 照搬 |
| 机械门禁带反证（每条先造红再证绿） | `pnpm verify`（结构 / 身份一致 / 双门面 / 自包含 / 技能语法 / 断链 / 队列纪律 / 提交安全——检查清单以 `scripts/verify.mjs` 为准，条数随缺口演进） | ✅ 照搬 |
| 语义漂移探针：门禁抓不住"读起来过期"，用新上下文只读入口链答"现在"问题 | 并入未来 live 会话检查档（当前形态 = 按需审计轮） | ✅ 适配（触发：入口链长到值得单做）。两轮实录：第一轮零过期；第二轮（2026-09-23 信噪比审计，`notes/implemented/2026-09-23-signal-tier-dedup.md`）抓出机械门禁未覆盖的漂移 6 处——探针职责面实证；脚本化已知坑：**问句的期望也会过期**（对方实证：期望锚到轮号，轮闭即红、同日重跑覆盖归档）——期望锚定方案立项时必须定 |
| 继承跟 pin 走：升 pin 重校纪律表（vendor 的套路在演进，一次性快照会再烂） | `sync-dsh` 收尾清单第 4 步 + `pnpm verify` 强制本文存在 | ✅ 照搬 |
| 测试纪律：本地窄证据 + 非平凡改动 same-PR 更新快照 | `pnpm test`（vitest：纯核 + 服务级合同）；快照 harness day 0 未建（触发条件在 `snapshots/README.md`） | ⏳ 部分照搬（等第一处 live-only 回归出现再建） |
| 文档词数预算 + slop 门禁（`doc-budgets` manifest + `verify-doc-budgets`） | 刻意不做 | ⏸ 触发条件：docs 腐化实证（与来源仓同款推迟理由）。第二轮审计（2026-09-23）证据：轻度腐化——多重书写 ×2、内部矛盾 ×1、过期数字 ×1，一轮修完；暂不立案，再犯即触发；建时带**降限防回填**（每次削减后主动降 ceiling，反证 = 临时设更低值即红） |
| Issue → PR 连续流 + Project 状态机（队列不积累历史） | 不适用：本地单人仓无协作面 | ⚠️ 适配：一次切片 = 一个 commit（note 同 diff）；队列语义 = `ROADMAP.md` 根部队列（2026-09-24 起，决定档案 `notes/implemented/2026-09-24-roadmap-queue.md`）+ `notes/intents.md` 意图台账；完成即离队、不积历史（等价物映射见"已声明的适配"2） |

## 已声明的适配（约束 → 适配 → 证据）

1. **无 GitHub 协作面**（约束：本地单人仓）→ 无 Issues/PR 流；等价物 = 切片 diff + note 三段流
   （证据：本表与 notes 流自 day 0 的实际运转）。
2. **工作队列落一个文件**（约束演变：上游"second durable home"否决的是**轮内计划状态**的二次
   持久化；"队列不积累历史"仍成立）→ 2026-09-24 起根部队列 = `ROADMAP.md`（只写接下来、
   完成即离队、条目 ≤3 行索引；决定档案：`notes/implemented/2026-09-24-roadmap-queue.md`，
   **部分替代本条原表述**"工作队列不落文件"）。`notes/intents.md` 仍是意图台账（非工作队列），
   交接文档仍只放 /tmp。
3. **切片可以全新会话**（约束：上下文经济）→ 交接靠入口链（AGENTS.md → docs → notes）本身，
   不靠长活上下文。

## 复查环（防"一次性快照再烂"）

- `pnpm sync-dsh` 升 pin 时：对照本文逐行重校（vendor 的套路在演进，继承必须跟着 pin 走）。
- 语义漂移（读起来过期、自相矛盾）：机械门禁抓不住，靠新上下文探针与审计切片。
- 审计切片的处置优先序：**删 > 并 > 修 > 记**——先问能不能删（净减少），再问能不能并（一处
  事实一个家），然后才是修与登记；判据 = 每处改动能指向它修复的具体误导或漏检，**不是**
  "文件数与总行数少了多少"。文档预算（若触发立案）同上游规则：**上限是护栏，不是减量目标**
  （`vendor/dsh/docs/AGENTS.md`「Wordcount budgets」）。
