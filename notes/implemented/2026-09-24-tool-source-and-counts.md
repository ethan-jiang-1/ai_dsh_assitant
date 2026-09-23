# 2026-09-24 · 工具面两缺口：save/open 的 source 与 curate 的 counts（已修复）

日期：2026-09-24 · 状态：**implemented（本切片，live 红绿在案）**

## 发现（会话 B 实况，非推理）

战役步骤 B 的真实对话暴露两个工具面缺口（发现者：preset 会话里的助手本人，它按仓库纪律只报告
未动手）：

1. **`assistant_memory save` 没有 `source` 入参**：服务层 `SaveMemoryInput.source` 一直支持，
   工具层参数表没暴露——盘上证据：按指令带 source 保存的记录，frontmatter 里无 source 字段。
   直接后果：I9 的"来源可追（哪次会话学来的）"对工具路径失效。`assistant_research open` 同病。
2. **`curate` 的 counts 丢了**：结构化输出 schema 里 counts（8 个字段）一直在，但 `render`
   只渲染 summary/memories/findings——模型可见文本永远没有数字（"Home is clean" 单行）。
   后果：I8 的"报出"粒度不足，模型无法引用计数。

两处都是"那一圈的形状问题"——模型没错，词汇表错了。这正是战役要抓的东西。

## 修复

1. 两个工具补 `source` 参数（save/open），透传到服务层。
2. `counts` 从"必填 + 零值占位"改为**只有 curate 才填**（schema 去掉 required，删
   `EMPTY_COUNTS`）；`render` 见到才渲染，单行紧凑格式
   （`counts: 2/2 active memories, 0/0 threads open (0 parked), 0 learned skills, digest
   821/4096 bytes.`）。其他动作不再输出零占位噪声。

## 验证（真跑过 / live 红绿）

- 红证（修复前，盘上与日志在案）：source 缺失的 frontmatter；curate 输出无 counts。
- 绿证（修复后，preset-runner 实跑）：带 source 保存 → frontmatter 含
  `source: live-verification-campaign step B fix`（文件 `20260923-note-ko0j.md`）；curate →
  counts 行出现在模型可见文本（助手原样引用回报）。
- typecheck ×2 / test 72/72 / build / verify 16/16。

## 教训

工具的**参数表和渲染面**是模型世界的词汇表：服务层能力没接到词汇表 = 对模型不存在。验证主张
分级救不了这一层——只有真实对话（模型试图用那个词）才会暴露"词不在表上"。
