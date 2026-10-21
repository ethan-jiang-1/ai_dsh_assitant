---
status: 推敲中
opened: 2026-10-20
---

# 推敲：OpenViking 部署正确性——云端例外、doctor 与一份配置源

> 立卡：2026-10-20 ｜ 状态：推敲中 ｜ 类型：Task ｜ 可关闭：否 ｜ 已授权实施（H1 B / H2–H6 按建议；安装面一等交付）｜ 推进台账 = [收口卡](261021-openviking-viki-closure.md)

**给评审者的最短路径：** 先读「问题与期望结果」→「当前情况」→「云端例外 v1」→「方案与取舍」→「验收标准」→「下一步」。  
上游背景与审计证据在 [方向评审卡](../_archive/settled_issues/261020-openviking-direction-review.md)；本卡只解决“用户装得对、部署看得见”，**不搬家存储、不做 Viki 面板、不升 server**（分别归运行态卡/检索卡）。**本卡不授权写代码。**

## 问题与期望结果

**观察到的行为：** OpenViking 是可选记忆层，但安装/部署的正确性几乎全靠人记：

- 插件默认连 `127.0.0.1:1933`，Viki 面板却只从 config 或 `OPENVIKING_URL` 取 baseUrl；`pnpm start` 不导出后者，正常起服务时 Viki 是 503（baseUrl 实测为空），不是“很可能”。
- 记忆库被 [openviking-up.sh](../../dev/env/openviking-up.sh) 指到 `.tmp/openviking/workspace`；`.tmp` 是临时根，清扫即丢。**doctor 要报红；搬家归运行态卡。**
- server 的模型位（VLM/embedding）在 `~/.openviking/ov.conf`，但运行中的 server 用的是 `openviking-up.sh` 派生的 `.tmp/openviking/ov.conf`；DSH 侧没有检查它是否可达，`openviking-server doctor` 默认还读另一份配置。`/health` 绿不代表记忆可用（当前就是“health 绿、search 报 connection error”）。
- **当前云端暴露没有收口**：dev 组合无 OV config，插件 `captureToolResults` 对 DSH 默认 `true`，`captureFilters` 默认 `[]`——工具结果当前没有过滤器，直接进云端 VLM/embedding。这是本卡 P0 的现状，不是未来风险。
- 云端模型（SiliconFlow）与 [README](../../README.md) 的“严格本地”冲突；用户 2026-10-20 已接受云端例外，但要求**写清楚哪些内容可出、哪些脱敏**，并在部署时引导用户配对所有配置。
- 没有 `ov-doctor`；[ov-install.sh](../../dev/experiments/openviking/ov-install.sh) 只做安装/健康门/dump-config，不检查模型位、Viki URL、云端 ack、脱敏、存储持久性。
- dev profile 的 patch 每次被 [setup.sh](../../dev/env/setup.sh) 用 tracked 模板覆盖；即使 `ov-install.sh` 写了 v3 旋钮，下一次 `pnpm start` 也会丢（这是运行态卡的范围，但部署文档必须说清）。
- **交付面不成立**：`_dist/安装手册.md` 只覆盖插件本体，且没有“把 profile 的 `agent-preset-registry.default` 设成 `assistant`”的步骤；OpenViking 的安装/配置只活在 `dev/experiments/`、`.env.local` 和本机 live dev-ov，导出包给另一个人跑不起来。**安装/配置是一等交付，不是文档尾巴。**

**期望结果：** 一条命令能回答“这一层现在能不能用、缺什么、下一步怎么修”；README 有一张配置表和一份故障表；云端例外有明确的可出/脱敏口径和 ack 门；Viki 在正常 `pnpm start` 下能连上（本卡修 baseUrl 默认）；doctor 能指出存储不在持久路径、Viki 不通、云端未 ack，并把搬家/升级分派到运行态卡；**另一个人在干净 home/机器上按导出包 + 安装手册能装起插件并切到 `assistant`；可选 OV 层有独立的安装/配置/启动/doctor 路径，不依赖本仓库 dev home、`.env.local`、live dev-ov 或本机绝对路径。**

**完成条件：** 新用户按 README 能配对所有必填项；`ov-doctor`（包内 bin）对健康实例 exit 0、对 **server 不可达/缺 key/缺 cloud ack/存储指向 `.tmp`** 分别给出可执行的错误；Viki 正常启动不再 503；**当前 `captureToolResults` + 空 `captureFilters` 的云端暴露已收口（关掉或配过滤器）**；云端例外写入 README 与 note；**安装面：`pnpm export-dist` 手册覆盖预设默认值 + OV 安装/配置/启动/doctor + 故障表，干净 home 安装 smoke 通过，OV 缺席时插件正常、OV 在场时 Viki 200。**

## 当前情况（证据）

