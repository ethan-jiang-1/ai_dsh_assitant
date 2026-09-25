# DSH 研发体系对齐：可借鉴项收编与落地（第一轮）

日期：2026-09-25 · 状态：**implemented（三轮全部落地并提交：notes 分类学重整 fa1611c、P1 门禁批 6e09eb0、P2 文档批 4a910b5、P3 状态可见批与毕业同提交；两个延后项带触发条件留在 ROADMAP）**

> 来源与读法：参考语料 `/Users/bowhead/deepseek-harness/_agent_ready_development`（模拟 DSH 研发思路的
> 独立语料，钉版 `dsh-v0.1.7-rc.1` @ `46a7f68`；只读借鉴，不改动它）。三个子目录分别由三个只读子代理
> 通读并产出带行号证据的清单（repo-harness / sdlc-reference / _coverage+verify.mjs），主线对
> `08-repository-taxonomy.md`、`01-agent-note-lifecycle.md`、`09-plugin-author-entry.md` 三篇亲读核验。
> 本卡是**唯一**清单（子代理的原始产物已收编于此，不另存第二份清单——第二份清单必然漂移）。

## 一、对齐目标与判据

用户诉求：**本仓是 DSH 插件仓，研发思路要与 DSH 对齐，coding agent 同时读两仓时不糊涂。**
判据用 DSH 自己的边界（`repo-harness/09` §4）：插件仓从 DSH **继承**插件形态/配置/打包模型/术语；
**分类学精神**（一个事实一个 owner、生成物有生成器、决定有记录、状态可机械检查）是可迁移原则；
DSH 不要求插件仓复制它的完整 Note 机制与协作面。因此本卡逐项给 **借 / 适配 / 不借** 三档判定。

## 二、第一轮已落地（本卡同 diff，见 git）

| # | 机制 | 来源 | 落地物 |
|---|---|---|---|
| L1 | 生命周期四态：`proposed`（将来）/`implemented`（当前权威）/`rejected`（负知识）/`archived`（冻结历史） | `sdlc-reference/01` §3 | `notes/rejected/`、`notes/archived/` 实体化；6 篇历史 note 归档（带 `已归档：` 行） |
| L2 | 路径与状态词互校；状态行可机械检查 | `01` §4；`08` §3「结构受 gate」 | 全部 note 状态行规范化为 `日期：YYYY-MM-DD · 状态：**<词>**`（28 篇改写：18 篇标题式补状态行、10 篇变体词归一） |
| L3 | 归档=冻结、不再编辑 | `01` §3/§6 | `archived/` 门禁要求 `已归档：YYYY-MM-DD` 行；README 声明冻结 |
| L4 | rejected 一行拒绝原因、失效即删 | `02` §「负知识需要 owner」 | `rejected/` 门禁要求状态行带括号原因 |
| L5 | 目录树即工作清单、**不设集中索引** | `01` §2（no-index note） | `notes/README.md` 不建 INDEX，只写分类契约 |
| L6 | 分区的职责由**具名文件**拥有，不由惯例拥有 | `08` §1 | 新建 `notes/README.md`（owner 文件）；`verify` 要求它存在 |
| L7 | 入口文件是 standing orders：无状态节/无进度标记 | `08` §3；`05` §「每个可机械检查的承诺配一条命令」 | 新门禁 `AGENTS.md 内禁日期与进度标记`；AGENTS.md 两处日期与一处标记已清 |
| L8 | 调研面状态可见（进行中 vs 已收卷） | 本仓 research 面规范 | `research/` 门禁要求「进行中」、`research/archive/` 要求「已收卷」 |
| L9 | 顶层分类是封闭集合（未知目录=第二个家） | `08` §1 | 新门禁：`notes/` 顶层条目只允许文档化集合 |

## 三、采纳清单（待落地，借或适配）

**A 组 · 门禁类（成本小，当前状态合法，可直接造红）——✅ 全部落地（P1 批）**
1. ✅ **语言分工上闸**：`src/**.ts`（注释行豁免）+ `presets/assistant/skills/**/*.md` 出现 CJK 即失败；**皮肤面豁免**（`web-branding.ts` 与 `client/` 的中文 UI 文案、`preset.yml` 显示名——侦察时修正了子代理把皮肤面错列进模型面的口径）。
2. ✅ **依赖姿态上闸**：`@deepseek-ai/*` 不得进 `dependencies`/`optionalDependencies`（只许 peer）；`dsh.compatibility.dshReleases` 必须含 `vendor/UPSTREAM.md` 的钉住 tag。
3. ✅ **严格 UTF-8 + 恰好一个结尾换行**：受管文本（仓库 md + 脚本）无非法字节、无缺/双结尾换行；顺带修 `walk()` 跳过 `node_modules`/`.git`（pnpm 符号链接链会撞 ENAMETOOLONG）。
4. ✅ **负例控制成为规矩**：写进 `docs/discipline.md` 复查环；本批四条新门禁各配正反夹具（`tests/verify-gates.spec.mjs`）。
5. ✅ **三重门禁各管什么**：`docs/discipline.md` 新增表（机械门禁 / 语义审计轮 / 用户拍板各能建立什么、不能建立什么）；**不借** weighted approval（单人仓无第二评审人）。

