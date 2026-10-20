---
status: 推敲中
opened: 2026-10-20
---

# 推敲：OpenViking 部署正确性——云端例外、doctor 与一份配置源

> 立卡：2026-10-20 ｜ 状态：推敲中 ｜ 类型：Task ｜ 可关闭：否 ｜ 实施卡，未授权开工

**给评审者的最短路径：** 先读「问题与期望结果」→「云端例外 v1」→「方案与取舍」→「验收标准」。  
上游背景与审计证据在 [方向评审卡](261020-openviking-direction-review.md)；本卡只解决“用户装得对、部署看得见”。**本卡不授权写代码。**

## 问题与期望结果

**观察到的行为：** OpenViking 是可选记忆层，但安装/部署的正确性几乎全靠人记：

- 插件默认连 `127.0.0.1:1933`，Viki 面板却只从 config 或 `OPENVIKING_URL` 取 baseUrl；`pnpm start` 不导出后者，正常起服务时 Viki 很可能 503。
- 记忆库被 [openviking-up.sh](../../dev/env/openviking-up.sh) 指到 `.tmp/openviking/workspace`；`.tmp` 是临时根，清扫即丢。
- server 的模型位（VLM/embedding）在 `~/.openviking/ov.conf`，但 DSH 侧没有检查它是否可达；`/health` 绿不代表记忆可用（当前就是“health 绿、search 报 connection error”）。
- 云端模型（SiliconFlow）与 [README](../../README.md) 的“严格本地”冲突；用户 2026-10-20 已接受云端例外，但要求**写清楚哪些内容可出、哪些脱敏**，并在部署时引导用户配对所有配置。
- 没有 `ov-doctor`；[ov-install.sh](../../dev/experiments/openviking/ov-install.sh) 只做安装/健康门/dump-config，不检查模型位、Viki URL、云端 ack、脱敏、存储持久性。
- dev profile 的 patch 每次被 [setup.sh](../../dev/env/setup.sh) 用 tracked 模板覆盖；即使 `ov-install.sh` 写了 v3 旋钮，下一次 `pnpm start` 也会丢（这是运行态卡的范围，但部署文档必须说清）。

**期望结果：** 一条命令能回答“这一层现在能不能用、缺什么、下一步怎么修”；README 有一张配置表和一份故障表；云端例外有明确的可出/脱敏口径和 ack 门；Viki 在正常 `pnpm start` 下能连上；记忆库不在临时目录。

**完成条件：** 新用户按 README 能配对所有必填项；`pnpm ov-doctor` 对健康实例 exit 0、对缺 URL/缺 key/缺 cloud ack 分别给出可执行的错误；Viki 正常启动不再 503；云端例外写入 README 与 note。

## 当前情况（证据）

| 事实 | 证据 |
|---|---|
| Viki baseUrl 只取 config/`OPENVIKING_URL` | [viki/index.ts](../../packages/dsh-smart-assistant/src/host/viki/index.ts) 第 42 行；`assistant-viki` 行无 config |
| start 链不导出 `OPENVIKING_URL` | [start.sh](../../dev/env/start.sh) 全文无该变量；`dev/env/env.sh` 也没有 |
| 记忆库在 `.tmp` | [openviking-up.sh](../../dev/env/openviking-up.sh) 的 `state_dir`/`workspace` |
| server 模型位在 `ov.conf`，DSH 侧不检查 | `~/.openviking/ov.conf`（VLM/embedding 指向 SiliconFlow；不在此回显 key） |
| `/health` 不探测模型位 | 当前 `GET /health` 返回 `healthy:true`；同一时刻 `POST /search/search` 返回 `OpenAI API error: Connection error` |
| `ov-install.sh` 不查云端/脱敏/Viki | [ov-install.sh](../../dev/experiments/openviking/ov-install.sh) 七步：装 server、配置、健康门、profile、tgz、patch、dump-config |
| 云端与“严格本地”冲突 | [README](../../README.md) 方向判据 O6；`~/.openviking/ov.conf` 的 provider/`api_base` |

