# R4 · 先进 harness 借鉴调研

日期：2026-09-27 · 状态：**research（进行中）** · 用户拍板：ongoing goal「学习先进 harness，能学多少算多少，主要是借鉴，差不多了即停」。

## 目的与方法

- **目的**：把可及语料源里尚未借鉴的机制挖出来，逐项分诊；只借思路不装包（根 `AGENTS.md` 硬规则 7）。
- **语料源**（按每单位阅读成本产出的想法密度排序）：
  1. ✅ **外部仓 deepseek-harness 的 FAQ 家族 13 个未读专题**（07 号已于本轮早期消化：十维评估 + 垂直切片）——**2026-09-27 消费完毕，零立即借**（分诊见下）；
  2. 同外部仓的 `_digested/` 深度层 11 个专题——第二轮定点抽查（FAQ 家族是对它的二次研究，可迁移层大概率已被专题蒸馏覆盖；抽查验证而非全读）；
  3. `vendor/dsh/` 一手 docs 与 `.agents/notes/`——按分诊结果定点读；
  4. 邻居学习仓（ai_dev_harness 家族、OpenHands 学习仓、ai_dsh_company）——按需。
- **方法**：子代理通读做机制清单（只盘点不判断，全文见附录），本仓现状对照分诊由主会话做。

## 分诊框架（三档）

| 档 | 判据 | 处置 |
|---|---|---|
| 立即借 | 零架构依赖 + 服帖本仓现有纪律 + 有真实痛点对照 | 窄切片落地（note + 证据同 diff），或进队列 ▶ |
| 触发后再借 | 有价值但条件未到（真实需求/规模未出现） | 住 `ROADMAP.md` ⏳（延后只能住本表） |
| 不适用 | 已借齐/已继承/依赖我们没有的组合压力，或与本仓哲学冲突 | 记一行负知识（防重复开讼），不进队列 |

**停止判据**（用户授权自判「差不多了」）：过完全部语料源、剩余可借项全部为触发型或不适用、无立即借项——边际收益趋零即收卷（本文件转 `archive/`）。

## 源 1 分诊总表（13 专题，2026-09-27）

| 专题 | 论点一句话 | 判定 | 依据 |
|---|---|---|---|
| 01 目录设计 | 按所有权/可替换角色/组合/发布边界切目录；三棵树阅读法 | 不适用 | 三棵树已是我们「探索路由」；Definition/Provider/Consumer 语法印证 assistantMemory 单包自用是 day-0 正确形态 |
| 02 分层规格 | 意图/决策/计划/合同/行为/规则各有权威载体互相约束 | 已借齐 | 六层全部在场（intents/proposed/plan 呈批/docs 合同/tests/gates）；coverage gate 属新门禁＝冻结令范围，登记负知识 |
| 03 多 vendor | route 配置→adapter 阶梯；选 route 同时选缓存语义 | 不适用 | vendor 层是 host 职责，插件仓无此面；in-history 缓存洞见记档备用 |
| 04 入口文档静态设计 | 事实归谁/哪层常驻/地图坏了机器可证明 | 已借齐 | symlink、tier、freshness、机器检查全在场；词数预算 manifest 已是队列 ⏳ 条目（触发=docs 腐化实证，归宿=ROADMAP.md「文档词数预算 manifest」行）——本表再次确认其位次 |
| 05 入口文档运行时消费 | 按需加载＝注入(push)/导航(pull)/回收(recycle) 三件机器事 | 已继承 | host 拥有；本仓模型面经 skill() 两层披露 ✓、compaction ✓ |
| 06 spec 变更路径 | 九段主路径；docs=当前合同层；四面同 diff | 已借齐 | 「窄证据」硬规则 + notes 拟态改写即其适配形 |
| 08 seam 成熟度 | 生成目录点数 P/C 得可替换率 45.5% | 不适用 | 我们是被组合方非平台；「自消费 seam」信号印证现状 |
| 09 自用生产力 | 敢放手+省手+可复用三层；L0–L3 阶梯；自证实验带通过/停止判据 | 已借齐 | O1–O6 外部可观察判据 + 责任圈卡圈纪律即同构物 |
| 10 用户体感机制判定 | 根本体验=体验皮(goal/plan)+三条根；goal/plan 是状态与授权层 | **已继承** | `--dump-config` 实证：`goal`/`goal-round-driver`/`command-goal`/`plan-mode` 四行随 base bundle 在 assistant 组合里——「敢放手」授权面产品天生就有 |
| 11 原生开发闭环 | 六步闭环；「轻松」=正确路径与最省力路径制度性对齐 | 已借齐 | 硬规则 3/6 + defineTool 声明式 + 步步为营即同构 |
| 12 web 多开卡住 | rev 轮换+陈旧 index 缓存；排除法 runbook | 留观 | 上游候选缺口；真遇到多开 404 再查该篇 runbook（负知识一行，防重新诊断） |
| 13 插件仓组织 | 五决策×四方案；dev-loop/dual-home/naming 三伴生 | 已借齐 | 四篇全消化（本 session）：identity.md 即 naming 篇落地物（8 平面无缺口已 grep 证实）；双 home 强制覆盖强于兜底；六步闭环/兼容环在场 |
| 14 hooks 三家对照 | 原生 typed Decision 拦截点 + 兼容桥；一点一权 | 触发后再借 | 拦截需求未出现；**出现时走原生 `tools/pre-execute` 而非工具体散检查**——记为设计约定，不立条目 |
| 15 loop×SDD | 三层来源拆分；三个人工抽查控制点 | 已借齐 | discipline 逐源枚举 + plan 呈批/todo/步步为营即同构 |

