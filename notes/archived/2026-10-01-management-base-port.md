# 管理岗基座搬运：销售与财务两件方法论技能入 preset

日期：2026-10-01 · 状态：**implemented**（切片一 2026-10-01：market-sizing / project-economics；切片二 2026-10-04：finance-compliance + 种子二页；切片三 2026-10-04：种子三页；**切片四 2026-10-04：decision-routing 技能**——甄别施工图全部消化，剩余候选全部触发型见 §六）
已归档：2026-10-08（决定已经在合同或代码里；下次改决定不用打开本篇。冻结，不再跟踪。）

来源卡：[真用第一](../rejected/2026-10-01-real-use-first.md) 第 3 条（基座搬运，agent 并行自主做）。
既有形状：[专家部署组合件 v0](2026-09-25-expert-pack-v0.md) 的两件 SOP 技能与 `seeds/management` 知识种子包。

## 一、搬了什么

兄弟仓 `ai_dsh_company` 的 company-pack 有 5 角色 11 件技能（CEO 2、VP-Sales 3、
CFO 3、COO 3、VP-Eng 2）。本切片搬 **2 件**进 `packages/dsh-smart-assistant/presets/assistant/skills/`，
英文重写、适配本仓语境（非逐字翻译）：

1. **`market-sizing`**（← `vp-sales/skills/market-sizing`）：假设先行（事实/假设逐项标注）→
   自底向上＋自顶向下双向估算（两遍差 3 倍以上回修假设，禁止取中位数糊弄）→ MEDDIC 六问单单资格
   （答不上来不进 pipeline 分子）→ 双假设 ±50% 敏感度 → 结论先行（投 / 不投 / 有条件投）。
2. **`project-economics`**（← `cfo/skills/project-economics`）：收款曲线跟交付走、维护费单列 →
   人力按人·周、未核实单价只给档位与上界不编币值 → **毛利底线是本人的数字**（没问过就先问）→
   垫资月数与收款滑档压力测试 → 算式逐项可重放（门槛式算式代回边界值验方向）。

选型依据：[README 方向判据](../../README.md) P1（管理 / 销售 / 财务都有一点）——管理面已有 `management-breakdown` /
`action-plan`，这两件补齐销售与财务两个视角，且是那仓方法论密度最高的两件；与本仓既有两件正交，
串成一条链（拆解 → 资格 / 测算 → 行动计划），同题材不重复。

## 二、适配（约束 → 改写）

| 兄弟仓的绑定 | 本仓的对应物 |
|---|---|
| `templates/decision-memo.md` ＋ `deliverables/<slug>/drafts/<角色>.md` 交付路径 | 一页纸直接回复；要留痕走 `assistant_reflect save_page`（`type: decision-memo`、`sources` 必填、落 draft 人审——治理写入路径，同 `action-plan` 的落地段） |
| CFO 的 veto / `request_signoff` 审批工具 | 本助手不签字：改写为「建议提价 / 缩范围 / 不做」与「触线＝本人的决定，不是算术」 |
| `kb/<角色>/CHARTER.md`、`kb/org.md` 事实源 | 本人或知识房间（finance / sales lens 页）；缺事实直说并指出从哪来 |
| 公司口径数字（毛利底线 30%、3-4-3 收款惯例、维护年费 15–20%） | **不搬**——沿用 `seeds/management` 既有内容边界（其 README「内容边界」节：方法论可搬、公司具体事实必来自本人，搬来即用别人的事实回答本人的问题）；底线改写为 principal-supplied，收款形状指向 finance lens 页 |
| journal 硬闸门 / 任务板 / one-shot worker / `present` 定稿 | 删除（本仓是单助手形态，无对应机制） |
| 中文正文 | 英文重写（语言分工；`verify` 的 language guard 守） |

技能名保留原名（`market-sizing` / `project-economics`）：出处可追溯，改名无收益。

## 三、输掉的方案

- **搬 CEO 两件（assembling-the-team / chairing-staff-meeting）**：正文一半是那边的多 agent 机制
  （spawn_teammate 通道选择、任务板、journal 硬闸门、deliverables 三态）——本仓单助手形态下是死文字。
  它们承载的组队判断（要不要叫人 / 叫谁 / 不叫谁）等本仓出现多 agent 协作面再重新推敲。
- **搬 5 件工作流技能（sales- / cfo- / ops- / eng-workflow）**：同上——工作流正文绑定任务板领活与
  journal 回执；真正的打法都在各自的方法论技能里（已分别吸收或列为候选），工作流本身无增量。
- **customer-voice（下一切片候选）**：方法论好（只认行为不认表态、拒绝理由逐字归类、引用带出处），
  但依赖「已有客户访谈记录」的数据面——本仓知识房间还没有这类事实，搬来即无米之炊。
- **finance-compliance（下一切片候选）**：SoD / 留痕 / 四流一致 / AI 产出红线有价值，但偏账务现场，
  P1「出厂可用」的优先级低于测算方法论。
- **budget-check / ops-feasibility（下一切片候选）**：可搬，但人·周成本 / 最坏档压力测试主题与
  `project-economics` 重合（成本侧已吸收），管理面已有 `management-breakdown`；边际收益最低。
- **tech-feasibility-review（暂缓）**：工程视角，P1（管理 / 销售 / 财务）未列。
- **知识素材本切片就搬**：那边 `company-workspace/kb/` 596K，主体是演练 journal 残渣与场景事实
  （CHARTER 的费率 / 编制 / 预算硬顶）——知识种子若搬须逐页甄别「方法论 vs 别人的公司事实」，
  且按来源卡约定走治理写入路径落 draft 人审；量大不硬凑，记为下一切片。
- **逐字翻译**：正文本仓语境重写（任务语言分工明文要求）。

## 四、验证（真跑过的命令）

