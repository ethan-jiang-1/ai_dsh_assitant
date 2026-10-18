---
status: 推敲中
opened: 2026-10-18
---

# 推敲：主动性方向——把"它替我盯着什么"做成可见、可答、不重复

> 立卡：2026-10-18 ｜ 状态：推敲中 ｜ 类型：Feature ｜ 可关闭：否
> **这是一张评审卡**：征集人与 agent 的 review，不承载实施。完整推理链 = [主动性综合](../../_backlog/research/positioning/261018-proactivity-synthesis.md)（合成档）；实施提案 = [主动性 v1 提案](../../notes/proposed/2026-10-18-proactive-face.md)（proposed，待拍板）。

**评审怎么读（按序）**

1. 本卡（10 分钟）：要决定什么、主张与证据强度、请你攻击哪几条；
2. [主动性综合](../../_backlog/research/positioning/261018-proactivity-synthesis.md)（20 分钟）：四层拆解、候选路线判据矩阵、逐条约束对账、反证与未决问题；
3. 按需下钻三档原件：[外部主动性 UX 机制](../../_backlog/research/positioning/261018-proactive-ux-mechanics.md)｜[开源 agent 机制（Hermes 等）](../../_backlog/research/positioning/261018-oss-proactivity-mechanisms.md)｜[本仓现状事实表](../../_backlog/research/positioning/261018-proactivity-baseline.md)。
4. 实施细节与逐片验收：三份都读完再打开 [proposed 卡](../../notes/proposed/2026-10-18-proactive-face.md)。

---

**问题与期望结果**

用户 2026-10-18 点题：本仓定位（上层管理者的助手）在历史 research/issues 里已经比较清楚；近月 personal agent（Muse/dots 等）值得借鉴、**尤其主动性**；老 Hermes 也有主动性但上手难；我们场景窄，要**吸纳进简单交互**，且**先考虑用户体验**。

期望结果（本卡要交出的判断）：**在"窄场景 + 简单交互 + 严格本地 + 单主体辅助本人"下，主动性走哪条路、走多小的一步、按什么判据说它对。** 结论要么进实施提案（已有 `proposed` 卡），要么改成别的路线/叫停。

**当前情况**

- 三档调研（外部 UX 机制 / 开源机制 / 本仓现状）已完成，索引在 [`_backlog/research/README.md`](../../_backlog/research/README.md)；一张 `proposed` 卡已按"四片"写好（片 1 桌面「它替你看过」、片 2 建议式委托、片 3 无人值守红线、片 4 带触发延后）。
- 核心判断（【推断】，见综合 §四.4）：**我们不缺主动性，缺主动性的"脸"（可见与送达）与"收口"**——今天 8 件事在无人开口时发生，其中 4 条各走一次真模型回合，而唯一主对象「桌面」只承载其中半条横幅。
- 三个已观察摩擦（dev home 实物）：主动简报开口后零回复且事项 5 天停在"到期无结果"；两条重复 weekly 排程（模型侧 `schedule_list` 只看当前会话）；投递迟到 7h24m 且桌面不可见。
- 边界不动：权限三分、不预设固定节律/不回复不升级（261008）、不做 IM、推送式生成已被否、主动性＝可见可开关的例行清单（261005）。

**未决问题**

综合档 §八 列了 Q1–Q8（形态、试跑产物落点、三条建议文案、片 3 范围、失败可见化最小实现、节拍器是否改空闲触发、输入观察触发行、暂停入口）。归属按综合 §八 原表：Q1/Q3/Q7 只有本人能定；**Q2/Q6/Q8 是双归属**（分别为 架构+口味 / 本人+架构 / 架构+本人，两边清单各认半边）；Q4/Q5 归架构与评测。

**下一步**

按下面「请评审什么」分工收意见（意见写进「评审记录」节，K 表现状列随结论翻）→ 本卡收敛为一次路线裁决（建议路线 A，或退回 A 的最小版"只落片 1"，或换路线）→ 结论写进 `proposed` 卡状态行（拍板即授权）或本卡关闭条件。**翻转时机**：agent 三类评审收敛、剩余问题只有本人能答时，本卡翻 `等人拍板`（沉默不翻转；Q1/Q3/Q6/Q7 与 Q8 口味半边 🔒）。

