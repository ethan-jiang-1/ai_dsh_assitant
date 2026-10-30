# Viki 越界清理：按 scope、先快照、保护身份页

日期：2026-10-19 · 状态：**implemented**

## 问题（可观察行为）

Viki 里可能留有越界记录（别的工作区/peer 的抽取物）。逐条读别家经营数据来挑不合适；正确口径是
scope：只保留目标工作区的 space/peer，其余整批清；`identity.md`/`soul.md`/`.overview.md` 永远不动；
先 dry-run 出清单，确认后才 snapshot + 删。

## 决定

- **`dev/deploy/viki-cleanup.mjs`**：`planCleanup(entries,{keepPeers})` 纯核 →
  `{keep,remove,protectedFiles}`；`runCleanup(client, plan,{apply,out,space})` 默认 dry-run（不碰
  server），`--apply` 先 `commit([viking://user/<space>/memories])` 再逐条 `remove`；回执 JSON 记录
  kept/removed/protected/commit id；保护文件名永不进 remove。CLI 的
  `--url`/`--space`/`--keep-peer`/`--apply`/`--out` 形状见脚本头注与
  [`tests/tooling/viki-cleanup.spec.mjs`](../../packages/dsh-smart-assistant/tests/tooling/viki-cleanup.spec.mjs)。
- **不做的**：不按 `source_extraction_id` 猜旧批次（没有本机真值）；不逐条读别家内容；不自动
  `--apply`。
- **删完叶子要查空壳**：空目录壳里的隐藏 `.abstract.md`/`.overview.md` 仍带被删内容的摘要，`ls`
  看不见，`find`/`recall` 继续命中。递归删除无真实叶子的壳，判据是 `search/find` +
  `search/recall` 对已删关键词 0 命中。
- **契约断言要真形状**：路由 spec 若把 `commit` 整个 mock 掉，`snapshot/commit` 必填 `message`、
  回包键 `commit_oid`、restore 用 `source_commit` 三处漂移都防不住；client 契约要有真形状断言
  （`tests/host/viki-client.spec.ts`）。

## 输掉的方案

- **按内容逐条挑「别家经营数据」**：越界是 scope 错误，不是值错误；逐条读别家内容本身就是越界。
- **默认 `--apply`**：真数据必须先看 dry-run 清单；脚本默认只读。
- **无 tree snapshot 就清**：不可回滚；`--apply` 先 `commit([memories])`。
- **按 `source_extraction_id` 猜旧批次**：本机没有那批记录的真值；只按 space/peer scope。
- **把 `identity.md`/`soul.md`/`.overview.md` 当普通条目**：模板/概览永远保护。
- **在 web 路由里做批量清理**：这是运维脚本（本人执行），不是面板动作；面板只做逐条删。
- **删完叶子就算清完**：空壳的隐藏 abstract/overview 仍在索引里；见上。
- **mock 掉 commit 的 spec 就够**：真形状断言才能防契约漂移。

## 还会约束以后

- 清理只按 space/peer scope，不按内容判断。
- 保护文件名是硬规则；任何 apply 必须先有 tree snapshot。
- 删完叶子还要查空壳的隐藏 abstract/overview。
- 调 server 端点前先读 `.tmp/ov-openapi.json` 的 schema，fake fetch 不校验契约。
