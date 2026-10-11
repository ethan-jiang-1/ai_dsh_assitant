---
topic: 定位
intent: "窄范围核对一把手总助的当前价值合同、历史关闭依据与真实价值证据边界。"
---

# CEO 价值合同复核：为什么当前证据还打不动一把手

> 复核范围：静态阅读当前合同、定位/总助体验相关卡片、方法学、已存领域评测与历史实施记录。未启动服务，未运行评测，未读取 ignored 的业务现场、运行 home 或秘密。本文不是全 repo 语义审计，也不替代真人产品验收。
>
> 目标问题：当前合同对 CEO 承诺了什么？已存证据真正证明什么？历史“关闭/implemented”是否兑现了用户价值？相对普通聊天或真人助理，优势有没有真实验证？
>
> 补充范围：直接静态对照当前技能与源代码；本报告服务于[持续经营回路卡](../../_archive/settled_issues/261008-ceo-operating-loop.md)，实施/复验安排由该卡承载，本报告不授予实施权限。

> 静态可行性附录的消费者：[总助体验卡](../../issues/261006-chief-of-staff-experience.md)核对主区默认入口、首次会话与读回限制；[持续经营回路卡](../../_archive/settled_issues/261008-ceo-operating-loop.md)核对跨会话账本承载与未决的更新规则。见[第八节](#八本轮主区入口与会话数据路径的静态可行性)。

## 结论摘要

1. **当前合同叠加了三层承诺，但首日可兑现的主张没有收窄。** README 把产品定义成“管理岗基座 + 数字分身”：未学习时解决典型经营难题，三件同类工作后按用户标准工作，且学习可见、可改、可删（[`README.md:8-22`](../../../README.md#L8-L22)）。结果层又承诺拆解可追溯、行动计划可采用、越界时诚实拒答、越用越像本人、严格本地与可追溯治理（[`README.md:24-33`](../../../README.md#L24-L33)）。定位卡后来把对外叙事收成“**一把手的总助：你拍板，它盯到闭环**”，把决策卡、行动表/到期和留痕作为可指认骨架（[`261005-open-value-deficit.md:486-491`](../../_archive/settled_issues/261005-open-value-deficit.md#L486-L491)）。这些不是同一时点的承诺：B“军师”可在第 1 天验，A“随员”第 1 周验，C“分身”第 30 天才显形（[`261005-open-value-deficit.md:136-168`](../../_archive/settled_issues/261005-open-value-deficit.md#L136-L168)）。定位材料其实已把 Day 0、Day 1、第一周与第 30 天的价值层次拆开；问题在于这些阶段各自的真人结果尚未验收，当前证据仍主要是“它能分析”。一把手第一眼会按“总助是否立即替我减少判断/跟进负担”来评估。

2. **领域能力证据是目前最硬的一段，但它证明的是“会答、会查、会拒答、能落动作”，不是“CEO 会回来并把真事交给它”。** 2026-10-02 的 30 题批次机器预判为事实正确 ≥1：30/30、0 分题 0、应拒答 8/8；材料同时明确机器只填查房间/技能/耗时，质量由人打（[`calibration-2026-10-02.md:7-24`](../../../dev/eval/domain/calibration-2026-10-02.md#L7-L24)）。题面本身要求真实经营问题、依赖公司盘真实数字，且模板明写“机器只守地板，不判质量”（[`TEMPLATE.md:8-18`](../../../dev/eval/domain/TEMPLATE.md#L8-L18)）。这能支持管理岗基座的事实核验、出处、拒答和行动建议地板；不能支持采纳、留存、决策质量改善、跟进闭环率或相对真人助理的净收益。

3. **历史“已交付/implemented”关闭的是实现切片与当次走查，不是价值合同。** 归档 note 将四片写成“全交付”，并列出 `pnpm test`、build/typecheck、verify、web-expected 和真机走查（[`2026-10-07-opening-brief-and-rhythm.md:1-4`](../../../notes/archived/2026-10-07-opening-brief-and-rhythm.md#L1-L4)、[`2026-10-07-opening-brief-and-rhythm.md:32-36`](../../../notes/archived/2026-10-07-opening-brief-and-rhythm.md#L32-L36)）。但活跃的验收卡明确纠偏：#2 重载没有机械断言，#3/#6 依赖易失走查，#7 blank 渲染夹具阻断，#5/#6/R5 和用户体验仍待判断，不能概括为“6/7 通过”（[`261007-opening-brief-and-rhythm.md`](../../issues/261007-opening-brief-and-rhythm.md#验收标准)）。总助卡进一步明确默认桌面未交付、对话处理单自动回流未独立举证（[`261006-chief-of-staff-experience.md`](../../issues/261006-chief-of-staff-experience.md#已知与未决)）。所以历史关闭真实兑现了若干交互/编排改动，但没有证明“打开就是总助桌面”或“它持续盯到闭环”。默认视图缺口首先影响可见入口和状态回流的可见性，不能单凭它推出跟踪逻辑本身已失败。

4. **“历史关闭是否真实兑现用户价值”的直接答案：部分兑现，且核心总助价值仍是 blocked / human judgment pending，而不是 pass。** 代码和测试可证明播报分支、按钮路由、中文拍板文案、排程写入等局部行为；活卡逐行标明这些证据不能证明浏览器可读性、用户语气、跨周行为、对话回流或产品红线（[`261007-opening-brief-and-rhythm.md`](../../issues/261007-opening-brief-and-rhythm.md#验收标准)）。方法学还规定：缺命令、陈旧 artifact 或不支持的解释必须判 blocked；技术绿不能升级为产品价值接受（[`validation-judgment.md:17-31`](../../methods/validation-judgment.md#L17-L31)）。

5. **相对普通聊天的优势已有“结构候选”和局部能力证据，但没有相对基线的真实验证。** 架构合同确实有工作区四房间、四个自有工具、摘要、技能、机器养护和会话可重建日志（[`architecture.md:7-22`](../../../docs/architecture.md#L7-L22)、[`architecture.md:127-139`](../../../docs/architecture.md#L127-L139)）。领域题也反复展示出处、缺数、可推翻判断和 owner/时限/指标/停止条件；Q1 的事实维最新盲打为 1（机器预判 2 被从严纠正），不能再把它写成事实 2（[`sheet-2026-10-02-15-04.md:11-18`](../../../dev/eval/domain/sheet-2026-10-02-15-04.md#L11-L18)、[`260928-domain-eval-v0.md:21-39`](../../_archive/settled_issues/260928-domain-eval-v0.md#L21-L39)）。但没有同题普通聊天基线、真人助理对照、随机/受控分流、真实 CEO 采纳读数或业务结果读数。因此“比普通聊天好”目前是可解释的设计假设，不是已验证的优势。

6. **相对真人助理的优势没有被证明，且输入边界主动承认关键前提尚未验证。** 输入卡指出不接外部数据源、不做 IM，当前承诺限于用户提供的事情；五谷渔粉案例只能说明信息提炼需求，不证明用户会主动投递碎片（[`261007-input-boundary.md:32-40`](../../_archive/settled_issues/261007-input-boundary.md#L32-L40)）。候选输入通道仍在等用户选择，推荐“专用试用环境 + 先观察 30 天”，因为尚无本人输入习惯观察（[`261007-input-boundary.md:18-30`](../../_archive/settled_issues/261007-input-boundary.md#L18-L30)）。没有真人助理对照，也没有证明本系统能获得真人助理拥有的外部触达、主动追问、组织关系与跨渠道事实。

## 一、当前合同到底承诺什么

### 1. 能力合同：管理岗基座、学习、治理

- **出厂基座（P1）**：没有学过任何人时，面对典型经营难题，能从管理/销售/财务视角拆解并给可执行行动计划，由用户判“像样”。
- **学习（P2）**：同类拆解三件后，第四件无需重复交代，按用户标准、口径、模板工作，并指出来源。
- **可治理（P3）**：用户能看、改、删学到的内容，学错可被人读文件与机器检查发现。

以上是 README 的方向判据，不是已达成声明；其表格把 P1/P2/P3 写成外部可观察目标（[`README.md:8-22`](../../../README.md#L8-L22)）。

### 2. 结果合同：准确、可执行、诚实、持续变像、可安装、可控

O1-O6 的结果合同涵盖：按“现象→原因假设→取舍标准→行动”拆解并指向原文；行动计划要有人、时间、指标、风险与止损且被采用；不知道时明确拒答；反馈后修正且分数不回退；企业安装；变更可追溯、数据不出边界、对外内容由本人过目（[`README.md:24-33`](../../../README.md#L24-L33)）。

这里有一个审计问题：**O2 的“被人采用”、O4 的“评测分不回退”、O6 的“企业环境管得住”是结果/治理承诺，不会由单轮答案或 UI 走查自动成立。** 当前 docs/testing 也明确 `eval:domain` 的领域质量是人判，机器不判质量（[`docs/testing.md:16-27`](../../../docs/testing.md#L16-L27)）。

### 3. 对 CEO 的定位合同：提醒、建议、跟踪与学习贯穿决定前后

定位卡收敛的动作句为“你拍板，它盯到闭环”，并把三个词映射到桌面对象：拍板=决策卡，盯=行动表/到期，闭环=留痕（[`261005-open-value-deficit.md:486-491`](../../_archive/settled_issues/261005-open-value-deficit.md#L486-L491)）。更早的定位拆出：B 军师第 1 天可验，A 随员第 1 周可验，C 分身第 30 天才显形，排序是“卖 B、用 A 留人、让 C 慢慢显形”（[`261005-open-value-deficit.md:136-168`](../../_archive/settled_issues/261005-open-value-deficit.md#L136-L168)）。

**诊断：** 实际产品/证据仍主要围绕 B 的一次性分析；A 的“回来有内容、持续盯进展”和 C 的“按本人路数复利”被放在同一首屏印象里。对 CEO 来说，不能把“会分析一次”当作“总助已在工作”。

## 二、已存证据真正证明什么

### 1. 静态合同/架构证明的范围

`docs/architecture.md` 描述了 working folder、四房间、四工具、摘要、技能、养护与日志纪律，并把工作区定位为跨会话持久状态（[`architecture.md:7-22`](../../../docs/architecture.md#L7-L22)、[`architecture.md:71-88`](../../../docs/architecture.md#L71-L88)）。这证明设计有承重结构，不能证明该结构让 CEO 感到“值得回来”。

`docs/testing.md` 的证据地图明确区分：纯核/服务合同只能证明规则与服务行为；组合只能证明装载；eval 可证明行为地板和记录结果，但不证明领域质量；领域质量另需 `eval:domain` 人判（[`testing.md:16-29`](../../../docs/testing.md#L16-L29)）。这是本复核最重要的方法边界。

### 2. 领域评测：强项是可核经营分析与拒答纪律

- 30 题批次：30/30 事实正确至少 1 分、0 分题 0、应拒答 8/8；但这是机器预判，用户保留推翻权（[`calibration-2026-10-02.md:15-31`](../../../dev/eval/domain/calibration-2026-10-02.md#L15-L31)）。
- 题面要求依赖真实公司盘；打分维度是事实正确、依据在场、应拒答、可用性；可用性定义为“据此就能动手”（[`TEMPLATE.md:15-18`](../../../dev/eval/domain/TEMPLATE.md#L15-L18)、[`TEMPLATE.md:42-53`](../../../dev/eval/domain/TEMPLATE.md#L42-L53)）。
- Q1 的答案确实给出基线、三条可推翻原因、owner/时限/指标/停止条件；但最新盲打把事实维从机器预判 2 从严纠正为 1（mtime 引用未逐项核实），依据/可用性仍需按人审而非机器预判理解（[`sheet-2026-10-02-15-04.md:23-67`](../../../dev/eval/domain/sheet-2026-10-02-15-04.md#L23-L67)、[`260928-domain-eval-v0.md:21-39`](../../_archive/settled_issues/260928-domain-eval-v0.md#L21-L39)）。
- Q3/Q4 体现“不知道自己不知道”：给出占位/缺数/指路，拒答项合格；但 Q3 的中心数字仍是外盘占位，因此事实维仅 1（[`sheet-2026-10-02-15-04.md:129-178`](../../../dev/eval/domain/sheet-2026-10-02-15-04.md#L129-L178)、[`sheet-2026-10-02-15-04.md:180-252`](../../../dev/eval/domain/sheet-2026-10-02-15-04.md#L180-L252)）。
- 当前行为任务清单只有 5 个任务（`first-open-intake`、`scope-honesty`、`continuity-from-home`、`breakdown-uses-skill`、`desk-refresh-loop`）；它覆盖首开、范围诚实、从 home 连续性、技能使用和桌面刷新回路，但没有完整覆盖 morning-brief 周排程、主动建议优先级、持续进展跟踪或 P2“三件同类→第四件”泛化结果（[`tasks.mjs:102`](../../../dev/eval/tasks.mjs#L102)）。这只是该行为任务车道的覆盖边界，不是对全仓测试的否定。
- 独立盲打对 30 题发现 118/120 维度一致、2 处从严修正；G2 三判据仍保持 100%/0/8-8。这增强评测判例的可靠性，但仍属于答案质量/事实核验，不是价值、采纳或经营结果证据（[`260928-domain-eval-v0.md:19-39`](../../_archive/settled_issues/260928-domain-eval-v0.md#L19-L39)）。

### 3. 历史 UX/总助切片：证明了若干局部行为，没有证明主价值

已存实现记录实际证明或曾观察到：

- auto-send 退役后某次 ×3 重载不增殖；
- 客户端能合成三行播报、行点击进动作对话；
- composer 曾恢复可见可打字；
- dashboard 的“有问题？”曾通过 `ctx.layout.selectPanel(null)` 回对话；
- 中文拍板文案与卡片即时锁定；
- 某次真模型回合写入 weekly + at 排程；
- Day-0/Day-2 走查弧线当时走通。

这些内容见冻结 note 的实现摘要（[`2026-10-07-opening-brief-and-rhythm.md:6-20`](../../../notes/archived/2026-10-07-opening-brief-and-rhythm.md#L6-L20)）。但活卡逐项重新标注了证据限制：重载无机械断言；截图在 `/tmp`，重启即失；#7 blank 夹具阻断；对话→桌面回流没有独立证据；用户的语气、周坐口径和总体体验尚未判定（[`261007-opening-brief-and-rhythm.md`](../../issues/261007-opening-brief-and-rhythm.md#验收标准)、[`261007-opening-brief-and-rhythm.md:46-62`](../../issues/261007-opening-brief-and-rhythm.md#L46-L62)、[`261007-opening-brief-and-rhythm.md:79-101`](../../issues/261007-opening-brief-and-rhythm.md#L79-L101)）。

总助卡明确默认桌面 Step 2 未交付，Goal 3 的“对话产生处理单后自动回流桌面”未单独举证（[总助卡接手分支](../../issues/261006-chief-of-staff-experience.md#接手分支)）。前者首先影响打开时的可见性，后者是状态变化可见回流的验收缺口；二者都不能单独证明持续跟踪的领域逻辑失败，更不能以 UI 缺口代替核心回路诊断。

### 4. 旧定位卡自身已经记录“能力有、回来理由没有”

定位卡曾记录：trial home 的桌面内容质量高，但全部来自已发生会话、必须点按钮才更新；助手从不先开口；schedule 默认存在但仅用于自我养护；当时的 naive-CEO 代理读数把 P1 说成“军师级”“下周还愿意继续用”，但同卡明确这是代理角色读数，不能证明军师能力已足够，也不能证明真实连续经营（[`261005-open-value-deficit.md:72-84`](../../_archive/settled_issues/261005-open-value-deficit.md#L72-L84)、[`261005-open-value-deficit.md:43-51`](../../_archive/settled_issues/261005-open-value-deficit.md#L43-L51)）。同卡把根因写成“价值全部延期、成本全部即时”，以及“产品在等用户给燃料，用户在等产品给理由”的双向等待（[`261005-open-value-deficit.md:93-104`](../../_archive/settled_issues/261005-open-value-deficit.md#L93-L104)）。

这是最接近“为什么打不动 CEO”的已有诊断：**单轮经营分析的代理读数不能填补冷启动、主动提醒/建议、持续跟踪和真实任务本金的缺口。**

### 当前实际路径与断点（源码对照，不是新愿景）

以下六行按实际路径分组，区分确定性客户端/纯核代码与模型加载技能后的守约要求。`whenToUse` 是技能触发指导，不等于代码已强制在每次触发时调用；本轮也未确认活进程的技能装载与调度。

| 当前路径 / 源证据 | 实际触发、取数、变化与反馈处理 | 当前能够支持什么 / 断点 |
|---|---|---|
| **到期提醒/周坐**：[morning-brief:3–23](../../../packages/dsh-smart-assistant/presets/assistant/skills/morning-brief/SKILL.md#L3-L23)、[晨报上下文:27–48](../../../packages/dsh-smart-assistant/presets/assistant/skills/morning-brief/SKILL.md#L27-L48)、[延期/静音/周坐:53–89](../../../packages/dsh-smart-assistant/presets/assistant/skills/morning-brief/SKILL.md#L53-L89) | 带 due 行写入时，模型应同回合建 at 提醒；scheduled prompt 到达时读该 session 的 desk、memory、research，再给上下文、变化、下一步与阻塞缺数。延期应同时改 schedule 和 desk due；done/dropped 应删提醒；静音保留行动并存 memory；周坐先 list 再建 weekly，一工作目录一条。 | **现有技能已写明业务语义，不是没有提醒方案。** 但绑定行动与提醒的实际查找/更新由模型完成；这些段落未给强制 action-id↔schedule-id 映射算法。单次提醒落盘不能证明改期、完成、静音和跨会话防重都生效。技能自述 Host 合并错过的周期，本文未读调度实现，不能把这句提升为核实结果。 |
| **桌面状态刷新/计划跟踪**：[desk-refresh:9–53](../../../packages/dsh-smart-assistant/presets/assistant/skills/desk-refresh/SKILL.md#L9-L53)、[动作来源:112–155](../../../packages/dsh-smart-assistant/presets/assistant/skills/desk-refresh/SKILL.md#L112-L155)、[反馈回程:177–215](../../../packages/dsh-smart-assistant/presets/assistant/skills/desk-refresh/SKILL.md#L177-L215) | 面板只读 session workspace 的 `.desk/state.json`；模型从 home 的工具结果取 counts/threads/memories，从 knowledge 的 `type: plan` 页复制动作，按本人结果报告标 open/done/dropped 并保留 note。拍板/纠错/补数后应更新房间记录并同回合重写 desk。 | **已有跨会话资料来源、计划页和状态承载，不能宣称从零/无跟踪。** 但 room→workspace snapshot 的导出及 feedback→记录→snapshot 回程由模型守约；不是客户端确定性事项状态机。来源页可跨会话，不等于当前 walk 视图自动汇总所有工作区。 |
| **依据与建议/介入对象**：[management-breakdown:13–41](../../../packages/dsh-smart-assistant/presets/assistant/skills/management-breakdown/SKILL.md#L13-L41)、[desk-refresh:77–88](../../../packages/dsh-smart-assistant/presets/assistant/skills/desk-refresh/SKILL.md#L77-L88) | 用户带复杂经营问题时，模型按事实/可推翻假设/CEO-CFO-Sales标准/owner-timing-metric-stop 拆解；已有本人标准需引用所学会话。桌面技能要求业务待决优先，多个事项由模型给 rank，保留选项/代价。 | **已经有有据建议与 owner/停止条件的产出路径。** 它主要由用户问题和已有资料触发，不是代码自动发现最新进展并选择现在谁该介入；来源是否充分、谁该介入、建议是否随新条件改变仍需模型与结果验证。 |
| **经验→记忆/线索/技能**：[self-reflection:3–29](../../../packages/dsh-smart-assistant/presets/assistant/skills/self-reflection/SKILL.md#L3-L29)、[技能沉淀:33–53](../../../packages/dsh-smart-assistant/presets/assistant/skills/self-reflection/SKILL.md#L33-L53) | 可复用经验/被要求反思/写技能前，模型应先 brief 取会话证据，再判断是否值得保留；事实偏好决定→memory，未决问题→research open/update，程序→save_skill，已解决线索→promote。允许“没有值得保留的东西”。 | **有经验沉淀和后续复用设计，不能说只会一轮回答。** 是否正确提炼、下次是否发现并使用、是否符合本人标准以及“三件→第四件”效果，均不是这份技能文本可以证明的；此处描述的 save_skill 路径也不能替代提案路径核查。 |
| **技能提案纯核**：[proposal.ts:19–68](../../../packages/dsh-smart-assistant/src/domain/skills/proposal.ts#L19-L68)、[读取/输出:76–110](../../../packages/dsh-smart-assistant/src/domain/skills/proposal.ts#L76-L110)、[批次提示:117–124](../../../packages/dsh-smart-assistant/src/domain/skills/proposal.ts#L117-L124) | 确定性校验 proposed/approved/rejected/landed、正整数 revision、description/时间等；proposal id 来自 room entry，同名技能作为提案身份；读写保留 revision/source/body。批次提示函数要求 goal 完成后反思可复用过程并 propose_skill，允许无产出。 | **此纯核确有身份/版本/生命周期词汇与校验。** 本轮没有读调用者，因此没有核实 goal 完成事件是否实际挂接、重提 revision 递增与批准后落地执行；即使执行，也证明治理机制，不证明学到的方法有效。 |
| **客户端确定性消费与回话**：[desk-core.ts:15–45](../../../packages/dsh-smart-assistant/src/client/desk-core.ts#L15-L45)、[first-mile.ts:227–262](../../../packages/dsh-smart-assistant/src/client/first-mile.ts#L227-L262)、[desk-io.ts:42–68](../../../packages/dsh-smart-assistant/src/client/desk-io.ts#L42-L68)、[读取入库:125–151](../../../packages/dsh-smart-assistant/src/client/desk-io.ts#L125-L151)、[发送:244–271](../../../packages/dsh-smart-assistant/src/client/desk-io.ts#L244-L271)、[反馈操作:388–448](../../../packages/dsh-smart-assistant/src/client/desk-io.ts#L388-L448) | walk 读最近 5 会话中读到的 desk；sidebar 读绑定 session workspace。开屏选各分区 `[0]`，actions 只排除 done，没有按 due/变化/影响计算排序。行定位用 id，缺 id 回落 question/what；rowId 用于客户端 pending/回执，模型收到的是 `[桌面]` 标记的自然语言问题/标题（该发送路径未传 rowId）。拍板、办完、补数、不办发送模型指令并要求 desk-refresh；过问 askCheckIn 只发进展问题，没有显式追加刷新步骤。 | **代码确定的是取哪个 snapshot、展示哪行、消息发给哪个 session，以及交互回执，不是主动业务监测/状态更新。** id/status optional 不能推论系统无跨会话身份；技能示例有 id、home 有持续记录，但此消费接口未强制稳定身份/枚举状态，也未确认计划行动↔桌面行↔提醒的稳定映射。开屏甚至可把 dropped 行保留在“在跟”集合；这是所读选择分支的事实，非所有视图的行为结论。 |

**对现状的判断：** 不是“只有愿景、落不了地”：现实现成的骨架是 home 资料/计划页→模型输出动作与 desk→调度提醒指导→本人回话→模型更新记录并重写 desk→反思沉淀。也不是“骨架都在所以已经兑现”：决定性断点集中在模型要连续完成多个步骤、snapshot 来源与事项身份关联、按变化/影响筛选介入时机、动作与提醒一致性，以及经验在下一次工作中实际使用。应先在现路径复验这些组合结果；静态材料不足以判定必须放弃产品，也不足以宣称总助回路已成立。

## 三、CEO 真正要买的是持续跟踪回路

CEO 的负担不止“把一个问题分析出来”，还包括：持续掌握事情进展，筛选现在谁该介入，带依据给出建议或提醒，收到反馈后更新跟踪，直到决定有结果。当前材料对这条回路有结构性承载，但没有完整价值验证。

- **已存在的承载字段/动作**：历史验收和领域题反复使用 `owner`、`due`、指标、停止条件、缺口、出处、decision/action/thread 状态；Q1 的答案也能把判断写成 owner/时限/指标/停止条件表。这证明输出可以成为可跟进对象，不只是聊天段落，但不证明 owner 真的介入或事项真的完成。
- **排程与主动提醒**：定位设计把“它先开口”定义为到期驱动的晨报/提醒，并明确 v1 不承诺新信息，而承诺“你批过的事推到该发生的那天”（[`261005-open-value-deficit.md:143-152`](../../_archive/settled_issues/261005-open-value-deficit.md#L143-L152)）。活卡 #6 要求 `schedule_list` 防堆叠、weekly + at 两条排程，但存档只有某次真模型回合落盘的历史记录，缺可复跑命令、具体 eval task、重复触发前后对照，不能证明长期提醒稳定（[`261007-opening-brief-and-rhythm.md`](../../issues/261007-opening-brief-and-rhythm.md#验收标准)、[`261007-opening-brief-and-rhythm.md`](../../issues/261007-opening-brief-and-rhythm.md#补证据前的准备)）。
- **不重复、延期、撤回、条件改变**：工作区/桌面历史整改曾为 action/thread 状态、`done`/`dropped`、撤下留痕、未知状态诚实分组、过期回执和重复动作写过机械规则与夹具；这些说明“状态可表达、撤回可留痕、动作可结算”是被设计和局部验证过的机制面（[`2026-09-27-cultivation-remediation-round2.md:94-99`](../../../notes/archived/2026-09-27-cultivation-remediation-round2.md#L94-L99)、[`2026-09-27-cultivation-remediation-round2.md:126-148`](../../../notes/archived/2026-09-27-cultivation-remediation-round2.md#L126-L148)、[`2026-09-27-cultivation-remediation-round2.md:180-204`](../../../notes/archived/2026-09-27-cultivation-remediation-round2.md#L180-L204)）。但当前 CEO 价值证据没有把同一事项的稳定身份、负责人变更、延期/撤回/重新开启、条件改变后的提醒语义串成一个跨周闭环；也没有证明它能避免重复提醒、在延期后只提醒新 due、撤回后停止提醒、条件变化后更新建议。
- **反馈更新**：已有“补上缺口→更新相关记录→从 gaps 移除或改写”的回程规则（[`2026-09-27-cultivation-remediation-round2.md:143-148`](../../../notes/archived/2026-09-27-cultivation-remediation-round2.md#L143-L148)），但这是单个缺口动作的契约/夹具证据，不是 CEO 反馈后跨轮持续掌握进展的真实结果。

因此，“你拍板，它盯到闭环”目前最多可表述为**有字段和机制候选、局部动作走查存在，完整提醒—建议—反馈—状态更新—完成/撤回回路未证**。这正是普通聊天基线尚未被比较的关键：普通聊天也能给一次提醒或建议；差异化必须证明本系统能稳定保留事项身份与状态，并在下一次介入时给出不重复、有依据、符合最新条件的建议。

## 三、历史关闭是否真实兑现用户价值

### 可算“真实兑现”的部分

- 交互缺陷修复有具体行为对象：重复 auto-send、输入框存活、死按钮回话、英文机器腔/模型自猜桌面状态。
- 结构化工作产物已被题面和历史走查反复展示：决策卡、行动表、缺数、出处、owner/时限/指标/停止条件。
- 领域评测已建立一套相对严谨的事实/出处/拒答/可用性地板，并有盲打纠偏。

### 不能算“已兑现”的部分

- **默认总助桌面**：活卡明确 Step 2 未交付；实现桌面视图不等于打开即见桌面（[`261006-chief-of-staff-experience.md:46-52`](../../issues/261006-chief-of-staff-experience.md#L46-L52)）。
- **持续督办/回流**：已有刷新机制不等于“对话处理单自动出现在 dashboard”；没有独立验收证据（[`261007-opening-brief-and-rhythm.md:37-38`](../../issues/261007-opening-brief-and-rhythm.md#L37-L38)、[`261007-opening-brief-and-rhythm.md`](../../issues/261007-opening-brief-and-rhythm.md#补证据前的准备)）。
- **不增殖、不重发的长期可靠性**：历史 ×3 走查是易失证据；客户端 spec 没有 `sendPrompt` 引用，不能证明不重发（[`261007-opening-brief-and-rhythm.md:32-34`](../../issues/261007-opening-brief-and-rhythm.md#L32-L34)）。
- **用户自己的声音与产品红线**：机器只断言中文形态/三行可点；“像不像本人”“是不是口语化语文题而非仪表盘”“周坐内容是否真想要”仍是人判（[`261007-opening-brief-and-rhythm.md:36-44`](../../issues/261007-opening-brief-and-rhythm.md#L36-L44)）。
- **真实采用与经营结果**：没有真实管理层受众的“看完复述/愿意碰真事/持续回来/采用产物/业务结果”证据。定位卡自己把“打动”判据列为待收敛，并警告打动由真实管理层判，不由自跑探针判；真用仍是说服力本钱（[`261005-open-value-deficit.md:325-354`](../../_archive/settled_issues/261005-open-value-deficit.md#L325-L354)）。

因此，“implemented”在冻结 note 中应理解为**切片实现完成的历史记录**，不能理解为“CEO 价值验收完成”。这不是对历史实现的否定，而是对证据层级的纠正。

## 四、相对普通聊天与真人助理的优势：现状判读

### 相对普通聊天：有可信的差异化候选

1. **跨会话事实/决定/线索/知识的可读持久房间**，而不是单次上下文；
2. **决策工作单元结构化**：决策卡、选项/代价/不可逆、行动表、owner/due/stop、缺口；
3. **出处与拒答纪律**：有来源就回指，缺数就标缺，不能判就拒答并指路；
4. **拍板权与可追溯**：助手辅助本人，不代本人对外；治理、审批、curate 和日志可检查；
5. **从判断走到后续动作**：排程、桌面、跟进对象，而不只是输出一段聊天文字。

这些是架构与题面可见的产品结构，不是相对实验结果。尤其普通 ChatGPT/Claude 的同题对照尚不存在；不能用“我们的文件更多/工具更多”推出用户价值更高。

### 相对真人助理：没有已验证优势，且存在结构性劣势

- **未证明的潜在优势**：低成本保留判断上下文、每次引用出处、可机械养护、决定/行动/缺口可统一检索、strict local。
- **未覆盖的真人助理能力**：外部渠道与事实获取、主动问人/催人、关系与组织政治、代表主人协调、在信息不完整时持续追问并承担跟进责任。
- **产品当前的直接劣势**：不接 IM/外部数据源；输入依赖本人提供碎片；输入通道尚未选定；默认桌面与回流证据不足。输入卡明确说现有对话、播报点击、周坐问答“不等于已验证的文件投递产品”（[`261007-input-boundary.md:32-40`](../../_archive/settled_issues/261007-input-boundary.md#L32-L40)）。

严格结论：现阶段不能说它“替代真人助理”；最稳妥的可验证主张是“在本地工作区内，把本人提供的经营材料整理成可核的判断和后续记录”，而“主动获取世界变化、代为推进组织、持续盯到闭环”仍是边界外或未验证。

## 五、证据缺口如何阻断 CEO 说服力

### 1. 第一眼缺少 payoff，而不是缺少更多功能

历史诊断写得很直接：首屏每个动作项都要求用户先付出；桌面是回放，不是供给；schedule 只做自我养护；当时的 naive-CEO 代理读数给出正面反馈，但不能证明能力充分或真实连续经营，缺的是回来的理由（[`261005-open-value-deficit.md:72-84`](../../_archive/settled_issues/261005-open-value-deficit.md#L72-L84)、[`261005-open-value-deficit.md:43-51`](../../_archive/settled_issues/261005-open-value-deficit.md#L43-L51)）。这说明继续堆工具/治理/技能不会自动解决说服问题。管理层需要先看到“它已经替我把一件重要事变清楚/推进了一步/留下可追的账”，再理解背后的机制。

### 2. 演示与真实使用被混在一起

演示研究卡自己提醒：营销话术、董事会汇报、产品演示、实际上手不同；Atlassian +90% 不能作本项目因果收益或验收（[`261005-exec-demo-narratives.md:14-16`](261005-exec-demo-narratives.md#L14-L16)）。因此一个漂亮的真模型走查可以说明“可演示”，不能说明 CEO 会在日常工作里持续使用。当前定位材料也要求真账面是说服力本钱，但没有保留真实管理层受众的行为结果（[`261005-open-value-deficit.md:341-354`](../../_archive/settled_issues/261005-open-value-deficit.md#L341-L354)）。

### 3. 输入本金和价值回收尚未闭环

输入卡的推荐是先在专用试用环境观察 30 天，因为尚无本人输入习惯观察，且少量投递不能证明周坐足够（[`261007-input-boundary.md:18-30`](../../_archive/settled_issues/261007-input-boundary.md#L18-L30)）。它还明确 A 自发投递、B 缺口关闭、C 入口后操作只是辅助读数，写桌面不等于真补数或真拍板，三组读数也不能直接变成价值证明（[`261007-input-boundary.md:59-80`](../../_archive/settled_issues/261007-input-boundary.md#L59-L80)）。也就是说，当前没有证据证明“CEO 会投喂→助手会持续产出→CEO 因此省下判断/跟进负担”的闭环。

## 六、最终判定矩阵

| 主张 | 当前证据 | 判定 | 说明 |
|---|---|---|---|
| 出厂可用的经营分析基座 | 30 题领域批次、Q1/Q3/Q4 等答案与机器预判 | **部分支持** | 事实核验、出处、拒答、动作结构有证据；领域质量和用户“像样”仍需人判 |
| 用户能学进去且指出来源 | README/P2、记忆/技能机制、题面有出处 | **设计承诺，未完成价值验证** | 未见 3 件同类→第 4 件的真实 CEO 纵向证据 |
| 学到的东西可治理 | 房间、curate、draft/stable、日志合同 | **机制支持** | 可治理不等于用户愿意承担治理税，也不等于治理结果正确 |
| 打开就是总助桌面 | 历史桌面视图/播报切片 | **不支持当前完成** | 默认桌面 Step 2 未交付；空白/默认视图受 vendor 限制 |
| 你拍板，它盯到闭环 | 决策卡/行动表/排程设计和局部走查 | **候选成立，价值未验证** | 对话→桌面回流没有独立证据；跨周真实闭环没有证据 |
| 比普通聊天更有价值 | 结构差异与管理题答案 | **未做相对验证** | 缺同题普通聊天基线、结果指标、真人判断 |
| 比真人助理更有价值 | 未见对照 | **不支持** | 外部触达、关系、主动追问和组织推进能力未覆盖 |
| 能打动 CEO/CFO | 演示方法与设计推论 | **未验证** | 只有候选判据，没有真实受众行为/承诺记录 |

## 七、静态阅读的明确边界

本报告的静态复核没有启动服务，没有运行 `pnpm eval` / `pnpm eval:domain` / `pnpm web-expected`，也没有检查当前构建物或浏览器体验；报告中的“通过/缺口”均来自已存文件的原文记录。本轮主会话另外运行了 `pnpm typecheck`、`pnpm test` 与 `pnpm verify`，均通过；这些仓库检查没有验证当前模型行为、提醒投递或 CEO 体验。对当前版本是否真的渲染、真实模型是否遵守、排程是否实际落盘、CEO 是否觉得有用，静态阅读不能推出运行体验。方法学本身要求技术证据、模型行为和真人产品判断分开，且单次演示、绿色命令或关键词都不能替代验收（[`validation-design.md:17-26`](../../methods/validation-design.md#L17-L26)、[`validation-design.md:49-63`](../../methods/validation-design.md#L49-L63)）。

**一句话收口：** 当前系统已经能较有纪律地证明“它可以把用户提供的经营材料变成可核的分析与动作草稿”；它还没有证明“CEO 打开就得到持续有价值的总助工作，并因此愿意回来、投喂真事、让它盯到闭环”。历史关闭兑现了技术切片，尚未兑现这句价值合同。

## 八、本轮主区入口与会话数据路径的静态可行性

**核对范围。** 当前 pin 是 **`dsh-v0.2.0-rc.2`**（[簿记:12](../../../vendor/UPSTREAM.md#L12)）；本节读 README、公开 API contract 与精确源码。未启动服务、跑测试、浏览器或模型；只补研究附录与消费者链接，不改产品或 vendor。静态能力不等于当前接线完成、首帧/重载通过或经营价值成立，本节不作实现决策。

**全局默认入口有公开调用路径。** `main` 为 root-scoped keyed Slot，非 `conversation` key 没有 Session binding；root 有全局 catalog hooks，没有自动绑定的 session/input props（[声明:69-73](../../../vendor/dsh/packages/client/ui-layout/src/client/index.ts#L69-L73)、[Slots:75-107](../../../vendor/dsh/docs/subsystems/slots.md#L75-L107)）。注册后 `layout.selectPanel(id)` 校验 key、取消旧 pending navigation、写 panel store，AppFrame 直接按选中 key 分派；未注册时抛错（[服务:27-41、71-85](../../../vendor/dsh/packages/client/ui-layout/src/client/service.ts#L27-L85)、[分派:39-43](../../../vendor/dsh/packages/client/ui-layout/src/client/AppFrame.tsx#L39-L43)）。当前总助只注册 dashboard、注入回 Conversation 的 onAsk，没有选中 dashboard；layout 初始 null 且重载重置，不提供 panel 偏好恢复（[总助:118-135](../../../packages/dsh-smart-assistant/src/client/index.ts#L118-L135)、[store:78-101](../../../vendor/dsh/packages/client/ui-layout/src/client/stores.ts#L78-L101)、[README:12、32](../../../vendor/dsh/packages/client/ui-layout/README.md#L12-L32)）。这是已有路径，不是默认入口已交付。

**startup preserve 与切回反例分开。** `restoreSelection` 的 saved child、普通会话、blank/default 三路径均传 `'preserve'`；`replaceMain` 仅 `'reveal'` 时 `selectPanel(null)`，README 明确 startup 不改 panel、不取消稍后 navigation（[restore:318-347](../../../vendor/dsh/packages/client/ui-workspace/src/client/navigation.ts#L318-L347)、[replace:375-405](../../../vendor/dsh/packages/client/ui-workspace/src/client/navigation.ts#L375-L405)、[README:72](../../../vendor/dsh/packages/client/ui-workspace/README.md#L72)）。显式 `openSession` 传 reveal；`openWorkspace` 连接完成且未被后续 navigation 取消才 reveal；`clearMain` 无条件切回，用于无 target 的 startSession、归档当前或投影发现当前已归档。选中 key 卸载也回 null（[open/start/archive:200-245](../../../vendor/dsh/packages/client/ui-workspace/src/client/navigation.ts#L200-L245)、[watch:284-305](../../../vendor/dsh/packages/client/ui-workspace/src/client/navigation.ts#L284-L305)、[clear:358-373](../../../vendor/dsh/packages/client/ui-workspace/src/client/navigation.ts#L358-L373)、[store:97-101](../../../vendor/dsh/packages/client/ui-layout/src/client/stores.ts#L97-L101)）。成功 startup 不是必然覆盖注册后选中的障碍；这些其他条件及首帧/重载仍未运行验证。

**无会话创建、持有、提交已有 API，但不负责 GUI selection。** `ctx.sessions.create({ workspaceId?, cwd?, sessionId? }?)` 返回可 retain 的 catalogued SessionId；`retain(target,{source,signal?})`/`using(...)` 持有 Client generation；`binding.session.prompt(content, 'queue'|'steer', signal?, requestId?)` 返回 acceptance。reference 需释放，ready 可结算为 openState error，不拥有 Host Agent、不选择全局 current Session（[ISessions:24-90](../../../vendor/dsh/packages/api/session-controller/src/client/contract/sessions.ts#L24-L90)、[prompt:80-92](../../../vendor/dsh/packages/api/session-controller/src/client/contract/session.ts#L80-L92)、[README:74-76](../../../vendor/dsh/packages/api/session-controller/README.md#L74-L76)）。Root Remote create 另接受 agentPreset；prompt 必填 requestId/sessionId/mode/content，可带 clientTimeZone；Host `@Remote` 明确公开（[请求:284-346](../../../vendor/dsh/packages/api/session-controller/src/types.ts#L284-L346)、[API:create:815-820](../../../vendor/dsh/docs/subsystems/session.md#L815-L820)、[prompt:887-893](../../../vendor/dsh/docs/subsystems/session.md#L887-L893)）。create 不可同时传 workspaceId/cwd，无两项用 defaultCwd，旧 ID 可 adopt/resume但 cwd/preset 须一致；prompt 可恢复普通 cold Session，空内容拒绝、同 requestId 重试幂等、acceptance 只表示入 inbox（[create:100-143](../../../vendor/dsh/packages/api/session-controller/src/commands.ts#L100-L143)、[身份校验:239-275](../../../vendor/dsh/packages/api/session-controller/src/agent.ts#L239-L275)、[prompt:311-376](../../../vendor/dsh/packages/api/session-controller/src/commands.ts#L311-L376)）。

**导航服务存在，但总助当前未 inject。** `uiWorkspace.openSession(target)` 选中/retain mainView 并显示 Conversation，不等 ready；`connectWorkspace(id)` 复用/创建 blank 返回身份，`openWorkspace(id,beforeOpen?)` 还做取消保护的导航，`startSession(id?)` 无显式/当前/最近 Workspace 时清空（[公开合同:28-63](../../../vendor/dsh/packages/client/ui-workspace/src/client/navigation.ts#L28-L63)、[README:72-78](../../../vendor/dsh/packages/client/ui-workspace/README.md#L72-L78)）。总助当前 inject 有 sessions、remote.session、remote.workspaceFiles、remote.agentPresets、layout，没有 uiWorkspace/workspaces；现声明的真实服务可以创建/持有/送输入/选 panel，不能只靠 layout 改 current Session（[inject:43-44](../../../packages/dsh-smart-assistant/src/client/index.ts#L43-L44)、[ILayout:31-36](../../../vendor/dsh/packages/client/ui-layout/src/client/service.ts#L31-L36)）。当前 sessions 镜像只捕获 list，sendPrompt 用传入或最新 Session，无目标就提示返回，不调用 create（[捕获:20-34](../../../packages/dsh-smart-assistant/src/client/desk-io.ts#L20-L34)、[send:223-281](../../../packages/dsh-smart-assistant/src/client/desk-io.ts#L223-L281)）。“公开服务可做”不能写成“当前按钮已做”。

**workspaceFiles 无需打开会话，仍需可解析 Session ID。** 无 `readFile` Remote，公开 UTF-8 `read(sessionId,path,range,signal?)`、字节 `readBytes(sessionId,path,options,signal?)` 及 stat/list/changes；wire 带 Session ID，lookup 取 live header/cold persistence stat，以 `header.cwd ?? sandboxPolicy.workspaceRoot` 定相对根，无 header 则失败，不启动 Agent、不读事件体（[README:28-40](../../../vendor/dsh/packages/api/workspace-files/README.md#L28-L40)、[API:423-471](../../../vendor/dsh/docs/subsystems/workspace.md#L423-L471)、[lookup:202-218](../../../vendor/dsh/packages/api/workspace-files/src/index.ts#L202-L218)）。有已存普通 Session、无打开会话时可读；只有 Workspace/目录而无 Session 时不能直接读，workspace API 只有导航 metadata 操作，可先 create 无消息 Session 再用其 ID；initializeDefault 自身不建 Session（[Workspace README:11、25-34](../../../vendor/dsh/packages/api/workspace-controller/README.md#L11-L34)）。文件 read 可绝对路径/workspace 外 regular file，权限由 composed fs 决定；cwd 不是 file read containment，list/directory watch 才限定 workspace。任意 dataDir/账本路径不保证可读，读取有界且无写操作（[README:12、38-40](../../../vendor/dsh/packages/api/workspace-files/README.md#L12-L40)、[locate/confine:381-430](../../../vendor/dsh/packages/api/workspace-files/src/index.ts#L381-L430)）。

**统一账本有持久承载，业务更新规则仍未决。** dataDir 跨会话存在、配置可覆盖，Host root 来自 config 或 `<dshHome>/assistant`（[home:3、47-48](../../../docs/home.md#L3-L48)、[Host:147-165](../../../packages/dsh-smart-assistant/src/host/index.ts#L147-L165)）；经营 Workspace 文件也是已有载体。当前 desk-refresh 指定 Session workspace 的 `.desk/state.json`；loadDesk 从最近五个 Session 寻一份快照，catalog 空就返回，并非跨 Workspace 合并账本（[技能:7-16](../../../packages/dsh-smart-assistant/presets/assistant/skills/desk-refresh/SKILL.md#L7-L16)、[loadDesk:42-98](../../../packages/dsh-smart-assistant/src/client/desk-io.ts#L42-L98)）。`atomicWriteFile` 的 unique temp + rename 只保证完整文件替换，不提供版本前置条件/锁/合并/多文件事务，也不能证明 desk-refresh 必经它（[实现:20-34](../../../packages/dsh-smart-assistant/src/domain/home/atomic-write.ts#L20-L34)）。多写者、事项去重/错并、权威更新来源、跨会话路由与冲突处理继续由[持续经营回路卡](../../_archive/settled_issues/261008-ceo-operating-loop.md)推敲；不从字段 optional 断言身份不存在、不用 prompt 入队幂等替代事项去重，不把可用载体称为业务合同已实现。