**已知的层 1 决策（不重开）：** OpenViking 用 `dsh plugin add` 进 profile，不进 assistant preset；写面由 `ov-shield` 守；可选增强不能成单点故障。见 [层 1 note](../../notes/archived/2026-10-04-openviking-layer1-landing.md)。

## 云端例外 v1

> 用户 2026-10-20 已拍板：接受云端。以下是把“接受”写成可执行口径；**不是**建议默认云端。

### 范围

- 只覆盖 OpenViking 的**记忆抽取与 embedding** 调用。
- provider / `api_base` / 模型名由部署配置（`ov.conf` 的 `vlm` / `embedding`）决定；当前试点是 SiliconFlow 的 `deepseek-ai/DeepSeek-V3.2` + `BAAI/bge-m3`。
- 不覆盖：DSH 主模型请求、其他插件、遥测；这些各自有自己的边界。

### 可出（只到配置的模型 provider）

- 用户/助手对话文本（业务讨论、决策、偏好、上下文）。
- 记忆条目的标题 / 摘要 / 正文（已经抽取的）。
- 工具调用的结构化摘要：工具名、成功/失败、截断后的输出。
- 用户明确提供/确认的业务材料。
- `identity.md` / `soul.md` 等本地模板**不自动出**；只有进入对话/被 capture 时才按对话文本处理。

### 必须脱敏 / 不出

- **凭据**：API key、token、password、cookie、私钥、`.env` 内容、`Authorization` 头——永不发出。
- **原始文件/二进制/附件**：除非用户显式摄取并逐次确认。
- **完整 shell 输出、环境变量、进程表**：可能夹带密钥；只出截断/过滤后的摘要，或整条丢弃。
- **个人敏感信息**：身份证/护照/银行卡/手机号/邮箱/住址——默认掩码；部署可显式放开。
- **第三方机密**：客户合同原文、未公开财务——默认掩码；用户逐次标注允许才出。
- **模型/系统提示词、内部工具定义**：不出（除非它们本身出现在用户对话里）。

### 机制（第一道 → 第四道）

1. **`captureFilters`**：在插件 capture 阶段做替换/丢弃（密钥、PII 正则）。0.5.26 的过滤器对 tool input/output 的覆盖面要按 0.5.1 release 的 capture 替换范围再核（0.5.1 #5937）。
2. **`captureToolResults`**：云端部署默认收紧——要么 `false`，要么只出过滤/截断后的结构化摘要；若 experiences 需要工具结果，先确认它到底消费什么。
3. **DSH credential scrub**：继续作为独立防线；不要把 key 放进 prompt/工具输出。
4. **发送前扫描器**（doctor + 运行时）：检测 key-like 串、私钥头、常见 token 形态；命中即阻断/脱敏，并记审计。
5. **OpenViking 0.5.1 privacy fields**：升级后作为第二道闸；不依赖它做第一道。

### 审计与可见性

- 记录：provider、模型、token 数、被脱敏的类别与条数（不记录原文）。
- 展示：Viki 的“记忆层状态”里显示“云端 provider + 最近一次发送时间 + 脱敏计数”；README 首屏写清数据流向。
- 关闭：切本地 provider 或关掉记忆层 = 退出例外；doctor 必须能识别。

### 部署 ack

- 配置 `cloudAck: true`（部署配置文件，或 doctor 读取的环境 `OPENVIKING_CLOUD_ACK=1`）；**不改上游插件的 config schema**，ack 检查住我们自己的 doctor/启动门。
- 云端 provider 且没有 ack：`pnpm ov-doctor` **fail**；`pnpm start` 打 warning（不阻断 DSH 启动）。
- 本地 provider（Ollama/本地 OpenAI 兼容）不需要 ack。

## 方案与取舍

