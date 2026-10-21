---
status: 排查中
severity: P1
opened: 2026-10-21
---

# BUG-024：行为评测基线红——skill 不加载、`assistant_operating` 不调用

> 严重级别：P1（重要）｜发现：2026-10-21｜状态：排查中

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

## 根因（假设，未确认）

会话日志里 `assistant_operating` 在 tool schema/skill 文案中出现，但 `tool/call` 里没有它；`first-conversation` 只在目录里出现、没有加载记录。假设按优先级：

1. 当前模型（评测所用）在 headless 一次性会话里不主动按 `whenToUse` 加载 skill、不主动调 `assistant_operating`；评测题的触发语与 skill 的 `whenToUse` 不匹配。
2. `preset-runner` 的 headless 组合缺了某个让 skill catalog 可发现的 provider 面（但 tool schema 在，需看 prompt 的 skills 段）。
3. 评测断言依赖具体话术/正则，模型换版本后整体漂移。

## 修好定义

- 用同一组题复跑：`pnpm eval` 7/7（或每题有书面豁免），且 `pnpm verify` 43/43。
- 修好时把基线对照（A2 disabled）与根因写进本卡；若根因是评测断言/模型漂移，修断言或注明评测所用模型，不把红留在默认门禁里。

## 下一步

- 先看 `.tmp/eval/home-*/sessions/*/session.v4.jsonl.zstd` 的 assembled prompt 里 skills 段与 `first-conversation` 是否出现，再判断是“模型不加载”还是“目录没给”。
- 若是模型行为：调整 skill 的 `whenToUse`/评测题引导，或按评测模型重录基线。
