---
status: 推敲中
opened: 2026-10-18
---

# 收口卡：主动性之脸（261018-proactive-face 四片推进台账）

> 立卡：2026-10-18 ｜ 状态：推敲中（已授权实施）｜ 类型：Feature ｜ 可关闭：否 ｜ 授权：本人 2026-10-18 裁决路线 A「可见化与收口」，六问逐项拍板（见[评审卡·评审记录](../_archive/settled_issues/261018-proactive-direction.md)）；授权指针记在 [proposed 卡](../../notes/proposed/2026-10-18-proactive-face.md) 状态行

**问题与期望结果：** 落地 [proposed 卡](../../notes/proposed/2026-10-18-proactive-face.md) 的四片——给已有主动性装上"脸"（桌面「它替你看过」三行式、建议式委托、无人值守红线）。期望：本人打开桌面一眼能答"它在盯什么 / 在等我什么 / 要不要加一条或停一条"，接受盯守是一键。

**当前情况：** 裁决已完成（路线 A，六问拍板：一条三行式＋空态不渲染＋"事 vs 会话"分工去重；建议排序 ②到期核对→③每周对账→①每天一遍（①带"比每周一坐密"标注）；路线 D 挂触发不立卡；暂停入口不要、删了重建）；四片全部未开始。

**阶段 0 结论（2026-10-18，前置验证完成）**

- **0a 注入面：子面注入不可行（实证）→〔勘误，见台账片 1〕可行，缺的是 peer 声明**——初证：inject 声明 `'remote.schedule'` 后 typecheck 全绿但运行时整个 client 激活失败（`import failed`）。**后续二分三轮定案**：① 不碰 `ctx.remote` 即激活 → 炸点是未声明子面的属性访问（Proxy get 抛异常，非返回 undefined）；② 补 peer `"@deepseek-ai/dsh-schedule": "workspace:^"` + inject `'remote.schedule'` 后**完全打通**（与 vendor `ui-schedule` 同构：peer + 子面声明缺一不可）。**教训加倍**：类型层对两者都零预警。
- **0b 基线：blank-first-open 确已腐烂（实证）**——`web-expected` 红的漂移内容正是 desk-side-capture 片 1 的受理位（`input: 在桌面直接交代一件新事`、`button: 交给助手`、流水 +29 行）。处置＝片 1 diff 内同 diff `--refresh` 重录（受理行＋主动行一起收进），并在 capture 收口卡台账记一笔。

**未决问题：** 见 proposed 卡各片；另有一条实施前置——**注入面验证**：本包 inject 增补 `'remote.schedule'` 后 `catalog()` 是否可达，不通则走 service 层 RPC 桥（评审卡·评审记录·架构）。

**下一步：** 按下面刀口推进；每片先答"怎么算对"（造红 → 实现 → 变绿）；片间证据记在本卡台账。与 `261018-desk-side-capture` 的共存三件事（四层堆叠走查、`pendingInteraction` 去重、web-expected 基线刷新时机）在片 1 实施与验收时显式处理。

**推进计划（2026-10-18 定，用户拍板"我都需要"）**

| 阶段 | 内容 | 怎么算对 |
|---|---|---|
| 0 前置 | ①注入面：inject 增补 `'remote.schedule'` 后 `catalog()` 可达性（不通走 service RPC 桥）；②基线现状：跑 `web-expected` 探 blank-first-open 是否已被受理行腐烂——处置＝片 1 diff 内同 diff 重录基线，并在 capture 收口卡台账记一笔 | 两个结论写回本卡"当前情况"，各有实证 |
| 1 片 1 | 纯核 `src/client/proactive-face.ts`（行派生矩阵 keyless）→ 面板插入（结构锚：`dsha-head` 与 `dsha-capture` 之间；空态不渲染；每行恰一动作）→ spec + shots 三态（seed 夹具）→ 前后比对最小脚本（受控 home）→ 基线重录同 diff | proposed 卡验收表片 1 四行全绿 |
| 2 车道+片 2 | 车道先行：seed 夹具（due/quiet/dup）→ e2e watch 场景（先试跑不建排程／替我盯上目录无重复；replay 先行）→ 前后比对脚本落 `dev/probes/web/`；片 2：三条具名建议（②③①＋①标注）＋两动作＋忽略封口＋答得上＋ Q5 对照检查 | proposed 卡验收表片 2 行全绿（不可复现行此时应已可复现） |
| 3 片 3 | 红线段落进 `operating-brief`（英文；禁七动词＋不自动建常态排程；点名提案槽属此类；只约束无人值守 turn）→ `test:agent` + `test:composition` → 无人值守端到端（live 式 web 驱动＋会话日志禁词）→ **改模型可见面必跑 `pnpm eval`** | proposed 卡验收表片 3 行全绿 |
| 4 收口 | 逐片真证据进台账 → `pnpm build && test && verify`（+eval）→ proposed 卡毕业（正文改写为已交付事实）＋本卡归档，同 diff | 全部门禁绿 + 两卡毕业归档 |

