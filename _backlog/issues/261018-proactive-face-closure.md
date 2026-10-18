---
status: 推敲中
opened: 2026-10-18
---

# 收口卡：主动性之脸（261018-proactive-face 四片推进台账）

> 立卡：2026-10-18 ｜ 状态：推敲中（已授权实施）｜ 类型：Feature ｜ 可关闭：否 ｜ 授权：本人 2026-10-18 裁决路线 A「可见化与收口」，六问逐项拍板（见[评审卡·评审记录](../_archive/settled_issues/261018-proactive-direction.md)）；授权指针记在 [proposed 卡](../../notes/proposed/2026-10-18-proactive-face.md) 状态行

**问题与期望结果：** 落地 [proposed 卡](../../notes/proposed/2026-10-18-proactive-face.md) 的四片——给已有主动性装上"脸"（桌面「它替你看过」三行式、建议式委托、无人值守红线）。期望：本人打开桌面一眼能答"它在盯什么 / 在等我什么 / 要不要加一条或停一条"，接受盯守是一键。

**当前情况：** 裁决已完成（路线 A，六问拍板：一条三行式＋空态不渲染＋"事 vs 会话"分工去重；建议排序 ②到期核对→③每周对账→①每天一遍（①带"比每周一坐密"标注）；路线 D 挂触发不立卡；暂停入口不要、删了重建）；四片全部未开始。

**阶段 0 结论（2026-10-18，前置验证完成）**

- **0a 注入面：子面注入不可行（实证）**——inject 声明 `'remote.schedule'` 后 typecheck **全绿**但运行时整个 client 激活失败（`import failed`；二分定因：＋注入→挂，回滚＋rebuild→活；改动经 start.sh 自证自动 rebuild 即达组合）。替代路径按成本序：① 不声明子面、直接 `ctx.remote.schedule?.catalog()` 可选链（remote 本体可能即 RPC 代理；运行时可达性并入片 1 行 3 渲染验收判定，room-data-io 式不物化降级）② host service 桥（评审预案）。**教训**：类型层对 inject key 合法性零预警——"tests pass ≠ 运行时活"的又一实例。
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
| 1 桌面「它替你看过」（纯核 `proactive-face.ts` 派生 + 三行式，零 token 只读） | 未开始 | — |
| 2 「让它替你盯」（三条具名建议，排序 ②③①；先试跑 / 一键接受 / 忽略封口 / 答得上） | 未开始（前置：验收车道） | — |
| 3 无人值守 turn 红线（模型可见面，英文，同 diff 登记） | 未开始（前置：验收车道） | — |
| 4（延后，带触发）明细 / 失败可见化 / 平台缺口记账 | 触发未到 | — |

## 关闭条件

- 四片验收全绿（proposed 卡验收表逐行有真证据；片 4 触发未到则按带触发延后记录）→ 头部改 `可关闭：是`，与 proposed 卡毕业（正文改写为已交付事实）同一次改动归档。
- 或本人叫停：状态行记结论与去向，按入口流程归档。
