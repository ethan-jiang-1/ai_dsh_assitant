# settled_issues/ · 问题已有结论

满足 [关闭条件](../../README.md#关闭条件)的问题卡在这里。文件名不变。进来时把 frontmatter 的 `status` 改成 `已结`，字段顺序不动。结论与去向看每张卡自己的正文。历史卡保留当时的术语和讨论；新卡按现行关闭条件处理。修好的缺陷在 [`../fixed_bugs/`](../fixed_bugs/README.md)。

## 推敲卡（新 → 旧）

| 卡 | 关闭日 | 判定 |
|---|---|---|
| [261012-desk-state-gated-actions.md](261012-desk-state-gated-actions.md) | 2026-10-12 | **做现在·同轮落地完毕**：状态决定合法动作集——已完成/已放弃详情的动作是「唤醒这件事」（警示色＋铃铛，非「处理」），绑定层防呆拒绝非 active 的处理路径；唤醒臂走真 reopen（种子确认变化→原因入账→回在办），纯核 10 条判定矩阵＋claim/flow/wake 三场景 e2e 全绿（wake 8 相位含 settled-action-gate 与状态机闭合断言）；本人拍板的原则原文住卡上 |
| [261012-desk-history-views.md](261012-desk-history-views.md) | 2026-10-12 | **做现在·同轮落地完毕**：三切片（详情「动作」传记段/看板过滤 chips/流水视角＋「打开桌面·流水」命令入口）红绿落地，整包 568/568，claim+flow 双场景 e2e 全绿含流水相位（真调 claim 的账本、按天倒序、条目跳转选中）；本人在真实账本上实走认领后待认领通道清空（`claim-u1-to-m1-20261012`）；投影回执补 kind/quote（additive，契约行入 docs/operating.md）；延后项（搜索、byte-cap 分页）句子住[规格卡](../../../notes/proposed/2026-10-06-desk-operating-entry.md)验收台账 |
| [261012-desk-selection-contract-attach-ux.md](261012-desk-selection-contract-attach-ux.md) | 2026-10-12 | **做现在·同轮落地完毕**：桌面选择契约定并门禁化（任何 item 选中即有相称动作；新 item 类型同 diff 带「选中→相称动作」组件断言）；认领臂全链（纯核 10 条负例、整包 564/564、claim/flow 双场景 e2e 8+14 相位、prove-it-red 独红 claim-auto-return）；派发由本人当场撤回（都是自己给自己，防重提一行）；Attach UX 深化与噪音出口缺口延后（句子住[规格卡](../../../notes/proposed/2026-10-06-desk-operating-entry.md)验收台账）；基建教训（session-title-llm 按位吃回放格）入 replay-adapter.patch 头注 |
| [261012-backlog-process-made-explicit.md](261012-backlog-process-made-explicit.md) | 2026-10-12 | **做现在·同轮落地完毕**：借鉴 loop_advisor 同题卡把 _backlog 制度显式化——两轨入场票（问题清楚+验收手段，格式承载）、缺陷修复流（修复就绪=票+授权；P0/变向走本人）、铁律带日期例外、两轨翻转表（`活跃`→`排查中`，增 修复就绪/修复落地/等人拍板）、「毕业：」闭集头、agent 门牌 `_backlog/AGENTS.md`、liveness 族内镜像互查+新枚举（夹具三组红绿）；取舍与理由的家 = [过程 note](../../../notes/implemented/2026-10-12-backlog-process-made-explicit.md)；「验收在场」族与 `rejected` 终态刻意延后（under-pressure，句子住 note） |
| [261007-opening-brief-and-rhythm.md](261007-opening-brief-and-rhythm.md) | 2026-10-11 | **技术面清零 + 三条人判全通过**：#1 三行播报随唯一桌面被取代；#2 不增殖（live-mechanics `session-audit` 三次重载 11→11）、#3 能打字（`pnpm loop-probe` 真输入真回复）、#4 路由、#6机械（真会话里 `weekly {09:00, Asia/Shanghai, weekdays[1]}` + `schedule_list` 防堆叠）、#7 两场景零 diff；人判：R5 话术／#5 语气／#6 周坐四段口径——本人 2026-10-11 全部裁定通过。写法换账本词汇的技术面另记 [BUG-011](../../bugs/BUG-011-morning-brief-stale-desk-vocabulary.md) |
| [261006-chief-of-staff-experience.md](261006-chief-of-staff-experience.md) | 2026-10-11 | **A1–A9 逐行对账后与开屏卡一并归档**：A1/A3/A4/A5/A6/A7 pass（owner＝live-mechanics 四相位、desk-process e2e 十三相位、judge 负例 22 件、client spec、真机走查）；A2 半通过且**本人接受不做推荐**；A8 语气通过（与开屏卡 #5 共用裁定）；A9 按本人话挂起（触发＝本人日常使用）。P1–P4 接手分支的可行性未知全部清零；需求结论在 [proposed](../../../notes/proposed/2026-10-06-desk-operating-entry.md) |
| [261007-input-boundary.md](261007-input-boundary.md) | 2026-10-11 | **输入通道现在不做**：专用试用环境 `dev/trial-home-30d` + 先观察 30 天。观察准备全落地：读数命令 `pnpm observe`、[读数档](../../research/usage/261011-input-observation.md)、口径与剔除规则（机器轮次按 `source.kind`/`rpcId` 结构排除）、基线（真人使用前，三项全空）、每周快照触发（agent 扫读数档，>7 天补摘）；指标 B 改基为账本两段时长（旧口径的桌面 gaps 已退役）。下游申请已随回复提交给 notes |
| [261011-vendor-hero-headline.md](261011-vendor-hero-headline.md) | 2026-10-11 | **以后做**（接受现状）：唯一桌面后 hero 不再是首屏，影响缩到主动开空会话时的一行 vendor 品牌语；标题是 vendor 包内静态 locale 键，本包无合法改动口。触发＝上游发布带来标题槽位/覆盖口（triggers.md）；本人说一声要改即重开 |
| [261011-evidence-shape-third.md](261011-evidence-shape-third.md) | 2026-10-11 | **不做第三类证据形态**：能脚本化的一律脚本化（三例已落地：live-mechanics `session-audit`、`loop-probe`、两场景），剩下的一次性读数按 validation-evidence §1b 的「读法协议 + 读数写进拥有它的卡」；候选 C（给 `snapshots/` 加第三类 shape）与收窄契约冲突、属过度预建。不写新触发行——同类第三次再现时新开卡引用本卡 |
| [261010-desk-k4-closure.md](261010-desk-k4-closure.md) | 2026-10-11 | 技术面收口：②交代首事臂补齐（`IntakePath`/`judgeIntakeReturn` + 桌面「＋ 交代新事项」绑定 + 返回选中新事项）③第四种业务时间（`completedAt` 账本自盖、reopen 清除、投影/解析/详情打通）④窄视口「所选消失恢复」探针落证（`selection-vanish-and-recover` PASS）。①本人的体验裁决**转正为[规格卡](../../notes/proposed/2026-10-06-desk-operating-entry.md) §验收的开放行**——只有本人能给的口味输入，不再压在一张会烂长的验收卡上。探针负载敏感与首用探针断言过时两条另立 BUG-009/BUG-010 |
| [261011-post-retirement-residue.md](261011-post-retirement-residue.md) | 2026-10-11 | 两条残差都落地：机器标记改 `[面板] `（连带两个 dev 报告与夹具）；`dashboard` 回退面板与 `first-mile` 首开条不再读退役分区，首开条的「打开桌面全景」从退役房间改接主区账本桌面（原来是死按钮），并删掉不可达的 `DeskLandingOverride`、`counts.threads` 单元格与四个只服务退役行的 desk-io 动作。裁决留痕：**没有**顺手加回账本摘要条（那是被退役的形态，要加另立案） |
| [261011-session-desk-cleanup.md](261011-session-desk-cleanup.md) | 2026-10-11 | 五条清单全闭合：退役组件与 specs 真删（`panels.ts` 644→235、25 个断言块下线并把 staleness 断言改挂 `MemoryPanel`）、`desk-io` 五个只服务退役面板的动作与 `DeskSummaryDock` 一并删、client 口径收窄到「房间数据」（面板口播/刷新/空态/错误文案 + `askRefresh` 的模型可见提示）；web-face 两场景复绿（真红原因是投影读回被自家 abort 的 canceled 请求，见卡第 3 条）；家手册那节改 `### Room data` 并 bump v15。两处残差移交 [261011-post-retirement-residue](261011-post-retirement-residue.md) |
| [261010-desk-lead-rule.md](261010-desk-lead-rule.md) | 2026-10-10 | 毕业为已实施（用户点名）：分拣与已回答两条规则从渲染立即执行体提出为模块层具名函数（`splitDeskDecisions` / `deskRowAnswered`），屏幕行为不变——五条既有断言未改，`pnpm test:client` 114/114 全绿；无 note（局部搬家，无新产品取舍） |
| [261008-ceo-operating-loop.md](261008-ceo-operating-loop.md) | 2026-10-09 | 回款情景与更新权限已确认；Host 可信更新/提醒协调/读回第一切片、后续建议/经验/净收益范围及 V1–V9 验收已定。下游设计/验证申请已在本轮回复向当前用户提出；尚未实施，经营价值未验证 |
| [261008-vendor-corpus-home.md](261008-vendor-corpus-home.md) | 2026-10-08 | 消化：平台事实留在钉住的 vendor；本仓只写差量。落点 = 根 AGENTS.md 硬规则 2 与探索路由、`docs/discipline.md` 表行与适配 9、`docs/AGENTS.md`、`notes/README.md` §四；`client-ui-contribution` 改为链接加本包路径与验证，`pre-push-evidence` 与 `note-archive-judgment` 指向主仓对应技能 |
| [261008-sdlc-control-gap.md](261008-sdlc-control-gap.md) | 2026-10-08 | 消化：硬规则 3 的 note 改为按 notes/README §〇 才进同一 diff；归档技能改为「行为已在代码或合同里」不算归档理由；testing.md 模型可见面「能证明」与 eval 判决对齐。不造快照、不加格式门禁、不搬归档 |
| [261007-bigfile-split.md](261007-bigfile-split.md) | 2026-10-08 | 毕业为已交付：S1 host 切片（`c803726`，index 1178→288）+ S2 client 拆分+tsdown（`1f4e07e`，2950→13 模块），行数判据与全套门达成。**一处阻断随卡冻结、不吸收**：`web-expected` blank 场景夹具前置腐烂（A/B 实证新旧 bundle 同型漂移，S2 无罪），修复归 snapshots owner 面，修复前该场景不可判。归档触发 = 新增 `backlog: graduated issues leave the active shelf` 门禁点名滞留 |
| [261007-process-budget-audit.md](261007-process-budget-audit.md) | 2026-10-07 | 毕业为该做并执行完毕：处置表六行全交付（#1 AGENTS 隔离命令串下沉 dev.md、#2 地板张力判定不成立记触发、#3 五技能五要素核对全齐、#4 入口链走查 PASS、#5 docs 预算维持既有 ⏸、#6 驾驭者认知成本第五判据进 discipline 复查环）→ 实施 note B1 节；#2/#5 触发条件以本表为家 |
| [261007-dsh-corpus-absorption-audit.md](261007-dsh-corpus-absorption-audit.md) | 2026-10-07 | 毕业为该做（用户点名全量审计 + 瘦身方向）：三卷 230+ 机制六态对照收卷——静态层三问全 PASS，缺口定位动态闭环三环 + 驾驭者成本面 → 用户批准后落地为 实施 note；收卷台账 |
| [261005-sdlc-turnaround-cleanup.md](261005-sdlc-turnaround-cleanup.md) | 2026-10-06 | 毕业为该做并执行完毕：六面收口（机制/数据处置表 v2、门禁预算表 v1 零退役、gen-catalog devPatch 修复、演示面并入新 UX、文档面五轮审计 8 修、两探索问题定案）→ [SDLC 收口 note](../../../notes/archived/2026-10-06-sdlc-campaign-closeout.md) |
| [261001-first-open-ux.md](261001-first-open-ux.md) | 2026-10-06 | 毕业为已消化：18 轮首开 UX 全部落地 + 上游 6/6 递交（#8939-#8944）+ 判据「打开不困惑」转移至 desk-primary-view → 各 implemented note |
| [261005-open-value-deficit.md](261005-open-value-deficit.md) | 2026-10-06 | 毕业为方向已确认+切片已落地：一把手总助定位经 19 轮定案；Day-0 intake / 桌面主视图 / 晨报 v1 / 审批内联各有 implemented note；未落地候选为 deferred-with-trigger |
| [261005-turnaround-coherence.md](261005-turnaround-coherence.md) | 2026-10-06 | 毕业为阶段 0-3 交付：方向收敛→repo 卫生→UX 路径→最小垂直落地全链完成；阶段 4-5 为持续实践散入触发条件；常设贡献已固化（证据阶梯/数据同源/DSH 原生优先） |
| [261005-repo-navigability.md](261005-repo-navigability.md) | 2026-10-05 | 毕业为该做：用户确认分段实施（第一段 P0 残尾 + P2 工具归位，段间回用户复核）→ [提案](../../../notes/archived/2026-10-05-repo-navigability.md)（已归档；P0–P5 已交付，`f25d686`）；两份 tech-exploration 底稿随卡归档 |
| [260928-domain-eval-v0.md](260928-domain-eval-v0.md) | 2026-10-04 | G2 定案毕业：本人认可 Q1/Q4 从严裁定（三判据全绿；40 题入册 + 判例乙口径 + 两条新判分规则）→ 毕业件交付于评测基础设施 `dev/eval/domain/` |
| [260929-reserved-anchor-discipline.md](260929-reserved-anchor-discipline.md) | 2026-10-04 | 用户本人点名关闭（「毫无意义，移掉」——本卡规则唯一合法关闭方式）；连带退役 reserved-item-restraint 评测任务；🔒 机制原则保留于 backlog README |
| [261004-approve-direct-call.md](261004-approve-direct-call.md) | 2026-10-04 | 用户拍板否决：三层实锤（strict codec 强制 zod / classic script 不可达、workspaceFiles 只读、会话事件无法带 ignorable）判定直调需上游缝；host 侧服务保留为资产，上游提案要点在卡 |
| [260929-openviking-formal-integration.md](260929-openviking-formal-integration.md) | 2026-10-04 | 层 1 落地毕业（AGPL delegated 认 + 四量测活体 + 安装器双验收）→ [层 1 note](../../../notes/archived/2026-10-04-openviking-layer1-landing.md)；层 2/3 门在 note 尾 |
| [260928-openviking-install-release.md](260928-openviking-install-release.md) | 2026-09-29 | 试点六步全绿 → 用户拍板 **A（引入）** 毕业 [RFC](../../../notes/implemented/2026-09-29-openviking-adoption-rfc.md) |
| [260928-self-growth-base-research.md](260928-self-growth-base-research.md) | 2026-09-29 | 三选一拍板 **A（引入）** → 同上 RFC；B/C 借鉴清单随卡留档 |
| [260928-semantic-retrieval.md](260928-semantic-retrieval.md) | 2026-09-29 | 拍板 A → 被取代（召回走 OpenViking context search） |
| [260928-workflow-as-md.md](260928-workflow-as-md.md) | 2026-09-29 | 用户拍板关掉（编排已被 goal/todo/handoff 覆盖）；当时另立[常设保留锚卡](260929-reserved-anchor-discipline.md)接任评测活体样本，该锚卡后已关闭 |
| [260928-knowledge-ingest-pipeline.md](260928-knowledge-ingest-pipeline.md) | 2026-09-29 | 消化关闭：纯指针卡，内容全量住 knowledge-ingest-core note §四/§五，触发到场按 note 开工 |
| [260928-per-session-desk-store.md](260928-per-session-desk-store.md) | 2026-09-29 | 毕业为该做（多会话并行已是真实场景，用户拍板）。同日 RFC 后来按 note 生命周期删掉，那条路径不再存在 |
| [260928-command-menu-skill-noise.md](260928-command-menu-skill-noise.md) | 2026-09-29 | 批量清理：触发未到，发行准入的家 = 安装卡 S2 准入表 |
| [260928-default-workspace-repro.md](260928-default-workspace-repro.md) | 2026-09-29 | 批量清理：复现配方住第一公里走查 note |
| [260928-self-upkeep-baseline.md](260928-self-upkeep-baseline.md) | 2026-09-29 | 批量清理：产品要件已住判据文档（原 intents.md，2026-10-04 退役后为 README 方向判据），外人用前按它验证 |
| [260928-cross-harness-shared-memory.md](260928-cross-harness-shared-memory.md) | 2026-09-29 | 批量清理：第二消费方未出现，形态参照 R1 已归档 |
| [260928-desk-file-schema-version.md](260928-desk-file-schema-version.md) | 2026-09-29 | 批量清理：字段不匹配从未发生，修法随卡归档可查 |
| [260928-doc-budget-manifest.md](260928-doc-budget-manifest.md) | 2026-09-29 | 批量清理：立案设计（降限防回填）已住 docs/discipline.md ⏸ 行 |
| [260928-fts-trigram.md](260928-fts-trigram.md) | 2026-09-29 | 批量清理：grep 漏召回未发生，选型表住 R3 实测表 |
| [260928-full-auto-distill.md](260928-full-auto-distill.md) | 2026-09-29 | 批量清理：收益未证，用量仪表在场可随时答 |
| [260928-implemented-freeze-tree.md](260928-implemented-freeze-tree.md) | 2026-09-29 | 批量清理：方法住 note-archive-judgment 技能，53 篇未到阈值 |
| [260928-skill-license-fields.md](260928-skill-license-fields.md) | 2026-09-29 | 批量清理：provider/第二消费方未出现，候选清单住审计 note |
| [260928-mcp-connection.md](260928-mcp-connection.md) | 2026-09-29 | 批量清理：接入边界住 expert-pack note，真实需求出现按它推敲 |
| [260928-obsidian-bridge.md](260928-obsidian-bridge.md) | 2026-09-28 | 用户拍板不做（无要接的外部 vault）；行为评测 `reserved-item-restraint` 的锚同日改指 260928-workflow-as-md |
| [260928-session-log-thin-verbs.md](260928-session-log-thin-verbs.md) | 2026-09-28 | 用户拍板不做（rg 配方够用，无考古需求） |
| [260928-desktop-tag-leak.md](260928-desktop-tag-leak.md) | 2026-09-28 | 用户拍板不做（兜底路径罕见，不碍事） |
| [260928-personality-overlay.md](260928-personality-overlay.md) | 2026-09-28 | 用户拍板不做（无真实需求，身份面已够用） |
