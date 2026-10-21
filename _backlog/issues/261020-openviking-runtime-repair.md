---
status: 推敲中
opened: 2026-10-20
---

# 推敲：OpenViking 运行态修复——0.5.1.1 升级、持久存储与 v3 旋钮

> 立卡：2026-10-20 ｜ 状态：推敲中 ｜ 类型：Task ｜ 可关闭：否 ｜ 已授权实施（H1 B / H2–H6 按建议）｜ 推进台账 = [收口卡](261021-openviking-viki-closure.md)

**给评审者的最短路径：** 先读「问题与期望结果」→「当前情况」→「方案与取舍」→「验收标准」→「下一步」。  
上游背景与审计证据在 [方向评审卡](../_archive/settled_issues/261020-openviking-direction-review.md)；配置/检测/README/Viki baseUrl 在 [部署卡](261020-openviking-deploy-doctor.md)。**本卡不授权写代码。**

## 问题与期望结果

**观察到的行为：** 层 1 已经“采用”，但 live 没有跑在设计状态：

- server 还是 0.4.22；插件 0.5.26。**server latest 已是 0.5.1.1**（0.5.1 的补丁，修“后续 commit 完成但新记忆搜不到”）；0.5.x 的 Working Memory 默认关、commit/锁修复、召回改进都没拿到。
- dev 组合的 `openviking-memory-runtime` 行没有 config；`pnpm start` 每次用 tracked 的 [profile-patch.yml](../../dev/profiles/profile-patch.yml)（只有 preset registry）覆盖 dev patch。v3/召回调参只活在 `dev-ov` 探针（本机 live，`dev/harness-home/` 已 gitignore），不在 dev；tracked 的 [ov-install.sh §6](../../dev/experiments/openviking/ov-install.sh) 模板是另一组（含 commit 阈值），与 live dev-ov 已漂移。
- 最近一次 `session_commit` failed；`/search/search` 报模型连接错误；最近一次会话 recall 块为 0（连接故障期；2026-10-19 的 recall 只有目录 overview，见方向卡证据）；`/health` 仍绿。
- 记忆库在 `.tmp/openviking/workspace`；现有 6 条 events 在那里，清扫/换机即丢。
- peer 跟 git origin（`github.com-ethan-jiang-1-ai_dsh_assitant`），不是“跟助手走”；换工作目录/克隆会分叉。
- Viki 默认 503（baseUrl 问题，归**部署卡**修）；正常 `pnpm start` 看不到记忆层状态（面板能力归**检索卡**）。

**期望结果：** 升级到 **0.5.1.1**（在副本验证后 pin）；记忆库持久；v3 旋钮真正生效且不会被 `pnpm start` 冲掉；peer 按产品意图固定；commit/recall 有一次真往返（含第二次 commit 后可检索）；Viki 连接由部署卡修好后本卡回归 200；失败不再静默。

**完成条件：** 0.5.1.1 在副本上通过迁移/往返验证后 pin；现有 6 条记忆迁移且可召回；**第二次 commit 生成的新记忆可 `find`/`search` 到（0.5.1.1 的修复点）**；`dump-config` 显示目标 config；一次真实会话产生 recall 块且 commit 成功；fresh dev home 无 OV 插件时不因 OV 行失败/噪声；回滚方案可执行。

## 当前情况（证据）

