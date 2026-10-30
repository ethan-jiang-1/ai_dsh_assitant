# 维护面 C1：学到技能逐件可见与退役

日期：2026-10-19 · 状态：**implemented**

## 问题（可观察行为）

技能是最看不见的一处：面板只有一个计数，正文要开文件，退役只能靠对话。要的是逐件看到名字/用量/最近使用/出处/正文 + 一键退役（archive，不删）。

## 决定

1. **出处**：`LearnedSkillInfo` 加 `source`，`scanLearnedSkills` 从 `metadata.source` 读（`origin` 是常量 `'learned'`，只作辅助）；缺省显示"未知"。
2. **用量**：`assistant-rooms` 列表把 `skillUsage` 的 `count`/`lastUsedAt` join 到每行；不新增 scanner/索引。
3. **正文**：`AssistantMemory.readLearnedSkill(name)`（`listSkillFiles` 找到 `<name>/SKILL.md` 或 `<name>.md` 后逐字读）；route 走 `GET /api/assistant/rooms?kind=skill&id=<name>`；只接受 kebab 名，缺失 404。
4. **退役**：复用 A2 的 `skill.retire`（`retireSkill` → `skills/archive/` + 审批账 `retire`/`panel-direct`）；面板「退役」二次确认；不新增状态、不新建表单。
5. **面板**：房间 tab 骨架新增「技能」tab；每行名字/描述/用过 N 次/最近/出处/正文抽屉/退役。**成本列 v1 省略**（只说明常驻=名字+描述）。
6. **同 diff**：`client-entry` 房间 tab、`web-expected`、`docs` 无新行（复用 `assistant-rooms`）。

## 输掉的方案

- 整份 `SKILL.md` 字节冒充常驻成本 → 误导退役；v1 省略成本列。
- 新建技能表单 → 绕过 `save_skill` 的引用完整性检查。
- 只列模型技能目录全集 → 面板只列 `skills/` 实际枚举（learned room）。
- 用 `origin` 当出处 → 它是常量；用 `metadata.source`。
- 另造 scanner/索引 → `scanLearnedSkills` + `skillUsage` 已够。