**B 组 · 文档与路由类（成本小）——✅ 全部落地（P2 批 B6–B13/B18；B14–B15 已并入 P1；B16–B17 见 P3 批）**
6. **生成物登记表**（`08` §3 五形态之「生成+freshness」）：`docs/dev.md` 加一张 3 列表（生成物/生成器/freshness 检查），当前只有 `tsconfig.tsx.json` 一行；不建 manifest。
7. **运行时查询进探索路由**（`06`）：`AGENTS.md` 探索路由加两条——「组合里有没有这一行」→ `pnpm dsh --profile dev --dump-config`；「活进程注册了什么」→ 切 shipped `cordis` preset 用只读 inspect 工具（**不改** assistant preset，那是模型可见面变更）。
8. **新行为归属判据四问**（`01` §15 / `04`）：`docs/architecture.md` owner 表前插四问（只改 patch 一行？只加工具/段落？跨会话持久状态→服务？新增模型可见事实→日志税？）。
9. **术语锚定括注**（`09` §4）——**部分落地（5/7）**：已加 `host 面（= bundle patch 行）`、`agent 面（= preset agent 行，model-facing）`、`8 个入口（= package.json exports 的 plugin 子路径；**该计数后被生成目录更正为 9**：host 1 + preset agent 6 + dev 专用 1 + client 1，见 `docs/package-catalog.md`）`、`working folder（= 本插件 dataDir，≠ 进程 cwd）`、`服务（Definition + 单 Provider 同包，Consumer = 各 tool 入口）`。**未落地两项**（在收编证据时丢失）："两个解析门面"与 DSH `Context façade` 撞名未改；`房间/桌面/抽屉` 未加 DSH 侧映射句。去向：[补课卡 S5](2026-09-25-dsh-alignment-deepening.md)。
10. **tier 表一行式**（`05` §tier）：`AGENTS.md` 布局表前插 4 行「哪类事实归谁拥有」；不复制上游 13 行全表。
11. **作者视角自检句**（`05` §41）：写 `ROADMAP.md`/`docs/` 时自问「读者只有 HEAD、没有会话 transcript 时能否核验每个 claim」；现有条目里的裸简称（`R1/R3/r5 §末`）改成可点链接。
12. **snapshots 只收什么**（`08` §4）：`snapshots/README.md` 补边界句——只收 session 回放 fixture，单元/CLI/generator 期望输出跟 owning 层走。
13. **UPSTREAM 重审触发表 + 每轮固定字段**（`_coverage`）：`vendor/UPSTREAM.md` 加「上游路径 → 受影响 docs/notes 断言」映射；每轮 `sync-dsh` 在 `notes/implemented/` 落一条固定字段记录（日期/基线 SHA/动因/真跑命令+计数/未改动部分/遗留阻断）。
14. **「被阻断的检查不得写成绿色证据」**（`_coverage` 纪律）：写进 `docs/discipline.md`。
15. **历史边界句**（`08` §5）：note 只证明其自身内容；门禁规则带生效日、不追溯重判旧物（备选节门禁的 grandfather 日期即此例）。
16. **意图入口与状态映射**（`09` intake）：`AGENTS.md` notes 段补「意图三通道」（用户轮内请求 / ROADMAP 条目 / `notes/proposed/` 卡片）与「队列标记 ↔ 卡片状态词」映射表；卡片状态词封闭为 `proposed`（不再造"调研中/待拍板/待实施"第二套词）。
17. **卡片骨架**（`09` 模板）：`proposed/` 卡片固定四节（问题-可观察行为 / 提案 / 输掉的方案 / 验收）；ROADMAP 条目压回 ≤3 行，正文搬卡。
18. **rehearsal 常开**（`11` §9）：`pnpm release-smoke` 进固定收尾环（发布路径改动必跑），不再靠记性。

## 四、落地记录（实际提交）