| 方案 | 做法 | 判断 |
|---|---|---|
| A. 只写 README | 文档列全配置 | 不够：用户仍会漏 key/URL/ack；没有红绿 |
| B. README + `pnpm ov-doctor` + 配置对账 + 云端 ack | 一条命令检查，错误可执行 | **推荐** |
| C. 只靠 OpenViking 的 `doctor` | 跑上游 `openviking-server doctor` | 不够：不查 DSH 组合、Viki、cloud ack、脱敏、存储 |
| D. 做交互式 wizard | 问用户、写 `ov.conf` | 有价值但可后置；先做非交互 doctor，CI/Agent 也能跑 |
| E. 让 `pnpm preflight` 硬失败 | 把 OV 当必需 | 违反“可选增强不能成单点故障”；只打印状态 |

**推荐 B，C 作为 doctor 的一步，D 后置。** 先让“装得对”可验证，再谈交互。

## 设计

### 1. `pnpm ov-doctor`（新脚本，放 `dev/deploy/` 或 `scripts/`）

检查并按“现象 → 修法”输出，退出码：`0` 健康 / `1` 坏了 / `2` 降级（可选层缺席但 DSH 正常）。

| # | 检查 | 失败时告诉用户 |
|---|---|---|
| 1 | `GET /health` 可达、版本、auth mode | server 没起/端口不对；给出 `openviking-up.sh` 或启动命令 |
| 2 | `ov.conf` 存在、0600、provider/base_url/model、key 存在（不回显） | 缺文件/权限/字段；给出 `.env.local` → `ov.conf` 的流向 |
| 3 | `openviking-server doctor` + 最小 embedding/FC 探测 | 模型位不可达/不支持 FC；给出 provider/model 修正 |
| 4 | 一次 `POST /search/search`（已知 URI） | “health 绿但 search 失败”的典型；提示模型位/网络 |
| 5 | 一次 commit（默认 `--dry-run` 不写；`--write` 才真写） | commit 失败/任务 failed；给出 `/tasks` 与日志路径 |
| 6 | 组合：`dump-config` 有 OV 行 + v3 config；`assistant-viki` baseUrl 对齐；`ov-shield` 在场 | 行缺失/config 被覆盖/Viki URL 不一致 |
| 7 | 存储路径持久（不在 `.tmp`）、可写、有备份 | 给出迁移/备份命令 |
| 8 | 云端 ack + 脱敏自测（假 key 不出现） | 缺 ack / 过滤器没生效 |
| 9 | 版本矩阵：plugin / server / DSH | 不兼容/落后；给出升级或 pin 建议 |

**不打印 key。** 输出里只出现“已配置/缺失”，不出现值。

### 2. README 部署节

一张必填表 + 三条命令 + 故障表：

| 配置 | 例子 | 谁消费 | 缺失后果 |
|---|---|---|---|
| server URL | `http://127.0.0.1:1933` | 插件 + Viki | 插件默认 1933；Viki 503 |
| auth mode | `dev` / `trusted` / `api_key` | server | trusted 需 root key（0.5.1） |
| VLM | provider/base_url/model | server 抽取 | 抽取失败/空结果 |
| embedding | provider/base_url/model/dimension | server 检索 | search 空/500 |
| storage | `dev/harness-home/openviking/workspace` | server | `.tmp` 会丢 |
| peer | `assistant` | 插件 | 记忆按 git origin 分叉 |
| budgets | profile 3000 / commit 3000 / recall 6 / 2400 | 插件 | 桌面膨胀/短会话丢 |
| Viki URL | 同 server URL | `assistant-viki` | 面板 503 |
| cloudAck | `true` / `OPENVIKING_CLOUD_ACK=1` | doctor/启动门 | 云端配置 fail |

故障表至少覆盖：health 绿但 recall 空、commit failed、Viki 503、模型 400/401/connection、存储不可写、插件被兼容闸跳过。

### 3. 一份配置源

