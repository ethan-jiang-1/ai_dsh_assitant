# 2026-09-24 · curate 附归档规模一行（N retired bundles, M snapshots）

日期：2026-09-24 · 状态：**implemented（22/22 窄测绿 + 清扫后真家首读在案）**

ROADMAP 🧹「微切片」落账：curate 的 counts 附带技能归档规模一行——live 助手观察登记。

## 为什么

`retire_skill` 与覆盖写入前的快照都**不删除**（可恢复性是 day-0 的有意选择），所以技能归档
只增不减——它是家里唯一**读房间读不出规模压力**的面：digest 有预算截断压力信号，归档没有。
counts 行把爬升数字交给 live 助手登记观察（与"摘要快满了"同构的压力信号）。

## 什么

- `scanSkillArchiveScale(skillsArchiveDir)`（`src/skills/scan.ts`）：retired = 归档根下的
  目录（`snapshots/` 除外）+ 平文件 `.md`（退役平技能的归档形态）；snapshots =
  `snapshots/<name>/*.md` 计数（非 `.md` 杂散文件忽略）；目录缺失 = 0/0。
- 走 `knowledgePages` 先例：纯函数 `CurationInput` 加两个必填输入、`counts` 透传
  （`src/home/health.ts`），服务 `curate()` 装配（`src/index.ts`）。
- agent 面（`src/tool-memory/index.ts`）：counts schema 与类型各加两字段；渲染固定附一行
  `- skills archive: N retired bundles, M snapshots.`（0/0 也是观察，每次都带）；工具
  description 补 counts 面。
- `docs/home.md` §四：简报数据面从一项（技能用量）扩为两项（+ 归档规模）。

## 证据

- `tests/domain/health.spec.ts`：clean-home 用例加透传断言（retiredSkillBundles: 2 / skillSnapshots: 1）。
- `tests/host/skill-retirement.spec.ts` 两级：scan 纯函数（手造归档 2 bundle + 1 快照 + 1 杂散
  → 2/1；缺目录 → 0/0）；服务级（fresh home 先断 0/0，双写同名造快照 + retire 后 curate
  计 1/1）。
- **真家首读**：[使用前清扫](2026-09-24-dev-home-pre-usage-sweep.md)后的 dev home 上
  curate 读出 `retiredSkillBundles: 0, skillSnapshots: 0`——新代码对真实家的第一次观察，
  同时是清扫的验证。
- 窄测 22/22（health + skill-retirement 两文件）；全量门禁见同 diff 提交。

## 边界（有意不做）

归档没有清理动词（删了就不可恢复），本切片**只登记规模**、不建清理机制——规模涨到真痛
再按触发型判据的形状立案（同 ⏳ 各条的待遇）。
