---
status: 推敲中
opened: 2026-10-20
---

# 推敲：按需检索与 Viki 人审闭环——只读 MCP allowlist vs DSH native tool

> 立卡：2026-10-20 ｜ 状态：推敲中 ｜ 类型：Feature ｜ 可关闭：否 ｜ 已授权实施（H1 B / H2–H6 按建议）｜ 推进台账 = [收口卡](261021-openviking-viki-closure.md)

**给评审者的最短路径：** 先读「问题与期望结果」→「当前情况」→「方案与取舍」→「验收标准」→「下一步」。  
上游背景与审计证据在 [方向评审卡](../_archive/settled_issues/261020-openviking-direction-review.md)；部署/检测/Viki baseUrl 在 [部署卡](261020-openviking-deploy-doctor.md)；升级/存储/旋钮在 [运行态卡](261020-openviking-runtime-repair.md)。**本卡不授权写代码。**

## 问题与期望结果

**观察到的行为：** 层 1 只有“自动注入”：

- 自动 recall 每轮给一段有界内容；模型不能按需 `search` / `read` / `tree` / `grep`，指针展开不了，问“上次那个客户的具体条款”只能靠 DSH 的 `session_query` 或碰运气。
- `ov-shield` 整前缀拒 `mcp__openviking__*`，写面守住是对的，但把只读面也一起拒了；层 1 note 的前提是“召回块内联叶子内容”，而当前 dev 没有 `recallContextTimeoutMs: 3000` 强制 find，context 模式**实物已证**只给目录/摘要级指针（2026-10-19 的 recall 只有 overview + “用 search/read 展开”提示）——正好落在“只给指针、又没法展开”的缝里。
- Viki 能列/读/删/恢复/并排比较/scope 清理，但没有搜索、没有“把这条情景记忆转正到 `memory/`”、没有健康/任务/用量；读取器已返回的 `problems`（树遍历/统计读取失败数组）也不展示。人审闭环只完成一半。
- 0.5.x 的 skills / experiences、DSH 的 `ctx.skills` / `message-feedback` / `session-projection` / `agent-team` 都没有接入或评估。

**期望结果：** 模型在需要时能按需取记忆细节；人能在 Viki 里搜到、看懂、转正、删除；写面仍由 `ov-shield` 守住；不把 16 个 MCP 工具全放进来；不绕过 DSH 治理。

**完成条件：** 只读检索完成 A/B 并记录裁决；选中的路径有测试与 E2E；Viki 搜索/转正/健康可用；未做的 skills/experiences 有明确触发条件；A/B 原型不进发布物。

## 当前情况