| 事实 | 证据 |
|---|---|
| 版本矩阵（2026-10-21） | server 0.4.22 在位；latest **0.5.1.1**（2026-10-20T12:40Z，修 #6331：后续 commit 完成但新记忆 `find`/`search` 搜不到）；plugin 0.5.26 在位；latest 0.5.27（2026-10-20T13:40Z，变更未审）；DSH `0.2.1-rc.2` |
| server 0.4.22 | `openviking-server --version`；`GET /health` 的 `version` |
| 插件 0.5.26 | `dev/harness-home/profiles/dev/package.json` 指向 0.5.26 tgz |
| 最近 commit failed | `GET /api/v1/tasks`：最新 failed `session_commit` 2026-10-20T14:13Z，`"error":"Connection error."`；更早 07:24:07Z 也 failed；server.log 的 `_run_archive_summary` |
| **doctor 绿 ≠ 运行态可用** | 2026-10-21：`openviking-server doctor --config .tmp/openviking/ov.conf` **All checks passed**，但 `/tasks` 仍有 failed commit；不带 `--config` 的 doctor 读 `~/.openviking/ov.conf`，与运行中 server 不同源 |
| 检索失败 | `POST /api/v1/search/search` 的 `retrieval_errors`；`find` 500 |
| 6 条 events，0 profile/偏好/实体 | `GET /api/v1/stats/memories` |
| recall 存量 | v4 档 36/379 个会话曾有 recall；v3 档 63 个 0 命中；10-19 的只有系统目录 overview（见方向卡 §0/评审记录） |
| 调参未生效 | [profile-patch.yml](../../dev/profiles/profile-patch.yml) 只有 preset registry；[setup.sh](../../dev/env/setup.sh) 的 `cp` |
| 独立探针的调参（**本机 live，gitignored，不能从他机复现**） | dev-ov patch：`peerId: assistant`、`skillCatalog: false`、`skipSubagentSessions: true`、`profileTokenBudget: 3000`、`recallPreferAbstract: false`、`recallMaxContentChars: 2000`、`recallLimit: 6`、`recallMaxTokens: 2400`、`recallQueryExpansion: off`、`recallContextTimeoutMs: 3000`。**没有 `commitTokenThreshold`**——tracked 的 [ov-install.sh §6](../../dev/experiments/openviking/ov-install.sh) 模板写 3000，live 与模板已漂移。读取命令：`sed -n '1,80p' dev/harness-home/profiles/dev-ov/cordis.patch.yml` |
| 记忆库位置 | [openviking-up.sh](../../dev/env/openviking-up.sh) 的 `.tmp/openviking/workspace`；派生 config 也写 `.tmp/openviking/ov.conf` |

**注意：** 当前连接失败是模型/网络层的问题，不是 0.5.1.1 能自动修的；升级前先把“server 能到达模型位”查清，否则升完还是空。`/health` 绿 ≠ 记忆可用；**doctor 绿也 ≠ 运行态可用**（2026-10-21 实测）。

## 实施记录（2026-10-21，P1 部分）

