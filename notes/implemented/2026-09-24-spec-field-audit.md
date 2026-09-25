# spec 字段对齐审计（治理环切片 1g · 亲验后裁剪）

日期：2026-09-24 · 状态：**implemented**（审计结案，字段不写）
依据：三线合流提案 `notes/implemented/2026-09-24-tri-line-synthesis.md` 阶段 1 切片 1g；
R2 §9.3-6（"格式小步向 spec 对齐：可选补 `license`/`compatibility` 字段"）。

## 亲验结论：字段不写——在本仓 pin 的 provider 上是死字段

对 `vendor/dsh`（dsh-v0.1.5-rc.2）逐字验证：

- `skill-filesystem` 的 `parseSkillFile` 只读 `name`/`description`/`whenToUse`/
  `invocation`/`metadata`（属性访问式读取，skill-filesystem/src/index.ts:810-830）；
- **`license` 与 `compatibility` 在 skill-filesystem 与 skill 注册表全源码零命中**
  （rg 亲验）——provider 完全不读这两个字段；
- 未知 frontmatter 键被容忍（按属性访问读取，不做键白名单拒绝）——**手写**这两个字段
  安全但惰性（对 DSH 无效果；对 agentskills 规范的消费方有意义）。

按本仓门禁的立意（"facade: skill frontmatter keys we write are keys the provider reads"，
scripts/verify.mjs）——**写 provider 不读的键正是这条门禁要防的漂移**。R2 的建议是
[documented]（对着规范说的），但本仓 pin 的 provider 现实优先：写了就是死重，还绕开门禁
立意。

## 现状审计：已对齐的部分不动

- `name`/`description`：与规范必填字段对齐（校验已在 `validateSkillDraft`）；
- `metadata`（origin/source/learnedAt provenance 盖章）：规范预留的自定义通道——
  R2 §3.1 原话"provenance 盖章走的是标准路径而非私货"，**这正是 spec 对齐的正确形态**；
- `when_to_use`：Claude Code 扩展字段，规范语义可并入 description；维持现状（规范允许，
  R2 判定"保持现状也兼容"）。

## 延后触发条件（不是不做，是还没到）

1. 升级 DSH pin 后复查 provider 是否读取 `license`/`compatibility`（`pnpm sync-dsh` 时
   顺手 rg 一遍）；
2. 出现第二个消费方（跨工具移植需求真实出现——如用 michengai 管理家技能库）时，
   字段开始承载真实语义，再写不迟。

## 证据

- rg 亲验：`license|compatibility` 在 `vendor/dsh/packages/skill/skill-filesystem/src/index.ts`
  与 `vendor/dsh/packages/skill/skill/src/index.ts` **零命中**（2026-09-24）；
- parseSkillFile 键读取集：skill-filesystem/src/index.ts:810-830；
- 门禁立意：scripts/verify.mjs `facade: skill frontmatter keys…` 检查
  （键列表 name/description/whenToUse/metadata——若加写新键必须同扩门禁，而门禁会因
  provider 不读而红——这正是不写的机械证明）。
