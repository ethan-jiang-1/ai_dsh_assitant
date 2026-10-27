---
topic: 技术
intent: "2026-10-28 六维打扫卫生深审：四路 fresh 只读审计 + 主线逐条复核 + 真机取证，给下一轮改善提供分级证据、误报纠正与边界。"
---

# 六维深审（2026-10-28）：骨架立住，接缝在腐

> 触发：用户 2026-10-28「还需要持续跟进…先评估一下这六个维度…先充分地把问题挖掘透」。
> 方法：四路只读 fresh 审计（入口链 / 代码 / 测试 / 反馈通路）+ 主线逐条复核 + 真机取证；审计基线 `ebbd608`。
> 机器基线（审计时）：`pnpm test` **144 文件 / 1084 测试全绿**；`pnpm verify` **48/48**；`pnpm eval:continuity` **PASS**（35s）；
> `pnpm eval --only first-open-intake` **PASS**（17s）；`pnpm start` → preflight 绿 → `pnpm shots` 产出真 PNG/DOM。
> 处置：机械真相修复已提交 `5cb43b8`（14 文件，+27/−45）与 `21dab8d`（删退役组件 165 行）；跨切片改善见
> [proposed 卡](../../../notes/proposed/2026-10-28-six-dimension-continuous-improvement.md)。

## 一、六维判定

评分是**判断**，不是门禁读数；10 = 没发现问题。

| 维度 | 健康度 | 立住的证据 | 拉低的原因 |
|---|---:|---|---|
| 1. 文档/代码清晰度、渐进披露 | 7/10 | owner 表、tier、README「按问题找」、48 条链接/命令门禁；断链 0 | 根 `AGENTS.md` 27.9KB / 221 行 / 40 条命令，命令表 76 行（34%）；两个大合同无目录；命令参数形状漂移 |
| 2. 代码结构层次 | 7.5/10 | `domain` 叶层 0 反向依赖；feature 目录 + 平铺内部件可预测；0 TODO/FIXME；大文件多为深模块 | `cli` 反向依赖 host 内部件；`desk-projection` 跨行直读账本归档；697 行 CLI 浅门面；366 行面板单函数 |
| 3. 文档-执行-验收整体结构 | 9/10 | 外部结果三要素、plan/todo、test-first、证据地图、收口卡、note 生命周期；每层有唯一 owner | 仪式面很重；不要再用新增流程层解决流程问题 |
| 4. 上下文腐化/偏移 | 7/10 | 门禁全绿、tests 全绿、0 活跃 issues/bugs、notes 状态干净、无死链、无 TODO | 接缝处有真漂移：identity 的 bin 禁令、夹具 opt-in 后的 runbook、退役组件的死码、命令形状、计数「both」 |
| 5. 测试资产组织/覆盖/类型 | 8/10 | 7 层 × 143 spec / 1080 测试；负例密集；0 skip/only；真 Loader 组合；冻结 v19 fixture | 客户端无真 DOM 重渲染；纯核 `ledger` 无直接 spec；coverage 无机器读数；web-face 手工且曾不可复现 |
| 6. 反馈通路（日志/端到端/复现） | 8/10 | 会话日志、usage/desk-loop、eval/continuity、preflight、shots、web-expected、8 个 web-face 场景；真机取证通过 | refresh 无健康门；eval 缺 key 记 FAIL；无 Chrome 的 smoke 跳过即绿；projection-live 前置只写在脚注 |

**结论**：不是全仓腐化，而是**高 churn 的接缝腐化**。骨架、门禁、依赖方向与测试地板都立住；
最近 8 天 221 个提交把新增事实推到合同边缘，语义门禁看不见这些边缘。

## 二、立住的部分（先说不该动的）