- **0.5.1.1 副本验证 → 现网**：`uv tool install` 被文件沙箱挡在 `~/.cache/uv`；改用 `dev/harness-home/openviking/server` 隔离 venv（`uv venv` + `uv pip install openviking==0.5.1.1`，cache 在 `.tmp/uv-cache`）。副本 `.tmp/ov-test` 先跑：`/health` **0.5.1.1**、`/stats/memories` **6**、`content/read` 正常、`POST /search/find` 返回“合同”记忆命中；随后切到 live `1933`。
- **存储搬家**：live workspace = `dev/harness-home/openviking/workspace`（持久、gitignored；`/stats` 仍 6）；派生 config = `dev/harness-home/openviking/ov.conf`；0.4.22 原 `.tmp` 数据备份为 `workspace-0.4.22-backup` 与 `workspace-0.4.22-live`。`openviking-up.sh` 的状态/config/日志改到 `$DSH_HOME/openviking/`，server 优先 `$DSH_HOME/openviking/server/bin/openviking-server`，缺失才回退 PATH。
- **v3 旋钮落点**：新增 [`dev/profiles/profile-patch-ov.yml`](../../dev/profiles/profile-patch-ov.yml)；[`setup.sh`](../../dev/env/setup.sh) 只在该 profile 的 `package.json` 真有 OV 插件时追加。`pnpm dsh --profile dev --dump-config` 显示 `peerId: assistant`、`profileTokenBudget: 3000`、`recallPreferAbstract: false`、`recallContextTimeoutMs: 3000`、`commitTokenThreshold: 3000`、`captureToolResults: false`；无插件的 fresh home 不追加。
- **真机 Viki 回归**：`Viki(调试)` tab + 搜索「合同」返回 **6 条**（0.5.1.1 修复 #6331 的检索路径）；`/health` = 0.5.1.1。v3 config 在**新会话**生效（既有会话保持旧 generation）。
- **两次 commit（副本，不污染 live）**：副本 `1934` 的 `dsh-sentinel-20261021`：A commit **completed**（25.9s）→ `find` 命中 `viking://user/default/peers/assistant/memories/events/2026/10/21/合同尾款到账确认.md`；B commit **completed** → `find` 命中 `.../供应商发票付款计划确认.md`；`/stats/memories` 6 → 9。证明 0.5.1.1 的 #6331 修复；live `1933` 仍 6。
- **回滚（副本）**：把 `workspace-0.4.22-backup` 完整恢复到 `.tmp/ov-rollback/workspace`，用 0.4.22 二进制起 `1935`：`/health` 0.4.22、`/stats/memories` 6、`content/read` 正常；停掉 1935 后 live `1933` 仍 0.5.1.1/6 条。回滚顺序 = 恢复完整 storage 备份 → 换回 0.4.22，已执行。
- **真机 recall + live commit（2026-10-21）**：修掉 `loop-probe` 被首屏“预览版说明”挡住的问题后，真实会话 `session-9a7fe14d...` 的日志出现 `<openviking-context>`，内含 `<memory ... detail="full">` 的「合同款项状态提醒」事件（不是只有 overview）；模型据此回答“没有到账确认/无凭证”，并指出“尾款 vs 第二期款”的歧义。随后 live `session_commit` **completed**（`6b9ba499-…`，102s，`memory_write:1`/`memory_edit:2`，stats 6→8），`/tasks` 无 failed。**新记忆在 `peers/assistant`（Viki 列表显示“来自 assistant”），v3 `peerId` 对新写入生效；旧 6 条仍在 github peer，未回填。**
- **预算/召回量测（2026-10-21 抽样，`deepseek-flash`，dev home 活跃会话）**：3 个含 `<openviking-context>` 的会话各 1 个 recall 块，**6 条记忆 / `detail="overview"` / 约 3.3k 字符（≈830 token）**；对应 assistant turn 的 `inputTokens` 分别为 4840 / 3442 / 1888，recall 占 17% / 24% / 45%。**口径限制**：不是受控预算实验（配置/题面/历史长度都不同），只作“recall 块实际会占多少”的抽样；`detail="overview"` 也再次印证“只给指针”的现状，按需 `assistant_recall` 是展开路径。样本会话：`2fbe51d1`、`d5c5a4f7`、`f90049fb`。
- **旧 peer 回填决定（2026-10-21）**：**不做**。`POST /api/v1/search/find` 实测能命中旧 `github.com-…` peer 的「摘要预算超限提醒」（score 0.84），说明 `recallPeerScope: all` 覆盖旧 peer，搬移只会抹掉 provenance；新写入固定走 `assistant` peer 即可。若未来要统一展示，按“copy 而非 move”另立触发条件。
- **仍未完成**：用户 review；doctor 读运行中同源 config + cloud ack（归部署卡）。**受控预算 A/B 不阻塞 landing**：抽样已记；触发条件 = 预算告警或召回质量回归时再跑（同 prompt、OV 开/关两 home、比 inputTokens 与 recall 块）。

## 方案与取舍

### A. 版本

| 方案 | 做法 | 判断 |
|---|---|---|
| A1. 留在 0.4.22 | 只修网络/存储/旋钮 | 风险最小；但 archive 摘要失败、commit 老 bug、召回旧行为还在；回答不了“用新版本” |
| **A2. 升 0.5.1.1，副本验证后 pin** | 备份 workspace → 副本装 0.5.1.1 → doctor/往返/Viki → pin | **推荐**；0.5.1.1 修的正是“后续 commit 完成但新记忆搜不到”，比 0.5.1 更贴合主症状 |
| A3. 跟 main/更高版本 | 追最新开发分支 | 不稳定；不选 |
| A4. 0.5.1 | 只拿 Working Memory off，避开 0.5.1.1 补丁 | 0.5.1 带着后续 commit 索引 bug；不选 |
| A5. 0.5.0 | 只拿 Working Memory off，避开 0.5.x 迁移 | 0.5.1 的 commit/锁修复正是我们要的；不选 |

**0.5.0/0.5.1/0.5.1.1 的相关收益：** Working Memory 默认关（不再为 archive 摘要调 VLM）；commit/锁/任务 owner 修复；context 召回不再返回系统目录；`exclude_uris` 子树；DSH 压缩/启动提交待处理消息；privacy fields（云端脱敏第二道闸）；**0.5.1.1 的后续 commit 索引修复**。
**0.5.1.x 的迁移风险：** `POST /sessions/{id}/extract` 移除（我们不用）；`write(mode=create)` 变成覆盖（Viki 不写；MCP 写面被拒）；trusted 模式要 `root_api_key`（我们用 dev，但部署要写清）；wait 专用 timeout 移除（我们不用）；存储格式/多写变化（默认本地，需副本验证）。**0.5.1.1 是 0.5.1 的补丁，迁移面相同。**

