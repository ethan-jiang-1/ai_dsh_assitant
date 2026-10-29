---
status: 推敲中
opened: 2026-10-29
---

# 推敲：账本全局关注与单件演变多视图

> 立卡：2026-10-29 ｜ 状态：推敲中 ｜ 授权：用户明确要求为 261029 使用价值问题设置 goal 推进此首片落地 ｜ 类型：Feature ｜ 可关闭：否

## 外部结果三要素

- **触发**：用户希望经营事项能够串成一条线，并通过不同 View 在全局与单件深入之间切换。
- **用户得到**：同一权威账本事项的可读视图：从全局关注事项进入单件，核对账本记录、来源、承诺/预测/核对/完成时间与提案状态；返回时回到同一 view 和原位置。
- **完成条件**：本卡验收标准通过；不写第二份事项事实，不新增无来源的事项间依赖；机械检查与现有 GUI 桌面/窄屏检查完成；由本人 REVIEW 后关闭或提出下一片。

**当前授权与范围**：上游研究卡 [261029 首用价值旅程](261029-first-value-journey.md)承载价值问题与研究证据；用户已明确授权本 M1 多视图首片实施。本卡是唯一 M1 work 台账。范围：全局关注 mode、既有事项 mode、既有流水 mode；同一 Matter ID 的详情 timeline；view 切换及详情返回保留对应的滚动位置、filter 与选择状态。`ProjectionView.query` 是当前未接 UI 的历史瞬态字段，本片不宣称提供搜索；其值不由 view 转换主动清除。不扩大到 H1/H2/H3 全部价值假设，不改模型工具/prompt/agent 行为，不改账本写入/schema，不推断关系、阻塞、优先级或跨事项因果。

## 切片台账

| 片 | 结果 | 状态 | 证据 |
|---|---|---|---|
| M1-S1 | 复用到期无结果规则，派生每件事项的 overdue / pending 信号 | 完成 | `proactive-face.ts` 的 `deriveOverdueMatters`；31 个 proactive-face specs 通过 |
| M1-S2 | 加入 attention mode 与共享账本事项的时间线、locale 和 archive 回读 | 完成（浏览器验收待补） | final Client suite 125 tests；时间、未知来源、pending 状态、跨 matter 隔离、archive 双页/失败/耗尽覆盖 |
| M1-S3 | 按 mode/pane 保留滚动、filter 与选中 Matter，完成三种 view 往返 | 完成（窄屏浏览器验收待补） | view reducer + React DOM tabs/detail/clamp/scroll/archive 覆盖；真实 GUI 401 阻塞 |
| M1-S4 | 更新 Client 当前合同、本卡证据，构建及运行验收 | 代码/合同/机械门禁完成，GUI 验收待补 | `docs/operating.md` 已更新；package build、typecheck 与 preset composition PASS；当前 live `main` Slot 无本插件 occupant 且 HTTP 401；`pnpm verify` 按本人要求未运行 |

## 验收标准

