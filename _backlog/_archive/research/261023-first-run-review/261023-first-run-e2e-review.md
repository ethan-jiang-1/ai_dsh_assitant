---
topic: 定位
intent: "一页纸落地后的端到端复核：哪些计划真的落地、质量如何、测试资产还缺什么。"
---

# 首开「一页纸」端到端复核

> 2026-10-23。复核对象 = `6c161e6` + `0bd793c`，以及本轮复核中修掉的工作树改动。
> 方法 = 干净 home 真机 E2E + eight-matters 种子交互 + 两轴代码评审（Standards / Spec）+ 测试资产盘点。
> 边界：1–2 个 live home、无真人；模型有方差；注入/单测覆盖的状态不冒充实机。
> 计划面 = [决定 note](../../../../notes/implemented/2026-10-23-first-run-one-page.md) 与
> [已结收口卡](../../settled_issues/261023-first-run-ux-reframe.md)。

## 0. 结论

- **主链已落地、可用。** 干净 home 说一句 → 25 秒自动出一页（账本写入后 1 秒可见，比回合结束早 11 秒），
  页形（结论 / 三条路 / 建议 / 缺数 / 复查日）正确；刷新持久；「全部」人读列表、选中回页、看依据、
  窄视口、调试 tab、待审卡都走通。
- **质量：主链合格，但有两个 P1 语义缺口。** 「就这么办」目前只是把一句话交给助手，不批准备忘、不选选项；
  「看依据」只展开 evidence，不直达 decision-memo。另有若干文案/命名/资产债。
- **测试资产：主线单测够，交互面不够。** 976 个单测 + 2 个 web-face 静态场景 + 11 个可评 eval；
  但 **旧交互探针大面积过期**（仍找 `[data-assistant-operating-desk]` / 「处理这件事」/「交代新事项」），
  web-face 没有列表/看依据/动作/调试/窄视口的交互场景，eval 的「一问」上限实际是 2 个问号。
- **本轮已修 6 个硬问题 + 4 个真实 UX 缺陷**（见 §4），其余按 §6 排优先级。

## 1. 复核计划与矩阵

| # | 场景 | 怎么跑 | 判据 | 结果 |
|---|---|---|---|---|
| 1 | 空 home 首屏 | 干净 home，1600×1000 | 一问 + 3 示例 + 一个输入；无看板/流水/建议 | PASS（截图 `ux-e2e-empty`） |
| 2 | 说一句 → 自动出页 | 首页输入；记录发送与出现时间 | 不刷新自动出现；≤5 分钟 | PASS：发送 22:18:48 → 账面 22:19:12 → 页面 25s；回合 22:19:24 结束（页早 11s） |
| 3 | 刷新持久 | 同一 home 直接重载 | 页仍在；无 console/network 错误 | PASS（`ux-e2e-reload`，两错误计数 0） |
| 4 | 全部列表 | eight-matters 种子，点「全部（8）」 | 8 行；标题/状态/复查/摘要首行；无筛选/流水/建议 | PASS（`ux-e2e-list`） |
| 5 | 选中回页 | 列表点「回款 B」 | 回一页纸并显示 B | PASS（`ux-e2e-select`） |
| 6 | 看依据 | 点「看依据」 | 就地展开 evidence；有「打开它记下的」 | PASS，但**不直达 decision-memo**（见 P1） |
| 7 | 页面动作 | 点「先放着」 | 在途卡可见；账本真变 | PASS：`next_checkpoint` 2026-11-06 → 2026-10-30，revision 2；在途卡 `ux-e2e-action-click` |
| 8 | 在途空态 | 新干净 home 发送后 4s | 只显示「我在办这件事」，不再叠空态提问 | **修前 FAIL**（`ux-e2e-stack-before`）→ **修后 PASS**（`ux-e2e-stack-after`） |
| 9 | 窄视口 | 800×600、420×900 | 内容可读、输入可用、无横向溢出 | PASS（`ux-e2e-narrow-clean` / `ux-e2e-mobile`）；600 高度时输入在折叠下方，需滚动 |
| 10 | 调试默认不可见 | 正常 URL 的 DOM | 无「开发调试」 | PASS（DOM 0 命中） |
| 11 | 调试可开 | `#debug=1` + 会话视图栏 | 只读 tab：投影/revision/ledgerId/session/JSON | PASS（`ux-debug-tab3`） |
| 12 | 待审/挂起在常用面 | 第二个 live home（2 页草稿 + 待批操作） | 两张卡在页上方，可去审批/去会话 | PASS（`ux-one-page-second-reload`） |
| 13 | 旧首用探针 | `pnpm loop-probe` 的断言面 | 首屏仍按旧桌面 | **FAIL（预期）**：选择器过期，见 §5 |