| 事实 | 证据 |
|---|---|
| 整前缀拒 | [ov-shield](../../packages/dsh-smart-assistant/src/agent/ov-shield/index.ts) 的 `denyToolPrefix: mcp__openviking__`；`ov-shield` 行在 [cordis.patch.yml](../../packages/dsh-smart-assistant/cordis.patch.yml) |
| DSH 支持 allow list | [tools.md](../../vendor/dsh/docs/subsystems/tools.md) 第 165–174 行：`ToolRestriction` 有 `allow`/`deny`；scoped 注册豁免 |
| 层 1 的两种判断 | 正式推敲卡 §七 说 context 模式只出指针，叶子要靠只读工具；层 1 note 说召回块内联叶子、只读工具冗余。差别在 recall 走哪条路（`recallContextTimeoutMs` 强制 find 时叶子进块） |
| 当前 dev 没强制 find | [profile-patch.yml](../../dev/profiles/profile-patch.yml) 无 OV config；v3 只在 `dev-ov` 探针（本机 live，`dev/harness-home/` 已 gitignore，不可从他机复现） |
| 当前 recall 实际失败 | `POST /search/search` 的 `retrieval_errors`；截至审计的 2026-10-20 会话 recall 块 0。**2026-10-21 复核**：`openviking-server doctor --config .tmp/openviking/ov.conf` 全绿，但 `/tasks` 仍有 failed commit——doctor 绿不等于检索可用 |
| 2026-10-19 的 recall 实物 | `session-7feeda6d…` 两条 recall 只含 `viking://user/default/resources` 与 `viking://resources`（都 `detail="overview"`）并提示用 `search/read` 展开；这两个工具正被 ov-shield 拒 |
| Viki 已有 | 列/读/删/恢复/并排比较/scope 清理；[viki-read note](../../notes/implemented/2026-10-19-viki-read.md)、[viki-delete note](../../notes/implemented/2026-10-19-viki-delete.md)、[viki-cleanup note](../../notes/implemented/2026-10-19-viki-cleanup.md) |
| Viki 缺 | 筛选 chips、转正到 `memory/`、分页；搜索/健康/任务/token 已接 |
| Viki `problems` 来源 | [client.ts](../../packages/dsh-smart-assistant/src/host/viki/client.ts) 的 `list()` 已返回 `problems: string[]`（树遍历/`stats` 读取失败），面板未展示；不是 server 的独立端点 |
| Viki 搜索端点 | 插件在**有 session** 时走 `/search/search`（session-aware），**无 session** 时走 `/search/find`；面板搜索应走 stateless `find`，不要复用 session-aware 路径 |
| 转正的两套审计不要混 | `ctx.approval.request` 要求**发起会话处于 open turn**（[approval.md](../../vendor/dsh/docs/subsystems/approval.md)）；Viki 面板点击没有 turn。Viki 现有 `recordApproval(..., 'retire', ...)` 是 **home 审计**（[approval-audit.ts](../../packages/dsh-smart-assistant/src/host/approval-audit.ts)），不是 DSH 的 `approval/asked`/`approval/decided` 对 |
| web-face 场景 | 2026-10-21 有 **3 个**：`blank-first-open`、`first-open-draft-banner`、`desk-eight-matters-first-open`；都不覆盖 Viki，清单以 [snapshots/web-face/](../../snapshots/web-face/) 为准 |
| 0.5.x skills/experiences | **0.4.22 实测**：`GET /api/v1/skills` 在场（root 为 `viking://user/default/skills` + `viking://agent/skills`，当前 0 条）；`viking://user/default/memories` 下没有 `experiences`（peer 下只有 `events`）；`GET /api/v1/agent-evolution` 返回 404。插件 `captureToolResults` 注释说“Experience usage records need completed tool results”，但 experiences 是否随 0.5.x commit 生成仍未证；0.5.1.1 未验 |
| DSH 新缝 | `ctx.tools.restrict.allow`、`ctx.skills` provider、`client` slots、`session-query`、`message-feedback`（log-only）、`session-projection`、`agent-team`（成员 `origin: subagent`）、`token-meter`、`ctx.approval`（open-turn 约束） |

## 方案与取舍

### A. 只读检索：两条路

| 方案 | 做法 | 优点 | 代价 | 判断 |
|---|---|---|---|---|
| **A1. MCP allowlist** | `ov-shield` 增加 `allowToolNames`；只放 `mcp__openviking__find` / `search` / `read` / `list` / `tree` / `grep` / `glob`；写工具与 `list_watches`/`cancel_watch`/`health` 继续拒 | 上游维护工具描述/参数；与 server 版本同步；实现小 | 每轮多 7 个 tool schema（实测 8 个只读子集 ≈2.2k token；A1 7 个略低，A/B 按实际 allowlist 重测）；模型可能在 `assistant_memory` / `session_query` / `find` 之间选错；MCP 桥仍挂全量，只是不可见 | **原型 `ab/a1-allowlist` @ `3fa7b4d`；12/12；pointer probe 资源发现被拒、0 MCP；需补 `allowServerResources`** |
| **A2. DSH native tool** | 新增 `assistant_recall`（find/search/read/tree 四动词），内部走 OpenViking HTTP；presenter + scope | 1 个 tool schema；动词与四房间一致；可控 presenter/日志/权限 | 要自己维护 server API 差异；重复上游能力；需要测试 | **原型 `ab/a2-recall` @ `629e79c`；12/12；pointer probe `read` 被调用成功；待修 400 错误信息** |
| A3. 不放 | 继续只靠自动 recall | 零新面 | “问细节”无解；指针展开不了 | 不选 |
| A4. 全放 | 16 个工具全开 | 最“充分” | 写面风险、工具噪声、错房间 | 不选 |

