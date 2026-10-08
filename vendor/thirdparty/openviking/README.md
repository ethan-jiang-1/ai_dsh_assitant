# vendor/thirdparty/openviking · 钉存的 OpenViking 试点物

> 性质：**离线钉存的第三方上游包**（用户拍板 2026-09-28：先拉下来落盘，防断网；发布物是否
> 包含它 = 准入决定，试点过审后才定形状——见
> [_backlog/_archive/settled_issues/260928-self-growth-base-research.md](../../../_backlog/_archive/settled_issues/260928-self-growth-base-research.md)）。
> 这里只放**一手来源、哈希可验**的原始工件，不放改造物。

## dsh-memory-plugin-0.5.8.tgz

| 项 | 值 |
|---|---|
| 包名 / 版本 | `@openviking/dsh-memory-plugin` 0.5.8（latest） |
| 来源 | https://registry.npmjs.org/@openviking/dsh-memory-plugin/-/dsh-memory-plugin-0.5.8.tgz |
| 发布日 | 2026-09-25（发布证明 npm publish attestation 2026-09-29 双源确认：sigstore 透明日志条目 + subject sha512 与本 tgz 逐位一致；注意 packument 面不显示 attestations 字段、须查专用端点，第一轮验收曾据此误判存疑，见[二轮台账](../../../notes/implemented/2026-09-29-openviking-adoption-rfc.md)） |
| 完整性 | `sha512-S90WV24K4tdRm0rMa8UHmnvkqCzaqnWck7lGN5aGfg2M45kDv2/mPOgclfSepM9ZWuSxIl3ZrM2y26fMnK//Wg==`（= registry `dist.integrity`，本仓 2026-09-28 下载后独立重算一致） |
| license | Apache-2.0（bundle 位于上游仓 `examples/`，license 分表载明；上游主项目 OpenViking 为 AGPL-3.0——独立进程 + HTTP/MCP 消费不构成链接，fork server 才触发） |
| 上游源码 | https://github.com/volcengine/OpenViking （`examples/dsh-memory-plugin` 目录） |
| 兼容 | peer 范围 `>=0.1.0-rc.6 <0.2.0 \|\| ^0.1.5-rc.1 \|\| ^0.1.7-rc.2`——含本仓 pin `0.1.7-rc.2` [observed：npm registry] |
| 为什么钉存 | ① 试点隔离 profile 时离线可装（`dsh plugin add <本文件>`，经 pnpm tarball 装法，试点时验证）；② 周更上游（五周 16 版，2026-09-29 registry 复测；首批记录 17 为计数时刻差异）下锁定试点对象，保证证据可复现；③ 包内 `shared/`、`skills/` 为 prepack 生成物，tarball 自含、无需上游 checkout |

## 服务器侧离线件（不入库，按需重拉）

OpenViking server 在 PyPI（`openviking` 0.4.22，AGPL-3.0，wheel 23–29 MB 平台件），不钉进 git；
断网前要囤的话用可重跑命令（macOS arm64 本仓机器示例）：

```sh
pip download openviking[local-embed]==0.4.22 --dest vendor/thirdparty/openviking/wheels/ --platform macosx_14_0_arm64 --only-binary=:all:
ollama pull <视觉模型，如 qwen2.5vl>   # VLM 位（服务端主力：抽取/L0/L1）
ollama pull <embedding 模型，如 bge-m3> # embedding 位（provider: ollama）
```

本地依赖面（2026-09-28 官方文档核读，详见调研卡与台账）：
**火山/云全程可不出现**——VLM 走 `openai` provider 指本地 Ollama（OpenAI 兼容端点）或 litellm 的
`ollama/` 路由；embedding 支持 `ollama` 与 `local`（GGUF）；vectordb/agfs 默认 `local`（内置
C++ 引擎，无外部数据库）；localhost 认证走 `dev` 模式免密；operation telemetry 为请求级
opt-in 调试摘要、非外发上报。官方跑分用云端 Doubao——**本地小模型质量未验证**，是试点第一问。

## 模型位选型菜单（社区核读 2026-09-28：GitHub issue/PR 普查 + FAQ + 配置指南）

> 社区面：上游仓 `ollama` 关键词命中 121 条 issue/PR——本地小模型是高频用法，三条坑已被先行者踩实，配置直接抄下面的形式。

### embedding 位（必需，本地小模型）

