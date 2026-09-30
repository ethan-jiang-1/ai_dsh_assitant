# A2 片：委派组与 jobs 挂进 assistant preset（含一处对 standard 的登记偏离）

日期：2026-09-30 · 状态：**implemented（dump-config 0 warn；replay 探针请求侧 30 工具全 PRESENT 含 web 守卫；301 tests / verify 31 / release-smoke 绿）**

采纳卡：[`notes/implemented/2026-09-30-stock-plugin-adoption.md`](../../notes/implemented/2026-09-30-stock-plugin-adoption.md)（A2 片）。

## 决定与证据

挂 `delegation` isolate 组（`tool-subagent` spawn 可续 / `tool-subagent-fork` 可续 / control 三件；
codex、claude-code 照抄 disabled 占位）与 `tool-jobs`。组形状逐字段抄 shipped `standard` preset；
workflow 三行按卡观望不挂，`isolate: workflowEngine` 键随组保留（组内无 provider 时 dump-config
无 warn，实测判据）。证据：replay 探针（keyless）请求侧 `subagent/subagent_fork/send_message/
interrupt_agent/list_agents/job_output/job_list/job_kill` 全 PRESENT，web 守卫两行同验在场。

## 登记的偏离：不抄 `modelSelectionSettings: true`

- **约束**：该 flag 要求 host 作用域存在 web-app 层的 `subagent-model-selection-settings` 行；
  headless profile（dev-task 冒烟、一次性任务）没有该层，preset 行挂上即 fail-loud
  （2026-09-30 实测：`tool-subagent: modelSelectionSettings requires … in the Host scope`）。
- **适配**：砍掉该 flag。它是 Web UI 的插件页采样功能（新 Web 会话收到委派工具时采样偏好），
  不是委派能力本身；preset 在 headless 可挂载是硬前提（host 面冒烟与 release-smoke 都走它）。
- **证据**：砍后 dev-task 探针 exit 0、web profile 的 dump-config 行仍在场。

## 输掉的方案

- **保留 flag 并给 dev-task 补 web-app 层**：为一个 UI 采样功能给 headless 组合加一层，
  组装面变厚、冒烟语义变糊——代价远大于收益。
- **连 workflow 三行一起挂**（`workflow-ptc`/`tool-workflow`）：adoption 卡已判观望（research 工具
  覆盖单线程调研，编排需求未实证）；delegation 组的 isolate 键不依赖组内有 provider，已验。