## 2. 落地核对（A–E）

| 片 | 计划 | 现状 | 证据 |
|---|---|---|---|
| A 首答合同 | draft-first、一问一动、≤400 字、页进 summary、chat 是指针 | 落地 | manual v19 + `management-breakdown`「Land it」+ `[首页]` lane；5 题 eval 全 PASS；live 页 300+ 字短行 |
| B 数据形状 | v0 用 summary + decision-memo，不加 v3 `brief` | 落地，零 schema | live 首件 `ledger.json`；memo 由 `assistant_reflect save_page` 写入 |
| C 一页纸 | 空态/首件/稳定态/异步/三按钮 | 落地（首版） | §1 的 1–9；web-face blank/eight 重录 PASS |
| D 三层 | 常用/深看/调试；审批/错误永在常用面 | 落地（首版） | 一页纸 + 列表 + 完整看板 + 调试 tab；待审卡在页上方；默认无调试 |
| E 调试面 | dev flag、字段、客户默认不可见、只读 | 落地（首版） | `#debug=1` 真机；默认 DOM 无；字段齐全 |

**没有完全落地的计划项**：深看面的 memo 直达、列表的搜索/删除、三按钮的**直写 host 动作**（当前走助手回合，已真跑批准备忘与核对点）、
Day-0 dock 卡与首页的「两张首开面」（计划说不需要第二张卡）。

## 3. 端到端时间线（主证据）

```
22:18:48  send（turn/start）
22:19:12  ledger 写入（matter.summary + decision-memo）
22:19:13  页面自动出现（发送后 25s；轮询在账面变化后 ~1s 刷到）
22:19:24  turn/end（completed）
```

结论：页不再等回合结束；25 秒是模型出页的真实时间，不是 UI 等待。

## 4. 质量发现

### 4.1 本轮已修（工作树）

| 问题 | 修法 | 证据 |
|---|---|---|
| 在途卡叠在未变的空态提问上（两张面同时在场） | `working` 时不再渲染空态；新增「只显示在途」单测 | 修前/后截图；`one-page-home.spec` 9 案 |
| 空态提示写「先记下来」，实际走 `[首页]` 页-first 车道 | 改成「它先给你一版，再跟你把它改对」 | 同 spec |
| 有回执无事项 → 永远「正在读取桌面…」 | 引入 steady empty（「今天没有要你拍板的」），回执/房间内容算历史 | 新增 steady 单测 |
| 页面动作失败静默 | `onCapture` 返回 Promise；失败显示「这次没送出去，再试一次」 | 新增失败单测 |
| 提按钮用未定义 alias + 字面 `#fff` | 加 `--dsha-on-accent` 契约 token；三处改用 token | theme spec + build |
| 文档/JSDoc 与代码不一致；`?debug=1` vs `#debug=1`；新 lane 无断言；note 未互链 | 逐处对齐；`operating-brief.spec` 加 4 条断言；两篇 note 互链 | `verify` |

### 4.2 仍开放

**P1（语义/资产，影响「像不像承诺」）**

1. **「就这么办」已收口（§8）。** 动作文本现在明确要求批准 decision-memo 并设核对点；真跑 `promote_page` 成功，审批卡轮询后消失。直写 host 路由仍是后续。
2. **「看依据」不到 memo（仍开放）。** 只列 `evidence.slice(0,5)`；完整一页在 knowledge room，需再点「打开它记下的」。
3. **旧交互探针已适配入口（§8）。** `loop-probe`/`projection-selection` 真跑 PASS；`desk-flow-walk` 经「全部→完整看板」跑到处理/续接相位；完整 desk 流程仍需真账本 home。
4. **调试面 flag 注册已补（§8）。** `entry.spec` 两案（开/关）+ `debug-flag` 4 案。
5. **eval 已收紧（§8）。** 问号上限 1 + `answer-max-matches` 一动作；5/5 全 PASS。

**P2（体验/一致性）**

