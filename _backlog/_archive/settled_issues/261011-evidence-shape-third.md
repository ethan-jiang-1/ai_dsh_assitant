---
status: 已结
opened: 2026-10-11
---

# 已结：走查/模型可见证据第二次只靠 /tmp——不收编第三类证据形态

> 立卡：2026-10-11 ｜ 状态：已结（同日）｜ 结论：**不做第三类 admitted shape**——能脚本化的一律脚本化（B），剩下的一次性读数按「读法协议 + 读数写进拥有它的卡」（A），这正是 [validation-evidence §1b](../../../methods/validation-evidence.md) 的既有口径；候选 C 与 `snapshots/` 的收窄契约冲突，属过度预建。

**触发到场（按 [triggers.md](../../triggers.md) 的写回规则立卡；原行已删）：**
[开屏与节律卡](261007-opening-brief-and-rhythm.md#证据保存限制) 的触发条件是「同类 model-visible/渲染证据
**第二次**只靠 `/tmp` 手工留存」，2026-10-11 收口轮里第二次出现：

1. 2026-10-08：#3/#6 的走查证据住 `/tmp/ux-shots/`（49 个文件、31 个 slice 证据）。
2. 2026-10-11：#6 的排程读数（`schedule_*` 调用、`weekly {time 09:00:00, time_zone Asia/Shanghai, weekdays [1]}`）
   从 `/tmp/k4-agent-walkthrough-*/` 的会话日志里读出——读数已写进卡，但它来自易失 home。

**立卡前先核到的事实（别重复已解决的）：** 该卡给的替代路线「把走查协议固化进 probe 脚本」**已经发生**：
#2 的「三次重载不增殖」→ `projection-live-mechanics.mjs` 的 `session-audit` 相位；#3 的「能打字」→ `pnpm loop-probe`；
#7 的渲染 → `snapshots/web-face` 两场景；#4/#5 的机械面在 client spec。本轮还把场景探针的临时 home 从 `/tmp`
收进仓内 `.tmp/scene-homes/`。**残留的易失面只剩「一次性真实会话读数」**（排程落盘、真机几何这类）——
它们没有 admitted owner，也没有可脚本化的判据。

**要判的问题：** 这类「只有跑起来才看得出、且不属于 `snapshots/` 已收两类形状」的证据，怎么收编？

| 候选 | 形态 | 代价与风险 |
|---|---|---|
| A 保持现状 | 读法协议写进卡、读数写进卡，不新建 shape | 每次重取都要真跑一次；卡上只有一次读数（历史性快照） |
| B 能脚本化就脚本化 | 固化成 probe（先例：`desk-process-e2e`、`loop-probe`、`projection-live-mechanics`） | 只覆盖可脚本化的读法；真机几何等仍在脚本之外 |
| C `snapshots/` 加第三类 admitted shape | 例如「会话日志读数期望」 | 与现状契约（只收 session 回放与 web 渲染期望两类）冲突，是一次真正的契约扩张 |

**推荐：A + 按需 B。** 依据：`snapshots/` 收窄到两类是刻意的（其契约 owner 明写「不当通用证据桶」）；残留面
已经小到「一卡一次读数」，把它升成第三类 shape 属于过度预建（[研发姿态](../../../AGENTS.md) 的「不过度为想象的未来预建」）；
而「能脚本化就脚本化」今天已被证明可行（B 的三例）。因此判据写成：**能脚本化的一律脚本化（B）；剩下的一次性读数
按 A——读法协议与读数都写进拥有它的卡，并注明可重取方式。**

## 结论（2026-10-11，agent 判定并记理由）

**采候选 A+B，不做 C。** 依据：

1. **§1b 已经规定了 A**：[validation-evidence](../../../methods/validation-evidence.md) §1b 明写这类「只有跑起来才看得出」的证据
   应当「命名读法协议而不是工件」「记录为 blocked 并指名缺口」「同类再犯才是一次要裁定的收编」——本卡的第二次出现正是它预见的路径，
   而它已经给出了收编方式：读法协议 + 读数落在拥有它的记录（这里是 [读数档](../../research/261011-input-observation/261011-input-observation.md)）。
2. **B 今天已被三例证明可行**：#2 的「三次重载不增殖」→ `projection-live-mechanics.mjs` 的 `session-audit`；
   #3 的「能打字」→ `pnpm loop-probe`；#7 的渲染 → `snapshots/web-face` 两场景。能脚本化的都脚本化了，
   残留面缩到「一次性真实会话读数」。
3. **C 的代价与现状契约冲突**：`snapshots/` 只收 session 回放与 web 渲染期望两类是刻意的（其契约明写不当通用证据桶）；
   为「一卡一次读数」扩成第三类 shape 属于为想象的未来预建。
4. **本轮已顺手收紧**：场景探针的临时 home 从 `/tmp` 收进仓内 `.tmp/scene-homes/`；读数命令把机器写的轮次按结构判据排除，
   不再依赖易失目录里的人工辨认。

**不写新触发行**：按 [triggers.md](../../triggers.md) 的删行规则，触发句子留在 owner 或关闭的卡上——
**同类第三次再现**时新开卡引用本卡即可（这句就是那句触发）。`snapshots/` 契约与证据地图因此不需要改动。
