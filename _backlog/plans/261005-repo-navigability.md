# 推敲：让项目可理解、可局部验证、可驾驭

> 立卡：2026-10-05 ｜ 状态：推敲中｜毕业门判断 = 倾向该做，候选方案待用户审阅｜下一步 = 核对证据与阶段验收，用户确认后按 notes 生命周期毕业有界提案；本卡不是实施授权

## 背景与范围

用户的直接反馈：作为项目的驾驭者，不清楚目录分工、运行/调试/交互入口和逻辑链，测试资产的组织也看不清；目前主要靠端到端试用推敲功能。本轮要求：继续挖掘，形成 PLAN 放到本目录，再通过 ongoing goal 推进。

**目标不是目录漂亮，而是拿一个功能就能找到入口、讲清主链、运行局部验证、定位失败。** 人不必先学完 DSH 组合术语；agent 不必每轮普查仓库。端到端保留为最终体验证据，不作为确定性规则的唯一验证方法。

本轮授权是调查与计划落盘。当前 goal 只推进到计划交付，不迁目录、不修产品行为、不清运行数据。后续实施 goal 的候选文本见末节，得到范围确认后再启用。

| 相邻 owner | 分工 |
|---|---|
| [SDLC 清理卡](261005-sdlc-turnaround-cleanup.md) | 拥有资产保留/退役/删除与防护损失判断；本卡只组织有消费者的资产，不按年龄删除能力 |
| [总体自洽卡](261005-turnaround-coherence.md) | 拥有产品转向总体依赖；本卡是 repo 卫生中的可驾驭性切片，不另建产品总路线 |
| [测试策略决定](../../notes/implemented/2026-10-04-test-strategy-adoption.md) | 保留真实依赖、负例证据、分层验证与快照归属；本卡改导航和执行组织，不重写测试哲学 |
| [文档职责](../../docs/AGENTS.md) | 架构/开发/测试各自拥有当前事实；根入口提供路由，不复制合同 |

## 已知、证据与未决

基线：本仓 HEAD `36f1f00d834ba931d10f0d728b7cabeca6beee9e`，2026-10-05；DSH pin 以 [簿记](../../vendor/UPSTREAM.md)为准。源码可指认的机制不等于当前 GUI 已实际运行该构建。

调研底稿：[入口与工具库存](../reference/tech-exploration/261005-repo-entry-tooling-audit.md)、[测试资产审计](../reference/tech-exploration/261005-repo-test-asset-audit.md)。以下承重事实由主代理回读对应源码，不以代理摘要作最终证据。