**A/B 结果（2026-10-21）：** A1 与 A2 各跑完 12 题；初评 91/96 vs 90/96，但**两侧工具面在 12 题内均未被调用**（A2 `assistant_recall` 0 次；A1 7 个只读 MCP 0 次），答案全部来自自动 recall 块——91/90 不是工具面成绩。**指针展开 probe（17:xx）：** A1 allowlist 生效后仍 0 MCP 调用：模型先 `list_mcp_resources`，被 `ov-shield` 的 `denyServerResources: openviking` 拒，退到文件 `read`；**A2 的 `assistant_recall read` 被调用并返回全文**（第二次 400，错误信息 `[object Object]`）。所以 **A2 是当前唯一被证明可达的按需读路径**；A1 必须补资源发现（`allowServerResources` 或工具描述自带 URI），否则 7 个工具“可见但不可发现”。A2 的 400 是待修 bug。完整证据见 [A/B note](../research/tech-exploration/261021-recall-ab.md) §7。

**建议先做 A1/A2 的 A/B，不先实现。** **A/B 是原型，不是生产实现**：A1 在一次性分支/工作树里给 `ov-shield` 加临时 allowlist（或等价临时 patch），A2 用一次性分支/临时工具；产物按 [requirements-probes](../methods/requirements-probes.md) 的原型纪律保留（分支/提交指针），**不进发布物、不合并**。A/B 跑完再决定是否实施。

度量：
- tool schema token（每轮成本）——**2026-10-20 实测（0.4.22 `tools/list`）：全部 16 个工具 ≈20.6KB ≈5.7k token；只读子集（find/search/read/list/tree/grep/glob/health，8 个）≈7.9KB ≈2.2k token。A1 白名单是 7 个（不含 health），按略低于 2.2k 估，A/B 实测为准。**
- 固定问题集上的“是否调用正确工具 / 能否答出细节 / 引用是否正确”；
- 延迟；
- 维护成本（升级 server 时谁先坏）。

如果 A1 的 token 成本可接受且命中更好，选 A1；如果工具选择噪声大/成本高，选 A2。**没有数据不拍。**

### B. Viki 人审闭环

| 能力 | 现状 | 建议 |
|---|---|---|
| 搜索/筛选 | **搜索已实现（2026-10-21）** | 顶部 search 走 **stateless `/search/find`**（host `?q=`；`/search/search` 是 session-aware）；结果带 peer/summary/score，URI 过白名单；空结果 / 未连接 / 检索错误三态分开；筛选 chips 暂未做（搜索先行）。**0.5.1.1 live `/search/find` 已返回真实命中（「合同」6 条）**；测试 mock 覆盖。 |
| 健康/任务/用量 | **已覆盖（2026-10-21）** | 诊断视图展示 `/health`、最近 commit（`/tasks`）、`stats/memories`、`/api/v1/skills`、`~/.openviking/pending` 计数、`problems`；**token 用量已接**：host 用 `ctx.tokenMeter.measure(session)` 读**当前会话**（`basis` usage/估算；无 session 或无 token-meter 服务时显示 `—`），client 只展示。无源不假装有。 |
| 研发/专业诊断视图 | **已实现（2026-10-21）** | 同一个 Viki tab 加可折叠「诊断」：health/version、category counts、last commit/tasks、pending、skills、`problems`、config path/provider/model（无 key）；默认折叠——专业用户看 overview，研发展开。数据用 `GET /api/assistant/viki?view=diagnostics` 懒加载，不新增 Remote namespace；独立诊断 tab 为输掉的备选。**右栏 tab 显示 `Viki(调试)`（无图标、10px 防截断）；guide 描述标“研发/高级用户使用，普通用户不需要”。** **live probe 在案；durable Viki scene 仍待。** |
| 转正到 `memory/` | 无 | **先拍机制，不写死**：<br>**P1（推荐，面板动作）**：人点“转正”=授权；host route 调 `assistantMemory.saveMemory`（与 `assistant_memory save` 同一服务的既有校验）+ `recordApproval(..., 'promote', ...)` 写 home 审计；**不需要 `ctx.approval`**——面板没有 open turn，且人点击本身就是授权。<br>**P2（模型提案）**：模型在 turn 内调 `assistant_memory save`，用 `ctx.approval` 请人确认，审计是 `approval/asked`/`approval/decided`；面板只发起/展示。<br>两套审计不混用；P1 需在 Viki route 的 `actions` 里加一个 `promote` 调用（`ApprovalKind` 已含 `promote`，知识室在用；Viki 现在只有 `retire`），不是新造 kind |
| 编辑/新增 | 无 | 先不做；转正走 `assistant_memory` 服务，避免 Viki 变成第二个写面 |
| 删除/恢复/比较 | 已有 | 保持；删除前的 references/commit 语义不变 |
| 分页/大列表 | 无 | 先搜索；记忆上千再分页 |