| 事实 | 证据 |
|---|---|
| Viki baseUrl 只取 config/`OPENVIKING_URL`，实测为空 | [viki/index.ts](../../packages/dsh-smart-assistant/src/host/viki/index.ts) `const baseUrl = config.baseUrl?.trim() \|\| process.env.OPENVIKING_URL?.trim() \|\| ''`；`assistant-viki` 行无 config；`dev/env` 无该变量 |
| start 链不导出 `OPENVIKING_URL` | [start.sh](../../dev/env/start.sh) 全文无该变量；`dev/env/env.sh` 也没有 |
| 记忆库在 `.tmp` | [openviking-up.sh](../../dev/env/openviking-up.sh) 的 `state_dir`/`workspace`；派生 config 也写 `.tmp/openviking/ov.conf` |
| **运行中 server 的 config 与 `openviking-server doctor` 默认读的不是同一份** | `openviking-up.sh` 从上游派生 `dev/harness-home/openviking/ov.conf` 并用它启动 server（storage 持久）；`openviking-server doctor` 不带 `--config` 时仍读 `~/.openviking/ov.conf`（storage 指向 `~/.openviking/workspace`）。2026-10-21 带 `--config dev/harness-home/openviking/ov.conf --profile dev` 的 `ov-doctor` 的 check 7 = `persistent root`，check 10 仍 WARN（doctor 无法证明运行进程用了同一份）。 |
| 当前云端暴露未收口 | dev 组合无 `openviking-memory-runtime` config；插件 schema：`captureToolResults` 对 DSH 默认 `true`、`captureFilters` 默认 `[]`（插件 0.5.26 tarball 的 `shared/config-schema.mjs`；`tar -xOzf vendor/thirdparty/openviking/dsh-memory-plugin-0.5.26.tgz package/shared/config-schema.mjs \| grep capture` 可复核）；即工具结果当前原样进云端 |
| server 模型位在 `ov.conf`，DSH 侧不检查 | `~/.openviking/ov.conf` 与派生 `.tmp/openviking/ov.conf`（VLM/embedding 指向 SiliconFlow；不在此回显 key） |
| `/health` 不探测模型位 | `GET /health` 返回 `healthy:true` 与 `version`/`auth_mode`；同一时刻 `POST /search/search` 可返回 `OpenAI API error: Connection error` |
| `ov-install.sh` 不查云端/脱敏/Viki | [ov-install.sh](../../dev/experiments/openviking/ov-install.sh) 七步：装 server、配置、健康门、profile、tgz、patch、dump-config |
| 云端与“严格本地”冲突 | [README](../../README.md) 方向判据 O6；`~/.openviking/ov.conf` 的 provider/`api_base` |

**2026-10-21 复核**：Viki baseUrl 默认 1933 已落（`src/host/viki/index.ts`）；真机 `pnpm start` preflight 绿，token→cookie 后 `GET /api/assistant/viki` 返回 **200**、`connected:true`（实例已收）。**同日 0.5.1.1 live：`Viki(调试)` tab 搜索「合同」返回 6 条；`/health` = 0.5.1.1。**

**已知的层 1 决策（不重开）：** OpenViking 用 `dsh plugin add` 进 profile，不进 assistant preset；写面由 `ov-shield` 守；可选增强不能成单点故障。见 [层 1 note](../../notes/archived/2026-10-04-openviking-layer1-landing.md)。

## 云端例外 v1

> 用户 2026-10-20 已拍板：接受云端。以下是把“接受”写成可执行口径；**不是**建议默认云端。
> **现状先行**：dev 组合当前无 OV config，`captureToolResults` 对 DSH 默认 `true`、`captureFilters` 默认 `[]`——本 v1 的“工具结果只出过滤后的摘要”目前没有配置支撑。本卡 P0 既写口径，也要把现状收口：**先关工具结果或配过滤器，再谈其他能力**。

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

### 机制（四道闸，按先后）

1. **`captureFilters`**：在插件 capture 阶段做替换/丢弃（密钥、PII 正则）。**已核实 0.5.26 的 `filterCaptureParts` 对 tool part 的 `tool_input` 字符串值与 `tool_output` 做 `s` 替换；`d`/`k` 仍只由文本决定保留/丢弃**（与 0.5.1 #5937 描述的范围一致，不必等新插件）。
2. **`captureToolResults`**：**当前 DSH 默认 `true`**；云端部署必须显式收紧——要么 `false`，要么只出过滤/截断后的结构化摘要。若 experiences 需要工具结果，先确认它到底消费什么；确认前按 `false` 处理，别拿“未来可能有用”换当前泄露面。
3. **DSH credential scrub + doctor 静态扫描**：DSH 的凭据清洗继续作为独立防线；doctor **从 active profile 的 OV config 读 `captureFilters` 规则**，扫规则本身（能否命中假 key、会不会误杀），并给脱敏后的命中示例；规则为空就报红，不报绿。**没有“发送前”运行时拦截点**：插件自己发 HTTP，DSH 侧没有拦截缝；在不改上游插件的前提下，运行时只能依赖第 1 道。若 doctor 无法加载插件的 `filterCaptureParts` 或等价纯函数，该检查记 **blocked**，不记 pass。
4. **OpenViking 0.5.1.1 privacy fields**：升级后作为第二道闸；不依赖它做第一道。

### 审计与可见性

- 记录：provider/模型名（doctor 读运行中 config，不回显 key）与 doctor 的脱敏自测结果（命中/未命中、脱敏后的示例）。
- **运行时脱敏计数与“最近一次发送时间”没有现成数据源**（插件不暴露）；不把不存在的数据写进界面。展示只放有源的：provider/模型、`/health`、`/stats/memories`、`/tasks` 最近状态；token 用量走 DSH `token-meter`。
- 关闭：切本地 provider 或关掉记忆层 = 退出例外；doctor 必须能识别。

### 部署 ack

- **环境变量 `OPENVIKING_CLOUD_ACK=1` 是唯一载体**（部署在 start 链/README 里显式导出；doctor 读它）；不新增配置文件口，也不改上游插件的 config schema。
- 云端 provider 且没有 ack：`ov-doctor` **fail**；dev 的 `pnpm start` 打 warning（不阻断 DSH 启动）；安装用户侧由 doctor 报红。
- 本地 provider（Ollama/本地 OpenAI 兼容）不需要 ack。

## 方案与取舍

