# snapshots/ —— 行为回归的证据面（第 0 天：计划，不是实现）

DSH 的 model-visible 行为回归靠**录制会话的 keyless 重放**（一场景一目录 + 自己的 `snapshot.yml`）。
方案 B（在 DSH 树内长）直接用官方 harness；方案 A/C/D 要自建最小版 —— 本 repo 属于 A。

**第 0 天的诚实状态：目录先立，harness 未建。** 先用两样东西顶：

1. **测试**（`packages/dsh-smart-assistant/tests/`）：纯核函数的行为断言 ——
   布局、frontmatter、存储、检索、三档出口、养护检查、摘要预算。
   这是"会为这次回归而失败"的最小证据，覆盖绝大多数改动。
2. **会话 JSONL 日志 diff**（落在 `dev/harness-home/sessions/`，gitignore）：
   调试上下文组装时**读日志，不猜**（model-visible ⟺ logged）。

**升级触发条件**（够用再升级，别提前造）：出现第一处"只有跑起来才看得出"的回归
（例如 preset 装载、provider 挂载、工具在 PTC 模式下的行为），
再按 DSH 的形状建 `snapshots/<场景>/`（自带 session JSONL + `snapshot.yml` 声明 profile 与录制）。
