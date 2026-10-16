# suspended_bugs/ · 查明了，还没修

根因已经写明、这次仍不修的缺陷放这里。这不是修好，也不是删掉。进来时把 frontmatter 的 `status` 改成 `待修`，`severity` 和 `opened` 不动。回到 [`../../bugs/`](../../bugs/README.md) 需要一次新的、说得清的决定，回去时 `status` 改回 `活跃`。

| 卡 | 为何搁置 | 重启条件 |
|---|---|---|
| [BUG-014-desk-walk-text-capture-truncates.md](BUG-014-desk-walk-text-capture-truncates.md) | 2026-10-16 | **查明为非缺陷**（不是资产缺陷）：两条症状都是查证人的测量假象 —— `head -c` 按字节切多字节字符、以及文件名漏 `1-` 前缀读到不存在的路径。字符安全复核：5 个 `.txt` 均无 U+FFFD、06:47 那跑五份1660/4347/7673/2920/1918 字节无一是空。留作负知识：报告"截断/空文件"必须用字符安全读法下结论 |