- **依赖方向干净**：`src/domain` 对包内其他层 0 import；host/client/agent/cli 向下；无运行期环。
- **测试地板厚**：143 文件 / 1080 测试；host harness 被 23/34 个 host spec 复用；0 `.only`/`.skip`、0 snapshot、0 `vi.mock`。
- **门禁真的抓人**：48 条 verify；本轮改动后仍 48/48。历史审计多次记录「门禁抓修」而非事故。
- **台账干净**：`_backlog/issues/` 与 `_backlog/bugs/` 无活跃卡；`notes/proposed/` 只有一张在飞的数据生命周期卡；无悬空笔记链接。
- **真页面能看见**：`pnpm start` 交付实例 → preflight 绿 → `pnpm shots` 出 `1600x1000` PNG 与 DOM；种子场景 `web-expected` 在正确夹具下 **PASS**。
- **行为评测能跑**：`eval:continuity` PASS（读对事项 → 权威读回 → 先读后答 → 无授权写入）；`eval --only first-open-intake` PASS。
- **代码里没有腐烂 TODO**：`src` 0 个 `TODO/FIXME/XXX/HACK`；退役词集中在手册迁移与旧技能格式，是有意兼容。

## 三、已核实的腐化点

### 已修（`5cb43b8` / `21dab8d`）

| 级别 | 位置 | claim → fact |
|---|---|---|
| P1 | `docs/identity.md` | 「包不得带 `bin`」→ `package.json` 实际有 3 个工具 bin；release/delivery 依赖它们。改成「不新增起 DSH 的应用入口；工具 CLI 随包」 |
| P1 | `snapshots/web-face/desk-eight-matters-first-open/README.md` | 夹具已改为 opt-in，runbook 仍按旧默认起服务；按文档跑必红（实测 `timeout: 还有 7 件`），加 `--patch dev/probes/web/projection-fixture.patch.yml` 后 PASS |
| P2 | `docs/testing.md` ×3、`docs/dev.md` ×1 | `pnpm web-expected --scenario <场景>` 缺 `<URL>`；CLI 会把场景名当 URL，命令必失败 |
| P2 | `packages/dsh-smart-assistant/AGENTS.md` | 「`src/agent/` 子目录各对应一个 exports 行」→ `tool-support/` 无导出，是共享内部件 |
| P2 | `bin/assistant-data.mjs` | JSDoc Usage 把 seal/unseal/merge 重复三遍且丢 `*`；运行时 `usage` 才是正确唯一份 |
| P2 | `src/client/rooms/tasks-view.ts` + spec | 文档已记「会话内任务 tab 退役」，组件无注册、无引用，只剩自测；删除 165 行 |
| P3 | `docs/home.md` | 标题「两个文件」但根上还有 `skill-usage.json`、`ui-mode.json`；改「两个语义文件（另有机器账本）」并把 `ui-mode.json` 入布局图 |
| P3 | `docs/architecture.md` | 当前合同里写「2026-10-24 退役」违反 docs tier 的「只写现在」；改为现状句；补 `operating-receipts` route |
| P3 | `docs/release.md` / `README.md` / 包 README | `dsh plugin add` 缺必需的 `--profile`；统一成 `dsh plugin --profile <p> add <spec>` |
| P3 | `.agents/skills/pre-push-evidence/SKILL.md` | 「re-run **both** web-face scenes」→ 现有 8 个场景；改「all，清单以 `snapshots/web-face/` 为准」 |
| P3 | `dev/probes/web/projection-selection.mjs` | 头注称 shots 对 eval 抛错只记日志且 exit 0；现行为是硬失败 |
| P3 | `docs/dev.md` / 根命令表 | `projection-live` 的「自编排」未写 `prepare/setup` 前置；补上 |

### 开放（本轮不修，已进 proposed 卡）

