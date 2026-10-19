---
status: 推敲中
opened: 2026-10-19
---

# 推敲：学到的东西——技能逐件可见与"记下来"（C 卡：P2/P3）

> 立卡：2026-10-19 ｜ 状态：推敲中 ｜ 类型：Feature ｜ 可关闭：否 ｜ 毕业：做现在 ｜ 下一步 = **campaign close**（C1/C2 已交付；人判待本人）
> **依赖与授权：** C1 复用 A 卡 A2 的直写能力（含它"真机可达"的先决证据），读取复用 A1a 的共享 tab/drawer/route 骨架；C2 需 A2 白名单加一条"来源=消息 id 的新建"。**本卡不自行授权 C1 开工**：按 [_backlog/AGENTS.md](../AGENTS.md) 铁律 1 与 [A 卡](261019-self-update-lanes.md) 的授权现状，每片仍走 [`notes/README.md`](../../notes/README.md) §二之二 proposed 卡，点名/点头后才动手。
> **依据：** [self-update/261019-self-update-lanes](../research/self-update/261019-self-update-lanes.md) §一（技能两写入口）、§三 D5、§九（复审更正）。
> **2026-10-19 复审重写：** 修正 C1 授权（不再"不等拍板"）、数据源（用量账本有 `count`+`lastUsedAt`+`since`，不是只有次数）、出处（`metadata.source`，不是常量 `origin`）、成本口径（常驻是 name+description，不是整份 `SKILL.md`）、C2 槽范围（`assistant-actions` 只收 assistant 消息）、`why`（记忆没有该字段）、消息解析（host 用 `ctx.sessionQuery`）。

**问题与期望结果：** 产品判据 P3 要求"学到了什么，用户能看、能改、能删"（[README](../../README.md)），而技能是三处来源里**最看不见**的一处：面板只有一个计数，正文要开文件，退役只能靠对话；直写 `save_skill` 无门、用量账本只有 curate 会读。同时"我想让它记住这句"今天只能靠一句含糊的"记一下"。要的是：**逐件看到技能（名字/用量/最近使用/出处/正文）+ 一键退役**；以及**在消息上直接说"这条留着"**，一次确认就进记忆。

**当前情况：**

