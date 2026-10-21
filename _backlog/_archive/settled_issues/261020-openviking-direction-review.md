---
status: 已结
opened: 2026-10-20
---

# 评审：OpenViking 层 2 的方向——从“隐形层 1”到可配置、可观测、可按需检索

> 立卡：2026-10-20 ｜ 状态：已结 ｜ 类型：未定 ｜ 可关闭：是 ｜ 评审卡 ｜ 结论：**接受 B**（2026-10-21 人类裁决；H2–H6 按建议）｜ 实施载体 = [proposed 卡](../../../notes/proposed/2026-10-21-openviking-viki-landing.md) / [收口卡](../../issues/261021-openviking-viki-closure.md)

**给评审者的最短路径：** 先读「问题与期望结果」→「当前情况（证据）」→「方案与取舍」→「请评审什么」。  
本卡只做方向评审；实施拆在三张卡里：[部署与 doctor](../../issues/261020-openviking-deploy-doctor.md)、[运行态与 0.5.1.1](../../issues/261020-openviking-runtime-repair.md)、[按需检索与 Viki](../../issues/261020-openviking-retrieval-viki.md)。  
**评审产出：** 人类给“方向认可 / 要改 / 否决”，Agent 给“证据缺口 / 漏掉的能力 / 验收不可执行”清单；每条有 owner 与去向。**本卡不授权写代码。**

## 问题与期望结果

用户 2026-10-20 的原话大意：OpenViking 好像变了、升级了，我们是不是在充分利用它的各种能力，同时和 DSH 的能力配合好？

本轮做了只读审计，结论是：**没有充分利用；而且当前连已经采纳的层 1 也没有跑在设计状态。** 这不是“再加几个功能”的问题，而是三件事同时成立：

1. **版本错位**：server latest 已到 **0.5.1.1**（2026-10-20；0.5.1 是 10-19），我们还钉在 0.4.22；插件 0.5.26（2026-10-15）在位，latest 已是 **0.5.27**（2026-10-20，变更未审）。我们只跟上了插件的一个中间版本，没跟上 server。
2. **运行态失配**：dev 组合里的 OpenViking 行没有 config，跑的是插件默认值；v3/召回调参只活在 `dev-ov` 探针 profile。加上模型连接失败、Viki 默认没 URL、记忆库落在 `.tmp`，实际利用率很低。
3. **能力面只用了“自动注入”**：profile + 逐轮 recall + capture/commit；MCP 工具面被整前缀拒，按需检索、技能、经验、人审转正、健康/用量都没接。层 1 的边界是刻意画的，但新版本 + 新 DSH 提供了比“全拒/全放”更细的缝。

**期望结果：** 给出一份方向与拆卡，使后续实施能让这一层**装得对、看得见、守得住、问得到细节**；同时不破坏 working folder 四房间的权威、不把写面放开、不绕过 DSH 治理。

**完成条件：** 评审收敛；三张实施卡被接受/修改/否决；每个未决问题有 owner 或后续卡；不产生行为/配置改动（注释级事实修正除外）。

## 当前情况（证据）

> 观测时间：2026-10-20，当前 dev home；命令都在本机真跑过。样本是当前 home，不是全量历史；结论只说明“现在”，不证明“设计从未工作”。
> **复核增量（2026-10-21）**：版本前移（server latest 0.5.1.1、plugin latest 0.5.27）、web-face 第三场景落地、doctor 与运行态出现“绿而不通”的对照；见 §0。卡内 10-20 的读数是快照，不自动更新；以本节与验收为准。

### 0. 复核增量（2026-10-21，只读）

| 项 | 10-20 卡面 | 10-21 复核 | 对判断的影响 |
|---|---|---|---|
| server latest | 0.5.1 | **0.5.1.1**（2026-10-20T12:40Z） | 0.5.1.1 修的正是“后续 commit 完成但新记忆搜不到”；运行态卡目标改为 0.5.1.1，不 pin 0.5.1 |
| plugin latest | 0.5.26 | **0.5.27**（2026-10-20T13:40Z） | 0.5.26 仍是在位版本；0.5.27 变更未审，不自动升，单列触发 |
| 运行态 | commit failed / search 空 | `openviking-server doctor --config .tmp/openviking/ov.conf` **全绿**；`/tasks` 仍有 failed commit；`/health` 绿 | doctor 绿 ≠ 运行态可用；部署卡的 doctor 必须读运行中 server 的同一份 config，且 check 4/5 才是运行态探针 |
| recall 存量 | 36/376 个 v4 会话含 recall（77 处） | 复核 v3 档 63 个：**0 命中**；v4 仍 36/379（新增 3 个无 recall） | 原结论不受影响；卡面写明“v4 档 + v3 档已扫”，避免“全量”歧义 |
| web-face 场景 | 两个（blank / banner） | **三个**（S10 2026-10-21 新增 `desk-eight-matters-first-open`） | 检索卡“两场景不漂移”已过期；改为“现有全部场景（当前 3 个，清单以目录为准）” |
| 云端脱敏现状 | 机制已核，未写“当前是否生效” | dev 组合无 OV config；插件 `captureToolResults` 对 DSH 默认 true；`captureFilters` 默认 [] | **当前云端工具结果没有过滤器**；部署卡 P0 必须先收口，否则“云端例外 v1”只是纸面口径 |

### 1. 版本与组合

