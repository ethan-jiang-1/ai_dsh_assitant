# 2026-09-25 · 策展技能被静默跳过：frontmatter 里的 `: ` 让加载器 parse 失败

日期：2026-09-25 · 状态：**implemented（红绿在案：门禁先红后绿 + live 前后对照 + 账本）**

## 发现（真实会话，不是门禁红）

排 `session-recall` 在账本里 **0 加载**（当时 ROADMAP 的 ⏳ 技能触发面条目，已随本次修复离队 ——
见 [ROADMAP](../../ROADMAP.md) 维护规则的 2026-09-25 行）时，先按"配方写死 `session.v3`"查；
但那条解释不了"一件都加载不了"：live 探针在 preset 会话里按名加载 `session-recall`，回来的是
`Error: skill "session-recall" is unknown or no longer available`，而**同一目录**里的 `home-curation`
按名加载成功（返回 `<skill_content>`）。同一形状连跑 3 次全失败 → 不是偶发，也不是"罕见情况的招牌"。

## 根因：文本通过了人眼与旧门禁，却没通过 YAML

`presets/assistant/skills/session-recall/SKILL.md` 与 `action-plan/SKILL.md` 的 `whenToUse` 里各有一个
**`: `**（`Not for conclusions: durable facts…`、`the execution shape: who does what by when…`）。
YAML 把 ": " 读成嵌套映射的开始，`yaml.parse` 于是抛
`Nested mappings are not allowed in compact mappings at line 3, column 12`。加载器
（`dsh-skill-filesystem` 的 `parseSkillFile`）对 frontmatter parse 失败只 `logger.warn` 后 **skip**：
文件仍在盘上、名字不在目录里、按名加载答 "unknown" —— 三个信号都不像错误。

同一台机器上的两个盘上佐证（本切片实跑）：

- 本仓自己的扫描器 `scanLearnedSkills(<curated dir>)`：`skills` 只剩 6 件，`failures` 指名
  `action-plan/SKILL.md` 与 `session-recall/SKILL.md` 都是 `missing or unparsable YAML frontmatter`；
- 旧门禁 `skillFrontmatterProblems` 用正则逐行找 `name:`/`description:`，两件都判**通过** ——
  **正则看不见 YAML 语义**，而门禁自己的注释写着"the loader silently ignores a malformed skill"，两者矛盾。

后果：`action-plan`（专家组合件的两件 SOP 技能之一）与 `session-recall` 从落盘那天起就没进过任何会话的技能目录。

## 修法与证据

1. 两处 `: ` 改成 ` — `：仍是 plain scalar，与同目录其余 6 件同一风格，文案语义不变。
2. 门禁升级为**与加载器同方言**（`scripts/verify-checks.mjs` 的 `skillFrontmatterProblems`）：用 `yaml.parse`
   解出 frontmatter，再镜像加载器的跳过条件（块缺失、非映射、`name` ≠ 目录名、名字不合 kebab 文法、
   无 `description`、遗留 invocation 键 `disableModelInvocation`/`modelInvocable`/`userInvocable`、
   invocation 值非布尔），并拼出与加载器同一层意思的诊断。
3. 造红夹具（`tests/verify-gates.spec.mjs`）：`inner-colon`（`: ` 内联映射）、`legacy-invocation`、
   `non-boolean-invocation` 三形态各断言一条问题。
4. **红在前**：先落门禁 → `pnpm verify` **1/31 红**（逐条打印两件文件 + YAML 报错原文）→ 改文案 → **31/31 绿**。

live 前后对照（真跑，同一 one-shot 形状）：

- 修前：`skill session-recall` → `Error: … unknown or no longer available`（连跑 3 次一致）；
- 修后：`skill action-plan` 与 `skill session-recall` 都返回 `<skill_content name="…">`（`isError=false`）；
- 账本 `dev/harness-home/assistant/skill-usage.json`：`action-plan` 与 `session-recall` 各 **count 1**
  （`2026-09-25T14:52:29Z`）—— 两件的**首次**加载，此前 `session-recall` 在全量窗口里是 0。

## 输掉的方案

- **只改那两处文案、不升级门禁**：下一个人在 frontmatter 里写 `: `、遗留键或错类型 invocation，
  同样静默消失 —— 这次能发现纯属"正好去排一个 0 加载的账本项"。
- **用正则把 `: ` 也扫出来**：等于用正则重实现 YAML 的行内映射规则；用同一个解析器只有一处真相。
- **把 frontmatter 的值统一加引号**：能修这两件，但把"值里有什么"变成"必须记得转义"的约定，
  每次改文案都要判断；改掉 `: ` 更直接，且与既有 6 件风格一致。
- **让加载器遇错即失败**（改 vendor）：vendor 只读；且"一个坏技能拖垮整个技能目录"对产品是更差的默认。
