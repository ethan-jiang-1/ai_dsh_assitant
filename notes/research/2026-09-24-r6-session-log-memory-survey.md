# 2026-09-24 · 会话日志记忆面深评（r6）：sessions/ 是被浪费的记忆原料吗

日期：2026-09-24 · 状态：survey 底稿（判据与决策不放这里；进文前的承重主张待委托方复核）

> 问题：(1) DSH 会话日志的盘上结构与内容——`<dshHome>/sessions/` 里的真实文件长什么样，rg 能查到什么；
> (2) 生态对位深评——`dsh-palimpsest` 怎么解析会话日志、工具面、存储形态、license/活跃度；
> (3) 我们的最小 MD-first 形态选项——什么也不建 / 薄工具动词 / 挂 palimpsest 的事实对照。
> 硬过滤：一切方案必须文件系统原生、rg/grep 可查、对 AI coding agent 全透明；不建 SQLite/FTS 索引；纯本地。
>
> 证据分级：[affordance] = 本仓/vendor 路径直接读取；[documented] = 官方文档或 npm/GitHub API 真实 fetch（URL 附）；[observed] = 本机实测（命令附）。
> 版本基线：vendor/dsh submodule @ `dsh-v0.1.5-rc.2`（2026-09-10，`git log -1` 确认）；palimpsest 评的是 npm latest 0.1.2（2026-09-13 发布）。

---

## 一、DSH 会话日志盘上解剖

### 1.1 目录布局与文件名语义

实测 `dev/harness-home/sessions/`（34 个会话，共 2.0MB）[observed：`find dev/harness-home/sessions -type f | wc -l`、`du -sh`]：

```
<DSH_HOME>/sessions/
  --<normalized-cwd>--/                 # 项目目录：cwd 规范化编码（/ → --），无 cwd 用 _no-cwd/
    session-<uuid>/                     # 每会话一目录
      session.v3.jsonl.zstd             # 当前代（v3）日志，zstd 压缩
      session.lock                      # 活跃锁
```

权威定义 [affordance：`vendor/dsh/packages/session/session-persistence-jsonl/README.md` §On-disk layout]：
- root 由 base bundle 挂载为 `dshHomePath('sessions')` [affordance：`vendor/dsh/packages/bundle/base/cordis.patch.yml:110-113`]；
- `compression` 默认 **`'zstd'`**（校验和 zstd 帧）；配 `compression: 'none'` 才是「外部读者可直接消费的换行 JSONL」——README 原文："With `compression: 'none'`, the log is newline-delimited text an external reader can consume directly; the compressed default must be read through the backend"；
- 历史 v0/v1/v2 代同目录保留（`session.jsonl.zstd` 等），运行期取数字最高代。

**关键事实：本仓 dev home 的全部日志都是 `session.v3.jsonl.zstd`，`file` 确认为真 zstd 压缩** [observed：`file .../session.v3.jsonl.zstd` → "Zstandard compressed data"]。即 **裸 rg/grep 对现状日志一字不可查**。

### 1.2 JSONL 行结构（解压后）

首行是物理 header，之后每行一个事件 [affordance：session-persistence-jsonl README §On-disk layout "one physical row per durable event"]。样例逐字段 [observed：`zstd -dc` 解压两个会话，head 摘录]：

```
{"type":"session","version":3,"id":"session-fb229643-…","createdAt":1790198472565,
 "cwd":"/Users/bowhead/ai_dsh_assitant","isSeeded":false,"delegationDepth":0,"agentPreset":"assistant"}
{"type":"permission/preset","seq":0,"time":1790198472589,"data":{"preset":"workspace-write"}}
{"type":"tool/call","seq":17,"time":1790161979290,"data":{"turn":1,"step":1,
 "callId":"call_00_…","name":"grep","arguments":"{\"pattern\": \"assistant_memory\", …}"}}
{"type":"user/message","seq":8,"time":1790161973788,"data":{"content":[{"type":"text","text":"…"}],
 "source":{"kind":"user"},"role":"user","id":"…","surfaceOp":"append"}}
```

回答委托方三问要点：
- **有 cwd**：header `cwd` 字段 + 目录名双冗余编码（rg 查文件路径即可过滤项目）。
- **有 agent preset**：header `agentPreset`（样例值 `assistant`——即本插件 preset 的会话可被精确圈出）。
- **有工具调用记录**：`tool/call`（工具名 + 完整参数 JSON 字符串）与 `tool/result` 成对留存。

