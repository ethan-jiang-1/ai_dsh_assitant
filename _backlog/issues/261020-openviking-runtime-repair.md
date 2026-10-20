---
status: 等人拍板
opened: 2026-10-20
---

# 推敲：OpenViking 运行态修复——0.5.1 升级、持久存储与 v3 旋钮

> 立卡：2026-10-20 ｜ 状态：等人拍板 ｜ 类型：Task ｜ 可关闭：否 ｜ 实施卡，未授权开工 ｜ 🔒 等方向卡裁决

**给评审者的最短路径：** 先读「问题与期望结果」→「当前情况」→「方案与取舍」→「验收标准」。  
上游背景与审计证据在 [方向评审卡](261020-openviking-direction-review.md)；配置/检测/README 在 [部署卡](261020-openviking-deploy-doctor.md)。**本卡不授权写代码。**

## 问题与期望结果

**观察到的行为：** 层 1 已经“采用”，但 live 没有跑在设计状态：

- server 还是 0.4.22；插件已是 0.5.26。0.5.1 的 Working Memory 默认关、commit/锁修复、召回改进都没拿到。
- dev 组合的 `openviking-memory-runtime` 行没有 config；`pnpm start` 每次用 tracked 的 [profile-patch.yml](../../dev/profiles/profile-patch.yml)（只有 preset registry）覆盖 dev patch。v3/召回调参只活在 `dev-ov` 探针（本机 live，`dev/harness-home/` 已 gitignore），不在 dev；tracked 的 [ov-install.sh §6](../../dev/experiments/openviking/ov-install.sh) 模板是另一组（含 commit 阈值），与 live dev-ov 已漂移。
- 最近一次 `session_commit` failed；`/search/search` 报模型连接错误；最近一次会话 recall 块为 0（连接故障期；2026-10-19 的 recall 只有目录 overview，见方向卡证据）；`/health` 仍绿。
- 记忆库在 `.tmp/openviking/workspace`；现有 6 条 events 在那里，清扫/换机即丢。
- peer 跟 git origin（`github.com-ethan-jiang-1-ai_dsh_assitant`），不是“跟助手走”；换工作目录/克隆会分叉。
- Viki 默认 503（baseUrl 问题）；正常 `pnpm start` 看不到记忆层状态。

**期望结果：** 升级到 0.5.1（在副本验证后 pin）；记忆库持久；v3 旋钮真正生效且不会被 `pnpm start` 冲掉；peer 按产品意图固定；commit/recall 有一次真往返；Viki 正常可见；失败不再静默。

**完成条件：** 0.5.1 在副本上通过迁移/往返验证后 pin；现有 6 条记忆迁移且可召回；`dump-config` 显示目标 config；一次真实会话产生 recall 块且 commit 成功；回滚方案可执行。

## 当前情况（证据）

| 事实 | 证据 |
|---|---|
| server 0.4.22 | `openviking-server --version`；`GET /health` 的 `version` |
| 插件 0.5.26 | `dev/harness-home/profiles/dev/package.json` 指向 0.5.26 tgz |
| 最近 commit failed | `GET /api/v1/tasks`：2026-10-20T07:24:07Z `session_commit`，`"error":"Connection error."`；server.log 的 `_run_archive_summary` |
| 检索失败 | `POST /api/v1/search/search` 的 `retrieval_errors`；`find` 500 |
| 6 条 events，0 profile/偏好/实体 | `GET /api/v1/stats/memories` |
| 最近一次会话 recall 块 0 | 2026-10-20 15:22 的会话 grep；全量 36/376 个会话曾有 recall，但 10-19 的只有系统目录 overview（见方向卡评审记录） |
| 调参未生效 | [profile-patch.yml](../../dev/profiles/profile-patch.yml) 只有 preset registry；[setup.sh](../../dev/env/setup.sh) 的 `cp` |
| 独立探针的调参（本机 live） | dev-ov patch：`peerId: assistant`、`skillCatalog: false`、`skipSubagentSessions: true`、`profileTokenBudget: 3000`、`recallPreferAbstract: false`、`recallMaxContentChars: 2000`、`recallLimit: 6`、`recallMaxTokens: 2400`、`recallQueryExpansion: off`、`recallContextTimeoutMs: 3000`。**没有 `commitTokenThreshold`**——tracked 的 [ov-install.sh §6](../../dev/experiments/openviking/ov-install.sh) 模板写 3000，live 与模板已漂移 |
| 记忆库位置 | [openviking-up.sh](../../dev/env/openviking-up.sh) 的 `.tmp/openviking/workspace` |

**注意：** 当前连接失败是模型/网络层的问题，不是 0.5.1 能自动修的；升级前先把“server 能到达模型位”查清，否则升完还是空。`/health` 绿 ≠ 记忆可用。