| 方案 | 做法 | 判断 |
|---|---|---|
| A. 只写 README | 文档列全配置 | 不够：用户仍会漏 key/URL/ack；没有红绿 |
| B. README + `ov-doctor`（包内 bin）+ 配置对账 + 云端 ack | 一条命令检查，错误可执行 | **推荐** |
| C. 只靠 OpenViking 的 `doctor` | 跑上游 `openviking-server doctor` | 不够：不查 DSH 组合、Viki、cloud ack、脱敏、存储 |
| D. 做交互式 wizard | 问用户、写 `ov.conf` | 有价值但可后置；先做非交互 doctor，CI/Agent 也能跑 |
| E. 让 `pnpm preflight` 硬失败 | 把 OV 当必需 | 违反“可选增强不能成单点故障”；只打印状态 |

**推荐 B，C 作为 doctor 的一步，D 后置。** 先让“装得对”可验证，再谈交互。

## 设计

### 1. `ov-doctor`（包内 bin：`bin/ov-doctor.mjs`）

**落点理由**：需要 doctor 的是**装了 tarball 的人**，不是有仓库的人。所以它作为 package bin 随包发布（`package.json` 的 `bin.ov-doctor` + `files: ["bin"]`），手册在 `<profile>/node_modules/dsh-smart-assistant/bin/ov-doctor.mjs` 调用；仓内开发直接 `node packages/dsh-smart-assistant/bin/ov-doctor.mjs`。`scripts/` 与 `dev/deploy/` 都只服务有仓库的人，不作为用户路径。

**共用一个 config 源**：所有检查读运行中 server 的同一份 config——`OPENVIKING_CONF`（若设）或 `openviking-up.sh` 派生的 `.tmp/openviking/ov.conf`；上游 `~/.openviking/ov.conf` 只作来源显示，**不与派生副本混用**。doctor 必须打印“我读的是哪份”；读不到就 exit 2，不猜。理由：2026-10-21 实测 `openviking-server doctor`（默认读 `~/.openviking/ov.conf`）全绿，而运行中的 server（派生 config）仍 `/tasks` failed——读错配置会假绿。

检查并按“现象 → 修法”输出，退出码：`0` 健康 / `1` 坏了 / `2` 降级（可选层缺席或配置读不到但 DSH 正常）。

| # | 检查 | 失败时告诉用户 |
|---|---|---|
| 1 | `GET /health` 可达、版本、auth mode | server 没起/端口不对；给出 `openviking-up.sh` 或启动命令 |
| 2 | **运行中 config**（`OPENVIKING_CONF`/派生副本）存在、0600、provider/base_url/model、key 存在（不回显）；同时显示上游 `~/.openviking/ov.conf` 是否为来源 | 缺文件/权限/字段；给出 `.env.local` → `ov.conf` → 派生副本的流向 |
| 3 | `openviking-server doctor --config <运行中 config>` + 最小 embedding/FC 探测 | 模型位不可达/不支持 FC/熔断未恢复；给出 provider/model 修正与等待/重启建议。**注意**：上游 doctor 绿不等于运行中 server 能 commit（2026-10-21 实测），check 4/5 才是运行态探针 |
| 4 | 一次 `POST /search/find`（无 session；`search/search` 是 session-aware，不用它做 doctor 探针） | “health 绿但 search 失败”（含 embedding 熔断）的典型；提示模型位/网络；空结果不是失败，报“无命中” |
| 5 | 一次 commit（默认 `--dry-run` 不写；`--write` 才真写）：建唯一 sentinel session → commit → 轮询 `/tasks` 到终态（超时即 fail）→ 清理 | commit 失败/任务 failed/超时；给出 `/tasks` 与日志路径；清理失败如实报 |
| 6 | 组合：`dump-config` 有 OV 行 + v3 config；`assistant-viki` baseUrl 对齐（本卡修默认）；`ov-shield` 在场；**MCP initialize 无 instructions（0.4.22 dev 模式实测为空；0.5.1.1 未复测，check 5/6 的 MCP 分支仍 skip）** | 行缺失/config 被覆盖/Viki URL 不一致/服务端说明文本会静默进系统提示 |
| 7 | 存储路径持久（**从运行中 config 读**，不在 `.tmp`）、可写、有备份 | 给出迁移/备份命令（搬家归运行态卡） |
| 8 | 云端 ack + 脱敏自测：从 active profile 的 OV config 读 `captureFilters`，假 key 不出现；**规则为空即红** | 缺 ack / 过滤器没生效；无法加载过滤器时记 blocked，不报绿 |
| 9 | 版本矩阵：plugin / server / DSH（**server 版本只读 `GET /health`**；MCP `serverInfo` 的 1.30.0 不是 server 版本，不得据此判；记录复核日期，当前 server 0.5.1.1 / plugin 0.5.27 为 latest） | 不兼容/落后；给出升级或 pin 建议 |
| 10 | **config 同源**：doctor 打印的 config 路径 = 运行中 server 的 `--config`；派生副本与上游来源的 storage/模型字段差异可见 | 读错配置会假绿；给出两边路径与差异 |

**不打印 key。** 输出里只出现“已配置/缺失”，不出现值。

### 2. README 部署节

一张必填表 + 三条命令 + 故障表：

| 配置 | 例子 | 谁消费 | 缺失后果 |
|---|---|---|---|
| server URL | `http://127.0.0.1:1933` | 插件 + Viki | 插件默认 1933；Viki 503（本卡修默认） |
| auth mode | `dev` / `trusted` / `api_key` | server | trusted 需 root key（0.5.1.1） |
| VLM | provider/base_url/model | server 抽取 | 抽取失败/空结果 |
| embedding | provider/base_url/model/dimension | server 检索 | search 空/500 |
| storage | `dev/harness-home/openviking/workspace` | server | `.tmp` 会丢；doctor 只报红，搬家归运行态卡 |
| peer | `assistant` | 插件 | 记忆按 git origin 分叉 |
| budgets | profile 3000 / commit 3000 / recall 6 / 2400 | 插件 | 桌面膨胀/短会话丢 |
| capture | `captureToolResults: false`（或过滤后的摘要）+ `captureFilters` 非空 | 插件 capture | 云端工具结果原样出（当前现状） |
| Viki URL | 同 server URL；默认 `http://127.0.0.1:1933` | `assistant-viki` | 面板 503 |
| cloudAck | **仅** `OPENVIKING_CLOUD_ACK=1`（无 config key） | doctor/启动门 | 云端配置 fail |
| config 源 | `OPENVIKING_CONF` 或派生 `.tmp/openviking/ov.conf` | doctor/server | 读错配置 = 假绿 |

