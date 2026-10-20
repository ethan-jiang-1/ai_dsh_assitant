---
status: 推敲中
opened: 2026-10-20
---

# 推敲：按需检索与 Viki 人审闭环——只读 MCP allowlist vs DSH native tool

> 立卡：2026-10-20 ｜ 状态：推敲中 ｜ 类型：Feature ｜ 可关闭：否 ｜ 实施卡，未授权开工

**给评审者的最短路径：** 先读「问题与期望结果」→「方案与取舍」→「验收标准」。  
上游背景与审计证据在 [方向评审卡](261020-openviking-direction-review.md)；部署/检测在 [部署卡](261020-openviking-deploy-doctor.md)；升级/存储/旋钮在 [运行态卡](261020-openviking-runtime-repair.md)。**本卡不授权写代码。**

## 问题与期望结果

**观察到的行为：** 层 1 只有“自动注入”：

- 自动 recall 每轮给一段有界内容；模型不能按需 `search` / `read` / `tree` / `grep`，指针展开不了，问“上次那个客户的具体条款”只能靠 DSH 的 `session_query` 或碰运气。
- `ov-shield` 整前缀拒 `mcp__openviking__*`，写面守住是对的，但把只读面也一起拒了；层 1 note 的前提是“召回块内联叶子内容”，而当前 dev 没有 `recallContextTimeoutMs: 3000` 强制 find，context 模式很可能只给目录/摘要级指针——正好落在“只给指针、又没法展开”的缝里。
- Viki 能列/读/删/恢复/并排比较/scope 清理，但没有搜索、没有“把这条情景记忆转正到 `memory/`”、没有健康/任务/用量；`problems` 也不展示。人审闭环只完成一半。
- 0.5.x 的 skills / experiences、DSH 的 `ctx.skills` / `message-feedback` / `session-projection` / `agent-team` 都没有接入或评估。

**期望结果：** 模型在需要时能按需取记忆细节；人能在 Viki 里搜到、看懂、转正、删除；写面仍由 `ov-shield` 守住；不把 12 个 MCP 工具全放进来；不绕过 DSH 治理。

**完成条件：** 只读检索完成 A/B 并记录裁决；选中的路径有测试与 E2E；Viki 搜索/转正/健康可用；未做的 skills/experiences 有明确触发条件。

## 当前情况

| 事实 | 证据 |
|---|---|
| 整前缀拒 | [ov-shield](../../packages/dsh-smart-assistant/src/agent/ov-shield/index.ts) 的 `denyToolPrefix: mcp__openviking__`；`ov-shield` 行在 [cordis.patch.yml](../../packages/dsh-smart-assistant/cordis.patch.yml) |
| DSH 支持 allow list | [tools.md](../../vendor/dsh/docs/subsystems/tools.md) 第 165–174 行：`ToolRestriction` 有 `allow`/`deny`；scoped 注册豁免 |
| 层 1 的两种判断 | 正式推敲卡 §七 说 context 模式只出指针，叶子要靠只读工具；层 1 note 说召回块内联叶子、只读工具冗余。差别在 recall 走哪条路（`recallContextTimeoutMs` 强制 find 时叶子进块） |
| 当前 dev 没强制 find | [profile-patch.yml](../../dev/profiles/profile-patch.yml) 无 OV config；v3 只在 [dev-ov](../../dev/harness-home/profiles/dev-ov/cordis.patch.yml) |
| 当前 recall 实际失败 | `POST /search/search` 的 `retrieval_errors`；真实会话日志 recall 块 0 |
| Viki 已有 | 列/读/删/恢复/并排比较/scope 清理；[viki-read note](../../notes/implemented/2026-10-19-viki-read.md)、[viki-delete note](../../notes/implemented/2026-10-19-viki-delete.md)、[viki-cleanup note](../../notes/implemented/2026-10-19-viki-cleanup.md) |
| Viki 缺 | 搜索/筛选、转正到 `memory/`、健康/任务/用量、`problems` 展示、分页 |
| 0.5.x skills/experiences | server 有 `memories/experiences` 目录、`agent-evolution` 端点、`skills` API；插件 `captureToolResults` 注释说“Experience usage records need completed tool results” |
| DSH 新缝 | `ctx.tools.restrict.allow`、`ctx.skills` provider、`client` slots、`session-query`、`message-feedback`（log-only）、`session-projection`、`agent-team`（成员 `origin: subagent`）、`token-meter` |

