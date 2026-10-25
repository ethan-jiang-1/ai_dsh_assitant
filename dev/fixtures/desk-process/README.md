# 处理流夹具（种子账本 + 回放语料）

本目录资产只服务真实运行（探针 / 评测驱动），不被 vitest spec import——spec 侧共享夹具的家是
[`packages/dsh-smart-assistant/tests/support/`](../../../packages/dsh-smart-assistant/tests/support/)。
预期集合独立陈述，不按页面输出反推；各资产的能证 / 不能证见下。

## 资产

- [`seed-ledger.json`](seed-ledger.json) —— post-entrust 账本快照：`m-1`「合同 NB-02 二期款到账核对」
  active（promised 2026-10-13）、`m-2`「九月银行对账单核对」completed、`u-1` 未认领片段；
  report / propose 的 `operation_id` 在快照里**尚不存在**——本轮回放可以真提交。消费方：
  [desk-process-e2e](../../probes/web/desk-process-e2e.mjs)（每次运行先恢复它，重跑安全、同一起点）、
  [desk-capture-live](../../probes/web/desk-capture-live.mjs)、
  [proactive-shots](../../probes/web/proactive-shots.mjs)（含空账本变体）、
  [proactive-unattended-live](../../probes/web/proactive-unattended-live.mjs)、
  [proactive-watch-live](../../probes/web/proactive-watch-live.mjs)（复制为 `ledger.json`）。
- [`followup/session.v4.jsonl`](followup/session.v4.jsonl) —— flow 场景的回放语料：录制的四个模型调用
  与首轮答复（`deriveReplayScript` 派生回放脚本）；「明确拒绝 p-1」续段是为确定性验收手写的，不是录制。
  对齐契约（BUG-009）：脚本第一格必须服务注入的「正在处理事项…」回合，否则逐轮错位一格。
- [`single-matter/session.v4.jsonl`](single-matter/session.v4.jsonl) —— 单会话录制语料；它的消费方
  （`desk-single-matter` 评测任务）已随 room-data copy 退役（A1b）退役，当前无活跃消费方，保留为语料。

**语料是录制原样，不改字节**：两份 `session.v4.jsonl` 的 `tool/result` 里带着录制机上的技能基目录
绝对路径（录制者主目录下的 `presets/assistant/skills/<name>`）。它不参与任何判定——回放只
`deriveReplayScript` 取 `assistant/message` 与 `compaction/summary`，工具结果由真工具现场重出；
所以消费方**derive 脚本、不比对请求/工具文本**。将来若要整段重放会话（而不是 derive），在消费侧
归一化宿主路径，别改语料——改了就不再是"录一次"的证据。

## 能证 / 不能证

- e2e 探针（回放，模型输出固定）：处理 / 认领 / 唤醒三臂的**接线与账本契约**——建会话、绑定路径、
  真工具写回执、投影读回、返回分发；不证明模型行为与话术（那是
  [desk-continuity-live](../../probes/web/desk-continuity-live.mjs) 与 `pnpm eval:continuity` 的事）、
  不证明真实业务价值。
- proactive 系探针：主动行三行（逾期无结果 / 在等你 / 下次替你看）的真机读数与零成本见证；
  不证明 UI 交互态与渲染质量（web-face 场景与 shots 的事）。

## 复跑

```sh
pnpm build
node dev/probes/web/desk-process-e2e.mjs [--scenario flow|claim|wake] [--home <隔离home>]
node dev/probes/web/proactive-watch-live.mjs   # capture / shots / unattended 同形
```

前置：隔离 home 已按 [开发手册](../../../docs/dev.md) 跑过 prepare / setup；服务的起拆由探针自管，
验证结束进程退出。缺凭据 / 缺夹具按探针自己的 BLOCKED 语义报告，不折进绿。
