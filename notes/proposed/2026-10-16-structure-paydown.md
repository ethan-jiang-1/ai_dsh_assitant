# 结构还清：主包尾部拆分与 dev 共享库归位

日期：2026-10-16 · 状态：**proposed**（2026-10-16 本人拍板范围 **P1+P2**——片 1-7，P3 片 8 不做；同日**已获点名授权实施**，推进/停点/证据缺口台账 = [结构还清收口卡](../../_backlog/issues/261016-structure-paydown-closure.md)；卡正文的实测修正见该卡「核验结论」，实施形态按它走）

## 问题（可观察行为）

**外部结果三要素：** 触发＝本人点名或点头本卡；本人得到＝「搜得到、改得动」的结构面——① 改桌面交互、账本归约或工具输出时定位进单一职责文件（≤ ~450 行），不再翻 633 行组合根与四个 500+ 行混杂文件；② dev 探针改动不翻 561 行三合一文件，会话日志判据与接续判据各有唯一家；③ 全程行为零变化（既有 spec 与门禁证明，模型可见面零触碰）。完成条件＝选定范围逐片验收绿、每片一提交锚点、收尾 `release-smoke` 绿。

2026-10-16 全仓结构评估（src/scripts/tests/dev 逐文件深读 + 分层依赖机械验证）结论：结构与分层是强项（76/76 文件头注、依赖方向零违规、测试树镜像源码、[261007-bigfile-split](../../_backlog/_archive/settled_issues/261007-bigfile-split.md) 已拆 host 1178→288 与 client 2950→13 模块、自设门全达标、TODO/FIXME 近零）。剩余阻力集中在以下尾部（行数实测）：

**主包（P1）：**

1. `src/client/index.ts` 633 行——组合根本可长，但 apply() 内嵌**四臂编排子系统**（launchDeskArm + 四臂 + evaluateReturn 分发 + settle 订阅与 30s 刷新，~290 行 ≈ 半文件），是 bigfile-split 未拆完的尾巴；seedPanelMessage 与 room-data-io 的 sendPrompt 重复同一条 prompt 调用形状。
2. `src/domain/operating/ledger.ts` 708 行——applyOperation 425 行单函数 if 链；"unknown-matter 拒绝 + 记录操作"样板逐字重复 ×6，operations 展开样板 ~×10。
3. `src/agent/tool-operating/index.ts` 586 行——~40% 为手写输出 schema 与模型文案（纯声明数据，抽离零风险）。
4. `src/client/desk-process.ts` 515 行——6 条共享门在 4 个 judge 内逐字复制 ×4；四条种子文案与判逻辑混居。
5. `src/client/room-data-io.ts` 462 行——两读取器重复 ~30 行"解析→校验→报告→settle"序列；7 个动作文案包装混杂 I/O。
6. 时间格式化 4 份（projection-panel 内 pad 族 ×3 + room-data-core.shortTime 跨文件同款）。

**dev 面（P2）：**

7. `dev/reports/usage-report.mjs` 抽屉错位——名为报告，实为被 5 个文件跨目录 import 的会话日志库（`classifyUserMessage` 注释自证"判据必须只有一份，各写一份已漂移过两次"）；`dev/eval/continuity-run.mjs` 的判据核被 probes/web 反向 import——dev 缺一个共享库抽屉。
8. `dev/probes/web/desk-process-e2e.mjs` 561 行单文件装 flow/claim/wake 三个探针，相位骨架重复 ×3；"按文案找按钮"内联表达式在 6 个探针 ×28 处（~100-150 行）；DSH_HOME 解析样板连同解释注释 ×5。

**可选（P3，拍板时裁）：**

9. `scripts/checks/verify.mjs` 553 行——~150 行内联检查体（resolution facade / self-containment / home 文档合同 / skill-name 语法 / commit safety）违背 scripts 分层纪律（"纯核放 `gates/<family>.mjs`，verify 只管语料/退出码"）。

## 提案

三波八片，每片＝一次独立提交（硬规则 6 锚点）+ 窄证据门；全部为行为零变化重构（不改合同/文案/导出面；不动模型可见面 → 不需要 eval 与 gen-catalog）。逐片验收状态记在本卡验收节（本人 2026-10-12 拍板允许授权卡自带验收视图）。

### P1 主包（价值最高，先行）

