# 维护面 B4：Viki 越界清理（脚本/试跑 + 2026-10-20 真数据实跑）

日期：2026-10-19 · 状态：**implemented**

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
- **删完叶子就算清完**（2026-10-20 实跑发现）：空目录壳里的隐藏 `.abstract.md`/`.overview.md` 仍带被删内容的摘要，`find`/`recall` 继续命中——壳也要递归删，判据是关键词 0 命中。
- **mock 掉 commit 的 spec 就够**（同日发现）：路由 spec 把 `commit` 整个 mock 掉，`snapshot/commit` 必填 `message`、回包键 `commit_oid`、restore 用 `source_commit` 三处契约漂移全没防住——client 契约要有真形状断言（`viki-client.spec.ts`）。

## 真数据实跑（2026-10-20）

**目标定位**：B 卡 §5.2 的"另一份工作区"= **用户级 OpenViking 存储 `~/.openviking/workspace`**（`ov.conf` 声明的 storage；dev 的 `openviking-up.sh` 刻意把 1933 指到仓内 `.tmp/openviking/workspace`，所以那份存储平时没有 server 服务）。处置方式 = 在 **19334** 起第二个 server（配置副本落 `.tmp/b4-user/`，storage 指向用户级存储），全程走 API，不直接碰文件。

**那 14 条是什么（机器证据）**：[`dev/experiments/openviking/ov-rt.mjs`](../../dev/experiments/openviking/ov-rt.mjs) 头注原文——"塞 **14 条模拟 CEO↔分身语料**……**语料是虚构人设的哨兵事实（测抽取准头，非真实数据）**"。华芯半导体/恒基地产/明州数据/王姐/估值底线 3.5 亿/小满生日 10-18→10-20 改口，逐条对得上该脚本语料；车位 B2-117→B2-171→B3-205 三连改与"私事三条"（香樟/貔貅/车位）是后续 probe 会话（`dsh-trial-probe-*`/`dsh-accept-probe-*`）的同型哨兵。全部 41 条记忆冻结在 09/29–10/03 试点期——**"个人味"的家人/宠物/偏好记录同样是虚构人设**，不是真实数据。

**执行**（口径仍按 scope，不按内容逐条挑）：
1. dry-run：**keep 1 / remove 28 / protected 2**（identity、soul）。
2. `--apply`：先落 snapshot commit，再删 28 条叶子。
3. **陈旧壳清理**（脚本之外的实测发现）：`ls` 不列隐藏文件——空目录壳里的 `.abstract.md`/`.overview.md` 仍带 persona 摘要，`find`/`recall`/`stats` 继续吐它们（stats 41→7 的回升就是索引残影）。递归删除无真实叶子的壳：`memories/{entities,events,preferences}` 与整个旧 peer `peers/assistant`（0.5.8 时代 peer，无现役工作区对应）。
4. **终态核验**：memories 树只剩 `identity.md`+`soul.md`；peers 只剩现役 repo peer（其 `sales_drop_report.md` 按 scope 保留，find/recall 仅剩它与其 overview）；`search/find` 与 `search/recall` 对 persona 关键词 **0 命中**；stats=2。临时 server 已停。

**契约修正**：路由 spec 没防住这两处，因为它们 mock 掉了 `commit`——契约漂移只有真机才暴露：
- `snapshot/commit` **必填 `message`**（缺它 400，快照根本不会存在）；回包的 id 键是 **`commit_oid`**，不是 `commit_id`。
- `snapshot/restore` 的请求字段是 **`source_commit`**（RestoreRequest），不是 `commit_id`——真调同样会 400。

**还会约束以后**：清理只按 space/peer scope，不按内容判断；保护文件名是硬规则；任何 apply 必须先有 tree snapshot；**删完叶子还要查空壳的隐藏 abstract/overview**（`ls` 看不见它们，判据是 `search/find`+`search/recall` 对已删关键词 0 命中）；调 server 端点前先读 `.tmp/ov-openapi.json` 的 schema，fake fetch 不校验契约。
