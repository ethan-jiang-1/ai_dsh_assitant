# 主动性 v1：它替你看过 / 它在等你 / 让它替你盯（桌面可见 + 建议式委托 + 无人值守红线）

日期：2026-10-18 · 状态：**implemented**（已交付 2026-10-18：片 1–3 落地、片 4 带触发延后；逐片真证据的家 = [收口卡台账](../../_backlog/_archive/settled_issues/261018-proactive-face-closure.md)；路线裁决与六问拍板 = [已结评审卡](../../_backlog/_archive/settled_issues/261018-proactive-direction.md)）

> **依据**（三档调研 + 一档合成，索引在 [`_backlog/research/README.md`](../../_backlog/research/README.md)）：
> [主动性 UX 机制](../../_backlog/research/positioning/261018-proactive-ux-mechanics.md)｜
> [开源 agent 的主动性机制](../../_backlog/research/positioning/261018-oss-proactivity-mechanisms.md)｜
> [本仓主动性现状事实表](../../_backlog/research/positioning/261018-proactivity-baseline.md)｜
> [主动性综合](../../_backlog/research/positioning/261018-proactivity-synthesis.md)（完整推理链）。
> **邻卡**：[261018-desk-side-capture](./2026-10-18-desk-side-capture.md)（桌面受理位；本卡只与它相邻，不改其范围）。

## 问题（可观察行为）

**外部结果三要素**（均已达成）

- **触发**：本人打开或回到桌面（桌面本来就有 30s 只读轮询）。
- **得到**：桌面头部下方一条确定性（零 token、不调模型）的「它替你看过」三行式——到期没结果 / 它在等你 / 它下次看（含迟到事实说明与重复标）——以及「让它替你盯」的具名建议（先试跑一次；一键接受才建；忽略即封口）。
- **完成条件**：机器判据证明三行与建议都由**已有只读数据**派生（新增模型工具 0、派生零模型调用、账本字节不变）；真机走查里本人一眼能答"它在盯什么 / 在等我什么 / 要不要加一条或停一条"（口味面留本人日常使用）。

**交付前的现状**（逐条可复现，出处见[事实表](../../_backlog/research/positioning/261018-proactivity-baseline.md)）：8 件无人开口发生的事在桌面上零痕迹；到期简报迟到 7h24m 且两问句零回复 5 天悬置；`schedule_list` 只看当前会话导致跨会话重复 weekly（10-13 事故：第二条是那次迟到投递 turn 里模型当场建的）。

**拍板边界（全部守住）**：不预设固定节律、不回复不升级（261008）；不做 IM；推送式生成已被否；治理永远人工；权限三分不动。

## 交付（四片；片 1–3 已落地，证据指针到收口卡台账）

### 片 1 — 桌面「它替你看过」（确定性、零 token、只读）✅

两个只读源在客户端合并、不新增第二份真相：账本投影 v2 ＋ 平台排程全局目录。**接线定案**：peer `@deepseek-ai/dsh-schedule` + inject `'remote.schedule'`，与 vendor 同构——缺任一件运行时杀 entry 且类型层零预警（三轮二分实证）。派生为纯核 [`src/client/proactive-face.ts`](../../packages/dsh-smart-assistant/src/client/proactive-face.ts)（keyless 可测，20 案）；行 2 与 capture 在途条按"事 vs 会话"分工去重；重复判据＝同 title **或同 prompt** ＋ 同时刻（10-13 事故的实况是同 prompt 不同 title）；空态整条不渲染；行文案守四问、每行至多一动作；迟到只说事实不归因。

2026-10-19 修正（BUG-017/023）：到期行的「没结果」收窄为**committed 的 `complete` 回执**——`claim`/`update`（例如 m-1 到期后的归户与"仍未到账"报告）不再清行；行 3 遇到已过去的 `scheduledAt` 改说"它该在 X 看…还没看到它动"，不再声称未来的"下次"；到期不足一天显示"今天到期"而不是"到期 0 天"。

### 片 2 — 「让它替你盯」：建议式委托 ✅

三条具名建议按拍板排序 ②到期核对 → ③每周对账 → ①每天一遍（①带"比每周一坐密"知情标注）；每条两动作走桌面 capture 代发车道（`[桌面]` 独立来源，不直调 RPC）；忽略×封口（localStorage）；Q5 对照行（"说了替你盯但没盯上"）——接受痕仅 `retry:` 路径记录（建议名的模型自建 title 不可预测，按 title 对照必误报；正常接受的失败可见化归片 4 带触发范围）。Q5 行的卫生（按 title 去重、可忽略、重试不追加）在 [2026-10-19-desk-receipt-terminal-state](./2026-10-19-desk-receipt-terminal-state.md) 里收口。