**插件版本**：0.5.26 在位，latest 0.5.27（2026-10-20）。本卡不自动升 0.5.27——变更未审；若要升，按 pin 升级单独评审，不混进 server 迁移。

### B. 存储

| 方案 | 做法 | 判断 |
|---|---|---|
| B1. 保持 `.tmp` | 不动 | 不可接受：长期记忆在临时目录 |
| **B2. `dev/harness-home/openviking/workspace`** | 与 DSH home 同级、仓内、gitignore | **推荐（dev）** |
| B3. `<assistant dataDir>/viki` | 跟 working folder 走 | 产品部署更合理；dev 可先用 B2 |
| B4. `~/.openviking/workspace` | 上游默认 | 文件沙箱挡；除非用户显式给权限 |

**迁移：** 停 server → 备份完整存储根（当前 `.tmp/openviking/workspace`，8.2M，含 `_system`/`vectordb`/`viking`；release note 要求备份完整 `storage_path`，不是只拷内容目录）→ 拷到持久路径 → 改 `openviking-up.sh` 的 workspace **与派生 config** → 起 server → `/stats/memories` 仍 6 → 抽查一条 `content/read` → 跑一次 search。保留旧副本直到验收。**回滚顺序：先恢复兼容备份，再换回 0.4.22；不能只换二进制。** 部署卡的 doctor check 7 只负责从运行中 config 报红；搬家是本卡。

### C. 旋钮

| 旋钮 | 现值（live） | 目标 | 理由 |
|---|---|---|---|
| `peerId` | 空（git origin） | `assistant` | 记忆跟助手走，不随 cwd 分叉；旧 peer 仍可被 `recallPeerScope: all` 扫到 |
| `skillCatalog` | 默认 true | `false` | server 当前 0 skills；避免广告加载不了的技能 |
| `skipSubagentSessions` | 默认 false | `true`（子代理）；**agent-team 由 H6 定** | 子代理噪声不进记忆；团队记忆是否要，方向卡 H6 拍板 |
| `profileTokenBudget` | 10000 | 3000 | 默认会把桌面翻三倍 |
| `commitTokenThreshold` | 20000 | 3000 | 短会话也进抽取（S13）；当前权威 = 新决定 note/`ov-install.sh` 模板。**归档的旧卡 §六（20000）与层 1 note 不编辑**，只作历史引用 |
| `recallContextTimeoutMs` | 0 | 3000 | 强制 find 路径，叶子内容进召回块（dev-ov 实测） |
| `recallPreferAbstract` | true | false | 降级路径要叶子，不要目录摘要 |
| `recallMaxContentChars` | 500 | 2000 | 同上 |
| `recallLimit` | 10 | 6 | 显式配额；默认用 server coding preset |
| `recallMaxTokens` | 未设 | 2400 | server 组装预算 |
| `recallQueryExpansion` | auto | off | dev-ov 实测命中不变，省延迟 |
| `captureToolResults` | dsh 默认 true | **由部署卡 H2 定** | 云端例外下先收口；本卡不单独拍。若 experiences 需要再评 |

**落点：** 不能只写 `profiles/dev/cordis.patch.yml`（会被 setup 覆盖）。三个选项：

1. **把 OV 行加进 tracked 的 [profile-patch.yml](../../dev/profiles/profile-patch.yml)**——最简单；但 fresh dev home 没有 OV 插件时，这一行会变成 inactive entry。DSH 的 `auditStartupEntries` 对**非 required** 失败只 warn 不阻断（`vendor/dsh/packages/boot/app-boot/src/index.ts`），所以不会炸启动，但每次 `pnpm start` 都会多一条“entry did not activate”警告——可选增强变成了常态噪声，且依赖倒置（dev profile 声称依赖一个可选包）。**除非 fresh-home 无插件验收也通过，不选。**
2. **改 `setup.sh` 为“复制模板 + 仅在 OV 插件在场时追加/保留 OV 行”**——**推荐**；通用，且保住“可选增强不能成单点故障”。注意 patch 语义是**同 id 整行覆盖**，不是深合并；追加前先删同 id 行，幂等。
3. **独立 patch 层**（在 `dev/profiles/` 下另建 OV patch，具体文件名实施时定；`pnpm start` 按插件在场选择是否 `--patch`）——最干净，但给启动链加一个分支；若以后多 profile 再抽。