1. **目录用途混杂**：[根命令表](../../package.json)将启动、部署装配、生成、门禁、浏览器探针和发布都路由到 scripts；dev 同时承载环境、评测、报告、试验、fixture 与忽略的运行 home。问题是职责不显露，不是功能不存在。
2. **真实 preset 入口与导航冲突**：[bundle](../../packages/dsh-smart-assistant/cordis.patch.yml#L129)内嵌 `preset-assistant.config.plugins`；[旧 preset 文件](../../packages/dsh-smart-assistant/presets/assistant/agent.cordis.yml)为空。[包入口说明](../../packages/dsh-smart-assistant/AGENTS.md#L38)和 [setup 提示](../../dev/setup.sh#L103)仍引用旧链/宣称裸 headless 进入 preset，不能继续作为操作指导。
3. **主链可以分层验证**：模型工具调用 [host 实现](../../packages/dsh-smart-assistant/src/index.ts)，后者组织领域规则/存储；[知识写入 spec](../../packages/dsh-smart-assistant/tests/knowledge-write.spec.ts)直接验证草稿、批准、检索、摘要，无模型。[摘要贡献](../../packages/dsh-smart-assistant/src/memory-digest/index.ts)与 [身份/手册贡献](../../packages/dsh-smart-assistant/src/home-preamble/index.ts)独立挂载，不是浏览器实现的一部分。
4. **交互不是全都直调**：[client 发送路径](../../packages/dsh-smart-assistant/src/client/index.ts#L648)经 `remote.session.prompt` 进模型回合，读回工作区桌面文件；[审批按钮](../../packages/dsh-smart-assistant/src/client/index.ts#L817)有直调与提示路径，[当前挂载处理](../../packages/dsh-smart-assistant/src/client/index.ts#L2199)记录 codec 拒绝并回退。导航须区分可用链、候选链；本卡不修审批契约。
5. **组合证据已限定为可核验范围**：[组合 spec](../../packages/dsh-smart-assistant/tests/preset-composition.spec.ts#L61)读取包根 shipped YAML 的 `preset-assistant` 行，筛选本包 agent rows，经真 Loader、built `lib/`、standing mount 和代理消费；缺 `lib/index.js` 直接失败，入口 `pnpm test:composition` 先 build。它证明本包组合 seam，不宣称完整产品 boot。
6. **测试迁子目录会漏门禁**：[testAssetNamingProblems](../../scripts/verify-checks.mjs#L805)只查测试根文件；嵌套 spec 仍可能被 Vitest 发现，但代码资产检查会绕过。迁移前须让发现、形态守卫与类型面共同覆盖新树。
7. **浏览器期望不是自动全场景**：[比对器](../../scripts/webui-expected.mjs#L43)默认一个场景；另一个需显式 `--scenario` 和 `--wait-text`。声明与执行参数需要清楚入口，不能写“跑过 web-expected = 所有场景绿”。
8. **三个目录根不能混**：[启动器](../../scripts/dsh.mjs#L114)强制子进程 cwd 为仓根；换调用 shell 的目录不等于隔离会话 workspace。DSH_HOME 管运行实例，dataDir 管助手 working folder，cwd 管业务交付及项目指令装载。此处先澄清，不借整理改变默认 cwd。

实施期实跑：`pnpm --filter dsh-smart-assistant exec vitest run tests/export-shape.spec.mjs tests/preset-composition.spec.ts`，2 文件、19 断言通过；`export-shape` 覆盖四个实际 dev runner patch（expert、recall、main、replay），组合 spec 覆盖 shipped YAML 筛选、本包工具/段落/companion seam。另有两项真实 prove-it-red：旧 runner id 使 2 个 patch 断言失败；保留删除 memory 行的临时配置使 2 个组合断言失败。完整收尾命令见 P1 note，未执行项目不列为绿证据。

收尾另跑 `pnpm typecheck && pnpm test`：exit 0，43 文件/366 断言全部通过、无 skipped；typecheck 内含 `tsc -b`，因此本次组合消费的是该步骤生成/更新的产物。此结果说明当前基线测试可执行，不补足上述真实发行 YAML、全部安装出口或浏览器/live 的证据缺口。

实施前再核对：迁移时的完整消费者/测试发现基线；旧 lib 清理重建与发布边界；新路径对 shell、patch、生成器的影响。不把本日库存永久当真。产品重构、审批修复、外部服务隔离不作为本计划暗含任务。**待答问题/待跑实验**：单片试点是否降低五条功能的定位时间、递归守卫能否检出嵌套负例、发行配置缺行/缺构建物是否真红、安装出口是否独立可解析；均属实施片的验证，不在本轮伪报。**喂给谁**：本卡毕业后的可驾驭性有界提案，并向相邻 SDLC/总体自洽卡提供依赖结论，不拥有它们的执行顺序。

## 推荐方案

### 目标职责树（候选，不表示已经存在）

```text
packages/dsh-smart-assistant/
  cordis.patch.yml                 发行组合唯一入口
  src/
    index.ts                      稳定包入口，薄导出，不是第二份实现
    domain/{home,memory,research,skills,knowledge}/
                                  领域规则及文件存储，不统称纯函数
    host/                         跨会话实现、host 审批入口与品牌注入
    agent/                        四工具、提示词贡献、技能 provider、治理适配
    client/                       浏览器交互，保留 classic-script 约束
    dev/preset-runner/            验证驱动，明确非产品能力；保留公开出口
  presets/assistant/skills/        模型用技能
  seeds/                          仓库装配种子，发布归属保持现状
  tests/
    domain/                       规则与存储基础测试
    host/                         跨会话读写/生命周期合同
    agent/                        模型工具/提示词/provider 合同
    composition/                  配置装载、注册与范围合同
    client/                       浏览器注册和交互状态合同
    tooling/                      仓库工具、生成器和门禁测试
    support/                      共享 harness，明确排除测试发现
dev/
  env/                            准备、setup、隔离启动、env 兜底
  profiles/                       Web/headless 组合配置
  probes/{session,web}/            请求探针、渲染采集和比对驱动
  fixtures/llm-replay/             已有 keyless 回复脚本
  eval/                           行为/领域评测，不与单元测试合并
  reports/                        usage/摩擦报告
  deploy/                         知识导入与专家装配 CLI，仓库用
  experiments/openviking/         既有外部服务试验工具，只归位不执行
  harness-home/ · trial-home/      既有忽略的运行数据，原地保留
scripts/{checks,generate,release,maintenance}/
                                  机械工具按目的分类，不再是杂物桶
snapshots/                        既有渲染期望与未来会话回放场景
docs/ · notes/ · _backlog/ · .agents/ · vendor/ · _dist/
                                  保留既有职责与生命周期
```

共享代码随实际消费者归属，不为统一建“大 common”。客户端保持单入口构建，不搭车拆 React 结构。domain 的 Room/文件读写属于实现，纯核和有 IO 的测试按依赖区分，不按目录贴标签。

主要迁移归属（现状入口链接底稿，不另建永久库存）：

| 现有集合 | 候选落点与迁移重点 |
|---|---|
| src/home、memory、research、skills、knowledge | src/domain 对应子树；home 含 IO/摘要/布局，整体保留模块合同，不拆成名义纯核 |
| src/index、knowledge-approve-remote、web-branding | src/host；根 index 薄导出保持 default/命名 class 同一身份与 Context 类型扩展 |
| src/tool-*、tool-support、home-preamble、memory-digest、learn、ov-shield | src/agent；shared presenter 随四工具，public exports 仍是既有子路径 |
| src/client、preset-runner | client 原地；runner 归 src/dev，仍从既有 ./preset-runner 导出 |
| scripts/dsh + dev/env、prepare、setup | dev/env；保留仓根 cwd 与原 home，重核路径计算/source 和 root 启动别名 |
| scripts/webui-*、scripts/lib/cdp-driver | dev/probes/web；纯比较核与 capture 驱动邻近，更新 tooling spec 与场景消费者 |
| dev/*patch、llm-replay fixtures | 基础 profile 去 dev/profiles，session 探针 patch 去 dev/probes/session，回复夹具去 dev/fixtures；路径表达式同片修正 |
| dev/*report、eval、ov 工具 + scripts/import-knowledge、expert-setup | reports/eval/experiments/deploy 对应职责；种子源、读状态位置和变更边界保持 |
| scripts/verify*、gen-*、release-smoke/export-dist、sync*/repair-vendor | checks/generate/release/maintenance；新目录深度影响 repoRoot，所有门禁语料和生成路径同片维护 |

**稳定的外部 interface**：包名、工具名/动词、preset/组合行 id、`ctx.assistantMemory`、既有 package exports 子路径、根 pnpm 命令名、两个 profile 语义、默认 home/dataDir、存储格式保持。内部路径可变，exports 指向新 lib 路径；根入口只保留必要导出，不堆一套旧 src 兼容树。

`preset-runner` 已随包导出且被 dev patch 使用，本轮仅归到 src/dev，仍构建与分发。将它移出发行物需独立 dev bundle/依赖方案，不能静默删出口。部署 CLI 也不借迁移变成发行命令，种子是否随包发另属发布决定。

运行 home 暂不迁移：**源码/工具归位与数据迁移是两件事**。默认位置、凭据、日志及用户试用状态不因目录整洁被更改；地图明确它们是运行残留，版本库只收源码和耐久验证资产。

### 导航分工（改现有文档，不开大册）

| 家 | 让读者迅速回答 | 不重复 |
|---|---|---|
| [根 README](../../README.md) 开发入口 | 本体/研发工具/验证资产/数据四块在哪；从运行、推敲功能、定位故障三种意图跳转 | 全命令表、导出清单、历史 |
| [根 AGENTS](../../AGENTS.md) | 开工路由、改动面→owner→最小证据指针、常设安全规则 | 进度/日期、长操作手册 |
| [architecture](../../docs/architecture.md) | 启动链、模型请求链、浏览器动作链；实际入口、日志与产物；UI→模型回合明确 | 全量工具/技能清单，仍指生成 catalog |
| [dev 手册](../../docs/dev.md) | 从零运行、三种实例区别、改了不生效的分层排查、home/cwd/dataDir 区别 | 测试政策与资产列表 |
| [testing](../../docs/testing.md) | 按功能定位被测 interface、测试层、命令、能/不能证明什么 | 环境准备、完整用例库存 |
| 子树 README/AGENTS | 有真实特殊约束才留；同 diff 维护局部契约 | 每目录一份通用规则 |

功能路由先覆盖“记忆保存/检索”“知识草稿/批准/检索”“提示词摘要”“桌面刷新”“插件装载”五条现有路径。每条给规则与状态、实现入口、最低验证命令、失败看什么、哪一步才用模型/浏览器。链接 owner，不把规则抄五遍。模型技能与开发技能各走自己的目录。

### 测试组织和运行约定

每个现有 spec 归属最主要的 interface，跨层合同注明依赖；[测试底稿](../reference/tech-exploration/261005-repo-test-asset-audit.md)的全量清单是迁移输入，不是日后第二清单。

1. 保留 `.spec.{ts,mjs}` 和现有 Vitest，按目录选层、按文件/用例选功能；不为每功能造 runner。不把真实 IO 的 spec 称纯单元。
2. 默认 `pnpm test` 继续收全部现有 keyless spec，不自动隐藏 build；整体可信入口明确为 `pnpm build && pnpm test`，缺构建物失败信息给出前置命令。局部源码 spec 保留快速入口，无需每次 build。显式层入口复用同一配置，候选为 `test:domain/host/agent/composition/client/tooling`，只为实际非空且有稳定职责的层设命令。参数透传与发现列表须实跑，不只写命令。
3. `test:composition` 自身先 build 再运行；全套验收顺序明确为 build → typecheck → test → verify，不依赖 typecheck 的发射副作用。直接调用组合 spec 缺 lib 显式失败；读真实 bundle/preset 定义，按明确范围装载自有行，不手抄 OWN_ROWS。仍可限定依赖半径，但输出排除项，不称完整产品 boot。读取带 `!!js` 的配置复用 DSH Loader/overlay 机制，不用不兼容的普通 YAML 解析冒充真装配。
4. 渲染场景保留原地；给两个场景完整命令和 readiness/隔离前置，明确默认场景。统一场景 runner 有实际误跑再评估，不预建框架。
5. eval、回放、临时日志分别注明是否用 key/网络、目标 home、是否写真状态。live 工具指向一次性 home，不去日用或共享试用数据；环境脚本/OV 不因归位自动执行。

## 候选阶段

范围获确认后的执行状态由 ongoing goal + todo 拥有；本卡只记录方案与验收，不维护另一份打勾进度。每阶段闭合一片，证据达标后立即形成只含本片路径的提交锚点。

| 阶段 | 候选改动 | 必须达到的出口 / 最小证据 |
|---|---|---|
| P0 真实入口与地图 | 修旧 preset/裸 headless 误导；README/architecture/dev/testing 提供三链导航；空文件先搜消费者，确认无行为用途才删 | 五条功能从根入口可达；循链无需普查；verify、diff-check；源码输出/注释契约修正同片，不假报运行行为 |
| P1 验证可信度 | 去手写组合清单，读真配置并明示范围；组合缺 build 不跳绿；资产守卫查嵌套目录；探针行身份守卫涵盖全部实际 runner patch | 真配置缺行、缺 lib、嵌套非法文件、探针 runner name/id 漂移的负例分别红，恢复后绿；build 后组合/守卫定向 spec + verify；修“旧 lib 自然会红”过强 claim |
| P2 研发工具归位 | 先迁 scripts/dev 工具，不迁源码和 spec；pnpm 命令保持；部署/报告/实验各归位 | 全工具消费者与 repoRoot/patch/fixture 路径闭合；JS check/shell 语法 + tooling spec + verify；隔离 home prepare/setup、dump-config、keyless preset probe 验启动链；浏览器探针迁移须两场景实跑 |
| P3 测试资产分层 | 按底稿逐 spec 迁目录，support 单独；目录与运行层对应；更新类型面/导入/夹具/指针 | 迁前后 Vitest 发现集合一一对应，默认收全；各层命令真可运行，无误收 support；typecheck + 全 keyless test + verify；composition 先 build，skipped 须解释而非报绿 |
| P4 产品源码职责 | 先 host 实现与稳定入口，再 agent 与 domain；client 路径/约束保持；dev driver 归位；一次动一个职责子树 | 出口/组合行/工具语义一致；gen-catalog及夹具、build、typecheck、全 test、verify、release-smoke；影响 browser 装载加 preflight + 两场景；模型可见行为改动加 live-probe |
| P5 驾驭验收 | 新上下文只从根文档做五条功能定位/验证/失败定位；复核主链与 owner | 保存查找路径、命令、断言对象、耗时、失败线索；无人指路回答下述五问；阶段末发现/构建/门禁无遗漏，真实证据记 implemented |

P1 先于 P3，避免移动测试后逃门；P2/P3 先于 P4，先有可靠工具与验证再搬实现。P0 可单独交付，不以“大整理未完”拖住入口修正。P2/P3 各先闭合一个工具/功能试点，验证导航、局部执行与发现集合后再扩展；不为凑目标树创建空层或强拆跨层合同。准备时若发现须改行为，拆独立方案，不藏在路径修复里。root 快捷命令名不变；直接 shell 路径变更同 diff 更新 owner 文档与所有消费者，旧路径不长期留双实现。

P4 的发布出口证据须补到产物：从本轮新打出的 tarball 安装的包逐个解析所有公开 JS exports，检查对应 types 目标也在包内；不能用 workspace alias 冒充安装包解析。对改变的运行入口，至少一次 keyless replay 经真实 preset 装载/组装并查日志。现有 release-smoke 无 key 会跳 live 回合，dump-config 只证明配置形状，不能作为上述出口。源码导出守卫与 generator 要显式适配新 source 路径，不能继续从公开子路径猜旧 src 布局。

### 路径与回退纪律

- 迁移前核对 import、Node 相对 URL/repoRoot、shell source、patch `!!js`、fixture、构建/exports、生成器、守卫硬编码、技能/文档链接。迁移和消费者同片；生成器与生成物同步，不手改 catalog。
- tsc 不保证删除旧产物。路径变更须确保干净构建消费新树；清理前核对绝对目标，仅清本包生成输出。共享 build/vendor 产物可能影响并行会话，先核对，必要时隔离工作树；vendor 源码/pin 不变。
- 每片提交是锚点；失败先修本片或暂停扩大。回退仅本片且不覆盖用户/并行变更，破坏性命令另获明确批准；未完成不能写 implemented 或宣称阶段通过。
- 文件迁移证据含“不漏测”与“消费者真解析”，不只有 diff-check。OV 脚本归位只验解析/既有合同，不安装、联网、起 server、改用户配置。

## 驾驭验收

新读者只从根入口出发，针对五条功能路径分别能回答：

1. 从哪个命令/配置起，实际用哪个构建物与 preset？
2. 动作从 UI/聊天进来，经哪些模块，到哪种状态/文件，哪里可观察？
3. 改这条规则先看哪个 interface 与实现，哪些模块不必读？
4. 不烧模型、不打开浏览器能验什么，准确命令是什么；必须 live 的是哪一步？
5. 如何区分配置/构建/领域规则/模型选择/界面读回的失败，有什么外部证据？

候选量化标准：无口头提示，每条定位不超过 5 分钟；确定性功能先给局部 keyless 验证；结论标证明范围。阈值是可用性目标，不是已测收益或新门禁。导航层数导致更慢则删减层，不放宽问题报完成。

默认测试发现无减少；全部现有公开命令/exports 兼容；两场景明确执行；源码与运行数据有区分；根 AGENTS 不变大手册。这些是结构标准，不替代“经营答案像样”的真人判断。

## 候选与取舍

| 方案 | 判定与代价 |
|---|---|
| 只加 README/AGENTS | 可先完成 P0，但 scripts/dev/tests 混杂仍靠人记，不作为整体完成 |
| 全仓移动后补文档/测试 | 路径失效难定位，假绿掩盖遗漏，输给可靠验证前置和分职责提交 |
| 后缀把单元/合同统为一个层 | 现有后缀保留，但回答不了 interface 与 IO/构建依赖；加职责目录而非发明新后缀 |
| 运行/界面/测试各拆 npm 包 | 发布边界未变，多包增加装配税；单包内切职责，不预建第二专家骨架 |
| 加 coverage/CI/通用场景框架 | 指标不等于可理解；先修实际遗漏和假绿，不建设新平台 |
| 搬所有 dev home 让树纯净 | 改凭据/日志/试用状态定位，收益不足承担数据迁移；保留位置并明确忽略 |
| 顺手修审批/学习/OV 行为 | 不同验收，扩散半径；如实标注现状，回对应 owner 独立判断 |

## 毕业门与 Ongoing Goal

四问：**该做**的依据是用户定位/验证障碍及可指认误导；**何时**先 P0/P1，再在卫生范围内实施后续片；**次序**由证据依赖决定，不重排产品转向；**放弃什么**见取舍表，不借整理删已有能力/防护。

毕业条件：入口/工具/测试底稿完整，主要结论主代理复核；目录选型、兼容 interface、各片消费者、验收和回退可执行；用户确认实施范围。按 [notes 规则](../../notes/README.md)承接有界提案；本卡按 [backlog 生命周期](../README.md)关闭并链接承接，材料随最后消费者归档，不维持两份活实施计划。

待确认的实施 goal 候选文本：

> 按已确认的 repo 可驾驭性提案，分阶段纠正入口与导航、修复组合/测试发现的证据缺口、整理研发工具和测试资产、最后切分产品源码职责。保持公开命令/插件身份/exports/存储行为兼容，不改 vendor 和日用 home，不迁运行数据，不搭车改产品能力。每阶段完成源码/测试/文档/理由与真实验证，形成单片回退提交；最终由新上下文从根入口独立完成五条功能定位与局部验证，提交准确的已验/未验报告。

goal 管持久目标，todo 管当前实施，proposed/implemented 管方案与决定。阶段内技术细节 agent 自主闭合；只在产品取舍、范围扩大或不可替代的真人验收回到用户，不为每次移动重复请示。当前 goal 到“底稿+计划+门禁+交付”即完成，不自动换成实施目标。