## 验收标准

承接 [proposed 卡](../../notes/proposed/2026-10-18-proactive-face.md) 的「验收」节（每片：命令 / 断言对象 / 红的形态），不在此复述以免两处维护；本卡只记**逐片真证据**与停点。注意：片 2 的 eval 行与片 3 的无人值守半行**按现仓库不可复现**（首轮评审结论：需 web 驱动＋新 check kind＋seed 夹具，见评审卡·评审记录·评测）——**实施片 2/3 前先补验收车道设计或降为带触发注记，再动手**。

## 台账

| 片 | 状态 | 真证据 |
|---|---|---|
| 1 桌面「它替你看过」（纯核 `proactive-face.ts` 派生 + 三行式，零 token 只读） | **落地** | 纯核 17 案（`tests/client/proactive-face.spec.ts`：逾期无结果/回执之后语义/已了结排除/最早逾期胜出+extraCount/now 边界含当刻/时区 instant 比较/行 2 聚合/空态/最早 active 胜出 inactive 排除/迟到阈值与事实文案/同 title 与同 prompt 两种重复/undefined 降级/无投影空态）；组件 5 案（`tests/client/projection-panel.spec.ts` proactive describe：行 1 一动作+已了结不进、全空不渲染、行 2 聚合一动作、行 3 迟到+重复+深链回调、unavailable 降级标记 `data-proactive-catalog`）；合同同步 2 处（client-entry inject 清单、composition lifecycle 补 `remote.schedule` provide 后 3 案复绿）；client 全套 194 绿。**真机**：行 2「它在等你：2 条待认领」、行 3「它下次替你看：每周对账（周一 09:00） · 2026-10-19 09:00 — **发现 2 条重复盯守**」+「去任务页」在场（`.tmp/shots/proactive-dup-live-1500x1000.{png,dom.txt}`）——dev home 实况双 weekly（同 prompt 不同 title，10-13 事故形状）被重复判据正确抓出。**行 1 真机缺席＝判据正确**：m-1 到期时刻后有 update 回执（核对循环在走），due 态留待 seed 场景（阶段 2）。**零成本见证**：`node dev/probes/web/proactive-idle-probe.mjs` PASS——35s 窗口（跨一个 30s 轮询周期；受控性＝两条 weekly 下次投递在窗口外）408 会话数不变 + `ledger.json`/`schedule.json` 哈希不变。**基线**：`blank-first-open` 由本片 diff `--refresh` 重录（受理行+主动行收进）并复验 PASS；capture 收口卡台账已记。**接线定案**：peer `@deepseek-ai/dsh-schedule` + inject `'remote.schedule'`（与 vendor 同构）；重复判据细化＝同 title **或同 prompt** + 同时刻（10-13 事故的实况是同 prompt 不同 title）。**余**：真机「先试跑/替我盯上」交互与 due 态 seed 场景（阶段 2 车道） |
| 2 「让它替你盯」（三条具名建议，排序 ②③①；先试跑 / 一键接受 / 忽略封口 / 答得上） | **UI 落地**（余 e2e watch 场景） | 纯核 Q5 三案（accepted 有痕目录无 title→mismatch 行；匹配→无行；catalog undefined→不判）＋组件 4 案（②③① 序断言＋dense 标注；忽略一条剩两条/全忽略整条不渲染；×封口回调；mismatch「再试一次」走 `retry:` 车道）；client 全套 197 绿。**真机**：建议条整块在案（`.tmp/shots/suggest-live-1500x1000.png`）——三条各带「先试跑一次／替我盯上／×」，dense 标注"比「每周一坐」密"在场；两动作走 capture 代发车道（`arms.captureFromDesk`，`[桌面]` 独立来源），忽略封口与接受痕 localStorage（`dsha-proactive-ui-v1`）。**三态种子证据**（`node dev/probes/web/proactive-shots.mjs`，隔离 home 三态全 PASS）：due＝行 1「合同 NB-02 第二期款到账核对 · 到期 5 天，账上没有结果」＋看这件事（种子＝e2e seed-ledger 原样，其 ops 全在到期前）；quiet＝主动行整条不渲染而建议条独立在场；dup＝两条同 prompt 不同 title（10-13 事故形状）→「发现 2 条重复盯守」＋去任务页。**余**：e2e watch 场景（回放驱动 schedule_create：先试跑不建排程／接受后目录 title 可读且无重复——验收表片 2 行的模型侧车道） |
| 3 无人值守 turn 红线（模型可见面，英文，同 diff 登记） | 未开始（前置：验收车道） | — |
| 4（延后，带触发）明细 / 失败可见化 / 平台缺口记账 | 触发未到 | — |

## 关闭条件

- 四片验收全绿（proposed 卡验收表逐行有真证据；片 4 触发未到则按带触发延后记录）→ 头部改 `可关闭：是`，与 proposed 卡毕业（正文改写为已交付事实）同一次改动归档。
- 或本人叫停：状态行记结论与去向，按入口流程归档。
