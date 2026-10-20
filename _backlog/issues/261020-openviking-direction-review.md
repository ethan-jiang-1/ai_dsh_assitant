---
status: 等人拍板
opened: 2026-10-20
---

# 评审：OpenViking 层 2 的方向——从“隐形层 1”到可配置、可观测、可按需检索

> 立卡：2026-10-20 ｜ 状态：等人拍板 ｜ 类型：未定 ｜ 可关闭：否 ｜ 评审卡，不授权实施 ｜ 🔒 路线裁决

**给评审者的最短路径：** 先读「问题与期望结果」→「当前情况（证据）」→「方案与取舍」→「请评审者攻击的点」。  
本卡只做方向评审；实施拆在三张卡里：[部署与 doctor](261020-openviking-deploy-doctor.md)、[运行态与 0.5.1](261020-openviking-runtime-repair.md)、[按需检索与 Viki](261020-openviking-retrieval-viki.md)。  
**评审产出：** 人类给“方向认可 / 要改 / 否决”，Agent 给“证据缺口 / 漏掉的能力 / 验收不可执行”清单；每条有 owner 与去向。**本卡不授权写代码。**

## 问题与期望结果

用户 2026-10-20 的原话大意：OpenViking 好像变了、升级了，我们是不是在充分利用它的各种能力，同时和 DSH 的能力配合好？

本轮做了只读审计，结论是：**没有充分利用；而且当前连已经采纳的层 1 也没有跑在设计状态。** 这不是“再加几个功能”的问题，而是三件事同时成立：

1. **版本错位**：server 已到 0.5.1（2026-10-19），我们还钉在 0.4.22；插件已到 0.5.26（2026-10-15），10-19 升过。我们只跟上了插件，没跟上 server。
2. **运行态失配**：dev 组合里的 OpenViking 行没有 config，跑的是插件默认值；v3/召回调参只活在 `dev-ov` 探针 profile。加上模型连接失败、Viki 默认没 URL、记忆库落在 `.tmp`，实际利用率很低。
3. **能力面只用了“自动注入”**：profile + 逐轮 recall + capture/commit；MCP 工具面被整前缀拒，按需检索、技能、经验、人审转正、健康/用量都没接。层 1 的边界是刻意画的，但新版本 + 新 DSH 提供了比“全拒/全放”更细的缝。

**期望结果：** 给出一份方向与拆卡，使后续实施能让这一层**装得对、看得见、守得住、问得到细节**；同时不破坏 working folder 四房间的权威、不把写面放开、不绕过 DSH 治理。

**完成条件：** 评审收敛；三张实施卡被接受/修改/否决；每个未决问题有 owner 或后续卡；不产生行为/配置改动（注释级事实修正除外）。

## 当前情况（证据）

> 观测时间：2026-10-20，当前 dev home；命令都在本机真跑过。样本是当前 home，不是全量历史；结论只说明“现在”，不证明“设计从未工作”。

### 1. 版本与组合

