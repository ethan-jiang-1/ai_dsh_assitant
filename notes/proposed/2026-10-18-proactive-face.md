# 主动性 v1：它替你看过 / 它在等你 / 让它替你盯（桌面可见 + 建议式委托 + 无人值守红线）

日期：2026-10-18 · 状态：**proposed**（已授权实施 2026-10-18——本人裁决路线 A"可见化与收口"，[六问逐项拍板见评审卡·评审记录](../../_backlog/_archive/settled_issues/261018-proactive-direction.md)；推进台账 = [`_backlog/issues/261018-proactive-face-closure.md`](../../_backlog/issues/261018-proactive-face-closure.md)；不改 [`261018-desk-side-capture`](2026-10-18-desk-side-capture.md) 的范围，只与它相邻）

> **依据**（同 diff 新增三档 + 一档合成，索引已在 [`_backlog/research/README.md`](../../_backlog/research/README.md) 登记）：
> [主动性 UX 机制](../../_backlog/research/positioning/261018-proactive-ux-mechanics.md)（近月 personal agent 的主动性怎么被做成产品面）｜
> [开源 agent 的主动性机制](../../_backlog/research/positioning/261018-oss-proactivity-mechanisms.md)（Hermes 深挖 + OpenClaw/Letta/… 可搬运清单）｜
> [本仓主动性现状事实表](../../_backlog/research/positioning/261018-proactivity-baseline.md)（8 条无人值守事实、开关清单、缺口表、未验证读数）。
> **评审入口**：[主动性方向评审卡](../../_backlog/_archive/settled_issues/261018-proactive-direction.md)（分角色可勾选清单 + 开放问题 Q1–Q8）；
> **完整推理链**：[主动性综合](../../_backlog/research/positioning/261018-proactivity-synthesis.md)（四层拆解、候选路线判据矩阵、逐条约束对账、反证与风险）。
> **前作**：[261012 personal agent 机制级对照](../../_backlog/research/positioning/261012-personal-agent-differentiation.md) §三（借鉴清单 1–9）。
> 本卡是它的"主动性 UX"续篇：只写增量与落点，不重述。

## 问题（可观察行为）

**外部结果三要素**

- **触发**：本人打开或回到桌面（桌面本来就有 30s 只读轮询）。
- **得到**：桌面头部下方**一条确定性**（零 token、不调模型）的「它替你看过」——① 到期了、账上没结果的事项；② 它在等你的那一句话（未答的请示 / 待确认提案 / 待认领、重复的盯守）；③ 它下次什么时候看（含"上次迟了 7 小时，因为当时没开着"这类诚实说明）；以及「让它替你盯」的**具名建议**（可先试跑一次；一键接受才建；忽略即封口）。
- **完成条件**：机器判据证明三行与建议都由**已有只读数据**派生（新增模型工具 0、模型调用 0、账本字节不变），且真机走查里本人一眼能答"它在盯什么 / 在等我什么 / 要不要加一条或停一条"。

**现状（逐条可复现；完整出处见[事实表](../../_backlog/research/positioning/261018-proactivity-baseline.md)）**

