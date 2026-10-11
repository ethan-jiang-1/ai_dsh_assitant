---
status: 已结
opened: 2026-10-12
---

# 推敲：把 backlog 流程显式化——两轨入场票、缺陷修复流、状态生命周期与 agent 面

> 立卡：2026-10-12 ｜ 状态：已结（2026-10-12）｜ 类型：Task ｜ 可关闭：是 ｜ 毕业：做现在（本人点头，一轮落地）｜ 结论：制度显式化同轮交付完毕；取舍与理由的家 = [过程 note](../../../notes/implemented/2026-10-12-backlog-process-made-explicit.md)

**问题与期望结果：** 本人要把本仓 `_backlog/` 的研发流程内化并定形（2026-10-12 指示：借鉴姊妹仓同日同题卡，「借助这个 issue 把我们 repo 的 _backlog 里头的内容调整对」）：每个子目录定位清楚、各 README 无歧义、一条说清的走法（分诊 → 推敲 → 毕业/修复 → 交接 notes）、两轨（issues/bugs）**共用一张入场票**——问题清楚 + 验收手段，由格式承载——、一个 agent 面（`_backlog/AGENTS.md` 门牌）让规则到达任何落进这个区域的 agent、缺陷修复流成文（谁授权修复、走哪条通道、怎样算确认）、以及两轨的 **frontmatter 状态生命周期**（枚举值 + 翻转规则，从刚提出到已解决）。完成 = 文档、格式与门禁修正同轮落地全绿，本人确认与本仓制度对齐。

**当前情况：** 制度大件已在——backlog liveness 门禁 2026-10-02 就从姊妹仓借鉴而来（[verify-checks.mjs 头注](../../../scripts/checks/verify-checks.mjs)）。下方本地审计对照源卡七缺口：本仓多数缺口是「没写下来」而非「没在做」。源卡上本人已下三项裁定（本卡按「沿用」转记，待确认）；五个补充与两组枚举是本卡评审材料。毕业倾向随源卡「做现在」，本人点头即一轮落地。

**未决问题：** (1) 例外边界的操作化；(2) 两组枚举集（尤其本地命名与「待修」语义）；(3) 三项裁定是否原样沿用到本仓 + agent 面的本地取舍。三项都在「方案与取舍」带建议。