故障表至少覆盖：health 绿但 recall 空、commit failed（含 doctor 绿但 `/tasks` failed）、Viki 503、模型 400/401/connection、存储不可写、插件被兼容闸跳过、`captureFilters` 为空、doctor 读错 config。

### 3. 一份配置源

现在不是“三处”，是四层：

1. 上游 `~/.openviking/ov.conf`：provider/model/storage 的**来源**（key 0600）。
2. `openviking-up.sh` 派生的 `.tmp/openviking/ov.conf`：**运行中 server 实际读的 config**（storage 改到仓内 `.tmp`；含同一把 key，0600）。
3. profile patch：插件旋钮（peer/预算/召回/`captureFilters`）。
4. `assistant-viki` config 或 `OPENVIKING_URL`：Viki baseUrl（当前空 → 503）。

doctor 对账 1↔2↔运行中 server（check 10）与 3/4；Viki 的 baseUrl 本卡改为默认 `http://127.0.0.1:1933`（与插件默认一致），远程部署显式配，不能静默回退 localhost。**不新增第五个配置口**（云端 ack 用环境变量，不算连接配置）。

### 4. `pnpm preflight` 集成

- 打印“OpenViking: healthy / degraded / off”与一行修法；**不让可选层拖垮 DSH preflight**。
- 若 OV 在场但 doctor 红：打印红项，不 exit 非零（除非用户显式 `--require-openviking`）。

### 5. 安装与配置面（另一人路径）

**现状（缺口）**：`_dist/安装手册.md` 由 [`scripts/release/export-dist.mjs`](../../scripts/release/export-dist.mjs) 生成，但只覆盖插件本体；没有 `agent-preset-registry.default: assistant` 步骤；`ov-install.sh`/`openviking-up.sh` 假定 repo、`.env.local`、dev home 与 tracked tgz，导出包用户无法照做；doctor 已落包内 bin，但“用户侧 OV 安装器 + OV 在场 clean-home + 另一人走查”仍未完成。**结果：另一个人拿到 tgz 能装插件，但 Viki/记忆层还不能一条路径跑起来。**

**交付物（最小可用，不先造 wizard）**

1. **导出手册扩展**（生成器 = `scripts/release/export-dist.mjs`，手册 = `_dist/安装手册.md`）：
   - 宿主前置：DSH 版本、Node ≥22、`dsh` 在 PATH；
   - 插件安装 + **profile 的 `agent-preset-registry.default: assistant`**（一页 patch 片段或 CLI 步骤）；
   - 可选 OV 层：server 安装（uv/pip）、`ov.conf` 模板（VLM/embedding/存储，占位符不落真 key）、启动、`OPENVIKING_URL`、`OPENVIKING_CLOUD_ACK=1`、`ov-doctor`、故障表；
   - 卸载/回退；全程不出现本机绝对路径。
2. **包内 doctor**：`ov-doctor` 不能只在 repo 里跑。已落 `packages/dsh-smart-assistant/bin/ov-doctor.mjs` + `package.json` 的 `bin`/`files`；只用 Node 内置 + 用户 config，手册里从已安装 profile 调用。仓内开发用同一文件。
3. **用户侧 OV 安装/配置脚本**：从 `dev/experiments/openviking/ov-install.sh` 抽出可在**没有本仓库**的机器上跑的版本（或明确只支持“仓库内开发安装”，并在手册里给另一条手装路径）。脚本必须：不读 `.env.local`、不依赖 `dev/harness-home`、不把 key 写进日志、幂等、失败不阻断插件本体。
4. **干净 home 安装 smoke**：`DSH_HOME=<throwaway>` + 导出的 tgz + `dsh plugin add` + 设 preset 默认 + 启一次；断言 assistant preset 在场、插件可用；OV 缺席 → doctor exit 2 / Viki 503 / 插件照常；OV 在场（本机测试 config 或 mock）→ doctor 绿 / Viki 200。该 smoke 与 `release-smoke` 分工：`release-smoke` 证包形状，本 smoke 证“另一人路径”。
5. **人判**：把手册给另一个人（或本人在干净机器/新用户）走一遍；agent 只能做 clean-home dry run，不能替代“另一个人的机器”。

**边界**：不把 OV 变成必需依赖；不在手册里放真 key；不承诺云端 provider 的账户/配额；交互式 wizard 可选，不阻塞本卡。

## 非目标

- 不实现只读检索/工具面（[按需检索卡](261020-openviking-retrieval-viki.md)）。
- 不升级 server（[运行态卡](261020-openviking-runtime-repair.md)）。
- 不搬家存储（运行态卡）；本卡只让 doctor 报红。
- 不做 Viki 面板的搜索/健康/转正（检索卡）；本卡只修 baseUrl 默认。
- 不做交互式 wizard 作为本卡阻塞项；先做手册 + standalone doctor + clean-home smoke，wizard 作为可选增强（人走查后仍觉得易错再立）。
- 不改 `ov-shield` 的写面策略。
- 不把 OpenViking 变成必需依赖。

