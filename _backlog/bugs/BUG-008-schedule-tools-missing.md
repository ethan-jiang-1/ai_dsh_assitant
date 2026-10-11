---
status: 活跃
severity: P1
opened: 2026-10-11
---

# BUG-008：计划任务四工具间歇性不在会话工具表里——晨报/周坐的「排程」那一步没有工具可调

> 严重级别：P1（重要）｜发现：2026-10-11｜状态：活跃

## 症状

`pnpm eval -- --only desk-daily-brief`（「以后每天早上八点半，把桌上经营事项的简报发给我」）稳定红：
`tool "schedule_create" was never called`。会话日志显示模型**装载了** `desk-daily-brief`（有时还装
`morning-brief`）、**读了**账本（`assistant_operating action=desk`），然后开始翻环境找调度器
（`bash "env | grep -i sched…"`、`ls -a .desk`、`glob .desk/*`），最后把这条诉求**存进记忆**当收场——
排程从未建立。手上三处指令都要求它调用 `schedule_create`：家手册（`They are scheduled` 节）、
`desk-daily-brief` 技能（"Three halves, all mandatory: one standing schedule"）、`morning-brief` 技能。

2026-10-10 的记录是 **PASS**（162s 真实回合，`schedule_create` 真建每日排程）——见
[晨报提案卡](../../notes/proposed/2026-10-10-desk-daily-brief.md) 状态行。

## 根因（假设）

**引导顺序竞态：这四个工具时有时无。** 判定面是会话日志的 `request/header.tools`（模型真正看到的工具表）：

- 干净 home（2026-10-11）`desk-daily-brief` 会话：`assistant_operating`/`skill`/`bash` 在，`schedule_create`
  **不在**（`request/header` 里搜不到）。
- dev home 的历史 preset=assistant 会话里它**忽有忽无**：10-03（8 个会话）全 False；10-04 02:31 True；
  10-04 04:20–04:45（10 个会话）全 False；10-04 10:25 True；10-11 全 False。

机制线索：`@deepseek-ai/dsh-schedule` 只给 **root agents** 挂 `schedule_create/list/update/delete`
（vendor `packages/schedule/schedule/src/index.ts:170` 的 `ctx.agents.roots()`），而
[我们自己的 bundle patch](../../packages/dsh-smart-assistant/cordis.patch.yml) 第 86–90 行照抄
`schedule-bundle` 的两行把它挂进来。若该行的 apply 晚于会话 agent 的工具快照，四个工具就整批缺席
（不是工具被拒、不是审批被挡：失败会话里**零 approval 事件**）。

## 复现

```sh
# 干净 home（隔离；先 prepare+setup）
H=$PWD/.tmp/eval-clean-home
ASSISTANT_DSH_HOME=$H bash dev/env/prepare.sh && ASSISTANT_DSH_HOME=$H bash dev/env/setup.sh
ASSISTANT_DSH_HOME=$H DEEPSEEK_API_KEY=<key> pnpm eval -- --only desk-daily-brief   # 稳定 FAIL
# 判定面：该 home 最新会话日志里 request/header.tools 是否含 schedule_create
```

反证已排除：把家手册回退到 HEAD 版本（v14）在同一干净 home 复跑，**同样 FAIL**（2/2）——不是本仓
2026-10-11 手册改写引入的；dev home 上连续失败还叠加了记忆污染（前一轮 eval 把任务提示词写成了
「用户原话」的偏好记录），但干净 home 上依然红。

## 修复关联

组合面（非本轮的客户端/手册切片）：候选方向一是改挂 `schedule-bundle`（`OPTIONAL_BUNDLES`）而不是
照抄两行，二是让该行的 apply 早于 agent/roster 创建，三是查 vendor 侧 `ctx.agents.roots()` 的注册时机
是否要求宿主在会话建立前就绪。**判据**：`desk-daily-brief` 任务在干净 home 上连续两轮 PASS，且
`request/header.tools` 里稳定含 `schedule_create`——间歇性本身就是要修的对象，不能靠重试掩盖。
修完把本卡 `git mv` 进 [`../_archive/fixed_bugs/`](../_archive/fixed_bugs/README.md)。
