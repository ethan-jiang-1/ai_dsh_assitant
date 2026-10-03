# OpenViking 试点终态验收复核（逐条声明 → 证据/证伪）

日期：2026-09-29 · 状态：已收卷 · 证据范围：本机全量重跑（doctor / dump-config / 记忆往返复现 / find 探针 /
DSH 级注入面拆日志 / 硅基流动双探针 / registry+GitHub 直查），对照
[RFC](../../implemented/2026-09-29-openviking-adoption-rfc.md)、
[试点卡](../../../_backlog/_done/_closed_plans/260928-openviking-install-release.md)与
[runbook](../../../vendor/thirdparty/openviking/README.md) 的全部可验声明。

## 结论一句话

**16 项核心声明全部独立复现成立**（含 handoff 未记完成的 DSH 级召回注入——本次补验通过）；
2 处数字偏差、1 处存疑、3 条新负知识（见下）。拍 A（引入）的证据基础**成立且更硬**。

## 逐条核对表

| # | 声明 | 判定 | 证据（2026-09-29 本机重跑） |
|---|---|---|---|
| 1 | server 钉 `0.4.22` | ✅ | `openviking-server --version` → 0.4.22；binary 在 `~/.local/bin`（uv tool 隔离装） |
| 2 | 插件 tgz 钉存 + SHA512=registry | ✅ | 本仓 sha512 `4bdd1657…fff5a` == registry `dist.integrity` base64 解码逐位一致；0.5.8 = dist-tags latest |
| 3 | license：插件 Apache-2.0 / server AGPL-3.0 | ✅ | tgz 内 package.json `license: Apache-2.0`；GitHub API `volcengine/OpenViking` → AGPL-3.0 |
| 4 | peer 兼容 `0.1.7-rc.2` 亲验 | ✅ | tgz peerDeps 含 `^0.1.7-rc.2`；本仓 vendor/dsh tag = `dsh-v0.1.7-rc.2` |
| 5 | doctor 全绿 | ✅ | 复跑 9/9 PASS（embedding openai/BAAI/bge-m3 探针 dimension=1024、VLM DeepSeek-V3.2、AGFS、dev 认证）；1 条 slow-call WARNING（4.2s，网络抖动，runbook 已知） |
| 6 | ov-trial 裸 profile + dump-config 断言 | ✅ | cordis.yml 0 条 preset 行（裸）；`--dump-config` 第 377–379 行：`@openviking/dsh-memory-plugin, patched by …/ov-trial/cordis.patch.yml` + `openviking-memory-runtime` 行在场；patch 参数 `commitTokenThreshold: 2000` / `skipSubagentSessions: true` / `endpoint: 127.0.0.1:1933` 与记录一致 |
| 7 | tgz 绝对路径直装成功 | ✅（历史事实+现存安装物） | profile node_modules 内 `@openviking/dsh-memory-plugin` 0.5.8 安装物在 |
| 8 | server 级记忆往返 | ✅ **复现** | 新 session `dsh-accept-probe-003`（同 14 条哨兵语料）：commit accepted → 抽取任务 completed → stats 17→18 |
| 9 | 抽取质量（七组事实/改口/保密/出处/零编造） | ✅ **复现** | 见「质量复核明细」 |
| 10 | 找回命中（小满.md 0.788） | ✅ | 复核首轮 find：家人/小满.md score=0.7884（与记录一致）；空闲时三探针 top-1 全对（0.864/0.850/0.785） |
| 11 | GLM-4.5V 负知识（20015） | ✅ **独立复核** | 硅基流动 `[user,user]` 探针 → HTTP 400 `{"code":20015,"message":"Value error, after user message, next must be assistant or tool message"}`；DeepSeek-V3.2 同形状 → HTTP 200（宽容确认） |
| 12 | DSH 级召回注入（试点计划第 5 步后半，handoff 未记完成） | ✅ **本次补验** | 见「DSH 注入面证据」 |
| 13 | key 纪律 | ✅ | `.env.local` git check-ignore 通过；`~/.openviking/ov.conf`/`ovcli.conf` 0600；本轮全程未回显 key（探针经环境变量传递） |
| 14 | 「上游五周 17 版」 | ⚠️ **数字偏差** | registry 实测 **16 版 / 5.0 周（3.2 版/周）**（0.1.0@08-20 → 0.5.8@09-25）。周更快的结论不变，计数应为 16 |
| 15 | 「SLSA provenance」发布声明 | ⚠️ **存疑** | registry packument 0.5.8 `attestations` 缺失（False）——provenance 声明在 registry 面不可见，runbook 该行应降级为存疑或删 |
| 16 | 维护方 38.8k★ | ✅（时间性数字） | 复核时 38,911★（38.8k 为 09-28 快照，合理漂移） |

## 质量复核明细（声明 9）

终态库 16 个记忆文件 / stats 18 条（preferences 2 / entities 8 / events 8）：