| 级别 | 位置 | 事实 | 风险 |
|---|---|---|---|
| P1（上下文税） | 根 `AGENTS.md` | 27.9KB / 221 行 / 40 条命令；命令表 76 行、9.5KB。过去 33 天从 11.7KB/13 条长到 27.9KB/40 条；门禁注释自己写着根表「must stay short」（2026-10-28 S1 已交付：根 180 行 / 21.4KB / 7 条，参考表迁 `docs/commands.md`） | 每个新会话先付 ~8–10k tokens；参考型 runbook 挤占常驻指令 |
| P2 | `dev/probes/web/webui-expected.mjs` refresh 分支 | `--refresh` 只写文件，不校验 `readyState` / `consoleErrors` / `networkFailures`；这些又是比对字段（2026-10-28 S2 已交付：refresh 健康门 + expected 健康门；场景仍手工） | 一次误 refresh 可把坏页面固化成基线，此后永远 PASS；web-face 不在 verify 里 |
| P2 | `dev/eval/run.mjs` | 无会话日志 → `passed:false`，与「模型没做对」同一条 FAIL；docs 明写缺 key 不能算行为红（2026-10-28 S2 已交付：无日志 BLOCKED exit 2，实测） | 凭据失效时 agent 会去改 prompt/任务（BUG-024 已发生过一次） |
| P2 | `scripts/release/web-install-smoke.mjs`、`standalone-smoke.mjs` | 无 Chrome 时前者 `exit 0`，后者打印 `passed`（UI 半场没跑）（2026-10-28 S2 已交付：web-install/release-smoke 实测 exit 2；standalone 静态改） | 「release smoke 绿」可能是假绿，违反 blocked 不入绿名单 |
| P2 | `src/cli/assistant-data-*.ts`、`src/host/desk-projection/receipts.ts` | cli 以 value import 取 `host/operating-ledger/archive.ts`；desk-projection 跨行直读同一归档格式，绕过 ledger 服务 seam（2026-10-28 S3a 已交付：格式移入 `domain/operating/archive.ts`，消费方改指） | 账本格式知识散在三处；改格式会漏消费方；与 `docs/architecture.md` 的「cli = domain + yaml」不符 |
| P2 | `src/client/projection/projection-panel.ts` | 单函数 366 行，含 simple/board/activity/detail 四态与局部标签表 | 改一态要读整文件；面板 spec 只能整文件断言 |
| P2 | `src/cli/assistant-data.ts` | 697 行、六类命令 + 底部长 re-export，兼作事实上的第二 barrel | 浅门面；新增命令继续往里堆 |
| P2 | `src/domain/operating/ledger.ts` | 562 行纯核，但无直接 spec；只经 host 服务与 projection 间接覆盖 | 归约器坏了要靠整包 boot 才红；locality 差 |
| P2 | 客户端测试 | React shim 的 `useState` 返回 `[initial, vi.fn()]`、`useEffect` no-op；无 DOM 重渲染 | store 订阅/重渲染坏了仍可绿；web-face 只覆盖少数静态态 |
| P3 | `docs/package-catalog.md` / 生成器 | 自称「包形状目录」但不收 3 个 bin 与 `engines.pnpm` | 「以 catalog 为准」在包能力面不完整 |
| P3 | `docs/architecture.md` / `docs/dev.md` | 365/369 行、41/44KB，只有 `##` 级标题；README 只补偿 4 个节（2026-10-28 已补读法索引） | 找 §六/§八要滚文件 |
| P3 | `dev/lib/session-logs.mjs` + usage/desk-loop | 缺 zstd 时直接抛栈；单条坏日志可让整份报告崩 | 日志读方没有像 prompt-smoke 那样的前置说明 |
| P3 | `snapshots/web-face/*/snapshot.yml` | `runner:` 行像命令，实际是占位；CLI 不读 snapshot.yml | 复制即失败；场景契约有两处说法 |
| P3 | `docs/testing.md` 分层表 | 「host = 真 cordis + 临时 home」以偏概全；`ui-mode-route`、`desk-projection-download` 直接测 route（2026-10-28 已改为「多数真 cordis，route 核可直测」） | 新读者会以为 host 层全要 boot |
| P3 | 「纯核」措辞 | `src/domain` 不 import DSH 运行时（真），但 8 个文件做 fs I/O | 术语与事实有缝；不是代码 bug |

