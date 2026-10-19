---
status: 等人拍板
opened: 2026-10-19
---

# 推敲：学到的东西——技能逐件可见与"记下来"（C 卡：P2/P3）

> 立卡：2026-10-19 ｜ 状态：等人拍板 ｜ 类型：Feature ｜ 可关闭：否 ｜ 毕业：做现在 ｜ 下一步 = C1 待 A2 车道就绪即可开工；只有 C2 等本人一句（P3 是否现在做）

> **依赖：** C1 复用 A 卡 A2 的直写车道（含它"真机可达"的先决证据）；C2 需 A2 白名单加一条（见 A 卡 A2 末句）。依据档 [self-update/261019-self-update-lanes](../research/self-update/261019-self-update-lanes.md) §一（技能两写入口）、§三 D5。

**问题与期望结果：** 产品判据 P3 要求"学到了什么，用户能看、能改、能删"（[README](../../README.md)），而技能是三处来源里**最看不见**的一处：面板只有一个计数，正文要开文件，退役只能靠对话；直写 `save_skill` 无门、用量账本只有 curate 会读。同时"我想让它记住这句"今天只能靠一句含糊的"记一下"。要的是：**逐件看到技能（名字/用量/最近使用/出处/正文）+ 一键退役**；以及**在消息上直接说"这条留着"**，一次确认就进记忆。
**当前情况：** 技能两写入口（`save_skill` 直写 / `propose_skill` → 人改 approved → `land_skill`）与用量账本 `skill-usage.json` 都在——但账本只记 **load 次数**（`src/host/skills-room.ts`），**没有逐技能 token 成本**；正文要读文件。消息级动作槽 `conversation.chat.assistant-actions` 在 vendor 里是**既有 slot**（`list`，每格收到 durable message id，不改它就是"标准动作行不变"）。
**下一步：** C1 不等本人（A2 就绪即开工）；C2 等一句。

## 已知与未决

| # | 项 | 状态 |
|---|---|---|
| 1 | 技能正文、用量、出处在哪 | 已取证（依据档 §一；`metadata.origin` + `skill-usage.json` 的 load 计数）。**成本维今天没有数据源** |
| 2 | 消息级动作槽存在吗 | **存在**（vendor slot catalog：`conversation.chat.assistant-actions`，list / session scope / durable message id） |
| 3 | C1 与 C2 是否同卡 | 同卡两片，**分开验收**；C1 不依赖那句确认 |
| 4 | 技能退役的语义 | 复用既有退役（移出模型目录、进 `archive/`），不新增状态 |
| 5 | 成本列怎么办 | 二选一：**用 `SKILL.md` 字节数 ÷4 估算并标注"估算"**（建议），或把成本列推到后续切片 |

## 方案与取舍

| 片 | 做什么 | 要点 |
|---|---|---|
| **C1 技能面** | 学到技能逐件列表：名字 / 调用次数 / 最近使用 / 出处（`metadata.origin`）/ 状态（**成本列按上表第 5 行二选一**）；点开只读抽屉看全文；一个"退役" | 列的形状**借** Claude Code `/skill-doctor` 的 Stats 页（成本 + 次数 + 关在哪）——但本次只有次数是现成数据，成本是估算，卡上明说；复用 A2 车道与审批账（`source: panel-direct`） |
| **C2 "记下来"** | 消息动作"记下来"：取该条消息（或选中片段）→ 生成记忆（active，`source: panel:message:<id>`，带 `why`）→ 面板收据显示 | 走 A2 同一条写车道；**A2 白名单为此只加这一条**（来源=消息 id 的新建），其余新建仍拒；不做候选态 |

**做法取舍：**

- **不做技能"新建"表单**：新技能必须由模型写过一次（`save_skill` 有引用完整性检查），人填表等于绕过检查。
- **不在 UI 里区分"自学"与"作者写"**：外部无先例（Claude Code 的 Stats 不分来源），本仓用 `metadata.origin` 标出处即可。
- **不做"记下来"进候选队列**：一次确认即入库，撤销靠退役（外部同形：Claude Code / Letta 的 remember 都是直接写）。

## 验收标准

| # | 行为 / 判据 | 类 | 输入状态与通过信号 | 负例或互补态 | 证据 owner | 人判 |
|---|---|---|---|---|---|---|
| 1 | 列表 = 学到技能真值 | 确定性 | 3 件 fixture → 3 行；每行有名字/次数/最近/出处 | 半成品行（缺 `origin`）显示"未知"而非丢行 | `tests/host/` 技能列表 spec | 无 |
| 2 | 列表不含不可调用技能 | 确定性 | 只列模型技能目录内的条目（判据 = 该目录的实际枚举，不是 vendor 内部符号） | 负例：目录外的技能文件不出现 | 同上 | 无 |
| 3 | 退役生效且可回滚 | 编排 | 退役后模型目录、摘要计数、技能列表三处同时消失 | `archive/` 里有原件（断言文件存在） | `tests/host/` spec | 无 |
| 4 | 退役留痕 | 确定性 | 审批账追加 `source: panel-direct` + 技能名 + 前后状态（kind = `retire`，见 A 卡 A2） | 负例：kind 越界被拒 | 同上 | 无 |
| 5 | 正文只读抽屉 | 确定性 | 抽屉内容与磁盘 `SKILL.md` 逐字一致（hash 比对） | 读失败显示可读错误，不显示空面板 | `tests/client/` 抽屉 spec | 无 |
| 6 | "记下来"生成一条记忆 | 编排 | 点击后 `memory/` 新增一条：`source: panel:message:<id>`、`why` 非空、摘要下一轮可见 | 负例：来源不是消息 id 的新建仍被白名单拒 | `tests/host/` spec + 审批账断言 | 无 |
| 7 | 动作槽不改标准行 | 编排 | 未点击时消息动作行与出厂一致（既有动作 id 集合不变） | — | `tests/client/` 组件 spec | 无 |
| 8 | 零模型回合 | 编排 | 列表/退役/记下来都是宿主路由或直写：`dev/probes/web/proactive-idle-probe.mjs` 断言无会话、无模型回合 | — | 探针 JSON 判决 | 无 |
| 9 | 收尾 | — | `pnpm typecheck && pnpm test && pnpm verify` 绿；动 client 先 `pnpm build` + `pnpm shots`；动技能目录加 `pnpm gen-catalog && pnpm build && pnpm eval` | — | 命令本身 | 无 |

## 关闭条件

C1（必做）与 C2（按本人一句决定是否现在做）落地且上表有真证据；技能在面板上"能看能退"，"记下来"一次确认即生效；结论与去向按[关闭条件](../README.md#关闭条件)交接后归档。
