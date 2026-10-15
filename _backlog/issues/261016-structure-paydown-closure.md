---
status: 推敲中
opened: 2026-10-16
---

# 推敲：结构还清收口——P1+P2 片 1–7 推进台账

> 立卡：2026-10-16 ｜ 状态：推敲中 ｜ 类型：Task ｜ 可关闭：否 ｜ 授权：2026-10-16 本人点名实施[结构还清规格卡](../../notes/proposed/2026-10-16-structure-paydown.md)的范围 **P1+P2（片 1–7）**，P3 片 8 不在本轮。本卡是该授权的**推进台账**（切片推进、停点与证据缺口住这里）；规格卡正文只承载问题/方案/取舍/验收（分工 = [收口卡节](README.md#收口卡)）。

**问题与期望结果：** 全仓结构评估的尾部阻力已毕业为[规格卡](../../notes/proposed/2026-10-16-structure-paydown.md)四节齐全的提案，本卡只负责把它推成已交付事实。
外部结果三要素（动手前定，交付按它收口）：**触发** = 本人点名（2026-10-16 已给）；**本人得到** = 「搜得到、改得动」的结构面——① 改桌面交互、账本归约或工具输出时定位进单一职责文件（≤ ~450 行），不再翻 633 行组合根与 500+ 行混杂文件；② dev 探针改动不翻 561 行三合一文件，会话日志判据与接续判据各有唯一家；③ 全程行为零变化（既有 spec 与门禁证明，模型可见面零触碰）。**完成条件** = 片 1–7 逐片验收绿、每片一提交锚点、收尾 `pnpm release-smoke` 绿。

**当前情况：** 动手前做过一轮独立核验（2026-10-16，逐条实测）：规格卡的行数与结构事实**全部吻合**（586/708/633/515/462/561/553、4 judge、6 门 ×4、applyOperation 414 行、usage-report 5 个 importer 等），并核出 **7 处前提修正与 2 处规格卡未载的义务**，全部落进下面的「核验结论」与验收标准；实现形态按核验后版本走，不按规格卡的原始形状走。基线已实测：`pnpm verify` 41 检查绿、`pnpm usage` 真出报告。

**未决问题：** 无待本人裁决项（纯重构，无口味/业务输入）。三处**尺寸**未知——片 4 两读取器的精确重复行数、片 6 三段相位骨架的真实差异点、片 5b 抽完后 `evaluateReturn` 的实际行数——在对应片的提交说明里记实测值；三者都只影响片的体量估计，不影响门与结构，不阻塞推进。

**下一步：** agent 按验收标准逐片实施，每片一次提交、地板门全绿；片 1–5 为主包（先行），片 6–7 为 dev 面，收尾跑 `release-smoke`。

## 核验结论（2026-10-16 实测，规格卡七处修正）

1. **片 1 有真隐患，卡的"纯声明数据、抽离零风险"不成立。** `output.schema`（177–350 行 ≈174 行）引用 `CHANGE_KINDS`（32 行），而该常量同时被留下的 `parameters` 块使用 → 朴素抽取会造出 index↔schema 的 **ESM 循环**（模块求值期消费的 `const` 数组）。**`CHANGE_KINDS` 必须随 schema 一起进 `schema.ts`**，由 index.ts 反向 import。另：`output.schema` 不进标准工具面投影（`schemaOf` 只取 name/description/parameters/deferLoading），但经 `sdkSchemas()` 进 **PTC 模式 SDK 契约**（`ts-types.ts`/`py-types.ts` 生成模型读的类型声明）；本包未声明 PTC，故暴露是条件性的。注册期 `assertSupportedJsonSchema` 是粗错兜底。
2. **片 1 的证据缺口确认：没有任何 spec 钉住该 schema。** `tests/agent/tool-operating.spec.ts` 对 `schema` 零引用；`tests/composition/preset-composition.spec.ts:322-341` 只用 `ctx.tools.schemas()` 断言工具**名**。→ 搬家逐字证明是唯一硬证据（形态见验收标准第 1 行）。
3. **片 2 前置确认触发，且样板多于卡载。** `unknown-matter` 6 处（328/411/468/530/567/654，= 卡的 ×6 ✓）与 `proposal-not-pending` 2 处（605/658）spec 覆盖**均为 0**（spec 只断言 5 个拒绝原因里的 3 个）；`operations` 展开样板实为 **13 处**（卡写 ~10），且有 `state: {…}` 包裹式与裸式两种惯用形。类型块 15–208 行；ledger 的 import 面**恰好 5 个文件** → 原位 re-export 让这 5 个零改动。
4. **片 3 卡完全正确，且接缝干净。** `ClaimJudgeInput`/`WakeJudgeInput` 均 `extends ReturnJudgeInput` → 四 judge 同一输入类型，217–224 与 284–291 逐字相同（6 行）；`sharedGateReasons(input: ReturnJudgeInput)` 零类型体操。附带好处：四段 docstring 现在用散文承诺 "Same shared gates as the other arms"，抽取把注释承诺变成受门禁保护的代码。
5. **片 4 计数偏小，且有规格卡未载的 docs 派生义务。** 动作文案包装实为 **8 个**（askRefresh/askStart/askApproveProposal/askRejectProposal/correctMemory/approveKnowledgePage/deprecateKnowledgePage/flagKnowledgePage）；`sendPrompt` 与 `seedPanelMessage` 确为同款形状（`[面板] ${text}` + `mode:'queue'` + `requestId: <前缀>-<ts>-<rand>`），但**前缀不同**、`sessionId` 在 sendPrompt 可选 → 统一 helper 必须把 `requestIdPrefix` 作入参才叫零变化。**`docs/architecture.md:288` 明写刷新链是「刷新」→ `askRefresh` → `sendPrompt`（`src/client/room-data-io.ts`）——片 4 一动这行即成假，必须同 diff 更新**（`verify` 只查链接存在，查不出句义漂移）。
6. **片 5 前置触发但比"零覆盖"窄，真陷阱写在文件头。** `client-entry.spec.ts` 不点臂符号名，但其「＋ 交代新事项」用例（204–235）用手搭假 ctx 驱动 `apply()` 跑通 **intake 臂发射**并断言 `onClaim` 已接线 → 已覆盖：intake 臂发射、claim 臂接线面；未覆盖：process 臂（Q11 重入）、claim 臂发射、wake 臂、`evaluateReturn` 分发/结算/定时器。deps 袋 ~9 项（`uiWorkspace.openSession`×5、`uiSession.sessionStatus`×3、`uiSession.current`×2、`layout.panelInfo`×2、`workspaces.list`、`sessions.list`、`sessions.create`、`layout.selectPanel`、`effect`）+ 闭包 `projection`×14/`deskPath`×10/`reader`×6，**逐项可选性承重**（`ctx.effect` 有无决定订阅走不走浏览器路）。真陷阱 = 文件头 5–16 行自述：tsdown 把 `src/client` 内联成一个 classic script，约束是"**无裸运行时 import**"（`verify` 的 `clientScriptSafetyProblems` 守）→ 面向 vendor 的依赖必须全走参数。`buildApproveContribution()` 纯、挂载体零 ctx → **锚点拆 5a/5b**。
7. **片 6 两处计数不实。** "按文案找按钮 28 处 ×6 探针" 实测为 `querySelectorAll('button')].find(` **12 处 / 5 文件**；`devHome()` **不得读 `process.env.DSH_HOME`**（门禁扫 `dev/**/*.mjs`，只按精确路径放行 `dev/env/dsh.mjs`）。片 6 的大头是 e2e 拆分（561 行 ✓）。
8. **片 7 分层验证通过（唯一原样成立的 P2 片）。** `usage-report.mjs` importer 恰好 5 个；`continuity-run.mjs` 只 import `readEvents/sessionLogs` 与 `mkTmpDir`（不动），四个符号 `analyzeContinuity`/`assertSeed`/`ledgerProblems`/`sessionExpectations` 全部存在且为导出 → 计划中的 `continuity-core.mjs`（dev/lib/）**无回边进 dev/eval**，抽屉成立。

## 验收标准

行为分类（[validation-design](../../_backlog/methods/validation-design.md)）：七片全部是 **deterministic logic / orchestration**——无 model behavior（故**不建 eval**），无 human judgment（故不设本人裁决行）。每片的"通过信号"都是同一个总判据的实例：**既有 spec 与门禁零改动即绿**；差别只在"该改动面按证据地图加跑什么"。

| # | 行为（追溯到规格卡） | Class | 输入/状态 | 通过信号 | 负例/补集 | 证据 owner | 人的判断 |
|---|---|---|---|---|---|---|---|
| 1 | 工具输出契约逐字不变，仅换文件（片 1） | deterministic + orchestration | HEAD 的 `output.schema` 块 + 4 个伴生类型 + `CHANGE_KINDS` | 搬家块与新文件内容 byte-diff 为空；`pnpm test:agent` 绿；地板绿 | 字段改名/漏项 → 逐字 diff 非空；契约破损 → 注册期 `assertSupportedJsonSchema` 抛错 | `tests/agent/tool-operating.spec.ts` + `tests/composition/preset-composition.spec.ts`（工具名面）；逐字证明为**新增**证据 | 无 |
| 2 | 账本归约行为不变：回执序、拒绝原因、operation 记录（片 2） | deterministic | 全部 9 个 operation kind + 5 个拒绝原因 | 地板 + `test:domain`/`test:host`/`test:agent` 绿，`operating-ledger.spec.ts` **零改动**通过 | **先补** `unknown-matter` 与 `proposal-not-pending` 两条特征测试（当前覆盖为 0）——造红→绿后才许动样板 | `tests/host/operating-ledger.spec.ts`（583 行行为锚） | 无 |
| 3 | 四臂返回判据语义不变；时间格式化输出不变（片 3） | deterministic + client rendering | 6 条共享门 ×4 judge；`pad` 族 + `shortTime` | 地板 + `test:client` 绿；**两场景** `pnpm web-expected` 无漂移 | 门语义变 → `client-desk-process.spec.ts`（464 行）逐条红；格式变 → web-face DOM 漂移 | `tests/client/client-desk-process.spec.ts` + `snapshots/web-face/` 两场景 | 无 |
| 4 | 房间数据读取/发送行为不变（片 4） | deterministic + client rendering | 两读取器共享序列；8 个文案包装；prompt 调用形状 | 地板 + `test:client` 绿；两场景 `web-expected` 无漂移；`docs/architecture.md` 刷新链路径同 diff 更新 | io spec 红 = 读取/发送变；路径句不更新 = docs 与代码不一致（`verify` 查不出，靠本行守） | `tests/client/client-room-data-io.spec.ts` + `docs/architecture.md:288` | 无 |
| 5a | knowledge-approve 挂载通道行为不变（片 5a） | orchestration + client rendering | 纯函数 contribution + 零 ctx 挂载体 | 地板 + `test:client` 绿；两场景 `web-expected` 绿（**含空控制台契约**） | 日志级别由 info 抬成 error → `first-open-draft-banner` 场景红（2026-10-05 实录） | `snapshots/web-face/first-open-draft-banner` + `tests/client/client-commands.spec.ts` | 无 |
| 5b | 四臂发射/返回分发/结算订阅行为不变（片 5b） | orchestration | 9 项 deps（逐项保留可选性）+ 闭包 `projection`/`deskPath`/`reader` | 地板 + `build` + `test:composition` + 两场景 `web-expected` + `shots` 落仓 | 丢接线 → 新 `client-*harness.ts` 特征 spec 红；裸运行时 import → `verify` 的 `clientScriptSafetyProblems` 红 | 新 `client-*harness.ts` + 特征 spec（照 `default-panel-selection` 先例形态）+ `snapshots/web-face/` | 无 |
| 6 | 探针行为不变：三场景判决与 CLI 面不变（片 6） | deterministic（tooling） | `--scenario` 三场景 + 判决 JSON 形状 | 地板 + `test:tooling` 绿；`node dev/probes/web/desk-process-e2e.mjs --scenario flow` 退出码 0 | 拆分丢相位/丢断言 → 探针 verdict fail；新文件未进抽屉图 → dev-tree 门红 | `dev/probes/web/desk-process-e2e.mjs` 自身判决 + `dev/AGENTS.md` 抽屉表 | 无 |
| 7 | 会话日志判据与接续判据各有唯一家，行为不变（片 7） | deterministic（tooling） | `session-logs.mjs`/`continuity-core.mjs`（dev/lib/）；5 + 全部消费方 | 地板 + `test:tooling` 绿；`pnpm usage` 真读 dev home 出报告 | 日志读取层搬家丢行为 → usage 空报告/抛错；`continuity-run --self-check` 红 | `dev/reports/usage-report.mjs`（命令面）+ `dev/eval/continuity-run.mjs --self-check`（挂在 `pnpm verify`）+ `dev/AGENTS.md` 加 `lib/` 行 | 无 |
| 收尾 | 主包片累积未破坏发布物 | orchestration | `lib/` 产物 + 组合断言 | `pnpm release-smoke` PASS | add/装载/组合断言红 | `scripts/release/release-smoke.mjs` | 无 |

**地板**（每片收尾必绿）= `pnpm typecheck && pnpm test && pnpm verify`（[docs/testing.md](../../docs/testing.md) §一页证据地图首段）；上表只列地板**之上**按改动面加跑的项。client 面加跑"**两**场景"而非一场景，依据同表 client 行与 [validation-evidence](../../_backlog/methods/validation-evidence.md) 的路由表。

**排除（本轮不做）：** P3 片 8；任何行为/合同/文案变更（含"顺手改进"）；`vendor/`；运行 home；整批改写既有注释语言；`gen-catalog` 重生成（动词/组合行/exports 零变化，freshness 门守着，意外红了即停）；`pnpm build` 的产物入库。

## 收口记录（逐片）

| 片 | 提交 | 状态 | 真证据（命令 → 结果） |
|---|---|---|---|
| ① | — | 待做 | 本卡 + 活跃清单 + 规格卡授权指针（零代码） |
| 片 1 | — | 未开工 | — |
| 片 2 | — | 未开工 | — |
| 片 3 | — | 未开工 | — |
| 片 4 | — | 未开工 | — |
| 片 5a | — | 未开工 | — |
| 片 5b | — | 未开工 | — |
| 片 6 | — | 未开工 | — |
| 片 7 | — | 未开工 | — |
| 收尾 | — | 未开工 | — |

真证据（真跑过的命令、红绿形态、三处尺寸实测值）记在**该片的提交说明**；本表只留片的状态与指针，不复述命令输出（[notes/README.md](../../notes/README.md) §二之三第 3 条）。

## 证据索引（不复述，点进去看）

- 规格卡（问题/方案/输掉的方案/逐片验收）：[结构还清规格卡](../../notes/proposed/2026-10-16-structure-paydown.md)
- 证据路由：[docs/testing.md](../../docs/testing.md) §一页证据地图；判断细则与假绿清单 = [pre-push-evidence 技能](../../.agents/skills/pre-push-evidence/SKILL.md)
- 抽法先例（依赖参数化的纯核模块 + 同名 spec）：`refactor(client): isolate default panel selection`、`refactor(client): isolate desk settle refresh lifecycle`
- 合同面（被移动结构涉及的 docs）：[docs/architecture.md](../../docs/architecture.md)（§七/§八 运行链路与功能路由）、[docs/operating.md](../../docs/operating.md) §三

**关闭条件：** 片 1–7 逐片验收绿 + 收尾 `pnpm release-smoke` PASS → 规格卡正文改写为已交付事实（`proposed` → `implemented`），本卡头部写 `可关闭：是` 并按 [backlog 关闭条件](../README.md)归档进 `_archive/settled_issues/`。