**另修一处漂移**：live dev-ov 少了 installer 模板的 `commitTokenThreshold`，实施时顺手对齐，避免下一次又拿探针当模板。**不要**把 live dev-ov 当模板来源；以 tracked `ov-install.sh` §6 + 新决定 note 为准。

### D. Viki 连接（不在本卡修）

- `assistant-viki` 的 baseUrl 默认由**部署卡**修（当前空 → 503）；本卡只做升级后回归：正常 `pnpm start` 后 `GET /api/assistant/viki` 仍 200。
- Viki 面板的搜索/健康/任务/转正归**检索卡**；本卡不复制。

## 非目标

- 不修 Viki baseUrl/面板（部署卡/检索卡）。
- 不改 `ov-shield` 的写面策略。
- 不做只读检索/工具面（[按需检索卡](261020-openviking-retrieval-viki.md)）。
- 不升 plugin 0.5.27（未审；单独 pin 评审）。
- 不接 Gateway、不启用 takeover、不把 OpenViking 变成必需依赖。
- 不自动清理旧 peer/旧记忆；迁移策略单独评审。
- 不改写归档的旧卡/层 1 note（冻结）。

## 风险与未决

1. **0.5.1.1 存储迁移**：必须在副本上验证；失败时**先恢复兼容备份，再回滚到 0.4.22**（release note：不能仅换回旧二进制）。不要在主 workspace 直接升。0.5.1.1 是 0.5.1 的补丁，迁移面相同。
2. **模型连接失败**：升级前先查 server 进程的环境（代理/网络）与运行中 config 的 VLM/embedding 两组 key/model；当前日志里 VLM（commit）与 embedding（search/find）都报 `Connection error`，embedding 还开了 circuit breaker（200s）——只修 VLM 不够。否则升完还是空。不能把“连接失败”误记成“0.5.1.1 没修好”。
3. **peer 切换**：现有 6 条在 git peer 下；切到 `assistant` 后新写入去新 peer，旧记忆靠 `recallPeerScope: all` 召回。要验证召回仍覆盖旧 peer。
4. **commit 阈值 3000 vs 20000**：层 1 note 的 S13 结论是 3000；归档的正式卡 §六 仍写 20000。本卡按 3000；**旧卡/旧 note 冻结不编辑**，由新决定 note 与 `ov-install.sh` 记录 3000 并互链。
5. **agent-team**：成员是 `origin: 'subagent'`，`skipSubagentSessions: true` 会跳过团队记忆；这是产品选择，由方向卡 H6 拍板。本卡默认只覆盖子代理，不把团队记忆写进验收。
6. **Viki 的 1MB 上限/树遍历**：记忆增长后列表会慢；本卡不做分页/搜索（留给按需检索卡）。
7. **fresh home 无 OV 插件**：若把 OV 行写进 tracked patch（选项 1），fresh home 会出现 inactive entry 警告；验收必须覆盖无插件 case，否则不选选项 1。
8. **doctor 绿 ≠ 运行态**：见当前情况；升级后仍需 `/tasks` + 真实会话召回，不以 doctor 绿收口。

## 验收标准

**证据路由（行为类 / owner / 能证明 / 不能证明 / 人判）**

| 验收组 | 行为类 | 证据 owner / 命令 | 能证明 | 不能证明 | 人判 |
|---|---|---|---|---|---|
| 版本与迁移 | 编排 | `openviking-server --version`、`/health`、副本目录、`/stats/memories`、`content/read` | 0.5.1.1 能读旧 workspace、6 条仍在 | 长期稳定性/全部记忆类型 | 无 |
| 新记忆可检索 | 集成 | 副本上**两次** commit：第一次与第二次各生成一条 sentinel，`find`/`search` 都能命中 | 0.5.1.1 的 #6331 修复 | 生产 provider 的长期索引 | 无 |
| 持久存储 | 编排 | 停/启 server + `/stats` + 路径检查 | 搬家后重启仍 6 条 | 备份可恢复性（回滚演练管） | 无 |
| 旋钮落点 | 编排 | `dump-config` + `pnpm start` 后再 dump；fresh home 无插件 case | config 不被 setup 覆盖、无插件不失败 | 模型行为质量 | 无 |
| 真实召回 | 模型行为 | 真机一次会话日志 grep `<openviking-context source="recall">`，内容非仅 overview | 召回路径真的进请求 | 召回准确率/业务价值 | 人读一条 |
| Viki 回归 | 编排 | `GET /api/assistant/viki` 200/503 | 部署卡修复后仍连得上 | 面板渲染（检索卡） | 无 |
| 回滚 | 编排 | 恢复完整 storage 备份 → 换回 0.4.22 → `/health`/`/stats`/`content/read` | 回滚顺序可执行 | 数据零丢失（只能抽查） | 无 |