- **命名已统一（2026-10-24）**：docs 的界面三层合同、note 与 research 都用「常用/深看/调试」；归档卡保留历史 L0/L1/L2。
- Day-0 dock 卡仍在空白会话出现，和首页空态构成两张首开面；计划说不需要第二张卡。
- 未归户碎片在首页/列表仍用「待认领」系统词；计划说它应退回后台。
- 三档「只影响全部与房间入口」的文案与 `commands.ts` 的 simple 过滤（会把非 mode 命令也藏掉）不完全一致。
- 调试面没有 in-app 关闭；要改 localStorage 再刷新。
- `desk-eight-matters-first-open` 场景名仍说 eight cards，实际记录的是首页；场景证据变薄。
- 新 client spec 各自重写 react shim/text/expand，未落 `*harness`；`STATUS_LABEL`/`pageTime` 有重复。
- 规格数字漂移：卡上写「2 个 fresh home ≤3 分钟」，实跑 3.5 分钟；当前 note 已改为 ≤5 分钟，但卡未回填（冻结）。

## 5. 测试资产盘点

| 层 | 现有 | 能证明 | 缺口 |
|---|---|---|---|
| 单测 | 976（`one-page-home` 9、`first-mile` 11、`debug-panel` 1、`prompt-bridge` 2、`operating-brief` 21） | 页面状态、空判据、lane 标记、调试渲染、lane 文本 | 无 `brief-list` 专属 spec；无轮询效果测试；无 flag 注册测试；无动作写入语义 |
| web-face | `blank-first-open`、`desk-eight-matters-first-open`（均 PASS） | 空首页、八件事首页的静态 DOM | 无列表/选中/看依据/动作/待审/调试/窄视口场景 |
| eval | 5 个首答题 + 旧任务；11/11 可评 PASS | 首答长度/页写入/指针 | 无页面动作、无审批、无「就这么办」；`desk-daily-brief` web-only 未评 |
| 探针 | preflight、shots、web-expected、loop-probe、desk-*、projection-* | 起服务、静态比对、旧桌面流程 | 首屏选择器过期（P1）；`verify` 不跑这些，资产可静默腐烂 |
| 门禁 | 976 test / 44 verify / build freshness | 单元与组合地板 | 不覆盖 web-face/probes/真实首屏 |

**够不够**：作为「首页可用」的证据，够；作为「交互回归」的证据，**不够**——列表/动作/审批/调试/窄视口
目前只有本次手工 E2E 截图（在 `.tmp/`，不入库），没有一条可在 CI/阶段收口时重放的场景。

## 6. 优先级计划

**P0**：无阻断。主链可交付。

**P1（下一片，建议按此顺序）**

1. **探针适配**：`loop-probe` 改成断言一页纸首页（`.dsha-home`/`data-assistant-one-page-home`），
   「＋ 交代新事项」改为首页输入；`desk-process-e2e`/`flow`/`continuity` 增加「全部 → 行」或「完整看板」入口；
   `docs/dev.md` 的判据同步。跑通一条真模型即可。
2. **「就这么办」语义**：接 host 写入（批准 decision-memo + 确认/设核对点），或诚实地改名为「交给助手办」；
   同时给页面动作加 eval/单测。
3. **调试 flag 注册断言**：`entry.spec` 覆盖开/关两个方向，命名 `assistant-debug`。
4. **补一个交互 web-face 场景**：至少「全部列表 + 选中回页」或「看依据」，把本次手工 E2E 固化。
5. **eval 收紧**：`answer-max-question-marks` 从 2 到 1（或改成「问句行数」），加一个动作上限检查。

**P2（清理）**：命名统一（已完成）、Day-0 dock 卡去留、未归户文案、simple 命令过滤、调试 in-app 关闭、
场景改名、harness 抽取、规格数字回填。

## 7. 证据与边界

- 真机截图/ DOM 在 `.tmp/shots/`（`ux-e2e-*`、`ux-one-page-*`、`ux-debug-tab3`），不入库；本档记录判据与时间线。
- web-face 两场景的 expected 已提交，比对 PASS。
- 只有 2 个 live home + 1 个 eight 种子；没有真人可用性样本；「30 秒读懂」是设计判断，不是实测。
- 第二个 live home 的回合停在一个模型自发的沙箱审批（清理重复备忘），页与审批卡在常用面可见；
  这也是「在途轮询」要解决的等待面。

## 8. 推进记录（2026-10-23，用户「继续推动往前」）

按 §6 的 P1 顺序推进；本节的证据在提交说明与 `.tmp/` 截图里，不另开卡。

