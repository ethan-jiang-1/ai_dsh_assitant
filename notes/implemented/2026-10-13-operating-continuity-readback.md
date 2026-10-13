# 经营事项首回合接续包：权威读回与来源

日期：2026-10-13 · 状态：**implemented**（对应 [经营事项连续性问题卡](../../_backlog/issues/261012-operating-continuity-value.md)；2026-10-13 用户点名授权并已完成首个只读切片；不含提醒或持久 schema 扩张）

## 当前决定

`assistantOperatingLedger.readMatterSnapshot(matterId)` 从一次重载后的 ledger 状态返回事项及仅属于它的操作历史，按提交时间和 operation id 稳定排序。`assistant_operating read matter_id` 基于该快照返回完整当前事项字段（summary、responsible、status、revision、承诺/预测/核对/完成时间及预测来源）、初始委托来源、材料来源、完整提案变更与状态/解决回执关联、操作类型/回执/outcome/source；工具文本 render 同样保留 quote、event id 与完整 outcome，避免模型只读文本时丢失定位和结果。无匹配事项继续 fail loud；缺少委托记录时不伪造 `entrust`；缺少独立决定理由时不从材料推断。

处理会话的 `processingContextMessage` 要求首回应先成功读回精确绑定事项 id；失败要明说无法核实，不得写入或假装完整。成功后按六类主动交接目的与委托、进展、已定决定及依据、四种时间、未知/待裁决、下一步；未知与建议分开。预测不改变承诺，待确认提案不是已定决定，随后等待本人具体指令并遵守既有权限三分。

持久账本 schema、writer、业务权限、入口和桌面布局均未改变。未显式记录的决定理由仍不可恢复，读回必须如实表达缺失。首个技术切片不证明 Agent 每次都遵从该提示，也不证明自然事项中有净价值；这些属于不同证据层。

## 验收记录

代码回归按真 host ledger、adapter 和 client seed 三个公开接口验证。新增断言先红：事项字段断言缺 `summary`/`responsible`；client seed 的首回合约束断言缺交接措辞；Host 快照断言因 `readMatterSnapshot` 不存在而红。随后实现至绿。

已运行且通过：
- `pnpm --filter dsh-smart-assistant exec vitest run tests/host/operating-ledger.spec.ts tests/agent/tool-operating.spec.ts tests/client/client-desk-process.spec.ts`：3 files，64 tests。
- `pnpm --filter dsh-smart-assistant exec vitest run tests/agent/tool-operating.spec.ts tests/client/client-desk-process.spec.ts`：2 files，47 tests。
- `pnpm build`：Client classic bundle 构建成功，最终在 typecheck 后重建。
- `pnpm test:composition`：6 tests，最终构建物通过。
- `pnpm test`：62 files，580 tests。
- `pnpm typecheck`：成功。
- `pnpm verify`：41 checks passed。

全量 `pnpm eval` 执行为 7/8 可执行任务通过、1 个 web-only 任务未评估，命令因 `first-open-intake` 失败而退出 1（未加载 `first-conversation` 且答案未命中判据）。`continuity-from-home`、`desk-single-matter`、`desk-followup-readback` 均通过，但这些任务依赖共享 dev home，不构成隔离事项的首回合接续验收；在最终 presenter 改动后单独重跑 `pnpm eval --only desk-single-matter` 也通过（1/1）。现有 eval 没有专门独立 fixture 的首回合接续任务。渲染输出保留 quote/source/event id/change/完整 outcome，schema 能由真 preset composition 装载。静态与现有行为证据不替代真实浏览器话术层级、目标角色体验或自然业务价值判断。

## 输掉的方案

- 把 `MatterRecord.summary` 当完整现场包：它是可覆盖的一段摘要，不保留初始委托/全部材料/操作来源，丢失不可见。
- 让 Client seed 多写字段或通过提示词复述种子完成接续：投影当前没有完整历史；会把不权威的提示变成事实，还绕开 `read` 与最新 revision。
- 只扩工具文字而不返回 ledger 字段：模型仍无法读取持久账本未暴露的原话、提案变更和值得回查的 operation 来源。
- 同片改 ledger schema 写决定理由或为错挂材料增加撤销：扩大写入语义、持久格式与恢复承诺，超出首回合只读交接且无授权。