实施后必须真跑过并记录：

- [x] `openviking-server --version` = **0.5.1.1**（或记录的 pin）；`GET /health` 版本一致；MCP `serverInfo` 不当版本依据。
- [x] 副本/现网：0.4.22 workspace 被 0.5.1.1 读取，`/stats/memories` 仍 6；抽查一条 `content/read` 正常；`POST /search/find` 返回非空。
- [x] 一次 commit 任务 completed（不是 failed）。副本 A/B 两次 `session_commit` 均 `completed`。
- [x] **两次 commit**：第一次 commit 后 `find` 命中 sentinel A（`合同尾款到账确认.md`）；第二次 commit 后 `find` 命中 sentinel B（`供应商发票付款计划确认.md`）——0.5.1.1 的 #6331 修复已在副本验证；live 未被测试数据污染。
- [x] 迁移到持久路径后，`/stats/memories` 仍 6；重启 server 后仍 6；`.tmp` 旧副本保留为 `workspace-0.4.22-backup`/`workspace-0.4.22-live`；`ov-doctor --config dev/harness-home/openviking/ov.conf --profile dev` 的 check 7 为 `persistent root`。
- [x] `dump-config` 的 OV 行显示目标 config（peer/budgets/recall）；`pnpm start` 后再 dump 仍一致（不被 setup 覆盖）。
- [x] **fresh dev home 无 OV 插件**：2026-10-21 `.tmp/fresh-home` 跑 `setup.sh` exit 0；profile patch 与 `dump-config` 都没有 `openviking-memory-runtime`，无 inactive 噪声。
- [x] 真机一次会话：日志出现 `<openviking-context>`，含 `detail="full"` 的合同事件（不是只有 overview）；模型回答“没有到账确认”；live `session_commit` **completed**（`6b9ba499…`，102s，stats 6→8），`/tasks` 无 failed。**注：实际标签无 `source="recall"` 属性（0.5.26/0.5.1.1 的实际形状），按 block 与 `detail="full"` 判。**
- [x] 正常 `pnpm start` 后 `GET /api/assistant/viki` 200（**回归**，URL 修复归部署卡）；OpenViking 缺席时 503 且 DSH 正常。**2026-10-21 真机：Viki(调试) tab 搜索「合同」返回 6 条；缺席 503 早前已验。**
- [x] 回滚演练：先恢复完整存储兼容备份，再换回 0.4.22；`/health`、`/stats`、一条 `content/read` 正常；记录命令与结果（只换二进制不算通过）。**2026-10-21 副本 1935：0.4.22 / 6 / content OK；live 1933 保持 0.5.1.1。**
- [x] `pnpm verify` 通过（2026-10-21：43/43；`pnpm test:tooling` 270/270）。

## 下一步

**裁决已收（2026-10-21）**：H1 B / H5 0.5.1.1 / H6 先跳过团队记忆。本卡承载规格与验收，推进在 [收口卡](261021-openviking-viki-closure.md)；实施顺序 = 副本迁移 → 存储搬家 → 旋钮落点 → 真机 commit/recall → 回滚演练。**2026-10-21：0.5.1.1 副本/live、持久存储、v3 dump-config、sentinel A/B 可检索、真机 recall+commit/peer 新写入、0.4.22 回滚副本、fresh-home 无插件 case 均已过；下一步 = 预算/召回量测 + doctor 云端 ack + 用户 review。**
**Agent 的**：第一轮（2026-10-20）与第二轮（2026-10-21）已回写；先副本验证再切 live，0.4.22 备份在 `workspace-0.4.22-backup`/`workspace-0.4.22-live`。

## 范围与邻居