## 风险与未决

1. **doctor 的 commit 测试会写数据**：默认 dry-run，`--write` 用唯一 sentinel 并清理；清理失败要如实报。
2. **doctor 读错 config 会假绿**：运行中 server 用派生 `.tmp/openviking/ov.conf`；doctor 必须读同一份（`OPENVIKING_CONF`/派生副本）并打印路径。2026-10-21 已实测默认 doctor 全绿而 `/tasks` failed——check 4/5/10 是解药，不能只看 check 3。
3. **key 的处理**：doctor 只读 config/env，不打印、不复制到日志；`.env.local` 永不进 git/会话。另注意 `openviking-up.sh` 把上游 `ov.conf` 整份派生成 `.tmp/openviking/ov.conf`（含 api_key，0600）——这是磁盘上的第二份 key，doctor 要报它的位置/权限，或改成不落 key 的派生方式。
4. **provider 差异**：OpenAI 兼容端点对 FC/连续 user 消息的宽容度不同；doctor 的探测要能区分“401/400/connection”。
5. **脱敏误杀**：正则过宽会把正常业务文本打码；需要白名单/可配置，并在 doctor 里给“命中示例”（脱敏后）。当前 `captureFilters` 为空，P0 先有规则再谈误杀。
6. **0.5.1.1 的 auth 变化**：trusted 模式要 root key；doctor 要能识别 auth mode 并给对应修法。
7. **Viki 默认 URL 与远程 server**：默认 1933 只适用于本机；远程部署必须显式配，不能静默回退到 localhost。
8. **fresh home 无 OV 插件**：本卡不把 OV 行写进 tracked `profile-patch.yml`（那是运行态卡的落点，且需 absent-plugin 验收）；doctor 在 OV 缺席时 exit 2，不阻断 DSH。

## 验收标准

**证据路由（行为类 / owner / 能证明 / 不能证明 / 人判）**

| 验收组 | 行为类 | 证据 owner / 命令 | 能证明 | 不能证明 | 人判 |
|---|---|---|---|---|---|
| doctor 红绿 | 编排/确定性 | `node packages/dsh-smart-assistant/bin/ov-doctor.mjs`（或安装 profile 内的 bin）+ 健康实例 + 坏配置 + OV 缺席 | 检查逻辑、具体 check id/文案、退出码 | 运行中 server 真的能 commit | 无 |
| config 同源 | 编排 | doctor 打印路径 + `ps`/启动命令的 `--config` 对照（check 10） | 读的是运行中那份 | 配置字段语义正确 | 无 |
| 云端脱敏 | 确定性 + 集成 | doctor 的 `captureFilters` 自测 + 本地 mock server payload + 一条真实 capture（若可行） | 规则命中、payload 无原文 | 生产 provider 全路径、正则长期可靠性 | H2 口径 |
| Viki 连接 | 编排 | 正常 `pnpm start` + `GET /api/assistant/viki` 200；OV 缺席 503 | 默认 URL/降级 | 面板渲染与交互（检索卡） | 无 |
| README 部署 | 文档 | 一次性 home 从空配置按 README 走 + doctor | 必填项与故障表可复现 | 业务价值/长期可维护 | 人读 |
| 安装面（另一人路径） | 编排 + 文档 | `pnpm export-dist` + `_dist/安装手册.md` + clean-home smoke + 另一人走查 | 手册/脚本可执行、preset 默认、OV 缺席/在场 | 另一个人的真实环境/账户 | 人走查 |
| 版本/instructions | 确定性 | `/health`、`openviking-server --version`、MCP initialize | 版本一致、无未审 instructions | 运行态 commit/召回质量 | 无 |
| preflight | 编排 | `pnpm preflight` + OV 红/缺席 | 不拖垮 DSH | 渲染/业务 | 无 |

实施后必须真跑过并记录：

