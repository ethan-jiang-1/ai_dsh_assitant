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
| M1-S2 | 加入 attention mode 与共享账本事项的时间线、locale 和 archive 回读 | 完成 | final Client suite 125 tests；认证 dev GUI 桌面/窄屏显示 overdue 与 pending 重叠、同件来源时间线、状态与四种时间；Activity desktop/narrow capture 均无 console/network errors |
| M1-S3 | 按 mode/pane 保留滚动、filter 与选中 Matter，完成三种 view 往返 | 完成 | reducer + React DOM tests 通过；认证 dev GUI 窄屏 attention→detail→back 恢复实际可达 50px offset，原 Matter 保持可见 |
| M1-S4 | 更新 Client 当前合同、本卡证据，构建及运行验收 | 完成（待本人产品 REVIEW） | `docs/operating.md` 已更新；package build、typecheck、preset composition、focused Client tests、`pnpm verify` 全部 PASS；现有认证 dev GUI 桌面/窄屏验收完成 |

## 验收标准

| 行为与类别 | 输入/状态与通过信号 | 负例、恢复与证据边界 | 证据 owner | 真人判断 |
|---|---|---|---|---|
| 共享事项身份（确定性 + orchestration） | projection 有同一 matter ID；attention 卡选择它，详情标题与来源均属于它 | 其他 matter 的收据/来源不泄漏；不复制实体、不写 ledger。`tests/client/projection-panel.spec.ts` | Client component spec + `tests/client/projection-panel-dom.spec.mjs`；后者证明交互与 store 重渲染，不证明生产 boot | 无 |
| 关注信号（确定性） | active matter 的最早已过承诺/核对时间且无之后 committed result 时显示 overdue；pending proposal 可同时出现 | update/claim/rejected 不清除 overdue；completed/abandoned 不进入 overdue；日期未知不伪造 overdue。`tests/client/proactive-face.spec.ts` + panel component spec | 纯 helper specs 证明派生边界；projection fixture 证明 UI 重叠 | 无 |
| 单件记录（确定性呈现） | selected matter 的 evidence、proposal、available receipts 共列；区分 pending/confirmed/rejected；当前 commitment/forecast/checkpoint/completed 分别标注 | 无 timestamp 显示未知时间、无 source 不造 source；跨 matter receipt 排除；顺序不宣称因果。panel component spec | `projection-panel.spec.ts` + `projection-view.spec.ts`；仅证明已下载/已载入记录，不证明账本归档完整 | 无 |
| view 往返（确定性 + orchestration） | attention/board/activity 三 tab；tab 切换进入目标 view 的 list pane；进入详情再返回同一 mode；filter/selection 与各 mode scroll offset 保留 | store remount 后仍能返回；窄 pane 回列表；detail clamp 事件不覆写原 offset。`query` 保留为 dormant store 字段，不宣称搜索能力。view specs + real DOM spec | `projection-view.spec.ts` 证明状态 reducer；`projection-panel-dom.spec.mjs` 证明 React DOM click/pane/scroll；真实 GUI 另验装配和窄容器 | 无 |
| 桌面/窄视口（浏览器呈现） | 已有认证 dev GUI 的 1440x900 与 420x900 显示三 mode；attention 进入同 Matter timeline；窄 pane 隐藏列表、显示 back，滚动后返回恢复非零 offset；Activity 两种宽度均渲染 | 浏览器使用 dev home 的模拟/现有账本数据；截图不能替代本人真实事项体验 | 现有仓内 dev URL preflight green；`.tmp/shots/m1-full-board-*`, `m1-attention-detail-*`, `m1-back-after-detail-narrow-*`, `m1-activity-*` PNG/DOM；所有完成 capture 的 `consoleErrors`、`networkFailures` 为空 | 视觉是否让“全局/深入”更易理解不由像素测试判定 |
| 仓库门禁（构建/编译） | source 与 served client artifact 同步；typecheck、focused Client/composition tests 与 `pnpm verify` 通过 | 若 profile entry metadata 类型漂移，则 typecheck 红；不把被跳过的浏览器/人判断算成门禁通过 | `pnpm --filter dsh-smart-assistant typecheck`、最终 focused Client suite、composition spec、`pnpm --filter dsh-smart-assistant build`、`pnpm verify`（50 checks）；owner: `docs/testing.md` + 包 AGENTS.md | 无 |

## 当前证据与停点