- **七组事实全覆盖**：苏州行程（华芯实体+苏州会议事件）、估值底线 3.5 亿+免谈+拖延（两事件+实体）、温水偏好（偏好文件 2 条+profile）、Q3 回款 800/460/57.5%（事件+恒基实体）、小满生日+望远镜+实体店（实体+事件+profile）、明州数据 15% 重复+赔偿条款（实体+事件）、王姐报销周三下午（实体+事件）。
- **改口探针取终值**：全文仅 1 处「10 月 18 日」，在 ChatLog **原文引用**内（出处正确）；所有事实面（实体/事件/profile）均为 10-20。
- **保密标注**：苏州会议 summary 保留「此信息仅限用户与助手知晓」（二轮抽取增富后仍在）。
- **出处**：6+1 个事件全部带 ChatLog user/assistant 原文。
- **零编造（用户事实面）**：未发现语料之外的用户事实。**注意**：`identity.md` 被抽取填了推断性 persona（「AI助手/专业、可靠、注重细节/💼」）——非用户事实，属 memory_policy 默认身份字段行为（呼应 runbook 已录的「小模型改人格字段」负知识），抽评口径应把 persona 字段排除在「零编造」判分外。

**计数差异说明**：抽评时记 15 条（2/8/5），终态 18——抽取是流式写入，抽评时刻 events 5 条、随后补齐 7、复现轮再 +1。计数时刻不同，非质量矛盾。

## 复现实验（声明 8/9/10 的增量证据）

同语料二跑（`dsh-accept-probe-003`，驱动已参数化：`node dev/ov-rt.mjs <sid>`）——**合并不爆炸**：

- 新增 1 事件文件（估值底线再次确认.md，重复强调被理解为又一次事件——轻度粒度重复，可接受）；
- 实体**增富**：华芯半导体 +2 bullets（估值底线/硬性约束）、恒基地产 +1（2026 Q3 细节）；
- profile.md +2 事实（融资谈判中、Q3 目标 800 万）；苏州会议 summary 扩充；零文件删除。

## DSH 注入面证据（声明 12，本轮新增）

`pnpm dsh --profile ov-trial "我女儿小满的生日是哪天…"` one-shot：

- **行为**：正确答「2026 年 10 月 20 日」并说明来自注入记忆（含修正史）。
- **结构**（拆 session.v4.jsonl）：系统提示**无**记忆（2759 chars，仅 1 处 openviking 字样）；记忆经**两条 user 段 `<openviking-context>`** 注入——① `source="profile"`（profile.md 全文 + available-memories 目录清单）；② 相关记忆命中 10 条（score 0.74–0.77，full/overview/abstract 三档 detail）。
- 模型侧 request：provider deepseek-official / deepseek-flash（home 级凭据），profile 级无 preset——裸 profile + 插件即得召回注入。

## 新负知识（本轮亲历，runbook/RFC 应吸收）

1. **抽取并发时 API 面退化**：session_commit 运行中 `find` 间歇 500/超时（驱动脚本第 7 步因此崩过一次 exit 1，无容错）、`system/wait` 连续 504；drained 后全部恢复。→ ov-install.sh 的健康门与断言必须排在 drained 之后，不能定长等待。
2. **抽取时长波动大**：试点 6–8 分钟；本轮并发干扰下 ~14 分钟。验收/安装脚本的等待上限要按此放宽或轮询任务状态。
3. **npm 本机缓存 root-owned EPERM**（`npm view` 不可用）→ 用 registry HTTP API 直查（`registry.npmjs.org/<pkg>` 全量 packument，--compressed）。

## 差距清单（RFC 实施切片的真实未竟项）

- **AGPL 合规复核**：未做（RFC 明示真人输入位，实施前完成）——本轮复核再次确认 server AGPL-3.0、插件 Apache-2.0、进程边界论据成立，但合规结论须真人出。
- **ov-install.sh**（拟建于 dev/ 下）：不存在（RFC 拟建项，七步形状在卡上）——顺带：本审计的三条新负知识应直接入脚本的等待/断言设计。
- **正式接入面**：未动（`packages/dsh-smart-assistant` 零 openviking 行——与 RFC「独立决策切片」边界一致）。
- **喂图**：DeepSeek-V3.2 纯文字，未测（已知边界，模型菜单有备选探针配方）。
- 手册口径修订：runbook「五周 17 版」→ 16 版；SLSA provenance 行降级存疑。

## 输掉的方案（本审计自身的取舍）

- **只读上一会话日志复述证据**（不重跑）：省时但等于「信任昨天的自己」——验收的本义就是独立复现，弃。
- **用原 session id 重跑往返**：会污染首批试点证据（同 SID 二次 commit）——改为参数化新 SID（`dsh-accept-probe-003`），同语料可比且留存首轮证据，代价是记忆库多一轮写入（试点库，可接受）。
- **执行回退验证（uv tool uninstall + 删 profile）**：回退路径声明只做纸面核对——真跑会毁掉试点环境，收益（确认卸载干净）不抵重装成本；留给 ov-install.sh 开箱测试一并验。
