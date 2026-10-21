---
status: 已修
severity: P1
opened: 2026-10-21
---

# BUG-024：行为评测基线红——skill 不加载、`assistant_operating` 不调用

> 严重级别：P1（重要）｜发现：2026-10-21｜状态：已修（2026-10-21）

## 症状

`pnpm eval` 连续 0/7（`desk-daily-brief` 因 web-only 不计）。失败项：

- `first-open-intake`：没有按名加载 `first-conversation` skill；终答不匹配 `/？|\?/`、`/决定|拍板|跟进|decide|follow/`
- `breakdown-uses-skill`：没有按名加载 `management-breakdown`；终答缺“假设 / 停止条件”
- `continuity-from-home`：没有用 home 房间工具；终答缺“一词一义/用户/拍板/working folder”
- `desk-followup-readback` / `desk-capture-note` / `desk-evidence-recommendation`：`assistant_operating` 从未被调用
- `scope-honesty`：终答不匹配“看不见/不会/看不到/cannot see”

## 基线证据（排除 A2 工具行）

- 2026-10-21 18:2x，`packages/dsh-smart-assistant/cordis.patch.yml` 的 `assistant-recall-tool` 临时加 `disabled: true`，重跑 `pnpm eval`：**仍 0/7，失败项与失败文案完全相同**（home `.tmp/eval/home-ghYP47`）。
- 恢复该行后同样 0/7（`.tmp/eval/home-xI4s2N`）。
- 结论：**不是 A2 `assistant_recall` 引入的回归**；评测红在 A2 之前就存在。A2 的生产候选因此只能按“检索面”陈述，不按“整体生产就绪”。

## 根因（已确认）

会话日志里 7 个任务**全部零 `tool/call`**；不是模型不选工具，而是模型根本没有被调用。`assistant/attempt` 的记录是：

`llm-deepseek: no API key for provider route "deepseek-official"; store DEEPSEEK_API_KEY through the credentials service ... (MISSING_CREDENTIAL)`

即：`dev-task` 无 credentials service；`provisionRunHome()` 只把 `dev/harness-home/.credentials.yaml` 复制进一次性 home，却没把 key 导出给子进程。于是每个任务 6–7s 失败，判分读到空答案，误报 0/7。这不是模型行为、不是 A2、也不是评测断言（断言另有一处窄口径，见下）。

另有一处判据窄口径：`desk-followup-readback` 的答案用“按预测记录、没有改动承诺日、没有重新约定、可回退”表达待确认，不含“确认/pending”字样；判据已补同义表达。

## 修好定义（已满足）

- `dev/eval/run.mjs`：`runPreset` 对子进程注入 `DEEPSEEK_API_KEY`（优先 env；否则从 `dev/harness-home/.credentials.yaml` 的 refs 读，不打印）。
- `dev/eval/tasks.mjs`：`desk-followup-readback` 的确认判据补“没有重新约定/未重新约定/按预测/只是预测/可回退”。
- `pnpm eval` → **7/7 PASS · 1 web-only NOT EVALUATED**（home `.tmp/eval/home-cW4iPE`）；`pnpm verify` 43/43；`pnpm test` 910/910。
- 基线对照（A2 disabled）仍 0/7 的原因也一并解释：同一缺 key，不是 A2。

## 修复记录

- 2026-10-21：`pnpm eval` 从 0/7（7 个 MISSING_CREDENTIAL）→ 7/7；`desk-followup-readback` 单跑 PASS 47s。
- 未改模型/persona/技能；只修 harness 的凭据注入与一处过窄判据。