### 片 3 — 无人值守 turn 红线（模型可见面，英文）✅

写进 [`operating-brief`](../../packages/dsh-smart-assistant/src/agent/operating-brief/index.ts)：允许读 / `note` / `propose` / 建议盯守（提案槽点名天然合规）；点名八禁动词＋不自动建常态排程（锚 2026-10-13）；失败一律出声；边界＝只约束无人值守 turn（用户回合"承诺即排程"保留）。合同 15 案逐要素断言；真投递回合端到端 PASS（诱导性 prompt 下全程只读、零越线）。

### 片 4（延后，带触发）— 明细 / 失败可见化 / 平台缺口记账

触发＝片 1/2 真用后出现"想改频 / 想暂停 / 不知道绑哪个会话"的摩擦，或 active 排程 ≥3，或首次静默失败。平台缺 `pause`：记上游候选、不催（2026-10-18 拍板"删了重建可接受"）。

## 验收（已执行；逐片命令与红形态 = 收口卡台账）

| 面 | 判决 |
|---|---|
| 纯核与组件 | 纯核 20 案 ＋ 组件 9 案 ＋ 红线合同 15 案全绿；包全量 `pnpm test` 721/721 |
| 真机三态 | `proactive-shots.mjs` 隔离 home due/quiet/dup 三态全 PASS（dup＝事故形状） |
| 零成本见证 | `proactive-idle-probe.mjs` PASS：35s 窗口会话数不变、`ledger.json`/`schedule.json` 哈希不变 |
| 建议车道（真模型） | `proactive-watch-live.mjs` 全相位 PASS：试跑真读不建排程；盯上真建 title 可读无重复；行 3 实时呈现 |
| 无人值守红线 | `proactive-unattended-live.mjs` PASS：真投递回合零禁动词、零 `schedule_create`、失败出声 |
| 行为回归 | `pnpm eval` 7/8 水位与 baseline 一致（两轮红题不同＝answer-matches 已知抖动互证）；`desk-daily-brief` web-only NOT EVALUATED（结构已知，驱动 = `desk-daily-brief-live.mjs`） |
| 基线 | `blank-first-open` 由片 1 diff 重录（受理行＋主动行收进）并复验 PASS |
| 收尾三连 | `pnpm build && pnpm test && pnpm verify` 全绿（42 checks） |

**本人的验收面（不代判）**：行文案是否像人话；「先试跑一次」的输出是否让人敢点「替我盯上」；真模型把②建成了 daily 09:00（desk-daily-brief 技能形态）而非到期触发——口径贴合度留本人走查定夺。

## 输掉的方案

1. **重建任务管理器 / 桌面新建排程表单**：vendor 已有自动化任务页（管理面完备），且客户端没有 create Remote——本包只做"只读可见 + 建议式一键 + 深链"。
2. **"每天早上生成内容推给你看"（Pulse 形态）**：官方自己在九个月内下线，判据是 personalised / action-oriented / **steerable**；且 261008 已拍板不预设固定节律。
3. **空闲巡检（dots 形态）**：只有云端大厂敢做且限只读；本地单主体"空闲找事做"的代价收益不成立。
4. **把"下次它什么时候看"写进账本投影（含恒空的 `reminders` 字段）**：调度事实的家在平台排程存储，搬进投影就是第二份真相；改为客户端合并两源展示。
5. **桌面直写排程 / 直调 RPC**：既有裁决（按钮→下一句话确认；`catalog/list/update/delete/history` 有 Remote、`create` 没有——本轮双侧再证）。
6. **无人值守 turn 自己决定盯什么并直接建**：已造成跨会话重复；外部一致 consent-first——改成"建议 + 一键接受"。
7. **自建静默时段 / 打扰预算 / 暂停档**：四家都没做；降噪靠变更检测 + 默认静默 + 一句话停掉一类，不新造机制。
8. **每件事都开口的长简报**：261007 已输掉（"无事长文是负担"），维持"有事逐条、无事一句话"。
9. **把"它替你看过"做成常驻模型回合（每次开屏问一次）**：261007 已输掉（每次打开烧一轮模型），本片是零 token 确定性派生。
10. **（交付期新增）子面注入的两种单件姿势**：只声明 inject 不加 peer（import 阶段杀 entry）／加 peer 但不声明子面而结构读取（Proxy get 抛异常杀 apply）——两件套缺一不可，类型层全程零预警。
11. **（2026-10-19，BUG-017）「到期后任何回执都算看过」**：`claim`/`update` 会把"仍未到账"的报告也当成结果，m-1 的到期行因此一直不出现——改为只认 committed 的 `complete`；代价是"到期后查过但没办完"的事项会继续留在行上（这正是它要提示的状态）。