| 行为与类别 | 输入/状态与通过信号 | 负例、恢复与证据边界 | 证据 owner | 真人判断 |
|---|---|---|---|---|
| 共享事项身份（确定性 + orchestration） | projection 有同一 matter ID；attention 卡选择它，详情标题与来源均属于它 | 其他 matter 的收据/来源不泄漏；不复制实体、不写 ledger。`tests/client/projection-panel.spec.ts` | Client component spec + `tests/client/projection-panel-dom.spec.mjs`；后者证明交互与 store 重渲染，不证明生产 boot | 无 |
| 关注信号（确定性） | active matter 的最早已过承诺/核对时间且无之后 committed result 时显示 overdue；pending proposal 可同时出现 | update/claim/rejected 不清除 overdue；completed/abandoned 不进入 overdue；日期未知不伪造 overdue。`tests/client/proactive-face.spec.ts` + panel component spec | 纯 helper specs 证明派生边界；projection fixture 证明 UI 重叠 | 无 |
| 单件记录（确定性呈现） | selected matter 的 evidence、proposal、available receipts 共列；区分 pending/confirmed/rejected；当前 commitment/forecast/checkpoint/completed 分别标注 | 无 timestamp 显示未知时间、无 source 不造 source；跨 matter receipt 排除；顺序不宣称因果。panel component spec | `projection-panel.spec.ts` + `projection-view.spec.ts`；仅证明已下载/已载入记录，不证明账本归档完整 | 无 |
| view 往返（确定性 + orchestration） | attention/board/activity 三 tab；tab 切换进入目标 view 的 list pane；进入详情再返回同一 mode；filter/selection 与各 mode scroll offset 保留 | store remount 后仍能返回；窄 pane 回列表；detail clamp 事件不覆写原 offset。`query` 保留为 dormant store 字段，不宣称搜索能力。view specs + real DOM spec | `projection-view.spec.ts` 证明状态 reducer；`projection-panel-dom.spec.mjs` 证明 React DOM click/pane/scroll；真实 GUI 另验装配和窄容器 | 无 |
| 桌面/窄视口（浏览器呈现） | 当前运行 GUI 中切换、进入同件、返回；宽屏和窄容器不重叠、文本不溢出 | 测试 renderer 不算浏览器证据；无运行 profile/数据则如实标 BLOCKED | 现有 `http://127.0.0.1:3080` 经构建刷新与 `node dev/probes/web/webui-preflight.mjs '<URL>'`；按 Client UI contribution Skill 的当前 URL 限制执行 | 视觉是否让“全局/深入”更易理解不由像素测试判定 |
| 仓库门禁（构建/编译） | source 与 served client artifact 同步；scoped build/typecheck 与 client tests 通过 | `preset-composition.spec.ts` 若仍报独立基线类型错误，明确记录为门禁阻塞；本轮按用户要求不运行 `pnpm verify`，不将其标绿 | `pnpm build`、`pnpm --filter dsh-smart-assistant typecheck`、focused client tests；`pnpm verify` 留待后续由用户决定；owner: `docs/testing.md` + `packages/dsh-smart-assistant/AGENTS.md` | 无 |

## 当前证据与停点

- 最终命令 `pnpm --filter dsh-smart-assistant exec vitest run tests/client/projection-view.spec.ts tests/client/proactive-face.spec.ts tests/client/projection-panel.spec.ts tests/client/debug-panel.spec.ts tests/client/one-page-home.spec.ts tests/client/projection-panel-dom.spec.mjs tests/client/entry.spec.ts tests/client/desk-arms.spec.ts`：PASS，8 files / 125 tests；覆盖 view 转换、到期/待确认规则、panel/timeline、真实 DOM pane/scroll、archive 双页游标/重试/耗尽与入口 handoff。
- `pnpm --filter dsh-smart-assistant build`：最终运行 PASS，刷新 `lib/client/index.js` classic bundle（340.37 kB）。
- `pnpm --filter dsh-smart-assistant typecheck`：PASS。
- `pnpm --filter dsh-smart-assistant exec vitest run tests/composition/preset-composition.spec.ts`：PASS，1 file / 8 tests。Fixture `base` 以 `applyEntryPatches` 的参数类型约束，匹配真实 Loader row metadata。
- `git diff --check`：PASS。
- 现有 `http://127.0.0.1:3080` 未带认证 token 的请求返回 HTTP 401；没有已知 authenticated URL，未启动替代实例。GUI preflight、刷新后桌面/窄容器视觉验收仍 BLOCKED。
- `pnpm verify`：按用户明确要求，本轮未运行；不记为通过。

## 仍未取

- 历史报价/回款实验与未完成的人类验证在上游研究卡；不是本片的隐含验收。
- 当前 GUI `http://127.0.0.1:3080` 的裸请求为 401，未取得已认证 URL/token；`pnpm run dev:web` watcher 当前未运行。不能据此声称浏览器预检通过或 HMR 已验证。
- 多 view 实际是否提升复用/节约时间，需真人和自然跨日业务证据；本卡的代码/浏览器通过不证明产品价值。

## 关闭条件

M1 所有验收标准有可复核证据，本人完成产品 REVIEW 后，在本卡记录结论和去向；未完成的价值研究仍由上游研究卡继续持有。