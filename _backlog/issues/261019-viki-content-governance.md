---
status: 等人拍板
opened: 2026-10-19
---

# 推敲：Viki 的内容面——可枚举、可读、可删、冲突并排（B 卡：P1）

> 立卡：2026-10-19 ｜ 状态：等人拍板 ｜ 类型：Feature ｜ 可关闭：否 ｜ 毕业：做现在 ｜ 下一步 = 本人一句：越界记录**整批清除**还是**先看清单**

> **依赖与自家缝：** 面板骨架沿用 A 卡（[维护面收口](261019-self-update-lanes.md)）的 A1，但**宿主路由是 B 自己新增的**：`assistantViki` 路由（形状照 `desk-projection` 的 `ctx.connection.fetch.register` + 照 `knowledge-approve-remote` 的 Remote 方法），负责 fetch `127.0.0.1:1933`（dev auth）——A 卡不拥有任何 Viki 路由，别读成"继承"。
> **依据：** [依据档](../research/self-update/261019-self-update-lanes.md) §5.2（实测）/§5.3（冲突判据）；外部先例（删除留痕用底层 VCS 的 author/时间、作用域优先于审批）在 [先例档](../research/memory-panel/261019-file-memory-panel-precedents.md)。

**问题与期望结果：** Viki 的记忆今天**没有读者也没有写者**——`ov-shield` 只挡了它的工具面与技能面，抽取物仍然自动进每轮画像/召回块；人能看见它的唯一方式是"觉得它记错了"。真代价付过一次：真机往返里助手主动指出长期记忆压着**另一家的**底子（[pin note](../../notes/implemented/2026-10-19-openviking-pin-catch-up.md) 遗留节，记作 14 条，**那是另一次运行看到的、本机不可复核**）。要的是：**能列出它记得什么、能读正文、能一条一条删（删得回来）、两条矛盾时能并排看见并指定以哪条为准**。
**当前情况：** 依据档 §5.2 的实测推翻了"不可控"这个前提：server 0.4.22 的 `fs/ls?recursive` / `content/read` / `DELETE /api/v1/fs` / `snapshot/commit|diff|restore` 全现成，抽取物是 `viking://user/<space>/memories/{profile.md,preferences,entities,events}` 下的**文件**；注入面只读 `profile.md` + `preferences/` + `entities/`（vendor `shared/profile-inject.mjs`）。缺的是调用者与面，不是能力。本机 dev 工作区只有 `identity.md`/`soul.md`（模板态）——**那批越界记录不在这里，本机到不了**。
**下一步：** 本人确认口径后开工 B1；B2 的写面与 A2 同形，可并行。

## 已知与未决

| # | 项 | 状态 |
|---|---|---|
| 1 | 抽取物存在哪、注入读哪些路径 | 已实测（依据档 §5.2，含 API 名与 vendor 源码位置） |
| 2 | 能否逐条删、能否回滚 | **能**（`fs DELETE` + `snapshot/restore`）——推翻"删除没有出口"的旧判断 |
| 3 | 那批越界记录在哪 | **不在本机任何工作区**（全仓只有 `.tmp/openviking/workspace`）；pin note 那 14 条来自另一次运行 |
| 4 | 越界数据怎么处置 | **建议整批清除**（越界是 scope 错误，不是值错误），但本机执行不了 → 见「谁执行 B4」 |
| 5 | "冲突并排"是否进本卡 v1 | 建议进（它是"冲突时别乱删"的唯一可执行形态） |

## 方案与取舍

| 片 | 做什么 | 要点 |
|---|---|---|
| **B1 可枚举 + 可读** | `assistantViki` 只读路由把 `memories` 树投影成条目（uri / 分类 / 标题 / 摘要 / mtime / 正文）；面板逐条可读 | 复用 A1 的面骨架；列表只取 `fs/ls` 的 `abstract`，正文按需 `content/read` |
| **B2 逐条删（带备份）** | 删除 = 先 `snapshot/commit` → `fs DELETE` → 回执 | 删除前查同 key 的活跃副本与 `supersedes` 指针，命中则要求二次确认（Viki 的记录**不被知识页 `sources` 引用**——两套库没有交叉指针，卡上不假装有） |
| **B3 冲突并排** | 两条矛盾时并排展示 + "以哪条为准"；点完 = **删除**另一条（带备份） | 与房间侧 §5.3 同一套语义；Viki 侧没有 `retired` 状态，落体就是"带备份的删除"，措辞不许写成"退役" |
| **B4 存量清理** | 越界批次的整批清除：判据脚本 + 回执 + 该工作区 memories 树 snapshot | **两部分**：本机做"判据 + 流程在 fixture 上跑通"；真数据在另一份工作区，见下 |