**片 1 · agent 工具 schema 抽离（机械，热身）**
`tool-operating/index.ts` 的输出 schema（**189–348 行 = 160 行**，自足：块内零引用本地常量或类型）整体抽 `tool-operating/schema.ts`，导出 `OPERATING_OUTPUT_SCHEMA`；工具定义、DESCRIPTION、`parameters` 块与伴生输出类型（`DeskItem`/`OperationSummary`/`MatterProposalSummary`/`OperatingOutput`）都留在 index.ts（catalog 的源码列不变）。586 → 428（实测，验收断言 ≤450）。
门：地板（`pnpm typecheck && pnpm test && pnpm verify`）+ `pnpm test:agent` + **搬家逐字证明**（新文件内容 vs `HEAD` 原块**去缩进后**的 byte-diff）——该 schema 不被任何 spec 钉住（`tool-operating.spec.ts` 对 `schema` 零引用），逐字证明是唯一硬证据；再加 `pnpm test:composition` 兜住注册期的 `assertSupportedJsonSchema`（schema 破损会在注册时抛错）。

**片 2 · ledger 归约器重构**
applyOperation 由 414 行单函数改为「每操作具名 handler + 判别标签 switch 分发」（闭集以 `assertNever` 收口），提 `rejectWith` / `recordOperation` 消 8 处拒绝样板与 10 处状态写点；领域词汇（15–216 行）抽 `domain/operating/types.ts`（块内唯一的非类型函数 `carryTimes` 归位到 ledger.ts 底部助手区），ledger.ts 原位 re-export 保持 import 面零变化（import 面恰好 5 个文件，实测）。**708 → 519 + 196**（实测；总行数近乎持平——收益在定位：414 行函数变 24 行分发 + 8 个窄 handler）。
形态选择：映射式 handler 表在 `strict` 下需要一次函数型断言（参数逆变），故改用闭集 switch——每个 handler 保住自己收窄后的类型，并符合本仓/上游「判别标签用 switch、闭集以 `assertNever` 收口」的既有约定。
前置（已实测触发）：`unknown-matter`（6 处）与 `proposal-not-pending`（2 处）在 operating-ledger.spec 中**零覆盖**（spec 只断言 5 个拒绝原因里的 3 个）；另补第三条守 `reject` 分支自身的负例（缺席 matter 的理由与 matterId 回显、重复 reject 不得覆盖既有 resolution）——三条均造红→绿。
门：地板（`pnpm typecheck && pnpm test && pnpm verify`）+ `pnpm test:domain && pnpm test:host && pnpm test:agent`（operating-ledger.spec 是行为锚，原有断言零改动、只增三条）。

**片 3 · desk-process 门去重 + 时间格式化收敛**
提 `sharedGateReasons(input: ReturnJudgeInput)`：6 条共享门从四个 judge 里各一份收成唯一一份（四 judge 同取 `ReturnJudgeInput`，claim/wake 是它的子类型，接缝零类型体操）；四条种子文案连同三个输入类型抽 `desk-process-messages.ts`（**逐字搬迁 84 行**），judge 逻辑与交付文案分家。新 `client/format.ts` 收 5 个同族但输出各异的渲染（`humanTime`/`localDateKey`/`localDateLabel`/`localTimeLabel`/`shortTime`）+ 唯一 `pad2`——它们**不是同一个函数**，收敛的是家与 padding 重复 ×3，不是输出格式（消费方 projection-panel / room-data-core / panels / dom-utils 的 import 同 diff 更新）。入口 module map 同 diff 点名两个新模块。
实测：desk-process 515 → 425，room-data-core 357 → 345；新增 messages 94 + format 84。
门（实测顺序）：地板（`pnpm typecheck && pnpm test && pnpm verify`）+ `pnpm test:client` + **两场景** `pnpm web-expected`（各自隔离 home + 场景契约里的 `--wait-text`）。
顺序纪律（本仓已记的坑，[`docs/dev.md`](../../docs/dev.md) §五）：`tsc -b` 把 ESM 写进 `lib/client/index.js`、覆盖 tsdown 的 classic bundle——**改过 `src/client` 的片必须先 `pnpm build` 再跑 lib/ 消费型测试与 verify**；正确顺序 `typecheck → build → test → verify`。

