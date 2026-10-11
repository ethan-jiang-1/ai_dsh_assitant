# 章鱼管家晨报：每日汇报与请示（账本驱动的 daily brief）

日期：2026-10-10 · 状态：**proposed**（本人结构化拍板走方案 A，本轮开工；实现已落：技能 + 首轮真模型回合在 **web 会话**里真建过每日排程（`schedule_create` 实调，见下）；「真人实走」验收行开放，待本人在自己的会话里说一句「每天早上给我汇报」并实收一次简报）

> **2026-10-11 更正（BUG-008）**：本卡原写「实现与 eval 已落：`desk-daily-brief` PASS 162s」——那句不成立，`pnpm eval` 至今**无法**评这个任务，而 162s 那次只能是 web 会话里的观察（与下面列出的 `schedule_create` 实调同类）。机理：`schedule` 是 **web 绑定**插件（它 inject `sessionController`，后者要 `fileUploads`，再要浏览器的 `connection` 服务），而 eval runner 驱动的是 headless one-shot（`--profile dev-task`），那套组合里四个 schedule 工具永远不注册（实测：web 会话 39 个工具含四个 schedule，headless 36 个不含）。现在任务已声明 `requires: 'web'`，runner 报 **NOT EVALUATED** 而不是 FAIL/PASS。**评分这个任务需要 web-session 驱动**（可复用 `dev/probes/web/` 的 CDP 基建）——升级路径与触发条件见 [BUG-008](../../_backlog/_archive/fixed_bugs/BUG-008-schedule-tools-missing.md)。

## 问题（可观察行为）

**外部结果三要素：** 触发＝本人说「每天早上给我汇报」（或指定时刻）；本人得到＝每个工作日早上在一个固定会话里收到一段简报——今天到期的承诺/核对点、等你确认的提案（含默认动作）、待认领片段、逾期无进展、昨晚以来的新进展——**回复简报即成为明确指令走账本**；完成条件＝eval 证明「请求晨报→建每日排程」与「送达后读账本出简报」两个行为，本人实走一次判断话术与确认负担。

## 方案

复用已验证的 morning-brief 模式（commit＝schedule 同回合、日期变动→update、完成→delete、送达＝brief 时刻），**数据源从工作区桌面文件换成权威经营账本**：

- 本人说「每天汇报」→ `schedule_create`（`every` 86400s 对齐本人指定时刻；落点＝当次会话，即晨报专用会话）。
- 排程 prompt 到达 → 加载技能 → `assistant_operating desk` 一次读全量 → 按下方清单出简报。
- 汇报清单：今日到期（核对点/承诺＝今天）、等你确认的提案（逐条给默认动作）、待认领片段、逾期无进展（承诺已过仍 active 无新材料）、昨日以来新进展（materials receivedAt 增量）。
- 请示纪律：简报只呈现不代拍——本人回复才是明确指令，走 `assistant_operating`（confirm/claim/revise）；模型无权自行确认（权限模型不变）。
- 简报落点固定：排程建在哪个会话，晨报永远在那个会话（不散落）；要换地方＝显式重排。

**输掉的方案：** ① 账本原生提醒协调（V4/V5 正路：意图 token、原 Session 绑定、恢复协议）——工程量大、故障窗口矩阵未验，按 261008 归档卡节奏后置；本方案的数据源就是账本，V4 落地后展示层原样复用，不是弃路。② 推送式 host 主动生成简报（不经模型回合）——绕开模型无值班面，且违反「简报是可回复的会话回合」的请示闭环。③ 固定每天必发长文——无事长文是负担，采用「有事逐条、无事一句话」。

## 验收

| 检查 | 通过形态 | 会失败的行为 |
|---|---|---|
| eval `desk-daily-brief` | **本轮不可评**（web-only 能力；runner 报 NOT EVALUATED）。要评需 web-session 驱动；在那之前以**web 会话的真实工具调用**为准：2026-10-11 走查 home（`/tmp/k4-agent-walkthrough-manual-629f088`）里真模型回合实调过 `schedule_create`（含 `schedule_list`）——取证面 = 会话日志的 `tool/call`，对照面 = 同一 home 的 `request/header.tools` 含四个 `schedule_*`（web 39 工具 vs headless 36） | 只口头答应不建排程；建了但 prompt 不指向晨报技能（这条判据在能评它的环境里仍然成立） |
| 简报内容纪律（技能文本钉死，行为 eval 后补） | 简报必须来自 `assistant_operating desk` 读数；pending 提案/待认领逐条呈现且不代拍；无事一句话 | 凭记忆编简报；替本人确认提案；漏待认领 |
| 真人实走 | 本人在晨报会话里回复一条请示，账本出现对应操作且下一份简报反映 | 回复后账本无变化 |

排除：多账本、固定模板长度、催办升级策略（未定不预设）。