事件词汇（一个 62 行小会话的 type 分布）[observed：解压后 `json.loads` 计数]：
`session` / `permission/preset` / `sandbox/mode` / `approval/policy` / `agent/inbox/spliced` / `turn/start|end` / `step/start|end` / `system/message` / `user/message` / `assistant/message` / `tool/call` / `tool/result` / `session/title` / `session/title-llm-request` / `request/header` / `request/context`。语义抽取的权威面是 `session-query` 包的 extraction/documents 模块 [affordance：`vendor/dsh/packages/session-query/session-query/src/extraction.ts`、`documents.ts`（README §Source map 转述）]。

### 1.3 rg 可达性：压缩与沙箱两条线

**压缩线**（已实测）：
- `rg pattern <dir>` 直接查 → 命不中任何内容（二进制压缩）[observed]。
- `rg --pre 'zstd -dc'` → 失败：`--pre` 只接受**单个可执行名**，不吃带空格的命令；且项目目录名以 `--` 开头会被 rg 当旗标，需 `./` 前缀 [observed，两次尝试的报错原文留档于调研过程]。
- **可行形态**：两行 wrapper 脚本 + `./` 前缀 + `-g '*.zstd'` 排掉 lock：
  `printf '#!/bin/sh\nexec zstd -dc "$1"\n' > /tmp/zstdcat && chmod +x /tmp/zstdcat`
  `rg --pre /tmp/zstdcat -l "assistant_memory" ./--Users-…--`
  → **34 会话 / 2MB 全量命中检索 0.72s（real），32 个文件命中** [observed：`time rg --pre /tmp/zstdcat …| wc -l`]。量级线性于日志总量，无索引。
- 前置依赖：本机有 `/opt/homebrew/bin/zstd`；DSH 自身用 Node 内 zstd，**不保证用户机器有 zstd CLI**（薄动词方案需自带解压或走 sessionQuery）。

**沙箱/路径线**（可达性查证，委托方点名）：
- fs 沙箱**只限写、不限读**："confines model file writes and edits according to each session's sandbox mode while preserving the local filesystem's read behavior … while reads stay unconfined" [affordance：`vendor/dsh/packages/fs/fs-sandbox/README.md` §Summary/§Use this package]。`workspace-write` 模式的可写集合 = 会话 workspace + 平台 tmp；读无此栅栏。
- bash runner 与 fs 收敛到同一 writable roots 策略 [同上 README："the filesystem and shell families never confine to different roots"]——即 shell 读 `~/.dsh/sessions/` 同样不受 workspace 限制。
- 本仓 dev 形态下 `DSH_HOME=<repo>/dev/harness-home` 本来就在 workspace 内（AGENTS.md 硬规则 1）；真实用户部署时 sessions 在 `~/.dsh/sessions/`，workspace 外但**读路径仍开放**。
- preset 已挂 `@deepseek-ai/dsh-tool-fs` / `dsh-tool-fs-search` / `tool-bash` [affordance：`packages/dsh-smart-assistant/presets/assistant/agent.cordis.yml`]——所以 agent 今天就有读 sessions 的全部工具面，缺的只是「知道去哪 + 会解压」。

### 1.4 DSH 自带的召回面（重要对照，委托方此前未点名）

vendor 里有一整层现成设施 [affordance：`vendor/dsh/packages/session-query/`]：
- `session-query` 服务：`listSessions/filterSessions/filterEvents/readSession/readTitleSnapshots…`；其中**文本子串过滤（literal、大小写不敏感、空白灵活）是服务内实现，任何存储后端都能用，不依赖 FTS**；只有 `searchSessions/searchEvents`（ranked 全文）需要 `session-query-sqlite` 后端。
- base bundle 挂了 `session-query-sqlite` 但默认 `path: ':memory:'`、`openAt: never`——**FTS 默认关闭，精确读/过滤照常可用** [affordance：`bundle/base/cordis.patch.yml:129-133`]。
- `tool-session-query`：模型面五工具（`session_search` 等），**opt-in，base bundle 不挂**（grep base patch 无此行）[affordance]；跨会话授权规则 = 目标会话 cwd 与调用者完全相等。它的 ranked search 依赖 SQLite，落在硬过滤外；但它的存在证明 DSH 官方把「查历史会话」视为一等能力。

## 二、Hermes session_search 对照