**转正的治理语义：** OpenViking 是第二储存层，不是权威；转正 = 人把一条情景记忆提升为 `memory/` 的策展事实，必须走 `assistantMemory.saveMemory` 的既有校验（一条一个断言、来源、预算闸门）。Viki 不直接写 `memory/` 文件；P1 的 host route 也不绕过服务校验。

### C. 与 DSH 的分工

- `assistant_memory`：权威、策展、人审。
- `assistant_recall` / MCP read：OpenViking 情景记忆的按需检索。
- `session_query`：DSH 原始会话证据。
- `assistant_knowledge`：我们提炼过的知识页。
- **`ctx.approval`：模型 turn 内的一次性人审通道**；Viki 面板点击默认走 P1 的“人点击=授权 + home 审计”，不硬套 `ctx.approval`（见 §B）。
- 需要一段**路由指引**（工具 description 或 operating brief）：什么时候用哪个；避免“到处找记忆”。
- `ctx.skills`：OpenViking skills 的 provider 是 P3；先确认 server 技能目录有真实内容。
- `message-feedback`：log-only；O4 的 👎 → 修正提案要自建消费者，不在本卡。
- `session-projection`：不为外部健康造投影；用 client slot/route。
- `agent-team`：`skipSubagentSessions` 会跳过团队记忆；本卡不改，留给运行态卡/方向卡 H6 拍板。
- `token-meter`：云端例外下，把 recall 块/工具调用的 token 成本显示在 Viki/usage；**host route 读，client 只展示**；本卡可做最小读数。

## 非目标

- 不放写面（`remember` / `write` / `edit` / `forget` / `add_resource` / `add_skill`）。
- 不做自动转正/自动修正；转正必须人确认。
- 不接 Gateway、不启用 takeover。
- 不做 OpenViking skills/experiences 的实现；本卡只做“是否值得”的调研与触发条件。
- 不把 Viki 做成第二个 `assistant_memory` 写面。
- 不修 Viki 连接（部署卡的 baseUrl）；不升级 server/搬家存储（运行态卡）。
- A/B 原型不进发布物、不合并。

## 未决问题（评审用；状态与 owner）

| # | 问题 | 当前状态 / 建议 | owner / 去向 |
|---|---|---|---|
| 1 | A/B 的题集与评分 | 12 题 + 四项 0–2 评分表已产出（[research note](../research/tech-exploration/261021-recall-ab.md)）；agent 初评/人抽查待 run | 本卡；人抽查（H3 之后） |
| 2 | 先修 recall 还是 A/B 并行 | 建议先让运行态卡把 `recallContextTimeoutMs`/find 跑通；A/B 可与运行态并行，但“召回失败”不能算 A1/A2 的输 | 运行态卡 + 本卡 |
| 3 | Viki 转正落点 | 只落 `memory/`；`knowledge/` 的 `sources` 引 OpenViking URI 留到知识卡 | 本卡 + H4 |
| 4 | skills/experiences 是否随 commit 生成 | 0.4.22 无 experiences、`/agent-evolution` 404；0.5.1.1 未验 | 本卡 P3 + 触发 |
| 5 | agent-team 记忆 | 资产还是污染；`skipSubagentSessions` 是否按 origin/preset 细分 | 方向卡 H6 |
| 6 | `message-feedback` 修正消费者 | log-only；等真实 👎 数据再决定 | 本卡“以后”；不立项 |
| 7 | 工具选择/路由指引 | 在 A/B 的固定题集里测；指引放工具 description 或 operating brief，A/B 后定 | 本卡 |
| 8 | 转正走 P1 还是 P2 | P1（面板点击=授权 + home `promote` 审计）推荐；P2（模型 turn 内 `ctx.approval`）备选；未选前不写死 | 本卡 + H4 |
| 9 | Viki 研发/专业诊断视图的形态 | **已实现（2026-10-21）：同一个 tab 的可折叠「诊断」；tab 标 `Viki(调试)`，研发/高级用户面**；独立诊断 tab 为备选。 | 本卡 + 用户 |