## 跨专题 8 条机制 × 本仓对照

| # | 机制（出现于） | 本仓现状 |
|---|---|---|
| 1 | model-visible ⟺ logged（02/08/09/10/14） | 无负债：day 0 不新增 SessionEventMap 成员，模型可见状态经工具调用/结果走核心日志（identity.md §三 + grep 证实） |
| 2 | 一个事实一个家（01/02/04/06/15） | ✓ 十维评估「归属」维满分 |
| 3 | 门禁优先于 prose（02/11） | ✓ 32 条 verify + 负例控制纪律 |
| 4 | 时态改写 + 输掉方案强制（02/06） | ✓ 拟态改写规则 + 「输掉的方案」机械门禁 |
| 5 | freshness 生成目录（01/04/05/08） | ✓ package-catalog.md + gen-catalog --check |
| 6 | 预算两端对齐（04/05） | 写端=队列 ⏳ 词数预算 manifest（触发未到）；注端=host 拥有 |
| 7 | Definition/Provider/Consumer（01/02/08/09/13） | ✓ 消费方姿态正确；自有单 seam 自消费为 day-0 形态 |
| 8 | 结论自带诚实边界（02/08/09/11/15） | ✓ 输掉的方案/已知降级/未到触发全在案 |

## 独特 5 条速判

1. 08 可替换率点数法——不适用（非平台）；若将来做第二专家包可复用方法。
2. 14 一点一权——DSH 原生我们直接继承，无需动作。
3. 03 in-history 缓存语义——dev home route 配置时想起它（排障/省缓存），记档不立条。
4. 11 「spec 感是沉淀物」——与本仓「证据先行」姿态一致，无动作。
5. 12 rev 轮换 runbook——留观（见分诊表）。

## 第二轮计划（源 2 抽查，验证而非全读）

- `session-and-loop/01-session-event-map.md`：验证我们「无日志税负债」的判断（事件词汇表/审计对形状）。
- `surfaces/05-客户端架构与插件纪律.md`：对照三面板的 slot 纪律与 R1–R13 整改是否有漏。
- 两篇若无新借点 → **收卷判定成立**：源 2 被源 1 蒸馏覆盖，源 3/4 按需，goal 完成并归档本文件。

## 源 2 抽查结果（2026-09-27，两篇均读毕）

| 篇 | 判定 | 依据 |
|---|---|---|
| session-and-loop/01（事件表/required-on-read/格式世代） | 无新借点 | digest 明文「tool schema 与模型配置走 `request/header` 现成路径，无需为每个 section 新增事件类型」——「无日志税负债」判断成立：本仓模型可见状态经工具调用/结果与 core 事件走，无自定义事件面（identity.md §三 + grep 证实）；格式世代是 host 职责 |
| surfaces/05（客户端架构与插件纪律） | **一个立即借点 → 已落地** | 「feature 组件只消费 `--dsw-alias-*` 语义 token、禁字面色值」（vendor `docs/web-styling.md` 纪律）——本仓三面板 grep 出 **70 处字面色值、0 个 token**：暗色主题下白底按钮/暗青图标/暗棕 warn 文字全部不可读（dev home 实测即暗色主题），R8 的「暗色另算」欠账即此 |

**落地切片**（同 diff：代码 + 测试 + 纪律 + 证据）：