| 事实 | 证据 |
|---|---|
| server 0.4.22；插件 0.5.26；server latest 0.5.1.1；plugin latest 0.5.27 | `openviking-server --version`；`GET /health` 返回 `"version":"0.4.22"`；插件 `package.json` 0.5.26；[v0.5.1.1 release](https://github.com/volcengine/OpenViking/releases/tag/v0.5.1.1)（2026-10-20）；[plugin 0.5.27](https://www.npmjs.com/package/@openviking/dsh-memory-plugin/v/0.5.27)（2026-10-20） |
| dev 组合的 `openviking-memory-runtime` 行**没有 config** | `ASSISTANT_DSH_HOME=dev/harness-home pnpm dsh --profile dev --dump-config` |
| 调参只写在 `dev-ov` 探针，不在 dev | live `dev-ov` patch（本机、`dev/harness-home/` 已 gitignore）有 `peerId: assistant`、`skillCatalog: false`、`skipSubagentSessions: true`、`profileTokenBudget: 3000` 与召回旋钮；`commitTokenThreshold: 3000` **只在 tracked 的 [ov-install.sh §6](../../../dev/experiments/openviking/ov-install.sh) 模板里——live 与模板已漂移**；dev 两处都没有 |
| `pnpm start` 每次覆盖 dev profile 的 patch | [setup.sh](../../../dev/env/setup.sh) 的 `cp "$patch" "$dir/cordis.patch.yml"`；tracked 模板 [profile-patch.yml](../../../dev/profiles/profile-patch.yml) 只有 preset registry |

**后果：** live 实际跑的是默认值：profile 预算 10000、commit 阈值 20000、子代理会话照抓、peer 跟 git origin、context 召回、skill catalog 开。与层 1 note 的 v3 剖面相反。

### 2. 记忆层当前是否在工作

| 事实 | 证据 |
|---|---|
| 6 条 events；0 profile / 0 preferences / 0 entities | `GET /api/v1/stats/memories` |
| 4 个 session；最近一次 `session_commit` **failed** | `GET /api/v1/tasks`：2026-10-20T07:24:07Z，`"error":"Connection error."`；server.log：commit 失败在 `_run_archive_summary` 的 VLM 调用，`search/find` 失败在 embedding（`embed_compat` → `CircuitBreakerOpen`）——两条出网都断 |
| 检索实际失败 | `POST /api/v1/search/search` 返回 `entries: []`、`retrieval_errors: ["RuntimeError: OpenAI API error: Connection error."]`；`POST /api/v1/search/find` 500 |
| `/health` 仍然绿 | `GET /health` 返回 `"healthy":true`——它不探测模型位 |
| recall 块不是 0，但只有目录 overview | 扫全部 376 个 `session.v4.jsonl.zstd`：36 个会话含 `<openviking-context source="recall">`（77 处，2026-09-29→10-19）；截至审计（2026-10-20）的会话 0 条；**2026-10-21 补扫 v3 档 63 个，0 命中**。2026-10-19 16:01 的两条只有 `viking://user/default/resources` 与 `viking://resources` 两个系统目录、`detail="overview"`，并写 “Use the search/read MCP tools to expand URIs”——这两个工具正被 ov-shield 拒 |

**注意：** 这不是“层 1 从未成功”。层 1 落地 note 有过一次真实往返；现在是**当前故障**（模型连接失败），不能把它误判成架构失败，也不能因为 `/health` 绿就当成可用。“recall 为 0”只对 2026-10-20 的个别会话成立（连接故障期），全量存量反而证明自动 recall 曾经工作——而 2026-10-19 的实物暴露了更关键的断裂：召回块只有 overview，且提示使用被 ov-shield 拒掉的 `search/read`。

### 3. 人面与部署面

| 事实 | 证据 |
|---|---|
| 正常 `pnpm start` 下 Viki 为 503（除非 shell 已导出 `OPENVIKING_URL`） | [viki/index.ts](../../../packages/dsh-smart-assistant/src/host/viki/index.ts) 的 baseUrl 只取 config 或 `OPENVIKING_URL`；[start.sh](../../../dev/env/start.sh) 不导出该变量；viki 验收 note 用的是 `OPENVIKING_URL=... pnpm start` |
| 记忆库在临时目录 | [openviking-up.sh](../../../dev/env/openviking-up.sh) 把 workspace 指到 `.tmp/openviking/workspace`；`.tmp` 是仓内临时根 |
| 云端与“严格本地”冲突 | `~/.openviking/ov.conf` 的 VLM/embedding 指向 SiliconFlow；[README.md](../../../README.md) 写“数据边界 = 严格本地（反转属用户）”；用户 2026-10-20 已接受云端例外，但要求写清楚并在部署时检测 |
| Viki 已有能力 | 列 / 读 / 删（先 snapshot）/ 恢复 / 并排比较 / scope 清理；见 [viki-read note](../../../notes/implemented/2026-10-19-viki-read.md)、[viki-delete note](../../../notes/implemented/2026-10-19-viki-delete.md)、[viki-cleanup note](../../../notes/implemented/2026-10-19-viki-cleanup.md) |
| Viki 缺什么 | 搜索/筛选、把一条情景记忆转正到 `memory/`、健康/任务/用量、`problems` 展示；面板目前只列当前树 |

### 4. 模型可见面与治理

- [ov-shield](../../../packages/dsh-smart-assistant/src/agent/ov-shield/index.ts) 目前整前缀拒 `mcp__openviking__*`，并遮蔽两个技能名；MCP 资源桥也按 server 名拒。写面守住是对的。
- 代价是**没有按需检索**：自动 recall 只给一段有界内容；模型无法“问细节”，也无法把指针展开成叶子。2026-10-19 的实物正好停在这一步：召回块只有 `detail="overview"` 的目录摘要，并提示用 `search/read`——这两个工具被 ov-shield 拒。ov-shield 模块注释里 “No value is lost” 只在 `recallContextTimeoutMs` 强制 find 的剖面下成立；默认 context 剖面下不成立（注释已同 diff 改为条件声明）。
- DSH 0.2.1 的 `ctx.tools.restrict` 支持 **allow list**（[tools.md](../../../vendor/dsh/docs/subsystems/tools.md) 的 `ToolRestriction` 节），所以“只放 find/search/read/tree/grep/glob、继续拒写”在机制上可行；这不等于应该这么做，需要量 tool-schema 成本和命中收益。
- 0.5.x 的 `skillCatalog` 是活旋钮（默认 true），但 server 当前 0 个技能；两个内置技能又被遮蔽。若将来有技能，目录会“广告了但加载不了”，除非做 DSH provider 或放开 `add_skill`/`read`。

### 5. 新版本提供了什么（只列与我们相关的；截至 2026-10-21）

| 版本 | 能力 | 与我们的关系 |
|---|---|---|
| server 0.5.0 | Working Memory 默认关；commit 归档全部消息；context 模式不再返回系统目录；`exclude_uris` 支持子树；DSH 只在真实用户输入时召回；session ID 规范化 | 直接命中我们当前的 archive 摘要失败、短会话丢记忆、召回质量 |
| server 0.5.1 | commit/锁/任务 owner 修复；archive 完成标记；Gateway 内嵌；隐私字段；batch write；多模态；compile；MCP download；DSH 压缩/启动时提交待处理消息 | commit 可靠性、云端脱敏、部署形态；多模态需多模态 embedding，暂不适用 |
| server 0.5.1.1 | 修 v0.5.1 的**后续 commit 索引缺失**（#6331：任务完成但新记忆 `find`/`search` 搜不到） | 直接命中运行态卡的主症状；运行态卡目标版本，不是 0.5.1 |
| plugin 0.5.26 | profile/recall/capture/commit；MCP 桥；skills provider；pending queue drainer；`recallExcludeUris`、`recallQueryExpansion`、`captureToolResults`、`skipSubagentSessions`、`peerSource/workspacePeer` 等活旋钮；`mcpEnabled`/`takeoverEnabled`/`resumeArchiveInject`/`skillExperience`/`usageView`/`usageOutput`/`autoCommitOnCompact`/`repoContext` 在 DSH 仍是死旋钮 | 我们要围绕活旋钮设计，不要围绕死旋钮设计 |
| plugin 0.5.27 | 2026-10-20 发布；变更未审 | 在位 0.5.26；不自动升，升级需另评 |

来源：[v0.5.0 release](https://github.com/volcengine/OpenViking/releases/tag/v0.5.0)、[v0.5.1 release](https://github.com/volcengine/OpenViking/releases/tag/v0.5.1)、[v0.5.1.1 release](https://github.com/volcengine/OpenViking/releases/tag/v0.5.1.1)、[插件 latest](https://www.npmjs.com/package/@openviking/dsh-memory-plugin)。

### 6. 新 DSH 的可用缝

| 缝 | 事实 | 与 OpenViking 的关系 |
|---|---|---|
| `ctx.tools.restrict({ allow })` | 支持 allow/deny；scoped 注册豁免 | 只读 MCP allowlist 的落点 |
| `ctx.skills` provider | 本地/打包/远程 provider 可并存 | 可把 OpenViking skills 读成 DSH 技能；但我们的 skills 房才是权威 |
| `client` slots / `connection.fetch` | 已有 Viki 面板走这条 | 健康/用量/任务/`problems` 的展示面 |
| `session-query` | 原始会话检索已有 | 与 OpenViking 情景记忆分工：原始证据 vs 抽取记忆 |
| `schedule` | 到期 follow-up | 可做记忆养护/导出节拍；不要与 DSH 自身 compaction 抢 |
| `message-feedback` | **log-only**，不进模型上下文 | O4 的 👎 → 修正提案需要自建消费者，不是现成能力 |
| `session-projection` | per-session 状态投影 | 外部服务健康用 client slot 更简单；不必为它造投影 |
| `agent-team` | 成员是 `origin: 'subagent'` | `skipSubagentSessions: true` 会连团队记忆一起跳过；这是产品选择 |
| `token-meter` | 回放 token 计量 | 云端例外下，召回块/抽取成本可见 |
| `ctx.settings` | active profile 行的 Config 投影成表单，编辑经 Cordis patch 持久化 | OV 旋钮的 UI 落点；但 `setup.sh` 覆盖 dev patch 的问题仍在，先按运行态卡的替换落点做 |
| `ctx.approval` | 可审计的一次性人审（`approval/asked` 与 `approval/decided` 审计对；要求发起会话处于 open turn） | **模型 turn 内**的确认通道；Viki 面板点击默认走 home `promote` 审计（见检索卡 P1/P2），不硬套 `ctx.approval` |

## 已知与未决

**已知（2026-10-21 复核）：**
- 用户已接受云端记忆抽取/embedding；要求把它写成明确例外（可出/脱敏），并在 README 和部署检测里引导用户配对所有配置。
- 版本矩阵：DSH `0.2.1-rc.2`；plugin 0.5.26 在位（latest 0.5.27）；server 0.4.22 在位（latest 0.5.1.1）。
- 当前 recall/commit 失败是模型连接问题（或 server 进程环境问题），不是“层 1 设计失败”；doctor 绿与运行态可用是两件事。
- 层 1 的治理边界（写面不放开、四房间权威、人审）不因本方向改变。
- dev 组合当前无 OV config，故插件默认值生效：`profileTokenBudget: 10000`、`commitTokenThreshold: 20000`、`captureToolResults: true`（DSH 默认）、`captureFilters: []`。

**主张与证据（K 表；现状列随结论翻 `已证 / 证伪 / 维持`）**

| # | 主张 | 证据与强度 | 谁能否证（怎么证） | 现状 |
|---|---|---|---|---|
| K1 | 版本错位：server 0.4.22 vs latest 0.5.1.1；plugin 0.5.26 vs latest 0.5.27 | **强**：`openviking-server --version`、`GET /health`、registry/release；§1 | 指出 pin 已更新或 latest 再前移 | 已证（2026-10-21） |
| K2 | 运行态失配：dev 无 OV config；v3 只在 dev-ov；`setup.sh` 覆盖；默认值让预算 10000 / commit 20000 / 工具结果照抓 / 过滤器为空 | **强**：`dump-config`、[profile-patch.yml](../../../dev/profiles/profile-patch.yml)、[setup.sh](../../../dev/env/setup.sh)、插件 schema；§1/§2 | 在 fresh dev home 复跑 `dump-config`；指出 profile patch 已有 config | 已证 |
| K3 | 能力面只用自动注入：MCP 前缀整拒；召回只有 overview + 被拒工具提示 | **强**：`ov-shield` 源码、2026-10-19 会话实物、16 工具实测；§2/§4 | 找到只读工具可用的反例，或 recall 块已内联叶子的会话 | 已证（边界：连接故障期，不能归因架构失败） |
| K4 | 治理边界不变：写面不放开、四房间权威、人审 | **约束**：层 1 note 决定 1/3；本卡不重开 | 用户明确反转 | 维持 |
| K5 | 云端例外只接受原则，具体可出/脱敏口径尚未拍板 | **中**：用户 2026-10-20 接受云端；部署卡 v1 是提案 | 用户确认 v1 或改口径 | 未决（人类） |

**未决问题状态（原 7 条；无“沉默的未决”）**

| # | 问题 | 当前答案 / 状态 | owner / 去向 |
|---|---|---|---|
| 1 | 0.5.1.1 能否读 0.4.22 workspace；迁移项哪些影响我们 | 不能直接升；副本 + 完整存储备份 + 回滚演练；目标 0.5.1.1 | [运行态卡](../../issues/261020-openviking-runtime-repair.md) |
| 2 | 只读检索走 MCP allowlist 还是 native tool | A1 只读子集实测 ≈2.2k token/轮（8 个；A1 白名单 7 个略低），A2 待量；无数据不拍 | [检索卡](../../issues/261020-openviking-retrieval-viki.md) |
| 3 | 0.5.x 的 skills/experiences 是否随 commit 生成 | 0.4.22：无 experiences、`/agent-evolution` 404、`/skills` 0 条；0.5.1.1 是否生成未证 | 检索卡 P3 + 触发 |
| 4 | `skipSubagentSessions` 是否跳过 agent-team；团队记忆是资产还是污染 | agent-team 是 subagent，会跳过；**待人类拍板** | 本卡 H6；运行态卡引用 |
| 5 | 云端脱敏能否可靠拦住密钥/PII/第三方机密 | `captureFilters` 可替换 tool input/output；**当前 dev 为空**；正则可靠性未测 | [部署卡](../../issues/261020-openviking-deploy-doctor.md) P0 + H2 |
| 6 | peer 切到 `assistant` 后旧 6 条 events 怎么召回 | 默认 `recallPeerScope: all` 可扫到；迁移后需一次真实 search 验证 | 运行态卡 |
| 7 | Viki 转正只做 `memory/` 还是也允许 `knowledge/` 引用 OpenViking URI | 建议只落 `memory/`；机制在检索卡拆 P1/P2，未拍 | 检索卡 + H4 |

## 下一步

**裁决已收（2026-10-21）**：接受 B；H2–H6 按建议。实施载体 = [proposed 卡](../../../notes/proposed/2026-10-21-openviking-viki-landing.md) + [收口卡](../../issues/261021-openviking-viki-closure.md)；三张实施卡保持活跃（已授权规格），推进在收口卡；本卡归档。Agent 从 P0 安装/doctor 开始。

## 方案与取舍

| 方案 | 做法 | 判断 |
|---|---|---|
| A. 只修 | 修网络、存储、Viki URL、旋钮；不加新能力 | 能让层 1 恢复，但回答不了“充分利用新版本”；不选 |
| **B. 修 + 升 + 按需检索 + 人审闭环** | 先 P0 部署/可观测，再 P1 0.5.1.1 + 运行态，再 P2 只读检索 + Viki 治理 | **推荐**；每步独立可回退 |
| C. 换 Gateway | 用 0.5.x Gateway 注入记忆，不装插件 | 绕过 DSH 工具/技能/`ov-shield` 治理；与“四房间权威 + 写面守住”冲突；不选 |
| D. 放开全部 MCP | 让模型直接用 16 个工具 | 写面、工具噪声、模型在 `assistant_memory` 与 `remember` 之间选错房间；不选 |
| E. 等上游 | 等插件把 `mcpEnabled`/skill mount 做成活旋钮 | 上游 0.5.26 仍未接；我们的 `ov-shield` 已经是原生缝；不选“干等” |

**拆卡与边界（一个事实一个家；Viki/存储不再三卡都声称修）：**

| 卡 | 拥有（修/交） | 只检查/引用（不修） | 依赖 |
|---|---|---|---|
| [部署与 doctor](../../issues/261020-openviking-deploy-doctor.md)（P0） | 云端例外口径、`ov-doctor`、README 部署/故障表、**Viki baseUrl 默认值**、配置对账 | 存储是否持久（doctor 报红，不搬家）；升级（不升 server） | 方向卡 H1/H2 |
| [运行态](../../issues/261020-openviking-runtime-repair.md)（P1） | **server 0.5.1.1 升级**、**存储搬家**、v3 旋钮落点、peer、commit/recall、回滚 | Viki URL（部署卡修，本卡只回归 200）；工具面（检索卡） | 部署卡的 Viki 修复；H5 |
| [按需检索与 Viki](../../issues/261020-openviking-retrieval-viki.md)（P2/P3） | 只读检索 A/B、**Viki 面板搜索/健康/转正**、工具/知识分工 | 写面（不动）；连接修复（部署卡）；升级/存储（运行态卡） | 运行态的 recall 路径；部署卡的 Viki 连接；H4 |
| 本卡 | 路线裁决、拆卡、评审收敛 | 不承载实施 | 人类 H1–H6 |

**为什么这样切：** 三张卡分别对应“装得对 / 跑得对 / 问得到”三个风险面；Viki 的**连接**归部署、**存储**归运行态、**面板能力**归检索，避免同一事实三处改。这样人类可以只批其中一张，Agent 可以逐张攻击，不会把“升级风险”和“工具面决策”混在一个 diff 里。

## 新 Viki + 新 DSH 能力图（评审用）

| 能力 | 提供方 | 建议用法 | 现在做？ |
|---|---|---|---|
| 只读 MCP（find/search/read/tree/grep/glob） | Viki 0.5.26 + DSH `restrict` allow | 写面继续整前缀拒；只读按 allowlist 放，先量 token/命中 | P2，先 A/B |
| 单工具 native recall | 我们自己的 DSH 工具 | 一个 `assistant_recall`（find/search/read/tree），presenter + scope | P2 备选 |
| skills 目录 / `add_skill` | Viki server + DSH `ctx.skills` | 自定义 provider 读 `viking://~/skills`，走标准 `skill` 工具 | P3，有真实 skill 再触发 |
| experiences / agent-evolution | Viki server | 先查是否随 commit 自动生成；再决定是否 surface | P3，先观察 |
| Working Memory off / commit 修复 | Viki 0.5.1.1 | 升级后默认少一次 VLM 调用、commit 更稳 | P1 |
| privacy fields | Viki 0.5.1.1 | 云端脱敏的第二道闸（不替代第一道） | P1/P2 |
| Gateway | Viki 0.5.1.1 | **不用**：绕过 DSH 治理 | 不做 |
| `ctx.tools.restrict` allow | DSH 0.2.1 | 只读 MCP 的落点 | P2 |
| client slots | DSH 0.2.1 | Viki 健康/任务/用量/`problems` | P0/P3 |
| `message-feedback` | DSH 0.2.1 | log-only；O4 修正消费者要自建 | 以后 |
| `session-projection` | DSH 0.2.1 | per-session 状态；外部健康不值得投影 | 不做/按需 |
| `agent-team` | DSH 0.2.1 | 成员是 subagent；团队记忆是否跳过要拍板 | 待定 |
| `token-meter` | DSH 0.2.1 | 云端成本/召回块成本可见 | P0/P3 |

## 请评审什么（分角色，逐条可勾）

**人（产品/边界/优先级，只有你能定）**

- [ ] **H1 路线（总闸）**：接受 B「修 + 升 + 按需检索 + 人审闭环」/ 要改（列改动）/ 否决（写理由）。建议 B；若只接受一部分，点名哪张卡。
- [ ] **H2 云端例外口径**：接受「对话/记忆可出，凭据/PII/第三方机密默认脱敏」的 v1，或补充「哪些业务内容必须默认不出」。**同时确认当前 `captureToolResults: true` + `captureFilters: []` 的收口顺序**：先关工具结果，还是先配过滤器。建议先关/过滤工具结果，再谈按需检索。
- [ ] **H3 优先级**：P0 部署/可观测先做，还是 P2 按需检索先做。建议 P0 先做——doctor 与配置对账便宜，且没有它，A/B 的“召回失败”分不清是记忆层坏还是配置坏。
- [ ] **H4 Viki 转正**：现在做（只落 `memory/`）/ 以后做（写触发）/ 不做。建议先做搜索/健康，转正等真实“想留下这条”的需求出现。
- [ ] **H5 版本**：运行态卡目标 **0.5.1.1**（推荐，修 0.5.1 的后续 commit 索引 bug）还是先留 0.4.22；plugin 0.5.27 是否随本卡评审（建议单列，变更未审）。
- [ ] **H6 团队记忆**：`skipSubagentSessions: true` 是否也跳过 agent-team 成员；团队记忆是资产还是污染。建议先跳过（噪声下限），团队记忆另立触发。

**Agent（证据/机制/验收）**

- [ ] 证据是否足够支撑“当前层 1 没跑在设计状态”？有没有漏掉的反证（例如某些会话确实有 recall）？
- [ ] 0.5.1.1 的迁移项里，哪些会直接影响 Viki 的 `snapshot/delete/restore`、插件的 `search/commit`、`viking://user` 路径？
- [ ] 只读 MCP allowlist 的 tool-schema token 成本是否可接受？有没有 DSH 侧更细的过滤/可见性 API 被我漏掉？
- [ ] `captureToolResults: true` 与云端例外是否冲突？`captureFilters` 在 0.5.26 对 tool input/output 的替换是否覆盖（已核 `filterCaptureParts`；还需实测正则可靠性）？
- [ ] 0.5.x 的 experiences 是否真的会自动生成？如果不会，`captureToolResults` 的价值是什么？
- [ ] `skipSubagentSessions` 对 agent-team 的覆盖是否符合产品预期？
- [ ] 三张实施卡的验收是否可执行、是否有假绿风险？证据 owner / 不能证明什么是否写清？
- [ ] 版本前移（0.5.1.1 / 0.5.27）是否改变任何一条结论？

## 评审记录（意见回流的家）

**规则**：各角色意见按小节追加于此（带日期）；对卡内事实的修正同 diff 改正文，并在本节留一行。评审收敛 = 人类裁决 + 三张实施卡各有去向。
> 第一轮（2026-10-20）是当时意见；与第二轮（2026-10-21）冲突时，以第二轮与正文为准（尤其 `ctx.approval`、场景数、版本）。

### 2026-10-21 · 人类裁决（H1–H6）

用户选择 **接受 B**，H2–H6 按建议：H2 先收口云端工具结果；H3 P0 部署/可观测先做；H4 Viki 转正后置，先做搜索/健康；H5 运行态目标 0.5.1.1，plugin 0.5.27 单列；H6 团队记忆先跳过，另立触发。实施载体 = [proposed 卡](../../../notes/proposed/2026-10-21-openviking-viki-landing.md) + [收口卡](../../issues/261021-openviking-viki-closure.md)；三张实施卡保持活跃（已授权规格），推进在收口卡。**本裁决授权按三卡验收范围实施，不改变写面/四房间/人审边界；追加安装/配置为一等交付。**

### 2026-10-20 · 第一轮 agent 核验（证据 / 机制 / 验收三路，只读）

**证据（对正文事实的纠错，已同 diff 改正文）**

- **recall 块不是 0。** 全量扫 376 个 `session.v4.jsonl.zstd`（`zstd -dc | grep openviking-context`）：36 个会话含 `<openviking-context source="recall">`（77 处，2026-09-29→10-19）；截至审计（2026-10-20）的会话 0 条（模型连接故障期）。原文「recall 块 0」只对个别会话成立，不能当全量事实。
- **2026-10-19 的 recall 实物**（`session-7feeda6d-cdd3-4a57-ab3e-d8d374351fae`，07:52Z / 08:00Z）：两条块都只有 `viking://user/default/resources` 与 `viking://resources` 两个系统目录、`detail="overview"`，并写 “Use the search/read MCP tools to expand URIs”；这两个工具被 ov-shield 拒，模型拿到的是**无法执行的指令**。这既证明自动 recall 曾经工作，也把「只给指针 + 工具被拒」从推测变成实物。
- **`commitTokenThreshold: 3000` 不在 live dev-ov。** live dev-ov patch 实有 peer/skillCatalog/skipSubagent/预算/召回旋钮，没有 commit 阈值；3000 只在 tracked 的 `ov-install.sh` §6 模板与层 1 note 里。live 与安装器模板已漂移——这本身是运行态卡要收的口子。
- **Viki baseUrl 现值为空**（`config.baseUrl || OPENVIKING_URL || ''`），不是 1933；「默认 1933」是实施建议，已改为建议语气。
- 其余 live 证据可复现：`/health` 0.4.22 绿、6 events/0 profile、最近 commit failed（`4e16b6d1…`，`Connection error`）、`search` 空 + `retrieval_errors`、`find` 500、dump-config 的 OV 行无 config。

**机制与能力（升级后的 Viki / DSH 还有哪些没被用上）**

- **MCP 工具面实测 16 个**（不是 12）：`find search read list tree remember write edit add_resource add_skill list_watches cancel_watch grep glob forget health`。全量 schema ≈20.6KB ≈5.7k token；只读子集（find/search/read/list/tree/grep/glob/health，8 个）≈7.9KB ≈2.2k token。**A1 白名单 7 个（不含 health），成本按略低于 2.2k 估，A/B 按实际 allowlist 重测。**
- **A1 白名单漏了 `find`。** `find` 是语义检索（插件 recall 的强制 find 路径也用它），只放 search/read/tree/grep/glob 会把最该用的动词排除；server 还有 `list_watches`/`cancel_watch`/`health`，要有明确的拒/放决定。
- **MCP server instructions 是 ov-shield 的未守面。** DSH mcp-client 把 server `initialize.instructions` 作为字面文本并入 system prompt（`server-context.ts`），工具 restrict 不影响它；实测 0.4.22 的 initialize（dev 模式）**没有** instructions，所以今天不泄露，但 server 升级可新增。doctor 应把「无 instructions」列为检查项（出现文本即 warn）。
- **MCP serverInfo 版本是 1.30.0，不是 0.4.22。** 版本矩阵只能读 `GET /health`；doctor 若读 MCP 握手会报假不一致。
- **0.5.1 迁移对我们面的实际影响**：插件 0.5.26 用 `POST /sessions/{id}/commit`（0.5.1 保留，移除的是 `/extract`）；Viki 用 `content/read`、`fs/ls`、`fs/attrs`、`snapshot/commit|restore`、`fs` DELETE——都不在 0.5.1 的删除/改写清单里；`wait` 专用 timeout 我们没有调用；`write(mode=create)` 我们不用。真正的迁移风险是**存储格式（V2 多写/checkpoint）**与**回滚顺序**，不是 Viki 路径。
- **0.5.1 回滚不能只换二进制**：release note 明写「回滚时先恢复兼容备份，不能仅换回旧二进制」。运行态卡的迁移/回滚验收已补这一条。
- **`captureFilters` 覆盖面已核，不用等 0.5.1**：0.5.26 的 `filterCaptureParts` 对 tool part 的 `tool_input` 字符串值与 `tool_output` 做 `s` 替换；`d`/`k` 仍只由文本决定保留/丢弃（与 #5937 描述一致）。部署卡原来「要再核」的开放项可以关掉。
- **DSH 还有两个现成缝没落在卡上**：`ctx.approval`（可审计的一次性人审，Viki「转正」确认应走它，不另造确认框）与 `ctx.settings`（active profile 行的 Config 表单；可给 OV 旋钮一个 UI 落点，但 `setup.sh` 覆盖 dev patch 的问题仍在）。两者在 dev 组合里都已挂（dump-config 的 `settings` / `user-approval` 行）。

**验收可执行性（假绿风险）**

- 部署卡：`pnpm ov-doctor` 只断言 exit code 会假绿——坏配置可能因无关检查失败而 exit 1；应断言**具体 check id 与文案**。原验收「发送前扫描器/过滤器命中假 key」没有实现点：插件自己发 HTTP，DSH 侧无拦截缝；运行态只能靠 `captureFilters`（已验证），doctor 只能静态扫规则，**「发送前扫描器」应降为 doctor 静态检查 + captureFilters 实测，不再声称运行时阻断**。已改设计/验收。
- 运行态卡：回滚验收只写「恢复 0.4.22 + 旧 workspace」不足；须先恢复完整 `storage_path` 兼容备份再换二进制，否则 `/health` 绿而数据已坏。已补。
- 按需检索卡：`pnpm web-expected` 当时只有 `blank-first-open` / `first-open-draft-banner` 两个场景，**都不覆盖 Viki**；「两场景不漂移」抓不到 Viki 回归，是假绿。已改为 Viki 专用渲染/DOM 检查 + 既有两场景不漂移两条。**2026-10-21 复核：S10 已新增第三场景 `desk-eight-matters-first-open`；检索卡验收改为“现有全部场景（当前 3 个，清单以目录为准）”。**
- 按需检索卡：A/B 的「谁做人工评分」未定 → 判据不可执行。建议 agent 按评分表初评 + 人抽查（≥3 条），评分表随 A/B 产出。
- 按需检索卡：转正确认未指定机制 → 第一轮建议走 `ctx.approval`；**2026-10-21 第二轮修正为 P1/P2（面板点击没有 open turn，不能直接套 `ctx.approval`）**。
- 部署卡/Viki：**“脱敏计数”“最近一次发送时间”“pending queue”都没有现成只读源**——插件不暴露运行时脱敏统计；pending queue 是插件进程内状态（磁盘只在 `~/.openviking/pending`），token 用量要靠 `token-meter` 读会话日志。已把展示项改为有源才显示，或明确“doctor 自测摘要代替”，不把不存在的数据写成验收。

**七条未决的当前答案**

1. **0.5.1 迁移**：不能直接升；副本 + 完整存储备份 + 回滚演练（见上）。
2. **只读检索 A1/A2**：A1 成本 ≈2.2k token/轮（实测），A2 待量；没有数据不拍。
3. **skills/experiences**：插件 0.5.26 的注释说 DSH 的 Experience usage 需要完整工具结果（`captureToolResults` 默认 true 的原因），实测 0.4.22：`memories` 下没有 experiences 目录、`/api/v1/agent-evolution` 404、`/api/v1/skills` 在场但 0 条；0.5.1 是否随 commit 生成仍未证。
4. **`skipSubagentSessions`**：agent-team 成员是 `origin: 'subagent'`（agent-team 测试与 DSH 约定一致），会被跳过；团队记忆是资产还是污染仍待人拍板。
5. **云端脱敏**：`captureFilters` 已能替换 tool input/output（见上），但正则可靠性未测；`captureToolResults` 建议云端部署收紧。
6. **peer 切换**：旧事件仍可由默认 `recallPeerScope: all` 扫到；迁移后需用一次真实 search 验证。
7. **Viki 转正**：建议只落 `memory/`（走 `assistant_memory save`）；`knowledge/` 的 `sources` 引 OpenViking URI 留到知识卡，不扩治理面。

**去向（findings → owner/落点）**

| 发现 | 落点 |
|---|---|
| recall 证据纠错（36/77、系统目录 overview、悬空工具提示） | 方向卡正文 + 检索卡「当前情况」 |
| live dev-ov 与安装器模板漂移（commit 阈值） | 运行态卡 §C 落点段 |
| 16 工具 / `find` 缺位 / schema 成本 | 检索卡 A1、A/B 度量与验收 |
| MCP instructions 未守面 | 部署卡 doctor check 6 + 验收 |
| MCP serverInfo 版本不等于 server 版本 | 部署卡 check 9 + 验收 |
| 0.5.1 存储/回滚顺序 | 运行态卡 §B、风险 1、验收 |
| `captureFilters` 覆盖面已核 | 部署卡机制 1、验收（原开放项关闭） |
| `ctx.approval` / `ctx.settings` | 检索卡 §B/§C；方向卡 §6 |
| doctor 断言 exit code / 无发送前拦截点 | 部署卡设计与验收 |
| web-expected 不覆盖 Viki | 检索卡 Viki 验收 |
| A/B 评分责任 | 检索卡未决 1 + 验收 |
| 脱敏计数 / pending queue / token 用量无只读源 | 部署卡「审计与可见性」；检索卡 Viki 设计与验收 |
| experiences 端点/目录证据 | 方向卡未决 3；检索卡数据行 |

同 diff 的文档修正：`ov-shield` 模块注释把 “four house tools” 改为 “five”，并把 “No value is lost” 改为条件声明（只有 `recallContextTimeoutMs` 强制 find 时成立；默认 context 剖面下的悬空工具提示指向检索卡）。零行为改动，不算实施。

**结论**

方向卡的三条判断成立（版本错位、运行态失配、能力面只用了自动注入），且第二条比原卡更严重：2026-10-19 的 recall 实物已经出现「overview + 被拒工具」的断裂。建议维持「修 + 升 + 按需检索 + 人审闭环」的 B 路线；三张实施卡按本轮修正后交人类逐张裁决。**本记录不授权实施。**

### 2026-10-21 · 第二轮内部质量审（按 `_backlog/methods`；只改卡面，不授权实施）

**范围**：四张卡的入口票、评审卡形状、验收可执行性、范围边界、版本与漂移、流程合规。**没有**改行为/配置；`pnpm verify` 43/43。

| # | 发现 | 修复 | 落点 |
|---|---|---|---|
| Q1 | 四卡都在 `等人拍板`，但没有 `下一步` 节点名确切问题（翻转守卫要求） | 方向卡加 `## 下一步` + H1–H6 可勾问题；三张实施卡各加 `下一步` | 四卡 |
| Q2 | 评审卡缺 K 表「现状」列与分角色可勾清单（先例 261018） | 加 K1–K5 表与「请评审什么」H/A 清单；第一轮记录保留 | 本卡 |
| Q3 | 验收是检查清单，未按 `validation-design` 写行为类/证据 owner/能证明/不能证明/人判 | 每卡加「验收证据路由」表；清单保留为可执行断言 | 四卡 |
| Q4 | Viki/存储三卡都声称修（deploy 修 Viki 503/存储；runtime 也修 Viki URL；retrieval 也做 Viki 健康） | 明确 RACI：deploy 修 Viki baseUrl 默认 + doctor 检测存储；runtime 搬家/升级；retrieval 只做面板能力。更新拆卡表、三卡范围表、活跃清单 | 本卡 + 三卡 + `issues/README.md` |
| Q5 | 版本过期：server latest 已是 0.5.1.1（修 0.5.1 的后续 commit 索引 bug），plugin latest 0.5.27；卡仍写 0.5.1/0.5.26 | 加版本矩阵；运行态目标改 0.5.1.1；0.5.1.1 验收加“第二次 commit 后可检索”；0.5.27 单列不自动升 | 本卡 §0/§5 + 运行态卡 |
| Q6 | “两场景”已漂移：S10 2026-10-21 新增 `desk-eight-matters-first-open`，现 3 个；`docs/testing.md`/`docs/architecture.md` 也仍写两场景 | 卡改“现有全部场景（当前 3 个，清单以目录为准）”；docs 同 diff 改为“现有场景”，不再硬编码计数 | 检索卡 + docs |
| Q7 | doctor 可能读错 config：`openviking-up.sh` 派生 `.tmp/openviking/ov.conf` 并让 server 用它；`openviking-server doctor` 默认读 `~/.openviking/ov.conf` | deploy 卡要求 doctor 读运行中 server 的同一份 config（`OPENVIKING_CONF`/派生副本），并加同源断言 | 部署卡 §1/§3/验收 |
| Q8 | 云端脱敏现状为空：dev 无 OV config，`captureToolResults` 对 DSH 默认 true，`captureFilters` 默认 [] | deploy 卡当前情况 + P0 明写“先收口工具结果或配过滤器”，验收给 blocked 出口；README 表去掉 `cloudAck: true` 的二义 | 部署卡 |
| Q9 | `ctx.approval` 与 Viki 面板审计混用：`approval.request` 要求 open turn；面板点击没有 turn；`recordApproval` 是 home 审计（已有 `retire`，可加 `promote`），不是 `approval/asked/decided` 对 | 检索卡拆 P1（面板点击=人授权，host route 调 `assistantMemory.saveMemory` + `promote` 审计）/ P2（模型提案走 `ctx.approval` 对），未选前不写死 | 检索卡 §B/验收 |
| Q10 | 运行态 patch 落点建议不安全：把 OV 行加进 tracked `profile-patch.yml`，fresh dev home 没有 OV 插件时每次启动出现 inactive entry 警告（loader 对非 required 失败只 warn，不阻断，但仍是可选层噪声/依赖倒置） | 改推荐“`setup.sh` 仅在插件在场时追加 OV 行/独立 patch 层”；验收加 fresh home 无插件 case | 运行态卡 §C |
| Q11 | 归档冻结被写成可改：运行态卡要改 archived 层 1 note 与旧卡 §六（notes README 明说 archived 冻结不可编辑） | 改为“新决定 note/当前 owner 记录 3000；归档只读引用”；旧卡/旧 note 不编辑 | 运行态卡关闭条件 |
| Q12 | 本机 live 证据不可复现：dev-ov patch 是 gitignored live 状态，卡把它当证据 | 证据表标注“本机 live，不可从他机复现”；给读取命令；关键结论尽量用 tracked 文件复证 | 本卡 §1 + 运行态卡 §C |
| Q13 | doctor 绿与运行态可用混同：10-21 doctor 全绿，但 `/tasks` 仍有 failed commit | 加复核行；部署卡 check 3 只作配置探测，check 4/5 才是运行态探针 | 本卡 §0 + 部署卡 |
| Q14 | Viki 搜索端点/数据源写混：`/search/search` 是 session-aware；插件无 session 时走 `search/find`；`problems` 是 Viki reader 已返回的读取失败数组 | 检索卡搜索改“面板走 stateless `find`”；`problems` 指明来源；token 用量无客户端源时显示“无数据” | 检索卡 §B/验收 |

**版本复核（2026-10-21）**：server latest `0.5.1.1`（2026-10-20T12:40Z，修 #6331“后续 commit 完成但新记忆搜不到”）；plugin latest `0.5.27`（2026-10-20T13:40Z，变更未审）；DSH pin `0.2.1-rc.2`。**0.5.1 不再是可接受的目标**——它带着运行态卡主症状的那个 bug。

**复核后的判断**：K1/K2/K3 仍成立；K4 维持；K5 仍待人。B 路线不变，但目标版本改 0.5.1.1，且 P0 的云端收口从“文档口径”升级为“当前配置真的没过滤器”的现状修复。**本记录不授权实施；授权见 2026-10-21 人类裁决节。**

## 验收标准

本卡是评审卡，验收 = 评审收敛 + 一次路线裁决，不要求实施。判据、判者与证据：

| # | 判据 | 谁判 | 证据/落点 |
|---|---|---|---|
| V1 | 人类给出 H1 三选一 + H2–H6 的答复 | 人 | 2026-10-21 人类裁决节 |
| V2 | Agent 两轮评审各有一份「证据缺口/漏能力/验收不可执行」清单，每条有 owner/去向 | Agent | 2026-10-20、2026-10-21 两节；[x] |
| V3 | 三张实施卡分别被接受/修改/否决；接受的转 proposed 或收口卡，未接受的写去向 | 人 + Agent | 2026-10-21：接受；三卡保持活跃（已授权规格），推进在收口卡 |
| V4 | K1–K5 每条有现状；未决 7 条每条有结论或后续卡 | Agent | K 表 + 未决状态表 |
| V5 | 活跃清单与归档索引一致；`pnpm verify` 通过 | Agent | `_backlog/issues/README.md` + 归档索引；verify 43/43 |
| V6 | 本卡不产生行为/配置改动；注释级事实修正（ov-shield “No value is lost” 条件化）已记在评审记录，不算实施 | Agent | [x] 2026-10-20 同 diff 已记；2026-10-21 仅卡面/docs |

- [x] V1 人类裁决（H1–H6）：接受 B；H2–H6 按建议。
- [x] V2 两轮 Agent 评审（2026-10-20、2026-10-21），每条有 owner/去向。
- [x] V3 三张实施卡接受；保持活跃（已授权规格），推进在收口卡。
- [x] V4 K 表与未决状态表无“沉默的未决”。
- [x] V5 活跃清单与归档索引一致；`pnpm verify` 43/43。
- [x] V6 无行为/配置改动；注释级修正已记录。

## 关闭条件

- 方向裁决记录在本卡；三张实施卡有明确去向；人类点头后按 [入口关闭条件](../../README.md) 归档。
- 若方向被否决：写清否决理由与替代方向，三张实施卡一并关闭或改写。
- 若只接受其中一张：其余两张标 `叫停` 或改写，不留在活跃区当“以后再说”。
- **归档冻结**：不修改 `_backlog/_archive/` 与 `notes/archived/` 的正文；旧卡 §六 的 20000 与层 1 note 只作历史引用，当前权威写进新决定 note/当前 owner（`vendor/thirdparty/openviking/README.md`、`ov-install.sh`）。

## 关联

- [部署与 doctor](../../issues/261020-openviking-deploy-doctor.md)（P0：云端例外、配置、检测、README、Viki baseUrl 默认）
- [运行态与 0.5.1.1](../../issues/261020-openviking-runtime-repair.md)（P1：升级、持久存储、v3 旋钮、peer/commit/recall）
- [按需检索与 Viki](../../issues/261020-openviking-retrieval-viki.md)（P2/P3：只读检索 A/B、Viki 搜索/转正/健康）
- 既有依据：[层 1 落地 note](../../../notes/archived/2026-10-04-openviking-layer1-landing.md)、[正式接入推敲卡](260929-openviking-formal-integration.md)、[0.5.8→0.5.26 升级 note](../../../notes/implemented/2026-10-19-openviking-pin-catch-up.md)、[Viki B1 note](../../../notes/implemented/2026-10-19-viki-read.md)
- 版本：[v0.5.1.1 release](https://github.com/volcengine/OpenViking/releases/tag/v0.5.1.1)、[plugin 0.5.27](https://www.npmjs.com/package/@openviking/dsh-memory-plugin/v/0.5.27)
- 证据面：[web-face 场景](../../../snapshots/web-face/)、[测试证据地图](../../../docs/testing.md)