## 验收标准

**证据路由（行为类 / owner / 能证明 / 不能证明 / 人判）**

| 验收组 | 行为类 | 证据 owner / 命令 | 能证明 | 不能证明 | 人判 |
|---|---|---|---|---|---|
| A/B | 模型行为 | 一次性 home + 临时 patch/分支；固定题集 + 评分表 + 会话日志 | 工具调用/答案质量/成本/延迟 | 生产长期稳定、业务价值 | 人抽查 ≥3 条 |
| A1 | 编排 + 模型可见 | `ov-shield` 单测 + `dump-config` + 请求 tool schema 断言 + E2E | allowlist、不可见、工具到达 | 召回准确率 | 无 |
| A2 | 编排 + 模型可见 | 工具 spec + presenter/scope + E2E + `pnpm gen-catalog` | 单工具行为、越界拒、缺席错误 | 召回准确率 | 无 |
| Viki 面板 | 编排 + UI | `pnpm test`（client spec）+ `pnpm web-expected --scenario <Viki 场景>` | 渲染/DOM/入口 | 真机交互、数据业务正确性 | 人看一条 |
| 转正 | 集成 | host route spec + home `recordApproval` 或 DSH `approval/asked` 与 `approval/decided` + memory 文件 | 审计、服务校验、不直写 | 产品语义/长期价值 | H4 |

### A/B（先做，决定是否实施）

**题集/评分表/原型约定：** [research/261021-recall-ab](../research/tech-exploration/261021-recall-ab.md)（12 题、四项 0–2 分、A1/A2 一次性原型）。A1/A2 分支与 run 待下一次 A/B 切片。

- [ ] **原型纪律**：A1 用一次性 home 的临时 `ov-shield` allowlist（或临时 patch），A2 用一次性分支/临时工具；产物保留提交指针，**不进发布物、不合并**。
- [x] 固定问题集 ≥10 条，覆盖：偏好、事件、决策、跨 peer、无答案；每条有期望来源/答案。**2026-10-21：12 题在 research note；用户复核待 A/B。**
- [x] 评分表（来源正确 / 答案正确 / 细节充分 / 引用可核四项）与题集同一次产出；agent 初评 + 人抽查 ≥3 条。**评分表已产出；agent 初评/人抽查待 A/B run。**
- [ ] A1/A2 各跑一遍，记录：tool schema token（A1 按实际 7 个工具重测）、工具调用次数/正确率、答案质量、延迟、失败模式。
- [ ] 裁决写成一行：选 A1 / 选 A2 / 都不选（继续自动 recall），附证据与输掉的理由。
- [ ] 若选 A1/A2，实施后同一问题集复跑，质量不低于 A/B 的赢家。

### A1（若选）

- [ ] `ov-shield` 新增 `allowToolNames`（或等价），白名单为 `find/search/read/list/tree/grep/glob`；`write/edit/remember/forget/add_resource/add_skill/list_watches/cancel_watch/health` 仍不可见；`list()` 中立视图的预期残余有记录。
- [ ] 单测：allowlist 只放指定名；新增 `mcp__openviking__write` 仍被拒；OpenViking 缺席时零影响。
- [ ] 组合断言：请求的 tool schema 里只出现白名单（对照实测基线，A1 按 7 个重测）；server `instructions` 未进入提示（与 allowlist 无关；见部署卡 doctor 检查）。
- [ ] E2E：问一个答案在旧记忆里的问题，模型调用只读工具并引用 URI/内容。
- [ ] 现有**全部** web-face 场景（当前 3 个，清单以 [目录](../../snapshots/web-face/) 为准）不漂移；A1 不改变渲染，但不得拿“没跑场景”当通过。

