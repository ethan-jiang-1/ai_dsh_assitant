# 推敲：自成长的 CEO 助理基座——外部引入 vs 自持（调研卡）

> 立卡：2026-09-28 ｜ 状态：推敲中｜毕业门判断 = 待定（证据已收卷，三选一待用户拍板）｜下一步 = 用户拍板：A 试点 OpenViking 官方 DSH 插件（隔离 dev profile）/ B 只借机制不引入 / C 更大范围引入外部件（须先过准入表）

## 背景 / 触发

用户原话（2026-09-28）：原来认为有 supermemory 做记忆、OpenViking 做上下文/推敲，「推敲来推敲去最后啥都自己做，看到之后有点无感」；框架（DSH）值得留。要求：① 看 DSH 社区里有什么值得借鉴；② 看外面有没有「企业+CEO 助理」的可自我成长基座，回头想放进 DSH 作为插件。用户点名先 research。

**与存量的边界**：grand plan 已拍板领域=CEO 数字分身、定位=底座+专家包——本卡是该计划 §四生态线在「自成长」透镜下的刷新，不是新方向。R1（supermemory 已深评）、R2（自成长四轴词汇+缺口清单）、R4（研发纪律借鉴）不重做。本次增量与全部证据：[自成长基座调研台账](../../notes/archived/research/2026-09-28-self-growth-base-survey.md)（四路研究 + 承重主张亲验记录）。

## 已知与未决（核心事实，详见台账）

- **OpenViking（用户口中的 "OpenViki"）= 本轮唯一改变判断面的发现**：字节/火山「自演化上下文数据库」，`viking://` 文件系统统一 Resources/Memories/Skills——与本仓三房间**同构**；存储=人可读 Markdown+L0/L1/L2 摘要；skills 一等类型+Agent Evolution+compile；AGPL-3.0、38.8k★、周更；**官方 DSH 插件 0.5.8（Apache-2.0）peer 范围显式含 `0.1.7-rc.2`（已亲验）**。R1 当年仅标「部署形态未知」——候选是在 R1 之后才长成的。
- **supermemory**：本地形态更成熟（MIT、全 API、零遥测）但存储=pgvector 黑箱、本地无 MCP、server 仍 0.0.x——R1「路线冲突」判定不变。
- **本地依赖面（用户核心关切，2026-09-28 官方文档核读：PyPI README + 配置指南 llms.txt 全文）**：服务端只需**两个模型件**——① VLM（=服务端主力模型：记忆抽取/L0/L1 摘要/去重决策；provider `openai` 可直接指本地 Ollama 的 OpenAI 兼容端点，官方另有 litellm `ollama/` 路由示例；不配则 L0/L1 降级为非语义生成、多模态受限）；② embedding dense（provider `ollama` 或 `local` GGUF；Ollama/local 仅 dense，无 sparse/hybrid——混合检索才需要火山，基本盘不需要）。存储 vectordb/agfs 默认 `local`（内置 C++ 引擎，**无外部数据库**）；localhost 认证 `dev` 模式免密；operation telemetry 是请求级 opt-in 调试摘要、**非外发上报**——**火山/云全程可不出现**。可选件：query_planner（官方微调 0.8B 小模型 `ov_intent_analysis_sft:v7_q8`，Ollama 可拉，省 token 的检索规划）、rerank（可 litellm 本地路由或不配）。**官方跑分全用云端 Doubao——本地小模型质量未验证**，是试点第一问。插件包已钉存 `vendor/thirdparty/openviking/`（SHA512 与 registry 一致，离线可装；服务器侧离线拉取命令见其 README）。
- **「成熟可自托管可自成长的企业助理基座」不存在**（外部全景底线）：最接近=腾讯 Agent Memory（我们形态的开源镜像）、OpenClaw 2.0（唯一全回路开源基座）、MemOS 2.0（唯一替 DSH 写过记忆插件的记忆 OS）——三家都只到「借」的档位。
- **DSH 生态刷新**：awesome 3552→4377（+23%/16 天）；自成长赛道有真实量的仅三家；红海确认四条（通用记忆/技能货架/run→skill/市场目录）；兼容 `0.1.7-rc.2` 显式声明者已亲验（skills-manager、memento、run2skill alpha；evolution-core 明确不兼容）。
- **机制词汇 v2**：成长回路七段中五段现有 seam 可承载；三个「要新 seam」指向同一缺口——**评测基线进插件运行时**（写前门/影子晋升/全库重测共用）；arXiv:2609.24130 的 55% 回归数字是「为什么必须门」的最硬依据。
- **跟人学真空档**：外部全在「记住事实」或「静态人格复刻」，无人把「这个人怎么做事/怎么拆题」沉淀成受治理的可执行技能资产——本仓 draft→stable + propose→land 落在空位上。

