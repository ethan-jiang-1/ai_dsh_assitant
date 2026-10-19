# 维护面 B4：Viki 越界清理（脚本/试跑，真数据本人执行）

日期：2026-10-19 · 状态：**implemented（交付脚本/夹具/试跑；真数据本人执行）**（B 卡 v2 B4）

## 问题（可观察行为）

Viki 里可能留有**越界**记录（别的工作区/peer 的抽取物）。逐条读别家经营数据来挑不合适；正确口径是 scope：只保留目标工作区的 space/peer，其余整批清；`identity.md`/`soul.md`/`.overview.md` 永远不动；先 dry-run 出清单，确认后才 snapshot + 删。

## 决定

- **`dev/deploy/viki-cleanup.mjs`**：`planCleanup(entries,{keepPeers})` 纯核 → `{keep,remove,protectedFiles}`；`runCleanup(client, plan,{apply,out,space})`：默认 dry-run（不碰 server），`--apply` 先 `commit([viking://user/<space>/memories])` 再逐条 `remove`；回执 JSON 记录 kept/removed/protected/commit id；`identity.md`/`soul.md`/`.overview.md` 正则保护，永不进 remove。
- **CLI**：`--url`（或 `OPENVIKING_URL`）、`--space`、可重复 `--keep-peer`、`--apply`、`--out`；缺 `--url` 给用法；dry-run 末尾明确"nothing deleted"。
- **不做的**：不按 `source_extraction_id` 猜旧批次（没有本机真值）；不逐条读别家内容；不自动 `--apply`。
- **同 diff**：`tests/tooling/viki-cleanup.spec.mjs` 夹具（keep-peer / 另一 peer / identity / soul / .overview；dry-run 不 commit；apply snapshot 先于删；receipt）。

## 输掉的方案

- **按内容逐条挑"别家经营数据"**：越界是 scope 错误，不是值错误；逐条读别家内容本身就是越界。
- **默认 `--apply`**：真数据必须先看 dry-run 清单；脚本默认只读。
- **无 tree snapshot 就清**：不可回滚；`--apply` 先 `commit([memories])`。
- **按 `source_extraction_id` 猜旧批次**：本机没有那批记录的真值；只按 space/peer scope。
- **把 `identity.md`/`soul.md`/`.overview.md` 当普通条目**：模板/概览永远保护。
- **在 web 路由里做批量清理**：这是运维脚本（本人执行），不是面板动作；面板只做逐条删。

## 验收与证据

- `tests/tooling/viki-cleanup.spec.mjs` **2 条**：保护文件永不进 remove；dry-run 不写，apply 先 commit 再只删越界，receipt 带 commit id。
- **当前 server 试跑**（`--url http://127.0.0.1:1933 --space default --keep-peer github.com-ethan-jiang-1-ai_dsh_assitant --out .tmp/b4-receipt.json`）：**keep 5 / remove 0 / protected 2**（identity、soul）；`.tmp/b4-receipt.json` 是回执。**这份 server 上没有越界记录**；B 卡 §5.2 的 14 条在**另一份工作区**，不在本机这份 server 上。
- **真数据清理（第 7 行，本人执行）**：在目标工作区/server 上用同一脚本先 dry-run 看清单，再 `--apply`；回执路径回填 B 卡。当前 server 已无越界可清。

**还会约束以后**：清理只按 space/peer scope，不按内容判断；保护文件名是硬规则；任何 apply 必须先有 tree snapshot。
