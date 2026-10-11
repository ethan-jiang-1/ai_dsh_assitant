---
status: 已修
severity: P1
opened: 2026-10-11
---

# BUG-008：评测断言了一个它自己托管不了的能力——`desk-daily-brief` 从出生就不可能 PASS，而 note 记了不可复现的 PASS

> 严重级别：P1（重要）｜发现：2026-10-11｜状态：已修（2026-10-11）

## 症状

`pnpm eval -- --only desk-daily-brief` 稳定红：`tool "schedule_create" was never called`。会话日志显示模型**装载了**
`desk-daily-brief` 技能、**读了**账本（`assistant_operating action=desk`），然后开始翻环境找调度器
（`bash "env | grep -i sched…"`、`ls -a .desk`、`glob .desk/*`），最后把这条诉求存进记忆当收场。而
[晨报提案卡](../../../notes/proposed/2026-10-10-desk-daily-brief.md) 的状态行当时写着「实现与 eval 已落：**PASS** 162s 真实回合」。

## 根因（已查实，原假设被推翻）

**不是产品缺陷，也不是引导顺序竞态**（本卡初版按「`agent/created` 只挂一次、没有补挂」猜的竞态是错的）。两件事分开：

1. **产品（web 组合）没问题**：走查 home（真实 web 会话，preset=assistant）的会话日志里，`request/header.tools` 有 **39** 个工具，
   含 `schedule_create/list/update/delete`；而且真模型回合**真的调用过** `schedule_create`（含 `schedule_list`）——取证面 = 会话日志的 `tool/call` 事件，
   三个会话可点名复算：`session-9ccdeb3e`（5 次）、`session-67cc60e0`（3 次）、`session-efe406a8`（1 次），工具表均 39。
   dev home 历史里那批时有时无的记录，True 的就是 web 会话，False 的是 headless 会话，与时间无关、与 profile 有关。
2. **评测托管不了这个能力**：`@deepseek-ai/dsh-schedule` 是 **web 绑定**的——它 `static inject` 里有 `sessionController`；
   `sessionController`（`@deepseek-ai/dsh-api-session-controller`）又要 `fileUploads` 与 `workspaceRegistry`；而 `fileUploads`
   的 provider（`@deepseek-ai/dsh-client-file-upload`）等浏览器的 `connection` 服务。eval runner 驱动的是 headless one-shot
   （`dev/eval/run.mjs` 固定 `--profile dev-task`），那套组合里这条链永远不成立（实测：`--dump-config` 显示 headless 的
   `schedule` 行 `disabled: true`，原因写在 [`dev/profiles/profile-patch-headless.yml`](../../../dev/profiles/profile-patch-headless.yml)；
   临时放开后依次报 `pending (waiting for service: sessionController)` → `fileUploads` → `connection`）。headless 会话 36 个工具，不含任何 `schedule_*`。
   ⇒ 该任务的判据在 runner 里**永不可满足**；10-10 记下的 PASS 不可能出自 `pnpm eval`（162s 那次是 web 会话里的观察）。

## 复现

```sh
# headless（runner 的环境）：工具表里没有 schedule_*
H=$PWD/.tmp/bug008-repro
ASSISTANT_DSH_HOME=$H bash dev/env/prepare.sh && ASSISTANT_DSH_HOME=$H bash dev/env/setup.sh
ASSISTANT_DSH_HOME=$H pnpm dsh --profile dev-task --patch dev/probes/session/preset-runner-replay.patch.yml "probe"
# → 该 home 最新会话日志 request/header.tools：36 个，无 schedule_*（keyless，无模型调用）

# web（产品）：39 个，含四个 schedule_*
# → 看走查 home 的 web 会话日志：/tmp/k4-agent-walkthrough-manual-629f088/sessions/*/session-*/session.v4.jsonl.zstd
```

## 修复

按「让门禁说真话」修，三处：

1. **任务声明能力面**（`dev/eval/tasks.mjs`）：`desk-daily-brief` 加 `requires: 'web'`，模块头写明这条依赖链与两种记录方式的区别。
2. **runner 如实报告**（`dev/eval/run.mjs`）：新增 `partitionTasks()`，`requires` 不满足的任务报 **NOT EVALUATED** 并从 pass/fail 计数里剔除
   （既不算通过＝假绿，也不算失败＝替组合面背锅）；`--list` 标注 `[needs web — not evaluated by this runner]`；
   `--self-check`（`pnpm verify` 会跑）加红绿对照：web-only 任务必须不在可评集合里，且 `desk-daily-brief` 必须仍带声明。
3. **更正记录**：晨报提案卡的状态行与验收表改成本轮口径（**不可评**；在能评它的环境里判据不变），并把 web 会话里 `schedule_create` 的真实调用列为当前证据面；
   [`docs/dev.md`](../../../docs/dev.md) §四「行为评测」补「能力边界」一段（owner 面，命令细节的家）。

## 升级路径与触发条件（不是缺陷，是欠的能力）

**评分 web-only 任务需要 web-session 驱动**：起 dev 组合的服务、经 HTTP/CDP 真发一条请求、再读会话日志判定——
基建已在 `dev/probes/web/`（`webui-loop-probe.mjs` 的真发问真等回复、`desk-process-e2e.mjs` 的自包含编排）。
**触发**：出现第二条 web-only 任务，或本人要求对 web 面行为出分。在那之前，web-only 任务在 `pnpm eval` 里如实显示为未评测。

## 修复关联

- 任务与 runner：`dev/eval/tasks.mjs`、`dev/eval/run.mjs`（`--self-check` 已进 `pnpm verify` 链）
- 记录更正：[晨报提案卡](../../../notes/proposed/2026-10-10-desk-daily-brief.md)、[`docs/dev.md`](../../../docs/dev.md) §四
- 平台事实（读 vendor）：`vendor/dsh/packages/schedule/schedule/src/index.ts:101`（inject 清单）、
  `vendor/dsh/packages/api/session-controller/src/index.ts:88`（inject 清单）