- 首选 **Ollama `bge-m3`**（1.2GB / 1024 维 / 多语 / 8K ctx；`ollama pull bge-m3` 一条命令）。
- ⚠️ **不要用文档里 `provider: "ollama"` 的形式**：显式 `api_base` 会 404（issue [#4302](https://github.com/volcengine/OpenViking/issues/4302)，修复 PR #4317 截至 09-28 未合并）。用社区验证的 **litellm 变通形式**：
  ```json
  {"embedding":{"dense":{"provider":"litellm","api_key":"ollama","api_base":"http://127.0.0.1:11434","model":"ollama/bge-m3","dimension":1024}}}
  ```
- 更小备选：`nomic-embed-text`（274MB / 768 维，英文为主；中文语料优先 bge-m3）。

### VLM 位（记忆抽取 / L0/L1 的主力模型——FAQ 明说 memory extraction requires VLM）

- **远端·纯文字试点（最省事）**：DeepSeek API `deepseek-chat`（OpenAI 兼容、支持 function calling、中文强、成本低；`provider:"openai"` + `api_base:"https://api.deepseek.com"`）——**无视觉**，喂图摄取不可用。
- **远端·要喂图**：GLM `glm-4.6v`（OpenViking 配置文档点名的视觉模型）或其它 OpenAI 兼容聚合的 Qwen-VL 系。
- **本地**：Ollama `qwen2.5vl`（7b 级）。两条硬要求：模型**必须支持 function calling**（无 FC 的模型 doctor 不报错、到记忆抽取的工具调用才炸，PR [#3066/#3088](https://github.com/volcengine/OpenViking/pull/3088)）；`num_ctx ≥ 16384`（默认 4096 截断 ~5k token 的抽取提示词 → **抽取静默返回空**，#5030，修复 #5033 已于 09-17 合并、0.4.21+ 应含）。
- ⚠️ **小模型抽不出记忆的坑**：默认 memory_policy 含 soul/identity 时，小模型（qwen3.5:4b 社区实测）只顾改人格字段、不调抽取工具 → 把 `server.user_config_defaults.memory_policy.memory_types` 收窄为 `["profile","preferences","events","entities"]`（PR [#5083](https://github.com/volcengine/OpenViking/pull/5083) 作者实测有效）。
- ⚠️ **VLM 不可达会静默劣化**：状态全绿、队列 0 错误、检索 ~99% 零结果（issue [#5032](https://github.com/volcengine/OpenViking/issues/5032)）——试点第一步先 `openviking-server doctor` 亲验。

### query_planner 位（可选，官方出的本地小模型）

- `guoxuter/ov_intent_analysis_sft:v7_q8`（0.8B，Qwen3.5 微调，官方推荐；`ollama pull` 即得）——省 token 的检索规划，闲聊轮直接返回零查询。

### DeepSeek 家能填什么位（2026-09-28 核读：官方 API docs + deepseek-ai/DeepSeek-V3#806 + 搜索）

- **API**：deepseek-chat / deepseek-reasoner——纯文字、支持 function calling；**无 embedding 端点、无视觉端点**（官方确认无 embedding：[DeepSeek-V3#806](https://github.com/deepseek-ai/DeepSeek-V3/issues/806)）。
- **开源权重**：V3/R1 均为大 MoE，无小杯 embedding；DeepSeek-VL2 是小杯视觉开源权重，但**不在 Ollama 库**、需自行 transformers/vLLM 部署——不算「容易安装」。
- 结论：**本地小模型位（embedding / planner）DeepSeek 家没有现成物**；文字主力位（VLM 槽）DeepSeek API 是最省事的远端选择。

### 硅基流动（SiliconFlow）一站配齐核查（2026-09-28）

用户点名问「硅基流动是否提供所有我们需要的模型」——逐位核对（官方 API 文档逐字核读）：

| 模型位 | 硅基流动有没有 | 证据 |
|---|---|---|
| **embedding（必需）** | ✅ **bge-m3 / Pro/bge-m3**（8192 token 输入）+ Qwen3-Embedding-8B/4B/0.6B（32K 输入，维度可选 64–4096）+ 甚至 **Qwen3-VL-Embedding-8B**（文本+图片多模态向量） | [嵌入 API 文档](https://api-docs.siliconflow.cn/docs/api/embeddings-post)逐型号列明 [documented] |
| **VLM（必需）** | ✅ **试点采用：`deepseek-ai/DeepSeek-V3.2`**（2026-09-29 上位：文字 FC 干净 + **连续 user 消息宽容**——OpenViking 抽取对话的必要形状；纯文字，喂图不可用是已知损失）。**负知识 ×2：Qwen3-VL 全系不可选**（32B/8B/30B-A3B-Instruct 实测 tool_call 以文本漏进 `reasoning_content`、标准 `tool_calls` 不解析，30B 还拒绝 `enable_thinking` 参数）；**`zai-org/GLM-4.5V` 在 VLM 位也不可用**（2026-09-29 实测：视觉+FC 探针虽双过，但 OpenViking 抽取循环把预取工具结果渲染成**连续 user 消息**——`extraction_output_protocol/python_protocol.py` 的 `render_tool_result_messages` 返回 user 角色、`sanitize_openai_messages` 只删空 assistant 不合并——硅基流动 GLM 强制严格轮替，`[user,user]` → 400 code 20015「after user message, next must be assistant or tool message」，commit 的抽取任务必炸；探针配方：连发两条 user 看是否 200） | 模型清单 + FC 探针实测（2026-09-28）；抽取形状根因读 server 源码 + `[user,user]` 探针复现（2026-09-29，本机实测）[observed] |
| rerank（可选） | 有 rerank API（Cohere 兼容格式）；但 OpenViking 的 rerank provider 枚举（vikingdb/cohere/openai/litellm/jev）无硅基流动直连——**试点先不配 rerank**，别为可选增强加一层 | rerank API 在其 API 手册 [documented]；OpenViking rerank 枚举见配置指南 |
| query_planner（可选） | ✅ 可用 SF 小杯对话模型；或维持官方 Ollama 0.8B 微调件 | 同对话端点 |

- 对话端点 OpenAI 兼容、带 tools 参数；**具体模型是否支持 function calling 以其模型卡为准**——试点第一步用 `openviking-server doctor` 探针验证（呼应 PR #3088 的 FC 探测）。
- 一个 key 同时填两个必需位，OpenViking 配置形如：
  ```json
  {
    "embedding": { "dense": { "provider": "openai", "api_key": "sk-…", "api_base": "https://api.siliconflow.cn/v1", "model": "BAAI/bge-m3", "dimension": 1024 } },
    "vlm": { "provider": "openai", "api_key": "sk-…", "model": "<Qwen3-VL 系型号，以模型列表页为准>", "api_base": "https://api.siliconflow.cn/v1" }
  }
  ```
- 价格/免费档未核（models 页 SPA 抓不到、价格页未读）——注册前以官网价格页为准。

### 推荐组合

| 组合 | VLM 位 | embedding 位 | 本地算力要求 | 适用 |
|---|---|---|---|---|
| **A（推荐起步）** | DeepSeek API `deepseek-chat`（纯文字） | 本地 Ollama `bge-m3` | ≈零（1.2GB） | 试点只喂文字材料 |
| **B（要喂图）** | GLM `glm-4.6v` 或 Qwen-VL 系聚合 | 同 A | ≈零 | 摄取含截图/扫描件 |
| **C（全本地断网）** | Ollama `qwen2.5vl` 7b（按上面三条坑调） | 同 A | 7B 级视觉模型 | 完全离线；质量待验=试点第一问 |
| **D（一个 key 全包）✅ 已实测选型** | 硅基流动 `zai-org/GLM-4.5V`（视觉+FC 双过） | 硅基流动 `BAAI/bge-m3`（1024 维实测） | ≈零（全云端） | **用户拍板采用（2026-09-28）**；key/URL/模型名住 `.env.local` |

模型不进 git（1.2GB 级）；断网前囤货用上面的 `ollama pull` / `pip download` 命令即可。

## 密钥纪律（.env 法，用户拍板 2026-09-28）

- key 的家 = 仓根 `.env.local`（day-0 已 gitignore，`git check-ignore` 验证过）；**永不进 git、永不进会话日志**。
- 流向：试点脚本读 `.env.local` → 写 `~/.openviking/ov.conf`（仓库之外，权限 0600）→ server；ov.conf 在用户家目录，天然不入库。
- key 由用户亲手粘进 `.env.local`；agent 只做传递，不回显、不要求把 key 贴进对话（会话日志会留底）。

## 试点运维负知识（2026-09-29 两轮验收实测，台账：[一轮](../../../notes/implemented/2026-09-29-openviking-adoption-rfc.md) / [二轮](../../../notes/implemented/2026-09-29-openviking-adoption-rfc.md)）

- **抽取时长波动大**：同语料三次 713s / 1110s / 603s(失败)——等待上限按 ≥25 分钟或纯轮询 task status，别按"6-8 分钟"定长。
- **失败不回滚**：VLM 请求超时 → task `failed` 但部分写入已落库。健康检查看 `/api/v1/tasks` 状态而非只看 stats。
- **残留清理配方**：`DELETE /api/v1/fs?uri=<url-encoded viking://…>`（实测可用；删后 stats/find 即恢复）。
- **事件级重复会累积**：去重按标题记忆，**改述即新文件**（实体去重正常）。语料回放/失败重试场景需配上述清理配方。
- **find 劣化两形态**：抽取并发时 500/超时，或 embedding 队列忙时 **200 空集**——find 空集不能当"无记忆"证据，drained 后复测。

## .gitignore 的关系

仓库级 `*.tgz`（打包残留语义）经 `!vendor/thirdparty/openviking/*.tgz` 例外放行；
钉存物入 git 是刻意决定（完整性哈希 + 离线可装是它的存在理由）。
