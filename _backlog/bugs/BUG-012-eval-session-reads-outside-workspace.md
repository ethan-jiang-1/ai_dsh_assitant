---
status: 排查中
severity: P1
opened: 2026-10-15
---

# BUG-012（排查中）：`pnpm eval` 会话能读到隔离工作区之外的真实数据，行为判据被污染

> 严重级别：P1（重要）｜发现：2026-10-15｜状态：排查中

## 症状

`pnpm eval --only breakdown-uses-skill`（2026-10-15，run `ubFDs9`）的会话日志显示，模型在评测
turn 内读到了**评测隔离工作区（`.tmp/eval/workspace-*`）之外**的数据：

- dev home 的真实经营账本事项（合同 NB-02 第二期款 m-1、九月银行对账单 m-2、十月供应商对账 m-3）；
- `harness-home/assistant/deliverables/*` 的真实交付物与一条 parked 研究线索
  （`20260925-20-revenue-bookings-collected-yoy-vs-9bq3`）。

模型自己的 reasoning 原文（会话日志 `assistant/message` 的 reasoning 块，seq 57/77/99）：
"The read tool CAN read outside the workspace — I successfully read the company motion ledger"、
"the working folder has many deliverables (harness-home/assistant/deliverables/*)"。

后果：任务判据（最终答案的四层结构正则）被"模型花整轮探索真实数据"取代，900s 超时未交答案。
技能按名加载判据本身通过（`tool/call name=skill, arguments={"name": "management-breakdown"}`）。

## 为什么是缺陷

评测的隔离假设是"会话只看得到一次性 workspace"（`dev/eval/run.mjs` 头注与
[`dev/eval/tasks.mjs`](../../dev/eval/tasks.mjs) 各任务的一次性 home 设计）。读半径覆盖 dev home
意味着：①判据采样到被污染的行为；②评测期间模型可能把真实 home 数据写进答案（隐私面）。
这与 `scope-honesty` 任务要守的方向（会话只看得到自己的 working folder）同类，但发生在
**评测装置自身**。

## 根因（假设）

`dev-task` profile 的 fs/read 工具读半径未随 eval 的 workspace 收窄：bash 被沙箱挡下
（reasoning 里有 "bash unavailable (sandbox escalation denied)"），但 read/glob 类工具可越过
workspace 根读到 dev home。未验证的是：读半径由哪个配置拥有（vendor fs 工具的 workspace
policy vs eval 启动参数缺一个收窄开关）。

## 证据

- 会话：`dev/harness-home/sessions/--Users-bowhead-ai_dsh_assitant-.tmp-eval-workspace-ubFDs9--/`
  （读法＝`dev/reports/usage-report.mjs` 的 `sessionLogs`/`readEvents`）。
- 同日两次运行对照：第一次（`Vd5GOQ`）0 个 delivery 事件、模型 0 step（瞬态传输悬挂，与本缺陷
  无关）；第二次（`ubFDs9`）技能加载判据过、答案判据败于上述探索行为。
- 重构无关性：`git diff c5b8391..HEAD` 对 `presets/`、`cordis.patch.yml`、`soul.ts` 零变更，
  agent 面只有导入搬移与注释——模型可见输入与重构前逐字节一致。

## 修好定义

eval 会话在一次性 workspace 下运行时，fs/read 类工具读不到 workspace 之外的 dev home 路径；
重跑 `breakdown-uses-skill` 的会话日志中不再出现 `harness-home/assistant/...` 等外部路径的读取，
且任务判据只对 workspace 内行为采样。