**片 4 · room-data-io 分簇**
8 个动作文案包装（askRefresh / askStart / askApproveProposal / askRejectProposal / correctMemory / approveKnowledgePage / deprecateKnowledgePage / flagKnowledgePage）抽 `room-data-actions.ts`（消费方 panels / dom-utils / room-tabs / first-mile 的 import 同 diff 更新）。搬迁逐字证明：120 行里只差一行——`approveKnowledgePage` 原来直接读本模块私有的 `deskRemote`，迁出后改读导出的 `getDeskRemote()`（同一值、同一调用时机；编译器在迁移当场报出这处）。
两读取器共享的四件事各收成一份：`deskReadFn()`（取 reader + 缺 remote 的同一句提示）、`readDeskText()`（拆信封，并把「读抛了」与「文件不在」分开报——R6 的区分）、`NOT_A_DESK_MESSAGE`（同一句「不像 desk-refresh 写的」）、`settleLoadedDesk()`（settlePending + retireStaleReceipt 尾巴）。两个读取器**不合并**：走查态与绑定态的 seq/slice/misses 语义不同，合并即改行为。
prompt 形状收成 `panelPromptRequest(prefix, sessionId, text)`（`[面板] ` 前缀 + `mode: 'queue'` + `<prefix>-<ts>-<rand>`），**本片即完成合并**（`sendPrompt` 与入口的 `seedPanelMessage` 都用它）——比卡上"留给片 5b"早一步，好处是 helper 当场有两个调用方而不是预建；片 5b 只需搬走 seedPanelMessage。
实测：room-data-io 462 → 394，新增 actions 132；入口 module map 同 diff 点名 `room-data-actions`。
同 diff 义务（卡上已标）：[`docs/architecture.md`](../../docs/architecture.md) 刷新链行的路径句已改为「`askRefresh`（`room-data-actions.ts`）→ `sendPrompt`（`room-data-io.ts`）」。
门（实测顺序）：地板（`typecheck → build → test → verify`）+ `pnpm test:client` + **两场景** `pnpm web-expected`（各自隔离 home + `--wait-text`）。

**片 5a · knowledge-approve 挂载外迁（低风险，先行锚点）**
`buildApproveContribution()`（纯函数，14 行）+ 挂载体（17 行，含 `const deskRemote = getDeskRemote()`）抽 `client/approve-mount.ts`，导出 `mountApproveRemote()`；入口改为一次调用。挂载体**零 ctx**（只用 `getDeskRemote()` + `patchDesk()`），故搬迁只需两处逐字搬运、无需参数化。
逐字证明：两段分别 `diff -u` → buildApproveContribution **IDENTICAL（14 行）**；挂载体连同 `const deskRemote` 行 **IDENTICAL（17 行）**，唯一差异是搬出 `apply()` 后的整体缩进（证明里归一）。三处 `console` 级别逐字保留（info / info / warn）——这是本片的承重面。搬走后入口不再用 `patchDesk`，其 import 同 diff 移除（编译器报出）。
实测：index.ts 634 → 593，新增 approve-mount.ts 62；入口 module map 同 diff 点名 `approve-mount`。
门（实测顺序）：地板（`typecheck → build → test → verify`）+ `pnpm test:client` + **两场景** `pnpm web-expected`（含空控制台契约，各自全新隔离 home + `--wait-text`）。

**片 5b · client 四臂子系统外迁（本波收口，风险最高片）**
新 `client/desk-arms.ts`（384 行，导出 `createDeskArms(deps)` 一个工厂）：launchDeskArm + 四臂（process/intake/claim/wake）+ seedPanelMessage（用片 4 的 prompt helper）+ evaluateReturn 四裁判分发 + settle 观察器 + 四路订阅 + 30s 定时刷新整体外迁。`client/index.ts` 594 → **339** 行（入口剩 facade 注册、座位接线、依赖表与工厂调用）；头注 module map 同 diff 更新（原称 desk-process 拥有四臂，现改为 desk-process = 臂的路径与判据、desk-arms = 四臂本身）。
形态 = **依赖参数化**，实测 **10 项** deps（`projection`/`reader`/`deskPath`/`uiWorkspace`/`uiSession`/`layout`/`workspaces`/`sessions`/`effect`/`viewActions()`），**逐项保留可选性**（如 `ctx.effect` 的有无仍决定订阅走不走浏览器路）；**工厂而非模块态**是本片的关键决定——launch 锁与绑定必须**每次 materialization 一份**，落模块级会被同页多个实例共享。`subscribe()` 由入口在原 effect 位置调用（注册与 dispose 顺序不变）。
面向 vendor 的依赖全走参数：经典脚本"无裸运行时 import"的硬约束由 `verify` 的 `clientScriptSafetyProblems` 守（本片绿）。
前置（已实测触发，但比"零覆盖"窄）：`client-entry.spec.ts` 已覆盖 intake 臂发射与 claim 臂接线面，**未覆盖** process 臂（Q11 重入）/claim 臂发射/wake 臂/`evaluateReturn` 分发与结算 → 先补特征 spec 并逐条造红（`865087a`），夹具留在 spec 内（只有一个消费者，不另立 harness；`tests/AGENTS.md` 禁止 spec 互相 import）。
门（实测顺序）：地板（`typecheck → build → test → verify`）+ `pnpm test:client` + `pnpm test:composition` + `pnpm preflight '<URL>'` + **两场景** `pnpm web-expected`（各自全新隔离 home + `--wait-text`）+ `pnpm shots '<URL>' --dom --size 1600x1000 --name desk-arms-extract` 落仓。