1. **notes 分类学重整**（`fa1611c`）：`notes/README.md` owner 文件 + `rejected/`/`archived/` 实体化 + 28 篇状态行规范化 + 6 篇归档 + 4 条 notes 门禁（各配夹具）；verify 22→24。
2. **P1 门禁批**（`6e09eb0`）：语言分工 / 依赖姿态 / 严格 UTF-8+单结尾换行 三条新门禁 + 负例控制与"阻断不得写成绿色"两条纪律 + 三道门禁表；verify 24→27、test 170→173。
3. **P2 文档批**（`4a910b5`）：AGENTS.md tier 表与术语括注与运行时查询路由、dev.md 生成物登记表、architecture.md 归属四问与服务三角色、snapshots 只收边界、UPSTREAM 重审触发表与每轮记录字段、ROADMAP 作者视角自检句。
4. **P3 状态可见批**（与毕业同提交）：意图三通道 + 卡片状态词统一为生命周期词一套（取消"调研中/待拍板/待实施"第二套）+ 卡片四节骨架（推荐不门禁，登记理由）+ ROADMAP 条目压回索引形。
5. 每批验收：`pnpm typecheck && pnpm test && pnpm verify` 全绿（终态 173/173、verify 27/27）。

## 五、输掉的方案（明确不借，防重新开讼）

- **`{lifecycle}/{class}/` 两级路径**（DSH 用它）：偏离理由登记在 [`notes/README.md`](../README.md) §四（class 是正交第二轴；44 篇迁移 churn 与误分类风险 > 收益；`09` 明说只继承精神）。
- **GitHub 协作面全套**（Issues/PR/Project/review webhook/weighted approval/blame 加权/`/delegate`）：单人仓、无第二评审人、无协作面；`docs/discipline.md` 已登记不适用的部分不重开。
- **CI 层与 git hooks**：本仓无远端流水线；本地 `verify` 承担同一逻辑（已登记）。
- **文档词数预算 manifest / 双语配对 / VitePress 投影**：`docs/discipline.md` 已裁定"刻意不做（触发=docs 腐化实证；在 ROADMAP）"；本次不改变该判定。
- **发布 lane（bump/tag/publish/CHANGELOG/registry 三态）**：本仓 private、未发布；只留"rehearsal 常开"（B18）与"无 CHANGELOG"两条纪律。
- **钉版外链白名单 / SVG 全套结构规则 / 强制目录 README**：语料专属（它要独立发行、有 15 张 SVG、目录全有 README）；本仓无图、无发行面，强行照搬会全线红。**窄化采纳**：只对"引 `vendor/dsh` 的 URL"要求钉当前 tag/SHA（已有 pin 门禁）。
- **`cordis_inspect_*` 加进 assistant preset / package invariant 运行时关系层**：前者是模型可见面变更（要付日志税与快照），为开发期需求不划算；后者单包无 owner relationship，`dev.md`"真 boot 一次"已顶替。
- **`.agents/` 开发 skills 全集**：**已落地**（三件，见 [补课卡 S3](2026-09-25-dsh-alignment-deepening.md)）——上轮"延后"的理由（等重复流程出现）被真实使用证伪；后续技能按"同一多步流程重复第三次就立"的常设规则增补，不再占队列。
- **`change-scope` 脚本**：**延后**——触发=真实"跑错检查/漏跑检查"摩擦出现（在 ROADMAP）；当前 `pnpm typecheck && pnpm test && pnpm verify` 三连足够小。

## 六、验收（结果）

> **2026-09-25 自审更正**：本卡 §三 A 组与 B 组大部分为真，但 B9 为 5/7 部分落地，
> 且**四个结构性机制完全未做**（子树 AGENTS.md、生成目录+freshness、`.agents/skills/`、负例控制覆盖面）。
> 逐项对照与证据见[自审档案](../research/archive/2026-09-25-dsh-alignment-audit.md)；
> 补课计划见[补课卡](2026-09-25-dsh-alignment-deepening.md)——**四项已于同日全部落地**（S1–S4，提交 92aeb0f/138dee5/5a3290e/8cacf85），
> 本卡不重写结论，只在此标出未完成面与去向；按本仓纪律，未完成的检查不得写成绿色证据。

- P1 批：三条新门禁各带正反夹具（`tests/verify-gates.spec.mjs`；含非法 UTF-8、双结尾换行、运行时依赖、compat 漂移四种红），`pnpm verify` 27/27 绿。
- P2 批：`docs/` 与 `AGENTS.md` 只加括注、映射与表，不引入新术语；链接与语言门禁绿。
- P3 批：卡片状态词统一为生命周期词（第二套阶段词已在 AGENTS.md 与 `notes/README.md` 明确取消）；`ROADMAP.md` 条目回到索引形（长证据链走路由链接承担）。
- 遗留（带触发条件，留 ROADMAP）：`.agents/` 开发 skills、`change-scope` 脚本。
