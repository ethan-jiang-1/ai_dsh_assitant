# 会话日志记忆面（sessions/ 是被浪费的记忆原料吗）

日期：2026-09-24 · 状态：**调研中（r6 深评代理运行中）**

## 问题

家的记忆是策展后的蒸馏物，原始会话日志（JSONL 纯文件）躺在 DSH_HOME 的 sessions/ 里无人
问津。三问：

1. DSH 会话日志的盘上结构与内容（rg 到底能查到什么）？
2. 生态对位 `dsh-palimpsest` 深评（怎么解析、工具面、存储形态）？
3. 我们的最小 MD-first 形态：什么也不建（agent 直接 rg）/ 薄工具动词 / 挂桥——事实对照。

## 当前状态

- r6 深评代理运行中：本地解剖（vendor session/storage 写入端 + dev home 真实日志样本 +
  fs 工具路径可达性）+ palimpsest 深评 + Hermes session_search 对照。
- 底稿将落 notes/research/（r6），落稿后此处补链接；承重主张经复核后本卡转「待拍板」。

## 依据

- [R1 shortlist](../research/2026-09-24-r1-memory-shortlist.md)（palimpsest 行）与
  [R4 Hermes 调研 §四](../research/2026-09-24-r4-hermes-identity-survey.md)（session_search
  作为记忆第三支柱的对照表）
- 用户硬过滤（2026-09-24 拍板）：文件系统原生、rg 可查、无 SQLite/FTS；纯本地。

## 验收（毕业条件）

三问各有事实结论 + go/no-go 与最小形态建议 → 本卡转「待拍板」；拍板后按结论立实施提案
（或结论为"什么也不建"则一行原因转 rejected——negative result 也是结果）。
