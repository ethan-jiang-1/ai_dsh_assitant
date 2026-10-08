# repo 可驾驭性：入口、验证与职责的分阶段整理

日期：2026-10-05 · 状态：**implemented**（P0–P5 已交付。合同在 docs/architecture.md 与 docs/testing.md。P5 由新上下文 7 分钟走完五路，四个文档缺口当日修复）
已归档：2026-10-08（决定已经在合同或代码里；下次改决定不用打开本篇。冻结，不再跟踪。）

> 承接自[推敲卡](../../_backlog/_done/_closed_plans/261005-repo-navigability.md)（2026-10-05 毕业为该做，用户确认分段实施）。完整推敲史、八条承重事实、五项硬要求映射、运行态心智模型、状态分层与 run bundle 候选、迁移归属表与回退纪律都在卡上（冻结可查）；本提案只携带实施所需的方案骨架与验收。两份调研底稿随卡归档：[入口与工具库存](../../_backlog/_done/_reference/tech-exploration/261005-repo-entry-tooling-audit.md)、[测试资产审计](../../_backlog/_done/_reference/tech-exploration/261005-repo-test-asset-audit.md)。

## 问题（可观察行为）

用户作为项目驾驭者的可观察障碍：目录分工、运行/调试/交互入口与逻辑链看不清，测试资产组织不可辨认，目前主要靠端到端试用推敲功能；agent 每轮普查仓库才能定位改动面。用户提出五项硬要求作为验收主轴：①运行态、测试、调试、用户交互分开；②入口链和运行逻辑可读；③README/AGENTS 能帮助新 Agent；④测试资产组织清楚；⑤agent loop、harness、技能、状态、run bundle 显性化。具体误导（旧 preset 链引用、裸 headless 进 preset 宣称）已随 `f25d686` 修正；本提案拥有剩余整理，目标不是目录美观，而是**拿一个功能就能找到入口、讲清主链、运行局部验证、定位失败**。

## 提案

| 阶段 | 内容 | 状态 |
|---|---|---|
| P0 真实入口与地图 | `docs/architecture.md` 三链导航（启动链/模型请求链/浏览器动作链，逐节点真实源码链接）；五条功能路由（记忆保存/检索、知识草稿/批准/检索、提示词摘要、桌面刷新、插件装载——各给规则与状态、实现入口、最低验证命令、失败看什么）；空 `agent.cordis.yml` 先搜消费者再处置 | **已交付**：空壳 preset 文件删除；三链与五条路由在 architecture.md |
| P1 验证可信度 | 组合读真 shipped 配置、缺 build 显式红、资产守卫递归、runner 身份钉住 | **已交付**：组合断言读 shipped 行；缺构建物报错而不是 skip |
| P2 研发工具归位 | scripts 与 dev 的工具按目的归位：dev 下分 env、profiles、probes（session/web）、fixtures、eval、reports、deploy、experiments 职责子目录，scripts 下分 checks、generate、release、maintenance 四类（精确迁移归属表见卡）；**先试点一片再扩展**；运行 home 原地保留 | **已交付**：工具按职责分家，根命令名不变 |
| P3 测试资产分层 | 按底稿逐 spec 迁入包测试树的 domain、host、agent、composition、client、tooling 职责子目录、support 单独；迁前后 Vitest 发现集合一一对应 | **已交付**：分层合同在 docs/testing.md |

**P3 分层套路（设计要点，2026-10-05 与用户对齐；落地时正文进 `docs/testing.md`）**：分层轴 = **被测 interface × 真实依赖半径**，不用 unit/integration/e2e 标签（冻结卡已判为伪完成——同一标签下纯核与真 IO 的失败含义不同，标签回答不了"要什么前置"）。**双层寻址**：后缀 = 车道（`*.spec.{ts,mjs}` 等保持，不发明新后缀），目录 = 被测 interface 家。**每层声明能证明/不能证明**（证据合同，testing.md 拥有）：纯核（domain 规则，无 IO）→ host 服务合同（真 cordis 构造 + 临时 home）→ agent 面合同（工具/段落/provider）→ composition（真 Loader 读真 shipped YAML + built lib）→ client 合同（classic-script 装置，无浏览器）→ 渲染期望（snapshots 两场景，真浏览器）→ 行为评测（eval，真模型判日志）；E2E 只做跨层验收，失败报告先分层归因再上浮。**四条不变式**：默认 `pnpm test` keyless 全绿且发现集合迁移前后一一对应；mock 白名单 = LLM/网络/时钟（边界下游全真）；live/浏览器/模型走各自显式入口不混默认车道；一个 spec 归最主要 interface、跨层依赖文件头注明。
| P4 产品源码职责 | 包 src 按 domain、host、agent、client、dev 切分职责子树，一次动一个；exports/组合行/工具语义不变 | **已交付**：根 index 是薄导出；exports 键不变 |
| P5 驾驭验收 | 新上下文只从根文档完成五条功能定位/验证/失败定位 | **已交付**：五路全 PASS（7 分钟、95 断言实跑、无死链），四个文档缺口当日修复 |