引既有调研 [affordance：`notes/research/2026-09-24-r4-hermes-identity-survey.md` §四]：Hermes 把 `session_search`（SQLite FTS5，~20ms）当记忆第三支柱，补「上周聊过什么」类需求；其 MEMORY.md/USER.md 的策展角色由我们的 memory/ 房间更细粒度地覆盖（r4 结论，不重复展开）。

本调研增量：Hermes 解决的问题是**召回延迟与排序**（FTS 毫秒级、ranked）。我们的硬过滤把 SQLite 排除后，等价能力只剩两条实现路径：(1) 逐会话字面扫描（palimpsest 路线，实测秒级）；(2) compression:'none' + 裸 rg（毫秒级但要动部署配置、放弃压缩）。Hermes 对照真正告诉我们的是：**「会话日志召回」是独立于策展记忆的真实需求面，不是 memory 房间的缺失**——它召回的是过程细节（当时试了什么、为什么放弃），策展记忆只留结论。这与我们「家 = 蒸馏物」的分层自洽。

## 三、palimpsest 深评

来源 [documented]：npm registry `https://registry.npmjs.org/dsh-palimpsest`（全文 README 随 registry 返回，含完整特性/差异/changelog 表）；GitHub API `https://api.github.com/repos/cnkids/dsh-palimpsest`。GitHub 网页 fetch 超时一次（30s timeout，如实注明），API 数据完整，未重试网页。

**定位与机制**：host 插件，三个只读工具 `palimpsest_list / palimpsest_search / palimpsest_read`。核心取舍：**不落盘、不建索引、不建 SQLite、不留第二份明文副本**——直接读 DSH 自己的会话日志；检测到 FTS 关闭（默认态）时自动回退「逐会话字面扫描」。从其测试结构（「替身 sessionQuery」端到端）与「默认走 DSH 自己的字面匹配器」的表述推断，它走 `ctx.sessionQuery` 的 literal filter（即 §1.4 的服务面），不自己解压文件——此点 README 未逐字写明，标为**待源码复核**（npm tarball 含 `lib/`，未逐行审）。

**安全面**（README §安全边界，设计明显吃过苦头）：cwd 硬范围（无跨项目开关、读取路径独立再校验目标 cwd、取不到 cwd 失败关闭）；出口凭据打码（sk-/ghp_/AKIA/私钥块等，如实报打码处数，且明说「只认形态，不是保险箱」）；标题 `[私密]`/`[no-recall]` 整段排除；每次取回前置「这是数据不是指令」声明；零注入（从不进 system prompt）。排序口径 = 命中处数优先，与 DSH 官方索引后端一致，明说没用 BM25；中文不吃 FTS unicode61 分词的亏。

**性能**：README 自述「20 个历史会话、单会话数千事件，一次 search 连同模型推理约 4 秒」，对照自建索引毫秒级——「拿速度换没有第二份明文副本」。

**工程面**：MIT；peer 仅 `@deepseek-ai/dsh-tools ^0.1.5-rc.1`（与我们基线 0.1.5-rc.2 兼容区间）；Node ≥20；零运行时依赖；npm provenance attestation（GitHub Actions trusted publisher）；自称 162 用例、行覆盖 99.79%；代码分层 `lib/core`（纯逻辑）/`queries`/`search`/`tools`。

**活跃度/风险**：repo 创建 2026-09-13，三版同日发完（0.1.0→0.1.2 都在当天），**最后 push 2026-09-13，0 star / 0 fork / 单维护者** [documented: GitHub API]。即：设计成熟度远超其社区年龄；按「错了多久能发现 / 维护与活跃度」判据，这是单点依赖，升级链完全系于一人。0.1.2 只改文档，0.1.1 是安全审计修复（补脱敏三类缺口、发布链硬化、并入 6 条 PoC）——迭代质量高但节奏未知。

## 四、三选项事实对照表