- 最终命令 `pnpm --filter dsh-smart-assistant exec vitest run tests/client/projection-view.spec.ts tests/client/proactive-face.spec.ts tests/client/projection-panel.spec.ts tests/client/debug-panel.spec.ts tests/client/one-page-home.spec.ts tests/client/projection-panel-dom.spec.mjs tests/client/entry.spec.ts tests/client/desk-arms.spec.ts`：PASS，8 files / 125 tests；覆盖 view 转换、到期/待确认规则、panel/timeline、真实 DOM pane/scroll、archive 双页游标/重试/耗尽与入口 handoff。
- `pnpm --filter dsh-smart-assistant build`：最终运行 PASS，刷新 `lib/client/index.js` classic bundle（340.37 kB）。
- `pnpm --filter dsh-smart-assistant typecheck`：PASS。
- `pnpm --filter dsh-smart-assistant exec vitest run tests/composition/preset-composition.spec.ts`：PASS，1 file / 8 tests。Fixture `base` 以 `applyEntryPatches` 的参数类型约束，匹配真实 Loader row metadata。
- `git diff --check`：PASS。
- 现有认证实例 `http://127.0.0.1:65091/?token=...`：`webui-preflight.mjs` green；三 mode 与桌面/窄屏 attention-detail-back 和 Activity 截图见 `.tmp/shots/m1-*.png` / `.dom.txt`。窄屏实际保存并恢复 50px scrollTop；所有 capture 的 console/network error arrays 为空。
- GUI shell 中的「自动化任务」是 DSH 全局 navigation；本次代码改动未包含 shell navigation 或任何全局 profile/config 改动。现有服务日志确认 `DSH_HOME` 指向仓内 `dev/harness-home`，本次隔离截图输出在 `.tmp/`。
- `node dev/probes/web/webui-preflight.mjs '<authenticated dev URL>'`：green；现有 DSH dev server PID 9816 的 `DSH_HOME` 是仓内 `dev/harness-home`，未启动或停止其他服务。
- 最终 `pnpm verify`：PASS，50 checks；`PresetRow` fixture 已改为基于真实 `EntryOptions`，修复 optional/required `name` 类型错配。
- 本人指出的 shell「自动化任务」项属于 DSH 全局 navigation，不是本插件代码；未修改全局 DSH 或 profile 配置。
- 收尾验证（2026-10-30，handoff `.tmp/handoff/261030-m1-verification-plan.md` §四执行）：bin mode-only chore `6e5f020`；覆盖审计落 `.tmp/handoff/coverage-audit.md`（初心对照 diff 面无越界；缺口 A 畸形时间戳边界、B attention 空态已补，缺口 C archive 组件层重复证据、D 测试资产无新增有据不补），focused suite 127/127 + typecheck PASS，提交 `84ee851`；新增 live 探针 `dev/probes/web/multiview-live.mjs`（真实 Chrome，合成 ledger+archive 种子运行时入 probe home 不入库）四路径全 PASS——attention 全流程（offset 260→detail→返回恢复 260）、归档分页（50→61→100→111→114 耗尽，before 游标单调变老）、流水条目跳转（board/detail）、窄屏 420x900 往返（200→恢复 200，无横向溢出），verdict 落 `.tmp/probe-runs/multiview-live-verdict.json`，teardown 端口关闭无残留，verify 仍 50/50，提交 `0f87b11`。

- 对抗性走查（2026-10-30，REVIEW 前，9 相位一次性探针 `.tmp/explore/multiview-explore.mjs`，verdict 落 `.tmp/probe-runs/multiview-explore-verdict.json`）：坏账本、缺账本、事项归档分页、筛选往返、详情时 F5、超长文本窄屏、全部办结空态、幽灵事项降级、断网恢复 —— 全 PASS。发现并修复两个真实缺陷：① 归档路由返回裸 `receipt`，缺 `sessionId`/`status`/`kind`/`quote`，更早的流水条目显示成「操作」、事项时间线丢来源；改为与投影同形的共享映射 `projectOperationRecord`（`src/domain/operating/projection.ts`），路由测试断言形状；② 事项详情「读取更早记录」翻的是全局页，一页常含别的事项，点击可能看起来无变化，改为路由接受 `matterId`、客户端按选中事项传参，一次点击必有进展。契约同步 `docs/operating.md` §旧回执分页；live 探针补归档标签回归守卫；共享探针库 `openBoard` 改为轮询（首页挂载早于清单渲染的竞态）。提交 `04d3fff`、`5634be8`，client+host 458 tests、typecheck、verify 50/50 全绿。
- 走查留下的观察（不在 M1 授权边界内，未改）：完整看板（`deep`）刻意不渲染「重新读取」按钮（84815ab 起既有设计），板上数据不会自动刷新，刷新入口只有回首页；首页对 422 坏账本只给通用「桌面读取失败」而不含具体的「资料损坏或版本不支持」；账本文件损坏会让 host 的 operating ledger 服务起不来，连带新会话创建失败（console warning「waiting for assistantOperatingLedger」），韧性缺口在 host 侧、影响面大于桌面。

## 仍未取

- 历史报价/回款实验与未完成的人类验证在上游研究卡；不是本片的隐含验收。
- 目标入口 `http://127.0.0.1:3080` 的裸请求为 401；M1 浏览器验收使用同仓现有、由仓内 `dev/harness-home` 启动的认证 dev 实例 `http://127.0.0.1:65091/?token=...`。`pnpm run dev:web` watcher 未运行，因此不声称 HMR 已验证。
- 多 view 实际是否提升复用/节约时间，需本人基于自己的业务判断及自然跨日使用再评估；技术验收和模拟账本浏览器渲染不证明产品价值。

## 关闭条件

M1 所有验收标准有可复核证据，本人完成产品 REVIEW 后，在本卡记录结论和去向；未完成的价值研究仍由上游研究卡继续持有。