**稳定的外部 interface**（全程不变）：包名、工具名/动词、preset/组合行 id、`ctx.assistantMemory`、既有 package exports 子路径、根 pnpm 命令名、两个 profile 语义、默认 home/dataDir、存储格式。运行 home（`dev/harness-home`、`trial-home`）原地保留——源码/工具归位与数据迁移是两件事。

**护栏**：不改 vendor、不迁运行数据、不搭车改产品能力（审批/学习/OV 行为如实标注现状，回各自 owner 独立判断）；准备中发现须改行为的拆独立方案，不藏在路径修复里；每片独立提交锚点，失败回退仅本片、不覆盖并行变更；tsc 不保证删除旧产物，路径变更确保干净构建消费新树。

**执行模式（用户 2026-10-05 拍板分段）**：本提案整体获确认，实施按段推进、段间回用户复核——第一段 = P0 残尾 + P2（先试点后扩展），验收后再立下一段；P3 → P4 → P5 的顺序由证据依赖决定（P1 先于 P3 已满足，P2/P3 先于 P4）。goal 管当前段，todo 管片内实施，本提案管方案与验收边界。

相邻 owner：资产退役/保留判断归 [SDLC 清理卡](../../_backlog/_done/_closed_plans/261005-sdlc-turnaround-cleanup.md)，产品转向总路线归[自洽卡](../../_backlog/_done/_closed_plans/261005-turnaround-coherence.md)，测试哲学归测试策略决定——本提案只拥有导航与组织，不重写它们，也不按年龄删除能力。

## 输掉的方案

（完整取舍论证见卡「候选与取舍」节）

1. 只加 README/AGENTS——P0 可先行，但 scripts/dev/tests 混杂仍靠人记，不作为整体完成。
2. 全仓移动后补文档/测试——路径失效难定位、假绿掩盖遗漏；输给验证前置（P1 先行）与分职责提交。
3. 用 unit/integration/e2e 后缀分层——回答不了被测 interface 与 IO/构建依赖；加职责目录而非发明新后缀。
4. 运行/界面/测试各拆 npm 包——发布边界未变，多包装配税；单包内切职责。
5. 加 coverage/CI/通用场景框架——指标不等于可理解；先修实际遗漏与假绿。
6. 搬所有 dev home 让树纯净——改凭据/日志/试用状态定位，收益不值数据迁移风险。
7. 顺手修审批/学习/OV 行为——不同验收、扩散半径；如实标注现状回对应 owner。
8. 空壳 preset 文件留着并加「已失效」说明——迁移决定已是删除，墓志铭仍是误导。
9. 把 architecture 的链路插进已有节号，或把五条路由拆进 testing.md——活指针会漂，路由是运行知识，testing 链接过去。
10. 组合断言用手写行清单、缺构建物时 skip、只钉主 runner——读不到 shipped 配置，假绿。
11. 为凑目录在 agent 层发明空住户，或让门禁从子路径猜 src 布局——猜不中要响亮失败；exports 键是合同，不随目录改。
12. 驾驭验收由写文档的人自己答——测不出文档能不能被新上下文读懂。

## 验收

**终验（P5）**：新读者只从根入口出发，对五条功能路径各自能答五问——①从哪个命令/配置起、实际用哪个构建物与 preset；②动作从 UI/聊天进来经哪些模块到哪种状态/文件、哪里可观察；③改这条规则先看哪个 interface、哪些模块不必读；④不烧模型不开浏览器能验什么（准确命令）、必须 live 的是哪一步；⑤如何区分配置/构建/领域规则/模型选择/界面读回的失败、有什么外部证据。候选量化：无口头提示每条定位 ≤5 分钟（可用性目标，非新门禁）。结构标准：默认测试发现无减少、全部现有公开命令/exports 兼容、两浏览器场景明确执行、源码与运行数据有区分、根 AGENTS 不变大手册。这些不替代「经营答案像样」的真人判断。

**分段验收**（各段出口细节见卡「候选阶段」表，未验项目不列为绿）：

- 第一段（P0 残尾 + P2）：五条功能从根入口可达、循链无需普查（verify、diff-check）；工具消费者与 repoRoot/patch/fixture 路径全闭合、根命令名不变（JS check/shell 语法 + tooling spec + verify）；隔离 home prepare/setup、dump-config、keyless preset probe 验启动链；浏览器探针迁移须两场景实跑。
- 后续段逐段立 goal 时按卡上出口核对：P3 迁移前后发现集合一一对应、无误收 support、composition 先 build；P4 出口/组合行/工具语义一致 + release-smoke + 从新 tarball 安装逐个解析公开 exports + 至少一次 keyless replay 经真实 preset 装载；P5 由新上下文无指引完成。

本决定的家是这一篇。各段的执行记录不另开 note。