1. 今天有 **8 件事**在无人开口时发生，其中 4 条各走一次真模型回合（养护节拍器 / 提案槽 / goal 自动续跑 / 到期排程投递）——**唯一主对象「桌面」里一条痕迹都没有**；节拍器与 `curate` 任何界面都没有（[事实表](../../_backlog/research/positioning/261018-proactivity-baseline.md) §一/§五）。
2. 主动产出落在会话时间线：2026-10-13 的到期简报（投递迟到 **7h24m**）在会话里问了本人两句，**零回复**；5 天后该事项仍停在"到期、无结果"（`dev/harness-home/sessions/…/session-45e89f04…`：`[SCHEDULE REMINDER]` user/message @2026-10-13T08:24:48Z 之后 turn 2 末两问句、此后无真人消息；同 `storages/schedule.json` 的 `deliveryHistory`）。
3. 排程只有 `create/list/update/delete` + `active/inactive`：**没有暂停、没有静默时段、不能绑事项**；`schedule_list` 只看当前会话（vendor `schedule/schedule/src/tools.ts:175`），于是**跨会话重复已经发生**——dev home 里两条同 prompt、同周一 09:00 的 weekly（`storages/schedule.json`）。
4. 主动性没有可开关的清单：vendor 任务页**没有创建表单**（"a new reminder starts in a Session"），本包出货**零默认排程**，主动能力以散文形式藏在技能与家手册里（[事实表](../../_backlog/research/positioning/261018-proactivity-baseline.md) §二/§五）。
5. 桌面头部现在只有计数：`N 件在办 · N 条等你确认 · N 条待认领`（构建于 [`projection-panel.ts:247-250`](../../packages/dsh-smart-assistant/src/client/projection-panel.ts#L247-L250)、头部块 :276-283——行号随 desk-side-capture 推进漂移，以结构定位为准）；首屏那条会说话的播报卡已随旧 desk 退役，现在只是指针（[`first-mile.ts:160-172`](../../packages/dsh-smart-assistant/src/client/first-mile.ts#L160-L172)）。

**已拍板的边界（不动）**：提醒只按本案明确委托的核对点/已确认条件触发，**不预设固定节律、不回复不升级**（[261008](../../_backlog/_archive/settled_issues/261008-ceo-operating-loop.md) L267）；对外内容本人过目、不做 IM；推送式（不经模型回合）主动生成已被否（[晨报 note](../implemented/2026-10-10-desk-daily-brief.md) 输掉的方案）；治理永远人工。

**外部同类的一手事实（借什么、躲什么都有出处）**：主动性被产品化为**具名管理页**；送达＝"放进一个待看的地方"＋只在"完成 / 需要你点头"时出声；**四家都没做打扰预算，降噪靠变更检测与默认静默**；官方一致劝"别把不可逆动作放进无人值守通道"；Pulse 被下线后官方给出的三条判据是 personalised / action-oriented / **steerable by the user**（[UX 机制档](../../_backlog/research/positioning/261018-proactive-ux-mechanics.md) §三/§四/附）。

## 提案（四片；片 1+2 是主刀，片 3 是纪律，片 4 带触发）

### 片 1 — 桌面「它替你看过」（确定性、零 token、只读）

- **两个只读源，客户端合并展示，不新增第二份真相**：
  - 账本投影 v2（已有）：`matters[].times.{nextCheckpoint,promisedDeadline}`、`status`、`proposals[].status`、`receipts[].submittedAt`、`unclaimed`；
  - 平台排程**全局**目录（已有）：`ctx.remote.schedule.catalog()`（active+inactive、`sessionId`、`lastDelivery`）——本包 client 已注入 `remote`（[`client/index.ts:66`](../../packages/dsh-smart-assistant/src/client/index.ts#L66)），vendor `ui-schedule` 用的就是 `list: () => ctx.remote.schedule.catalog()`（`vendor/dsh/packages/client/ui-schedule/src/client/index.ts:93`）。**待核（2026-10-18 首轮核验发现）**：本包 inject 只声明 `'remote'`、无 `'remote.schedule'` 子面，而 vendor `ui-schedule` 两个都声明——子面是否需单独注入属组合可行性，评审中。
- **派生写成纯函数**（新增 `src/client/proactive-face.ts`）：输入 = 投影 + 目录 + `now` → 输出三行的行模型；keyless 可测，**这是本片的主要断言对象**。
- **三行判据（写死；编号用"行 1/2/3"，不与综合档四层坐标系 L1–L4 混用）**：
  - **行 1 到期没结果**：`status==='active'` 且 `nextCheckpoint` 或 `promisedDeadline` **任一已过**，且该时刻之后没有回执 →「合同 NB-02 二期款核对 · 到期 5 天，账上没有结果」；点进该事项。
  - **行 2 它在等你**：pending 提案（已有计数）＋未答请示（片 2 产物）＋待认领（已有）→ 一行，点进对应事项/片段；**与 desk 在途条按"事 vs 会话"分工去重（2026-10-18 拍板）**——在途条管"哪个会话轮到我说话"，行 2 只聚合账本侧"哪件事在等我一句"，同一 `pendingInteraction` 不两路同屏。
  - **行 3 它下次看**：目录里最早的 active 排程（标题＋下次时间）；`deliveredAt − scheduledAt` 超阈值 → 附一句诚实说明；同一 `title`+同一时刻 ≥2 条 → 标「重复」并给平台自动化任务页深链（**不在这里删**）。
- **行文案遵守 261008 四问**（什么变了 / 为什么现在 / 缺什么或建议 / 要不要你介入），每行 ≤1 行 + 恰一个动作。
- **形态**：坐在头部块（[`projection-panel.ts:276-283`](../../packages/dsh-smart-assistant/src/client/projection-panel.ts#L276-L283)＝h1＋计数行＋按钮）与桌面受理行（`dsha-capture`，[:288-310](../../packages/dsh-smart-assistant/src/client/projection-panel.ts#L288-L310)；**结构定位——两卡以行号互指会互相作废锚点，以 class 锚为准**）之间，是**一条**，不是卡；三行全空则不渲染（不占位）。主对象仍是事项列表。
- **不做**：不写账本、不改排程、不调模型、不新增模型可见工具（本片是"变化门"——先跑便宜的判定，只有本人点下去才叫醒模型）。
- **依据**：dots 的只读巡检只被产品化为"只读"；四家的送达面都是"放进待看的地方"；变更检测优先于定时汇报；Pulse 复盘判据 `steerable by the user`（[UX 机制档](../../_backlog/research/positioning/261018-proactive-ux-mechanics.md) §三）；变化门与零 LLM 档（[开源机制档](../../_backlog/research/positioning/261018-oss-proactivity-mechanisms.md) M1）。

### 片 2 — 「让它替你盯」：建议式委托 + 先试跑 + 忽略封口 + 答得上

- **具名建议**（≤3 条，防唠叨墙；**2026-10-18 拍板：三条都要，排序如下**）：每条写明**什么时候开口、会说什么、怎么停**。①「到期日到了替我核一遍账」（最刚需，贴 261008"明确委托的核对点"）；②「每周一替我对一次账」（贴合每周一坐）；③「每个早上替我看一遍桌面」（**知情标注：这条比"每周一坐"密，接受即本人自改节律**）。文案走"替我＋做什么＋怎么停"委托式；具体措辞实施时出样稿、本人过目。
- **每条两个动作**：
  - **先试跑一次**：现在就按这个口径看一遍——真读真判断、**不建排程、不写账本**（Lindy dry run 语义：先试跑再信任）；
  - **替我盯上**：一键建（文案写明这是"以后都这样"，与一次性动作区分——对外部样本里"Approve 只改这一次 / Always allow 改规则"的吸收）。
- **建排程走既有面板代发车道**（按钮→下一句话确认；不直调 RPC，沿用既有先例），由模型按既有技能建 `schedule_create`，`title` 用本人看得懂的话；同回合回一句"已替你盯上，每周一 09:00；不想收就说一声"。
- **忽略（×）＝封口**：这条建议不再出现（客户端本地记住即可；不新增存储面）。
- **答得上**：主动投递需要本人给一句话时，走平台 question 交互（`tool-ask-user` 在 dev 组合在场，已核 `pnpm dsh --profile dev --dump-config`）→ 产生 `pendingInteraction`，侧栏行显示「轮到你」，回答即指令；未答期间由片 1 的行 2 常驻。
- **不做**：不默认开（出厂仍零默认排程）；不做静默时段/暂停/改频（平台没有这些概念，见输掉的方案 7）；不新建任务管理器。

### 片 3 — 无人值守 turn 的红线（模型可见面，英文，同 diff 登记 + eval）

- 写进 [`src/agent/operating-brief/`](../../packages/dsh-smart-assistant/src/agent/operating-brief/index.ts)（或家手册同源段落）：
  - **允许**：读、`note` 留痕、`propose` 挂提案、"建议一条盯守"（进待处理建议，**不直接建**）；
  - **不允许**：`confirm` / `reject` / `complete` / `revise` / `discard` / `claim` / `promote_page` / `land_skill`——这些要本人的明确指令（与 [`docs/operating.md`](../../docs/operating.md) §二 权限三分同源）；
  - **也不自动新建常态排程**（本条是 10-13 那次重复 weekly 的直接教训）。
- **失败一律出声**：允许静默的只有"成功且无事"；"投递了但没产出"属于失败，必须在下次桌面呈现里说出来（最小版见片 4 触发条件）。
- **依据**：dots 无人值守期工具限只读；Hermes `cron.allow_agent_scheduling` **默认 false**、建议面 consent-first（`MAX_PENDING=5`，接受才建）；OpenClaw/Hermes 的 `[SILENT]`/`NO_REPLY` 都配了"失败一律投递"的对称规则；官方"别把不可逆动作放进无人值守通道"（[开源机制档](../../_backlog/research/positioning/261018-oss-proactivity-mechanisms.md) M2/M3/N3；[UX 机制档](../../_backlog/research/positioning/261018-proactive-ux-mechanics.md) §2.2/§三）。

### 片 4（延后，带触发）— 「它在盯什么」明细、失败可见化、平台缺口记账

- **触发条件**（任一出现才立）：片 1/2 真用后出现"想改频 / 想暂停 / 不知道它绑在哪个会话"的摩擦；或 active 排程 ≥3；或首次出现"投递了但没产出"的静默失败。
- **形态**：桌面明细（标题/规则/下次/上次投递/绑的会话＋去平台页的深链与删除）；失败可见化（最小版 = 行 3 对照检查"点过替我盯上但目录无对应 title"＋模型回合失败的一句事实呈现，见评审卡·评审记录·架构 Q5）；平台缺 `pause`/静默时段/投递预算这一条**记上游候选**（[`_backlog/_archive/research/upstream/`](../../_backlog/_archive/research/upstream/261001-upstream-candidates.md) 同族），**不在本包硬造**（2026-10-18 拍板：不要暂停入口，"删了重建"可接受，不催上游）。

## 输掉的方案

1. **重建任务管理器 / 桌面新建排程表单**：vendor 已有自动化任务页（管理面完备），且客户端没有 create Remote——本包只做"只读可见 + 建议式一键 + 深链"。
2. **"每天早上生成内容推给你看"（Pulse 形态）**：官方自己在九个月内下线，判据是 personalised / action-oriented / **steerable**；且 261008 已拍板不预设固定节律。
3. **空闲巡检（dots 形态）**：只有云端大厂敢做且限只读；本地单主体"空闲找事做"的代价收益不成立（[UX 机制档](../../_backlog/research/positioning/261018-proactive-ux-mechanics.md) 附.2）。
4. **把"下次它什么时候看"写进账本投影（含恒空的 `reminders` 字段）**：调度事实的家在平台排程存储，搬进投影就是第二份真相；改为客户端合并两源展示（[`operating.md`](../../docs/operating.md) §三 的 `reminders` 恒空保持）。
5. **桌面直写排程 / 直调 RPC**：沿用既有裁决（按钮→下一句话确认；本轮已核 `catalog/list/update/delete/history` 有 Remote、**create 没有**）。
6. **无人值守 turn 自己决定盯什么并直接建**：已造成跨会话重复；Hermes 默认禁、外部一致 consent-first——改成"建议 + 一键接受"。
7. **自建静默时段 / 打扰预算 / 暂停档**：本轮查到的四家**都没有**做（可查的预算全是算力额度）；降噪靠变更检测 + 默认静默 + 一句话停掉一类，不新造机制。
8. **每件事都开口的长简报**：261007 已输掉（"无事长文是负担"），维持"有事逐条、无事一句话"。
9. **把"它替你看过"做成常驻模型回合（每次开屏问一次）**：261007 已输掉（每次打开烧一轮模型），本片是零 token 确定性派生。

## 验收

刀口：片 1 先落（纯只读、无模型可见面改动），片 2 其次，片 3 与片 2 同批或紧随；片 4 按触发条件立卡。

| 片 | 命令 | 断言对象 | 红的形态 |
|---|---|---|---|
| 1 | `pnpm --filter dsh-smart-assistant exec vitest run tests/client/proactive-face.spec.ts` | 新纯核：行派生矩阵（逾期无结果 / 迟到 / 重复 / 空态 / `now` 边界 / 已了结不出现） | 任一负例未拒或该出现的行缺席 = 红 |
| 1 | `pnpm build && pnpm test:client` | 面板渲染三态、空态不渲染、行内恰一个动作 | 空态占位或两行动作数不对 = 红 |
| 1 | `pnpm shots '<URL>' --dom --size 1500x1000 --name proactive-face-due`（`…-quiet`、`…-dup` **各跑一条**——brace 展开会静默丢两态且 exit 0） | 三态各有其形；DOM 含三行文案、迟到说明、重复标与深链；跑完 grep 对应 `*.dom.txt` 断言三态文案各自在场 | 任一态缺形或缺文 = 红；只出 1/3 张图也 = 红 |
| 1 | 真机前后比对（**前置：受控 home——无 active 排程、无 mid-run goal，否则到期投递/goal 续跑会在窗口内自发建会话造成假红；无现成命令，实施时以最小脚本落 `dev/probes/web/`，口径 = `<home>/assistant-operating/ledger.json` 字节 + `sessions/` 计数**） | 会话数不增、`ledger.json` 字节不变（零模型调用、零写入，无需真 key） | 新增会话或账本字节变化 = 红 |
| 2 | `pnpm shots '<URL>' --eval '<JS 片段>'`（`--eval` 置尾无参会**静默降级**为普通截图且 exit 0）或 `node dev/probes/web/desk-process-e2e.mjs --scenario flow`（**待扩**：现 flow 场景测处理流受理，不含"先试跑/替我盯上"） | 「先试跑一次」只在会话里产生一轮读、排程目录不变；「替我盯上」后目录出现 title 可读的新排程**且无重复** | 试跑写了排程 / 接受后重复 = 红 |
| 2 | `pnpm eval`（**2026-10-18 评审：此行按现仓库不可复现**——`pendingInteraction` 是 web UI 态而 eval 走 headless one-shot，且 checks.mjs 现有 8 种判据不含它；需 web 驱动 + 新 check kind，见[评审卡·评审记录](../../_backlog/_archive/settled_issues/261018-proactive-direction.md)·评测） | 主动请求走 question 交互时产生 `pendingInteraction`（侧栏「轮到你」）；回答即指令、账本落对 | 只在正文问、无 pendingInteraction = 红 |
| 3 | `pnpm test:agent`（红线段落合同的门）+ `pnpm test:composition`（行装载）+ `pnpm eval`（**无人值守半行 2026-10-18 评审：不可复现**——eval 全任务用户发起、无采样通道，schedule_* 是 web-bound；需“种将到期排程→等投递→判会话日志无七动词/无 schedule_create”的 web 驱动，见[评审卡·评审记录](../../_backlog/_archive/settled_issues/261018-proactive-direction.md)·评测） | 红线段落在场；无人值守 turn 不调用 `confirm/reject/complete/revise/discard/claim/promote_page/land_skill`，不建常态排程 | 段落缺席或无人值守 turn 建了排程 = 红 |
| 全 | `pnpm build && pnpm test && pnpm verify`；改模型可见面另加 `pnpm eval` | 收尾三连（[`scripts/AGENTS.md`](../../scripts/AGENTS.md)） | 任一红即未完成 |

**本人的验收面（不代判）**：一眼是否知道它在盯什么、在等什么；「先试跑一次」的输出是否让人敢点「替我盯上」；行文案是否像人话（口味面，触发＝本人日常使用或点名）。