- [ ] `node packages/dsh-smart-assistant/bin/ov-doctor.mjs`（或安装 profile 内的 bin）在健康实例 exit 0；在“server 不可达”“缺 key”“云端无 ack”“存储指向 `.tmp`”四种坏配置上分别 exit 1，且**命中的是各自的 check id 与文案**（不能只断言 exit code——无关检查失败也会 exit 1）。OV 缺席/配置读不到 exit 2，不阻断 DSH。**2026-10-21：MCP instructions（6m）已落并 live 验证；check 5 commit 探针已实现为 `--write` 可选（默认 SKIP，测试覆盖；未对 live 跑 `--write`，避免写 sentinel 记忆）。**
- [ ] **config 同源**：doctor 打印的 config 路径 = 运行中 server 的 `--config`；把派生副本与上游 `~/.openviking/ov.conf` 的 storage 字段做成差异，doctor 在 check 10 报出差异；读错配置时不得报整体绿。
- [ ] `ov-doctor --write` 能完成一次 commit + search 的往返（轮询 `/tasks` 到终态，超时即 fail），并在结束后清理 sentinel（或明确留下不清理的理由）。**v0 未实现，S2b 补。**
- [ ] **当前云端暴露已收口**：active profile 的 OV config 里 `captureToolResults: false`，或 `captureFilters` 非空且 doctor check 8 绿；规则为空时 check 8 必须红。假 key（形如 `sk-test-...`）进一条 capture 测试：规则命中并输出脱敏后的示例；若做端到端，用本地 mock server 断言收到的 payload 无原文；doctor 自测显示“已脱敏”，且日志/审计里没有原文。**没有能力加载过滤器时记 blocked，不记 pass。**
- [ ] `GET /health` 的版本与 `openviking-server --version` 一致（当前目标 0.5.1.1）；doctor 不把 MCP `serverInfo`（1.30.0）当 server 版本。
- [ ] OV 行在场时，MCP `initialize` 的 `instructions` 为空（当前 0.4.22 dev 模式实测为空）；出现未审文本时 doctor 至少报 warn 并标出 server 名。
- [ ] README 的部署节从**一次性 home 的空配置**开始照做能到 doctor 绿（至少 dry-run 路径）；故障表每条有可复现的现象与修法；不碰日用 `~/.dsh`。
- [x] 正常 `pnpm start` 后 `GET /api/assistant/viki` 返回 200（不再依赖手工 `OPENVIKING_URL`）；OpenViking 缺席时返回 503 且 DSH 启动不受影响。**2026-10-21 真机：preflight 绿；token→cookie 后 200 `connected:true`（实例已收）。**
- [ ] `pnpm preflight` 打印 OV 状态；OV 红时 preflight 仍按 DSH 自身判据退出。
- [x] **安装面**：`pnpm export-dist` 的《安装手册》覆盖 DSH/Node 前置、插件安装 + `agent-preset-registry.default: assistant`、可选 OV 安装/配置/启动/doctor/故障表、卸载；手册不含本机绝对路径或真 key。**2026-10-21 干净 home 走查发现并修掉一个真卡点：新 profile 的 `cordis.patch.yml` 自带占位 `[]`，手册原文“追加”会产出非法 YAML；生成器已改成“把 `[]` 整行替换”，`pnpm export-dist` 重生成，干净 home 复跑通过。**
- [x] **干净 home 安装**：一次性 `DSH_HOME` + 导出的 tgz + `dsh plugin add` + 设 preset 默认 → `--dump-config` 看到 `preset-assistant`，启动一次；全程不读 `dev/harness-home`。**2026-10-21 实测：`.tmp/install-walk/home` + `dsh plugin add` + 替换 `[]` → dump-config 显示 `default: assistant`、`assistant-memory`、`preset-assistant`；`dsh --profile web --port 0 --no-open` 出 boot URL（一次性 token 不记）；包内 doctor OV 缺席 exit 2。**
- [x] **OV 缺席/在场**：缺席 → 插件照常、doctor exit 2、Viki 503；在场（测试 config 或 mock）→ doctor 绿、Viki 200。**2026-10-21：release-smoke 干净 home 的 `web-smoke` + mock：缺席 exit 2、在场 exit 0；真机 Viki 200 见 S2 次片。**
- [x] **包内 doctor**：`bin/ov-doctor.mjs` 随 tarball 安装；`--help` 可跑；OV 缺席 exit 2；不 import 仓库 `dev/`；仓内 `node packages/.../bin/ov-doctor.mjs` 与安装 profile 内的 bin 同文件。**2026-10-21：干净 home 的 `profiles/web/node_modules/dsh-smart-assistant/bin/ov-doctor.mjs` 直接跑，OFF composition、exit 2。**
- [ ] **另一人走查**：把手册给另一个人（或干净机器/新用户）走一遍；记录卡点与修法。agent 的 clean-home dry run 不能替代这一步。
- [ ] `pnpm verify` 通过（或记录与本次无关的既有失败）；新增脚本/文档在 verify 的覆盖范围内。

## 下一步

**裁决已收（2026-10-21）**：H1 B / H2、H3 按建议；**人类追加要求：安装/配置是一等交付**。本卡承载规格与验收，推进在 [收口卡](261021-openviking-viki-closure.md)。**S1 首片 + 包内 doctor v0 已交付**；下一步 S1 剩余（用户侧 OV 安装器、OV 在场 clean-home、另一人走查）+ S2b（doctor check 5/MCP、Viki baseUrl、README 全量）。
**Agent 的**：第一轮（2026-10-20）、第二轮（2026-10-21）与安装面追加均已回写；实施按最小可回退切片。

## 范围与邻居

| 本卡拥有（修/交） | 只检查/引用（不修） | 不拥有（去向） |
|---|---|---|
| Viki baseUrl 默认值；`ov-doctor`；README 部署/故障表；云端 ack/口径；config 对账 | 存储是否在 `.tmp`（报红）；升级后的版本矩阵（check 9）；MCP instructions | 存储搬家/server 升级（[运行态卡](261020-openviking-runtime-repair.md)）；Viki 搜索/健康/转正（[检索卡](261020-openviking-retrieval-viki.md)）；写面（`ov-shield`） |

## 评审记录（意见回流的家）

### 2026-10-20 · 第一轮 agent 核验（部署面，只读）

- doctor 只断言 exit code 会假绿：坏配置可能因无关检查失败而 exit 1；验收改为断言**具体 check id 与文案**。
- “发送前扫描器/过滤器”没有实现点：插件自己发 HTTP，DSH 侧无拦截缝；降为 doctor 静态检查 + `captureFilters` 实测，不再声称运行时阻断。
- MCP `initialize.instructions` 是 ov-shield 的未守面：加入 check 6；当前 0.4.22 dev 模式为空，出现文本即 warn。
- MCP `serverInfo` 1.30.0 不是 server 版本：check 9 只读 `GET /health`。
- `captureFilters` 对 tool input/output 的替换已核（0.5.26 `filterCaptureParts`）；“要再核”的开放项关闭。
- `web-expected` 不覆盖 Viki：Viki 验收归检索卡，本卡只用 `GET /api/assistant/viki` 200/503。

### 2026-10-21 · 人类追加要求（安装面）

用户 2026-10-21：安装/配置要作为一等交付计划清楚；“把这插件给另外一个人，另外一个人跑不起来”是当前缺口。本卡把“另一人路径”列为 §5 与验收：导出手册覆盖 preset 默认值 + OV 安装/配置/启动/doctor，doctor 可随 `_dist` 走，干净 home 安装 smoke，另一人走查。**这不是 README 尾巴，是 P0 的完成条件之一。**