| 本卡拥有（修/交） | 只检查/引用（不修） | 不拥有（去向） |
|---|---|---|
| server 0.5.1.1 升级；存储搬家；v3 旋钮落点；peer；commit/recall；回滚演练 | Viki 200（部署卡修 URL，本卡回归）；doctor 的存储/版本检查（部署卡） | Viki baseUrl/面板（[部署卡](261020-openviking-deploy-doctor.md)/[检索卡](261020-openviking-retrieval-viki.md)）；plugin 0.5.27（单独 pin 评审）；写面（`ov-shield`） |

## 评审记录（意见回流的家）

### 2026-10-20 · 第一轮 agent 核验（运行态面，只读）

- 回滚验收只写“恢复 0.4.22 + 旧 workspace”不足；须先恢复完整 `storage_path` 兼容备份再换二进制，否则 `/health` 绿而数据已坏。已补。
- live dev-ov 缺 `commitTokenThreshold`，tracked 安装器模板有 3000；实施时对齐，避免再拿探针当模板。
- 0.5.1 迁移对我们面的实际影响：插件用 `/sessions/{id}/commit`（0.5.1 保留，移除的是 `/extract`）；Viki 的读/删/恢复路径不在删除清单；真正风险是存储格式与回滚顺序。
- Viki baseUrl 当前为空 → 503；默认 1933 是建议，不是现状。

### 2026-10-21 · 第二轮内部质量审（按 `_backlog/methods`）

- **Q5 版本前移**：server latest 0.5.1.1（修 #6331“后续 commit 完成但新记忆搜不到”），本卡目标从 0.5.1 改 0.5.1.1；验收加“两次 commit”用例。plugin latest 0.5.27 未审，单列。
- **Q4 范围重叠**：Viki URL 从本卡移出（部署卡修）；本卡只做升级后回归 200；存储检查归部署卡 doctor，搬家归本卡。
- **Q10 patch 落点**：原推荐“把 OV 行加进 tracked profile-patch.yml”不安全——fresh home 无插件时会出现 inactive entry 警告（非 required 失败只 warn）；改推荐 `setup.sh` 仅在插件在场时追加，验收加 fresh-home case。
- **Q11 归档冻结**：原关闭条件要改 archived 层 1 note/旧卡 §六；违反 notes README 的“归档冻结不可编辑”。改为新决定 note/当前 owner 记录 3000，归档只读引用。
- **Q13 doctor 绿 ≠ 运行态**：加当前情况行与风险 8；升级后仍以 `/tasks` + 真实召回收口。
- **证据边界**：live dev-ov 是 gitignored 本机状态，不能从他机复现；证据表已标注并给读取命令。

**结论**：运行态判断成立，但目标版本与 patch 落点需按本轮修正；不授权实施。

## 关闭条件

- **0.5.1.1** pin 记录（`vendor/thirdparty/openviking/README.md` + `ov-install.sh` 的 `OV_VERSION` + 部署文档；server 不钉在 vendor，需写清版本）。
- 存储/旋钮/peer/commit/recall 落地；验收全绿；用户 review 通过；Viki 200 回归（URL 修复归部署卡）。
- **归档冻结**：不修改 `_backlog/_archive/` 与 `notes/archived/` 的正文；旧卡 §六 的 20000 与层 1 note 只作历史引用。当前权威写进新决定 note/当前 owner（`vendor/thirdparty/openviking/README.md`、`ov-install.sh`），并与归档互链。
- 未做的 agent-team/旧 peer 迁移/plugin 0.5.27 写清去向。
- `_backlog/issues/README.md` 更新。

## 关联

- [方向评审卡](../_archive/settled_issues/261020-openviking-direction-review.md)
- [部署与 doctor](261020-openviking-deploy-doctor.md)
- [按需检索与 Viki](261020-openviking-retrieval-viki.md)
- 既有：[层 1 note](../../notes/archived/2026-10-04-openviking-layer1-landing.md)、[0.5.8→0.5.26 note](../../notes/implemented/2026-10-19-openviking-pin-catch-up.md)、[正式接入卡](../_archive/settled_issues/260929-openviking-formal-integration.md)、[vendor README](../../vendor/thirdparty/openviking/README.md)
- 版本：[v0.5.1.1 release](https://github.com/volcengine/OpenViking/releases/tag/v0.5.1.1)、[plugin 0.5.27](https://www.npmjs.com/package/@openviking/dsh-memory-plugin/v/0.5.27)
- 证据面：[测试证据地图](../../docs/testing.md)、[web-face 场景](../../snapshots/web-face/)
