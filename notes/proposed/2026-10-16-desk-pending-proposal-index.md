# desk 摘要带 pending 提案索引：让"一次 desk 读"能列出简报该列的行

日期：2026-10-16 · 状态：**proposed**（2026-10-16 本人在对话里拍板走方案 A；实施授权已获点名——逐项状态见「验收」节）

## 问题（可观察行为）

**外部结果三要素：** 触发＝本人让助手建每日简报（或任何"按点读一遍桌上经营事项"的常态汇报）；本人得到＝**一份简报里能看到"有事在等你拍板"**，而不是只看到进度顺带漏掉唯一需要自己决定的东西；完成条件＝`assistant_operating action=desk` 的摘要带出每件事的 pending 提案（谁、什么变更、改到几号、何时提的），简报能用**一次 desk 读**列全它清单上的行，且措辞不把未生效的提案说成既成事实。

**为什么现在有这张卡**：2026-10-16 新建的晨报 web 回归资产（`dev/probes/web/desk-daily-brief-live.mjs`）第一次真跑就咬出这个缺口——技能清单要求"等你确认的提案（逐条给默认动作）"，但那次 desk 读的载荷（实测 951 字）只有事项与未归属片段，`p-1`/`pending`/`proposal` 全无；真模型于是没列它，同时**正确**列出了投影真有的「逾期无新进展」与「待认领片段」——不是模型偷懒，是**摘要没给**。

**这不是"少一行"**，两条合同事实说明它是决策面：

- `docs/operating.md` §权限三分：模型推断的重大变化**不直接生效**，只走提案——pending 提案是账本里**唯一必须本人拍板**的东西；
- 同文件 §返回契约：绑定会话在绑定后为该事项创建的任一 pending 提案**阻止返回**——一件可能**卡在等人确认**的事，简报若从不提它，本人永远不知道有事在等自己。

## 方案

`assistant_operating action=desk` 的**每条事项**带 pending 提案索引（index + detail 分工不变：索引在此，`read <matter_id>` 仍给完整提案、来源与历史）。

形态（实测后的定稿——`deskItem` 拿的是**账本记录** `MatterRecord`，其 `proposal.change` 带着目标时间，所以索引**能给**"改到几号"；投影 `ProjectionProposal` 只带 `kind`，那是另一条路，见「输掉的方案」）：

```
- [active] 合同 XR-09 尾款收回 (m-1, revision 3; promised 2026-10-20, …)
  ⏳ pending (NOT in effect — the principal has not confirmed): p-1 reschedule → promised_deadline 2026-10-24, proposed 2026-10-12
```

- **结构化面**：`DeskItem` 增 `pending_proposals: [{ id, kind, proposed_at, change? }]`（`change` 只带该 kind 真有的目标字段，沿用工具既有的 snake_case：`promised_deadline` / `next_checkpoint`）；无 pending 时**省略**该字段（与既有可选字段同一写法）。
- **文本面**：渲染层为每条 pending 提案出一行，**行内必须自带"尚未生效/待你确认"的标注**（措辞是本次改动唯一的新风险面：模型可能把提案当既成事实）。
- 同 diff：工具描述里 `- desk: …` 那一行点名"含每件事的 pending 提案"· `docs/operating.md` 的 `desk` 行 · 生成物 `pnpm gen-catalog`。

**不动的**：账本本身、权限三分、`read` 的载荷与合同、桌面投影（UI 那份）、`confirm`/`reject` 的语义。

## 输掉的方案

- **B：改技能清单措辞，删掉"等你确认的提案"这一行**。省事，但它删的是这个功能的核心决策面：pending 提案是唯一需要本人拍板的东西，而且会**阻塞事项返回**——简报不提它，等于让卡住的事静默留在桌上。**若将来真要走 B**，触发条件是"本人明确表示简报只做进度播报、提案走桌面看"。
- **A′：只给计数（`1 pending proposal (p-1)`），详情全靠模型自己 `read` 每件事**。摘要最省，但"逐条给默认动作"要多 N 次读，且模型漏读就是漏报——**日报的价值是一次廉价扫描**，而技能原本的设计就是"一次读全量"。留作摘要体积真成问题时的收缩方向。
- **扩投影 `ProjectionProposal` 带 `change`，让 UI 那份投影也带上**：动的是给 Web 客户端的只读投影（契约面更大），而 UI 并不需要这个值。本次改 `deskItem` 所在的账本记录层即可，投影不动。
- **让 `read` 承担全部（desk 不索引，模型逐件读）**：把"覆盖率"交给模型的自觉，等于把简报的完整性押在 N 次调用上——回归资产里也没法钉"该读的读了"。

## 验收

行为分类（[validation-design](../methods/validation-design.md)）：**deterministic（工具输出契约）+ 模型行为（简报内容）**。不建新 eval 任务——复用既有晨报资产。

| 检查 | 通过形态 | 会失败的行为 |
|---|---|---|
| 工具输出（deterministic） | `pnpm test:agent` 绿：`tests/agent/tool-operating.spec.ts` 新增断言钉住 `pending_proposals` 的字段与"仅 pending、无则省略"；`pnpm test:composition` 绿（注册期 schema 校验） | 把已拒绝/已确认的提案也塞进索引；无 pending 时吐空数组；`change` 字段名与工具既有 snake_case 不一致 |
| 措辞不得说成既成事实（deterministic） | spec 钉渲染行内**含显式未生效标注**（"NOT in effect" / 中文等价），且该行不出现"已改期""已确认"这类完成态说法 | 渲染成"promised 2026-10-24"却不标 pending → 模型会把提案当生效期限 |
| 真模型简报（模型行为） | `node dev/probes/web/desk-daily-brief-live.mjs` 真跑 `passed: true`，**相位 2 的提案判据已加回**（简报必须带出 `p-1` 或它改到的日期） | 摘要带上了而简报仍不提 → 是模型/技能的问题，不再是源缺口；此时本卡退回并另立技能面切片 |
| 发布面 | `pnpm release-smoke` PASS（工具描述与输出契约都在发布物里）· `pnpm gen-catalog` 后 freshness 门绿 | 描述改了没重生成 → freshness 门红 |

**排除：** 不改账本/权限模型/`read` 载荷/桌面投影；不动 `vendor/`；不新增工具动词；不改晨报技能的清单（它的要求本来就是对的）。

## 推进

- 提交①：本卡 + `_backlog/issues/` 无需新卡（切片台账住本卡，收口记录写在「验收」表的状态列）。
- 提交②：`schema.ts` + `deskItem` + 渲染 + 工具描述 + `docs/operating.md` + spec 断言 + gen-catalog。
- 提交③：探针相位 2 判据加回 + 真跑 `passed: true`；`pnpm release-smoke`。
- 收口：晨报卡（[`2026-10-10-desk-daily-brief.md`](2026-10-10-desk-daily-brief.md)）的「源缺口，开放项」转已交付并指向本卡；本卡按 notes 生命周期在实施后改写为已交付事实（`implemented`）。
