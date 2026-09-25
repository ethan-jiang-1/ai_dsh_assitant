# skills/ 快照（治理环切片 1f）

日期：2026-09-24 · 状态：**implemented**
依据：三线合流提案 `notes/implemented/2026-09-24-tri-line-synthesis.md` 阶段 1 切片 1f；
R2 §9.3-7（"家的 skills/ 快照（J1）：最轻形态是时间戳快照或 git init——学错技能的兜底=可回滚"；
三样板：dsh-mind snapshots / garvel `.bak` / michengai backup-rollback）。

## 问题

`save_skill` 对同名技能是**覆盖写**——重写一个学到的技能会丢掉旧措辞。retire 有归档
（文件移动本身就是保存），但覆盖没有任何兜底：学错的版本想把"上一版对的"找回来，没了。

## 决定

1. **覆盖前快照**（garvel `.bak` 形态）：`writeSkill` 在覆盖**已存在**的技能前，把旧文件
   复制到 `skills/archive/snapshots/<name>/<ISO 时间戳>.md`；首次写入（无旧版）不快照。
2. **每名留最新 3 份**（`SNAPSHOTS_KEPT`）：快照的用途是撤销上一次错误，不是版本史——
   更旧的按文件名（ISO 戳字典序=时间序）修剪。
3. **位置在 archive 之下**：scanner 与 provider 都只扫房间根（archive 目录被跳过，
   snapshots 在其下一层）——快照永不浮出为技能或 failure。
4. **恢复=手复制回去**（fs 工具即可）：刻意不做 unretire/restore 动词——兜底要的是
   "零成本可回滚"，不是多一个工具面。
5. **可见性**：覆盖发生时 `save_skill` 结果带 `snapshot_path`，render 明说
   "recoverable by copying it back"——写它的那个 turn 就知道旧版在哪。

## 输掉的方案

| 输掉的 | 为什么输 |
|---|---|
| git init 进 skills 房间 | `.git` 目录会被自家 scanner 报"missing SKILL.md"（要特判）；给家引入 VCS 语义，重 |
| 整房间逐次全量快照 | 写一个技能快照整个房间——量级不成比例 |
| restore_skill 工具动词 | 兜底不需要动词面；fs 复制回去已零成本（YAGNI，等真实需求再上） |
| 快照进 retire 流程 | retire 是移动文件——归档副本本身就是保存，再快照是重复 |

## 证据

- `tests/skill-snapshot.spec.ts`（3 测试：不存在的技能不快照 / 覆盖 5 次留最新 3 份、
  当前版最新、最旧快照含 v1 不含 v0、结果报快照路径、扫描与 curate 零污染 / 平文件技能
  同样快照）。**108/108 全绿**（`pnpm test`）。
- 机械门禁：`pnpm typecheck` && `pnpm verify` 16/16。
- **live 实证**（preset-runner one-shot，2026-09-24，会话
  `session-fb229643-6e9a-414b-90e7-90be817a3d73`）：save v1 → 同名覆盖 save v2 →
  结果**逐字**带 `Previous version snapshotted at …/skills/archive/snapshots/snapshot-fixture/
  2026-09-23T21-21-17-925Z.md (recoverable by copying it back).`；fs 读回快照文件确认
  v1 措辞逐字保留（frontmatter+body 无损）；retire 清理后 curate `Home is clean`。
- **live 助手的持久观察（登记不立案）**：快照树与 skills/archive 不进 digest、curate 不
  报——静默累积、只有知道路径的人能发现。可能的未来微切片：curate 附一行 archive 规模
  （"3 retired bundles, N snapshots"）。当下按 YAGNI 不做。
