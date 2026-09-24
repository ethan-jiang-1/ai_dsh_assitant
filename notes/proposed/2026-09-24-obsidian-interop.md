# Obsidian 互通（家的 knowledge 房间 × Obsidian 生态）

日期：2026-09-24 · 状态：**调研中（r5 深评代理运行中）**

## 问题

1. 家的 `knowledge/` 目录直接当 Obsidian vault 打开，人编辑体验如何、什么会坏？（重点疑点：我们页文件是 id 命名、`[[链接]]` 却写名字——Obsidian 按文件名解析，失配行为待逐条分析）
2. `dsh-obsidian` 桥（处理用户自己的外部 vault）值不值得挂/借鉴？

## 当前状态

- r5 深评代理运行中：本地失配分析（page.ts 解析三形态 vs Obsidian 语义）+ dsh-obsidian /
  官方 scope obsidian 插件 / llm-wiki / memory-wiki-bridge 逐个深评。
- 底稿将落 notes/research/（r5），落稿后此处补链接；承重主张经复核后本卡转「待拍板」。

## 依据

- [R3 shortlist](../research/2026-09-24-r3-knowledge-shortlist.md)（其未决问题 1-4 即本卡深评清单）
- 用户硬过滤（2026-09-24 拍板）：一切方案 MD/文件系统原生，对 AI coding agent 全透明；纯本地。

## 验收（毕业条件）

两问各有 go/no-go 与最小互通路径结论 → 本卡转「待拍板」；拍板后按结论立实施提案，或一行
拒绝原因转 rejected。
