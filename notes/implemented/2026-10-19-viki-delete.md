# 维护面 B2/B3：Viki 逐条删/恢复与人工并排

日期：2026-10-19 · 状态：**implemented**（B 卡 v2 B2+B3；B4 见 [viki-cleanup](2026-10-19-viki-cleanup.md)）

## 问题（可观察行为）

B1 能列出、能读但删不了；Viki 的落体不是房间 `retired`，而是"快照备份 → 删除 → 可恢复"。删一条可能被知识页 `sources`/`links` 或同 `event_name`/摘要的近重复引用；没有备份就删不可接受。两条矛盾没有 `key`/`supersedes`，只能人工并排、人选为准。

## 决定

1. **`VikiClient` 写面**：`commit(paths)` → `POST /snapshot/commit`（返回 commit id，失败即拒绝删除）；`remove(uri)` → `DELETE /fs?uri=…&recursive=false`；`restore(commit)` → `POST /snapshot/restore`（forward-commit，回执写明"该 commit 之后的改动可能一并回退"）。
2. **`POST /api/assistant/viki`**（同一 `assistant-viki` 行）：`references` / `delete`（引用未确认 → 409 带引用；`commit` 失败 → 409 不删；成功后回 `{ok, uri, commitId, at, references}`）/ `restore`；目录、缺失、越界分别 409/404/403。
3. **审批账**：`recordApproval('retire', uri, {source:'panel-direct', room:'viki', before/after})`；`ReceiptRoom` 加 `'viki'`（A3 收据可见，不计入四房间条目）。
4. **客户端**：Viki 行「删」→ 先取 references 展示 →「确认删除」→ 回执条（commit id +「恢复这次删除」）；**B3**：逐行「选择」两条 →「并排比较」（摘要 + 正文 + 来源）→「以 A/B 为准」删除另一条（复用 B2 备份删除），不选/「两条都留」时都不删。不投 prompt。

## 输掉的方案

- **无 snapshot 就删**：不可回滚；commit 失败必须拒绝。
- **Viki 删除写成房间 `retired`**：Viki 不是房间；没有 `retired` 状态。
- **自动矛盾检测/自动删除**：没有 `key`/`supersedes`；B3 只做人工并排。
- **引用命中静默删**：必须先展示并二次确认。
- **`snapshot/restore` 当"撤销本次删除"**：它是 forward-commit；回执必须写清。
- **删除走模型/工具面**：`ov-shield` 挡写面；B2 用 host POST。

## 验收与证据

- **host**：`tests/host/viki-route.spec.ts` **12 条**（B1 6 + B2 6：references、直接删、引用 409、确认后 commit/remove/audit、commit 失败不删、目录/缺失/越界、restore、client 的 commit/remove/restore）。
- **client**：`tests/client/client-viki-panel.spec.ts` **4 条**（B1 2 + B2/B3 2：references→blocked→confirm→receipt→restore；列表渲染「删」「并排比较」「选择」）。
- **A3**：`tests/domain/receipt.spec.ts` 加 `room:'viki'`——只进 `counts.viki`，四房间计数不变。
- **全量**：`vitest` **805 tests**；`verify` **42**；`tsc`/`tsdown`；**`web-expected` 两场景 PASS**（banner/blank，Viki tab 在 guide，首屏无漂移）。
- **真机**：`pnpm start` 绿，Viki tab 有「删」「选择」「并排比较」（交接 URL 见 B 卡）。
- **人判**：本人删一条、核对回执、恢复；两条并排选一次。B4 真数据本人执行。