---

## 已知与未决

| # | 主张 | 证据与强度 | 谁能否证（怎么证） | 现状 |
|---|---|---|---|---|
| K1 | 桌面（唯一主对象）里没有主动性的痕迹，节拍器/curate 无界面 | **强**：桌面头部块（[`projection-panel.ts:276-283`](../../packages/dsh-smart-assistant/src/client/projection-panel.ts#L276-L283)＝h1＋计数行＋三按钮，无主动性内容；计数行构建在 [:247-250](../../packages/dsh-smart-assistant/src/client/projection-panel.ts#L247-L250)）＋ 全 `src/client` 大小写不敏感 grep `schedule\|maintenance\|curate` 仅 2 处命中且均非 UI（[:42](../../packages/dsh-smart-assistant/src/client/projection-panel.ts#L42) 账本变更标签、[client/index.ts:249](../../packages/dsh-smart-assistant/src/client/index.ts#L249) 代码注释）；[baseline](../../_backlog/research/positioning/261018-proactivity-baseline.md) §一/§五 | 架构 agent：同上 grep 找反例 | 已证（2026-10-18 首轮核验，见评审记录·架构） |
| K2 | 主动开口后没有"未答"状态：简报问了两句，会话零回复、事项 5 天无结果 | **中强**：dev home 会话日志——`[SCHEDULE REMINDER]` user/message @2026-10-13T08:24:48Z 之后，turn 2 末 assistant 两句决策问句，此后无任何真人消息＋账本现态（试车场数据，非产品采纳） | 证据 agent：zstd 解压读 `dev/harness-home/sessions/--Users-bowhead-ai_dsh_assitant--/session-45e89f04-39f9-4955-ba2a-1d50c5f46c52/session.v4.jsonl.zstd`；或指出"dev home 不代表真实使用" | 已证（2026-10-18 首轮核验，见评审记录·证据） |
| K3 | 盯守会重复：跨会话 `schedule_list` 互不可见；dev home 已有两条同 prompt 同周一的 weekly | **强**：vendor `schedule/schedule/src/tools.ts:175`（"in the current session"）、`index.ts:289-312`（`list` 按 sessionId 过滤；跨会话全局视野只有浏览器面 `catalog` Remote，非模型工具）；`dev/harness-home/storages/schedule.json` 两条同 prompt weekly（`b13ddcb8`/`be578c2c`，分属两会话）——**且第二条就是那次迟到投递的 turn 里模型当场 `schedule_create` 的**（会话日志可回放，不是静态存量） | 架构 agent：读 vendor 源码确认 `list` 的 sessionId 过滤；或证明工具页/模型另有全局视野 | 已证（2026-10-18 首轮核验，见评审记录·架构） |
| K4 | 本地没有"值班面"（app 不开就不动），所以主动性形态应偏"打开时补一次 / 放在待看处" | **中**：迟到 7h24m48s 是实物（`schedule.json` deliveryHistory：scheduledAt 01:00Z → deliveredAt 08:24:48Z）；"不引入常驻网关"是已拍板（[baseline](../../_backlog/research/positioning/261018-proactivity-baseline.md) §三、开源档 N1） | 架构 agent：指出是否有既有机制能在进程外投递 | 已证（2026-10-18 首轮核验，见评审记录·证据） |
| K5 | 外部四家在主动性上收敛到同一套产品面（具名管理页／放进待看处／只在完成与需点头时出声／无人做打扰预算） | **中**：一手文档为主（Claude/Lindy），OpenAI 侧全二手、无使用率读数（[UX 档](../../_backlog/research/positioning/261018-proactive-ux-mechanics.md) §三/§六） | 证据 agent：找反例（有产品做打扰预算/闲时自找事情而成立）或指出二手占比过高 | 未决 |
| K6 | 老 Hermes 的主动性=常驻 gateway + 平台投递 + 大配置面；机制值得借、形态必须不搬 | **中强**：源码与官方文档（`wakeAgent:false`、建议面、curator、`allow_agent_scheduling` 默认 false、配置参考 247KB/142 节） | 证据 agent：若能把"上手难"量化（放弃率/时间）则更强；否则维持结构性代价口径 | 未决 |
| K7 | 建议走"可见化与收口"（路线 A），不加自主度 | **中**：判据矩阵是自评（综合 §五.2），B 的反证来自已拍板约束与官方劝退文本 | 出现下列之一则改判：真人明确要"它多替我干"且愿付权限代价（改选 B）；或片 1 落地后本人日常不看桌面、可见化前提失效（转 C/D） | 未决 |
| K8 | 效果（少漏事）无证据，本卡不承诺 | **强**（负面事实）：输入观察 30 天窗口实际未启动，无任何真人读数 | 任何人：若能拿出读数则改变结论 | 已证（2026-10-18 复核：`dev/trial-home-30d/` 零会话目录、零会话日志） |

## 方案与取舍

四条候选路线（完整定义、判据矩阵与逐条约束对账在综合档 §五/§六，此处只留结论与指针）：

- **A 可见化与收口（建议）**：桌面「它替你看过」（两个已有只读源合并、纯核派生、零 token）＋「让它替你盯」建议式委托（先试跑、一键接受才建、忽略封口）＋无人值守 turn 红线（不自动新建常态排程、失败一律出声）。自主度不变。
- **B 加自主度**：到期自动巡检、无人值守自己决定盯什么——与 261008"不预设固定节律、不自动升级"相抵；本地无值班面；重复已实证。**不采纳**。
- **C 维持现状**：保留为 A 的替身（"只落片 1"），不建议整条路线。
- **D 换触发面**：节拍器/投递改"空闲触发 + 首次宽限"（Hermes curator 式）——**单列评审**，不属本次主刀。

**本卡不决定的事**（避免范围蔓延）：不改账本动词与权限三分；不引入常驻服务/IM/外部数据源；不重建任务管理器（vendor 已有自动化任务页）；不动 `261018-desk-side-capture` 在推的五片。

## 请评审什么（分角色，逐条可勾）

**人（产品与口味，只有你能定）**

- [ ] Q7/B：你要的是"少漏事"还是"它多替你干"？路线 B 是否其实更贴近你的期待（若选 B，请说明愿意接受哪一档权限）。
- [ ] Q1：桌面那一条三行式会不会稀释主对象？还是并进头部计数行更好？**注意叠加背景**：受理位＋在途条已常驻头部下方（desk-side-capture 片 1 已落地），问的是四层堆叠后的整体密度，不只是本条行；另「它在等你」行与在途条会**同读同一个 `pendingInteraction`**——同屏两路"等你"信号是否算重复，一并判。
- [ ] Q3：三条建议（每天替我看一遍 / 到期提醒核对 / 每周对账）是不是你要的三种？文案怎么写才像人话？
- [ ] Q6：养护节拍器在你干活时插进来，你是否已经觉得被打断（决定路线 D 是否要单独立卡）？
- [ ] Q7：输入观察触发行（今天正好到期）怎么处置：补读数，还是改成"首条真人会话后计时"？（＝综合 §八 Q7）
- [ ] Q8（口味半边）：桌面要不要一个"暂停盯守"的入口？（平台今天只有删除、没有暂停；"记上游还是自建"的架构半边在下面架构清单。）

**架构 agent**

- [ ] 两源合并是否违反"一个事实一个家"？（只读、不持久化、不写回；调度事实的家仍在平台排程存储。首轮核验支持：Remote 面恰为 catalog/list/update/delete/history 五个只读方法、无 create，见评审记录·架构）
- [ ] 片 1 纯核落点：`src/client/` 还是 `src/domain/operating/`？会不会把展示逻辑塞进不该有的层？
- [ ] Q4：片 3 红线与两条既有边界是否写清——与 `morning-brief` 的"承诺即排程"（只约束无人值守 turn）；与提案槽是否重复（它已是 propose-only，红线要不要点名它）？
- [ ] 客户端真能拿到 `remote.schedule.catalog` 吗（注入面与组合可行性）？（首轮已核一半：本包 [`client/index.ts:66`](../../packages/dsh-smart-assistant/src/client/index.ts#L66) 的 inject 只声明 `'remote'`、无 `'remote.schedule'` 子面，而 vendor `ui-schedule` 两个都声明——待判子面是否需单独注入）
- [ ] Q2：「先试跑一次」的产物放哪：会话里（现有车道）还是桌面浮层？（综合 §八 Q2 的架构半边；口味半边随 Q1 一并呈人）
- [ ] Q5："失败一律出声"的最小实现怎么切？建议绑定具体案例判：「替我盯上」点击后模型回合失败/没建成——这是片 2 **不延后**的失败模式，其可见化目前全排在延后的片 4，中间态谁来报？
- [ ] Q8（架构半边）：平台缺 `pause`（Remote 面与工具面都无此概念，首轮已核），暂停入口记上游还是本包自建？
- [ ] 与 desk-side-capture 的共存（三件事，首轮核验事实见评审记录·架构）：①插入位仍是空位（`dsha-head` 与 `dsha-capture` 之间）但头部变四层堆叠；②proactive「它在等你」与 capture 在途条同读 `pendingInteraction`；③`web-expected` 基线（blank-first-open）今天既无受理行也无主动行，刷新义务在 capture 片 4（未开始）——proactive 片 1 先落地则下次 `--refresh` 把两个改动收进同一份期望，刷新时机谁先谁后要显式排。

**评测 agent**

- [ ] proposed 卡验收表能否"不看对话就复现"（命令 / 断言对象 / 红的形态）？
- [ ] 哪些是假绿风险：行 1 判据的时区与"回执之后"语义、shots 只证渲染不证零模型调用、`pnpm eval` 的 web-only 任务？（首轮另核出两个静默陷阱，见评审记录·评测：`--eval` 置尾无参静默降级为普通截图、`--name a-{b,c}` brace 展开丢态——两者都 exit 0）
- [ ] 片 3 的红线怎么在 eval 里被判（断言"无人值守 turn 无 schedule_create"是否可行）？

**证据 agent**

- [ ] 三档里二手占比是否影响结论（OpenAI 侧全二手；无使用率读数）；有没有更强的替代来源？
- [ ] 是否有被漏掉的反证：某产品做了打扰预算/闲时自找事情而成立、或"主动性可见化"被证伪的公开材料？
- [ ] K2（dev home 观察）能不能升格为可引用的产品证据，还是必须降级为"试车场现象"？

## 评审记录（意见回流的家）

**规则**：各角色评审意见按小节追加于此（带日期）；K 表"现状"列随结论翻 `已证 / 证伪 / 维持`，翻时注明依据。评审收敛＝四个角色各有小节且其结论已被路线裁决吸收。

### 2026-10-18 · 首轮 agent 核验（架构 / 证据 / 评测三路并行，只读）

**架构（源码断言逐条对实物）**

- K1 实质成立、原行号锚过期：计数行实际构建于 [`projection-panel.ts:247-250`](../../packages/dsh-smart-assistant/src/client/projection-panel.ts#L247-L250)、渲染于 :279，头部块 276-283；grep `schedule|maintenance|curate`（不敏感）全 `src/client` 仅 2 处且均非 UI。**行号已随 desk-side-capture 片 1 落地漂移 +13~16 行——对活跃文件引行号须加结构锚，已修。**
- K3 成立且加强：`tools.ts:175` 恰为"in the current session"；`index.ts:289-295` list 按 sessionId 过滤；全局视野只有浏览器面 `catalog` Remote（:303-312）。第二条重复 weekly 是那次迟到投递 turn 里模型**当场** `schedule_create` 的。
- proposed 卡注入/调用断言准确（`client/index.ts:66`、vendor `ui-schedule:93`）；**新事实**：本包 inject 无 `'remote.schedule'` 子面（vendor 两个都声明）——组合可行性待判。
- Remote 面恰五个只读方法（catalog/list/update/delete/history）、无 `create`（host 装饰器与生成的 `typert.remote-client.d.ts` 双侧核）——"两源合并不写回"有机制面支撑。
- 共存（观察，不定论）：插入位（`dsha-head` 与 `dsha-capture` 之间）仍是空位、不挤同一节点；但四层堆叠、`pendingInteraction` 两路呈现、`web-expected` 基线刷新时机三件事实施前要显式排（已进上面架构清单）。

**证据（dev home 实物 + 调研档）**

- K2 实质叙事全部可复现（迟到投递、两问句、零回复），但**原引用句柄 `PrUrtSt` 在日志里 0 命中——凭空句柄，三处引用已同 diff 改为实指**。
- 两条同 prompt weekly（`b13ddcb8`/`be578c2c`）与 7h24m48s 迟到（`scheduledAt 01:00Z → deliveredAt 08:24:48.441Z`）在 `dev/harness-home/storages/schedule.json` 属实，与会话日志交叉一致。
- K8 复核：`dev/trial-home-30d/` 零会话目录、零日志——负面事实成立。
- research/README 四条登记齐、三档关键节齐、8 件事 4+4 一致、261008 L267 与 261005 L151/L260-263 行号全对、卡内 9 个相对链接零断链。
- 定位维持：K2/K3/K4 是试车场现象、非产品使用证据；作为**机制缺陷**（跨会话不可见、无值班面）的实证有效。
- 顺手修：baseline §一"前三条"与其表格矛盾（实为前四条走模型回合）——已修。

**评测（proposed 卡验收表逐行可执行性）**

- **3 行可复现**（片 1 纯核 / build+test:client / 收尾三连）；**3 行需前置**（shots 三态：brace 展开会静默丢两态且 exit 0、三态需 seed 夹具、回归车道是 web-face 场景非一次性 shots；真机前后比对：**无现成命令**，且真实 dev home 上到期投递/goal 续跑会在窗口内自发建会话造成假红——需受控 home；片 2 行：`--eval` 必须带 JS 片段、e2e flow 场景不含"先试跑/替我盯上"）；**2 行按现仓库不可复现**（pendingInteraction：web UI 态而 eval 走 headless one-shot 且 checks.mjs 只有 8 种判据；无人值守红线：无采样通道，schedule_* 是 web-bound）。
- 结论：按 [notes/README.md](../../notes/README.md) §二之三"验收写不出＝提案未成熟"，**裁决前要么补验收车道设计（web 驱动＋新 check kinds＋seed 夹具），要么把不可执行行降为带触发延后项**。机械陷阱（`--eval` 写法、brace 拆条、行 4 前置）已在 proposed 卡验收表内修正。

**人**：待本人（上面人清单 6 问）。

## 验收标准

本卡的验收＝**评审收敛 + 一次路线裁决**，不是实施验收（实施验收在 proposed 卡）：

1. 四位角色的意见各有落点（落点＝评审记录节）：人给出 Q1/Q3/Q6/Q7 的答复与 Q8 的口味半边；架构给出 Q2/Q4/Q5/Q8 的结论与共存判断；评测给出"验收表可执行/假绿清单"结论（首轮已给：3 可复现 / 3 需前置 / 2 不可复现）；证据给出"反证与来源强度"结论（首轮已给）。
2. 路线裁决写进 [proposed 卡](../../notes/proposed/2026-10-18-proactive-face.md) 状态行（拍板即授权）或本卡关闭条件的对应出口。
3. 若裁决为"只落片 1"或"换路线"，同 diff 更新 proposed 卡正文，使建议与裁决一致。

## 关闭条件

- **有结论**：路线裁决落到 proposed 卡状态行（或另立新卡），本卡按 [`issues/README.md`](README.md) 关闭规则 `git mv` 进 [`_archive/settled_issues/`](../../_backlog/_archive/settled_issues/README.md)，`status` 改 `已结`，状态行补结论与去向。**若裁决为换路线（B/D）**：现 proposed 卡不滞留 `proposed/`——按 [notes/README.md](../../notes/README.md) 转 `rejected/`（状态行写被取代原因）或改写为新路线提案，与本卡归档同 diff。
- **被叫停**：进 `suspended_issues`，`status` 改 `叫停`；复活需本人明确决定。
- **不关闭的形态**：评审意见未收敛前保持 `推敲中`；若某条未决问题需要真实使用数据（K8），把它单列为带触发的延后项，不拖着本卡。