## 四、最值得警惕的三条

1. **常驻上下文在单调增长**。根 `AGENTS.md` 从 11.7KB/13 条命令长到 27.9KB/40 条（33 天，2.4×）；README 从 5.7KB 长到 12.8KB。
   每次加功能顺手加一行命令，门禁只保「别名有文档」，不保「入口要短」。这不是某一次写错，是**棘轮**。
2. **唯一的真页面回归面没有自动门禁**。web-face 8 个场景是手工脚本；`--refresh` 不挡坏状态；verify 不跑浏览器。
   `test/verify` 全绿只能证明规则与组装，不能证明页面没坏——本轮实测的 runbook 失效就是活例。
3. **环境红 / 行为红 / 跳过 三件事混在退出码里**。eval 缺 key 记 FAIL；无 Chrome 的 smoke 记绿；standalone 跳过 UI 仍 passed。
   这会让 agent 在错误的方向上「修」，或者把没跑的检查当跑过。

## 五、改善路线（详见 proposed 卡）

- **S1 入口瘦身**：把 35 条参考命令从根 `AGENTS.md` 移到 docs/commands.md（提案中的新文件）；根只留启动五步 + 日常四条 + 指针。
  目标：根降到 ~18KB；命令只有一个清单 owner；`docs-commands` / 启动门禁保持绿。
- **S2 反馈诚实性**：`--refresh` 健康门（complete + 两错误列表空）；eval 无 key/无日志 → BLOCKED（exit 2）；
  无 Chrome 的 release smoke → BLOCKED；standalone 不再在 UI 半场跳过时打印 passed；expected DOM 健康检查。
- **S3 代码接缝**：把 `operations-archive` 格式与解析收进 `domain/operating`，cli 与 desk-projection 消费它；
  拆 `projection-panel` 四态（props 不变）；拆 `assistant-data.ts` 按命令。
- **S4 测试缺口**：`applyOperation`/`reviveLedgerState` 纯核 spec；真 DOM 交互（jsdom/happy-dom + React）或把
  projection 探针固化为门；coverage 只报告、先不设阈值（沿用「先纪律后机器门」的既有触发）。

顺序：S1 → S2 → S3 → S4。S1/S2 先做，一个降上下文税、一个堵假绿；S3/S4 各自独立可回退。

## 六、明确不做与触发条件

- **不重写入口、不拆所有大文件**：只动有证据的三处（cli 门面、面板四态、账本读 seam）。
- **不新增流程层**：问题不是缺结构，是接缝缺最后一道诚实的检查。
- **不立刻换掉 React shim**：先加最小 DOM 环境或把现有探针变成门；全浏览器栈的依赖与维护成本另立卡。
- **coverage 机器门**：沿用 `docs/testing.md` 的触发——第一处「删了才对」的死代码实证后再上 per-file 阈值。
- **session 回放**：沿用 `snapshots/README.md` 的触发；不在本轮预建。

## 七、审计方法与误报纠正

四路审计里混着推测；以下经主线复核后**不成立**，不写进 findings：

- 「continuity 红绿对照没挂 verify」——`package.json` 的 verify 链有 `continuity-run.mjs --self-check`；审计员只看了 `verify.mjs`。
- 「blank 场景基线带模态框 = 坏基线」——场景 README 明写「首开预览说明在场」，模态框是该场景的合法状态。
- 「coverage 写 per-file 100% 但没配置」——`docs/testing.md` 写的是「先纪律后机器门」，没有声称机器门已建。
- 「19 个 plugin 子路径」计数错误——19 个入口（含根 `.`）与 exports 一致，问题只是把「入口」叫成「子路径」的措辞。

**真页面取证的红绿**：同一隔离 home、同一 seed，缺 `--patch ...projection-fixture.patch.yml` 时 `web-expected` 超时红；
补上后 `PASS — matches`。这条同时证明了「反馈通路可用」与「文档会骗人」，也是 S2 的立项依据。