- `src/client/index.ts`：53 处换 vendor alias（label-secondary/bg-base/layer-1/border-l2-l3）、
  warn/accent/tint 四角色走新增 `ensureThemeVars()` 注入的 `--dsha-*` 契约块（body 级挂载，沿 vendor
  `--dsw-specific-*` 先例；暗值引用 vendor statics：amber-400/amber-900；teal 暗值 `#2dd4bf` 为自有品牌值）；
  唯二保留字面色 = 品牌 SVG 白剪影（固定 logo 色）。
- 为什么 warn 不用 vendor token：`state-warn-label` = amber-600 = rgb(221,134,41)，白底 **2.6:1**，
  会打破 R8 的 ≥4.5:1 承诺——vendor amber 阶（100/400/500/600/900）无一亮面达 AA，故亮值自带（7.4:1）。
- 测试重塑：R8/R11 的 AA 守卫从「扫组件字面色」升级为「组件零字面色 + 契约亮值逐个 ≥AA」——
  **它当场抓住了 replace_all 误改契约块造成的自引用退化**（`--dsha-warn:var(--dsha-warn)`），负例证明真实有效。
- 证据：typecheck 0 · build 0 · 279/281（2 条＝记录在案的 preset-composition 已知降级）· verify 32/32 ·
  **暗色主题真机截图**（dev home 即暗色：三室图标/品牌标记以亮青正确渲染、引导条文字可读——改前为
  不可见的暗青 `#0f766e`）；亮色零变化（同 hex 值经 var 传递）。
- 纪律归位：包 AGENTS.md 新增第 4 条（色值走主题）；R8 卡「暗色另算」段补兑现注记。

**结论**：源 2 两篇抽查——一篇无新借点（判断成立），一篇产出本次 goal 的**唯一立即借点且已落地**。
源 2 的其余专题（agent-loop/composition/…）按「FAQ 即其二次蒸馏」的判断不再全读；收卷判定待最后一轮复核。

## 输掉的方案

- **不做的**：把借鉴物做成「大而全的改造战役」——借鉴必须逐项过痛点判据（做在触发之前＝替本人想象需求）。
- **不做全读源 2/3/4**：FAQ 家族即 `_digested` 的二次蒸馏，全读是重复劳动；定点抽查验证覆盖度足够支撑收卷判定。若抽查推翻本判断，再回头扩挖。
- **不借 coverage gate**（02 的每文件 100%）：新门禁＝冻结令范围，且 279 个有意义测试已在场，覆盖率数字本身不证明正确（02 自己也承认 coverage≠正确）。

---

## 附录 · 子代理机制清单（源 1 全文，2026-09-27）

### 01 · repository-organization
论点：目录按所有权/可替换角色/运行时组合/发布边界切，不按技术分层。
- 三棵树阅读法：目录树答"谁维护"、package 依赖图答"谁能 import 谁"、运行时插件树（dump-config）答"本次实际挂了什么"。
- Definition/Provider/Consumer 角色语法：一条 seam = Definition + 可换 Provider + Consumer；Consumer 只依赖 Definition。
- 实现/组合/入口分离链：package 实现 → bundle 发布默认行 → profile/home/--patch 覆盖 → Loader 成树。
- 顶层分区 = 发行责任边界；研究覆盖层分离、每篇带源码核验基线 commit。

### 02 · spec-driven-development
论点：把意图/决定/计划/合同/证据分放进各自权威载体并互相约束的"分层规格开发"。
- 六层 spec 载体：意图→决策→计划→当前合同→行为→工程规则。
- 门禁原则："每条可机械检查的承诺必须有一条失败时非零退出的命令"。
- proposed→implemented 同 diff 时态改写；败选进 rejected/ 只留拒绝理由。
- Plan Mode 硬批准；分层行为证据（coverage/组合测试/snapshot/e2e）。

### 03 · model-vendors
论点：接入 vendor 是四级阶梯，绝大多数纯配置够，选 route 同时在选缓存语义。
- route-per-provider 纯配置，不伪装协议；adapter 仅当三种 wire 协议都描述不了才写。
- 能力逐 endpoint 实测后才写进 route 模型项。
- SystemPromptUpdate `in-history`：不声明则每步重写 message 0、前缀缓存整段失效。
- 横切不变式：文件从不原生发 provider；日志保留请求当时的 route/model。

### 04 · root-entry-doc-design
论点：渐进披露转成三个可机械回答的问题。
- 一个事实一个家 + tier taxonomy；根入口硬字数预算（manifest 机械执行）。
- README 管人、AGENTS.md 管 agent、CLAUDE.md symlink。
- 地图机器检查（链接/生成目录 freshness/双语配对）；量代理量不量"懂了没"。