| P1 | 状态 | 证据 / 剩余 |
|---|---|---|
| ① 探针适配 | **部分完成**：`webui-loop-probe` 首屏改为 `[data-assistant-one-page-home]`，`--ask` 走首页输入并在 `[data-one-page]` 出现时返回。真跑：`homeFirstScreen/homeCopyZh/noRoomJargon` 全 true，`entry=home-input`，`pageSeconds=37`，exit 0。`projection-selection` 改为首页 + 看依据（quote + source），真跑 PASS。`desk-flow-walk`/`continuity`/`capture`/`projection-live`/`process-e2e` 已加共享 `openBoard`（全部→完整看板）入口并语法检查；**尚未逐个真跑**（需要各自的种子 home/回放服务）。 |
| ② 就这么办 | **语义已接、卡片刷新待复验**：页面动作文本改为「把这页的决策备忘批准为 stable（本人已明确同意），记下结果，按复查日设核对点」。真跑：模型 `assistant_reflect promote_page` 成功、备忘 stable、核对点 2026-11-06，turn completed。**但首页审批卡 160s 仍显示「1 页草稿」**——房间数据没有随回合刷新。已加「动作在途后 3 分钟内每 4s `reloadDesk()`」；动态复验待跑。 |
| ③ 调试 flag | **部分完成**：flag 抽成 `chrome/debug-flag.ts`，4 案（默认关/query/hash/localStorage）PASS。`conversation.view id=assistant-debug` 的注册开/关仍无 entry 级断言（需要 DOM + store stub 的 entry harness）。 |
| ④ 交互 web-face | **完成**：新增 `desk-eight-matters-brief-list` 场景（同种子，点「全部（8）」），录制后比对 PASS；`snapshots/README.md` 场景数 8。 |
| ⑤ eval 收紧 | **进行中**：`answer-max-question-marks` 2→1，新增 `answer-max-matches`（「我可以/我来/要不要我」≤1）。quote PASS；sales 首跑因答案含 2 个问句 FAIL（真实违反合同），manual v20 + `management-breakdown` 已加「另一个缺口写进页的缺数行，不追问第二次」，sales 复跑待收。 |

**新增缺陷（本轮）**：审批卡在页面动作成功后不刷新（已加房间轮询）；`就这么办` 的语义现在真的批准备忘，不再是纯路由。

### 收盘（`840ba37`）

- **①** `loop-probe` 真跑 PASS：`homeFirstScreen/homeCopyZh/noRoomJargon` 全 true、`entry=home-input`、`pageSeconds=37`、exit 0；
  `projection-selection` PASS（首页「看依据」读到 quote + `simulated-session-a`/`simulated-event-a`）。桌面系探针只加了
  共享 `openBoard` 入口并语法检查；**各自的种子 home/回放全链仍未逐个真跑**。
- **②** 「就这么办」真跑让模型 `promote_page` 成功（备忘 stable）+ 改核对点；**首页审批卡 160s 仍显示旧计数**，
  已加动作后 3 分钟房间轮询。重载后卡片正确消失（`ux-e2e-approve-reload`）；动态复验因第二 home 的**重复备忘草稿**
  把模型拖进搜索（step 41 未收）而阻断，如实记为未完成。
- **③** `debug-flag` 4 案 PASS（默认关 / `?debug=1` / `#debug=1` / localStorage）。**注册级开/关**仍缺 entry 的
  DOM+store harness 用例。
- **④** `desk-eight-matters-brief-list` 场景录制并比对 PASS（8 行 + 两个出口），`snapshots/` 场景数 8。
- **⑤** eval 收紧到 1 个问号 + 1 个动作（`answer-max-matches`）。首跑 sales FAIL（2 个问号，真实违约）；manual v20 +
  `management-breakdown` 加「其余缺口写进页的缺数行」后 **5/5 全 PASS**（sales 61s、quote、price、contract、weekly 36s）。
- 门禁：`pnpm test` **981** / `pnpm verify` **44**；提交 `840ba37`。

### 复验二（继续）

- **② 审批卡动态刷新 PASS**：干净 home → 发送 → `card:1` → 点「就这么办」→ 卡片在轮询窗口内消失（`approved`）。
  房间轮询生效；动作语义 + 卡片刷新都闭环。
- **③ 调试注册 PASS**：`debug-flag` 4 案 + `entry.spec` 两案（flag on 注册 `assistant-debug`；默认 boot 不注册），
  entry 共 12 案。
- **① 桌面流探针**：`desk-flow-walk` 已过首屏（8 张卡）、处理会话、续接相位；但**用的是 eight-matters 的
  投影夹具 home，账本本身是空的**——模型在处理会话里如实报「0 个事项、无法核实」，不是入口失败。
  完整链路需要带真账本的 home（`desk-process-e2e` 的种子账本）才能跑；`loop-probe` 与
  `projection-selection` 已是真跑 PASS。