### 2026-10-21 · 第二轮内部质量审（按 `_backlog/methods`）

- **Q4 范围重叠**：原卡把“Viki 正常启动”“记忆库不在临时目录”写成本卡完成条件，和运行态卡撞；改为本卡修 Viki baseUrl 默认、doctor 报存储红，搬家归运行态卡。
- **Q7 doctor 读错 config**：运行中 server 用派生 `.tmp/openviking/ov.conf`，`openviking-server doctor` 默认读 `~/.openviking/ov.conf`；加“同一份 config”约束与 check 10。
- **Q8 云端现状为空**：dev 无 OV config，`captureToolResults` 对 DSH 默认 true，`captureFilters` 默认 []；写入当前情况、P0 与验收，README 表去掉 `cloudAck: true` 二义。
- **Q13 doctor 绿 ≠ 运行态可用**：2026-10-21 实测默认 doctor 全绿而 `/tasks` failed；check 3 只作配置探测，check 4/5/10 是运行态探针。
- **Q6 场景漂移**：`web-expected` 已三场景；本卡不硬编码“两场景”，Viki 渲染归检索卡。

**结论**：本卡 P0 的判断成立，但“云端例外 v1”必须先补现状收口；不授权实施。

**2026-10-21 裁决后补记**：人类接受 B / H2–H6 按建议；本卡授权实施。S1 首片已交付（下），其余待续。

### 2026-10-21 · S1 首片（安装/配置面）

- `_dist/安装手册.md`：加 preset 默认步骤、可选 OV 安装/配置/启动/Viki 连接/工具结果关闭/故障表；导出手册由 `scripts/release/export-dist.mjs` 生成。
- `scripts/release/release-smoke.mjs`：新增 `web-smoke` 干净 home 路径——web profile + `dsh plugin add` + 写 `agent-preset-registry` 默认，断言默认从 `standard` 翻到 `assistant`；`pnpm release-smoke` PASS。
- `dev/env/dsh.mjs`：所有 dev 启动默认 `OPENVIKING_CAPTURE_TOOL_RESULTS=false`；`dev/experiments/openviking/ov-install.sh` 的 v3 配置加 `captureToolResults: false`。插件 `resolveKnobs` 实测 env 覆盖为 false。
- 证据：`pnpm release-smoke` PASS；`pnpm verify` 43/43；`_dist/安装手册.md` 与生成器一致。
- 剩余：用户侧 OV 安装（手册路径；脚本可选）、另一人走查；S2b 的 doctor check 5/MCP。

### 2026-10-21 · S1b（OV 在场 clean-home）

- `release-smoke` 把 pinned OV plugin 装进干净 `web-smoke` profile，起本地 mock `/health` + `/search/find`，用安装态 doctor `--no-upstream` 跑 → **exit 0**；OV 缺席 case → exit 2。
- `ov-doctor --no-upstream` + parseArgs 测试；`pnpm test:tooling` 270 passed；`pnpm release-smoke` PASS。
- 这把“OV 在场”从本机 live 状态推进到可重复的干净 home；Viki 200 另有真机证据（S2 次片）。

### 2026-10-21 · S2 首片（包内 doctor v0）

- `packages/dsh-smart-assistant/bin/ov-doctor.mjs` + `package.json` 的 `bin`/`files`：随 tarball 安装，只用 Node 内置；手册加“自检”节。仓内开发与安装 profile 用同一文件。
- `release-smoke`：断言 tarball 含 `bin/ov-doctor.mjs`、安装后 `--help` 可跑、OV 缺席 exit 2；**PASS**。
- `tests/tooling/ov-doctor.spec.mjs`：12 案（config/mode/storage/cloud-ack/capture/filters/args/Viki/version）；`pnpm test:tooling` **270 passed**。
- 真机 dev 跑：health 0.4.22 / upstream doctor 通过；search 500 fail；Viki URL 缺 fail；cloud+no-ack+capture-on+empty-filters fail；版本 0.4.22 warn；config 同源 warn；check 5/MCP SKIP。**这正是“health 绿 ≠ 可用”的实物。**
- v0 覆盖 check 1/2/3/4/6/7/8/9/10；check 5 与 MCP instructions 子项留 S2b。

### 2026-10-21 · S2 次片（Viki baseUrl 默认）

- `src/host/viki/index.ts`：`config → OPENVIKING_URL → http://127.0.0.1:1933`；走默认时 `ctx.logger.warn` 提示远程要显式配；模块头注同步。
- `tests/host/viki-route.spec.ts`：新增“无 config/env 时默认 1933”案；15 案通过。
- `bin/ov-doctor.mjs` 6d：无显式 URL 时按默认 1933 报 `ok`，并提示远程需显式；install manual 的 Viki 节同步。
- 证据：`vitest run tests/host/viki-route.spec.ts` 15 passed；`pnpm typecheck` PASS；`pnpm export-dist`；`pnpm release-smoke` PASS；`pnpm verify` 43/43；live doctor 6d 已从 fail 变 ok（默认 local 1933），search/cloud 仍 fail。
- 剩余：S2b 的 doctor check 5/MCP；README 的部署/故障表仍由《安装手册》承载（README 已补 preset 默认、可选 OV 路径与手册入口，2026-10-21）；另一人走查。

### 2026-10-21 · 干净 home 走查（agent dry run）