**谁执行 B4（本卡唯一的人机分工）：** 越界数据**不在本机**，实现者到不了。所以本卡交付一个可重跑的清理脚本（输入 = 工作区路径，输出 = 回执 json：清了什么、备份在哪），在 fixture 上证明正确；**真数据由本人在那份工作区执行一次并把回执路径填回本卡**。这行是"本人条目"，不代判。

**做法取舍：**

- **不做候选层/事先审批**：外部没人这么做（依据档 §四 结论 1），且内容本来就可枚举可删（§5.2）——套队列是把可控当不可控。
- **不做逐条挑那批越界记录**：逐条挑等于逼人读别家经营数据；越界是 scope 错误。
- **不做"把 Viki 灌进房间"**：抽取质量不足以当权威（本次会话标题把上下文误当事实就是新反证）；房间仍是唯一权威，Viki 是情景层。
- **不接 `profile.md` 掐中间的改造**：先把可读可删做出来，截断行为留给真机读数决定。

## 验收标准

| # | 行为 / 判据 | 类 | 输入状态与通过信号 | 负例或互补态 | 证据 owner | 人判 |
|---|---|---|---|---|---|---|
| 1 | 列表 = server 真值 | 编排 | 面板条目数 == `fs/ls?recursive=true` 叶子数（3 条 fixture） | host spec 用 mock server；真机读数另记 | `tests/host/` `assistantViki` spec | 无 |
| 2 | 正文能读全 | 确定性 | `content/read` 原样正文，≥2000 字不截断；截断必须标注 | 空文件 / 读失败各有可读回执 | 同上 + `tests/client/` 抽屉 spec | 无 |
| 3 | 删除可回滚 | 编排 | 删一条 → `snapshot/restore` 后 content hash 与原件相等 | 无 snapshot 时**拒绝删除**（负例） | `tests/host/` spec（fixture 文件树） | 无 |
| 4 | 删除有引用证明 | 确定性 | 同 key 活跃副本 / `supersedes` 指向命中 → 二次确认后才删 | 负例：命中指针时首点被拒并列出指向者 | 同上 | 无 |
| 5 | 冲突并排 | 编排 | 两条矛盾条目并排可见；指定"以 A 为准"后 B **被删除（带备份）**且 A 保留 | 未指定时两条都留（不得自动删） | `tests/client/` + `tests/host/` spec | 无 |
| 6 | 清理流程在 fixture 上跑通 | 确定性 | "越界 + 在域"混合 fixture：脚本只清越界、回执记录清了几条与备份路径 | 负例：越界判据为空时**一条都不清** | 脚本 spec（`tests/tooling/` 或 `tests/host/`） | 无 |
| 7 | 真数据清理（本人条目） | — | 本人在那份工作区执行脚本并回填回执路径；`fs/ls` 与 `stats/memories` 双读数都不含旧公司实体 | 未执行 = 本卡不关 | 人工回执 | **是** |
| 8 | 零模型回合 | 编排 | 列表/读正文/删除全走宿主路由：`dev/probes/web/proactive-idle-probe.mjs` 断言无会话、无模型回合 | — | 探针 JSON 判决 | 无 |
| 9 | 收尾 | — | `pnpm typecheck && pnpm test && pnpm verify` 绿；动 client 先 `pnpm build` + `pnpm shots`；动 vendor 插件则 `pnpm release-smoke` | — | 命令本身 | 无 |

## 关闭条件

B1–B3 落地且上表 1–6、8–9 有真证据；第 7 行（真数据清理）由本人执行并回填回执路径；本人在真机上确认"能列出、能读、能删、删得回来"；结论与去向按[关闭条件](../README.md#关闭条件)交接后归档。