## 方案与取舍

### A. 只读检索：两条路

| 方案 | 做法 | 优点 | 代价 | 判断 |
|---|---|---|---|---|
| **A1. MCP allowlist** | `ov-shield` 增加 `allowToolNames`；只放 `mcp__openviking__search` / `read` / `list` / `tree` / `grep` / `glob`；其余继续拒 | 上游维护工具描述/参数；与 server 版本同步；实现小 | 每轮多 6 个 tool schema；模型可能在 `assistant_memory` / `session_query` / `search` 之间选错；MCP 桥仍挂全量，只是不可见 | 候选；先量 |
| **A2. DSH native tool** | 新增 `assistant_recall`（search/read/tree 三动词），内部走 OpenViking HTTP；presenter + scope | 1 个 tool schema；动词与四房间一致；可控 presenter/日志/权限 | 要自己维护 server API 差异；重复上游能力；需要测试 | 候选；先量 |
| A3. 不放 | 继续只靠自动 recall | 零新面 | “问细节”无解；指针展开不了 | 不选 |
| A4. 全放 | 12+ 工具全开 | 最“充分” | 写面风险、工具噪声、错房间 | 不选 |

**建议先做 A1/A2 的 A/B，不先实现。** 度量：
- tool schema token（每轮成本）；
- 固定问题集上的“是否调用正确工具 / 能否答出细节 / 引用是否正确”；
- 延迟；
- 维护成本（升级 server 时谁先坏）。

如果 A1 的 token 成本可接受且命中更好，选 A1；如果工具选择噪声大/成本高，选 A2。**没有数据不拍。**

### B. Viki 人审闭环

| 能力 | 现状 | 建议 |
|---|---|---|
| 搜索/筛选 | 无 | 在 Viki 顶部加 search，走 `/search/search` 或本地过滤；结果带 memory_type/peer/summary；不改现有列表 |
| 健康/任务/用量 | 无 | 展示 server 状态、最近 commit 任务、pending queue、`stats/memories`、调用 token；`problems` 直接显示 |
| 转正到 `memory/` | 无 | 行内“转正” → 预填 `assistant_memory save` 的草稿（`source: openviking:<uri>`）→ 人确认 → 写 `memory/`；审计记 `source: panel-direct` 或模型回合 |
| 编辑/新增 | 无 | 先不做；转正走 `assistant_memory`，避免 Viki 变成第二个写面 |
| 删除/恢复/比较 | 已有 | 保持；删除前的 references/commit 语义不变 |
| 分页/大列表 | 无 | 先搜索；记忆上千再分页 |

**转正的治理语义：** OpenViking 是第二储存层，不是权威；转正 = 人把一条情景记忆提升为 `memory/` 的策展事实，必须走 `assistant_memory save` 的既有校验（一条一个断言、来源、预算闸门）。Viki 不直接写 `memory/` 文件。

### C. 与 DSH 的分工

- `assistant_memory`：权威、策展、人审。
- `assistant_recall` / MCP read：OpenViking 情景记忆的按需检索。
- `session_query`：DSH 原始会话证据。
- `assistant_knowledge`：我们提炼过的知识页。
- 需要一段**路由指引**（工具 description 或 operating brief）：什么时候用哪个；避免“到处找记忆”。
- `ctx.skills`：OpenViking skills 的 provider 是 P3；先确认 server 技能目录有真实内容。
- `message-feedback`：log-only；O4 的 👎 → 修正提案要自建消费者，不在本卡。
- `session-projection`：不为外部健康造投影；用 client slot/route。
- `agent-team`：`skipSubagentSessions` 会跳过团队记忆；本卡不改，留给运行态卡拍板。
- `token-meter`：云端例外下，把 recall 块/工具调用的 token 成本显示在 Viki/usage；本卡可做最小读数。

## 非目标

- 不放写面（`remember` / `write` / `edit` / `forget` / `add_resource` / `add_skill`）。
- 不做自动转正/自动修正；转正必须人确认。
- 不接 Gateway、不启用 takeover。
- 不做 OpenViking skills/experiences 的实现；本卡只做“是否值得”的调研与触发条件。
- 不把 Viki 做成第二个 `assistant_memory` 写面。

## 未决问题（评审用）