## 待答问题 / 待跑实验

1. OpenViking 插件在**隔离 dev profile**（不带本仓 assistant preset）试装：`dsh plugin add` + `--dump-config` + 真实 server 记忆往返（官方 e2e 门 = `OPENVIKING_E2E=1`）；组合干净度与注入面行为。
2. 最小本地配置（一个视觉模型填 VLM 位 + 一个小 embedding 模型，均走本地 Ollama；vectordb/auth 全 local）下 OpenViking 的抽取/检索质量——官方基准全用云端 Doubao，本地小模型质量未核证，**试点第一问**。模型位选型菜单与三条社区踩坑（ollama embedding 404→litellm 形式、num_ctx 截断、memory_policy 收窄）已备于 `vendor/thirdparty/openviking/README.md`。
3. AGPL 合规面复核：本仓只做「独立进程 + HTTP/MCP 消费」是否成立（初判成立；fork server 才触发——涉及许可边界，属真人输入位）。
4. 腾讯 Agent Memory 的 LICENSE 文件核读（README 与 GitHub API 不一致）；其 DSH 集成文档深度。
5. **发布形状**（用户问「回头发布的时候包括他吗」）：进我们 bundle 作运行时依赖 / 推荐组合行（发行组合里钉版本）/ 仅文档指引 `dsh plugin add`——三种形状的取舍等试点过准入表后再定（钉存物已备于 `vendor/thirdparty/openviking/`，试点与将来发布都有可复现的离线起点）。

## 喂给谁

- grand plan §4 四分法（组合/适配/借鉴/自建）的落地选择——本卡产出即其输入。
- 若拍板 A：毕业为 proposed 卡（准入表 + 试点验收标准，准入表字段可抄 dsh-memento 的 dshWorkshop manifest 设计）。
- 「评测基线进运行时」缺口若触发：单独立卡（新机制，与 [260928-domain-eval-v0](260928-domain-eval-v0.md) 的评测集是两回事）。
- 与既有卡不冲突：[260928-full-auto-distill](260928-full-auto-distill.md)（自动化蒸馏触发面）、[260928-semantic-retrieval](260928-semantic-retrieval.md)（embedding 缝）、[260928-cross-harness-shared-memory](260928-cross-harness-shared-memory.md)（跨 harness 共库）各管各的触发。

## 候选与取舍

- **A. 试点 OpenViking 官方插件（推荐）**：唯一「组织级维护 + 人可读存储 + 官方 DSH 集成 + 兼容当前 pin」四条全中的候选；隔离 profile 试点成本≈半天，不弃自研（治理层不动，先并存观察）。代价：AGPL 心智负担、版本钉扎义务、双记忆重叠面要靠隔离/开关控制。发布形状（是否进发布物）= 准入后的第二拍，不在试点范围。
- **B. 只借机制不引入**：L0/L1/L2 分层摘要、memory_diff 审计、Skill Workshop 闭环、腾讯治理面板等进借用清单——零依赖，但「什么都自己做」的现状原样保留，且「无感」的根因（自建工作量巨大、外部成熟度红利拿不到）不变。
- **C. 更大范围引入**（memento/skills-manager 等）：都需过准入表；memento=让渡记忆主权、skills-manager=第二技能面——当前无真实痛点驱动，违反「做在触发之前」纪律，不推荐。

## 毕业门

- **该不该**：用户三选一拍板（本卡不代判——产品方向）。
- **何时**：A 的试点随时可做（隔离 profile，零风险）；B/C 无时效。
- **次序**：先试点（实验 1-2）→ 拿到质量与合规证据 → 再决定深度接入形态；不跳到平台化。
- **放弃条件**：试点质量不过线（离线模式下明显劣于云端基准）/ AGPL 不可接受 / 组合冲突无法隔离 → 结论并入 grand plan「输掉的方案」节，本卡关闭迁 `_done/_closed_plans/`。