### 05 · root-entry-doc-navigation
论点："按需加载"被拆成注入（push）、导航（pull）、回收（recycle）三件机器执行的事。
- 指令链注入整链 + nested touch-driven；超预算 token meter + compaction。
- 工具提示词即路由纪律；skill 两层披露（catalog 摘要常驻，调用才加载正文）。
- compaction 保留 tool-call/result 配对。

### 06 · spec-change-path
论点：spec 是从意图到当前合同、再到交付决定与 review 的主路径。
- 九段主路径；只有"非平凡变更必带 Note"是硬规则。
- docs=当前合同层只写 now；同一变更四面同 diff。
- review 只兜机器查不到的语义；archive 是可选收敛。

### 08 · plugin-seam-maturity
论点：用 freshness-gated 生成目录把"一切皆插件"算成数。
- 89 = 54 core + 33 seam + 1 service + 1 bundle，可替换率 45.5%。
- 供需分侧判据；三条反向信号（自消费/零 Provider/零 Consumer）。
- "能换"≠"换了有差异"；缺口 backlog 按信号强度排序。

### 09 · plugin-business-ladder
论点：自用价值 = 敢放手 + 省手 + 可复用，每层挂在运行时不变式上。
- 敢放手：model-visible⟺logged、审批成对审计、无 answerer fail-closed。
- L0–L3 参与阶梯；四个 owner 自证实验各带通过/停止判据。
- 边界：审计对称且有成本（每个 model-visible 输入都要事件成员）。

### 10 · v4flash-user-notes
论点：根本体验 = 一条体验皮（goal/plan）+ 三条根（日志基底/委派 spine/组合层）。
- goal/plan 是状态与授权层：预算上限、完成证据门、阻塞 3 轮下限、恢复过人手。
- goal 轮默认 256 轮自动续；goal/plan/workflow 全是 SessionEventMap 成员。
- 并行三层：workflow 编排 / 后台 subagent / 工具池；小模型步内思考、步间靠持久日志。
- UI 硬税镜像：新用户可见产物 = 新事件成员（默认 required-on-read）。

### 11 · native-development-loop
论点：最自然是窄证据切片闭环；"轻松"=正确路径与最省力路径被制度性对齐。
- 六步闭环：核对现场→窄 diff→原子改 owner→最小证据→沉淀 gate/Note→只报实跑。
- "轻松"三来源：记忆外包/反馈秒级/犯错代价低（整 PR 回滚）。
- coverage gate 删除解释权；defineTool 声明本质其余派生。
- 因果倒置：spec 感是闭环沉淀物，不是上游输入。

### 12 · dsh-web-stuck-windows
论点：卡住是陈旧缓存 index——rev 轮换 + 无缓存头 index 被启发式复用，旧 rev 全 404。
- 修复语义最小化（只给 index 加 no-store）；排除法实测设计。
- 可重跑 runbook：grep 判定→备份→锚点编辑→curl 验证→停手条件。

### 13 · expert-plugin-repo-organization
论点：repo 组织 = 五决策 × 四方案，推荐方案 A（独立 repo + pinned submodule）。
- 方案 A 簿记：submodule 钉 tag + SHA 簿记 + 升级脚本。
- UI 分层认领：fallback 卡 → keyed slot → client inject → 树内改（B 独占）。
- 依赖纪律：peerDependencies + 兼容矩阵 + 发布物自包含；真实安装形状测试。
- 伴生篇：dev-loop（六步马达+插拔速查）、dual-home-isolation（物理隔离）、naming-and-identity（8 平面第 0 天清单）——本仓均已借齐（见分诊表）。

### 14 · hooks-vs-claude-code-codex
论点：两层 hooks——原生 typed Decision 拦截点 + CC/Codex 兼容桥。
- 原生 8 拦截点、一点一权：tools/pre-execute allow/deny/ask；guard deny-only 单调。
- 桥的取舍："兼容适配器不是力量工具"；审计 log-only。
- 选型：复用 hooks.json 走桥；新拦截走原生插件；改 loop 级仍是插件。

### 15 · loop-engineering-vs-sdd
论点：执行循环已成型，跨 feature 的取题与判断仍靠人设计；loop 与 SDD 并用。
- 交付层/工作层区分；三层来源拆分（运行时/仓纪律/插件仓自定）。
- 三个人工抽查控制点：开工授权、范围改变、宣布完成。
- 证据边界：公开抽样不推断私有方式；机制存在 ≠ 被使用。