## 方案与取舍

### A. 版本

| 方案 | 做法 | 判断 |
|---|---|---|
| A1. 留在 0.4.22 | 只修网络/存储/旋钮 | 风险最小；但 archive 摘要失败、commit 老 bug、召回旧行为还在；回答不了“用新版本” |
| **A2. 升 0.5.1，副本验证后 pin** | 备份 workspace → 副本装 0.5.1 → doctor/往返/Viki → pin | **推荐**；收益直接命中当前故障 |
| A3. 跟 main/更高版本 | 追最新开发分支 | 不稳定；不选 |
| A4. 0.5.0 | 只拿 Working Memory off，避开 0.5.1 迁移 | 0.5.1 的 commit/锁修复正是我们要的；不选 |

**0.5.0/0.5.1 的相关收益：** Working Memory 默认关（不再为 archive 摘要调 VLM）；commit/锁/任务 owner 修复；context 召回不再返回系统目录；`exclude_uris` 子树；DSH 压缩/启动提交待处理消息；privacy fields（云端脱敏第二道闸）。
**0.5.1 的迁移风险：** `POST /sessions/{id}/extract` 移除（我们不用）；`write(mode=create)` 变成覆盖（Viki 不写；MCP 写面被拒）；trusted 模式要 `root_api_key`（我们用 dev，但部署要写清）；wait 专用 timeout 移除（我们不用）；存储格式/多写变化（默认本地，需副本验证）。

### B. 存储

| 方案 | 做法 | 判断 |
|---|---|---|
| B1. 保持 `.tmp` | 不动 | 不可接受：长期记忆在临时目录 |
| **B2. `dev/harness-home/openviking/workspace`** | 与 DSH home 同级、仓内、gitignore | **推荐（dev）** |
| B3. `<assistant dataDir>/viki` | 跟 working folder 走 | 产品部署更合理；dev 可先用 B2 |
| B4. `~/.openviking/workspace` | 上游默认 | 文件沙箱挡；除非用户显式给权限 |

**迁移：** 停 server → 备份完整存储根（当前 `.tmp/openviking/workspace`，8.2M，含 `_system`/`vectordb`/`viking`；release note 要求备份完整 `storage_path`，不是只拷内容目录）→ 拷到持久路径 → 改 `openviking-up.sh` 的 workspace → 起 server → `/stats/memories` 仍 6 → 抽查一条 `content/read` → 跑一次 search。保留旧副本直到验收。**回滚顺序：先恢复兼容备份，再换回 0.4.22；不能只换二进制。**

### C. 旋钮

| 旋钮 | 现值（live） | 目标 | 理由 |
|---|---|---|---|
| `peerId` | 空（git origin） | `assistant` | 记忆跟助手走，不随 cwd 分叉；旧 peer 仍可被 `recallPeerScope: all` 扫到 |
| `skillCatalog` | 默认 true | `false` | server 当前 0 skills；避免广告加载不了的技能 |
| `skipSubagentSessions` | 默认 false | `true` | 子代理/agent-team 噪声不进记忆；团队记忆是否要，另议 |
| `profileTokenBudget` | 10000 | 3000 | 默认会把桌面翻三倍 |
| `commitTokenThreshold` | 20000 | 3000 | 短会话也进抽取（S13）；与旧卡 §六 的 20000 冲突，统一到 note 的 3000。dev-ov live 也没设（installer 模板设了） |
| `recallContextTimeoutMs` | 0 | 3000 | 强制 find 路径，叶子内容进召回块（dev-ov 实测） |
| `recallPreferAbstract` | true | false | 降级路径要叶子，不要目录摘要 |
| `recallMaxContentChars` | 500 | 2000 | 同上 |
| `recallLimit` | 10 | 6 | 显式配额；默认用 server coding preset |
| `recallMaxTokens` | 未设 | 2400 | server 组装预算 |
| `recallQueryExpansion` | auto | off | dev-ov 实测命中不变，省延迟 |
| `captureToolResults` | dsh 默认 true | 待定 | 云端例外下可能收紧；若 experiences 需要再评 |

**落点：** 不能只写 `profiles/dev/cordis.patch.yml`（会被 setup 覆盖）。两个选项：
1. **把 OV 行加进 tracked 的 [profile-patch.yml](../../dev/profiles/profile-patch.yml)**——dev 专用，最简单；但产品部署的 `ov-install.sh` 仍要能写。
2. **改 `setup.sh` 为“复制模板 + 保留/追加 OV 行”**——更通用，但要小心 patch 语义（同 id 整行覆盖，不是深合并）。
建议先 1，产品部署走 `ov-install.sh` 自己的模板；如果以后多 profile，再抽独立 patch 层。**另修一处漂移**：live dev-ov 少了 installer 模板的 `commitTokenThreshold`，实施时顺手对齐，避免下一次又拿探针当模板。

