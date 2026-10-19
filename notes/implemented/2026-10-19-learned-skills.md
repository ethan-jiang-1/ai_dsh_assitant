# 维护面 C1：学到技能逐件可见与退役

日期：2026-10-19 · 状态：**implemented**（C 卡 v2 C1；C2 另片）

## 问题（可观察行为）

技能是最看不见的一处：面板只有一个计数，正文要开文件，退役只能靠对话。要的是逐件看到名字/用量/最近使用/出处/正文 + 一键退役（archive，不删）。

## 决定

1. **出处**：`LearnedSkillInfo` 加 `source`，`scanLearnedSkills` 从 `metadata.source` 读（`origin` 是常量 `'learned'`，只作辅助）；缺省显示"未知"。
2. **用量**：`assistant-rooms` 列表把 `skillUsage` 的 `count`/`lastUsedAt` join 到每行；不新增 scanner/索引。
3. **正文**：`AssistantMemory.readLearnedSkill(name)`（`listSkillFiles` 找到 `<name>/SKILL.md` 或 `<name>.md` 后逐字读）；route 走 `GET /api/assistant/rooms?kind=skill&id=<name>`；只接受 kebab 名，缺失 404。
4. **退役**：复用 A2 的 `skill.retire`（`retireSkill` → `skills/archive/` + 审批账 `retire`/`panel-direct`）；面板「退役」二次确认；不新增状态、不新建表单。
5. **面板**：四 tab 骨架新增「技能」tab；每行名字/描述/用过 N 次/最近/出处/正文抽屉/退役。**成本列 v1 省略**（只说明常驻=名字+描述）。
6. **同 diff**：`client-entry` 四 tab、`web-expected`、`docs` 无新行（复用 `assistant-rooms`）。

## 验收与证据

- `tests/host/rooms-route.spec.ts` 加 skill 正文/usage 用例（200 正文、400 非法名、404 缺失）。
- `tests/client/client-skills-panel.spec.ts` 2 条（列表/用量/出处/未知；正文经 route）。
- `client-entry` 四 tab + guide 期望；`skill-file.spec` 的 scan 期望加 `source`。
- `vitest` **808 tests**；`verify` **42**；`tsc`/`tsdown` 绿；`web-expected` 两场景 PASS（A1b 场景，首屏无漂移）。
- 人判：在「技能」tab 看一件正文、退役一件再恢复。

## 输掉的方案

- 整份 `SKILL.md` 字节冒充常驻成本 → 误导退役；v1 省略成本列。
- 新建技能表单 → 绕过 `save_skill` 的引用完整性检查。
- 只列模型技能目录全集 → 面板只列 `skills/` 实际枚举（learned room）。
- 用 `origin` 当出处 → 它是常量；用 `metadata.source`。
- 另造 scanner/索引 → `scanLearnedSkills` + `skillUsage` 已够。