1. **A/B 的判据**：tool schema token 上限是多少？固定问题集怎么定？谁来做人工评分？
2. **召回路径**：先修 `recallContextTimeoutMs`/find 再测，还是 A/B 与运行态卡并行？如果 recall 仍然只给指针，A1/A2 的价值更高。
3. **Viki 转正的落点**：只写 `memory/`，还是也允许 `knowledge/` 的 `sources` 引 OpenViking URI？后者会扩大治理面。
4. **skills/experiences**：0.5.x 是否随 commit 自动生成 experiences？如果会，是否应该 surface？如果不，`captureToolResults` 的价值是什么？
5. **agent-team**：团队记忆是资产还是污染？`skipSubagentSessions` 是否要按 origin/preset 细分？
6. **反馈**：`message-feedback` 是 log-only；O4 的修正消费者是否值得现在做，还是等真实 👎 数据？
7. **工具选择**：模型会不会在 `assistant_memory recall`、`assistant_recall`、`session_query`、`assistant_knowledge` 之间选错？路由指引放哪（工具 description / operating brief / skill）？

## 验收标准

### A/B（先做，决定是否实施）

- [ ] 固定问题集 ≥10 条，覆盖：偏好、事件、决策、跨 peer、无答案；每条有期望来源/答案。
- [ ] A1/A2 各跑一遍，记录：tool schema token、工具调用次数/正确率、答案质量、延迟、失败模式。
- [ ] 裁决写成一行：选 A1 / 选 A2 / 都不选（继续自动 recall），附证据与输掉的理由。
- [ ] 若选 A1/A2，实施后同一问题集复跑，质量不低于 A/B 的赢家。

### A1（若选）

- [ ] `ov-shield` 新增 `allowToolNames`（或等价），只读白名单生效；写工具仍不可见；`list()` 中立视图的预期残余有记录。
- [ ] 单测：allowlist 只放指定名；新增 `mcp__openviking__write` 仍被拒；OpenViking 缺席时零影响。
- [ ] 组合断言：请求的 tool schema 里只出现白名单；token 成本记录。
- [ ] E2E：问一个答案在旧记忆里的问题，模型调用只读工具并引用 URI/内容。

### A2（若选）

- [ ] 新工具 `assistant_recall` 有 name/description/参数 schema；`presenter` 显示来源与摘要；scope 只读配置的 space/peer。
- [ ] 单测：search/read/tree 三动词；越界 URI 拒绝；server 缺席返回可读错误；不泄露 key。
- [ ] E2E：同 A1；模型不需要 MCP 命名空间。
- [ ] `docs/package-catalog.md` 重生成；`pnpm gen-catalog` freshness 绿。

### Viki

- [ ] 搜索：输入关键词返回匹配行（summary/event_name/正文），带类型/peer/URI；空结果与“未连接”区分。
- [ ] 健康/任务/用量：显示 server 状态、最近 commit、pending queue、`stats/memories`、`problems`；红/绿可读。
- [ ] 转正：行内“转正” → 预填 `assistant_memory save` 草稿（`source: openviking:<uri>`）→ 人确认 → 写 `memory/`；审计有记录；不直接写文件。
- [ ] 现有删除/恢复/比较不回归；`client-viki-panel` 测试更新。
- [ ] `pnpm web-expected` 两场景不漂移；`pnpm verify` 通过。

## 关闭条件

- A/B 裁决记录；选中的路径实施并验收；未选路径写“输掉的方案”。
- Viki 搜索/健康/转正落地；未做的编辑/分页/技能/经验写去向。
- 若 A/B 结论是“都不选”，本卡以结论关闭，不实施；写清触发重开的条件（例如记忆量/问题频率）。
- 用户 review 通过；`_backlog/issues/README.md` 更新。

## 关联

- [方向评审卡](261020-openviking-direction-review.md)
- [部署与 doctor](261020-openviking-deploy-doctor.md)
- [运行态与 0.5.1](261020-openviking-runtime-repair.md)
- 既有：[层 1 note](../../notes/archived/2026-10-04-openviking-layer1-landing.md)、[正式接入卡 §七](../_archive/settled_issues/260929-openviking-formal-integration.md)、[viki-read note](../../notes/implemented/2026-10-19-viki-read.md)、[tools.md](../../vendor/dsh/docs/subsystems/tools.md)