**下一步：** 本人过目本卡；点头后按「做现在」一轮落地——RFC 进 `notes/proposed/`、全部补丁（章程三页/模板/门禁/夹具）、过程 note、两边清单、根 AGENTS.md 指针；本卡在同一轮收口（`可关闭：是` + `git mv` 同一改动，按[关闭法](../../issues/README.md#关闭或叫停)）。

## 已知与未决

### 来源与跨仓一致性

本卡是 `ai_dsh_loop_advisor/_backlog/issues/2026-10-12-backlog-process-made-explicit.md`（仓外路径，同日同题）的**本地借鉴实例**：同题卡各自入 backlog，内容按仓调整、实质保持一致。源卡的证据基座（生命周期研究：DSH 平台自己的状态机 + 归档卡全量翻转观察）住该仓 `ai_dsh_loop_advisor/_backlog/research/lifecycle/2026-10-12-card-status-lifecycle.md`（仓外）。两仓制度同源——本仓的 backlog liveness 门禁即借自该仓（[verify-checks.mjs 头注](../../../scripts/checks/verify-checks.mjs)）。

### 本地审计：源七缺口 × 本仓判定

| # | 源卡缺口 | 本仓判定 | 本仓证据 |
|---|---|---|---|
| 1 | 缺陷修复流未成文（谁授权/走哪条/怎样算确认） | **成立，带半个例外**——根 [AGENTS.md](../../../AGENTS.md) 豁免清单已有「bug 修复卡毕业」＝自授权通道的雏形，但授权者、通道与确认标准未写；[入口 README](../../README.md)「一件事怎么走」四步全是 issue 视角、无缺陷车道；[bugs/README](../../bugs/README.md) 只说「修完就 git mv」 | 根 AGENTS.md 豁免清单；入口 README 走法节；bugs/README |
| 2 | bugs 模板无验收字段 | **成立**——模板只有 症状/根因（假设）/复现/修复关联，没有「修好怎么算」；[BUG-003](../fixed_bugs/BUG-003-eval-floor-red.md) 用散文即兴造「验收（沿用 BUG-001 判据）」＝缺格式的实测代价 | bugs/README 模板节；BUG-003 归档卡 |
| 3 | 复现字段只在章程、不在模板 | **不成立**——本仓模板已有「## 复现」 | bugs/README 模板节 |
| 4 | 入场票没有两轨共说的家 | **成立（偏 bugs 侧）**——issues 侧「怎么算完成」+ 验收标准散在走法第 1 步、[卡骨架](../../issues/README.md) 与 [验收设计](../../methods/validation-design.md) 三处；bugs 侧完全没有 | 入口 README；issues/README 骨架；methods/validation-design.md |
| 5 | 无 agent 面——规则只能拉不能推 | **半成立**——本仓根 AGENTS.md 已承载 `_backlog/` 路由与两通道说明（比源仓起点好）；但四步走法、卡格式、关闭法仍只在各 README（pull-only）。平台事实同源：嵌套 AGENTS.md 在第一方文件触碰时自动注入 | 根 AGENTS.md 布局表；[agent-instructions README](../../../vendor/dsh/packages/context/agent-instructions/README.md) |
| 6 | severity 记了但无消费方 | **成立**——bugs/README 定义 P0/P1/P2 并入表，但没有任何规则读它（豁免清单不提严重级） | bugs/README 清单与 frontmatter 节 |
| 7 | 状态生命周期零散、bug 侧空 | **成立**——issues 四值（推敲中/等人拍板/已结/叫停）翻转未成法（frontmatter 表只写「等用户作选择时用」）；bugs 只有 `活跃` 一个活跃值，无 fix-ready/fix-landed/waiting-for-owner 等价物；且本仓 `待修` 是归档出口（查明未修挂起），与 fix-ready 是两回事，不能混 | [issues/README frontmatter 表](../../issues/README.md#frontmatter)；bugs/README 离开目录节 |

### 三项裁定（2026-10-12 源卡上本人已下；本卡按「沿用」转记，待本人确认）

1. **门禁升格：延后。** 格式先行；「验收在场」检查族（per-state 必备节）记为 under-pressure 候选——与本仓 promote-on-recurrence 姿态同源（[门禁纪律](../../../scripts/AGENTS.md)：没证明过会失败的守卫不是守卫）。
2. **缺陷修复通道：修复就绪的缺陷卡自带修复授权**——除非缺陷确实很严重、更改了我们某些东西、变了方向（源卡原文：「确实很严重，更改了我们某些东西，变了方向」），走本人与 issue 路。本仓豁免清单的「bug 修复卡毕业」与此同向，边界待写。
3. **两轨 frontmatter 状态生命周期**：从提出到解决；本人要一组推荐枚举——下节 v2 表是评审材料，不是已落决定。

### 五个补充（源卡 agent 提出同款；本卡只换本地落点，待本人扫）

1. **severity 得到消费方**——P0，或修复触及 根 AGENTS.md 常设指令 / docs 合同 / 包的公开行为 / 已记录决定（notes）→ 不自授权，走本人 + issue 路；P1/P2 修复型在修复就绪自授权。（闭缺口 6。）
2. **铁律加带范围的例外**——本仓铁律在[入口 README](../../README.md)（「卡上的状态、方案或建议都不授予实施权限」）；例外（修复就绪缺陷卡）要在章程显式写出并带日期，而不是让新流与铁律自相矛盾。
3. **当场修复的同类清扫有家**——本仓「当场修掉的不建卡」；无卡的当场修复，其同类清扫落点要有明确的家（该轮交付记录/提交说明），消除「清扫值得在卡上点名」与「当场修不掉卡」的自相矛盾。
4. **根因纪律写一次**——假设 → 确认需要证据（一个 bundle、git 历史、一次对照）；撤回的错误假设留在卡上。模板已有「根因（假设）」节，缺确认法。
5. **riding 依赖可表达**——「## 修好定义」可点名其验证随哪件工作走——BUG-003 的「验收沿用 BUG-001 判据」从即兴句子变成模板字段。

## 方案与取舍

### 状态生命周期 v2（推荐；源卡研究结论的本地映射，评审材料）

**分工（一个事实一个家）：** frontmatter `status` 是**当前阶段的唯一家**——一个值，只在下表带守卫的翻转中变；状态行**镜像**它（issues 的引导词、bugs 的 `状态：` 记号）并拥有**历史**——结论追加、出口补结论与去向（归档既有实践）；目录承载粗位置（活跃区 vs 归档池）。门禁加强项＝状态行↔frontmatter **镜像交叉检查**——现有 liveness 族的加强，不是延后的验收族。

**状态行增设「毕业：」闭集头：** `未定 | 做现在 | 以后做 | 不做 | 已在别处` + 自由文字。四门就是本仓[关闭表](../../README.md#关闭条件)的四行；头逼着毕业倾向早点名。它留在行上——是倾向不是状态；frontmatter 仍是状态的唯一家。

**issues——四值不变，翻转成法：**

| From | 守卫 | To | 谁 | 记录 |
|---|---|---|---|---|
| （开卡） | 分诊后——卡只在选对目录后存在 | 推敲中 | agent | 开卡 frontmatter |
| 推敲中 | 下一步是本人的选择 | 等人拍板 | agent | `下一步` 点名确切问题；仅本人可判时 🔒 |
| 等人拍板 | 本人明确答复 | 回推敲中，或出口 | 仅本人 | 行追加 |
| 推敲中 | 判断落地 + 下游申请已提交 | 已结（同改动归档） | agent | 结论 + 去向 + `git mv` |
| 任意活跃值 | 本人叫停、无结论 | 叫停（归档） | 仅本人 | `git mv` |
| 叫停 | 本人明确复活 | 推敲中 | 仅本人 | 行追加 |
| 已结 | 永不重开——复发＝引用旧卡开新卡 | — | — | 写回法 |

**bugs——`活跃` 改名 `排查中`；增三值：**

| From | 守卫 | To | 谁 | 记录 |
|---|---|---|---|---|
| （开卡） | 分诊后 | 排查中 | agent | 开卡 frontmatter |
| 排查中 | 根因有证据确认 + 修复路径已选 + `## 修好定义` 已写；修复属 P1/P2 修复型 | 修复就绪 | agent | 翻转即票**也**即授权（裁定 2） |
| 排查中 | 同样就绪，但 P0 或触及 常设指令/docs 合同/包公开行为/已记录决定 | 等人拍板 | agent | 通道问题本身 |
| 修复就绪 | 修复落进树 | 修复落地 | agent | 行追加 |
| 修复落地 | `修好定义` 满足、证据已记 | 已修（同改动归档） | agent | 结论追加 + `git mv` |
| 排查中 | 查明但决定不修/延后（本仓既有语义） | 待修（归档） | agent | `git mv`；条件到了引用旧卡开新卡 |
| 任意活跃值 | 本人叫停、无结论 | 待修（归档） | 仅本人 | `git mv` |
| 排查中/修复就绪/修复落地 | 下一步是本人的选择 | 等人拍板 | agent | 🔒 仅本人可判时 |
| 等人拍板 | 本人明确答复 | 回等待前状态，或出口 | 仅本人 | 行追加 |
| 修复就绪/修复落地 | 根因或路径被证伪——验收失败或新证据 | 排查中（向后翻） | agent | 撤回留在卡上 |
| 已修 | 永不重开——回归/复发＝引用旧卡开新卡 | — | — | 写回法 |

**共享翻转法：** **沉默不翻转**（平台自己的 owner-gated 先例——goal 暂停/恢复都要直接人类请求）；**每次翻转＝带守卫的动作 + 记录**；**出口值只在归档的那次改动里翻**（jobs 终态集先例）；「可关闭：是」是出口守卫旗，与搬迁同落（既有法）。

**为什么 修复就绪/修复落地 配得上：** 修复就绪一翻同时承载票与授权（裁定 2 + 缺口 4）；修复落地＝「实施不是验收」的可见化——本仓 [issue-to-note](../../methods/issue-to-note.md) 已为 issues 立此法（"implementation alone is not acceptance"），bugs 侧缺词。新值命名观察到的形状，不发明形状。

**门禁诚实（区别于裁定 1）：** 新值需修正 [verify-checks.mjs](../../../scripts/checks/verify-checks.mjs) 的 `cardStatus` 集——bugs 活跃集改 `{排查中, 修复就绪, 修复落地, 等人拍板}`、`活跃→排查中` 改名、行↔frontmatter 镜像交叉检查、「毕业：」闭集头检查——全部在既有 liveness 族内；按[门禁纪律一](../../../scripts/AGENTS.md)，每个新形态在 `packages/dsh-smart-assistant/tests/tooling/verify-gates.spec.mjs` 同 diff 配「造红再证绿」夹具。延后项＝**新的**「验收在场」族（per-state 必备节）：如实记为 under-pressure、刻意不落。

### 选择表

| 选择 | 裁定/建议 | 输掉的方案 |
|---|---|---|
| agent 面 | `_backlog/AGENTS.md` 薄门牌——五个子目录定位、走法、两张票条件、状态枚举、指针；不复制事实（64 KiB 链预算先丢更宽文件；手册仍是唯一家）。**本地半差**：根 AGENTS.md 已有路由，门牌补的是「落进区域」的推送面 | 仅 README（pull）：否——规则要能到达没选择去读的 agent |
| 门禁升格 | 延后，under-pressure 记录 | 验收在场 + per-state 节检查：按 promote-on-recurrence 延后 |
| 修复通道 | 修复就绪自授权 + 严重/变向例外 | 走本人轮/issue RFC（历史实践）：本人已否——缺陷卡就是工作项 |
| `proposed` 状态 | 拒绝 | 每张卡立刻离开的状态；queued-vs-touched 是被否的调度语义 |
| `rejected` 终态 | 延后（under-pressure） | 从未发生过的情形的词汇 |
| `活跃`→`排查中` | 改名——多活跃值并存后「活跃」与手册自己的「活跃区」撞词；动名词恢复与「推敲中」的对称；本仓零活跃 bug 卡，现在改免费 | 保留「活跃」 |
| `待修` 语义（本地行） | 保留为归档出口（查明未修挂起），**不**并入 修复就绪——后者是活跃态自带授权 | 把 `待修` 改造成 fix-ready |
| 「毕业：」头 | 闭集 `未定\|做现在\|以后做\|不做\|已在别处` + 自由文字 | 自由文本 |
| `blocked` 状态 | 拒绝——平台的 goal 机需要它是因为自主环必须自报僵局；卡是读者消费的，依赖随 `修好定义`/`下一步` 走 | `blocked` 枚举值 |
| 向后翻转 | 带守卫合法（证伪、本人答复、本人复活） | 只向前的机器 |
| `已结` 命名 | 保留——它就是本轨的 resolved；改名分裂归档词汇 | 改 `已解决` |
| issues 工作态 | 无——卡就是判断记录；bugs/issues 不对称是刻意的、要写明 | — |

## 验收标准

按 [验收设计](../../methods/validation-design.md) 拆分；描述下游做成什么样算合格，backlog 关闭不要求这些未来检查已执行。

| # | 行为 | 类 | 输入 / 状态 | 判 pass/fail 的信号 | 负例 / 互补状态 | 证据 owner | 真人判断 |
|---|---|---|---|---|---|---|---|
| 1 | `_backlog/AGENTS.md` 门牌：五子目录定位、走法、两张票条件、状态枚举，指针到手册/方法/合同 | 确定性（文档合同） | 门牌文件 | 元素齐、每个链接可解析 | 复制或顶撞其手册家的事实 fail review | `pnpm verify`（断链）+ 本人读 | 本人：清楚到能给新 agent 路由 |
| 2 | [入口 README](../../README.md) 补缺陷车道与全流（分诊→推敲→修复就绪→通道→修复落地→确认→归档→写回）+ 例外条款 + 带日期铁律例外 + 两条生命周期翻转法 | 确定性 | 章程三页 | 节齐、三页一致 | 与四门主张/铁律矛盾 fail review | `pnpm verify` + 本人读 | 本人：例外边界操作化 |
| 3 | [bugs 模板](../../bugs/README.md) 增 `## 修好定义` 与根因确认法；frontmatter/状态节列全值与翻转规则 | 确定性 | 模板 | 节齐 | 章程点名模板缺的节 fail | `pnpm verify` | 无 |
| 4 | [issues/README](../../issues/README.md) 写明两轨入场票 + 链翻转法 | 确定性 | issues README | 句子在 | — | `pnpm verify` | 无 |
| 5 | `cardStatus` 集与镜像检查修正：新枚举、`排查中` 改名、行↔frontmatter 镜像、「毕业：」闭头；夹具更新；**无新检查族** | 确定性（门禁） | verify-checks.mjs + verify-gates.spec.mjs | verify 绿、新形态被接受、每个植入缺陷仍被抓 | 「修复就绪无修好定义」**不**被标红——如实记为延后族 | `pnpm verify` + verify-gates.spec.mjs | 无 |
| 6 | 过程 note（制度变更）落地 + notes INDEX 再生 + 根 AGENTS.md `_backlog/` 行指向门牌 | 确定性 | notes + 根 AGENTS.md | 在、绿 | — | `pnpm verify`（notes 形状） | 无 |

## 关闭条件

按「做现在」走：本人对本卡的评审（三项裁定沿用、五个补充、例外边界、两组枚举、agent 面取舍）落定后**一轮**完成——RFC 进 `notes/proposed/` 与全部补丁同轮落地；卡记提交日期与去向；`可关闭：是` + `git mv` 进 settled_issues 同一改动（按[关闭法](../../issues/README.md#关闭或叫停)）。除本轮交付记录外，不等待下游加工完成。

## 结论（2026-10-12）：做现在，同轮落地完毕

本人过目后点头开工（2026-10-12，本对话）：三项裁定沿用、例外边界按操作化建议、两组枚举按推荐、门牌采纳。一轮交付：

- **两轨入场票 + 缺陷车道 + 铁律带日期例外 + 共享翻转法 + 卡的生命周期** → [入口 README](../../README.md)
- **修复通道与授权（severity 的消费方）、翻转表、模板加 `## 修好定义` 与根因确认法、riding 依赖** → [bugs/README](../../bugs/README.md)
- **issues 翻转表 + 「毕业：」闭集头** → [issues/README](../../issues/README.md)
- **agent 门牌** → [../../AGENTS.md](../../AGENTS.md)；根 [AGENTS.md](../../../AGENTS.md) `_backlog/` 行加指针
- **门禁（liveness 族内，无新检查族）**：cardStatus 新枚举（排查中/修复就绪/修复落地/等人拍板）、活跃卡状态行↔frontmatter 镜像互查（归档豁免）、「毕业：」闭头——[verify-checks.mjs](../../../scripts/checks/verify-checks.mjs)；造红再证绿夹具三组（bug 四值镜像全绿 / 旧词活跃+镜像分叉+缺行三红 / 野头红+归档豁免绿）——[verify-gates.spec.mjs](../../../packages/dsh-smart-assistant/tests/tooling/verify-gates.spec.mjs)
- **词汇事实更新** → [架子命名 note](../../../notes/implemented/2026-10-09-backlog-shelf-names.md)（缺陷侧词汇的现行 owner 移交流程显式化 note）
- **取舍与理由的家** → [过程 note](../../../notes/implemented/2026-10-12-backlog-process-made-explicit.md)。按 notes 合同的两处本地适配如实记录：RFC 不经 proposed/ 停放（点头与交付同轮，直接落 implemented）；本仓 notes 刻意无集中 INDEX，「INDEX 再生」不适用。
- **刻意延后（under-pressure，句子住过程 note）**：「验收在场」检查族、`rejected` 终态词汇。

验证（真跑过的命令）：`pnpm exec vitest run packages/dsh-smart-assistant/tests/tooling/verify-gates.spec.mjs`（主 spec 全绿；`.tmp/operating-loop-prototype/` 旧拷贝一项预存红，其 vendor tsconfig 缺失，与本 diff 无关）+ `pnpm verify`（全绿）。去向：[notes/implemented](../../../notes/README.md)（过程 note 已在），无 further 下游。