- 用 `pnpm --dir packages/dsh-smart-assistant pack` 出 tgz，一次性 `DSH_HOME=.tmp/install-walk/home`，按《安装手册》执行 `dsh plugin --profile web add`。
- **发现真卡点**：DSH 新建 profile 的 `cordis.patch.yml` 是注释 + 占位 `[]`；手册原文“追加”会得到 `[]` 后接列表项的非法 YAML，`--dump-config` 直接报 `YAMLException`。生成器文案改为“把 `[]` 整行替换成下面的块”，`pnpm export-dist` 重生成手册。
- 复跑：替换 `[]` 后 `dsh --profile web --dump-config` 显示 `default: assistant`（第 628 行）、`assistant-memory`（1233）、`preset-assistant`（1271）。
- 启动一次：`dsh --profile web --port 0 --no-open` 输出 boot URL（token 一次性，不记入卡）；随后停掉。
- 包内 doctor（OV 缺席）：`profiles/web/node_modules/dsh-smart-assistant/bin/ov-doctor.mjs --profile web ...` → `OFF 6 composition`、`SKIP 5`、`summary: exit 2`。
- OV 在场：同一干净 home 再 `dsh plugin add` 钉存的 `dsh-memory-plugin-0.5.26.tgz`，dump-config 出现 `openviking-memory-runtime`（1470）与 `assistant-viki`（1243）；`OPENVIKING_CLOUD_ACK=1 OPENVIKING_CAPTURE_TOOL_RESULTS=false` + live config 跑 doctor → `exit 0; 0 fail, 1 warn, 2 skip`（warn 只是 `OPENVIKING_CONF` 未显式设）。
- **边界**：这是 agent 在干净 home 的 dry run，不是“另一个人”走查；真人走查仍待做。

### 2026-10-21 · S2b 3（MCP instructions + 云端 ack 绿）

- `bin/ov-doctor.mjs` 新增 `6m`：POST `/mcp` `initialize`，读 `result.instructions`；空 → `ok`，有文本 → `warn` 并带 `serverInfo.name`，不可达 → `warn`。单测 mock SSE 覆盖三种形状（17 tests 全过）。
- `--write` 新增可选 commit 探针：建 sentinel session → 写一条 sentinel → commit → 轮询 `/api/v1/tasks` 到 completed/failed，60s 超时 fail；默认不加 `--write` 仍是只读 SKIP。**已对一次性 0.5.1.1 server（temp workspace，port 1934）真跑 `--write`：`ok 5 commit probe: sentinel … committed (task …)`**；随后 kill server、删除 temp 目录。未对持久 live 跑 `--write`（避免写一条真实记忆）。
- live（0.5.1.1）`OPENVIKING_CLOUD_ACK=1 node bin/ov-doctor.mjs --profile dev ... --no-upstream`：`exit 0; 0 fail, 1 warn, 2 skip`；`6m server=openviking; instructions empty`；`8 cloud/capture: ack=true; captureToolResults=false`；唯一 warn 是 check 10 的 `OPENVIKING_CONF` 未显式设（同源提示）。
- 同轮修掉 check 7 的假绿：config 校验失败（如 storage 在 `.tmp`）时不再报 `ok persistent root`，改为 `SKIP not judged`；temp server 复跑确认 `FAIL 2 config` + `SKIP 7`，check 5 仍 `ok`。
- 手册与故障表同步：doctor 覆盖 MCP instructions；`--write` 的写记忆边界写明。

## 另一人走查记录（待填）

> 这张表是 S1 唯一不能由 agent 代替的验收：在**另一台机器/另一个人的 home**按《安装手册》走一遍，
> 把卡点写回来。agent 的 `.tmp/install-walk` dry run 只证明路径可执行，不替代这一行。

| 项 | 记录 |
|---|---|
| 走查人 / 日期 | |
| 机器 / OS / Node / dsh 版本 | |
| `dsh plugin add` 插件成功 | ☐ |
| `agent-preset-registry.default: assistant` + `--dump-config` 见 `preset-assistant` | ☐ |
| 不装 OV：插件正常 / Viki 503 / doctor exit 2 | ☐ |
| 装 OV：服务 + 插件 + 配置 + `OPENVIKING_CLOUD_ACK`/capture 口径 → doctor exit 0 | ☐ |
| Viki(调试) 连接态、搜索、诊断可见 | ☐ |
| 卡点与修法（逐条） | |

## 关闭条件

- doctor + README + 云端例外 + 配置对账 + **Viki baseUrl 默认**落地；验收全绿；用户 review 通过。
- 云端例外写入 note（若形成持久取舍）并与 README 互链；**当前工具结果收口（`captureToolResults`/`captureFilters`）有记录**；`_backlog/issues/README.md` 更新。
- 存储搬家/server 升级/Viki 面板能力写清去向（运行态卡/检索卡），不留在本卡当“以后再说”。
- 未做的 wizard/远程部署指引写清去向。
- **归档冻结**：不修改 `_backlog/_archive/` 与 `notes/archived/` 的正文；旧决定只作历史引用。

## 关联

- [方向评审卡](../_archive/settled_issues/261020-openviking-direction-review.md)
- [运行态与 0.5.1.1](261020-openviking-runtime-repair.md)
- [按需检索与 Viki](261020-openviking-retrieval-viki.md)
- 既有：[openviking-up.sh](../../dev/env/openviking-up.sh)、[ov-install.sh](../../dev/experiments/openviking/ov-install.sh)、[viki/index.ts](../../packages/dsh-smart-assistant/src/host/viki/index.ts)、[vendor README](../../vendor/thirdparty/openviking/README.md)
- 版本：[v0.5.1.1 release](https://github.com/volcengine/OpenViking/releases/tag/v0.5.1.1)、[plugin 0.5.27](https://www.npmjs.com/package/@openviking/dsh-memory-plugin/v/0.5.27)
- 证据面：[测试证据地图](../../docs/testing.md)、[web-face 场景](../../snapshots/web-face/)