| 事实 | 证据 |
|---|---|
| server 0.4.22；插件 0.5.26；server latest 0.5.1 | `openviking-server --version`；`GET /health` 返回 `"version":"0.4.22"`；插件 `package.json` 0.5.26；[v0.5.1 release](https://github.com/volcengine/OpenViking/releases/tag/v0.5.1) |
| dev 组合的 `openviking-memory-runtime` 行**没有 config** | `ASSISTANT_DSH_HOME=dev/harness-home pnpm dsh --profile dev --dump-config` |
| 调参只写在 `dev-ov` 探针，不在 dev | live `dev-ov` patch（本机、`dev/harness-home/` 已 gitignore）有 `peerId: assistant`、`skillCatalog: false`、`skipSubagentSessions: true`、`profileTokenBudget: 3000` 与召回旋钮；`commitTokenThreshold: 3000` **只在 tracked 的 [ov-install.sh §6](../../dev/experiments/openviking/ov-install.sh) 模板里——live 与模板已漂移**；dev 两处都没有 |
| `pnpm start` 每次覆盖 dev profile 的 patch | [setup.sh](../../dev/env/setup.sh) 的 `cp "$patch" "$dir/cordis.patch.yml"`；tracked 模板 [profile-patch.yml](../../dev/profiles/profile-patch.yml) 只有 preset registry |

**后果：** live 实际跑的是默认值：profile 预算 10000、commit 阈值 20000、子代理会话照抓、peer 跟 git origin、context 召回、skill catalog 开。与层 1 note 的 v3 剖面相反。

### 2. 记忆层当前是否在工作

| 事实 | 证据 |
|---|---|
| 6 条 events；0 profile / 0 preferences / 0 entities | `GET /api/v1/stats/memories` |
| 4 个 session；最近一次 `session_commit` **failed** | `GET /api/v1/tasks`：2026-10-20T07:24:07Z，`"error":"Connection error."`；server.log：commit 失败在 `_run_archive_summary` 的 VLM 调用，`search/find` 失败在 embedding（`embed_compat` → `CircuitBreakerOpen`）——两条出网都断 |
| 检索实际失败 | `POST /api/v1/search/search` 返回 `entries: []`、`retrieval_errors: ["RuntimeError: OpenAI API error: Connection error."]`；`POST /api/v1/search/find` 500 |
| `/health` 仍然绿 | `GET /health` 返回 `"healthy":true`——它不探测模型位 |
| recall 块不是 0，但只有目录 overview | 扫全部 376 个 `session.v4.jsonl.zstd`：36 个会话含 `<openviking-context source="recall">`（77 处，2026-09-29→10-19）；截至审计（2026-10-20）的会话 0 条。2026-10-19 16:01 的两条只有 `viking://user/default/resources` 与 `viking://resources` 两个系统目录、`detail="overview"`，并写 “Use the search/read MCP tools to expand URIs”——这两个工具正被 ov-shield 拒 |

**注意：** 这不是“层 1 从未成功”。层 1 落地 note 有过一次真实往返；现在是**当前故障**（模型连接失败），不能把它误判成架构失败，也不能因为 `/health` 绿就当成可用。“recall 为 0”只对 2026-10-20 的个别会话成立（连接故障期），全量存量反而证明自动 recall 曾经工作——而 2026-10-19 的实物暴露了更关键的断裂：召回块只有 overview，且提示使用被 ov-shield 拒掉的 `search/read`。

### 3. 人面与部署面

| 事实 | 证据 |
|---|---|
| 正常 `pnpm start` 下 Viki 为 503（除非 shell 已导出 `OPENVIKING_URL`） | [viki/index.ts](../../packages/dsh-smart-assistant/src/host/viki/index.ts) 的 baseUrl 只取 config 或 `OPENVIKING_URL`；[start.sh](../../dev/env/start.sh) 不导出该变量；viki 验收 note 用的是 `OPENVIKING_URL=... pnpm start` |
| 记忆库在临时目录 | [openviking-up.sh](../../dev/env/openviking-up.sh) 把 workspace 指到 `.tmp/openviking/workspace`；`.tmp` 是仓内临时根 |
| 云端与“严格本地”冲突 | `~/.openviking/ov.conf` 的 VLM/embedding 指向 SiliconFlow；[README.md](../../README.md) 写“数据边界 = 严格本地（反转属用户）”；用户 2026-10-20 已接受云端例外，但要求写清楚并在部署时检测 |
| Viki 已有能力 | 列 / 读 / 删（先 snapshot）/ 恢复 / 并排比较 / scope 清理；见 [viki-read note](../../notes/implemented/2026-10-19-viki-read.md)、[viki-delete note](../../notes/implemented/2026-10-19-viki-delete.md)、[viki-cleanup note](../../notes/implemented/2026-10-19-viki-cleanup.md) |
| Viki 缺什么 | 搜索/筛选、把一条情景记忆转正到 `memory/`、健康/任务/用量、`problems` 展示；面板目前只列当前树 |

### 4. 模型可见面与治理

- [ov-shield](../../packages/dsh-smart-assistant/src/agent/ov-shield/index.ts) 目前整前缀拒 `mcp__openviking__*`，并遮蔽两个技能名；MCP 资源桥也按 server 名拒。写面守住是对的。
- 代价是**没有按需检索**：自动 recall 只给一段有界内容；模型无法“问细节”，也无法把指针展开成叶子。2026-10-19 的实物正好停在这一步：召回块只有 `detail="overview"` 的目录摘要，并提示用 `search/read`——这两个工具被 ov-shield 拒。ov-shield 模块注释里 “No value is lost” 只在 `recallContextTimeoutMs` 强制 find 的剖面下成立；默认 context 剖面下不成立（注释已同 diff 改为条件声明）。
- DSH 0.2.1 的 `ctx.tools.restrict` 支持 **allow list**（[tools.md](../../vendor/dsh/docs/subsystems/tools.md) 第 165–174 行），所以“只放 find/search/read/tree/grep/glob、继续拒写”在机制上可行；这不等于应该这么做，需要量 tool-schema 成本和命中收益。
- 0.5.x 的 `skillCatalog` 是活旋钮（默认 true），但 server 当前 0 个技能；两个内置技能又被遮蔽。若将来有技能，目录会“广告了但加载不了”，除非做 DSH provider 或放开 `add_skill`/`read`。

### 5. 新版本提供了什么（只列与我们相关的）

| 版本 | 能力 | 与我们的关系 |
|---|---|---|
| server 0.5.0 | Working Memory 默认关；commit 归档全部消息；context 模式不再返回系统目录；`exclude_uris` 支持子树；DSH 只在真实用户输入时召回；session ID 规范化 | 直接命中我们当前的 archive 摘要失败、短会话丢记忆、召回质量 |
| server 0.5.1 | commit/锁/任务 owner 修复；archive 完成标记；Gateway 内嵌；隐私字段；batch write；多模态；compile；MCP download；DSH 压缩/启动时提交待处理消息 | commit 可靠性、云端脱敏、部署形态；多模态需多模态 embedding，暂不适用 |
| plugin 0.5.26 | profile/recall/capture/commit；MCP 桥；skills provider；pending queue drainer；`recallExcludeUris`、`recallQueryExpansion`、`captureToolResults`、`skipSubagentSessions`、`peerSource/workspacePeer` 等活旋钮；`mcpEnabled`/`takeoverEnabled`/`resumeArchiveInject`/`skillExperience`/`usageView`/`usageOutput`/`autoCommitOnCompact`/`repoContext` 在 DSH 仍是死旋钮 | 我们要围绕活旋钮设计，不要围绕死旋钮设计 |

来源：[v0.5.0 release](https://github.com/volcengine/OpenViking/releases/tag/v0.5.0)、[v0.5.1 release](https://github.com/volcengine/OpenViking/releases/tag/v0.5.1)、[插件 latest](https://www.npmjs.com/package/@openviking/dsh-memory-plugin)。

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
| `ctx.approval` | 可审计的一次性人审（`approval/asked` 与 `approval/decided` 审计对） | Viki「转正」的确认应走它，不另造确认框 |

## 已知与未决

**已知：**
- 用户已接受云端记忆抽取/embedding；要求把它写成明确例外（可出/脱敏），并在 README 和部署检测里引导用户配对所有配置。
- 插件 0.5.26 已在位；server 0.4.22；0.5.1 是当前 latest。
- 当前 recall/commit 失败是模型连接问题（或 server 进程环境问题），不是“层 1 设计失败”。
- 层 1 的治理边界（写面不放开、四房间权威、人审）不因本方向改变。

**未决：**
1. 0.5.1 能否直接读 0.4.22 的 workspace？迁移项（extract 移除、create 覆盖、trusted 根 key、wait timeout、存储格式）哪些会影响我们？**必须在副本上验证，不能直接升。**
2. 只读检索走 **MCP allowlist** 还是 **DSH native tool**？需要的证据：tool-schema token、模型选择正确率、召回命中、维护成本。
3. 0.5.x 的 **skills / experiences** 是否随 commit 自动生成？我们是否已经在喂数据但没消费？值得 surface 吗？
4. `skipSubagentSessions: true` 是否也要跳过 agent-team 成员？团队记忆是污染还是资产？
5. 云端脱敏的正则/过滤能否可靠拦住密钥、PII、第三方机密？`captureToolResults: true` 是否应改成过滤后的摘要？
6. peer 从 git origin 切到 `assistant` 后，现有 6 条 events 怎么迁移/召回？`recallPeerScope: all` 是否足够？
7. Viki 的“转正”是否只做 `memory/` 一条路径，还是也允许知识页 `sources` 引用 OpenViking URI？

## 方案与取舍

| 方案 | 做法 | 判断 |
|---|---|---|
| A. 只修 | 修网络、存储、Viki URL、旋钮；不加新能力 | 能让层 1 恢复，但回答不了“充分利用新版本”；不选 |
| **B. 修 + 升 + 按需检索 + 人审闭环** | 先 P0 部署/可观测，再 P1 0.5.1 + 运行态，再 P2 只读检索 + Viki 治理 | **推荐**；每步独立可回退 |
| C. 换 Gateway | 用 0.5.x Gateway 注入记忆，不装插件 | 绕过 DSH 工具/技能/`ov-shield` 治理；与“四房间权威 + 写面守住”冲突；不选 |
| D. 放开全部 MCP | 让模型直接用 16 个工具 | 写面、工具噪声、模型在 `assistant_memory` 与 `remember` 之间选错房间；不选 |
| E. 等上游 | 等插件把 `mcpEnabled`/skill mount 做成活旋钮 | 上游 0.5.26 仍未接；我们的 `ov-shield` 已经是原生缝；不选“干等” |

**拆卡理由：** 三张实施卡分别对应三个独立风险面——
1. [部署与 doctor](261020-openviking-deploy-doctor.md)：配置/云端例外/检测/文档，不改模型可见面；
2. [运行态与 0.5.1](261020-openviking-runtime-repair.md)：升级、存储、旋钮、Viki URL，风险在迁移；
3. [按需检索与 Viki](261020-openviking-retrieval-viki.md)：模型可见面/UI 行为，风险在工具面与治理。
这样人类可以只批其中一张，Agent 可以逐张攻击，不会把“升级风险”和“工具面决策”混在一个 diff 里。

## 新 Viki + 新 DSH 能力图（评审用）

| 能力 | 提供方 | 建议用法 | 现在做？ |
|---|---|---|---|
| 只读 MCP（find/search/read/tree/grep/glob） | Viki 0.5.26 + DSH `restrict` allow | 写面继续整前缀拒；只读按 allowlist 放，先量 token/命中 | P2，先 A/B |
| 单工具 native recall | 我们自己的 DSH 工具 | 一个 `assistant_recall`（find/search/read/tree），presenter + scope | P2 备选 |
| skills 目录 / `add_skill` | Viki server + DSH `ctx.skills` | 自定义 provider 读 `viking://~/skills`，走标准 `skill` 工具 | P3，有真实 skill 再触发 |
| experiences / agent-evolution | Viki server | 先查是否随 commit 自动生成；再决定是否 surface | P3，先观察 |
| Working Memory off / commit 修复 | Viki 0.5.1 | 升级后默认少一次 VLM 调用、commit 更稳 | P1 |
| privacy fields | Viki 0.5.1 | 云端脱敏的第二道闸（不替代第一道） | P1/P2 |
| Gateway | Viki 0.5.1 | **不用**：绕过 DSH 治理 | 不做 |
| `ctx.tools.restrict` allow | DSH 0.2.1 | 只读 MCP 的落点 | P2 |
| client slots | DSH 0.2.1 | Viki 健康/任务/用量/`problems` | P0/P3 |
| `message-feedback` | DSH 0.2.1 | log-only；O4 修正消费者要自建 | 以后 |
| `session-projection` | DSH 0.2.1 | per-session 状态；外部健康不值得投影 | 不做/按需 |
| `agent-team` | DSH 0.2.1 | 成员是 subagent；团队记忆是否跳过要拍板 | 待定 |
| `token-meter` | DSH 0.2.1 | 云端成本/召回块成本可见 | P0/P3 |

## 请评审者攻击的点

**人类评审（产品/边界/优先级）：**
1. 这张方向卡是否抓住了“充分利用新版本”的主线？有没有把“修”误当成“扩”？
2. 云端例外按“对话/记忆可出，凭据/PII/第三方机密默认脱敏”的口径，是否够用？哪些业务内容必须默认不出？
3. 先做部署/可观测，还是先做按需检索？在真实使用还不多的情况下，P0 的 doctor 是否值得先投入？
4. Viki 的“转正到 `memory/`”是否现在就需要？还是先只做搜索/健康？
5. 0.5.1 升级是否值得冒迁移风险？还是先 0.4.22 修到能用，等下一次真实使用周期再升？

**Agent 评审（证据/机制/验收）：**
1. 证据是否足够支撑“当前层 1 没跑在设计状态”？有没有漏掉的反证（例如某些会话确实有 recall）？
2. 0.5.1 的迁移项里，哪些会直接影响 Viki 的 `snapshot/delete/restore`、插件的 `search/commit`、`viking://user` 路径？
3. 只读 MCP allowlist 的 tool-schema token 成本是否可接受？有没有 DSH 侧更细的过滤/可见性 API 被我漏掉？
4. `captureToolResults: true` 与云端例外是否冲突？OpenViking 的 `captureFilters` 在 0.5.26 是否覆盖 tool input/output 的替换（0.5.1 release 说替换范围扩大）？
5. 0.5.x 的 experiences 是否真的会自动生成？如果不会，`captureToolResults` 的价值是什么？
6. `skipSubagentSessions` 对 agent-team 的覆盖是否符合产品预期？
7. 三张实施卡的验收是否可执行、是否有假绿风险？

## 评审记录（意见回流的家）

**规则**：各角色意见按小节追加于此（带日期）；对卡内事实的修正同 diff 改正文，并在本节留一行。评审收敛 = 人类裁决 + 三张实施卡各有去向。

### 2026-10-20 · 第一轮 agent 核验（证据 / 机制 / 验收三路，只读）

**证据（对正文事实的纠错，已同 diff 改正文）**

- **recall 块不是 0。** 全量扫 376 个 `session.v4.jsonl.zstd`（`zstd -dc | grep openviking-context`）：36 个会话含 `<openviking-context source="recall">`（77 处，2026-09-29→10-19）；截至审计（2026-10-20）的会话 0 条（模型连接故障期）。原文「recall 块 0」只对个别会话成立，不能当全量事实。
- **2026-10-19 的 recall 实物**（`session-7feeda6d-cdd3-4a57-ab3e-d8d374351fae`，07:52Z / 08:00Z）：两条块都只有 `viking://user/default/resources` 与 `viking://resources` 两个系统目录、`detail="overview"`，并写 “Use the search/read MCP tools to expand URIs”；这两个工具被 ov-shield 拒，模型拿到的是**无法执行的指令**。这既证明自动 recall 曾经工作，也把「只给指针 + 工具被拒」从推测变成实物。
- **`commitTokenThreshold: 3000` 不在 live dev-ov。** live dev-ov patch 实有 peer/skillCatalog/skipSubagent/预算/召回旋钮，没有 commit 阈值；3000 只在 tracked 的 `ov-install.sh` §6 模板与层 1 note 里。live 与安装器模板已漂移——这本身是运行态卡要收的口子。
- **Viki baseUrl 现值为空**（`config.baseUrl || OPENVIKING_URL || ''`），不是 1933；「默认 1933」是实施建议，已改为建议语气。
- 其余 live 证据可复现：`/health` 0.4.22 绿、6 events/0 profile、最近 commit failed（`4e16b6d1…`，`Connection error`）、`search` 空 + `retrieval_errors`、`find` 500、dump-config 的 OV 行无 config。

**机制与能力（升级后的 Viki / DSH 还有哪些没被用上）**

- **MCP 工具面实测 16 个**（不是 12）：`find search read list tree remember write edit add_resource add_skill list_watches cancel_watch grep glob forget health`。全量 schema ≈20.6KB ≈5.7k token；只读子集（find/search/read/list/tree/grep/glob/health）≈7.9KB ≈2.2k token。**A1 的每轮成本按 ~2.2k token 计**，按需检索卡已把数字写进 A/B。
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
- 按需检索卡：`pnpm web-expected` 当前只有 `blank-first-open` / `first-open-draft-banner` 两个场景，**都不覆盖 Viki**；「两场景不漂移」抓不到 Viki 回归，是假绿。已改为 Viki 专用渲染/DOM 检查 + 既有两场景不漂移两条。
- 按需检索卡：A/B 的「谁做人工评分」未定 → 判据不可执行。建议 agent 按评分表初评 + 人抽查（≥3 条），评分表随 A/B 产出。
- 按需检索卡：转正确认未指定机制 → 走 `ctx.approval`，审计复用 `approval/asked` 与 `approval/decided`。
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

## 验收标准

本卡是评审卡，验收 = 评审收敛 + 一次路线裁决，不要求实施：

- [ ] 人类评审给出三选一：**方向认可 / 要改（列改动）/ 否决（写理由）**。
- [x] Agent 评审给出至少一份「证据缺口 / 漏能力 / 验收不可执行」清单；每条有 owner 与去向（2026-10-20 第一轮，见评审记录；修正已回写正文与三张实施卡）。
- [ ] 三张实施卡分别被接受 / 修改 / 否决；接受的那张在用户点名后转 proposed 或收口卡，未接受的写去向。
- [ ] 「已知与未决」7 条每条有结论或后续卡；没有“沉默的未决”。
- [ ] `_backlog/issues/README.md` 活跃清单与四张卡一致；`pnpm verify` 通过（或记录与本次无关的既有失败）。
- [ ] 本卡不产生行为/配置改动；注释级事实修正（ov-shield 的 “No value is lost” 条件化）已记在评审记录，不算实施。

## 关闭条件

- 方向裁决记录在本卡；三张实施卡有明确去向；人类点头后按 [入口关闭条件](../README.md) 归档。
- 若方向被否决：写清否决理由与替代方向，三张实施卡一并关闭或改写。
- 若只接受其中一张：其余两张标 `叫停` 或改写，不留在活跃区当“以后再说”。

## 关联

- [部署与 doctor](261020-openviking-deploy-doctor.md)（P0：云端例外、配置、检测、README）
- [运行态与 0.5.1](261020-openviking-runtime-repair.md)（P1：升级、持久存储、v3 旋钮、Viki URL）
- [按需检索与 Viki](261020-openviking-retrieval-viki.md)（P2/P3：只读检索 A/B、Viki 搜索/转正/健康）
- 既有依据：[层 1 落地 note](../../notes/archived/2026-10-04-openviking-layer1-landing.md)、[正式接入推敲卡](../_archive/settled_issues/260929-openviking-formal-integration.md)、[0.5.8→0.5.26 升级 note](../../notes/implemented/2026-10-19-openviking-pin-catch-up.md)、[Viki B1 note](../../notes/implemented/2026-10-19-viki-read.md)
