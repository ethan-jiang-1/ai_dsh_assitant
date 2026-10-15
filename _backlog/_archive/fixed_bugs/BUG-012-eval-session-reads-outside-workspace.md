---
status: 已修
severity: P1
opened: 2026-10-15
---

# BUG-012（已修）：`pnpm eval` 会话能读到隔离工作区之外的真实数据，行为判据被污染

> 严重级别：P1（重要）｜发现：2026-10-15｜状态：**已修（2026-10-15）**——跑器默认每次 run 供给一次性 home（`.tmp/eval/home-*`，凭据 0600 复制），启动 env 钉死 `ASSISTANT_DSH_HOME`；验收 = `breakdown-uses-skill` 在供给 home 上 PASS（101s），会话日志零 `harness-home/assistant` 外部路径读取

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

## 根因

**假设一（已证伪，留档）**：fs/read 工具的读半径缺少收窄配置。查证：`tool-fs` 的 Config 只有读配额
（`readLimit` 等，无半径字段）；沙箱 `SandboxMode`（`read-only | workspace-write | danger-full-access`）
约束**写**路径，读路径按平台设计开放——收窄读半径不是本仓可用的杠杆。

**确认根因（证据 = 跑器源码 + 任务注释 + `ubFDs9` 会话日志）**：eval 跑器的
`harnessHome` 默认落**住满真实数据的 dev home**；`BUG-003` 修复的 `ASSISTANT_SESSION_CWD` 只隔离了
会话 cwd，**assistant 服务的 dataDir 仍指向 `dev/harness-home/assistant`**——真实经营事项、记忆、
交付物全部在模型的可读范围内。「全新 home 上跑」的纪律只活在 first-open-intake 的任务注释和
BUG-001/003 的验收记录里（BUG-003 验收原文："两个独立全新 home 连续两轮 5/5"），跑器自身不供给、
不提醒——`--only` 一跑就静默拿真实数据当评测环境。

## 修复路径（已选）

跑器在每次评测 run 时**默认供给一次性 home**（`.tmp/eval/home-*`，留作 post-mortem 直到 `.tmp`
清扫）：`dev/env/setup.sh` 在该 home 建 profile，凭据存储从 dev home 复制进来（0600，BUG-001 的
教训），模型传输照常解析。显式 `ASSISTANT_DSH_HOME` 保留为既有出口（定向跑某个准备好的 home，
原样使用不供给）。`--list` / `--self-check` 不供给。`eval:domain` 走真人判分、刻意跑真实 home，
不在本卡范围。

## 修复记录（2026-10-15）

`dev/eval/run.mjs`：`provisionRunHome()` 在 main() 供给一次性 home（`--list`/`--self-check`
不受影响）；验收中发现第二处缺口一并堵上——`runPreset` 的启动 env 原先不传
`ASSISTANT_DSH_HOME`，launcher 会静默回落 dev home（日志落在别处 = "no session log"）。现启动
env 钉死 `ASSISTANT_DSH_HOME: harnessHome`，两种模式（供给/显式）都成立。

**验收（`修好定义` 全项）**：`pnpm eval --only breakdown-uses-skill` 自动供给
`.tmp/eval/home-qz5qvq` → **PASS（101s）**，四项判据全过；会话日志
（`usage-report.mjs` 读回）工具调用里 `skill` 按名加载 `management-breakdown` 为真，
`harness-home/assistant` 外部路径读取为**零**；模型调用全部落在自己的一次性 home 内。
对照红：修复前同任务在同 dev home 上 FAIL（`ubFDs9`，读真实账本后 900s 未交答案）——
红→绿闭环成立，且反证此前两次红全是被污染的环境（与 BUG-003 "同签名 ≠ 同根因" 的告诫一致）。

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