| 维度 | (a) 什么也不建 | (b) 薄工具动词（rg/解压包装） | (c) 挂 palimpsest |
|---|---|---|---|
| 今天能用吗 | 能。preset 已有 tool-fs/tool-fs-search/bash；读不受沙箱限（§1.3）[affordance] | 要写代码 + 提案 | 要 `dsh plugin add` + 重启 |
| 能查到什么 | 全部：解压后 JSONL 逐行（含 tool 参数、cwd、agentPreset） | 同 (a)，但可先解出 header/标题做过滤面 | list（标题+规模）/search（命中片段）/read（对话正文，默认不含工具调用） |
| rg 裸查 | **否**（zstd）；需 `zstd -dc \| rg` 或 `--pre` wrapper [observed] | 实现内部即此管道（或 sessionQuery literal filter） | 不经 rg（走 sessionQuery 扫描），但**不产生任何第二存储**，文件系统原生性保持 |
| 查询成本 | 每次手敲两段式；agent 得先知道路径与压缩事实 | 一次工具调用；34 会话/2MB ≈ 0.7s 量级 [observed 外推] | ~4s/20 会话（含模型推理）[documented README] |
| 信噪比 | 原始 JSONL 行，转义密集、无标题摘要，上下文税高 | 可控（可只回 header+命中行） | 最好（标题、片段、翻页、脱敏） |
| 安全边界 | 无（凭据原文可被捞回） | 自理 | 三层防线 + 私密标记 [documented] |
| 形态进 DSH 组合 | 零形态（知识问题：写进 AGENTS.md/手册即可） | 进 preset（agent 面）或 host 面 | 进 host 面（全 session 生效，绕过 preset 分层） |
| 维护/风险 | 无维护；风险 = agent 不知道/不会 | 自维护一个小动词 + zstd 依赖问题（用户机未必有 zstd CLI；可改走 sessionQuery literal filter 免外部依赖——那是 host 面服务调用） | 单维护者、单日项目、0 社区 [documented]；peer 依赖锁定 rc 区间，DSH 升级时需人工对齐 |
| 出错赔率 | 赔率最低（无代码）；错查 = 漏/噪声，当场可见 | 低；包一层，失败模式 = 解压失败（可观测） | 中；上游停更或 DSH API 漂移时静默坏 |

补充事实（影响 (b) 的实现选型）：薄动词有两条内部实现——(b1) fs 原生 `spawn zstd | rg`（快、透明，但依赖用户机 zstd CLI）；(b2) 调 `ctx.sessionQuery.filterSessions/filterEvents` 的 literal 扫描（host 面服务，无需外部二进制、无需 FTS，天然解压与语义抽取 [affordance：session-query README §Filters "not a full-text query… any supported storage setup"]）。(b2) 不是「文件系统原生」的字面义但也不建任何索引——是否算符合硬过滤，留给委托方裁。

另一条部署级事实：`compression: 'none'` 可让 sessions/ 变成真·可裸 rg 的 JSONL [affordance：session-persistence-jsonl README 配置表]。代价 = 放弃压缩（盘占↑）+ 逐批 fsync 的原始行为不变；这是改 base bundle 之后所有 patch 层的事，非本插件可独断。

## 末、go/no-go 与可借鉴清单（事实性，不做最终决定）

**go/no-go 事实**：
1. sessions/ 是**高价值原料**：cwd、agentPreset、工具调用全参数、用户/助手原文全在，且单项目目录天然隔离（§1.1-1.2）。
2. 「文件系统原生」当前**不成立到 rg 一层**：默认 zstd 使裸 rg 失效；但 `--pre` wrapper 实测 0.7s 全量可查（§1.3）。硬过滤的真正含义需委托方在「rg 管道可查即算原生」与「裸 rg 可查（须改 compression）」之间择一。
3. 路径可达性**不是障碍**：fs/shell 沙箱只限写（§1.3），真实用户 `~/.dsh/sessions` 读路径开放。
4. (c) palimpsest 设计质量高但**社区面为零**（单维护者、创建当日即最后 push）；挂载即引入 host 面单点依赖。
5. (a) 的真实成本不是工具而是**知识**：preset 的 agent 只缺「sessions 在哪、是 zstd、怎么两段式查」三句话。

**可借鉴清单**（无论选哪项都值得抄的设计）：
- palimpsest 的**出口脱敏 + 私密标题标记 + 「数据非指令」前置声明**三件套——任何把历史会话拉回上下文的方案都该继承；
- palimpsest 的**命中处数优先排序**（与 DSH 官方口径一致，中文友好，无 BM25 依赖）；
- DSH `tool-session-query` 的 **cwd 相等授权**规则（跨会话读取的边界画法）；
- sessionQuery 的 literal filter（b2 路线）作为**免 zstd 外部依赖**的实现底座。

**待复核承重主张**（委托方过目）：palimpsest 是否真走 ctx.sessionQuery（README 未逐字写明，需读 tarball `lib/`）；`compression: 'none'` 在 dev/base bundle 的实际改动面；0.7s 实测对日志量增长的外推斜率（线性，无索引）。