### P2 dev 面

**片 6 · probes/web 去重 + e2e 拆分**
片 6 分两次提交落地（同片 5 的锚点纪律）：**6a = 去重 + home 解析**（本次），**6b = e2e 拆分**。
**6a**：`dialogue.mjs` 增 `buttonByText` / `clickByText`（按 trim 后**精确**匹配为默认——子串匹配会被侧栏会话标题毒化，与文件头同一条教训；`exact:false` 与 `within` 是显式选择，`notFound` 让每个探针保住自己的措辞），把 **10 处**内联「按文案找/点按钮」下沉到 4 个探针文件；剩下 4 处不动且理由明确（3 处是按 aria-label 找发送键——另一种习语；1 处是 `'提交' || toLowerCase()==='submit'` 的大小写不敏感变体，本 helper 表达不了）。
DSH_HOME 解析样板收进 `dev/env/home.mjs` 的 `devHome(explicit)`（**6 个消费方**接上：preflight / eval:run / eval:domain-run / observe / desk-loop / usage；空串按"没给"处理，与 `eval/run.mjs` 原有判法一致），注释归一份；**该 helper 不读 `process.env.DSH_HOME`**（门禁扫 `dev/**/*.mjs`，只按精确路径放行 `dev/env/dsh.mjs`）。
**6b**：`desk-process-e2e.mjs`（557 行）拆成 dispatcher（222 行：CLI 面 `--scenario`、共享前置、判决 JSON 形状都不变）+ 三个场景模块（flow 191 / claim 100 / wake 69）；新建文件与 `dev/AGENTS.md` 抽屉表同 diff（dev-tree gate 守）。三段场景正文**逐字搬迁**（87+56+178 = 321 行，`diff` 0 差异、无归一化），只多了解构上下文一行与结尾的 `finish()` 调用。
**卡上"六步参数化臂执行器"本片不做**（有意的收窄，理由）：读过实际代码后确认它不是"三个平行骨架"——claim/wake 是提前 return 的条件支路、flow 是主体，且四个臂入口在**作用域**（desk 根 vs 全局）、**有无种子回合**、**投票选项**、**断言集**与**失败相位名**上都不同；真正的样板是"按文案找/点按钮"（6a 已下沉 10 处）与"退出尾巴 ×3"（本片抽成唯一一份 `finish()`）。再抽一个八参数执行器会把可 grep 的显式代码换成间接层，收益为负；这与[输掉的方案](#输掉的方案)里"只抽执行器不拆文件"被否的方向不冲突——导航与样板各自按真实重复处理。
门：地板 + `pnpm test:tooling`；6b 另跑 `node dev/probes/web/desk-process-e2e.mjs --scenario flow` 一次性 home 真跑退出码 0（探针自身判决即验据，走 keyless 回放夹具）。

**片 7 · dev/lib/ 共享库抽屉**
新 `session-logs.mjs`（sessionLogs / readEvents / classifyUserMessage / stripPanelMarker / userMessageText 从 usage-report 移出 ~100 行）；新 `continuity-core.mjs`（analyzeContinuity / assertSeed / ledgerProblems / sessionExpectations）；两文件落在新建的 dev/lib/ 抽屉；usage-report 回归纯报告 CLI、continuity-run 回归跑器；7 处消费方 import 更新；`dev/AGENTS.md` 抽屉表加 `lib/` 行（dev-tree gate 同 diff）。
门：`pnpm test:tooling && pnpm verify && pnpm usage`（真读 dev home 出报告即绿）。

### P3 可选（拍板时裁）

**片 8 · verify.mjs 内联检查体族核化**
五个内联检查体抽 `gates/<family>.mjs` + 负例夹具（prove-it-red：先夹具红、抽出后绿）。553 → ~300。
门：`pnpm test:tooling && pnpm verify`；新夹具红绿形态记在提交说明。

### 收尾（P1 完成即做一次；P2/P3 不动发布物）

`pnpm release-smoke`（主包片累积改了 lib/ 产物）。`gen-catalog` 不需要——动词/组合行/exports 零变化，verify 的 freshness 门守着，意外红了即停。

### 推进纪律

- 每片一提交、只 add 本片路径（硬规则 3/6）；死路即 revert 单片提交回锚点，原因记提交说明。
- 纯重构片的红绿机制 = 既有 spec 零改动全绿；覆盖缺口先补特征测试（片 2/片 5 前置）。
- 门实测（真跑过的命令）写提交说明，不回填本卡正文。

## 输掉的方案

- **client/ 子目录分组**（projection-\* / desk-\* / room-data-\* 三族进子目录）：现在做是纯 churn——命名前缀已可导航、tsdown 内联后 import 面收益为零、23 文件连同 tests import 的改动面不成比例。触发条件：client/ 文件数 > 30 或出现第四族。
- **learn/index.ts 的 schema 抽离**：评估结论"大而合理"（一工具 8 动作、写 case 同构薄适配）。触发条件：超 ~550 行再拆。
- **webui-shots 与 cdp-driver 两份 CDP 客户端合并**：重叠 60-90 行属实，但能力矩阵真有差（域启用/超时语义/发现通道/进程清理），合并是设计工作非机械抽取。触发条件：出现第三份 CDP 客户端或两份行为分歧出 bug，届时单独立卡。
- **ledger 用 mixin/继承拆**：消费面与类型身份耦合，handler 表 + 辅助函数比继承层次可测（bigfile-split S1 输掉的同款理由）。
- **单文件 tool-\*/ 目录扁平化**：每目录一 index.ts 统一可导航，扁平化零收益。
- **desk-process-e2e 只抽执行器不拆文件**：治样板不治导航——三场景仍混一文件；拆三模块 + dispatcher 保命令面不变，两者兼得。

## 验收

| 片 | 可执行验收（命令 → 断言） | 红的形态 | 状态 |
|---|---|---|---|
| 1 | `pnpm typecheck && pnpm test:agent` 全绿；`wc -l packages/dsh-smart-assistant/src/agent/tool-operating/index.ts` ≤ 450 | typecheck 红（import 断）或 tool-operating.spec 红（schema 形状变） | 未开工 |
| 2 | `pnpm typecheck && pnpm test:domain && pnpm test:host && pnpm test:agent` 全绿，operating-ledger.spec 零改动通过 | 任一层红 = 归约行为变（回执序 / operation 记录） | 未开工 |
| 3 | `pnpm typecheck && pnpm test:client` 全绿；共享门字面量在 desk-process.ts 内各只剩一处定义 | judge 相关 spec 红 = 门语义变 | 未开工 |
| 4 | `pnpm typecheck && pnpm test:client` 全绿，room-data-io spec 零改动通过 | io spec 红 = 读取/发送行为变 | 未开工 |
| 5 | 全链绿：typecheck → test:client → build → test:composition → verify → preflight → shots 落仓 | 任一环红 = 迁移丢接线 / 裸运行时 import / bundle 形状变 | 未开工 |
| 6 | `pnpm test:tooling && pnpm verify` 绿；`node dev/probes/web/desk-process-e2e.mjs --scenario flow` 退出码 0 | 探针 verdict fail = 拆分丢相位或丢断言 | 未开工 |
| 7 | `pnpm test:tooling && pnpm verify` 绿；`pnpm usage` 真读 dev home 出报告 | usage 空报告/抛错 = 日志读取层搬家丢行为 | 未开工 |
| 8 | `pnpm test:tooling && pnpm verify` 绿；新负例夹具先红后绿（记录在提交说明） | 夹具造不出红 = 抽离未保语义 | 不在本轮范围（P3 未授权） |
| 收尾 | `pnpm release-smoke` PASS | add/装载/组合断言红 | — |

排除：不做任何行为/合同/文案变更（含"顺手改进"）；不动 vendor/；不动运行 home；不整批改写既有注释语言。