- 技能两写入口（`save_skill` 直写 / `propose_skill` → 人改 approved → `land_skill`）与用量账本 `skill-usage.json` 都在。账本不是"只有次数"：[`usage.ts:24`](../../packages/dsh-smart-assistant/src/domain/skills/usage.ts#L24-L56) 的 `SkillUsageEntry` 有 `count` + `lastUsedAt`，账本还有 `since`；`skillUsageLines()` 算 `daysSinceLastUse` 并排序（[`usage.ts:215`](../../packages/dsh-smart-assistant/src/domain/skills/usage.ts#L215-L240)）。**成本维今天没有数据源**。
- 技能扫描已有 `scanLearnedSkills()`（`name/description/origin/learnedAt`，[`scan.ts:28`](../../packages/dsh-smart-assistant/src/domain/skills/scan.ts#L28-L40)），但**不暴露 `metadata.source`**；`learnedSkillNames()` 只留名字、丢掉 description/origin（[`skills-room.ts:185`](../../packages/dsh-smart-assistant/src/host/skills-room.ts#L185-L189)）。退役已有 `retireSkill()`（[`skills-room.ts:233`](../../packages/dsh-smart-assistant/src/host/skills-room.ts#L233-L291)），但它**不写审批账**。
- **`metadata.origin` 是常量 `'learned'`**（[`skill-file.ts:26`](../../packages/dsh-smart-assistant/src/domain/skills/skill-file.ts#L26)、[:89](../../packages/dsh-smart-assistant/src/domain/skills/skill-file.ts#L89)），不能当"出处"列；真正的来源是 `metadata.source`。
- 消息级动作槽 `conversation.chat.assistant-actions` 是**既有 slot**（list / session scope / `messageId`），但它的语义是 **"one finalized assistant message"**（[`slots.ts:441`](../../vendor/dsh/packages/client/ui-chat/src/client/contract/slots.ts#L441)、[`TurnTailNodeView.tsx:56`](../../vendor/dsh/packages/client/ui-chat/src/client/chat/TurnTailNodeView.tsx#L56)）；**没有**"用户消息动作槽"。C2 v1 只能做 assistant 消息；"选中片段"也没有 slot 支持。
- 记忆记录没有 `why`：[`record.ts:24`](../../packages/dsh-smart-assistant/src/domain/memory/record.ts#L24-L59) 只有 `source` + `supersedes`；`why` 只出现在 recall 命中解释（[`tool-memory:59`](../../packages/dsh-smart-assistant/src/agent/tool-memory/index.ts#L59)）。C2 要写"逐字消息 + 固定 source"，不写 `why`。
- 消息文本可由 host 解析：`ctx.sessionQuery.readSession/readEvent/listEvents` 是 durable-message 的现成 reader（[`session-query`](../../vendor/dsh/packages/session-query/session-query/src/index.ts#L184-L369)），base 即使 search 关也挂；用户消息的 durable id 在 `data.id`。

**下一步：** C1 的 proposed 卡在 A2 直写真机证据就绪后呈批；C2 等本人一句"P3 现在做不做"；默认 v1 只做 assistant 消息。

## 已知与未决

| # | 项 | 状态 |
|---|---|---|
| 1 | 技能正文、用量、出处在哪 | **已取证**：`scanLearnedSkills`（name/description/origin/learnedAt）+ `skillUsage`（count/lastUsedAt/since）+ `metadata.source`（需 scan 暴露或 route 读 frontmatter）。**成本维今天没有数据源** |
| 2 | 消息级动作槽存在吗 | **存在但只收 assistant 消息**（`conversation.chat.assistant-actions`，list / session / `messageId`）；没有用户消息动作槽 |
| 3 | C1 与 C2 是否同卡 | 同卡两片，**分开验收**；C1 等 A2 直写证据 + proposed 卡；C2 等本人一句 |
| 4 | 技能退役的语义 | 复用既有退役（移出模型目录、进 `skills/archive/`，不删、可恢复），不新增状态；A2 route 补 `recordApproval` 的 `retire` 行 |
| 5 | 成本列怎么办 | **v1 省略**（默认）；要保留只报 always-on 字节（name+description）估算并标"估算"；不用整份 `SKILL.md` 字节冒充常驻成本 |
| 6 | "记下来"记哪条消息 | **v1 = assistant 消息**；用户自己那条消息是后续片（无现成槽）。文本由 host 用 `ctx.sessionQuery` 取，不信 client 传的正文 |
| 7 | 记忆 `why` | **没有该字段**；C2 写 `source: panel:message:<sessionId>/<messageId>` + 逐字文本 + `kind=fact`（或本人选的 kind）；不写 `why` |
| 8 | 预算门 | `saveMemory` 在 digest 已挤出记忆行时拒绝纯新增；C2 要处理这个负例并给可读提示 |

## 方案与取舍

| 片 | 做什么 | 要点 |
|---|---|---|
| **C1 技能面** | **已交付**（2026-10-19）：`source` + usage join + `readLearnedSkill` + 技能 tab + 退役；note = [learned-skills](../../notes/implemented/2026-10-19-learned-skills.md)。原方案：逐件列表：名字 / 调用次数 / 最近使用 / 出处（`metadata.source`）/ 正文只读抽屉 / 一个"退役" | host 读 = `scanLearnedSkills`（补 `metadata.source`）+ `skillUsageLines`（count/lastUsedAt/days）+ 读 `SKILL.md` 正文；**不给新 scanner**；列表只列 `skills/` 房间（learned provider 的实际枚举），不是模型技能目录全集；退役复用 `retireSkill` + A2 台账；正文 hash 校验 |
| **C2 "记下来"** | **已交付**（2026-10-19）：`assistant-actions` 槽 + `memory.remember` + `sessionQuery` 逐字 + budget 负例；note = [message-remember](../../notes/implemented/2026-10-19-message-remember.md)。原方案：消息动作"记下来"：取该条 **assistant 消息**（durable id）→ host 用 `ctx.sessionQuery` 取逐字文本 → 生成记忆（`active`，`source: panel:message:<sessionId>/<messageId>`，`kind=fact`；不写 `why`）→ 面板收据显示 | 走 A2 同一条写车道；**A2 白名单只为这一条开口**（来源=消息 id 的新建），其余新建仍拒；一次点击即确认，不做候选态；不做模型抽取；`saveMemory` 满预算时返回可读拒绝 |

**成本口径（C1）：** v1 默认不加 token 成本列；若本人要，只显示 `name+description` 的 always-on 字节估算（标注"估算"），并说明正文是按需加载、不计入常驻。不要拿整份 `SKILL.md` 字节 ÷4 冒充当常驻成本——那会误导退役判断。

**做法取舍：**

- **不做技能"新建"表单**：新技能必须由模型写过一次（`save_skill` 有引用完整性检查），人填表等于绕过检查。
- **不在 UI 里区分"自学"与"作者写"**：外部无先例；列表只覆盖 learned room，`metadata.source` 用作出处；`origin` 只作辅助标记。
- **不做"记下来"进候选队列**：一次确认即入库，撤销靠退役（外部同形：Claude Code / Letta 的 remember 都是直接写）。
- **不做用户消息动作 v1**：没有现成槽；不替换 shipped renderer；要做得另开片。
- **不做模型抽取**：C2 存逐字消息，零模型回合；否则 P3 的成本/延迟都不成立。

## 验收标准

| # | 行为 / 判据 | 类 | 输入状态与通过信号 | 负例或互补态 | 证据 owner | 人判 |
|---|---|---|---|---|---|---|
| 1 | 列表 = 学到技能真值 | 确定性 | 3 件 fixture → 3 行；每行有名字/次数/最近/出处（`metadata.source`，缺则"未知"） | 半成品行（缺 `source`/`origin`）显示"未知"而非丢行 | `tests/host/skills-route.spec.ts` | 无 |
| 2 | 列表只列 learned room | 确定性 | 只列 `skills/` 的实际枚举（`scanLearnedSkills`）；curated 技能不出现 | 负例：目录外的技能文件不出现；模型技能目录全集 ≠ 本列表 | 同上 + `tests/client/client-skills-panel.spec.ts` | 无 |
| 3 | 退役生效且可回滚 | 编排 | 退役后模型目录、摘要计数、技能列表三处同时消失 | `skills/archive/` 有原件（断言文件存在）；`retireSkill` 的 `retiredAt/retireReason` 在 | `tests/host/skills-route.spec.ts` | **是**（本人点一次再恢复） |
| 4 | 退役留痕 | 确定性 | 审批账追加 `source: panel-direct` + 技能名 + 前后状态（或 kind/id/source；若 A2 的 schema 不扩） | 负例：kind 越界被拒；`retireSkill` 自身不写行 → 由 route 补 | `tests/host/approval-audit.spec.ts` + 同 route spec | 无 |
| 5 | 正文只读抽屉 | 确定性 | 抽屉内容与磁盘 `SKILL.md` 逐字一致（hash 比对） | 读失败显示可读错误，不显示空面板 | `tests/client/client-skills-panel.spec.ts` | **是**（本人看一件正文） |
| 6 | "记下来"生成一条记忆 | 编排 | 点击 assistant 消息 → `memory/` 新增一条：`source: panel:message:<sessionId>/<messageId>`、逐字文本、`kind=fact`、摘要下一轮可见 | 负例：来源不是消息 id 的新建仍被白名单拒；消息 id 解析不到 → 拒绝；满预算 → 可读拒绝 | `tests/host/rooms-actions.spec.ts` + `tests/client/client-message-action.spec.ts` | **是**（本人点一条看结果） |
| 7 | 动作槽只增不改标准行 | 编排 | 未点击时出厂既有动作 id 一个不少、语义不变；新 action 是追加项 | 负例：替换/删除 shipped 动作 → 红；"集合完全相等"不是判据 | `tests/client/client-message-action.spec.ts` | 无 |
| 8 | 零模型回合 | 编排 | 列表/退役/记下来全走 host 路由；客户端 spec 断言没有 `remote.session.prompt`；会话日志无新 panel 消息 | 不用 `proactive-idle-probe` 单独证明（它只数文件） | `tests/client/client-skills-panel.spec.ts`、`client-message-action.spec.ts` + 会话日志断言 | 无 |
| 9 | 收尾 | — | `pnpm typecheck && pnpm test && pnpm verify` 绿；动 client 先 `pnpm build` + `pnpm web-expected`（新 tab/动作过目 diff 后重录）+ `pnpm shots`；新增 slot 注册跑 `pnpm gen-catalog`；动发布物/exports 加 `pnpm release-smoke` | — | 命令本身 | 无 |

## 关闭条件

C1（必做，等 A2 直写证据 + proposed 卡）与 C2（按本人一句决定是否现在做；v1 默认 assistant 消息）落地且上表有真证据；技能在面板上"能看能退"，"记下来"一次确认即生效且零模型回合；结论与去向按[关闭条件](../README.md#关闭条件)交接后归档。