### A2（若选）

- [ ] 新工具 `assistant_recall` 有 name/description/参数 schema；`presenter` 显示来源与摘要；scope 只读配置的 space/peer。
- [ ] 单测：find/search/read/tree 四动词；越界 URI 拒绝；server 缺席返回可读错误；不泄露 key。
- [ ] E2E：同 A1；模型不需要 MCP 命名空间。
- [ ] `docs/package-catalog.md` 重生成；`pnpm gen-catalog` freshness 绿。
- [ ] 现有全部 web-face 场景不漂移（清单以目录为准）。

### Viki

- [x] 搜索（2026-10-21）：输入关键词走 **stateless `/search/find`**（host `?q=`），返回匹配条目（summary/peer/URI/score）；**空结果、未连接、检索错误三态分开**；URI 过白名单；测试 mock 覆盖；**0.5.1.1 live `/search/find` 返回「合同」6 条**。筛选 chips 未做。
- [x] 健康/任务/统计/技能/pending/problems/token（2026-10-21）：诊断视图展示 `/health`、`/tasks`、`stats/memories`、`/api/v1/skills`、pending 计数、`problems`；**token 用量**由 host `ctx.tokenMeter.measure(session)` 读当前会话（`basis` usage/估算；无 session 或服务时 `—`）。无源项不假装有。
- [ ] 用量/token：host route 读 `token-meter`/会话日志；本轮未做（无源项不显示）。
- [ ] 转正（P1 或 P2，先拍）：P1 = 面板点击是授权 → host route 调 `assistantMemory.saveMemory`（同一服务校验）+ `recordApproval(..., 'promote', ...)`；P2 = 模型 turn 内 `assistant_memory save` + `ctx.approval` 的 `approval/asked`/`approval/decided`。两套审计不混用；memory 记录带 `source: openviking:<uri>`；不直接写文件。
- [ ] 现有删除/恢复/比较不回归；`viki-panel` 测试更新。
- [x] **研发/专业诊断视图（2026-10-21）**：同一 tab + 默认折叠；host `GET /api/assistant/viki?view=diagnostics`（health/stats/tasks/skills/pending/config，无 key；`problems` 并入）；面板「诊断」懒加载；`viki-panel` 8 案 + host 17 案；真机 `pnpm start` → 右栏 `Viki(调试)` → 诊断/搜索，DOM/screenshot 在案。同时修复 `bindVikiEnv` 生产无 `ctx.web` 时的 `document` fallback（此前真机面板报 “web face is not available”）。**durable Viki scene 仍待**（下一条）。
- [ ] **Viki 专用渲染/DOM 检查**：新增 `snapshots/web-face/viki-.../` 场景（`snapshot.yml` + 契约 README + `expected.dom.json`），用 `pnpm web-expected --scenario <场景>` 跑；覆盖搜索/健康/转正入口。若场景因右栏 seat/vendor 条件建不起来，按 [validation-evidence §1b](../methods/validation-evidence.md) 记 **blocked** 并写读法协议，不拿 `shots` 单张图当回归。
- [ ] 现有**全部** web-face 场景（当前 3 个：`blank-first-open`、`first-open-draft-banner`、`desk-eight-matters-first-open`）不漂移；**它们不覆盖 Viki，不能当 Viki 回归证据**。
- [ ] `pnpm verify` 通过。

## 下一步

**裁决已收（2026-10-21）**：H1 B / H4 转正后置 / H6 先跳过团队记忆。本卡承载规格与验收，推进在 [收口卡](261021-openviking-viki-closure.md)；A/B 先原型、不先生产实现；Viki 先搜索/健康，转正等真实需求。**Viki 诊断 + 搜索 + token 用量 + `Viki(调试)` tab 已实现；live 搜索「合同」6 条、token 行真机可见；转正/durable scene 待做。**
**Agent 的**：第一轮（2026-10-20）与第二轮（2026-10-21）已回写；A/B 前先确认运行态卡的 recall 路径可测。