### D. Viki URL 与健康

- `assistant-viki` 的 baseUrl **现在默认为空**（`config.baseUrl || OPENVIKING_URL || ''` → 503）；建议改为默认 `http://127.0.0.1:1933`（与插件默认一致），远程部署显式配。
- 或在 start 链显式导出 `OPENVIKING_URL`；两处必须同源，不能一个默认一个不默认。
- 健康不只 `/health`：加“最近一次 search/commit 状态”到 Viki；具体检测在 [部署卡](261020-openviking-deploy-doctor.md)。

## 非目标

- 不改 `ov-shield` 的写面策略。
- 不做只读检索/工具面（[按需检索卡](261020-openviking-retrieval-viki.md)）。
- 不接 Gateway、不启用 takeover、不把 OpenViking 变成必需依赖。
- 不自动清理旧 peer/旧记忆；迁移策略单独评审。

## 风险与未决

1. **0.5.1 存储迁移**：必须在副本上验证；失败时**先恢复兼容备份，再回滚到 0.4.22**（release note：不能仅换回旧二进制）。不要在主 workspace 直接升。
2. **模型连接失败**：升级前先查 server 进程的环境（代理/网络）与 `ov.conf` 的 VLM/embedding 两组 key/model；当前日志里 VLM（commit）与 embedding（search/find）都报 `Connection error`，embedding 还开了 circuit breaker（200s）——只修 VLM 不够。否则升完还是空。不能把“连接失败”误记成“0.5.1 没修好”。
3. **peer 切换**：现有 6 条在 git peer 下；切到 `assistant` 后新写入去新 peer，旧记忆靠 `recallPeerScope: all` 召回。要验证召回仍覆盖旧 peer。
4. **commit 阈值 3000 vs 20000**：层 1 note 的 S13 结论是 3000；正式卡 §六 仍写 20000。本卡按 3000，但需要把旧卡标注为过期，避免下一个人装错。
5. **agent-team**：成员是 `origin: 'subagent'`，`skipSubagentSessions: true` 会跳过团队记忆；这是产品选择，需确认。
6. **Viki 的 1MB 上限/树遍历**：记忆增长后列表会慢；本卡不做分页/搜索（留给按需检索卡）。

## 验收标准

实施后必须真跑过并记录：

- [ ] `openviking-server --version` = 0.5.1（或记录的 pin）；`GET /health` 版本一致。
- [ ] 副本上：0.4.22 workspace 被 0.5.1 读取，`/stats/memories` 仍 6；抽查一条 `content/read` 正常；一次 `POST /search/search` 返回非空；一次 commit 任务 completed（不是 failed）。
- [ ] 迁移到持久路径后，`/stats/memories` 仍 6；重启 server 后仍 6；`.tmp` 旧副本可保留/删除有记录。
- [ ] `dump-config` 的 OV 行显示目标 config（peer/budgets/recall）；`pnpm start` 后再 dump 仍一致（不被 setup 覆盖）。
- [ ] 真机一次会话：模型回复后会话日志出现至少 1 条 `<openviking-context source="recall">`，且内容不是只有 `detail="overview"` 的系统目录（抽查到事件/偏好/实体条目）；`/tasks` 无 failed commit。
- [ ] 正常 `pnpm start` 后 `GET /api/assistant/viki` 200；OpenViking 缺席时 503 且 DSH 正常。
- [ ] 回滚演练：先恢复完整存储兼容备份，再换回 0.4.22；`/health`、`/stats`、一条 `content/read` 正常；记录命令与结果（只换二进制不算通过）。
- [ ] `pnpm verify` 通过（或记录与本次无关的既有失败）。

## 关闭条件

- 0.5.1 pin 记录（`vendor/thirdparty/openviking/README.md` + `ov-install.sh` 的 `OV_VERSION` + 部署文档；server 不钉在 vendor，需写清版本）。
- 存储/旋钮/Viki URL/健康落地；验收全绿；用户 review 通过。
- 旧卡 §六 的 20000 标注为过期；层 1 note 如仍指导未来，更新其事实（不是在 note 上叠进度）。
- 未做的 agent-team/旧 peer 迁移写清去向。

## 关联

- [方向评审卡](261020-openviking-direction-review.md)
- [部署与 doctor](261020-openviking-deploy-doctor.md)
- [按需检索与 Viki](261020-openviking-retrieval-viki.md)
- 既有：[层 1 note](../../notes/archived/2026-10-04-openviking-layer1-landing.md)、[0.5.8→0.5.26 note](../../notes/implemented/2026-10-19-openviking-pin-catch-up.md)、[正式接入卡](../_archive/settled_issues/260929-openviking-formal-integration.md)、[vendor README](../../vendor/thirdparty/openviking/README.md)