现在三处各说各话：`ov.conf`（server/模型/存储）、profile patch（peer/预算/召回）、`OPENVIKING_URL`（Viki）。doctor 负责对账；Viki 的 baseUrl 默认取 `http://127.0.0.1:1933`（与插件默认一致），或从同一个 config 读。**不新增第四个配置口。**

### 4. `pnpm preflight` 集成

- 打印“OpenViking: healthy / degraded / off”与一行修法；**不让可选层拖垮 DSH preflight**。
- 若 OV 在场但 doctor 红：打印红项，不 exit 非零（除非用户显式 `--require-openviking`）。

## 非目标

- 不实现只读检索/工具面（[按需检索卡](261020-openviking-retrieval-viki.md)）。
- 不升级 server（[运行态卡](261020-openviking-runtime-repair.md)）。
- 不做交互式 wizard（后置；先让 doctor 可被 CI/Agent 跑）。
- 不改 `ov-shield` 的写面策略。
- 不把 OpenViking 变成必需依赖。

## 风险与未决

1. **doctor 的 commit 测试会写数据**：默认 dry-run，`--write` 用唯一 sentinel 并清理；清理失败要如实报。
2. **key 的处理**：doctor 只读 `ov.conf`/env，不打印、不复制到日志；`.env.local` 永不进 git/会话。
3. **provider 差异**：OpenAI 兼容端点对 FC/连续 user 消息的宽容度不同；doctor 的探测要能区分“401/400/connection”。
4. **脱敏误杀**：正则过宽会把正常业务文本打码；需要白名单/可配置，并在 doctor 里给“命中示例”（脱敏后）。
5. **0.5.1 的 auth 变化**：trusted 模式要 root key；doctor 要能识别 auth mode 并给对应修法。
6. **Viki 默认 URL 与远程 server**：默认 1933 只适用于本机；远程部署必须显式配，不能静默回退到 localhost。

## 验收标准

实施后必须真跑过并记录：

- [ ] `pnpm ov-doctor` 在健康实例 exit 0，输出九项检查均绿；在“缺 server URL”“缺 key”“云端无 ack”“存储指向 `.tmp`”四种坏配置上分别 exit 1，错误文案包含“怎么修”。
- [ ] `pnpm ov-doctor --write` 能完成一次 commit + search 的往返，并在结束后清理 sentinel（或明确留下不清理的理由）。
- [ ] 假 key（形如 `sk-test-...`）进入一条测试消息后，发送前扫描器/过滤器命中；doctor 的脱敏自测显示“已拦截”，且审计里没有原文。
- [ ] README 的部署节从空配置开始照做能到 doctor 绿（至少 dry-run 路径）；故障表每条有可复现的现象与修法。
- [ ] 正常 `pnpm start` 后 `GET /api/assistant/viki` 返回 200（不再依赖手工 `OPENVIKING_URL`）；OpenViking 缺席时返回 503 且 DSH 启动不受影响。
- [ ] `pnpm preflight` 打印 OV 状态；OV 红时 preflight 仍按 DSH 自身判据退出。
- [ ] `pnpm verify` 通过（或记录与本次无关的既有失败）；新增脚本/文档在 verify 的覆盖范围内。

## 关闭条件

- doctor + README + 云端例外 + 配置对账落地；验收全绿；用户 review 通过。
- 云端例外写入 note（若形成持久取舍）并与 README 互链；`_backlog/issues/README.md` 更新。
- 未做的 wizard/远程部署指引写清去向，不留在活跃区当“以后再说”。

## 关联

- [方向评审卡](261020-openviking-direction-review.md)
- [运行态与 0.5.1](261020-openviking-runtime-repair.md)
- [按需检索与 Viki](261020-openviking-retrieval-viki.md)
- 既有：[openviking-up.sh](../../dev/env/openviking-up.sh)、[ov-install.sh](../../dev/experiments/openviking/ov-install.sh)、[viki/index.ts](../../packages/dsh-smart-assistant/src/host/viki/index.ts)、[vendor README](../../vendor/thirdparty/openviking/README.md)
