# knowledge-craft 策展技能（知识房间的写作技能）

日期：2026-09-24 · 状态：**待实施（弹性池：A/B 顺利后的富余项；八小时计划已排连）**

## 问题

四个房间三个有配套策展技能，唯独知识房间没有：memory 有 `memory-hygiene`（什么进记忆、
怎么措辞）、research 有 `research-backlog`（线索怎么开怎么收）、tidying 有 `home-curation`、
复盘有 `self-reflection`——**knowledge 写作零指导**（页怎么组织、`save_page` vs memory 的
分界、`[[互链]]` 什么时候建链、draft→stable 的人审节奏、staleAfter 怎么设）。真实使用开跑
在即，助手第一篇知识页就会遇到这些判断。

## 方案

新增策展技能 `presets/assistant/skills/knowledge-craft/SKILL.md`（英文，模型面；形状对齐
既有四技能：name/description/whenToUse frontmatter）。内容骨架：

- 什么进知识页 vs 什么进 memory（可复用的领域理解 vs 会变的事实）vs 什么进技能（程序）
- 一页一事；title 即链接键（我们解析 id→title——title 是别的页引你的方式，起名要稳）
- `[[互链]]` 习惯：写页时想到相关概念就链（unwritten 链是 info——成长中的知识不算病）
- sources 必填：无源知识不进 stable（curate 会报 page-unproven）
- draft→stable = 人手改 status 即人审；agent 永不自批
- staleAfter：真会过期的页才设（默认不设）

## 依据

- 知识房间契约：`docs/home.md` §二 knowledge 行 + curate 表知识各 finding 行
- 技能缺口对照：`presets/assistant/skills/` 现有四技能目录清单
- 八小时计划拍板（2026-09-24）：F 进弹性池

## 验收（毕业条件）

技能落盘过 verify 技能语法门禁；`AGENTS.md`（手册）的技能加载指引加一行
（knowledge-craft before writing a page）；本卡毕业转 implemented。