1. `pnpm gen-catalog`——策展技能清单 9→11（`docs/package-catalog.md` 同 diff 更新，freshness 由 verify 守）。
2. `pnpm build` ＋ `pnpm typecheck`——绿（本切片无 src 改动，floor）。
3. `pnpm test`——39 个测试文件 301 个测试全绿（含真组合装载 `preset-composition.spec.ts`）。
4. **live probe**（model-visible 面的证据）：`pnpm dsh --profile dev-task --patch dev/probes/session/preset-runner.patch.yml`
   真跑一个 preset 会话，按名加载两件技能——均加载成功，模型逐字复述正文首句
   （`An estimate is an argument with numbers.` / `A price is a promise about cost.`）。
5. `pnpm release-smoke`——绿（发布物内容变化：147 files 打包含新技能目录，干净 home 装载＋组合断言过）。
6. `pnpm verify`——提交前最终门禁（绿；读数见提交时的门禁输出）。

## 五、下一切片（2026-10-04 更新：切片二已落地 + 甄别施工图并入）

切片二（2026-10-04 落地）：**finance-compliance** 技能入 preset（b2332d5，验证六步同切片一）；
**decision-memo / ops-review-note** 两页知识种子入 seeds/management（ee92cb8，零剥离纯方法论）。
甄别结论（subagent 全页覆盖）：kb/ 实为 8 文件 ≈75KB（非 596K——旧估把 deliverables-archive 误入）；
journal/ 五目录已收敛为空；**方法论真矿在 templates/ 六份骨架与五份 CHARTER 头部 10–20 行**
（成体系的角色治理骨架：一页纸/分歧保留/SoD/三格核查/自建三问/量不换价）。剩余搬运候选
（优先级序）：kb/cfo 头部（财务闸门，须剥离数字段+历史纪要）→ kb/vp-sales 头部（定价纪律，
整段剥离客户/竞品事实）→ kb/coo 头部（交付承接）→ vp-eng 自建三问（强候补）→ 公司手册
AGENTS.md（决策路由+审批纪律，第一候选但须剔 DSH 机制细节）；剥离动作集中在「删历史纪要段
+抠数字换占位」两类机械操作。不搬：org.md（100% 公司事实）、owners.md、motion-ledger 残渣。

## 五、下一步

- **下一切片候选**（按价值序）：customer-voice → finance-compliance → ops-feasibility / budget-check；
  触发条件：P1 真用（G2 评测 / 真人会话）暴露对应视角缺口，或知识房间出现对应事实数据——
  不为搬而搬。
- **知识种子甄别**（若做）：逐页过「方法论 vs 场景事实」关，按治理写入路径落 draft 人审。
- 原地吸收已完成的两条：MEDDIC 资格进 `market-sizing`；人·周 / 最坏档进 `project-economics` 成本侧。

## 六、切片四（2026-10-04 落地）：decision-routing 技能——甄别施工图收官

**源材料**：那仓公司手册 AGENTS.md（company-workspace，195 行）——甄别施工图点名的最后一个
触发已到候选。**甄别**：可搬骨架 = 四块思想（决策按类型路由 / 审批边界 / 升级带证据 /
成品与草稿态）；剔除 = 公司事实（毛利 30%、9 折、$500 门槛、50 人编制、并行 8 项目——数字
全剥离，先例同切片三）、多分身机制细节（组合继承 / 写盘守卫 / 派活行 / 日期通道 / 多人模式 /
journal 收敛——全是那仓实现机制）、本仓已有机制（待办面板 / 提案收件箱 / present——不重述）。

**关键适配（约束 → 改写）**：那仓是**五分身公司**（路由表找谁签字），本仓是**一个分身辅助
本人**——路由表变形为「决策类型 → 方法论尺子」（要不要做 → management-breakdown/action-plan；
赚不赚钱 → project-economics/finance-compliance + 现金纪律；有没有人买 → market-sizing +
定价纪律；做不做得出 → 自建三问；交付承接 → 本仓无专尺，明示 provisional——O3 诚实原则）；
「谁能对外」变形为成品/草稿态 + 本人的数字不编造（没问过就先问）；分歧保留原样收编。
6 件现存技能逐一查重：无职能重叠（routing 是横切件，各 lens 技能是纵切件）。

**验证六步（真跑过的命令）**：① gen-catalog（技能 12→13，catalog 同 diff）② build+typecheck 绿
③ test 352 绿 ④ **live probe 两层**：禁工具 probe → 模型从技能目录正确指认 decision-routing 且
诚实拒绝编造正文（O3 正例）；放行 skill 工具 probe → 逐字复述正文首句
（"A wrong answer is recoverable; an answer from the wrong lens is not even wrong — it is noise."）
⑤ release-smoke 绿 ⑥ verify 34 绿。

## 当前判读补充（2026-10-05 原型转向）

旧真用主轴已退役，以下“关键路径等本人”仅是10-04快照，不是当前条件。基座搬运已收官，方法论缺口可由agent可核的公开案例与 [访谈框架](../../_backlog/reference/positioning/261005-interview-learning-framework.md) 检查；不因暂时无访谈记录就禁止设计框架，也不为搬而搬。运行时接入按当前有界切片推敲，不要求本人先开始真用。

## 七、下一步（切片四后历史记录）

- **搬运面收官**：甄别施工图点名的候选全部消化（coo 头部切片三裁决不搬——与 ops-review-note
  种子同源重叠；org.md / owners.md / journal 残渣维持不搬）。剩余候选全部**触发型**：
  customer-voice / ops-feasibility / budget-check——触发条件 = P1 真用暴露对应视角缺口，
  不为搬而搬。
- **关键路径唯一等本人的事 = 开始真用**（主轴卡状态行 2026-10-04 快照）。