## 范围与邻居

| 本卡拥有（修/交） | 只检查/引用（不修） | 不拥有（去向） |
|---|---|---|
| 只读检索 A/B；A1/A2 裁决与实施；Viki 搜索/健康/转正/渲染；工具与知识分工 | 运行态的 recall 路径（A/B 前置）；部署卡的 Viki baseUrl/doctor | 写面（`ov-shield`）；Viki 连接（部署卡）；server 升级/存储（运行态卡）；skills/experiences 实现（P3） |

## 评审记录（意见回流的家）

### 2026-10-20 · 第一轮 agent 核验（检索/Viki 面，只读）

- 16 工具实测：全量 ≈5.7k token，只读 8 个 ≈2.2k token；A1 白名单补 `find`，A1 实际 7 个（不含 health），成本按实际 allowlist 重测。
- `web-expected` 不覆盖 Viki；“两场景不漂移”不能当 Viki 回归证据；Viki 需要专用渲染/DOM 检查。
- A/B 的“谁做人工评分”未定 → agent 初评 + 人抽查 ≥3 条，评分表随 A/B 产出。
- 转正确认机制未指定 → 第一轮写“走 `ctx.approval`”；**第二轮修正**：`ctx.approval` 要求 open turn，面板点击没有 turn，不能直接套。

### 2026-10-21 · 第二轮内部质量审（按 `_backlog/methods`）

- **Q9 转正机制**：拆 P1（面板点击=人授权；host route 调 `assistantMemory.saveMemory` + home `recordApproval('promote')`）与 P2（模型 turn 内 `assistant_memory save` + `ctx.approval` 对）；两套审计不混用。原卡把 `approval/asked` 对与 home `recordApproval` 写成一条链，已改。
- **Q14 搜索端点/数据源**：面板搜索改走 stateless `/search/find`（`/search/search` 是 session-aware）；`problems` 指明是 `client.ts` 已返回的数组；token 用量需要 host route，client 不直接读。
- **Q6 场景漂移**：`web-expected` 现 3 个场景；验收从“两场景”改为“现有全部（当前 3 个，清单以目录为准）”，Viki 另建专用场景；建不起来按 validation-evidence §1b 记 blocked。
- **A/B 矛盾**：原卡“先 A/B 不先实现”但验收要求 A1/A2 各跑一遍；补“原型放一次性 home/分支，不进发布物”。
- **Q4 范围**：Viki 连接归部署卡、升级/存储归运行态卡；本卡只做面板能力与工具面。
- **版本**：0.5.1.1/0.5.27 的 skills/experiences 仍未验，P3 触发不变。

**结论**：A/B 与 Viki 的方向成立；转正机制与搜索端点按本轮修正；不授权实施。

## 关闭条件

- A/B 裁决记录（含原型指针、题集、评分表、人抽查）；选中的路径实施并验收；未选路径写“输掉的方案”。
- Viki 搜索/健康/转正落地（P1/P2 机制二选一并记录）；Viki 专用场景或 blocked 读法协议在案；未做的编辑/分页/技能/经验写去向。
- 若 A/B 结论是“都不选”，本卡以结论关闭，不实施；写清触发重开的条件（例如记忆量/问题频率）。
- 用户 review 通过；`_backlog/issues/README.md` 更新。
- 不修改归档的旧卡/层 1 note；旧结论只作历史引用。

## 关联

- [方向评审卡](../_archive/settled_issues/261020-openviking-direction-review.md)
- [部署与 doctor](261020-openviking-deploy-doctor.md)
- [运行态与 0.5.1.1](261020-openviking-runtime-repair.md)
- 既有：[层 1 note](../../notes/archived/2026-10-04-openviking-layer1-landing.md)、[正式接入卡 §七](../_archive/settled_issues/260929-openviking-formal-integration.md)、[viki-read note](../../notes/implemented/2026-10-19-viki-read.md)、[approval.md](../../vendor/dsh/docs/subsystems/approval.md)、[tools.md](../../vendor/dsh/docs/subsystems/tools.md)
- 证据面：[web-face 场景](../../snapshots/web-face/)、[测试证据地图](../../docs/testing.md)
