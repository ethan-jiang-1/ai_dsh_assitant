# 桌面投递回执的终态（与 Q5 失配行的卫生）

日期：2026-10-19 · 状态：**implemented**（已交付 2026-10-19：投递回执新增回合结束终态、动作车道回显人类标签、Q5 失配行按 title 一条可忽略；证据在文末）

## 问题（可观察行为）

两条都来自 2026-10-19 的端到端走查（原诊断与复现命令见提交说明）：

- **「先试跑一次」把桌面输入锁死。** 回执原本只在经营投影 revision 越过时收口；试跑按定义"不写账本"，替我看一遍也不产生经营记录，于是回合结束后行永远停在「还没进账」、桌面受理位一直 disabled。后台会话的 `completionUnread` 还可能丢失，实测会出现"已跑完却说排着队，等它接手"——结果进了后台会话，桌面既锁输入也不给门。
- **Q5 失配行只能越点越多。** 「说了替你盯但没盯上」只有「再试一次」；每次重试又 append 一条同 title 的 accepted，渲染出重复行（key 也撞），而且没有任何"承认失败/不再提"的出口。

## 决定

**回执有五个相位**（纯核 `capturePhase`，`src/client/desk-process.ts`）：

| 相位 | 判据（按优先级） | 桌面表现 |
|---|---|---|
| `resolved` | 投影 revision 越过投递时观测值 | 行消失，账本实况接管（既有语义不变） |
| `suspended` | 会话有 `pendingInteraction` | 轮到我；给「去会话」，输入解禁 |
| `running` | 会话 `running === true` | 等助手；输入保持关闭 |
| `settled` | `completionUnread` 或本页见过它 running | 它说完了；给「去会话」；输入解禁 |
| `queued` | 其余（含状态未知） | 已交给助手；输入保持关闭，但永远有「关闭」逃生 |

- **账本仍是最高优先**，回合结束只是第二终态；从没见会话跑起来的 `queued` 不臆造"完成"。
- **`seenRunning` 由入口的状态镜像维护**（每页一个 Set）：平台对后台回合可能丢掉 `completionUnread`，见过 running 就足以知道回合已结束。它是页面观察，不是服务端事实。
- **行永远有「关闭」**（`setCaptureReceipt(null)`）；只有 `running`/`queued` 禁用桌面输入。
- **动作车道带 `lane: 'action'` 与人类 `label`**：「先试跑「…」/ 替你盯上「…」」回显按钮动作，不再把内部指令原文（"真读真判断、不建排程、不写账本…"）当成本人的话；来源行也说"桌面按钮"。
- **Q5 失配行按 title 一条**：`deriveProactiveFace` 去重；`rememberAcceptedWatch` 一次 title 一条（重试替换而不是追加）；`forgetAcceptedWatch` + 面板「忽略」把它从本地记忆里去掉；读取 localStorage 时顺手 heal 旧重复。
- **回执落 `sessionStorage`**（per tab，读取时重新校验形状）；`openQuestions` 从 `SessionStatus` 的 `pendingInteraction` 接线，capture 自己的会话在在途条可见时不计入；行 2 有挂起问题时动作变「去答问题」，直接打开那个会话（BUG-016）。

## 输掉的方案

- **纯超时结束（例如 120s）**：慢回合会被误判成"说完了"，快回合又会被过早解锁；"到点等于结束"是编造。
- **只靠 `completionUnread`**：后台会话会丢（先试跑实测落到 `idle`），且它无法区分"还没开始"与"已经结束"。
- **直接 `openSession` 看结果**：违反桌面不切走主区的既有裁决；桌面受理位的存在意义就是不走。
- **保留账本唯一终态**：试跑/盯上按定义不写经营账本，死路；给动作车道在账本里补一条"占位"更是第二份真相。
- **失配行只加「忽略」不去重**：旧 localStorage 里的重复仍会渲染两行；只去重不给忽略则失败永远消不掉。
- **失配行再点一次就清掉**：那是把"重试"和"承认失败"混成一个动作，和「再试一次」冲突。
- **回执纯 per-page 不持久**：刷新后唯一的挂起问题入口就没了（BUG-016 的原始缺口）。同日收口改为 `sessionStorage`（per tab、重新校验形状），行的内容仍是投递事实，不是账本第二份真相。

## 边界（本次不做的事，别把这篇当承诺）

- 回执在 **261019 同日改为 `sessionStorage` 持久（per tab）**：刷新不再丢在途/终态行；关闭时删除。它仍不是业务事实，也不会跨 tab 共享。
- `seenRunning` 只覆盖本页观察；页面在回合中途打开时可能没有它，此时是 `queued` + 「关闭」。
- 「到期没结果」行的判据已在同日收窄为"committed 的 complete 回执才清"（BUG-017，见 [proactive note](./2026-10-18-proactive-face.md)）；claim/update 不再清行。
- 动作车道「一次点击两条排程」「指令被 note 进待认领」已在同日收口（BUG-020，brief 的动作行例外 + 恰好一条），见 [desk capture note](./2026-10-18-desk-side-capture.md)。

## 验证（真跑过）

- `pnpm test`：737/737。新增/变更判据——`capturePhase` 5 案（`tests/client/client-desk-process.spec.ts`）、Q5 去重/记住/忘记 3 案（`tests/client/proactive-face.spec.ts`）、组件终态/关闭/动作车道 2 案（`tests/client/projection-panel.spec.ts`）、车道 label 1 案（`tests/client/client-desk-arms.spec.ts`）。
- `pnpm build`（preset 读 lib/）与 `pnpm verify`（42 checks）全绿。
- 真车道（隔离 home + 真模型）：`dev/probes/web/proactive-watch-live.mjs` 相位 1/1b PASS——`trial-terminal: { disabled: false, close: true, claimsPending: false, sessionPointer: true }`；绿帧 `.tmp/shots/trial-inflight-after-turn.png`，修前红帧 `.tmp/shots/trial-before-fix.png`（同一位置：输入 disabled、"排着队，等它接手"）。
- Q5 真机（隔离 home，无模型）：种两条同 title 的 accepted → 一行；点「忽略」后行消失、localStorage `accepted` 为 0；帧 `.tmp/shots/mismatch-row-{before,after}.png`。
- 探针环境注：`proactive-watch-live` 相位 2 在本机卡在 sandbox approval（workspace-write 后端不可用），其 `watch-turn` 不计入本次证据。
